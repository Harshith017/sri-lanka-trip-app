/* ====================== Next trip planner ======================
   1. Everyone answers a one-minute holiday poll (planPrefs/{email}).
   2. The app scores every destination in the built-in guide against all
      the answers and shows the best 2–5, with why each one fits.
   3. Everyone votes for the ones they'd happily go to (planVotes/{email}).
   4. The organiser locks one in → a day-by-day plan is generated
      (planDays/dayN) that anyone can edit: cities, places, times, tips,
      add or remove days.
   5. The organiser can then make it the main trip: the Plan / Now tabs,
      dates, route, maps and the bill currency all switch to it. Bills and
      balances carry on as before.
   Shared state lives in plan/state. */

var P = { prefs:{}, votes:{}, votesRaw:{}, state:null, days:[], ready:{ prefs:false, votes:false, state:false, days:false } };
function planRound(){ return (P.state && P.state.round) ? String(P.state.round) : ""; }
var planUnsubs = [];
var planMode = "current";            // Plan tab: "current" trip or "next" trip
var planOpenDay = 1;
var PLAN_MAX_DAYS = 14;

function plannerStart(){
  if(planUnsubs.length) return;
  function watch(col, fn){
    planUnsubs.push(db.collection(col).onSnapshot(function(snap){ fn(snap); plannerChanged(); },
      function(err){ console.warn(col + " listener:", err && err.code); P.blocked = true; plannerChanged(); }));
  }
  watch("planPrefs", function(snap){
    var o = {}; snap.forEach(function(d){ o[d.id] = cleanPrefs(d.data()); }); P.prefs = o; P.ready.prefs = true;
  });
  watch("planVotes", function(snap){
    var o = {}; snap.forEach(function(d){ var v = d.data();
      o[d.id] = { round: String(v.round||""), picks: Array.isArray(v.picks) ? v.picks.filter(function(x){ return typeof x === "string"; }).slice(0, 12) : [] }; });
    P.votesRaw = o; P.ready.votes = true;
  });
  watch("plan", function(snap){
    var st = null; snap.forEach(function(d){ if(d.id === "state") st = d.data(); }); P.state = st; P.ready.state = true;
  });
  // Votes only count for the current planning round (a new round starts
  // each time the organiser goes back to the poll).
  watch("planDays", function(snap){
    var arr = [];
    snap.forEach(function(d){
      var x = d.data();
      var n = Number(x.day) || 0;
      if(n < 1 || n > PLAN_MAX_DAYS) return;
      arr.push({ day:n, city:String(x.city||""), title:String(x.title||""), items: itemsFromFirestore(x.items), tip:String(x.tip||"") });
    });
    arr.sort(function(a,b){ return a.day - b.day; });
    P.days = arr; P.ready.days = true;
  });
}
function plannerStop(){
  planUnsubs.forEach(function(u){ try{ u(); }catch(e){} });
  planUnsubs = [];
  P = { prefs:{}, votes:{}, votesRaw:{}, state:null, days:[], ready:{ prefs:false, votes:false, state:false, days:false } };
}
function plannerChanged(){
  var round = planRound(), v = {};
  Object.keys(P.votesRaw || {}).forEach(function(e){ if(P.votesRaw[e].round === round) v[e] = P.votesRaw[e].picks; });
  P.votes = v;
  if(!booted) return;
  if(activeTab === "itinerary" || activeTab === "now") render();
}

/* ---------- data helpers ---------- */

function cleanPrefs(d){
  d = d || {};
  var vibeIds = PLAN_VIBES.map(function(v){ return v.id; });
  return {
    vibes: Array.isArray(d.vibes) ? d.vibes.filter(function(v){ return vibeIds.indexOf(v) >= 0; }) : [],
    budget: [1,2,3,4].indexOf(Number(d.budget)) >= 0 ? Number(d.budget) : 2,
    length: ["short","mid","long"].indexOf(d.length) >= 0 ? d.length : "mid",
    months: Array.isArray(d.months) ? d.months.map(Number).filter(function(m){ return m >= 1 && m <= 12; }) : [],
    where: ["india","abroad","either"].indexOf(d.where) >= 0 ? d.where : "either",
    easyVisa: !!d.easyVisa,
    wish: cleanText(d.wish, 160),
    name: cleanText(d.name, 40)
  };
}
function destById(id){
  if(P.state && P.state.custom && P.state.custom.id === id) return customDest(P.state.custom);
  for(var i=0;i<DESTINATIONS.length;i++) if(DESTINATIONS[i].id === id) return DESTINATIONS[i];
  return null;
}
function customDest(c){
  var cities = (c.cities || []).map(function(n){ return { name:String(n), nights:1, places:[], eat:[] }; });
  return { id:c.id, name:c.name, country:c.country || c.name, flag:"📍", scope: c.country === "India" ? "india" : "abroad",
    currency: CURRENCY_INFO[c.currency] ? c.currency : "INR", blurb:"Your own plan.", tags:{}, budget:0, cost:"", travel:"",
    visa:"", best:[], ok:[], days:[1, PLAN_MAX_DAYS], arrive:"Travel to " + (cities[0] ? cities[0].name : c.name),
    depart:"Head back home", cities: cities.length ? cities : [{ name:c.name, nights:1, places:[], eat:[] }], legs:[], custom:true };
}
function planMembers(){ return S.people.map(function(p){ return p.email; }); }
function answered(){ return planMembers().filter(function(e){ return P.prefs[e]; }); }

/* ---------- scoring ---------- */

var VISA_EASE = { none:1, free:1, arrival:0.95, evisa:0.65, visa:0.15 };

function scoreDestFor(dest, pr){
  var why = [];
  // What they want to do
  var vibe = 0.5;
  if(pr.vibes.length){
    var sum = 0;
    pr.vibes.forEach(function(v){ sum += (dest.tags[v] || 0); });
    vibe = sum / (3 * pr.vibes.length);
  }
  // Budget
  var over = dest.budget - pr.budget;
  var budget = over <= 0 ? 1 : (over === 1 ? 0.35 : 0);
  // India / abroad
  var where = pr.where === "either" || pr.where === dest.scope ? 1 : 0.05;
  // Visa
  var visa = pr.easyVisa ? (VISA_EASE[dest.visa] != null ? VISA_EASE[dest.visa] : 1) : 1;
  // When
  var month = 0.75;
  if(pr.months.length){
    var best = 0;
    pr.months.forEach(function(m){
      var s = dest.best.indexOf(m) >= 0 ? 1 : (dest.ok.indexOf(m) >= 0 ? 0.6 : 0.15);
      if(s > best) best = s;
    });
    month = best;
  }
  // Trip length
  var len = (PLAN_LENGTHS.filter(function(l){ return l.id === pr.length; })[0] || PLAN_LENGTHS[1]).days;
  var lenFit = (len >= dest.days[0] - 1 && len <= dest.days[1] + 1) ? 1 : 0.5;
  // Wishes typed in ("scuba", "snow", "casino"…) found in the guide text
  var wishBonus = 0;
  if(pr.wish){
    var hay = (dest.name + " " + dest.country + " " + dest.blurb + " " +
      dest.cities.map(function(c){ return c.name + " " + c.places.join(" ") + " " + (c.eat||[]).join(" "); }).join(" ")).toLowerCase();
    pr.wish.toLowerCase().split(/[^a-z]+/).filter(function(w){ return w.length >= 4; }).forEach(function(w){
      if(hay.indexOf(w) >= 0) wishBonus += 0.08;
    });
    wishBonus = Math.min(0.16, wishBonus);
  }
  var score = 0.48*vibe + 0.22*budget + 0.1*visa + 0.13*month + 0.07*lenFit + wishBonus;
  // "Abroad only" / "India only" and a budget way off are near deal-breakers.
  if(where < 1) score *= 0.55;
  if(over >= 2) score *= 0.7;
  return { score: Math.min(1, score), vibe:vibe, budget:budget, where:where, visa:visa, month:month };
}

