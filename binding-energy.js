(function () {
  const model = window.BindingEnergyModel;
  if (!model) throw new Error("BindingEnergyModel is required");

  const refs = {
    canvas: document.getElementById("bindingCanvas"),
    energyChart: document.getElementById("energyChart"),
    stabilityChart: document.getElementById("stabilityChart"),
    isotopeSelect: document.getElementById("isotopeSelect"),
    compareSelect: document.getElementById("compareSelect"),
    isotopeNote: document.getElementById("isotopeNote"),
    assemblySection: document.getElementById("assemblySection"),
    assemblyInput: document.getElementById("assemblyInput"),
    assemblyValue: document.getElementById("assemblyValue"),
    reactionSection: document.getElementById("reactionSection"),
    reactionSelect: document.getElementById("reactionSelect"),
    reactionNote: document.getElementById("reactionNote"),
    playbackValue: document.getElementById("playbackValue"),
    isotopeMetric: document.getElementById("isotopeMetric"),
    compositionMetric: document.getElementById("compositionMetric"),
    separatedMetric: document.getElementById("separatedMetric"),
    atomMetric: document.getElementById("atomMetric"),
    defectMetric: document.getElementById("defectMetric"),
    perNucleonMetric: document.getElementById("perNucleonMetric"),
    bindingNature: document.getElementById("bindingNature"),
    bindingExplanation: document.getElementById("bindingExplanation"),
    modeTitle: document.getElementById("modeTitle"),
    modeGoal: document.getElementById("modeGoal"),
    stateBadge: document.getElementById("stateBadge"),
    stageHint: document.getElementById("stageHint"),
    energyChartTitle: document.getElementById("energyChartTitle"),
    energyChartStatus: document.getElementById("energyChartStatus"),
    stabilityChartTitle: document.getElementById("stabilityChartTitle"),
    stabilityChartStatus: document.getElementById("stabilityChartStatus"),
    stepIndex: document.getElementById("stepIndex"),
    stepTitle: document.getElementById("stepTitle"),
    stepPrompt: document.getElementById("stepPrompt"),
    formulaReadout: document.getElementById("formulaReadout"),
    playButton: document.getElementById("playButton"),
    pauseButton: document.getElementById("pauseButton"),
    keyButton: document.getElementById("keyButton"),
    resetButton: document.getElementById("resetButton"),
    guideButton: document.getElementById("guideButton"),
    stepButton: document.getElementById("stepButton"),
    focusButton: document.getElementById("focusButton"),
    fullscreenButton: document.getElementById("fullscreenButton"),
    guideDialog: document.getElementById("guideDialog"),
    showNucleonsToggle: document.getElementById("showNucleonsToggle"),
    showEnergyToggle: document.getElementById("showEnergyToggle"),
    showLabelsToggle: document.getElementById("showLabelsToggle"),
    showTrendToggle: document.getElementById("showTrendToggle"),
    showLedgerToggle: document.getElementById("showLedgerToggle"),
    sceneTabs: Array.from(document.querySelectorAll(".scene-tab[data-mode]")),
    routeSteps: Array.from(document.querySelectorAll(".route-step")),
    presetButtons: Array.from(document.querySelectorAll("[data-preset]")),
    rateButtons: Array.from(document.querySelectorAll("[data-rate]"))
  };

  const context = refs.canvas.getContext("2d");
  const energyContext = refs.energyChart.getContext("2d");
  const stabilityContext = refs.stabilityChart.getContext("2d");
  const COLORS = {
    cyan: "#67c6d8",
    green: "#7bd898",
    amber: "#f0b84d",
    red: "#ff776c",
    violet: "#b79ae6",
    cream: "#eef1e6",
    text: "#a6b0a9",
    muted: "#717b75"
  };
  const MODES = {
    "mass-defect": {
      title: "质量亏损",
      goal: "结合后的原子静质量小于分离核子对应的质量之和",
      hint: "切换核素，核对每一项质量来自哪里",
      key: "◎ 显示质量差"
    },
    assembly: {
      title: "结合与放能",
      goal: "束缚系统静能降低，等量能量转移到系统外",
      hint: "拖动账本进度，核对静质量减少与释放能量同步",
      key: "◎ 完成结合"
    },
    stability: {
      title: "稳定性曲线",
      goal: "跨核素比较稳定性要看平均结合能，而不是总结合能",
      hint: "选择当前与对照核素，比较 E_b 和 E_b/A 的结论",
      key: "◎ 对照铁区"
    },
    reaction: {
      title: "核反应 Q 值",
      goal: "反应后静质量降低时，质量差转化为产物动能等释放能量",
      hint: "切换聚变与裂变，核对 A、Z 和质量能量账本",
      key: "◎ 切换反应"
    }
  };
  const GUIDE = [
    { title: "先称分离核子", prompt: "为什么原子质量法可以用氢原子质量而不必单独扣除电子？" },
    { title: "再换算结合能", prompt: "把原子核拆成自由核子时，为什么至少要补回同样大小的能量？" },
    { title: "最后比较反应前后", prompt: "轻核聚变和重核裂变为什么都可能向铁区靠近并释放能量？" }
  ];
  const state = {
    mode: "mass-defect",
    isotope: "helium4",
    compare: "iron56",
    reaction: "fusion",
    progress: 1,
    running: false,
    playbackRate: 0.5,
    guideStep: 0,
    dragging: false,
    showNucleons: true,
    showEnergy: true,
    showLabels: true,
    showTrend: true,
    showLedger: true
  };
  let frameCounter = 0;

  function clamp(value, min, max) { return Math.min(max, Math.max(min, Number(value))); }
  function fixed(value, digits = 3) { return Number(value).toFixed(digits).replace("-", "−"); }
  function currentIsotope() { return model.isotopeState(state.isotope); }
  function compareIsotope() { return model.isotopeState(state.compare); }
  function currentAssembly() { return model.assemblyState(state.isotope, state.progress); }
  function currentReaction() { return model.reactionState(state.reaction); }

  function canvasSize(canvas, canvasContext, minimumHeight = 180) {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(280, Math.round(rect.width));
    const height = Math.max(minimumHeight, Math.round(rect.height));
    if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
      canvas.width = width * ratio;
      canvas.height = height * ratio;
    }
    canvasContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { width, height };
  }
  function line(canvasContext, x1, y1, x2, y2, color, width = 1, dash = []) {
    canvasContext.save();
    canvasContext.strokeStyle = color;
    canvasContext.lineWidth = width;
    canvasContext.setLineDash(dash);
    canvasContext.beginPath();
    canvasContext.moveTo(x1, y1);
    canvasContext.lineTo(x2, y2);
    canvasContext.stroke();
    canvasContext.restore();
  }
  function label(canvasContext, value, x, y, color = COLORS.text, size = 10, align = "left", weight = 500) {
    canvasContext.fillStyle = color;
    canvasContext.font = `${weight} ${size}px ui-sans-serif, system-ui`;
    canvasContext.textAlign = align;
    canvasContext.fillText(value, x, y);
  }
  function arrow(canvasContext, x1, y1, x2, y2, color, width = 1.7) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    line(canvasContext, x1, y1, x2, y2, color, width);
    canvasContext.fillStyle = color;
    canvasContext.beginPath();
    canvasContext.moveTo(x2, y2);
    canvasContext.lineTo(x2 - 7 * Math.cos(angle - 0.48), y2 - 7 * Math.sin(angle - 0.48));
    canvasContext.lineTo(x2 - 7 * Math.cos(angle + 0.48), y2 - 7 * Math.sin(angle + 0.48));
    canvasContext.fill();
  }
  function background(canvasContext, width, height, color = "#090d0f") {
    canvasContext.fillStyle = color;
    canvasContext.fillRect(0, 0, width, height);
    for (let x = 0; x < width; x += 36) line(canvasContext, x, 0, x, height, "rgba(238,241,230,.035)");
    for (let y = 0; y < height; y += 36) line(canvasContext, 0, y, width, y, "rgba(238,241,230,.035)");
  }
  function dot(canvasContext, x, y, color, radius = 4, alpha = 1) {
    canvasContext.save();
    canvasContext.globalAlpha = alpha;
    canvasContext.fillStyle = color;
    canvasContext.beginPath();
    canvasContext.arc(x, y, radius, 0, Math.PI * 2);
    canvasContext.fill();
    canvasContext.restore();
  }
  function nucleonPosition(index, count, radius) {
    const angle = index * 2.399963229728653;
    const radial = radius * Math.sqrt((index + 0.5) / Math.max(1, count));
    return { x: Math.cos(angle) * radial, y: Math.sin(angle) * radial };
  }
  function drawNucleus(canvasContext, cx, cy, isotopeState, radius, alpha = 1) {
    const count = Math.min(72, isotopeState.A);
    for (let index = 0; index < count; index += 1) {
      const position = nucleonPosition(index, count, radius);
      const proton = (index * isotopeState.A) % count < count * isotopeState.Z / isotopeState.A;
      dot(canvasContext, cx + position.x, cy + position.y, proton ? COLORS.red : COLORS.cyan, Math.max(2.2, radius / 8), alpha);
    }
    if (isotopeState.A > count && state.showLabels) label(canvasContext, `×${isotopeState.A} 核子`, cx, cy + radius + 20, COLORS.muted, 9, "center");
  }
  function drawFreeReservoir(canvasContext, cx, cy, count, symbol, color) {
    const visible = Math.min(18, count);
    for (let index = 0; index < visible; index += 1) {
      const position = nucleonPosition(index, visible, 36);
      dot(canvasContext, cx + position.x, cy + position.y, color, 3.6);
    }
    label(canvasContext, `${count} ${symbol}`, cx, cy + 57, color, 10, "center", 700);
  }
  function energyPulse(canvasContext, cx, cy, progress, count = 8) {
    if (!state.showEnergy || progress <= 0) return;
    for (let index = 0; index < count; index += 1) {
      const angle = index / count * Math.PI * 2 + performance.now() / 1700;
      const distance = 22 + 62 * ((progress + index / count) % 1);
      const x = cx + Math.cos(angle) * distance;
      const y = cy + Math.sin(angle) * distance;
      line(canvasContext, x - Math.cos(angle) * 7, y - Math.sin(angle) * 7, x + Math.cos(angle) * 7, y + Math.sin(angle) * 7, COLORS.amber, 2);
    }
  }

  function drawMassScene(width, height) {
    const isotope = currentIsotope();
    const y = height * 0.48;
    const left = width * 0.24;
    const right = width * 0.72;
    if (state.showNucleons) {
      drawFreeReservoir(context, left - 45, y, isotope.Z, "¹H", COLORS.red);
      drawFreeReservoir(context, left + 45, y, isotope.N, "n", COLORS.cyan);
      drawNucleus(context, right, y, isotope, Math.min(52, 27 + Math.sqrt(isotope.A) * 2.2));
    }
    arrow(context, width * 0.42, y, width * 0.57, y, COLORS.green, 2);
    label(context, "分离组成", left, 35, COLORS.text, 10, "center", 700);
    label(context, "束缚原子", right, 35, COLORS.text, 10, "center", 700);
    if (state.showLabels) {
      label(context, `${fixed(isotope.separatedMassU, 6)} u`, left, y - 78, COLORS.cyan, 11, "center", 700);
      label(context, `${fixed(isotope.atomicMassU, 6)} u`, right, y - 78, COLORS.green, 11, "center", 700);
      label(context, `差 ${fixed(isotope.massDefectU, 6)} u`, width * 0.5, y + 66, COLORS.amber, 10, "center", 700);
    }
    energyPulse(context, right, y, 0.74, 6);
    label(context, "粒子数量与尺寸按教学可见性缩放", width - 15, height - 14, COLORS.muted, 9, "right");
  }
  function drawAssemblyScene(width, height) {
    const assembly = currentAssembly();
    const cx = width * 0.56;
    const cy = height * 0.48;
    const sourceX = width * 0.17;
    const visible = Math.min(42, assembly.A);
    for (let index = 0; index < visible; index += 1) {
      const start = nucleonPosition(index, visible, 62);
      const end = nucleonPosition(index, visible, Math.min(50, 25 + Math.sqrt(assembly.A) * 2.1));
      const x = sourceX + start.x + (cx + end.x - sourceX - start.x) * assembly.progress;
      const y = cy + start.y + end.y * assembly.progress - start.y * assembly.progress;
      const proton = index / visible < assembly.Z / assembly.A;
      dot(context, x, y, proton ? COLORS.red : COLORS.cyan, 3.8);
    }
    arrow(context, width * 0.28, cy + 82, width * 0.76, cy + 82, COLORS.green, 1.4);
    label(context, "自由组成", width * 0.28, cy + 104, COLORS.muted, 9, "center");
    label(context, "束缚态", width * 0.76, cy + 104, COLORS.muted, 9, "center");
    energyPulse(context, cx, cy, assembly.progress, 10);
    if (state.showLedger) {
      const x = 18;
      const y = 28;
      const w = Math.min(width * 0.34, 270);
      context.fillStyle = "rgba(238,241,230,.08)";
      context.fillRect(x, y, w, 10);
      context.fillStyle = COLORS.amber;
      context.fillRect(x, y, w * assembly.progress, 10);
      label(context, `已释放 ${fixed(assembly.releasedEnergyMeV, 3)} MeV`, x, y + 28, COLORS.amber, 10, "left", 700);
      label(context, `账本静质量 ${fixed(assembly.ledgerMassU, 6)} u`, x, y + 45, COLORS.text, 9);
    }
    label(context, "动画进度是能量账本插值，不代表真实核反应时间", width - 15, height - 14, COLORS.muted, 9, "right");
  }
  function drawStabilityScene(width, height) {
    const selected = currentIsotope();
    const compared = compareIsotope();
    const y = height * 0.47;
    const left = width * 0.31;
    const right = width * 0.69;
    drawNucleus(context, left, y, selected, Math.min(48, 24 + Math.sqrt(selected.A) * 2), 0.92);
    drawNucleus(context, right, y, compared, Math.min(48, 24 + Math.sqrt(compared.A) * 2), 0.92);
    label(context, selected.symbol, left, 35, COLORS.green, 13, "center", 800);
    label(context, compared.symbol, right, 35, COLORS.violet, 13, "center", 800);
    label(context, `总 E_b ${fixed(selected.bindingEnergyMeV, 1)} MeV`, left, y + 76, COLORS.text, 9, "center");
    label(context, `E_b/A ${fixed(selected.bindingEnergyPerNucleonMeV, 3)} MeV`, left, y + 94, COLORS.green, 10, "center", 700);
    label(context, `总 E_b ${fixed(compared.bindingEnergyMeV, 1)} MeV`, right, y + 76, COLORS.text, 9, "center");
    label(context, `E_b/A ${fixed(compared.bindingEnergyPerNucleonMeV, 3)} MeV`, right, y + 94, COLORS.violet, 10, "center", 700);
    const higher = selected.bindingEnergyPerNucleonMeV >= compared.bindingEnergyPerNucleonMeV ? selected : compared;
    label(context, `${higher.symbol} 的平均束缚更强`, width * 0.5, height - 22, COLORS.amber, 10, "center", 700);
  }
  function reactionParticleRadius(particle) {
    if (particle.A <= 1) return 5;
    return Math.min(42, 13 + Math.sqrt(particle.A) * 1.8);
  }
  function drawReactionSide(canvasContext, side, xCenter, cy, spread, alpha) {
    const expanded = [];
    side.forEach((particle) => {
      for (let index = 0; index < particle.count; index += 1) expanded.push(particle);
    });
    expanded.forEach((particle, index) => {
      const offset = (index - (expanded.length - 1) / 2) * spread;
      const radius = reactionParticleRadius(particle);
      if (particle.A === 1) dot(canvasContext, xCenter + offset, cy, COLORS.cyan, radius, alpha);
      else {
        const proxy = { A: particle.A, Z: particle.Z, N: particle.A - particle.Z };
        drawNucleus(canvasContext, xCenter + offset, cy, proxy, radius, alpha);
      }
      if (state.showLabels) label(canvasContext, particle.symbol, xCenter + offset, cy + radius + 17, COLORS.text, 9, "center", 700);
    });
  }
  function drawReactionScene(width, height) {
    const reaction = currentReaction();
    const cy = height * 0.47;
    const left = width * 0.24;
    const right = width * 0.74;
    drawReactionSide(context, reaction.reactants, left, cy, 78, 1 - 0.45 * state.progress);
    drawReactionSide(context, reaction.products, right, cy, state.reaction === "fusion" ? 76 : 92, 0.55 + 0.45 * state.progress);
    arrow(context, width * 0.42, cy, width * 0.57, cy, COLORS.green, 2);
    label(context, reaction.equation, width * 0.5, 31, COLORS.cream, 11, "center", 800);
    energyPulse(context, right, cy, state.progress, state.reaction === "fusion" ? 7 : 12);
    if (state.showLedger) {
      label(context, `反应前 ${fixed(reaction.reactantMassU, 6)} u`, left, height - 42, COLORS.cyan, 9, "center");
      label(context, `反应后 ${fixed(reaction.productMassU, 6)} u`, right, height - 42, COLORS.green, 9, "center");
      label(context, `Q = ${fixed(reaction.qValueMeV, 3)} MeV`, width * 0.5, height - 18, COLORS.amber, 11, "center", 800);
    }
  }
  function drawScene() {
    const { width, height } = canvasSize(refs.canvas, context, 260);
    background(context, width, height);
    if (state.mode === "mass-defect") drawMassScene(width, height);
    if (state.mode === "assembly") drawAssemblyScene(width, height);
    if (state.mode === "stability") drawStabilityScene(width, height);
    if (state.mode === "reaction") drawReactionScene(width, height);
  }

  function chartFrame(canvasContext, width, height, xMin, xMax, yMin, yMax, xLabel, yLabel) {
    const padding = { left: 46, right: 16, top: 20, bottom: 32 };
    const x = (value) => padding.left + (value - xMin) / (xMax - xMin) * (width - padding.left - padding.right);
    const y = (value) => height - padding.bottom - (value - yMin) / (yMax - yMin) * (height - padding.top - padding.bottom);
    line(canvasContext, padding.left, padding.top, padding.left, height - padding.bottom, "rgba(238,241,230,.28)");
    line(canvasContext, padding.left, height - padding.bottom, width - padding.right, height - padding.bottom, "rgba(238,241,230,.28)");
    for (let index = 0; index <= 4; index += 1) {
      const xValue = xMin + (xMax - xMin) * index / 4;
      const yValue = yMin + (yMax - yMin) * index / 4;
      line(canvasContext, x(xValue), padding.top, x(xValue), height - padding.bottom, "rgba(238,241,230,.05)");
      line(canvasContext, padding.left, y(yValue), width - padding.right, y(yValue), "rgba(238,241,230,.05)");
      label(canvasContext, fixed(xValue, 0), x(xValue), height - 13, COLORS.muted, 8, "center");
      label(canvasContext, fixed(yValue, 1), padding.left - 6, y(yValue) + 3, COLORS.muted, 8, "right");
    }
    label(canvasContext, xLabel, width - padding.right, height - 3, COLORS.muted, 8, "right");
    label(canvasContext, yLabel, 5, 11, COLORS.muted, 8);
    return { x, y, padding };
  }
  function chartBackground(canvasContext, canvas, minimumHeight = 180) {
    const size = canvasSize(canvas, canvasContext, minimumHeight);
    background(canvasContext, size.width, size.height, "#111512");
    return size;
  }
  function drawHorizontalBar(canvasContext, x, y, width, color, title, value) {
    canvasContext.fillStyle = "rgba(238,241,230,.07)";
    canvasContext.fillRect(x, y, width, 12);
    canvasContext.fillStyle = color;
    canvasContext.fillRect(x, y, width, 12);
    label(canvasContext, title, x, y - 7, COLORS.muted, 8);
    label(canvasContext, value, x + width, y + 10, color, 9, "right", 700);
  }
  function drawEnergyChart() {
    const isotope = currentIsotope();
    const assembly = currentAssembly();
    const reaction = currentReaction();
    const { width, height } = chartBackground(energyContext, refs.energyChart);
    const x = 28;
    const full = width - 56;
    if (state.mode === "mass-defect") {
      const ratio = isotope.atomicMassU / isotope.separatedMassU;
      drawHorizontalBar(energyContext, x, 52, full, COLORS.cyan, "分离组成质量", `${fixed(isotope.separatedMassU, 6)} u`);
      drawHorizontalBar(energyContext, x, 105, full * ratio, COLORS.green, "束缚原子质量", `${fixed(isotope.atomicMassU, 6)} u`);
      const magnified = Math.min(full, full * isotope.massFraction * 90);
      energyContext.fillStyle = COLORS.amber;
      energyContext.fillRect(x, 152, magnified, 12);
      label(energyContext, "Δm（视觉放大 90×）", x, 145, COLORS.muted, 8);
      label(energyContext, `${fixed(isotope.massDefectU, 6)} u = ${fixed(isotope.bindingEnergyMeV, 3)} MeV/c²`, width - 28, 162, COLORS.amber, 9, "right", 700);
    } else if (state.mode === "assembly") {
      const total = Math.max(1e-9, assembly.bindingEnergyMeV);
      drawHorizontalBar(energyContext, x, 55, full * assembly.progress, COLORS.amber, "已转移到系统外", `${fixed(assembly.releasedEnergyMeV, 3)} MeV`);
      drawHorizontalBar(energyContext, x, 110, full * (1 - assembly.progress), COLORS.violet, "尚未释放的账本差额", `${fixed(assembly.remainingReleaseMeV, 3)} MeV`);
      label(energyContext, `总结合能 ${fixed(total, 3)} MeV`, x, height - 23, COLORS.text, 10, "left", 700);
    } else if (state.mode === "stability") {
      const compared = compareIsotope();
      const maxTotal = Math.max(isotope.bindingEnergyMeV, compared.bindingEnergyMeV);
      const maxPer = Math.max(isotope.bindingEnergyPerNucleonMeV, compared.bindingEnergyPerNucleonMeV);
      drawHorizontalBar(energyContext, x, 43, full * isotope.bindingEnergyMeV / maxTotal, COLORS.green, `${isotope.symbol} 总结合能`, `${fixed(isotope.bindingEnergyMeV, 1)} MeV`);
      drawHorizontalBar(energyContext, x, 82, full * compared.bindingEnergyMeV / maxTotal, COLORS.violet, `${compared.symbol} 总结合能`, `${fixed(compared.bindingEnergyMeV, 1)} MeV`);
      drawHorizontalBar(energyContext, x, 129, full * isotope.bindingEnergyPerNucleonMeV / maxPer, COLORS.green, `${isotope.symbol} 平均结合能`, `${fixed(isotope.bindingEnergyPerNucleonMeV, 3)} MeV`);
      drawHorizontalBar(energyContext, x, 168, full * compared.bindingEnergyPerNucleonMeV / maxPer, COLORS.violet, `${compared.symbol} 平均结合能`, `${fixed(compared.bindingEnergyPerNucleonMeV, 3)} MeV`);
    } else {
      const ratio = reaction.productMassU / reaction.reactantMassU;
      drawHorizontalBar(energyContext, x, 55, full, COLORS.cyan, "反应前静质量", `${fixed(reaction.reactantMassU, 6)} u`);
      drawHorizontalBar(energyContext, x, 110, full * ratio, COLORS.green, "反应后静质量", `${fixed(reaction.productMassU, 6)} u`);
      const magnified = Math.min(full, full * reaction.massDefectU / reaction.reactantMassU * 500);
      energyContext.fillStyle = COLORS.amber;
      energyContext.fillRect(x, 158, magnified, 12);
      label(energyContext, "Δm（视觉放大 500×）", x, 150, COLORS.muted, 8);
      label(energyContext, `Q = ${fixed(reaction.qValueMeV, 3)} MeV`, width - 28, 168, COLORS.amber, 10, "right", 800);
    }
  }
  function drawStabilityChart() {
    const selected = currentIsotope();
    const compared = compareIsotope();
    const { width, height } = chartBackground(stabilityContext, refs.stabilityChart);
    const frame = chartFrame(stabilityContext, width, height, 0, 240, 0, 10, "A", "E_b/A · MeV");
    if (state.showTrend) {
      const curve = model.trendCurve(2);
      stabilityContext.strokeStyle = "rgba(123,216,152,.62)";
      stabilityContext.lineWidth = 2;
      stabilityContext.beginPath();
      curve.forEach((point, index) => {
        const x = frame.x(point.A);
        const y = frame.y(point.bindingEnergyPerNucleonMeV);
        if (index) stabilityContext.lineTo(x, y); else stabilityContext.moveTo(x, y);
      });
      stabilityContext.stroke();
    }
    model.measuredPoints().forEach((point) => {
      let color = COLORS.text;
      let radius = 3;
      if (point.key === state.isotope) { color = COLORS.green; radius = 5; }
      if (point.key === state.compare) { color = COLORS.violet; radius = 5; }
      dot(stabilityContext, frame.x(point.A), frame.y(point.bindingEnergyPerNucleonMeV), color, radius);
      if (state.showLabels && (point.key === state.isotope || point.key === state.compare || point.key === "nickel62")) {
        label(stabilityContext, point.symbol, frame.x(point.A) + 6, frame.y(point.bindingEnergyPerNucleonMeV) - 6, color, 8, "left", 700);
      }
    });
    line(stabilityContext, frame.x(60), frame.y(0), frame.x(60), frame.y(9.2), "rgba(240,184,77,.35)", 1, [4, 3]);
    label(stabilityContext, "铁-镍区", frame.x(60), frame.y(9.45), COLORS.amber, 8, "center");
    if (state.mode === "reaction") {
      const fromA = state.reaction === "fusion" ? 2.5 : 235;
      const toA = state.reaction === "fusion" ? 4 : 116;
      arrow(stabilityContext, frame.x(fromA), frame.y(6.2), frame.x(toA), frame.y(7.6), COLORS.amber, 1.8);
    }
    if (state.isotope === state.compare) label(stabilityContext, "请选择不同核素进行对照", width - 18, 18, COLORS.red, 8, "right");
  }
  function drawCharts() { drawEnergyChart(); drawStabilityChart(); }

  function status() {
    const isotope = currentIsotope();
    if (state.mode === "mass-defect") {
      return {
        badge: `${isotope.symbol} · Δm ${fixed(isotope.massDefectU, 6)} u`,
        className: "mass",
        nature: `Δm 对应 ${fixed(isotope.bindingEnergyMeV, 3)} MeV`,
        explanation: "质量没有消失，系统静能降低并以其他能量形式释放"
      };
    }
    if (state.mode === "assembly") {
      const assembly = currentAssembly();
      return {
        badge: `已释放 ${fixed(assembly.releasedEnergyMeV, 2)} MeV`,
        className: "assembly",
        nature: "静质量与系统静能同步降低",
        explanation: `账本进度 ${fixed(assembly.progress * 100, 0)}%，最终需释放 ${fixed(assembly.bindingEnergyMeV, 3)} MeV`
      };
    }
    if (state.mode === "stability") {
      const compared = compareIsotope();
      const higher = isotope.bindingEnergyPerNucleonMeV >= compared.bindingEnergyPerNucleonMeV ? isotope : compared;
      return {
        badge: `${isotope.symbol} vs ${compared.symbol}`,
        className: "stability",
        nature: `${higher.symbol} 的 E_b/A 更大`,
        explanation: "总结合能常随核子数增加；平均结合能才反映每个核子的平均束缚程度"
      };
    }
    const reaction = currentReaction();
    return {
      badge: `Q = ${fixed(reaction.qValueMeV, 3)} MeV`,
      className: "reaction",
      nature: reaction.qValueMeV > 0 ? "反应为放能反应" : "反应需要输入能量",
      explanation: `A：${reaction.reactantA}→${reaction.productA}，Z：${reaction.reactantZ}→${reaction.productZ}；核子数和电荷数守恒`
    };
  }
  function rangeProgress(input) {
    const minimum = Number(input.min);
    const maximum = Number(input.max);
    input.style.setProperty("--range-progress", `${(Number(input.value) - minimum) / (maximum - minimum) * 100}%`);
  }
  function render() {
    const isotope = currentIsotope();
    const reaction = currentReaction();
    const mode = MODES[state.mode];
    const currentStatus = status();
    refs.isotopeSelect.value = state.isotope;
    refs.compareSelect.value = state.compare;
    refs.reactionSelect.value = state.reaction;
    refs.assemblyInput.value = state.progress;
    refs.assemblyValue.textContent = `${fixed(state.progress * 100, 0)}%`;
    refs.assemblySection.hidden = state.mode === "stability";
    refs.reactionSection.hidden = state.mode !== "reaction";
    refs.compareSelect.disabled = state.mode !== "stability";
    refs.isotopeSelect.disabled = state.mode === "reaction";
    refs.isotopeNote.textContent = state.mode === "stability" ? "用平均结合能比较每个核子的平均束缚程度" : "用原子质量计算，电子数在等式两边抵消";
    refs.reactionNote.textContent = reaction.boundary;
    refs.playbackValue.textContent = `${state.running ? "运行中" : "已暂停"} · ${fixed(state.progress * 100, 0)}%`;
    refs.isotopeMetric.textContent = state.mode === "reaction" ? reaction.label : `${isotope.label} ${isotope.symbol}`;
    refs.compositionMetric.textContent = state.mode === "reaction" ? `A ${reaction.reactantA}→${reaction.productA} · Z ${reaction.reactantZ}→${reaction.productZ}` : `Z=${isotope.Z} · N=${isotope.N}`;
    refs.separatedMetric.textContent = state.mode === "reaction" ? `${fixed(reaction.reactantMassU, 6)} u` : `${fixed(isotope.separatedMassU, 6)} u`;
    refs.atomMetric.textContent = state.mode === "reaction" ? `${fixed(reaction.productMassU, 6)} u` : `${fixed(isotope.atomicMassU, 6)} u`;
    refs.defectMetric.textContent = state.mode === "reaction" ? `${fixed(reaction.massDefectU, 6)} u` : `${fixed(isotope.massDefectU, 6)} u`;
    refs.perNucleonMetric.textContent = state.mode === "reaction" ? `Q = ${fixed(reaction.qValueMeV, 3)} MeV` : `${fixed(isotope.bindingEnergyPerNucleonMeV, 3)} MeV/核子`;
    refs.bindingNature.textContent = currentStatus.nature;
    refs.bindingExplanation.textContent = currentStatus.explanation;
    refs.modeTitle.textContent = mode.title;
    refs.modeGoal.textContent = mode.goal;
    refs.stateBadge.textContent = currentStatus.badge;
    refs.stateBadge.className = `state-badge is-${currentStatus.className}`;
    refs.stageHint.textContent = mode.hint;
    if (state.mode === "mass-defect") {
      refs.energyChartTitle.textContent = "分离质量与原子质量";
      refs.energyChartStatus.textContent = "差值放大显示";
      refs.stabilityChartTitle.textContent = "平均结合能-质量数";
      refs.stabilityChartStatus.textContent = "当前核素定位";
      refs.formulaReadout.textContent = `Δm = ${fixed(isotope.massDefectU, 6)} u`;
    } else if (state.mode === "assembly") {
      refs.energyChartTitle.textContent = "结合能转移账本";
      refs.energyChartStatus.textContent = `总计 ${fixed(isotope.bindingEnergyMeV, 3)} MeV`;
      refs.stabilityChartTitle.textContent = "当前核素在稳定性曲线";
      refs.stabilityChartStatus.textContent = `E_b/A = ${fixed(isotope.bindingEnergyPerNucleonMeV, 3)} MeV`;
      refs.formulaReadout.textContent = `E_b = Δmc² = ${fixed(isotope.bindingEnergyMeV, 3)} MeV`;
    } else if (state.mode === "stability") {
      const compared = compareIsotope();
      refs.energyChartTitle.textContent = "总量与平均量对照";
      refs.energyChartStatus.textContent = `${isotope.symbol} vs ${compared.symbol}`;
      refs.stabilityChartTitle.textContent = "平均结合能-质量数";
      refs.stabilityChartStatus.textContent = "实测点 + 液滴趋势";
      refs.formulaReadout.textContent = `${isotope.symbol}: ${fixed(isotope.bindingEnergyPerNucleonMeV, 3)} MeV/核子`;
    } else {
      refs.energyChartTitle.textContent = "反应前后静质量";
      refs.energyChartStatus.textContent = `Δm = ${fixed(reaction.massDefectU, 6)} u`;
      refs.stabilityChartTitle.textContent = "反应向更强束缚区域移动";
      refs.stabilityChartStatus.textContent = state.reaction === "fusion" ? "轻核聚变" : "重核裂变";
      refs.formulaReadout.textContent = `Q = Δmc² = ${fixed(reaction.qValueMeV, 3)} MeV`;
    }
    refs.stepIndex.textContent = String(state.guideStep + 1).padStart(2, "0");
    refs.stepTitle.textContent = GUIDE[state.guideStep].title;
    refs.stepPrompt.textContent = GUIDE[state.guideStep].prompt;
    refs.sceneTabs.forEach((button) => button.classList.toggle("is-active", button.dataset.mode === state.mode));
    refs.routeSteps.forEach((button, index) => button.classList.toggle("is-active", index === state.guideStep));
    refs.rateButtons.forEach((button) => button.classList.toggle("is-active", Number(button.dataset.rate) === state.playbackRate));
    refs.keyButton.textContent = mode.key;
    refs.playButton.textContent = state.running ? "▶ 运行中" : "▶ 运行";
    refs.playButton.setAttribute("aria-pressed", String(state.running));
    rangeProgress(refs.assemblyInput);
    drawScene();
    drawCharts();
  }

  function setMode(modeName) {
    if (!MODES[modeName]) return;
    state.mode = modeName;
    state.running = false;
    state.progress = modeName === "mass-defect" || modeName === "stability" ? 1 : 0;
    if (modeName === "reaction") state.isotope = "helium4";
    render();
  }
  function reset() {
    Object.assign(state, {
      mode: "mass-defect",
      isotope: "helium4",
      compare: "iron56",
      reaction: "fusion",
      progress: 1,
      running: false,
      playbackRate: 0.5,
      guideStep: 0,
      dragging: false,
      showNucleons: true,
      showEnergy: true,
      showLabels: true,
      showTrend: true,
      showLedger: true
    });
    [refs.showNucleonsToggle, refs.showEnergyToggle, refs.showLabelsToggle, refs.showTrendToggle, refs.showLedgerToggle].forEach((input) => { input.checked = true; });
    render();
  }

  function setState(next = {}) {
    if (!next || typeof next !== "object") return;
    if (typeof next.mode === "string" && MODES[next.mode]) state.mode = next.mode;
    if (typeof next.isotope === "string" && model.ISOTOPES[next.isotope]) state.isotope = next.isotope;
    if (typeof next.compare === "string" && model.ISOTOPES[next.compare]) state.compare = next.compare;
    if (typeof next.reaction === "string" && model.REACTIONS[next.reaction]) state.reaction = next.reaction;
    if (Number.isFinite(Number(next.progress))) state.progress = clamp(next.progress, 0, 1);
    if ([.5, 1].includes(Number(next.playbackRate))) state.playbackRate = Number(next.playbackRate);
    if (Number.isFinite(Number(next.guideStep))) state.guideStep = clamp(Math.round(Number(next.guideStep)), 0, GUIDE.length - 1);
    ["showNucleons", "showEnergy", "showLabels", "showTrend", "showLedger"].forEach((key) => { if (typeof next[key] === "boolean") state[key] = next[key]; });
    state.running = false; state.dragging = false;
    [[refs.showNucleonsToggle, "showNucleons"], [refs.showEnergyToggle, "showEnergy"], [refs.showLabelsToggle, "showLabels"], [refs.showTrendToggle, "showTrend"], [refs.showLedgerToggle, "showLedger"]].forEach(([input, key]) => { input.checked = state[key]; });
    render();
  }

  refs.isotopeSelect.addEventListener("change", () => { state.isotope = refs.isotopeSelect.value; state.running = false; render(); });
  refs.compareSelect.addEventListener("change", () => { state.compare = refs.compareSelect.value; render(); });
  refs.reactionSelect.addEventListener("change", () => { state.reaction = refs.reactionSelect.value; state.progress = 0; state.running = false; render(); });
  refs.assemblyInput.addEventListener("input", () => { state.progress = Number(refs.assemblyInput.value); state.running = false; render(); });
  refs.sceneTabs.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  refs.routeSteps.forEach((button, index) => button.addEventListener("click", () => { state.guideStep = index; render(); }));
  refs.rateButtons.forEach((button) => button.addEventListener("click", () => { state.playbackRate = Number(button.dataset.rate); render(); }));
  refs.presetButtons.forEach((button) => button.addEventListener("click", () => {
    state.isotope = button.dataset.preset;
    state.mode = button.dataset.preset === "iron56" || button.dataset.preset === "uranium235" ? "stability" : "mass-defect";
    state.compare = button.dataset.preset === "iron56" ? "uranium235" : "iron56";
    state.progress = 1;
    state.running = false;
    render();
  }));
  refs.playButton.addEventListener("click", () => {
    if (state.mode === "mass-defect" || state.mode === "stability") state.mode = "assembly";
    if (state.progress >= 1) state.progress = 0;
    state.running = true;
    render();
  });
  refs.pauseButton.addEventListener("click", () => { state.running = false; render(); });
  refs.keyButton.addEventListener("click", () => {
    if (state.mode === "mass-defect") state.showLedger = !state.showLedger;
    if (state.mode === "assembly") state.progress = 1;
    if (state.mode === "stability") Object.assign(state, { isotope: "nickel62", compare: "uranium235" });
    if (state.mode === "reaction") state.reaction = state.reaction === "fusion" ? "fission" : "fusion";
    state.running = false;
    refs.showLedgerToggle.checked = state.showLedger;
    render();
  });
  refs.resetButton.addEventListener("click", reset);
  [
    [refs.showNucleonsToggle, "showNucleons"],
    [refs.showEnergyToggle, "showEnergy"],
    [refs.showLabelsToggle, "showLabels"],
    [refs.showTrendToggle, "showTrend"],
    [refs.showLedgerToggle, "showLedger"]
  ].forEach(([input, key]) => input.addEventListener("change", () => { state[key] = input.checked; render(); }));
  refs.guideButton.addEventListener("click", () => refs.guideDialog.showModal());
  refs.stepButton.addEventListener("click", () => { state.guideStep = (state.guideStep + 1) % GUIDE.length; render(); });
  refs.focusButton.addEventListener("click", () => {
    const active = document.body.classList.toggle("focus-mode");
    refs.focusButton.setAttribute("aria-pressed", String(active));
  });
  refs.fullscreenButton.addEventListener("click", () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());

  function pointerProgress(event) {
    const rect = refs.canvas.getBoundingClientRect();
    if (state.mode === "assembly" || state.mode === "reaction") {
      state.progress = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      state.running = false;
      render();
    }
  }
  refs.canvas.addEventListener("pointerdown", (event) => {
    state.dragging = true;
    refs.canvas.setPointerCapture(event.pointerId);
    pointerProgress(event);
  });
  refs.canvas.addEventListener("pointermove", (event) => { if (state.dragging) pointerProgress(event); });
  refs.canvas.addEventListener("pointerup", (event) => {
    state.dragging = false;
    if (refs.canvas.hasPointerCapture(event.pointerId)) refs.canvas.releasePointerCapture(event.pointerId);
  });
  refs.canvas.addEventListener("pointercancel", () => { state.dragging = false; });
  window.addEventListener("resize", render);

  let previousTime = performance.now();
  function frame(now) {
    const dt = Math.min(0.04, (now - previousTime) / 1000);
    previousTime = now;
    if (state.running) {
      state.progress += dt * state.playbackRate * 0.55;
      if (state.progress >= 1) {
        state.progress = 1;
        state.running = false;
      }
      frameCounter += 1;
      drawScene();
      if (frameCounter % 3 === 0) render();
    }
    requestAnimationFrame(frame);
  }

  window.bindingEnergyLab = {
    solveIsotope: (key = state.isotope) => model.isotopeState(key),
    solveReaction: (key = state.reaction) => model.reactionState(key),
    getState: () => ({ ...state }),
    setMode,
    setState,
    reset
  };
  render();
  requestAnimationFrame(frame);
})();
