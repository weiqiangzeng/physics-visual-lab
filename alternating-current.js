(function () {
  const M = window.AlternatingCurrentModel;
  if (!M) throw new Error("AlternatingCurrentModel is required");
  const state = {
    mode: "generator",
    field: .8,
    generatorTurns: 200,
    areaCm2: 150,
    frequency: 50,
    peakVoltage: 220 * Math.sqrt(2),
    load: 100,
    primaryVoltage: 220,
    primaryTurns: 200,
    secondaryTurns: 1000,
    transformerLoad: 440,
    sentPowerMW: 1,
    transmissionVoltageKV: 10,
    lineResistance: 20,
    phase: 0,
    running: false,
    guideStep: 0,
    showField: true,
    showFlow: true,
    showRms: true,
    showLedger: true,
    dragging: false,
  };
  const $ = (id) => document.getElementById(id);
  const R = {
    canvas: $("acCanvas"),
    waveChart: $("waveChart"),
    powerChart: $("powerChart"),
    sceneTabs: [...document.querySelectorAll(".scene-tab[data-mode]")],
    routeSteps: [...document.querySelectorAll(".route-step")],
    presets: [...document.querySelectorAll("[data-preset]")],
    generatorSection: $("generatorSection"),
    waveSection: $("waveSection"),
    transformerSection: $("transformerSection"),
    transmissionSection: $("transmissionSection"),
    peakVoltageRow: $("peakVoltageRow"),
    generalLoadRow: $("generalLoadRow"),
    fieldInput: $("fieldInput"),
    generatorTurnsInput: $("generatorTurnsInput"),
    areaInput: $("areaInput"),
    frequencyInput: $("frequencyInput"),
    peakVoltageInput: $("peakVoltageInput"),
    loadInput: $("loadInput"),
    primaryVoltageInput: $("primaryVoltageInput"),
    primaryTurnsInput: $("primaryTurnsInput"),
    secondaryTurnsInput: $("secondaryTurnsInput"),
    transformerLoadInput: $("transformerLoadInput"),
    sentPowerInput: $("sentPowerInput"),
    transmissionVoltageInput: $("transmissionVoltageInput"),
    lineResistanceInput: $("lineResistanceInput"),
    phaseInput: $("phaseInput"),
    fieldValue: $("fieldValue"),
    generatorTurnsValue: $("generatorTurnsValue"),
    areaValue: $("areaValue"),
    frequencyValue: $("frequencyValue"),
    peakVoltageValue: $("peakVoltageValue"),
    loadValue: $("loadValue"),
    primaryVoltageValue: $("primaryVoltageValue"),
    primaryTurnsValue: $("primaryTurnsValue"),
    secondaryTurnsValue: $("secondaryTurnsValue"),
    transformerLoadValue: $("transformerLoadValue"),
    sentPowerValue: $("sentPowerValue"),
    transmissionVoltageValue: $("transmissionVoltageValue"),
    lineResistanceValue: $("lineResistanceValue"),
    playbackValue: $("playbackValue"),
    modeTitle: $("modeTitle"),
    modeGoal: $("modeGoal"),
    stateBadge: $("stateBadge"),
    stageHint: $("stageHint"),
    metricLabels: [1, 2, 3, 4, 5, 6].map((n) => $("metric" + n + "Label")),
    metrics: [1, 2, 3, 4, 5, 6].map((n) => $("metric" + n)),
    acNature: $("acNature"),
    acExplanation: $("acExplanation"),
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
    showFieldToggle: $("showFieldToggle"),
    showFlowToggle: $("showFlowToggle"),
    showRmsToggle: $("showRmsToggle"),
    showLedgerToggle: $("showLedgerToggle"),
  };
  const ctx = R.canvas.getContext("2d"),
    wctx = R.waveChart.getContext("2d"),
    pctx = R.powerChart.getContext("2d");
  const C = {
    bg: "#090d0f",
    grid: "rgba(223,229,223,.055)",
    cyan: "#67c6d8",
    green: "#7bd898",
    amber: "#f0b84d",
    red: "#ff776c",
    violet: "#b79ae6",
    white: "#dfe5df",
    muted: "#84908a",
  };
  const modes = {
    generator: {
      title: "交流发电机",
      goal: "线圈匀速转动，使磁通量与电动势相差四分之一周期",
      hint: "拖动线圈相位，对照磁通量和电动势波形",
    },
    rms: {
      title: "交变电流有效值",
      goal: "用相同电阻上的相同平均热功率定义有效值",
      hint: "比较瞬时值、周期平均值与平方平均值",
    },
    transformer: {
      title: "理想变压器",
      goal: "匝数比决定电压比，功率守恒同时约束电流比",
      hint: "改变副线圈匝数，并把频率降到零比较直流",
    },
    transmission: {
      title: "远距离输电",
      goal: "固定输送功率，提高电压使线路电流和 I²R 损耗下降",
      hint: "从 10 kV 扫描到 500 kV，比较线损比例",
    },
  };
  const guide = [
    ["先追踪瞬时量", "磁通量最大时，为什么感应电动势反而为零？"],
    ["再核对周期平均", "正弦电压平均值为零，为什么电阻仍持续发热？"],
    ["最后做功率账本", "变压与输电过程中，输入功率最终分配到哪里？"],
  ];
  function fmt(value, digits = 2) {
    return Number(value).toFixed(digits);
  }
  function powerText(value) {
    const amount = Math.abs(value);
    if (amount >= 1e6) return fmt(value / 1e6, 2) + " MW";
    if (amount >= 1e3) return fmt(value / 1e3, 2) + " kW";
    return fmt(value, 2) + " W";
  }
  function size(canvas, context) {
    const rect = canvas.getBoundingClientRect(),
      ratio = Math.min(devicePixelRatio || 1, 2),
      width = Math.max(300, Math.round(rect.width)),
      height = Math.max(170, Math.round(rect.height));
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
  function text(
    context,
    value,
    x,
    y,
    color = C.white,
    font = "10px ui-monospace,monospace",
    align = "left",
  ) {
    context.fillStyle = color;
    context.font = font;
    context.textAlign = align;
    context.fillText(value, x, y);
  }
  function arrow(context, x1, y1, x2, y2, color, label = "") {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    context.save();
    context.strokeStyle = context.fillStyle = color;
    context.lineWidth = 2.4;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
    context.beginPath();
    context.moveTo(x2, y2);
    context.lineTo(
      x2 - 8 * Math.cos(angle - .48),
      y2 - 8 * Math.sin(angle - .48),
    );
    context.lineTo(
      x2 - 8 * Math.cos(angle + .48),
      y2 - 8 * Math.sin(angle + .48),
    );
    context.fill();
    if (label) {
      text(
        context,
        label,
        x2 + 5,
        y2 - 5,
        color,
        "700 10px ui-monospace,monospace",
      );
    }
    context.restore();
  }
  function current() {
    const time = state.frequency > 0 ? state.phase / state.frequency : 0;
    return {
      generator: M.generator({
        magneticFieldT: state.field,
        turns: state.generatorTurns,
        areaM2: state.areaCm2 / 1e4,
        frequencyHz: state.frequency,
        timeS: time,
        loadResistanceOhm: state.load,
      }),
      rms: M.sineRms({
        peakVoltageV: state.peakVoltage,
        frequencyHz: Math.max(.1, state.frequency),
        timeS: state.phase / Math.max(.1, state.frequency),
        resistanceOhm: state.load,
      }),
      transformer: M.idealTransformer({
        primaryRmsV: state.primaryVoltage,
        primaryTurns: state.primaryTurns,
        secondaryTurns: state.secondaryTurns,
        loadResistanceOhm: state.transformerLoad,
        frequencyHz: state.frequency,
      }),
      transmission: M.transmission({
        sentPowerW: state.sentPowerMW * 1e6,
        transmissionVoltageV: state.transmissionVoltageKV * 1e3,
        lineResistanceOhm: state.lineResistance,
      }),
    };
  }
  function describe(q) {
    if (state.mode === "rms") {
      const s = q.rms;
      return {
        badge: `u=${fmt(s.instantaneousVoltageV, 1)} V`,
        cls: "is-safe",
        labels: [
          "瞬时电压 u",
          "峰值 Uₘ",
          "有效值 U",
          "周期平均电压",
          "瞬时功率",
          "平均热功率",
        ],
        values: [
          fmt(s.instantaneousVoltageV, 2) + " V",
          fmt(s.peakVoltageV, 2) + " V",
          fmt(s.rmsVoltageV, 2) + " V",
          "0.00 V",
          powerText(s.instantaneousPowerW),
          powerText(s.averagePowerW),
        ],
        nature: "有效值等于产生相同平均热功率的直流电压",
        explanation: `U=Uₘ/√2=${
          fmt(s.rmsVoltageV, 2)
        } V，不等于一个周期的平均电压`,
        formula: `U=Uₘ/√2=${fmt(s.rmsVoltageV, 2)} V`,
      };
    }
    if (state.mode === "transformer") {
      const s = q.transformer,
        up = s.turnsRatio > 1.0001,
        down = s.turnsRatio < .9999;
      return {
        badge: s.active
          ? `${up ? "升压" : down ? "降压" : "等压"} · ${fmt(s.turnsRatio, 2)}×`
          : "直流 · 无持续输出",
        cls: s.active ? "is-transform" : "is-warning",
        labels: [
          "原边有效电压 U₁",
          "副边有效电压 U₂",
          "原边有效电流 I₁",
          "副边有效电流 I₂",
          "匝数比 N₂/N₁",
          "输出功率",
        ],
        values: [
          fmt(s.primaryRmsV, 2) + " V",
          fmt(s.secondaryRmsV, 2) + " V",
          fmt(s.primaryRmsA, 3) + " A",
          fmt(s.secondaryRmsA, 3) + " A",
          fmt(s.turnsRatio, 3),
          powerText(s.outputPowerW),
        ],
        nature: s.active
          ? "电压按匝数比改变，电流按反比改变"
          : "稳恒直流不产生持续变化的磁通量",
        explanation: s.active
          ? `理想模型 Pin−Pout=${fmt(s.powerResidualW, 6)} W`
          : "接通瞬间的暂态不属于本稳态模型",
        formula: s.active
          ? `U₂/U₁=N₂/N₁=${fmt(s.turnsRatio, 3)}`
          : "f=0 → U₂=0（稳态）",
      };
    }
    if (state.mode === "transmission") {
      const s = q.transmission, impossible = s.lineLossW >= s.sentPowerW;
      return {
        badge: impossible
          ? "方案不可行"
          : `效率 ${fmt(s.efficiency * 100, 2)}%`,
        cls: impossible
          ? "is-loss"
          : s.lossFraction > .05
          ? "is-warning"
          : "is-safe",
        labels: [
          "输电电压 U",
          "线路电流 I",
          "线路压降 ΔU",
          "线路损耗 P损",
          "到达用户 P出",
          "输电效率 η",
        ],
        values: [
          fmt(s.transmissionVoltageV / 1e3, 1) + " kV",
          fmt(s.lineCurrentA, 3) + " A",
          fmt(s.voltageDropV / 1e3, 3) + " kV",
          powerText(s.lineLossW),
          powerText(s.deliveredPowerW),
          fmt(s.efficiency * 100, 3) + "%",
        ],
        nature: impossible
          ? "线路损耗已超过给定输送功率"
          : "升高电压使电流和 I²R 损耗同时下降",
        explanation: `固定 P=${fmt(s.sentPowerW / 1e6, 2)} MW，I=P/U`,
        formula: `P损=I²R=${powerText(s.lineLossW)}`,
      };
    }
    const s = q.generator, nearFluxPeak = Math.abs(Math.sin(s.phaseRad)) < .08;
    return {
      badge: nearFluxPeak ? "磁通极值 · e≈0" : `e=${fmt(s.emfV, 1)} V`,
      cls: "is-safe",
      labels: [
        "线圈相位",
        "磁通链 NΦ",
        "瞬时电动势 e",
        "峰值 Eₘ",
        "有效值 E",
        "平均输出功率",
      ],
      values: [
        fmt((state.phase % 1) * 360, 1) + "°",
        fmt(s.fluxLinkageWbTurn, 4) + " Wb·匝",
        fmt(s.emfV, 2) + " V",
        fmt(s.emfPeakV, 2) + " V",
        fmt(s.emfRmsV, 2) + " V",
        powerText(s.averagePowerW),
      ],
      nature: nearFluxPeak
        ? "磁通量处于极值，变化率和电动势接近零"
        : "线圈转动正在产生瞬时感应电动势",
      explanation: `Eₘ=NBAω=${fmt(s.emfPeakV, 2)} V，频率和峰值都随转速增加`,
      formula: `e=NBAωsinωt=${fmt(s.emfV, 2)} V`,
    };
  }
  function drawGenerator(q, width, height) {
    const s = q.generator,
      cx = width * .46,
      cy = height * .48,
      theta = state.phase * Math.PI * 2,
      loadY = Math.min(cy + 145, height - 38),
      ringY = loadY - 43;
    if (state.showField) {
      for (let y = cy - 100; y <= cy + 100; y += 40) {
        arrow(
          ctx,
          cx - 180,
          y,
          cx + 180,
          y,
          "rgba(255,119,108,.28)",
          y === cy - 100 ? "B" : "",
        );
      }
    }
    const projected = 15 + 105 * Math.abs(Math.cos(theta));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(theta) * .22);
    ctx.fillStyle = "rgba(183,154,230,.12)";
    if (state.showField) {
      ctx.beginPath();
      ctx.ellipse(0, 0, projected, 72, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = C.amber;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(0, 0, projected, 72, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    arrow(
      ctx,
      cx,
      cy,
      cx + Math.cos(theta) * 100,
      cy - Math.sin(theta) * 48,
      C.violet,
      "n",
    );
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 85);
    ctx.lineTo(cx, cy + 85);
    ctx.stroke();
    for (const dx of [-22, 22]) {
      ctx.strokeStyle = C.cyan;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx + dx, ringY, 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = C.white;
    ctx.beginPath();
    ctx.moveTo(cx - 34, ringY);
    ctx.lineTo(cx - 100, ringY);
    ctx.lineTo(cx - 100, loadY);
    ctx.lineTo(cx + 100, loadY);
    ctx.lineTo(cx + 100, ringY);
    ctx.lineTo(cx + 34, ringY);
    ctx.stroke();
    const glow = Math.min(1, Math.abs(s.emfV) / Math.max(1, s.emfPeakV));
    ctx.fillStyle = `rgba(240,184,77,${.15 + .75 * glow})`;
    ctx.beginPath();
    ctx.arc(cx, loadY, 14, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, `NΦ=${fmt(s.fluxLinkageWbTurn, 3)} Wb·匝`, 18, 24, C.violet);
    text(
      ctx,
      `e=${fmt(s.emfV, 1)} V`,
      width - 18,
      24,
      C.amber,
      "700 11px ui-monospace,monospace",
      "right",
    );
  }
  function drawRms(q, width, height) {
    const s = q.rms, mid = width * .5, top = 54;
    text(
      ctx,
      "同一电阻 · 相同观察时间",
      mid,
      25,
      C.muted,
      "10px ui-monospace,monospace",
      "center",
    );
    for (const side of [-1, 1]) {
      const x = mid + side * width * .23;
      ctx.strokeStyle = side < 0 ? C.cyan : C.amber;
      ctx.lineWidth = 4;
      ctx.strokeRect(x - 70, top + 70, 140, 62);
      text(
        ctx,
        side < 0 ? "正弦交流" : "等效直流",
        x,
        top,
        side < 0 ? C.cyan : C.amber,
        "700 12px sans-serif",
        "center",
      );
      const heat = Math.min(1, s.averagePowerW / 1500);
      ctx.fillStyle = `rgba(255,119,108,${.12 + heat * .6})`;
      ctx.fillRect(x - 66, top + 74, 132, 54);
      text(
        ctx,
        `P̄=${powerText(s.averagePowerW)}`,
        x,
        top + 105,
        C.white,
        "10px ui-monospace,monospace",
        "center",
      );
    }
    if (state.showRms) {
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = C.green;
      ctx.beginPath();
      ctx.moveTo(50, height - 82);
      ctx.lineTo(width - 50, height - 82);
      ctx.stroke();
      ctx.setLineDash([]);
      text(
        ctx,
        `U有效=${fmt(s.rmsVoltageV, 2)} V`,
        mid,
        height - 91,
        C.green,
        "700 10px ui-monospace,monospace",
        "center",
      );
    }
    const x0 = 50, y0 = height - 45, span = width - 100, amp = 28;
    ctx.strokeStyle = C.cyan;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 160; i++) {
      const x = x0 + span * i / 160,
        y = y0 - amp * Math.sin(i / 160 * Math.PI * 4);
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    const cursor = x0 + span * (state.phase % 1);
    ctx.fillStyle = C.amber;
    ctx.beginPath();
    ctx.arc(
      cursor,
      y0 - amp * Math.sin(state.phase * Math.PI * 2),
      5,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  function coil(context, x, y, turns, color) {
    const count = Math.max(5, Math.min(24, Math.round(turns / 70)));
    context.strokeStyle = color;
    context.lineWidth = 2.5;
    for (let i = 0; i < count; i++) {
      const yy = y - 82 + 164 * i / Math.max(1, count - 1);
      context.beginPath();
      context.ellipse(x, yy, 16, 8, 0, 0, Math.PI * 2);
      context.stroke();
    }
  }
  function drawTransformer(q, width, height) {
    const s = q.transformer, cx = width * .48, cy = height * .5;
    ctx.strokeStyle = "#56615a";
    ctx.lineWidth = 24;
    ctx.strokeRect(cx - 125, cy - 105, 250, 210);
    coil(ctx, cx - 125, cy, state.primaryTurns, C.amber);
    coil(ctx, cx + 125, cy, state.secondaryTurns, C.violet);
    if (state.showField && s.active) {
      ctx.strokeStyle = C.cyan;
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 6]);
      ctx.strokeRect(cx - 95, cy - 75, 190, 150);
      ctx.setLineDash([]);
      for (let i = 0; i < 6; i++) {
        const a = (state.phase + i / 6) % 1, perimeter = 680 * a;
        let x, y;
        if (perimeter < 190) {
          x = cx - 95 + perimeter;
          y = cy - 75;
        } else if (perimeter < 340) {
          x = cx + 95;
          y = cy - 75 + perimeter - 190;
        } else if (perimeter < 530) {
          x = cx + 95 - (perimeter - 340);
          y = cy + 75;
        } else {
          x = cx - 95;
          y = cy + 75 - (perimeter - 530);
        }
        ctx.fillStyle = C.cyan;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    text(
      ctx,
      `N₁=${state.primaryTurns}`,
      cx - 125,
      cy + 128,
      C.amber,
      "10px ui-monospace,monospace",
      "center",
    );
    text(
      ctx,
      `N₂=${state.secondaryTurns}`,
      cx + 125,
      cy + 128,
      C.violet,
      "10px ui-monospace,monospace",
      "center",
    );
    text(
      ctx,
      `${fmt(s.primaryRmsV, 1)} V`,
      cx - 190,
      cy,
      C.amber,
      "700 11px ui-monospace,monospace",
      "center",
    );
    text(
      ctx,
      `${fmt(s.secondaryRmsV, 1)} V`,
      cx + 190,
      cy,
      C.violet,
      "700 11px ui-monospace,monospace",
      "center",
    );
    if (state.showFlow && s.active) {
      arrow(
        ctx,
        cx - 70,
        cy - 125,
        cx + 70,
        cy - 125,
        C.green,
        `P=${powerText(s.outputPowerW)}`,
      );
    }
    if (!s.active) {
      text(
        ctx,
        "f=0 · 稳态磁通不变 · 无持续副边电压",
        cx,
        28,
        C.red,
        "700 11px sans-serif",
        "center",
      );
    }
  }
  function drawTransmission(q, width, height) {
    const s = q.transmission,
      y = height * .53,
      narrow = width < 500,
      left = narrow ? 42 : 65,
      right = width - left,
      transformerOffset = narrow ? 68 : 95,
      firstTransformer = left + transformerOffset,
      secondTransformer = right - transformerOffset,
      lineStart = firstTransformer + 52,
      lineEnd = secondTransformer - 52;
    text(ctx, "发电端", left, 28, C.amber, "700 11px sans-serif", "center");
    text(ctx, "用户端", right, 28, C.green, "700 11px sans-serif", "center");
    ctx.strokeStyle = C.amber;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(left, y, 28, 0, Math.PI * 2);
    ctx.stroke();
    text(ctx, "G", left, y + 5, C.amber, "700 14px sans-serif", "center");
    for (const x of [firstTransformer, secondTransformer]) {
      ctx.strokeStyle = "#56615a";
      ctx.lineWidth = 10;
      ctx.strokeRect(x - 24, y - 58, 48, 116);
      coil(ctx, x - 24, y, 120, C.amber);
      coil(ctx, x + 24, y, 600, C.violet);
    }
    const loss = Math.min(1, s.lossFraction * 4);
    ctx.strokeStyle = `rgba(255,119,108,${.25 + loss * .7})`;
    ctx.lineWidth = 5 + loss * 6;
    ctx.beginPath();
    ctx.moveTo(lineStart, y - 22);
    ctx.lineTo(lineEnd, y - 22);
    ctx.moveTo(lineStart, y + 22);
    ctx.lineTo(lineEnd, y + 22);
    ctx.stroke();
    for (let i = 0; i < 9; i++) {
      const x = lineStart + (lineEnd - lineStart) * i / 8,
        offset = ((state.phase + i / 9) % 1 - .5) * 12;
      ctx.fillStyle = C.cyan;
      ctx.beginPath();
      ctx.arc(x + offset, y - 22, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = C.green;
    ctx.fillRect(right - 26, y - 35, 52, 70);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = "#101412";
      ctx.fillRect(
        right - 18 + i % 3 * 15,
        y - 24 + Math.floor(i / 3) * 28,
        8,
        13,
      );
    }
    text(
      ctx,
      `${fmt(s.transmissionVoltageV / 1e3, 0)} kV · ${
        fmt(s.lineCurrentA, 2)
      } A`,
      width / 2,
      y - 52,
      C.cyan,
      "700 11px ui-monospace,monospace",
      "center",
    );
    text(
      ctx,
      `线路发热 ${powerText(s.lineLossW)}`,
      width / 2,
      y + 70,
      s.lossFraction > .05 ? C.red : C.green,
      "700 11px ui-monospace,monospace",
      "center",
    );
  }
  function drawScene(q) {
    const { width, height } = size(R.canvas, ctx);
    grid(ctx, width, height);
    if (state.mode === "generator") drawGenerator(q, width, height);
    else if (state.mode === "rms") drawRms(q, width, height);
    else if (state.mode === "transformer") drawTransformer(q, width, height);
    else drawTransmission(q, width, height);
    text(
      ctx,
      state.mode === "transmission"
        ? "能量流动画按教学速度显示"
        : "相位动画按教学速度显示，不对应实际 50 Hz 闪动",
      14,
      height - 13,
      C.muted,
    );
  }
  function chartAxes(
    context,
    width,
    height,
    xmin = 0,
    xmax = 1,
    ymin = -1.1,
    ymax = 1.1,
  ) {
    const p = { l: 42, r: 14, t: 18, b: 28 },
      pw = width - p.l - p.r,
      ph = height - p.t - p.b;
    context.strokeStyle = "rgba(223,229,223,.14)";
    context.strokeRect(p.l, p.t, pw, ph);
    context.strokeStyle = "rgba(223,229,223,.06)";
    for (let i = 1; i < 4; i++) {
      const x = p.l + pw * i / 4, y = p.t + ph * i / 4;
      context.beginPath();
      context.moveTo(x, p.t);
      context.lineTo(x, height - p.b);
      context.moveTo(p.l, y);
      context.lineTo(width - p.r, y);
      context.stroke();
    }
    return {
      x: (v) => p.l + (v - xmin) / (xmax - xmin) * pw,
      y: (v) => p.t + (ymax - v) / (ymax - ymin) * ph,
      p,
    };
  }
  function linePlot(context, points, map, key, color, dash = []) {
    context.save();
    context.strokeStyle = color;
    context.lineWidth = 2.2;
    context.setLineDash(dash);
    context.beginPath();
    points.forEach((point, index) => {
      const x = map.x(point.x), y = map.y(point[key]);
      if (index) context.lineTo(x, y);
      else context.moveTo(x, y);
    });
    context.stroke();
    context.restore();
  }
  function drawWave(q) {
    const { width, height } = size(R.waveChart, wctx);
    grid(wctx, width, height);
    if (state.mode === "transmission") {
      const samples = M.voltageComparison({
          sentPowerW: state.sentPowerMW * 1e6,
          lineResistanceOhm: state.lineResistance,
        }, Array.from({ length: 100 }, (_, i) => (10 + i * 4.9) * 1e3)),
        maxLoss = Math.max(...samples.map((s) => s.lineLossW)),
        map = chartAxes(wctx, width, height, 10, 500, 0, 1.05),
        points = samples.map((s) => ({
          x: s.transmissionVoltageV / 1e3,
          loss: s.lineLossW / maxLoss,
          current: s.lineCurrentA / samples[0].lineCurrentA,
        }));
      linePlot(wctx, points, map, "loss", C.red);
      linePlot(wctx, points, map, "current", C.cyan, [5, 4]);
      const x = map.x(state.transmissionVoltageKV);
      wctx.strokeStyle = C.amber;
      wctx.beginPath();
      wctx.moveTo(x, map.p.t);
      wctx.lineTo(x, height - map.p.b);
      wctx.stroke();
      text(wctx, "红: P损 / 蓝: I（归一化）", map.p.l + 4, 12, C.muted);
      return;
    }
    const map = chartAxes(wctx, width, height),
      points = Array.from({ length: 161 }, (_, i) => {
        const x = i / 160, angle = x * Math.PI * 2;
        return state.mode === "generator"
          ? { x, first: Math.cos(angle), second: Math.sin(angle) }
          : state.mode === "rms"
          ? { x, first: Math.sin(angle), second: Math.sin(angle) ** 2 }
          : { x, first: Math.sin(angle), second: Math.sin(angle) };
      });
    linePlot(
      wctx,
      points,
      map,
      "first",
      state.mode === "transformer" ? C.amber : C.violet,
    );
    linePlot(
      wctx,
      points,
      map,
      "second",
      state.mode === "transformer" ? C.violet : C.cyan,
    );
    const cursor = map.x(state.phase % 1);
    wctx.strokeStyle = C.amber;
    wctx.setLineDash([4, 4]);
    wctx.beginPath();
    wctx.moveTo(cursor, map.p.t);
    wctx.lineTo(cursor, height - map.p.b);
    wctx.stroke();
    wctx.setLineDash([]);
    text(
      wctx,
      state.mode === "generator"
        ? "紫: NΦ / 蓝: e"
        : state.mode === "rms"
        ? "紫: u / 蓝: p∝u²"
        : "黄: u₁ / 紫: u₂（归一化）",
      map.p.l + 4,
      12,
      C.muted,
    );
  }
  function drawBars(context, width, height, bars) {
    const max = Math.max(1, ...bars.map((bar) => Math.abs(bar[1]))),
      zero = height * .72,
      slot = (width - 70) / bars.length,
      barWidth = Math.min(58, slot * .52);
    context.strokeStyle = "rgba(223,229,223,.18)";
    context.beginPath();
    context.moveTo(20, zero);
    context.lineTo(width - 20, zero);
    context.stroke();
    bars.forEach((bar, index) => {
      const x = 38 + index * slot,
        barHeight = Math.abs(bar[1]) / max * height * .48;
      context.fillStyle = bar[2];
      context.fillRect(x, zero - barHeight, barWidth, barHeight);
      text(
        context,
        bar[0],
        x,
        zero - barHeight - 6,
        C.white,
        "9px ui-monospace,monospace",
      );
      text(
        context,
        bar[3],
        x,
        zero + 14,
        C.muted,
        "8px ui-monospace,monospace",
      );
    });
  }
  function drawPower(q) {
    const { width, height } = size(R.powerChart, pctx);
    grid(pctx, width, height);
    let bars;
    if (state.mode === "rms") {
      const s = q.rms;
      bars = [
        [
          "p瞬时",
          s.instantaneousPowerW,
          C.cyan,
          powerText(s.instantaneousPowerW),
        ],
        ["P平均", s.averagePowerW, C.green, powerText(s.averagePowerW)],
        ["P直流", s.averagePowerW, C.amber, powerText(s.averagePowerW)],
      ];
    } else if (state.mode === "transformer") {
      const s = q.transformer;
      bars = [["P输入", s.inputPowerW, C.amber, powerText(s.inputPowerW)], [
        "P输出",
        s.outputPowerW,
        C.violet,
        powerText(s.outputPowerW),
      ], ["P损", 0, C.red, "0 W"]];
    } else if (state.mode === "transmission") {
      const s = q.transmission;
      bars = [["P送", s.sentPowerW, C.amber, powerText(s.sentPowerW)], [
        "P到达",
        s.deliveredPowerW,
        C.green,
        powerText(s.deliveredPowerW),
      ], [
        "P线损",
        Math.min(s.sentPowerW, s.lineLossW),
        C.red,
        powerText(s.lineLossW),
      ]];
    } else {
      const s = q.generator;
      bars = [
        [
          "p瞬时",
          s.instantaneousPowerW,
          C.cyan,
          powerText(s.instantaneousPowerW),
        ],
        ["P平均", s.averagePowerW, C.green, powerText(s.averagePowerW)],
        ["Eₘ²/2R", s.averagePowerW, C.amber, powerText(s.averagePowerW)],
      ];
    }
    drawBars(pctx, width, height, bars);
  }
  function progress(input) {
    const value = (+input.value - +input.min) / (+input.max - +input.min) * 100;
    input.style.setProperty("--range-progress", value + "%");
  }
  function syncInputs() {
    const values = {
      fieldInput: state.field,
      generatorTurnsInput: state.generatorTurns,
      areaInput: state.areaCm2,
      frequencyInput: state.frequency,
      peakVoltageInput: state.peakVoltage,
      loadInput: state.load,
      primaryVoltageInput: state.primaryVoltage,
      primaryTurnsInput: state.primaryTurns,
      secondaryTurnsInput: state.secondaryTurns,
      transformerLoadInput: state.transformerLoad,
      sentPowerInput: state.sentPowerMW,
      transmissionVoltageInput: state.transmissionVoltageKV,
      lineResistanceInput: state.lineResistance,
      phaseInput: state.phase,
    };
    Object.entries(values).forEach(([name, value]) => R[name].value = value);
  }
  function render() {
    const q = current(),
      description = describe(q),
      mode = modes[state.mode],
      step = guide[state.guideStep];
    R.fieldValue.textContent = fmt(state.field, 2) + " T";
    R.generatorTurnsValue.textContent = fmt(state.generatorTurns, 0);
    R.areaValue.textContent = fmt(state.areaCm2, 0) + " cm²";
    R.frequencyValue.textContent = fmt(state.frequency, 1) + " Hz";
    R.peakVoltageValue.textContent = fmt(state.peakVoltage, 1) + " V";
    R.loadValue.textContent = fmt(state.load, 0) + " Ω";
    R.primaryVoltageValue.textContent = fmt(state.primaryVoltage, 0) + " V";
    R.primaryTurnsValue.textContent = fmt(state.primaryTurns, 0);
    R.secondaryTurnsValue.textContent = fmt(state.secondaryTurns, 0);
    R.transformerLoadValue.textContent = fmt(state.transformerLoad, 0) + " Ω";
    R.sentPowerValue.textContent = fmt(state.sentPowerMW, 2) + " MW";
    R.transmissionVoltageValue.textContent =
      fmt(state.transmissionVoltageKV, 0) + " kV";
    R.lineResistanceValue.textContent = fmt(state.lineResistance, 1) + " Ω";
    R.playbackValue.textContent = (state.running ? "运行中" : "已暂停") +
      (state.mode === "transmission"
        ? ` · 能量流 ${fmt(state.phase * 100, 0)}%`
        : ` · ${fmt(state.phase * 360, 0)}°`);
    R.modeTitle.textContent = mode.title;
    R.modeGoal.textContent = mode.goal;
    R.stageHint.textContent = mode.hint;
    R.stateBadge.textContent = description.badge;
    R.stateBadge.className = "state-badge " + description.cls;
    description.labels.forEach((label, index) =>
      R.metricLabels[index].textContent = label
    );
    description.values.forEach((value, index) =>
      R.metrics[index].textContent = value
    );
    R.acNature.textContent = description.nature;
    R.acExplanation.textContent = description.explanation;
    R.formulaReadout.textContent = description.formula;
    R.waveTitle.textContent = state.mode === "generator"
      ? "磁通量与电动势"
      : state.mode === "rms"
      ? "电压与瞬时功率"
      : state.mode === "transformer"
      ? "原副边电压波形"
      : "电流与线损-电压";
    R.waveStatus.textContent = state.mode === "generator"
      ? "相差 1/4 周期"
      : state.mode === "rms"
      ? "p∝u²，始终非负"
      : state.mode === "transformer"
      ? "同频率 · 幅值按匝数比"
      : "固定 P，I∝1/U";
    R.ledgerTitle.textContent = state.mode === "transmission"
      ? "输电功率分配"
      : "瞬时与平均功率";
    R.ledgerStatus.textContent = state.mode === "transmission"
      ? "P送=P到达+P损"
      : state.mode === "transformer"
      ? "P₁=P₂（理想）"
      : "P平均=U²/R";
    R.stepIndex.textContent = "0" + (state.guideStep + 1);
    R.stepTitle.textContent = step[0];
    R.stepPrompt.textContent = step[1];
    R.generatorSection.hidden = state.mode !== "generator";
    R.waveSection.hidden = state.mode === "transmission";
    R.transformerSection.hidden = state.mode !== "transformer";
    R.transmissionSection.hidden = state.mode !== "transmission";
    R.peakVoltageRow.hidden = state.mode !== "rms";
    R.generalLoadRow.hidden = state.mode === "transformer";
    R.frequencyInput.min = state.mode === "transformer" ? "0" : "10";
    R.frequencyInput.max = state.mode === "transformer" ? "60" : "100";
    R.frequencyInput.step = state.mode === "transformer" ? "10" : "1";
    R.keyButton.textContent = state.mode === "transmission"
      ? "◎ 高压方案"
      : state.mode === "transformer"
      ? "◎ 额定状态"
      : "◎ 峰值";
    R.sceneTabs.forEach((button) =>
      button.classList.toggle("is-active", button.dataset.mode === state.mode)
    );
    R.routeSteps.forEach((button, index) =>
      button.classList.toggle("is-active", index === state.guideStep)
    );
    [
      R.fieldInput,
      R.generatorTurnsInput,
      R.areaInput,
      R.frequencyInput,
      R.peakVoltageInput,
      R.loadInput,
      R.primaryVoltageInput,
      R.primaryTurnsInput,
      R.secondaryTurnsInput,
      R.transformerLoadInput,
      R.sentPowerInput,
      R.transmissionVoltageInput,
      R.lineResistanceInput,
      R.phaseInput,
    ].forEach(progress);
    drawScene(q);
    drawWave(q);
    drawPower(q);
  }
  function setMode(mode) {
    state.mode = mode;
    state.running = false;
    state.phase = 0;
    if (mode === "generator") {
      Object.assign(state, {
        field: .8,
        generatorTurns: 200,
        areaCm2: 150,
        frequency: 50,
        load: 100,
      });
    } else if (mode === "rms") {
      Object.assign(state, {
        peakVoltage: 220 * Math.sqrt(2),
        frequency: 50,
        load: 100,
      });
    } else if (mode === "transformer") {
      Object.assign(state, {
        primaryVoltage: 220,
        primaryTurns: 200,
        secondaryTurns: 1000,
        transformerLoad: 440,
        frequency: 50,
      });
    } else {Object.assign(state, {
        sentPowerMW: 1,
        transmissionVoltageKV: 10,
        lineResistance: 20,
      });}
    syncInputs();
    render();
  }
  const bindings = [
    [R.fieldInput, "field"],
    [R.generatorTurnsInput, "generatorTurns"],
    [R.areaInput, "areaCm2"],
    [R.frequencyInput, "frequency"],
    [R.peakVoltageInput, "peakVoltage"],
    [R.loadInput, "load"],
    [R.primaryVoltageInput, "primaryVoltage"],
    [R.primaryTurnsInput, "primaryTurns"],
    [R.secondaryTurnsInput, "secondaryTurns"],
    [R.transformerLoadInput, "transformerLoad"],
    [R.sentPowerInput, "sentPowerMW"],
    [R.transmissionVoltageInput, "transmissionVoltageKV"],
    [R.lineResistanceInput, "lineResistance"],
    [R.phaseInput, "phase"],
  ];
  bindings.forEach(([input, key]) =>
    input.addEventListener("input", () => {
      state[key] = Number(input.value);
      state.running = false;
      render();
    })
  );
  R.sceneTabs.forEach((button) =>
    button.addEventListener("click", () => setMode(button.dataset.mode))
  );
  R.routeSteps.forEach((button, index) =>
    button.addEventListener("click", () => {
      state.guideStep = index;
      render();
    })
  );
  R.presets.forEach((button) =>
    button.addEventListener("click", () => {
      const preset = button.dataset.preset;
      if (preset === "peak") {
        if (state.mode === "transmission") setMode("generator");
        state.phase = .25;
      } else if (preset === "mains") {
        setMode("rms");
        state.peakVoltage = 220 * Math.sqrt(2);
      } else if (preset === "stepup") setMode("transformer");
      else {
        setMode("transmission");
        state.transmissionVoltageKV = 200;
      }
      syncInputs();
      render();
    })
  );
  R.playButton.addEventListener("click", () => {
    state.running = true;
    render();
  });
  R.pauseButton.addEventListener("click", () => {
    state.running = false;
    render();
  });
  R.keyButton.addEventListener("click", () => {
    if (state.mode === "transmission") state.transmissionVoltageKV = 200;
    else if (state.mode === "transformer") {
      Object.assign(state, {
        primaryVoltage: 220,
        primaryTurns: 200,
        secondaryTurns: 1000,
        transformerLoad: 440,
        frequency: 50,
      });
    } else state.phase = .25;
    state.running = false;
    syncInputs();
    render();
  });
  R.resetButton.addEventListener("click", () => {
    state.guideStep = 0;
    [R.showFieldToggle, R.showFlowToggle, R.showRmsToggle, R.showLedgerToggle]
      .forEach((input) => input.checked = true);
    Object.assign(state, {
      showField: true,
      showFlow: true,
      showRms: true,
      showLedger: true,
    });
    setMode("generator");
  });
  [[R.showFieldToggle, "showField"], [R.showFlowToggle, "showFlow"], [
    R.showRmsToggle,
    "showRms",
  ], [R.showLedgerToggle, "showLedger"]].forEach(([input, key]) =>
    input.addEventListener("change", () => {
      state[key] = input.checked;
      render();
    })
  );
  R.guideButton.addEventListener("click", () => R.guideDialog.showModal());
  R.stepButton.addEventListener("click", () => {
    state.guideStep = (state.guideStep + 1) % guide.length;
    render();
  });
  R.focusButton.addEventListener("click", () => {
    const active = document.body.classList.toggle("focus-mode");
    R.focusButton.setAttribute("aria-pressed", String(active));
  });
  R.fullscreenButton.addEventListener(
    "click",
    () =>
      document.fullscreenElement
        ? document.exitFullscreen()
        : document.documentElement.requestFullscreen(),
  );
  R.canvas.addEventListener("pointerdown", (event) => {
    state.dragging = true;
    R.canvas.setPointerCapture(event.pointerId);
  });
  R.canvas.addEventListener("pointermove", (event) => {
    if (!state.dragging) return;
    const rect = R.canvas.getBoundingClientRect(),
      ratio = Math.max(
        0,
        Math.min(1, (event.clientX - rect.left) / rect.width),
      );
    if (state.mode === "transmission") {
      state.transmissionVoltageKV = 10 + 490 * ratio;
      R.transmissionVoltageInput.value = state.transmissionVoltageKV;
    } else {
      state.phase = ratio;
      R.phaseInput.value = state.phase;
    }
    state.running = false;
    render();
  });
  R.canvas.addEventListener("pointerup", (event) => {
    state.dragging = false;
    R.canvas.releasePointerCapture(event.pointerId);
  });
  window.addEventListener("resize", render);
  let last = performance.now();
  function frame(now) {
    const delta = Math.min(.05, (now - last) / 1000);
    last = now;
    if (state.running) {
      state.phase = (state.phase + delta * .22) % 1;
      R.phaseInput.value = state.phase;
      render();
    }
    requestAnimationFrame(frame);
  }
  window.alternatingCurrentLab = {
    getState: () => ({ ...state }),
    setMode,
    setState(changes) {
      Object.assign(state, changes);
      syncInputs();
      render();
    },
    current,
  };
  syncInputs();
  render();
  requestAnimationFrame(frame);
})();