/** Ranks the guide for the whole group: the average fit, with a nudge
    towards places nobody hates (the lowest individual fit counts too). */
function rankDestinations(){
  var who = answered();
  if(!who.length) return [];
  var ranked = DESTINATIONS.map(function(d){
    var per = who.map(function(e){ return scoreDestFor(d, P.prefs[e]); });
    var avg = per.reduce(function(s,x){ return s + x.score; }, 0) / per.length;
    var min = per.reduce(function(m,x){ return Math.min(m, x.score); }, 1);
    var fitsBudget = per.filter(function(x){ return x.budget === 1; }).length;
    var goodMonth = per.filter(function(x){ return x.month >= 0.6; }).length;
    var vibeTotals = {};
    who.forEach(function(e){ P.prefs[e].vibes.forEach(function(v){ if(d.tags[v] >= 2) vibeTotals[v] = (vibeTotals[v]||0) + 1; }); });
    var topVibes = Object.keys(vibeTotals).sort(function(a,b){ return vibeTotals[b] - vibeTotals[a]; }).slice(0,3);
    return { dest:d, score: 0.7*avg + 0.3*min, fitsBudget:fitsBudget, goodMonth:goodMonth, topVibes:topVibes, n: who.length };
  });
  ranked.sort(function(a,b){ return b.score - a.score || a.dest.budget - b.dest.budget; });
  return ranked;
}
function shortlist(){
  var r = rankDestinations();
  if(!r.length) return [];
  var top = r[0].score, out = [];
  for(var i=0;i<r.length && out.length<5;i++){
    if(out.length >= 2 && r[i].score < top - 0.18) break;
    out.push(r[i]);
  }
  return out;
}
function voteCount(id){ return planMembers().filter(function(e){ return (P.votes[e]||[]).indexOf(id) >= 0; }).length; }
function voters(id){ return planMembers().filter(function(e){ return (P.votes[e]||[]).indexOf(id) >= 0; }); }

function groupLength(){
  var who = answered();
  if(!who.length) return 6;
  var ds = who.map(function(e){ return (PLAN_LENGTHS.filter(function(l){ return l.id === P.prefs[e].length; })[0] || PLAN_LENGTHS[1]).days; }).sort(function(a,b){ return a-b; });
  return ds[Math.floor(ds.length/2)];
}
function groupMonths(){
  var c = {};
  answered().forEach(function(e){ P.prefs[e].months.forEach(function(m){ c[m] = (c[m]||0) + 1; }); });
  return Object.keys(c).map(Number).sort(function(a,b){ return c[b]-c[a] || a-b; });
}

/** [12,1,2,3,4] → "Dec–Apr"; [3,4,10,11] → "Mar–Apr, Oct–Nov". */
function fmtMonths(list){
  var set = {}; (list||[]).forEach(function(m){ set[m] = true; });
  if(Object.keys(set).length >= 12) return "all year";
  var runs = [], m, start = null;
  // start scanning just after a gap so runs that wrap past December stay whole
  var first = 1; for(m=1;m<=12;m++){ if(!set[m]){ first = m % 12 + 1; break; } }
  for(var k=0;k<12;k++){
    m = (first - 1 + k) % 12 + 1;
    if(set[m]){ if(start === null) start = m; var prev = m; }
    else if(start !== null){ runs.push([start, prev]); start = null; }
  }
  if(start !== null) runs.push([start, prev]);
  return runs.map(function(r){ return r[0] === r[1] ? MONTH_SHORT[r[0]-1] : MONTH_SHORT[r[0]-1] + "–" + MONTH_SHORT[r[1]-1]; }).join(", ");
}

/* ---------- itinerary generator ---------- */

