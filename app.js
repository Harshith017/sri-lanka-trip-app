/* ====================== Trip content ====================== */

var ITINERARY = [
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

var DRIVE_LEGS = [["Airport → Kandy","~3–3.5h"],["Kandy → N'Eliya","~2.5–3h"],
  ["N'Eliya → Ella","~2–2.5h"],["Ella → Mirissa","~3.5–4.5h"],
  ["Mirissa → Galle","~1–1.5h"],["Galle → Colombo","~2–2.5h"]];

var BUDGET_REF = [["Flights","₹28,000 / person"],["Food","₹1,300–1,500 / day"],
  ["Car rental","₹45,000 total"],["Petrol","₹8,500 total"],["Stays","~₹34,300 total"]];

var CATEGORIES = [
  {id:"stay",label:"Stay",icon:"🏨"},{id:"food",label:"Food",icon:"🍛"},
  {id:"transport",label:"Transport",icon:"🚗"},{id:"activity",label:"Activity",icon:"🥾"},
  {id:"shopping",label:"Shopping",icon:"🛍️"},{id:"other",label:"Other",icon:"📌"}
];

var VALID_CATEGORIES = CATEGORIES.map(function(c){ return c.id; });
var MAX_DESC_LEN = 80, MAX_NAME_LEN = 40, MAX_UPI_LEN = 60, MAX_AMOUNT = 10000000;

/* ====================== Firebase ====================== */

var auth = firebase.auth();
var db = firebase.firestore();

var S = { me:"", myPhoto:"", joined:false, people:[], bills:[], settlements:[], fetchedAt:"" };
var activeTab = "itinerary";
var openDay = 1;
var booted = false;
var syncState = "ok";
var unsubPeople = null, unsubBills = null, unsubSettlements = null;
var latestSnapshots = { people:null, bills:null, settlements:null };

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

function computeBalances(){
  var bal = {};
  S.people.forEach(function(p){ bal[p.email] = 0; });
  S.bills.forEach(function(b){
    if(bal[b.paidBy] === undefined) bal[b.paidBy] = 0;
    bal[b.paidBy] = round2(bal[b.paidBy] + b.amount);
    var share = b.amount / b.split.length;
    b.split.forEach(function(e){
      if(bal[e] === undefined) bal[e] = 0;
      bal[e] = round2(bal[e] - share);
    });
  });
  S.settlements.forEach(function(s){
    if(bal[s.from] === undefined) bal[s.from] = 0;
    if(bal[s.to] === undefined) bal[s.to] = 0;
    bal[s.from] = round2(bal[s.from] + s.amount);
    bal[s.to]   = round2(bal[s.to]   - s.amount);
  });
  return bal;
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

  var amount = round2(payload && payload.amount);
  if(!isFinite(amount) || amount<=0) throw new Error("Enter an amount greater than zero.");
  if(amount > MAX_AMOUNT) throw new Error("That amount looks too large — check the digits.");

  var category = String((payload && payload.category) || "other").toLowerCase();
  if(VALID_CATEGORIES.indexOf(category)===-1) category = "other";

  var paidBy = normEmail(payload && payload.paidBy);
  if(peopleEmails.indexOf(paidBy)===-1) throw new Error("Whoever paid needs to have joined the trip first.");

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

  return { desc:desc, amount:amount, category:category, paidBy:paidBy, split:split };
}

/* ====================== Firestore bridge ====================== */

function setSync(st){
  syncState = st;
  var dot = document.getElementById("sync-dot");
  if(dot) dot.className = "sync-dot" + (st==="busy"?" busy":(st==="err"?" err":""));
}

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
  if(!peopleSnap || !billsSnap || !settlementsSnap) return; // wait for all three

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

  var joined = false;
  for(var i=0;i<people.length;i++) if(people[i].email===S.me){ joined = true; break; }

  S.people = people;
  S.bills = bills;
  S.settlements = settlements;
  S.joined = joined;
  S.fetchedAt = new Date().toISOString();

  setSync("ok");
  if(!booted){
    if(!joined){ showJoinScreen(); return; }
    booted = true;
    buildShell();
  }
  render();
}

