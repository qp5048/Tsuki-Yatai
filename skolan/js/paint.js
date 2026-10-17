// =========================================================
// The rock vault and its painting.
//
// Stockholm's metro stations are blasted out of bedrock, whitewashed
// and painted by artists. Every page here is one such "station":
// a rough-edged vault drawn in SVG and a generative painting on its
// walls. Nothing is an image file: it is all drawn from a seed, so
// the same page always gets the same painting.
//
// paintVault(svg, { style, seed, height })
//   style: "vines" | "forest" | "stars" | "arcs" | "waves"
// =========================================================

const NS = "http://www.w3.org/2000/svg";
let W = 1600; // set per painting from the element's shape

function rng(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function el(name, attrs = {}, parent) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.append(node);
  return node;
}

const f = (n) => Math.round(n * 10) / 10;

// A point on the vault's curve. theta runs from PI (left foot) to 0 (right foot);
// inset pushes the point inwards from the rock edge.
function arch(theta, inset, H) {
  const rx = W / 2 - inset;
  const ry = H - 30 - inset;
  // a superellipse: a blasted tunnel vault is rounder-shouldered than an ellipse
  const e = 0.75;
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return [W / 2 + rx * Math.sign(c) * Math.abs(c) ** e, H - ry * Math.abs(s) ** e];
}

// The jagged rock rim: the vault edge with noise, as a closed outline of
// everything OUTSIDE the vault (the darker surrounding rock)
function rimPath(H, rand) {
  const pts = [];
  const steps = 90;
  let wobble = 0;
  for (let i = 0; i <= steps; i++) {
    const theta = Math.PI - (Math.PI * i) / steps;
    wobble = wobble * 0.6 + (rand() - 0.5) * 26;
    const [x, y] = arch(theta, 6 + wobble, H);
    pts.push(`${f(x)},${f(y)}`);
  }
  return `M0,${H} L0,0 L${W},0 L${W},${H} L${pts.reverse().join(" L")} Z`;
}

// ---------- shared painting pieces ----------
function leafPath(x, y, angle, size) {
  // teardrop leaf pointing along `angle`
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const tip = [x + c * size, y + s * size];
  const n = [-s, c];
  const w = size * 0.42;
  const m = [x + c * size * 0.45, y + s * size * 0.45];
  return `M${f(x)},${f(y)} Q${f(m[0] + n[0] * w)},${f(m[1] + n[1] * w)} ${f(tip[0])},${f(tip[1])} Q${f(m[0] - n[0] * w)},${f(m[1] - n[1] * w)} ${f(x)},${f(y)} Z`;
}

function spiralPath(x, y, angle, size, dir) {
  // a curling tendril: a decaying spiral
  let d = `M${f(x)},${f(y)}`;
  let a = angle;
  let r = size;
  let px = x;
  let py = y;
  for (let i = 0; i < 26; i++) {
    a += 0.42 * dir;
    r *= 0.9;
    px += Math.cos(a) * r * 0.32;
    py += Math.sin(a) * r * 0.32;
    d += ` L${f(px)},${f(py)}`;
  }
  return d;
}