function genItinerary(dest, days){
  days = Math.max(1, Math.min(PLAN_MAX_DAYS, Math.round(days)));
  var nights = days - 1;
  var main = dest.cities.filter(function(c){ return c.nights > 0; });
  var dayTrips = dest.cities.filter(function(c){ return !(c.nights > 0); });
  if(!main.length) main = dest.cities.slice(0,1);
  var use = main.slice(0, Math.max(1, Math.min(main.length, nights || 1)));
  // Nights per city: one each, then the rest in proportion to the guide.
  var alloc = use.map(function(){ return 1; });
  var left = Math.max(0, nights - use.length);
  var weights = use.map(function(c){ return c.nights || 1; }), wsum = weights.reduce(function(a,b){ return a+b; }, 0);
  var shares = weights.map(function(w){ return left * w / wsum; });
  var floors = shares.map(Math.floor); floors.forEach(function(f,i){ alloc[i] += f; left -= f; });
  shares.map(function(s,i){ return { i:i, r:s - Math.floor(s) }; }).sort(function(a,b){ return b.r - a.r || a.i - b.i; })
    .forEach(function(x){ if(left > 0){ alloc[x.i]++; left--; } });
  if(nights === 0) alloc = [0];

  var queues = use.map(function(c){ return c.places.slice(); });
  var eats = use.map(function(c){ return (c.eat || []).slice(); });
  function nextPlace(ci){ return queues[ci].length ? queues[ci].shift() : null; }
  function nextEat(ci){ return eats[ci].length ? "Dinner: try " + eats[ci].shift() : null; }
  function legText(a, b){
    for(var i=0;i<dest.legs.length;i++){
      var l = dest.legs[i][0];
      if(l.indexOf(a.split(" ")[0]) >= 0 && l.indexOf(b.split(" ")[0]) >= 0) return dest.legs[i][1];
    }
    return "";
  }

  // Which city each day belongs to.
  var seq = [];
  use.forEach(function(c, ci){ for(var k=0;k<alloc[ci];k++) seq.push(ci); });
  if(!seq.length) seq.push(0);
  while(seq.length < days) seq.push(seq[seq.length-1]);   // departure day
  seq = seq.slice(0, days);

  var out = [], dayTripDone = false;
  for(var d=1; d<=days; d++){
    var ci = seq[d-1], city = use[ci].name, items = [], title = "", tip = "";
    var isFirst = d === 1, isLast = d === days && days > 1;
    var isTransfer = !isFirst && seq[d-2] !== ci;
    if(isFirst){
      title = "Arrive in " + city;
      items.push(["Morning", dest.arrive || ("Travel to " + city)]);
      items.push(["Afternoon", "Check in and settle into " + city]);
      var p1 = nextPlace(ci); if(p1 && days > 2) items.push(["Late afternoon", p1]);
      if(days === 1){ items.push(["Evening", departText(dest, city)]); }
      else { var e1 = nextEat(ci) || (nextPlace(ci)); if(e1) items.push(["Evening", e1]); }
      if(dest.tip) tip = dest.tip;
    } else if(isLast){
      title = isTransfer ? (use[seq[d-2]].name + " → " + city + " · fly home") : ("Last morning in " + city);
      var pl = nextPlace(ci);
      items.push(["Morning", pl ? pl : "Breakfast and last-minute shopping"]);
      items.push(["Afternoon", departText(dest, city)]);
    } else if(isTransfer){
      var prev = use[seq[d-2]].name, lt = legText(prev, city);
      title = prev + " → " + city;
      items.push(["Morning", "Travel " + prev + " → " + city + (lt ? " (" + lt + ")" : "")]);
      var pt = nextPlace(ci); if(pt) items.push(["Afternoon", pt]);
      var et = nextEat(ci) || nextPlace(ci); if(et) items.push(["Evening", et]);
    } else {
      // A full day — use it for a day trip once, if the guide has one.
      if(!dayTripDone && dayTrips.length && queues[ci].length < 2){
        var dt = dayTrips[0]; dayTripDone = true;
        title = "Day trip: " + dt.name;
        dt.places.slice(0,3).forEach(function(p, k){ items.push([["Morning","Afternoon","Evening"][k], p]); });
      } else {
        var a = nextPlace(ci), b = nextPlace(ci), c = nextEat(ci) || nextPlace(ci);
        title = a ? (city + ": " + shortTitle(a)) : ("Free day in " + city);
        items.push(["Morning", a || ("Slow morning in " + city)]);
        items.push(["Afternoon", b || ("Explore " + city + " at your own pace")]);
        if(c) items.push(["Evening", c]);
      }
    }
    out.push({ day:d, city:city, title: title.slice(0, 60), items: items, tip: tip.slice(0, 140) });
  }
  return out;
}
/** "Fly back to Bangalore from Udaipur" → from wherever the plan actually ends. */
function departText(dest, lastCity){
  var t = (dest.depart || "Head home").replace(/\s+from\s+[^,.]+$/i, "");
  if(/^fly/i.test(t) && dest.cities.length > 1 && !dest.custom) t += " from " + lastCity;
  return t;
}
function shortTitle(s){ return s.replace(/\s*\(.*\)$/, "").split(/ & | – | - |, /)[0].slice(0, 40); }

/* ---------- writes ---------- */