function startListeners(){
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

/** Run a write against Firestore, show a toast, and close any open sheet. */
function writeOp(promise, okMsg, btn){
  if(btn) btn.disabled = true;
  setSync("busy");
  promise.then(function(){
    if(btn) btn.disabled = false;
    closeSheet();
    setSync("ok");
    if(okMsg) toast(okMsg);
  }).catch(function(err){
    if(btn) btn.disabled = false;
    serverFail(err);
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

function updateProfile(name, upi){ return joinTrip(name, upi); }

function addBill(payload){
  try{
    requireMember();
    var peopleEmails = S.people.map(function(p){ return p.email; });
    var bill = validateBill(payload, peopleEmails);
    var id = newId("b");
    return db.collection("bills").doc(id).set({
      desc: bill.desc, amount: bill.amount, category: bill.category,
      paidBy: bill.paidBy, split: bill.split, addedBy: S.me,
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

/* ====================== Shell ====================== */

function buildShell(){
  document.getElementById("app").innerHTML =
    '<header class="topbar">'+
      '<div class="topbar-row"><h1 class="trip-title">🇱🇰 Sri Lanka</h1>'+
      '<div class="trip-dates">17–23 Nov</div></div>'+
      '<div class="route-line">Colombo Airport → Kandy → Nuwara Eliya → Ella → Mirissa → Galle → Colombo</div>'+
      '<div class="whoami">'+
        '<span class="me"><span class="sync-dot" id="sync-dot"></span><span id="me-label"></span></span>'+
        '<button id="btn-profile">Edit</button>'+
      '</div>'+
    '</header>'+
    '<main id="view"></main>'+
    '<button class="fab" id="fab" aria-label="Add a bill">+</button>'+
    '<nav class="tabbar" id="tabbar">'+
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

  setTab(activeTab);
}

function setTab(tab){
  activeTab = tab;
  var btns = document.querySelectorAll(".tab-btn");
  for(var i=0;i<btns.length;i++) btns[i].classList.toggle("active", btns[i].dataset.tab===tab);
  var fab = document.getElementById("fab");
  if(fab) fab.style.display = (tab==="itinerary") ? "none" : "block";
  render();
  var v = document.getElementById("view");
  if(v) v.scrollTop = 0;
}

function render(){
  if(!booted) return;
  var me = person(S.me);
  document.getElementById("me-label").textContent = me.name + (me.upi ? " · " + me.upi : "");
  var v = document.getElementById("view");
  if(activeTab==="itinerary") v.innerHTML = viewItinerary();
  else if(activeTab==="balances") v.innerHTML = viewBalances();
  else if(activeTab==="bills") v.innerHTML = viewBills();
  else v.innerHTML = viewSettle();
}

/* ====================== Views ====================== */

function viewItinerary(){
  var legs = DRIVE_LEGS.map(function(l){
    return '<div class="ref-chip"><div class="k">'+esc(l[0])+'</div><div class="v">'+esc(l[1])+'</div></div>';
  }).join("");
  var refs = BUDGET_REF.map(function(r){
    return '<div class="ref-chip"><div class="k">'+esc(r[0])+'</div><div class="v">'+esc(r[1])+'</div></div>';
  }).join("");
  var days = ITINERARY.map(function(d){
    var items = d.items.map(function(it){
      return '<div class="item-row"><div class="item-time">'+esc(it[0])+'</div>'+
             '<div class="item-text">'+esc(it[1])+'</div></div>';
    }).join("");
    var tip = d.tip ? '<div class="day-tip">📝 '+esc(d.tip)+'</div>' : "";
    return '<div class="day-card'+(d.day===openDay?" open":"")+'">'+
      '<button class="day-head" data-action="toggle-day" data-day="'+d.day+'">'+
        '<div class="day-num">'+d.day+'</div>'+
        '<div class="day-meta"><div class="d1">'+esc(d.title)+'</div>'+
        '<div class="d2">'+esc(d.weekday+" "+d.date)+' · Stay: '+esc(d.stay)+'</div></div>'+
        '<div class="day-chev">⌄</div></button>'+
      '<div class="day-body"><div class="day-body-in">'+items+tip+'</div></div></div>';
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
    var splitTxt = (b.split.length===S.people.length && S.people.length>0)
      ? "split with everyone" : ("split "+b.split.length+" way"+(b.split.length===1?"":"s"));
    return '<div class="bill-row" data-action="open-bill" data-id="'+esc(b.id)+'">'+
      '<div class="bill-icon">'+catIcon(b.category)+'</div>'+
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
var scrim = document.getElementById("scrim");

function closeSheet(){
  if(!openSheetEl) return;
  var el = openSheetEl;
  el.classList.remove("show");
  scrim.classList.remove("show");
  openSheetEl = null;
  setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, 220);
}
scrim.addEventListener("click", closeSheet);

function openSheetHtml(html, onMount){
  closeSheet();
  var el = document.createElement("div");
  el.className = "sheet";
  el.innerHTML = '<div class="sheet-handle"></div>' + html;
  document.body.appendChild(el);
  openSheetEl = el;
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
    '<div class="sheet-actions"><button class="btn btn-brand" id="p-save">Save</button>'+
    '<button class="btn btn-ghost" id="p-signout">Sign out</button></div>',
    function(el){
      el.querySelector("#p-save").addEventListener("click", function(){
        var name = el.querySelector("#p-name").value.trim();
        if(!name){ toast("Name can't be empty", true); return; }
        writeOp(updateProfile(name, el.querySelector("#p-upi").value.trim()), "Saved", this);
      });
      el.querySelector("#p-signout").addEventListener("click", function(){
        auth.signOut();
      });
      el.querySelector("#p-name").focus();
    }
  );
}

/* ---- Bill sheet ---- */

var draftSplit = [], draftPaidBy = "", draftCat = "other";

function openBillSheet(existing){
  if(!S.people.length){ toast("Join the trip first", true); return; }
  draftSplit = existing ? existing.split.slice() : S.people.map(function(p){ return p.email; });
  draftPaidBy = existing ? existing.paidBy : S.me;
  draftCat = existing ? existing.category : "other";

  var payChips = S.people.map(function(p){
    return '<div class="chip'+(draftPaidBy===p.email?" on":"")+'" data-role="paid" data-id="'+esc(p.email)+'">'+esc(p.name)+'</div>';
  }).join("");
  var splitChips = S.people.map(function(p){
    return '<div class="chip'+(draftSplit.indexOf(p.email)>=0?" on":"")+'" data-role="split" data-id="'+esc(p.email)+'">'+esc(p.name)+'</div>';
  }).join("");
  var catChips = CATEGORIES.map(function(c){
    return '<div class="chip'+(draftCat===c.id?" on":"")+'" data-role="cat" data-id="'+c.id+'">'+c.icon+' '+c.label+'</div>';
  }).join("");

  openSheetHtml(
    '<h3>'+(existing?"Edit bill":"Add a bill")+'</h3>'+
    '<div class="field"><label>What was it for</label>'+
      '<input type="text" id="b-desc" maxlength="80" placeholder="e.g. Dinner in Ella" value="'+(existing?esc(existing.desc):"")+'"></div>'+
    '<div class="field"><label>Amount</label><div class="amount-field"><span class="rupee">₹</span>'+
      '<input type="number" inputmode="decimal" id="b-amount" placeholder="0" value="'+(existing?existing.amount:"")+'"></div></div>'+
    '<div class="field"><label>Category</label><div class="chip-grid">'+catChips+'</div></div>'+
    '<div class="field"><label>Who paid</label><div class="chip-grid">'+payChips+'</div></div>'+
    '<div class="field"><label>Split between</label><div class="chip-grid">'+splitChips+'</div>'+
      '<div class="split-hint" id="b-hint"></div></div>'+
    '<div class="sheet-actions">'+
      (existing?'<button class="btn btn-line" id="b-del">Delete</button>':'')+
      '<button class="btn btn-brand" id="b-save">'+(existing?"Save changes":"Save bill")+'</button>'+
    '</div>',
    function(el){
      function hint(){
        var amt = parseFloat(el.querySelector("#b-amount").value) || 0;
        el.querySelector("#b-hint").textContent = draftSplit.length
          ? draftSplit.length+" people · "+inr(amt/draftSplit.length)+" each"
          : "Pick at least one person";
      }
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
      el.querySelectorAll('[data-role="split"]').forEach(function(c){
        c.addEventListener("click", function(){
          var id = c.dataset.id, i = draftSplit.indexOf(id);
          if(i>=0){ if(draftSplit.length>1) draftSplit.splice(i,1); }
          else draftSplit.push(id);
          c.classList.toggle("on", draftSplit.indexOf(id)>=0);
          hint();
        });
      });

      el.querySelector("#b-save").addEventListener("click", function(){
        var payload = {
          desc: el.querySelector("#b-desc").value.trim(),
          amount: parseFloat(el.querySelector("#b-amount").value),
          category: draftCat, paidBy: draftPaidBy, split: draftSplit.slice()
        };
        if(!payload.desc){ toast("Add a short description", true); return; }
        if(!(payload.amount > 0)){ toast("Enter an amount", true); return; }
        if(existing) writeOp(updateBill(existing.id, payload), "Bill updated", this);
        else writeOp(addBill(payload), "Bill added", this);
      });

      var del = el.querySelector("#b-del");
      if(del) del.addEventListener("click", function(){
        writeOp(deleteBill(existing.id), "Bill deleted", this);
      });

      el.querySelector("#b-desc").focus();
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

function showSignIn(){
  document.getElementById("boot").innerHTML =
    '<div class="flag">🇱🇰</div>'+
    '<h2>Sri Lanka Trip</h2>'+
    '<p>Sign in with Google to see the itinerary and shared bills.</p>'+
    '<button class="google-btn" id="google-signin" style="margin-top:18px;max-width:280px;">'+
      '<img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="">'+
      'Sign in with Google</button>';
  document.getElementById("google-signin").addEventListener("click", function(){
    var provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(function(err){
      toast(err && err.message ? err.message : "Sign-in failed", true);
    });
  });
}

auth.onAuthStateChanged(function(user){
  if(!user){
    booted = false;
    if(unsubPeople) unsubPeople();
    if(unsubBills) unsubBills();
    if(unsubSettlements) unsubSettlements();
    latestSnapshots = { people:null, bills:null, settlements:null };
    showSignIn();
    return;
  }
  S.me = normEmail(user.email);
  S.myPhoto = user.photoURL || "";
  document.getElementById("boot").innerHTML =
    '<div class="flag">🇱🇰</div><h2>Sri Lanka Trip</h2>'+
    '<p id="boot-msg">Loading the trip…</p>'+
    '<div class="spinner" id="boot-spinner"></div>'+
    '<div id="boot-extra"></div>';
  startListeners();
});
