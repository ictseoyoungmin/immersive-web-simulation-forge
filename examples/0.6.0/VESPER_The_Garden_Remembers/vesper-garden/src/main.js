(function (V) {
  "use strict";

  const C = V.CONFIG;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const body = document.body;
  const canvas = $("#garden-canvas");
  const liveRegion = $("#live-region");

  let renderer;
  let audio;
  let settingsReturn = "title";
  let prologueTimer = null;
  let lastUiUpdate = 0;
  let lastAudioUpdate = 0;
  let lastAutosave = 0;
  let resetArmUntil = 0;
  let chapterTimer = null;

  const settings = loadSettings();
  const input = {
    keys: new Set(),
    pointerActive: false,
    pointerX: 0,
    pointerY: 0,
    pointerFocus: false,
    touchX: 0,
    touchY: 0,
    touchActive: false,
    touchFocus: false
  };

  const game = new V.GardenGame({ onEvent: handleGameEvent });
  renderer = new V.GardenRenderer(canvas, game, settings);
  audio = new V.GardenAudio();
  applySettings();
  bindInterface();
  refreshResumeButton();

  let lastFrame = performance.now();
  let accumulator = 0;
  requestAnimationFrame(frame);

  function frame(timestamp) {
    const rawDelta = Math.min(.1, Math.max(0, (timestamp - lastFrame) / 1000));
    lastFrame = timestamp;
    accumulator += rawDelta;
    let steps = 0;
    const composedInput = composeInput();
    while (accumulator >= C.FIXED_STEP && steps < C.MAX_CATCHUP_STEPS) {
      game.setInput(composedInput);
      game.step(C.FIXED_STEP);
      accumulator -= C.FIXED_STEP;
      steps += 1;
    }
    if (steps >= C.MAX_CATCHUP_STEPS) accumulator = Math.min(accumulator, C.FIXED_STEP);
    renderer.render(accumulator / C.FIXED_STEP, timestamp);

    if (timestamp - lastAudioUpdate > 48) {
      audio.update(game, composedInput);
      lastAudioUpdate = timestamp;
    }
    if (timestamp - lastUiUpdate > 80) {
      updateHud();
      lastUiUpdate = timestamp;
    }
    if (timestamp - lastAutosave > 5000 && ["play", "return"].includes(game.state.phase)) {
      saveRun();
      lastAutosave = timestamp;
    }
    requestAnimationFrame(frame);
  }

  function composeInput() {
    let x = 0;
    let y = 0;
    if (input.keys.has("KeyA") || input.keys.has("ArrowLeft")) x -= 1;
    if (input.keys.has("KeyD") || input.keys.has("ArrowRight")) x += 1;
    if (input.keys.has("KeyW") || input.keys.has("ArrowUp")) y -= 1;
    if (input.keys.has("KeyS") || input.keys.has("ArrowDown")) y += 1;

    if (input.touchActive) {
      x += input.touchX;
      y += input.touchY;
    } else if (input.pointerActive) {
      const target = screenToWorld(input.pointerX, input.pointerY);
      const dx = target.x - game.state.moth.x;
      const dy = target.y - game.state.moth.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 18) {
        x += dx / distance;
        y += dy / distance;
      }
    }
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    return {
      x,
      y,
      focus: input.keys.has("Space") || input.pointerFocus || input.touchFocus,
      pointerActive: input.pointerActive || input.touchActive
    };
  }

  function screenToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: renderer.camera.x + (clientX - rect.left - rect.width * .5) / renderer.camera.scale,
      y: renderer.camera.y + (clientY - rect.top - rect.height * .5) / renderer.camera.scale
    };
  }

  function handleGameEvent(event) {
    if (renderer) renderer.onEvent(event);
    switch (event.type) {
      case "started":
        showScreen("play");
        announce("밤이 열렸습니다. 가까운 빛을 향해 날아가세요.");
        break;
      case "flower-activated": {
        const { index, order, definition } = event.detail;
        audio.playBloom(index, order);
        announce(`${definition.korean}, ${definition.name} 꽃이 깨어났습니다.`);
        saveRun();
        break;
      }
      case "pulse":
        audio.playPulse(event.detail.index);
        break;
      case "resonance-started": {
        const def = C.FLOWER_DEFINITIONS[event.detail.index];
        announce(`${def.name}의 바람 속에서 네 개의 공명 문을 통과하세요.`);
        break;
      }
      case "resonance-gate": {
        const def = C.FLOWER_DEFINITIONS[event.detail.flowerIndex];
        const root = audio.frequencyFor(event.detail.flowerIndex, game.state.flowers[event.detail.flowerIndex].order || 0);
        audio.playTone(root * (1 + event.detail.gateIndex * .25), .48, { gain: .075, filter: 2600, type: "sine" });
        announce(`${def.name} 공명 ${event.detail.gateIndex + 1} / ${event.detail.total}`);
        break;
      }
      case "resonance-completed":
        saveRun();
        announce("목소리가 정원에 고정되었습니다.");
        break;
      case "binding-due":
        announce(`${event.detail.count}개의 목소리를 정원의 심장으로 가져가세요.`);
        break;
      case "movement-bound":
        audio.playTone(130.81 * (1 + event.detail.movement * .5), 1.5, { gain: .11, filter: 2100, type: "triangle" });
        saveRun();
        announce("화음이 심장에 묶였습니다. 다음 목소리가 들립니다.");
        showChapter(event.detail.movement === 1 ? "MOVEMENT II" : "MOVEMENT III", event.detail.movement === 1 ? "겹쳐지는 바람" : "정원이 기억하는 길");
        break;
      case "all-awake":
        announce("모든 목소리가 깨어났습니다. 정원의 심장으로 돌아가세요.");
        showChapter("THE RETURN", "당신이 만든 정원을 지나");
        saveRun();
        break;
      case "frayed":
        audio.playFray();
        announce("빛이 흐트러졌습니다. 마지막 꽃에서 다시 피어납니다.");
        break;
      case "reformed":
        audio.playReform();
        break;
      case "paused":
        showScreen("pause");
        break;
      case "resumed":
        showScreen(game.state.phase === "coda" ? "coda" : "play");
        break;
      case "night-closed":
        showScreen("night");
        saveRun();
        break;
      case "afterglow":
        showScreen("play");
        announce("잔광의 시간이 시작되었습니다.");
        break;
      case "coda-started":
        showScreen("coda");
        announce("정원이 당신이 만든 순서를 노래합니다.");
        showChapter("CODA", "정원이 당신의 순서를 노래합니다");
        saveRun();
        break;
      case "coda-voice":
        audio.playCodaVoice(event.detail.flowerIndex, event.detail.beat);
        break;
      case "completed":
        localStorage.removeItem(C.SAVE_KEY);
        setTimeout(() => showEnding(event.detail), settings.reducedMotion ? 120 : 900);
        break;
      default:
        break;
    }
  }

  function showScreen(name) {
    body.dataset.screen = name;
    const map = {
      title: "#title-screen",
      prologue: "#prologue",
      pause: "#pause-screen",
      settings: "#settings-screen",
      night: "#night-screen",
      ending: "#ending-screen"
    };
    for (const [screen, selector] of Object.entries(map)) {
      const element = $(selector);
      element.hidden = screen !== name;
    }
    const hudVisible = ["play", "pause", "coda", "night"].includes(name);
    $("#hud").setAttribute("aria-hidden", String(!hudVisible));
  }

  async function beginNewGarden() {
    await audio.unlock();
    audio.setMuted(!settings.audio);
    game.createState((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
    renderer.game = game;
    renderer.trail.length = 0;
    renderer.eventParticles.length = 0;
    clearTimeout(prologueTimer);
    showScreen("prologue");
    const lines = [
      "밤은 열다섯 분 동안만 정원을 기억합니다.",
      "꽃을 깨울 때마다, 그 바람은 끝까지 남습니다.",
      "당신이 만든 정원을 지나 다시 심장으로 돌아오세요."
    ];
    let lineIndex = 0;
    $("#prologue-line").textContent = lines[0];
    const advance = () => {
      lineIndex += 1;
      if (lineIndex >= lines.length) {
        beginPlay();
        return;
      }
      $("#prologue-line").animate(
        [{ opacity: 0, transform: "translateY(5px)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: settings.reducedMotion ? 1 : 700, easing: "ease-out" }
      );
      $("#prologue-line").textContent = lines[lineIndex];
      prologueTimer = setTimeout(advance, settings.reducedMotion ? 420 : 1550);
    };
    prologueTimer = setTimeout(advance, settings.reducedMotion ? 420 : 1450);
  }

  function beginPlay() {
    clearTimeout(prologueTimer);
    if (game.state.phase === "sleeping") game.start();
    else showScreen("play");
  }

  async function resumeSavedGarden() {
    await audio.unlock();
    audio.setMuted(!settings.audio);
    const snapshot = readSavedRun();
    if (!snapshot || !game.restore(snapshot)) {
      localStorage.removeItem(C.SAVE_KEY);
      refreshResumeButton();
      beginNewGarden();
      return;
    }
    audio.syncFromState(game);
    renderer.trail.length = 0;
    showScreen(game.state.phase === "complete" ? "ending" : "play");
    announce("기억된 정원으로 돌아왔습니다.");
  }

  function updateHud() {
    const state = game.state;
    const remaining = Math.ceil(state.remaining);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const timer = $("#timer");
    timer.textContent = state.afterglow ? "∞" : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    timer.dateTime = state.afterglow ? "" : `PT${remaining}S`;
    timer.parentElement.classList.toggle("is-afterglow", state.afterglow);

    const activeCount = game.getActiveCount();
    const movement = activeCount < 2 ? "I · 첫 번째 숨" : activeCount < Math.ceil(game.flowerLimit * .67) ? "II · 겹쳐지는 바람" : "III · 기억의 귀환";
    $("#movement-label").textContent = movement;
    const target = game.getObjectiveTarget();
    const marks = $$(".flower-mark");
    marks.forEach((mark, index) => {
      const flowerState = state.flowers[index];
      mark.classList.toggle("is-active", Boolean(flowerState && flowerState.active));
      mark.classList.toggle("is-target", Boolean(target && target.type === "flower" && target.index === index));
      mark.style.visibility = index < game.flowerLimit ? "visible" : "hidden";
    });
    $("#flower-rail").setAttribute("aria-label", `깨어난 꽃 ${activeCount} / ${game.flowerLimit}`);

    const orbitIndex = state.orbitFlower;
    const orbitReadout = $("#orbit-readout");
    if (orbitIndex !== null && !state.flowers[orbitIndex].active) {
      const flower = state.flowers[orbitIndex];
      const def = C.FLOWER_DEFINITIONS[orbitIndex];
      orbitReadout.classList.add("is-visible");
      orbitReadout.setAttribute("aria-hidden", "false");
      $(".orbit-readout__ring").style.setProperty("--p", flower.orbit.toFixed(4));
      $("#orbit-title").textContent = `${def.name} · ${Math.round(flower.orbit * 100)}%`;
      $("#orbit-hint").textContent = def.orbitDirection > 0 ? "시계 방향으로 빛의 결을 잇습니다" : "반시계 방향으로 빛의 결을 잇습니다";
    } else {
      orbitReadout.classList.remove("is-visible");
      orbitReadout.setAttribute("aria-hidden", "true");
    }

    $("#focus-fill").style.transform = `scaleX(${state.moth.focus.toFixed(4)})`;
    $("#focus-instrument").classList.toggle("is-low", state.moth.focus < .2);
    const hint = $("#hint-card");
    hint.classList.toggle("is-visible", state.phase === "play" && state.elapsed < 16);

    const eyebrow = $("#objective-eyebrow");
    const objective = $("#objective-text");
    if (state.phase === "coda") {
      eyebrow.textContent = "THE GARDEN REMEMBERS";
      objective.textContent = "당신의 순서가 새벽이 됩니다";
    } else if (state.phase === "return") {
      eyebrow.textContent = "RETURN TO THE HEART";
      objective.textContent = "모든 바람을 지나 중앙의 심장으로 돌아가세요";
    } else if (state.bindingDue) {
      eyebrow.textContent = `BIND MOVEMENT ${state.boundCounts.length + 1}`;
      objective.textContent = `${state.bindingDue}개의 목소리를 심장 안에서 묶으세요 · ${Math.round(state.bindingCharge * 100)}%`;
    } else if (state.resonance) {
      const def = C.FLOWER_DEFINITIONS[state.resonance.flowerIndex];
      eyebrow.textContent = `${def.name} · RESONANCE ${state.resonance.gateIndex + 1}/${state.resonance.gates.length} · ${Math.round(state.resonance.gateCharge * 100)}%`;
      objective.textContent = "새로운 바람을 타고 빛의 문 안에서 숨을 맞추세요";
    } else if (orbitIndex !== null) {
      eyebrow.textContent = C.FLOWER_DEFINITIONS[orbitIndex].name;
      objective.textContent = "빛의 결을 따라 꽃 주위를 완전히 도세요";
    } else if (target && target.type === "flower") {
      const def = C.FLOWER_DEFINITIONS[target.index];
      eyebrow.textContent = activeCount === 0 ? "THE FIRST BELL" : `VOICE ${activeCount + 1} OF ${game.flowerLimit}`;
      objective.textContent = activeCount === 0 ? "가까운 빛을 향해 날아가세요" : `${def.korean}을 찾아가세요`;
    }
  }

  function showEnding(detail) {
    showScreen("ending");
    $("#ending-signature").textContent = detail.signature || game.state.signature;
    $("#ending-voices").textContent = `${game.getActiveCount()} / ${game.flowerLimit}`;
    $("#ending-time").textContent = formatElapsed(game.state.completedAt || game.state.elapsed);
    $("#ending-frays").textContent = String(detail.frays ?? game.state.moth.frays);
    announce("정원이 당신의 새벽을 기억했습니다.");
  }

  function formatElapsed(totalSeconds) {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function announce(message) {
    liveRegion.textContent = "";
    requestAnimationFrame(() => { liveRegion.textContent = message; });
  }

  function showChapter(kicker, title) {
    const card = $("#chapter-card");
    clearTimeout(chapterTimer);
    $("#chapter-kicker").textContent = kicker;
    $("#chapter-title").textContent = title;
    card.classList.add("is-visible");
    chapterTimer = setTimeout(() => card.classList.remove("is-visible"), settings.reducedMotion ? 1600 : 3100);
  }

  function bindInterface() {
    window.addEventListener("resize", () => renderer.resize(true));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && ["play", "return", "coda"].includes(game.state.phase)) game.pause();
      lastFrame = performance.now();
      accumulator = 0;
    });

    window.addEventListener("keydown", event => {
      const controlCodes = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"];
      if (controlCodes.includes(event.code)) event.preventDefault();
      input.keys.add(event.code);
      if ((event.code === "Escape" || event.code === "KeyP") && !event.repeat) {
        if (game.state.phase === "paused") game.resume();
        else if (["play", "return", "coda"].includes(game.state.phase)) game.pause();
      }
      if (event.code === "KeyR" && !event.repeat && ["play", "return"].includes(game.state.phase)) game.restartCheckpoint();
      if (event.code === "Enter" && !event.repeat) {
        if (body.dataset.screen === "title") $("#start-button").click();
        else if (body.dataset.screen === "pause") $("#continue-button").click();
      }
    });
    window.addEventListener("keyup", event => input.keys.delete(event.code));
    window.addEventListener("blur", () => { input.keys.clear(); input.pointerActive = false; input.pointerFocus = false; });

    canvas.addEventListener("pointerdown", event => {
      if (!["play", "coda"].includes(body.dataset.screen)) return;
      if (event.button === 2) input.pointerFocus = true;
      else {
        input.pointerActive = true;
        input.pointerX = event.clientX;
        input.pointerY = event.clientY;
      }
      try { canvas.setPointerCapture(event.pointerId); } catch (_) { /* capture is optional */ }
    });
    canvas.addEventListener("pointermove", event => {
      if (!input.pointerActive) return;
      input.pointerX = event.clientX;
      input.pointerY = event.clientY;
    });
    const releasePointer = event => {
      if (event.button === 2) input.pointerFocus = false;
      else input.pointerActive = false;
      try { if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); } catch (_) { /* capture is optional */ }
    };
    canvas.addEventListener("pointerup", releasePointer);
    canvas.addEventListener("pointercancel", releasePointer);
    canvas.addEventListener("contextmenu", event => event.preventDefault());

    bindTouchControls();

    $("#start-button").addEventListener("click", beginNewGarden);
    $("#resume-button").addEventListener("click", resumeSavedGarden);
    $("#prologue-skip").addEventListener("click", beginPlay);
    $("#pause-button").addEventListener("click", () => game.pause());
    $("#continue-button").addEventListener("click", () => game.resume());
    $("#restart-movement-button").addEventListener("click", () => { game.restartCheckpoint(); showScreen("play"); });
    $("#afterglow-button").addEventListener("click", () => game.continueAfterglow());
    $("#night-new-button").addEventListener("click", beginNewGarden);
    $("#new-garden-button").addEventListener("click", armOrReset);
    $("#ending-new-button").addEventListener("click", beginNewGarden);
    $("#listen-button").addEventListener("click", replayGardenSong);

    $("#mute-button").addEventListener("click", async () => {
      await audio.unlock();
      settings.audio = !settings.audio;
      applySettings();
      saveSettings();
    });
    $("#title-settings-button").addEventListener("click", () => openSettings("title"));
    $("#pause-settings-button").addEventListener("click", () => openSettings("pause"));
    $("#settings-close-button").addEventListener("click", closeSettings);
    $("#setting-audio").addEventListener("change", event => { settings.audio = event.target.checked; applySettings(); saveSettings(); });
    $("#setting-motion").addEventListener("change", event => { settings.reducedMotion = event.target.checked; applySettings(); saveSettings(); });
    $("#setting-contrast").addEventListener("change", event => { settings.highContrast = event.target.checked; applySettings(); saveSettings(); });
    $("#setting-quality").addEventListener("change", event => { settings.quality = event.target.value; applySettings(); saveSettings(); });
  }

  function bindTouchControls() {
    const stick = $("#touch-stick");
    const knob = stick.querySelector("span");
    const update = event => {
      const rect = stick.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width * .5);
      const dy = event.clientY - (rect.top + rect.height * .5);
      const max = rect.width * .31;
      const length = Math.hypot(dx, dy) || 1;
      const scale = Math.min(1, max / length);
      const px = dx * scale;
      const py = dy * scale;
      input.touchX = px / max;
      input.touchY = py / max;
      input.touchActive = true;
      knob.style.transform = `translate(${px}px, ${py}px)`;
    };
    stick.addEventListener("pointerdown", event => { update(event); try { stick.setPointerCapture(event.pointerId); } catch (_) {} });
    stick.addEventListener("pointermove", event => { if (input.touchActive) update(event); });
    const release = event => {
      input.touchActive = false;
      input.touchX = input.touchY = 0;
      knob.style.transform = "translate(0,0)";
      try { if (stick.hasPointerCapture(event.pointerId)) stick.releasePointerCapture(event.pointerId); } catch (_) {}
    };
    stick.addEventListener("pointerup", release);
    stick.addEventListener("pointercancel", release);
    const focus = $("#touch-focus");
    focus.addEventListener("pointerdown", event => { input.touchFocus = true; try { focus.setPointerCapture(event.pointerId); } catch (_) {} });
    focus.addEventListener("pointerup", () => { input.touchFocus = false; });
    focus.addEventListener("pointercancel", () => { input.touchFocus = false; });
  }

  function armOrReset(event) {
    const button = event.currentTarget;
    const now = performance.now();
    if (now < resetArmUntil) {
      localStorage.removeItem(C.SAVE_KEY);
      resetArmUntil = 0;
      button.textContent = "새로운 정원";
      beginNewGarden();
      return;
    }
    resetArmUntil = now + 3200;
    button.textContent = "다시 눌러 새 정원 확인";
    setTimeout(() => {
      if (performance.now() >= resetArmUntil) {
        resetArmUntil = 0;
        button.textContent = "새로운 정원";
      }
    }, 3300);
  }

  function openSettings(returnTo) {
    settingsReturn = returnTo;
    showScreen("settings");
  }

  function closeSettings() {
    showScreen(settingsReturn);
  }

  function replayGardenSong() {
    audio.unlock();
    const order = game.state.activationOrder;
    order.forEach((index, beat) => {
      setTimeout(() => {
        audio.playCodaVoice(index, beat);
        renderer.onEvent({ type: "coda-voice", detail: { flowerIndex: index, beat }, state: game.state });
      }, beat * 1050);
    });
  }

  function loadSettings() {
    const defaults = {
      audio: true,
      reducedMotion: window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      highContrast: false,
      quality: "auto"
    };
    try {
      const saved = JSON.parse(localStorage.getItem(C.SETTINGS_KEY));
      return { ...defaults, ...(saved || {}) };
    } catch (_) {
      return defaults;
    }
  }

  function saveSettings() {
    try { localStorage.setItem(C.SETTINGS_KEY, JSON.stringify(settings)); } catch (_) { /* local persistence may be unavailable */ }
  }

  function applySettings() {
    body.classList.toggle("reduced-motion", settings.reducedMotion);
    body.classList.toggle("high-contrast", settings.highContrast);
    $("#setting-audio").checked = settings.audio;
    $("#setting-motion").checked = settings.reducedMotion;
    $("#setting-contrast").checked = settings.highContrast;
    $("#setting-quality").value = settings.quality;
    $("#mute-button").setAttribute("aria-pressed", String(!settings.audio));
    $("#mute-button").setAttribute("aria-label", settings.audio ? "소리 끄기" : "소리 켜기");
    if (audio) audio.setMuted(!settings.audio);
    if (renderer) renderer.setSettings(settings);
  }

  function saveRun() {
    if (!["play", "return", "coda", "night-closed"].includes(game.state.phase)) return;
    try { localStorage.setItem(C.SAVE_KEY, JSON.stringify(game.snapshot())); } catch (_) { /* recovery remains available in-memory */ }
    refreshResumeButton();
  }

  function readSavedRun() {
    try {
      const value = localStorage.getItem(C.SAVE_KEY);
      return value ? JSON.parse(value) : null;
    } catch (_) {
      return null;
    }
  }

  function refreshResumeButton() {
    const snapshot = readSavedRun();
    const valid = Boolean(snapshot && snapshot.version === C.VERSION && snapshot.state && snapshot.state.phase !== "complete");
    $("#resume-button").hidden = !valid;
  }

  async function prepareVerification(scenario = "reference-case") {
    clearTimeout(prologueTimer);
    game.createState(0x5e5e7);
    if (scenario === "title") {
      renderer.camera.x = 1230;
      renderer.camera.y = 680;
      audio.setMuted(true);
      showScreen("title");
      return { status: "pass", scenario, activeFlowers: 0 };
    }
    game.start();
    if (scenario === "resonance" || scenario === "midgame-resonance") {
      const completed = scenario === "midgame-resonance" ? 4 : 0;
      for (let i = 0; i < completed; i += 1) game.activateFlower(i, { silent: true, skipResonance: true });
      const activeIndex = completed;
      game.activateFlower(activeIndex, { silent: true });
      const gate = game.state.resonance.gates[0];
      game.state.moth.x = gate.x - 120;
      game.state.moth.y = gate.y + 55;
      game.state.moth.previousX = game.state.moth.x;
      game.state.moth.previousY = game.state.moth.y;
      game.state.elapsed = scenario === "midgame-resonance" ? 628 : 92;
      game.state.remaining = C.GAME_DURATION_SECONDS - game.state.elapsed;
    } else if (scenario === "reference-case" || scenario === "three-bells-active") {
      const count = scenario === "three-bells-active" ? game.flowerLimit : Math.min(2, game.flowerLimit);
      for (let i = 0; i < count; i += 1) game.activateFlower(i, { silent: true, skipResonance: true });
      if (count >= game.flowerLimit) game.state.phase = "return";
      game.state.moth.x = 1120;
      game.state.moth.y = 520;
      game.state.moth.previousX = game.state.moth.x;
      game.state.moth.previousY = game.state.moth.y;
      game.state.elapsed = 326;
      game.state.remaining = C.GAME_DURATION_SECONDS - game.state.elapsed;
    } else if (scenario === "ending") {
      for (let i = 0; i < game.flowerLimit; i += 1) game.activateFlower(i, { silent: true, skipResonance: true });
      game.state.elapsed = 782;
      game.state.remaining = C.GAME_DURATION_SECONDS - game.state.elapsed;
      game.state.phase = "complete";
      game.state.completedAt = game.state.elapsed;
      game.state.signature = game.state.activationOrder.map(index => C.FLOWER_DEFINITIONS[index].name).join(" · ");
      showEnding({ signature: game.state.signature, elapsed: game.state.elapsed, frays: 1 });
    } else if (scenario === "six-bells-coda" || scenario === "completion") {
      for (let i = 0; i < game.flowerLimit; i += 1) game.activateFlower(i, { silent: true, skipResonance: true });
      game.state.moth.x = C.HEART_X;
      game.state.moth.y = C.HEART_Y;
      game.state.elapsed = 782;
      game.state.remaining = C.GAME_DURATION_SECONDS - game.state.elapsed;
      game.state.phase = "return";
      game.beginCoda();
      game.state.codaTime = C.CODA_SECONDS * .48;
    }
    renderer.camera.x = scenario.includes("coda") ? C.HEART_X : 1120;
    renderer.camera.y = scenario.includes("coda") ? C.HEART_Y : 620;
    audio.setMuted(true);
    if (scenario === "ending") showScreen("ending");
    else showScreen(game.state.phase === "coda" ? "coda" : "play");
    updateHud();
    return { status: "pass", scenario, activeFlowers: game.getActiveCount() };
  }

  window.__FORGE__ = {
    async prepareVerification(scenario) { return prepareVerification(scenario); },
    verifyWorkflow() { return V.GardenGame.verifyWorkflow(); },
    verifyDomain() { return V.GardenGame.verifyDomain(); },
    setCaptureMode(enabled) { renderer.setCaptureMode(enabled); return renderer.reportFidelity(); },
    reportFidelity() { return renderer.reportFidelity(); },
    getState() { return JSON.parse(JSON.stringify(game.state)); },
    get player() { return game.state.moth; }
  };
})(window.Vesper ||= {});