function savePrefs(pr){
  try{ requireMember(); } catch(e){ return Promise.reject(e); }
  return db.collection("planPrefs").doc(docId(S.me)).set({
    vibes: pr.vibes, budget: pr.budget, length: pr.length, months: pr.months,
    where: pr.where, easyVisa: !!pr.easyVisa, wish: cleanText(pr.wish, 160),
    name: pName(S.me), updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}
function toggleVote(id){
  try{ requireMember(); } catch(e){ return Promise.reject(e); }
  var mine = (P.votes[S.me] || []).slice(), i = mine.indexOf(id);
  if(i >= 0) mine.splice(i, 1); else mine.push(id);
  return db.collection("planVotes").doc(docId(S.me)).set({ picks: mine.slice(0, 12), round: planRound(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
}
function daysToFirestore(day){
  return { day: day.day, city: cleanText(day.city, 40), title: cleanText(day.title, 60) || ("Day " + day.day),
           items: itemsToFirestore(day.items.map(function(it){ return [cleanText(it[0], 20), cleanText(it[1], 90)]; })
             .filter(function(it){ return it[0] || it[1]; }).slice(0, 30)),
           tip: cleanText(day.tip, 140) };
}
/** Organiser: lock a destination in and generate its plan. */
function lockDestination(destId, days, startDate, custom){
  if(!isAdmin()) return Promise.reject(new Error("Only the organiser can lock in the destination."));
  var state = { stage:"planning", dest:destId, days:days, startDate: startDate || "", custom: custom || null, round: planRound(),
                lockedBy:S.me, lockedAt: firebase.firestore.FieldValue.serverTimestamp() };
  var dest = custom ? customDest(custom) : destById(destId);
  if(!dest) return Promise.reject(new Error("Unknown destination."));
  var plan = genItinerary(dest, days);
  var batch = db.batch();
  batch.set(db.collection("plan").doc("state"), state);
  plan.forEach(function(d){ batch.set(db.collection("planDays").doc("day" + d.day), daysToFirestore(d)); });
  P.days.forEach(function(d){ if(d.day > plan.length) batch.delete(db.collection("planDays").doc("day" + d.day)); });
  return batch.commit();
}
function savePlanDay(day){
  try{ requireMember(); } catch(e){ return Promise.reject(e); }
  if(!cleanText(day.title, 60)) return Promise.reject(new Error("Give this day a title."));
  return db.collection("planDays").doc("day" + day.day).set(daysToFirestore(day));
}
function addPlanDay(){
  var last = P.days[P.days.length - 1];
  if(P.days.length >= PLAN_MAX_DAYS) return Promise.reject(new Error("That's the most days a plan can have here."));
  var n = P.days.length + 1, city = last ? last.city : "";
  return savePlanDay({ day:n, city:city, title:"Free day in " + (city || "town"), items:[["Morning","Free time — add plans"]], tip:"" });
}
function removeLastPlanDay(){
  if(P.days.length <= 1) return Promise.reject(new Error("A plan needs at least one day."));
  var n = P.days[P.days.length-1].day;
  return db.collection("planDays").doc("day" + n).delete();
}
function resetPlanner(){
  if(!isAdmin()) return Promise.reject(new Error("Only the organiser can do that."));
  return db.collection("plan").doc("state").set({ stage:"poll", dest:"", days:0, startDate:"", custom:null, round: "r" + Date.now().toString(36), lockedBy:S.me,
    lockedAt: firebase.firestore.FieldValue.serverTimestamp() });
}

/** Organiser: make the planned trip the main trip. Replaces the Plan tab's
    days, dates, route and bill currency; bills and balances stay. */
/** The current trip has to be finished before another one replaces it. */
function currentTripOver(){ return !hasTrip() || todayYmd() > dateToYmd(dayDate(tripLength())); }
function makeMainTrip(startDate){
  if(!isAdmin()) return Promise.reject(new Error("Only the organiser can do that."));
  if(!currentTripOver()) return Promise.reject(new Error("Finish the " + tripTitle() + " trip first — you can switch after " + fmtDayMonth(dayDate(tripLength())) + "."));
  if(!P.state || P.state.stage !== "planning") return Promise.reject(new Error("Lock in a destination first."));
  var a = ymdToDate(startDate);
  if(!a) return Promise.reject(new Error("Pick the date the trip starts."));
  var dest = destById(P.state.dest);
  var days = P.days.slice();
  if(!dest || !days.length) return Promise.reject(new Error("The plan is empty."));
  var end = dateToYmd(addDays(a, days.length - 1));
  var cities = []; days.forEach(function(d){ if(d.city && cities.indexOf(d.city) < 0) cities.push(d.city); });
  var tripId = "t" + Date.now().toString(36);
  var batch = db.batch();
  batch.set(db.collection("trip").doc("settings"), {
    startDate: dateToYmd(a), endDate: end, budget: { flights:0, stay:0, food:0, transport:0, activity:0, shopping:0, other:0 },
    airportRate: null, title: dest.name.slice(0, 40), country: (dest.country || dest.name).slice(0, 40),
    currency: dest.currency || "INR", route: cities.join(" → ").slice(0, 200),
    legs: (dest.legs || []).slice(0, 10).map(function(l){
      // The day you arrive in the leg's destination is the day you drive/fly it.
      var to = String(l[0]).split("→").pop().trim().split(" ")[0].toLowerCase(), day = 0;
      for(var i=1;i<days.length;i++){ if(days[i].city.toLowerCase().indexOf(to) >= 0 && days[i-1].city !== days[i].city){ day = days[i].day; break; } }
      return { l: String(l[0]).slice(0,60), t: String(l[1]).slice(0,40), d: day };
    }),
    tripId: tripId, updatedBy: S.me, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  days.forEach(function(d){
    batch.set(db.collection("itinerary").doc("day" + d.day), {
      day: d.day, stay: cleanText(d.city, 40), title: cleanText(d.title, 60) || ("Day " + d.day),
      items: itemsToFirestore(d.items.filter(function(it){ return it[0] || it[1]; }).slice(0, 30)), tip: cleanText(d.tip, 140),
      date:"", weekday:""
    });
  });
  // Old days beyond the new length can't be deleted (rules), so blank them.
  var raw = latestSnapshots.itinerary;
  if(raw) raw.forEach(function(doc){
    var n = Number(doc.data().day) || 0;
    if(n > days.length) batch.set(doc.ref || db.collection("itinerary").doc(doc.id), { day:n, stay:"", title:"Day " + n, items:[], tip:"", date:"", weekday:"" });
  });
  batch.set(db.collection("plan").doc("state"), { stage:"done", tripId: tripId, startDate: dateToYmd(a), startedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge:true });
  return batch.commit();
}

/* ---------- views ---------- */

function planToggleHtml(){
  return '<div class="seg">'+
    '<button class="seg-btn'+(planMode==="current"?" on":"")+'" data-action="plan-mode" data-id="current">🗓️ '+esc(tripTitle())+' trip</button>'+
    '<button class="seg-btn'+(planMode==="next"?" on":"")+'" data-action="plan-mode" data-id="next">🧭 Next trip</button>'+
  '</div>';
}

function plannerNowCard(){
  if(P.blocked || !P.ready.prefs) return "";
  var st = P.state && P.state.stage;
  if(st === "done") return "";
  var n = answered().length, total = S.people.length, mine = !!P.prefs[S.me];
  var line;
  if(st === "planning"){
    var d = destById(P.state.dest);
    line = (d ? d.flag + " " + esc(d.name) : "Next trip") + " is locked in — see and edit the plan";
  } else if(!mine){
    line = "Take the 1-minute holiday poll · " + n + " of " + total + " answered";
  } else {
    var sl = shortlist();
    line = sl.length ? ("Top pick so far: " + sl[0].dest.flag + " " + esc(sl[0].dest.name) + " · vote on the shortlist") : "Waiting for answers";
  }
  return '<div class="card plan-cta" data-action="goto-next"><div class="plan-cta-ic">🧭</div>'+
    '<div style="flex:1;min-width:0;"><div class="now-hero-lbl">Next holiday</div><div style="font-weight:600;font-size:14px;margin-top:2px;">'+line+'</div></div>'+
    '<div class="row-chev">›</div></div>';
}

function viewPlanner(){
  if(P.blocked) return '<div class="empty"><span class="big">🧭</span>The holiday planner isn’t switched on yet.<br>The organiser needs to finish setting it up — try again in a bit.</div>';
  if(!P.ready.prefs || !P.ready.state) return '<div class="empty"><span class="big">🧭</span>Loading the planner…</div>';
  var st = P.state && P.state.stage;
  if(st === "planning" || st === "done") return viewPlanItinerary();
  return viewPlanPoll();
}

function viewPlanPoll(){
  var who = answered(), total = S.people.length, mine = P.prefs[S.me];
  var faces = S.people.map(function(p){
    return '<span class="poll-face'+(P.prefs[p.email]?" done":"")+'" title="'+esc(p.name)+'">'+esc(p.name.charAt(0).toUpperCase())+'</span>';
  }).join("");
  var head = '<div class="card plan-hero">'+
      '<div class="now-hero-lbl">Where next?</div>'+
      '<div class="plan-hero-t">Tell the app what you want from the next holiday — it suggests places that suit everyone.</div>'+
      '<div class="poll-faces">'+faces+'<span class="muted" style="font-size:12px;margin-left:6px;">'+who.length+' of '+total+' answered</span></div>'+
      '<button class="btn btn-brand btn-wide" data-action="plan-poll" style="margin-top:12px;">'+(mine ? "✏️ Change my answers" : "📝 Take the poll (1 minute)")+'</button>'+
    '</div>';
  if(!who.length){
    return head + '<div class="empty" style="padding:24px 10px;"><span class="big">🌏</span>Suggestions appear as soon as someone answers.</div>';
  }
  var sl = shortlist(), shown = sl.map(function(r){ return r.dest.id; });
  rankDestinations().forEach(function(r){
    if(shown.indexOf(r.dest.id) < 0 && voteCount(r.dest.id) > 0){ sl.push(r); shown.push(r.dest.id); }
  });
  var cards = sl.map(function(r, i){ return destCardHtml(r, i); }).join("");
  var wishes = who.filter(function(e){ return P.prefs[e].wish; }).map(function(e){
    return '<div class="wish"><strong>'+esc(pName(e))+':</strong> '+esc(P.prefs[e].wish)+'</div>';
  }).join("");
  return head +
    '<div class="section-label">Best matches for the group · based on '+who.length+' answer'+(who.length===1?'':'s')+'</div>'+
    cards +
    '<div class="muted" style="font-size:11.5px;padding:6px 2px 10px;">Tap 👍 on every place you’d happily go to. '+
      (isAdmin() ? 'When there’s a clear favourite, tap “Lock it in”.' : 'The organiser locks one in when there’s a clear favourite.')+'</div>'+
    (wishes ? '<div class="section-label">What people are hoping for</div><div class="card">'+wishes+'</div>' : '') +
    (isAdmin() ? '<button class="btn btn-ghost btn-wide" data-action="plan-custom" style="margin-top:12px;">📍 Plan somewhere that isn’t listed</button>' : '');
}

function destCardHtml(r, i){
  var d = r.dest, n = voteCount(d.id), mine = (P.votes[S.me] || []).indexOf(d.id) >= 0;
  var vibes = r.topVibes.map(function(v){ var x = PLAN_VIBES.filter(function(y){ return y.id === v; })[0]; return x ? x.icon + " " + x.label : ""; }).filter(Boolean);
  var months = fmtMonths(d.best);
  var why = [];
  if(vibes.length) why.push("Great for " + vibes.join(", "));
  why.push(r.fitsBudget === r.n ? "Fits everyone’s budget" : (r.fitsBudget + " of " + r.n + " within budget"));
  if(groupMonths().length) why.push(r.goodMonth === r.n ? "Good weather when you want to go" : (r.goodMonth + " of " + r.n + " like the timing"));
  var who = voters(d.id).map(function(e){ return pName(e); });
  return '<div class="card dest-card'+(i===0?" top":"")+'">'+
    '<div class="dest-top"><div class="dest-flag">'+d.flag+'</div>'+
      '<div style="flex:1;min-width:0;"><div class="dest-name">'+esc(d.name)+(d.country !== d.name && d.scope === "abroad" ? ' <span class="muted" style="font-weight:500;font-size:13px;">· '+esc(d.country)+'</span>' : '')+'</div>'+
      '<div class="dest-blurb">'+esc(d.blurb)+'</div></div>'+
      '<div class="dest-match">'+Math.round(r.score*100)+'%<span>match</span></div></div>'+
    '<div class="dest-why">'+why.map(function(w){ return '<div>✓ '+esc(w)+'</div>'; }).join("")+'</div>'+
    '<div class="dest-facts">'+
      '<span>💰 '+esc(d.cost)+' pp</span><span>✈️ '+esc(d.travel)+'</span><span>🛂 '+esc(VISA_LABEL[d.visa]||"")+'</span>'+
      '<span>🌤️ Best '+esc(months)+'</span><span>🗓️ '+d.days[0]+'–'+d.days[1]+' days</span>'+
    '</div>'+
    '<div class="dest-actions">'+
      '<button class="btn btn-sm '+(mine?"btn-brand":"btn-line")+'" data-action="plan-vote" data-id="'+d.id+'">👍 '+(mine?"You’re in":"I’d go")+(n?" · "+n:"")+'</button>'+
      '<button class="btn btn-ghost btn-sm" data-action="plan-preview" data-id="'+d.id+'">See a sample plan</button>'+
      (isAdmin() ? '<button class="btn btn-ghost btn-sm" data-action="plan-lock" data-id="'+d.id+'">🔒 Lock it in</button>' : '')+
    '</div>'+
    (who.length ? '<div class="muted" style="font-size:11.5px;margin-top:6px;">'+esc(who.join(", "))+'</div>' : '')+
  '</div>';
}

function viewPlanItinerary(){
  var st = P.state, dest = destById(st.dest);
  if(!dest) return '<div class="empty">That destination isn’t available any more.'+(isAdmin()?'<br><button class="btn btn-ghost btn-sm" data-action="plan-reset" style="margin-top:10px;">Back to the poll</button>':'')+'</div>';
  var start = ymdToDate(st.startDate);
  var done = st.stage === "done";
  var cities = []; P.days.forEach(function(d){ if(d.city && cities.indexOf(d.city) < 0) cities.push(d.city); });
  var head = '<div class="card plan-hero">'+
      '<div class="dest-top"><div class="dest-flag">'+dest.flag+'</div><div style="flex:1;min-width:0;">'+
        '<div class="now-hero-lbl">'+(done ? "Now the main trip" : "Locked in")+'</div>'+
        '<div class="dest-name">'+esc(dest.name)+'</div>'+
        '<div class="dest-blurb">'+P.days.length+' day'+(P.days.length===1?'':'s')+(start ? ' · from '+esc(fmtDayMonth(start)) : '')+(cities.length ? ' · '+esc(cities.join(" → ")) : '')+'</div>'+
      '</div></div>'+
      (dest.custom ? '' : '<div class="dest-facts" style="margin-top:10px;"><span>💰 '+esc(dest.cost)+' pp</span><span>🛂 '+esc(VISA_LABEL[dest.visa]||"")+'</span><span>💱 '+esc((CURRENCY_INFO[dest.currency]||{}).name||dest.currency)+'</span></div>')+
      '<div class="muted" style="font-size:12px;margin-top:10px;">'+(done
        ? 'This is now the main trip — see and edit it in the <a href="#" data-action="plan-mode" data-id="current">'+esc(tripTitle())+' plan</a>.'
        : 'Anyone can edit the plan: change a day’s city, swap or add places, add or remove days.')+'</div>'+
      (isAdmin() && !done ? '<div class="dest-actions" style="margin-top:12px;">'+
          (currentTripOver()
            ? '<button class="btn btn-brand btn-sm" data-action="plan-make-main">✈️ Make this our trip</button>'
            : '<div class="muted" style="font-size:12px;width:100%;">✈️ You can make this the main trip once '+esc(tripTitle())+' is over (after '+esc(fmtDayMonth(dayDate(tripLength())))+').</div>')+
          '<button class="btn btn-ghost btn-sm" data-action="plan-regen">↻ Start the plan over</button>'+
          '<button class="btn btn-ghost btn-sm" data-action="plan-reset">Change destination</button></div>' : '')+
      (isAdmin() && done ? '<div class="dest-actions" style="margin-top:12px;"><button class="btn btn-ghost btn-sm" data-action="plan-reset">🧭 Plan the trip after this</button></div>' : '')+
    '</div>';
  var days = P.days.map(function(d){
    var date = start ? addDays(start, d.day - 1) : null;
    var items = d.items.map(function(it){
      return '<div class="item-row"><div class="item-time">'+esc(it[0])+'</div><div class="item-text">'+esc(it[1])+'</div>'+
        (it[1] ? mapsBtnHtml(it[1], "", d.city, dest.country) : '')+'</div>';
    }).join("");
    return '<div class="day-card'+(d.day===planOpenDay?" open":"")+'">'+
      '<button class="day-head" data-action="plan-toggle-day" data-day="'+d.day+'">'+
        '<div class="day-num">'+d.day+'</div>'+
        '<div class="day-meta"><div class="d1">'+esc(d.title)+'</div>'+
        '<div class="d2">'+(date ? esc(WEEKDAY_LONG[date.getDay()].slice(0,3)+" "+fmtDayMonth(date))+' · ' : '')+(d.city ? '📍 '+esc(d.city) : 'No city set')+'</div></div>'+
        '<div class="day-chev">⌄</div></button>'+
      '<div class="day-body"><div class="day-body-in">'+(items || '<div class="muted" style="font-size:13px;padding:6px 0;">Nothing planned yet.</div>')+
        (d.tip ? '<div class="day-tip">📝 '+esc(d.tip)+'</div>' : '')+
        (done ? '' : '<button class="btn btn-ghost btn-sm" data-action="plan-edit-day" data-day="'+d.day+'" style="margin-top:10px;">✏️ Edit this day</button>')+
      '</div></div></div>';
  }).join("");
  return head + '<div class="section-label">Day by day</div>' + days + (done ? '' :
    '<div class="dest-actions" style="margin-top:12px;">'+
      '<button class="btn btn-ghost btn-sm" data-action="plan-add-day">+ Add a day</button>'+
      (P.days.length > 1 ? '<button class="btn btn-line btn-sm" data-action="plan-remove-day">− Remove last day</button>' : '')+
    '</div>');
}

/* ---------- sheets ---------- */

function openPollSheet(){
  var pr = P.prefs[S.me] || cleanPrefs({});
  var now = new Date(), months = [];
  for(var i=0;i<12;i++){ var m = (now.getMonth() + i) % 12 + 1; months.push(m); }
  function chip(role, id, label, on){ return '<div class="chip'+(on?" on":"")+'" data-role="'+role+'" data-id="'+id+'">'+label+'</div>'; }
  openSheetHtml(
    '<h3>Holiday poll</h3>'+
    '<div class="field"><label>What do you want to do? <span class="muted">(pick any)</span></label><div class="chip-grid">'+
      PLAN_VIBES.map(function(v){ return chip("pv", v.id, v.icon+" "+esc(v.label), pr.vibes.indexOf(v.id) >= 0); }).join("")+'</div></div>'+
    '<div class="field"><label>Your budget per person <span class="muted">(incl. flights)</span></label><div class="chip-grid">'+
      PLAN_BUDGETS.map(function(b){ return chip("pb", b.id, esc(b.label), pr.budget === b.id); }).join("")+'</div></div>'+
    '<div class="field"><label>How long?</label><div class="chip-grid">'+
      PLAN_LENGTHS.map(function(l){ return chip("pl", l.id, esc(l.label), pr.length === l.id); }).join("")+'</div></div>'+
    '<div class="field"><label>When could you go? <span class="muted">(pick any, or none if flexible)</span></label><div class="chip-grid">'+
      months.map(function(m){ return chip("pm", m, MONTH_SHORT[m-1], pr.months.indexOf(m) >= 0); }).join("")+'</div></div>'+
    '<div class="field"><label>Where?</label><div class="chip-grid">'+
      chip("pw","india","🇮🇳 Within India", pr.where==="india")+chip("pw","abroad","🌍 Abroad", pr.where==="abroad")+chip("pw","either","Either", pr.where==="either")+'</div></div>'+
    '<div class="field"><label>Visa</label><div class="chip-grid">'+
      chip("px","easy","Only easy visas (none / on arrival)", pr.easyVisa)+chip("px","any","Any visa is fine", !pr.easyVisa)+'</div></div>'+
    '<div class="field"><label>Anything specific you’re dying to do? <span class="muted">(optional)</span></label>'+
      '<input type="text" id="pp-wish" maxlength="160" placeholder="e.g. scuba diving, snow, a big night out" value="'+esc(pr.wish)+'"></div>'+
    '<div class="sheet-actions"><button class="btn btn-brand" id="pp-save">Save my answers</button></div>',
    function(el){
      guardSheet(el, "Close the poll without saving?");
      var cur = JSON.parse(JSON.stringify(pr));
      function sync(){
        el.querySelectorAll('[data-role="pv"]').forEach(function(c){ c.classList.toggle("on", cur.vibes.indexOf(c.dataset.id) >= 0); });
        el.querySelectorAll('[data-role="pb"]').forEach(function(c){ c.classList.toggle("on", Number(c.dataset.id) === cur.budget); });
        el.querySelectorAll('[data-role="pl"]').forEach(function(c){ c.classList.toggle("on", c.dataset.id === cur.length); });
        el.querySelectorAll('[data-role="pm"]').forEach(function(c){ c.classList.toggle("on", cur.months.indexOf(Number(c.dataset.id)) >= 0); });
        el.querySelectorAll('[data-role="pw"]').forEach(function(c){ c.classList.toggle("on", c.dataset.id === cur.where); });
        el.querySelectorAll('[data-role="px"]').forEach(function(c){ c.classList.toggle("on", (c.dataset.id === "easy") === cur.easyVisa); });
      }
      el.addEventListener("click", function(e){
        var c = e.target.closest(".chip[data-role]"); if(!c) return;
        var r = c.dataset.role, id = c.dataset.id;
        if(r === "pv"){ var i = cur.vibes.indexOf(id); if(i >= 0) cur.vibes.splice(i,1); else cur.vibes.push(id); }
        else if(r === "pb") cur.budget = Number(id);
        else if(r === "pl") cur.length = id;
        else if(r === "pm"){ var m = Number(id), j = cur.months.indexOf(m); if(j >= 0) cur.months.splice(j,1); else cur.months.push(m); }
        else if(r === "pw") cur.where = id;
        else if(r === "px") cur.easyVisa = id === "easy";
        sync();
      });
      el.querySelector("#pp-save").addEventListener("click", function(){
        cur.wish = el.querySelector("#pp-wish").value;
        if(!cur.vibes.length){ toast("Pick at least one thing you want to do", true); return; }
        writeOp(savePrefs(cur), "Thanks — suggestions updated", this);
      });
    }
  );
}

function openPreviewSheet(id){
  var d = destById(id); if(!d) return;
  var plan = genItinerary(d, Math.max(d.days[0], Math.min(d.days[1], groupLength())));
  openSheetHtml(
    '<h3>'+d.flag+' '+esc(d.name)+' · sample plan</h3>'+
    '<div class="muted" style="font-size:12.5px;margin:-6px 0 12px;">'+plan.length+' days. Once it’s locked in, everyone can edit cities, places and days.</div>'+
    plan.map(function(day){
      return '<div class="card" style="padding:12px 14px;margin-bottom:8px;"><div style="font-weight:700;font-size:14px;">Day '+day.day+' · '+esc(day.title)+'</div>'+
        day.items.map(function(it){ return '<div class="item-row" style="padding:5px 0;"><div class="item-time">'+esc(it[0])+'</div><div class="item-text">'+esc(it[1])+'</div></div>'; }).join("")+
        (day.tip ? '<div class="day-tip">📝 '+esc(day.tip)+'</div>' : '')+'</div>';
    }).join("")+
    (d.legs.length ? '<div class="section-label">Getting around</div><div class="card">'+d.legs.map(function(l){ return '<div class="bd-line"><span>'+esc(l[0])+'</span><span class="muted">'+esc(l[1])+'</span></div>'; }).join("")+'</div>' : '')+
    '<div class="muted" style="font-size:11.5px;margin-top:10px;">Costs, visa rules and travel times are rough guides — check before booking.</div>'
  );
}

function openLockSheet(id, custom){
  var d = custom ? customDest(custom) : destById(id); if(!d) return;
  var def = Math.max(d.days[0], Math.min(d.days[1], groupLength()));
  var gm = groupMonths();
  openSheetHtml(
    '<h3>Lock in '+d.flag+' '+esc(d.name)+'?</h3>'+
    '<div class="muted" style="font-size:13px;margin:-6px 0 12px;">'+voteCount(d.id)+' of '+S.people.length+' voted for it. Everyone sees the plan straight away and can edit it.</div>'+
    '<div class="field"><label>Number of days</label><div class="fx-line"><button class="btn btn-line btn-sm" id="lk-minus">−</button>'+
      '<span id="lk-days" style="min-width:60px;text-align:center;font-weight:700;font-size:16px;">'+def+'</span><button class="btn btn-line btn-sm" id="lk-plus">+</button>'+
      (d.custom ? '' : '<span class="muted" style="font-size:12px;">ideal '+d.days[0]+'–'+d.days[1]+'</span>')+'</div></div>'+
    '<div class="field"><label>Start date <span class="muted">(optional — you can set it later)</span></label><input type="date" id="lk-start" min="'+esc(todayYmd())+'"></div>'+
    (gm.length ? '<div class="split-hint" style="margin:-6px 0 12px;">Most people said: '+gm.slice(0,3).map(function(m){ return MONTH_SHORT[m-1]; }).join(", ")+'</div>' : '')+
    '<div class="sheet-actions"><button class="btn btn-brand" id="lk-go">🔒 Lock it in &amp; build the plan</button></div>',
    function(el){
      var n = def;
      function show(){ el.querySelector("#lk-days").textContent = n + (n === 1 ? " day" : " days"); }
      show();
      el.querySelector("#lk-minus").addEventListener("click", function(){ n = Math.max(1, n-1); show(); });
      el.querySelector("#lk-plus").addEventListener("click", function(){ n = Math.min(PLAN_MAX_DAYS, n+1); show(); });
      el.querySelector("#lk-go").addEventListener("click", function(){
        var sd = el.querySelector("#lk-start").value;
        planMode = "next"; planOpenDay = 1;
        writeOp(lockDestination(d.id, n, sd, custom || null), d.name + " locked in — plan ready", this);
      });
    }
  );
}

function openCustomDestSheet(){
  var curOpts = Object.keys(CURRENCY_INFO).map(function(c){ return '<option value="'+c+'"'+(c==="INR"?" selected":"")+'>'+c+' — '+esc(CURRENCY_INFO[c].name)+'</option>'; }).join("");
  openSheetHtml(
    '<h3>Plan somewhere else</h3>'+
    '<div class="field"><label>Trip name</label><input type="text" id="cd-name" maxlength="40" placeholder="e.g. Spiti Valley"></div>'+
    '<div class="field"><label>Country</label><input type="text" id="cd-country" maxlength="40" list="cd-countries" placeholder="e.g. UAE">'+
      '<datalist id="cd-countries">'+COUNTRY_NAMES.map(function(n){ return '<option value="'+esc(n)+'">'; }).join("")+'</datalist></div>'+
    '<div class="field"><label>Cities or stops, in order <span class="muted">(comma separated)</span></label><input type="text" id="cd-cities" maxlength="200" placeholder="e.g. Shimla, Kaza, Chandratal"></div>'+
    '<div class="field"><label>Currency for bills there</label><select id="cd-cur">'+curOpts+'</select>'+
      '<div class="split-hint">Set automatically from the country — change it if you need to.</div></div>'+
    '<div class="sheet-actions"><button class="btn btn-brand" id="cd-next">Next: days &amp; dates</button></div>',
    function(el){
      guardSheet(el, "Discard this destination?");
      el.querySelector("#cd-country").addEventListener("input", function(){
        var c = currencyForCountry(this.value); if(c) el.querySelector("#cd-cur").value = c;
      });
      el.querySelector("#cd-next").addEventListener("click", function(){
        var name = cleanText(el.querySelector("#cd-name").value, 40);
        var cities = el.querySelector("#cd-cities").value.split(",").map(function(s){ return cleanText(s, 40); }).filter(Boolean).slice(0, 10);
        if(!name){ toast("Give the trip a name", true); return; }
        var custom = { id:"custom", name:name, country: cleanText(el.querySelector("#cd-country").value, 40) || name,
                       cities: cities.length ? cities : [name], currency: el.querySelector("#cd-cur").value };
        closeSheet();
        openLockSheet("custom", custom);
      });
    }
  );
}

function openPlanDaySheet(dayNum){
  var day = P.days.filter(function(d){ return d.day === dayNum; })[0]; if(!day) return;
  var dest = destById(P.state.dest);
  var cityNames = dest ? dest.cities.map(function(c){ return c.name; }) : [];
  var used = {}; P.days.forEach(function(d){ d.items.forEach(function(it){ used[it[1]] = true; }); });
  function suggestionsFor(city){
    var c = dest && dest.cities.filter(function(x){ return x.name === city; })[0];
    if(!c) return [];
    return c.places.concat((c.eat||[]).map(function(e){ return "Try " + e; })).filter(function(p){ return !used[p]; });
  }
  var items = day.items.map(function(it){ return it.slice(); });
  function rowHtml(it, i){
    return '<div class="split-row" data-idx="'+i+'">'+
      '<input type="text" class="split-input" data-role="pt" data-idx="'+i+'" style="width:108px;" maxlength="20" value="'+esc(it[0])+'" placeholder="Morning">'+
      '<input type="text" class="split-input" data-role="px" data-idx="'+i+'" style="flex:1;min-width:0;" maxlength="90" value="'+esc(it[1])+'" placeholder="Place or plan">'+
      '<button class="btn btn-line btn-sm" data-role="pdel" data-idx="'+i+'" aria-label="Remove">✕</button></div>';
  }
  openSheetHtml(
    '<h3>Edit day '+day.day+'</h3>'+
    '<div class="field"><label>City / base</label><input type="text" id="pd-city" maxlength="40" list="pd-cities" value="'+esc(day.city)+'">'+
      '<datalist id="pd-cities">'+cityNames.map(function(c){ return '<option value="'+esc(c)+'">'; }).join("")+'</datalist></div>'+
    '<div class="field"><label>Title</label><input type="text" id="pd-title" maxlength="60" value="'+esc(day.title)+'"></div>'+
    '<div class="field"><label>Plan for the day</label><div id="pd-items">'+items.map(rowHtml).join("")+'</div>'+
      '<button class="btn btn-ghost btn-sm" id="pd-add" style="margin-top:4px;">+ Add your own</button></div>'+
    '<div class="field" id="pd-sugg-wrap"><label>Ideas for <span id="pd-sugg-city"></span> <span class="muted">(tap to add)</span></label><div class="chip-grid" id="pd-sugg"></div></div>'+
    '<div class="field"><label>Tip <span class="muted">(optional)</span></label><input type="text" id="pd-tip" maxlength="140" value="'+esc(day.tip)+'"></div>'+
    '<div class="sheet-actions"><button class="btn btn-brand" id="pd-save">Save day</button></div>',
    function(el){
      guardSheet(el, "Close without saving this day?");
      function redrawRows(){
        el.querySelector("#pd-items").innerHTML = items.map(rowHtml).join("");
      }
      function slotFor(){
        var labels = ["Morning","Afternoon","Evening"];
        var usedSlots = items.map(function(it){ return it[0]; });
        for(var i=0;i<labels.length;i++) if(usedSlots.indexOf(labels[i]) < 0) return labels[i];
        return "Later";
      }
      function redrawSugg(){
        var city = el.querySelector("#pd-city").value.trim();
        var s = suggestionsFor(city).filter(function(p){ return !items.some(function(it){ return it[1] === p; }); });
        el.querySelector("#pd-sugg-city").textContent = city || "this city";
        el.querySelector("#pd-sugg").innerHTML = s.length
          ? s.map(function(p){ return '<div class="chip" data-role="psug" data-p="'+esc(p)+'" style="font-size:12.5px;">+ '+esc(p)+'</div>'; }).join("")
          : '<div class="muted" style="font-size:12.5px;">'+(city ? "No built-in ideas for "+esc(city)+" — add your own above." : "Set a city to see ideas.")+'</div>';
      }
      el.querySelector("#pd-items").addEventListener("input", function(e){
        var i = Number(e.target.dataset.idx); if(!items[i]) return;
        if(e.target.dataset.role === "pt") items[i][0] = e.target.value; else if(e.target.dataset.role === "px") items[i][1] = e.target.value;
      });
      el.querySelector("#pd-items").addEventListener("click", function(e){
        var b = e.target.closest('[data-role="pdel"]'); if(!b) return;
        items.splice(Number(b.dataset.idx), 1); redrawRows(); redrawSugg();
      });
      el.querySelector("#pd-add").addEventListener("click", function(){ items.push([slotFor(), ""]); redrawRows();
        var ins = el.querySelectorAll('[data-role="px"]'); if(ins.length) ins[ins.length-1].focus(); });
      el.querySelector("#pd-sugg").addEventListener("click", function(e){
        var c = e.target.closest('[data-role="psug"]'); if(!c) return;
        if(items.length >= 30){ toast("That's a full day already", true); return; }
        items.push([slotFor(), c.dataset.p]); redrawRows(); redrawSugg();
      });
      el.querySelector("#pd-city").addEventListener("input", redrawSugg);
      redrawSugg();
      el.querySelector("#pd-save").addEventListener("click", function(){
        var upd = { day: day.day, city: el.querySelector("#pd-city").value.trim(), title: el.querySelector("#pd-title").value.trim(),
                    items: sortTimedItems(items.filter(function(it){ return (it[0]||"").trim() || (it[1]||"").trim(); })), tip: el.querySelector("#pd-tip").value.trim() };
        writeOp(savePlanDay(upd), "Day " + day.day + " saved", this);
      });
    }
  );
}

function openMakeMainSheet(){
  var dest = destById(P.state.dest); if(!dest) return;
  var sd = P.state.startDate || "";
  var cur = dest.currency || "INR";
  openSheetHtml(
    '<h3>'+(hasTrip() ? 'Make '+dest.flag+' '+esc(dest.name)+' our trip?' : 'Start the '+dest.flag+' '+esc(dest.name)+' trip?')+'</h3>'+
    (hasTrip()
      ? '<div class="day-tip" style="font-style:normal;margin:-4px 0 12px;">This replaces the <strong>'+esc(tripTitle())+'</strong> plan, dates and budget for everyone — that can’t be undone. '+
        'All bills and balances stay exactly as they are; '+esc(tripTitle())+' bills move under “earlier trips”.</div>'
      : '<div class="day-tip" style="font-style:normal;margin:-4px 0 12px;">This becomes the group’s trip: the plan shows on the Plan and Now tabs, with its dates, map searches and currency for bills.</div>')+
    '<div class="field"><label>Trip starts</label><input type="date" id="mm-start" value="'+esc(sd)+'"></div>'+
    '<div class="split-hint" id="mm-len" style="margin:-6px 0 12px;"></div>'+
    '<div class="muted" style="font-size:12.5px;margin-bottom:12px;">'+(cur === "INR" ? "Bills will be in ₹." : "New bills can be entered in ₹ or "+esc(cur)+" ("+esc((CURRENCY_INFO[cur]||{}).name||cur)+"), converted at the day’s rate or your airport rate.")+
      ' Set a budget in ⚙️ Trip settings afterwards.</div>'+
    '<div class="sheet-actions"><button class="btn btn-brand" id="mm-go">✈️ Make it our trip</button></div>',
    function(el){
      var inp = el.querySelector("#mm-start");
      function len(){ var a = ymdToDate(inp.value); el.querySelector("#mm-len").textContent = a ? (P.days.length+" days · "+fmtDayMonth(a)+" → "+fmtDayMonth(addDays(a, P.days.length-1))) : "Pick the first day of the trip"; }
      inp.addEventListener("change", len); len();
      el.querySelector("#mm-go").addEventListener("click", function(){
        if(!ymdToDate(inp.value)){ toast("Pick the date the trip starts", true); return; }
        var btn = this;
        writeOp(makeMainTrip(inp.value).then(function(){ planMode = "current"; }), dest.name + " is now the trip ✈️", btn);
      });
    }
  );
}

/* ---------- actions ---------- */

document.addEventListener("click", function(e){
  var t = e.target.closest("[data-action]");
  if(!t) return;
  var a = t.dataset.action;
  if(a === "plan-mode"){ planMode = t.dataset.id; render(); var v = document.getElementById("view"); if(v) v.scrollTop = 0; }
  else if(a === "goto-next"){ planMode = "next"; setTab("itinerary"); }
  else if(a === "plan-poll") openPollSheet();
  else if(a === "plan-vote") writeOp(toggleVote(t.dataset.id), null, t);
  else if(a === "plan-preview") openPreviewSheet(t.dataset.id);
  else if(a === "plan-lock") openLockSheet(t.dataset.id);
  else if(a === "plan-custom") openCustomDestSheet();
  else if(a === "plan-toggle-day"){ var d = Number(t.dataset.day); planOpenDay = planOpenDay === d ? 0 : d; render(); }
  else if(a === "plan-edit-day") openPlanDaySheet(Number(t.dataset.day));
  else if(a === "plan-add-day") writeOp(addPlanDay(), "Day added", t);
  else if(a === "plan-remove-day"){
    if(t.dataset.armed !== "1"){ t.dataset.armed = "1"; t.textContent = "Tap again to remove"; setTimeout(function(){ if(t.isConnected){ t.dataset.armed = ""; t.textContent = "− Remove last day"; } }, 3000); return; }
    writeOp(removeLastPlanDay(), "Day removed", t);
  }
  else if(a === "plan-regen"){
    if(!window.confirm("Start the plan over from the guide? Everyone's edits to the days will be replaced.")) return;
    writeOp(lockDestination(P.state.dest, P.days.length || P.state.days, P.state.startDate, P.state.custom || null), "Fresh plan built", t);
  }
  else if(a === "plan-reset"){
    var done = P.state && P.state.stage === "done";
    if(!window.confirm(done ? "Start planning the next trip? The current trip stays as it is." : "Go back to the poll and pick a different destination? The current draft plan will be dropped.")) return;
    writeOp(resetPlanner(), "Back to the poll", t);
  }
  else if(a === "plan-make-main") openMakeMainSheet();
});
