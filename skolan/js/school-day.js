// =========================================================
// "What happens on a school day": shared by the home board,
// the timetable and the lunch menu.
// =========================================================

import { EVENTS, MENU_WEEKS } from "./data.js";
import { stockholmNow, addDays, dateFromIso, isoWeek, formatDate } from "./common.js";

/** The holiday covering `iso`, if any. */
export function holidayOn(iso) {
  return EVENTS.find((e) => e.group === "holiday" && iso >= e.date && iso <= (e.end || e.date));
}

const isWeekend = (iso) => [0, 6].includes(dateFromIso(iso).getUTCDay());
export const isSchoolDay = (iso) => !isWeekend(iso) && !holidayOn(iso);

/** Next school day on or after `iso`. */
export function nextSchoolDay(iso) {
  let d = iso;
  for (let i = 0; i < 40 && !isSchoolDay(d); i++) d = addDays(d, 1);
  return d;
}

/** Monday = 0 … Friday = 4 */
export const weekdayOf = (iso) => (dateFromIso(iso).getUTCDay() + 6) % 7;

/** The lunch menu for a date (four-week rotation by ISO week). */
export function menuFor(iso) {
  const week = MENU_WEEKS[isoWeek(iso) % MENU_WEEKS.length];
  return week[weekdayOf(iso)];
}

/**
 * Which day the home board should show, and a label for it.
 * After the last bell (16:00) the board moves on to the next school day.
 */
export function boardDay(now = stockholmNow()) {
  const afterSchool = now.minutes >= 16 * 60;
  const start = afterSchool ? addDays(now.iso, 1) : now.iso;
  const day = nextSchoolDay(start);
  const isToday = day === now.iso;
  const holiday = !isToday ? holidayOn(now.iso) : null;
  let label;
  if (isToday) label = `Today, ${formatDate(day, { weekday: "long", day: "numeric", month: "long" })}`;
  else if (day === addDays(now.iso, 1)) label = `Tomorrow, ${formatDate(day, { weekday: "long", day: "numeric", month: "long" })}`;
  else label = formatDate(day, { weekday: "long", day: "numeric", month: "long" });
  return { iso: day, isToday, label, holiday };
}
