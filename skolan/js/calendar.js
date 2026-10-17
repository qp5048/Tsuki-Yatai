// =========================================================
// Calendar page: month grid and list, filters by year group,
// event details and "add to my calendar" (.ics file).
// =========================================================

import { EVENTS, EVENT_GROUPS } from "./data.js";
import { stockholmNow, addDays, formatDate, isoWeek, dateFromIso, setupTabs, store, esc } from "./common.js";

const today = stockholmNow().iso;
const BADGE = { all: "All", low: "F–3", mid: "4–6", high: "7–9", holiday: "Break" };

// ---------- State ----------
const active = new Set(store.get("valv-cal-groups", Object.keys(EVENT_GROUPS)));
let month = today.slice(0, 7); // "YYYY-MM"
let selectedId = null;

// Deep link: calendar.html#e10 opens that event
const linked = EVENTS.find((e) => e.id === location.hash.slice(1));
if (linked) { month = linked.date.slice(0, 7); selectedId = linked.id; }

const visible = () => EVENTS.filter((e) => active.has(e.group));
const eventsOn = (iso) => visible().filter((e) => iso >= e.date && iso <= (e.end || e.date));

// ---------- Tabs ----------
setupTabs(document.getElementById("cal-tabs"), () => render());

// ---------- Filters ----------
const filters = document.getElementById("cal-filters");
filters.innerHTML = Object.entries(EVENT_GROUPS).map(([key, label]) =>
  `<button class="chip" type="button" data-group="${key}" aria-pressed="${active.has(key)}"><span class="bullet bullet--${key}">${BADGE[key]}</span>${label}</button>`).join("");
filters.addEventListener("click", (e) => {
  const chip = e.target.closest("[data-group]");
  if (!chip) return;
  const g = chip.dataset.group;
  active.has(g) ? active.delete(g) : active.add(g);
  chip.setAttribute("aria-pressed", String(active.has(g)));
  store.set("valv-cal-groups", [...active]);
  render();
});

// ---------- Month grid ----------
const grid = document.getElementById("cal-grid");
const monthLabel = document.getElementById("cal-month-label");

function renderMonth() {
  const first = `${month}-01`;
  monthLabel.textContent = formatDate(first, { month: "long", year: "numeric" });
  // grid starts on the Monday on or before the 1st
  const start = addDays(first, -((dateFromIso(first).getUTCDay() + 6) % 7));
  const cells = [];
  ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].forEach((d) => cells.push(`<div class="month__dow" aria-hidden="true">${d}</div>`));
  for (let i = 0; i < 42; i++) {
    const iso = addDays(start, i);
    if (i === 35 && iso.slice(0, 7) !== month) break; // drop an all-next-month last row
    const evs = eventsOn(iso);
    const weekend = i % 7 > 4;
    const cls = ["month__day", iso.slice(0, 7) !== month ? "is-other" : "", weekend ? "is-weekend" : "", iso === today ? "is-today" : ""].join(" ");
    const shown = evs.slice(0, 2);
    cells.push(`<div class="${cls}">
      <p class="month__num"><span>${dateFromIso(iso).getUTCDate()}</span>${i % 7 === 0 ? `<small title="Week number">w${isoWeek(iso)}</small>` : ""}</p>
      ${shown.map((e) => `<button type="button" class="ev ${e.group === "holiday" ? "ev--holiday" : ""}" style="--c:var(--line-${e.group === "all" ? "all" : e.group})" data-event="${e.id}" aria-pressed="${e.id === selectedId}" aria-label="${esc(e.title)}, ${formatDate(iso, { weekday: "long", day: "numeric", month: "long" })}">${esc(e.title)}</button>`).join("")}
      ${evs.length > 2 ? `<p class="month__more">+${evs.length - 2} more</p>` : ""}
    </div>`);
  }
  grid.innerHTML = cells.join("");
  renderDetail();
}

grid.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-event]");
  if (!btn) return;
  selectedId = btn.dataset.event;
  history.replaceState(null, "", `#${selectedId}`);
  grid.querySelectorAll("[data-event]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.event === selectedId)));
  renderDetail();
  // on narrow screens the details sit under the grid: bring them into view
  if (window.matchMedia("(max-width: 1080px)").matches) document.getElementById("cal-detail").scrollIntoView({ behavior: "smooth", block: "nearest" });
});

