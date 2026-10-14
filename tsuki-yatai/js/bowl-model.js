// =========================================================
// Procedural noodle bowl (Three.js)
//
// One generator powers both 3D scenes on the page:
//   • the hero bowl (with chopsticks lifting noodles)
//   • the Build-your-bowl configurator (live broth / noodle / topping changes)
//
// createStage()  – renderer, camera, lights and reflections for a canvas
// createBowl()   – the bowl itself, with setBroth / setNoodles / setTopping
// createSteam()  – rising steam sprites
// =========================================================

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { BUILDER } from "./data.js";

// ---------- Device tier ----------
const isTouch = window.matchMedia("(pointer: coarse)").matches;
const isMobile = isTouch || window.innerWidth < 760;
const isLowEnd = isMobile && (navigator.hardwareConcurrency || 4) <= 4;

export const DEVICE = {
  isMobile,
  isLowEnd,
  // never above 2, and 1.5 on low-end phones, to keep them cool
  pixelRatio: Math.min(window.devicePixelRatio || 1, isLowEnd ? 1.5 : 2),
};

// Geometry constants of the bowl (scene units; the bowl is 2.6 wide)
export const BOWL = { radius: 1.3, height: 0.92, brothY: 0.66 };

// =========================================================
// STAGE: renderer + camera + lights + environment
// =========================================================
export function createStage(canvas, { shadows = !isMobile, fov = 30 } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isLowEnd,
    alpha: true, // transparent: the CSS background shows through
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(DEVICE.pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);

  // Studio-style reflections for the glaze and the broth
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;

  // Warm "lantern" key light from above, red rim light from behind
  scene.add(new THREE.HemisphereLight(0xffe2b8, 0x2a0f0a, 0.7));

  const key = new THREE.DirectionalLight(0xffd29a, 2.4);
  key.position.set(-2.5, 5, 3);
  key.castShadow = shadows;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -2.2, right: 2.2, top: 2.2, bottom: -2.2, near: 1, far: 12 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 5;
  scene.add(key);

  const rim = new THREE.PointLight(0xff3b22, 22, 14, 2);
  rim.position.set(2.6, 1.8, -2.6);
  scene.add(rim);

  const fill = new THREE.PointLight(0xffa850, 7, 12, 2);
  fill.position.set(2.8, 2.2, 3);
  scene.add(fill);

  return { renderer, scene, camera, pmrem };
}

// =========================================================
// THE BOWL
// =========================================================
/**
 * @param {{broth:string, noodles:string, toppings:string[]}} config
 * @param {{lift?:boolean, seed?:number}} options  lift: chopsticks pulling noodles up
 */
