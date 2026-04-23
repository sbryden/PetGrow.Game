(function () {
  const rigCanvas = document.getElementById("rig-canvas");
  const imageUpload = document.getElementById("image-upload");
  const detectBtn = document.getElementById("detect-btn");
  const resetJointsBtn = document.getElementById("reset-joints-btn");
  const partDensity = document.getElementById("part-density");
  const partDensityValue = document.getElementById("part-density-value");
  const removeBg = document.getElementById("remove-bg");
  const showSkeleton = document.getElementById("show-skeleton");
  const rigStatus = document.getElementById("rig-status");
  const jointList = document.getElementById("joint-list");

  const tabIdle = document.getElementById("tab-idle");
  const tabWalk = document.getElementById("tab-walk");
  const animAmplitude = document.getElementById("anim-amplitude");
  const animSpeed = document.getElementById("anim-speed");
  const animBob = document.getElementById("anim-bob");
  const animSummary = document.getElementById("anim-summary");
  const saveAnimBtn = document.getElementById("save-anim-btn");
  const previewAnimBtn = document.getElementById("preview-anim-btn");

  const testCanvas = document.getElementById("test-canvas");
  const testStatus = document.getElementById("test-status");
  const needHunger = document.getElementById("need-hunger");
  const needFun = document.getElementById("need-fun");
  const needClean = document.getElementById("need-clean");
  const needEnergy = document.getElementById("need-energy");

  const exportBtn = document.getElementById("export-project-btn");
  const downloadAnchor = document.getElementById("download-anchor");

  function setRigStatus(text) {
    rigStatus.textContent = text;
  }

  function renderJointList(rigState) {
    const joints = rigState && rigState.joints ? rigState.joints : [];
    jointList.innerHTML = "";
    if (!joints.length) {
      const li = document.createElement("li");
      li.textContent = "No joints detected yet.";
      jointList.appendChild(li);
      return;
    }
    joints.forEach((j) => {
      const li = document.createElement("li");
      li.textContent = `${j.id} (${Math.round(j.x)}, ${Math.round(j.y)})`;
      jointList.appendChild(li);
    });
  }

  window.RiggingStudio.initRigging(rigCanvas);

  window.RiggingEditor.initEditor({
    tabIdle,
    tabWalk,
    amplitude: animAmplitude,
    speed: animSpeed,
    bob: animBob,
    summary: animSummary,
    saveBtn: saveAnimBtn,
  });

  window.RiggingTestingPlatform.initTestingPlatform({
    canvas: testCanvas,
    statusEl: testStatus,
    needEls: {
      hunger: needHunger,
      fun: needFun,
      clean: needClean,
      energy: needEnergy,
    },
  });

  window.RiggingStudio.onChange((state) => {
    renderJointList(state);
    window.RiggingTestingPlatform.setRigState(state);
  });

  window.RiggingEditor.onChange((animations) => {
    window.RiggingTestingPlatform.setAnimState(animations);
  });

  imageUpload.addEventListener("change", async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    try {
      await window.RiggingStudio.loadFile(file, removeBg.checked);
      const skeleton = window.RiggingStudio.detectSkeleton();
      if (!skeleton) {
        setRigStatus("Could not detect a visible creature silhouette.");
      } else {
        setRigStatus(`Image loaded. Detected ${skeleton.joints.length} joints and ${skeleton.bones.length} movable parts.`);
      }
    } catch (err) {
      console.error(err);
      setRigStatus("Failed to load image.");
    }
  });

  detectBtn.addEventListener("click", () => {
    const skeleton = window.RiggingStudio.detectSkeleton();
    if (!skeleton) {
      setRigStatus("Detection failed. Upload a clearer image with a visible animal silhouette.");
      return;
    }
    setRigStatus(`Re-detected skeleton with ${skeleton.joints.length} joints.`);
  });

  resetJointsBtn.addEventListener("click", () => {
    window.RiggingStudio.resetJoints();
    setRigStatus("Joints reset to detected positions.");
  });

  showSkeleton.addEventListener("change", () => {
    window.RiggingStudio.setShowSkeleton(showSkeleton.checked);
  });

  partDensity.addEventListener("input", () => {
    const value = Number(partDensity.value);
    partDensityValue.textContent = `${value} parts target`;
    window.RiggingStudio.setPartDensity(value);
  });

  previewAnimBtn.addEventListener("click", () => {
    const anim = window.RiggingEditor.getAnimations();
    window.RiggingTestingPlatform.setAnimState(anim);
    window.RiggingTestingPlatform.triggerPreview(anim.activeTab);
    testStatus.textContent = `Previewing ${anim.activeTab} animation.`;
  });

  exportBtn.addEventListener("click", () => {
    try {
      const payload = window.RiggingExporter.exportProject({
        anchor: downloadAnchor,
        rigState: window.RiggingStudio.getPublicState(),
        animations: window.RiggingEditor.getAnimations(),
        testState: window.RiggingTestingPlatform.getTestState(),
      });
      testStatus.textContent = `Exported ${payload.parts.length} parts to JSON + atlas PNG.`;
    } catch (err) {
      console.error(err);
      testStatus.textContent = err.message || "Export failed.";
    }
  });

  renderJointList({ joints: [] });
})();
