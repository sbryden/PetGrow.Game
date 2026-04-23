(function () {
  const state = {
    sourceImage: null,
    sourceCanvas: null,
    sourceCtx: null,
    processedCanvas: null,
    processedCtx: null,
    bbox: null,
    joints: [],
    bones: [],
    defaultJoints: [],
    dragJointId: null,
    showSkeleton: true,
    partDensity: 24,
  };

  const callbacks = new Set();

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function findAlphaBounds(ctx, width, height) {
    const img = ctx.getImageData(0, 0, width, height).data;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let count = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const a = img[(y * width + x) * 4 + 3];
        if (a > 12) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
          count += 1;
        }
      }
    }
    if (!count) {
      return null;
    }
    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      pixelCount: count,
    };
  }

  function colorDistance(r1, g1, b1, r2, g2, b2) {
    return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
  }

  function autoRemoveBackground(ctx, width, height) {
    const img = ctx.getImageData(0, 0, width, height);
    const d = img.data;

    const corners = [
      [0, 0],
      [width - 1, 0],
      [0, height - 1],
      [width - 1, height - 1],
    ];
    let rr = 0;
    let gg = 0;
    let bb = 0;
    corners.forEach(([x, y]) => {
      const idx = (y * width + x) * 4;
      rr += d[idx];
      gg += d[idx + 1];
      bb += d[idx + 2];
    });
    const baseR = rr / corners.length;
    const baseG = gg / corners.length;
    const baseB = bb / corners.length;

    const threshold = 68;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const idx = (y * width + x) * 4;
        const dist = colorDistance(d[idx], d[idx + 1], d[idx + 2], baseR, baseG, baseB);
        if (dist < threshold) {
          d[idx + 3] = 0;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  function makeJoint(id, x, y, parent, role) {
    return { id, x, y, parent, role };
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function addChain(joints, baseId, from, to, pieces, role, parentId) {
    let prev = parentId;
    for (let i = 1; i <= pieces; i += 1) {
      const t = i / pieces;
      const id = `${baseId}_${i}`;
      joints.push(makeJoint(id, lerp(from.x, to.x, t), lerp(from.y, to.y, t), prev, role));
      prev = id;
    }
    return prev;
  }

  function buildSkeletonFromBounds(bbox, density) {
    const left = bbox.minX;
    const right = bbox.maxX;
    const top = bbox.minY;
    const bottom = bbox.maxY;
    const cx = left + bbox.width * 0.5;

    const shoulderY = top + bbox.height * 0.35;
    const hipY = top + bbox.height * 0.62;
    const kneeY = top + bbox.height * 0.83;
    const ankleY = top + bbox.height * 0.96;

    const shoulderOffset = bbox.width * 0.2;
    const elbowOut = bbox.width * 0.32;
    const wristOut = bbox.width * 0.36;

    const hipOffset = bbox.width * 0.14;
    const kneeOffset = bbox.width * 0.12;
    const ankleOffset = bbox.width * 0.11;

    const joints = [
      makeJoint("pelvis", cx, hipY, null, "core"),
      makeJoint("spine", cx, top + bbox.height * 0.48, "pelvis", "core"),
      makeJoint("neck", cx, top + bbox.height * 0.26, "spine", "core"),
      makeJoint("head", cx, top + bbox.height * 0.11, "neck", "head"),

      makeJoint("l_shoulder", cx - shoulderOffset, shoulderY, "neck", "arm"),
      makeJoint("l_elbow", cx - elbowOut, top + bbox.height * 0.52, "l_shoulder", "arm"),
      makeJoint("l_wrist", cx - wristOut, top + bbox.height * 0.69, "l_elbow", "arm"),

      makeJoint("r_shoulder", cx + shoulderOffset, shoulderY, "neck", "arm"),
      makeJoint("r_elbow", cx + elbowOut, top + bbox.height * 0.52, "r_shoulder", "arm"),
      makeJoint("r_wrist", cx + wristOut, top + bbox.height * 0.69, "r_elbow", "arm"),

      makeJoint("l_hip", cx - hipOffset, hipY, "pelvis", "leg"),
      makeJoint("l_knee", cx - kneeOffset, kneeY, "l_hip", "leg"),
      makeJoint("l_ankle", cx - ankleOffset, ankleY, "l_knee", "leg"),

      makeJoint("r_hip", cx + hipOffset, hipY, "pelvis", "leg"),
      makeJoint("r_knee", cx + kneeOffset, kneeY, "r_hip", "leg"),
      makeJoint("r_ankle", cx + ankleOffset, ankleY, "r_knee", "leg"),

      makeJoint("tail_1", cx + bbox.width * 0.18, hipY + bbox.height * 0.03, "pelvis", "tail"),
      makeJoint("tail_2", cx + bbox.width * 0.3, hipY + bbox.height * 0.09, "tail_1", "tail"),
      makeJoint("tail_3", cx + bbox.width * 0.4, hipY + bbox.height * 0.14, "tail_2", "tail"),
    ];

    const extra = Math.max(0, Math.floor((density - 20) / 2));
    if (extra > 0) {
      const extraArms = Math.min(3, Math.floor(extra / 2));
      const extraLegs = Math.min(3, Math.max(0, extra - extraArms));

      const lShoulder = joints.find((j) => j.id === "l_shoulder");
      const lWrist = joints.find((j) => j.id === "l_wrist");
      const rShoulder = joints.find((j) => j.id === "r_shoulder");
      const rWrist = joints.find((j) => j.id === "r_wrist");
      const lHip = joints.find((j) => j.id === "l_hip");
      const lAnkle = joints.find((j) => j.id === "l_ankle");
      const rHip = joints.find((j) => j.id === "r_hip");
      const rAnkle = joints.find((j) => j.id === "r_ankle");

      if (extraArms > 0) {
        addChain(joints, "l_arm_extra", lShoulder, lWrist, extraArms, "arm", "l_shoulder");
        addChain(joints, "r_arm_extra", rShoulder, rWrist, extraArms, "arm", "r_shoulder");
      }
      if (extraLegs > 0) {
        addChain(joints, "l_leg_extra", lHip, lAnkle, extraLegs, "leg", "l_hip");
        addChain(joints, "r_leg_extra", rHip, rAnkle, extraLegs, "leg", "r_hip");
      }
    }

    const bones = joints
      .filter((j) => j.parent)
      .map((j) => ({ id: `${j.parent}->${j.id}`, from: j.parent, to: j.id, role: j.role }));

    return { joints, bones };
  }

  function drawChecker(ctx, width, height, size) {
    for (let y = 0; y < height; y += size) {
      for (let x = 0; x < width; x += size) {
        const even = ((x / size) + (y / size)) % 2 === 0;
        ctx.fillStyle = even ? "#eff3ef" : "#dfe7df";
        ctx.fillRect(x, y, size, size);
      }
    }
  }

  function drawRigCanvas(canvas) {
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    drawChecker(ctx, width, height, 24);

    if (state.processedCanvas) {
      ctx.drawImage(state.processedCanvas, 0, 0, width, height);
    }

    if (!state.showSkeleton || !state.joints.length) {
      return;
    }

    const byId = new Map(state.joints.map((j) => [j.id, j]));
    ctx.lineWidth = 3;
    state.bones.forEach((b) => {
      const a = byId.get(b.from);
      const c = byId.get(b.to);
      if (!a || !c) return;
      ctx.strokeStyle = b.role === "leg" ? "#3a7f5e" : b.role === "arm" ? "#285c8b" : "#9f5f37";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
    });

    state.joints.forEach((j) => {
      ctx.fillStyle = j.role === "head" ? "#ef7f45" : "#243b35";
      ctx.beginPath();
      ctx.arc(j.x, j.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  function pickJoint(x, y) {
    let best = null;
    let dist = Number.POSITIVE_INFINITY;
    state.joints.forEach((j) => {
      const dx = x - j.x;
      const dy = y - j.y;
      const dd = Math.sqrt(dx * dx + dy * dy);
      if (dd < dist && dd < 16) {
        dist = dd;
        best = j;
      }
    });
    return best;
  }

  function notify() {
    callbacks.forEach((cb) => cb(getPublicState()));
  }

  function getPublicState() {
    return {
      bbox: state.bbox,
      joints: state.joints.map((j) => ({ ...j })),
      bones: state.bones.map((b) => ({ ...b })),
      partDensity: state.partDensity,
      processedCanvas: state.processedCanvas,
      sourceCanvas: state.sourceCanvas,
    };
  }

  function detectSkeleton() {
    if (!state.processedCtx || !state.processedCanvas) {
      return null;
    }
    const bbox = findAlphaBounds(state.processedCtx, state.processedCanvas.width, state.processedCanvas.height);
    if (!bbox) {
      return null;
    }
    state.bbox = bbox;
    const skeleton = buildSkeletonFromBounds(bbox, state.partDensity);
    state.joints = skeleton.joints;
    state.defaultJoints = skeleton.joints.map((j) => ({ ...j }));
    state.bones = skeleton.bones;
    notify();
    return skeleton;
  }

  function resetJoints() {
    if (!state.defaultJoints.length) return;
    state.joints = state.defaultJoints.map((j) => ({ ...j }));
    notify();
  }

  function setPartDensity(value) {
    state.partDensity = clamp(Number(value) || 24, 14, 42);
  }

  function setShowSkeleton(value) {
    state.showSkeleton = Boolean(value);
  }

  function loadFile(file, removeBg) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = 640;
          canvas.height = 640;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          const x = (canvas.width - w) * 0.5;
          const y = (canvas.height - h) * 0.5;
          ctx.drawImage(img, x, y, w, h);

          if (removeBg) {
            autoRemoveBackground(ctx, canvas.width, canvas.height);
          }

          state.sourceImage = img;
          state.sourceCanvas = canvas;
          state.sourceCtx = ctx;

          const processed = document.createElement("canvas");
          processed.width = canvas.width;
          processed.height = canvas.height;
          const pctx = processed.getContext("2d", { willReadFrequently: true });
          pctx.drawImage(canvas, 0, 0);
          state.processedCanvas = processed;
          state.processedCtx = pctx;

          resolve(getPublicState());
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function initRigging(canvas) {
    let dragging = false;

    canvas.addEventListener("mousedown", (ev) => {
      const rect = canvas.getBoundingClientRect();
      const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
      const y = (ev.clientY - rect.top) * (canvas.height / rect.height);
      const j = pickJoint(x, y);
      if (j) {
        state.dragJointId = j.id;
        dragging = true;
      }
    });

    window.addEventListener("mousemove", (ev) => {
      if (!dragging || !state.dragJointId) return;
      const rect = canvas.getBoundingClientRect();
      const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
      const y = (ev.clientY - rect.top) * (canvas.height / rect.height);
      const joint = state.joints.find((j) => j.id === state.dragJointId);
      if (!joint) return;
      joint.x = clamp(x, 0, canvas.width);
      joint.y = clamp(y, 0, canvas.height);
      notify();
      drawRigCanvas(canvas);
    });

    window.addEventListener("mouseup", () => {
      dragging = false;
      state.dragJointId = null;
    });

    function frame() {
      drawRigCanvas(canvas);
      requestAnimationFrame(frame);
    }
    frame();
  }

  function onChange(cb) {
    callbacks.add(cb);
    return () => callbacks.delete(cb);
  }

  window.RiggingStudio = {
    state,
    initRigging,
    loadFile,
    detectSkeleton,
    resetJoints,
    setPartDensity,
    setShowSkeleton,
    onChange,
    getPublicState,
  };
})();