export function createBowl(config, { lift = false, seed = 7 } = {}) {
  const rand = mulberry32(seed);
  const group = new THREE.Group();

  // ---- ceramic vessel (built once) ----
  group.add(buildVessel());

  // ---- broth ----
  const brothMat = new THREE.MeshPhysicalMaterial({
    map: cachedTexture("broth", makeBrothTexture),
    roughness: 0.06,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    emissiveIntensity: 0.18,
  });
  const broth = new THREE.Mesh(new THREE.CircleGeometry(1.17, 72), brothMat);
  broth.rotation.x = -Math.PI / 2;
  broth.position.y = BOWL.brothY;
  broth.receiveShadow = true;

  // Floating oil droplets: real geometry, so they catch the light
  const oil = buildOilDroplets(rand);
  const brothGroup = new THREE.Group();
  brothGroup.add(broth, oil);
  group.add(brothGroup);

  // ---- noodles ----
  const noodleMat = new THREE.MeshPhysicalMaterial({ roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 });
  let noodles = null;

  // ---- chopsticks lifting noodles (hero only) ----
  const liftGroup = new THREE.Group();
  let liftStrands = null;
  const GRIP = new THREE.Vector3(0.12, 1.6, 0.22);
  if (lift) {
    liftGroup.add(buildChopsticks(GRIP));
    group.add(liftGroup);
  }

  // ---- toppings ----
  const toppings = new Map(); // id -> Object3D

  let current = { broth: null, noodles: null };

  function setBroth(id, animate = true) {
    const look = BUILDER.broths.find((b) => b.id === id) || BUILDER.broths[0];
    current.broth = look.id;
    const color = new THREE.Color(look.color);
    // creamy broths are less glossy than clear ones
    const roughness = look.id === "tonkotsu" ? 0.22 : 0.06;
    if (animate && window.gsap) {
      window.gsap.to(brothMat.color, { r: color.r, g: color.g, b: color.b, duration: 0.8, ease: "power2.out" });
      window.gsap.to(brothMat.emissive, { r: color.r, g: color.g, b: color.b, duration: 0.8 });
      window.gsap.to(brothMat, { roughness, duration: 0.8 });
    } else {
      brothMat.color.copy(color);
      brothMat.emissive.copy(color);
      brothMat.roughness = roughness;
    }
  }

  function setNoodles(id, animate = true) {
    const style = NOODLE_STYLES[id] || NOODLE_STYLES.rice;
    current.noodles = id;
    noodleMat.color.set(style.color);
    noodleMat.roughness = style.rough;

    if (noodles) {
      group.remove(noodles);
      noodles.geometry.dispose();
    }
    noodles = new THREE.Mesh(buildNoodleBed(style, rand), noodleMat);
    noodles.castShadow = noodles.receiveShadow = true;
    group.add(noodles);

    if (lift) {
      if (liftStrands) {
        liftGroup.remove(liftStrands);
        liftStrands.geometry.dispose();
      }
      liftStrands = new THREE.Mesh(buildLiftStrands(style, GRIP, rand), noodleMat);
      liftStrands.castShadow = true;
      liftGroup.add(liftStrands);
    }

    if (animate && window.gsap) {
      window.gsap.fromTo(noodles.scale, { y: 0.4 }, { y: 1, duration: 0.7, ease: "back.out(2)" });
    }
  }

  function setTopping(id, on, animate = true) {
    const has = toppings.has(id);
    if (on && !has) {
      const builder = TOPPING_BUILDERS[id];
      if (!builder) return;
      const obj = builder(rand);
      placeAtSlot(obj, id);
      obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      group.add(obj);
      toppings.set(id, obj);
      if (animate && window.gsap) {
        const y = obj.position.y;
        obj.scale.setScalar(0.001);
        obj.position.y = y + 0.7;
        window.gsap.to(obj.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: "back.out(1.8)" });
        window.gsap.to(obj.position, { y, duration: 0.7, ease: "bounce.out" });
      }
    } else if (!on && has) {
      const obj = toppings.get(id);
      toppings.delete(id);
      const remove = () => { group.remove(obj); disposeTree(obj); };
      if (animate && window.gsap) {
        window.gsap.to(obj.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.3, ease: "power2.in", onComplete: remove });
      } else {
        remove();
      }
    }
  }

  // Ambient motion: the broth surface drifts, the lifted noodles sway
  function update(dt, t) {
    brothGroup.rotation.y += dt * 0.03;
    if (lift) {
      liftGroup.position.y = Math.sin(t * 1.3) * 0.035;
      liftGroup.rotation.z = Math.sin(t * 0.9) * 0.012;
    }
  }

  // initial state
  setBroth(config.broth, false);
  setNoodles(config.noodles, false);
  config.toppings.forEach((id) => setTopping(id, true, false));

  return { group, setBroth, setNoodles, setTopping, update, get state() { return { ...current, toppings: [...toppings.keys()] }; } };
}

