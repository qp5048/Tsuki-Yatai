// =========================================================
// Timetable & lunch page
//   • Timetable tab: week grid or day board for any class
//   • Lunch tab: weekly menu, week navigation, allergen marking
// =========================================================

import { CLASSES, DEFAULT_CLASS, LINES, ALLERGENS, DAILY_SIDES, lessonsFor } from "./data.js";
import {
  stockholmNow, toMinutes, addDays, mondayOf, isoWeek, formatDate,
  savedClass, saveClass, store, setupTabs, esc, WEEKDAYS,
} from "./common.js";
import { menuFor, holidayOn, nextSchoolDay, weekdayOf } from "./school-day.js";

const now = stockholmNow();

// ---------- Tabs (hash #lunch opens the lunch tab) ----------
const tabs = setupTabs(document.getElementById("schedule-tabs"), (tab) => {
  history.replaceState(null, "", tab.id === "tab-lunch" ? "#lunch" : location.pathname);
});
if (location.hash === "#lunch") tabs.select("tab-lunch");

// =========================================================
// Timetable
// =========================================================
const classSelect = document.getElementById("tt-class");
const weekEl = document.getElementById("tt-week");
const dayEl = document.getElementById("tt-day");
const dayStepper = document.getElementById("tt-day-stepper");
const dayLabel = document.getElementById("tt-day-label");
const viewButtons = [...document.querySelectorAll("[data-view]")];

classSelect.innerHTML = Object.values(LINES).map((line) => `
  <optgroup label="${line.name}, ${line.stage}">
    ${CLASSES.filter((c) => c.line === line.id).map((c) => `<option value="${c.id}">Class ${c.id}</option>`).join("")}
  </optgroup>`).join("");
classSelect.value = savedClass(DEFAULT_CLASS);
if (!classSelect.value) classSelect.value = DEFAULT_CLASS;

// Phones start on the day view, wider screens on the week
let view = store.get("valv-view", window.matchMedia("(max-width: 760px)").matches ? "day" : "week");
// The day shown in day view: today, or the next school day
let dayIso = nextSchoolDay(now.iso);

const START = 8 * 60;     // grid starts 08:00
const END = 16 * 60;      // and ends 16:00
const lineColor = (line) => `var(--line-${line})`;

function renderWeek() {
  const cls = CLASSES.find((c) => c.id === classSelect.value);
  const monday = mondayOf(dayIso);
  const hours = [];
  for (let m = START; m <= END; m += 60) hours.push(m);
  const px = (m) => `calc(${(m - START) / 60} * var(--hour))`;
  const height = `calc(${(END - START) / 60} * var(--hour))`;

  const heads = WEEKDAYS.map((name, i) => {
    const iso = addDays(monday, i);
    return `<div class="week__head ${iso === now.iso ? "is-today" : ""}">${name}<small>${formatDate(iso, { day: "numeric", month: "short" })}${iso === now.iso ? " · today" : ""}</small></div>`;
  }).join("");

  const cols = WEEKDAYS.map((name, i) => {
    const iso = addDays(monday, i);
    const holiday = holidayOn(iso);
    const today = iso === now.iso;
    let blocks;
    if (holiday) {
      blocks = `<div class="lesson lesson--lunch" style="top:${px(9 * 60)};height:calc(1.4 * var(--hour))"><b>${esc(holiday.title)}</b><span>No lessons</span></div>`;
    } else {
      blocks = lessonsFor(cls.id, i).map((l) => {
        const s = toMinutes(l.start);
        const e = toMinutes(l.end);
        const isNow = today && now.minutes >= s && now.minutes < e;
        const label = l.kind === "lunch" ? "Lunch" : esc(l.name);
        return `<div class="lesson ${l.kind === "lunch" ? "lesson--lunch" : ""} ${isNow ? "is-now" : ""}" style="--c:${lineColor(cls.line)};top:${px(s)};height:calc(${(e - s) / 60} * var(--hour) - 4px)">
          <b>${label}</b><span class="tnum">${l.start}–${l.end}</span>${l.kind === "lesson" ? `<span>${esc(l.room)}</span>` : ""}
        </div>`;
      }).join("");
    }
    const nowLine = today && now.minutes > START && now.minutes < END
      ? `<div class="now-line" style="top:${px(now.minutes)}" title="Now, ${now.time}"></div>` : "";
    return `<div class="week__col ${today ? "is-today" : ""}" style="height:${height}" aria-label="${name}">${blocks}${nowLine}</div>`;
  }).join("");

  const hourLabels = hours.map((m) => `<span class="tnum" style="top:${px(m)}">${String(m / 60).padStart(2, "0")}:00</span>`).join("");

  weekEl.innerHTML = `<div class="week" role="group" aria-label="Week ${isoWeek(monday)} timetable for class ${cls.id}">
    <div></div>${heads}
    <div class="week__hours" style="height:${height}" aria-hidden="true">${hourLabels}</div>${cols}
  </div>`;
}

