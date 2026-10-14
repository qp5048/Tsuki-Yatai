// =========================================================
// Order basket: a tiny store + the slide-out drawer UI.
// The basket is saved in localStorage, so it survives a reload.
// Checkout is a demo: nothing is sent anywhere.
// =========================================================

import { formatPrice, photo } from "./data.js";

const STORAGE_KEY = "tsuki-yatai-order-v1";

// ---------- Store ----------
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return []; // private mode or blocked storage: start empty
  }
}
function save(items) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* ignore */ }
}

let items = load();
const listeners = new Set();
const emit = () => { save(items); listeners.forEach((fn) => fn(items)); };

export const cart = {
  get items() { return items; },
  count: () => items.reduce((n, i) => n + i.qty, 0),
  total: () => items.reduce((sum, i) => sum + i.price * i.qty, 0),
  /** item: { id, name, price, img?, details? } */
  add(item, qty = 1) {
    const found = items.find((i) => i.id === item.id);
    if (found) found.qty = Math.min(found.qty + qty, 20);
    else items = [...items, { ...item, qty }];
    emit();
  },
  setQty(id, qty) {
    items = qty <= 0 ? items.filter((i) => i.id !== id) : items.map((i) => (i.id === id ? { ...i, qty: Math.min(qty, 20) } : i));
    emit();
  },
  clear() { items = []; emit(); },
  subscribe(fn) { listeners.add(fn); fn(items); return () => listeners.delete(fn); },
};

// ---------- Toast ("Added to your order") ----------
let toastTimer;
export function toast(message, { action } = {}) {
  const el = document.getElementById("toast");
  el.innerHTML = "";
  const text = document.createElement("span");
  text.textContent = message;
  el.append(text);
  if (action) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = action.label;
    btn.addEventListener("click", () => { hide(); action.onClick(); });
    el.append(btn);
  }
  el.hidden = false;
  window.gsap?.fromTo(el, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power3.out" });
  clearTimeout(toastTimer);
  toastTimer = setTimeout(hide, 3200);
  function hide() {
    if (!window.gsap) { el.hidden = true; return; }
    window.gsap.to(el, { y: 20, opacity: 0, duration: 0.25, onComplete: () => { el.hidden = true; } });
  }
}