// ---------- styles ----------
function paintVines(g, H, rand, colors) {
  const stems = el("g", { class: "paint-stems", fill: "none", stroke: colors[0], "stroke-linecap": "round", "stroke-linejoin": "round" }, g);
  const leaves = el("g", { class: "paint-leaves", fill: colors[0] }, g);
  const accents = el("g", { class: "paint-leaves", fill: colors[1] }, g);

  // Two vines climb each side of the vault and meet near the top
  const sides = [
    { from: Math.PI - 0.02, to: Math.PI / 2 + 0.08 },
    { from: 0.02, to: Math.PI / 2 - 0.08 },
  ];
  sides.forEach((side, si) => {
    [70, 150].forEach((baseInset, vi) => {
      const pts = [];
      const steps = 60;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const theta = side.from + (side.to - side.from) * t;
        const inset = baseInset + Math.sin(t * Math.PI * (3 + vi) + si) * 34 + vi * 10;
        pts.push(arch(theta, inset, H));
      }
      let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
      for (let i = 1; i < pts.length - 1; i += 2) {
        d += ` Q${f(pts[i][0])},${f(pts[i][1])} ${f(pts[i + 1][0])},${f(pts[i + 1][1])}`;
      }
      el("path", { d, "stroke-width": vi ? 5 : 8 }, stems);

      // tendrils, leaves and berries along the stem
      for (let i = 4; i < pts.length - 2; i += 3 + Math.floor(rand() * 3)) {
        const [x, y] = pts[i];
        const [nx, ny] = pts[i + 1];
        const along = Math.atan2(ny - y, nx - x);
        const inward = along + (si === 0 ? 1 : -1) * Math.PI / 2;
        const out = rand() < 0.5 ? inward : inward + Math.PI;
        const kind = rand();
        if (kind < 0.42) {
          el("path", { d: spiralPath(x, y, out, 70 + rand() * 60, si === 0 ? 1 : -1), "stroke-width": 3 }, stems);
        } else if (kind < 0.85) {
          el("path", { d: leafPath(x, y, out + (rand() - 0.5) * 0.8, 34 + rand() * 30) }, leaves);
          el("path", { d: leafPath(x, y, out + Math.PI * 0.25, 22 + rand() * 18) }, leaves);
        } else {
          for (let b = 0; b < 3; b++) {
            el("circle", { cx: f(x + Math.cos(out) * (14 + b * 11)), cy: f(y + Math.sin(out) * (14 + b * 11) + (b % 2) * 8), r: 6 + rand() * 3 }, accents);
          }
        }
      }
    });
  });
}

function paintForest(g, H, rand, colors) {
  const trees = el("g", { class: "paint-leaves", fill: colors[0] }, g);
  const berries = el("g", { class: "paint-leaves", fill: colors[1] }, g);
  const ground = H - 10;
  // spruce silhouettes standing along the platform edge, tallest at the sides
  for (let x = -20; x < W + 40; x += 46 + rand() * 40) {
    const edge = Math.abs(x - W / 2) / (W / 2);
    const h = 120 + edge * edge * (H * 0.55) + rand() * 60;
    const w = h * (0.32 + rand() * 0.08);
    let d = "";
    const tiers = 5;
    for (let t = 0; t < tiers; t++) {
      const top = ground - h + (h / tiers) * t * 0.85;
      const bottom = top + (h / tiers) * 1.5;
      const half = (w / 2) * ((t + 1.4) / (tiers + 0.4));
      d += `M${f(x)},${f(top)} L${f(x + half)},${f(bottom)} L${f(x - half)},${f(bottom)} Z `;
    }
    d += `M${f(x - 5)},${f(ground - 8)} h10 v10 h-10 Z`;
    el("path", { d }, trees);
    if (rand() < 0.5) {
      const bx = x + (rand() - 0.5) * w * 0.6;
      const by = ground - rand() * 40 - 6;
      for (let b = 0; b < 4; b++) el("circle", { cx: f(bx + (b % 2) * 12), cy: f(by - Math.floor(b / 2) * 11), r: 6 }, berries);
    }
  }
  // a line of birds over the forest
  const birds = el("g", { class: "paint-stems", fill: "none", stroke: colors[0], "stroke-width": 3.5, "stroke-linecap": "round" }, g);
  for (let i = 0; i < 7; i++) {
    const x = 380 + i * 120 + rand() * 50;
    const y = H * 0.32 + Math.sin(i) * 40 + rand() * 30;
    const s = 12 + rand() * 8;
    el("path", { d: `M${f(x - s)},${f(y)} Q${f(x - s / 2)},${f(y - s * 0.7)} ${f(x)},${f(y)} Q${f(x + s / 2)},${f(y - s * 0.7)} ${f(x + s)},${f(y)}` }, birds);
  }
}

