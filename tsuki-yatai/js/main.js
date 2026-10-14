// =========================================================
// Tsuki Yatai — main script
//   1. Smooth scrolling (Lenis) + GSAP ScrollTrigger
//   2. Preloader and the hero 3D scene
//   3. Hero scroll animation (pin + scrub)
//   4. Menu, bowl builder, order basket (separate modules)
//   5. Gallery, story parallax, open-now status
//   6. Table booking and dialogs
// =========================================================

import { GALLERY, HOURS, photo } from "./data.js";
import { setupCart } from "./cart.js";
import { setupMenu } from "./menu.js";

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const hasGSAP = Boolean(gsap && ScrollTrigger);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;

// Always start at the top so the hero animation begins from frame one
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);

if (hasGSAP) {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true }); // phone address bars resize the window
  root.classList.add("js-anim");
}

// Hero state. The real objects come from bowl3d.js; these are stand-ins
// in case the 3D module fails to load.
let bowlState = { rotY: 0, tilt: 0, scale: 1, x: 0, y: 0, opacity: 1 };
let introState = { rotY: 0, scale: 1, lift: 0 };
let heroScene = null;

// ---------------------------------------------------------
// 1. SMOOTH SCROLLING
// ---------------------------------------------------------
// Mouse wheel is smoothed by Lenis; touch keeps the phone's native scrolling.
let lenis = null;
if (window.Lenis && !reduceMotion) {
  lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.stop(); // while the preloader is up
  if (hasGSAP) {
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
}

function scrollToTarget(selector) {
  const target = selector === "#top" ? 0 : document.querySelector(selector);
  if (target === null) return;
  const offset = selector === "#top" ? 0 : -parseInt(getComputedStyle(root).getPropertyValue("--top-h"), 10) + 10;
  if (lenis) {
    lenis.scrollTo(target, { offset, duration: 1.4 });
  } else {
    const y = target === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
  }
}
document.addEventListener("click", (e) => {
  const link = e.target.closest("[data-scroll-to]");
  if (!link) return;
  e.preventDefault();
  // let a closing drawer give scrolling back first
  setTimeout(() => scrollToTarget(link.dataset.scrollTo), link.closest(".drawer") ? 60 : 0);
});

// Header gets a solid background once you scroll
const siteTop = document.getElementById("site-top");
const onScroll = () => siteTop.classList.toggle("is-scrolled", window.scrollY > 40);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ---------------------------------------------------------
// 2. PRELOADER + HERO 3D
// ---------------------------------------------------------
const preloader = document.getElementById("preloader");
const bar = document.getElementById("preloader-bar");
const setProgress = (p) => { bar.style.width = `${Math.round(p * 100)}%`; };

// Split the hero title into letters for the intro
document.querySelectorAll(".hero__line").forEach((line) => {
  line.innerHTML = [...line.textContent].map((ch) => `<span class="char">${ch}</span>`).join("");
});

async function boot() {
  const started = performance.now();
  setProgress(0.1);

  // The 3D module is loaded dynamically: if the CDN is down,
  // the site still opens with a picture instead of 3D.
  try {
    const hero = await import("./bowl3d.js");
    bowlState = hero.bowlState;
    introState = hero.introState;
    heroScene = await hero.createBowlScene({
      canvas: document.getElementById("bowl-canvas"),
      fallbackEl: document.getElementById("bowl-fallback"),
      onProgress: (p) => setProgress(0.1 + p * 0.8),
    });
  } catch (err) {
    console.warn("3D could not load, showing an image instead.", err);
    document.getElementById("bowl-canvas").hidden = true;
    document.getElementById("bowl-fallback").hidden = false;
  }

  await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 3000))]);
  setProgress(1);
  await new Promise((r) => setTimeout(r, Math.max(0, 700 - (performance.now() - started))));

  preloader.classList.add("is-hidden");
  root.classList.remove("is-loading");
  lenis?.start();

  // ScrollTriggers are created in page order, so pins push later sections correctly
  const cartUI = setupCart({ lenis });
  setupHeroScroll();
  setupMenu({ gsap: hasGSAP ? gsap : null, ScrollTrigger, reduceMotion, openCart: cartUI.open, openDialog });
  setupGallery();
  setupAbout();
  playIntro();
  lazyBuilder(cartUI);
  if (hasGSAP) ScrollTrigger.refresh();
}

