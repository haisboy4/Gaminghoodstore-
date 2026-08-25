const state = {
  games: [],
  filtered: []
};

const $ = (selector) => document.querySelector(selector);

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function skeletons(target, count = 4) {
  target.innerHTML = Array.from({ length: count }, () => `
    <article class="game-card">
      <div class="skeleton skeleton-cover"></div>
      <div class="skeleton skeleton-info"></div>
    </article>
  `).join("");
}

function gameCard(game) {
  const title = escapeHTML(game.title);
  const platform = escapeHTML(game.platform || "Game");
  const emulator = game.emulator ? escapeHTML(game.emulator) : "";
  const build = game.build ? escapeHTML(game.build) : "";
  const tags = Array.isArray(game.tags) ? game.tags.slice(0, 2) : [];

  const cover = game.image
    ? `<img src="${escapeHTML(game.image)}" alt="${title}" loading="lazy">`
    : `<div class="cover-placeholder">${title}</div>`;

  return `
    <article class="game-card">
      <a href="game.html?id=${encodeURIComponent(game.id)}" aria-label="Open ${title}">
        <div class="cover">
          ${cover}
          <span class="platform-badge">${platform}</span>
          ${build ? `<span class="build-badge">${build}</span>` : ""}
        </div>
        <div class="card-info">
          <h3 class="card-title">${title}</h3>
          <p class="card-meta">${emulator || platform}${game.size ? ` • ${escapeHTML(game.size)}` : ""}</p>
          ${tags.length ? `<div class="card-tags">${tags.map(tag => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}</div>` : ""}
        </div>
      </a>
    </article>
  `;
}

function renderGrid(target, games) {
  target.innerHTML = games.length
    ? games.map(gameCard).join("")
    : "";
}

function normalizeGames(data) {
  return data.map((game, index) => ({
    id: game.id || `game-${index + 1}`,
    title: game.title || "Untitled Game",
    platform: game.platform || "Other",
    emulator: game.emulator || "",
    image: game.image || "",
    size: game.size || "",
    build: game.build || "",
    description: game.description || "",
    tags: Array.isArray(game.tags) ? game.tags : [],
    views: Number(game.views || 0),
    added: game.added || ""
  }));
}

async function loadGames() {
  const recent = $("#recentGrid");
  const top = $("#topGrid");
  const all = $("#allGrid");

  skeletons(recent, 4);
  skeletons(top, 4);
  skeletons(all, 8);

  try {
    const response = await fetch("data/games.json", { cache: "no-cache" });
    if (!response.ok) throw new Error("Could not load games");
    const data = await response.json();

    state.games = normalizeGames(data);
    state.filtered = [...state.games];

    renderHome();
  } catch (error) {
    console.error(error);
    recent.innerHTML = "";
    top.innerHTML = "";
    all.innerHTML = `<p class="empty-state">The game database could not be loaded.</p>`;
    showToast("Could not load the game database");
  }
}

function renderHome() {
  const newest = [...state.games]
    .sort((a, b) => new Date(b.added || 0) - new Date(a.added || 0))
    .slice(0, 8);

  const top = [...state.games]
    .sort((a, b) => b.views - a.views)
    .slice(0, 8);

  renderGrid($("#recentGrid"), newest);
  renderGrid($("#topGrid"), top);
  renderGrid($("#allGrid"), state.filtered);

  $("#resultCount").textContent =
    `${state.filtered.length} game${state.filtered.length === 1 ? "" : "s"}`;

  $("#emptyState").hidden = state.filtered.length !== 0;
}

function filterGames(query) {
  const q = query.trim().toLowerCase();

  state.filtered = !q
    ? [...state.games]
    : state.games.filter(game => {
        const haystack = [
          game.title,
          game.platform,
          game.emulator,
          game.description,
          ...(game.tags || [])
        ].join(" ").toLowerCase();

        return haystack.includes(q);
      });

  renderGrid($("#allGrid"), state.filtered);
  $("#resultCount").textContent =
    `${state.filtered.length} game${state.filtered.length === 1 ? "" : "s"}`;
  $("#emptyState").hidden = state.filtered.length !== 0;

  document.querySelector("#games")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openDrawer() {
  $("#drawer").classList.add("open");
  $("#drawerBackdrop").classList.add("open");
  $("#drawer").setAttribute("aria-hidden", "false");
  $("#menuBtn").setAttribute("aria-expanded", "true");
}

function closeDrawer() {
  $("#drawer").classList.remove("open");
  $("#drawerBackdrop").classList.remove("open");
  $("#drawer").setAttribute("aria-hidden", "true");
  $("#menuBtn").setAttribute("aria-expanded", "false");
}

function setupNavigation() {
  $("#menuBtn").addEventListener("click", openDrawer);
  $("#closeDrawer").addEventListener("click", closeDrawer);
  $("#drawerBackdrop").addEventListener("click", closeDrawer);

  document.querySelectorAll(".nav-drop").forEach(button => {
    button.addEventListener("click", () => {
      const target = document.getElementById(button.dataset.target);
      target.classList.toggle("open");
      button.querySelector("span").textContent = target.classList.contains("open") ? "⌃" : "⌄";
    });
  });

  document.querySelectorAll(".drawer a").forEach(link => {
    link.addEventListener("click", () => {
      if (!link.classList.contains("nav-drop")) closeDrawer();
    });
  });

  $("#searchBtn").addEventListener("click", () => {
    $("#heroSearchInput").focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("#randomBtn").addEventListener("click", () => {
    if (!state.games.length) return;
    const game = state.games[Math.floor(Math.random() * state.games.length)];
    window.location.href = `game.html?id=${encodeURIComponent(game.id)}`;
  });

  $("#heroSearchBtn").addEventListener("click", () => {
    filterGames($("#heroSearchInput").value);
  });

  $("#heroSearchInput").addEventListener("keydown", event => {
    if (event.key === "Enter") filterGames(event.target.value);
  });

  $("#librarySearchInput").addEventListener("input", event => {
    const q = event.target.value.trim().toLowerCase();
    state.filtered = !q
      ? [...state.games]
      : state.games.filter(game =>
          [game.title, game.platform, game.emulator, game.description, ...(game.tags || [])]
            .join(" ").toLowerCase().includes(q)
        );

    renderGrid($("#allGrid"), state.filtered);
    $("#resultCount").textContent =
      `${state.filtered.length} game${state.filtered.length === 1 ? "" : "s"}`;
    $("#emptyState").hidden = state.filtered.length !== 0;
  });

  $("#drawerSearchForm").addEventListener("submit", event => {
    event.preventDefault();
    closeDrawer();
    filterGames($("#drawerSearchInput").value);
  });
}

function setupPWA() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js")
        .catch(error => console.warn("Service worker:", error));
    });
  }
}

$("#year").textContent = new Date().getFullYear();
setupNavigation();
setupPWA();
loadGames();