// =========================================================
// Vessel: cream glazed ceramic with a red meander band
// =========================================================
function buildVessel() {
  const vessel = new THREE.Group();

  const outerPts = [
    new THREE.Vector2(0.0, 0.03),
    new THREE.Vector2(0.5, 0.03),
    new THREE.Vector2(0.52, 0.0),
    new THREE.Vector2(0.6, 0.0),
    new THREE.Vector2(0.62, 0.05),
  ];
  for (let i = 0; i <= 48; i++) {
    const a = 0.5 + (Math.PI / 2 - 0.5) * (i / 48);
    outerPts.push(new THREE.Vector2(1.3 * Math.sin(a), 0.04 + 0.88 * (1 - Math.cos(a))));
  }
  const outer = new THREE.Mesh(
    new THREE.LatheGeometry(outerPts, isMobile ? 72 : 112),
    new THREE.MeshPhysicalMaterial({
      map: cachedTexture("bowl-pattern", makeBowlPatternTexture),
      roughness: 0.28,
      clearcoat: 0.85,
      clearcoatRoughness: 0.12,
      side: THREE.DoubleSide,
    })
  );

  const innerPts = [];
  for (let i = 0; i <= 48; i++) {
    const a = (Math.PI / 2) * (i / 48);
    innerPts.push(new THREE.Vector2(Math.max(0.001, 1.23 * Math.sin(a)), 0.12 + 0.8 * (1 - Math.cos(a))));
  }
  const innerMat = new THREE.MeshPhysicalMaterial({
    map: cachedTexture("bowl-inner", makeInnerGlazeTexture),
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    side: THREE.DoubleSide,
  });
  const inner = new THREE.Mesh(new THREE.LatheGeometry(innerPts, isMobile ? 72 : 112), innerMat);

  const lip = new THREE.Mesh(new THREE.TorusGeometry(1.265, 0.037, 14, 140), innerMat);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 0.925;

  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a443, metalness: 1, roughness: 0.25 });
  const goldLine = new THREE.Mesh(new THREE.TorusGeometry(1.297, 0.007, 6, 140), gold);
  goldLine.rotation.x = Math.PI / 2;
  goldLine.position.y = 0.875;

  [outer, inner, lip].forEach((m) => { m.castShadow = true; m.receiveShadow = true; });
  vessel.add(outer, inner, lip, goldLine);
  return vessel;
}

// =========================================================
// Noodles
// =========================================================
const NOODLE_STYLES = {
  rice:  { count: 34, radius: 0.021, color: 0xf4ecdc, rough: 0.28, wiggle: 0.006, freq: 14, strands: 12 },
  ramen: { count: 30, radius: 0.024, color: 0xf0d18a, rough: 0.34, wiggle: 0.028, freq: 46, strands: 12 },
  udon:  { count: 13, radius: 0.052, color: 0xf6f0e3, rough: 0.4, wiggle: 0.004, freq: 6, strands: 6 },
};

// Height of the noodle mound at (x, z): toppings sit on this surface
export function heightAt(x, z) {
  const dx = x + 0.08;
  const dz = z - 0.05;
  const m = Math.max(0, 1 - (dx * dx + dz * dz) / 0.85);
  return BOWL.brothY + 0.02 + 0.15 * m * m * (3 - 2 * m);
}

function buildNoodleBed(style, rand) {
  const geos = [];
  const count = Math.round(style.count * (isMobile ? 0.7 : 1));
  const radial = style.radius > 0.04 ? 8 : 6;
  for (let n = 0; n < count; n++) {
    const a0 = rand() * Math.PI * 2;
    const span = 1.4 + rand() * 2.6;
    const r0 = 0.15 + rand() * 0.8;
    const ph = rand() * Math.PI * 2;
    const f = 1 + rand() * 2.5;
    const sink = rand() < 0.35 ? 0.035 : 0; // some noodles sit under the broth
    const pts = [];
    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      const a = a0 + span * t;
      let r = r0 + 0.22 * Math.sin(t * Math.PI * f + ph);
      r += style.wiggle * Math.sin(t * style.freq + ph); // ramen curls
      r = THREE.MathUtils.clamp(r, 0.04, 1.08);
      const x = r * Math.cos(a);
      const z = r * Math.sin(a);
      const y = heightAt(x, z) + style.wiggle * 0.6 * Math.cos(t * style.freq * 1.3 + ph)
        - sink - (r > 1 ? (r - 1) * 0.3 : 0);
      pts.push(new THREE.Vector3(x, y, z));
    }
    geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), isMobile ? 48 : 72, style.radius, radial, false));
  }
  const merged = mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  return merged;
}

