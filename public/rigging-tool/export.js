(function () {
  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function fitBoxFromAlpha(canvas) {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const { width, height } = canvas;
    const data = ctx.getImageData(0, 0, width, height).data;

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let count = 0;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const a = data[(y * width + x) * 4 + 3];
        if (a > 6) {
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

    return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
  }

  function createPartSprite(sourceCanvas, from, to) {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = width;
    maskCanvas.height = height;
    const mctx = maskCanvas.getContext("2d");

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const thickness = clamp(len * 0.42, 24, 86);

    mctx.strokeStyle = "#000";
    mctx.lineWidth = thickness;
    mctx.lineCap = "round";
    mctx.beginPath();
    mctx.moveTo(from.x, from.y);
    mctx.lineTo(to.x, to.y);
    mctx.stroke();

    const partCanvas = document.createElement("canvas");
    partCanvas.width = width;
    partCanvas.height = height;
    const pctx = partCanvas.getContext("2d");

    pctx.drawImage(sourceCanvas, 0, 0);
    pctx.globalCompositeOperation = "destination-in";
    pctx.drawImage(maskCanvas, 0, 0);

    const box = fitBoxFromAlpha(partCanvas);
    if (!box) {
      return null;
    }

    const crop = document.createElement("canvas");
    crop.width = box.width;
    crop.height = box.height;
    const cctx = crop.getContext("2d");
    cctx.drawImage(partCanvas, box.minX, box.minY, box.width, box.height, 0, 0, box.width, box.height);

    return {
      canvas: crop,
      box,
      center: [
        ((from.x + to.x) * 0.5) / width,
        ((from.y + to.y) * 0.5) / height,
      ],
    };
  }

  function toDownload(anchor, filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 600);
  }

  function buildAtlas(parts) {
    const cell = 128;
    const cols = 6;
    const rows = Math.ceil(parts.length / cols);

    const atlas = document.createElement("canvas");
    atlas.width = cols * cell;
    atlas.height = rows * cell;
    const ctx = atlas.getContext("2d");

    const mapping = {};

    parts.forEach((part, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = col * cell;
      const y = row * cell;

      const scale = Math.min((cell - 8) / part.canvas.width, (cell - 8) / part.canvas.height);
      const drawW = part.canvas.width * scale;
      const drawH = part.canvas.height * scale;
      const dx = x + (cell - drawW) * 0.5;
      const dy = y + (cell - drawH) * 0.5;

      ctx.drawImage(part.canvas, dx, dy, drawW, drawH);
      mapping[part.id] = {
        x: Math.round(dx),
        y: Math.round(dy),
        w: Math.round(drawW),
        h: Math.round(drawH),
        center: part.center,
      };
    });

    return { atlas, mapping };
  }

  function exportProject({ anchor, rigState, animations, testState }) {
    if (!rigState || !rigState.joints || !rigState.bones || !rigState.processedCanvas) {
      throw new Error("No rig data available. Detect skeleton first.");
    }

    const byId = new Map(rigState.joints.map((j) => [j.id, j]));
    const parts = [];

    rigState.bones.forEach((bone) => {
      const from = byId.get(bone.from);
      const to = byId.get(bone.to);
      if (!from || !to) return;
      const sprite = createPartSprite(rigState.processedCanvas, from, to);
      if (!sprite) return;
      parts.push({
        id: bone.id.replace("->", "_"),
        role: bone.role,
        canvas: sprite.canvas,
        box: sprite.box,
        center: sprite.center,
      });
    });

    const atlasData = buildAtlas(parts);
    const atlasBase64 = atlasData.atlas.toDataURL("image/png");

    const exportData = {
      version: 1,
      exportedAt: new Date().toISOString(),
      image: {
        width: rigState.processedCanvas.width,
        height: rigState.processedCanvas.height,
      },
      joints: rigState.joints,
      bones: rigState.bones,
      parts: parts.map((part) => ({
        id: part.id,
        role: part.role,
        center: part.center,
        box: {
          minX: part.box.minX / rigState.processedCanvas.width,
          minY: part.box.minY / rigState.processedCanvas.height,
          maxX: part.box.maxX / rigState.processedCanvas.width,
          maxY: part.box.maxY / rigState.processedCanvas.height,
        },
      })),
      animations,
      testPlatform: testState,
      atlas: {
        width: atlasData.atlas.width,
        height: atlasData.atlas.height,
        mapping: atlasData.mapping,
      },
    };

    toDownload(anchor, "petgrow-rigging-export.json", JSON.stringify(exportData, null, 2), "application/json");

    fetch(atlasBase64)
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        anchor.href = url;
        anchor.download = "petgrow-rigging-atlas.png";
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 600);
      });

    return exportData;
  }

  window.RiggingExporter = {
    exportProject,
  };
})();
