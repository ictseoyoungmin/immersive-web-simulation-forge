(function (V) {
  "use strict";

  const C = V.CONFIG;

  function freshFlowerState() {
    return {
      active: false,
      activatedAt: null,
      order: null,
      orbit: 0,
      lastAngle: null,
      lastPulseCycle: null
    };
  }

  class GardenGame {
    constructor(options = {}) {
      this.onEvent = typeof options.onEvent === "function" ? options.onEvent : () => {};
      this.flowerLimit = V.clamp(options.flowerLimit || C.ACTIVE_FLOWER_LIMIT, 1, C.FLOWER_DEFINITIONS.length);
      this.input = { x: 0, y: 0, focus: false, pointerActive: false };
      this.seed = options.seed || ((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
      this.createState(this.seed);
    }

    createState(seed) {
      this.seed = seed >>> 0;
      this.state = {
        version: C.VERSION,
        seed: this.seed,
        phase: "sleeping",
        phaseBeforePause: "play",
        elapsed: 0,
        remaining: C.GAME_DURATION_SECONDS,
        afterglow: false,
        fieldTime: 0,
        activationOrder: [],
        flowers: C.FLOWER_DEFINITIONS.map(freshFlowerState),
        resonance: null,
        bindingDue: null,
        bindingCharge: 0,
        boundCounts: [],
        moth: {
          x: C.START_X,
          y: C.START_Y,
          previousX: C.START_X,
          previousY: C.START_Y,
          vx: 0,
          vy: 0,
          angle: -.18,
          focus: 1,
          frayTimer: 0,
          frayCooldown: 0,
          frays: 0,
          checkpointX: C.START_X,
          checkpointY: C.START_Y
        },
        orbitFlower: null,
        codaTime: 0,
        codaBeat: -1,
        completedAt: null,
        signature: ""
      };
      this.emit("state-created", { seed: this.seed });
      return this.state;
    }

    emit(type, detail = {}) {
      this.onEvent({ type, detail, state: this.state });
    }

    start() {
      if (this.state.phase === "sleeping") {
        this.state.phase = "play";
        this.emit("started", { seed: this.seed });
      }
    }

    pause() {
      const allowed = ["play", "return", "coda"];
      if (!allowed.includes(this.state.phase)) return false;
      this.state.phaseBeforePause = this.state.phase;
      this.state.phase = "paused";
      this.emit("paused");
      return true;
    }

    resume() {
      if (this.state.phase !== "paused") return false;
      this.state.phase = this.state.phaseBeforePause || "play";
      this.emit("resumed");
      return true;
    }

    continueAfterglow() {
      if (this.state.phase !== "night-closed") return false;
      this.state.afterglow = true;
      this.state.phase = this.state.activationOrder.length >= this.flowerLimit ? "return" : "play";
      this.emit("afterglow");
      return true;
    }

    setInput(input) {
      this.input.x = V.clamp(Number(input.x) || 0, -1, 1);
      this.input.y = V.clamp(Number(input.y) || 0, -1, 1);
      const length = Math.hypot(this.input.x, this.input.y);
      if (length > 1) {
        this.input.x /= length;
        this.input.y /= length;
      }
      this.input.focus = Boolean(input.focus);
      this.input.pointerActive = Boolean(input.pointerActive);
    }

    step(dt) {
      const state = this.state;
      if (state.phase === "coda") {
        this.stepCoda(dt);
        return;
      }
      if (state.phase !== "play" && state.phase !== "return") return;

      state.elapsed += dt;
      state.fieldTime += dt;
      if (!state.afterglow) {
        state.remaining = Math.max(0, state.remaining - dt);
        if (state.remaining <= 0) {
          state.phase = "night-closed";
          this.emit("night-closed", { elapsed: state.elapsed });
          return;
        }
      }

      const moth = state.moth;
      moth.previousX = moth.x;
      moth.previousY = moth.y;
      moth.frayCooldown = Math.max(0, moth.frayCooldown - dt);

      if (moth.frayTimer > 0) {
        moth.frayTimer = Math.max(0, moth.frayTimer - dt);
        moth.vx *= Math.exp(-7 * dt);
        moth.vy *= Math.exp(-7 * dt);
        if (moth.frayTimer === 0) this.reform();
        return;
      }

      const focusing = this.input.focus && moth.focus > .015;
      if (focusing) moth.focus = Math.max(0, moth.focus - C.FOCUS_DRAIN_PER_SECOND * dt);
      else moth.focus = Math.min(1, moth.focus + C.FOCUS_REGEN_PER_SECOND * dt);

      const field = this.sampleField(moth.x, moth.y, state.fieldTime);
      const fieldFactor = focusing ? C.FOCUS_FIELD_FACTOR : 1;
      const acceleration = focusing ? C.PLAYER_FOCUS_ACCELERATION : C.PLAYER_ACCELERATION;

      moth.vx += (this.input.x * acceleration + field.x * fieldFactor) * dt;
      moth.vy += (this.input.y * acceleration + field.y * fieldFactor) * dt;

      const damping = Math.exp(-C.PLAYER_DAMPING * dt);
      moth.vx *= damping;
      moth.vy *= damping;

      const speed = Math.hypot(moth.vx, moth.vy);
      const maxSpeed = C.PLAYER_MAX_SPEED * (focusing ? 1.06 : 1);
      if (speed > maxSpeed) {
        moth.vx *= maxSpeed / speed;
        moth.vy *= maxSpeed / speed;
      }

      moth.x += moth.vx * dt;
      moth.y += moth.vy * dt;
      if (speed > 4) moth.angle = Math.atan2(moth.vy, moth.vx);

      this.applyBoundary(dt);
      this.updatePulseCycles();
      this.checkThorns();

      if (state.resonance) this.updateResonance(dt);
      else if (state.bindingDue) this.updateBinding(dt);
      else this.updateOrbit(dt);

      if (state.phase === "return") {
        const dx = moth.x - C.HEART_X;
        const dy = moth.y - C.HEART_Y;
        if (Math.hypot(dx, dy) <= C.HEART_RADIUS) this.beginCoda();
      }
    }

    applyBoundary(dt) {
      const moth = this.state.moth;
      const margin = 52;
      const strength = 1150;
      if (moth.x < margin) moth.vx += (margin - moth.x) * strength * dt / margin;
      if (moth.x > C.WORLD_WIDTH - margin) moth.vx -= (moth.x - (C.WORLD_WIDTH - margin)) * strength * dt / margin;
      if (moth.y < margin) moth.vy += (margin - moth.y) * strength * dt / margin;
      if (moth.y > C.WORLD_HEIGHT - margin) moth.vy -= (moth.y - (C.WORLD_HEIGHT - margin)) * strength * dt / margin;
      moth.x = V.clamp(moth.x, -20, C.WORLD_WIDTH + 20);
      moth.y = V.clamp(moth.y, -20, C.WORLD_HEIGHT + 20);
    }

    getWave(def, flowerState, time) {
      const orderShift = (flowerState.order || 0) * .083;
      const localTime = time + (def.phase + orderShift) * def.period;
      const cycleIndex = Math.floor(localTime / def.period);
      const cycle = ((localTime % def.period) + def.period) % def.period / def.period;
      const radius = 42 + cycle * (def.radius - 42);
      return { cycle, cycleIndex, radius };
    }

    sampleField(x, y, time = this.state.fieldTime) {
      let fx = 0;
      let fy = 0;
      for (let i = 0; i < this.flowerLimit; i += 1) {
        const flowerState = this.state.flowers[i];
        if (!flowerState.active) continue;
        const def = C.FLOWER_DEFINITIONS[i];
        const dx = x - def.x;
        const dy = y - def.y;
        const distance = Math.hypot(dx, dy);
        if (distance > def.radius + 150 || distance < 1) continue;
        const wave = this.getWave(def, flowerState, time);
        const width = 54 + (flowerState.order || 0) * 3;
        const delta = distance - wave.radius;
        const front = Math.exp(-(delta * delta) / (2 * width * width));
        const nearCore = V.smoothstep(30, 105, distance);
        const strength = def.strength * (1 + (flowerState.order || 0) * .035) * front * nearCore;
        const nx = dx / distance;
        const ny = dy / distance;
        let dirX = nx;
        let dirY = ny;
        if (def.field === "radial-in") { dirX = -nx; dirY = -ny; }
        else if (def.field === "tangent-cw") { dirX = -ny; dirY = nx; }
        else if (def.field === "tangent-ccw") { dirX = ny; dirY = -nx; }
        else if (def.field === "directional") { dirX = Math.cos(def.directionAngle); dirY = Math.sin(def.directionAngle); }
        else if (def.field === "alternating") {
          const sign = wave.cycleIndex % 2 === 0 ? 1 : -1;
          dirX = nx * sign * .78 + (-ny) * .22;
          dirY = ny * sign * .78 + nx * .22;
        }
        fx += dirX * strength;
        fy += dirY * strength;
      }
      const magnitude = Math.hypot(fx, fy);
      if (magnitude > C.FIELD_FORCE_CAP) {
        fx *= C.FIELD_FORCE_CAP / magnitude;
        fy *= C.FIELD_FORCE_CAP / magnitude;
      }
      return { x: fx, y: fy, magnitude: Math.min(magnitude, C.FIELD_FORCE_CAP) };
    }

    updatePulseCycles() {
      for (let i = 0; i < this.flowerLimit; i += 1) {
        const flowerState = this.state.flowers[i];
        if (!flowerState.active) continue;
        const wave = this.getWave(C.FLOWER_DEFINITIONS[i], flowerState, this.state.fieldTime);
        if (flowerState.lastPulseCycle === null) flowerState.lastPulseCycle = wave.cycleIndex;
        else if (wave.cycleIndex !== flowerState.lastPulseCycle) {
          flowerState.lastPulseCycle = wave.cycleIndex;
          this.emit("pulse", { index: i, cycle: wave.cycleIndex, order: flowerState.order });
        }
      }
    }

    updateOrbit(dt) {
      if (this.state.resonance || this.state.bindingDue) return;
      const moth = this.state.moth;
      let candidateIndex = null;
      let candidateDistance = Infinity;
      for (let i = 0; i < this.flowerLimit; i += 1) {
        const state = this.state.flowers[i];
        if (state.active) continue;
        const def = C.FLOWER_DEFINITIONS[i];
        const distance = Math.hypot(moth.x - def.x, moth.y - def.y);
        if (distance >= C.ORBIT_MIN_RADIUS && distance <= C.ORBIT_MAX_RADIUS && distance < candidateDistance) {
          candidateIndex = i;
          candidateDistance = distance;
        }
      }

      this.state.orbitFlower = candidateIndex;
      for (let i = 0; i < this.flowerLimit; i += 1) {
        const flowerState = this.state.flowers[i];
        if (flowerState.active) continue;
        if (i !== candidateIndex) {
          flowerState.lastAngle = null;
          flowerState.orbit = Math.max(0, flowerState.orbit - C.ORBIT_PROGRESS_DECAY * dt);
          continue;
        }
        const def = C.FLOWER_DEFINITIONS[i];
        const angle = Math.atan2(moth.y - def.y, moth.x - def.x);
        if (flowerState.lastAngle !== null) {
          const delta = V.wrapAngle(angle - flowerState.lastAngle);
          const directed = delta * def.orbitDirection;
          if (directed > 0) flowerState.orbit += directed / (V.TAU * def.orbitTurns);
          else flowerState.orbit = Math.max(0, flowerState.orbit + directed * .018);
        }
        flowerState.lastAngle = angle;
        flowerState.orbit = V.clamp(flowerState.orbit, 0, 1);
        this.emit("orbit", { index: i, progress: flowerState.orbit, direction: def.orbitDirection });
        if (flowerState.orbit >= .9999) {
          this.activateFlower(i);
          break;
        }
      }
    }

    activateFlower(index, options = {}) {
      if (index < 0 || index >= this.flowerLimit) return false;
      const flowerState = this.state.flowers[index];
      if (flowerState.active) return false;
      flowerState.active = true;
      flowerState.orbit = 1;
      flowerState.activatedAt = this.state.elapsed;
      flowerState.order = this.state.activationOrder.length;
      const wave = this.getWave(C.FLOWER_DEFINITIONS[index], flowerState, this.state.fieldTime);
      flowerState.lastPulseCycle = wave.cycleIndex;
      this.state.activationOrder.push(index);
      this.state.orbitFlower = null;

      const def = C.FLOWER_DEFINITIONS[index];
      const away = V.normalize(def.x - C.HEART_X, def.y - C.HEART_Y);
      this.state.moth.checkpointX = V.clamp(def.x + away.x * 112, 70, C.WORLD_WIDTH - 70);
      this.state.moth.checkpointY = V.clamp(def.y + away.y * 112, 70, C.WORLD_HEIGHT - 70);
      this.state.moth.focus = Math.min(1, this.state.moth.focus + .42);

      if (!options.silent) this.emit("flower-activated", { index, order: flowerState.order, definition: def });
      if (!options.skipResonance) {
        this.state.resonance = this.createResonance(index);
        if (!options.silent) this.emit("resonance-started", { index, total: C.RESONANCE_GATE_COUNT, gate: this.state.resonance.gates[0] });
      } else if (this.state.activationOrder.length >= this.flowerLimit) {
        this.state.phase = "return";
      }
      return true;
    }

    createResonance(index) {
      const def = C.FLOWER_DEFINITIONS[index];
      const baseAngle = Math.atan2(C.HEART_Y - def.y, C.HEART_X - def.x) + .55 * def.orbitDirection;
      const gates = [];
      for (let gate = 0; gate < C.RESONANCE_GATE_COUNT; gate += 1) {
        let x;
        let y;
        if (def.field === "radial-out") {
          const radius = 190 + gate * 88;
          const angle = baseAngle + Math.sin(gate * 1.7) * .22;
          x = def.x + Math.cos(angle) * radius;
          y = def.y + Math.sin(angle) * radius;
        } else if (def.field === "radial-in") {
          const radius = 470 - gate * 92;
          const angle = baseAngle - .8 + Math.sin(gate * 1.1) * .18;
          x = def.x + Math.cos(angle) * radius;
          y = def.y + Math.sin(angle) * radius;
        } else if (def.field === "tangent-cw" || def.field === "tangent-ccw") {
          const direction = def.field === "tangent-cw" ? 1 : -1;
          const radius = 245 + gate * 28;
          const angle = baseAngle + direction * gate * 1.05;
          x = def.x + Math.cos(angle) * radius;
          y = def.y + Math.sin(angle) * radius;
        } else if (def.field === "directional") {
          const along = 165 + gate * 100;
          const side = gate % 2 === 0 ? -105 : 105;
          const dx = Math.cos(def.directionAngle);
          const dy = Math.sin(def.directionAngle);
          x = def.x + dx * along - dy * side;
          y = def.y + dy * along + dx * side;
        } else {
          const angle = baseAngle + gate * 1.22 * (gate % 2 === 0 ? 1 : -1);
          const radius = 215 + gate * 62;
          x = def.x + Math.cos(angle) * radius;
          y = def.y + Math.sin(angle) * radius;
        }
        gates.push({
          x: V.clamp(x, 105, C.WORLD_WIDTH - 105),
          y: V.clamp(y, 105, C.WORLD_HEIGHT - 105),
          index: gate
        });
      }
      return { flowerIndex: index, gateIndex: 0, gateCharge: 0, gates, startedAt: this.state.elapsed };
    }

    updateResonance(dt = C.FIXED_STEP) {
      const resonance = this.state.resonance;
      if (!resonance) return;
      const gate = resonance.gates[resonance.gateIndex];
      if (!gate) {
        this.completeResonance();
        return;
      }
      const moth = this.state.moth;
      const inside = Math.hypot(moth.x - gate.x, moth.y - gate.y) <= C.RESONANCE_GATE_RADIUS + C.PLAYER_RADIUS;
      const holdSeconds = C.RESONANCE_HOLD_SECONDS + (this.state.flowers[resonance.flowerIndex].order || 0) * .3;
      if (!inside) {
        resonance.gateCharge = Math.max(0, resonance.gateCharge - dt * .24);
        return;
      }
      const focusBoost = this.input.focus && this.state.moth.focus > .015 ? 1.25 : 1;
      resonance.gateCharge = Math.min(1, resonance.gateCharge + dt * focusBoost / holdSeconds);
      if (resonance.gateCharge < 1) return;
      const collectedIndex = resonance.gateIndex;
      resonance.gateIndex += 1;
      resonance.gateCharge = 0;
      this.emit("resonance-gate", {
        flowerIndex: resonance.flowerIndex,
        gateIndex: collectedIndex,
        total: resonance.gates.length,
        x: gate.x,
        y: gate.y
      });
      if (resonance.gateIndex >= resonance.gates.length) this.completeResonance();
    }

    completeResonance() {
      const resonance = this.state.resonance;
      if (!resonance) return;
      const flowerIndex = resonance.flowerIndex;
      const duration = Math.max(0, this.state.elapsed - resonance.startedAt);
      this.state.resonance = null;
      this.state.moth.focus = Math.min(1, this.state.moth.focus + .28);
      this.emit("resonance-completed", { flowerIndex, duration });
      const count = this.state.activationOrder.length;
      if (C.MOVEMENT_BIND_COUNTS.includes(count) && !this.state.boundCounts.includes(count)) {
        this.state.bindingDue = count;
        this.state.bindingCharge = 0;
        this.emit("binding-due", { count });
      } else if (count >= this.flowerLimit) {
        this.state.phase = "return";
        this.emit("all-awake", { order: [...this.state.activationOrder] });
      }
    }

    updateBinding(dt = C.FIXED_STEP) {
      if (!this.state.bindingDue) return;
      const moth = this.state.moth;
      const inside = Math.hypot(moth.x - C.HEART_X, moth.y - C.HEART_Y) <= C.HEART_RADIUS + 18;
      if (inside) this.state.bindingCharge = Math.min(1, this.state.bindingCharge + dt / C.MOVEMENT_BIND_SECONDS);
      else this.state.bindingCharge = Math.max(0, this.state.bindingCharge - dt * .18);
      if (this.state.bindingCharge >= 1) this.bindMovement();
    }

    bindMovement() {
      const count = this.state.bindingDue;
      if (!count) return false;
      this.state.boundCounts.push(count);
      this.state.bindingDue = null;
      this.state.bindingCharge = 0;
      this.state.moth.checkpointX = C.HEART_X - 125;
      this.state.moth.checkpointY = C.HEART_Y + 34;
      this.state.moth.focus = 1;
      this.emit("movement-bound", { count, movement: this.state.boundCounts.length });
      return true;
    }

    checkThorns() {
      const moth = this.state.moth;
      if (moth.frayCooldown > 0) return;
      for (const thorn of C.THORN_CLUSTERS) {
        const distance = Math.hypot(moth.x - thorn.x, moth.y - thorn.y);
        if (distance < thorn.r * .72 + C.PLAYER_RADIUS) {
          this.fray({ x: thorn.x, y: thorn.y });
          return;
        }
      }
    }

    fray(source = {}) {
      const moth = this.state.moth;
      if (moth.frayTimer > 0 || moth.frayCooldown > 0) return false;
      moth.frayTimer = 1.15;
      moth.frayCooldown = 2.2;
      moth.frays += 1;
      moth.vx *= -.18;
      moth.vy *= -.18;
      this.emit("frayed", { x: moth.x, y: moth.y, source });
      return true;
    }

    reform() {
      const moth = this.state.moth;
      moth.x = moth.checkpointX;
      moth.y = moth.checkpointY;
      moth.previousX = moth.x;
      moth.previousY = moth.y;
      moth.vx = 0;
      moth.vy = 0;
      moth.focus = Math.max(.5, moth.focus);
      moth.frayCooldown = 1.4;
      this.emit("reformed", { x: moth.x, y: moth.y });
    }

    restartCheckpoint() {
      if (!["paused", "play", "return", "night-closed"].includes(this.state.phase)) return false;
      this.state.phase = this.state.activationOrder.length >= this.flowerLimit ? "return" : "play";
      this.state.moth.frayTimer = 0;
      this.reform();
      this.emit("checkpoint-restarted");
      return true;
    }

    beginCoda() {
      if (this.state.phase !== "return") return false;
      this.state.phase = "coda";
      this.state.codaTime = 0;
      this.state.codaBeat = -1;
      this.state.moth.vx = 0;
      this.state.moth.vy = 0;
      this.emit("coda-started", { order: [...this.state.activationOrder] });
      return true;
    }

    stepCoda(dt) {
      const state = this.state;
      state.fieldTime += dt;
      state.codaTime += dt;
      const beatDuration = Math.max(1.65, (C.CODA_SECONDS - 4) / this.flowerLimit);
      const beat = Math.floor(Math.max(0, state.codaTime - 1.5) / beatDuration);
      if (beat !== state.codaBeat && beat >= 0 && beat < this.flowerLimit) {
        state.codaBeat = beat;
        this.emit("coda-voice", { beat, flowerIndex: state.activationOrder[beat] });
      }
      if (state.codaTime >= C.CODA_SECONDS) this.complete();
    }

    complete() {
      if (this.state.phase === "complete") return;
      this.state.phase = "complete";
      this.state.completedAt = this.state.elapsed;
      this.state.signature = this.state.activationOrder.map(index => C.FLOWER_DEFINITIONS[index].name).join(" · ");
      this.emit("completed", { signature: this.state.signature, elapsed: this.state.elapsed, frays: this.state.moth.frays });
    }

    getNearestInactive() {
      const moth = this.state.moth;
      let result = null;
      let best = Infinity;
      for (let i = 0; i < this.flowerLimit; i += 1) {
        if (this.state.flowers[i].active) continue;
        const def = C.FLOWER_DEFINITIONS[i];
        const distance = Math.hypot(moth.x - def.x, moth.y - def.y);
        if (distance < best) { best = distance; result = i; }
      }
      return result;
    }

    getObjectiveTarget() {
      if (this.state.resonance) {
        const resonance = this.state.resonance;
        const gate = resonance.gates[resonance.gateIndex];
        if (gate) return { type: "resonance", flowerIndex: resonance.flowerIndex, gateIndex: resonance.gateIndex, x: gate.x, y: gate.y };
      }
      if (this.state.bindingDue) return { type: "heart", binding: true, x: C.HEART_X, y: C.HEART_Y };
      if (this.state.phase === "return" || this.state.phase === "coda") return { type: "heart", x: C.HEART_X, y: C.HEART_Y };
      const index = this.getNearestInactive();
      if (index === null) return null;
      const def = C.FLOWER_DEFINITIONS[index];
      return { type: "flower", index, x: def.x, y: def.y };
    }

    getActiveCount() {
      return this.state.activationOrder.length;
    }

    snapshot() {
      return {
        version: C.VERSION,
        savedAt: Date.now(),
        flowerLimit: this.flowerLimit,
        state: JSON.parse(JSON.stringify(this.state))
      };
    }

    restore(snapshot) {
      try {
        if (!snapshot || snapshot.version !== C.VERSION || !snapshot.state) return false;
        const state = JSON.parse(JSON.stringify(snapshot.state));
        if (!Array.isArray(state.flowers) || state.flowers.length !== C.FLOWER_DEFINITIONS.length) return false;
        if (!Array.isArray(state.activationOrder) || !state.moth) return false;
        if (!Number.isFinite(state.moth.x) || !Number.isFinite(state.remaining)) return false;
        this.flowerLimit = V.clamp(snapshot.flowerLimit || C.ACTIVE_FLOWER_LIMIT, 1, C.FLOWER_DEFINITIONS.length);
        this.seed = state.seed >>> 0;
        this.state = state;
        if (!Array.isArray(state.boundCounts)) state.boundCounts = [];
        if (!("bindingDue" in state)) state.bindingDue = null;
        if (!("bindingCharge" in state)) state.bindingCharge = 0;
        if (!("resonance" in state)) state.resonance = null;
        if (["paused", "night-closed"].includes(state.phase)) state.phaseBeforePause = state.phaseBeforePause || "play";
        else if (state.phase === "complete") state.phase = "complete";
        else state.phase = state.activationOrder.length >= this.flowerLimit ? "return" : "play";
        this.emit("restored", { activeCount: state.activationOrder.length });
        return this.checkInvariants().status === "pass";
      } catch (error) {
        return false;
      }
    }

    checkInvariants() {
      const s = this.state;
      const checks = [];
      const add = (name, pass, detail = "") => checks.push({ name, pass: Boolean(pass), detail });
      add("finite moth state", [s.moth.x, s.moth.y, s.moth.vx, s.moth.vy].every(Number.isFinite));
      add("focus bounds", Number.isFinite(s.moth.focus) && s.moth.focus >= -1e-9 && s.moth.focus <= 1 + 1e-9, String(s.moth.focus));
      add("remaining bounds", Number.isFinite(s.remaining) && s.remaining >= -1e-6 && s.remaining <= C.GAME_DURATION_SECONDS + 1e-6, String(s.remaining));
      const active = s.flowers.slice(0, this.flowerLimit).filter(flower => flower.active).length;
      add("activation count", active === s.activationOrder.length, `${active}/${s.activationOrder.length}`);
      add("activation uniqueness", new Set(s.activationOrder).size === s.activationOrder.length);
      add("activation range", s.activationOrder.every(index => Number.isInteger(index) && index >= 0 && index < this.flowerLimit));
      add("completion gate", s.phase !== "complete" || active === this.flowerLimit, `${active}/${this.flowerLimit}`);
      add("resonance gate bounds", !s.resonance || (s.resonance.gateIndex >= 0 && s.resonance.gateIndex <= s.resonance.gates.length));
      add("binding count validity", Array.isArray(s.boundCounts) && s.boundCounts.every(count => C.MOVEMENT_BIND_COUNTS.includes(count)));
      return { status: checks.every(check => check.pass) ? "pass" : "fail", checks };
    }

    static verifyDomain() {
      const checks = [];
      const add = (name, pass, detail = "") => checks.push({ name, pass: Boolean(pass), detail });
      const game = new GardenGame({ seed: 1701, flowerLimit: C.ACTIVE_FLOWER_LIMIT });
      game.start();
      const random = V.mulberry32(1701);
      for (let step = 0; step < 24000; step += 1) {
        if (step % 240 === 0) {
          const angle = random() * V.TAU;
          game.setInput({ x: Math.cos(angle), y: Math.sin(angle), focus: step % 720 < 180 });
        }
        game.step(C.FIXED_STEP);
        if (game.state.phase === "night-closed") game.continueAfterglow();
      }
      const invariants = game.checkInvariants();
      add("bounded long-run state", invariants.status === "pass", JSON.stringify(invariants.checks.filter(item => !item.pass)));
      const snapshot = game.snapshot();
      const restored = new GardenGame({ seed: 1, flowerLimit: C.ACTIVE_FLOWER_LIMIT });
      add("save round trip", restored.restore(snapshot));
      add("round-trip position", Math.abs(restored.state.moth.x - game.state.moth.x) <= .001 && Math.abs(restored.state.moth.y - game.state.moth.y) <= .001);
      const beforePause = restored.state.elapsed;
      restored.pause();
      for (let i = 0; i < 600; i += 1) restored.step(C.FIXED_STEP);
      add("pause freezes simulation clock", restored.state.elapsed === beforePause, `${beforePause}/${restored.state.elapsed}`);
      return { status: checks.every(check => check.pass) ? "pass" : "fail", claimLevel: "visual-concept", checks };
    }

    static verifyWorkflow() {
      const checks = [];
      const add = (name, pass, detail = "") => checks.push({ name, pass: Boolean(pass), detail });
      const game = new GardenGame({ seed: 424242, flowerLimit: C.ACTIVE_FLOWER_LIMIT });
      game.start();
      add("entry", game.state.phase === "play");

      for (let i = 0; i < game.flowerLimit; i += 1) {
        const def = C.FLOWER_DEFINITIONS[i];
        const steps = Math.ceil(def.orbitTurns * 520);
        for (let n = 0; n <= steps && !game.state.flowers[i].active; n += 1) {
          const angle = def.orbitDirection * (n / steps) * V.TAU * def.orbitTurns;
          game.state.moth.x = def.x + Math.cos(angle) * 112;
          game.state.moth.y = def.y + Math.sin(angle) * 112;
          game.state.moth.previousX = game.state.moth.x;
          game.state.moth.previousY = game.state.moth.y;
          game.updateOrbit(C.FIXED_STEP);
        }
        add(`pursuit activates ${def.id}`, game.state.flowers[i].active, String(game.state.flowers[i].orbit));
        while (game.state.resonance) {
          const resonance = game.state.resonance;
          const gate = resonance.gates[resonance.gateIndex];
          game.state.moth.x = gate.x;
          game.state.moth.y = gate.y;
          game.updateResonance(C.FIXED_STEP);
        }
        add(`resonance seals ${def.id}`, !game.state.resonance);
        if (game.state.bindingDue) {
          game.state.moth.x = C.HEART_X;
          game.state.moth.y = C.HEART_Y;
          while (game.state.bindingDue) game.updateBinding(C.FIXED_STEP);
          add(`movement binds at ${game.state.activationOrder.length}`, !game.state.bindingDue);
        }
      }
      add("resolution gate", game.state.phase === "return", game.state.phase);
      game.state.moth.x = C.HEART_X;
      game.state.moth.y = C.HEART_Y;
      game.step(C.FIXED_STEP);
      add("coda begins", game.state.phase === "coda", game.state.phase);
      for (let i = 0; i < Math.ceil((C.CODA_SECONDS + .1) / C.FIXED_STEP); i += 1) game.step(C.FIXED_STEP);
      add("reward completes", game.state.phase === "complete", game.state.phase);
      add("signature preserves order", game.state.signature === game.state.activationOrder.map(index => C.FLOWER_DEFINITIONS[index].name).join(" · "), game.state.signature);
      const recovery = new GardenGame({ seed: 9, flowerLimit: C.ACTIVE_FLOWER_LIMIT });
      recovery.start();
      recovery.state.remaining = C.FIXED_STEP / 2;
      recovery.step(C.FIXED_STEP);
      const closed = recovery.state.phase === "night-closed";
      const continued = recovery.continueAfterglow() && recovery.state.phase === "play";
      add("failure and recovery", closed && continued, `${closed}/${continued}`);
      return { status: checks.every(check => check.pass) ? "pass" : "fail", scenario: "reference-case", checks };
    }
  }

  V.GardenGame = GardenGame;
})(window.Vesper ||= {});