// Strands hanging from the chopsticks down into the broth
function buildLiftStrands(style, grip, rand) {
  const geos = [];
  for (let n = 0; n < style.strands; n++) {
    const dx = rand() * 2 - 1;
    const dz = rand() * 2 - 1;
    const endX = 0.1 + (rand() - 0.5) * 0.75;
    const endZ = 0.12 + (rand() - 0.5) * 0.6;
    const end = new THREE.Vector3(endX, heightAt(endX, endZ) - 0.04, endZ);
    const mid = grip.clone().lerp(end, 0.55).add(new THREE.Vector3(dx * 0.1, 0.04, dz * 0.1));
    const ctrl = [
      grip.clone().add(new THREE.Vector3(dx * 0.025, -0.03, dz * 0.025)),
      grip.clone().add(new THREE.Vector3(dx * 0.05, -0.22, dz * 0.05)),
      mid,
      end.clone().add(new THREE.Vector3(0, 0.16, 0)),
      end,
    ];
    const base = new THREE.CatmullRomCurve3(ctrl);
    // add the noodle's own curl along the strand
    const pts = base.getPoints(60).map((p, i) => {
      const k = i / 60;
      const w = style.wiggle * 1.2 * Math.sin(k * style.freq * 0.9 + n);
      return p.add(new THREE.Vector3(w, 0, w * 0.6));
    });
    geos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), isMobile ? 60 : 90, style.radius, style.radius > 0.04 ? 8 : 6, false));
  }
  const merged = mergeGeometries(geos);
  geos.forEach((g) => g.dispose());
  return merged;
}

function buildChopsticks(grip) {
  const group = new THREE.Group();
  const lacquer = new THREE.MeshPhysicalMaterial({ color: 0x9e2219, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a443, metalness: 1, roughness: 0.25 });
  const up = new THREE.Vector3(0, 1, 0);

  [[-0.035, 0.02, 0.06], [0.035, -0.02, -0.06]].forEach(([ox, oz, spread]) => {
    const stick = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.026, 2.6, 12), lacquer);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0275, 0.0275, 0.14, 12), gold);
    band.position.y = -0.95; // gold band near the handle end
    stick.add(body, band);
    // direction from tip to handle: up, right and slightly back
    const dir = new THREE.Vector3(0.8 + spread, 0.52, -0.35).normalize();
    stick.quaternion.setFromUnitVectors(up, dir.clone().negate()); // thin end (+y) points at the tip
    stick.position.copy(grip).add(new THREE.Vector3(ox, 0.01, oz)).addScaledVector(dir, 1.3);
    stick.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    group.add(stick);
  });
  return group;
}

// =========================================================
// Oil droplets on the broth
// =========================================================
function buildOilDroplets(rand) {
  const count = isMobile ? 26 : 46;
  const mesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 14, 8),
    new THREE.MeshPhysicalMaterial({
      color: 0xf6c86a, roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.8,
    }),
    count
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const r = 0.25 + Math.sqrt(rand()) * 0.85;
    const s = 0.012 + rand() * rand() * 0.04;
    dummy.position.set(r * Math.cos(a), BOWL.brothY + 0.003, r * Math.sin(a));
    dummy.scale.set(s, s * 0.22, s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  return mesh;
}

// =========================================================
// Toppings. Each builder returns an Object3D centred on its slot.
// Slots are spread around the bowl so toppings never collide.
// a = angle around the bowl (front of the bowl faces the camera at a ≈ 1.57)
// =========================================================
const SLOTS = {
  chashu: { a: 0.62, r: 0.56 },
  egg:    { a: 1.6,  r: 0.5 },
  naruto: { a: 2.55, r: 0.55 },
  tofu:   { a: 3.4,  r: 0.55 },
  nori:   { a: 4.5,  r: 0.88 },
  corn:   { a: 5.25, r: 0.5 },
  beef:   { a: 5.95, r: 0.55 },
  greens: { a: 0,    r: 0 },
  chili:  { a: 0,    r: 0 },
};

function placeAtSlot(obj, id) {
  const { a, r } = SLOTS[id] || { a: 0, r: 0 };
  const x = r * Math.cos(a);
  const z = r * Math.sin(a);
  obj.position.set(x, r ? heightAt(x, z) : 0, z);
  // local +x points outward from the bowl centre
  obj.rotation.y = -a;
}