function renderDay() {
  const cls = CLASSES.find((c) => c.id === classSelect.value);
  dayLabel.textContent = `${dayIso === now.iso ? "Today · " : ""}${formatDate(dayIso, { weekday: "short", day: "numeric", month: "short" })}`;
  const holiday = holidayOn(dayIso);
  const weekend = weekdayOf(dayIso) > 4;
  if (holiday || weekend) {
    dayEl.innerHTML = `<div class="board"><p class="board__note"><strong>${weekend ? "Weekend" : esc(holiday.title)}.</strong> No lessons for class ${cls.id} this day.</p></div>`;
    return;
  }
  const lessons = lessonsFor(cls.id, weekdayOf(dayIso));
  const today = dayIso === now.iso;
  dayEl.innerHTML = `<section class="board" aria-label="Class ${cls.id}, ${formatDate(dayIso, { weekday: "long" })}">
    <div class="board__head"><p class="board__title"><span class="bullet bullet--${cls.line}">${cls.id}</span>${formatDate(dayIso, { weekday: "long", day: "numeric", month: "long" })}</p></div>
    <ol class="board__rows">${lessons.map((l) => {
      const s = toMinutes(l.start);
      const e = toMinutes(l.end);
      const state = today ? (now.minutes >= e ? "is-past" : now.minutes >= s ? "is-now" : "") : "";
      return `<li class="board__row ${state}">
        <span class="board__time">${l.start}</span>
        <span class="board__what">${esc(l.name)}${state === "is-now" ? '<span class="tag-now">Now</span>' : ""}<small>${l.kind === "lesson" ? `${esc(l.teacher)} · ` : ""}until ${l.end}</small></span>
        <span class="board__where">${esc(l.room)}</span></li>`;
    }).join("")}</ol>
    <div class="board__foot" style="grid-template-columns:1fr"><a href="#lunch" data-goto-lunch><span class="board__label">Lunch</span><strong>${esc(menuFor(dayIso).main)}</strong></a></div>
  </section>`;
}

function renderLegend() {
  const cls = CLASSES.find((c) => c.id === classSelect.value);
  const line = LINES[cls.line];
  document.getElementById("tt-legend").innerHTML =
    `<span><span class="bullet bullet--${line.id}">${line.short}</span> Class ${cls.id} rides the ${line.name.toLowerCase()}.</span>
     <span>Fridays end one lesson early. Lunch is in the dining hall in the vault.</span>`;
}

function renderTimetable() {
  viewButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  weekEl.hidden = view !== "week";
  dayEl.hidden = view !== "day";
  dayStepper.hidden = view !== "day";
  if (view === "week") renderWeek(); else renderDay();
  renderLegend();
}

classSelect.addEventListener("change", () => { saveClass(classSelect.value); renderTimetable(); });
viewButtons.forEach((b) => b.addEventListener("click", () => {
  view = b.dataset.view;
  store.set("valv-view", view);
  renderTimetable();
}));
dayStepper.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-step]");
  if (!btn) return;
  const dir = Number(btn.dataset.step);
  // skip weekends when stepping
  do { dayIso = addDays(dayIso, dir); } while (weekdayOf(dayIso) > 4);
  renderDay();
});
dayEl.addEventListener("click", (e) => {
  if (e.target.closest("[data-goto-lunch]")) { e.preventDefault(); tabs.select("tab-lunch"); }
});

