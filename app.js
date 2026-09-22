/* ====================== Trip content ====================== */

var SEED_ITINERARY = [
  { day:1, date:"17 Nov", weekday:"Tuesday", stay:"Kandy", title:"Colombo Airport → Kandy",
    items:[["Morning","Depart Bangalore, land in Colombo, pick up the rental car"],
           ["Morning","Drive to Kandy — about 3–3.5 hrs"],["1:30 PM","Lunch"],
           ["2:30 PM","Temple of the Sacred Tooth Relic"],["4:00 PM","Kandy Lake"],
           ["5:00 PM","Bahirawakanda Buddha viewpoint"],["6:00 PM","Explore Kandy town"],
           ["7:30 PM","Dinner"],["9:00 PM","Hotel / relax"]],
    tip:"Keep it an early night — hill country driving tomorrow." },
  { day:2, date:"18 Nov", weekday:"Wednesday", stay:"Nuwara Eliya", title:"Kandy → Nuwara Eliya",
    items:[["8:00 AM","Breakfast, then checkout"],["—","Drive to Nuwara Eliya — about 2.5–3 hrs"],
           ["11:30 AM","Arrive, tea plantation + tea factory"],["1:30 PM","Lunch"],
           ["2:30 PM","Gregory Lake"],["4:00 PM","Victoria Park"],
           ["5:00 PM","Explore town / colonial area"],["7:30 PM","Dinner"],["9:30 PM","Sleep"]],
    tip:"Tea country and a relaxed hill-station day — one night here is enough." },
  { day:3, date:"19 Nov", weekday:"Thursday", stay:"Ella (night 1 of 2)", title:"Nuwara Eliya → Ella",
    items:[["8:00 AM","Breakfast"],
           ["8:30 AM","Choose one: tea estate / Lover's Leap Waterfall / Ramboda Falls / a relaxed café"],
           ["10:30 AM","Checkout"],["—","Drive to Ella — about 2–2.5 hrs"],
           ["1:00 PM","Arrive, lunch, hotel check-in"],
           ["3:00 PM","Nine Arch Bridge ⭐⭐⭐⭐⭐ and Little Adam's Peak ⭐⭐⭐⭐"],
           ["6:00 PM","Back to hotel"],["7:30 PM","Dinner, then relax"]], tip:"" },
  { day:4, date:"20 Nov", weekday:"Friday", stay:"Ella (night 2 of 2)", title:"Full Ella day",
    items:[["8:30 AM","Breakfast"],
           ["9:30 AM","Ella Rock (proper hike) or Ravana Falls + viewpoints (easier)"],
           ["12:30 PM","Lunch"],["2:00 PM","Ella town — cafés, shopping, spa, relax at the hotel"],
           ["7:30 PM","Dinner, then drinks"],["10:00 PM","Ella bar hopping — backpacker/social scene"]], tip:"" },
  { day:5, date:"21 Nov", weekday:"Saturday", stay:"Mirissa", title:"Ella → Mirissa",
    items:[["10:00 AM","Wake up (later start after Friday night), breakfast"],
           ["11:30 AM","Checkout, leave Ella"],["—","Drive to Mirissa — about 3.5–4.5 hrs"],
           ["4:30 PM","Arrive, check in"],["5:30 PM","Mirissa Beach, sunset, Coconut Tree Hill"],
           ["7:30 PM","Dinner"],["9:00 PM","Beach bars — the main party night"]],
    tip:"If you're drinking, leave the rental car at the hotel and use tuk-tuks or taxis." },
  { day:6, date:"22 Nov", weekday:"Sunday", stay:"Colombo", title:"Mirissa → Galle → Colombo",
    items:[["10:00 AM","Wake up, breakfast"],
           ["11:30 AM","Beach time — pick 1–2: surfing, snorkelling, kayaking, swimming"],
           ["1:30 PM","Lunch, then leave Mirissa"],["—","Drive to Galle — about 1–1.5 hrs"],
           ["4:00 PM","Galle Fort — walls, lighthouse, colonial streets, cafés, shopping"],
           ["6:30 PM","Sunset at the Fort"],["8:30 PM","Dinner, then leave for Colombo"],
           ["—","Drive to Colombo — about 2–2.5 hrs"],["~12:00 AM","Arrive Colombo"]],
    tip:"Your biggest combined day — pace it and don't try to do everything on the beach." },
  { day:7, date:"23 Nov", weekday:"Monday", stay:"Departure", title:"Colombo → Departure",
    items:[["Morning","Sightsee in Colombo"],["Afternoon","Departure flight to Bangalore"]], tip:"" }
];

// [route, duration, trip day it happens on]
var DRIVE_LEGS = [["Airport → Kandy","~3–3.5h",1],["Kandy → N'Eliya","~2.5–3h",2],
  ["N'Eliya → Ella","~2–2.5h",3],["Ella → Mirissa","~3.5–4.5h",5],
  ["Mirissa → Galle","~1–1.5h",6],["Galle → Colombo","~2–2.5h",6]];

var BUDGET_REF = [["Flights","₹28,000 / person"],["Food","₹1,300–1,500 / day"],
  ["Car rental","₹45,000 total"],["Petrol","₹8,500 total"],["Stays","~₹34,300 total"]];

var CATEGORIES = [
  {id:"stay",label:"Stay",icon:"🏨"},{id:"food",label:"Food",icon:"🍛"},
  {id:"transport",label:"Transport",icon:"🚗"},{id:"activity",label:"Activity",icon:"🥾"},
  {id:"shopping",label:"Shopping",icon:"🛍️"},{id:"other",label:"Other",icon:"📌"}
];

var VALID_CATEGORIES = CATEGORIES.map(function(c){ return c.id; });
var MAX_DESC_LEN = 80, MAX_NAME_LEN = 40, MAX_UPI_LEN = 60, MAX_AMOUNT = 10000000;

// The itinerary dates (17–23 Nov) don't carry a year in the data — this is
// the trip year they resolve against for the "Right Now" view's date math.
var TRIP_YEAR = 2026;
var MONTH_NUM = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };

/** Parses a "17 Nov" style date string (from ITINERARY) into a real Date at local midnight. */
function parseTripDate(dateStr){
  var parts = String(dateStr||"").trim().split(/\s+/);
  var dayNum = parseInt(parts[0],10);
  var mon = MONTH_NUM[parts[1]];
  if(!isFinite(dayNum) || mon===undefined) return null;
  return new Date(TRIP_YEAR, mon, dayNum);
}

/** Parses an item's time label ("2:30 PM") against a given day's Date. Returns a Date or null for non-clock labels like "Morning"/"—". */
function parseItemTime(baseDate, timeStr){
  var m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(timeStr||"").trim());
  if(!m || !baseDate) return null;
  var h = parseInt(m[1],10) % 12;
  if(/pm/i.test(m[3])) h += 12;
  var d = new Date(baseDate.getTime());
  d.setHours(h, parseInt(m[2],10), 0, 0);
  return d;
}

/* ====================== Firebase ====================== */

var auth = firebase.auth();
var db = firebase.firestore();
try{
  db.enablePersistence({ synchronizeTabs:true }).catch(function(err){
    // Multiple tabs open, or browser doesn't support it — app still works,
    // just without offline write queuing in that case.
    console.warn("Offline persistence unavailable:", err && err.code);
  });
} catch(e){}

var S = { me:"", myPhoto:"", joined:false, people:[], bills:[], settlements:[], itinerary:[], fetchedAt:"" };
var activeTab = "now";
var openDay = 1;
var booted = false;
var syncState = "ok";
var unsubPeople = null, unsubBills = null, unsubSettlements = null, unsubItinerary = null;
var latestSnapshots = { people:null, bills:null, settlements:null, itinerary:null };
var itinerarySeeded = false;
var joinShown = false;

/* ====================== Helpers ====================== */

function esc(s){
  return String(s==null?"":s).replace(/[&<>"']/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}
function round2(n){ return Math.round((Number(n)+Number.EPSILON)*100)/100; }
function inr(n){
  n = round2(n); var neg = n<0; n = Math.abs(n);
  var parts = n.toFixed(2).split("."), ip = parts[0], dec = parts[1];
  var last3 = ip.slice(-3), rest = ip.slice(0,-3);
  if(rest !== "") last3 = "," + last3;
  var grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g,",") + last3;
  return (neg?"−":"") + "₹" + grouped + (dec==="00"?"":"."+dec);
}
function normEmail(v){ return String(v==null?"":v).trim().toLowerCase(); }
function cleanText(v, maxLen){ return String(v==null?"":v).replace(/\s+/g," ").trim().slice(0,maxLen); }
function person(email){
  for(var i=0;i<S.people.length;i++) if(S.people[i].email===email) return S.people[i];
  return {email:email,name:email?email.split("@")[0]:"Unknown",upi:"",photo:""};
}
function pName(email){ return person(email).name; }
function initial(email){ return (pName(email)||"?").charAt(0).toUpperCase(); }
function catIcon(id){
  for(var i=0;i<CATEGORIES.length;i++) if(CATEGORIES[i].id===id) return CATEGORIES[i].icon;
  return "📌";
}
/** Builds a universal maps search link: opens the Google Maps app on
    Android, Apple/Google Maps (whichever is set up) on iOS via the browser,
    or Google Maps in a normal browser tab everywhere else. No platform
    sniffing needed — https://maps.google.com links are handled natively by
    both platforms' map apps when tapped. */
function mapsUrl(place){
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(place);
}
function mapsBtnHtml(place, extraStyle){
  if(!place) return "";
  return '<a class="map-pin" href="'+esc(mapsUrl(place))+'" target="_blank" rel="noopener" '+
    'title="Open in Maps" onclick="event.stopPropagation()" style="'+(extraStyle||"")+'">📍</a>';
}

function avatarHtml(email){
  var p = person(email);
  if(p.photo) return '<div class="avatar"><img src="'+esc(p.photo)+'" alt=""></div>';
  return '<div class="avatar">'+esc(initial(email))+'</div>';
}

var toastTimer=null;
function toast(msg, bad){
  var t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (bad?" bad":"");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.className = "toast" + (bad?" bad":""); }, 2600);
}

/* ====================== Balance engine ====================== */

/** Splits `amount` (rupees) across people in proportion to `weights`
    ({email: weight}), working in whole paise with the largest-remainder
    method so the parts ALWAYS add up to exactly `amount` — no ₹0.01 drift,
    no phantom "pay ₹0.01" settlements. A weight of 0 means that person
    pays nothing. Ties go to the alphabetically-first email so every device
    computes identical results. Returns { email: paise }. */
function allocatePaise(amount, weights){
  var totalPaise = Math.round(Number(amount)*100);
  var emails = Object.keys(weights).filter(function(e){ return (Number(weights[e])||0) > 0; }).sort();
  var out = {};
  Object.keys(weights).forEach(function(e){ out[e] = 0; });
  var totalW = emails.reduce(function(s,e){ return s + Number(weights[e]); }, 0);
  if(!emails.length || totalW <= 0 || !isFinite(totalPaise)) return out;
  var assigned = 0, rema = [];
  emails.forEach(function(e){
    var exact = totalPaise * Number(weights[e]) / totalW;
    var fl = Math.floor(exact);
    out[e] = fl; assigned += fl;
    rema.push({ e:e, r: exact - fl });
  });
  rema.sort(function(a,b){ return (b.r - a.r) || (a.e < b.e ? -1 : a.e > b.e ? 1 : 0); });
  for(var i=0; assigned < totalPaise; i = (i+1) % rema.length){ out[rema[i].e]++; assigned++; }
  return out;
}

