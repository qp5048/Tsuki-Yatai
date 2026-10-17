// =========================================================
// Home page: the live departure board, this week's lunch,
// upcoming events and the latest news.
// =========================================================

import { CLASSES, DEFAULT_CLASS, LINES, EVENTS, EVENT_GROUPS, NEWS, photo, lessonsFor } from "./data.js";
import { stockholmNow, toMinutes, formatDate, isoWeek, mondayOf, addDays, savedClass, saveClass, esc } from "./common.js";
import { boardDay, menuFor, weekdayOf, holidayOn } from "./school-day.js";

// ---------- Departure board ----------
const select = document.getElementById("board-class");
const rows = document.getElementById("board-rows");
const clock = document.getElementById("board-clock");

// Class picker grouped by metro line
select.innerHTML = Object.values(LINES).map((line) => `
  <optgroup label="${line.name}, ${line.stage}">
    ${CLASSES.filter((c) => c.line === line.id).map((c) => `<option value="${c.id}">${c.id}</option>`).join("")}
  </optgroup>`).join("");
select.value = savedClass(DEFAULT_CLASS);
if (!select.value) select.value = DEFAULT_CLASS;

function renderBoard(flip = false) {
  const now = stockholmNow();
  clock.textContent = now.time;
  const day = boardDay(now);
  const lessons = lessonsFor(select.value, weekdayOf(day.iso));

  const intro = day.holiday
    ? `<li class="board__note"><strong>${esc(day.holiday.title)}.</strong> No school until ${esc(day.label)}.</li>`
    : `<li class="board__note">${esc(day.label)}</li>`;

  rows.innerHTML = intro + lessons.map((l) => {
    let state = "";
    if (day.isToday) {
      if (now.minutes >= toMinutes(l.end)) state = "is-past";
      else if (now.minutes >= toMinutes(l.start)) state = "is-now";
    }
    const where = l.kind === "lunch" ? "Dining hall" : l.room;
    return `<li class="board__row ${state}">
      <span class="board__time">${l.start}</span>
      <span class="board__what">${esc(l.name)}${state === "is-now" ? '<span class="tag-now">Now</span>' : ""}
        ${l.kind === "lesson" ? `<small>${esc(l.teacher)} · until ${l.end}</small>` : `<small>until ${l.end}</small>`}</span>
      <span class="board__where">${esc(where)}</span>
    </li>`;
  }).join("");

  if (flip) {
    rows.classList.remove("is-flipping");
    void rows.offsetWidth; // restart the flap animation
    rows.classList.add("is-flipping");
  }

  // Lunch and the next event for that day
  const menu = menuFor(day.iso);
  document.getElementById("board-lunch").textContent = menu.main;
  const next = EVENTS.find((e) => (e.end || e.date) >= now.iso && e.group !== "holiday") || EVENTS[EVENTS.length - 1];
  document.getElementById("board-event").textContent = `${formatDate(next.date)} · ${next.title}`;
}

select.addEventListener("change", () => {
  saveClass(select.value);
  renderBoard(true);
});
renderBoard();
setInterval(renderBoard, 30_000);

// ---------- Lunch poster for this school week ----------
(function poster() {
  const now = stockholmNow();
  const start = weekdayOf(now.iso) >= 5 || now.day === 0 || now.day === 6 ? addDays(mondayOf(now.iso), 7) : mondayOf(now.iso);
  document.getElementById("poster-week").textContent = `Week ${isoWeek(start)}`;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  document.getElementById("poster-list").innerHTML = days.map((name, i) => {
    const iso = addDays(start, i);
    const holiday = holidayOn(iso);
    const menu = menuFor(iso);
    const today = iso === now.iso;
    return `<li class="${today ? "is-today" : ""}">
      <span class="day">${name}${today ? "<br>today" : ""}</span>
      <span class="dish">${holiday ? `No lunch: ${esc(holiday.title.split(" (")[0].toLowerCase())}` : esc(menu.main)}
        ${holiday ? "" : `<span class="veg">${esc(menu.veg)}</span>`}
        ${!holiday && menu.tradition ? '<span class="tradition">Thursday tradition</span>' : ""}</span>
    </li>`;
  }).join("");
})();

// ---------- Coming up ----------
(function upcoming() {
  const today = stockholmNow().iso;
  const list = EVENTS.filter((e) => (e.end || e.date) >= today).slice(0, 4);
  document.getElementById("home-upcoming").innerHTML = list.map((e) => {
    const d = new Date(`${e.date}T12:00:00Z`);
    return `<li><a href="calendar.html#${e.id}">
      <span class="when"><b>${d.getUTCDate()}</b>${formatDate(e.date, { month: "short" })} · ${formatDate(e.date, { weekday: "short" })}</span>
      <span class="what">${esc(e.title)}</span>
      <span class="bullet bullet--${e.group}">${e.group === "holiday" ? "Break" : e.group === "all" ? "All" : LINES[e.group].short}</span>
    </a></li>`;
  }).join("") || '<li class="empty"><strong>That was the last event this year.</strong></li>';
  // screen readers get the group names in full
  document.querySelectorAll("#home-upcoming .bullet").forEach((b, i) => b.setAttribute("title", EVENT_GROUPS[list[i].group]));
})();

// ---------- Latest news ----------
(function news() {
  const [lead, ...rest] = NEWS;
  document.getElementById("home-news").innerHTML = `
    <a class="story-big" href="news.html?a=${lead.id}">
      <div class="frame"><img src="${photo(lead.img, 1100)}" alt="${esc(lead.alt)}" loading="lazy" width="1100" height="733"></div>
      <p class="meta"><span class="cat">${esc(lead.category)}</span><time datetime="${lead.date}">${formatDate(lead.date, { day: "numeric", month: "long" })}</time></p>
      <h3>${esc(lead.title)}</h3>
      <p class="muted">${esc(lead.lede)}</p>
    </a>
    <ul class="story-list">
      ${rest.slice(0, 3).map((n) => `<li><a href="news.html?a=${n.id}">
        <span class="meta"><span class="cat">${esc(n.category)}</span><time datetime="${n.date}">${formatDate(n.date, { day: "numeric", month: "long" })}</time></span>
        <strong>${esc(n.title)}</strong>
        <span class="muted">${esc(n.lede)}</span>
      </a></li>`).join("")}
      <li><a href="news.html"><strong>All news</strong></a></li>
    </ul>`;
})();