function paintStars(g, H, rand, colors, clipId) {
  // the painted ceiling: night blue inside the vault
  el("path", { class: "paint-fill", d: `M0,${H} ` + Array.from({ length: 61 }, (_, i) => {
    const [x, y] = arch(Math.PI - (Math.PI * i) / 60, 0, H);
    return `L${f(x)},${f(y)}`;
  }).join(" ") + ` L${W},${H} Z`, fill: colors[0], "clip-path": `url(#${clipId})` }, g);

  const stars = el("g", { class: "paint-leaves", fill: colors[1] }, g);
  const lines = el("g", { class: "paint-stems", fill: "none", stroke: colors[1], "stroke-width": 1.6, opacity: 0.7 }, g);
  const placed = [];
  for (let i = 0; i < 90; i++) {
    const theta = 0.2 + rand() * (Math.PI - 0.4);
    const [x, y] = arch(theta, 60 + rand() * (H * 0.75), H);
    const r = rand() < 0.15 ? 9 + rand() * 4 : 2 + rand() * 4;
    placed.push([x, y]);
    if (r > 8) {
      // four-point painted star
      el("path", { d: `M${f(x)},${f(y - r * 2)} Q${f(x + r * 0.3)},${f(y - r * 0.3)} ${f(x + r * 2)},${f(y)} Q${f(x + r * 0.3)},${f(y + r * 0.3)} ${f(x)},${f(y + r * 2)} Q${f(x - r * 0.3)},${f(y + r * 0.3)} ${f(x - r * 2)},${f(y)} Q${f(x - r * 0.3)},${f(y - r * 0.3)} ${f(x)},${f(y - r * 2)} Z` }, stars);
    } else {
      el("circle", { cx: f(x), cy: f(y), r: f(r) }, stars);
    }
  }
  // two constellations joining nearby stars
  for (let c = 0; c < 2; c++) {
    const start = Math.floor(rand() * placed.length);
    let [x, y] = placed[start];
    let d = `M${f(x)},${f(y)}`;
    for (let k = 0; k < 5; k++) {
      x += (rand() - 0.3) * 120;
      y += (rand() - 0.5) * 80;
      d += ` L${f(x)},${f(y)}`;
      el("circle", { cx: f(x), cy: f(y), r: 4 }, stars);
    }
    el("path", { d }, lines);
  }
  // a crescent moon
  const [mx, my] = arch(Math.PI * 0.72, H * 0.3, H);
  el("path", { d: `M${f(mx)},${f(my - 46)} A46,46 0 1,0 ${f(mx)},${f(my + 46)} A34,34 0 1,1 ${f(mx)},${f(my - 46)} Z` }, stars);
}

function paintArcs(g, H, rand, colors) {
  // concentric painted arcs that echo the vault, in the station's palette
  const arcs = el("g", { class: "paint-stems", fill: "none", "stroke-linecap": "round" }, g);
  const palette = [colors[0], colors[1], "#f2c230", "#3d9a5b", "#e2574c"];
  palette.forEach((color, i) => {
    const inset = 60 + i * 34;
    const steps = 40;
    let d = "";
    for (let s = 0; s <= steps; s++) {
      const [x, y] = arch(Math.PI - 0.02 - ((Math.PI - 0.04) * s) / steps, inset + Math.sin(s * 0.7 + i) * 4, H);
      d += `${s ? " L" : "M"}${f(x)},${f(y)}`;
    }
    el("path", { d, stroke: color, "stroke-width": 26 }, arcs);
  });
  // clouds drifting below the arcs
  const clouds = el("g", { class: "paint-leaves", fill: "#ffffff", opacity: 0.9 }, g);
  for (let i = 0; i < 4; i++) {
    const x = 260 + i * 330 + rand() * 80;
    const y = H * (0.55 + rand() * 0.2);
    for (let b = 0; b < 4; b++) el("circle", { cx: f(x + b * 34), cy: f(y - (b % 2) * 18), r: 26 + rand() * 10 }, clouds);
  }
}

