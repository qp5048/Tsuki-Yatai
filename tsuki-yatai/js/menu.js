// =========================================================
// Menu: category tabs, filters, dish cards and the quick view.
// =========================================================

import { MENU, DISHES, photo, formatPrice } from "./data.js";
import { cart, toast } from "./cart.js";

const TAG_LABELS = { hot: "Spicy", veg: "Vegetarian" };
const ALLERGEN_LABELS = {
  gluten: "Gluten", egg: "Egg", soy: "Soy", sesame: "Sesame", fish: "Fish", crustaceans: "Crustaceans",
  molluscs: "Molluscs", peanuts: "Peanuts", milk: "Milk",
};

export function setupMenu({ gsap, ScrollTrigger, reduceMotion, openCart, openDialog }) {
  const tabsEl = document.getElementById("menu-tabs");
  const panel = document.getElementById("menu-panel");
  const filterBtns = [...document.querySelectorAll("[data-filter]")];
  const animate = Boolean(gsap) && !reduceMotion;

  let current = 0;
  const filters = new Set();
  let revealTriggers = [];

  // ---------- Tabs ----------
  tabsEl.innerHTML = MENU.map((cat, i) => `
    <button class="tab" role="tab" type="button" id="tab-${cat.id}"
      aria-selected="${i === 0}" aria-controls="menu-panel" tabindex="${i === 0 ? 0 : -1}">${cat.title}</button>`).join("");
  const tabs = [...tabsEl.querySelectorAll(".tab")];

  tabs.forEach((tab, i) => tab.addEventListener("click", () => selectCategory(i)));
  // arrow keys move between tabs, as the ARIA tabs pattern expects
  tabsEl.addEventListener("keydown", (e) => {
    const moves = { ArrowRight: 1, ArrowLeft: -1 };
    let next = null;
    if (e.key in moves) next = (current + moves[e.key] + tabs.length) % tabs.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    tabs[next].focus();
    selectCategory(next);
  });

  // ---------- Filters ----------
  filterBtns.forEach((btn) => btn.addEventListener("click", () => {
    const key = btn.dataset.filter;
    filters.has(key) ? filters.delete(key) : filters.add(key);
    btn.setAttribute("aria-pressed", String(filters.has(key)));
    swap();
  }));

  // ---------- Cards ----------
  function cardHtml(d) {
    const tags = d.tags.map((t) => `<span class="tag tag--${t}">${TAG_LABELS[t]}</span>`).join("");
    return `
      <article class="dish reveal" data-id="${d.id}">
        <button type="button" class="dish__media" data-quick="${d.id}" aria-label="View details: ${d.name}">
          <img class="is-loading" src="${photo(d.img, 600)}" srcset="${photo(d.img, 400)} 400w, ${photo(d.img, 600)} 600w, ${photo(d.img, 900)} 900w"
            sizes="(max-width: 560px) 92vw, (max-width: 1024px) 46vw, 380px" alt="${d.name}" loading="lazy" decoding="async"
            onload="this.classList.remove('is-loading')" onerror="this.remove()">
        </button>
        <div class="dish__body">
          <p class="dish__price">${formatPrice(d.price)}</p>
          <h3 class="dish__name">${d.name}</h3>
          <p class="dish__desc">${d.desc}</p>
          <div class="dish__foot">
            <div class="dish__tags">${tags}</div>
            <button type="button" class="dish__add" data-add="${d.id}" aria-label="Add ${d.name} to your order">+ Add</button>
          </div>
        </div>
      </article>`;
  }

  function visibleDishes() {
    return MENU[current].items.filter((d) => [...filters].every((f) => d.tags.includes(f)));
  }

  function render() {
    const list = visibleDishes();
    panel.setAttribute("aria-labelledby", `tab-${MENU[current].id}`);
    panel.innerHTML = list.length
      ? list.map(cardHtml).join("")
      : `<div class="dishes__empty"><p>Nothing in ${MENU[current].title.toLowerCase()} matches these filters.</p>
           <button type="button" class="btn btn--small btn--ghost" data-clear-filters>Clear filters</button></div>`;
  }

  // first render + reveal on scroll
  render();
  if (gsap) {
    revealTriggers = ScrollTrigger.batch("#menu-panel .dish", {
      start: "top 90%",
      once: true,
      onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, stagger: 0.08, ease: "power3.out", overwrite: true }),
    });
  }

  // Swap the cards with a short out/in animation
  function swap() {
    revealTriggers.forEach((t) => t.kill());
    revealTriggers = [];
    if (!animate) {
      render();
      panel.querySelectorAll(".dish").forEach((d) => { d.style.opacity = 1; d.style.transform = "none"; });
      ScrollTrigger?.refresh();
      return;
    }
    panel.style.minHeight = `${panel.offsetHeight}px`;
    gsap.to(panel.children, {
      opacity: 0, y: -16, duration: 0.2, stagger: 0.02, ease: "power2.in", overwrite: true,
      onComplete: () => {
        render();
        gsap.fromTo(panel.children, { opacity: 0, y: 30 }, {
          opacity: 1, y: 0, duration: 0.55, stagger: 0.06, ease: "power3.out",
          onComplete: () => { panel.style.minHeight = ""; ScrollTrigger.refresh(); },
        });
      },
    });
  }

  function selectCategory(i) {
    if (i === current) return;
    current = i;
    tabs.forEach((t, k) => { t.setAttribute("aria-selected", String(k === i)); t.tabIndex = k === i ? 0 : -1; });
    tabs[i].scrollIntoView({ block: "nearest", inline: "center", behavior: animate ? "smooth" : "auto" });
    swap();
  }

  // ---------- Clicks inside the panel ----------
  panel.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) {
      addDish(add.dataset.add, 1);
      add.classList.add("is-added");
      add.textContent = "✓ Added";
      setTimeout(() => { add.classList.remove("is-added"); add.textContent = "+ Add"; }, 1400);
      return;
    }
    const quick = e.target.closest("[data-quick]");
    if (quick) openQuick(quick.dataset.quick);
    if (e.target.closest("[data-clear-filters]")) {
      filters.clear();
      filterBtns.forEach((b) => b.setAttribute("aria-pressed", "false"));
      swap();
    }
  });

  // lantern glow that follows the cursor (CSS vars --mx / --my)
  panel.addEventListener("pointermove", (e) => {
    const card = e.target.closest(".dish");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  });

  function addDish(id, qty) {
    const d = DISHES[id];
    cart.add({ id: d.id, name: d.name, price: d.price, img: d.img }, qty);
    toast(`${qty > 1 ? `${qty} × ` : ""}${d.name} added`, { action: { label: "View order", onClick: openCart } });
  }

  // ---------- Quick view dialog ----------
  const dialog = document.getElementById("quick");
  const qtyOut = document.getElementById("quick-qty");
  const addBtn = document.getElementById("quick-add");
  let quickDish = null;
  let qty = 1;

  function updateQuickPrice() {
    qtyOut.textContent = qty;
    addBtn.textContent = `Add · ${formatPrice(quickDish.price * qty)}`;
  }

  function openQuick(id) {
    quickDish = DISHES[id];
    qty = 1;
    const img = document.getElementById("quick-img");
    img.src = photo(quickDish.img, 1000);
    img.alt = quickDish.name;
    document.getElementById("quick-title").textContent = quickDish.name;
    document.getElementById("quick-desc").textContent = quickDish.desc;
    const heat = ["Mild", "A little warm", "Spicy", "Very spicy"][quickDish.spice];
    document.getElementById("quick-spice").innerHTML =
      `<span class="spice" aria-hidden="true">${[1, 2, 3].map((n) => `<i class="${n <= quickDish.spice ? "on" : ""}"></i>`).join("")}</span> ${heat}`;
    document.getElementById("quick-allergens").textContent =
      quickDish.allergens.length ? quickDish.allergens.map((a) => ALLERGEN_LABELS[a]).join(", ") : "None of the major allergens";
    updateQuickPrice();
    openDialog(dialog);
  }

  dialog.addEventListener("click", (e) => {
    const step = e.target.closest("[data-qty]");
    if (step) {
      qty = Math.min(20, Math.max(1, qty + Number(step.dataset.qty)));
      updateQuickPrice();
    }
  });
  addBtn.addEventListener("click", () => {
    addDish(quickDish.id, qty);
    dialog.close();
  });
}