const TOPPING_BUILDERS = {
  egg: () => {
    const g = new THREE.Group();
    const white = new THREE.MeshPhysicalMaterial({ color: 0xc98c55, roughness: 0.35, clearcoat: 0.6 });
    const cut = new THREE.MeshPhysicalMaterial({ map: cachedTexture("egg", makeEggTexture), roughness: 0.3, clearcoat: 0.5 });
    const shell = new THREE.SphereGeometry(0.2, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    const cap = new THREE.CircleGeometry(0.2, 40);
    [-1, 1].forEach((side) => {
      const half = new THREE.Group();
      const s = new THREE.Mesh(shell, white);
      const c = new THREE.Mesh(cap, cut);
      c.rotation.x = -Math.PI / 2;
      half.add(s, c);
      half.scale.set(1.3, 0.9, 1);
      half.position.set(0.02, 0.06, side * 0.2);
      half.rotation.set(side * 0.18, side * 0.35, -0.12);
      g.add(half);
    });
    return g;
  },

  chashu: () => {
    const g = new THREE.Group();
    const side = new THREE.MeshStandardMaterial({ color: 0x6b2f1b, roughness: 0.55 });
    const top = new THREE.MeshPhysicalMaterial({ map: cachedTexture("chashu", makeChashuTexture), roughness: 0.45, clearcoat: 0.4 });
    const geo = new THREE.CylinderGeometry(0.26, 0.26, 0.05, 40);
    for (let i = 0; i < 3; i++) {
      const slice = new THREE.Mesh(geo, [side, top, top]);
      slice.position.set(0, 0.05 + i * 0.02, (i - 1) * 0.15);
      slice.rotation.set((i - 1) * 0.12, i * 0.5, -0.3);
      g.add(slice);
    }
    return g;
  },

  beef: (rand) => {
    const g = new THREE.Group();
    const mat = new THREE.MeshPhysicalMaterial({
      map: cachedTexture("beef", makeBeefTexture), roughness: 0.42, clearcoat: 0.35, side: THREE.DoubleSide,
    });
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.PlaneGeometry(0.44, 0.26, 16, 8);
      const pos = geo.attributes.position;
      const ph = rand() * 6;
      for (let v = 0; v < pos.count; v++) {
        const x = pos.getX(v);
        const y = pos.getY(v);
        pos.setZ(v, Math.sin(x * 13 + ph) * 0.02 + Math.cos(y * 10 + ph) * 0.012);
      }
      geo.computeVertexNormals();
      geo.rotateX(-Math.PI / 2);
      const slice = new THREE.Mesh(geo, mat);
      slice.position.set((rand() - 0.5) * 0.1, 0.035 + i * 0.012, (i - 1.5) * 0.12);
      slice.rotation.set((rand() - 0.5) * 0.25, (rand() - 0.5) * 0.8, -0.18);
      g.add(slice);
    }
    return g;
  },

  tofu: (rand) => {
    const g = new THREE.Group();
    const mat = new THREE.MeshPhysicalMaterial({ color: 0xf1e7cd, roughness: 0.5, clearcoat: 0.3 });
    const geo = new RoundedBoxGeometry(0.15, 0.15, 0.15, 2, 0.025);
    const spots = [[0, 0, -0.1], [0.04, 0, 0.08], [-0.13, 0, 0.0], [0.15, -0.01, -0.05], [-0.02, 0.12, 0.0]];
    spots.forEach(([x, y, z]) => {
      const cube = new THREE.Mesh(geo, mat);
      cube.position.set(x, 0.05 + y, z);
      cube.rotation.set(rand() * 0.4, rand() * Math.PI, rand() * 0.4);
      g.add(cube);
    });
    return g;
  },

  corn: (rand) => {
    const count = 64;
    const mesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.022, 8, 6),
      new THREE.MeshPhysicalMaterial({ roughness: 0.25, clearcoat: 0.8 }),
      count
    );
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.19;
      dummy.position.set(r * Math.cos(a), 0.03 + 0.07 * (1 - (r * r) / 0.036), r * Math.sin(a));
      dummy.rotation.set(rand() * 3, rand() * 3, rand() * 3);
      dummy.scale.set(1, 0.8, 1.25);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      // a few kernels are charred from the grill
      mesh.setColorAt(i, rand() < 0.15 ? color.set(0x8a5a1c) : color.setHSL(0.13, 0.85, 0.5 + rand() * 0.1));
    }
    return mesh;
  },

  nori: () => {
    const g = new THREE.Group();
    const mat = new THREE.MeshPhysicalMaterial({ color: 0x1c271b, roughness: 0.55, sheen: 0.6, sheenColor: 0x3d5a36, side: THREE.DoubleSide });
    [[-0.17, 0.2], [0.15, -0.12]].forEach(([z, tilt]) => {
      const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.56, 0.42), mat);
      sheet.position.set(0.02, 0.18, z);
      sheet.rotation.set(tilt * 0.3, tilt, -0.32); // leaning against the bowl wall
      g.add(sheet);
    });
    return g;
  },

  naruto: () => {
    const g = new THREE.Group();
    const side = new THREE.MeshStandardMaterial({ color: 0xf6f1ea, roughness: 0.4 });
    const top = new THREE.MeshPhysicalMaterial({ map: cachedTexture("naruto", makeNarutoTexture), roughness: 0.35, clearcoat: 0.4 });
    const geo = new THREE.CylinderGeometry(0.12, 0.12, 0.035, 36);
    for (let i = 0; i < 3; i++) {
      const slice = new THREE.Mesh(geo, [side, top, top]);
      slice.position.set(0, 0.04 + i * 0.015, (i - 1) * 0.15);
      slice.rotation.set((i - 1) * 0.2, i, -0.22);
      g.add(slice);
    }
    return g;
  },

  chili: (rand) => scatterRings(rand, { count: 14, radius: 0.026, tube: 0.011, hue: [0.985, 1.0], light: [0.36, 0.46], sat: 0.82 }),

  greens: (rand) => {
    const g = new THREE.Group();
    g.add(scatterRings(rand, { count: isMobile ? 34 : 54, radius: 0.03, tube: 0.008, hue: [0.24, 0.29], light: [0.38, 0.64], sat: 0.55 }));

    // herb leaves piled on the top of the noodle mound
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.05, 0.045, 0.11, 0.04, 0.15, 0);
    shape.bezierCurveTo(0.11, -0.04, 0.05, -0.045, 0, 0);
    const leafGeo = new THREE.ShapeGeometry(shape, 6);
    leafGeo.translate(-0.075, 0, 0);
    const count = isMobile ? 14 : 22;
    const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ roughness: 0.45, side: THREE.DoubleSide }), count);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.28;
      const x = -0.08 + r * Math.cos(a);
      const z = 0.05 + r * Math.sin(a);
      dummy.position.set(x, heightAt(x, z) + 0.03 + rand() * 0.06, z);
      dummy.rotation.set(-Math.PI / 2 + (rand() - 0.5) * 0.8, (rand() - 0.5) * 0.5, rand() * Math.PI * 2);
      dummy.scale.setScalar(0.8 + rand() * 0.6);
      dummy.updateMatrix();
      leaves.setMatrixAt(i, dummy.matrix);
      leaves.setColorAt(i, color.setHSL(0.27 + rand() * 0.05, 0.55, 0.22 + rand() * 0.12));
    }
    g.add(leaves);

    // sesame seeds
    const seeds = isMobile ? 40 : 70;
    const sesame = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.009, 6, 4),
      new THREE.MeshStandardMaterial({ color: 0xf1e2b8, roughness: 0.5 }),
      seeds
    );
    for (let i = 0; i < seeds; i++) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.95;
      const x = r * Math.cos(a);
      const z = r * Math.sin(a);
      dummy.position.set(x, heightAt(x, z) + 0.035, z);
      dummy.rotation.set(0, rand() * Math.PI, 0);
      dummy.scale.set(1, 0.5, 1.7);
      dummy.updateMatrix();
      sesame.setMatrixAt(i, dummy.matrix);
    }
    g.add(sesame);
    return g;
  },
};

