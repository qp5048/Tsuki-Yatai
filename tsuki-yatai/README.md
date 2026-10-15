# Tsuki Yatai — night noodle bar

A concept website for a fictional Asian night-market restaurant, designed and built by **Zakharii**.

**Live site:** https://qp5048.github.io/Tsuki-Yatai/tsuki-yatai/

Plain HTML, CSS and JavaScript (ES modules). No framework and no build step.

## Features

- **Scroll-driven 3D hero.** A procedural noodle bowl made in Three.js (glazed ceramic, broth with oil droplets, noodles lifted by chopsticks, steam). The hero is pinned with GSAP ScrollTrigger; the bowl spins, tilts and zooms with the scroll, then shrinks away to reveal the menu.
- **Build your bowl.** The same 3D generator rebuilds the bowl live as you pick a broth, noodles and toppings. Drag to turn it. Running price, vegan and spicy badges, "Surprise me".
- **Menu.** Category tabs (keyboard accessible), vegetarian and spicy filters, photo cards, a quick view with allergens and heat level.
- **Ordering flow.** Basket drawer saved in `localStorage`, quantities, pickup times and a demo order tracker.
- **Table booking.** Validation and time slots that follow the opening hours.
- **Live "open now" status** calculated in Stockholm time.
- **Pinned horizontal gallery** on desktop, swipeable strip on phones.
- **Performance and accessibility.** 3D renders only while visible, pixel ratio capped at 2, no real-time shadows on phones, lazy-loaded images, `prefers-reduced-motion` respected, focus states and ARIA patterns for tabs and dialogs.

## Stack

HTML · CSS · JavaScript · [Three.js](https://threejs.org) · [GSAP + ScrollTrigger](https://gsap.com) · [Lenis](https://lenis.darkroom.engineering) · GitHub Pages

## Project structure

```
index.html          all sections and dialogs
css/style.css       styles; colours and fonts are tokens at the top
js/main.js          boot, smooth scroll, hero/gallery animation, booking, status
js/bowl-model.js    procedural 3D bowl shared by the hero and the builder
js/bowl3d.js        hero 3D scene (GLB support, fallback without WebGL)
js/builder.js       build-your-bowl configurator
js/menu.js          menu tabs, filters, cards, quick view
js/cart.js          order basket, drawer, demo checkout
js/data.js          menu, prices, photos, builder options, opening hours
assets/             icons and fallback illustrations
```

## Run locally

ES modules need a local server (opening `index.html` directly will not work):

```bash
python -m http.server 8000      # then open http://localhost:8000
# or
npx serve .
```

An internet connection is needed for the libraries, fonts and photos (all from CDNs).

## Using your own 3D model

Put the model at `assets/noodle-bowl.glb` and set `modelPath: "assets/noodle-bowl.glb"` in `js/bowl3d.js`.
It is scaled, centred and given shadows automatically. Draco-compressed models are supported.
`modelRotationY`, `modelOffsetY` and `modelSize` fine-tune the placement; `hdriPath` takes an `.hdr` environment.

## Credits

Food and market photos from [Unsplash](https://unsplash.com) (Unsplash License).
Tsuki Yatai is fictional: the name, address, people and prices are made up.
