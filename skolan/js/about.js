// =========================================================
// "Our school" page: tabs (with #hash deep links), staff
// directory with filters, and school-visit booking.
// =========================================================

import { STAFF, LINES, staffEmail, VISIT_TIMES } from "./data.js";
import { stockholmNow, addDays, formatDate, dateFromIso, setupTabs, store, toast, esc } from "./common.js";
import { holidayOn } from "./school-day.js";

// ---------- Tabs: about.html#staff, #find, #visit ----------
const HASH = { "tab-school": "", "tab-staff": "staff", "tab-find": "find", "tab-visit": "visit" };
const tabs = setupTabs(document.getElementById("about-tabs"), (tab) => {
  history.replaceState(null, "", HASH[tab.id] ? `#${HASH[tab.id]}` : location.pathname);
});
const fromHash = () => {
  const id = Object.keys(HASH).find((k) => HASH[k] && HASH[k] === location.hash.slice(1));
  if (id) tabs.select(id);
};
fromHash();
window.addEventListener("hashchange", fromHash);

// ---------- Staff directory ----------
const FILTERS = { all: "Everyone", low: "Years F–3", mid: "Years 4–6", high: "Years 7–9" };
let staffLine = "all";
const staffList = document.getElementById("staff-list");
const staffSearch = document.getElementById("staff-search");
const staffFilters = document.getElementById("staff-filters");

staffFilters.innerHTML = Object.entries(FILTERS).map(([k, label]) =>
  `<button class="chip" type="button" data-line="${k}" aria-pressed="${k === staffLine}">${k === "all" ? "" : `<span class="bullet bullet--${k}">${LINES[k].short}</span>`}${label}</button>`).join("");
staffFilters.querySelector('[data-line="all"]').style.paddingLeft = ".9em";

const initials = (name) => name.split(" ").map((p) => p[0]).join("").slice(0, 2);

function renderStaff() {
  const q = staffSearch.value.trim().toLowerCase();
  // "all" staff (principal, nurse…) show under every line, since every family meets them
  const list = STAFF.filter((s) => (staffLine === "all" || s.line === staffLine || s.line === "all")
    && (!q || `${s.name} ${s.role} ${s.subjects}`.toLowerCase().includes(q)));
  document.getElementById("staff-count").textContent = `${list.length} of ${STAFF.length} people`;
  staffList.innerHTML = list.length ? list.map((s) => `<li>
    <span class="bullet bullet--${s.line}" aria-hidden="true">${initials(s.name)}</span>
    <strong>${esc(s.name)}</strong>
    <span>${esc(s.role)} · ${esc(s.subjects)}</span>
    <a href="mailto:${staffEmail(s.name)}">${staffEmail(s.name)}</a>
  </li>`).join("") : `<li style="display:block;border:0"><div class="empty"><strong>Nobody matches "${esc(staffSearch.value)}".</strong><p>Try a first name or a subject, like "maths".</p></div></li>`;
}
staffFilters.addEventListener("click", (e) => {
  const chip = e.target.closest("[data-line]");
  if (!chip) return;
  staffLine = chip.dataset.line;
  staffFilters.querySelectorAll("[data-line]").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
  renderStaff();
});
staffSearch.addEventListener("input", renderStaff);
renderStaff();

// ---------- Book a visit (demo: stays in this browser) ----------
const KEY = "valv-visits";
const form = document.getElementById("visit-form");
const slotsEl = document.getElementById("visit-slots");
const listEl = document.getElementById("visit-list");
let visits = store.get(KEY, []);

// Tuesdays and Thursdays over the next four weeks, skipping breaks
function openSlots() {
  const today = stockholmNow().iso;
  const out = [];
  for (let i = 1; i <= 28; i++) {
    const iso = addDays(today, i);
    const dow = dateFromIso(iso).getUTCDay();
    if ((dow === 2 || dow === 4) && !holidayOn(iso)) VISIT_TIMES.forEach((t) => out.push({ iso, time: t }));
  }
  return out.slice(0, 12);
}

function renderSlots() {
  const taken = new Set(visits.map((v) => `${v.iso} ${v.time}`));
  slotsEl.innerHTML = openSlots().map(({ iso, time }, i) => {
    const id = `slot-${i}`;
    const booked = taken.has(`${iso} ${time}`);
    return `<label class="slot" for="${id}">
      <input type="radio" name="slot" id="${id}" value="${iso} ${time}" ${booked ? "disabled" : ""}>
      <span><b>${formatDate(iso, { weekday: "short", day: "numeric", month: "short" })}</b>${time}${booked ? " · booked" : ""}</span>
    </label>`;
  }).join("");
}

function renderVisits() {
  listEl.innerHTML = visits.length
    ? `<ol>${visits.map((v, i) => `<li>
        <b>${formatDate(v.iso, { weekday: "short", day: "numeric", month: "short" })} ${v.time}</b>
        <button type="button" data-cancel="${i}" aria-label="Cancel the visit on ${formatDate(v.iso, { weekday: "long", day: "numeric", month: "long" })}">Cancel</button>
        <span>${esc(v.name)} · ${esc(v.year)}</span>
      </li>`).join("")}</ol>`
    : "<p>No visits booked yet. Pick a morning on the left.</p>";
}

listEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-cancel]");
  if (!btn) return;
  const [v] = visits.splice(Number(btn.dataset.cancel), 1);
  store.set(KEY, visits);
  renderVisits();
  renderSlots();
  toast(`Visit on ${formatDate(v.iso, { weekday: "long", day: "numeric", month: "long" })} cancelled`);
});

function showError(id, show) {
  document.getElementById(id).hidden = !show;
}

form.addEventListener("submit", (e) => {
  e.preventDefault(); // nothing is sent anywhere
  const data = new FormData(form);
  const slot = data.get("slot");
  const name = String(data.get("name") || "").trim();
  const email = String(data.get("email") || "").trim();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  showError("err-slot", !slot);
  showError("err-name", !name);
  showError("err-email", !emailOk);
  form.querySelector("#visit-name").setAttribute("aria-invalid", String(!name));
  form.querySelector("#visit-email").setAttribute("aria-invalid", String(!emailOk));
  if (!slot || !name || !emailOk) {
    form.querySelector(!slot ? "#visit-slots input:not(:disabled)" : !name ? "#visit-name" : "#visit-email")?.focus();
    return;
  }

  const [iso, time] = slot.split(" ");
  const yearSelect = form.querySelector("#visit-year");
  visits = [...visits, { iso, time, name, email, year: yearSelect.options[yearSelect.selectedIndex].text }]
    .sort((a, b) => `${a.iso}${a.time}`.localeCompare(`${b.iso}${b.time}`));
  store.set(KEY, visits);
  form.reset();
  renderSlots();
  renderVisits();
  toast(`Booked: ${formatDate(iso, { weekday: "long", day: "numeric", month: "long" })} at ${time}. See you then!`);
});

renderSlots();
renderVisits();
