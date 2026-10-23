/* ====================== Destination guide ======================
   The built-in list the holiday poll picks from. Each destination:
   tags      0–3 how strongly it fits each vibe
   budget    1: under ₹25k · 2: ₹25–50k · 3: ₹50k–1L · 4: over ₹1L
             (per person, about 5–6 days from Bangalore, mid-range, flights included)
   visa      none | free | arrival | evisa | visa   (for Indian passports —
             rules change, always check before booking)
   best/ok   months (1–12) when the weather is best / still fine
   days      sensible trip length [min, max]
   cities    in travel order; nights = default share of the trip
   legs      getting between cities
   Prices, visa rules and timings are rough guides, not quotes. */

var PLAN_VIBES = [
  { id:"beach",     label:"Beaches",            icon:"🏖️" },
  { id:"mountains", label:"Mountains & hills",  icon:"🏔️" },
  { id:"culture",   label:"Culture & history",  icon:"🏛️" },
  { id:"food",      label:"Food",               icon:"🍜" },
  { id:"nightlife", label:"Nightlife & parties", icon:"🎉" },
  { id:"adventure", label:"Adventure sports",   icon:"🪂" },
  { id:"nature",    label:"Nature & wildlife",  icon:"🌿" },
  { id:"city",      label:"Cities & shopping",  icon:"🛍️" },
  { id:"relax",     label:"Chill & unwind",     icon:"🧘" },
  { id:"roadtrip",  label:"Road trip",          icon:"🚗" }
];

var PLAN_BUDGETS = [
  { id:1, label:"Under ₹25k" },
  { id:2, label:"₹25–50k" },
  { id:3, label:"₹50k–1L" },
  { id:4, label:"₹1L+" }
];

var PLAN_LENGTHS = [
  { id:"short", label:"3–4 days", days:4 },
  { id:"mid",   label:"5–6 days", days:6 },
  { id:"long",  label:"7–9 days", days:8 }
];

var VISA_LABEL = {
  none:"No visa needed", free:"Visa-free for Indians", arrival:"Visa on arrival",
  evisa:"e-Visa online", visa:"Visa needed in advance"
};

var CURRENCY_INFO = {
  INR:{ sym:"₹",   name:"Indian rupee",       ref:1 },
  LKR:{ sym:"Rs",  name:"Sri Lankan rupee",   ref:3.4 },
  THB:{ sym:"฿",   name:"Thai baht",          ref:0.37 },
  IDR:{ sym:"Rp",  name:"Indonesian rupiah",  ref:187 },
  VND:{ sym:"₫",   name:"Vietnamese dong",    ref:295 },
  AED:{ sym:"AED", name:"UAE dirham",         ref:0.042 },
  SGD:{ sym:"S$",  name:"Singapore dollar",   ref:0.0147 },
  MYR:{ sym:"RM",  name:"Malaysian ringgit",  ref:0.048 },
  USD:{ sym:"$",   name:"US dollar",          ref:0.0114 },
  NPR:{ sym:"NRs", name:"Nepalese rupee",     ref:1.6 },
  BTN:{ sym:"Nu",  name:"Bhutanese ngultrum", ref:1 },
  MUR:{ sym:"MRs", name:"Mauritian rupee",    ref:0.52 },
  JPY:{ sym:"¥",   name:"Japanese yen",       ref:1.7 },
  GEL:{ sym:"₾",   name:"Georgian lari",      ref:0.031 },
  KZT:{ sym:"₸",   name:"Kazakh tenge",       ref:6 },
  PHP:{ sym:"₱",   name:"Philippine peso",    ref:0.65 },
  SCR:{ sym:"SR",  name:"Seychelles rupee",   ref:0.16 },
  TRY:{ sym:"₺",   name:"Turkish lira",       ref:0.47 },
  HKD:{ sym:"HK$", name:"Hong Kong dollar",   ref:0.089 },
  AZN:{ sym:"₼",   name:"Azerbaijani manat",  ref:0.0194 },
  EUR:{ sym:"€",   name:"Euro",               ref:0.0098 },
  GBP:{ sym:"£",   name:"British pound",      ref:0.0086 },
  CHF:{ sym:"CHF", name:"Swiss franc",        ref:0.0092 },
  AUD:{ sym:"A$",  name:"Australian dollar",  ref:0.0173 },
  NZD:{ sym:"NZ$", name:"New Zealand dollar", ref:0.019 },
  CAD:{ sym:"C$",  name:"Canadian dollar",    ref:0.0158 },
  KRW:{ sym:"₩",   name:"South Korean won",   ref:15.7 },
  CNY:{ sym:"¥",   name:"Chinese yuan",       ref:0.082 },
  TWD:{ sym:"NT$", name:"Taiwan dollar",      ref:0.36 },
  QAR:{ sym:"QR",  name:"Qatari riyal",       ref:0.0415 },
  OMR:{ sym:"OMR", name:"Omani rial",         ref:0.0044 },
  SAR:{ sym:"SAR", name:"Saudi riyal",        ref:0.043 },
  BHD:{ sym:"BD",  name:"Bahraini dinar",     ref:0.0043 },
  KWD:{ sym:"KD",  name:"Kuwaiti dinar",      ref:0.0035 },
  JOD:{ sym:"JD",  name:"Jordanian dinar",    ref:0.0081 },
  EGP:{ sym:"E£",  name:"Egyptian pound",     ref:0.55 },
  MAD:{ sym:"MAD", name:"Moroccan dirham",    ref:0.105 },
  ZAR:{ sym:"R",   name:"South African rand", ref:0.2 },
  KES:{ sym:"KSh", name:"Kenyan shilling",    ref:1.47 },
  TZS:{ sym:"TSh", name:"Tanzanian shilling", ref:29 },
  LAK:{ sym:"₭",   name:"Lao kip",            ref:245 },
  MMK:{ sym:"K",   name:"Myanmar kyat",       ref:24 },
  UZS:{ sym:"soʻm",name:"Uzbek som",          ref:145 },
  RUB:{ sym:"₽",   name:"Russian ruble",      ref:0.93 },
  ISK:{ sym:"kr",  name:"Icelandic krona",    ref:1.55 },
  NOK:{ sym:"kr",  name:"Norwegian krone",    ref:0.115 },
  SEK:{ sym:"kr",  name:"Swedish krona",      ref:0.108 },
  DKK:{ sym:"kr",  name:"Danish krone",       ref:0.073 },
  CZK:{ sym:"Kč",  name:"Czech koruna",       ref:0.26 },
  HUF:{ sym:"Ft",  name:"Hungarian forint",   ref:4.1 },
  PLN:{ sym:"zł",  name:"Polish zloty",       ref:0.042 },
  MXN:{ sym:"MX$", name:"Mexican peso",       ref:0.21 },
  BRL:{ sym:"R$",  name:"Brazilian real",     ref:0.062 }
};

/* Country (or a well-known place) → the currency you'd pay in there.
   Used so changing a trip's country switches its currency automatically. */
