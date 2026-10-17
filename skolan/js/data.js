// =========================================================
// Valvskolan — all site content in one place.
// Everything here is fictional: the school, people, menus and events.
// =========================================================

// ---------- Photos (Unsplash, free licence) ----------
export const photo = (id, w = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;

// ---------- Year groups are drawn as metro lines ----------
export const LINES = {
  low: { id: "low", name: "Green line", stage: "Years F–3", short: "F–3" },
  mid: { id: "mid", name: "Red line", stage: "Years 4–6", short: "4–6" },
  high: { id: "high", name: "Blue line", stage: "Years 7–9", short: "7–9" },
};

export const lineFor = (year) => (year === "F" || Number(year) <= 3 ? "low" : Number(year) <= 6 ? "mid" : "high");

// Classes: F (förskoleklass, the reception year) and years 1–9, two classes each
export const CLASSES = ["F", 1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((y) =>
  ["A", "B"].map((letter) => ({ id: `${y}${letter}`, year: String(y), line: lineFor(String(y)) }))
);
export const DEFAULT_CLASS = "5B";

// ---------- Subjects ----------
export const SUBJECTS = {
  swe: { name: "Swedish", short: "SV" },
  maths: { name: "Maths", short: "MA" },
  eng: { name: "English", short: "EN" },
  sci: { name: "Science", short: "NO" },
  bio: { name: "Biology", short: "BI" },
  phy: { name: "Physics", short: "FY" },
  chem: { name: "Chemistry", short: "KE" },
  soc: { name: "Social studies", short: "SO" },
  hist: { name: "History", short: "HI" },
  geo: { name: "Geography", short: "GE" },
  pe: { name: "Sport & health", short: "IDH" },
  art: { name: "Art", short: "BL" },
  music: { name: "Music", short: "MU" },
  craft: { name: "Woodwork & textiles", short: "SL" },
  home: { name: "Home economics", short: "HKK" },
  tech: { name: "Technology", short: "TK" },
  lang: { name: "Spanish / German / French", short: "M2" },
  play: { name: "Play & outdoor learning", short: "UTE" },
  mentor: { name: "Mentor time", short: "MEN" },
  read: { name: "Reading hour", short: "LÄS" },
};

// ---------- Bell times per stage ----------
// Each row: [start, end]. "lunch" is placed where the stage eats.
const BELLS = {
  low: [["08:15", "09:00"], ["09:10", "10:00"], ["10:20", "11:05"], "lunch:11:05-11:45", ["12:00", "12:45"], ["12:55", "13:40"]],
  mid: [["08:15", "09:15"], ["09:30", "10:30"], ["10:40", "11:40"], "lunch:11:40-12:20", ["12:30", "13:30"], ["13:40", "14:40"]],
  high: [["08:15", "09:15"], ["09:25", "10:25"], ["10:40", "11:40"], "lunch:11:50-12:30", ["12:40", "13:40"], ["13:50", "14:50"], ["15:00", "15:45"]],
};

// Weekly templates per stage (Mon–Fri). Class B gets the same week
// with its days rotated, so the two classes don't share rooms.
const WEEKS = {
  low: [
    ["swe", "maths", "play", "music", "read"],
    ["maths", "swe", "pe", "art", "sci"],
    ["swe", "eng", "maths", "play", "craft"],
    ["read", "maths", "swe", "pe", "soc"],
    ["swe", "maths", "art", "eng", "mentor"],
  ],
  mid: [
    ["maths", "swe", "eng", "sci", "pe"],
    ["swe", "maths", "soc", "craft", "music"],
    ["eng", "maths", "swe", "tech", "art"],
    ["maths", "sci", "pe", "swe", "soc"],
    ["swe", "eng", "maths", "home", "mentor"],
  ],
  high: [
    ["maths", "swe", "eng", "bio", "hist", "lang"],
    ["phy", "maths", "lang", "swe", "pe", "music"],
    ["swe", "chem", "maths", "geo", "eng", "craft"],
    ["eng", "maths", "home", "swe", "bio", "pe"],
    ["lang", "swe", "maths", "tech", "art", "mentor"],
  ],
};

const ROOMS = {
  swe: "Library hall", maths: "Room 2.14", eng: "Room 2.08", sci: "Lab 1", bio: "Lab 1", phy: "Lab 2",
  chem: "Lab 2", soc: "Room 1.11", hist: "Room 1.11", geo: "Room 1.09", pe: "Sports hall", art: "Studio",
  music: "Music room", craft: "Workshop", home: "Kitchen", tech: "Makerspace", lang: "Room 3.02",
  play: "Schoolyard", mentor: "Home room", read: "Library hall",
};

const TEACHERS = {
  swe: "Sara Ek", maths: "Jonas Berg", eng: "Amira Haddad", sci: "Lina Holm", bio: "Lina Holm",
  phy: "Erik Strand", chem: "Erik Strand", soc: "Nils Ahlgren", hist: "Nils Ahlgren", geo: "Nils Ahlgren",
  pe: "Tove Lund", art: "Mira Kask", music: "Oskar Wall", craft: "Petra Sund", home: "Petra Sund",
  tech: "Erik Strand", lang: "Carmen Ruiz", play: "Class teacher", mentor: "Class mentor", read: "Class teacher",
};

/** Lessons for one class on one weekday (0 = Monday … 4 = Friday). */
export function lessonsFor(classId, weekday) {
  const cls = CLASSES.find((c) => c.id === classId) || CLASSES[0];
  const bells = BELLS[cls.line];
  const shift = cls.id.endsWith("B") ? 2 : 0;
  const week = WEEKS[cls.line];
  const subjects = week[(weekday + shift) % 5];
  // Friday finishes earlier for everyone
  const dayBells = weekday === 4 ? bells.slice(0, bells.length - 1) : bells;
  let i = 0;
  return dayBells.map((bell) => {
    if (typeof bell === "string") {
      const [start, end] = bell.replace("lunch:", "").split("-");
      return { kind: "lunch", start, end, name: "Lunch", room: "Dining hall" };
    }
    const key = subjects[i % subjects.length];
    i += 1;
    return { kind: "lesson", start: bell[0], end: bell[1], key, name: SUBJECTS[key].name, room: ROOMS[key], teacher: TEACHERS[key] };
  });
}

// ---------- Lunch: a four-week rotation, picked by ISO week ----------
// Thursday is always pea soup and pancakes, a Swedish school tradition.
export const MENU_WEEKS = [
  [
    { main: "Meatballs with creamy mashed potatoes, brown sauce and lingonberries", veg: "Bean balls with the same mash and sauce", tags: ["milk"] },
    { main: "Baked salmon with dill potatoes and lemon crème", veg: "Halloumi with dill potatoes", tags: ["fish", "milk"] },
    { main: "Chicken curry with jasmine rice and mango chutney", veg: "Chickpea and spinach curry", tags: [] },
    { main: "Yellow pea soup, then pancakes with jam and whipped cream", veg: "Pea soup is vegetarian today", tags: ["gluten", "egg", "milk"], tradition: true },
    { main: "Tacos with minced beef, salsa and grated cheese", veg: "Black bean tacos", tags: ["gluten", "milk"] },
  ],
  [
    { main: "Falukorv stroganoff with rice", veg: "Root vegetable stroganoff", tags: ["milk"] },
    { main: "Fish gratin with mashed potatoes and peas", veg: "Leek and potato gratin", tags: ["fish", "milk"] },
    { main: "Spaghetti bolognese with grated parmesan", veg: "Lentil bolognese", tags: ["gluten", "milk"] },
    { main: "Yellow pea soup, then pancakes with jam and whipped cream", veg: "Pea soup is vegetarian today", tags: ["gluten", "egg", "milk"], tradition: true },
    { main: "Homemade pizza with ham and pineapple", veg: "Margherita with basil", tags: ["gluten", "milk"] },
  ],
  [
    { main: "Kalops: slow-cooked beef stew with boiled potatoes and beetroot", veg: "Mushroom and barley stew", tags: [] },
    { main: "Cod in a crispy crumb with remoulade and potatoes", veg: "Crispy cauliflower with remoulade", tags: ["fish", "gluten", "egg"] },
    { main: "Chicken noodle stir-fry with sesame", veg: "Tofu noodle stir-fry", tags: ["gluten", "sesame", "soy"] },
    { main: "Yellow pea soup, then pancakes with jam and whipped cream", veg: "Pea soup is vegetarian today", tags: ["gluten", "egg", "milk"], tradition: true },
    { main: "Swedish hash (pytt i panna) with fried egg and beetroot", veg: "Vegetable hash with fried egg", tags: ["egg"] },
  ],
  [
    { main: "Chicken in tomato sauce with bulgur and tzatziki", veg: "Feta and tomato bake with bulgur", tags: ["gluten", "milk"] },
    { main: "Salmon soup with root vegetables and crispbread", veg: "Root vegetable soup with crispbread", tags: ["fish", "gluten", "milk"] },
    { main: "Lasagne with a green salad", veg: "Spinach and ricotta lasagne", tags: ["gluten", "milk", "egg"] },
    { main: "Yellow pea soup, then pancakes with jam and whipped cream", veg: "Pea soup is vegetarian today", tags: ["gluten", "egg", "milk"], tradition: true },
    { main: "Oven-baked sausages with potato wedges", veg: "Halloumi wedges and roasted peppers", tags: ["milk"] },
  ],
];

export const ALLERGENS = { milk: "Milk", fish: "Fish", gluten: "Gluten", egg: "Egg", sesame: "Sesame", soy: "Soy" };

export const DAILY_SIDES = "Every day: salad bar, crispbread, butter, milk and water.";

// ---------- Calendar: school year 2026/27 ----------
// group: all | low | mid | high | holiday
export const EVENTS = [
  { id: "e1", date: "2026-08-19", title: "First day of the autumn term", group: "all", time: "08:15", place: "Schoolyard", text: "Assembly in the schoolyard, then each class meets its mentor." },
  { id: "e2", date: "2026-09-03", title: "Parents' evening, years F–3", group: "low", time: "18:00", place: "Dining hall", text: "Meet the teachers and hear about the year's plans." },
  { id: "e3", date: "2026-09-10", title: "Parents' evening, years 4–9", group: "mid", time: "18:00", place: "Dining hall", text: "One evening for the red and blue lines together." },
  { id: "e4", date: "2026-09-24", title: "Outdoor day (friluftsdag)", group: "all", time: "08:15", place: "Nacka nature reserve", text: "The whole school heads into the forest. Bring a packed lunch and warm clothes." },
  { id: "e5", date: "2026-10-08", title: "Science fair", group: "high", time: "13:00", place: "Lab 1 and 2", text: "Years 7–9 show their projects. Parents are welcome after 15:00." },
  { id: "e6", date: "2026-10-21", title: "Development talks begin (utvecklingssamtal)", group: "all", time: "All week", place: "Home rooms", text: "Book a time with your child's mentor through the school app." },
  { id: "e7", date: "2026-10-26", end: "2026-10-30", title: "Autumn break (höstlov)", group: "holiday", text: "No school. The after-school club is open for children in F–3 who are registered." },
  { id: "e8", date: "2026-11-12", title: "Book swap in the library", group: "low", time: "12:00", place: "Library hall", text: "Bring a book you've finished and take one home." },
  { id: "e9", date: "2026-11-19", title: "Work experience week, year 8 (prao)", end: "2026-11-27", group: "high", text: "Year 8 spends two weeks at workplaces around Stockholm." },
  { id: "e10", date: "2026-12-11", title: "Lucia procession", group: "all", time: "08:30", place: "Sports hall", text: "Year 5 leads this year's Lucia. Families are welcome; we serve saffron buns." },
  { id: "e11", date: "2026-12-18", title: "Last day before the winter break", group: "all", time: "08:15–11:30", place: "Church of St. Johannes", text: "End-of-term gathering, then the holiday starts." },
  { id: "e12", date: "2026-12-21", end: "2027-01-08", title: "Winter break (jullov)", group: "holiday", text: "No school. Merry Christmas and a happy new year." },
  { id: "e13", date: "2027-01-11", title: "Spring term starts", group: "all", time: "08:15", place: "Home rooms", text: "Normal timetable from the first day." },
  { id: "e14", date: "2027-02-03", title: "Skating day on Brunnsviken", group: "mid", time: "09:00", place: "Brunnsviken ice", text: "If the ice holds. Helmets are required; skates can be borrowed." },
  { id: "e15", date: "2027-02-22", end: "2027-02-26", title: "Sports break (sportlov)", group: "holiday", text: "Stockholm's sports break is week 8. No school." },
  { id: "e16", date: "2027-03-16", title: "National tests start, year 9", group: "high", time: "08:30", place: "Sports hall", text: "Swedish first. A detailed schedule is sent home to each pupil." },
  { id: "e17", date: "2027-03-29", end: "2027-04-02", title: "Easter break (påsklov)", group: "holiday", text: "No school." },
  { id: "e18", date: "2027-04-29", title: "Spring concert", group: "all", time: "18:00", place: "Sports hall", text: "The school choir and every music class perform. Free entry." },
  { id: "e19", date: "2027-05-20", title: "Sports day", group: "all", time: "08:15", place: "Östermalm sports ground", text: "Running, long jump and the famous teachers' relay." },
  { id: "e20", date: "2027-06-11", title: "Last day of school (skolavslutning)", group: "all", time: "09:00", place: "Schoolyard", text: "We sing the summer song together. Have a wonderful summer!" },
];

export const EVENT_GROUPS = {
  all: "Whole school",
  low: "Years F–3",
  mid: "Years 4–6",
  high: "Years 7–9",
  holiday: "Holidays",
};

// ---------- News ----------
export const NEWS = [
  {
    id: "lucia-year-5", date: "2026-10-14", category: "School life", title: "Year 5 will lead this year's Lucia",
    img: "photo-1761208662734-fb46f1398551", alt: "A teacher helps children working at tables in a classroom",
    lede: "Rehearsals start in November. Here's how families can help with costumes and saffron buns.",
    body: [
      "Every December our sports hall goes dark, the doors open and a line of candles walks in singing. This year it's year 5 who leads the procession on Friday 11 December.",
      "Rehearsals are on Wednesdays after lunch from 4 November. Music teacher Oskar Wall is looking for parents who can help sew star boys' hats and gingerbread costumes; sign up at the office.",
      "Families are welcome to watch. We serve saffron buns and mulled juice in the dining hall afterwards.",
    ],
  },
  {
    id: "outdoor-day", date: "2026-09-25", category: "Outdoors", title: "Four hundred pupils, one forest",
    img: "photo-1638202951770-2240942c7d1c", alt: "Children sitting together in a hammock in the woods",
    lede: "Our outdoor day in Nacka had orienteering, campfire cooking and a hammock that was never empty.",
    body: [
      "On Thursday the whole school took the metro and the bus out to the Nacka nature reserve. The green line built shelters, the red line ran an orienteering course and the blue line cooked lunch over open fire.",
      "Thank you to all the parents who came along as extra adults. Lost and found: two mittens, one lunch box shaped like a fox and a very good stick. Ask at the office.",
    ],
  },
  {
    id: "new-makerspace", date: "2026-09-02", category: "School life", title: "The makerspace is open",
    img: "photo-1631885661110-aa12f8b42b25", alt: "Rows of desks and chairs in a bright classroom",
    lede: "Old room 3.10 has become a workshop with 3D printers, a laser cutter and a lot of cardboard.",
    body: [
      "Technology lessons for years 4–9 now take place in the new makerspace on the third floor. Pupils design in the computer room and build in the workshop next door.",
      "The makerspace is also open on Tuesday afternoons for the after-school club. Safety glasses are compulsory and very fashionable.",
    ],
  },
  {
    id: "pea-soup", date: "2026-08-27", category: "Food", title: "Yes, it's still pea soup on Thursdays",
    img: "photo-1649386525679-214da4fa6676", alt: "A girl sitting at a table reading a book",
    lede: "Our kitchen answers the most common questions about school lunch, allergies and second helpings.",
    body: [
      "Head chef Petra Sund cooks around 600 lunches a day. Every day there is a vegetarian dish and a salad bar, and Thursday is always yellow pea soup followed by pancakes.",
      "If your child has an allergy or a special diet, fill in the diet form once a year and the kitchen will prepare their plate separately. Seconds are always allowed.",
    ],
  },
  {
    id: "first-day", date: "2026-08-19", category: "Notices", title: "Welcome to a new school year",
    img: "photo-1576252951301-3b7b1e4278d0", alt: "A girl with a blue backpack on her first day",
    lede: "A letter from our principal, Elin Sandberg, about what's new this autumn.",
    body: [
      "Welcome back, and a special welcome to our new F class and everyone who has joined us this year. We are now 412 pupils and 58 staff under one roof (and quite a lot of rock).",
      "New this year: the makerspace, longer reading hours for years F–3 and a quiet room in the library for anyone who needs a calm place to work.",
      "My door is open. Come and say hello. — Elin",
    ],
  },
  {
    id: "skating", date: "2026-02-05", category: "Outdoors", title: "Skating day on Brunnsviken",
    img: "photo-1609255759249-36108a8e5497", alt: "People walking on a snow-covered path between trees",
    lede: "Last winter the ice held and years 4–6 spent a whole day on skates. We hope to do it again.",
    body: [
      "Sixty pupils, forty pairs of borrowed skates and one thermos of hot chocolate per class. The ice was checked by the city in the morning and was 14 centimetres thick.",
      "We'll plan a skating day again in February if the winter cooperates.",
    ],
  },
];

export const NEWS_CATEGORIES = ["School life", "Outdoors", "Food", "Notices"];

// ---------- Staff ----------
export const STAFF = [
  { name: "Elin Sandberg", role: "Principal (rektor)", line: "all", subjects: "Leadership" },
  { name: "Omar Haddad", role: "Deputy principal", line: "all", subjects: "Timetables and student support" },
  { name: "Sara Ek", role: "Teacher", line: "low", subjects: "Swedish, reading" },
  { name: "Jonas Berg", role: "Teacher", line: "mid", subjects: "Maths" },
  { name: "Amira Haddad", role: "Teacher", line: "high", subjects: "English" },
  { name: "Lina Holm", role: "Teacher", line: "mid", subjects: "Science, biology" },
  { name: "Erik Strand", role: "Teacher", line: "high", subjects: "Physics, chemistry, technology" },
  { name: "Nils Ahlgren", role: "Teacher", line: "high", subjects: "History, geography, social studies" },
  { name: "Tove Lund", role: "Teacher", line: "all", subjects: "Sport & health" },
  { name: "Mira Kask", role: "Teacher", line: "all", subjects: "Art" },
  { name: "Oskar Wall", role: "Teacher", line: "all", subjects: "Music, choir" },
  { name: "Carmen Ruiz", role: "Teacher", line: "high", subjects: "Spanish, German" },
  { name: "Petra Sund", role: "Head chef", line: "all", subjects: "School kitchen" },
  { name: "Anna Wikström", role: "School nurse", line: "all", subjects: "Student health" },
  { name: "Ali Yousef", role: "School counsellor", line: "all", subjects: "Student health" },
  { name: "Karin Nyberg", role: "After-school club lead", line: "low", subjects: "Fritids" },
];

export const staffEmail = (name) =>
  `${name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, ".")}@valvskolan.example`;

// ---------- Visits ----------
// Open visit slots for prospective families: Tuesdays and Thursdays at 09:00
export const VISIT_TIMES = ["09:00", "13:30"];
