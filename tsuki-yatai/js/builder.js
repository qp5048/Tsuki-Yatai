// =========================================================
// Build your bowl: live 3D preview + options + running price.
// Uses the same procedural bowl as the hero (bowl-model.js).
// =========================================================

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createStage, createBowl, createSteam, createContactShadow, DEVICE } from "./bowl-model.js";
import { BUILDER, formatPrice } from "./data.js";
import { cart, toast } from "./cart.js";

export function setupBuilder({ openCart, reduceMotion }) {
  const form = document.getElementById("builder-form");
  const brothsEl = document.getElementById("builder-broths");
  const noodlesEl = document.getElementById("builder-noodles");
  const toppingsEl = document.getElementById("builder-toppings");
  const totalEl = document.getElementById("builder-total");
  const badgesEl = document.getElementById("builder-badges");

  const state = {
    broth: BUILDER.defaults.broth,
    noodles: BUILDER.defaults.noodles,
    toppings: new Set(BUILDER.defaults.toppings),
  };

  // ---------- Options (real radio / checkbox inputs, styled as cards) ----------
  brothsEl.innerHTML = BUILDER.broths.map((b) => `
    <label class="choice">
      <input type="radio" name="broth" value="${b.id}" ${b.id === state.broth ? "checked" : ""}>
      <span class="choice__card">
        <span class="choice__swatch" style="background:${b.color}"></span>
        <span class="choice__name">${b.name}</span>
        <span class="choice__price">${formatPrice(b.price)}</span>
        <span class="choice__note">${b.note}</span>
      </span>
    </label>`).join("");

  noodlesEl.innerHTML = BUILDER.noodles.map((n) => `
    <label class="choice">
      <input type="radio" name="noodles" value="${n.id}" ${n.id === state.noodles ? "checked" : ""}>
      <span class="choice__card">
        <span class="choice__name">${n.name}</span>
        <span class="choice__note">${n.note}${n.price ? ` · +${formatPrice(n.price)}` : ""}</span>
      </span>
    </label>`).join("");

  toppingsEl.innerHTML = BUILDER.toppings.map((t) => `
    <label class="choice">
      <input type="checkbox" name="topping" value="${t.id}" ${state.toppings.has(t.id) ? "checked" : ""}>
      <span class="choice__card">
        <span class="choice__name">${t.name}</span>
        <span class="choice__price">${t.price ? `+${formatPrice(t.price)}` : "free"}</span>
      </span>
    </label>`).join("");

  // ---------- 3D preview ----------
  const preview = createPreview(document.getElementById("builder-canvas"), state, reduceMotion);

  // ---------- Price, badges ----------
  const shown = { value: price() };
  totalEl.textContent = formatPrice(shown.value);

  function price() {
    const broth = BUILDER.broths.find((b) => b.id === state.broth);
    const noodles = BUILDER.noodles.find((n) => n.id === state.noodles);
    const extras = BUILDER.toppings.filter((t) => state.toppings.has(t.id)).reduce((s, t) => s + t.price, 0);
    return broth.price + noodles.price + extras;
  }

  function badges() {
    const broth = BUILDER.broths.find((b) => b.id === state.broth);
    const picked = BUILDER.toppings.filter((t) => state.toppings.has(t.id));
    const out = [];
    if (broth.veg && !picked.some((t) => t.meat)) out.push('<li class="tag tag--veg">Vegan-friendly</li>');
    if (broth.spicy || picked.some((t) => t.spicy)) out.push('<li class="tag tag--hot">Spicy</li>');
    badgesEl.innerHTML = out.join("");
  }
  badges();

  function refreshSummary() {
    const target = price();
    if (window.gsap && !reduceMotion) {
      window.gsap.to(shown, {
        value: target, duration: 0.5, ease: "power2.out",
        onUpdate: () => { totalEl.textContent = formatPrice(shown.value); },
      });
    } else {
      shown.value = target;
      totalEl.textContent = formatPrice(target);
    }
    badges();
  }

  // ---------- React to changes ----------
  form.addEventListener("change", (e) => {
    const input = e.target;
    if (input.name === "broth") { state.broth = input.value; preview?.bowl.setBroth(input.value); }
    if (input.name === "noodles") { state.noodles = input.value; preview?.bowl.setNoodles(input.value); }
    if (input.name === "topping") {
      input.checked ? state.toppings.add(input.value) : state.toppings.delete(input.value);
      preview?.bowl.setTopping(input.value, input.checked);
    }
    preview?.wake();
    refreshSummary();
  });

  // "Surprise me": random broth, noodles and 3–5 toppings
  document.getElementById("builder-random").addEventListener("click", () => {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const broth = pick(BUILDER.broths).id;
    const noodles = pick(BUILDER.noodles).id;
    const pool = BUILDER.toppings.map((t) => t.id).sort(() => Math.random() - 0.5);
    const chosen = new Set(pool.slice(0, 3 + Math.floor(Math.random() * 3)));

    form.querySelector(`input[name="broth"][value="${broth}"]`).checked = true;
    form.querySelector(`input[name="noodles"][value="${noodles}"]`).checked = true;
    form.querySelectorAll('input[name="topping"]').forEach((cb) => { cb.checked = chosen.has(cb.value); });

    if (broth !== state.broth) preview?.bowl.setBroth(broth);
    if (noodles !== state.noodles) preview?.bowl.setNoodles(noodles);
    BUILDER.toppings.forEach((t) => {
      if (chosen.has(t.id) !== state.toppings.has(t.id)) preview?.bowl.setTopping(t.id, chosen.has(t.id));
    });
    Object.assign(state, { broth, noodles, toppings: chosen });
    preview?.wake();
    refreshSummary();
  });

  // ---------- Add to order ----------
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const broth = BUILDER.broths.find((b) => b.id === state.broth);
    const noodles = BUILDER.noodles.find((n) => n.id === state.noodles);
    const tops = BUILDER.toppings.filter((t) => state.toppings.has(t.id)).map((t) => t.name);
    const id = `bowl:${state.broth}:${state.noodles}:${[...state.toppings].sort().join(",")}`;
    cart.add({
      id,
      name: `${broth.name} bowl`,
      details: `${noodles.name} noodles${tops.length ? ` · ${tops.join(", ")}` : ""}`,
      price: price(),
    });
    toast("Your bowl is in the order", { action: { label: "View order", onClick: openCart } });
  });
}