// Rings (spring onion, chili) scattered over the whole bowl
function scatterRings(rand, { count, radius, tube, hue, light, sat }) {
  const mesh = new THREE.InstancedMesh(
    new THREE.TorusGeometry(radius, tube, 6, 14),
    new THREE.MeshPhysicalMaterial({ roughness: 0.35, clearcoat: 0.5 }),
    count
  );
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand());
    const x = r * Math.cos(a);
    const z = r * Math.sin(a);
    dummy.position.set(x, heightAt(x, z) + 0.035 + rand() * 0.03, z);
    dummy.rotation.set(Math.PI / 2 + (rand() - 0.5) * 0.8, (rand() - 0.5) * 0.8, 0);
    dummy.scale.set(1, 1, 1.4);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, color.setHSL(THREE.MathUtils.lerp(hue[0], hue[1], rand()), sat, THREE.MathUtils.lerp(light[0], light[1], rand())));
  }
  return mesh;
}

// =========================================================
// STEAM: soft sprites that rise and fade
// =========================================================
export function createSteam(count, baseY, seed = 3) {
  const rand = mulberry32(seed);
  const group = new THREE.Group();
  const texture = cachedTexture("steam", makeSteamTexture);
  const puffs = [];

  for (let i = 0; i < count; i++) {
    const material = new THREE.SpriteMaterial({ map: texture, color: 0xfff1dc, transparent: true, depthWrite: false, opacity: 0 });
    const sprite = new THREE.Sprite(material);
    group.add(sprite);
    puffs.push({
      sprite,
      life: i / count, // staggered so the steam is continuous
      speed: 1 / (3.6 + rand() * 1.8),
      x0: (rand() - 0.5) * 0.9,
      z0: (rand() - 0.5) * 0.6,
      phase: rand() * Math.PI * 2,
      spin: (rand() - 0.5) * 0.6,
    });
  }

  function update(dt, strength = 1) {
    for (const p of puffs) {
      p.life += dt * p.speed;
      if (p.life > 1) {
        p.life -= 1;
        p.x0 = (rand() - 0.5) * 0.9;
        p.z0 = (rand() - 0.5) * 0.6;
      }
      const t = p.life;
      p.sprite.position.set(p.x0 + Math.sin(t * 3 + p.phase) * 0.18 * t, baseY + t * 1.6, p.z0);
      const s = 0.45 + t * 1.3;
      p.sprite.scale.set(s, s * 1.2, 1);
      p.sprite.material.rotation += p.spin * dt;
      p.sprite.material.opacity = Math.pow(Math.sin(Math.PI * t), 1.5) * 0.24 * strength;
    }
  }
  return { group, update };
}