function paintWaves(g, H, rand, colors) {
  const waves = el("g", { class: "paint-stems", fill: "none", "stroke-linecap": "round" }, g);
  for (let i = 0; i < 7; i++) {
    const y0 = H - 40 - i * 46;
    let d = `M-20,${y0}`;
    for (let x = 0; x <= W + 40; x += 80) {
      d += ` Q${x + 40},${f(y0 - 24 - rand() * 10)} ${x + 80},${y0}`;
    }
    el("path", { d, stroke: i % 2 ? colors[1] : colors[0], "stroke-width": i % 2 ? 6 : 12, opacity: 1 - i * 0.08 }, waves);
  }
  // a small sailing boat
  const boat = el("g", { class: "paint-leaves", fill: colors[0] }, g);
  const bx = W * 0.72;
  const by = H - 40 - 6 * 46 - 14;
  el("path", { d: `M${bx - 50},${by} h100 l-18,22 h-64 Z M${bx},${by - 8} v-90 l54,84 Z M${bx - 6},${by - 8} v-70 l-38,66 Z` }, boat);
}

const STYLES = { vines: paintVines, forest: paintForest, stars: paintStars, arcs: paintArcs, waves: paintWaves };

/**
 * Draw the vault into an <svg>.
 * @param {SVGSVGElement} svg
 * @param {{style:string, seed:number, height:number, colors:string[]}} opts
 */
export function paintVault(svg, { style = "vines", seed = 1, height = 900, colors = ["#1f4fa3", "#d0392b"] } = {}) {
  const H = height;
  // Match the drawing to the element's proportions, so the whole vault
  // (and the painting on its walls) is visible on phones as well as monitors
  const box = svg.getBoundingClientRect();
  W = box.width && box.height ? Math.round(Math.min(2600, Math.max(560, (H * box.width) / box.height))) : 1600;
  const rand = rng(seed);
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.replaceChildren();

  // clip for anything painted inside the vault
  const defs = el("defs", {}, svg);
  const clipId = `vault-clip-${seed}`;
  const clip = el("clipPath", { id: clipId }, defs);
  el("path", { d: `M0,${H} ` + Array.from({ length: 61 }, (_, i) => {
    const [x, y] = arch(Math.PI - (Math.PI * i) / 60, 0, H);
    return `L${f(x)},${f(y)}`;
  }).join(" ") + ` L${W},${H} Z` }, clip);

  const art = el("g", { class: "paint" }, svg);
  STYLES[style](art, H, rand, colors, clipId);

  // the darker rock around the vault, drawn last so it trims the painting
  el("path", { class: "vault-rim", d: rimPath(H, rng(seed + 99)) }, svg);
  return svg;
}

/**
 * Animate the painting as if brushed onto the wall: strokes draw,
 * leaves and stars bloom. Content is visible before and after;
 * with reduced motion the painting simply appears.
 */
export function brushIn(svg) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !svg.animate) return;
  const strokes = [...svg.querySelectorAll(".paint-stems path")];
  strokes.forEach((p, i) => {
    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len}`;
    p.animate(
      [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      { duration: 1400 + Math.min(len, 1800) * 0.5, delay: 120 + (i % 12) * 70, easing: "cubic-bezier(.22,.8,.2,1)", fill: "backwards" }
    );
  });
  const blooms = [...svg.querySelectorAll(".paint-leaves > *")];
  blooms.forEach((node, i) => {
    node.style.transformBox = "fill-box";
    node.style.transformOrigin = "center";
    node.animate(
      [{ transform: "scale(0)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }],
      { duration: 700, delay: 600 + (i % 40) * 28, easing: "cubic-bezier(.3,1.4,.5,1)", fill: "backwards" }
    );
  });
  svg.querySelectorAll(".paint-fill").forEach((node) =>
    node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, easing: "ease-out", fill: "backwards" })
  );
}