// The bowl builder (a second 3D scene) loads only when you get close to it
function lazyBuilder(cartUI) {
  const section = document.getElementById("builder");
  const io = new IntersectionObserver(async ([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    try {
      const { setupBuilder } = await import("./builder.js");
      setupBuilder({ openCart: cartUI.open, reduceMotion });
      if (hasGSAP) ScrollTrigger.refresh(); // the builder's options changed the page height
    } catch (err) {
      console.warn("Bowl builder could not load.", err);
    }
  }, { rootMargin: "800px 0px" });
  io.observe(section);
}

// ---------------------------------------------------------
// 3. HERO: intro + scroll animation
// ---------------------------------------------------------
function playIntro() {
  if (!hasGSAP || reduceMotion) {
    Object.assign(introState, { rotY: 0, scale: 1, lift: 0 });
    return;
  }
  gsap.timeline({ defaults: { ease: "power4.out" } })
    .from(".hero__line .char", { yPercent: 110, opacity: 0, duration: 1.2, stagger: 0.045 }, 0)
    .to(introState, { rotY: 0, scale: 1, lift: 0, duration: 2, ease: "power3.out" }, 0)
    .from([".hero__slogan", ".hero__hint", ".hero__kanji"], { opacity: 0, y: 20, duration: 1, stagger: 0.12 }, 0.5)
    .from(".site-header", { opacity: 0, y: -20, duration: 0.8 }, 0.3);
}

function setupHeroScroll() {
  if (!hasGSAP) return;
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: "#hero",
      start: "top top",
      end: () => "+=" + window.innerHeight * 2.4,
      pin: true,
      scrub: 1, // smooth inertia
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => heroScene?.setActive(self.progress < 0.999),
      onLeave: () => heroScene?.setActive(false),
      onEnterBack: () => heroScene?.setActive(true),
    },
  });

  // Phase 1: a full turn, tilting towards you and moving closer
  tl.to(bowlState, { rotY: Math.PI * 2, duration: 0.62 }, 0)
    .to(bowlState, { tilt: 0.38, scale: 1.18, duration: 0.62, ease: "sine.inOut" }, 0)
    .to(".hero__line--1", { yPercent: -120, opacity: 0, duration: 0.34 }, 0)
    .to(".hero__line--2", { yPercent: -90, opacity: 0, duration: 0.4 }, 0.04)
    .to("#hero-hint", { opacity: 0, duration: 0.06 }, 0)
    .to(["#hero-slogan", ".hero__kanji"], { opacity: 0, duration: 0.18 }, 0.04)
    // Phase 2: the bowl shrinks and drifts away, revealing the menu
    .to(bowlState, { scale: 0.32, y: 2.8, tilt: 0.1, duration: 0.38, ease: "power2.in" }, 0.62)
    .to(bowlState, { opacity: 0, duration: 0.14 }, 0.86)
    .to(".hero__glow", { opacity: 0.25, duration: 0.38 }, 0.62);
}

// ---------------------------------------------------------
// 5. GALLERY: pinned horizontal scroll on desktop, swipe strip on phones
// ---------------------------------------------------------
function setupGallery() {
  const track = document.getElementById("gallery-track");
  track.innerHTML = GALLERY.map((g) => `
    <figure class="shot">
      <div class="shot__frame">
        <img src="${photo(g.img, 900)}" srcset="${photo(g.img, 600)} 600w, ${photo(g.img, 900)} 900w"
          sizes="(max-width: 760px) 78vw, 32vw" alt="${g.caption}" loading="lazy" decoding="async">
      </div>
      <figcaption>${g.caption}</figcaption>
    </figure>`).join("");

  if (!hasGSAP || reduceMotion) return;

  ScrollTrigger.matchMedia({
    "(min-width: 761px)": () => {
      const distance = () => track.scrollWidth - window.innerWidth + track.getBoundingClientRect().left;
      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: "#gallery",
          start: "top top",
          end: () => "+=" + distance(),
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });
      // photos drift inside their frames while the strip moves
      track.querySelectorAll(".shot img").forEach((img) => {
        gsap.fromTo(img, { xPercent: -6 }, {
          xPercent: 6,
          ease: "none",
          scrollTrigger: { trigger: img.closest(".shot"), containerAnimation: tween, start: "left right", end: "right left", scrub: true },
        });
      });
    },
  });
}

function setupAbout() {
  if (!hasGSAP || reduceMotion) return;
  gsap.fromTo("#about-img", { yPercent: -10 }, {
    yPercent: 0,
    ease: "none",
    scrollTrigger: { trigger: ".about__media", start: "top bottom", end: "bottom top", scrub: true },
  });
}

// ---------------------------------------------------------
// Open now / closed, in Stockholm time
// ---------------------------------------------------------
function stockholmNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Stockholm", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, hour: Number(get("hour")) + Number(get("minute")) / 60 };
}