// Soft shadow disc under the bowl (cheap, works everywhere)
export function createContactShadow() {
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 3.4),
    new THREE.MeshBasicMaterial({ map: cachedTexture("shadow", makeShadowTexture), transparent: true, depthWrite: false })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = 0.001;
  return plane;
}

// =========================================================
// Canvas-painted textures (no image files needed)
// =========================================================
const textureCache = new Map();
function cachedTexture(name, painter) {
  if (!textureCache.has(name)) textureCache.set(name, painter());
  return textureCache.get(name);
}

function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h, mulberry32(w + h));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeBowlPatternTexture() {
  return canvasTexture(1024, 512, (g, w, h, rnd) => {
    g.fillStyle = "#efe6d6";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1200; i++) {
      g.fillStyle = `rgba(120, 90, 60, ${rnd() * 0.12})`;
      g.beginPath();
      g.arc(rnd() * w, rnd() * h, rnd() * 1.6, 0, Math.PI * 2);
      g.fill();
    }
    const top = h * 0.05;
    const band = h * 0.11;
    g.fillStyle = "#a8261d";
    g.fillRect(0, top, w, band);
    // meander (thunder) pattern inside the band
    g.strokeStyle = "#efe6d6";
    g.lineWidth = 3;
    const step = w / 32;
    for (let x = 0; x < w; x += step) {
      const y0 = top + band * 0.22;
      const y1 = top + band * 0.78;
      g.beginPath();
      g.moveTo(x + step * 0.15, y1);
      g.lineTo(x + step * 0.15, y0);
      g.lineTo(x + step * 0.7, y0);
      g.lineTo(x + step * 0.7, y1 - band * 0.18);
      g.lineTo(x + step * 0.35, y1 - band * 0.18);
      g.lineTo(x + step * 0.35, y0 + band * 0.2);
      g.stroke();
    }
    g.fillStyle = "#a8261d";
    g.fillRect(0, top + band + h * 0.02, w, 3);
    g.fillRect(0, h * 0.82, w, 2);
    // brushed glaze drips under the band
    for (let x = 0; x < w; x += 9) {
      g.fillStyle = `rgba(168, 38, 29, ${0.04 + rnd() * 0.06})`;
      g.fillRect(x, top + band, 3 + rnd() * 4, rnd() * h * 0.08);
    }
  });
}