// ---------- Drawer UI ----------
export function setupCart({ lenis }) {
  const drawer = document.getElementById("cart");
  const backdrop = document.getElementById("cart-backdrop");
  const list = document.getElementById("cart-list");
  const empty = document.getElementById("cart-empty");
  const foot = document.getElementById("cart-foot");
  const totalEl = document.getElementById("cart-total");
  const pickup = document.getElementById("cart-pickup");
  const basketView = document.getElementById("cart-basket");
  const trackView = document.getElementById("cart-tracking");
  let lastFocus = null;

  // Pickup times: "As soon as possible" + 15-minute slots for the next 2 hours
  function fillPickupTimes() {
    const now = new Date();
    const start = new Date(now.getTime() + 30 * 60000);
    start.setMinutes(Math.ceil(start.getMinutes() / 15) * 15, 0, 0);
    pickup.innerHTML = '<option value="asap">As soon as possible (~20 min)</option>';
    for (let i = 0; i < 8; i++) {
      const t = new Date(start.getTime() + i * 15 * 60000);
      const label = t.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      pickup.insertAdjacentHTML("beforeend", `<option value="${label}">${label}</option>`);
    }
  }

  function render() {
    const count = cart.count();
    document.querySelectorAll("[data-cart-count]").forEach((el) => {
      el.textContent = count;
      el.toggleAttribute("data-zero", count === 0);
    });

    empty.hidden = items.length > 0;
    foot.hidden = items.length === 0;
    list.hidden = items.length === 0;
    totalEl.textContent = formatPrice(cart.total());

    list.innerHTML = items.map((item) => `
      <li class="cart-item" data-id="${item.id}">
        ${item.img
          ? `<img class="cart-item__img" src="${photo(item.img, 160)}" alt="" loading="lazy">`
          : `<span class="cart-item__img cart-item__img--bowl" aria-hidden="true">月</span>`}
        <p class="cart-item__name">${escapeHtml(item.name)}</p>
        <p class="cart-item__price">${formatPrice(item.price * item.qty)}</p>
        <div class="cart-item__row">
          ${item.details ? `<p class="cart-item__details">${escapeHtml(item.details)}</p>` : "<span></span>"}
          <div class="stepper" role="group" aria-label="Quantity of ${escapeHtml(item.name)}">
            <button type="button" data-step="-1" aria-label="One less">−</button>
            <output>${item.qty}</output>
            <button type="button" data-step="1" aria-label="One more">+</button>
          </div>
        </div>
      </li>`).join("");
  }

  list.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-step]");
    if (!btn) return;
    const id = btn.closest(".cart-item").dataset.id;
    const item = items.find((i) => i.id === id);
    if (item) cart.setQty(id, item.qty + Number(btn.dataset.step));
  });

  cart.subscribe(render);

  // Little bounce on the counter when something is added
  const origAdd = cart.add.bind(cart);
  cart.add = (item, qty) => {
    origAdd(item, qty);
    window.gsap?.fromTo("[data-cart-count]", { scale: 1.6 }, { scale: 1, duration: 0.5, ease: "back.out(3)" });
  };

  // ---- open / close ----
  function open() {
    lastFocus = document.activeElement;
    fillPickupTimes();
    showView("basket");
    backdrop.hidden = false;
    requestAnimationFrame(() => backdrop.classList.add("is-open"));
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    // focus once the drawer is visible (it starts with visibility: hidden)
    setTimeout(() => drawer.querySelector("[data-close-cart]").focus({ preventScroll: true }), 60);
    lenis?.stop();
    document.addEventListener("keydown", onKey);
  }
  function close() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    backdrop.classList.remove("is-open");
    setTimeout(() => { backdrop.hidden = true; }, 350);
    lenis?.start();
    document.removeEventListener("keydown", onKey);
    lastFocus?.focus?.({ preventScroll: true });
  }
  function onKey(e) {
    if (e.key === "Escape") close();
    // keep keyboard focus inside the drawer
    if (e.key === "Tab") {
      const focusables = [...drawer.querySelectorAll("button, select, a[href], input")].filter((el) => el.offsetParent);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  document.querySelectorAll("[data-open-cart]").forEach((b) => b.addEventListener("click", open));
  drawer.querySelectorAll("[data-close-cart]").forEach((b) => b.addEventListener("click", close));
  backdrop.addEventListener("click", close);

  // ---- checkout (demo) + order tracking ----
  function showView(name) {
    basketView.hidden = name !== "basket";
    trackView.hidden = name !== "tracking";
  }

  let trackTimers = [];
  document.getElementById("cart-checkout").addEventListener("click", () => {
    if (!items.length) return;
    const number = `TY-${Math.floor(1000 + Math.random() * 9000)}`;
    document.getElementById("track-number").textContent = number;
    const when = pickup.value === "asap" ? "in about 20 minutes" : `at ${pickup.value}`;
    document.getElementById("track-eta").textContent = `Ready ${when}`;
    showView("tracking");

    // walk through the steps so the flow feels alive
    const steps = [...document.querySelectorAll("#track-steps li")];
    steps.forEach((s) => s.classList.remove("is-done", "is-current"));
    trackTimers.forEach(clearTimeout);
    trackTimers = steps.map((step, i) => setTimeout(() => {
      steps.forEach((s, k) => {
        s.classList.toggle("is-done", k <= i);
        s.classList.toggle("is-current", k === i + 1);
      });
    }, 600 + i * 2200));
  });

  document.getElementById("track-done").addEventListener("click", () => {
    trackTimers.forEach(clearTimeout);
    cart.clear();
    close();
    toast("Thanks! Your demo order is complete.");
  });

  return { open, close };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