/** Per-person paise owed for one bill, honoring its split mode. */
function billSharesPaise(b){
  var people = b.split || [];
  var w = {};
  if(b.splitMode === "itemized" && Array.isArray(b.items)){
    var sum = {};
    b.items.forEach(function(item){
      var ip = item.people || [];
      if(!ip.length) return;
      var iw = {}, anyPct = false;
      ip.forEach(function(e){
        iw[e] = (item.mode === "percent" && item.percents) ? Math.max(0, Number(item.percents[e])||0) : 1;
        if(iw[e] > 0) anyPct = true;
      });
      if(!anyPct) ip.forEach(function(e){ iw[e] = 1; });
      var part = allocatePaise(round2(item.amount), iw);
      Object.keys(part).forEach(function(e){ sum[e] = (sum[e]||0) + part[e]; });
    });
    return sum;
  }
  if(b.splitMode === "exact" && b.splitAmounts){
    // Exact amounts are validated to within ₹0.02 of the total; use them as
    // weights so any tiny rounding gap is absorbed and totals match exactly.
    people.forEach(function(e){ w[e] = Math.max(0, Number(b.splitAmounts[e])||0); });
    var anyExact = people.some(function(e){ return w[e] > 0; });
    if(anyExact) return allocatePaise(b.amount, w);
  } else if(b.splitMode === "shares" && b.splitShares){
    people.forEach(function(e){ w[e] = Math.max(0, Number(b.splitShares[e])||0); });
    var anyShare = people.some(function(e){ return w[e] > 0; });
    if(anyShare) return allocatePaise(b.amount, w);
  }
  w = {}; people.forEach(function(e){ w[e] = 1; });
  return allocatePaise(b.amount, w);
}

/** Same as billSharesPaise but in rupees, for display. */
function billShares(b){
  var p = billSharesPaise(b), out = {};
  Object.keys(p).forEach(function(e){ out[e] = p[e]/100; });
  return out;
}

/** Balances computed in integer paise (exact), returned in rupees. */
function computeBalances(){
  var bal = {};
  S.people.forEach(function(p){ bal[p.email] = 0; });
  function add(e, paise){ bal[e] = (bal[e]||0) + paise; }
  S.bills.forEach(function(b){
    var shares = billSharesPaise(b), allocated = 0;
    Object.keys(shares).forEach(function(e){ add(e, -shares[e]); allocated += shares[e]; });
    add(b.paidBy, allocated);   // equals the bill amount for any valid bill
  });
  S.settlements.forEach(function(s){
    var p = Math.round(s.amount*100);
    add(s.from, p);
    add(s.to, -p);
  });
  var out = {};
  Object.keys(bal).forEach(function(e){ out[e] = bal[e]/100; });
  return out;
}

function computeSettlements(bal){
  var creditors = [], debtors = [];
  Object.keys(bal).forEach(function(e){
    var v = bal[e];
    if(v > 0.005) creditors.push({email:e, amt:v});
    else if(v < -0.005) debtors.push({email:e, amt:-v});
  });
  creditors.sort(function(a,b){ return b.amt-a.amt || a.email.localeCompare(b.email); });
  debtors.sort(function(a,b){ return b.amt-a.amt || a.email.localeCompare(b.email); });
  var out=[], i=0, j=0;
  while(i<debtors.length && j<creditors.length){
    var d=debtors[i], c=creditors[j];
    var amt = Math.min(d.amt, c.amt);
    if(amt > 0.005) out.push({from:d.email, to:c.email, amount:round2(amt)});
    d.amt = round2(d.amt-amt); c.amt = round2(c.amt-amt);
    if(d.amt <= 0.005) i++;
    if(c.amt <= 0.005) j++;
  }
  return out;
}

/* ====================== Validation (client-side mirror of old server checks) ====================== */

function validateBill(payload, peopleEmails){
  var desc = cleanText(payload && payload.desc, MAX_DESC_LEN);
  if(!desc) throw new Error("Add a short description for the bill.");

  var category = String((payload && payload.category) || "other").toLowerCase();
  if(VALID_CATEGORIES.indexOf(category)===-1) category = "other";

  var paidBy = normEmail(payload && payload.paidBy);
  if(peopleEmails.indexOf(paidBy)===-1) throw new Error("Whoever paid needs to have joined the trip first.");

  var splitMode = String((payload && payload.splitMode) || "equal").toLowerCase();
  if(["equal","exact","shares","itemized"].indexOf(splitMode)===-1) splitMode = "equal";

  if(splitMode === "itemized"){
    var rawItems = (payload && payload.items) || [];
    if(!Array.isArray(rawItems) || !rawItems.length) throw new Error("Add at least one line item.");
    var items = [], allPeople = [], total = 0;
    for(var ii=0; ii<rawItems.length; ii++){
      var ri = rawItems[ii];
      var idesc = cleanText(ri.desc, MAX_DESC_LEN);
      var iamt = round2(ri.amount);
      if(!idesc) throw new Error("Every line item needs a name.");
      if(!isFinite(iamt) || iamt<=0) throw new Error('Enter an amount for "'+idesc+'".');
      var ipeople = Array.isArray(ri.people) ? ri.people.map(normEmail).filter(function(e){return e;}) : [];
      ipeople = ipeople.filter(function(e,idx){ return ipeople.indexOf(e)===idx; });
      if(!ipeople.length) throw new Error('Pick who shared "'+idesc+'".');
      ipeople.forEach(function(e){
        if(peopleEmails.indexOf(e)===-1) throw new Error("Everyone in the split needs to have joined the trip first.");
        if(allPeople.indexOf(e)===-1) allPeople.push(e);
      });
      var imode = (ri.mode==="percent") ? "percent" : "equal";
      var item = { desc:idesc, amount:iamt, people:ipeople, mode:imode };
      if(imode==="percent"){
        var pcts = {}, pctSum = 0;
        ipeople.forEach(function(e){
          var p = Number(ri.percents && ri.percents[e]);
          if(!isFinite(p)||p<0) p = 0;
          pcts[e]=p; pctSum += p;
        });
        if(Math.abs(pctSum-100) > 0.5) throw new Error('"'+idesc+'" percentages need to add up to 100% (currently '+Math.round(pctSum)+'%).');
        item.percents = pcts;
      }
      items.push(item);
      total = round2(total+iamt);
    }
    if(!allPeople.length) throw new Error("Pick at least one person across the line items.");
    return { desc:desc, amount:total, category:category, paidBy:paidBy, split:allPeople, splitMode:"itemized", items:items };
  }

  var amount = round2(payload && payload.amount);
  if(!isFinite(amount) || amount<=0) throw new Error("Enter an amount greater than zero.");
  if(amount > MAX_AMOUNT) throw new Error("That amount looks too large — check the digits.");

  var rawSplit = (payload && payload.split) || [];
  if(!Array.isArray(rawSplit)) rawSplit = [];
  var split = [];
  for(var i=0;i<rawSplit.length;i++){
    var e = normEmail(rawSplit[i]);
    if(e && split.indexOf(e)===-1){
      if(peopleEmails.indexOf(e)===-1) throw new Error("Everyone in the split needs to have joined the trip first.");
      split.push(e);
    }
  }
  if(!split.length) throw new Error("Pick at least one person to split this between.");

  var out = { desc:desc, amount:amount, category:category, paidBy:paidBy, split:split, splitMode:splitMode };

  if(splitMode === "exact"){
    var rawAmts = (payload && payload.splitAmounts) || {};
    var amts = {}, sum = 0;
    split.forEach(function(e){
      var v = round2(rawAmts[e]);
      if(!isFinite(v) || v<0) v = 0;
      amts[e] = v; sum = round2(sum+v);
    });
    if(sum <= 0) throw new Error("Enter how much each person owes.");
    if(Math.abs(sum-amount) > 0.02) throw new Error("The exact amounts (" + inr(sum) + ") need to add up to the bill total (" + inr(amount) + ").");
    out.splitAmounts = amts;
  } else if(splitMode === "shares"){
    var rawShares = (payload && payload.splitShares) || {};
    var shares = {}, anyPositive = false;
    split.forEach(function(e){
      var v = Number(rawShares[e]);
      if(!isFinite(v) || v<0) v = 0;
      if(v>0) anyPositive = true;
      shares[e] = v;
    });
    if(!anyPositive) throw new Error("Give at least one person a share greater than zero.");
    out.splitShares = shares;
  }

  return out;
}

/* ====================== Firestore bridge ====================== */

function setSync(st){
  syncState = st;
  var dot = document.getElementById("sync-dot");
  if(dot) dot.className = "sync-dot" + (st==="busy"?" busy":(st==="err"?" err":(st==="offline"?" offline":"")));
  updateOfflineBanner();
}

var isOffline = !navigator.onLine;
var pendingWrites = 0;

function updateOfflineBanner(){
  var b = document.getElementById("offline-banner");
  if(!b) return;
  if(isOffline){
    b.style.display = "flex";
    b.querySelector(".ob-text").textContent = pendingWrites > 0
      ? "Offline · " + pendingWrites + " change" + (pendingWrites===1?"":"s") + " will sync when you're back online"
      : "Offline · you can still add bills, they'll sync later";
  } else if(pendingWrites > 0){
    b.style.display = "flex";
    b.querySelector(".ob-text").textContent = "Syncing " + pendingWrites + " change" + (pendingWrites===1?"":"s") + "…";
  } else {
    b.style.display = "none";
  }
}

window.addEventListener("online", function(){ isOffline = false; updateOfflineBanner(); });
window.addEventListener("offline", function(){ isOffline = true; updateOfflineBanner(); });

