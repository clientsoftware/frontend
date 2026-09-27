/**
 * Urdu Auto Transliteration & Translation Engine
 * Works offline using built-in dictionary & phonetic rules, with online translation fallback.
 */

export const URDU_DICTIONARY = {
  sugar: "چینی", chini: "چینی", rice: "چاول", chawal: "چاول", oil: "تیل", tel: "تیل",
  "cooking oil": "کوکنگ آئل", ghee: "گھی", milk: "دودھ", doodh: "دودھ", flour: "آٹا", atta: "آٹا",
  wheat: "گندم", salt: "نمک", namak: "نمک", tea: "چائے", chai: "چائے", coffee: "کافی",
  sugarcane: "گنا", egg: "انڈا", eggs: "انڈے", anda: "انڈا", bread: "بریڈ", biscuit: "بسکٹ",
  biscuits: "بسکٹ", soap: "صابن", sabun: "صابن", shampoo: "شیمپو", detergent: "ڈٹرجنٹ",
  surf: "سرف", washing: "واشنگ", powder: "پاؤڈر", match: "ماچس", matches: "ماچس",
  candle: "موم بتی", cigarette: "سگریٹ", cigarettes: "سگریٹ", chocolate: "چاکلیٹ",
  juice: "جوس", water: "پانی", pani: "پانی", "cold drink": "کولڈ ڈرنک", icecream: "آئس کریم",
  "ice cream": "آئس کریم", pulses: "دالیں", daal: "دال", lentils: "دال", butter: "مکھن",
  makhan: "مکھن", yogurt: "دہی", dahi: "دہی", cheese: "پنیر", paneer: "پنیر", onion: "پیاز",
  pyaz: "پیاز", potato: "آلو", aloo: "آلو", tomato: "ٹماٹر", garlic: "لہسن", ginger: "ادرک",
  chili: "مرچ", chilli: "مرچ", mirch: "مرچ", spice: "مصالحہ", spices: "مصالحہ جات",
  masala: "مصالحہ", honey: "شہد", shahad: "شہد", vinegar: "سرکہ", sirka: "سرکہ",
  jam: "جیم", pickle: "اچار", achar: "اچار", ketchup: "کیچپ", sauce: "ساس",
  noodles: "نوڈلز", pasta: "پاستا", cereal: "سیریل", "baby food": "بےبی فوڈ",
  diaper: "ڈائپر", diapers: "ڈائپر", tissue: "ٹشو", "tissue paper": "ٹشو پیپر",
  toothpaste: "ٹوتھ پیسٹ", toothbrush: "ٹوتھ برش", perfume: "پرفیوم", "hair oil": "ہیئر آئل",
  battery: "بیٹری", batteries: "بیٹری", bulb: "بلب", wire: "تار", cable: "کیبل",
  bag: "بیگ", bottle: "بوتل", cup: "کپ", plate: "پلیٹ", glass: "گلاس",
  notebook: "نوٹ بک", copy: "کاپی", pen: "قلم", pencil: "پنسل", eraser: "ریبڑ",
  cloth: "کپڑا", shirt: "قمیض", cement: "سیمنٹ", paint: "پینٹ", nail: "کیل", nails: "کیل",
  phone: "فون", mobile: "موبائل", charger: "چارجر", cable_wire: "کیبل",

  // Electric & Hardware shop items
  switch: "سوئچ", switches: "سوئچ", socket: "ساکٹ", sockets: "ساکٹ", plug: "پلگ", plugs: "پلگ",
  "tube light": "ٹیوب لائٹ", tube: "ٹیوب", light: "لائٹ", lights: "لائٹس", fan: "پنکھا", fans: "پنکھا",
  "ceiling fan": "چھت کا پنکھا", "exhaust fan": "ایگزاسٹ پنکھا", "extension cord": "ایکسٹینشن کورڈ",
  "extension board": "ایکسٹینشن بورڈ", extension: "ایکسٹینشن", cord: "کورڈ", mcb: "ایم سی بی",
  fuse: "فیوز", fuses: "فیوز", holder: "ہولڈر", board: "بورڈ", meter: "میٹر", adapter: "اڈاپٹر",
  led: "ایل ای ڈی", "electrical tape": "بجلی کی ٹیپ", tape: "ٹیپ", connector: "کنیکٹر",
  "junction box": "جنکشن باکس", junction: "جنکشن", box: "باکس", regulator: "ریگولیٹر",
  stabilizer: "اسٹیبلائزر", inverter: "انورٹر", panel: "پینل", wiring: "وائرنگ",
  "earth wire": "ارتھ تار", "three pin": "تھری پن", "two pin": "ٹو پن", three: "تھری", two: "ٹو",
  pin: "پن", "multi plug": "ملٹی پلگ", multi: "ملٹی", torch: "ٹارچ", heater: "ہیٹر", iron: "استری",
  motor: "موٹر", transformer: "ٹرانسفارمر", capacitor: "کیپیسیٹر", resistor: "ریزسٹر",
  tester: "ٹیسٹر", "drill machine": "ڈرل مشین", machine: "مشین", generator: "جنریٹر",
  screw: "پیچ", screws: "پیچ", nut: "نٹ", nuts: "نٹ", bolt: "بولٹ", bolts: "بولٹ",
  hammer: "ہتھوڑا", screwdriver: "پیچ کش", pliers: "پلاس", wrench: "رنچ", spanner: "پانا",
  saw: "آری", drill: "ڈرل", "measuring tape": "فیتہ", measuring: "ناپنے کا",
  brush: "برش", lock: "تالا", locks: "تالا", hinge: "قبضہ", hinges: "قبضہ",
  "door handle": "دروازے کا ہینڈل", door: "دروازہ", handle: "ہینڈل", chain: "زنجیر",
  rope: "رسی", pipe: "پائپ", pipes: "پائپ", "pipe fitting": "پائپ فٹنگ", fitting: "فٹنگ",
  elbow: "ایلبو", valve: "والو", tap: "نل", taps: "نل", washer: "واشر", washers: "واشر",
  glue: "گوند", sandpaper: "ریگمار", chisel: "چھینی", ladder: "سیڑھی", grill: "گرل",
  gate: "گیٹ", rod: "راڈ", rods: "راڈ", angle: "اینگل", sheet: "شیٹ", glass: "شیشہ",
  cutter: "کٹر", blade: "بلیڈ", blades: "بلیڈ", funnel: "فنل", bucket: "بالٹی",
  sand: "ریت", bricks: "اینٹیں", brick: "اینٹ", tiles: "ٹائلز", tile: "ٹائل",
  primer: "پرائمر", thinner: "تھنر", varnish: "وارنش", putty: "پوٹی",
};

