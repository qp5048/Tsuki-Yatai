// =========================================================
// News page: category filter, search, and an article view
// (news.html?a=<id>) that works with the back button.
// =========================================================

import { NEWS, NEWS_CATEGORIES, photo } from "./data.js";
import { formatDate, esc } from "./common.js";

const listView = document.getElementById("news-list-view");
const articleView = document.getElementById("news-article");
const articleBody = document.getElementById("news-article-body");
const feed = document.getElementById("news-feed");
const count = document.getElementById("news-count");
const search = document.getElementById("news-search");
const cats = document.getElementById("news-cats");

let category = "All";
const longDate = (iso) => formatDate(iso, { day: "numeric", month: "long", year: "numeric" });

// ---------- Filters ----------
cats.innerHTML = ["All", ...NEWS_CATEGORIES].map((c) =>
  `<button class="chip" type="button" data-cat="${c}" aria-pressed="${c === category}" style="padding-left:.9em">${c}</button>`).join("");
cats.addEventListener("click", (e) => {
  const chip = e.target.closest("[data-cat]");
  if (!chip) return;
  category = chip.dataset.cat;
  cats.querySelectorAll("[data-cat]").forEach((c) => c.setAttribute("aria-pressed", String(c === chip)));
  renderList();
});
search.addEventListener("input", renderList);

// Highlight search matches without trusting article text as HTML
function mark(text, q) {
  const safe = esc(text);
  if (!q) return safe;
  const pattern = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  return safe.replace(pattern, '<mark style="background:#ffe08a;color:inherit;border-radius:3px">$1</mark>');
}

function renderList() {
  const q = search.value.trim();
  const ql = q.toLowerCase();
  const list = NEWS.filter((n) => (category === "All" || n.category === category)
    && (!ql || [n.title, n.lede, ...n.body].join(" ").toLowerCase().includes(ql)));

  count.textContent = q || category !== "All"
    ? `${list.length} ${list.length === 1 ? "story" : "stories"}${category !== "All" ? ` in ${category}` : ""}${q ? ` matching "${q}"` : ""}`
    : "";

  if (!list.length) {
    feed.innerHTML = `<li style="grid-column:1/-1"><div class="empty"><strong>No stories match.</strong><p>Try another word, or show every category.</p><button class="btn btn--ghost btn--small" type="button" data-reset>Show all news</button></div></li>`;
    return;
  }
  feed.innerHTML = list.map((n, i) => `<li>
    <a class="story-big" href="?a=${n.id}" data-article="${n.id}">
      <div class="frame"><img src="${photo(n.img, i === 0 ? 1200 : 800)}" alt="${esc(n.alt)}" loading="${i < 2 ? "eager" : "lazy"}" width="1200" height="800"></div>
      <div style="display:grid;gap:12px">
        <p class="meta"><span class="cat">${esc(n.category)}</span><time datetime="${n.date}">${longDate(n.date)}</time></p>
        <h3 style="${i === 0 ? "" : "font-size:var(--step-2)"}">${mark(n.title, q)}</h3>
        <p>${mark(n.lede, q)}</p>
      </div>
    </a></li>`).join("");
}

feed.addEventListener("click", (e) => {
  if (e.target.closest("[data-reset]")) {
    search.value = "";
    category = "All";
    cats.querySelectorAll("[data-cat]").forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.cat === "All")));
    renderList();
    return;
  }
  const link = e.target.closest("[data-article]");
  if (!link || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  history.pushState({ a: link.dataset.article }, "", `?a=${link.dataset.article}`);
  route();
});

// ---------- Article view ----------
function renderArticle(n) {
  const i = NEWS.indexOf(n);
  const next = NEWS[(i + 1) % NEWS.length];
  document.title = `${n.title} — Valvskolan`;
  articleBody.innerHTML = `
    <a class="article__back" href="news.html" data-back><svg class="icon" aria-hidden="true"><use href="#i-back"/></svg>All news</a>
    <p class="meta" style="margin-top:28px"><span class="cat">${esc(n.category)}</span><time datetime="${n.date}">${longDate(n.date)}</time></p>
    <h1 tabindex="-1" id="article-title">${esc(n.title)}</h1>
    <p class="article__lede">${esc(n.lede)}</p>
    <figure class="frame" style="margin-inline:0"><img src="${photo(n.img, 1400)}" alt="${esc(n.alt)}" width="1400" height="788"></figure>
    <div class="article__body">${n.body.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
    <p class="article__next"><span class="muted">Next story</span><br><a href="?a=${next.id}" data-article="${next.id}" style="font-size:var(--step-2);font-weight:700">${esc(next.title)}</a></p>`;
}

articleBody.addEventListener("click", (e) => {
  if (e.target.closest("[data-back]")) {
    e.preventDefault();
    history.pushState({}, "", "news.html");
    route();
    return;
  }
  const link = e.target.closest("[data-article]");
  if (!link) return;
  e.preventDefault();
  history.pushState({ a: link.dataset.article }, "", `?a=${link.dataset.article}`);
  route();
});

function route() {
  const id = new URLSearchParams(location.search).get("a");
  const n = NEWS.find((x) => x.id === id);
  listView.hidden = Boolean(n);
  articleView.hidden = !n;
  if (n) {
    renderArticle(n);
    window.scrollTo({ top: articleView.offsetTop - 20 });
    document.getElementById("article-title").focus({ preventScroll: true });
  } else {
    document.title = "News — Valvskolan";
    renderList();
  }
}
window.addEventListener("popstate", route);
route();