// Inside of the bowl: slightly darker towards the bottom, faint crackle
function makeInnerGlazeTexture() {
  return canvasTexture(512, 256, (g, w, h, rnd) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#f6efe3");
    grad.addColorStop(1, "#d8ccb8");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(120, 95, 70, 0.08)";
    g.lineWidth = 1;
    for (let i = 0; i < 70; i++) {
      g.beginPath();
      let x = rnd() * w;
      let y = rnd() * h;
      g.moveTo(x, y);
      for (let k = 0; k < 4; k++) {
        x += (rnd() - 0.5) * 40;
        y += (rnd() - 0.5) * 30;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  });
}

// Neutral broth texture: the material colour tints it per broth type
function makeBrothTexture() {
  return canvasTexture(512, 512, (g, w, h, rnd) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.7, "#d2d2d2");
    grad.addColorStop(1, "#9a9a9a");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const r = 2 + rnd() * 10;
      const x = rnd() * w;
      const y = rnd() * h;
      g.strokeStyle = `rgba(80, 80, 80, ${0.08 + rnd() * 0.1})`;
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.stroke();
    }
  });
}

function makeChashuTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
    grad.addColorStop(0, "#d79b7a");
    grad.addColorStop(0.75, "#b9735a");
    grad.addColorStop(0.86, "#7a3a20");
    grad.addColorStop(1, "#4d2112");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(246, 226, 205, 0.8)";
    g.lineWidth = 5;
    g.beginPath();
    for (let a = 0; a < Math.PI * 7; a += 0.05) {
      const r = 6 + a * 4.6;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      a === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  });
}

function makeBeefTexture() {
  return canvasTexture(256, 160, (g, w, h, rnd) => {
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, "#c46a5e");
    grad.addColorStop(0.5, "#a84d43");
    grad.addColorStop(1, "#8a3b33");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    // cooked edges from the hot broth
    g.strokeStyle = "rgba(120, 80, 60, 0.7)";
    g.lineWidth = 14;
    g.strokeRect(0, 0, w, h);
    // marbling
    g.strokeStyle = "rgba(245, 215, 200, 0.55)";
    g.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      g.beginPath();
      let x = rnd() * w;
      let y = rnd() * h;
      g.moveTo(x, y);
      for (let k = 0; k < 5; k++) {
        x += (rnd() - 0.3) * 40;
        y += (rnd() - 0.5) * 20;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  });
}

function makeEggTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = "#f6efe1";
    g.fillRect(0, 0, w, h);
    const ring = g.createRadialGradient(w / 2, h / 2, w * 0.4, w / 2, h / 2, w / 2);
    ring.addColorStop(0, "rgba(201, 140, 85, 0)");
    ring.addColorStop(1, "rgba(201, 140, 85, 0.9)");
    g.fillStyle = ring;
    g.fillRect(0, 0, w, h);
    const yolk = g.createRadialGradient(w * 0.47, h * 0.47, 0, w / 2, h / 2, w * 0.3);
    yolk.addColorStop(0, "#f7a225");
    yolk.addColorStop(0.65, "#ec8a1c");
    yolk.addColorStop(0.9, "#f2b54a");
    yolk.addColorStop(1, "rgba(246, 239, 225, 0)");
    g.fillStyle = yolk;
    g.beginPath();
    g.arc(w / 2, h / 2, w * 0.3, 0, Math.PI * 2);
    g.fill();
  });
}

function makeNarutoTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = "#fbf7f0";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#e0566f";
    g.lineWidth = 9;
    g.lineCap = "round";
    g.beginPath();
    for (let a = 0; a < Math.PI * 5; a += 0.05) {
      const r = 4 + a * 5.4;
      const x = w / 2 + Math.cos(a) * r;
      const y = h / 2 + Math.sin(a) * r;
      a === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  });
}

function makeSteamTexture() {
  return canvasTexture(128, 128, (g, w, h, rnd) => {
    for (let i = 0; i < 6; i++) {
      const x = w * (0.35 + rnd() * 0.3);
      const y = h * (0.35 + rnd() * 0.3);
      const r = w * (0.22 + rnd() * 0.15);
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, "rgba(255,255,255,0.45)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    }
  });
}

function makeShadowTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, "rgba(0,0,0,0.85)");
    grad.addColorStop(0.45, "rgba(0,0,0,0.45)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

// =========================================================
// Helpers
// =========================================================
function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) [].concat(o.material).forEach((m) => m.dispose()); // textures are cached and kept
  });
}

// Seeded random numbers: the bowl looks the same on every visit
export function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