var COUNTRY_CURRENCY = {
  "india":"INR", "sri lanka":"LKR", "thailand":"THB", "indonesia":"IDR", "bali":"IDR", "vietnam":"VND",
  "uae":"AED", "united arab emirates":"AED", "dubai":"AED", "abu dhabi":"AED", "singapore":"SGD",
  "malaysia":"MYR", "maldives":"USD", "nepal":"NPR", "bhutan":"BTN", "mauritius":"MUR", "japan":"JPY",
  "georgia":"GEL", "kazakhstan":"KZT", "almaty":"KZT", "philippines":"PHP", "seychelles":"SCR",
  "cambodia":"USD", "turkey":"TRY", "turkiye":"TRY", "türkiye":"TRY", "hong kong":"HKD", "azerbaijan":"AZN",
  "baku":"AZN", "usa":"USD", "us":"USD", "united states":"USD", "america":"USD", "uk":"GBP",
  "united kingdom":"GBP", "england":"GBP", "scotland":"GBP", "london":"GBP", "switzerland":"CHF",
  "australia":"AUD", "new zealand":"NZD", "canada":"CAD", "south korea":"KRW", "korea":"KRW", "seoul":"KRW",
  "china":"CNY", "taiwan":"TWD", "qatar":"QAR", "doha":"QAR", "oman":"OMR", "saudi arabia":"SAR",
  "bahrain":"BHD", "kuwait":"KWD", "jordan":"JOD", "egypt":"EGP", "morocco":"MAD", "south africa":"ZAR",
  "kenya":"KES", "tanzania":"TZS", "zanzibar":"TZS", "laos":"LAK", "myanmar":"MMK", "uzbekistan":"UZS",
  "russia":"RUB", "iceland":"ISK", "norway":"NOK", "sweden":"SEK", "denmark":"DKK", "czechia":"CZK",
  "czech republic":"CZK", "prague":"CZK", "hungary":"HUF", "budapest":"HUF", "poland":"PLN", "mexico":"MXN",
  "brazil":"BRL", "macau":"HKD", "zimbabwe":"USD", "ecuador":"USD", "east timor":"USD",
  // Euro
  "france":"EUR", "paris":"EUR", "germany":"EUR", "italy":"EUR", "spain":"EUR", "portugal":"EUR",
  "netherlands":"EUR", "amsterdam":"EUR", "belgium":"EUR", "austria":"EUR", "greece":"EUR", "ireland":"EUR",
  "finland":"EUR", "croatia":"EUR", "malta":"EUR", "cyprus":"EUR", "slovenia":"EUR", "slovakia":"EUR",
  "estonia":"EUR", "latvia":"EUR", "lithuania":"EUR", "luxembourg":"EUR", "montenegro":"EUR", "europe":"EUR"
};
/** "UAE", "United Arab Emirates" or "Dubai" → "AED"; null if unknown. */
function currencyForCountry(name){
  var k = String(name||"").toLowerCase().replace(/\./g, "").replace(/[^a-zà-ÿ ]/g, " ").replace(/\s+/g, " ").trim();
  if(!k) return null;
  if(COUNTRY_CURRENCY[k]) return COUNTRY_CURRENCY[k];
  if(k.indexOf("the ") === 0 && COUNTRY_CURRENCY[k.slice(4)]) return COUNTRY_CURRENCY[k.slice(4)];
  return null;
}
/** Country names for the pick-list (proper case, no duplicates of the same currency alias). */
var COUNTRY_NAMES = ["India","Sri Lanka","Thailand","Indonesia","Vietnam","UAE","Singapore","Malaysia","Maldives","Nepal",
  "Bhutan","Mauritius","Japan","Georgia","Kazakhstan","Philippines","Seychelles","Cambodia","Turkey","Hong Kong",
  "Azerbaijan","USA","UK","Switzerland","Australia","New Zealand","Canada","South Korea","China","Taiwan","Qatar",
  "Oman","Saudi Arabia","Bahrain","Kuwait","Jordan","Egypt","Morocco","South Africa","Kenya","Tanzania","Laos",
  "Myanmar","Uzbekistan","Russia","Iceland","Norway","Sweden","Denmark","Czechia","Hungary","Poland","Mexico","Brazil",
  "France","Germany","Italy","Spain","Portugal","Netherlands","Belgium","Austria","Greece","Ireland","Finland",
  "Croatia","Malta","Cyprus","Slovenia","Slovakia","Estonia","Latvia","Lithuania","Luxembourg","Montenegro"];

