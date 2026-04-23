(function () {
  const animState = {
    activeTab: "idle",
    presets: {
      idle: { amplitude: 10, speed: 1.1, bob: 8 },
      walk: { amplitude: 16, speed: 1.4, bob: 4 },
    },
  };

  const callbacks = new Set();

  function notify() {
    const payload = {
      activeTab: animState.activeTab,
      presets: {
        idle: { ...animState.presets.idle },
        walk: { ...animState.presets.walk },
      },
    };
    callbacks.forEach((cb) => cb(payload));
  }

  function getActivePreset() {
    return animState.presets[animState.activeTab];
  }

  function formatSummary() {
    const p = getActivePreset();
    return `${animState.activeTab[0].toUpperCase() + animState.activeTab.slice(1)}: amplitude ${p.amplitude}, speed ${p.speed.toFixed(1)}, bobbing ${p.bob}`;
  }

  function initEditor(elements) {
    const {
      tabIdle,
      tabWalk,
      amplitude,
      speed,
      bob,
      summary,
      saveBtn,
    } = elements;

    function syncUi() {
      const p = getActivePreset();
      amplitude.value = p.amplitude;
      speed.value = p.speed;
      bob.value = p.bob;
      summary.textContent = formatSummary();
      tabIdle.classList.toggle("active", animState.activeTab === "idle");
      tabWalk.classList.toggle("active", animState.activeTab === "walk");
    }

    function updateFromInputs() {
      const p = getActivePreset();
      p.amplitude = Number(amplitude.value);
      p.speed = Number(speed.value);
      p.bob = Number(bob.value);
      summary.textContent = formatSummary();
      notify();
    }

    tabIdle.addEventListener("click", () => {
      animState.activeTab = "idle";
      syncUi();
      notify();
    });

    tabWalk.addEventListener("click", () => {
      animState.activeTab = "walk";
      syncUi();
      notify();
    });

    amplitude.addEventListener("input", updateFromInputs);
    speed.addEventListener("input", updateFromInputs);
    bob.addEventListener("input", updateFromInputs);

    saveBtn.addEventListener("click", () => {
      summary.textContent = `${formatSummary()} (saved)`;
      notify();
      setTimeout(() => {
        summary.textContent = formatSummary();
      }, 1200);
    });

    syncUi();
  }

  function onChange(cb) {
    callbacks.add(cb);
    return () => callbacks.delete(cb);
  }

  function getAnimations() {
    return {
      activeTab: animState.activeTab,
      idle: { ...animState.presets.idle },
      walk: { ...animState.presets.walk },
    };
  }

  window.RiggingEditor = {
    initEditor,
    getAnimations,
    onChange,
  };
})();
