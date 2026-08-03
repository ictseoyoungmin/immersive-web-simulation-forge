(function (V) {
  "use strict";

  const C = V.CONFIG;

  class GardenRenderer {
    constructor(canvas, game, settings = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
      this.game = game;
      this.settings = { reducedMotion: false, highContrast: false, quality: "auto", ...settings };
      this.captureMode = false;
      this.width = 1;
      this.height = 1;
      this.pixelRatio = 1;
      this.sceneScale = 1;
      this.autoScale = 1;
      this.slowWallSeconds = 0;
      this.fastWallSeconds = 0;
      this.wallFrameIntervals = [];
      this.camera = { x: 1040, y: 720, scale: .7, targetX: 1040, targetY: 720, targetScale: .7 };
      this.renderTime = 0;
      this.lastTimestamp = performance.now();
      this.shake = 0;
      this.flash = 0;
      this.eventParticles = [];
      this.trail = [];
      this.lastTrailAt = 0;
      this.lastVegetationFieldAt = -1;
      this.random = V.mulberry32(game.seed ^ 0x96f3a51b);
      this.spores = [];
      this.grass = [];
      this.canopy = [];
      this.buildGardenCapital();
      this.resize();
    }

    buildGardenCapital() {
      const random = this.random;
      this.spores.length = 0;
      this.grass.length = 0;
      this.canopy.length = 0;
      for (let i = 0; i < 260; i += 1) {
        this.spores.push({
          x: random() * C.WORLD_WIDTH,
          y: random() * C.WORLD_HEIGHT,
          radius: .55 + random() * 2.1,
          depth: random(),
          phase: random() * V.TAU,
          drift: .12 + random() * .35,
          hue: random() < .72 ? "#9d8ad8" : "#e4c78f"
        });
      }
      for (let i = 0; i < 285; i += 1) {
        const edgeBias = random();
        let x = random() * C.WORLD_WIDTH;
        let y = random() * C.WORLD_HEIGHT;
        if (edgeBias < .32) {
          const side = Math.floor(random() * 4);
          if (side === 0) x = random() * 190;
          if (side === 1) x = C.WORLD_WIDTH - random() * 190;
          if (side === 2) y = random() * 150;
          if (side === 3) y = C.WORLD_HEIGHT - random() * 150;
        }
        this.grass.push({
          x, y,
          length: 18 + random() * 72,
          width: .55 + random() * 1.55,
          lean: (random() - .5) * .65,
          phase: random() * V.TAU,
          brightness: .16 + random() * .34,
          kind: random() < .18 ? "reed" : "grass"
        });
      }
      for (let i = 0; i < 34; i += 1) {
        this.canopy.push({
          x: random() * C.WORLD_WIDTH,
          y: random() < .5 ? random() * 160 : C.WORLD_HEIGHT - random() * 130,
          radius: 70 + random() * 180,
          phase: random() * V.TAU
        });
      }
    }

    setSettings(settings) {
      Object.assign(this.settings, settings);
      if (this.settings.quality !== "auto") {
        this.slowWallSeconds = 0;
        this.fastWallSeconds = 0;
      }
      this.resize(true);
    }

    setCaptureMode(enabled) {
      this.captureMode = Boolean(enabled);
      this.resize(true);
    }

    resize(force = false) {
      const rect = this.canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width || innerWidth));
      const height = Math.max(1, Math.round(rect.height || innerHeight));
      let sceneScale = 1;
      if (!this.captureMode && this.settings.quality === "low") sceneScale = .85;
      else if (!this.captureMode && this.settings.quality === "auto") sceneScale = this.autoScale;
      const dprCap = this.settings.quality === "low" && !this.captureMode ? 1.25 : 2;
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      const pixelRatio = dpr * sceneScale;
      const outputWidth = Math.max(1, Math.round(width * pixelRatio));
      const outputHeight = Math.max(1, Math.round(height * pixelRatio));
      if (!force && this.canvas.width === outputWidth && this.canvas.height === outputHeight) return;
      this.width = width;
      this.height = height;
      this.pixelRatio = pixelRatio;
      this.sceneScale = sceneScale;
      this.canvas.width = outputWidth;
      this.canvas.height = outputHeight;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = "high";
    }

    onEvent(event) {
      const state = this.game.state;
      if (event.type === "flower-activated") {
        const def = event.detail.definition;
        this.shake = this.settings.reducedMotion ? 1.5 : 9;
        this.flash = .82;
        this.burst(def.x, def.y, def.color, this.settings.quality === "low" ? 46 : 94, 90, 410, 1.7);
      } else if (event.type === "pulse") {
        const def = C.FLOWER_DEFINITIONS[event.detail.index];
        if (this.settings.quality !== "low") this.burst(def.x, def.y, def.color, 8, 45, 125, 1.2);
      } else if (event.type === "frayed") {
        this.shake = this.settings.reducedMotion ? 2 : 12;
        this.flash = .45;
        this.burst(event.detail.x, event.detail.y, "#fff0d0", this.settings.quality === "low" ? 28 : 58, 130, 500, 1.1);
      } else if (event.type === "reformed") {
        this.burst(event.detail.x, event.detail.y, "#f7cf83", 34, 40, 180, 1.4);
      } else if (event.type === "resonance-gate") {
        const def = C.FLOWER_DEFINITIONS[event.detail.flowerIndex];
        this.burst(event.detail.x, event.detail.y, def.color, this.settings.quality === "low" ? 24 : 46, 45, 240, 1.15);
        this.flash = .18;
      } else if (event.type === "movement-bound") {
        this.burst(C.HEART_X, C.HEART_Y, "#f7dba7", this.settings.quality === "low" ? 48 : 88, 55, 310, 2.1);
        this.flash = .55;
      } else if (event.type === "coda-started") {
        this.shake = this.settings.reducedMotion ? 1 : 6;
        this.flash = 1;
      } else if (event.type === "coda-voice") {
        const def = C.FLOWER_DEFINITIONS[event.detail.flowerIndex];
        this.burst(C.HEART_X, C.HEART_Y, def.color, this.settings.quality === "low" ? 24 : 46, 70, 330, 2.1);
        this.flash = .7;
      } else if (event.type === "completed") {
        this.burst(C.HEART_X, C.HEART_Y, "#fff1bc", this.settings.quality === "low" ? 54 : 104, 90, 520, 3.2);
      }
      if (state.phase === "sleeping") this.trail.length = 0;
    }

    burst(x, y, color, count, minSpeed, maxSpeed, life) {
      const random = this.random;
      const limitedCount = this.settings.reducedMotion ? Math.ceil(count * .45) : count;
      for (let i = 0; i < limitedCount; i += 1) {
        const angle = random() * V.TAU;
        const speed = V.lerp(minSpeed, maxSpeed, Math.pow(random(), 1.8));
        this.eventParticles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: life * (.45 + random() * .7),
          maxLife: life,
          radius: .8 + random() * 3.2,
          color,
          drag: 1.25 + random() * 1.8,
          curl: (random() - .5) * 2.4
        });
      }
      const cap = this.settings.quality === "low" ? 180 : 360;
      if (this.eventParticles.length > cap) this.eventParticles.splice(0, this.eventParticles.length - cap);
    }

    updateParticles(dt) {
      for (let i = this.eventParticles.length - 1; i >= 0; i -= 1) {
        const particle = this.eventParticles[i];
        particle.life -= dt;
        if (particle.life <= 0) {
          this.eventParticles.splice(i, 1);
          continue;
        }
        const drag = Math.exp(-particle.drag * dt);
        const oldVx = particle.vx;
        particle.vx = (particle.vx - particle.vy * particle.curl * dt) * drag;
        particle.vy = (particle.vy + oldVx * particle.curl * dt) * drag;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
      }
    }

    updateTrail(timestamp) {
      const state = this.game.state;
      if (!["play", "return"].includes(state.phase) || state.moth.frayTimer > 0) return;
      if (timestamp - this.lastTrailAt < (this.settings.quality === "low" ? 55 : 32)) return;
      this.lastTrailAt = timestamp;
      this.trail.push({ x: state.moth.x, y: state.moth.y, angle: state.moth.angle, time: this.renderTime });
      const max = this.settings.quality === "low" ? 24 : 52;
      if (this.trail.length > max) this.trail.splice(0, this.trail.length - max);
    }

    updateCamera(dt) {
      const state = this.game.state;
      const aspectScale = Math.min(this.width / 1680, this.height / 980);
      const baseScale = V.clamp(aspectScale * .82, .52, 1.02);
      if (state.phase === "sleeping") {
        this.camera.targetX = 1230 + Math.sin(this.renderTime * .055) * 42;
        this.camera.targetY = 680 + Math.cos(this.renderTime * .043) * 25;
        this.camera.targetScale = baseScale * .9;
      } else if (state.phase === "coda" || state.phase === "complete") {
        const progress = V.clamp(state.codaTime / C.CODA_SECONDS, 0, 1);
        this.camera.targetX = C.HEART_X;
        this.camera.targetY = C.HEART_Y;
        this.camera.targetScale = baseScale * V.lerp(1.05, .78, V.smoothstep(.15, .9, progress));
      } else {
        const moth = state.moth;
        const objective = this.game.getObjectiveTarget();
        let x = moth.x;
        let y = moth.y;
        if (objective) {
          const mix = .19;
          x = V.lerp(moth.x, objective.x, mix);
          y = V.lerp(moth.y, objective.y, mix);
        }
        this.camera.targetX = V.clamp(x, 500, C.WORLD_WIDTH - 500);
        this.camera.targetY = V.clamp(y, 300, C.WORLD_HEIGHT - 300);
        const speed = Math.hypot(moth.vx, moth.vy);
        this.camera.targetScale = baseScale * V.lerp(1.03, .9, V.clamp(speed / C.PLAYER_MAX_SPEED, 0, 1));
      }
      const cameraEase = 1 - Math.exp(-2.8 * dt);
      this.camera.x = V.lerp(this.camera.x, this.camera.targetX, cameraEase);
      this.camera.y = V.lerp(this.camera.y, this.camera.targetY, cameraEase);
      this.camera.scale = V.lerp(this.camera.scale, this.camera.targetScale, 1 - Math.exp(-2.2 * dt));
    }

    render(alpha = 1, timestamp = performance.now()) {
      this.resize();
      const rawDt = Math.min(.05, Math.max(0, (timestamp - this.lastTimestamp) / 1000));
      this.lastTimestamp = timestamp;
      if (rawDt > 0 && rawDt < .2) {
        this.wallFrameIntervals.push(rawDt);
        if (this.wallFrameIntervals.length > 180) this.wallFrameIntervals.shift();
      }
      this.updateAdaptiveQuality(rawDt);
      this.renderTime += rawDt;
      this.updateParticles(rawDt);
      this.updateTrail(timestamp);
      this.updateCamera(rawDt);
      this.updateVegetationField();
      this.shake *= Math.exp(-8 * rawDt);
      this.flash *= Math.exp(-3.8 * rawDt);

      const ctx = this.ctx;
      const ratio = this.pixelRatio;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

      this.drawScreenBackground(ctx);

      let shakeX = 0;
      let shakeY = 0;
      if (!this.settings.reducedMotion && this.shake > .01) {
        shakeX = Math.sin(this.renderTime * 79) * this.shake;
        shakeY = Math.cos(this.renderTime * 67) * this.shake * .62;
      }
      ctx.save();
      ctx.translate(this.width * .5 + shakeX, this.height * .5 + shakeY);
      ctx.scale(this.camera.scale, this.camera.scale);
      ctx.translate(-this.camera.x, -this.camera.y);

      this.drawWorldGround(ctx);
      this.drawCanopy(ctx);
      this.drawSpores(ctx);
      this.drawGardenPaths(ctx);
      this.drawPulseFields(ctx);
      this.drawVegetation(ctx);
      this.drawThorns(ctx);
      this.drawHeart(ctx);
      this.drawFlowers(ctx);
      this.drawResonance(ctx);
      this.drawGuidance(ctx);
      this.drawTrail(ctx);
      this.drawMoth(ctx, alpha);
      this.drawEventParticles(ctx);
      this.drawForeground(ctx);
      ctx.restore();

      if (this.flash > .005) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        const gradient = ctx.createRadialGradient(this.width * .5, this.height * .5, 0, this.width * .5, this.height * .5, Math.max(this.width, this.height) * .7);
        gradient.addColorStop(0, `rgba(255,239,198,${this.flash * .11})`);
        gradient.addColorStop(1, "rgba(110,85,190,0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.restore();
      }
    }

    updateAdaptiveQuality(rawDt) {
      if (this.captureMode || this.settings.quality !== "auto" || rawDt <= 0) return;
      if (rawDt > .027) {
        this.slowWallSeconds += rawDt;
        this.fastWallSeconds = Math.max(0, this.fastWallSeconds - rawDt * 2);
      } else if (rawDt < .0195) {
        this.fastWallSeconds += rawDt;
        this.slowWallSeconds = Math.max(0, this.slowWallSeconds - rawDt * .45);
      } else {
        this.slowWallSeconds = Math.max(0, this.slowWallSeconds - rawDt * .12);
        this.fastWallSeconds = Math.max(0, this.fastWallSeconds - rawDt * .25);
      }
      if (this.slowWallSeconds >= 1.5 && this.autoScale > .85) {
        this.autoScale = Math.max(.85, Number((this.autoScale - .075).toFixed(3)));
        this.slowWallSeconds = 0;
        this.fastWallSeconds = 0;
        this.resize(true);
      } else if (this.fastWallSeconds >= 5 && this.autoScale < 1) {
        this.autoScale = Math.min(1, Number((this.autoScale + .05).toFixed(3)));
        this.slowWallSeconds = 0;
        this.fastWallSeconds = 0;
        this.resize(true);
      }
    }

    drawScreenBackground(ctx) {
      const gradient = ctx.createRadialGradient(this.width * .56, this.height * .47, 0, this.width * .52, this.height * .5, Math.max(this.width, this.height) * .82);
      gradient.addColorStop(0, "#171a35");
      gradient.addColorStop(.38, "#0d1023");
      gradient.addColorStop(.74, "#080a17");
      gradient.addColorStop(1, "#04050d");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, this.width, this.height);
      const moon = ctx.createRadialGradient(this.width * .74, this.height * .12, 0, this.width * .74, this.height * .12, this.width * .55);
      moon.addColorStop(0, "rgba(124,105,192,.09)");
      moon.addColorStop(.5, "rgba(61,51,113,.025)");
      moon.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = moon;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    drawWorldGround(ctx) {
      ctx.save();
      const gradient = ctx.createRadialGradient(C.HEART_X, C.HEART_Y, 80, C.HEART_X, C.HEART_Y, 1280);
      gradient.addColorStop(0, "rgba(41,37,72,.52)");
      gradient.addColorStop(.38, "rgba(17,20,43,.46)");
      gradient.addColorStop(1, "rgba(3,5,13,.78)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(0, 0, C.WORLD_WIDTH, C.WORLD_HEIGHT, 180);
      ctx.fill();
      ctx.strokeStyle = "rgba(190,178,226,.055)";
      ctx.lineWidth = 2 / this.camera.scale;
      ctx.stroke();

      ctx.globalAlpha = .24;
      for (let ring = 1; ring <= 5; ring += 1) {
        ctx.beginPath();
        ctx.ellipse(C.HEART_X, C.HEART_Y, ring * 188, ring * 112, -.08, 0, V.TAU);
        ctx.strokeStyle = ring % 2 ? "rgba(133,112,185,.08)" : "rgba(228,199,139,.045)";
        ctx.lineWidth = 1.2 / this.camera.scale;
        ctx.stroke();
      }
      ctx.restore();
    }

    drawCanopy(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (const canopy of this.canopy) {
        const glow = .025 + .012 * Math.sin(this.renderTime * .22 + canopy.phase);
        const gradient = ctx.createRadialGradient(canopy.x, canopy.y, 0, canopy.x, canopy.y, canopy.radius);
        gradient.addColorStop(0, `rgba(112,91,170,${glow})`);
        gradient.addColorStop(1, "rgba(35,29,75,0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(canopy.x, canopy.y, canopy.radius, 0, V.TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    drawSpores(ctx) {
      const count = this.settings.quality === "low" ? 130 : this.spores.length;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (let i = 0; i < count; i += 1) {
        const spore = this.spores[i];
        const drift = this.settings.reducedMotion ? 0 : Math.sin(this.renderTime * spore.drift + spore.phase) * (3 + spore.depth * 7);
        const pulse = .25 + .35 * (Math.sin(this.renderTime * .65 + spore.phase) * .5 + .5);
        ctx.fillStyle = V.rgba(spore.hue, pulse * (.2 + spore.depth * .42));
        ctx.beginPath();
        ctx.arc(spore.x + drift, spore.y + drift * .35, spore.radius * (.7 + spore.depth), 0, V.TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    drawGardenPaths(ctx) {
      ctx.save();
      ctx.lineCap = "round";
      for (let i = 0; i < this.game.flowerLimit; i += 1) {
        const def = C.FLOWER_DEFINITIONS[i];
        const active = this.game.state.flowers[i].active;
        const midX = (def.x + C.HEART_X) * .5 + (def.y - C.HEART_Y) * .08;
        const midY = (def.y + C.HEART_Y) * .5 - (def.x - C.HEART_X) * .05;
        ctx.beginPath();
        ctx.moveTo(C.HEART_X, C.HEART_Y);
        ctx.quadraticCurveTo(midX, midY, def.x, def.y);
        ctx.strokeStyle = active ? V.rgba(def.color, .12) : "rgba(151,137,186,.035)";
        ctx.lineWidth = (active ? 8 : 5) / this.camera.scale;
        ctx.stroke();
        ctx.strokeStyle = active ? V.rgba(def.color, .28) : "rgba(206,190,229,.05)";
        ctx.lineWidth = 1 / this.camera.scale;
        ctx.setLineDash([4 / this.camera.scale, 12 / this.camera.scale]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    drawPulseFields(ctx) {
      const state = this.game.state;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (let i = 0; i < this.game.flowerLimit; i += 1) {
        const flower = state.flowers[i];
        if (!flower.active) continue;
        const def = C.FLOWER_DEFINITIONS[i];
        const wave = this.game.getWave(def, flower, state.fieldTime);
        const anticipation = V.smoothstep(.72, 1, wave.cycle);
        ctx.beginPath();
        ctx.arc(def.x, def.y, wave.radius, 0, V.TAU);
        ctx.strokeStyle = V.rgba(def.color, .045 + anticipation * .035);
        ctx.lineWidth = (18 + anticipation * 8) / this.camera.scale;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(def.x, def.y, wave.radius, 0, V.TAU);
        ctx.strokeStyle = V.rgba(def.color, .11 + anticipation * .1);
        ctx.lineWidth = (6 + anticipation * 4) / this.camera.scale;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(def.x, def.y, wave.radius, 0, V.TAU);
        ctx.strokeStyle = V.rgba(def.color, .29 + anticipation * .26);
        ctx.lineWidth = (1.4 + anticipation * 1.6) / this.camera.scale;
        ctx.stroke();

        const points = this.settings.quality === "low" ? 8 : 16;
        for (let p = 0; p < points; p += 1) {
          const angle = p / points * V.TAU + wave.cycle * .6 * (def.orbitDirection || 1);
          const scatter = Math.sin(p * 12.7 + i * 4.2) * 9;
          const x = def.x + Math.cos(angle) * (wave.radius + scatter);
          const y = def.y + Math.sin(angle) * (wave.radius + scatter);
          ctx.fillStyle = V.rgba(def.color, .2 + .25 * anticipation);
          ctx.beginPath();
          ctx.arc(x, y, 1.2 + anticipation * 1.5, 0, V.TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    drawVegetation(ctx) {
      const count = this.settings.quality === "low" ? 175 : this.grass.length;
      ctx.save();
      ctx.lineCap = "round";
      for (let i = 0; i < count; i += 1) {
        const blade = this.grass[i];
        let bendX = Math.sin(this.renderTime * .37 + blade.phase) * 7;
        let bendY = 0;
        bendX += blade.fieldBendX || 0;
        bendY += blade.fieldBendY || 0;
        if (this.settings.reducedMotion) { bendX *= .32; bendY *= .32; }
        const alpha = blade.brightness * (this.settings.highContrast ? 1.35 : 1);
        ctx.strokeStyle = `rgba(104,124,143,${alpha})`;
        ctx.lineWidth = blade.width / this.camera.scale;
        ctx.beginPath();
        ctx.moveTo(blade.x, blade.y);
        ctx.quadraticCurveTo(
          blade.x + blade.lean * blade.length * .55 + bendX * .55,
          blade.y - blade.length * .5 + bendY * .25,
          blade.x + blade.lean * blade.length + bendX,
          blade.y - blade.length + bendY
        );
        ctx.stroke();
        if (blade.kind === "reed") {
          ctx.fillStyle = `rgba(150,132,185,${alpha * .65})`;
          ctx.beginPath();
          ctx.ellipse(blade.x + blade.lean * blade.length + bendX, blade.y - blade.length + bendY, 2.5, 7, blade.lean + bendX * .01, 0, V.TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    updateVegetationField() {
      if (this.renderTime - this.lastVegetationFieldAt < 1 / 15) return;
      this.lastVegetationFieldAt = this.renderTime;
      const active = this.game.getActiveCount() > 0;
      for (const blade of this.grass) {
        if (!active) {
          blade.fieldBendX = 0;
          blade.fieldBendY = 0;
          continue;
        }
        const field = this.game.sampleField(blade.x, blade.y, this.game.state.fieldTime);
        blade.fieldBendX = V.clamp(field.x * .024, -24, 24);
        blade.fieldBendY = V.clamp(field.y * .016, -16, 16);
      }
    }

    drawThorns(ctx) {
      ctx.save();
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      for (const thorn of C.THORN_CLUSTERS) {
        const contrast = this.settings.highContrast ? .9 : .52;
        const branches = Math.max(3, Math.floor(thorn.arms * .58));
        ctx.save();
        ctx.translate(thorn.x, thorn.y);
        for (let branch = 0; branch < branches; branch += 1) {
          const angle = thorn.spin + branch / branches * V.TAU + Math.sin(branch * 8.31) * .18;
          const endRadius = thorn.r * (.72 + ((branch * 37) % 11) / 24);
          const bend = Math.sin(branch * 4.7 + thorn.spin) * thorn.r * .42;
          const ex = Math.cos(angle) * endRadius;
          const ey = Math.sin(angle) * endRadius;
          const cx = Math.cos(angle) * endRadius * .48 - Math.sin(angle) * bend;
          const cy = Math.sin(angle) * endRadius * .48 + Math.cos(angle) * bend;

          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(cx, cy, ex, ey);
          ctx.strokeStyle = `rgba(5,6,13,${this.settings.highContrast ? .96 : .9})`;
          ctx.lineWidth = (6.5 + thorn.r * .035) / this.camera.scale;
          ctx.stroke();
          ctx.strokeStyle = `rgba(195,102,146,${contrast})`;
          ctx.lineWidth = (this.settings.highContrast ? 1.85 : 1.05) / this.camera.scale;
          ctx.stroke();

          for (let spike = 1; spike <= 2; spike += 1) {
            const t = spike / 3;
            const mt = 1 - t;
            const px = mt * mt * 0 + 2 * mt * t * cx + t * t * ex;
            const py = mt * mt * 0 + 2 * mt * t * cy + t * t * ey;
            const tangentX = 2 * mt * cx + 2 * t * (ex - cx);
            const tangentY = 2 * mt * cy + 2 * t * (ey - cy);
            const tangent = V.normalize(tangentX, tangentY);
            const side = (branch + spike) % 2 ? 1 : -1;
            const spikeLength = thorn.r * (.18 + spike * .035);
            const sx = -tangent.y * side;
            const sy = tangent.x * side;
            ctx.beginPath();
            ctx.moveTo(px - tangent.x * 3, py - tangent.y * 3);
            ctx.lineTo(px + sx * spikeLength, py + sy * spikeLength);
            ctx.lineTo(px + tangent.x * 4, py + tangent.y * 4);
            ctx.closePath();
            ctx.fillStyle = `rgba(111,46,87,${this.settings.highContrast ? .9 : .68})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(222,126,166,${contrast * .82})`;
            ctx.lineWidth = .8 / this.camera.scale;
            ctx.stroke();
          }
        }
        ctx.fillStyle = "rgba(40,20,48,.82)";
        ctx.beginPath();
        ctx.ellipse(0, 0, thorn.r * .24, thorn.r * .17, thorn.spin, 0, V.TAU);
        ctx.fill();
        ctx.strokeStyle = `rgba(202,112,154,${contrast * .65})`;
        ctx.lineWidth = 1 / this.camera.scale;
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    drawHeart(ctx) {
      const state = this.game.state;
      const activeRatio = state.activationOrder.length / this.game.flowerLimit;
      const coda = state.phase === "coda" ? V.clamp(state.codaTime / C.CODA_SECONDS, 0, 1) : state.phase === "complete" ? 1 : 0;
      const binding = state.bindingDue ? state.bindingCharge : 0;
      ctx.save();
      ctx.translate(C.HEART_X, C.HEART_Y);
      ctx.globalCompositeOperation = "screen";
      const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, 170 + coda * 160);
      aura.addColorStop(0, `rgba(247,222,171,${.06 + activeRatio * .12 + coda * .2 + binding * .22})`);
      aura.addColorStop(.38, `rgba(140,109,205,${.05 + activeRatio * .06})`);
      aura.addColorStop(1, "rgba(70,48,120,0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 330, 0, V.TAU);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      const petalCount = 12;
      for (let i = 0; i < petalCount; i += 1) {
        const angle = i / petalCount * V.TAU + this.renderTime * .025;
        ctx.save();
        ctx.rotate(angle);
        ctx.fillStyle = i % 2 ? `rgba(45,38,72,${.88 - coda * .18})` : `rgba(23,25,49,${.95 - coda * .2})`;
        ctx.strokeStyle = `rgba(209,187,235,${.1 + activeRatio * .13 + coda * .25})`;
        ctx.lineWidth = 1.2 / this.camera.scale;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.bezierCurveTo(48, -25 - coda * 18, 102 + coda * 50, -20, 124 + coda * 70, 0);
        ctx.bezierCurveTo(102 + coda * 50, 20, 48, 25 + coda * 18, 18, 0);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = `rgba(9,10,20,${1 - coda * .35})`;
      ctx.strokeStyle = `rgba(246,211,151,${.16 + activeRatio * .34 + coda * .35 + binding * .3})`;
      ctx.lineWidth = 2 / this.camera.scale;
      ctx.beginPath();
      ctx.arc(0, 0, 48 + coda * 16, 0, V.TAU);
      ctx.fill();
      ctx.stroke();
      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 30 + coda * 20);
      core.addColorStop(0, `rgba(255,244,206,${.12 + coda * .8})`);
      core.addColorStop(1, "rgba(188,131,235,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(0, 0, 60 + coda * 30, 0, V.TAU);
      ctx.fill();
      ctx.restore();
    }

    drawFlowers(ctx) {
      for (let i = 0; i < this.game.flowerLimit; i += 1) this.drawFlower(ctx, i);
    }

    drawResonance(ctx) {
      const resonance = this.game.state.resonance;
      if (!resonance) return;
      const def = C.FLOWER_DEFINITIONS[resonance.flowerIndex];
      const gates = resonance.gates;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.lineCap = "round";

      ctx.beginPath();
      ctx.moveTo(def.x, def.y);
      for (let i = 0; i < gates.length; i += 1) ctx.lineTo(gates[i].x, gates[i].y);
      ctx.strokeStyle = V.rgba(def.color, .09);
      ctx.lineWidth = 1.3 / this.camera.scale;
      ctx.setLineDash([3 / this.camera.scale, 13 / this.camera.scale]);
      ctx.lineDashOffset = -this.renderTime * 15;
      ctx.stroke();
      ctx.setLineDash([]);

      for (let i = resonance.gateIndex; i < gates.length; i += 1) {
        const gate = gates[i];
        const current = i === resonance.gateIndex;
        const pulse = .5 + .5 * Math.sin(this.renderTime * (current ? 3.2 : 1.3) + i);
        const radius = current ? C.RESONANCE_GATE_RADIUS + pulse * 7 : 22;
        ctx.save();
        ctx.translate(gate.x, gate.y);
        ctx.rotate(this.renderTime * (current ? .42 : .12) * def.orbitDirection + i);
        if (current) {
          const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 2.2);
          aura.addColorStop(0, V.rgba(def.color, .18 + pulse * .12));
          aura.addColorStop(1, V.rgba(def.color, 0));
          ctx.fillStyle = aura;
          ctx.beginPath();
          ctx.arc(0, 0, radius * 2.2, 0, V.TAU);
          ctx.fill();
        }
        ctx.strokeStyle = V.rgba(def.core, current ? .78 : .18);
        ctx.lineWidth = (current ? 2.2 : 1) / this.camera.scale;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, V.TAU);
        ctx.stroke();
        if (current && resonance.gateCharge > .002) {
          ctx.strokeStyle = V.rgba(def.core, .98);
          ctx.lineWidth = 4 / this.camera.scale;
          ctx.beginPath();
          ctx.arc(0, 0, radius + 7, -Math.PI / 2, -Math.PI / 2 + resonance.gateCharge * V.TAU);
          ctx.stroke();
        }
        const petals = 4;
        for (let petal = 0; petal < petals; petal += 1) {
          const angle = petal / petals * V.TAU;
          ctx.save();
          ctx.rotate(angle);
          ctx.fillStyle = V.rgba(def.color, current ? .28 + pulse * .12 : .09);
          ctx.beginPath();
          ctx.ellipse(radius + (current ? 9 : 5), 0, current ? 12 : 7, current ? 4.2 : 2.5, 0, 0, V.TAU);
          ctx.fill();
          ctx.restore();
        }
        if (current) {
          ctx.fillStyle = V.rgba(def.core, .85);
          ctx.beginPath();
          ctx.arc(0, 0, 3.5 + pulse * 2, 0, V.TAU);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.restore();
    }

    drawFlower(ctx, index) {
      const def = C.FLOWER_DEFINITIONS[index];
      const flower = this.game.state.flowers[index];
      const active = flower.active;
      const orbit = flower.orbit;
      const time = this.game.state.fieldTime;
      const wave = active ? this.game.getWave(def, flower, time) : null;
      const breathe = active ? .5 + .5 * Math.sin((wave.cycle * V.TAU) - Math.PI * .5) : .25 + .12 * Math.sin(this.renderTime * .8 + index);
      const opening = active ? 1 : .28 + orbit * .72;
      ctx.save();
      ctx.translate(def.x, def.y);

      ctx.globalCompositeOperation = "screen";
      const auraRadius = active ? 130 + breathe * 35 : 72 + orbit * 42;
      const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, auraRadius);
      aura.addColorStop(0, V.rgba(def.color, active ? .2 + breathe * .09 : .055 + orbit * .12));
      aura.addColorStop(.45, V.rgba(def.color, active ? .07 : .025));
      aura.addColorStop(1, V.rgba(def.color, 0));
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, auraRadius, 0, V.TAU);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      ctx.strokeStyle = active ? V.rgba(def.color, .2) : "rgba(167,154,190,.12)";
      ctx.lineWidth = 2 / this.camera.scale;
      ctx.beginPath();
      ctx.moveTo(0, 38);
      ctx.bezierCurveTo(-18, 92, 20, 136, -6, 196);
      ctx.stroke();
      ctx.lineWidth = 1 / this.camera.scale;
      ctx.beginPath();
      ctx.moveTo(-3, 112);
      ctx.quadraticCurveTo(-54, 98, -65, 66);
      ctx.moveTo(2, 142);
      ctx.quadraticCurveTo(48, 133, 61, 103);
      ctx.stroke();

      const petalGradient = ctx.createRadialGradient(0, 0, 8, 0, 0, 104);
      petalGradient.addColorStop(0, active ? V.rgba(def.color, .4) : "rgba(91,84,121,.42)");
      petalGradient.addColorStop(.58, active ? V.rgba(def.color, .2) : "rgba(39,40,68,.58)");
      petalGradient.addColorStop(1, active ? V.rgba(def.core, .035) : "rgba(16,18,35,.2)");
      for (let petal = 0; petal < def.petals; petal += 1) {
        const angle = petal / def.petals * V.TAU + (active ? this.renderTime * .018 * def.orbitDirection : 0);
        ctx.save();
        ctx.rotate(angle);
        const length = 48 + (petal % 2) * 8 + opening * 25;
        const width = 16 + opening * 10;
        ctx.fillStyle = petalGradient;
        ctx.strokeStyle = active ? V.rgba(def.core, .42) : "rgba(169,155,198,.19)";
        ctx.lineWidth = (active ? 1.35 : .85) / this.camera.scale;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.bezierCurveTo(length * .34, -width, length * .82, -width * .65, length, 0);
        ctx.bezierCurveTo(length * .82, width * .65, length * .34, width, 10, 0);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      ctx.globalCompositeOperation = "screen";
      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 30);
      core.addColorStop(0, active ? V.rgba(def.core, .98) : V.rgba(def.color, .18 + orbit * .55));
      core.addColorStop(.28, active ? V.rgba(def.color, .65) : V.rgba(def.color, .12));
      core.addColorStop(1, V.rgba(def.color, 0));
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, V.TAU);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      if (!active && orbit > .005) {
        ctx.beginPath();
        ctx.arc(0, 0, 128, -Math.PI / 2, -Math.PI / 2 + orbit * V.TAU * def.orbitDirection, def.orbitDirection < 0);
        ctx.strokeStyle = V.rgba(def.color, .82);
        ctx.lineWidth = 4 / this.camera.scale;
        ctx.lineCap = "round";
        ctx.shadowColor = def.color;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    }

    drawGuidance(ctx) {
      const state = this.game.state;
      if (!["play", "return"].includes(state.phase)) return;
      const target = this.game.getObjectiveTarget();
      if (!target) return;
      const moth = state.moth;
      const dx = target.x - moth.x;
      const dy = target.y - moth.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 190 && target.type === "flower") return;
      const color = target.type === "flower"
        ? C.FLOWER_DEFINITIONS[target.index].color
        : target.type === "resonance"
          ? C.FLOWER_DEFINITIONS[target.flowerIndex].color
          : "#f5dbab";
      const normal = V.normalize(dx, dy);
      const sideX = -normal.y;
      const sideY = normal.x;
      const bow = Math.sin(this.renderTime * .5) * 22 + Math.min(90, distance * .08);
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.setLineDash([2 / this.camera.scale, 14 / this.camera.scale]);
      ctx.lineDashOffset = -this.renderTime * 18;
      ctx.strokeStyle = V.rgba(color, .23);
      ctx.lineWidth = 1.2 / this.camera.scale;
      ctx.beginPath();
      ctx.moveTo(moth.x, moth.y);
      ctx.quadraticCurveTo((moth.x + target.x) * .5 + sideX * bow, (moth.y + target.y) * .5 + sideY * bow, target.x, target.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    drawTrail(ctx) {
      if (this.trail.length < 2) return;
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (let i = 1; i < this.trail.length; i += 1) {
        const a = this.trail[i - 1];
        const b = this.trail[i];
        const t = i / this.trail.length;
        ctx.strokeStyle = `rgba(246,204,129,${t * t * .24})`;
        ctx.lineWidth = (1 + t * 2.4) / this.camera.scale;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawMoth(ctx, alpha) {
      const moth = this.game.state.moth;
      const x = V.lerp(moth.previousX, moth.x, alpha);
      const y = V.lerp(moth.previousY, moth.y, alpha);
      const speed = Math.hypot(moth.vx, moth.vy);
      const fray = moth.frayTimer > 0;
      const flap = Math.sin(this.renderTime * (8 + speed * .025)) * .5 + .5;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(moth.angle);
      ctx.globalAlpha = fray ? .28 + .28 * Math.sin(this.renderTime * 35) : 1;
      ctx.globalCompositeOperation = "screen";
      const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, 54);
      aura.addColorStop(0, "rgba(255,240,194,.28)");
      aura.addColorStop(.35, "rgba(246,190,105,.12)");
      aura.addColorStop(1, "rgba(246,190,105,0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 54, 0, V.TAU);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      const wingSpread = .2 + flap * .58;
      const wingColor = ctx.createLinearGradient(-12, -24, 24, 18);
      wingColor.addColorStop(0, "rgba(255,243,205,.86)");
      wingColor.addColorStop(.45, "rgba(248,203,126,.52)");
      wingColor.addColorStop(1, "rgba(151,119,202,.08)");
      ctx.fillStyle = wingColor;
      ctx.strokeStyle = "rgba(255,241,199,.86)";
      ctx.lineWidth = 1.05 / this.camera.scale;
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.scale(1, side);
        ctx.rotate(-wingSpread * side * .08);
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.bezierCurveTo(-18, -8, -28 - flap * 10, -30 - flap * 13, -2, -17);
        ctx.bezierCurveTo(12, -12, 14, -5, 5, 1);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = "#fff1bd";
      ctx.beginPath();
      ctx.ellipse(2, 0, 11, 4.2, 0, 0, V.TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,235,181,.7)";
      ctx.lineWidth = .85 / this.camera.scale;
      ctx.beginPath();
      ctx.moveTo(8, -1);
      ctx.quadraticCurveTo(18, -8, 22, -15);
      ctx.moveTo(8, 1);
      ctx.quadraticCurveTo(18, 8, 22, 15);
      ctx.stroke();
      ctx.restore();
    }

    drawEventParticles(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      for (const particle of this.eventParticles) {
        const t = V.clamp(particle.life / particle.maxLife, 0, 1);
        ctx.fillStyle = V.rgba(particle.color, Math.min(1, t * 1.4) * .75);
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius * (.35 + t), 0, V.TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    drawForeground(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      const state = this.game.state;
      if (state.phase === "coda") {
        const progress = V.clamp(state.codaTime / C.CODA_SECONDS, 0, 1);
        for (let ring = 0; ring < 3; ring += 1) {
          const radius = 120 + ((progress * 900 + ring * 260) % 900);
          ctx.beginPath();
          ctx.arc(C.HEART_X, C.HEART_Y, radius, 0, V.TAU);
          ctx.strokeStyle = `rgba(255,230,183,${(1 - radius / 1100) * .12})`;
          ctx.lineWidth = 3 / this.camera.scale;
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    reportFidelity() {
      const rect = this.canvas.getBoundingClientRect();
      const intervalSum = this.wallFrameIntervals.reduce((sum, value) => sum + value, 0);
      const fps = intervalSum > 0 ? this.wallFrameIntervals.length / intervalSum : null;
      return {
        status: "pass",
        renderer: "Canvas2D",
        cssSize: { width: Math.round(rect.width), height: Math.round(rect.height) },
        outputSize: { width: this.canvas.width, height: this.canvas.height },
        sceneSize: { width: this.canvas.width, height: this.canvas.height },
        effectiveRatio: Math.min(this.canvas.width / Math.max(1, rect.width), this.canvas.height / Math.max(1, rect.height)),
        sceneScale: this.sceneScale,
        captureMode: this.captureMode,
        captureLocked: this.captureMode,
        adaptationLocked: this.captureMode,
        adaptive: this.settings.quality === "auto" && !this.captureMode,
        adaptiveRange: { min: .85, max: 1 },
        fps,
        nativeInterface: true,
        quality: this.settings.quality
      };
    }
  }

  V.GardenRenderer = GardenRenderer;
})(window.Vesper ||= {});
