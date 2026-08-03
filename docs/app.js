const surfaces = [
  {
    generation: "0.6", index: "06 / 01", title: "AEROLAB X4", subtitle: "Drone physics engine / wind tunnel", profile: "SIMULATION LAB", claim: "ENGINEERING APPROX.",
    description: "A fixed-step quadrotor model where wind, force, pressure, telemetry, and payload state use one shared field.",
    proof: "PHYSICS + BROWSER RECORDED", image: "../examples/0.6.0/AEROLAB_X4_Drone_Wind_Tunnel/preview.webp", href: "../examples/0.6.0/AEROLAB_X4_Drone_Wind_Tunnel/index.html", accent: "cyan"
  },
  {
    generation: "0.6", index: "06 / 02", title: "VESPER", subtitle: "The garden remembers", profile: "GAME ARENA", claim: "VISUAL CONCEPT",
    description: "A one-night garden game where awakened flowers leave wind, music, and a route back to the central heart.",
    proof: "RULES + BROWSER RECORDED", image: "../examples/0.6.0/VESPER_The_Garden_Remembers/vesper-garden/2026-08-03-160814.png", href: "../examples/0.6.0/VESPER_The_Garden_Remembers/vesper-garden/index.html", accent: "violet"
  },
  {
    generation: "0.6", index: "06 / 03", title: "PIXEL MINIONS", subtitle: "Room explorer / phase 01", profile: "WORLD SLICE", claim: "VISUAL CONCEPT",
    description: "A third-person room explorer with a 20 × 20 × 8 m space, 120 Hz physics, checkpoints, collectibles, and live tuning.",
    proof: "GAMEPLAY + BROWSER RECORDED", image: "../examples/0.6.0/Pixel_Minions_Room_Explorer_Phase1/2026-08-03-153501.png", href: "../examples/0.6.0/Pixel_Minions_Room_Explorer_Phase1/Pixel_Minions_Room_Explorer_Phase1.html", accent: "amber"
  },
  {
    generation: "0.6", index: "06 / 04", title: "K-HOLO STATUS", subtitle: "Open world / revision surface", profile: "AMBIENT SYSTEM", claim: "VISUAL CONCEPT",
    description: "A status window paired with a WebGL world example from the 0.6 archive.",
    proof: "BROWSER RECORDED", image: "../examples/0.6.0/k-holo-status-openworld-revision/k-holo-status-openworld/preview.webp", href: "../examples/0.6.0/k-holo-status-openworld-revision/k-holo-status-openworld/index.html", accent: "cyan"
  },
  {
    generation: "0.4", index: "04 / 01", title: "AETHERWILD", subtitle: "The living meridian", profile: "FULL-WINDOW WORLD", claim: "VISUAL CONCEPT",
    description: "A raw WebGL 2 procedural world with movement, resonance scans, transformations, adaptive rendering, and procedural audio.",
    proof: "BROWSER RECORDED", image: "../examples/0.4.0/aetherwild/preview.webp", href: "../examples/0.4.0/aetherwild/index.html", accent: "cyan"
  },
  {
    generation: "0.4", index: "04 / 02", title: "CHRONOLITH FOUNDRY", subtitle: "Flagship spatial instrument", profile: "FULL-WINDOW WORLD", claim: "VISUAL CONCEPT",
    description: "A standalone flagship HTML example included in the 0.4 archive.",
    proof: "LEGACY SURFACE", image: null, href: "../examples/0.4.0/Chronolith_Foundry_FLAGSHIP.html", accent: "amber", synthetic: "synthetic-amber"
  },
  {
    generation: "0.3", index: "03 / 01", title: "AETHERIS", subtitle: "Open world / field systems", profile: "FULL-WINDOW WORLD", claim: "VISUAL CONCEPT",
    description: "A procedural open-world example using shared-field and world-director modules.",
    proof: "LEGACY VALIDATION", image: "../examples/0.3.0/aetheris-open-world/preview.webp", href: "../examples/0.3.0/aetheris-open-world/index.html", accent: "cyan"
  },
  {
    generation: "0.3", index: "03 / 02", title: "AETHERFALL", subtitle: "Open world / atmospheric study", profile: "FULL-WINDOW WORLD", claim: "VISUAL CONCEPT",
    description: "An open-world example from the 0.3 archive with a captured browser validation record.", warning: "LONGER INITIAL LOAD",
    proof: "LEGACY VALIDATION", image: "../examples/0.3.0/AETHERFALL_OPEN_WORLD/preview.webp", href: "../examples/0.3.0/AETHERFALL_OPEN_WORLD/index.html", accent: "violet"
  },
  {
    generation: "0.3", index: "03 / 03", title: "NEON DISTRICT RUNNER", subtitle: "Open world / early slice", profile: "FULL-WINDOW WORLD", claim: "VISUAL CONCEPT",
    description: "An early open-world example stored in the 0.3 archive.",
    proof: "LEGACY SURFACE", image: null, href: "../examples/0.3.0/NEON_DISTRICT_RUNNER/index.html", accent: "coral", synthetic: "synthetic-coral"
  }
];

