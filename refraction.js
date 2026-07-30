(function () {
  const state = {
    angle: 35,
    n1: 1,
    n2: 1.5,
    mode: "refraction",
    showAngles: true,
    showNormal: true,
    showLabels: true
  };

  const refs = {
    canvas: document.getElementById("refractionCanvas"),
    angleInput: document.getElementById("angleInput"),
    angleNumber: document.getElementById("angleNumber"),
    n1Input: document.getElementById("n1Input"),
    n1Number: document.getElementById("n1Number"),
    n2Input: document.getElementById("n2Input"),
    n2Number: document.getElementById("n2Number"),
    angleValue: document.getElementById("angleValue"),
    n1Value: document.getElementById("n1Value"),
    n2Value: document.getElementById("n2Value"),
    incidentMetric: document.getElementById("incidentMetric"),
    refractedMetric: document.getElementById("refractedMetric"),
    criticalMetric: document.getElementById("criticalMetric"),
    n1Metric: document.getElementById("n1Metric"),
    n2Metric: document.getElementById("n2Metric"),
    modeMetric: document.getElementById("modeMetric"),
    criticalCardValue: document.getElementById("criticalCardValue"),
    stateLabel: document.getElementById("stateLabel"),
    stateNote: document.getElementById("stateNote"),
    overviewState: document.getElementById("overviewState"),
    overviewCritical: document.getElementById("overviewCritical"),
    formulaReadout: document.getElementById("formulaReadout"),
    formulaNote: document.getElementById("formulaNote"),
    angleToggle: document.getElementById("showAnglesToggle"),
    normalToggle: document.getElementById("showNormalToggle"),
    labelsToggle: document.getElementById("showLabelsToggle"),
    modeGoal: document.getElementById("modeGoal"),
    modePrompt: document.getElementById("modePrompt"),
    modeFormula: document.getElementById("modeFormula"),
    presetTitle: document.getElementById("presetTitle"),
    presetButtons: Array.from(document.querySelectorAll(".preset-button")),
    criticalCards: Array.from(document.querySelectorAll(".critical-card[data-jump]")),
    normalCard: document.getElementById("normalCard"),
    criticalCard: document.getElementById("criticalCard"),
    totalCard: document.getElementById("totalCard"),
    resetButton: document.getElementById("resetButton")
  };

  const ctx = refs.canvas.getContext("2d");
  const width = 980;
  const height = 540;
  const dpr = window.devicePixelRatio || 1;
  refs.canvas.width = width * dpr;
  refs.canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const modeConfigs = {
    refraction: {
      title: "折射关系",
      goal: "验证折射角与入射角的关系",
      prompt: "固定两种介质，改变入射角，比较两条光线相对法线的角度。",
      formula: "\\(n_1\\sin\\theta_1=n_2\\sin\\theta_2\\)"
    },
    critical: {
      title: "临界角",
      goal: "找到折射光线沿界面传播的时刻",
      prompt: "让光从高折射率介质射向低折射率介质，调节入射角直到折射角接近 90°。",
      formula: "\\(\\sin\\theta_c=\\frac{n_2}{n_1}\\)"
    },
    total: {
      title: "全反射",
      goal: "观察超过临界角后的光路变化",
      prompt: "超过临界角后，第二种介质中不再出现折射光线，能量沿反射光路返回。",
      formula: "\\(n_1>n_2,\\;\\theta_1>\\theta_c\\)"
    }
  };

  function getDerived() {
    const angleRad = (state.angle * Math.PI) / 180;
    const ratio = state.n2 / state.n1;
    const critical = state.n1 > state.n2 ? (Math.asin(Math.min(1, ratio)) * 180) / Math.PI : null;
    const sine = state.n1 * Math.sin(angleRad) / state.n2;
    const total = sine > 1 + 1e-9;
    const refracted = total ? null : (Math.asin(Math.max(-1, Math.min(1, sine))) * 180) / Math.PI;
    return { angleRad, critical, refracted, total };
  }

  function format(value, digits = 1) {
    return Number.isFinite(value) ? value.toFixed(digits) : "--";
  }

  function pointOnRay(origin, angle, distance, verticalDirection = 1, horizontalDirection = 1) {
    return { x: origin.x + horizontalDirection * Math.sin(angle) * distance, y: origin.y + verticalDirection * Math.cos(angle) * distance };
  }

  function drawArrow(from, to, color) {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - 13 * Math.cos(angle - Math.PI / 6), to.y - 13 * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(to.x - 13 * Math.cos(angle + Math.PI / 6), to.y - 13 * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawAngleArc(origin, angle, radius, color, label, direction) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    const start = -Math.PI / 2;
    const end = start + direction * angle;
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, radius, start, end, direction < 0);
    ctx.stroke();
    ctx.font = "700 14px Avenir Next, PingFang SC, sans-serif";
    const labelPoint = { x: origin.x + Math.sin(angle * 0.55) * radius * 1.12, y: origin.y - Math.cos(angle * 0.55) * radius * 1.12 };
    ctx.fillText(label, labelPoint.x + 8, labelPoint.y);
    ctx.restore();
  }

  function draw() {
    const d = getDerived();
    const origin = { x: 500, y: 270 };
    const rayLength = 245;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#eaf5fb";
    ctx.fillRect(0, 0, width, origin.y);
    ctx.fillStyle = "#edf7f1";
    ctx.fillRect(0, origin.y, width, height - origin.y);
    ctx.strokeStyle = "rgba(18, 31, 36, 0.24)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(width, origin.y);
    ctx.stroke();

    if (state.showLabels) {
      ctx.fillStyle = "rgba(18, 31, 36, 0.68)";
      ctx.font = "700 15px Avenir Next, PingFang SC, sans-serif";
      ctx.fillText(`介质 1  n₁ = ${state.n1.toFixed(2)}`, 28, 38);
      ctx.fillText(`介质 2  n₂ = ${state.n2.toFixed(2)}`, 28, origin.y + 34);
    }
    if (state.showNormal) {
      ctx.save();
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = "rgba(123, 63, 160, 0.72)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(origin.x, 26);
      ctx.lineTo(origin.x, height - 22);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "#7b3fa0";
      ctx.font = "13px Avenir Next, PingFang SC, sans-serif";
      ctx.fillText("法线", origin.x + 10, 52);
    }

    const incident = pointOnRay(origin, d.angleRad, rayLength, -1, -1);
    const reflected = pointOnRay(origin, d.angleRad, rayLength, -1, 1);
    drawArrow(incident, origin, "#c96b29");
    drawArrow(origin, reflected, "#c96b29");

    if (!d.total) {
      const refractedAngle = ((d.refracted || 0) * Math.PI) / 180;
      const transmitted = pointOnRay(origin, refractedAngle, rayLength, 1, 1);
      drawArrow(origin, transmitted, "#0d7168");
    }
    if (state.showAngles) {
      drawAngleArc(origin, d.angleRad, 62, "#c96b29", `θ₁ ${state.angle.toFixed(0)}°`, -1);
      if (!d.total && d.refracted != null) drawAngleArc(origin, (d.refracted * Math.PI) / 180, 92, "#0d7168", `θ₂ ${d.refracted.toFixed(1)}°`, 1);
    }
    ctx.fillStyle = "#121f24";
    ctx.beginPath();
    ctx.arc(origin.x, origin.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = d.total ? "#7b3fa0" : "#0d7168";
    ctx.font = "700 16px Avenir Next, PingFang SC, sans-serif";
    ctx.fillText(d.total ? "全反射：无折射光" : "折射光", 620, origin.y + (d.total ? 46 : 76));
  }

  function sync() {
    const d = getDerived();
    const critical = d.critical == null ? "--" : `${format(d.critical, 1)}°`;
    const mode = d.total ? "全反射" : "折射";
    refs.angleValue.textContent = `${state.angle.toFixed(0)}°`;
    refs.n1Value.textContent = state.n1.toFixed(2);
    refs.n2Value.textContent = state.n2.toFixed(2);
    refs.incidentMetric.textContent = `${state.angle.toFixed(0)}°`;
    refs.refractedMetric.textContent = d.total ? "--" : `${format(d.refracted, 1)}°`;
    refs.criticalMetric.textContent = critical;
    refs.n1Metric.textContent = state.n1.toFixed(2);
    refs.n2Metric.textContent = state.n2.toFixed(2);
    refs.modeMetric.textContent = mode;
    refs.criticalCardValue.textContent = `θc = ${critical}`;
    refs.overviewState.textContent = mode;
    refs.overviewCritical.textContent = `θc ${critical}`;
    refs.stateLabel.textContent = d.total ? "发生全反射" : "发生折射";
    refs.stateNote.textContent = d.total ? "入射角超过临界角，第二种介质中没有折射光线。" : "折射光线进入第二种介质，角度由两种介质共同决定。";
    refs.formulaReadout.textContent = d.total ? "\\(\\theta_1>\\theta_c\\)" : "\\(n_1\\sin\\theta_1=n_2\\sin\\theta_2\\)";
    refs.formulaNote.textContent = d.total ? "全反射的前提是光从高折射率介质射向低折射率介质。" : `计算值：${state.n1.toFixed(2)} × sin ${state.angle.toFixed(0)}° = ${state.n2.toFixed(2)} × sin ${d.refracted?.toFixed(1) || "--"}°`;
    refs.angleInput.value = state.angle;
    refs.angleNumber.value = state.angle;
    refs.n1Input.value = state.n1;
    refs.n1Number.value = state.n1;
    refs.n2Input.value = state.n2;
    refs.n2Number.value = state.n2;
    refs.angleToggle.checked = state.showAngles;
    refs.normalToggle.checked = state.showNormal;
    refs.labelsToggle.checked = state.showLabels;
    refs.presetTitle.textContent = modeConfigs[state.mode].title;
    refs.modeGoal.textContent = modeConfigs[state.mode].goal;
    refs.modePrompt.textContent = modeConfigs[state.mode].prompt;
    refs.modeFormula.textContent = modeConfigs[state.mode].formula;
    refs.presetButtons.forEach((button) => button.classList.toggle("active", button.dataset.mode === state.mode));
    refs.normalCard.classList.toggle("active", state.mode === "refraction");
    refs.criticalCard.classList.toggle("active", state.mode === "critical");
    refs.totalCard.classList.toggle("active", state.mode === "total" || d.total);
    window.physicsTypesetMath?.();
    draw();
  }

  function setValue(key, input, number, value) {
    const next = Number(value);
    if (!Number.isFinite(next)) return sync();
    state[key] = Math.min(Number(input.max), Math.max(Number(input.min), next));
    sync();
  }

  [["angle", refs.angleInput, refs.angleNumber], ["n1", refs.n1Input, refs.n1Number], ["n2", refs.n2Input, refs.n2Number]].forEach(([key, input, number]) => {
    input.addEventListener("input", (event) => setValue(key, input, number, event.target.value));
    number.addEventListener("change", (event) => setValue(key, input, number, event.target.value));
  });
  [["showAngles", refs.angleToggle], ["showNormal", refs.normalToggle], ["showLabels", refs.labelsToggle]].forEach(([key, control]) => {
    control.addEventListener("change", (event) => { state[key] = event.target.checked; sync(); });
  });
  refs.presetButtons.forEach((button) => button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    const d = getDerived();
    if (state.mode === "critical") {
      if (d.critical == null) state.n1 = Math.max(state.n1, state.n2 + 0.2);
      state.angle = getDerived().critical || 42;
    }
    if (state.mode === "total") {
      if (state.n1 <= state.n2) state.n1 = Math.min(2.4, state.n2 + 0.3);
      state.angle = Math.min(89, (getDerived().critical || 40) + 12);
    }
    sync();
  }));
  refs.criticalCards.forEach((card) => {
    const jump = () => {
      if (card.dataset.jump === "critical") {
        state.mode = "critical";
        if (state.n1 <= state.n2) state.n1 = Math.min(2.4, state.n2 + 0.2);
        state.angle = getDerived().critical || 42;
      } else if (card.dataset.jump === "total") {
        state.mode = "total";
        if (state.n1 <= state.n2) state.n1 = Math.min(2.4, state.n2 + 0.3);
        state.angle = Math.min(89, (getDerived().critical || 40) + 12);
      } else state.mode = "refraction";
      sync();
    };
    card.addEventListener("click", jump);
    card.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); jump(); } });
  });
  refs.resetButton.addEventListener("click", () => {
    Object.assign(state, { angle: 35, n1: 1, n2: 1.5, mode: "refraction", showAngles: true, showNormal: true, showLabels: true });
    sync();
  });

  sync();
})();