renderTimetable();
setInterval(() => { Object.assign(now, stockholmNow()); if (view === "week") renderWeek(); }, 60_000);

// =========================================================
// Lunch
// =========================================================
const lunchDays = document.getElementById("lunch-days");
const weekLabel = document.getElementById("lunch-week");
const allergenBox = document.getElementById("lunch-allergens");
const flagNote = document.getElementById("lunch-flag-note");
let lunchMonday = weekdayOf(now.iso) > 4 ? addDays(mondayOf(now.iso), 7) : mondayOf(now.iso);
const avoid = new Set(store.get("valv-avoid", []));

document.getElementById("lunch-sides").textContent = DAILY_SIDES;

allergenBox.insertAdjacentHTML("beforeend", Object.entries(ALLERGENS).map(([key, label]) =>
  `<label><input type="checkbox" value="${key}" ${avoid.has(key) ? "checked" : ""}> ${label}</label>`).join(""));

function renderLunch() {
  weekLabel.textContent = `Week ${isoWeek(lunchMonday)} · ${formatDate(lunchMonday, { day: "numeric", month: "short" })}–${formatDate(addDays(lunchMonday, 4), { day: "numeric", month: "short" })}`;
  let flagged = 0;
  lunchDays.innerHTML = WEEKDAYS.map((name, i) => {
    const iso = addDays(lunchMonday, i);
    const holiday = holidayOn(iso);
    const menu = menuFor(iso);
    const hits = menu.tags.filter((t) => avoid.has(t));
    if (!holiday && hits.length) flagged++;
    const cls = ["lunch-day", iso === now.iso ? "is-today" : "", holiday ? "is-closed" : "", !holiday && hits.length ? "is-flagged" : ""].join(" ");
    return `<article class="${cls}">
      <p class="lunch-day__date"><b>${name}</b><span>${formatDate(iso, { day: "numeric", month: "long" })}${iso === now.iso ? " · today" : ""}</span></p>
      <div>
        <h3 class="lunch-day__dish" style="letter-spacing:0">${holiday ? `Kitchen closed: ${esc(holiday.title)}` : esc(menu.main)}</h3>
        ${holiday ? "" : `<p class="lunch-day__veg">${esc(menu.veg)}</p>`}
        ${!holiday && menu.tradition ? '<p class="menu-list"><span class="tradition">Pea soup Thursday, a Swedish school tradition</span></p>' : ""}
      </div>
      <p class="lunch-day__tags">${holiday ? "" : menu.tags.map((t) => `<span class="allergen ${avoid.has(t) ? "is-flagged" : ""}">${ALLERGENS[t]}</span>`).join("")}</p>
    </article>`;
  }).join("");
  flagNote.textContent = avoid.size
    ? flagged ? `${flagged} main dish${flagged > 1 ? "es" : ""} this week contain${flagged > 1 ? "" : "s"} something on your list. The vegetarian dish or a special-diet plate is the safe choice.`
      : "Nothing this week contains what you ticked."
    : "";
}

allergenBox.addEventListener("change", (e) => {
  const v = e.target.value;
  e.target.checked ? avoid.add(v) : avoid.delete(v);
  store.set("valv-avoid", [...avoid]);
  renderLunch();
});
document.querySelectorAll("[data-week]").forEach((b) => b.addEventListener("click", () => {
  lunchMonday = addDays(lunchMonday, 7 * Number(b.dataset.week));
  renderLunch();
}));
document.getElementById("lunch-today").addEventListener("click", () => {
  lunchMonday = weekdayOf(now.iso) > 4 ? addDays(mondayOf(now.iso), 7) : mondayOf(now.iso);
  renderLunch();
});
renderLunch();

