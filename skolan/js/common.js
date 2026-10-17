// =========================================================
// Shared by every page: Stockholm time, the painted vault,
// the mobile menu and small helpers.
// =========================================================

import { paintVault, brushIn } from "./paint.js";

export const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- Time, always in Stockholm ----------
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

/** Current date and time in Europe/Stockholm as plain numbers. */
export function stockholmNow(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Stockholm",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", weekday: "long", hourCycle: "h23",
    }).formatToParts(date).map((p) => [p.type, p.value])
  );
  const day = DAY_NAMES.indexOf(parts.weekday);
  return {
    iso: `${parts.year}-${parts.month}-${parts.day}`,
    day,                                // 0 = Sunday
    weekday: (day + 6) % 7,             // 0 = Monday
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    time: `${parts.hour}:${parts.minute}`,
  };
}

export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** A date at noon UTC: safe to add days to without time-zone surprises. */
export const dateFromIso = (iso) => new Date(`${iso}T12:00:00Z`);
export const isoFromDate = (d) => d.toISOString().slice(0, 10);
export const addDays = (iso, n) => {
  const d = dateFromIso(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return isoFromDate(d);
};

/** ISO 8601 week number, the week numbers every Swedish calendar shows. */
export function isoWeek(iso) {
  const d = dateFromIso(iso);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

/** Monday of the week containing `iso`. */
export const mondayOf = (iso) => addDays(iso, -((dateFromIso(iso).getUTCDay() + 6) % 7));

export const formatDate = (iso, opts = { weekday: "short", day: "numeric", month: "short" }) =>
  dateFromIso(iso).toLocaleDateString("en-GB", { timeZone: "UTC", ...opts });

// ---------- Safe localStorage ----------
export const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: ignore */ }
  },
};

// The class a visitor picked is remembered across pages
export const savedClass = (fallback) => store.get("valv-class", fallback);
export const saveClass = (id) => store.set("valv-class", id);

// ---------- Escape text for innerHTML ----------
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- Painted vault ----------
function paintAll(animate = true) {
  const css = getComputedStyle(document.body);
  document.querySelectorAll("svg[data-vault]").forEach((svg) => {
    paintVault(svg, {
      style: svg.dataset.vault,
      seed: Number(svg.dataset.seed || 7),
      height: Number(svg.dataset.height || 900),
      colors: [css.getPropertyValue("--paint").trim(), css.getPropertyValue("--paint-2").trim()],
    });
    if (animate) brushIn(svg);
  });
}

// Repaint (without the brush animation) when the window changes shape
let lastWidth = window.innerWidth;
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (Math.abs(window.innerWidth - lastWidth) < 40) return;
    lastWidth = window.innerWidth;
    paintAll(false);
  }, 200);
});

// ---------- Mobile menu ----------
function setupMenu() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.getElementById("site-nav");
  if (!toggle || !nav) return;
  const set = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector("span").textContent = open ? "Close" : "Menu";
  };
  toggle.addEventListener("click", () => set(!nav.classList.contains("is-open")));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) { set(false); toggle.focus(); }
  });
}

// ---------- Small status message ----------
let toastTimer;
export function toast(message) {
  let node = document.getElementById("toast");
  if (!node) {
    node = document.createElement("p");
    node.id = "toast";
    node.className = "toast";
    node.setAttribute("role", "status");
    document.body.append(node);
  }
  node.textContent = message;
  node.classList.add("is-shown");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("is-shown"), 3200);
}

// ---------- Accessible tabs (ARIA tabs pattern) ----------
/**
 * Wire up a [role=tablist]. Each tab has aria-controls pointing at its panel.
 * onChange(tab) runs after switching. Arrow keys, Home and End move focus.
 */
export function setupTabs(tablist, onChange) {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const select = (tab, focus = false) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
    onChange?.(tab);
  };
  tabs.forEach((tab) => tab.addEventListener("click", () => select(tab)));
  tablist.addEventListener("keydown", (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const vertical = tablist.getAttribute("aria-orientation") === "vertical";
    const next = { [vertical ? "ArrowDown" : "ArrowRight"]: 1, [vertical ? "ArrowUp" : "ArrowLeft"]: -1 }[e.key];
    let target = null;
    if (next) target = tabs[(i + next + tabs.length) % tabs.length];
    if (e.key === "Home") target = tabs[0];
    if (e.key === "End") target = tabs[tabs.length - 1];
    if (!target) return;
    e.preventDefault();
    select(target, true);
  });
  return { select: (id) => { const t = tabs.find((x) => x.id === id); if (t) select(t); } };
}

// ---------- Boot ----------
document.documentElement.classList.add("js");
paintAll();
setupMenu();
