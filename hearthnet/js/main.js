// =========================================================
// Hearthnet — page behaviour (plain JavaScript, no framework)
//   • icons, mobile menu, gentle scroll reveal
//   • a 90s visitor counter and count-up stats
//   • price currency switch
//   • a working guestbook saved in localStorage
// =========================================================

document.documentElement.classList.add("js");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Safe localStorage (private mode can throw) ----------
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  },
};

// ---------- Icons (Lucide) ----------
function drawIcons() { window.lucide?.createIcons({ attrs: { "stroke-width": 2 } }); }
drawIcons();

// ---------- Mobile menu ----------
const toggle = document.querySelector(".nav__toggle");
const links = document.getElementById("nav-links");
function setMenu(open) {
  links.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  toggle.innerHTML = `<i data-lucide="${open ? "x" : "menu"}" aria-hidden="true"></i>`;
  drawIcons();
}
toggle.addEventListener("click", () => setMenu(!links.classList.contains("is-open")));
links.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && links.classList.contains("is-open")) { setMenu(false); toggle.focus(); } });
document.addEventListener("click", (e) => { if (!e.target.closest(".nav")) setMenu(false); });

// ---------- Gentle reveal on scroll ----------
const revealer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    // stagger siblings a little so a row doesn't pop in all at once
    const siblings = [...entry.target.parentElement.children];
    entry.target.style.transitionDelay = `${siblings.indexOf(entry.target) % 4 * 90}ms`;
    entry.target.classList.add("is-visible");
    revealer.unobserve(entry.target);
  });
}, { rootMargin: "0px 0px -8% 0px" });
document.querySelectorAll(".reveal").forEach((el) => revealer.observe(el));

// ---------- Visitor counter (the most 90s thing on the page) ----------
const visits = store.get("hearthnet-visits", 0) + 1;
store.set("hearthnet-visits", visits);
const visitorNumber = 2026 + visits * 3; // a believable number that grows on every visit
const digits = String(visitorNumber).padStart(6, "0").split("");
const counterEl = document.getElementById("visitor-counter");
counterEl.setAttribute("aria-label", `You are visitor number ${visitorNumber}`);
counterEl.querySelectorAll("span").forEach((span, i) => {
  if (reduceMotion) { span.textContent = digits[i]; return; }
  // roll each digit like an odometer
  let n = 0;
  const target = Number(digits[i]);
  const spins = 8 + i * 3;
  const tick = () => {
    span.textContent = (n % 10).toString();
    if (n++ < spins + target) setTimeout(tick, 45);
    else span.textContent = digits[i];
  };
  setTimeout(tick, 400);
});

// ---------- Count-up stats ----------
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    statObserver.unobserve(entry.target);
    const el = entry.target;
    const end = Number(el.dataset.count);
    if (reduceMotion || end === 0) return;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / 1400, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = "0";
    requestAnimationFrame(step);
  });
}, { threshold: 0.6 });
document.querySelectorAll("[data-count]").forEach((el) => statObserver.observe(el));

// ---------- Currency switch on the pricing cards ----------
const SEK_PER_EUR = 11.5; // fixed, illustrative rate
document.querySelectorAll("[data-currency]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-currency]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    document.querySelectorAll("[data-price]").forEach((el) => {
      const eur = Number(el.dataset.price);
      el.textContent = btn.dataset.currency === "sek"
        ? `${(Math.round(eur * SEK_PER_EUR / 100) * 100).toLocaleString("sv-SE")} kr`
        : `€${eur.toLocaleString("en-GB")}`;
    });
  });
});

// ---------- Guestbook ----------
const GB_KEY = "hearthnet-guestbook-v1";
// Sample entries so the book never looks empty (fictional people)
const SAMPLES = [
  { id: "s1", name: "Ingrid", place: "Linköping", message: "Found you through the gardening webring. Lovely little place, it feels like 1998 in the best way.", time: Date.now() - 1000 * 60 * 60 * 26, sample: true },
  { id: "s2", name: "Oskar", place: "Gothenburg", message: "Our model railway club would love a forum like Mossboard. Do you do layouts with lots of photos?", time: Date.now() - 1000 * 60 * 60 * 24 * 4, sample: true },
  { id: "s3", name: "Maja", place: "Norrköping", message: "Signed! Bring back the visitor counter everywhere.", time: Date.now() - 1000 * 60 * 60 * 24 * 9, sample: true },
];

const form = document.getElementById("gb-form");
const list = document.getElementById("gb-list");
const countEl = document.getElementById("gb-count");
const errorEl = document.getElementById("gb-error");
const message = document.getElementById("gb-message");
let mine = store.get(GB_KEY, []);

function timeAgo(t) {
  const s = Math.round((Date.now() - t) / 1000);
  const units = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [name, secs] of units) {
    const n = Math.floor(s / secs);
    if (n >= 1) return `${n} ${name}${n > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

// Built with DOM methods and textContent, so visitors can't inject HTML
function entryNode(entry, isNew = false) {
  const li = document.createElement("li");
  li.className = `gb-entry${isNew ? " is-new" : ""}`;
  const msg = document.createElement("p");
  msg.className = "gb-entry__msg";
  msg.textContent = `"${entry.message}"`;
  const meta = document.createElement("p");
  meta.className = "gb-entry__meta";
  const who = document.createElement("strong");
  who.textContent = entry.name;
  meta.append(who);
  if (entry.place) meta.append(` from ${entry.place}`);
  const when = document.createElement("span");
  when.textContent = `· ${timeAgo(entry.time)}`;
  meta.append(when);
  if (!entry.sample) {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "gb-entry__remove";
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", "Remove your entry");
    remove.addEventListener("click", () => {
      mine = mine.filter((e) => e.id !== entry.id);
      store.set(GB_KEY, mine);
      render();
    });
    meta.append(remove);
  }
  li.append(msg, meta);
  return li;
}

function render(newId) {
  list.replaceChildren(...[...mine, ...SAMPLES].sort((a, b) => b.time - a.time).map((e) => entryNode(e, e.id === newId)));
}
render();

message.addEventListener("input", () => {
  const left = 240 - message.value.length;
  countEl.textContent = `${left} character${left === 1 ? "" : "s"} left`;
});

form.addEventListener("submit", (e) => {
  e.preventDefault(); // stays in the browser, nothing is sent
  const data = new FormData(form);
  const name = data.get("name").trim();
  const place = data.get("place").trim();
  const text = data.get("message").trim();

  const problems = [];
  form.querySelector('[name="name"]').setAttribute("aria-invalid", String(!name));
  form.querySelector('[name="message"]').setAttribute("aria-invalid", String(text.length < 3));
  if (!name) problems.push("your name");
  if (text.length < 3) problems.push("a short message");
  if (problems.length) {
    errorEl.textContent = `Please add ${problems.join(" and ")}.`;
    errorEl.hidden = false;
    return;
  }
  errorEl.hidden = true;

  const entry = { id: `m${Date.now()}`, name, place, message: text, time: Date.now() };
  mine = [entry, ...mine].slice(0, 20);
  store.set(GB_KEY, mine);
  form.reset();
  countEl.textContent = "240 characters left";
  render(entry.id);
  list.firstElementChild?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
});