// ---------- The 3D preview ----------
function createPreview(canvas, state, reduceMotion) {
  let stage;
  try {
    stage = createStage(canvas, { fov: 32 });
  } catch {
    canvas.hidden = true;
    document.getElementById("builder-fallback").hidden = false;
    document.querySelector(".builder__drag").hidden = true;
    return null;
  }
  const { renderer, scene, camera } = stage;

  const bowl = createBowl(
    { broth: state.broth, noodles: state.noodles, toppings: [...state.toppings] },
    { seed: 21 }
  );
  const steam = createSteam(DEVICE.isMobile ? 6 : 10, 0.85, 9);
  scene.add(bowl.group, steam.group, createContactShadow());

  camera.position.set(0, 3.4, 4.1);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.55, 0);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  // keep the camera height fixed: only horizontal turning
  const polar = Math.atan2(Math.hypot(4.1, 0), 3.4 - 0.55);
  controls.minPolarAngle = controls.maxPolarAngle = polar;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 1.1;
  controls.update();
  // let the page scroll vertically on touch screens; sideways swipes turn the bowl
  canvas.style.touchAction = "pan-y";

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(canvas);

  // Render only while the builder is on screen
  const clock = new THREE.Clock();
  let visible = false;
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    controls.update();
    bowl.update(dt, clock.elapsedTime);
    steam.update(dt);
    renderer.render(scene, camera);
  }
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) clock.getDelta();
    renderer.setAnimationLoop(visible ? frame : null);
  }, { rootMargin: "100px" }).observe(canvas);

  return { bowl, wake: () => { if (!visible) renderer.render(scene, camera); } };
}
