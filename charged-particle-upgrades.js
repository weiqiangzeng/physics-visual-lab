(function () {
  "use strict";

  const toggle = document.getElementById("mobileControlsToggle");
  const controls = document.querySelector(".particle-lab .controls");
  const focusButton = document.getElementById("focusButton");
  const runStatus = document.getElementById("runStatus");
  const playButton = document.getElementById("playButton");
  const pauseButton = document.getElementById("pauseButton");
  const particleLab = window.particleLab;
  if (!toggle || !controls || !runStatus || !particleLab) return;

  let lastRunLabel = "";
  function syncRunState() {
    const state = particleLab.getState();
    const label = state.running ? "运行中" : state.time > 0 ? "已暂停" : "待开始";
    if (label === lastRunLabel) return;
    lastRunLabel = label;
    runStatus.textContent = label;
    runStatus.classList.toggle("is-running", state.running);
    runStatus.classList.toggle("is-paused", !state.running && state.time > 0);
    if (playButton) playButton.setAttribute("aria-label", state.running ? "运行中，点击重新播放" : "开始播放");
    if (pauseButton) pauseButton.setAttribute("aria-label", state.time > 0 && !state.running ? "已暂停" : "暂停模拟");
  }

  function setControlsOpen(open) {
    document.body.classList.toggle("mobile-controls-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    const note = toggle.querySelector("small");
    if (note) note.textContent = open ? "收起参数，保持实验画面简洁" : "展开调节电场、磁场和速度";
  }

  toggle.addEventListener("click", () => setControlsOpen(!document.body.classList.contains("mobile-controls-open")));
  [playButton, pauseButton, document.getElementById("timeInput"), ...document.querySelectorAll("input[type=range]")].filter(Boolean).forEach((control) => {
    control.addEventListener("input", syncRunState);
    control.addEventListener("click", syncRunState);
  });

  if (focusButton) {
    focusButton.addEventListener("click", () => {
      const active = document.body.classList.contains("focus-mode");
      document.body.classList.toggle("teaching-demo", active);
      focusButton.textContent = active ? "退出演示" : "专注模式";
      focusButton.title = active ? "退出教学演示模式" : "隐藏控制区并放大实验观察区";
    });
  }

  const observer = new MutationObserver(syncRunState);
  observer.observe(runStatus, { childList: true, characterData: true, subtree: true });
  syncRunState();
})();
