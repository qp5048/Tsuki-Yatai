// =========================================================
// Hero 3D scene: the bowl that spins while you scroll.
//
//   1. If assets/noodle-bowl.glb exists, that model is used.
//   2. Otherwise the procedural bowl from bowl-model.js is shown,
//      with chopsticks lifting a strand of noodles.
//   3. Without WebGL: an image (or a frame sequence, if enabled).
//
// main.js animates `bowlState` with GSAP; this file reads it every frame.
// =========================================================

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { createStage, createBowl, createSteam, createContactShadow, DEVICE } from "./bowl-model.js";

// ---------- SETTINGS ----------
export const BOWL_CONFIG = {
  // Your own model: put it at assets/noodle-bowl.glb and set
  // modelPath: "assets/noodle-bowl.glb". null = procedural bowl
  // (kept null by default so the live site makes no failing request).
  modelPath: null,
  modelSize: 2.6,        // the model is scaled to this diameter
  modelRotationY: 0,     // radians, if the model faces the wrong way
  modelOffsetY: 0,
  steamStart: 0.9,       // where steam starts, as a fraction of model height

  // Optional HDRI environment (.hdr). null = built-in studio environment.
  hdriPath: null,

  // What the procedural hero bowl contains
  recipe: { broth: "pho", noodles: "rice", toppings: ["egg", "beef", "chashu", "greens", "chili"] },

  // No-WebGL fallback: rotation frames assets/frames/bowl_000.webp … bowl_119.webp
  frames: {
    enabled: false,
    count: 120,
    path: (i) => `assets/frames/bowl_${String(i).padStart(3, "0")}.webp`,
  },
};

// ---------- State animated by GSAP (main.js) ----------
export const bowlState = { rotY: 0, tilt: 0, scale: 1, x: 0, y: 0, opacity: 1 };
// Separate state for the intro after the preloader
export const introState = { rotY: -0.9, scale: 0.82, lift: -0.25 };

/**
 * @returns {Promise<{mode:string, setActive:(on:boolean)=>void}>}
 */
