(function () {
  const M = window.MagneticFieldModel;
  if (!M) throw new Error("MagneticFieldModel is required");
  const state = {
    mode: "wire",
    current: 10,
    current2: 10,
    probe: 8,
    spacing: 12,
    turns: 80,
    radius: 10,
    length: 40,
    progress: 0,
    running: false,
    guideStep: 0,
    showField: true,
    showLines: true,
    showCompass: true,
    showComponents: true,
    dragging: false,
  };
  const $ = (id) => document.getElementById(id);
  const R = {
    canvas: $("magneticCanvas"),
    fieldChart: $("fieldChart"),
    ledgerChart: $("ledgerChart"),
    sceneTabs: [...document.querySelectorAll(".scene-tab[data-mode]")],
    routeSteps: [...document.querySelectorAll(".route-step")],
    presets: [...document.querySelectorAll("[data-preset]")],
    currentInput: $("currentInput"),
    current2Input: $("current2Input"),
    probeInput: $("probeInput"),
    spacingInput: $("spacingInput"),
    turnsInput: $("turnsInput"),
    radiusInput: $("radiusInput"),
    lengthInput: $("lengthInput"),
    progressInput: $("progressInput"),
    currentValue: $("currentValue"),
    current2Value: $("current2Value"),
    probeValue: $("probeValue"),
    spacingValue: $("spacingValue"),
    turnsValue: $("turnsValue"),
    radiusValue: $("radiusValue"),
    lengthValue: $("lengthValue"),
    probeLabel: $("probeLabel"),
    secondWireSection: $("secondWireSection"),
    coilSection: $("coilSection"),
    solenoidSection: $("solenoidSection"),
    playbackValue: $("playbackValue"),
    modeTitle: $("modeTitle"),
    modeGoal: $("modeGoal"),
    stateBadge: $("stateBadge"),
    stageHint: $("stageHint"),
    sourceMetric: $("sourceMetric"),
    positionMetric: $("positionMetric"),
    fieldMetric: $("fieldMetric"),
    bxMetric: $("bxMetric"),
    byMetric: $("byMetric"),
    angleMetric: $("angleMetric"),
    fieldNature: $("fieldNature"),
    fieldExplanation: $("fieldExplanation"),
    profileTitle: $("profileTitle"),
    profileStatus: $("profileStatus"),
    ledgerTitle: $("ledgerTitle"),
    ledgerStatus: $("ledgerStatus"),
    stepIndex: $("stepIndex"),
    stepTitle: $("stepTitle"),
    stepPrompt: $("stepPrompt"),
    formulaReadout: $("formulaReadout"),
    playButton: $("playButton"),
    pauseButton: $("pauseButton"),
    measureButton: $("measureButton"),
    resetButton: $("resetButton"),
    guideButton: $("guideButton"),
    stepButton: $("stepButton"),
    focusButton: $("focusButton"),
    fullscreenButton: $("fullscreenButton"),
    guideDialog: $("guideDialog"),
    showFieldToggle: $("showFieldToggle"),
    showLinesToggle: $("showLinesToggle"),
    showCompassToggle: $("showCompassToggle"),
    showComponentsToggle: $("showComponentsToggle"),
  };
  const ctx = R.canvas.getContext("2d"),
    fctx = R.fieldChart.getContext("2d"),
    lctx = R.ledgerChart.getContext("2d");
  const C = {
    bg: "#090d0f",
    grid: "rgba(223,229,223,.055)",
    cyan: "#62c7d7",
    green: "#7bd898",
    amber: "#f1bd5b",
    red: "#ed7d72",
    violet: "#aa9add",
    white: "#dfe5df",
    muted: "#84908a",
  };
  const modes = {
    wire: {
      title: "直导线",
      goal: "磁场沿以导线为圆心的切线方向环绕",
      hint: "拖动探针，观察方向和强度变化",
    },
    double: {
      title: "双导线",
      goal: "每根导线的磁场必须按矢量方向叠加",
      hint: "比较同向和反向电流在中点的磁场",
    },
    loop: {
      title: "圆形线圈",
      goal: "线圈轴线磁场在中心最强，离开中心逐渐减弱",
      hint: "沿轴线移动探针，比较中心场",
    },
    solenoid: {
      title: "螺线管",
      goal: "内部场接近均匀，有限长度产生边缘效应",
      hint: "改变长度和匝数，比较 μ₀nI 近似",
    },
  };
  const guide = [
    ["先判断方向", "电流方向反转后，磁场方向为什么必须整体反转？"],
    ["再比较大小", "保持其他量不变，B 对 I、r、N 和 L 分别怎样响应？"],
    [
      "最后做叠加",
      "把各场源的 Bx、By 分别相加，合场是否等于场强大小直接相加？",
    ],
  ];
  const defaults = {
    wire: { current: 10, probe: 8 },
    double: { current: 10, current2: 10, probe: 0, spacing: 12 },
    loop: { current: 4, turns: 80, radius: 10, probe: 0 },
    solenoid: { current: 3, turns: 400, radius: 5, length: 40, probe: 0 },
  };
  function fmt(v, d = 2) {
    return Number(v).toFixed(d);
  }
  function micro(v) {
    return v * 1e6;
  }
  function size(canvas, c) {
    const r = canvas.getBoundingClientRect(),
      d = Math.min(devicePixelRatio || 1, 2),
      w = Math.max(300, Math.round(r.width)),
      h = Math.max(170, Math.round(r.height));
    if (canvas.width !== w * d || canvas.height !== h * d) {
      canvas.width = w * d;
      canvas.height = h * d;
    }
    c.setTransform(d, 0, 0, d, 0, 0);
    return { w, h };
  }
  function grid(c, w, h) {
    c.fillStyle = C.bg;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = C.grid;
    c.lineWidth = 1;
    for (let x = 18; x < w; x += 42) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, h);
      c.stroke();
    }
    for (let y = 18; y < h; y += 42) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
    }
  }
  function arrow(c, x1, y1, x2, y2, color, label) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    c.save();
    c.strokeStyle = c.fillStyle = color;
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
    c.beginPath();
    c.moveTo(x2, y2);
    c.lineTo(x2 - 8 * Math.cos(a - .48), y2 - 8 * Math.sin(a - .48));
    c.lineTo(x2 - 8 * Math.cos(a + .48), y2 - 8 * Math.sin(a + .48));
    c.fill();
    if (label) {
      c.font = "700 10px ui-monospace,monospace";
      c.fillText(label, x2 + 5, y2 - 5);
    }
    c.restore();
  }
  function currentMark(c, x, y, current, phase = 0) {
    c.save();
    c.strokeStyle = current >= 0 ? C.amber : C.cyan;
    c.fillStyle = "#111";
    c.lineWidth = 3;
    c.beginPath();
    c.arc(x, y, 17, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = current >= 0 ? C.amber : C.cyan;
    if (current >= 0) {
      c.beginPath();
      c.arc(x, y, 4 + Math.sin(phase * Math.PI * 2), 0, Math.PI * 2);
      c.fill();
    } else {
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x - 6, y - 6);
      c.lineTo(x + 6, y + 6);
      c.moveTo(x + 6, y - 6);
      c.lineTo(x - 6, y + 6);
      c.stroke();
    }
    c.restore();
  }
  function compass(c, x, y, angle) {
    if (!state.showCompass) return;
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    c.fillStyle = C.red;
    c.beginPath();
    c.moveTo(20, 0);
    c.lineTo(0, -5);
    c.lineTo(0, 5);
    c.fill();
    c.fillStyle = C.white;
    c.beginPath();
    c.moveTo(-20, 0);
    c.lineTo(0, -5);
    c.lineTo(0, 5);
    c.fill();
    c.restore();
  }
  function current() {
    if (state.mode === "double") {
      return M.twoWireField({
        current1A: state.current,
        current2A: state.current2,
        spacingM: state.spacing / 100,
        probeX: 0,
        probeY: state.probe / 100,
      });
    }
    if (state.mode === "loop") {
      return M.circularLoopOnAxis({
        currentA: state.current,
        turns: state.turns,
        radiusM: state.radius / 100,
        axisM: state.probe / 100,
      });
    }
    if (state.mode === "solenoid") {
      return M.finiteSolenoidOnAxis({
        currentA: state.current,
        turns: state.turns,
        radiusM: state.radius / 100,
        lengthM: state.length / 100,
        axisM: state.probe / 100,
      });
    }
    const x = Math.sign(state.probe || 1) * Math.max(2, Math.abs(state.probe)) /
      100;
    return M.wireFieldAt({ currentA: state.current, probeX: x });
  }
  function describe(q) {
    if (state.mode === "double") {
      const cancel = q.magnitudeT < 1e-9;
      return {
        bx: q.bxT,
        by: q.byT,
        mag: q.magnitudeT,
        angle: q.angleRad,
        nature: cancel ? "中点合磁场为零" : "两导线磁场按矢量叠加",
        explain: cancel
          ? "同向等大电流在中点产生反向等大的磁场"
          : "B₁ 与 B₂ 的方向先由各自右手定则确定",
        badge: cancel ? "叠加相消" : "矢量叠加",
        cls: cancel ? "is-cancel" : "is-safe",
        formula: `B合=${fmt(micro(q.magnitudeT))} μT`,
      };
    }
    if (state.mode === "loop") {
      return {
        bx: q.fieldT,
        by: 0,
        mag: q.magnitudeT,
        angle: q.fieldT >= 0 ? 0 : Math.PI,
        nature: q.direction === "positive-axis"
          ? "磁场沿轴线正向"
          : q.direction === "negative-axis"
          ? "磁场沿轴线负向"
          : "电流为零，磁场为零",
        explain: `当前位置为中心场的 ${
          fmt(Math.abs(q.relativeToCenter) * 100, 0)
        }%`,
        badge: `轴线场 · ${fmt(micro(q.magnitudeT), 1)} μT`,
        cls: q.fieldT >= 0 ? "is-safe" : "is-reverse",
        formula: `B=μ₀NIR²/[2(R²+x²)³ᐟ²]`,
      };
    }
    if (state.mode === "solenoid") {
      return {
        bx: q.fieldT,
        by: 0,
        mag: q.magnitudeT,
        angle: q.fieldT >= 0 ? 0 : Math.PI,
        nature: Math.abs(state.probe) < state.length / 2
          ? "探针位于螺线管内部"
          : "探针进入边缘或外部场",
        explain: `有限长场为 μ₀nI 的 ${
          fmt(Math.abs(q.finiteToIdealRatio) * 100, 1)
        }%`,
        badge: `轴向场 · ${fmt(micro(q.magnitudeT), 1)} μT`,
        cls: q.fieldT >= 0 ? "is-safe" : "is-reverse",
        formula: `B理想=μ₀nI=${
          fmt(micro(Math.abs(q.idealInfiniteFieldT)), 1)
        } μT`,
      };
    }
    return {
      bx: q.bxT,
      by: q.byT,
      mag: q.magnitudeT,
      angle: q.angleRad,
      nature: q.circulation === "counterclockwise"
        ? "右手定则：逆时针环绕"
        : q.circulation === "clockwise"
        ? "右手定则：顺时针环绕"
        : "电流为零，磁场为零",
      explain: "距离加倍时磁场变为原来的 1/2",
      badge: `${
        q.circulation === "clockwise"
          ? "顺时针"
          : q.circulation === "counterclockwise"
          ? "逆时针"
          : "无磁场"
      } · ${fmt(micro(q.magnitudeT), 1)} μT`,
      cls: q.currentA >= 0 ? "is-safe" : "is-reverse",
      formula: `B=μ₀I/(2πr)=${fmt(micro(q.magnitudeT))} μT`,
    };
  }
  function drawTop(q, w, h) {
    const cx = w * .47, cy = h * .51, scale = Math.min(w, h) * 2.2;
    if (state.mode === "wire") {
      if (state.showLines) {
        for (let r = 45; r < Math.min(w, h) * .42; r += 42) {
          ctx.strokeStyle = `rgba(98,199,215,${Math.max(.1, .5 - r / 500)})`;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      currentMark(ctx, cx, cy, state.current, state.progress);
      const px = cx +
          Math.sign(state.probe || 1) * Math.max(2, Math.abs(state.probe)) /
            100 * scale,
        py = cy;
      compass(ctx, px, py, -q.angleRad);
      ctx.fillStyle = C.white;
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
      if (state.showField && q.magnitudeT) {
        arrow(
          ctx,
          px,
          py,
          px + Math.cos(q.angleRad) * 55,
          py - Math.sin(q.angleRad) * 55,
          C.cyan,
          "B",
        );
      }
    } else {
      const dx = state.spacing / 200 * scale,
        py = cy - state.probe / 100 * scale;
      currentMark(ctx, cx - dx, cy, state.current, state.progress);
      currentMark(ctx, cx + dx, cy, state.current2, state.progress + .35);
      if (state.showLines) {
        for (const x of [cx - dx, cx + dx]) {
          for (let r = 34; r < 115; r += 35) {
            ctx.strokeStyle = "rgba(98,199,215,.22)";
            ctx.beginPath();
            ctx.arc(x, cy, r, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
      ctx.fillStyle = C.white;
      ctx.beginPath();
      ctx.arc(cx, py, 5, 0, Math.PI * 2);
      ctx.fill();
      compass(ctx, cx, py, -q.angleRad);
      if (state.showField && q.magnitudeT) {
        arrow(
          ctx,
          cx,
          py,
          cx + Math.cos(q.angleRad) * 60,
          py - Math.sin(q.angleRad) * 60,
          C.green,
          "B合",
        );
      }
      if (state.showComponents) {
        arrow(
          ctx,
          cx,
          py,
          cx + Math.cos(q.first.angleRad) * 38,
          py - Math.sin(q.first.angleRad) * 38,
          C.amber,
          "B₁",
        );
        arrow(
          ctx,
          cx,
          py,
          cx + Math.cos(q.second.angleRad) * 38,
          py - Math.sin(q.second.angleRad) * 38,
          C.violet,
          "B₂",
        );
      }
    }
  }
  function drawAxial(q, w, h) {
    const cx = w * .48,
      cy = h * .52,
      axisScale = Math.min(w * .38, 260) / .35,
      px = cx + state.probe / 100 * axisScale;
    ctx.strokeStyle = "rgba(223,229,223,.25)";
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(35, cy);
    ctx.lineTo(w - 35, cy);
    ctx.stroke();
    ctx.setLineDash([]);
    if (state.mode === "loop") {
      const rr = Math.min(95, state.radius * 7);
      ctx.strokeStyle = C.amber;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 16, rr, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const half = state.length / 200 * axisScale,
        rr = Math.min(70, state.radius * 8);
      ctx.strokeStyle = C.amber;
      ctx.lineWidth = 2;
      for (
        let x = cx - half;
        x <= cx + half;
        x += Math.max(5, (half * 2) / Math.min(60, state.turns))
      ) {
        ctx.beginPath();
        ctx.ellipse(x, cy, 7, rr, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    if (state.showLines) {
      ctx.strokeStyle = "rgba(98,199,215,.28)";
      for (const off of [-55, -28, 28, 55]) {
        ctx.beginPath();
        ctx.moveTo(cx - 180, cy + off);
        ctx.bezierCurveTo(
          cx - 80,
          cy + off * .25,
          cx + 80,
          cy + off * .25,
          cx + 180,
          cy + off,
        );
        ctx.stroke();
      }
    }
    ctx.fillStyle = C.white;
    ctx.beginPath();
    ctx.arc(px, cy, 5, 0, Math.PI * 2);
    ctx.fill();
    compass(ctx, px, cy, q.fieldT >= 0 ? 0 : Math.PI);
    if (state.showField && q.magnitudeT) {
      arrow(ctx, px, cy, px + (q.fieldT >= 0 ? 58 : -58), cy, C.cyan, "B");
    }
  }
  function drawScene() {
    const { w, h } = size(R.canvas, ctx), q = current();
    grid(ctx, w, h);
    state.mode === "wire" || state.mode === "double"
      ? drawTop(q, w, h)
      : drawAxial(q, w, h);
    ctx.fillStyle = C.muted;
    ctx.font = "10px ui-monospace,monospace";
    ctx.fillText(
      state.mode === "wire" || state.mode === "double"
        ? "俯视图 · ⊙ 向外 / ⊗ 向内"
        : "轴截面 · 场线密度仅表示相对强弱",
      18,
      22,
    );
  }
  function axes(c, w, h, xmin, xmax, ymax) {
    const p = { l: 42, r: 14, t: 18, b: 28 },
      pw = w - p.l - p.r,
      ph = h - p.t - p.b;
    c.strokeStyle = "rgba(223,229,223,.16)";
    c.strokeRect(p.l, p.t, pw, ph);
    return {
      x: (v) => p.l + (v - xmin) / (xmax - xmin) * pw,
      y: (v) => p.t + (ymax - v) / (2 * ymax) * ph,
      p,
      pw,
      ph,
    };
  }
  function drawProfile() {
    const { w, h } = size(R.fieldChart, fctx);
    grid(fctx, w, h);
    let pts = [], xmin = -30, xmax = 30, q = current();
    if (state.mode === "wire") {
      xmin = 2;
      xmax = 30;
      for (let x = 2; x <= 30; x += .4) {
        pts.push([
          x,
          micro(
            M.wireFieldAt({ currentA: state.current, probeX: x / 100 })
              .magnitudeT,
          ),
        ]);
      }
    } else if (state.mode === "double") {
      for (let y = -30; y <= 30; y += .6) {
        pts.push([
          y,
          micro(
            M.twoWireField({
              current1A: state.current,
              current2A: state.current2,
              spacingM: state.spacing / 100,
              probeY: y / 100,
            }).byT,
          ),
        ]);
      }
    } else {
      const scan = M.axisScan(
        state.mode === "loop" ? "loop" : "solenoid",
        120,
        {
          currentA: state.current,
          turns: state.turns,
          radiusM: state.radius / 100,
          lengthM: state.length / 100,
        },
      );
      xmin = scan[0].axisM * 100;
      xmax = scan.at(-1).axisM * 100;
      pts = scan.map((p) => [p.axisM * 100, micro(p.fieldT)]);
    }
    const ymax = Math.max(1, ...pts.map((p) => Math.abs(p[1]))) * 1.08,
      map = axes(fctx, w, h, xmin, xmax, ymax);
    fctx.strokeStyle = C.cyan;
    fctx.lineWidth = 2.2;
    fctx.beginPath();
    pts.forEach((p, i) =>
      i
        ? fctx.lineTo(map.x(p[0]), map.y(p[1]))
        : fctx.moveTo(map.x(p[0]), map.y(p[1]))
    );
    fctx.stroke();
    fctx.fillStyle = C.amber;
    fctx.beginPath();
    const d = describe(q);
    fctx.arc(
      map.x(
        state.mode === "wire"
          ? Math.max(2, Math.abs(state.probe))
          : state.probe,
      ),
      map.y(
        state.mode === "wire"
          ? micro(q.magnitudeT)
          : state.mode === "double"
          ? micro(q.byT)
          : micro(q.fieldT),
      ),
      5,
      0,
      Math.PI * 2,
    );
    fctx.fill();
  }
  function drawLedger() {
    const { w, h } = size(R.ledgerChart, lctx), q = current(), d = describe(q);
    grid(lctx, w, h);
    let bars = state.mode === "double"
      ? [["B₁y", micro(q.first.byT), C.amber], [
        "B₂y",
        micro(q.second.byT),
        C.violet,
      ], ["B合y", micro(q.byT), C.green]]
      : [["Bx", micro(d.bx), C.cyan], ["By", micro(d.by), C.violet], [
        "|B|",
        micro(d.mag),
        C.amber,
      ]];
    const max = Math.max(1, ...bars.map((b) => Math.abs(b[1]))),
      zero = h * .52,
      bw = Math.min(55, (w - 80) / bars.length * .45);
    lctx.strokeStyle = "rgba(223,229,223,.2)";
    lctx.beginPath();
    lctx.moveTo(20, zero);
    lctx.lineTo(w - 20, zero);
    lctx.stroke();
    bars.forEach((b, i) => {
      const x = 45 + i * (w - 90) / bars.length,
        bh = Math.abs(b[1]) / max * (h * .32);
      lctx.fillStyle = b[2];
      lctx.fillRect(x, b[1] >= 0 ? zero - bh : zero, bw, bh);
      lctx.fillStyle = C.white;
      lctx.font = "9px ui-monospace,monospace";
      lctx.fillText(b[0], x, b[1] >= 0 ? zero - bh - 6 : zero + bh + 13);
    });
  }
  function progress(el) {
    const p = (+el.value - +el.min) / (+el.max - +el.min) * 100;
    el.style.setProperty("--range-progress", p + "%");
  }
  function sync() {
    const q = current(),
      d = describe(q),
      mode = modes[state.mode],
      g = guide[state.guideStep];
    R.currentValue.textContent = fmt(state.current, 1) + " A";
    R.current2Value.textContent = fmt(state.current2, 1) + " A";
    R.probeValue.textContent = fmt(state.probe, 1) + " cm";
    R.spacingValue.textContent = fmt(state.spacing, 1) + " cm";
    R.turnsValue.textContent = fmt(state.turns, 0);
    R.radiusValue.textContent = fmt(state.radius, 1) + " cm";
    R.lengthValue.textContent = fmt(state.length, 1) + " cm";
    R.playbackValue.textContent = (state.running ? "运行中" : "已暂停") +
      " · " + fmt(state.progress * 100, 0) + "%";
    R.modeTitle.textContent = mode.title;
    R.modeGoal.textContent = mode.goal;
    R.stageHint.textContent = mode.hint;
    R.stateBadge.textContent = d.badge;
    R.stateBadge.className = "state-badge " + d.cls;
    R.sourceMetric.textContent = mode.title;
    R.positionMetric.textContent = (state.mode === "wire" ? "r = " : "x = ") +
      fmt(
        state.mode === "wire"
          ? Math.max(2, Math.abs(state.probe))
          : state.probe,
        1,
      ) + " cm";
    R.fieldMetric.textContent = fmt(micro(d.mag)) + " μT";
    R.bxMetric.textContent = fmt(micro(d.bx)) + " μT";
    R.byMetric.textContent = fmt(micro(d.by)) + " μT";
    R.angleMetric.textContent = d.mag < 1e-12
      ? "—"
      : fmt(d.angle * 180 / Math.PI, 1) + "°";
    R.fieldNature.textContent = d.nature;
    R.fieldExplanation.textContent = d.explain;
    R.profileTitle.textContent = state.mode === "wire"
      ? "磁场-距离"
      : state.mode === "double"
      ? "中垂线磁场"
      : state.mode === "loop"
      ? "线圈轴线场"
      : "螺线管轴线场";
    R.profileStatus.textContent = state.mode === "wire"
      ? "B∝I/r"
      : state.mode === "double"
      ? "B=B₁+B₂"
      : state.mode === "loop"
      ? "中心场最强"
      : "显示边缘效应";
    R.ledgerStatus.textContent = state.mode === "double"
      ? "B=B₁+B₂"
      : "B=√(Bx²+By²)";
    R.stepIndex.textContent = "0" + (state.guideStep + 1);
    R.stepTitle.textContent = g[0];
    R.stepPrompt.textContent = g[1];
    R.formulaReadout.textContent = d.formula;
    R.secondWireSection.hidden = state.mode !== "double";
    R.coilSection.hidden = state.mode !== "loop" && state.mode !== "solenoid";
    R.solenoidSection.hidden = state.mode !== "solenoid";
    R.probeLabel.innerHTML = state.mode === "wire"
      ? "探针距离 <i>r</i>"
      : "轴线位置 <i>x</i>";
    R.sceneTabs.forEach((b) =>
      b.classList.toggle("is-active", b.dataset.mode === state.mode)
    );
    R.routeSteps.forEach((b, i) =>
      b.classList.toggle("is-active", i === state.guideStep)
    );
    [
      R.currentInput,
      R.current2Input,
      R.probeInput,
      R.spacingInput,
      R.turnsInput,
      R.radiusInput,
      R.lengthInput,
      R.progressInput,
    ].forEach(progress);
    drawScene();
    drawProfile();
    drawLedger();
  }
  function setMode(mode) {
    state.mode = mode;
    Object.assign(state, defaults[mode]);
    state.running = false;
    state.progress = 0;
    Object.entries({
      currentInput: "current",
      current2Input: "current2",
      probeInput: "probe",
      spacingInput: "spacing",
      turnsInput: "turns",
      radiusInput: "radius",
      lengthInput: "length",
      progressInput: "progress",
    }).forEach(([id, key]) => R[id].value = state[key]);
    sync();
  }
  [
    [R.currentInput, "current"],
    [R.current2Input, "current2"],
    [R.probeInput, "probe"],
    [R.spacingInput, "spacing"],
    [R.turnsInput, "turns"],
    [R.radiusInput, "radius"],
    [R.lengthInput, "length"],
    [R.progressInput, "progress"],
  ].forEach(([el, key]) =>
    el.addEventListener("input", () => {
      state[key] = Number(el.value);
      state.running = false;
      sync();
    })
  );
  R.sceneTabs.forEach((b) =>
    b.addEventListener("click", () => setMode(b.dataset.mode))
  );
  R.routeSteps.forEach((b, i) =>
    b.addEventListener("click", () => {
      state.guideStep = i;
      sync();
    })
  );
  R.presets.forEach((b) =>
    b.addEventListener("click", () => {
      const p = b.dataset.preset;
      if (p === "cancel") {
        setMode("double");
        return;
      }
      if (p === "reverse") state.current *= -1;
      else if (p === "center") state.probe = 0;
      else if (p === "compare") {
        state.probe = state.mode === "wire"
          ? 20
          : state.mode === "solenoid"
          ? state.length * .7
          : state.radius * 2;
      }
      R.currentInput.value = state.current;
      R.probeInput.value = state.probe;
      state.running = false;
      sync();
    })
  );
  R.playButton.addEventListener("click", () => {
    state.running = true;
    sync();
  });
  R.pauseButton.addEventListener("click", () => {
    state.running = false;
    sync();
  });
  R.measureButton.addEventListener("click", () => {
    state.probe = state.mode === "wire" ? 8 : 0;
    R.probeInput.value = state.probe;
    state.running = false;
    sync();
  });
  R.resetButton.addEventListener("click", () => {
    state.guideStep = 0;
    setMode("wire");
  });
  [[R.showFieldToggle, "showField"], [R.showLinesToggle, "showLines"], [
    R.showCompassToggle,
    "showCompass",
  ], [R.showComponentsToggle, "showComponents"]].forEach(([el, key]) =>
    el.addEventListener("change", () => {
      state[key] = el.checked;
      sync();
    })
  );
  R.guideButton.addEventListener("click", () => R.guideDialog.showModal());
  R.stepButton.addEventListener("click", () => {
    state.guideStep = (state.guideStep + 1) % guide.length;
    sync();
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
  R.canvas.addEventListener("pointerdown", (e) => {
    state.dragging = true;
    R.canvas.setPointerCapture(e.pointerId);
  });
  R.canvas.addEventListener("pointermove", (e) => {
    if (!state.dragging) return;
    const r = R.canvas.getBoundingClientRect(),
      ratio = (e.clientX - r.left) / r.width;
    state.probe = Math.max(-30, Math.min(30, (ratio - .48) * 75));
    R.probeInput.value = state.probe;
    state.running = false;
    sync();
  });
  R.canvas.addEventListener("pointerup", (e) => {
    state.dragging = false;
    R.canvas.releasePointerCapture(e.pointerId);
  });
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(.05, (now - last) / 1000);
    last = now;
    if (state.running) {
      state.progress =
        (state.progress + dt * .35 * (state.current < 0 ? -1 : 1) + 1) % 1;
      R.progressInput.value = state.progress;
      sync();
    }
    requestAnimationFrame(frame);
  }
  window.addEventListener("resize", sync);
  window.magneticFieldLab = {
    getState: () => ({ ...state }),
    setMode,
    current,
    setState(changes) {
      Object.assign(state, changes);
      sync();
    },
  };
  sync();
  requestAnimationFrame(frame);
})();