var DESTINATIONS = [
  /* ------------------------------ India ------------------------------ */
  { id:"goa", name:"Goa", country:"India", flag:"🇮🇳", scope:"india", currency:"INR",
    blurb:"Beaches, shacks and nights out — North for the buzz, South for the calm.",
    tags:{ beach:3, nightlife:3, relax:2, food:2, culture:1, adventure:1, roadtrip:1 },
    budget:1, cost:"₹15–30k", travel:"1h15 flight", visa:"none", best:[11,12,1,2], ok:[10,3], days:[3,6],
    arrive:"Fly Bangalore → Goa (Mopa or Dabolim), pick up scooters", depart:"Fly back to Bangalore",
    cities:[
      { name:"North Goa", nights:3, places:["Baga & Calangute beach","Anjuna flea market (Wednesdays)","Vagator beach & Chapora Fort","Thalassa for sunset","Aguada Fort","Saturday night market, Arpora","Club-hopping on Tito's Lane"],
        eat:["prawn curry rice at a beach shack","bebinca and feni","Goan sausage pao"] },
      { name:"South Goa", nights:2, places:["Palolem beach","Butterfly beach boat ride","Cabo de Rama fort","Old Goa churches (Basilica of Bom Jesus)","Fontainhas, Panjim's Latin quarter","Colva & Benaulim beach"],
        eat:["fish thali in Panjim","xacuti at a local tavern"] }
    ],
    legs:[["North → South Goa","~1.5h by road"]] },

  { id:"kerala", name:"Kerala", country:"India", flag:"🇮🇳", scope:"india", currency:"INR",
    blurb:"Tea hills, a night on a houseboat and slow coastal towns.",
    tags:{ nature:3, relax:3, mountains:2, food:2, culture:2, beach:1, roadtrip:2 },
    budget:2, cost:"₹25–40k", travel:"1h flight to Kochi", visa:"none", best:[10,11,12,1,2,3], ok:[9], days:[4,7],
    arrive:"Fly Bangalore → Kochi", depart:"Fly back to Bangalore from Kochi",
    cities:[
      { name:"Kochi", nights:1, places:["Fort Kochi Chinese fishing nets","Mattancherry Palace & Jew Town","Kathakali show","Kashi Art Café","Marine Drive sunset walk"],
        eat:["appam with stew","Kerala fish fry"] },
      { name:"Munnar", nights:2, places:["Tea gardens & Tata Tea Museum","Eravikulam National Park","Mattupetty Dam","Top Station viewpoint","Attukal waterfalls","Spice plantation walk"],
        eat:["puttu and kadala curry","fresh cardamom tea"] },
      { name:"Alleppey", nights:1, places:["Overnight houseboat on the backwaters","Kayak through the canals","Alleppey beach at sunset","Village walk along the canals"],
        eat:["karimeen pollichathu on the houseboat","toddy-shop lunch"] },
      { name:"Varkala", nights:1, places:["Varkala North Cliff","Papanasam beach","Sunset from the cliff cafés"],
        eat:["seafood at a cliff café"] }
    ],
    legs:[["Kochi → Munnar","~4h by road"],["Munnar → Alleppey","~5h by road"],["Alleppey → Varkala","~2.5h by road"]] },

  { id:"rajasthan", name:"Rajasthan", country:"India", flag:"🇮🇳", scope:"india", currency:"INR",
    blurb:"Forts, palaces, desert camps and the best of North Indian food.",
    tags:{ culture:3, food:3, city:2, roadtrip:2, adventure:1, nightlife:1 },
    budget:2, cost:"₹30–50k", travel:"2h30 flight to Jaipur", visa:"none", best:[10,11,12,1,2], ok:[3], days:[5,8],
    arrive:"Fly Bangalore → Jaipur", depart:"Fly back to Bangalore from Udaipur",
    cities:[
      { name:"Jaipur", nights:2, places:["Amber Fort","Hawa Mahal","City Palace & Jantar Mantar","Nahargarh Fort at sunset","Johari & Bapu Bazaar","Patrika Gate"],
        eat:["dal baati churma","pyaaz kachori at Rawat","lassi at Lassiwala"] },
      { name:"Jodhpur", nights:1, places:["Mehrangarh Fort","Jaswant Thada","Blue City lanes walk","Clock Tower market","Toorji ka Jhalra stepwell"],
        eat:["mirchi vada","makhaniya lassi"] },
      { name:"Jaisalmer", nights:1, places:["Jaisalmer Fort","Patwon ki Haveli","Sam sand dunes camel ride","Desert camp night with folk music"],
        eat:["ker sangri","Rajasthani thali at the camp"] },
      { name:"Udaipur", nights:2, places:["City Palace","Boat ride on Lake Pichola","Bagore ki Haveli dance show","Sajjangarh Monsoon Palace sunset","Saheliyon ki Bari","Ambrai Ghat at night"],
        eat:["rooftop dinner facing the lake","dal pakwan"] }
    ],
    legs:[["Jaipur → Jodhpur","~5h by road"],["Jodhpur → Jaisalmer","~5h by road"],["Jaisalmer → Udaipur","overnight bus or ~8h by road"]] },

  { id:"himachal", name:"Manali & Kasol", country:"India", flag:"🇮🇳", scope:"india", currency:"INR",
    blurb:"Snow, cafés, river camps and treks in the Himalayan foothills.",
    tags:{ mountains:3, adventure:3, nature:2, relax:2, nightlife:1, roadtrip:2 },
    budget:2, cost:"₹25–45k", travel:"Fly to Chandigarh (3h) + 8h drive", visa:"none", best:[3,4,5,6,10], ok:[9,11,12,1,2], days:[5,8],
    arrive:"Fly Bangalore → Chandigarh, drive towards the hills", depart:"Drive to Chandigarh and fly back to Bangalore",
    cities:[
      { name:"Manali", nights:3, places:["Solang Valley (paragliding, ropeway)","Hadimba Temple","Old Manali cafés","Atal Tunnel & Sissu","Jogini waterfall trek","Mall Road evening","River rafting in Kullu"],
        eat:["siddu with ghee","trout at an Old Manali café"] },
      { name:"Kasol", nights:2, places:["Parvati riverside walk","Chalal village trek","Manikaran Gurudwara hot springs","Tosh village","Kheerganga trek (overnight, optional)"],
        eat:["Israeli food at a Kasol café","maggi at a riverside shack"] }
    ],
    legs:[["Chandigarh → Manali","~8h by road"],["Manali → Kasol","~3h by road"]] },

  { id:"ladakh", name:"Ladakh", country:"India", flag:"🇮🇳", scope:"india", currency:"INR",
    blurb:"High passes, blue lakes and monasteries — the ultimate bike or SUV trip.",
    tags:{ mountains:3, adventure:3, roadtrip:3, nature:3, culture:2 },
    budget:3, cost:"₹45–70k", travel:"~5h flight via Delhi", visa:"none", best:[6,7,8,9], ok:[5,10], days:[6,9],
    arrive:"Fly Bangalore → Leh (via Delhi). Rest — acclimatise, no exertion today", depart:"Fly back to Bangalore from Leh",
    cities:[
      { name:"Leh", nights:3, places:["Shanti Stupa sunset","Leh Palace","Thiksey & Hemis monasteries","Magnetic Hill & Sangam","Hall of Fame","Leh market"],
        eat:["thukpa and momos","butter tea"] },
      { name:"Nubra Valley", nights:1, places:["Khardung La pass","Diskit Monastery","Hunder sand dunes & Bactrian camels","Turtuk village"],
        eat:["apricot jam and local bread"] },
      { name:"Pangong", nights:1, places:["Chang La pass","Pangong Tso lake at sunrise","Lakeside camps"],
        eat:["hot meals at the camp"] }
    ],
    legs:[["Leh → Nubra","~5h via Khardung La"],["Nubra → Pangong","~6h via Shyok"],["Pangong → Leh","~5h via Chang La"]],
    tip:"Altitude sickness is real: take day 1 fully easy and carry the permit copies." },

  { id:"rishikesh", name:"Rishikesh & Mussoorie", country:"India", flag:"🇮🇳", scope:"india", currency:"INR",
    blurb:"River rafting, cliff cafés and the evening Ganga aarti — then cool hills.",
    tags:{ adventure:3, relax:2, mountains:2, culture:2, nature:2, food:1 },
    budget:2, cost:"₹25–40k", travel:"Fly to Dehradun (~3h via Delhi)", visa:"none", best:[2,3,4,10,11], ok:[9,12,5], days:[4,6],
    arrive:"Fly Bangalore → Dehradun, drive to Rishikesh (1h)", depart:"Fly back to Bangalore from Dehradun",
    cities:[
      { name:"Rishikesh", nights:3, places:["White-water rafting from Shivpuri","Laxman & Ram Jhula","Triveni Ghat Ganga aarti","Beatles Ashram","Bungee jump at Mohan Chatti","Neer Garh waterfall","Café hopping in Tapovan"],
        eat:["chole bhature at Chotiwala","café brunch with a river view"] },
      { name:"Mussoorie", nights:2, places:["Mall Road & Gun Hill","Kempty Falls","Landour & Char Dukan","Lal Tibba sunset","Company Garden"],
        eat:["pancakes at Char Dukan","bun tikki on Mall Road"] }
    ],
    legs:[["Rishikesh → Mussoorie","~2.5h by road"]] },

  { id:"andaman", name:"Andaman Islands", country:"India", flag:"🇮🇳", scope:"india", currency:"INR",
    blurb:"Turquoise water, scuba and white-sand beaches without a passport.",
    tags:{ beach:3, adventure:3, nature:3, relax:3, food:1 },
    budget:3, cost:"₹45–65k", travel:"2h30 flight to Port Blair", visa:"none", best:[11,12,1,2,3,4], ok:[10,5], days:[5,7],
    arrive:"Fly Bangalore → Port Blair", depart:"Fly back to Bangalore from Port Blair",
    cities:[
      { name:"Port Blair", nights:1, places:["Cellular Jail light & sound show","Corbyn's Cove beach","Ross Island"],
        eat:["fresh seafood at Aberdeen Bazaar"] },
      { name:"Havelock (Swaraj Dweep)", nights:3, places:["Radhanagar beach sunset","Scuba dive (no experience needed)","Elephant beach snorkelling","Kalapathar beach","Sea walk"],
        eat:["grilled fish at a beach café"] },
      { name:"Neil (Shaheed Dweep)", nights:1, places:["Natural Bridge at low tide","Laxmanpur beach sunset","Bharatpur beach snorkelling"],
        eat:["coconut-fish curry"] }
    ],
    legs:[["Port Blair → Havelock","~2h by ferry"],["Havelock → Neil","~1h by ferry"],["Neil → Port Blair","~1.5h by ferry"]],
    tip:"Book ferries a few days ahead — they sell out in peak season." },

  { id:"coorg", name:"Coorg & Chikmagalur", country:"India", flag:"🇮🇳", scope:"india", currency:"INR",
    blurb:"A weekend road trip from Bangalore: coffee estates, waterfalls and misty hills.",
    tags:{ roadtrip:3, nature:3, relax:3, mountains:2, food:2 },
    budget:1, cost:"₹10–20k", travel:"5h drive", visa:"none", best:[10,11,12,1,2,3], ok:[7,8,9], days:[3,5],
    arrive:"Drive Bangalore → Coorg (~5h), breakfast stop at Kamat on the highway", depart:"Drive back to Bangalore (~5h)",
    cities:[
      { name:"Coorg", nights:2, places:["Abbey Falls","Raja's Seat sunset","Coffee estate walk","Dubare elephant camp","Namdroling Golden Temple, Bylakuppe","Mandalpatti jeep ride"],
        eat:["pandi curry with akki roti","filter coffee at the estate"] },
      { name:"Chikmagalur", nights:2, places:["Mullayanagiri peak","Baba Budangiri","Hebbe Falls jeep trail","Jhari waterfalls","Coffee Museum"],
        eat:["neer dosa and chicken sukka"] }
    ],
    legs:[["Coorg → Chikmagalur","~4h by road"]] },

  { id:"gokarna", name:"Gokarna & Udupi coast", country:"India", flag:"🇮🇳", scope:"india", currency:"INR",
    blurb:"Quiet beach treks, temple towns and coastal Karnataka seafood.",
    tags:{ beach:3, relax:3, food:2, culture:2, roadtrip:2, nature:2 },
    budget:1, cost:"₹10–20k", travel:"Overnight train or 8h drive", visa:"none", best:[10,11,12,1,2,3], ok:[4], days:[3,5],
    arrive:"Overnight train/bus Bangalore → Gokarna", depart:"Overnight train/bus back to Bangalore",
    cities:[
      { name:"Gokarna", nights:2, places:["Om beach","Beach trek: Kudle → Om → Half Moon → Paradise","Mahabaleshwar Temple","Sunset at Kudle beach","Yana rocks (day trip)"],
        eat:["fish thali at a beach shack","banana pancakes"] },
      { name:"Udupi & Malpe", nights:1, places:["St Mary's Island boat","Malpe beach","Krishna Temple, Udupi","Kaup lighthouse"],
        eat:["Udupi masala dosa","Mangalorean fish curry"] }
    ],
    legs:[["Gokarna → Udupi","~3.5h by road"]] },

  { id:"pondicherry", name:"Pondicherry", country:"India", flag:"🇮🇳", scope:"india", currency:"INR",
    blurb:"French Quarter cafés, Auroville and easy beaches — a short drive away.",
    tags:{ relax:3, food:3, culture:2, beach:2, roadtrip:2, nightlife:1 },
    budget:1, cost:"₹10–20k", travel:"6h drive", visa:"none", best:[10,11,12,1,2,3], ok:[4], days:[3,4],
    arrive:"Drive Bangalore → Pondicherry (~6h)", depart:"Drive back to Bangalore",
    cities:[
      { name:"Pondicherry", nights:3, places:["French Quarter walk (White Town)","Promenade beach at sunrise","Auroville & Matrimandir viewpoint","Paradise beach boat","Serenity beach surfing lesson","Sri Aurobindo Ashram"],
        eat:["croissants at a French bakery","Creole seafood in White Town"] }
    ],
    legs:[] },

  { id:"hampi", name:"Hampi", country:"India", flag:"🇮🇳", scope:"india", currency:"INR",
    blurb:"Boulders, ruins and sunsets — a history lover's road trip.",
    tags:{ culture:3, roadtrip:3, adventure:2, relax:2, nature:1 },
    budget:1, cost:"₹8–15k", travel:"6h drive or overnight train", visa:"none", best:[10,11,12,1,2], ok:[3], days:[2,4],
    arrive:"Drive or overnight train Bangalore → Hampi (Hosapete)", depart:"Head back to Bangalore",
    cities:[
      { name:"Hampi", nights:2, places:["Virupaksha Temple","Vittala Temple & stone chariot","Hemakuta Hill sunset","Coracle ride on the Tungabhadra","Matanga Hill sunrise","Hippie Island cafés","Lotus Mahal & Elephant Stables"],
        eat:["breakfast at Mango Tree","thali on Hippie Island"] }
    ],
    legs:[] },

  { id:"meghalaya", name:"Meghalaya", country:"India", flag:"🇮🇳", scope:"india", currency:"INR",
    blurb:"Living root bridges, crystal rivers and waterfalls in the clouds.",
    tags:{ nature:3, adventure:3, mountains:2, roadtrip:2, culture:1 },
    budget:2, cost:"₹30–50k", travel:"Fly to Guwahati (3h) + 3h drive", visa:"none", best:[10,11,12,1,2,3,4], ok:[6,7,8,9], days:[5,7],
    arrive:"Fly Bangalore → Guwahati, drive to Shillong (~3h)", depart:"Drive to Guwahati and fly back to Bangalore",
    cities:[
      { name:"Shillong", nights:2, places:["Umiam Lake","Ward's Lake & Police Bazaar","Elephant Falls","Laitlum Canyons","Don Bosco Museum"],
        eat:["jadoh and dohneiiong","momos at Police Bazaar"] },
      { name:"Cherrapunji (Sohra)", nights:2, places:["Double-decker living root bridge trek (Nongriat)","Nohkalikai Falls","Seven Sisters Falls","Mawsmai Cave","Arwah Cave"],
        eat:["Khasi pork and rice"] },
      { name:"Dawki & Mawlynnong", nights:1, places:["Umngot river boat ride, Dawki","Mawlynnong, Asia's cleanest village","Single root bridge at Riwai","Shnongpdeng camping"],
        eat:["riverside fish fry"] }
    ],
    legs:[["Shillong → Cherrapunji","~2h by road"],["Cherrapunji → Dawki","~2.5h by road"]] },

  { id:"sikkim", name:"Sikkim & Darjeeling", country:"India", flag:"🇮🇳", scope:"india", currency:"INR",
    blurb:"Kanchenjunga views, monasteries, tea and the toy train.",
    tags:{ mountains:3, nature:3, culture:2, relax:2, roadtrip:2, adventure:1 },
    budget:2, cost:"₹30–50k", travel:"Fly to Bagdogra (3h) + 4h drive", visa:"none", best:[3,4,5,10,11,12], ok:[2], days:[5,8],
    arrive:"Fly Bangalore → Bagdogra, drive to Gangtok (~4.5h)", depart:"Drive to Bagdogra and fly back to Bangalore",
    cities:[
      { name:"Gangtok", nights:3, places:["MG Marg evening walk","Rumtek Monastery","Tsomgo Lake & Baba Mandir (permit)","Nathula Pass (permit)","Ropeway","Enchey Monastery"],
        eat:["thukpa and momos at MG Marg","sel roti"] },
      { name:"Darjeeling", nights:2, places:["Tiger Hill sunrise over Kanchenjunga","Toy train joyride","Happy Valley Tea Estate","Batasia Loop","Peace Pagoda","Glenary's on the Mall"],
        eat:["breakfast at Glenary's","Darjeeling first-flush tea"] }
    ],
    legs:[["Gangtok → Darjeeling","~4h by road"]] },

  { id:"varanasi", name:"Varanasi", country:"India", flag:"🇮🇳", scope:"india", currency:"INR",
    blurb:"Ghats at dawn, the Ganga aarti and the best street food in India.",
    tags:{ culture:3, food:3, city:1, relax:1 },
    budget:2, cost:"₹20–35k", travel:"2h30 flight", visa:"none", best:[10,11,12,1,2,3], ok:[], days:[3,4],
    arrive:"Fly Bangalore → Varanasi", depart:"Fly back to Bangalore",
    cities:[
      { name:"Varanasi", nights:3, places:["Sunrise boat ride along the ghats","Dashashwamedh Ghat Ganga aarti","Kashi Vishwanath corridor","Sarnath","Assi Ghat morning aarti","Old-city lanes walk","Ramnagar Fort"],
        eat:["kachori sabzi breakfast","Blue Lassi","Banarasi paan","tamatar chaat"] }
    ],
    legs:[] },

  { id:"kashmir", name:"Kashmir", country:"India", flag:"🇮🇳", scope:"india", currency:"INR",
    blurb:"Houseboats on Dal Lake, meadows, and snow in Gulmarg.",
    tags:{ mountains:3, nature:3, relax:2, adventure:2, culture:1, food:2 },
    budget:2, cost:"₹35–55k", travel:"~5h flight via Delhi", visa:"none", best:[4,5,6,9,10], ok:[7,8,12,1,2,3], days:[5,7],
    arrive:"Fly Bangalore → Srinagar (via Delhi), check into a Dal Lake houseboat", depart:"Fly back to Bangalore from Srinagar",
    cities:[
      { name:"Srinagar", nights:2, places:["Shikara ride on Dal Lake","Mughal Gardens (Nishat & Shalimar)","Floating vegetable market at dawn","Shankaracharya Temple","Old city & Jama Masjid"],
        eat:["wazwan (rogan josh, gushtaba)","kahwa"] },
      { name:"Gulmarg", nights:2, places:["Gondola to Kongdoori / Apharwat","Skiing or snow play (winter)","Meadow walks (summer)","Strawberry valley"],
        eat:["hot kahwa at the gondola café"] },
      { name:"Pahalgam", nights:1, places:["Betaab Valley","Aru Valley","Baisaran meadow pony ride","Lidder river walk"],
        eat:["trout from the Lidder"] }
    ],
    legs:[["Srinagar → Gulmarg","~2h by road"],["Gulmarg → Pahalgam","~4h by road"]] },

  /* ------------------------------ Abroad ------------------------------ */
  { id:"thailand", name:"Thailand", country:"Thailand", flag:"🇹🇭", scope:"abroad", currency:"THB",
    blurb:"Bangkok's energy, then island-hopping with the best beaches and nightlife.",
    tags:{ beach:3, nightlife:3, food:3, city:2, adventure:2, relax:2, culture:2 },
    budget:3, cost:"₹45–70k", travel:"4h flight", visa:"free", best:[11,12,1,2,3], ok:[4,10], days:[5,8],
    arrive:"Fly Bangalore → Bangkok", depart:"Fly back to Bangalore from Bangkok/Phuket",
    cities:[
      { name:"Bangkok", nights:2, places:["Grand Palace & Wat Pho","Wat Arun at sunset","Chatuchak market (weekends)","Rooftop bar at Sky Bar / Octave","Chinatown (Yaowarat) street food","Khao San Road night","ICONSIAM"],
        eat:["pad thai and mango sticky rice","boat noodles"] },
      { name:"Phuket", nights:2, places:["Patong beach & Bangla Road","Old Phuket Town","Big Buddha viewpoint","Phi Phi islands speedboat day trip","Karon viewpoint"],
        eat:["tom yum at a beach restaurant","fresh seafood at a night market"] },
      { name:"Krabi", nights:2, places:["Railay beach (longtail boat)","4-island tour","Ao Nang night market","Tiger Cave Temple climb","Emerald Pool & hot springs"],
        eat:["massaman curry","roti at Ao Nang"] }
    ],
    legs:[["Bangkok → Phuket","~1h20 flight"],["Phuket → Krabi","~2h by ferry or road"]],
    tip:"Get a local SIM at the airport and use Grab for rides." },

  { id:"bali", name:"Bali", country:"Indonesia", flag:"🇮🇩", scope:"abroad", currency:"IDR",
    blurb:"Rice terraces, temples, cliff beach clubs and surf.",
    tags:{ beach:3, relax:3, nature:3, culture:2, adventure:2, nightlife:2, food:2 },
    budget:3, cost:"₹55–80k", travel:"~5–6h flight", visa:"arrival", best:[4,5,6,7,8,9,10], ok:[11,3], days:[5,8],
    arrive:"Fly Bangalore → Denpasar (Bali)", depart:"Fly back to Bangalore from Denpasar",
    cities:[
      { name:"Ubud", nights:3, places:["Tegallalang rice terraces","Sacred Monkey Forest","Mount Batur sunrise trek","Tirta Empul water temple","Bali swing","Ubud market & palace","Campuhan Ridge walk"],
        eat:["babi guling or nasi campur","smoothie bowls"] },
      { name:"Seminyak & Canggu", nights:2, places:["Tanah Lot sunset","Beach club afternoon","Canggu surf lesson","Echo Beach","Seminyak shopping"],
        eat:["seafood at Jimbaran Bay"] },
      { name:"Uluwatu", nights:1, places:["Uluwatu Temple & Kecak fire dance","Padang Padang beach","Single Fin sunset","Melasti beach"],
        eat:["cliffside dinner"] }
    ],
    legs:[["Ubud → Seminyak","~1.5h by road"],["Seminyak → Uluwatu","~1h by road"]],
    tip:"Day trip option: Nusa Penida (Kelingking beach) by fast boat from Sanur." },

  { id:"vietnam", name:"Vietnam", country:"Vietnam", flag:"🇻🇳", scope:"abroad", currency:"VND",
    blurb:"Ha Long Bay cruises, lantern-lit Hoi An and unbeatable street food on a budget.",
    tags:{ food:3, culture:3, nature:3, city:2, adventure:2, beach:2, nightlife:2 },
    budget:3, cost:"₹50–75k", travel:"~6h (1 stop)", visa:"evisa", best:[2,3,4,9,10], ok:[11,12,1,5], days:[6,9],
    arrive:"Fly Bangalore → Hanoi", depart:"Fly back to Bangalore from Da Nang",
    cities:[
      { name:"Hanoi", nights:2, places:["Hoan Kiem Lake & Old Quarter","Train Street","Temple of Literature","Water puppet show","Beer corner (Ta Hien)","Ho Chi Minh Mausoleum"],
        eat:["pho for breakfast","bun cha","egg coffee"] },
      { name:"Ha Long Bay", nights:1, places:["Overnight bay cruise","Kayaking among the karsts","Sung Sot cave","Ti Top island viewpoint"],
        eat:["seafood dinner on the cruise"] },
      { name:"Da Nang & Hoi An", nights:3, places:["Ba Na Hills & Golden Bridge","My Khe beach","Marble Mountains","Hoi An Ancient Town lanterns at night","Basket-boat ride, Cam Thanh","Tailor shopping in Hoi An"],
        eat:["cao lau and banh mi in Hoi An","mi quang"] }
    ],
    legs:[["Hanoi → Ha Long","~2.5h by road"],["Ha Long → Hanoi → Da Nang","road + 1h20 flight"]] },

  { id:"dubai", name:"Dubai & Abu Dhabi", country:"UAE", flag:"🇦🇪", scope:"abroad", currency:"AED",
    blurb:"Skyscrapers, desert safaris, theme parks and serious shopping.",
    tags:{ city:3, adventure:2, nightlife:2, food:2, beach:1, culture:1 },
    budget:3, cost:"₹70k–1L", travel:"4h flight", visa:"evisa", best:[11,12,1,2,3], ok:[10,4], days:[4,6],
    arrive:"Fly Bangalore → Dubai", depart:"Fly back to Bangalore from Dubai",
    cities:[
      { name:"Dubai", nights:4, places:["Burj Khalifa At the Top","Dubai Mall & fountain show","Desert safari with dune bashing & BBQ","Old Dubai: Al Fahidi, abra ride, Gold & Spice Souk","Dubai Marina dhow cruise","JBR beach & The Beach","Museum of the Future","Global Village (winter)","Skydive or Aquaventure (optional)"],
        eat:["shawarma at Al Mallah","Arabic breakfast in Al Fahidi"] },
      { name:"Abu Dhabi (day trip)", nights:0, places:["Sheikh Zayed Grand Mosque","Ferrari World / Yas Island","Louvre Abu Dhabi"],
        eat:["Emirati lunch"] }
    ],
    legs:[["Dubai → Abu Dhabi","~1.5h by road (day trip)"]] },

  { id:"singapore", name:"Singapore", country:"Singapore", flag:"🇸🇬", scope:"abroad", currency:"SGD",
    blurb:"Spotless, easy and full of things to do — Sentosa, Gardens by the Bay and hawker food.",
    tags:{ city:3, food:3, nightlife:2, nature:1, relax:1, culture:1 },
    budget:4, cost:"₹80k–1.2L", travel:"4h15 flight", visa:"visa", best:[2,3,4,7,8], ok:[1,5,6,9,10,11,12], days:[4,5],
    arrive:"Fly Bangalore → Singapore", depart:"Fly back to Bangalore",
    cities:[
      { name:"Singapore", nights:4, places:["Gardens by the Bay & Supertree light show","Marina Bay Sands SkyPark","Sentosa: Universal Studios","Sentosa beaches & cable car","Night Safari","Chinatown & Little India","Clarke Quay nightlife","Jewel at Changi on the way out"],
        eat:["Lau Pa Sat satay street","chilli crab","Maxwell hawker centre chicken rice"] }
    ],
    legs:[] },

  { id:"malaysia", name:"Kuala Lumpur & Langkawi", country:"Malaysia", flag:"🇲🇾", scope:"abroad", currency:"MYR",
    blurb:"City lights in KL, then duty-free island time in Langkawi.",
    tags:{ city:2, beach:3, food:2, nature:2, relax:2, nightlife:2, adventure:1 },
    budget:3, cost:"₹50–75k", travel:"4h flight", visa:"free", best:[12,1,2,3,4], ok:[11,5], days:[5,7],
    arrive:"Fly Bangalore → Kuala Lumpur", depart:"Fly back to Bangalore from Kuala Lumpur",
    cities:[
      { name:"Kuala Lumpur", nights:3, places:["Petronas Towers & KLCC park","Batu Caves","Bukit Bintang night","Jalan Alor food street","KL Tower sky deck","Genting Highlands (day trip)"],
        eat:["nasi lemak","satay at Jalan Alor"] },
      { name:"Langkawi", nights:3, places:["SkyCab & Sky Bridge","Pantai Cenang beach","Island-hopping tour","Mangrove kayak tour","Seven Wells waterfall","Duty-free shopping"],
        eat:["seafood by the beach"] }
    ],
    legs:[["KL → Langkawi","~1h flight"]] },

  { id:"maldives", name:"Maldives", country:"Maldives", flag:"🇲🇻", scope:"abroad", currency:"USD",
    blurb:"Overwater villas or budget guesthouses — the bluest water you'll ever see.",
    tags:{ beach:3, relax:3, adventure:2, nature:2 },
    budget:4, cost:"₹90k–1.8L", travel:"1h30 flight", visa:"arrival", best:[11,12,1,2,3,4], ok:[10,5], days:[3,5],
    arrive:"Fly Bangalore → Malé, speedboat to the island", depart:"Speedboat to Malé and fly back to Bangalore",
    cities:[
      { name:"Maafushi or resort island", nights:4, places:["Snorkelling trip with turtles","Sandbank picnic","Dolphin-watching sunset cruise","Scuba dive","Jet ski or parasailing","Bioluminescent beach at night (luck!)"],
        eat:["mas huni breakfast","beach BBQ dinner"] }
    ],
    legs:[],
    tip:"Local-island guesthouses (Maafushi, Thulusdhoo) are a fraction of resort prices; note: no alcohol on local islands." },

  { id:"srilanka", name:"Sri Lanka", country:"Sri Lanka", flag:"🇱🇰", scope:"abroad", currency:"LKR",
    blurb:"Tea country trains, safaris and south-coast beaches — close and easy.",
    tags:{ nature:3, beach:3, culture:2, roadtrip:3, food:2, adventure:2, relax:2 },
    budget:3, cost:"₹45–70k", travel:"1h20 flight", visa:"free", best:[12,1,2,3], ok:[4,7,8,9,11], days:[6,8],
    arrive:"Fly Bangalore → Colombo, pick up the rental car", depart:"Fly back to Bangalore from Colombo",
    cities:[
      { name:"Kandy", nights:1, places:["Temple of the Tooth","Kandy Lake walk","Peradeniya Botanical Gardens","Cultural dance show"],
        eat:["rice and curry lunch","kottu roti"] },
      { name:"Nuwara Eliya", nights:1, places:["Tea factory tour","Gregory Lake","Lover's Leap waterfall","Horton Plains (World's End)"],
        eat:["fresh strawberries and tea"] },
      { name:"Ella", nights:2, places:["Kandy → Ella scenic train","Nine Arch Bridge","Little Adam's Peak","Ravana Falls","Ella Rock hike"],
        eat:["hoppers at a local café"] },
      { name:"Mirissa & Galle", nights:2, places:["Whale watching, Mirissa","Coconut Tree Hill","Secret beach","Galle Fort walk at sunset","Unawatuna beach"],
        eat:["seafood dinner on Mirissa beach"] }
    ],
    legs:[["Colombo → Kandy","~3.5h by road"],["Kandy → Nuwara Eliya","~3h by road"],["Nuwara Eliya → Ella","~2.5h by road or train"],["Ella → Mirissa","~4h by road"]] },

  { id:"nepal", name:"Nepal", country:"Nepal", flag:"🇳🇵", scope:"abroad", currency:"NPR",
    blurb:"Kathmandu's temples, Pokhara's lakeside and paragliding with Himalayan views. No passport needed.",
    tags:{ mountains:3, adventure:3, culture:3, nature:2, relax:2 },
    budget:2, cost:"₹35–55k", travel:"~4h (via Delhi)", visa:"none", best:[10,11,3,4], ok:[12,2,5], days:[5,8],
    arrive:"Fly Bangalore → Kathmandu", depart:"Fly back to Bangalore from Kathmandu",
    cities:[
      { name:"Kathmandu", nights:2, places:["Swayambhunath (Monkey Temple)","Boudhanath Stupa","Pashupatinath","Kathmandu Durbar Square","Thamel evenings","Bhaktapur (half day)"],
        eat:["momos and thakali set","juju dhau in Bhaktapur"] },
      { name:"Pokhara", nights:3, places:["Paragliding from Sarangkot","Phewa Lake boating","Sarangkot sunrise","World Peace Pagoda","Davis Falls & Gupteshwor cave","Lakeside cafés","Short trek to Australian Camp"],
        eat:["dal bhat at a lakeside café"] }
    ],
    legs:[["Kathmandu → Pokhara","~25 min flight or ~7h by road"]] },

  { id:"bhutan", name:"Bhutan", country:"Bhutan", flag:"🇧🇹", scope:"abroad", currency:"BTN",
    blurb:"Tiger's Nest, dzongs and clean mountain air — calm and unlike anywhere else.",
    tags:{ mountains:3, culture:3, nature:3, relax:2, adventure:1 },
    budget:3, cost:"₹55–85k", travel:"Fly to Paro via Delhi/Kolkata, or Bagdogra + drive", visa:"none", best:[3,4,5,9,10,11], ok:[12,2], days:[5,7],
    arrive:"Fly Bangalore → Paro (via Delhi/Kolkata), drive to Thimphu", depart:"Fly back to Bangalore from Paro",
    cities:[
      { name:"Thimphu", nights:2, places:["Buddha Dordenma","Tashichho Dzong","Memorial Chorten","Weekend market","Motithang takin preserve"],
        eat:["ema datshi with red rice"] },
      { name:"Punakha", nights:1, places:["Dochula Pass 108 chortens","Punakha Dzong","Suspension bridge","Chimi Lhakhang"],
        eat:["kewa datshi"] },
      { name:"Paro", nights:2, places:["Tiger's Nest hike (Taktsang)","Rinpung Dzong","Paro town","Chele La pass","Hot stone bath"],
        eat:["farmhouse dinner"] }
    ],
    legs:[["Thimphu → Punakha","~3h by road"],["Punakha → Paro","~4h by road"]],
    tip:"Indians pay a daily Sustainable Development Fee (about ₹1,200 per night) and need a passport or voter ID." },

  { id:"mauritius", name:"Mauritius", country:"Mauritius", flag:"🇲🇺", scope:"abroad", currency:"MUR",
    blurb:"Lagoons, waterfalls and catamaran days — a classic island escape.",
    tags:{ beach:3, relax:3, nature:2, adventure:2, food:1 },
    budget:4, cost:"₹1–1.4L", travel:"~7h (1 stop)", visa:"free", best:[5,6,7,8,9,10,11,12], ok:[4], days:[5,7],
    arrive:"Fly Bangalore → Mauritius", depart:"Fly back to Bangalore",
    cities:[
      { name:"North (Grand Baie)", nights:3, places:["Catamaran to Île Gabriel","Grand Baie nightlife","Pamplemousses Botanical Garden","Undersea walk","Pereybere beach"],
        eat:["dholl puri street food"] },
      { name:"South-west (Le Morne)", nights:3, places:["Chamarel Seven Coloured Earth","Le Morne beach & underwater waterfall view","Île aux Cerfs","Black River Gorges","Ganga Talao (Grand Bassin)"],
        eat:["Creole seafood curry"] }
    ],
    legs:[["North → South-west","~1.5h by road"]] },

  { id:"japan", name:"Japan", country:"Japan", flag:"🇯🇵", scope:"abroad", currency:"JPY",
    blurb:"Neon Tokyo, ancient Kyoto and bullet trains — a bucket-list trip.",
    tags:{ city:3, culture:3, food:3, nature:2, nightlife:2 },
    budget:4, cost:"₹1.5–2.2L", travel:"~11h (1 stop)", visa:"evisa", best:[3,4,10,11], ok:[5,12], days:[7,10],
    arrive:"Fly Bangalore → Tokyo", depart:"Fly back to Bangalore from Osaka",
    cities:[
      { name:"Tokyo", nights:4, places:["Shibuya crossing & Shibuya Sky","Senso-ji, Asakusa","Shinjuku & Golden Gai at night","teamLab Planets","Harajuku & Meiji Shrine","Akihabara","Mt Fuji day trip (Kawaguchiko)"],
        eat:["sushi at Tsukiji outer market","ramen in Shinjuku"] },
      { name:"Kyoto", nights:2, places:["Fushimi Inari gates (early)","Arashiyama bamboo grove","Kinkaku-ji","Gion at dusk","Kiyomizu-dera"],
        eat:["matcha everything","kaiseki or tofu lunch"] },
      { name:"Osaka", nights:2, places:["Dotonbori at night","Osaka Castle","Universal Studios Japan","Nara deer park (day trip)"],
        eat:["takoyaki and okonomiyaki"] }
    ],
    legs:[["Tokyo → Kyoto","~2h15 by shinkansen"],["Kyoto → Osaka","~30 min by train"]] },

  { id:"georgia", name:"Georgia", country:"Georgia", flag:"🇬🇪", scope:"abroad", currency:"GEL",
    blurb:"Caucasus mountains, old Tbilisi, wine country — Europe-like without the Schengen wait.",
    tags:{ mountains:3, culture:2, food:3, roadtrip:3, nature:2, nightlife:2, adventure:2 },
    budget:4, cost:"₹1–1.4L", travel:"~9h (1 stop)", visa:"evisa", best:[5,6,9,10], ok:[4,7,8,12,1,2], days:[6,8],
    arrive:"Fly Bangalore → Tbilisi", depart:"Fly back to Bangalore from Tbilisi",
    cities:[
      { name:"Tbilisi", nights:3, places:["Old Town & sulphur baths","Narikala Fortress cable car","Bridge of Peace","Fabrika & bar street","Mtskheta day trip","Dry Bridge flea market"],
        eat:["khachapuri and khinkali","Georgian wine tasting"] },
      { name:"Kazbegi", nights:2, places:["Georgian Military Road & Ananuri","Gudauri paragliding","Gergeti Trinity Church hike","Juta valley"],
        eat:["mountain lodge dinner"] },
      { name:"Kakheti (wine region)", nights:1, places:["Sighnaghi town","Winery & qvevri tasting","Bodbe Monastery"],
        eat:["mtsvadi BBQ with wine"] }
    ],
    legs:[["Tbilisi → Kazbegi","~3h by road"],["Kazbegi → Kakheti","~4h by road"]] },

  { id:"kazakhstan", name:"Almaty", country:"Kazakhstan", flag:"🇰🇿", scope:"abroad", currency:"KZT",
    blurb:"Snowy peaks, alpine lakes and canyons — visa-free and under the radar.",
    tags:{ mountains:3, nature:3, adventure:3, city:1, roadtrip:2, food:1 },
    budget:3, cost:"₹70k–1L", travel:"~6h (via Delhi)", visa:"free", best:[5,6,7,8,9], ok:[12,1,2,10], days:[5,7],
    arrive:"Fly Bangalore → Almaty (via Delhi)", depart:"Fly back to Bangalore from Almaty",
    cities:[
      { name:"Almaty", nights:5, places:["Medeu & Shymbulak cable car","Big Almaty Lake","Kok Tobe hill at sunset","Charyn Canyon day trip","Kolsai & Kaindy lakes (overnight trip)","Green Bazaar","Panfilov Park & Zenkov Cathedral"],
        eat:["beshbarmak and plov","baursak with tea"] }
    ],
    legs:[] },

  { id:"philippines", name:"Palawan", country:"Philippines", flag:"🇵🇭", scope:"abroad", currency:"PHP",
    blurb:"Limestone lagoons and island-hopping in El Nido and Coron.",
    tags:{ beach:3, nature:3, adventure:3, relax:2 },
    budget:3, cost:"₹80k–1.1L", travel:"~8h (1 stop)", visa:"free", best:[12,1,2,3,4,5], ok:[11], days:[6,8],
    arrive:"Fly Bangalore → Manila → Puerto Princesa", depart:"Fly back to Bangalore via Manila",
    cities:[
      { name:"El Nido", nights:3, places:["Island-hopping Tour A (lagoons)","Tour C (hidden beaches)","Nacpan beach","Las Cabanas zipline at sunset","Taraw cliff viewpoint"],
        eat:["fresh grilled seafood","halo-halo"] },
      { name:"Coron", nights:3, places:["Kayangan Lake","Twin Lagoon","Wreck snorkelling/diving","Maquinit hot spring","Mt Tapyas sunset"],
        eat:["sisig and calamansi juice"] }
    ],
    legs:[["Puerto Princesa → El Nido","~5h by van"],["El Nido → Coron","~4h by ferry"]] },

  { id:"seychelles", name:"Seychelles", country:"Seychelles", flag:"🇸🇨", scope:"abroad", currency:"SCR",
    blurb:"Granite-boulder beaches and giant tortoises — pure island luxury.",
    tags:{ beach:3, relax:3, nature:3, adventure:1 },
    budget:4, cost:"₹1.2–1.8L", travel:"~7h (1 stop)", visa:"free", best:[4,5,10,11], ok:[6,7,8,9,12,1,2,3], days:[5,7],
    arrive:"Fly Bangalore → Mahé", depart:"Fly back to Bangalore from Mahé",
    cities:[
      { name:"Mahé", nights:2, places:["Beau Vallon beach","Victoria market","Morne Seychellois trail","Anse Intendance"],
        eat:["Creole fish curry"] },
      { name:"Praslin & La Digue", nights:3, places:["Anse Source d'Argent, La Digue (by bike)","Vallée de Mai coco-de-mer forest","Anse Lazio","Curieuse Island giant tortoises"],
        eat:["grilled fish at a beach café"] }
    ],
    legs:[["Mahé → Praslin","~1h by ferry"]] },

  { id:"cambodia", name:"Siem Reap & Phnom Penh", country:"Cambodia", flag:"🇰🇭", scope:"abroad", currency:"USD",
    blurb:"Angkor Wat at sunrise, temples in the jungle and lively Pub Street.",
    tags:{ culture:3, food:2, nightlife:2, nature:1, adventure:1 },
    budget:3, cost:"₹50–75k", travel:"~7h (via Bangkok)", visa:"evisa", best:[11,12,1,2,3], ok:[10,4], days:[4,6],
    arrive:"Fly Bangalore → Siem Reap (via Bangkok)", depart:"Fly back to Bangalore from Phnom Penh",
    cities:[
      { name:"Siem Reap", nights:3, places:["Angkor Wat sunrise","Bayon & Angkor Thom","Ta Prohm (jungle temple)","Pub Street at night","Phare circus","Tonle Sap floating village"],
        eat:["fish amok","Khmer BBQ"] },
      { name:"Phnom Penh", nights:1, places:["Royal Palace","Tuol Sleng & Killing Fields","Riverside sunset cruise","Central Market"],
        eat:["lok lak"] }
    ],
    legs:[["Siem Reap → Phnom Penh","~45 min flight or ~6h by bus"]] },

  { id:"turkey", name:"Istanbul & Cappadocia", country:"Turkey", flag:"🇹🇷", scope:"abroad", currency:"TRY",
    blurb:"Hot-air balloons at sunrise and a city where two continents meet.",
    tags:{ culture:3, food:3, city:3, adventure:2, nature:2, nightlife:2 },
    budget:4, cost:"₹1.1–1.5L", travel:"~9h (1 stop)", visa:"visa", best:[4,5,6,9,10], ok:[3,7,8,11], days:[6,8],
    arrive:"Fly Bangalore → Istanbul", depart:"Fly back to Bangalore from Istanbul",
    cities:[
      { name:"Istanbul", nights:3, places:["Hagia Sophia & Blue Mosque","Topkapi Palace","Grand Bazaar & Spice Bazaar","Bosphorus cruise","Galata Tower & Istiklal Street","Basilica Cistern"],
        eat:["simit and Turkish breakfast","kebab and baklava"] },
      { name:"Cappadocia", nights:2, places:["Sunrise hot-air balloon","Göreme Open-Air Museum","Red Valley sunset hike","Underground city of Derinkuyu","ATV ride"],
        eat:["testi kebab (pottery kebab)"] }
    ],
    legs:[["Istanbul → Cappadocia","~1h20 flight"]],
    tip:"Indians usually need a sticker visa; an e-Visa is possible if you hold a valid US/UK/Schengen visa." },

  { id:"hongkong", name:"Hong Kong", country:"Hong Kong", flag:"🇭🇰", scope:"abroad", currency:"HKD",
    blurb:"Skyline views, Disneyland, dim sum and buzzing night markets.",
    tags:{ city:3, food:3, nightlife:2, nature:1, culture:1 },
    budget:3, cost:"₹80k–1.1L", travel:"~5h flight", visa:"free", best:[10,11,12], ok:[1,2,3,4], days:[4,5],
    arrive:"Fly Bangalore → Hong Kong (pre-arrival registration online)", depart:"Fly back to Bangalore",
    cities:[
      { name:"Hong Kong", nights:4, places:["Victoria Peak tram","Star Ferry & Symphony of Lights","Disneyland","Lantau Big Buddha & cable car","Temple Street night market","Lan Kwai Fong nightlife","Dragon's Back hike"],
        eat:["dim sum at Tim Ho Wan","egg tarts and milk tea"] }
    ],
    legs:[] },

  { id:"azerbaijan", name:"Baku", country:"Azerbaijan", flag:"🇦🇿", scope:"abroad", currency:"AZN",
    blurb:"Flame Towers, an old walled city and mud volcanoes — easy e-visa and good value.",
    tags:{ city:2, culture:2, food:2, nature:1, nightlife:2, roadtrip:1 },
    budget:3, cost:"₹75k–1L", travel:"~7h (via Delhi)", visa:"evisa", best:[4,5,6,9,10], ok:[3,7,8,11], days:[4,6],
    arrive:"Fly Bangalore → Baku", depart:"Fly back to Bangalore from Baku",
    cities:[
      { name:"Baku", nights:3, places:["Old City (Icherisheher) & Maiden Tower","Flame Towers at night","Baku Boulevard","Heydar Aliyev Centre","Gobustan rock art & mud volcanoes","Yanar Dag (burning mountain)"],
        eat:["plov and dushbara","Azerbaijani tea with jam"] },
      { name:"Gabala", nights:1, places:["Tufandag cable car","Nohur lake","Seven Beauties waterfall"],
        eat:["kebab lunch in the hills"] }
    ],
    legs:[["Baku → Gabala","~3.5h by road"]] }
];