const fmtHour = (h) => `${String(Math.floor(h) % 24).padStart(2, "0")}:00`;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function updateStatus() {
  const { day, hour } = stockholmNow();
  const today = HOURS[day];
  const yesterday = HOURS[(day + 6) % 7];
  let open = false;
  let text;

  if (yesterday.close > 24 && hour < yesterday.close - 24) {
    open = true;
    text = `Open now · until ${fmtHour(yesterday.close)}`;
  } else if (today.open !== null && hour >= today.open && hour < today.close) {
    open = true;
    text = `Open now · until ${fmtHour(today.close)}`;
  } else if (today.open !== null && hour < today.open) {
    text = `Closed · opens today at ${fmtHour(today.open)}`;
  } else {
    // find the next opening day
    for (let i = 1; i <= 7; i++) {
      const next = HOURS[(day + i) % 7];
      if (next.open !== null) {
        text = `Closed · opens ${i === 1 ? "tomorrow" : DAY_NAMES[(day + i) % 7]} at ${fmtHour(next.open)}`;
        break;
      }
    }
  }

  document.querySelectorAll("[data-open-status]").forEach((el) => {
    el.textContent = text;
    el.classList.toggle("is-open", open);
    el.classList.toggle("is-closed", !open);
    el.hidden = false;
  });
  document.querySelectorAll("#hours-list [data-days]").forEach((el) => {
    el.classList.toggle("is-today", el.dataset.days.split(",").map(Number).includes(day));
  });
}
updateStatus();
setInterval(updateStatus, 60000);

// ---------------------------------------------------------
// 6. DIALOGS: booking and "about this project"
// ---------------------------------------------------------
document.querySelectorAll("dialog").forEach((dialog) => {
  dialog.addEventListener("close", () => lenis?.start());
  // click on the dimmed backdrop closes the dialog
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
  dialog.querySelectorAll("[data-close-dialog]").forEach((b) => b.addEventListener("click", () => dialog.close()));
});
function openDialog(dialog) {
  dialog.showModal();
  lenis?.stop();
}

const projectDialog = document.getElementById("project");
document.querySelectorAll("[data-open-project]").forEach((b) => b.addEventListener("click", () => openDialog(projectDialog)));

// ---------- Booking (demo, nothing is sent) ----------
const booking = document.getElementById("booking");
const form = document.getElementById("booking-form");
const dateInput = document.getElementById("booking-date");
const slotsEl = document.getElementById("booking-slots");
const errorEl = document.getElementById("booking-error");
const doneEl = document.getElementById("booking-done");

const localISO = (d) => {
  const copy = new Date(d);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
};

// Time slots follow the opening hours of the chosen day
function renderSlots() {
  const date = new Date(`${dateInput.value}T12:00`);
  const hours = HOURS[date.getDay()];
  if (!dateInput.value || hours.open === null) {
    slotsEl.innerHTML = `<p class="booking__demo">We're closed on ${dateInput.value ? DAY_NAMES[date.getDay()] + "s" : "that day"}. Pick another date.</p>`;
    return;
  }
  const isToday = dateInput.value === localISO(new Date());
  const nowH = new Date().getHours() + new Date().getMinutes() / 60;
  const slots = [];
  for (let h = hours.open; h <= Math.min(hours.close, 24) - 1.5; h += 0.5) slots.push(h);
  // a couple of slots are "taken" so the grid looks real (seeded by the date)
  const seed = date.getDate();
  slotsEl.innerHTML = slots.map((h, i) => {
    const label = `${String(Math.floor(h)).padStart(2, "0")}:${h % 1 ? "30" : "00"}`;
    const taken = (i * 7 + seed) % 5 === 0 || (isToday && h <= nowH + 0.5);
    return `<label class="slot"><input type="radio" name="time" value="${label}" ${taken ? "disabled" : ""}><span>${label}</span></label>`;
  }).join("");
  const firstFree = slotsEl.querySelector("input:not(:disabled)");
  if (firstFree) firstFree.checked = true;
}

function openBooking() {
  form.reset();
  form.classList.remove("is-done");
  doneEl.hidden = true;
  errorEl.hidden = true;
  form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
  dateInput.min = localISO(new Date());
  // default: today, or tomorrow if today is closed
  const d = new Date();
  if (HOURS[d.getDay()].open === null) d.setDate(d.getDate() + 1);
  dateInput.value = localISO(d);
  renderSlots();
  openDialog(booking);
}
document.querySelectorAll("[data-open-booking]").forEach((b) => b.addEventListener("click", openBooking));
dateInput.addEventListener("change", renderSlots);

form.addEventListener("submit", (e) => {
  e.preventDefault(); // nothing is actually sent
  const data = new FormData(form);
  const name = data.get("name").trim();
  const phone = data.get("phone").trim();
  const problems = [];
  form.querySelector('[name="name"]').setAttribute("aria-invalid", String(!name));
  form.querySelector('[name="phone"]').setAttribute("aria-invalid", String(phone.replace(/\D/g, "").length < 6));
  if (!name) problems.push("your name");
  if (phone.replace(/\D/g, "").length < 6) problems.push("a phone number");
  if (!data.get("time")) problems.push("a time");
  if (problems.length) {
    errorEl.textContent = `Please add ${problems.join(" and ")}.`;
    errorEl.hidden = false;
    return;
  }
  errorEl.hidden = true;
  const guests = Number(data.get("guests"));
  const dateText = new Date(`${data.get("date")}T12:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  document.getElementById("booking-summary").textContent =
    `${name}, a table for ${guests} on ${dateText} at ${data.get("time")}.`;
  form.classList.add("is-done");
  doneEl.hidden = false;
});

// ---------------------------------------------------------
boot();
