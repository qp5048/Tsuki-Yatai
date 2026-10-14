// =========================================================
// Site content: menu, bowl builder options, gallery.
// Edit this file to change dishes, prices and photos.
// Photos are served from Unsplash (free to use, see unsplash.com/license).
// =========================================================

// Build an Unsplash image URL at a given width
export const photo = (id, width = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=70`;

// Prices are in euro. spice: 0–3. tags: "hot" (spicy), "veg" (no meat or fish)
export const MENU = [
  {
    id: "noodles",
    title: "Soups & Noodles",
    items: [
      {
        id: "midnight-pho",
        name: "Midnight Pho",
        desc: "Beef bone broth simmered for 14 hours with star anise and charred onion. Rice noodles, rare beef, Thai basil and lime.",
        price: 14.5, spice: 0, tags: [], allergens: ["soy"],
        img: "photo-1766050586763-723571af4dde",
      },
      {
        id: "tonkotsu",
        name: "Tonkotsu Ramen",
        desc: "Milky pork bone broth, springy wheat noodles, chashu, soy-marinated egg and a drop of black garlic oil.",
        price: 15.9, spice: 0, tags: [], allergens: ["gluten", "egg", "soy", "sesame"],
        img: "photo-1569718212165-3a8278d5f624",
      },
      {
        id: "spicy-miso",
        name: "Red Miso Ramen",
        desc: "Red miso and chili broth, soft egg, sliced chili and a mountain of spring onion.",
        price: 14.9, spice: 2, tags: ["hot"], allergens: ["gluten", "egg", "soy"],
        img: "photo-1612927601601-6638404737ce",
      },
      {
        id: "bun-bo-hue",
        name: "Bun Bo Hue",
        desc: "Lemongrass and shrimp-paste broth with thick rice noodles, braised beef shank and fresh mint.",
        price: 14.9, spice: 2, tags: ["hot"], allergens: ["crustaceans"],
        img: "photo-1701480253822-1842236c9a97",
      },
      {
        id: "tom-yum",
        name: "Tom Yum Goong",
        desc: "Hot and sour coconut broth with galangal, lime leaves, tiger prawns and shiitake.",
        price: 15.5, spice: 3, tags: ["hot"], allergens: ["crustaceans", "fish"],
        img: "photo-1777828827870-92e3069424bd",
      },
      {
        id: "duck-udon",
        name: "Duck Udon",
        desc: "Thick udon in a clear dashi broth, crispy-skin duck breast, roasted leek and nori.",
        price: 16.5, spice: 0, tags: [], allergens: ["gluten", "fish", "soy"],
        img: "photo-1707201124182-099f3d98bb90",
      },
    ],
  },
  {
    id: "small-plates",
    title: "Small Plates",
    items: [
      {
        id: "gyoza",
        name: "Pork Gyoza",
        desc: "Six dumplings, crisp on the bottom and soft on top, with rice vinegar and chili oil.",
        price: 8.5, spice: 1, tags: [], allergens: ["gluten", "soy"],
        img: "photo-1768326119773-05cae29f4106",
      },
      {
        id: "fresh-rolls",
        name: "Fresh Shrimp Rolls",
        desc: "Rice paper, prawns, mint, cucumber and vermicelli, with a peanut dipping sauce.",
        price: 7.9, spice: 0, tags: [], allergens: ["crustaceans", "peanuts"],
        img: "photo-1623253083987-26681ce4a992",
      },
      {
        id: "bao",
        name: "Pork Belly Bao",
        desc: "Two steamed buns with caramelised pork belly, pickled cucumber and crushed peanuts.",
        price: 9.5, spice: 0, tags: [], allergens: ["gluten", "peanuts", "soy"],
        img: "photo-1781785164696-0154e4dd70c1",
      },
      {
        id: "takoyaki",
        name: "Takoyaki",
        desc: "Street-style octopus balls with okonomi sauce, Japanese mayo and bonito flakes.",
        price: 8.9, spice: 0, tags: [], allergens: ["gluten", "egg", "fish", "molluscs"],
        img: "photo-1751094364516-02b351f9c277",
      },
      {
        id: "spring-rolls",
        name: "Crispy Spring Rolls",
        desc: "Golden rolls with glass noodles, wood ear mushroom and cabbage. Sweet chili dip.",
        price: 7.5, spice: 1, tags: ["veg"], allergens: ["gluten", "soy"],
        img: "photo-1515022376298-7333f33e704b",
      },
      {
        id: "edamame",
        name: "Yuzu Edamame",
        desc: "Young soybeans with sea salt and yuzu zest. The best thing to have with a cold beer.",
        price: 5.5, spice: 0, tags: ["veg"], allergens: ["soy"],
        img: "photo-1557621956-ce58555aa0ce",
      },
    ],
  },
  {
    id: "mains",
    title: "Mains",
    items: [
      {
        id: "karaage",
        name: "Chicken Karaage",
        desc: "Ginger-soy marinated thigh, fried twice, served with rice, cabbage and lemon.",
        price: 15.9, spice: 0, tags: [], allergens: ["gluten", "soy", "egg"],
        img: "photo-1788931285595-d54b16c88cf4",
      },
      {
        id: "mapo-tofu",
        name: "Mapo Tofu",
        desc: "Silken tofu in fermented bean sauce with Sichuan pepper and shiitake. Numbing, in a good way.",
        price: 13.5, spice: 3, tags: ["hot", "veg"], allergens: ["soy"],
        img: "photo-1788603930622-636954e00065",
      },
      {
        id: "yakisoba",
        name: "Wok Yakisoba",
        desc: "Wok-tossed noodles with squid, prawns, cabbage and pickled ginger in yakisoba sauce.",
        price: 16.9, spice: 0, tags: [], allergens: ["gluten", "crustaceans", "molluscs", "soy"],
        img: "photo-1674516585624-422828b423f1",
      },
      {
        id: "night-set",
        name: "Night Market Set",
        desc: "A smaller tonkotsu ramen with a side of karaage. For when you can't decide.",
        price: 19.5, spice: 0, tags: [], allergens: ["gluten", "egg", "soy"],
        img: "photo-1745914415360-353407fab30b",
      },
    ],
  },
  {
    id: "desserts",
    title: "Desserts",
    items: [
      {
        id: "mango-rice",
        name: "Mango Sticky Rice",
        desc: "Ripe mango, warm coconut sticky rice and crunchy toasted mung beans.",
        price: 7.5, spice: 0, tags: ["veg"], allergens: [],
        img: "photo-1711161988375-da7eff032e45",
      },
      {
        id: "dango",
        name: "Grilled Mochi Dango",
        desc: "Chewy rice dumplings on skewers, grilled and glazed with sweet soy.",
        price: 5.5, spice: 0, tags: ["veg"], allergens: ["soy"],
        img: "photo-1635355347994-b79177b77e5c",
      },
      {
        id: "wagashi",
        name: "Wagashi Plate",
        desc: "A small selection of Japanese sweets: yuzu mochi, red bean and matcha.",
        price: 6.9, spice: 0, tags: ["veg"], allergens: ["soy"],
        img: "photo-1675870793010-b73def5d5398",
      },
      {
        id: "sesame-ice",
        name: "Black Sesame Ice Cream",
        desc: "Deep, nutty house-made ice cream with toasted sesame crumble.",
        price: 5.9, spice: 0, tags: ["veg"], allergens: ["milk", "sesame"],
        img: "photo-1664138218128-2dcf791a9d27",
      },
    ],
  },
  {
    id: "drinks",
    title: "Drinks",
    items: [
      {
        id: "viet-coffee",
        name: "Vietnamese Iced Coffee",
        desc: "Slow-drip dark roast over condensed milk and ice.",
        price: 4.5, spice: 0, tags: ["veg"], allergens: ["milk"],
        img: "photo-1760769214612-aff51cd270bd",
      },
      {
        id: "iced-matcha",
        name: "Iced Matcha Latte",
        desc: "Ceremonial-grade matcha whisked by hand, over dairy or oat milk.",
        price: 5.2, spice: 0, tags: ["veg"], allergens: ["milk"],
        img: "photo-1717603545758-88cc454db69b",
      },
      {
        id: "hot-matcha",
        name: "Hot Matcha",
        desc: "Usucha-style thin matcha, whisked to order. No sugar.",
        price: 4.8, spice: 0, tags: ["veg"], allergens: [],
        img: "photo-1515823064-d6e0c04616a7",
      },
      {
        id: "sake",
        name: "Junmai Sake",
        desc: "Dry rice sake, 100 ml, served chilled or warm.",
        price: 8.5, spice: 0, tags: ["veg"], allergens: [],
        img: "photo-1664477407933-dd42ed0c6c62",
      },
    ],
  },
];

// Flat lookup: dish id -> dish
export const DISHES = Object.fromEntries(MENU.flatMap((c) => c.items.map((d) => [d.id, d])));

// ---------- Build-your-bowl options ----------
// color: broth tint used by the live 3D preview
export const BUILDER = {
  broths: [
    { id: "pho", name: "Beef pho", note: "14-hour bone broth, star anise", price: 9.5, color: "#c27a34" },
    { id: "tonkotsu", name: "Tonkotsu", note: "Creamy pork bone", price: 10.5, color: "#ead6ad" },
    { id: "miso", name: "Red miso", note: "Chili, garlic, sesame", price: 10, color: "#bf4a1f", spicy: true },
    { id: "shiitake", name: "Shiitake & kombu", note: "Vegan, deep umami", price: 9, color: "#7a4f2a", veg: true },
  ],
  noodles: [
    { id: "rice", name: "Rice", note: "Thin, silky", price: 0 },
    { id: "ramen", name: "Ramen", note: "Wavy wheat", price: 0.5 },
    { id: "udon", name: "Udon", note: "Thick, chewy", price: 1 },
  ],
  toppings: [
    { id: "egg", name: "Soy egg", price: 1.8 },
    { id: "chashu", name: "Chashu pork", price: 3.2, meat: true },
    { id: "beef", name: "Rare beef", price: 3.5, meat: true },
    { id: "tofu", name: "Silken tofu", price: 2.2 },
    { id: "corn", name: "Charred corn", price: 1.2 },
    { id: "nori", name: "Nori", price: 0.9 },
    { id: "naruto", name: "Narutomaki", price: 1.5, meat: true },
    { id: "chili", name: "Fresh chili", price: 0.6, spicy: true },
    { id: "greens", name: "Herbs & spring onion", price: 0 },
  ],
  defaults: { broth: "tonkotsu", noodles: "ramen", toppings: ["egg", "chashu", "nori", "naruto", "greens"] },
};

// ---------- Gallery (night market photos) ----------
export const GALLERY = [
  { img: "photo-1759200262816-0e02f17c63d3", caption: "Paper lanterns over the evening crowd" },
  { img: "photo-1542666836-03522463be07", caption: "The grill never really cools down" },
  { img: "photo-1760546100206-de205df95289", caption: "Signs, smoke and late-night appetite" },
  { img: "photo-1771945510049-edd4807608f0", caption: "Drinks poured straight from the stall" },
  { img: "photo-1561380025-7d29d36ec7fa", caption: "Where we started: a cart and eight stools" },
  { img: "photo-1672172506305-fb9311039719", caption: "Neon on the way home" },
];

// ---------- Opening hours (Europe/Stockholm). day: 0 = Sunday ----------
// close may be past midnight (25 = 01:00 next day)
export const HOURS = [
  { day: 0, open: 16, close: 22 },
  { day: 1, open: null, close: null },
  { day: 2, open: 17, close: 23 },
  { day: 3, open: 17, close: 23 },
  { day: 4, open: 17, close: 23 },
  { day: 5, open: 17, close: 25 },
  { day: 6, open: 17, close: 25 },
];

export const formatPrice = (value) =>
  "€" + value.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
