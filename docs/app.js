const surfaces = [
  {
    generation: "0.7", index: "07 / 01", title: "PELAGIC", subtitle: "A living ocean", profile: "FULL-WINDOW WORLD", claim: "VISUAL CONCEPT",
    description: "A deterministic directional ocean where swell, current, foam, spray, weather, reflected light, and a working lighthouse share one state.",
    proof: "FORGE + BROWSER RECORDED", image: "../examples/0.7.0/realistic-ocean-simulation/preview.png", href: "../examples/0.7.0/realistic-ocean-simulation/dist/index.html", accent: "cyan"
  },
  {
    generation: "0.6", index: "06 / 01", title: "ARMORY BENCH", subtitle: "Modular weapon customization bench", profile: "CONFIGURATOR", claim: "VISUAL CONCEPT",
    description: "A MK-VII 〈REVENANT〉 maintenance station where modules attach and detach with live mass properties and fit constraints.",
    proof: "BROWSER RECORDED", image: "../examples/0.6.0/armory-bench/assets/armory-bench-preview.png", href: "../examples/0.6.0/armory-bench/index.html", accent: "amber"
  },
  {
    generation: "0.6", index: "06 / 02", title: "AEROLAB X4", subtitle: "Drone physics engine / wind tunnel", profile: "SIMULATION LAB", claim: "ENGINEERING APPROX.",
    description: "A fixed-step quadrotor model where wind, force, pressure, telemetry, and payload state use one shared field.",
    proof: "PHYSICS + BROWSER RECORDED", image: "../examples/0.6.0/AEROLAB_X4_Drone_Wind_Tunnel/preview.webp", href: "../examples/0.6.0/AEROLAB_X4_Drone_Wind_Tunnel/index.html", accent: "cyan"
  },
  {
    generation: "0.6", index: "06 / 03", title: "VESPER", subtitle: "The garden remembers", profile: "GAME ARENA", claim: "VISUAL CONCEPT",
    description: "A one-night garden game where awakened flowers leave wind, music, and a route back to the central heart.",
    proof: "RULES + BROWSER RECORDED", image: "../examples/0.6.0/VESPER_The_Garden_Remembers/vesper-garden/2026-08-03-160814.png", href: "../examples/0.6.0/VESPER_The_Garden_Remembers/vesper-garden/index.html", accent: "violet"
  },
  {
    generation: "0.6", index: "06 / 04", title: "PIXEL MINIONS", subtitle: "Room explorer / phase 01", profile: "WORLD SLICE", claim: "VISUAL CONCEPT",
    description: "A third-person room explorer with a 20 × 20 × 8 m space, 120 Hz physics, checkpoints, collectibles, and live tuning.",
    proof: "GAMEPLAY + BROWSER RECORDED", image: "../examples/0.6.0/Pixel_Minions_Room_Explorer_Phase1/2026-08-03-153501.png", href: "../examples/0.6.0/Pixel_Minions_Room_Explorer_Phase1/Pixel_Minions_Room_Explorer_Phase1.html", accent: "amber"
  },
  {
    generation: "0.6", index: "06 / 05", title: "K-HOLO STATUS", subtitle: "Open world / revision surface", profile: "AMBIENT SYSTEM", claim: "VISUAL CONCEPT",
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

const reel = [
  {
    field: "FIELD 01", title: "PELAGIC", aria: "PELAGIC living ocean with rolling swell and a lighthouse island",
    video: null, poster: "../examples/0.7.0/realistic-ocean-simulation/preview.png",
    claim: "INTERACTIVE VISUAL CONCEPT"
  },
  {
    field: "FIELD 02", title: "ARMORY BENCH", aria: "ARMORY BENCH weapon customization bench, MK-VII Revenant",
    video: "../examples/0.6.0/armory-bench/assets/armory-bench-demo-opus5.mp4", poster: "../examples/0.6.0/armory-bench/assets/armory-bench-preview.png",
    claim: "INTERACTIVE VISUAL CONCEPT"
  },
  {
    field: "FIELD 03", title: "AEROLAB X4", aria: "AEROLAB X4 drone inside a wind tunnel",
    video: "../examples/0.6.0/AEROLAB_X4_Drone_Wind_Tunnel/AEROLAB-X4.mp4", poster: "../examples/0.6.0/AEROLAB_X4_Drone_Wind_Tunnel/preview.webp",
    claim: "INTERACTIVE ENGINEERING APPROXIMATION"
  }
];

const reelVideo = document.querySelector("#reel-video");
const reelLabel = document.querySelector("#reel-label");
const reelClaim = document.querySelector("#reel-claim");
const reelDots = document.querySelector("#reel-dots");
const reelPlayBtn = document.querySelector(".reel-play");
const reelVisual = document.querySelector("#reel-visual");
let reelIndex = 0;

reelDots.innerHTML = reel.map((_, i) => `<button class="reel-dot" type="button" data-reel-dot="${i}" aria-label="Show example ${i + 1}"></button>`).join("");
const reelDotEls = [...reelDots.children];

function setReelPlayState(playing) {
  reelPlayBtn.setAttribute("aria-pressed", String(playing));
  reelPlayBtn.setAttribute("aria-label", playing ? "Pause video" : "Play video");
  reelPlayBtn.querySelector(".reel-play-icon").textContent = playing ? "❚❚" : "▶";
}

function showReel(index) {
  reelIndex = (index + reel.length) % reel.length;
  const item = reel[reelIndex];
  reelLabel.textContent = `${item.field} — ${item.title}`;
  reelClaim.textContent = item.claim;
  reelVideo.setAttribute("aria-label", item.aria);
  reelVideo.poster = item.poster;
  reelDotEls.forEach((dot, i) => dot.classList.toggle("is-active", i === reelIndex));
  reelPlayBtn.hidden = !item.video;
  if (item.video) {
    reelVideo.src = item.video;
    reelVideo.play().then(() => setReelPlayState(true)).catch(() => setReelPlayState(false));
  } else {
    reelVideo.removeAttribute("src");
    reelVideo.load();
    setReelPlayState(false);
  }
}

reelDotEls.forEach(dot => dot.addEventListener("click", () => showReel(Number(dot.dataset.reelDot))));
document.querySelector(".reel-prev").addEventListener("click", () => showReel(reelIndex - 1));
document.querySelector(".reel-next").addEventListener("click", () => showReel(reelIndex + 1));
reelPlayBtn.addEventListener("click", () => {
  if (reelVideo.paused) { reelVideo.play(); setReelPlayState(true); } else { reelVideo.pause(); setReelPlayState(false); }
});
reelVideo.addEventListener("ended", () => showReel(reelIndex + 1));

let reelSwipeX = null;
reelVisual.addEventListener("pointerdown", event => { reelSwipeX = event.clientX; });
reelVisual.addEventListener("pointerup", event => {
  if (reelSwipeX === null) return;
  const delta = event.clientX - reelSwipeX;
  reelSwipeX = null;
  if (Math.abs(delta) > 40) showReel(reelIndex + (delta < 0 ? 1 : -1));
});

showReel(0);

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

async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

document.querySelectorAll("[data-copy-target]").forEach(button => {
  const original = button.textContent;
  button.addEventListener("click", async () => {
    const target = document.getElementById(button.dataset.copyTarget);
    if (!target) return;
    try {
      await copyToClipboard(target.textContent.trim());
      button.textContent = "Copied";
      button.classList.add("is-copied");
      window.setTimeout(() => {
        button.textContent = original;
        button.classList.remove("is-copied");
      }, 1400);
    } catch {
      button.textContent = "Failed";
      window.setTimeout(() => {
        button.textContent = original;
      }, 1400);
    }
  });
});