const grid = document.querySelector("#archive-grid");
const emptyState = document.querySelector("#empty-state");
const filters = [...document.querySelectorAll("[data-filter]")];
const count = document.querySelector("[data-visible-count]");

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"}[char]));
}

function cardArt(surface) {
  const media = surface.image
    ? `<img src="${escapeHtml(surface.image)}" alt="${escapeHtml(surface.title)} preview" loading="lazy">`
    : "";
  const syntheticClass = surface.synthetic ? ` synthetic ${surface.synthetic}` : "";
  const warning = surface.warning ? `<span class="card-warning" title="${escapeHtml(surface.warning)}"><i aria-hidden="true"></i>${escapeHtml(surface.warning)}</span>` : "";
  return `<div class="card-art${syntheticClass}">${media}<span class="card-art-label">${escapeHtml(surface.index)}</span>${warning}<span class="card-art-index">${escapeHtml(surface.profile)}</span></div>`;
}

function render(filter = "all") {
  const visible = surfaces.filter(surface => filter === "all" || surface.generation === filter);
  grid.innerHTML = visible.map(surface => `
    <a class="archive-card" href="${escapeHtml(surface.href)}" target="_blank" rel="noopener" aria-label="Open ${escapeHtml(surface.title)} example">
      ${cardArt(surface)}
      <div class="card-body">
        <div class="card-meta"><span>${escapeHtml(surface.generation)} / ${escapeHtml(surface.subtitle)}</span><span>${escapeHtml(surface.claim)}</span></div>
        <h3 class="card-title">${escapeHtml(surface.title)}</h3>
        <p class="card-description">${escapeHtml(surface.description)}</p>
        <div class="card-footer"><span>${escapeHtml(surface.proof)}</span><span class="card-link">OPEN EXAMPLE ↗</span></div>
      </div>
    </a>
  `).join("");
  count.textContent = String(visible.length).padStart(2, "0");
  emptyState.hidden = visible.length !== 0;
}

filters.forEach(filter => {
  filter.addEventListener("click", () => {
    filters.forEach(item => item.classList.toggle("is-active", item === filter));
    render(filter.dataset.filter);
  });
});

document.querySelector("[data-stat=artifacts]").textContent = String(surfaces.length).padStart(2, "0");
render();

const themeToggle = document.querySelector("#theme-toggle");
const themeLabel = document.querySelector("[data-theme-label]");

function setTheme(theme) {
  const dark = theme === "dark";
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  themeToggle.setAttribute("aria-pressed", String(dark));
  themeToggle.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  themeLabel.textContent = dark ? "DARK" : "LIGHT";
  try { localStorage.setItem("forge-theme", dark ? "dark" : "light"); } catch {}
}

setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
themeToggle.addEventListener("click", () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