export function phoneticUrduWord(w) {
  const rules = [
    ["kh", "کھ"], ["gh", "گھ"], ["ph", "ف"], ["th", "تھ"], ["sh", "ش"], ["ch", "چ"],
    ["ck", "ک"], ["qu", "کو"], ["ng", "نگ"], ["aa", "آ"], ["ee", "ی"], ["oo", "و"],
    ["ou", "او"], ["ai", "ے"], ["ay", "ے"], ["ie", "ی"], ["ea", "ی"], ["oa", "او"],
  ];
  let out = "", i = 0;
  const lower = w.toLowerCase();
  const single = {
    a: "ا", b: "ب", c: "ک", d: "ڈ", e: "ے", f: "ف", g: "گ", h: "ہ", i: "ی", j: "ج",
    k: "ک", l: "ل", m: "م", n: "ن", o: "او", p: "پ", q: "ق", r: "ر", s: "س", t: "ٹ",
    u: "او", v: "و", w: "و", x: "کس", y: "ی", z: "ز",
  };
  while (i < lower.length) {
    const ch2 = lower.slice(i, i + 2);
    const rule = rules.find((r) => r[0] === ch2);
    if (rule) { out += rule[1]; i += 2; continue; }
    const ch = lower[i];
    out += single[ch] !== undefined ? single[ch] : ch;
    i += 1;
  }
  return out;
}

export function transliterateToUrdu(text) {
  if (!text || !text.trim()) return "";
  const full = text.trim().toLowerCase();
  if (URDU_DICTIONARY[full]) return URDU_DICTIONARY[full];
  return text.trim().split(/\s+/).map((word) => {
    const clean = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
    if (!clean) return word;
    if (URDU_DICTIONARY[clean]) return URDU_DICTIONARY[clean];
    return phoneticUrduWord(word.replace(/[^a-zA-Z]/g, ""));
  }).join(" ");
}

export async function translateToUrduOnline(text) {
  if (!text || !text.trim()) return "";
  try {
    const res = await fetch("https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ur&dt=t&q=" + encodeURIComponent(text.trim()));
    if (!res.ok) throw new Error("bad response");
    const data = await res.json();
    const out = (data && data[0] || []).map((chunk) => chunk[0]).join("").trim();
    return out || transliterateToUrdu(text);
  } catch (e) {
    return transliterateToUrdu(text);
  }
}
