(function () {
  const M = window.ElectromagneticOscillationModel;
  if (!M) throw new Error("ElectromagneticOscillationModel is required");

  const state = {
    mode: "lc",
    inductanceMh: 20,
    capacitanceUf: 5,
    voltage: 12,
    resistance: 2,
    driveRatio: 1,
    quality: 8,
    waveLogFrequency: 8,
    fieldAmplitude: 30,
    direction: 1,
    phase: 0,
    running: false,
    guideStep: 0,
    showCharge: true,
    showField: true,
    showEnergy: true,
    showScale: true,
    dragging: false,
  };

  const $ = (id) => document.getElementById(id);
  const R = {
    canvas: $("fieldCanvas"),
    waveChart: $("waveChart"),
    energyChart: $("energyChart"),
    sceneTabs: [...document.querySelectorAll(".scene-tab[data-mode]")],
    routeSteps: [...document.querySelectorAll(".route-step")],
    presets: [...document.querySelectorAll("[data-preset]")],
    directionButtons: [...document.querySelectorAll("[data-direction]")],
    lcSection: $("lcSection"),
    dampingSection: $("dampingSection"),
    tuningSection: $("tuningSection"),
    waveSection: $("waveSection"),
    inductanceInput: $("inductanceInput"),
    capacitanceInput: $("capacitanceInput"),
    voltageInput: $("voltageInput"),
    resistanceInput: $("resistanceInput"),
    driveRatioInput: $("driveRatioInput"),
    qualityInput: $("qualityInput"),
    waveFrequencyInput: $("waveFrequencyInput"),
    fieldAmplitudeInput: $("fieldAmplitudeInput"),
    phaseInput: $("phaseInput"),
    inductanceValue: $("inductanceValue"),
    capacitanceValue: $("capacitanceValue"),
    voltageValue: $("voltageValue"),
    resistanceValue: $("resistanceValue"),
    driveRatioValue: $("driveRatioValue"),
    qualityValue: $("qualityValue"),
    waveFrequencyValue: $("waveFrequencyValue"),
    fieldAmplitudeValue: $("fieldAmplitudeValue"),
    directionValue: $("directionValue"),
    playbackValue: $("playbackValue"),
    modeTitle: $("modeTitle"),
    modeGoal: $("modeGoal"),
    stateBadge: $("stateBadge"),
    stageHint: $("stageHint"),
    metricLabels: [1, 2, 3, 4, 5, 6].map((n) => $("metric" + n + "Label")),
    metrics: [1, 2, 3, 4, 5, 6].map((n) => $("metric" + n)),
    fieldNature: $("fieldNature"),
    fieldExplanation: $("fieldExplanation"),
    waveTitle: $("waveTitle"),
    waveStatus: $("waveStatus"),
    ledgerTitle: $("ledgerTitle"),
    ledgerStatus: $("ledgerStatus"),
    stepIndex: $("stepIndex"),
    stepTitle: $("stepTitle"),
    stepPrompt: $("stepPrompt"),
    formulaReadout: $("formulaReadout"),
    playButton: $("playButton"),
    pauseButton: $("pauseButton"),
    keyButton: $("keyButton"),
    resetButton: $("resetButton"),
    guideButton: $("guideButton"),
    stepButton: $("stepButton"),
    focusButton: $("focusButton"),
    fullscreenButton: $("fullscreenButton"),
    guideDialog: $("guideDialog"),
    showChargeToggle: $("showChargeToggle"),
    showFieldToggle: $("showFieldToggle"),
    showEnergyToggle: $("showEnergyToggle"),
    showScaleToggle: $("showScaleToggle"),
  };

  const ctx = R.canvas.getContext("2d");
  const wctx = R.waveChart.getContext("2d");
  const ectx = R.energyChart.getContext("2d");
  const C = {
    bg: "#090d0f",
    grid: "rgba(223,229,223,.055)",
    cyan: "#62c7d8",
    green: "#79d795",
    amber: "#f0ba55",
    red: "#ff786e",
    violet: "#b69be5",
    white: "#dfe5df",
    muted: "#84908a",
  };
  const modes = {
    lc: {
      title: "LC 状态交换",
      goal: "追踪电容器电荷与线圈电流相差四分之一周期",
      hint: "拖动相位，观察电荷如何继续流动并反向充电",
    },
    energy: {
      title: "场能接力",
      goal: "核对电场能与磁场能的周期转换和总量守恒",
      hint: "暂停在四个关键相位，比较两种场能的份额",
    },
    tuning: {
      title: "调谐与选频",
      goal: "改变驱动频率与品质因数，定位固有频率响应峰",
      hint: "扫过 f/f₀=1，比较响应峰高度和带宽",
    },
    wave: {
      title: "电磁波传播",
      goal: "让电场、磁场与传播方向保持两两垂直",
      hint: "改变频率数量级，比较波长与光子能量尺度",
    },
  };
  const guide = [
    ["先追踪状态", "电容器放电到电压为零时，电流为什么没有立刻停止？"],
    ["再核对能量", "理想回路中电场能减少多少，磁场能就增加多少吗？"],
    ["最后连接传播", "电磁波向前传播时，哪些物理量在空间中周期变化？"],
  ];
  const bandNames = {
    radio: "无线电波",
    microwave: "微波",
    infrared: "红外线",
    visible: "可见光",
    ultraviolet: "紫外线",
    xray: "X 射线",
    gamma: "伽马射线",
  };

  function fmt(value, digits = 2) {
    return Number(value).toFixed(digits);
  }
  function signed(value, digits = 2) {
    return (value >= 0 ? "+" : "") + fmt(value, digits);
  }
  function engineering(value, unit) {
    const amount = Math.abs(value);
    if (amount < 1e-15) return `0 ${unit}`;
    if (amount >= 1e9) return `${fmt(value / 1e9, 2)} G${unit}`;
    if (amount >= 1e6) return `${fmt(value / 1e6, 2)} M${unit}`;
    if (amount >= 1e3) return `${fmt(value / 1e3, 2)} k${unit}`;
    if (amount >= 1) return `${fmt(value, 2)} ${unit}`;
    if (amount >= 1e-3) return `${fmt(value * 1e3, 2)} m${unit}`;
    if (amount >= 1e-6) return `${fmt(value * 1e6, 2)} μ${unit}`;
    if (amount >= 1e-9) return `${fmt(value * 1e9, 2)} n${unit}`;
    return `${value.toExponential(2)} ${unit}`;
  }
  function frequencyText(value) {
    if (value >= 1e18) return fmt(value / 1e18, 2) + " EHz";
    if (value >= 1e15) return fmt(value / 1e15, 2) + " PHz";
    if (value >= 1e12) return fmt(value / 1e12, 2) + " THz";
    if (value >= 1e9) return fmt(value / 1e9, 2) + " GHz";
    if (value >= 1e6) return fmt(value / 1e6, 2) + " MHz";
    if (value >= 1e3) return fmt(value / 1e3, 2) + " kHz";
    return fmt(value, 2) + " Hz";
  }
  function size(canvas, context) {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    const width = Math.max(300, Math.round(rect.width));
    const height = Math.max(170, Math.round(rect.height));
    if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
      canvas.width = width * ratio;
      canvas.height = height * ratio;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { width, height };
  }
  function grid(context, width, height) {
    context.fillStyle = C.bg;
    context.fillRect(0, 0, width, height);
    context.strokeStyle = C.grid;
    context.lineWidth = 1;
    for (let x = 18; x < width; x += 42) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    for (let y = 18; y < height; y += 42) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
  }
  function text(context, value, x, y, color = C.white, font = "10px ui-monospace,monospace", align = "left") {
    context.fillStyle = color;
    context.font = font;
    context.textAlign = align;
    context.fillText(value, x, y);
  }
  function arrow(context, x1, y1, x2, y2, color, label = "") {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    context.save();
    context.strokeStyle = context.fillStyle = color;
    context.lineWidth = 2.3;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
    context.beginPath();
    context.moveTo(x2, y2);
    context.lineTo(x2 - 8 * Math.cos(angle - .48), y2 - 8 * Math.sin(angle - .48));
    context.lineTo(x2 - 8 * Math.cos(angle + .48), y2 - 8 * Math.sin(angle + .48));
    context.fill();
    if (label) text(context, label, x2 + 5, y2 - 5, color, "700 10px ui-monospace,monospace");
    context.restore();
  }
  function current() {
    const phaseRad = state.phase * Math.PI * 2;
    const base = {
      inductanceH: state.inductanceMh / 1000,
      capacitanceF: state.capacitanceUf / 1e6,
      initialVoltageV: state.voltage,
      phaseRad,
    };
    const lc = M.lcOscillation(base);
    const timeS = state.phase / lc.frequencyHz;
    return {
      lc,
      damped: M.dampedOscillation({
        ...base,
        resistanceOhm: state.resistance,
        timeS: timeS * 5,
      }),
      tuning: M.tuning({
        ...base,
        driveFrequencyHz: lc.frequencyHz * state.driveRatio,
        qualityFactor: state.quality,
      }),
      wave: M.electromagneticWave({
        frequencyHz: 10 ** state.waveLogFrequency,
        electricAmplitudeVm: state.fieldAmplitude,
        timeS: state.phase / 10 ** state.waveLogFrequency,
        direction: state.direction,
      }),
    };
  }
  function keyState(s) {
    const e = s.electricEnergyJ / Math.max(s.totalEnergyJ, 1e-30);
    if (e > .98) return { badge: "电场能最大", cls: "is-electric", nature: "电容器电荷达到极值，回路电流为零", explanation: "能量几乎全部储存在电容器电场中" };
    if (e < .02) return { badge: "磁场能最大", cls: "is-magnetic", nature: "电容器电荷为零，回路电流达到极值", explanation: "线圈的自感使电流继续流动并开始反向充电" };
    return { badge: "场能正在转换", cls: "is-safe", nature: "电场能和磁场能正在相互转换", explanation: `当前电场能占 ${(e * 100).toFixed(1)}%，磁场能占 ${((1 - e) * 100).toFixed(1)}%` };
  }
  function describe(q) {
    const s = q.lc;
    if (state.mode === "tuning") {
      const t = q.tuning;
      const resonant = Math.abs(t.frequencyRatio - 1) < .015;
      return {
        badge: resonant ? "共振峰" : `失谐 ${signed(t.detuningHz, 1)} Hz`,
        cls: resonant ? "is-magnetic" : "is-warning",
        labels: ["固有频率 f₀", "驱动频率 f", "频率比 f/f₀", "归一化响应", "品质因数 Q", "半功率带宽"],
        values: [frequencyText(t.frequencyHz), frequencyText(t.driveFrequencyHz), fmt(t.frequencyRatio, 3), fmt(t.normalizedResponse, 3), fmt(t.qualityFactor, 1), frequencyText(t.bandwidthHz)],
        nature: resonant ? "驱动频率与固有频率匹配，稳态响应最强" : "驱动频率偏离固有频率，响应受到抑制",
        explanation: `Q=${fmt(t.qualityFactor, 1)}，带宽 Δf=f₀/Q=${frequencyText(t.bandwidthHz)}`,
        formula: `f₀=1/(2π√LC)=${frequencyText(t.frequencyHz)}`,
        waveTitle: "调谐响应曲线",
        waveStatus: resonant ? "f=f₀" : `f/f₀=${fmt(t.frequencyRatio, 2)}`,
        ledgerTitle: "带宽与选择性",
        ledgerStatus: "Δf=f₀/Q",
      };
    }
    if (state.mode === "wave") {
      const w = q.wave;
      const band = bandNames[M.spectrumBand(w.frequencyHz)];
      return {
        badge: `${band} · ${state.direction > 0 ? "+x" : "−x"}`,
        cls: "is-wave",
        labels: ["频率 f", "波长 λ", "电场振幅 Eₘ", "磁场振幅 Bₘ", "光子能量 hf", "平均强度"],
        values: [frequencyText(w.frequencyHz), engineering(w.wavelengthM, "m"), fmt(w.electricAmplitudeVm, 1) + " V/m", engineering(w.magneticAmplitudeT, "T"), engineering(w.photonEnergyJ, "J"), fmt(w.intensityWm2, 3) + " W/m²"],
        nature: "电场、磁场和传播方向两两垂直",
        explanation: `Eₘ/c=${engineering(w.magneticAmplitudeT, "T")}，场振幅同相变化`,
        formula: `c=fλ=${(w.frequencyHz * w.wavelengthM).toExponential(5)} m/s`,
        waveTitle: "同相的 E 与 B 空间切片",
        waveStatus: "E ⟂ B ⟂ k",
        ledgerTitle: "电磁频谱位置",
        ledgerStatus: band,
      };
    }
    const k = keyState(s);
    if (state.mode === "energy") {
      const d = q.damped;
      return {
        ...k,
        labels: ["电场能 Wₑ", "磁场能 Wᵦ", "理想总能量", "能量残差", "阻尼包络", "振荡状态"],
        values: [engineering(s.electricEnergyJ, "J"), engineering(s.magneticEnergyJ, "J"), engineering(s.totalEnergyJ, "J"), engineering(s.energyResidualJ, "J"), fmt(d.envelope * 100, 2) + "%", d.underdamped ? "欠阻尼" : "非振荡衰减"],
        formula: `Wₑ+Wᵦ=${engineering(s.totalEnergyJ, "J")}`,
        waveTitle: "两种场能的相位",
        waveStatus: "总和保持不变",
        ledgerTitle: "理想守恒与真实衰减",
        ledgerStatus: state.resistance === 0 ? "R=0" : `R=${fmt(state.resistance, 1)} Ω`,
      };
    }
    return {
      ...k,
      labels: ["振荡相位", "电容电荷 q", "回路电流 i", "电场能 Wₑ", "磁场能 Wᵦ", "固有频率 f₀"],
      values: [fmt(state.phase * 360, 1) + "°", engineering(s.chargeC, "C"), fmt(s.currentA, 4) + " A", engineering(s.electricEnergyJ, "J"), engineering(s.magneticEnergyJ, "J"), frequencyText(s.frequencyHz)],
      formula: `q=Qₘcosωt · i=−ωQₘsinωt`,
      waveTitle: "电荷与电流相位",
      waveStatus: "相差 1/4 周期",
      ledgerTitle: "电场能与磁场能",
      ledgerStatus: "Wₑ+Wᵦ=常量",
    };
  }

  function drawCoil(context, x, y, height, color) {
    context.strokeStyle = color;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(x, y - height / 2);
    for (let i = 0; i <= 80; i++) {
      const p = i / 80;
      context.lineTo(x + Math.sin(p * Math.PI * 12) * 14, y - height / 2 + p * height);
    }
    context.stroke();
  }
  function circuitPath(width, height) {
    const narrow = width < 500;
    const left = narrow ? 68 : width * .25;
    const right = narrow ? width - 68 : width * .75;
    const top = narrow ? 68 : height * .25;
    const bottom = narrow ? height - 70 : height * .75;
    return { left, right, top, bottom, cx: (left + right) / 2, cy: (top + bottom) / 2 };
  }
  function pointOnCircuit(p, box) {
    const w = box.right - box.left;
    const h = box.bottom - box.top;
    const perimeter = 2 * (w + h);
    let d = ((p % 1) + 1) % 1 * perimeter;
    if (d < w) return { x: box.left + d, y: box.top };
    d -= w;
    if (d < h) return { x: box.right, y: box.top + d };
    d -= h;
    if (d < w) return { x: box.right - d, y: box.bottom };
    d -= w;
    return { x: box.left, y: box.bottom - d };
  }
  function drawCircuit(q, width, height, energyFocus) {
    const s = q.lc;
    const box = circuitPath(width, height);
    ctx.strokeStyle = "#58625c";
    ctx.lineWidth = 3;
    ctx.strokeRect(box.left, box.top, box.right - box.left, box.bottom - box.top);
    ctx.fillStyle = C.bg;
    ctx.fillRect(box.left - 6, box.cy - 54, 18, 108);
    ctx.strokeStyle = C.amber;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(box.left - 13, box.cy - 45);
    ctx.lineTo(box.left + 13, box.cy - 45);
    ctx.moveTo(box.left - 13, box.cy + 45);
    ctx.lineTo(box.left + 13, box.cy + 45);
    ctx.stroke();
    ctx.fillStyle = C.bg;
    ctx.fillRect(box.right - 18, box.cy - 68, 36, 136);
    drawCoil(ctx, box.right, box.cy, 126, C.violet);
    const chargeRatio = s.chargeC / Math.max(s.chargeAmplitudeC, 1e-30);
    const currentRatio = s.currentA / Math.max(s.currentAmplitudeA, 1e-30);
    if (state.showCharge) {
      const count = Math.max(1, Math.round(Math.abs(chargeRatio) * 10));
      for (let i = 0; i < count; i++) {
        const yy = box.cy - 38 + i * 76 / Math.max(1, count - 1);
        text(ctx, chargeRatio >= 0 ? "+" : "−", box.left - 29, yy + 4, chargeRatio >= 0 ? C.amber : C.cyan, "700 14px sans-serif", "center");
        text(ctx, chargeRatio >= 0 ? "−" : "+", box.left + 29, yy + 4, chargeRatio >= 0 ? C.cyan : C.amber, "700 14px sans-serif", "center");
      }
      for (let i = 0; i < 12; i++) {
        const p = pointOnCircuit(i / 12 + state.phase * Math.sign(currentRatio || 1) * .12, box);
        ctx.fillStyle = C.cyan;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (Math.abs(currentRatio) > .05) {
      const y = box.top - 20;
      arrow(ctx, box.cx - 45 * Math.sign(currentRatio), y, box.cx + 45 * Math.sign(currentRatio), y, C.cyan, "i");
    }
    if (state.showField) {
      const eAlpha = .12 + .7 * Math.abs(chargeRatio);
      for (let i = -2; i <= 2; i++) {
        arrow(ctx, box.left - 8, box.cy + i * 15, box.left + 8, box.cy + i * 15, `rgba(240,186,85,${eAlpha})`);
      }
      const bAlpha = .1 + .72 * Math.abs(currentRatio);
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = `rgba(182,155,229,${bAlpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(box.right, box.cy, 28 + i * 12, 22 + i * 9, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    text(ctx, `C=${fmt(state.capacitanceUf, 1)} μF`, box.left, box.bottom + 27, C.amber, "700 10px ui-monospace,monospace", "center");
    text(ctx, `L=${fmt(state.inductanceMh, 1)} mH`, box.right, box.bottom + 27, C.violet, "700 10px ui-monospace,monospace", "center");
    if (energyFocus && state.showEnergy) {
      const total = s.totalEnergyJ || 1;
      const barWidth = Math.min(220, width * .42);
      const x = box.cx - barWidth / 2;
      const y = box.bottom + (height - box.bottom) * .55;
      ctx.fillStyle = "rgba(255,255,255,.08)";
      ctx.fillRect(x, y, barWidth, 12);
      ctx.fillStyle = C.amber;
      ctx.fillRect(x, y, barWidth * s.electricEnergyJ / total, 12);
      ctx.fillStyle = C.violet;
      ctx.fillRect(x + barWidth * s.electricEnergyJ / total, y, barWidth * s.magneticEnergyJ / total, 12);
    }
  }
  function drawTuning(q, width, height) {
    const t = q.tuning;
    const cx = width / 2;
    const y = height * .5;
    const response = Math.min(1, t.normalizedResponse);
    ctx.strokeStyle = C.cyan;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const x = 55 + i * 24;
      ctx.moveTo(x, y - 90);
      ctx.lineTo(x, y + 90);
    }
    ctx.stroke();
    text(ctx, "驱动源", 103, y + 116, C.cyan, "700 11px sans-serif", "center");
    for (let i = 0; i < 6; i++) {
      const radius = 28 + i * 24 + state.phase * 18;
      ctx.strokeStyle = `rgba(98,199,216,${Math.max(.04, .34 - i * .045)})`;
      ctx.beginPath();
      ctx.arc(105, y, radius, -.8, .8);
      ctx.stroke();
    }
    const receiverX = width - 118;
    ctx.strokeStyle = C.violet;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(receiverX, y + 90);
    for (let i = 0; i <= 80; i++) {
      const p = i / 80;
      const amp = 10 + 42 * response;
      ctx.lineTo(receiverX + Math.sin(p * Math.PI * 10 + state.phase * Math.PI * 2) * amp, y + 90 - p * 180);
    }
    ctx.stroke();
    ctx.fillStyle = `rgba(240,186,85,${.1 + .75 * response})`;
    ctx.beginPath();
    ctx.arc(receiverX, y - 110, 16 + 10 * response, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, "调谐回路", receiverX, y + 116, C.violet, "700 11px sans-serif", "center");
    text(ctx, `f/f₀=${fmt(t.frequencyRatio, 2)}`, cx, 28, C.white, "700 12px ui-monospace,monospace", "center");
    text(ctx, `响应 ${fmt(t.normalizedResponse * 100, 1)}%`, cx, height - 24, response > .85 ? C.green : C.amber, "700 11px ui-monospace,monospace", "center");
  }
  function drawWave(q, width, height) {
    const w = q.wave;
    const margin = width < 500 ? 28 : 55;
    const axisY = height * .52;
    const span = width - margin * 2;
    const cycles = 2.25;
    arrow(ctx, state.direction > 0 ? margin : width - margin, axisY, state.direction > 0 ? width - margin : margin, axisY, C.green, "k");
    const samples = 120;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = C.amber;
    ctx.beginPath();
    for (let i = 0; i <= samples; i++) {
      const p = i / samples;
      const x = margin + span * p;
      const phase = p * cycles * Math.PI * 2 - state.direction * state.phase * Math.PI * 2;
      const y = axisY - Math.sin(phase) * Math.min(92, height * .28);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = C.violet;
    ctx.beginPath();
    for (let i = 0; i <= samples; i++) {
      const p = i / samples;
      const x = margin + span * p;
      const phase = p * cycles * Math.PI * 2 - state.direction * state.phase * Math.PI * 2;
      const offset = Math.sin(phase) * Math.min(58, height * .18);
      const y = axisY + offset * .48;
      const xx = x + offset * .45;
      if (i) ctx.lineTo(xx, y); else ctx.moveTo(xx, y);
    }
    ctx.stroke();
    if (state.showField) {
      for (let i = 0; i <= 12; i++) {
        const p = i / 12;
        const x = margin + span * p;
        const phase = p * cycles * Math.PI * 2 - state.direction * state.phase * Math.PI * 2;
        const value = Math.sin(phase);
        arrow(ctx, x, axisY, x, axisY - value * Math.min(75, height * .22), "rgba(240,186,85,.62)");
        arrow(ctx, x, axisY, x + value * 38, axisY + value * 20, "rgba(182,155,229,.62)");
      }
    }
    text(ctx, "E", margin, 24, C.amber, "700 12px ui-monospace,monospace");
    text(ctx, "B", margin + 26, 24, C.violet, "700 12px ui-monospace,monospace");
    if (state.showScale) {
      const x1 = margin;
      const x2 = margin + span / cycles;
      ctx.strokeStyle = C.cyan;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x1, height - 34);
      ctx.lineTo(x2, height - 34);
      ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, `λ=${engineering(w.wavelengthM, "m")}`, (x1 + x2) / 2, height - 42, C.cyan, "700 10px ui-monospace,monospace", "center");
    }
  }
  function drawMain(q) {
    const { width, height } = size(R.canvas, ctx);
    grid(ctx, width, height);
    if (state.mode === "tuning") drawTuning(q, width, height);
    else if (state.mode === "wave") drawWave(q, width, height);
    else drawCircuit(q, width, height, state.mode === "energy");
  }
  function axes(context, width, height, yLabel) {
    context.strokeStyle = "rgba(223,229,223,.22)";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(38, 18);
    context.lineTo(38, height - 30);
    context.lineTo(width - 16, height - 30);
    context.stroke();
    text(context, yLabel, 10, 14, C.muted);
  }
  function plot(context, points, color, width = 2) {
    context.strokeStyle = color;
    context.lineWidth = width;
    context.beginPath();
    points.forEach((p, i) => i ? context.lineTo(p.x, p.y) : context.moveTo(p.x, p.y));
    context.stroke();
  }
  function drawWaveChart(q) {
    const { width, height } = size(R.waveChart, wctx);
    grid(wctx, width, height);
    axes(wctx, width, height, state.mode === "tuning" ? "响应" : state.mode === "wave" ? "场" : "归一化量");
    const left = 40, right = width - 18, top = 22, bottom = height - 31;
    if (state.mode === "tuning") {
      const points = [];
      for (let i = 0; i <= 180; i++) {
        const ratio = .2 + 1.8 * i / 180;
        const t = M.tuning({inductanceH:state.inductanceMh / 1000, capacitanceF:state.capacitanceUf / 1e6, initialVoltageV:state.voltage, driveFrequencyHz:q.lc.frequencyHz * ratio, qualityFactor:state.quality});
        points.push({x:left + (right - left) * i / 180, y:bottom - Math.min(1.05, t.normalizedResponse) * (bottom - top) / 1.05});
      }
      plot(wctx, points, C.violet, 2.5);
      const x = left + (right - left) * (state.driveRatio - .2) / 1.8;
      wctx.strokeStyle = C.amber;
      wctx.beginPath(); wctx.moveTo(x, top); wctx.lineTo(x, bottom); wctx.stroke();
      text(wctx, "0.2", left, height - 12, C.muted, "9px monospace", "center");
      text(wctx, "f/f₀=1", left + (right-left)*.8/1.8, height - 12, C.green, "9px monospace", "center");
      text(wctx, "2.0", right, height - 12, C.muted, "9px monospace", "center");
      return;
    }
    const a = [], b = [];
    for (let i = 0; i <= 180; i++) {
      const p = i / 180;
      const phase = p * Math.PI * 2;
      const x = left + (right - left) * p;
      if (state.mode === "wave") {
        a.push({x,y:(top+bottom)/2 - Math.sin(phase) * (bottom-top)*.34});
        b.push({x,y:(top+bottom)/2 - Math.sin(phase) * (bottom-top)*.2});
      } else if (state.mode === "energy") {
        a.push({x,y:bottom - Math.cos(phase) ** 2 * (bottom-top)});
        b.push({x,y:bottom - Math.sin(phase) ** 2 * (bottom-top)});
      } else {
        a.push({x,y:(top+bottom)/2 - Math.cos(phase) * (bottom-top)*.38});
        b.push({x,y:(top+bottom)/2 + Math.sin(phase) * (bottom-top)*.38});
      }
    }
    plot(wctx, a, C.amber, 2.2);
    plot(wctx, b, state.mode === "wave" ? C.violet : C.cyan, 2.2);
    const cursor = left + (right-left) * state.phase;
    wctx.strokeStyle = C.white;
    wctx.setLineDash([3,4]);
    wctx.beginPath(); wctx.moveTo(cursor, top); wctx.lineTo(cursor, bottom); wctx.stroke();
    wctx.setLineDash([]);
    text(wctx, state.mode === "energy" ? "Wₑ" : state.mode === "wave" ? "E" : "q/Qₘ", left + 5, top + 10, C.amber, "700 9px monospace");
    text(wctx, state.mode === "energy" ? "Wᵦ" : state.mode === "wave" ? "cB" : "i/Iₘ", left + 45, top + 10, state.mode === "wave" ? C.violet : C.cyan, "700 9px monospace");
  }
  function drawEnergyChart(q) {
    const { width, height } = size(R.energyChart, ectx);
    grid(ectx, width, height);
    const left = 42, right = width - 18, top = 22, bottom = height - 30;
    if (state.mode === "wave") {
      const bands = [5, 8.4771, 11.4771, 14.6021, 14.8751, 16.4771, 19.4771, 20];
      const colors = [C.cyan, C.green, C.amber, "#f5f0df", C.violet, C.red, "#bd7af0"];
      const names = ["无线电", "微波", "红外", "可见", "紫外", "X", "γ"];
      for (let i = 0; i < names.length; i++) {
        const x1 = left + (right-left) * (bands[i]-5)/15;
        const x2 = left + (right-left) * (bands[i+1]-5)/15;
        ectx.fillStyle = colors[i] + "88";
        ectx.fillRect(x1, 65, Math.max(2,x2-x1), 46);
        if (x2-x1 > 28) text(ectx, names[i], (x1+x2)/2, 91, C.white, "9px sans-serif", "center");
      }
      const cursor = left + (right-left) * (state.waveLogFrequency-5)/15;
      ectx.strokeStyle = C.white; ectx.lineWidth = 2;
      ectx.beginPath(); ectx.moveTo(cursor, 48); ectx.lineTo(cursor, 129); ectx.stroke();
      text(ectx, frequencyText(q.wave.frequencyHz), cursor, 39, C.white, "700 9px monospace", "center");
      text(ectx, `λ ${engineering(q.wave.wavelengthM,"m")}`, width/2, height-24, C.cyan, "700 10px monospace", "center");
      return;
    }
    if (state.mode === "tuning") {
      const t = q.tuning;
      const center = width / 2;
      const bandPx = Math.min((right-left)*.55, (right-left) / Math.max(2,state.quality) * 4);
      ectx.fillStyle = "rgba(182,155,229,.18)";
      ectx.fillRect(center-bandPx/2, 58, bandPx, 70);
      ectx.strokeStyle = C.violet; ectx.lineWidth = 2;
      ectx.strokeRect(center-bandPx/2, 58, bandPx, 70);
      ectx.strokeStyle = C.green;
      ectx.beginPath(); ectx.moveTo(center, 40); ectx.lineTo(center, 145); ectx.stroke();
      text(ectx, "半功率带宽", center, 82, C.white, "700 10px sans-serif", "center");
      text(ectx, frequencyText(t.bandwidthHz), center, 104, C.violet, "700 12px monospace", "center");
      text(ectx, `Q↑ → 带宽↓ → 选择性↑`, center, height-25, C.green, "700 10px sans-serif", "center");
      return;
    }
    axes(ectx, width, height, "能量");
    const total = q.lc.totalEnergyJ || 1;
    const ideal = [], envelope = [];
    for (let i=0;i<=180;i++) {
      const p=i/180;
      const x=left+(right-left)*p;
      ideal.push({x,y:bottom-(bottom-top)});
      const time = p * 5 / q.lc.frequencyHz;
      const d=M.dampedOscillation({inductanceH:state.inductanceMh/1000,capacitanceF:state.capacitanceUf/1e6,initialVoltageV:state.voltage,resistanceOhm:state.resistance,timeS:time});
      envelope.push({x,y:bottom-(d.storedEnergyEnvelopeJ/total)*(bottom-top)});
    }
    if (state.showEnergy) plot(ectx, ideal, C.green, 1.7);
    plot(ectx, envelope, state.resistance ? C.red : C.green, 2.3);
    text(ectx,"理想总能量",left+6,top+12,C.green,"700 9px sans-serif");
    text(ectx,state.resistance ? "含电阻的能量包络" : "R=0，与理想线重合",left+80,top+12,state.resistance?C.red:C.green,"700 9px sans-serif");
  }
  function updateReadouts(q) {
    const d = describe(q);
    const mode = modes[state.mode];
    R.modeTitle.textContent = mode.title;
    R.modeGoal.textContent = mode.goal;
    R.stageHint.textContent = mode.hint;
    R.stateBadge.textContent = d.badge;
    R.stateBadge.className = "state-badge " + d.cls;
    d.labels.forEach((label, i) => R.metricLabels[i].textContent = label);
    d.values.forEach((value, i) => R.metrics[i].textContent = value);
    R.fieldNature.textContent = d.nature;
    R.fieldExplanation.textContent = d.explanation;
    R.formulaReadout.textContent = d.formula;
    R.waveTitle.textContent = d.waveTitle;
    R.waveStatus.textContent = d.waveStatus;
    R.ledgerTitle.textContent = d.ledgerTitle;
    R.ledgerStatus.textContent = d.ledgerStatus;
    R.inductanceValue.textContent = fmt(state.inductanceMh, 1) + " mH";
    R.capacitanceValue.textContent = fmt(state.capacitanceUf, 1) + " μF";
    R.voltageValue.textContent = fmt(state.voltage, 1) + " V";
    R.resistanceValue.textContent = fmt(state.resistance, 1) + " Ω";
    R.driveRatioValue.textContent = fmt(state.driveRatio, 2);
    R.qualityValue.textContent = fmt(state.quality, 1);
    R.waveFrequencyValue.textContent = frequencyText(q.wave.frequencyHz);
    R.fieldAmplitudeValue.textContent = fmt(state.fieldAmplitude, 1) + " V/m";
    R.directionValue.textContent = state.direction > 0 ? "向右 +x" : "向左 −x";
    R.playbackValue.textContent = `${state.running ? "运行中" : "已暂停"} · ${fmt(state.phase * 360, 0)}°`;
    R.phaseInput.value = state.phase;
    const [title, prompt] = guide[state.guideStep];
    R.stepIndex.textContent = String(state.guideStep + 1).padStart(2, "0");
    R.stepTitle.textContent = title;
    R.stepPrompt.textContent = prompt;
  }
  function setRangeFill(input) {
    const min = Number(input.min), max = Number(input.max), value = Number(input.value);
    input.style.setProperty("--range-progress", `${(value-min)/(max-min)*100}%`);
  }
  function render() {
    const q = current();
    updateReadouts(q);
    drawMain(q);
    drawWaveChart(q);
    drawEnergyChart(q);
    document.querySelectorAll("input[type=range]").forEach(setRangeFill);
  }
  function setMode(mode) {
    state.mode = mode;
    R.sceneTabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.mode === mode));
    R.lcSection.hidden = mode === "wave";
    R.dampingSection.hidden = mode === "tuning" || mode === "wave";
    R.tuningSection.hidden = mode !== "tuning";
    R.waveSection.hidden = mode !== "wave";
    render();
  }
  function reset() {
    Object.assign(state, {inductanceMh:20,capacitanceUf:5,voltage:12,resistance:2,driveRatio:1,quality:8,waveLogFrequency:8,fieldAmplitude:30,direction:1,phase:0,running:false,guideStep:0});
    syncInputs();
    setMode("lc");
  }
  function syncInputs() {
    R.inductanceInput.value=state.inductanceMh;
    R.capacitanceInput.value=state.capacitanceUf;
    R.voltageInput.value=state.voltage;
    R.resistanceInput.value=state.resistance;
    R.driveRatioInput.value=state.driveRatio;
    R.qualityInput.value=state.quality;
    R.waveFrequencyInput.value=state.waveLogFrequency;
    R.fieldAmplitudeInput.value=state.fieldAmplitude;
    R.directionButtons.forEach((button)=>button.classList.toggle("is-active",Number(button.dataset.direction)===state.direction));
  }
  function bindRange(input, key) {
    input.addEventListener("input", () => { state[key]=Number(input.value); render(); });
  }
  bindRange(R.inductanceInput,"inductanceMh");
  bindRange(R.capacitanceInput,"capacitanceUf");
  bindRange(R.voltageInput,"voltage");
  bindRange(R.resistanceInput,"resistance");
  bindRange(R.driveRatioInput,"driveRatio");
  bindRange(R.qualityInput,"quality");
  bindRange(R.waveFrequencyInput,"waveLogFrequency");
  bindRange(R.fieldAmplitudeInput,"fieldAmplitude");
  R.phaseInput.addEventListener("input",()=>{state.phase=Number(R.phaseInput.value);state.running=false;render();});
  R.sceneTabs.forEach((tab)=>tab.addEventListener("click",()=>setMode(tab.dataset.mode)));
  R.directionButtons.forEach((button)=>button.addEventListener("click",()=>{state.direction=Number(button.dataset.direction);syncInputs();render();}));
  R.routeSteps.forEach((button,index)=>button.addEventListener("click",()=>{state.guideStep=index;R.routeSteps.forEach((item,i)=>item.classList.toggle("is-active",i===index));render();}));
  R.presets.forEach((button)=>button.addEventListener("click",()=>{
    if(button.dataset.preset==="charged"){setMode("lc");state.phase=0;}
    if(button.dataset.preset==="current"){setMode("energy");state.phase=.25;}
    if(button.dataset.preset==="resonance"){setMode("tuning");state.driveRatio=1;state.quality=12;}
    if(button.dataset.preset==="radio"){setMode("wave");state.waveLogFrequency=8;state.direction=1;}
    state.running=false;syncInputs();render();
  }));
  R.playButton.addEventListener("click",()=>{state.running=true;render();});
  R.pauseButton.addEventListener("click",()=>{state.running=false;render();});
  R.keyButton.addEventListener("click",()=>{state.phase=(Math.floor(state.phase*4+.001)+1)%4/4;state.running=false;render();});
  R.resetButton.addEventListener("click",reset);
  R.stepButton.addEventListener("click",()=>{state.guideStep=(state.guideStep+1)%guide.length;R.routeSteps.forEach((item,i)=>item.classList.toggle("is-active",i===state.guideStep));render();});
  R.guideButton.addEventListener("click",()=>R.guideDialog.showModal());
  R.focusButton.addEventListener("click",()=>{const active=document.body.classList.toggle("focus-mode");R.focusButton.setAttribute("aria-pressed",String(active));});
  R.fullscreenButton.addEventListener("click",()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.();});
  [[R.showChargeToggle,"showCharge"],[R.showFieldToggle,"showField"],[R.showEnergyToggle,"showEnergy"],[R.showScaleToggle,"showScale"]].forEach(([input,key])=>input.addEventListener("change",()=>{state[key]=input.checked;render();}));
  function pointerPhase(event) {
    const rect=R.canvas.getBoundingClientRect();
    state.phase=Math.max(0,Math.min(.999,(event.clientX-rect.left)/rect.width));
    state.running=false;render();
  }
  R.canvas.addEventListener("pointerdown",(event)=>{state.dragging=true;R.canvas.setPointerCapture?.(event.pointerId);pointerPhase(event);});
  R.canvas.addEventListener("pointermove",(event)=>{if(state.dragging)pointerPhase(event);});
  R.canvas.addEventListener("pointerup",()=>state.dragging=false);
  R.canvas.addEventListener("pointercancel",()=>state.dragging=false);
  window.addEventListener("resize",render);
  let previous=performance.now();
  function frame(now){
    const dt=Math.min(.05,(now-previous)/1000);previous=now;
    if(state.running){state.phase=(state.phase+dt*.18)%1;render();}
    requestAnimationFrame(frame);
  }
  syncInputs();
  setMode("lc");
  requestAnimationFrame(frame);
})();