function docId(email){
  // Firestore doc IDs can't contain '/'; emails are otherwise safe.
  return email.replace(/\//g,"_");
}

function newId(prefix){
  return prefix + "_" + Date.now().toString(36) + "_" + Math.floor(Math.random()*1e6).toString(36);
}

function tsToIso(ts){
  if(!ts) return "";
  if(typeof ts.toDate === "function") return ts.toDate().toISOString();
  return String(ts);
}

function rebuildState(){
  var peopleSnap = latestSnapshots.people;
  var billsSnap = latestSnapshots.bills;
  var settlementsSnap = latestSnapshots.settlements;
  var itinerarySnap = latestSnapshots.itinerary;
  if(!peopleSnap || !billsSnap || !settlementsSnap || !itinerarySnap) return; // wait for all four

  var people = [];
  peopleSnap.forEach(function(doc){
    var d = doc.data();
    people.push({
      email: doc.id,
      name: String(d.name||"").trim() || doc.id.split("@")[0],
      upi: String(d.upi||"").trim(),
      photo: String(d.photo||""),
      joinedAt: tsToIso(d.joinedAt)
    });
  });
  people.sort(function(a,b){ return String(a.joinedAt).localeCompare(String(b.joinedAt)); });

  var bills = [];
  billsSnap.forEach(function(doc){
    var d = doc.data();
    if(d.deleted) return;
    var split = Array.isArray(d.split) ? d.split.map(normEmail).filter(function(e){return e!=="";}) : [];
    if(!split.length) return;
    var amount = Number(d.amount);
    if(!isFinite(amount) || amount<=0) return;
    bills.push({
      id: doc.id,
      createdAt: tsToIso(d.createdAt),
      desc: String(d.desc||""),
      amount: round2(amount),
      category: String(d.category||"other"),
      paidBy: normEmail(d.paidBy),
      split: split,
      splitMode: String(d.splitMode||"equal"),
      splitAmounts: d.splitAmounts || null,
      splitShares: d.splitShares || null,
      items: Array.isArray(d.items) ? d.items : null,
      addedBy: normEmail(d.addedBy)
    });
  });

  var settlements = [];
  settlementsSnap.forEach(function(doc){
    var d = doc.data();
    if(d.deleted) return;
    var amount = Number(d.amount);
    if(!isFinite(amount) || amount<=0) return;
    settlements.push({
      id: doc.id,
      createdAt: tsToIso(d.createdAt),
      from: normEmail(d.from),
      to: normEmail(d.to),
      amount: round2(amount),
      markedBy: normEmail(d.markedBy)
    });
  });

  var itinerary = [];
  if(itinerarySnap.empty){
    // Nobody has synced the itinerary yet — fall back to the built-in seed
    // data so the app still works, and seed Firestore once so edits persist.
    itinerary = SEED_ITINERARY.slice();
    // Only members may write it, so wait until this person has joined.
    if(people.some(function(p){ return p.email === S.me; })) seedItineraryOnce();
  } else {
    itinerarySnap.forEach(function(doc){
      var d = doc.data();
      itinerary.push({
        day: Number(d.day)||0,
        date: String(d.date||""),
        weekday: String(d.weekday||""),
        stay: String(d.stay||""),
        title: String(d.title||""),
        items: itemsFromFirestore(d.items),
        tip: String(d.tip||"")
      });
    });
    itinerary.sort(function(a,b){ return a.day-b.day; });
  }

  var joined = false;
  for(var i=0;i<people.length;i++) if(people[i].email===S.me){ joined = true; break; }

  S.people = people;
  S.bills = bills;
  S.settlements = settlements;
  S.itinerary = itinerary;
  S.joined = joined;
  S.fetchedAt = new Date().toISOString();

  setSync("ok");
  if(!booted){
    if(!joined){
      // Only draw the join form once — later snapshots (other people adding
      // bills) must not wipe what this person is typing.
      if(!joinShown){ joinShown = true; showJoinScreen(); }
      return;
    }
    booted = true;
    buildShell();
    if(!passkeyOffered){
      passkeyOffered = true;
      setTimeout(function(){ if(booted && !openSheetEl) offerPasskeySetup(S.me); }, 900);
    }
  }
  render();
}

/** Firestore doesn't support nested arrays, so [["2:30 PM","Temple..."], ...]
    is stored as [{t:"2:30 PM", x:"Temple..."}, ...] and converted back to
    tuples wherever the rest of the app expects the tuple shape. */
function itemsToFirestore(items){
  return items.map(function(it){ return { t: it[0]||"", x: it[1]||"" }; });
}
function itemsFromFirestore(items){
  if(!Array.isArray(items)) return [];
  return items.map(function(it){
    if(Array.isArray(it)) return [String(it[0]||""), String(it[1]||"")]; // legacy shape, just in case
    return [String((it&&it.t)||""), String((it&&it.x)||"")];
  });
}

function seedItineraryOnce(){
  if(itinerarySeeded) return;
  itinerarySeeded = true;
  var batch = db.batch();
  SEED_ITINERARY.forEach(function(d){
    var ref = db.collection("itinerary").doc("day" + d.day);
    batch.set(ref, {
      day: d.day, date: d.date, weekday: d.weekday, stay: d.stay,
      title: d.title, items: itemsToFirestore(d.items), tip: d.tip||""
    }, { merge:true });
  });
  batch.commit().catch(function(err){
    console.warn("Itinerary seed failed, will retry:", err && err.code);
    itinerarySeeded = false;   // try again on the next snapshot (e.g. after joining)
  });
}

function startListeners(){
  if(unsubPeople) return;   // already listening
  unsubPeople = db.collection("people").onSnapshot(function(snap){
    latestSnapshots.people = snap;
    rebuildState();
  }, function(err){ serverFail(err); });

  unsubBills = db.collection("bills").onSnapshot(function(snap){
    latestSnapshots.bills = snap;
    rebuildState();
  }, function(err){ serverFail(err); });

  unsubSettlements = db.collection("settlements").onSnapshot(function(snap){
    latestSnapshots.settlements = snap;
    rebuildState();
  }, function(err){ serverFail(err); });

  unsubItinerary = db.collection("itinerary").onSnapshot(function(snap){
    latestSnapshots.itinerary = snap;
    rebuildState();
  }, function(err){ serverFail(err); });
}

function serverFail(err){
  setSync("err");
  var msg = (err && err.message) ? err.message : "Couldn't reach the trip database.";
  if(!booted){
    var sp = document.getElementById("boot-spinner");
    if(sp) sp.style.display = "none";
    var bm = document.getElementById("boot-msg");
    if(bm) bm.textContent = msg;
    var be = document.getElementById("boot-extra");
    if(be) be.innerHTML = '<button class="btn btn-brand" style="margin-top:16px" onclick="location.reload()">Try again</button>';
  } else {
    toast(msg, true);
  }
}

/** Turns Firestore error codes into something a person can act on. */
function friendlyError(err){
  var code = err && err.code;
  if(code === "permission-denied") return "You don't have permission to change that — only the person who added it can.";
  if(code === "unavailable") return "Can't reach the server — your change is saved on this phone and will sync.";
  return (err && err.message) ? err.message : "Something went wrong — try again.";
}

/** Run a write, close the sheet, and toast.
    Firestore applies writes locally straight away and the rest of the app
    re-renders from that, but the promise only settles once the SERVER
    confirms — on hill-country signal that can take ages even while the phone
    claims to be online. So: if the server hasn't answered in 1.2s, close the
    sheet anyway and say it'll sync. Validation mistakes reject instantly, so
    those keep the sheet open for fixing. Only closes the sheet this write
    came from, never one the person opened afterwards. */
function writeOp(promise, okMsg, btn){
  var sheetAtStart = openSheetEl;
  var settled = false, deferred = false;
  if(btn) btn.disabled = true;
  setSync("busy");
  pendingWrites++;
  updateOfflineBanner();

  function closeOwnSheet(){ if(sheetAtStart && openSheetEl === sheetAtStart) closeSheet(); }

  var timer = setTimeout(function(){
    if(settled) return;
    deferred = true;
    if(btn) btn.disabled = false;
    closeOwnSheet();
    toast((okMsg || "Saved") + " · will sync when signal is back");
  }, 1200);

  promise.then(function(){
    settled = true; clearTimeout(timer);
    if(btn) btn.disabled = false;
    pendingWrites = Math.max(0, pendingWrites-1);
    setSync(pendingWrites > 0 ? "busy" : "ok");
    updateOfflineBanner();
    if(!deferred){ closeOwnSheet(); if(okMsg) toast(okMsg); }
    else if(pendingWrites === 0) toast("All changes synced ✓");
  }, function(err){
    settled = true; clearTimeout(timer);
    if(btn) btn.disabled = false;
    pendingWrites = Math.max(0, pendingWrites-1);
    updateOfflineBanner();
    if(err && err.code){           // came back from Firestore
      setSync("err");
      toast(friendlyError(err), true);
    } else {                       // our own validation message
      setSync("ok");
      toast(err && err.message ? err.message : "Check the details and try again", true);
    }
  });
}

function requireMember(){
  var found = false;
  for(var i=0;i<S.people.length;i++) if(S.people[i].email===S.me){ found=true; break; }
  if(!found) throw new Error("Join the trip first, then add bills.");
}

/* ---- Write actions (replace google.script.run calls) ---- */

function joinTrip(name, upi){
  var cleanName = cleanText(name, MAX_NAME_LEN);
  var cleanUpi = cleanText(upi, MAX_UPI_LEN);
  if(!cleanName) return Promise.reject(new Error("Add your name so the group knows who you are."));
  return db.collection("people").doc(docId(S.me)).set({
    name: cleanName,
    upi: cleanUpi,
    photo: S.myPhoto || "",
    joinedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge:true });
}

/** Edits name/UPI only — leaves joinedAt alone so the member order is stable. */
function updateProfile(name, upi){
  var cleanName = cleanText(name, MAX_NAME_LEN);
  if(!cleanName) return Promise.reject(new Error("Name can't be empty."));
  return db.collection("people").doc(docId(S.me)).set({
    name: cleanName, upi: cleanText(upi, MAX_UPI_LEN), photo: S.myPhoto || ""
  }, { merge:true });
}

function addBill(payload){
  try{
    requireMember();
    var peopleEmails = S.people.map(function(p){ return p.email; });
    var bill = validateBill(payload, peopleEmails);
    var id = newId("b");
    return db.collection("bills").doc(id).set({
      desc: bill.desc, amount: bill.amount, category: bill.category,
      paidBy: bill.paidBy, split: bill.split, addedBy: S.me,
      splitMode: bill.splitMode,
      splitAmounts: bill.splitAmounts || null,
      splitShares: bill.splitShares || null,
      items: bill.items || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      deleted: false
    });
  } catch(e){ return Promise.reject(e); }
}

function updateBill(id, payload){
  try{
    requireMember();
    var peopleEmails = S.people.map(function(p){ return p.email; });
    var bill = validateBill(payload, peopleEmails);
    return db.collection("bills").doc(id).update({
      desc: bill.desc, amount: bill.amount, category: bill.category,
      paidBy: bill.paidBy, split: bill.split,
      splitMode: bill.splitMode,
      splitAmounts: bill.splitAmounts || null,
      splitShares: bill.splitShares || null,
      items: bill.items || null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch(e){ return Promise.reject(e); }
}

function deleteBill(id){
  try{
    requireMember();
    return db.collection("bills").doc(id).update({
      deleted: true, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch(e){ return Promise.reject(e); }
}

function addSettlement(fromEmail, toEmail, amount){
  try{
    requireMember();
    var peopleEmails = S.people.map(function(p){ return p.email; });
    var from = normEmail(fromEmail), to = normEmail(toEmail), amt = round2(amount);
    if(peopleEmails.indexOf(from)===-1 || peopleEmails.indexOf(to)===-1)
      throw new Error("Both people need to have joined the trip.");
    if(from===to) throw new Error("A payment needs two different people.");
    if(!isFinite(amt) || amt<=0) throw new Error("Enter an amount greater than zero.");
    if(amt > MAX_AMOUNT) throw new Error("That amount looks too large — check the digits.");
    var id = newId("s");
    return db.collection("settlements").doc(id).set({
      from: from, to: to, amount: amt, markedBy: S.me,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      deleted: false
    });
  } catch(e){ return Promise.reject(e); }
}

function deleteSettlement(id){
  try{
    requireMember();
    return db.collection("settlements").doc(id).update({ deleted:true });
  } catch(e){ return Promise.reject(e); }
}

var MAX_ITEM_LEN = 90, MAX_TITLE_LEN = 60, MAX_STAY_LEN = 40, MAX_TIP_LEN = 140;

function updateItinerary(day, payload){
  try{
    requireMember();
    var title = cleanText(payload.title, MAX_TITLE_LEN);
    var stay = cleanText(payload.stay, MAX_STAY_LEN);
    var tip = cleanText(payload.tip, MAX_TIP_LEN);
    var items = (payload.items||[]).map(function(it){
      return [cleanText(it[0],20), cleanText(it[1], MAX_ITEM_LEN)];
    }).filter(function(it){ return it[1]; });
    if(!title) throw new Error("Give this day a title.");
    if(items.length > 30) throw new Error("That's a lot for one day — keep it to 30 items or fewer.");
    return db.collection("itinerary").doc("day"+day).set({
      day: day, title: title, stay: stay, tip: tip, items: itemsToFirestore(items),
      updatedBy: S.me, updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge:true });
  } catch(e){ return Promise.reject(e); }
}

/* ====================== Shell ====================== */

function buildShell(){
  document.getElementById("app").innerHTML =
    '<header class="topbar">'+
      '<div class="topbar-row"><h1 class="trip-title">🇱🇰 Project W</h1>'+
      '<div class="trip-dates">17–23 Nov</div></div>'+
      '<div class="route-line">Colombo Airport → Kandy → Nuwara Eliya → Ella → Mirissa → Galle → Colombo</div>'+
      '<div class="whoami">'+
        '<span class="me"><span class="sync-dot" id="sync-dot"></span><span id="me-label"></span></span>'+
        '<button id="btn-profile">Edit</button>'+
      '</div>'+
    '</header>'+
    '<div class="offline-banner" id="offline-banner"><span class="ob-text"></span></div>'+
    '<main id="view"></main>'+
    '<button class="fab" id="fab" aria-label="Add a bill">+</button>'+
    '<nav class="tabbar" id="tabbar">'+
      '<button class="tab-btn" data-tab="now"><span class="ic">📍</span>Now</button>'+
      '<button class="tab-btn" data-tab="itinerary"><span class="ic">🗓️</span>Plan</button>'+
      '<button class="tab-btn" data-tab="balances"><span class="ic">⚖️</span>Balances</button>'+
      '<button class="tab-btn" data-tab="bills"><span class="ic">🧾</span>Bills</button>'+
      '<button class="tab-btn" data-tab="settle"><span class="ic">🤝</span>Settle</button>'+
    '</nav>';

  document.getElementById("tabbar").addEventListener("click", function(e){
    var b = e.target.closest(".tab-btn");
    if(b) setTab(b.dataset.tab);
  });
  document.getElementById("fab").addEventListener("click", function(){ openBillSheet(null); });
  document.getElementById("btn-profile").addEventListener("click", function(){ openProfileSheet(); });

  updateOfflineBanner();
  setTab(activeTab);

  // Keep the "Now" view fresh even if nobody touches the app — re-render
  // every minute so "up next" and the countdown stay accurate.
  if(nowTimer) clearInterval(nowTimer);
  nowTimer = setInterval(function(){ if(booted && activeTab==="now") render(); }, 60000);
}

function setTab(tab){
  activeTab = tab;
  var btns = document.querySelectorAll(".tab-btn");
  for(var i=0;i<btns.length;i++) btns[i].classList.toggle("active", btns[i].dataset.tab===tab);
  var fab = document.getElementById("fab");
  if(fab) fab.style.display = (tab==="itinerary" || tab==="now") ? "none" : "block";
  render();
  var v = document.getElementById("view");
  if(v) v.scrollTop = 0;
}

function render(){
  if(!booted) return;
  var me = person(S.me);
  document.getElementById("me-label").textContent = me.name + (me.upi ? " · " + me.upi : "");
  var v = document.getElementById("view");
  if(activeTab==="now") v.innerHTML = viewNow();
  else if(activeTab==="itinerary") v.innerHTML = viewItinerary();
  else if(activeTab==="balances") v.innerHTML = viewBalances();
  else if(activeTab==="bills") v.innerHTML = viewBills();
  else v.innerHTML = viewSettle();
}

/* ====================== Views ====================== */

function viewNow(){
  var now = new Date();
  var days = S.itinerary.slice().sort(function(a,b){ return a.day-b.day; });
  if(!days.length) return '<div class="empty"><span class="big">🗓️</span>No itinerary yet</div>';

  var dated = days.map(function(d){ return { d:d, date: parseTripDate(d.date) }; }).filter(function(x){ return x.date; });
  var tripStart = dated.length ? dated[0].date : null;
  var tripEnd = dated.length ? new Date(dated[dated.length-1].date.getTime() + 24*3600*1000) : null;

  var bal = computeBalances();
  var mine = bal[S.me] || 0;
  var balChip = Math.abs(mine)<0.005
    ? '<div class="now-chip"><div class="nc-k">Balance</div><div class="nc-v pos">All square</div></div>'
    : (mine>0
      ? '<div class="now-chip"><div class="nc-k">You\'re owed</div><div class="nc-v pos">'+inr(mine)+'</div></div>'
      : '<div class="now-chip"><div class="nc-k">You owe</div><div class="nc-v neg">'+inr(-mine)+'</div></div>');

  // Not started yet — countdown hero.
  if(!tripStart || now < tripStart){
    var msLeft = tripStart ? (tripStart - now) : 0;
    var daysLeft = Math.ceil(msLeft / (24*3600*1000));
    return '<div class="card now-hero">'+
        '<div class="now-hero-lbl">Trip starts in</div>'+
        '<div class="now-hero-big">'+(tripStart? daysLeft : "?")+'<span class="now-hero-unit">'+(daysLeft===1?" day":" days")+'</span></div>'+
        '<div class="now-hero-sub">'+esc(days[0].title)+' · '+esc(days[0].weekday+" "+days[0].date)+'</div>'+
      '</div>'+
      '<div class="now-chips">'+balChip+
        '<div class="now-chip"><div class="nc-k">People joined</div><div class="nc-v">'+S.people.length+'</div></div>'+
      '</div>'+
      '<div class="section-label">First up</div>'+
      '<div class="card">'+days[0].items.slice(0,4).map(function(it){
        return '<div class="item-row"><div class="item-time">'+esc(it[0])+'</div><div class="item-text">'+esc(it[1])+'</div>'+mapsBtnHtml(it[1])+'</div>';
      }).join("")+'</div>';
  }

  // Trip finished.
  if(tripEnd && now >= tripEnd){
    var total = S.bills.reduce(function(s,b){ return s+b.amount; }, 0);
    return '<div class="card now-hero">'+
        '<div class="now-hero-lbl">🎉 Trip complete</div>'+
        '<div class="now-hero-sub">'+inr(total)+' logged across '+S.bills.length+' bill'+(S.bills.length===1?"":"s")+'</div>'+
      '</div>'+
      '<div class="now-chips">'+balChip+'</div>'+
      '<div class="muted" style="font-size:12.5px;padding:10px 2px;">Head to Settle to clear any last balances.</div>';
  }

  // Mid-trip — find today's day card by matching calendar date.
  var todayEntry = dated.filter(function(x){
    return x.date.getFullYear()===now.getFullYear() && x.date.getMonth()===now.getMonth() && x.date.getDate()===now.getDate();
  })[0];

  if(!todayEntry){
    // Between listed days (shouldn't normally happen) — show nearest upcoming.
    var upcoming = dated.filter(function(x){ return x.date > now; })[0] || dated[dated.length-1];
    return '<div class="card now-hero"><div class="now-hero-lbl">On the road</div>'+
      '<div class="now-hero-sub">Next: '+esc(upcoming.d.title)+'</div></div>'+
      '<div class="now-chips">'+balChip+'</div>';
  }

  var d = todayEntry.d, baseDate = todayEntry.date;
  var itemsWithTime = d.items.map(function(it){ return { it:it, t: parseItemTime(baseDate, it[0]) }; });
  var nextItem = itemsWithTime.filter(function(x){ return x.t && x.t > now; })[0];
  var pastCount = itemsWithTime.filter(function(x){ return x.t && x.t <= now; }).length;

  var upNext = nextItem
    ? '<div class="now-hero-lbl">Up next</div><div class="now-hero-sub" style="font-size:17px;font-weight:600;">'+esc(nextItem.it[1])+mapsBtnHtml(nextItem.it[1],"margin-left:6px;")+'</div><div class="now-hero-time">'+esc(nextItem.it[0])+'</div>'
    : '<div class="now-hero-lbl">Today</div><div class="now-hero-sub" style="font-size:17px;font-weight:600;">'+esc(d.title)+'</div>';

  var todaysLegs = DRIVE_LEGS.filter(function(l){ return l[2] === d.day; });
  var nextLeg = DRIVE_LEGS.filter(function(l){ return l[2] > d.day; })[0];
  var legChip = todaysLegs.length
    ? '<div class="now-chip"><div class="nc-k">Today\'s drive</div><div class="nc-v" style="font-size:13.5px;">'+
        todaysLegs.map(function(l){ return esc(l[0])+' · '+esc(l[1]); }).join('<br>')+'</div></div>'
    : (nextLeg
      ? '<div class="now-chip"><div class="nc-k">No driving today · next (Day '+nextLeg[2]+')</div><div class="nc-v" style="font-size:13.5px;">'+esc(nextLeg[0])+' · '+esc(nextLeg[1])+'</div></div>'
      : '');

  var restOfDay = itemsWithTime.map(function(x, i){
    var done = x.t && x.t <= now;
    var isNext = nextItem && x.it===nextItem.it;
    return '<div class="item-row'+(done?" now-done":"")+(isNext?" now-next":"")+'"><div class="item-time">'+esc(x.it[0])+'</div>'+
      '<div class="item-text">'+esc(x.it[1])+(isNext?' <span class="now-badge">NEXT</span>':'')+'</div>'+mapsBtnHtml(x.it[1])+'</div>';
  }).join("");

  return '<div class="card now-hero">'+upNext+
      '<div class="now-hero-foot">Day '+d.day+' of '+days.length+' · Staying in '+esc(d.stay)+'</div>'+
    '</div>'+
    '<div class="now-chips">'+balChip+legChip+'</div>'+
    '<div class="section-label">Today\'s schedule</div>'+
    '<div class="card">'+restOfDay+'</div>'+
    (d.tip ? '<div class="day-tip" style="margin:10px 2px;">📝 '+esc(d.tip)+'</div>' : '');
}

function viewItinerary(){
  var legs = DRIVE_LEGS.map(function(l){
    return '<div class="ref-chip"><div class="k">'+esc(l[0])+'</div><div class="v">'+esc(l[1])+'</div></div>';
  }).join("");
  var refs = BUDGET_REF.map(function(r){
    return '<div class="ref-chip"><div class="k">'+esc(r[0])+'</div><div class="v">'+esc(r[1])+'</div></div>';
  }).join("");
  var days = S.itinerary.map(function(d){
    var items = d.items.map(function(it){
      return '<div class="item-row"><div class="item-time">'+esc(it[0])+'</div>'+
             '<div class="item-text">'+esc(it[1])+'</div>'+
             mapsBtnHtml(it[1])+'</div>';
    }).join("");
    var tip = d.tip ? '<div class="day-tip">📝 '+esc(d.tip)+'</div>' : "";
    var editBtn = '<button class="btn btn-ghost btn-sm" data-action="edit-day" data-day="'+d.day+'" style="margin-top:10px;">✏️ Edit this day</button>';
    var stayPin = mapsBtnHtml(d.stay, "margin-left:6px;");
    return '<div class="day-card'+(d.day===openDay?" open":"")+'">'+
      '<button class="day-head" data-action="toggle-day" data-day="'+d.day+'">'+
        '<div class="day-num">'+d.day+'</div>'+
        '<div class="day-meta"><div class="d1">'+esc(d.title)+'</div>'+
        '<div class="d2">'+esc(d.weekday+" "+d.date)+' · Stay: '+esc(d.stay)+stayPin+'</div></div>'+
        '<div class="day-chev">⌄</div></button>'+
      '<div class="day-body"><div class="day-body-in">'+items+tip+editBtn+'</div></div></div>';
  }).join("");

  return '<div class="section-label">Drive times</div><div class="ref-scroller">'+legs+'</div>'+
         '<div class="section-label">Day by day</div>'+days+
         '<div class="section-label">Budget reference</div><div class="ref-scroller">'+refs+'</div>'+
         '<div class="muted" style="font-size:11.5px;padding:4px 2px 10px;">Planning numbers only — log what you actually spend as bills.</div>';
}

function viewBalances(){
  var bal = computeBalances();
  var mine = bal[S.me] || 0;
  var heroAmt, heroLbl;
  if(mine > 0.005){ heroAmt = '<span class="pos">'+inr(mine)+'</span>'; heroLbl = "you're owed overall"; }
  else if(mine < -0.005){ heroAmt = '<span class="neg">'+inr(-mine)+'</span>'; heroLbl = "you owe overall"; }
  else { heroAmt = '<span class="pos">₹0</span>'; heroLbl = "you're all square"; }

  var rows = S.people.map(function(p){
    var v = bal[p.email] || 0;
    var cls = v>0.005 ? "pos" : (v<-0.005 ? "neg" : "");
    var sub = v>0.005 ? "is owed" : (v<-0.005 ? "owes the group" : "all settled");
    return '<div class="person-row">'+
      avatarHtml(p.email)+
      '<div class="p-name">'+esc(p.name)+(p.email===S.me?'<span class="you-tag">YOU</span>':'')+
      '<div class="p-sub">'+sub+'</div></div>'+
      '<div class="p-amt '+cls+'">'+(Math.abs(v)<0.005?"—":inr(Math.abs(v)))+'</div></div>';
  }).join("");

  var total = S.bills.reduce(function(s,b){ return s+b.amount; }, 0);

  return '<div class="card balance-hero"><div class="amt">'+heroAmt+'</div><div class="lbl">'+heroLbl+'</div></div>'+
    '<div class="section-label">Everyone on the trip</div><div class="card">'+rows+'</div>'+
    '<div class="muted" style="font-size:11.5px;padding:8px 2px;">'+
      inr(total)+' logged across '+S.bills.length+' bill'+(S.bills.length===1?"":"s")+
      ' · '+S.people.length+' people joined</div>';
}

function viewBills(){
  if(!S.bills.length){
    return '<div class="empty"><span class="big">🧾</span>No bills yet<br>Tap + to log the first one.</div>';
  }
  var sorted = S.bills.slice().sort(function(a,b){
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });
  var rows = sorted.map(function(b){
    var splitTxt;
    if(b.splitMode==="itemized"){
      var n = (b.items||[]).length;
      splitTxt = n+" item"+(n===1?"":"s")+" · "+b.split.length+" people";
    } else {
      splitTxt = (b.split.length===S.people.length && S.people.length>0)
        ? "split with everyone" : ("split "+b.split.length+" way"+(b.split.length===1?"":"s"));
      if(b.splitMode && b.splitMode!=="equal") splitTxt += " · " + (b.splitMode==="exact"?"custom":"uneven");
    }
    return '<div class="bill-row" data-action="open-bill" data-id="'+esc(b.id)+'">'+
      '<div class="bill-icon">'+(b.splitMode==="itemized"?"🧾":catIcon(b.category))+'</div>'+
      '<div class="bill-mid"><div class="bill-desc">'+esc(b.desc)+'</div>'+
      '<div class="bill-sub">'+esc(pName(b.paidBy))+' paid · '+splitTxt+'</div></div>'+
      '<div class="bill-amt">'+inr(b.amount)+'</div></div>';
  }).join("");
  var total = S.bills.reduce(function(s,b){ return s+b.amount; }, 0);
  return '<div class="section-label">All bills · '+inr(total)+' total</div><div class="card">'+rows+'</div>'+
         '<div class="muted" style="font-size:11.5px;padding:4px 2px;">Tap a bill to edit or delete it.</div>';
}

function viewSettle(){
  var bal = computeBalances();
  var txns = computeSettlements(bal);
  var body;
  if(!txns.length){
    body = '<div class="empty"><span class="big">🎉</span>All settled up<br>Nobody owes anybody right now.</div>';
  } else {
    body = '<div class="card">' + txns.map(function(t){
      var toP = person(t.to);
      var upiBtn = toP.upi
        ? '<button class="btn btn-ghost btn-sm" data-action="copy-upi" data-id="'+esc(t.to)+'">Copy '+esc(toP.name)+"'s UPI</button>"
        : '<span class="muted" style="font-size:11.5px;align-self:center;">'+esc(toP.name)+' hasn’t added a UPI ID</span>';
      return '<div class="settle-row">'+
        '<div class="settle-top">'+esc(pName(t.from))+' <span class="settle-arrow">→</span> '+esc(pName(t.to))+'</div>'+
        '<div class="settle-amt">'+inr(t.amount)+'</div>'+
        '<div class="settle-actions">'+
          '<button class="btn btn-brand btn-sm" data-action="mark-paid" data-from="'+esc(t.from)+
            '" data-to="'+esc(t.to)+'" data-amount="'+t.amount+'">Mark paid</button>'+
          upiBtn+
        '</div></div>';
    }).join("") + '</div>';
  }

  var hist = "";
  if(S.settlements.length){
    var recent = S.settlements.slice().sort(function(a,b){
      return String(b.createdAt).localeCompare(String(a.createdAt));
    }).slice(0,12);
    hist = '<div class="section-label">Payments recorded</div><div class="card">' +
      recent.map(function(s){
        return '<div class="hist-row"><div style="flex:1;min-width:0;">'+
          esc(pName(s.from))+' → '+esc(pName(s.to))+' · <strong>'+inr(s.amount)+'</strong>'+
          '</div><button class="btn btn-line btn-sm" data-action="undo-settle" data-id="'+esc(s.id)+'">Undo</button></div>';
      }).join("") + '</div>';
  }

  return '<div class="section-label">Suggested settlements</div>'+body+
    '<div class="muted" style="font-size:11.5px;padding:8px 2px;">These are the fewest payments that clear everyone. Paid in person? Tap “Mark paid” and everyone’s app updates.</div>'+
    hist;
}

/* ====================== Sheets ====================== */

var openSheetEl = null;
var sheetOnDismiss = null;   // called only when the person taps outside to dismiss
var scrim = document.getElementById("scrim");

function closeSheet(){
  sheetOnDismiss = null;
  if(!openSheetEl) return;
  var el = openSheetEl;
  el.classList.remove("show");
  scrim.classList.remove("show");
  openSheetEl = null;
  setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, 220);
}
scrim.addEventListener("click", function(){
  var cb = sheetOnDismiss;
  closeSheet();
  if(cb) cb();
});

function openSheetHtml(html, onMount, onDismiss){
  closeSheet();
  var el = document.createElement("div");
  el.className = "sheet";
  el.innerHTML = '<div class="sheet-handle"></div>' + html;
  document.body.appendChild(el);
  openSheetEl = el;
  sheetOnDismiss = onDismiss || null;
  scrim.classList.add("show");
  requestAnimationFrame(function(){ el.classList.add("show"); });
  if(onMount) onMount(el);
}

/* ---- Join / profile ---- */

function showJoinScreen(){
  var sp = document.getElementById("boot-spinner");
  if(sp) sp.style.display = "none";
  var bm = document.getElementById("boot-msg");
  if(bm) bm.textContent = "You're signed in. Add your name to join the trip.";
  var be = document.getElementById("boot-extra");
  if(be) be.innerHTML =
    '<div class="join-card">'+
      '<div class="join-email">'+(S.myPhoto?'<img src="'+esc(S.myPhoto)+'" alt="">':'')+'<span>'+esc(S.me)+'</span></div>'+
      '<div class="field"><label>Your name</label>'+
        '<input type="text" id="j-name" placeholder="How the group knows you" maxlength="40"></div>'+
      '<div class="field"><label>UPI ID <span class="muted">(optional — so others can pay you)</span></label>'+
        '<input type="text" id="j-upi" placeholder="name@bank" maxlength="60"></div>'+
      '<button class="btn btn-brand btn-wide" id="j-go">Join the trip</button>'+
    '</div>';
  document.getElementById("j-go").addEventListener("click", function(){
    var name = document.getElementById("j-name").value.trim();
    if(!name){ toast("Add your name first", true); return; }
    var btn = this;
    writeOp(joinTrip(name, document.getElementById("j-upi").value.trim()), "Welcome aboard", btn);
  });
  document.getElementById("j-name").focus();
}

function openProfileSheet(){
  var me = person(S.me);
  openSheetHtml(
    '<h3>Your details</h3>'+
    '<div class="join-email">'+(S.myPhoto?'<img src="'+esc(S.myPhoto)+'" alt="">':'')+'<span>'+esc(S.me)+'</span></div>'+
    '<div class="field"><label>Name</label><input type="text" id="p-name" maxlength="40" value="'+esc(me.name)+'"></div>'+
    '<div class="field"><label>UPI ID</label><input type="text" id="p-upi" maxlength="60" placeholder="name@bank" value="'+esc(me.upi)+'"></div>'+
    (passkeySupported()
      ? '<div class="field"><label>Face ID lock on this device</label>'+
          '<button class="btn btn-line btn-sm" id="p-faceid">'+(passkeyFor(S.me) ? "Turn off Face ID lock" : "Turn on Face ID lock")+'</button></div>'
      : '')+
    '<div class="sheet-actions"><button class="btn btn-brand" id="p-save">Save</button>'+
    '<button class="btn btn-ghost" id="p-signout">Sign out</button></div>',
    function(el){
      el.querySelector("#p-save").addEventListener("click", function(){
        var name = el.querySelector("#p-name").value.trim();
        if(!name){ toast("Name can't be empty", true); return; }
        writeOp(updateProfile(name, el.querySelector("#p-upi").value.trim()), "Saved", this);
      });
      var fid = el.querySelector("#p-faceid");
      if(fid) fid.addEventListener("click", function(){
        if(passkeyFor(S.me)){
          setStoredPasskey(null);
          lsSet("pw_passkey_dismissed", S.me);
          fid.textContent = "Turn on Face ID lock";
          toast("Face ID lock turned off");
        } else {
          fid.disabled = true;
          registerPasskey(S.me).then(function(){
            markUnlocked(S.me);
            lsSet("pw_passkey_dismissed", null);
            fid.disabled = false;
            fid.textContent = "Turn off Face ID lock";
            toast("Face ID lock is on for this device");
          }).catch(function(err){
            fid.disabled = false;
            if(!(err && err.name==="NotAllowedError")) toast(err && err.message ? err.message : "Couldn't set that up", true);
          });
        }
      });
      el.querySelector("#p-signout").addEventListener("click", function(){
        closeSheet();
        auth.signOut();
      });
    }
  );
}

/* ---- Receipt OCR (on-device, no server, no API key) ---- */

var tesseractLoadPromise = null;
function loadTesseract(){
  if(window.Tesseract) return Promise.resolve();
  if(tesseractLoadPromise) return tesseractLoadPromise;
  tesseractLoadPromise = new Promise(function(resolve, reject){
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    s.onload = function(){ resolve(); };
    s.onerror = function(){ reject(new Error("Couldn't load the text scanner — check your connection.")); };
    document.head.appendChild(s);
  });
  return tesseractLoadPromise;
}

/** Lines that summarise the bill rather than being something someone ate or
    bought. Shown in the review list but NOT pre-selected, otherwise the
    total gets added as an extra "item" and the bill doubles. */
var RECEIPT_SUMMARY_RE = /\b(sub\s*-?\s*total|total|grand|net\s*amount|amount\s*due|balance|cash|change|tender(ed)?|paid|card|visa|master|amex|upi|round(ing)?\s*off)\b/i;

/** Header/footer lines with a number at the end (table no., phone, bill no.)
    — shown unticked, not dropped, since "Table water 150" is a real item. */
var RECEIPT_HEADER_RE = /^(table|tbl|tel|phone|ph|date|time|bill\s*no|invoice|inv|order|receipt|guest|pax|covers?|cashier|server|waiter|steward|token|kot|gst|vat\s*reg)\b(?!\s*water)/i;

/** Parses raw OCR text into candidate {desc, amount} lines: any line ending in
    a plausible price. Handles 1200, 1,200, 1,200.00 and 1200.50 (the old
    pattern read "1200" as 200). Pure on-device heuristic — the person
    confirms in the review step. */
function parseReceiptLines(rawText){
  var lines = String(rawText||"").split(/\r?\n/).map(function(l){ return l.replace(/\s+/g," ").trim(); }).filter(function(l){ return l.length>1; });
  var priceRe = /(?:₹|rs\.?|lkr|inr)?\s*(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*$/i;
  var out = [];
  lines.forEach(function(line){
    var m = priceRe.exec(line);
    if(!m) return;
    var amount = round2(parseFloat(m[1].replace(/,/g,"")));
    if(!isFinite(amount) || amount<=0 || amount>MAX_AMOUNT) return;
    var desc = cleanText(line.slice(0, m.index).replace(/(₹|rs\.?|lkr|inr)\s*$/i,""), MAX_DESC_LEN);
    if(!desc || !/[a-z]/i.test(desc)) return;           // bare numbers: dates, phone, table no.
    if(/\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|\d{1,2}:\d{2}\s*$/.test(desc)) return; // "Date 20/11/2026 21:14"
    out.push({ desc:desc, amount:amount, summary: RECEIPT_SUMMARY_RE.test(desc) || RECEIPT_HEADER_RE.test(desc) });
  });
  return out;
}

/** Shrinks big phone photos (12MP+) to ~1600px and greyscales them before
    OCR — several times faster on a phone and usually more accurate. */
function prepareReceiptImage(file){
  return new Promise(function(resolve){
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function(){
      try{
        var max = 1600, w = img.naturalWidth, h = img.naturalHeight;
        var k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement("canvas");
        c.width = Math.round(w*k); c.height = Math.round(h*k);
        var ctx = c.getContext("2d");
        ctx.filter = "grayscale(1) contrast(1.25)";
        ctx.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c);
      } catch(e){ URL.revokeObjectURL(url); resolve(file); }
    };
    img.onerror = function(){ URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

function scanReceiptImage(file, btn){
  var label = btn ? btn.textContent : "";
  function progress(txt){ if(btn) btn.textContent = txt; }
  if(btn) btn.disabled = true;
  progress("Loading scanner…");
  return loadTesseract().then(function(){
    progress("Preparing photo…");
    return prepareReceiptImage(file);
  }).then(function(img){
    return Tesseract.recognize(img, "eng", {
      logger: function(m){
        if(m && m.status === "recognizing text") progress("Reading… " + Math.round((m.progress||0)*100) + "%");
        else if(m && /load/i.test(m.status||"")) progress("Loading scanner…");
      }
    });
  }).then(function(result){
    if(btn){ btn.disabled = false; progress(label); }
    return parseReceiptLines(result && result.data && result.data.text || "");
  }).catch(function(err){
    if(btn){ btn.disabled = false; progress(label); }
    throw err;
  });
}

function openReceiptReviewSheet(candidates, onConfirm, onBack){
  var picked = candidates.map(function(c){ return !c.summary; });

  function renderList(){
    return candidates.map(function(c, i){
      return '<div class="split-row">'+
        '<div class="chip'+(picked[i]?" on":"")+'" data-role="cand-toggle" data-idx="'+i+'" style="flex:1;text-align:left;display:flex;justify-content:space-between;gap:8px;">'+
          '<span>'+esc(c.desc)+(c.summary?' <span class="muted" style="font-weight:500;">· total line</span>':'')+'</span>'+
          '<span>'+inr(c.amount)+'</span></div>'+
      '</div>';
    }).join("");
  }
  function pickedSum(){ return candidates.reduce(function(s,c,i){ return s + (picked[i]?c.amount:0); }, 0); }

  openSheetHtml(
    '<h3>Receipt scanned</h3>'+
    '<p class="muted" style="font-size:13px;line-height:1.5;margin-top:-8px;">Tap lines to keep or drop them. Total/cash/change lines start unticked so nothing is counted twice. Check amounts against the paper receipt.</p>'+
    '<div id="cand-list">'+renderList()+'</div>'+
    '<div class="split-hint" id="cand-sum"></div>'+
    '<div class="sheet-actions">'+
      '<button class="btn btn-ghost" id="cand-back">Back</button>'+
      '<button class="btn btn-brand" id="cand-add">Add selected</button>'+
    '</div>',
    function(el){
      function refresh(){
        el.querySelector("#cand-list").innerHTML = renderList();
        el.querySelector("#cand-sum").textContent = "Selected: " + inr(pickedSum());
        wire();
      }
      function wire(){
        el.querySelectorAll('[data-role="cand-toggle"]').forEach(function(c){
          c.addEventListener("click", function(){
            var i = parseInt(c.dataset.idx,10);
            picked[i] = !picked[i];
            refresh();
          });
        });
      }
      refresh();
      el.querySelector("#cand-back").addEventListener("click", function(){ closeSheet(); if(onBack) onBack(); });
      el.querySelector("#cand-add").addEventListener("click", function(){
        var chosen = candidates.filter(function(c,i){ return picked[i]; });
        closeSheet();
        onConfirm(chosen);
      });
    },
    onBack   // tapping outside the sheet also goes back to the bill, not into the void
  );
}

/* ---- Bill sheet ---- */

var draftSplit = [], draftPaidBy = "", draftCat = "other", draftMode = "equal";
var draftAmounts = {}, draftShares = {};
var draftItems = []; // itemized mode: [{ localId, desc, amount, people:[email], mode:"equal"|"percent", percents:{} }]
var draftItemSeq = 0;
var draftDesc = "";

function newDraftItem(desc, amount){
  draftItemSeq++;
  return { localId:"it"+draftItemSeq, desc:desc||"", amount:amount||0, people:S.people.map(function(p){return p.email;}), mode:"equal", percents:{} };
}

function openBillSheet(existing, resumeDraft){
  if(!S.people.length){ toast("Join the trip first", true); return; }
  if(!resumeDraft){
    draftSplit = existing ? existing.split.slice() : S.people.map(function(p){ return p.email; });
    draftPaidBy = existing ? existing.paidBy : S.me;
    draftCat = existing ? existing.category : "other";
    draftMode = existing ? (existing.splitMode || "equal") : "equal";
    draftAmounts = existing && existing.splitAmounts ? Object.assign({}, existing.splitAmounts) : {};
    draftShares = existing && existing.splitShares ? Object.assign({}, existing.splitShares) : {};
    draftItemSeq = 0;
    draftItems = (existing && existing.items) ? existing.items.map(function(it){
      draftItemSeq++;
      return { localId:"it"+draftItemSeq, desc:it.desc, amount:it.amount, people:(it.people||[]).slice(), mode:it.mode||"equal", percents:Object.assign({},it.percents||{}) };
    }) : [];
  }

  var payChips = S.people.map(function(p){
    return '<div class="chip'+(draftPaidBy===p.email?" on":"")+'" data-role="paid" data-id="'+esc(p.email)+'">'+esc(p.name)+'</div>';
  }).join("");
  var catChips = CATEGORIES.map(function(c){
    return '<div class="chip'+(draftCat===c.id?" on":"")+'" data-role="cat" data-id="'+c.id+'">'+c.icon+' '+c.label+'</div>';
  }).join("");
  var modeChips = [["equal","Equal"],["exact","Exact ₹"],["shares","Shares"],["itemized","By item"]].map(function(m){
    return '<div class="chip'+(draftMode===m[0]?" on":"")+'" data-role="mode" data-id="'+m[0]+'">'+m[1]+'</div>';
  }).join("");

  function renderSplitSection(){
    if(draftMode === "equal"){
      return '<div class="chip-grid" id="b-split-chips">'+S.people.map(function(p){
        return '<div class="chip'+(draftSplit.indexOf(p.email)>=0?" on":"")+'" data-role="split" data-id="'+esc(p.email)+'">'+esc(p.name)+'</div>';
      }).join("")+'</div><div class="split-hint" id="b-hint"></div>';
    }
    // exact or shares: a per-person row with an input, checkbox baked into inclusion
    if(draftMode === "shares"){
      draftSplit.forEach(function(e){ if(draftShares[e] == null || draftShares[e] === "") draftShares[e] = 1; });
    }
    var rows = S.people.map(function(p){
      var included = draftSplit.indexOf(p.email) >= 0;
      var val = draftMode==="exact" ? (draftAmounts[p.email]!=null?draftAmounts[p.email]:"") : (draftShares[p.email]!=null?draftShares[p.email]:(included?1:""));
      return '<div class="split-row" data-person="'+esc(p.email)+'">'+
        '<div class="chip'+(included?" on":"")+'" data-role="split" data-id="'+esc(p.email)+'" style="flex:1;text-align:left;">'+esc(p.name)+'</div>'+
        '<input type="number" inputmode="decimal" class="split-input" data-role="'+draftMode+'-input" data-id="'+esc(p.email)+'" '+
          'style="width:84px;'+(included?"":"opacity:.4;")+'" placeholder="'+(draftMode==="exact"?"₹0":"1")+'" value="'+esc(val)+'" '+(included?"":"disabled")+'>'+
        '</div>';
    }).join("");
    return '<div id="b-split-chips">'+rows+'</div><div class="split-hint" id="b-hint"></div>';
  }

  function itemTotal(){ return round2(draftItems.reduce(function(s,it){ return s+(Number(it.amount)||0); },0)); }

  function renderItemsSection(){
    if(!draftItems.length){
      return '<div class="empty" style="padding:20px 10px;"><span class="big">🧾</span>No items yet<br>Scan a receipt or add items by hand.</div>';
    }
    return draftItems.map(function(it){
      var peopleChips = S.people.map(function(p){
        var on = it.people.indexOf(p.email)>=0;
        return '<div class="chip'+(on?" on":"")+'" style="padding:6px 10px;font-size:12px;" data-role="item-person" data-item="'+it.localId+'" data-id="'+esc(p.email)+'">'+esc(p.name)+'</div>';
      }).join("");
      var modeToggle = '<button class="btn btn-ghost btn-sm" data-role="item-mode-toggle" data-item="'+it.localId+'" style="padding:5px 9px;font-size:11px;">'+(it.mode==="percent"?"% split":"Equal split")+'</button>';
      var percentRow = "";
      if(it.mode==="percent"){
        var pctSum = 0; it.people.forEach(function(e){ pctSum += Number(it.percents[e])||0; });
        percentRow = '<div style="margin-top:8px;">'+it.people.map(function(e){
          return '<div class="split-row"><span style="flex:1;font-size:12.5px;">'+esc(pName(e))+'</span>'+
            '<input type="number" inputmode="decimal" class="split-input" data-role="item-percent" data-item="'+it.localId+'" data-id="'+esc(e)+'" style="width:64px;" value="'+(it.percents[e]!=null?it.percents[e]:"")+'" placeholder="%"></div>';
        }).join("")+'<div class="split-hint">'+Math.round(pctSum)+'% of '+inr(it.amount)+'</div></div>';
      }
      return '<div class="card" style="padding:12px 14px;margin-bottom:8px;" data-item-card="'+it.localId+'">'+
        '<div style="display:flex;gap:8px;align-items:center;">'+
          '<input type="text" class="split-input" data-role="item-desc" data-item="'+it.localId+'" style="flex:1;" maxlength="80" value="'+esc(it.desc)+'" placeholder="Item name">'+
          '<div class="amount-field" style="width:96px;"><span class="rupee">₹</span>'+
            '<input type="number" inputmode="decimal" class="split-input" data-role="item-amount" data-item="'+it.localId+'" style="width:100%;padding-left:20px;" value="'+(it.amount||"")+'" placeholder="0"></div>'+
          '<button class="btn btn-line btn-sm" data-role="item-del" data-item="'+it.localId+'" style="padding:6px 9px;">✕</button>'+
        '</div>'+
        '<div class="chip-grid" style="margin-top:8px;">'+peopleChips+'</div>'+
        '<div style="margin-top:8px;">'+modeToggle+'</div>'+
        percentRow+
      '</div>';
    }).join("") + '<div class="split-hint" id="b-items-total" style="margin-top:4px;">Items total: '+inr(itemTotal())+'</div>';
  }

  // Firestore rules only let the person who added a bill change or delete it.
  var readOnly = !!(existing && existing.addedBy && existing.addedBy !== S.me);

  openSheetHtml(
    '<h3>'+(readOnly ? "Bill details" : (existing?"Edit bill":"Add a bill"))+'</h3>'+
    (readOnly ? '<div class="day-tip" style="margin:-4px 0 12px;font-style:normal;">Added by '+esc(pName(existing.addedBy))+' — only they can change or delete it.</div>' : '')+
    '<div class="field"><label>What was it for</label>'+
      '<input type="text" id="b-desc" maxlength="80" placeholder="e.g. Dinner in Ella" value="'+esc(resumeDraft ? draftDesc : (existing ? existing.desc : ""))+'"></div>'+
    '<div class="field" id="b-amount-field" style="display:'+(draftMode==="itemized"?"none":"block")+';"><label>Amount</label><div class="amount-field"><span class="rupee">₹</span>'+
      '<input type="number" inputmode="decimal" id="b-amount" placeholder="0" value="'+(existing?existing.amount:"")+'"></div></div>'+
    '<div class="field"><label>Category</label><div class="chip-grid">'+catChips+'</div></div>'+
    '<div class="field"><label>Who paid</label><div class="chip-grid">'+payChips+'</div></div>'+
    '<div class="field"><label>Split</label><div class="chip-grid" style="margin-bottom:10px;">'+modeChips+'</div>'+
      '<div id="b-split-wrap">'+(draftMode==="itemized" ? "" : renderSplitSection())+'</div>'+
      '<div id="b-items-wrap" style="display:'+(draftMode==="itemized"?"block":"none")+';">'+
        '<div style="display:flex;gap:8px;margin-bottom:10px;">'+
          '<button class="btn btn-ghost btn-sm" id="b-scan-receipt">📷 Scan receipt</button>'+
          '<button class="btn btn-ghost btn-sm" id="b-add-item">+ Add item</button>'+
        '</div>'+
        '<input type="file" id="b-receipt-input" accept="image/*" style="display:none;">'+
        '<div id="b-items-list">'+renderItemsSection()+'</div>'+
      '</div>'+
    '</div>'+
    (readOnly
      ? '<div class="sheet-actions"><button class="btn btn-ghost" id="b-close">Close</button></div>'
      : '<div class="sheet-actions">'+
          (existing?'<button class="btn btn-line" id="b-del">Delete</button>':'')+
          '<button class="btn btn-brand" id="b-save">'+(existing?"Save changes":"Save bill")+'</button>'+
        '</div>'),
    function(el){
      function amt(){ return parseFloat(el.querySelector("#b-amount").value) || 0; }

      function hint(){
        var h = el.querySelector("#b-hint");
        if(!h) return;
        if(!draftSplit.length){ h.textContent = "Pick at least one person"; return; }
        if(draftMode === "equal"){
          h.textContent = draftSplit.length+" people · "+inr(amt()/draftSplit.length)+" each";
        } else if(draftMode === "exact"){
          var sum = 0; draftSplit.forEach(function(e){ sum += Number(draftAmounts[e])||0; });
          var diff = round2(amt() - sum);
          h.textContent = inr(sum)+" of "+inr(amt())+" assigned"+(Math.abs(diff)>0.01?" · "+(diff>0?inr(diff)+" left over":inr(-diff)+" over"):" · ✓ matches");
        } else {
          var totalW = 0; draftSplit.forEach(function(e){ totalW += Number(draftShares[e])||0; });
          if(totalW<=0){ h.textContent = "Give at least one share"; return; }
          var parts = draftSplit.map(function(e){
            var w = Number(draftShares[e])||0;
            return pName(e)+" "+inr(amt()*(w/totalW));
          });
          h.textContent = parts.join(" · ");
        }
      }

      function rebuildSplitSection(){
        el.querySelector("#b-split-wrap").innerHTML = renderSplitSection();
        wireSplitSection();
        hint();
      }

      function rebuildItemsSection(){
        el.querySelector("#b-items-list").innerHTML = renderItemsSection();
        wireItemsSection();
      }

      function wireItemsSection(){
        el.querySelectorAll('[data-role="item-desc"]').forEach(function(inp){
          inp.addEventListener("input", function(){
            var it = draftItems.filter(function(x){return x.localId===inp.dataset.item;})[0];
            if(it) it.desc = inp.value;
          });
        });
        el.querySelectorAll('[data-role="item-amount"]').forEach(function(inp){
          inp.addEventListener("input", function(){
            var it = draftItems.filter(function(x){return x.localId===inp.dataset.item;})[0];
            if(it) it.amount = parseFloat(inp.value)||0;
            var totalEl = el.querySelector("#b-items-total");
            if(totalEl) totalEl.textContent = "Items total: "+inr(itemTotal());
          });
        });
        el.querySelectorAll('[data-role="item-person"]').forEach(function(c){
          c.addEventListener("click", function(){
            var it = draftItems.filter(function(x){return x.localId===c.dataset.item;})[0];
            if(!it) return;
            var idx = it.people.indexOf(c.dataset.id);
            if(idx>=0){ if(it.people.length>1) it.people.splice(idx,1); }
            else it.people.push(c.dataset.id);
            rebuildItemsSection();
          });
        });
        el.querySelectorAll('[data-role="item-mode-toggle"]').forEach(function(btn){
          btn.addEventListener("click", function(){
            var it = draftItems.filter(function(x){return x.localId===btn.dataset.item;})[0];
            if(!it) return;
            it.mode = it.mode==="percent" ? "equal" : "percent";
            if(it.mode==="percent" && !Object.keys(it.percents).length){
              var even = round2(100/it.people.length);
              it.people.forEach(function(e){ it.percents[e]=even; });
            }
            rebuildItemsSection();
          });
        });
        el.querySelectorAll('[data-role="item-percent"]').forEach(function(inp){
          inp.addEventListener("input", function(){
            var it = draftItems.filter(function(x){return x.localId===inp.dataset.item;})[0];
            if(!it) return;
            it.percents[inp.dataset.id] = parseFloat(inp.value)||0;
            var sumPct = 0; it.people.forEach(function(e){ sumPct += Number(it.percents[e])||0; });
            var hintEl = el.querySelector('[data-item-card="'+it.localId+'"] .split-hint');
            if(hintEl){
              hintEl.textContent = Math.round(sumPct*100)/100 + '% of ' + inr(it.amount) + (Math.abs(sumPct-100) <= 0.5 ? " ✓" : " — needs to total 100%");
            }
          });
        });
        el.querySelectorAll('[data-role="item-del"]').forEach(function(btn){
          btn.addEventListener("click", function(){
            draftItems = draftItems.filter(function(x){return x.localId!==btn.dataset.item;});
            rebuildItemsSection();
          });
        });
      }

      function wireSplitSection(){
        el.querySelectorAll('[data-role="split"]').forEach(function(c){
          c.addEventListener("click", function(){
            var id = c.dataset.id, i = draftSplit.indexOf(id);
            if(i>=0){ if(draftSplit.length>1) draftSplit.splice(i,1); }
            else { draftSplit.push(id); if(draftMode==="shares" && draftShares[id]==null) draftShares[id]=1; }
            rebuildSplitSection();
          });
        });
        el.querySelectorAll('[data-role="exact-input"]').forEach(function(inp){
          inp.addEventListener("input", function(){
            draftAmounts[inp.dataset.id] = parseFloat(inp.value)||0;
            hint();
          });
        });
        el.querySelectorAll('[data-role="shares-input"]').forEach(function(inp){
          inp.addEventListener("input", function(){
            draftShares[inp.dataset.id] = parseFloat(inp.value)||0;
            hint();
          });
        });
      }

      wireSplitSection();
      hint();
      el.querySelector("#b-amount").addEventListener("input", hint);

      el.querySelectorAll('[data-role="paid"]').forEach(function(c){
        c.addEventListener("click", function(){
          draftPaidBy = c.dataset.id;
          el.querySelectorAll('[data-role="paid"]').forEach(function(x){
            x.classList.toggle("on", x.dataset.id===draftPaidBy);
          });
        });
      });
      el.querySelectorAll('[data-role="cat"]').forEach(function(c){
        c.addEventListener("click", function(){
          draftCat = c.dataset.id;
          el.querySelectorAll('[data-role="cat"]').forEach(function(x){
            x.classList.toggle("on", x.dataset.id===draftCat);
          });
        });
      });
      el.querySelectorAll('[data-role="mode"]').forEach(function(c){
        c.addEventListener("click", function(){
          draftMode = c.dataset.id;
          el.querySelectorAll('[data-role="mode"]').forEach(function(x){
            x.classList.toggle("on", x.dataset.id===draftMode);
          });
          var isItemized = draftMode==="itemized";
          el.querySelector("#b-amount-field").style.display = isItemized ? "none" : "block";
          el.querySelector("#b-split-wrap").style.display = isItemized ? "none" : "block";
          el.querySelector("#b-items-wrap").style.display = isItemized ? "block" : "none";
          if(isItemized){
            if(!draftItems.length) draftItems.push(newDraftItem("", amt()||0));
            rebuildItemsSection();
          } else {
            rebuildSplitSection();
          }
        });
      });

      wireItemsSection();

      var addItemBtn = el.querySelector("#b-add-item");
      if(addItemBtn) addItemBtn.addEventListener("click", function(){
        draftItems.push(newDraftItem("",0));
        rebuildItemsSection();
      });

      var scanBtn = el.querySelector("#b-scan-receipt");
      var receiptInput = el.querySelector("#b-receipt-input");
      if(scanBtn) scanBtn.addEventListener("click", function(){ receiptInput.click(); });
      if(receiptInput) receiptInput.addEventListener("change", function(){
        var file = receiptInput.files && receiptInput.files[0];
        if(!file) return;
        var sheetForScan = el;
        scanReceiptImage(file, scanBtn).then(function(lines){
          if(openSheetEl !== sheetForScan){ toast("Receipt scan discarded — that bill was closed"); return; }
          if(!lines.length){ toast("Couldn't read any prices — try a flat, well-lit photo, or add items by hand", true); return; }
          // The review sheet temporarily replaces this bill sheet (one sheet
          // at a time). Remember what's been typed so far, then reopen the
          // bill sheet with it intact — whether they add items or go back.
          draftDesc = el.querySelector("#b-desc").value;
          draftMode = "itemized";
          var existingSnapshot = existing;
          openReceiptReviewSheet(lines, function(picked){
            // Drop blank placeholder rows so they don't block saving.
            draftItems = draftItems.filter(function(it){ return String(it.desc).trim() || Number(it.amount) > 0; });
            picked.forEach(function(p){ draftItems.push(newDraftItem(p.desc, p.amount)); });
            if(!draftDesc.trim()) draftDesc = "Receipt";
            openBillSheet(existingSnapshot, true);
            toast(picked.length+" item"+(picked.length===1?"":"s")+" added — now tap who had each one");
          }, function(){
            openBillSheet(existingSnapshot, true);
          });
        }).catch(function(err){
          toast("Couldn't read that receipt: "+(err&&err.message?err.message:"try again"), true);
        }).finally(function(){
          receiptInput.value = "";
        });
      });

      if(readOnly){
        el.querySelectorAll("input, .chip, .btn").forEach(function(x){
          if(x.id === "b-close") return;
          x.style.pointerEvents = "none";
          if(x.tagName === "INPUT") x.readOnly = true;
          if(x.tagName === "BUTTON") x.style.display = "none";
        });
        el.querySelector("#b-close").addEventListener("click", closeSheet);
        return;
      }

      el.querySelector("#b-save").addEventListener("click", function(){
        var payload = {
          desc: el.querySelector("#b-desc").value.trim(),
          category: draftCat, paidBy: draftPaidBy,
          splitMode: draftMode
        };
        if(draftMode==="itemized"){
          payload.items = draftItems.map(function(it){
            return { desc:it.desc, amount:it.amount, people:it.people.slice(), mode:it.mode, percents:Object.assign({},it.percents) };
          });
          payload.amount = itemTotal(); // for the description-required check below only
        } else {
          payload.amount = parseFloat(el.querySelector("#b-amount").value);
          payload.split = draftSplit.slice();
          payload.splitAmounts = draftAmounts;
          payload.splitShares = draftShares;
        }
        if(!payload.desc){ toast("Add a short description", true); return; }
        if(!(payload.amount > 0)){ toast(draftMode==="itemized" ? "Add at least one item with an amount" : "Enter an amount", true); return; }
        try{
          if(existing) writeOp(updateBill(existing.id, payload), "Bill updated", this);
          else writeOp(addBill(payload), "Bill added", this);
        } catch(e){ toast(e.message, true); }
      });

      // Two-tap delete so a stray tap can't wipe a bill.
      var del = el.querySelector("#b-del"), delArmed = null;
      if(del) del.addEventListener("click", function(){
        if(!delArmed){
          del.textContent = "Tap again to delete";
          delArmed = setTimeout(function(){ delArmed = null; del.textContent = "Delete"; }, 3000);
          return;
        }
        clearTimeout(delArmed);
        writeOp(deleteBill(existing.id), "Bill deleted", this);
      });

      if(!existing) el.querySelector("#b-desc").focus();
    }
  );
}

/* ---- Day / itinerary edit sheet ---- */

function openDayEditSheet(day){
  var itemsHtml = day.items.map(function(it, i){
    return '<div class="split-row" data-idx="'+i+'">'+
      '<input type="text" class="split-input" data-role="item-time" data-idx="'+i+'" style="width:76px;" maxlength="20" value="'+esc(it[0])+'" placeholder="Time">'+
      '<input type="text" class="split-input" data-role="item-text" data-idx="'+i+'" style="flex:1;" maxlength="90" value="'+esc(it[1])+'" placeholder="What\'s happening">'+
      '<button class="btn btn-line btn-sm" data-role="item-del" data-idx="'+i+'" style="padding:6px 9px;">✕</button>'+
      '</div>';
  }).join("");

  openSheetHtml(
    '<h3>Edit Day '+day.day+'</h3>'+
    '<div class="field"><label>Title</label><input type="text" id="d-title" maxlength="60" value="'+esc(day.title)+'"></div>'+
    '<div class="field"><label>Staying in</label><input type="text" id="d-stay" maxlength="40" value="'+esc(day.stay)+'"></div>'+
    '<div class="field"><label>Schedule</label><div id="d-items">'+itemsHtml+'</div>'+
      '<button class="btn btn-ghost btn-sm" id="d-add-item" style="margin-top:4px;">+ Add item</button></div>'+
    '<div class="field"><label>Tip <span class="muted">(optional)</span></label>'+
      '<input type="text" id="d-tip" maxlength="140" value="'+esc(day.tip||"")+'"></div>'+
    '<div class="sheet-actions"><button class="btn btn-brand" id="d-save">Save day</button></div>',
    function(el){
      var items = day.items.map(function(it){ return it.slice(); });

      function renumber(){
        el.querySelectorAll('[data-role="item-del"]').forEach(function(btn, i){
          btn.dataset.idx = i;
        });
      }

      function addItemRow(time, text){
        var idx = items.length;
        items.push([time||"", text||""]);
        var row = document.createElement("div");
        row.className = "split-row";
        row.innerHTML =
          '<input type="text" class="split-input" data-role="item-time" style="width:76px;" maxlength="20" value="'+esc(time||"")+'" placeholder="Time">'+
          '<input type="text" class="split-input" data-role="item-text" style="flex:1;" maxlength="90" value="'+esc(text||"")+'" placeholder="What\'s happening">'+
          '<button class="btn btn-line btn-sm" data-role="item-del" style="padding:6px 9px;">✕</button>';
        el.querySelector("#d-items").appendChild(row);
        wireRow(row, idx);
      }

      function wireRow(row, idx){
        row.querySelector('[data-role="item-time"]').addEventListener("input", function(e){ items[idx][0] = e.target.value; });
        row.querySelector('[data-role="item-text"]').addEventListener("input", function(e){ items[idx][1] = e.target.value; });
        row.querySelector('[data-role="item-del"]').addEventListener("click", function(){
          items[idx] = null;
          row.remove();
        });
      }

      el.querySelectorAll("#d-items .split-row").forEach(function(row, idx){ wireRow(row, idx); });
      el.querySelector("#d-add-item").addEventListener("click", function(){ addItemRow("",""); });

      el.querySelector("#d-save").addEventListener("click", function(){
        var payload = {
          title: el.querySelector("#d-title").value.trim(),
          stay: el.querySelector("#d-stay").value.trim(),
          tip: el.querySelector("#d-tip").value.trim(),
          items: items.filter(function(it){ return it; })
        };
        if(!payload.title){ toast("Give this day a title", true); return; }
        try{
          writeOp(updateItinerary(day.day, payload), "Day "+day.day+" updated", this);
        } catch(e){ toast(e.message, true); }
      });
    }
  );
}

/* ====================== Delegated actions ====================== */

document.addEventListener("click", function(e){
  var t = e.target.closest("[data-action]");
  if(!t) return;
  var a = t.dataset.action;

  if(a==="toggle-day"){
    var d = parseInt(t.dataset.day,10);
    openDay = (openDay===d) ? 0 : d;
    render();
  }
  else if(a==="edit-day"){
    var dayNum = parseInt(t.dataset.day,10);
    for(var di=0;di<S.itinerary.length;di++){
      if(S.itinerary[di].day===dayNum){ openDayEditSheet(S.itinerary[di]); break; }
    }
  }
  else if(a==="open-bill"){
    for(var i=0;i<S.bills.length;i++){
      if(S.bills[i].id===t.dataset.id){ openBillSheet(S.bills[i]); break; }
    }
  }
  else if(a==="mark-paid"){
    writeOp(
      addSettlement(t.dataset.from, t.dataset.to, parseFloat(t.dataset.amount)),
      pName(t.dataset.from)+" → "+pName(t.dataset.to)+" recorded", t);
  }
  else if(a==="undo-settle"){
    writeOp(deleteSettlement(t.dataset.id), "Payment removed", t);
  }
  else if(a==="copy-upi"){
    var upi = person(t.dataset.id).upi;
    var ta = document.createElement("textarea");
    ta.value = upi; ta.style.position="fixed"; ta.style.opacity="0";
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand("copy"); toast("Copied "+upi); }
    catch(err){ toast(upi); }
    document.body.removeChild(ta);
  }
});

/* ====================== Auth / Boot ====================== */

/* ---- Passkey (WebAuthn) local re-entry ----
   There's no backend here to mint Firebase custom tokens from a WebAuthn
   assertion, so this isn't a second independent identity provider — it's a
   device-local "fast unlock" for a Google session Firebase is already
   keeping signed in (Firebase Auth persists sessions in this browser by
   default). First sign-in is always Google. Right after that, we offer to
   register a passkey (Face ID / Touch ID / fingerprint / device PIN) tied to
   this browser profile. Next time the tab opens, if Firebase still has a
   persisted session AND a passkey is registered for that account, we ask for
   the biometric prompt before showing the app — so the phone/laptop is what's
   gating access, not just "the browser remembered me". If Firebase's session
   ever actually expires or is signed out, the person falls back to Google. */

var PASSKEY_KEY = "pw_passkey_v1"; // { email, credId (base64url) }

function passkeySupported(){
  return !!(window.PublicKeyCredential && navigator.credentials);
}
function getStoredPasskey(){
  try{ return JSON.parse(localStorage.getItem(PASSKEY_KEY) || "null"); }
  catch(e){ return null; }
}
function setStoredPasskey(v){
  try{
    if(v) localStorage.setItem(PASSKEY_KEY, JSON.stringify(v));
    else localStorage.removeItem(PASSKEY_KEY);
  } catch(e){}
}
function b64urlToBuf(s){
  s = s.replace(/-/g,"+").replace(/_/g,"/");
  while(s.length % 4) s += "=";
  var bin = atob(s), buf = new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}
function bufToB64url(buf){
  var bytes = new Uint8Array(buf), bin = "";
  for(var i=0;i<bytes.length;i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function randomChallenge(){
  var a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return a;
}

function registerPasskey(email){
  if(!passkeySupported()) return Promise.reject(new Error("Face ID / Touch ID isn't available in this browser."));
  var userId = new TextEncoder().encode(email);
  return navigator.credentials.create({
    publicKey: {
      challenge: randomChallenge(),
      rp: { name: "Project W" },
      user: { id: userId, name: email, displayName: pName(email) || email },
      pubKeyCredParams: [{ type:"public-key", alg:-7 }, { type:"public-key", alg:-257 }],
      authenticatorSelection: { authenticatorAttachment:"platform", userVerification:"required" },
      timeout: 60000
    }
  }).then(function(cred){
    setStoredPasskey({ email: email, credId: bufToB64url(cred.rawId) });
    return true;
  });
}

function unlockWithPasskey(saved){
  return navigator.credentials.get({
    publicKey: {
      challenge: randomChallenge(),
      allowCredentials: [{ id: b64urlToBuf(saved.credId), type:"public-key" }],
      userVerification: "required",
      timeout: 60000
    }
  });
}

/* ---- Face ID lock state ----
   "Unlocked" lasts for this app session (sessionStorage): closing the app or
   tab locks it again. A fresh Google sign-in counts as unlocking. */
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ if(v==null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(e){} }
function ssGet(k){ try{ return sessionStorage.getItem(k); }catch(e){ return null; } }
function ssSet(k,v){ try{ if(v==null) sessionStorage.removeItem(k); else sessionStorage.setItem(k,v); }catch(e){} }

function passkeyFor(email){
  var saved = getStoredPasskey();
  return (saved && saved.email === email && passkeySupported()) ? saved : null;
}
function isUnlocked(email){ return ssGet("pw_unlocked") === email; }
function markUnlocked(email){ ssSet("pw_unlocked", email); }

function offerPasskeySetup(email){
  if(!passkeySupported()) return;
  if(passkeyFor(email)) return;                          // already set up here
  if(lsGet("pw_passkey_dismissed") === email) return;    // said "Not now" before
  openSheetHtml(
    '<h3>Lock with Face ID?</h3>'+
    '<p class="muted" style="font-size:13.5px;line-height:1.5;">Next time you open Project W on this device, you\'ll unlock it with Face ID / Touch ID / fingerprint instead of it just opening. You can turn this off any time from Edit.</p>'+
    '<div class="sheet-actions">'+
      '<button class="btn btn-ghost" id="pk-skip">Not now</button>'+
      '<button class="btn btn-brand" id="pk-go">Turn on</button>'+
    '</div>',
    function(el){
      el.querySelector("#pk-skip").addEventListener("click", function(){
        lsSet("pw_passkey_dismissed", email);
        closeSheet();
      });
      el.querySelector("#pk-go").addEventListener("click", function(){
        var btn = this; btn.disabled = true;
        registerPasskey(email).then(function(){
          markUnlocked(email);
          closeSheet();
          toast("Face ID lock is on for this device");
        }).catch(function(err){
          btn.disabled = false;
          toast(err && err.name==="NotAllowedError" ? "Cancelled" : (err && err.message ? err.message : "Couldn't set that up"), true);
        });
      });
    }
  );
}

/** The boot/sign-in container lives inside #app, which buildShell() replaces
    once the app loads. Recreate it when needed (e.g. after signing out). */
function bootEl(){
  var b = document.getElementById("boot");
  if(!b){
    document.getElementById("app").innerHTML = '<div class="boot" id="boot"></div>';
    b = document.getElementById("boot");
  }
  return b;
}

function showBootLoading(){
  bootEl().innerHTML =
    '<div class="flag">🇱🇰</div><h2>Project W</h2>'+
    '<p id="boot-msg">Loading the trip…</p>'+
    '<div class="spinner" id="boot-spinner"></div>'+
    '<div id="boot-extra"></div>';
}

function doGoogleSignIn(){
  ssSet("pw_google_pending", "1");
  var provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  auth.signInWithPopup(provider).catch(function(err){
    ssSet("pw_google_pending", null);
    if(err && (err.code==="auth/popup-closed-by-user" || err.code==="auth/cancelled-popup-request")) return;
    toast(err && err.message ? err.message : "Sign-in failed", true);
  });
}

function showSignIn(){
  bootEl().innerHTML =
    '<div class="flag">🇱🇰</div>'+
    '<h2>Project W</h2>'+
    '<p>Sign in with Google to see the itinerary and shared bills.</p>'+
    '<button class="google-btn" id="google-signin" style="margin-top:18px;max-width:280px;">'+
      '<img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="">'+
      'Sign in with Google</button>';
  document.getElementById("google-signin").addEventListener("click", doGoogleSignIn);
}

function showLockScreen(user, saved){
  var email = normEmail(user.email);
  bootEl().innerHTML =
    '<div class="flag">🔒</div>'+
    '<h2>Project W</h2>'+
    '<p>Welcome back'+(user.displayName ? ', '+esc(String(user.displayName).split(" ")[0]) : '')+'.</p>'+
    '<button class="btn btn-brand btn-wide" id="faceid-unlock" style="margin-top:18px;max-width:280px;">Unlock with Face ID</button>'+
    '<button class="btn btn-ghost btn-wide" id="lock-google" style="margin-top:10px;max-width:280px;">Use Google instead</button>';
  var fBtn = document.getElementById("faceid-unlock");
  function tryUnlock(){
    fBtn.disabled = true;
    unlockWithPasskey(saved).then(function(){
      markUnlocked(email);
      proceedBoot();
    }).catch(function(err){
      fBtn.disabled = false;
      if(err && err.name === "NotAllowedError") return; // cancelled / timed out
      toast(err && err.message ? err.message : "Couldn't unlock", true);
    });
  }
  fBtn.addEventListener("click", tryUnlock);
  document.getElementById("lock-google").addEventListener("click", function(){
    auth.signOut();   // → sign-in screen; a fresh Google sign-in unlocks this session
  });
}

var passkeyOffered = false;
var nowTimer = null;

function proceedBoot(){
  showBootLoading();
  startListeners();
}

function teardown(){
  booted = false;
  joinShown = false;
  passkeyOffered = false;
  if(unsubPeople) unsubPeople();
  if(unsubBills) unsubBills();
  if(unsubSettlements) unsubSettlements();
  if(unsubItinerary) unsubItinerary();
  unsubPeople = unsubBills = unsubSettlements = unsubItinerary = null;
  latestSnapshots = { people:null, bills:null, settlements:null, itinerary:null };
  itinerarySeeded = false;
  if(nowTimer){ clearInterval(nowTimer); nowTimer = null; }
  closeSheet();
}

auth.onAuthStateChanged(function(user){
  teardown();
  if(!user){
    ssSet("pw_unlocked", null);
    showSignIn();
    return;
  }
  S.me = normEmail(user.email);
  S.myPhoto = user.photoURL || "";

  if(ssGet("pw_google_pending")){
    ssSet("pw_google_pending", null);
    markUnlocked(S.me);
  }

  var saved = passkeyFor(S.me);
  if(saved && !isUnlocked(S.me)){
    showLockScreen(user, saved);
    return;
  }
  proceedBoot();
});
