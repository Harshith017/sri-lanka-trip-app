/* Pulse — UI. All maths lives in calc.js; all data stays on this device
   (localStorage), with JSON export/import for backups. */
(function () {
  "use strict";
  var C = window.Calc, FOODS = window.FOODS;
  var KEY = "pulse.v1";
  var MEALS = [["breakfast", "Breakfast"], ["lunch", "Lunch"], ["dinner", "Dinner"], ["snacks", "Snacks"]];
  var LIFTS = ["Bench press", "Squat", "Deadlift", "Overhead press", "Barbell row", "Pull-up", "Lat pulldown",
    "Leg press", "Romanian deadlift", "Incline dumbbell press", "Dumbbell row", "Hip thrust", "Lunge",
    "Dumbbell curl", "Triceps pushdown", "Lateral raise", "Seated cable row", "Leg curl", "Leg extension", "Push-up"];
  var LOSE_RATES = [0.25, 0.5, 0.75, 1], GAIN_RATES = [0.1, 0.25, 0.5];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  /* ---------- Helpers ---------- */
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function todayYmd() { var d = new Date(); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function fmt(n) { return isFinite(n) ? Math.round(n).toLocaleString("en-US") : "—"; }
  function fmt1(n) { return isFinite(n) ? (Math.round(n * 10) / 10).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—"; }
  function signed(n, f) { return (n > 0 ? "+" : n < 0 ? "−" : "") + (f || fmt)(Math.abs(n)); }
  function numVal(v) { var n = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isFinite(n) ? n : NaN; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function shortDate(ymd) { var p = C.parseYmd(ymd); return p ? p.d + " " + MONTHS[p.m - 1] : ""; }
  function dayLabel(ymd) {
    var t = todayYmd();
    if (ymd === t) return "Today";
    if (ymd === C.addDays(t, -1)) return "Yesterday";
    var p = C.parseYmd(ymd), d = new Date(p.y, p.m - 1, p.d);
    return WD[d.getDay()] + " " + p.d + " " + MONTHS[p.m - 1];
  }
  var $ = function (sel, root) { return (root || document).querySelector(sel); };

  /* ---------- State ---------- */
  function blank() {
    return { v: 1, profile: null, days: {}, weights: [], measures: [], customFoods: [], recent: [], settings: { maintSource: "auto" } };
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s && s.v === 1) { var b = blank(); for (var k in s) b[k] = s[k]; return b; }
    } catch (e) {}
    return blank();
  }
  var REV = 0;
  function save() {
    REV++;
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast("Couldn't save — storage is full or blocked"); }
  }
  var S = load();
  var V = { tab: "today", date: todayYmd() };

  function getDay(ymd) { return S.days[ymd] || { food: [], workouts: [], water: 0, steps: null, incomplete: false }; }
  function editDay(ymd) {
    if (!S.days[ymd]) S.days[ymd] = { food: [], workouts: [], water: 0, steps: null, incomplete: false };
    return S.days[ymd];
  }
  function sortedWeights() { return S.weights.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }); }
  function weightOn(ymd) {
    var ws = sortedWeights(), kg = null;
    for (var i = 0; i < ws.length; i++) { if (ws[i].date <= ymd) kg = ws[i].kg; else break; }
    if (kg == null && ws.length) kg = ws[0].kg;
    return kg == null ? S.profile.kg : kg;
  }

  /* Who you are on a given date — weight and age move over time. */
  function who(ymd) {
    var P = S.profile, kg = weightOn(ymd), age = C.ageOn(P.birth, ymd);
    var b = C.bmr({ sex: P.sex, kg: kg, cm: P.cm, age: age, bodyFat: P.bodyFat });
    return { sex: P.sex, kg: kg, cm: P.cm, age: age, bmrKcal: b.kcal, bmrMethod: b.method };
  }
  function workoutEnergy(w, ymd) { return C.workoutEnergy(w, who(ymd)); }

  function dayTotals(ymd) {
    var d = getDay(ymd), t = { kcal: 0, p: 0, c: 0, f: 0, a: 0, exNet: 0, exGross: 0, exMin: 0 };
    d.food.forEach(function (x) { t.kcal += x.kcal; t.p += x.p; t.c += x.c; t.f += x.f; t.a += x.a || 0; });
    if (d.workouts.length) {
      var w0 = who(ymd);
      d.workouts.forEach(function (w) {
        var e = C.workoutEnergy(w, w0);
        t.exNet += e.net; t.exGross += e.gross; t.exMin += numVal(w.minutes) || 0;
      });
    }
    return t;
  }
  function summaries() {
    var out = {};
    Object.keys(S.days).forEach(function (ymd) {
      var d = S.days[ymd];
      if (!d.food.length) return;
      var t = dayTotals(ymd);
      out[ymd] = { intake: t.kcal, exerciseNet: t.exNet, complete: !d.incomplete };
    });
    return out;
  }

  var _adaptCache = null;
  function adaptive(ymd) {
    if (!_adaptCache || _adaptCache.rev !== REV) _adaptCache = { rev: REV, sums: summaries(), byDay: {} };
    if (!_adaptCache.byDay[ymd])
      _adaptCache.byDay[ymd] = C.adaptiveMaintenance(_adaptCache.sums, S.weights, C.addDays(ymd, -1), 28, who(ymd).bmrKcal);
    return _adaptCache.byDay[ymd];
  }

  /* Everything the Today screen needs for one date. */
  function model(ymd) {
    var P = S.profile, w = who(ymd), lvl = C.levelById(P.activity);
    var formula = w.bmrKcal * lvl.factor;
    var ad = adaptive(ymd);
    var useAd = S.settings.maintSource === "auto" && ad.ready;
    var base = useAd ? ad.baseWithoutExercise : formula;
    var tgt = C.calorieTarget({ maintenance: base, goal: P.goal, rateKgWeek: P.rate, sex: P.sex, bmrKcal: w.bmrKcal });
    var t = dayTotals(ymd);
    var budget = tgt.kcal + t.exNet;
    var ppk = P.proteinPerKg || C.defaultProteinPerKg(P.goal);
    return {
      who: w, level: lvl, formula: formula, adaptive: ad, useAdaptive: useAd, base: base, target: tgt,
      totals: t, budget: budget, remaining: budget - t.kcal, proteinPerKg: ppk,
      macros: C.macroTargets(budget, w.kg, P.cm, ppk),
      water: C.waterTargetMl(w.kg, t.exMin)
    };
  }

  /* ---------- Toast ---------- */
  var toastTimer;
  function toast(msg) {
    var el = $("#toast"); el.textContent = msg; el.classList.add("on");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove("on"); }, 2200);
  }

  /* ---------- Icons ---------- */
  var ICONS = {
    today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>',
    food: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v8a2 2 0 0 0 2 2v8M11 3v8a2 2 0 0 1-2 2M5 3v6"/><path d="M17 21V3c-2 1-3 4-3 8h3"/></svg>',
    train: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12"/></svg>',
    progress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18M5 16l4-5 4 3 6-8"/></svg>',
    me: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>'
  };
  var TABS = [["today", "Today"], ["food", "Food"], ["train", "Train"], ["progress", "Progress"], ["me", "Profile"]];

  /* ---------- Render root ---------- */
  function render() {
    var app = $("#app"), nav = $("#nav");
    if (!S.profile) { nav.hidden = true; app.innerHTML = renderOnboarding(); return; }
    nav.hidden = false;
    nav.innerHTML = TABS.map(function (t) {
      return '<button data-act="tab" data-v="' + t[0] + '" class="' + (V.tab === t[0] ? "on" : "") + '" aria-label="' + t[1] + '">' + ICONS[t[0]] + t[1] + "</button>";
    }).join("");
    var html = "";
    if (V.tab === "today") html = renderToday();
    else if (V.tab === "food") html = renderFood();
    else if (V.tab === "train") html = renderTrain();
    else if (V.tab === "progress") html = renderProgress();
    else html = renderMe();
    app.innerHTML = html;
    if (V.tab === "progress") bindCharts();
  }

  function header(title, withDate) {
    var t = todayYmd();
    return '<header class="head"><h1>' + esc(title) + "</h1>" + (withDate ?
      '<div class="datenav"><button data-act="day" data-v="-1" aria-label="Previous day">‹</button><span>' + esc(dayLabel(V.date)) +
      '</span><button data-act="day" data-v="1" aria-label="Next day"' + (V.date >= t ? " disabled" : "") + ">›</button></div>" : "") + "</header>";
  }

  /* ---------- Onboarding / profile form ---------- */
  var F = null; // profile draft
  function draftFromProfile() {
    var P = S.profile;
    return P ? JSON.parse(JSON.stringify(P)) : { sex: "", birth: "", cm: "", kg: "", activity: "sedentary", goal: "lose", rate: 0.5, bodyFat: "" };
  }
  function profileForm(isNew) {
    if (!F) F = draftFromProfile();
    var rates = F.goal === "gain" ? GAIN_RATES : LOSE_RATES;
    var kg = numVal(F.kg);
    var h = "";
    h += '<div class="field"><span>Sex</span><div class="seg">' +
      [["male", "Male"], ["female", "Female"]].map(function (o) {
        return '<button type="button" data-act="f-set" data-k="sex" data-v="' + o[0] + '" class="' + (F.sex === o[0] ? "on" : "") + '">' + o[1] + "</button>";
      }).join("") + "</div><em>Resting burn differs by about 166 kcal/day between the two formulas.</em></div>";
    h += '<div class="grid2"><label class="field"><span>Date of birth</span><input class="input" type="date" data-f="birth" max="' + todayYmd() + '" value="' + esc(F.birth) + '"></label>' +
      '<label class="field"><span>Height</span><div class="input-unit"><input class="input" inputmode="decimal" data-f="cm" placeholder="175" value="' + esc(F.cm) + '"><b>cm</b></div></label></div>';
    if (isNew) h += '<label class="field"><span>Current weight</span><div class="input-unit"><input class="input" inputmode="decimal" data-f="kg" placeholder="72.5" value="' + esc(F.kg) + '"><b>kg</b></div><em>Weigh in the morning, after the bathroom, before eating — the same way each time.</em></label>';
    h += '<div class="field"><span>Daily life, not counting workouts</span>' + C.ACTIVITY_LEVELS.map(function (l) {
      return '<div class="opt' + (F.activity === l.id ? " on" : "") + '" data-act="f-set" data-k="activity" data-v="' + l.id + '"><b>' + l.label + "</b><span>" + l.desc + "</span></div>";
    }).join("") + "<em>Log workouts separately — they're added to your budget on the day you do them.</em></div>";
    h += '<div class="field"><span>Goal</span><div class="seg">' + [["lose", "Lose fat"], ["maintain", "Maintain"], ["gain", "Build muscle"]].map(function (o) {
      return '<button type="button" data-act="f-set" data-k="goal" data-v="' + o[0] + '" class="' + (F.goal === o[0] ? "on" : "") + '">' + o[1] + "</button>";
    }).join("") + "</div></div>";
    if (F.goal !== "maintain") {
      if (rates.indexOf(Number(F.rate)) < 0) F.rate = rates[1];
      h += '<div class="field"><span>' + (F.goal === "lose" ? "Lose" : "Gain") + ' per week</span><div class="chips">' + rates.map(function (r) {
        return '<button type="button" class="chip' + (Number(F.rate) === r ? " on" : "") + '" data-act="f-set" data-k="rate" data-v="' + r + '">' + r + " kg</button>";
      }).join("") + "</div>";
      var cur = isNew ? kg : (S.profile ? weightOn(todayYmd()) : kg);
      if (cur > 0) {
        var pct = F.rate / cur * 100;
        var advice = F.goal === "lose"
          ? (pct > 1 ? "That's " + pct.toFixed(1) + "% of your weight a week — faster than the ~0.5–1% that protects muscle." : "≈ " + pct.toFixed(1) + "% of body weight per week — a sustainable pace.")
          : (pct > 0.5 ? "Faster gain than ~0.25–0.5% a week mostly adds fat." : "≈ " + pct.toFixed(2) + "% of body weight per week — a lean-gain pace.");
        h += "<em>" + advice + "</em>";
      }
      h += "</div>";
    }
    h += '<label class="field"><span>Body fat % <span class="faint">(optional)</span></span><div class="input-unit"><input class="input" inputmode="decimal" data-f="bodyFat" placeholder="Leave blank if unsure" value="' + esc(F.bodyFat == null ? "" : F.bodyFat) + '"><b>%</b></div><em>Only from a DEXA scan or the tape method on the Progress tab. If set, resting burn uses Katch-McArdle, which accounts for muscle.</em></label>';
    return h;
  }
  function validateDraft(isNew) {
    var cm = numVal(F.cm), kg = numVal(F.kg), bf = F.bodyFat === "" || F.bodyFat == null ? null : numVal(F.bodyFat);
    var age = C.ageOn(F.birth, todayYmd());
    if (F.sex !== "male" && F.sex !== "female") return "Choose sex — the formulas need it";
    if (!(age >= 13 && age <= 100)) return "Enter a date of birth (age 13–100)";
    if (!(cm >= 120 && cm <= 230)) return "Height should be in cm (120–230)";
    if (isNew && !(kg >= 30 && kg <= 300)) return "Weight should be in kg (30–300)";
    if (bf != null && !(bf >= 3 && bf <= 60)) return "Body fat should be between 3 and 60%";
    return "";
  }
  function renderOnboarding() {
    return '<div class="welcome"><img class="mark" src="icon-192.png" alt=""><h1>Let\'s calibrate.</h1>' +
      "<p>Pulse works out your numbers from real formulas, then corrects them from your own weigh-ins and food logs. Everything stays on this phone.</p></div>" +
      '<div class="card">' + profileForm(true) + '<button class="btn block" data-act="f-save-new">Work out my numbers</button></div>';
  }
  function applyDraft(isNew) {
    var err = validateDraft(isNew);
    if (err) { toast(err); return false; }
    var P = S.profile || {};
    P.sex = F.sex; P.birth = F.birth; P.cm = numVal(F.cm); P.activity = F.activity; P.goal = F.goal;
    P.rate = F.goal === "maintain" ? 0 : Number(F.rate);
    P.bodyFat = F.bodyFat === "" || F.bodyFat == null ? null : numVal(F.bodyFat);
    if (isNew) {
      P.kg = numVal(F.kg);
      S.weights.push({ date: todayYmd(), kg: P.kg });
    }
    if (P.proteinPerKg == null || !isNew && S.profile && S.profile._goalWas !== P.goal) P.proteinPerKg = C.defaultProteinPerKg(P.goal);
    P._goalWas = P.goal;
    S.profile = P; F = null; save(); return true;
  }

  /* ---------- Today ---------- */
  function ring(eaten, budget) {
    var r = 64, circ = 2 * Math.PI * r, frac = budget > 0 ? clamp(eaten / budget, 0, 1) : 0;
    var over = eaten > budget;
    return '<svg viewBox="0 0 150 150" aria-hidden="true"><circle class="track" cx="75" cy="75" r="' + r + '" fill="none" stroke-width="12"/>' +
      '<circle class="bar' + (over ? " over" : "") + '" cx="75" cy="75" r="' + r + '" fill="none" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + (circ * (1 - frac)).toFixed(1) + '"/></svg>';
  }
  function meter(name, color, have, want) {
    var pct = want > 0 ? clamp(have / want * 100, 0, 100) : 0, left = want - have;
    return '<div class="meter"><div class="top"><i class="key" style="background:var(' + color + ')"></i>' + name + "</div>" +
      '<div class="val num">' + fmt(have) + " <small>/ " + fmt(want) + " g</small></div>" +
      '<div class="track"><i style="width:' + pct + "%;background:var(" + color + ')"></i></div>' +
      '<div class="left">' + (left >= 0 ? fmt(left) + " g left" : fmt(-left) + " g over") + "</div></div>";
  }
  function renderToday() {
    var M = model(V.date), d = getDay(V.date), t = M.totals;
    var over = M.remaining < 0;
    var h = header(V.date === todayYmd() ? "Today" : "Day", true);
    h += '<section class="card"><div class="hero"><div class="ring">' + ring(t.kcal, M.budget) +
      '<div class="ring-c"><div class="ring-big num">' + fmt(Math.abs(M.remaining)) + '</div><div class="ring-lbl' + (over ? " over" : "") + '">' + (over ? "kcal over" : "kcal left") + "</div></div></div>" +
      '<div class="stats"><div class="stat"><span>Budget</span><b class="num">' + fmt(M.budget) + '</b></div><div class="stat"><span>Eaten</span><b class="num">' + fmt(t.kcal) +
      '</b></div><div class="stat"><span>Exercise</span><b class="num">' + signed(t.exNet) + "</b></div></div></div>";
    h += '<div class="explain">' + budgetSentence(M) + ' <button class="link" data-act="tab" data-v="me">See the maths</button></div></section>';

    h += '<section class="card"><h2>Macros <small>protein ' + M.proteinPerKg + " g/kg</small></h2>" +
      '<div class="meters">' + meter("Protein", "--protein", t.p, M.macros.p) + meter("Carbs", "--carbs", t.c, M.macros.c) + meter("Fat", "--fat", t.f, M.macros.f) + "</div>" +
      (t.a > 0 ? '<div class="note">Includes ' + fmt1(t.a) + " g alcohol (" + fmt(t.a * 7) + " kcal) — counted in calories, not in macros.</div>" : "") + "</section>";

    var cups = Math.max(1, Math.round(M.water / 250)), have = Math.round((d.water || 0) / 250);
    var bar = "";
    for (var i = 0; i < Math.min(cups, 16); i++) bar += '<i class="' + (i < have ? "on" : "") + '"></i>';
    h += '<section class="card"><h2>Water <small class="num">' + fmt(d.water || 0) + " / " + fmt(M.water) + " ml</small></h2>" +
      '<div class="water-bar">' + bar + '</div><div class="row"><button class="btn ghost sm" data-act="water" data-v="-250">− 250</button>' +
      '<button class="btn sm grow" data-act="water" data-v="250">+ 250 ml</button><button class="btn ghost sm" data-act="water" data-v="500">+ 500</button></div>' +
      '<div class="tiny faint" style="margin-top:8px">Target: 35 ml per kg' + (t.exMin ? " + 500 ml per hour of exercise" : "") + ". Food adds roughly another 20% on top.</div></section>";

    var km = d.steps ? C.stepsToKm(d.steps, M.who.cm, M.who.sex) : 0;
    h += '<section class="card"><h2>Steps <small>' + (d.steps ? fmt1(km) + " km" : "") + "</small></h2>" +
      '<div class="row"><input class="input grow num" inputmode="numeric" id="steps-in" placeholder="From your phone or watch" value="' + (d.steps || "") + '"><button class="btn sm" data-act="steps">Save</button></div>' +
      '<div class="tiny faint" style="margin-top:8px">Steps are already part of your daily-life level, so they aren\'t added to your budget. Progress tells you if your level looks wrong.</div></section>';

    h += '<section class="card"><h2>Workouts <button class="link" data-act="tab" data-v="train">+ Log</button></h2>' + workoutList(V.date) + "</section>";
    return h;
  }
  function budgetSentence(M) {
    var P = S.profile, parts = [];
    parts.push("<b>" + fmt(M.base) + "</b> " + (M.useAdaptive ? "measured maintenance" : "estimated maintenance"));
    if (Math.round(M.target.delta)) parts.push(signed(M.target.delta) + " for " + (P.goal === "lose" ? "fat loss" : "muscle gain"));
    if (M.totals.exNet > 0) parts.push("+" + fmt(M.totals.exNet) + " exercise");
    var s = parts.join(" · ") + ".";
    if (M.target.floored) s += " Capped at a " + fmt(M.target.floor) + " kcal minimum for safety.";
    return s;
  }

  /* ---------- Food ---------- */
  function renderFood() {
    var d = getDay(V.date), M = model(V.date);
    var h = header("Food", true);
    h += '<div class="card"><div class="row between"><div><div class="label">Eaten</div><div style="font-size:24px;font-weight:800" class="num">' + fmt(M.totals.kcal) +
      ' <span class="faint" style="font-size:14px;font-weight:600">/ ' + fmt(M.budget) + ' kcal</span></div></div><div class="small muted num" style="text-align:right">P ' + fmt(M.totals.p) + " · C " + fmt(M.totals.c) + " · F " + fmt(M.totals.f) + " g</div></div></div>";
    MEALS.forEach(function (m) {
      var items = d.food.filter(function (x) { return x.meal === m[0]; });
      var kc = items.reduce(function (s, x) { return s + x.kcal; }, 0);
      h += '<section class="card"><div class="meal-head"><h3>' + m[1] + '</h3><span class="kc num">' + (items.length ? fmt(kc) + " kcal" : "") + "</span></div>";
      if (items.length) h += '<ul class="list">' + items.map(function (x) {
        return '<li class="item" data-act="edit-food" data-id="' + x.id + '"><div class="grow"><div class="t">' + esc(x.name) + '</div><div class="s num">' +
          (x.grams ? fmt(x.grams) + " g · " : "") + "P " + fmt(x.p) + " · C " + fmt(x.c) + " · F " + fmt(x.f) + '</div></div><div class="k num">' + fmt(x.kcal) + "</div></li>";
      }).join("") + "</ul>";
      h += '<button class="add-row" data-act="add-food" data-meal="' + m[0] + '"><span style="font-size:18px">+</span> Add food</button></section>';
    });
    h += '<div class="card"><label class="toggle"><div><b>I logged everything today</b><div class="tiny faint">Days you switch off are left out when Pulse measures your real maintenance.</div></div>' +
      '<input type="checkbox" data-act="complete"' + (d.incomplete ? "" : " checked") + "></label></div>";
    return h;
  }

  /* ---------- Train ---------- */
  function workoutList(ymd) {
    var d = getDay(ymd);
    if (!d.workouts.length) return '<div class="empty">No workouts logged.</div>';
    var w0 = who(ymd);
    return '<ul class="list">' + d.workouts.map(function (w) {
      var a = C.activityById(w.activity) || { name: "Workout" }, e = C.workoutEnergy(w, w0);
      var bits = [fmt(w.minutes) + " min"];
      if (w.distanceKm) bits.push(fmt1(w.distanceKm) + " km");
      if (w.avgHr) bits.push(w.avgHr + " bpm");
      if (w.lifts && w.lifts.length) bits.push(w.lifts.length + " exercise" + (w.lifts.length > 1 ? "s" : ""));
      return '<li class="item" data-act="edit-workout" data-id="' + w.id + '"><div class="grow"><div class="t">' + esc(a.name) + '</div><div class="s">' + esc(bits.join(" · ")) +
        '</div><div class="s">' + esc(e.method) + '</div></div><div class="k num">+' + fmt(e.net) + " <small>kcal</small></div></li>";
    }).join("") + "</ul>";
  }
  function allLiftSets() {
    var out = {};
    Object.keys(S.days).forEach(function (ymd) {
      S.days[ymd].workouts.forEach(function (w) {
        (w.lifts || []).forEach(function (l) {
          var name = (l.name || "").trim(); if (!name) return;
          var key = name.toLowerCase();
          (l.sets || []).forEach(function (s) {
            var e = C.e1rm(s.kg, s.reps);
            if (!isFinite(e)) return;
            if (!out[key] || e > out[key].e1rm) out[key] = { name: name, e1rm: e, kg: s.kg, reps: s.reps, date: ymd };
          });
        });
      });
    });
    return out;
  }
  function renderTrain() {
    var h = header("Train", true);
    h += '<button class="btn block" data-act="new-workout" style="margin-bottom:12px">+ Log a workout</button>';
    h += '<section class="card"><h2>' + esc(dayLabel(V.date)) + "</h2>" + workoutList(V.date) + "</section>";
    var prs = allLiftSets(), keys = Object.keys(prs).sort(function (a, b) { return prs[b].e1rm - prs[a].e1rm; });
    h += '<section class="card"><h2>Strength records <small>estimated 1-rep max</small></h2>';
    if (!keys.length) h += '<div class="empty">Log sets in a weight-training workout and your best estimated 1-rep max for each lift appears here.</div>';
    else h += '<ul class="list">' + keys.map(function (k) {
      var r = prs[k];
      return '<li class="item" style="cursor:default"><div class="grow"><div class="t">' + esc(r.name) + '</div><div class="s num">' + fmt1(r.kg) + " kg × " + r.reps + " · " + shortDate(r.date) +
        '</div></div><div class="k num">' + fmt1(r.e1rm) + " <small>kg</small></div></li>";
    }).join("") + '</ul><div class="tiny faint" style="margin-top:8px">Epley formula, from sets of 12 reps or fewer — higher-rep sets give unreliable estimates.</div>';
    h += "</section>";
    return h;
  }

  /* ---------- Progress ---------- */
  function renderProgress() {
    var P = S.profile, t = todayYmd(), M = model(t), ws = sortedWeights();
    var tr = C.weightTrend(ws);
    var last = tr[tr.length - 1];
    var h = header("Progress", false);

    // Weight
    var todayW = S.weights.filter(function (w) { return w.date === t; })[0];
    h += '<section class="card"><h2>Weight <small>' + (last ? "trend " + fmt1(last.trend) + " kg" : "") + "</small></h2>" +
      '<div class="row"><div class="input-unit grow"><input class="input num" inputmode="decimal" id="w-in" placeholder="Today\'s weight" value="' + (todayW ? todayW.kg : "") + '"><b>kg</b></div><button class="btn" data-act="log-weight">' + (todayW ? "Update" : "Log") + "</button></div>";
    var start28 = C.addDays(t, -27);
    var recent = ws.filter(function (w) { return w.date >= start28; });
    var fit = recent.length >= 3 ? C.linreg(recent.map(function (w) { return [C.daysBetween(start28, w.date), w.kg]; })) : null;
    h += '<div class="kpis" style="margin-top:12px"><div class="kpi"><b class="num">' + (last ? fmt1(last.trend) : "—") + '</b><span>Trend weight</span></div>' +
      '<div class="kpi"><b class="num">' + (fit ? signed(fit.slope * 7, fmt1) : "—") + '</b><span>kg / week (28 d)</span></div>' +
      '<div class="kpi"><b class="num">' + (last ? fmt1(C.bmi(last.trend, P.cm)) : "—") + "</b><span>BMI · " + (last ? C.bmiCategory(C.bmi(last.trend, P.cm)) : "") + "</span></div></div>";
    if (ws.length >= 2) h += '<div class="chart" id="wchart" style="margin-top:14px"></div><div class="legend"><span><i class="dot"></i>Weigh-in</span><span><i class="ln"></i>Trend (smoothed)</span></div>' + weightTable(tr);
    else h += '<div class="note">Weigh in on most mornings. Day-to-day weight swings 1–2 kg from water and food, so Pulse follows the smoothed trend, not single readings.</div>';
    if (fit && P.goal !== "maintain") {
      var want = P.goal === "lose" ? -P.rate : P.rate, got = fit.slope * 7;
      var msg = Math.abs(got - want) < 0.15 ? "On pace for your " + P.rate + " kg/week goal." :
        (P.goal === "lose" ? (got > want ? "Losing slower than planned." : "Losing faster than planned.") : (got < want ? "Gaining slower than planned." : "Gaining faster than planned.")) +
        (M.useAdaptive ? " Your budget already adjusts for this." : " Keep logging — once measured maintenance is ready, your budget adjusts automatically.");
      h += '<div class="note">' + msg + "</div>";
    }
    h += "</section>";

    // Measured maintenance
    var ad = M.adaptive;
    h += '<section class="card"><h2>Measured maintenance <small>' + (ad.ready ? '<span class="pill">' + (ad.confidence === "high" ? "High" : "Medium") + " confidence</span>" : '<span class="pill grey">Learning</span>') + "</small></h2>";
    if (ad.ready) {
      h += '<div class="kpis"><div class="kpi"><b class="num">' + fmt(ad.tdee) + '</b><span>Measured kcal/day</span></div><div class="kpi"><b class="num">' + fmt(M.formula + ad.avgExercise) +
        '</b><span>Formula estimate</span></div><div class="kpi"><b class="num">' + fmt(ad.avgIntake) + "</b><span>Avg eaten</span></div></div>" +
        '<div class="note">Last 28 days: you ate ' + fmt(ad.avgIntake) + " kcal a day on average and your weight moved " + signed(ad.kgPerWeek, fmt1) + " kg a week. Every kg is about 7,700 kcal, so what you really burn is ≈ " + fmt(ad.tdee) + " kcal a day" +
        (ad.avgExercise > 5 ? " (including " + fmt(ad.avgExercise) + " a day of exercise)" : "") + ". " + (M.useAdaptive ? "Your budget uses this number." : "Your budget still uses the formula — switch in Profile.") + "</div>";
    } else {
      h += '<p class="small muted" style="margin:0 0 6px">Formulas can be off by 10% or more for any one person. After a few weeks of logging, Pulse measures your real burn from how your weight responds to what you eat.</p>' +
        '<div class="note">Still needed: ' + esc(ad.need.join(", ")) + ".</div>";
    }
    h += "</section>";

    // Calories chart
    h += '<section class="card"><h2>Calories, last 14 days</h2><div class="chart" id="cchart"></div><div class="legend"><span><i class="bx"></i>Eaten</span><span><i class="tk"></i>Budget</span></div>' + calTable() + "</section>";

    // Body composition
    var ms = S.measures.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var lm = ms[ms.length - 1];
    var bf = lm ? C.navyBodyFat(P.sex, P.cm, lm.neck, lm.waist, lm.hip) : NaN;
    h += '<section class="card"><h2>Body composition <small>tape method</small></h2>' +
      '<div class="' + (P.sex === "female" ? "grid3" : "grid2") + '"><label class="field"><span>Neck</span><div class="input-unit"><input class="input" inputmode="decimal" id="m-neck" value="' + (lm ? lm.neck : "") + '"><b>cm</b></div></label>' +
      '<label class="field"><span>Waist</span><div class="input-unit"><input class="input" inputmode="decimal" id="m-waist" value="' + (lm ? lm.waist : "") + '"><b>cm</b></div></label>' +
      (P.sex === "female" ? '<label class="field"><span>Hips</span><div class="input-unit"><input class="input" inputmode="decimal" id="m-hip" value="' + (lm && lm.hip ? lm.hip : "") + '"><b>cm</b></div></label>' : "") + "</div>" +
      '<div class="tiny faint" style="margin:-4px 0 12px">Neck just below the Adam\'s apple. Waist ' + (P.sex === "female" ? "at the narrowest point; hips at the widest." : "level with the navel, relaxed.") + " Tape snug, not tight.</div>" +
      '<button class="btn ghost block" data-act="log-measure">Save measurements</button>';
    if (lm) {
      var whtr = lm.waist / P.cm, lastKg = last ? last.trend : weightOn(t);
      h += '<div class="kpis" style="margin-top:12px"><div class="kpi"><b class="num">' + (isFinite(bf) ? fmt1(bf) + "%" : "—") + '</b><span>Body fat (US Navy)</span></div>' +
        '<div class="kpi"><b class="num">' + (isFinite(bf) ? fmt1(lastKg * (1 - bf / 100)) : "—") + '</b><span>Lean mass kg</span></div>' +
        '<div class="kpi"><b class="num">' + whtr.toFixed(2) + "</b><span>Waist ÷ height " + (whtr < 0.5 ? "· healthy" : "· aim < 0.5") + "</span></div></div>";
      if (isFinite(bf) && Math.abs((P.bodyFat || 0) - bf) >= 0.5)
        h += '<button class="btn line block" style="margin-top:10px" data-act="use-bf" data-v="' + bf.toFixed(1) + '">Use ' + fmt1(bf) + "% for resting burn (Katch-McArdle)</button>";
      h += '<div class="tiny faint" style="margin-top:8px">Measured ' + shortDate(lm.date) + ". The tape method is typically within ±3–4% of DEXA; track the change, not the exact number.</div>";
    }
    h += "</section>";

    // Steps check
    var st = [], sum = 0;
    for (var i = 1; i <= 14; i++) { var dd = getDay(C.addDays(t, -i)); if (dd.steps) { st.push(dd.steps); sum += dd.steps; } }
    if (st.length >= 5) {
      var avg = sum / st.length, fits = C.levelFromSteps(avg), lvl = C.levelById(fits);
      h += '<section class="card"><h2>Activity check <small>' + st.length + " days of steps</small></h2>" +
        '<div class="small">You average <b class="num">' + fmt(avg) + "</b> steps a day. That fits <b>" + lvl.label + "</b>" + (fits === P.activity ? " — the level you chose. 👍" : ", but your profile says <b>" + C.levelById(P.activity).label + "</b>.") + "</div>" +
        (fits !== P.activity ? '<button class="btn line block" style="margin-top:10px" data-act="set-level" data-v="' + fits + '">Switch to ' + lvl.label + "</button>" : "") + "</section>";
    }
    return h;
  }
  function weightTable(tr) {
    var rows = tr.slice(-30).reverse().map(function (p) {
      return "<tr><td>" + shortDate(p.date) + '</td><td>' + fmt1(p.kg) + "</td><td>" + fmt1(p.trend) + '</td><td><button class="link" data-act="del-weight" data-v="' + p.date + '" aria-label="Delete">✕</button></td></tr>';
    }).join("");
    return '<details class="table"><summary>Show weigh-ins as a table</summary><table><tr><th>Date</th><th>Weight</th><th>Trend</th><th></th></tr>' + rows + "</table></details>";
  }
  function calSeries() {
    var t = todayYmd(), out = [];
    for (var i = 13; i >= 0; i--) {
      var ymd = C.addDays(t, -i), d = getDay(ymd);
      out.push({ date: ymd, eaten: d.food.length ? dayTotals(ymd).kcal : null, budget: model(ymd).budget, incomplete: d.incomplete });
    }
    return out;
  }
  function calTable() {
    var rows = calSeries().slice().reverse().map(function (r) {
      return "<tr><td>" + shortDate(r.date) + (r.incomplete ? " *" : "") + "</td><td>" + (r.eaten == null ? "—" : fmt(r.eaten)) + "</td><td>" + fmt(r.budget) + "</td><td>" + (r.eaten == null ? "" : signed(r.eaten - r.budget)) + "</td></tr>";
    }).join("");
    return '<details class="table"><summary>Show as a table</summary><table><tr><th>Day</th><th>Eaten</th><th>Budget</th><th>Diff</th></tr>' + rows + "</table></details>";
  }

  /* ---------- Charts (hand-built SVG) ---------- */
  function niceTicks(lo, hi, n) {
    var span = hi - lo || 1, step = Math.pow(10, Math.floor(Math.log10(span / n)));
    [1, 2, 2.5, 5, 10].some(function (m) { if (span / (step * m) <= n) { step *= m; return true; } return false; });
    // Ticks always enclose the data, so nothing draws outside the plot.
    var ticks = [], end = Math.ceil(hi / step - 1e-9) * step;
    for (var v = Math.floor(lo / step + 1e-9) * step; v <= end + 1e-9; v += step) ticks.push(Math.round(v * 1000) / 1000);
    return ticks;
  }
  function bindCharts() {
    var wEl = $("#wchart"); if (wEl) drawWeight(wEl);
    var cEl = $("#cchart"); if (cEl) drawCalories(cEl);
  }
  function drawWeight(el) {
    var tr = C.weightTrend(sortedWeights());
    var t = todayYmd(), from = C.addDays(t, -89);
    var pts = tr.filter(function (p) { return p.date >= from; });
    if (pts.length < 2) pts = tr.slice(-2);
    var W = 340, H = 170, L = 34, R = 10, T = 10, B = 22;
    var x0 = pts[0].date, span = Math.max(1, C.daysBetween(x0, pts[pts.length - 1].date));
    var lo = Infinity, hi = -Infinity;
    pts.forEach(function (p) { lo = Math.min(lo, p.kg, p.trend); hi = Math.max(hi, p.kg, p.trend); });
    var pad = Math.max(0.5, (hi - lo) * 0.15); lo -= pad; hi += pad;
    var ticks = niceTicks(lo, hi, 4); lo = Math.min(lo, ticks[0]); hi = Math.max(hi, ticks[ticks.length - 1]);
    function X(d) { return L + C.daysBetween(x0, d) / span * (W - L - R); }
    function Y(v) { return T + (hi - v) / (hi - lo) * (H - T - B); }
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Weight and trend over time"><g class="grid">' +
      ticks.map(function (v) { return '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/>'; }).join("") + '</g><g class="axis">' +
      ticks.map(function (v) { return '<text x="' + (L - 6) + '" y="' + (Y(v) + 3.5) + '" text-anchor="end">' + (v % 1 ? v.toFixed(1) : v) + "</text>"; }).join("") +
      '<text x="' + L + '" y="' + (H - 4) + '">' + shortDate(pts[0].date) + '</text><text x="' + (W - R) + '" y="' + (H - 4) + '" text-anchor="end">' + shortDate(pts[pts.length - 1].date) + "</text></g>";
    s += pts.map(function (p) { return '<circle class="raw" cx="' + X(p.date).toFixed(1) + '" cy="' + Y(p.kg).toFixed(1) + '" r="3"/>'; }).join("");
    s += '<path class="trend" d="' + pts.map(function (p, i) { return (i ? "L" : "M") + X(p.date).toFixed(1) + " " + Y(p.trend).toFixed(1); }).join("") + '"/>';
    var lp = pts[pts.length - 1];
    s += '<circle class="end" cx="' + X(lp.date) + '" cy="' + Y(lp.trend) + '" r="5"/>';
    s += '<line class="cross" id="wx" y1="' + T + '" y2="' + (H - B) + '" x1="-10" x2="-10"/><rect class="hit" x="' + L + '" y="0" width="' + (W - L - R) + '" height="' + H + '"/></svg><div class="tip" id="wtip"></div>';
    el.innerHTML = s;
    hover(el, function (fx) {
      var best = pts[0], bd = Infinity;
      pts.forEach(function (p) { var dd = Math.abs(X(p.date) - fx); if (dd < bd) { bd = dd; best = p; } });
      return { x: X(best.date), y: Math.min(Y(best.kg), Y(best.trend)), html: "<b>" + shortDate(best.date) + "</b> · " + fmt1(best.kg) + " kg · trend " + fmt1(best.trend), cross: "#wx" };
    }, W);
  }
  function drawCalories(el) {
    var rows = calSeries();
    var W = 340, H = 170, L = 40, R = 6, T = 10, B = 22;
    var hi = 0; rows.forEach(function (r) { hi = Math.max(hi, r.eaten || 0, r.budget); });
    var ticks = niceTicks(0, hi * 1.08, 4); hi = ticks[ticks.length - 1];
    var band = (W - L - R) / rows.length, bw = Math.min(16, band - 4);
    function Y(v) { return T + (hi - v) / hi * (H - T - B); }
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Calories eaten versus budget, last 14 days"><g class="grid">' +
      ticks.map(function (v) { return '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/>'; }).join("") + '</g><g class="axis">' +
      ticks.map(function (v) { return '<text x="' + (L - 6) + '" y="' + (Y(v) + 3.5) + '" text-anchor="end">' + fmt(v) + "</text>"; }).join("");
    rows.forEach(function (r, i) {
      if (i % 3 === 1 || i === rows.length - 1) s += '<text x="' + (L + band * i + band / 2) + '" y="' + (H - 4) + '" text-anchor="middle">' + (i === rows.length - 1 ? "Today" : shortDate(r.date)) + "</text>";
    });
    s += "</g>";
    rows.forEach(function (r, i) {
      var cx = L + band * i + band / 2;
      if (r.eaten) {
        var y = Y(r.eaten), h = Y(0) - y, rad = Math.min(4, h / 2);
        s += '<path class="col" d="M' + (cx - bw / 2) + " " + Y(0) + "V" + (y + rad) + "Q" + (cx - bw / 2) + " " + y + " " + (cx - bw / 2 + rad) + " " + y + "H" + (cx + bw / 2 - rad) + "Q" + (cx + bw / 2) + " " + y + " " + (cx + bw / 2) + " " + (y + rad) + "V" + Y(0) + 'Z"/>';
      }
      s += '<line class="tgt" x1="' + (cx - bw / 2 - 2) + '" x2="' + (cx + bw / 2 + 2) + '" y1="' + Y(r.budget) + '" y2="' + Y(r.budget) + '"/>';
    });
    s += '<line class="cross" id="cx" y1="' + T + '" y2="' + (H - B) + '" x1="-10" x2="-10" style="display:none"/><rect class="hit" x="' + L + '" y="0" width="' + (W - L - R) + '" height="' + H + '"/></svg><div class="tip" id="ctip"></div>';
    el.innerHTML = s;
    hover(el, function (fx) {
      var i = clamp(Math.floor((fx - L) / band), 0, rows.length - 1), r = rows[i];
      var diff = r.eaten == null ? "" : " · " + signed(r.eaten - r.budget);
      return { x: L + band * i + band / 2, y: Y(Math.max(r.eaten || 0, r.budget)), html: "<b>" + dayLabel(r.date) + "</b> · " + (r.eaten == null ? "not logged" : fmt(r.eaten) + " / " + fmt(r.budget) + diff) };
    }, W);
  }
  function hover(el, pick, W) {
    var svg = el.querySelector("svg"), tip = el.querySelector(".tip");
    function move(ev) {
      var rc = svg.getBoundingClientRect(), k = rc.width / W;
      var fx = (ev.clientX - rc.left) / k, r = pick(fx);
      tip.innerHTML = r.html;
      var left = clamp(r.x * k, 80, rc.width - 80);
      tip.style.left = left + "px"; tip.style.top = (r.y * k - 8) + "px"; tip.classList.add("on");
      if (r.cross) { var c = svg.querySelector(r.cross); c.setAttribute("x1", r.x); c.setAttribute("x2", r.x); }
    }
    function out() { tip.classList.remove("on"); var c = svg.querySelector(".cross"); if (c) { c.setAttribute("x1", -10); c.setAttribute("x2", -10); } }
    var hit = svg.querySelector(".hit");
    hit.addEventListener("pointermove", move);
    hit.addEventListener("pointerdown", move);
    hit.addEventListener("pointerleave", out);
  }

  /* ---------- Profile ---------- */
  function renderMe() {
    var P = S.profile, t = todayYmd(), M = model(t), w = M.who;
    var mt = C.macroTargets(M.target.kcal, w.kg, P.cm, M.proteinPerKg);
    var h = header("Profile", false);
    h += '<section class="card"><h2>Your numbers <small>today</small></h2><div class="math">' +
      r("Resting burn (BMR)", fmt(w.bmrKcal) + " kcal", w.bmrMethod + " · " + w.age + " y, " + fmt1(w.kg) + " kg, " + P.cm + " cm" + (P.bodyFat ? ", " + P.bodyFat + "% fat" : "")) +
      r("× " + M.level.label, "× " + M.level.factor, "Daily life without workouts") +
      r("Formula maintenance", fmt(M.formula) + " kcal", "") +
      (M.adaptive.ready ? r("Measured maintenance", fmt(M.adaptive.baseWithoutExercise) + " kcal", "From your last 28 days, workouts taken out") : "") +
      r("Goal adjustment", signed(M.target.delta) + " kcal", P.goal === "maintain" ? "Maintain" : P.rate + " kg/week × 7,700 kcal ÷ 7") +
      '<div class="r tot"><span>Daily target before exercise</span><span class="num">' + fmt(M.target.kcal) + " kcal</span></div>" +
      r("Protein", fmt(mt.p) + " g", M.proteinPerKg + " g per kg" + (mt.refKg < w.kg - 0.5 ? " of " + fmt1(mt.refKg) + " kg (weight at BMI 25)" : "")) +
      r("Fat", fmt(mt.f) + " g", "27% of calories, at least 0.6 g/kg") +
      r("Carbs", fmt(mt.c) + " g", "The rest of your calories") +
      r("Water", fmt(C.waterTargetMl(w.kg, 0)) + " ml", "35 ml per kg, more on workout days") +
      "</div>";
    if (M.target.floored) h += '<div class="note warn">Your goal pace would put you under ' + fmt(M.target.floor) + " kcal, so it's capped there. Pick a slower pace to get a realistic target.</div>";
    h += "</section>";

    h += '<section class="card"><h2>Maintenance source</h2>' +
      '<div class="opt' + (S.settings.maintSource === "auto" ? " on" : "") + '" data-act="maint" data-v="auto"><b>Auto (recommended)</b><span>Use the formula now, then switch to your measured maintenance once there\'s enough data' + (M.adaptive.ready ? " — active now." : ".") + "</span></div>" +
      '<div class="opt' + (S.settings.maintSource === "formula" ? " on" : "") + '" data-act="maint" data-v="formula"><b>Formula only</b><span>Always use ' + esc(w.bmrMethod) + " × activity level.</span></div></section>";

    h += '<section class="card"><h2>Protein target</h2><div class="chips">' + [1.2, 1.6, 1.8, 2.0, 2.2].map(function (v) {
      return '<button class="chip' + (M.proteinPerKg === v ? " on" : "") + '" data-act="protein" data-v="' + v + '">' + v + " g/kg</button>";
    }).join("") + '</div><div class="tiny faint" style="margin-top:8px">1.6 g/kg covers most people\'s muscle-building needs; 2.0–2.2 g/kg helps keep muscle while losing fat.</div></section>';

    if (!F) F = draftFromProfile();
    h += '<section class="card"><h2>Details</h2>' + profileForm(false) + '<button class="btn block" data-act="f-save">Save changes</button></section>';

    h += '<section class="card"><h2>Your data</h2><p class="small muted" style="margin-top:0">Everything is stored only on this device. Export a backup now and then.</p>' +
      '<div class="grid2"><button class="btn ghost" data-act="export">Export backup</button><label class="btn ghost" style="cursor:pointer">Import backup<input type="file" accept="application/json,.json" id="import" hidden></label></div>' +
      '<button class="btn danger block" style="margin-top:10px" data-act="wipe">Erase everything</button></section>';
    h += '<p class="tiny faint" style="text-align:center;margin:18px 0">Pulse gives estimates for healthy adults, not medical advice. If you\'re pregnant, under 18 or managing a condition, check with a professional.</p>';
    return h;
    function r(a, b, c) { return '<div class="r"><div><div>' + a + "</div>" + (c ? '<div class="tiny faint">' + esc(c) + "</div>" : "") + '</div><span class="num" style="white-space:nowrap;font-weight:700">' + b + "</span></div>"; }
  }

  /* ---------- Sheets ---------- */
  var sheetState = null;
  function openSheet(html) {
    var old = document.querySelectorAll(".scrim,.sheet");
    for (var i = 0; i < old.length; i++) old[i].remove();
    var scrim = document.createElement("div"); scrim.className = "scrim"; scrim.dataset.act = "close-sheet";
    var sh = document.createElement("div"); sh.className = "sheet"; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "true");
    sh.innerHTML = '<div class="grab"></div><div id="sheet-body">' + html + "</div>";
    document.body.appendChild(scrim); document.body.appendChild(sh);
    requestAnimationFrame(function () { scrim.classList.add("on"); sh.classList.add("on"); });
    document.body.style.overflow = "hidden";
  }
  function setSheet(html) { var b = $("#sheet-body"); if (b) b.innerHTML = html; }
  function closeSheet() {
    stopScanner();
    var sc = $(".scrim"), sh = $(".sheet");
    if (!sc && !sh) return;
    sheetState = null; document.body.style.overflow = "";
    if (sc) sc.classList.remove("on"); if (sh) sh.classList.remove("on");
    setTimeout(function () { if (sc) sc.remove(); if (sh) sh.remove(); }, 250);
  }
  function sheetHead(title) { return '<div class="sheet-head"><h2>' + esc(title) + '</h2><button class="icon-btn" data-act="close-sheet" aria-label="Close">✕</button></div>'; }

  /* ----- Add food ----- */
  function openAddFood(meal) {
    sheetState = { kind: "food", meal: meal, mode: "search", q: "", pick: null, grams: "", online: null, loading: false, quick: {}, custom: { basis: "100" } };
    openSheet(foodSheet());
    var i = $("#food-q"); if (i) setTimeout(function () { i.focus(); }, 260);
  }
  function mealName(m) { for (var i = 0; i < MEALS.length; i++) if (MEALS[i][0] === m) return MEALS[i][1]; return "Food"; }
  function foodSheet() {
    var st = sheetState;
    if (st.pick) return amountView();
    var h = sheetHead("Add to " + mealName(st.meal));
    h += '<div class="seg" style="margin-bottom:14px">' + [["search", "Search"], ["online", "Packaged"], ["quick", "Quick add"], ["custom", "New food"]].map(function (m) {
      return '<button data-act="food-mode" data-v="' + m[0] + '" class="' + (st.mode === m[0] ? "on" : "") + '">' + m[1] + "</button>";
    }).join("") + "</div>";
    if (st.mode === "search") {
      h += '<input class="input" id="food-q" placeholder="Search foods — rice, egg, chicken…" value="' + esc(st.q) + '" autocomplete="off"><div id="food-results" style="margin-top:8px">' + localResults() + "</div>";
    } else if (st.mode === "online") {
      h += '<div class="row"><input class="input grow" id="off-q" placeholder="Product name or barcode" value="' + esc(st.oq || "") + '"><button class="btn" data-act="off-search">Find</button></div>' +
        ("BarcodeDetector" in window ? '<button class="btn ghost block" style="margin-top:8px" data-act="scan">Scan barcode with camera</button><div id="scan-box"></div>' : "") +
        '<div class="tiny faint" style="margin-top:8px">From Open Food Facts, a public database built from product labels. Check the numbers against your pack.</div><div id="off-results" style="margin-top:8px">' + onlineResults() + "</div>";
    } else if (st.mode === "quick") {
      var q = st.quick;
      h += '<label class="field"><span>Name</span><input class="input" data-q="name" placeholder="e.g. Lunch at work" value="' + esc(q.name || "") + '"></label>' +
        '<div class="grid4">' + [["kcal", "kcal"], ["p", "Protein g"], ["c", "Carbs g"], ["f", "Fat g"]].map(function (k) {
          return '<label class="field"><span class="tiny">' + k[1] + '</span><input class="input num" inputmode="decimal" data-q="' + k[0] + '" value="' + esc(q[k[0]] == null ? "" : q[k[0]]) + '"></label>';
        }).join("") + '</div><div class="tiny faint" id="quick-check" style="margin:-4px 0 12px">' + quickCheck() + '</div><button class="btn block" data-act="quick-add">Add</button>';
    } else {
      var c = st.custom;
      h += '<label class="field"><span>Name</span><input class="input" data-c="name" placeholder="e.g. Kotmale yoghurt" value="' + esc(c.name || "") + '"></label>' +
        '<div class="field"><span>Values on the label are per</span><div class="seg"><button data-act="custom-basis" data-v="100" class="' + (c.basis === "100" ? "on" : "") + '">100 g / ml</button><button data-act="custom-basis" data-v="serving" class="' + (c.basis === "serving" ? "on" : "") + '">Serving</button></div></div>' +
        (c.basis === "serving" ? '<label class="field"><span>Serving size</span><div class="input-unit"><input class="input" inputmode="decimal" data-c="serving" value="' + esc(c.serving || "") + '"><b>g</b></div></label>' : "") +
        '<div class="grid4">' + [["kcal", "kcal"], ["p", "Protein g"], ["c", "Carbs g"], ["f", "Fat g"]].map(function (k) {
          return '<label class="field"><span class="tiny">' + k[1] + '</span><input class="input num" inputmode="decimal" data-c="' + k[0] + '" value="' + esc(c[k[0]] == null ? "" : c[k[0]]) + '"></label>';
        }).join("") + '</div><button class="btn block" data-act="custom-save">Save food</button><div class="tiny faint" style="margin-top:8px">Saved foods show up in Search.</div>';
    }
    return h;
  }
  function quickCheck() {
    var q = sheetState.quick, k = numVal(q.kcal), m = C.kcalFromMacros(numVal(q.p) || 0, numVal(q.c) || 0, numVal(q.f) || 0);
    if (!(m > 0)) return "Macros are optional. If you add them, Pulse checks they match the calories.";
    if (!(k > 0)) return "Calories from macros: " + fmt(m) + " kcal (used if you leave kcal empty).";
    var off = Math.abs(m - k) / k;
    return off > 0.15 ? "⚠︎ Macros add up to " + fmt(m) + " kcal — " + Math.round(off * 100) + "% off the calories. Double-check the numbers." : "✓ Macros match the calories.";
  }
  function allFoods() {
    return S.customFoods.concat(FOODS);
  }
  function findFood(id) {
    var list = allFoods();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function localResults() {
    var q = sheetState.q.trim().toLowerCase(), list;
    if (!q) {
      var rec = S.recent.map(findFood).filter(Boolean).slice(0, 8);
      list = rec.length ? rec : allFoods().slice(0, 12);
      return '<div class="label" style="margin:10px 0 2px">' + (rec.length ? "Recent" : "Common foods") + "</div>" + foodRows(list);
    }
    var words = q.split(/\s+/);
    list = allFoods().filter(function (f) {
      var n = f.name.toLowerCase();
      return words.every(function (w) { return n.indexOf(w) >= 0; });
    });
    if (!list.length) return '<div class="empty">No match. Try <button class="link" data-act="food-mode" data-v="online">packaged foods</button> or <button class="link" data-act="food-mode" data-v="custom">create it</button>.</div>';
    return foodRows(list.slice(0, 30));
  }
  function foodRows(list) {
    return '<ul class="list">' + list.map(function (f) {
      var s = f.s ? f.s[0] + " (" + f.s[1] + " g) · " + fmt(f.kcal * f.s[1] / 100) + " kcal" : "per 100 g · " + fmt(f.kcal) + " kcal";
      return '<li class="item" data-act="pick-food" data-id="' + esc(f.id) + '"><div class="grow"><div class="t">' + esc(f.name) + (/^(c|off):/.test(f.id) ? ' <span class="badge">' + (f.id[0] === "c" ? "Mine" : "Packaged") + "</span>" : "") + '</div><div class="s">' + esc(s) + '</div></div><div class="k">›</div></li>';
    }).join("") + "</ul>";
  }
  function onlineResults() {
    var st = sheetState;
    if (st.loading) return '<div class="spin"></div>';
    if (st.onlineErr) return '<div class="empty">' + esc(st.onlineErr) + "</div>";
    if (!st.online) return "";
    if (!st.online.length) return '<div class="empty">Nothing found with nutrition data. Try another name, or create it from the label.</div>';
    return '<ul class="list">' + st.online.map(function (f, i) {
      return '<li class="item" data-act="pick-online" data-v="' + i + '"><div class="grow"><div class="t">' + esc(f.name) + '</div><div class="s">' + esc((f.brand ? f.brand + " · " : "") + fmt(f.kcal) + " kcal / 100 g") + '</div></div><div class="k">›</div></li>';
    }).join("") + "</ul>";
  }
  function offToFood(p) {
    var n = p.nutriments || {};
    var kcal = n["energy-kcal_100g"];
    if (kcal == null && n["energy_100g"] != null) kcal = n["energy_100g"] / 4.184;
    kcal = numVal(kcal);
    if (!(kcal >= 0) || !p.product_name) return null;
    var sv = numVal(p.serving_quantity);
    return {
      id: "off:" + p.code, name: p.product_name, brand: (p.brands || "").split(",")[0],
      kcal: kcal, p: numVal(n.proteins_100g) || 0, c: numVal(n.carbohydrates_100g) || 0, f: numVal(n.fat_100g) || 0, a: numVal(n.alcohol_100g) || 0,
      s: sv > 0 && sv < 2000 ? [p.serving_size || "1 serving", sv] : null
    };
  }
  var OFF_FIELDS = "code,product_name,brands,nutriments,serving_quantity,serving_size";
  function offSearch(q) {
    var st = sheetState; if (!st) return;
    q = q.trim(); if (!q) return;
    st.oq = q; st.loading = true; st.onlineErr = null; setSheet(foodSheet());
    var isCode = /^\d{8,14}$/.test(q);
    var url = isCode
      ? "https://world.openfoodfacts.org/api/v2/product/" + q + ".json?fields=" + OFF_FIELDS
      : "https://world.openfoodfacts.org/cgi/search.pl?search_terms=" + encodeURIComponent(q) + "&search_simple=1&action=process&json=1&page_size=24&fields=" + OFF_FIELDS;
    fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) {
      if (sheetState !== st) return;
      var prods = isCode ? (j.status === 1 && j.product ? [j.product] : []) : (j.products || []);
      st.online = prods.map(offToFood).filter(Boolean);
      st.loading = false;
      if (isCode && st.online.length === 1) { pickFood(st.online[0]); return; }
      setSheet(foodSheet());
    }).catch(function () {
      if (sheetState !== st) return;
      st.loading = false; st.onlineErr = navigator.onLine ? "Couldn't reach Open Food Facts. Try again in a moment." : "You're offline. Search needs a connection.";
      setSheet(foodSheet());
    });
  }
  var scanner = null;
  function startScanner() {
    var box = $("#scan-box"); if (!box) return;
    box.innerHTML = '<video class="scan" playsinline muted style="margin-top:8px"></video>';
    var video = box.querySelector("video"), det = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(function (stream) {
      scanner = { stream: stream, timer: null };
      video.srcObject = stream; video.play();
      scanner.timer = setInterval(function () {
        det.detect(video).then(function (codes) {
          if (codes && codes.length) { var code = codes[0].rawValue; stopScanner(); offSearch(code); }
        }).catch(function () {});
      }, 350);
    }).catch(function () { box.innerHTML = '<div class="note">Camera not available. Type the barcode number instead.</div>'; });
  }
  function stopScanner() {
    if (!scanner) return;
    clearInterval(scanner.timer);
    scanner.stream.getTracks().forEach(function (t) { t.stop(); });
    scanner = null;
  }
  function pickFood(food) {
    var st = sheetState;
    st.pick = food; st.grams = food.s ? String(food.s[1]) : "100";
    setSheet(foodSheet());
  }
  function amountView(editing) {
    var st = sheetState, f = st.pick, g = numVal(st.grams);
    var h = sheetHead(editing ? "Edit" : f.name);
    if (editing) h += '<div class="small muted" style="margin:-8px 0 12px">' + esc(f.name) + "</div>";
    h += '<div class="preview" id="amt-preview">' + previewCells(f, g) + "</div>";
    h += '<label class="field"><span>Amount</span><div class="input-unit"><input class="input num" inputmode="decimal" id="grams" value="' + esc(st.grams) + '"><b>g</b></div></label>';
    var chips = [];
    if (f.s) [0.5, 1, 1.5, 2].forEach(function (m) { chips.push([(m === 1 ? "" : m + " × ") + f.s[0], f.s[1] * m]); });
    else [50, 100, 150, 200].forEach(function (x) { chips.push([x + " g", x]); });
    h += '<div class="chips" style="margin:-4px 0 16px">' + chips.map(function (c) {
      return '<button class="chip" data-act="grams" data-v="' + Math.round(c[1] * 10) / 10 + '">' + esc(c[0]) + "</button>";
    }).join("") + "</div>";
    if (!editing) {
      h += '<div class="field"><span>Meal</span><div class="seg">' + MEALS.map(function (m) {
        return '<button data-act="meal" data-v="' + m[0] + '" class="' + (st.meal === m[0] ? "on" : "") + '">' + m[1] + "</button>";
      }).join("") + "</div></div>";
      h += '<div class="row"><button class="btn ghost" data-act="unpick">Back</button><button class="btn grow" data-act="add-picked">Add</button></div>';
    } else {
      h += '<div class="row"><button class="btn danger" data-act="del-food">Delete</button><button class="btn grow" data-act="save-edit">Save</button></div>';
    }
    return h;
  }
  function previewCells(f, g) {
    var m = g > 0 ? C.scaleFood(f, g) : { kcal: 0, p: 0, c: 0, f: 0 };
    return '<div class="k"><b class="num">' + fmt(m.kcal) + "</b><span>kcal</span></div><div><b class=\"num\">" + fmt1(m.p) + "</b><span>Protein</span></div><div><b class=\"num\">" + fmt1(m.c) + "</b><span>Carbs</span></div><div><b class=\"num\">" + fmt1(m.f) + "</b><span>Fat</span></div>";
  }
  function addEntry(entry) {
    var d = editDay(V.date);
    entry.id = uid(); d.food.push(entry);
    if (entry.ref) {
      S.recent = [entry.ref].concat(S.recent.filter(function (r) { return r !== entry.ref; })).slice(0, 20);
    }
    save();
  }
  function rememberOnline(f) {
    // Keep packaged foods you've used so they work offline and appear in Search.
    if (f.id.indexOf("off:") !== 0 || findFood(f.id)) return;
    S.customFoods.push({ id: f.id, name: f.name + (f.brand ? " (" + f.brand + ")" : ""), kcal: f.kcal, p: f.p, c: f.c, f: f.f, a: f.a, s: f.s });
  }

  /* ----- Edit food entry ----- */
  function openEditFood(id) {
    var d = getDay(V.date), e = d.food.filter(function (x) { return x.id === id; })[0];
    if (!e) return;
    if (e.per100) {
      sheetState = { kind: "edit-food", id: id, pick: { name: e.name, kcal: e.per100.kcal, p: e.per100.p, c: e.per100.c, f: e.per100.f, a: e.per100.a, s: e.per100.s }, grams: String(e.grams) };
      openSheet(amountView(true));
    } else {
      sheetState = { kind: "edit-quick", id: id };
      openSheet(sheetHead("Edit") + '<div class="small muted" style="margin:-8px 0 12px">' + esc(e.name) + " · quick add</div>" +
        '<div class="grid4">' + [["kcal", "kcal"], ["p", "Protein g"], ["c", "Carbs g"], ["f", "Fat g"]].map(function (k) {
          return '<label class="field"><span class="tiny">' + k[1] + '</span><input class="input num" inputmode="decimal" id="eq-' + k[0] + '" value="' + Math.round(e[k[0]] * 10) / 10 + '"></label>';
        }).join("") + '</div><div class="row"><button class="btn danger" data-act="del-food">Delete</button><button class="btn grow" data-act="save-quick-edit">Save</button></div>');
    }
  }

  /* ----- Workout sheet ----- */
  function openWorkout(id) {
    var d = getDay(V.date), w = id ? d.workouts.filter(function (x) { return x.id === id; })[0] : null;
    sheetState = { kind: "workout", id: id || null, w: w ? JSON.parse(JSON.stringify(w)) : { activity: "strength", minutes: "", distanceKm: "", inclinePct: "", avgHr: "", lifts: [{ name: "", sets: [{ kg: "", reps: "" }] }] } };
    openSheet(workoutSheet());
  }
  function workoutSheet() {
    var st = sheetState, w = st.w, a = C.activityById(w.activity), isStrength = a && a.kind === "strength";
    var h = sheetHead(st.id ? "Edit workout" : "Log workout");
    var groups = [["Cardio", ["walk", "run", "cardio"]], ["Strength", ["strength"]], ["Sport", ["sport"]]];
    h += '<label class="field"><span>Activity</span><select class="input" data-w="activity">' + groups.map(function (g) {
      return '<optgroup label="' + g[0] + '">' + C.ACTIVITIES.filter(function (x) { return g[1].indexOf(x.kind) >= 0; }).map(function (x) {
        return '<option value="' + x.id + '"' + (x.id === w.activity ? " selected" : "") + ">" + esc(x.name) + "</option>";
      }).join("") + "</optgroup>";
    }).join("") + "</select></label>";
    h += '<div class="grid2"><label class="field"><span>Duration</span><div class="input-unit"><input class="input num" inputmode="numeric" data-w="minutes" value="' + esc(w.minutes) + '"><b>min</b></div><em>Active time, not rest in between.</em></label>' +
      (isStrength ? "" : '<label class="field"><span>Avg heart rate <span class="faint">(opt.)</span></span><div class="input-unit"><input class="input num" inputmode="numeric" data-w="avgHr" value="' + esc(w.avgHr) + '"><b>bpm</b></div><em>From a chest strap or watch.</em></label>') + "</div>";
    if (a && (a.kind === "walk" || a.kind === "run")) {
      h += '<div class="grid2"><label class="field"><span>Distance <span class="faint">(opt.)</span></span><div class="input-unit"><input class="input num" inputmode="decimal" data-w="distanceKm" value="' + esc(w.distanceKm) + '"><b>km</b></div></label>' +
        '<label class="field"><span>Incline <span class="faint">(opt.)</span></span><div class="input-unit"><input class="input num" inputmode="decimal" data-w="inclinePct" value="' + esc(w.inclinePct) + '"><b>%</b></div></label></div>';
    }
    h += '<div class="estimate"><div><span>Extra burned (net)</span><br><b class="num" id="est-k">—</b></div><span id="est-m" style="text-align:right;max-width:55%"></span></div>';
    if (isStrength) {
      var names = LIFTS.slice(); Object.keys(allLiftSets()).forEach(function (k) { var n = allLiftSets()[k].name; if (names.indexOf(n) < 0) names.push(n); });
      h += '<datalist id="lift-names">' + names.map(function (n) { return '<option value="' + esc(n) + '">'; }).join("") + "</datalist>";
      (w.lifts || []).forEach(function (l, i) {
        h += '<div class="lift"><div class="row" style="margin-bottom:10px"><input class="input grow" list="lift-names" placeholder="Exercise" data-lift="' + i + '" data-k="name" value="' + esc(l.name) + '"><button class="icon-btn" data-act="del-lift" data-v="' + i + '" aria-label="Remove exercise">✕</button></div>' +
          '<div class="set-row tiny faint" style="margin-bottom:4px"><span class="n">Set</span><span>kg</span><span>Reps</span><span></span></div>';
        l.sets.forEach(function (s, j) {
          h += '<div class="set-row"><span class="n">' + (j + 1) + '</span><input class="input num" inputmode="decimal" data-lift="' + i + '" data-set="' + j + '" data-k="kg" value="' + esc(s.kg) + '">' +
            '<input class="input num" inputmode="numeric" data-lift="' + i + '" data-set="' + j + '" data-k="reps" value="' + esc(s.reps) + '"><button class="icon-btn" data-act="del-set" data-v="' + i + ":" + j + '" aria-label="Remove set">−</button></div>';
        });
        h += '<button class="link" data-act="add-set" data-v="' + i + '">+ Add set</button></div>';
      });
      h += '<button class="btn ghost block" data-act="add-lift" style="margin-bottom:14px">+ Add exercise</button>';
    }
    h += '<div class="row">' + (st.id ? '<button class="btn danger" data-act="del-workout">Delete</button>' : "") + '<button class="btn grow" data-act="save-workout">Save</button></div>';
    return h;
  }
  function updateEstimate() {
    var st = sheetState; if (!st || st.kind !== "workout") return;
    var e = workoutEnergy(cleanWorkout(st.w), V.date);
    var k = $("#est-k"), m = $("#est-m");
    if (k) k.textContent = e.gross > 0 ? "+" + fmt(e.net) + " kcal" : "—";
    if (m) m.textContent = e.gross > 0 ? e.method + " · " + fmt(e.gross) + " gross" : "Enter a duration";
  }
  function cleanWorkout(w) {
    var a = C.activityById(w.activity), out = { activity: w.activity, minutes: numVal(w.minutes) };
    if (a && (a.kind === "walk" || a.kind === "run")) {
      if (numVal(w.distanceKm) > 0) out.distanceKm = numVal(w.distanceKm);
      if (numVal(w.inclinePct)) out.inclinePct = numVal(w.inclinePct);
    }
    if (a && a.kind !== "strength" && numVal(w.avgHr) > 0) out.avgHr = Math.round(numVal(w.avgHr));
    if (a && a.kind === "strength") {
      out.lifts = (w.lifts || []).map(function (l) {
        return { name: (l.name || "").trim(), sets: l.sets.map(function (s) { return { kg: numVal(s.kg) || 0, reps: Math.round(numVal(s.reps)) || 0 }; }).filter(function (s) { return s.reps > 0; }) };
      }).filter(function (l) { return l.name && l.sets.length; });
    }
    return out;
  }

  /* ---------- Events ---------- */
  document.addEventListener("click", function (ev) {
    var el = ev.target.closest("[data-act]");
    if (!el) return;
    var act = el.dataset.act, v = el.dataset.v;
    if (el.type === "checkbox") return; // handled in change
    switch (act) {
      case "tab": V.tab = v; F = null; render(); window.scrollTo(0, 0); break;
      case "day": {
        var nd = C.addDays(V.date, +v);
        if (nd <= todayYmd()) { V.date = nd; render(); }
        break;
      }
      case "f-set":
        F[el.dataset.k] = el.dataset.k === "rate" ? Number(v) : v;
        if (el.dataset.k === "goal") F.rate = v === "gain" ? 0.25 : v === "lose" ? 0.5 : 0;
        rerenderKeepScroll(); break;
      case "f-save-new": if (applyDraft(true)) { V.tab = "today"; render(); window.scrollTo(0, 0); toast("You're set. Log your first meal."); } break;
      case "f-save": if (applyDraft(false)) { render(); toast("Saved"); } break;
      case "water": {
        var d = editDay(V.date); d.water = Math.max(0, (d.water || 0) + Number(v)); save(); render(); break;
      }
      case "steps": {
        var sv = Math.round(numVal($("#steps-in").value));
        if (!(sv >= 0 && sv < 150000)) { toast("Enter a step count"); break; }
        editDay(V.date).steps = sv || null; save(); render(); toast("Steps saved"); break;
      }
      case "add-food": openAddFood(el.dataset.meal); break;
      case "food-mode": stopScanner(); sheetState.mode = v; setSheet(foodSheet()); break;
      case "pick-food": pickFood(findFood(el.dataset.id)); break;
      case "pick-online": pickFood(sheetState.online[+v]); break;
      case "unpick": sheetState.pick = null; setSheet(foodSheet()); break;
      case "grams": {
        sheetState.grams = v; var gi = $("#grams"); if (gi) gi.value = v;
        $("#amt-preview").innerHTML = previewCells(sheetState.pick, numVal(v)); break;
      }
      case "meal": sheetState.meal = v; setSheet(foodSheet()); break;
      case "add-picked": {
        var st = sheetState, g = numVal(st.grams), f = st.pick;
        if (!(g > 0 && g < 5000)) { toast("Enter an amount in grams"); break; }
        var m = C.scaleFood(f, g);
        rememberOnline(f);
        addEntry({ meal: st.meal, name: f.name, grams: g, kcal: m.kcal, p: m.p, c: m.c, f: m.f, a: m.a, ref: f.id,
          per100: { kcal: f.kcal, p: f.p, c: f.c, f: f.f, a: f.a || 0, s: f.s || null } });
        closeSheet(); render(); toast("Added " + fmt(m.kcal) + " kcal"); break;
      }
      case "quick-add": {
        var q = sheetState.quick, p = numVal(q.p) || 0, c = numVal(q.c) || 0, fa = numVal(q.f) || 0;
        var k = numVal(q.kcal); if (!(k > 0)) k = C.kcalFromMacros(p, c, fa);
        if (!(k > 0 && k < 10000)) { toast("Enter calories or macros"); break; }
        addEntry({ meal: sheetState.meal, name: (q.name || "").trim() || "Quick add", grams: null, kcal: k, p: p, c: c, f: fa, a: 0 });
        closeSheet(); render(); toast("Added " + fmt(k) + " kcal"); break;
      }
      case "custom-basis": sheetState.custom.basis = v; setSheet(foodSheet()); break;
      case "custom-save": {
        var cu = sheetState.custom, name = (cu.name || "").trim(), mult = 1;
        if (!name) { toast("Give it a name"); break; }
        if (cu.basis === "serving") { var sg = numVal(cu.serving); if (!(sg > 0)) { toast("Enter the serving size in grams"); break; } mult = 100 / sg; }
        var kc = numVal(cu.kcal);
        if (!(kc >= 0)) { toast("Enter calories"); break; }
        var nf = { id: "c:" + uid(), name: name.slice(0, 60), kcal: kc * mult, p: (numVal(cu.p) || 0) * mult, c: (numVal(cu.c) || 0) * mult, f: (numVal(cu.f) || 0) * mult,
          s: cu.basis === "serving" ? ["1 serving", numVal(cu.serving)] : null };
        S.customFoods.push(nf); save(); pickFood(nf); break;
      }
      case "off-search": offSearch($("#off-q").value); break;
      case "scan": startScanner(); break;
      case "edit-food": openEditFood(el.dataset.id); break;
      case "save-edit": {
        var st2 = sheetState, g2 = numVal(st2.grams);
        if (!(g2 > 0 && g2 < 5000)) { toast("Enter an amount in grams"); break; }
        var e = getDay(V.date).food.filter(function (x) { return x.id === st2.id; })[0];
        var m2 = C.scaleFood(st2.pick, g2);
        e.grams = g2; e.kcal = m2.kcal; e.p = m2.p; e.c = m2.c; e.f = m2.f; e.a = m2.a;
        save(); closeSheet(); render(); break;
      }
      case "save-quick-edit": {
        var e2 = getDay(V.date).food.filter(function (x) { return x.id === sheetState.id; })[0];
        ["kcal", "p", "c", "f"].forEach(function (k2) { var n = numVal($("#eq-" + k2).value); e2[k2] = n >= 0 ? n : 0; });
        save(); closeSheet(); render(); break;
      }
      case "del-food": {
        var dd = editDay(V.date), id = sheetState.id;
        dd.food = dd.food.filter(function (x) { return x.id !== id; });
        save(); closeSheet(); render(); toast("Deleted"); break;
      }
      case "new-workout": openWorkout(null); break;
      case "edit-workout": openWorkout(el.dataset.id); break;
      case "add-set": {
        var L = sheetState.w.lifts[+v], last = L.sets[L.sets.length - 1] || { kg: "", reps: "" };
        L.sets.push({ kg: last.kg, reps: last.reps }); setSheet(workoutSheet()); updateEstimate(); break;
      }
      case "del-set": {
        var ij = v.split(":"), L2 = sheetState.w.lifts[+ij[0]];
        L2.sets.splice(+ij[1], 1); if (!L2.sets.length) L2.sets.push({ kg: "", reps: "" });
        setSheet(workoutSheet()); updateEstimate(); break;
      }
      case "add-lift": sheetState.w.lifts.push({ name: "", sets: [{ kg: "", reps: "" }] }); setSheet(workoutSheet()); updateEstimate(); break;
      case "del-lift": sheetState.w.lifts.splice(+v, 1); setSheet(workoutSheet()); updateEstimate(); break;
      case "save-workout": {
        var cw = cleanWorkout(sheetState.w);
        if (!(cw.minutes > 0 && cw.minutes <= 600)) { toast("Enter a duration in minutes"); break; }
        if (cw.avgHr && !(cw.avgHr >= 40 && cw.avgHr <= 220)) { toast("Heart rate looks off"); break; }
        var dw = editDay(V.date);
        if (sheetState.id) {
          cw.id = sheetState.id;
          dw.workouts = dw.workouts.map(function (x) { return x.id === cw.id ? cw : x; });
        } else { cw.id = uid(); dw.workouts.push(cw); }
        save(); closeSheet(); render(); toast("Workout saved · +" + fmt(workoutEnergy(cw, V.date).net) + " kcal"); break;
      }
      case "del-workout": {
        var dw2 = editDay(V.date), wid = sheetState.id;
        dw2.workouts = dw2.workouts.filter(function (x) { return x.id !== wid; });
        save(); closeSheet(); render(); toast("Deleted"); break;
      }
      case "log-weight": {
        var kg = numVal($("#w-in").value), t = todayYmd();
        if (!(kg >= 30 && kg <= 300)) { toast("Enter your weight in kg"); break; }
        S.weights = S.weights.filter(function (w) { return w.date !== t; }); S.weights.push({ date: t, kg: kg });
        save(); render(); toast("Weight logged"); break;
      }
      case "del-weight":
        if (S.weights.length <= 1) { toast("Keep at least one weigh-in"); break; }
        if (confirm("Delete the weigh-in from " + shortDate(v) + "?")) { S.weights = S.weights.filter(function (w) { return w.date !== v; }); save(); render(); }
        break;
      case "log-measure": {
        var neck = numVal($("#m-neck").value), waist = numVal($("#m-waist").value), hipEl = $("#m-hip"), hip = hipEl ? numVal(hipEl.value) : null;
        if (!(neck >= 20 && neck <= 70) || !(waist >= 40 && waist <= 200) || (hipEl && !(hip >= 50 && hip <= 200))) { toast("Check the measurements (cm)"); break; }
        var td = todayYmd();
        S.measures = S.measures.filter(function (m) { return m.date !== td; });
        S.measures.push({ date: td, neck: neck, waist: waist, hip: hip });
        save(); render(); toast("Measurements saved"); break;
      }
      case "use-bf": S.profile.bodyFat = Number(v); F = null; save(); render(); toast("Resting burn now uses Katch-McArdle"); break;
      case "set-level": S.profile.activity = v; F = null; save(); render(); toast("Activity level updated"); break;
      case "maint": S.settings.maintSource = v; save(); render(); break;
      case "protein": S.profile.proteinPerKg = Number(v); save(); render(); break;
      case "export": {
        var blob = new Blob([JSON.stringify(S, null, 1)], { type: "application/json" });
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "pulse-backup-" + todayYmd() + ".json";
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000); break;
      }
      case "wipe":
        if (confirm("Erase all your Pulse data on this device? This can't be undone.") && confirm("Really erase everything?")) {
          S = blank(); save(); F = null; V = { tab: "today", date: todayYmd() }; render();
        }
        break;
      case "close-sheet": closeSheet(); break;
    }
  });

  function rerenderKeepScroll() {
    var y = window.scrollY; render(); window.scrollTo(0, y);
  }

  document.addEventListener("input", function (ev) {
    var el = ev.target;
    if (el.dataset.f && F) { F[el.dataset.f] = el.value; return; }
    if (!sheetState) return;
    if (el.id === "food-q") { sheetState.q = el.value; $("#food-results").innerHTML = localResults(); return; }
    if (el.id === "grams") { sheetState.grams = el.value; $("#amt-preview").innerHTML = previewCells(sheetState.pick, numVal(el.value)); return; }
    if (el.dataset.q) { sheetState.quick[el.dataset.q] = el.value; var qc = $("#quick-check"); if (qc) qc.textContent = quickCheck(); return; }
    if (el.dataset.c) { sheetState.custom[el.dataset.c] = el.value; return; }
    if (el.dataset.w) {
      if (el.dataset.w === "activity") return; // handled on change
      sheetState.w[el.dataset.w] = el.value;
      updateEstimate(); return;
    }
    if (el.dataset.lift != null) {
      var L = sheetState.w.lifts[+el.dataset.lift];
      if (el.dataset.set != null) L.sets[+el.dataset.set][el.dataset.k] = el.value; else L[el.dataset.k] = el.value;
    }
  });
  document.addEventListener("change", function (ev) {
    var el = ev.target;
    if (el.dataset.act === "complete") { editDay(V.date).incomplete = !el.checked; save(); render(); }
    if (el.dataset.w === "activity" && sheetState) {
      var w = sheetState.w; w.activity = el.value;
      if (C.activityById(el.value).kind === "strength" && !(w.lifts || []).length) w.lifts = [{ name: "", sets: [{ kg: "", reps: "" }] }];
      setSheet(workoutSheet()); updateEstimate();
    }
    if (el.id === "import" && el.files && el.files[0]) {
      var rd = new FileReader();
      rd.onload = function () {
        try {
          var j = JSON.parse(rd.result);
          if (!j || j.v !== 1 || !j.profile || typeof j.days !== "object") throw new Error("bad");
          if (!confirm("Replace everything on this device with this backup?")) return;
          var b = blank(); for (var k in j) b[k] = j[k]; S = b; F = null; save(); render(); toast("Backup restored");
        } catch (e) { toast("That file isn't a Pulse backup"); }
      };
      rd.readAsText(el.files[0]);
      el.value = "";
    }
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") closeSheet();
    if (ev.key === "Enter" && ev.target.id === "off-q") offSearch(ev.target.value);
  });
  // Observe the workout sheet opening to show an initial estimate.
  var mo = new MutationObserver(function () { if (sheetState && sheetState.kind === "workout") updateEstimate(); });
  mo.observe(document.body, { childList: true });

  // Roll over to the new day if the app stays open past midnight.
  var lastToday = todayYmd();
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible") return;
    var t = todayYmd();
    if (t !== lastToday) { if (V.date === lastToday) V.date = t; lastToday = t; render(); }
  });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
  render();
})();