document.querySelectorAll("[data-month]").forEach((b) => b.addEventListener("click", () => {
  const d = dateFromIso(`${month}-01`);
  d.setUTCMonth(d.getUTCMonth() + Number(b.dataset.month));
  month = d.toISOString().slice(0, 7);
  renderMonth();
}));
document.getElementById("cal-today").addEventListener("click", () => { month = today.slice(0, 7); renderMonth(); });

// ---------- Details panel ----------
const detail = document.getElementById("cal-detail");

function rangeText(e) {
  if (!e.end) return formatDate(e.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return `${formatDate(e.date, { day: "numeric", month: "long" })} – ${formatDate(e.end, { day: "numeric", month: "long", year: "numeric" })}`;
}

function renderDetail() {
  const e = EVENTS.find((x) => x.id === selectedId);
  if (!e) {
    const inMonth = visible().filter((x) => x.date.slice(0, 7) === month || (x.end || x.date).slice(0, 7) === month);
    detail.innerHTML = `<p class="detail__date">${formatDate(`${month}-01`, { month: "long", year: "numeric" })}</p>
      <h3>${inMonth.length ? `${inMonth.length} event${inMonth.length > 1 ? "s" : ""} this month` : "A quiet month"}</h3>
      <p class="detail__empty">${inMonth.length ? "Pick an event in the calendar to see the details." : "Nothing for the groups you've chosen. Try turning on more groups above."}</p>`;
    return;
  }
  detail.innerHTML = `<p class="detail__date">${rangeText(e)}</p>
    <h3>${esc(e.title)}</h3>
    <p>${esc(e.text)}</p>
    <dl>
      <dt>For</dt><dd><span class="bullet bullet--${e.group}">${BADGE[e.group]}</span> ${EVENT_GROUPS[e.group]}</dd>
      ${e.time ? `<dt>Time</dt><dd class="tnum">${esc(e.time)}</dd>` : ""}
      ${e.place ? `<dt>Where</dt><dd>${esc(e.place)}</dd>` : ""}
    </dl>
    <button class="btn btn--paint btn--small" type="button" data-ics="${e.id}"><svg class="icon" aria-hidden="true"><use href="#i-cal"/></svg>Add to my calendar</button>`;
}

// ---------- .ics export: works with Google, Apple and Outlook calendars ----------
detail.addEventListener("click", (ev) => {
  const btn = ev.target.closest("[data-ics]");
  if (!btn) return;
  const e = EVENTS.find((x) => x.id === btn.dataset.ics);
  const ymd = (iso) => iso.replaceAll("-", "");
  const endExclusive = addDays(e.end || e.date, 1);
  const escIcs = (s) => s.replace(/[\\,;]/g, (c) => `\\${c}`);
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Valvskolan//Calendar//EN",
    "BEGIN:VEVENT",
    `UID:${e.id}@valvskolan.example`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${ymd(e.date)}`,
    `DTEND;VALUE=DATE:${ymd(endExclusive)}`,
    `SUMMARY:${escIcs(e.title)}`,
    `DESCRIPTION:${escIcs(`${e.time ? `${e.time}. ` : ""}${e.text}`)}`,
    e.place ? `LOCATION:${escIcs(e.place)}` : "",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `valvskolan-${e.id}.ics` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// ---------- List view ----------
const agenda = document.getElementById("cal-agenda");
function renderAgenda() {
  const list = visible();
  if (!list.length) {
    agenda.innerHTML = `<div class="empty"><strong>No events to show.</strong><p>Every group is switched off. Turn one on above.</p></div>`;
    return;
  }
  const byMonth = new Map();
  list.forEach((e) => {
    const key = e.date.slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key).push(e);
  });
  agenda.innerHTML = [...byMonth].map(([key, evs]) => `<section>
    <h3>${formatDate(`${key}-01`, { month: "long", year: "numeric" })}</h3>
    <ol>${evs.map((e) => `<li class="${(e.end || e.date) < today ? "is-past" : ""}" id="list-${e.id}">
      <span class="when">${e.end ? `${formatDate(e.date, { day: "numeric", month: "short" })}–${formatDate(e.end, { day: "numeric", month: "short" })}` : formatDate(e.date)}</span>
      <div><strong>${esc(e.title)}</strong><p>${esc(e.text)}${e.time ? ` <span class="tnum">${esc(e.time)}</span>` : ""}${e.place ? `, ${esc(e.place)}` : ""}</p></div>
      <span class="bullet bullet--${e.group}" title="${EVENT_GROUPS[e.group]}">${BADGE[e.group]}</span>
    </li>`).join("")}</ol>
  </section>`).join("");
}

function render() {
  renderMonth();
  renderAgenda();
}
render();
