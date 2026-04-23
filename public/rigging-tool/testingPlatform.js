(function () {
  const platform = {
    initialized: false,
    canvas: null,
    ctx: null,
    rigState: null,
    animState: null,
    statusEl: null,
    needEls: null,
    player: { x: 180, y: 275, targetX: 180, speed: 140, facing: 1 },
    needs: { hunger: 92, fun: 86, clean: 90, energy: 88 },
    zones: [
      { id: "food", x: 40, y: 72, w: 120, h: 72, color: "#ffc97b", label: "Food", effect: { hunger: 22 } },
      { id: "toy", x: 290, y: 52, w: 130, h: 82, color: "#8fd3ff", label: "Toys", effect: { fun: 22 } },
      { id: "shower", x: 560, y: 66, w: 140, h: 78, color: "#9de0d0", label: "Shower", effect: { clean: 25 } },
      { id: "bed", x: 500, y: 258, w: 200, h: 90, color: "#c6b8ff", label: "Sleep", effect: { energy: 26 } },
    ],
    activeZoneId: null,
    animationTime: 0,
    lastTs: 0,
    currentMode: "idle",
  };

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function setStatus(text) {
    if (platform.statusEl) {
      platform.statusEl.textContent = text;
    }
  }

  function updateNeedBars() {
    if (!platform.needEls) return;
    platform.needEls.hunger.style.width = `${platform.needs.hunger}%`;
    platform.needEls.fun.style.width = `${platform.needs.fun}%`;
    platform.needEls.clean.style.width = `${platform.needs.clean}%`;
    platform.needEls.energy.style.width = `${platform.needs.energy}%`;
  }

  function getNearestZone() {
    const px = platform.player.x;
    const py = platform.player.y;
    let best = null;
    let bestDist = Number.POSITIVE_INFINITY;
    platform.zones.forEach((z) => {
      const zx = z.x + z.w * 0.5;
      const zy = z.y + z.h * 0.5;
      const dx = px - zx;
      const dy = py - zy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) {
        bestDist = d;
        best = z;
      }
    });
    if (bestDist <= 120) {
      return best;
    }
    return null;
  }

  function decayNeeds(dt) {
    const rate = 1.35;
    platform.needs.hunger = clamp(platform.needs.hunger - dt * rate, 0, 100);
    platform.needs.fun = clamp(platform.needs.fun - dt * (rate * 0.85), 0, 100);
    platform.needs.clean = clamp(platform.needs.clean - dt * (rate * 0.65), 0, 100);
    platform.needs.energy = clamp(platform.needs.energy - dt * (rate * 0.5), 0, 100);
  }

  function getPreset() {
    const state = platform.animState || {
      activeTab: "idle",
      idle: { amplitude: 10, speed: 1.1, bob: 8 },
      walk: { amplitude: 16, speed: 1.4, bob: 4 },
    };
    return platform.currentMode === "walk" ? state.walk : state.idle;
  }

  function drawCreature(ts) {
    const ctx = platform.ctx;
    const rig = platform.rigState;
    const p = getPreset();
    const t = ts * 0.001 * p.speed;

    const bob = Math.sin(t * Math.PI * 2) * p.bob;
    const sway = Math.sin(t * Math.PI * 2) * p.amplitude * 0.5;

    const baseX = platform.player.x;
    const baseY = platform.player.y + bob;

    if (rig && rig.processedCanvas) {
      const img = rig.processedCanvas;
      const drawW = 140;
      const drawH = 140;
      ctx.save();
      ctx.translate(baseX, baseY);
      ctx.scale(platform.player.facing, 1);
      ctx.rotate((sway / 180) * Math.PI);
      ctx.drawImage(img, -drawW / 2, -drawH + 16, drawW, drawH);
      ctx.restore();
    }

    if (rig && rig.joints && rig.bones) {
      const byId = new Map(rig.joints.map((j) => [j.id, j]));
      const sx = 0.18;
      const sy = 0.18;
      const offX = baseX - 60;
      const offY = baseY - 120;

      ctx.save();
      ctx.strokeStyle = "#1f2d2acc";
      ctx.lineWidth = 2;
      rig.bones.forEach((b) => {
        const a = byId.get(b.from);
        const c = byId.get(b.to);
        if (!a || !c) return;
        const wave = platform.currentMode === "walk" && (b.role === "leg" || b.role === "arm")
          ? Math.sin(t * Math.PI * 2 + (b.role === "leg" ? 0 : Math.PI / 2)) * (p.amplitude * 0.1)
          : 0;
        ctx.beginPath();
        ctx.moveTo(offX + a.x * sx, offY + a.y * sy + wave);
        ctx.lineTo(offX + c.x * sx, offY + c.y * sy - wave);
        ctx.stroke();
      });
      ctx.restore();
    }
  }

  function drawEnvironment() {
    const { ctx, canvas } = platform;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, "#f6f1df");
    sky.addColorStop(1, "#d8ecd7");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#a8d084";
    ctx.fillRect(0, 310, canvas.width, 130);

    platform.zones.forEach((z) => {
      const active = platform.activeZoneId === z.id;
      ctx.fillStyle = active ? "#f38f56" : z.color;
      ctx.fillRect(z.x, z.y, z.w, z.h);
      ctx.strokeStyle = "#32463d33";
      ctx.strokeRect(z.x, z.y, z.w, z.h);
      ctx.fillStyle = "#1f2d2a";
      ctx.font = "700 15px Outfit";
      ctx.fillText(z.label, z.x + 12, z.y + 22);
    });

    ctx.fillStyle = "#6b5847";
    ctx.fillRect(0, 304, canvas.width, 8);
  }

  function step(ts) {
    if (!platform.initialized) return;
    if (!platform.lastTs) {
      platform.lastTs = ts;
    }
    const dt = (ts - platform.lastTs) / 1000;
    platform.lastTs = ts;
    platform.animationTime += dt;

    const player = platform.player;
    const dx = player.targetX - player.x;
    const dist = Math.abs(dx);
    if (dist > 2) {
      const move = Math.min(dist, player.speed * dt);
      player.x += Math.sign(dx) * move;
      player.facing = Math.sign(dx) || player.facing;
      platform.currentMode = "walk";
    } else {
      platform.currentMode = "idle";
    }

    decayNeeds(dt);
    platform.activeZoneId = (getNearestZone() || {}).id || null;

    drawEnvironment();
    drawCreature(ts);
    updateNeedBars();

    requestAnimationFrame(step);
  }

  function interact() {
    const zone = getNearestZone();
    if (!zone) {
      setStatus("No interaction zone nearby. Move closer and press E.");
      return;
    }
    if (zone.effect.hunger) {
      platform.needs.hunger = clamp(platform.needs.hunger + zone.effect.hunger, 0, 100);
    }
    if (zone.effect.fun) {
      platform.needs.fun = clamp(platform.needs.fun + zone.effect.fun, 0, 100);
    }
    if (zone.effect.clean) {
      platform.needs.clean = clamp(platform.needs.clean + zone.effect.clean, 0, 100);
    }
    if (zone.effect.energy) {
      platform.needs.energy = clamp(platform.needs.energy + zone.effect.energy, 0, 100);
    }
    updateNeedBars();
    setStatus(`Interacted with ${zone.label}. Needs updated.`);
  }

  function initTestingPlatform(config) {
    const { canvas, statusEl, needEls } = config;
    platform.canvas = canvas;
    platform.ctx = canvas.getContext("2d");
    platform.statusEl = statusEl;
    platform.needEls = needEls;

    canvas.addEventListener("click", (ev) => {
      const rect = canvas.getBoundingClientRect();
      const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
      platform.player.targetX = clamp(x, 40, canvas.width - 40);
      setStatus("Moving to destination. Press E near a zone to interact.");
    });

    window.addEventListener("keydown", (ev) => {
      if (ev.key === "e" || ev.key === "E") {
        interact();
      }
      if (ev.key === "a" || ev.key === "ArrowLeft") {
        platform.player.targetX = clamp(platform.player.targetX - 35, 40, platform.canvas.width - 40);
      }
      if (ev.key === "d" || ev.key === "ArrowRight") {
        platform.player.targetX = clamp(platform.player.targetX + 35, 40, platform.canvas.width - 40);
      }
    });

    platform.initialized = true;
    updateNeedBars();
    requestAnimationFrame(step);
  }

  function setRigState(rigState) {
    platform.rigState = rigState;
  }

  function setAnimState(animState) {
    platform.animState = animState;
  }

  function triggerPreview(type) {
    platform.currentMode = type === "walk" ? "walk" : "idle";
    setStatus(`Previewing ${platform.currentMode} animation in test platform.`);
  }

  function getTestState() {
    return {
      needs: { ...platform.needs },
      player: { ...platform.player },
      activeZoneId: platform.activeZoneId,
    };
  }

  window.RiggingTestingPlatform = {
    initTestingPlatform,
    setRigState,
    setAnimState,
    triggerPreview,
    getTestState,
  };
})();