export async function createBowlScene({ canvas, fallbackEl, onProgress = () => {} }) {
  let stage;
  try {
    stage = createStage(canvas);
  } catch (err) {
    console.warn("WebGL is not available, using the image fallback.", err);
    canvas.hidden = true;
    return createFallback(fallbackEl);
  }
  const { renderer, scene, camera, pmrem } = stage;

  if (BOWL_CONFIG.hdriPath) {
    new RGBELoader().load(BOWL_CONFIG.hdriPath, (hdr) => {
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      scene.environment = pmrem.fromEquirectangular(hdr).texture;
      hdr.dispose();
    });
  }

  // root  – position and scale (does not rotate, so steam rises straight)
  // pivot – spin and tilt, pivoting around the middle of the bowl
  const root = new THREE.Group();
  const pivot = new THREE.Group();
  const holder = new THREE.Group();
  pivot.position.y = 0.45;
  holder.position.y = -0.45;
  pivot.add(holder);
  root.add(pivot, createContactShadow());
  scene.add(root);

  let bowl = null;
  let steamBaseY = 0.85;
  try {
    const model = await loadModel(BOWL_CONFIG.modelPath, onProgress);
    steamBaseY = fitModel(model) * BOWL_CONFIG.steamStart;
    holder.add(model);
  } catch {
    if (BOWL_CONFIG.modelPath) console.info(`Could not load ${BOWL_CONFIG.modelPath}, showing the procedural bowl.`);
    bowl = createBowl(BOWL_CONFIG.recipe, { lift: true });
    holder.add(bowl.group);
  }
  onProgress(1);

  const steam = createSteam(DEVICE.isMobile ? 9 : 16, steamBaseY);
  root.add(steam.group);

  // ---- Camera framing: big, but always fits the screen ----
  const target = new THREE.Vector3(0, 0.6, 0);
  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const distForWidth = 2.75 / (2 * tanHalf * aspect * 0.98);
    const distForHeight = 1.9 / (2 * tanHalf * 0.56);
    const dist = Math.max(distForWidth, distForHeight);
    const dir = new THREE.Vector3(0, 0.5, 1).normalize();
    camera.position.copy(dir.multiplyScalar(dist)).add(target);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  // ---- Mouse parallax (desktop only): the bowl leans towards the cursor ----
  const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!DEVICE.isMobile) {
    window.addEventListener("pointermove", (e) => {
      parallax.tx = (e.clientX / window.innerWidth) * 2 - 1;
      parallax.ty = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

  // ---- Render loop ----
  const clock = new THREE.Clock();
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    parallax.x += (parallax.tx - parallax.x) * 0.05;
    parallax.y += (parallax.ty - parallax.y) * 0.05;

    pivot.rotation.y = bowlState.rotY + introState.rotY + parallax.x * 0.25 + Math.sin(t * 0.5) * 0.03;
    pivot.rotation.x = bowlState.tilt + parallax.y * 0.08;
    root.scale.setScalar(bowlState.scale * introState.scale);
    root.position.set(bowlState.x, bowlState.y + introState.lift + Math.sin(t * 1.1) * 0.02, 0);

    bowl?.update(dt, t);
    steam.update(dt, bowlState.opacity);
    canvas.style.opacity = bowlState.opacity;
    if (bowlState.opacity > 0.01) renderer.render(scene, camera);
  }

  // Only render while the hero is on screen
  let active = false;
  function setActive(on) {
    if (on === active) return;
    active = on;
    if (on) clock.getDelta();
    renderer.setAnimationLoop(on ? frame : null);
  }
  setActive(true);
  return { mode: "webgl", setActive };
}

// ---------- GLB loading ----------
function loadModel(path, onProgress) {
  if (!path) return Promise.reject(new Error("no model path"));
  const loader = new GLTFLoader();
  const draco = new DRACOLoader(); // supports Draco-compressed models
  draco.setDecoderPath("https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/libs/draco/gltf/");
  loader.setDRACOLoader(draco);
  return new Promise((resolve, reject) => {
    loader.load(path, (gltf) => resolve(gltf.scene),
      (e) => { if (e.total) onProgress(Math.min(e.loaded / e.total, 0.99)); },
      reject);
  });
}

// Scale to BOWL_CONFIG.modelSize, stand it on y = 0, enable shadows. Returns height.
function fitModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = BOWL_CONFIG.modelSize / Math.max(size.x, size.z);
  model.scale.setScalar(scale);
  box.setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y += -box.min.y + BOWL_CONFIG.modelOffsetY;
  model.rotation.y = BOWL_CONFIG.modelRotationY;
  model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return size.y * scale;
}

// ---------- Fallback without WebGL ----------
function createFallback(fallbackEl) {
  fallbackEl.hidden = false;
  const img = fallbackEl.querySelector("img");
  let draw = null;

  if (BOWL_CONFIG.frames.enabled) {
    const { count, path } = BOWL_CONFIG.frames;
    const c = document.createElement("canvas");
    c.width = c.height = 800;
    const ctx = c.getContext("2d");
    const frames = Array.from({ length: count }, (_, i) => { const im = new Image(); im.src = path(i); return im; });
    img.replaceWith(c);
    draw = () => {
      const turn = (((bowlState.rotY / (Math.PI * 2)) % 1) + 1) % 1;
      const im = frames[Math.round(turn * (count - 1))];
      if (im.complete && im.naturalWidth) {
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.drawImage(im, 0, 0, c.width, c.height);
      }
    };
  }

  const target = fallbackEl.firstElementChild;
  let active = false;
  function loop() {
    if (!active) return;
    const unit = fallbackEl.clientHeight / 7;
    const rot = draw ? 0 : bowlState.rotY; // a top-down photo can simply spin
    target.style.transform =
      `translate(${bowlState.x * unit}px, ${-bowlState.y * unit}px) scale(${bowlState.scale * introState.scale}) rotate(${rot}rad)`;
    fallbackEl.style.opacity = bowlState.opacity;
    if (draw) draw();
    requestAnimationFrame(loop);
  }
  function setActive(on) {
    if (on === active) return;
    active = on;
    if (on) requestAnimationFrame(loop);
  }
  setActive(true);
  return Promise.resolve({ mode: draw ? "frames" : "image", setActive });
}
