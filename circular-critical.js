(function () {
  const M = window.CircularCriticalModel;
  if (!M) throw new Error("CircularCriticalModel is required");
  const state = {
    mode: "flat",
    mass: 1200,
    radius: 40,
    speed: 14,
    mu: .55,
    bank: 20,
    progress: 0,
    running: false,
    rate: .5,
    guideStep: 0,
    showForces: true,
    showRadial: true,
    showLimit: true,
    showTrail: true,
    showTheory: true,
    lastTime: 0,
  };
  const R = {
    canvas: document.getElementById("criticalCanvas"),
    demandChart: document.getElementById("demandChart"),
    ledgerChart: document.getElementById("ledgerChart"),
    sceneTabs: Array.from(document.querySelectorAll(".scene-tab[data-mode]")),
    routeSteps: Array.from(document.querySelectorAll(".route-step")),
    massInput: document.getElementById("massInput"),
    radiusInput: document.getElementById("radiusInput"),
    speedInput: document.getElementById("speedInput"),
    frictionInput: document.getElementById("frictionInput"),
    bankInput: document.getElementById("bankInput"),
    progressInput: document.getElementById("progressInput"),
    massLabel: document.getElementById("massLabel"),
    speedLabel: document.getElementById("speedLabel"),
    massValue: document.getElementById("massValue"),
    radiusValue: document.getElementById("radiusValue"),
    speedValue: document.getElementById("speedValue"),
    frictionValue: document.getElementById("frictionValue"),
    bankValue: document.getElementById("bankValue"),
    frictionSection: document.getElementById("frictionSection"),
    bankSection: document.getElementById("bankSection"),
    playbackValue: document.getElementById("playbackValue"),
    modeTitle: document.getElementById("modeTitle"),
    modeGoal: document.getElementById("modeGoal"),
    stateBadge: document.getElementById("stateBadge"),
    stageHint: document.getElementById("stageHint"),
    motionMetric: document.getElementById("motionMetric"),
    velocityMetricLabel: document.getElementById("velocityMetricLabel"),
    velocityMetric: document.getElementById("velocityMetric"),
    requiredMetric: document.getElementById("requiredMetric"),
    normalMetric: document.getElementById("normalMetric"),
    utilizationMetric: document.getElementById("utilizationMetric"),
    criticalMetricLabel: document.getElementById("criticalMetricLabel"),
    criticalMetric: document.getElementById("criticalMetric"),
    criticalNature: document.getElementById("criticalNature"),
    criticalExplanation: document.getElementById("criticalExplanation"),
    demandTitle: document.getElementById("demandTitle"),
    demandStatus: document.getElementById("demandStatus"),
    ledgerTitle: document.getElementById("ledgerTitle"),
    ledgerStatus: document.getElementById("ledgerStatus"),
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
    presets: Array.from(document.querySelectorAll("[data-preset]")),
    rates: Array.from(document.querySelectorAll("[data-rate]")),
    showForcesToggle: document.getElementById("showForcesToggle"),
    showRadialToggle: document.getElementById("showRadialToggle"),
    showLimitToggle: document.getElementById("showLimitToggle"),
    showTrailToggle: document.getElementById("showTrailToggle"),
    showTheoryToggle: document.getElementById("showTheoryToggle"),
  };
  const ctx = R.canvas.getContext("2d"),
    dctx = R.demandChart.getContext("2d"),
    lctx = R.ledgerChart.getContext("2d"),
    C = {
      cyan: "#67c6d8",
      green: "#7bd898",
      amber: "#f0b84d",
      red: "#ff776c",
      violet: "#b79ae6",
      white: "#dfe5df",
      muted: "#8d9992",
    };
  const modes = {
    flat: {
      title: "平路转弯",
      goal: "静摩擦力提供径向合力，但不会自动等于 μN",
      hint: "增大速度，观察需要的摩擦力何时达到上限",
    },
    banked: {
      title: "倾斜弯道",
      goal: "支持力的水平分量参与向心需求，摩擦方向由速度偏差决定",
      hint: "比较当前速度与无需摩擦的理想速度",
    },
    loop: {
      title: "竖直圆环",
      goal: "能量决定各处速度，N≥0 决定能否保持接触",
      hint: "拖动过程到顶部，比较支持力与临界底速",
    },
    hill: {
      title: "拱桥顶部",
      goal: "重力与支持力之差提供向下的径向合力",
      hint: "增大速度，观察支持力减小到零",
    },
  };
  const guide = [{
    title: "先写径向合力",
    prompt: "向心力为什么不能和摩擦力、支持力并列画成另一支箭头？",
  }, {
    title: "再检查真实力边界",
    prompt: "静摩擦和支持力分别为什么不能无限增大或变成负值？",
  }, {
    title: "最后定位临界等号",
    prompt: "把 N=0 或 f=μN 代入径向方程，临界速度怎样出现？",
  }];
  function fmt(v, d = 2) {
    return Number(v).toFixed(d);
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
  function progress(el) {
    const p = (Number(el.value) - Number(el.min)) /
      (Number(el.max) - Number(el.min)) * 100;
    el.style.setProperty("--range-progress", p + "%");
  }
  function current() {
    return {
      flat: M.flatTurn({
        massKg: state.mass,
        radiusM: state.radius,
        speedMps: state.speed,
        frictionCoefficient: state.mu,
      }),
      bank: M.bankedTurn({
        massKg: state.mass,
        radiusM: state.radius,
        speedMps: state.speed,
        frictionCoefficient: state.mu,
        bankAngleDeg: state.bank,
      }),
      loop: M.verticalLoop({
        massKg: state.mass,
        radiusM: state.radius,
        bottomSpeedMps: state.speed,
        angleDeg: state.progress * 360,
      }),
      hill: M.hillCrest({
        massKg: state.mass,
        radiusM: state.radius,
        speedMps: state.speed,
      }),
    };
  }
  function arrow(c, x1, y1, x2, y2, color, label) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    c.save();
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = 2.6;
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
    c.beginPath();
    c.moveTo(x2, y2);
    c.lineTo(x2 - 9 * Math.cos(a - .5), y2 - 9 * Math.sin(a - .5));
    c.lineTo(x2 - 9 * Math.cos(a + .5), y2 - 9 * Math.sin(a + .5));
    c.closePath();
    c.fill();
    c.font = "700 10px ui-monospace,monospace";
    c.fillText(label, x2 + 6, y2 - 6);
    c.restore();
  }
  function grid(c, w, h) {
    c.fillStyle = "#090d0f";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "rgba(223,229,223,.055)";
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
  function car(c, x, y, a, color = C.white) {
    c.save();
    c.translate(x, y);
    c.rotate(a);
    c.fillStyle = color;
    c.fillRect(-18, -9, 36, 18);
    c.fillStyle = "#111";
    c.fillRect(-12, -12, 7, 4);
    c.fillRect(6, -12, 7, 4);
    c.fillRect(-12, 8, 7, 4);
    c.fillRect(6, 8, 7, 4);
    c.restore();
  }
  function drawFlat(q, w, h) {
    const cx = w * .48,
      cy = h * .53,
      r = Math.min(w * .29, h * .34),
      a = state.progress * Math.PI * 2 - Math.PI / 2,
      x = cx + r * Math.cos(a),
      y = cy + r * Math.sin(a);
    ctx.strokeStyle = "#303733";
    ctx.lineWidth = 28;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(223,229,223,.35)";
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    car(ctx, x, y, a + Math.PI / 2, q.safe ? C.green : C.red);
    if (state.showRadial) {
      ctx.strokeStyle = C.amber;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(cx, cy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (state.showForces) {
      arrow(
        ctx,
        x,
        y,
        x + (cx - x) * .38,
        y + (cy - y) * .38,
        q.safe ? C.cyan : C.red,
        "f",
      );
    }
    ctx.fillStyle = C.muted;
    ctx.font = "10px ui-monospace,monospace";
    ctx.fillText("俯视图 · 静摩擦指向圆心", 18, 20);
    ctx.fillText(
      q.safe ? "轮胎仍可提供所需侧向力" : "所需侧向力超过静摩擦上限",
      18,
      h - 18,
    );
  }
  function drawBank(q, w, h) {
    const cx = w * .48,
      ground = h * .69,
      theta = q.theta,
      len = Math.min(w * .64, 430),
      x1 = cx - len / 2 * Math.cos(theta),
      y1 = ground + len / 2 * Math.sin(theta),
      x2 = cx + len / 2 * Math.cos(theta),
      y2 = ground - len / 2 * Math.sin(theta);
    ctx.strokeStyle = "#3b423d";
    ctx.lineWidth = 28;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    car(ctx, cx, ground, theta, q.safe ? C.green : C.red);
    if (state.showForces) {
      arrow(ctx, cx, ground, cx, ground + 72, C.red, "mg");
      arrow(
        ctx,
        cx,
        ground,
        cx - 68 * Math.sin(theta),
        ground - 68 * Math.cos(theta),
        C.cyan,
        "N",
      );
      if (q.frictionDirection !== "none") {
        const sign = q.frictionDirection === "down-slope" ? -1 : 1;
        arrow(
          ctx,
          cx,
          ground,
          cx + sign * 55 * Math.cos(theta),
          ground - sign * 55 * Math.sin(theta),
          C.violet,
          "f",
        );
      }
    }
    if (state.showRadial) {
      arrow(
        ctx,
        cx + 100,
        ground - 100,
        cx + 28,
        ground - 100,
        C.amber,
        "向心",
      );
    }
    ctx.fillStyle = C.muted;
    ctx.font = "10px ui-monospace,monospace";
    ctx.fillText("弯道横截面 · 圆心在左侧", 18, 20);
    ctx.fillText(
      q.frictionDirection === "none"
        ? "无需摩擦：N 的分量恰好满足"
        : "摩擦沿坡" + (q.frictionDirection === "down-slope" ? "向下" : "向上"),
      18,
      h - 18,
    );
  }
  function drawLoop(q, w, h) {
    const cx = w * .48,
      cy = h * .52,
      r = Math.min(w * .25, h * .36),
      theta = q.theta,
      x = cx + r * Math.sin(theta),
      y = cy + r * Math.cos(theta);
    ctx.strokeStyle = "#3a413d";
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    if (state.showTrail) {
      ctx.strokeStyle = q.completesWithContact ? C.green : C.red;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(
        cx,
        cy,
        r,
        Math.PI / 2,
        Math.PI / 2 + Math.min(
          theta,
          q.firstLossAngleDeg === null
            ? theta
            : q.firstLossAngleDeg * Math.PI / 180,
        ),
      );
      ctx.stroke();
    }
    car(ctx, x, y, -theta, q.contactAtAngle ? C.green : C.red);
    if (state.showForces) {
      arrow(ctx, x, y, x, y + 62, C.red, "mg");
      if (q.contactAtAngle) {
        arrow(ctx, x, y, x + (cx - x) * .42, y + (cy - y) * .42, C.cyan, "N");
      }
    }
    if (state.showLimit) {
      ctx.fillStyle = C.amber;
      ctx.beginPath();
      ctx.arc(cx, cy - r, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "10px ui-monospace,monospace";
      ctx.fillText("顶部 N=0 临界", cx + 10, cy - r + 4);
    }
    ctx.fillStyle = C.muted;
    ctx.font = "10px ui-monospace,monospace";
    ctx.fillText(
      "最低底速 √(5gr) = " + fmt(q.minimumBottomSpeedMps, 2) + " m/s",
      18,
      20,
    );
    ctx.fillText(
      q.completesWithContact ? "可全程保持接触" : "将在到达顶部前失去接触",
      18,
      h - 18,
    );
  }
  function drawHill(q, w, h) {
    const cx = w * .48,
      cy = h * .76,
      r = Math.min(w * .34, h * .58),
      start = Math.PI * 1.15,
      end = Math.PI * 1.85;
    ctx.strokeStyle = "#3a413d";
    ctx.lineWidth = 30;
    ctx.beginPath();
    ctx.arc(cx, cy, r, start, end);
    ctx.stroke();
    const t = (state.progress - .5) * .8,
      a = -Math.PI / 2 + t,
      x = cx + r * Math.cos(a),
      y = cy + r * Math.sin(a);
    car(ctx, x, y, a + Math.PI / 2, q.contact ? C.green : C.red);
    if (state.showForces) {
      arrow(ctx, x, y, x, y + 66, C.red, "mg");
      if (q.contact) {
        arrow(ctx, x, y, x, y - 52 * q.apparentWeightRatio, C.cyan, "N");
      }
    }
    if (!q.contact) {
      ctx.strokeStyle = C.red;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 70, y - 10, x + 140, y + 55);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = C.muted;
    ctx.font = "10px ui-monospace,monospace";
    ctx.fillText("拱顶径向向下：mg−N=mv²/r", 18, 20);
    ctx.fillText(
      q.contact ? "支持力仍为正" : "N 已降为零，车辆离开路面",
      18,
      h - 18,
    );
  }
  function drawScene() {
    const { w, h } = size(R.canvas, ctx), q = current();
    grid(ctx, w, h);
    if (state.mode === "banked") drawBank(q.bank, w, h);
    else if (state.mode === "loop") drawLoop(q.loop, w, h);
    else if (state.mode === "hill") drawHill(q.hill, w, h);
    else drawFlat(q.flat, w, h);
  }
  function axes(c, w, h, xmax, ymax) {
    const p = { l: 42, r: 14, t: 18, b: 30 },
      pw = w - p.l - p.r,
      ph = h - p.t - p.b;
    c.strokeStyle = "rgba(223,229,223,.13)";
    for (let i = 0; i <= 4; i++) {
      const x = p.l + pw * i / 4, y = p.t + ph * i / 4;
      c.beginPath();
      c.moveTo(x, p.t);
      c.lineTo(x, p.t + ph);
      c.stroke();
      c.beginPath();
      c.moveTo(p.l, y);
      c.lineTo(p.l + pw, y);
      c.stroke();
    }
    return {
      x: (v) => p.l + v / xmax * pw,
      y: (v) => p.t + (ymax - v) / ymax * ph,
      p,
      pw,
      ph,
    };
  }
  function line(c, pts, map, get, color) {
    c.strokeStyle = color;
    c.lineWidth = 2.2;
    c.beginPath();
    pts.forEach((p, i) =>
      i
        ? c.lineTo(map.x(p.speedMps), map.y(get(p)))
        : c.moveTo(map.x(p.speedMps), map.y(get(p)))
    );
    c.stroke();
  }
  function drawDemand() {
    const { w, h } = size(R.demandChart, dctx), q = current();
    dctx.clearRect(0, 0, w, h);
    dctx.fillStyle = "#101512";
    dctx.fillRect(0, 0, w, h);
    let points, xmax = 45, ymax, currentValue, limitValue;
    if (state.mode === "loop") {
      points = Array.from({ length: 101 }, (_, index) =>
        M.verticalLoop({
          massKg: state.mass,
          radiusM: state.radius,
          bottomSpeedMps: 45 * index / 100,
          angleDeg: 180,
        }));
      ymax = Math.max(1, ...points.map((p) => Math.max(0, p.topNormalForceN)));
      currentValue = Math.max(0, q.loop.topNormalForceN);
      limitValue = 0;
    } else if (state.mode === "banked") {
      points = M.speedScan("banked", 100, {
        massKg: state.mass,
        radiusM: state.radius,
        frictionCoefficient: state.mu,
        bankAngleDeg: state.bank,
      });
      xmax = 55;
      ymax = Math.max(
        ...points.map((p) =>
          Math.max(Math.abs(p.requiredFrictionN), p.maxFrictionN)
        ),
      );
      currentValue = Math.abs(q.bank.requiredFrictionN);
      limitValue = q.bank.maxFrictionN;
    } else if (state.mode === "hill") {
      points = M.speedScan("hill", 100, {
        massKg: state.mass,
        radiusM: state.radius,
      });
      xmax = 40;
      ymax = state.mass * M.G;
      currentValue = q.hill.requiredCentripetalN;
      limitValue = state.mass * M.G;
    } else {
      points = M.speedScan("flat", 100, {
        massKg: state.mass,
        radiusM: state.radius,
        frictionCoefficient: state.mu,
      });
      ymax = Math.max(...points.map((p) => p.requiredForceN));
      currentValue = q.flat.requiredForceN;
      limitValue = q.flat.maxFrictionN;
    }
    const map = axes(dctx, w, h, xmax, ymax * 1.05);
    if (state.showTheory) {
      line(
        dctx,
        points,
        map,
        (p) =>
          state.mode === "loop"
            ? Math.max(0, p.topNormalForceN)
            : state.mode === "banked"
            ? Math.abs(p.requiredFrictionN)
            : state.mode === "hill"
            ? p.requiredCentripetalN
            : p.requiredForceN,
        C.cyan,
      );
      dctx.strokeStyle = C.red;
      dctx.setLineDash([5, 5]);
      dctx.beginPath();
      dctx.moveTo(map.x(0), map.y(limitValue));
      dctx.lineTo(map.x(xmax), map.y(limitValue));
      dctx.stroke();
      dctx.setLineDash([]);
    }
    dctx.fillStyle = C.amber;
    dctx.beginPath();
    dctx.arc(
      map.x(state.speed),
      map.y(Math.min(currentValue, ymax * 1.05)),
      5,
      0,
      Math.PI * 2,
    );
    dctx.fill();
    dctx.fillStyle = C.muted;
    dctx.font = "9px ui-monospace,monospace";
    dctx.fillText(state.mode === "loop" ? "N顶" : "需求", map.p.l + 4, 12);
    dctx.fillStyle = C.red;
    dctx.fillText(
      state.mode === "loop" ? "N=0 临界" : "可用上限",
      map.p.l + 44,
      12,
    );
    dctx.textAlign = "right";
    dctx.fillText("v / (m/s)", w - 5, h - 8);
    dctx.textAlign = "left";
  }
  function drawLedger() {
    const { w, h } = size(R.ledgerChart, lctx), q = current();
    lctx.clearRect(0, 0, w, h);
    lctx.fillStyle = "#101512";
    lctx.fillRect(0, 0, w, h);
    let bars;
    if (state.mode === "banked") {
      bars = [["N向心", q.bank.normalForceN * Math.sin(q.bank.theta), C.cyan], [
        "f向心",
        q.bank.requiredFrictionN * Math.cos(q.bank.theta),
        C.violet,
      ], ["需求", state.mass * state.speed ** 2 / state.radius, C.amber]];
    } else if (state.mode === "loop") {
      bars = [
        [
          "N",
          Number.isFinite(q.loop.normalForceN) ? q.loop.normalForceN : 0,
          C.cyan,
        ],
        ["重力径向", -state.mass * M.G * Math.cos(q.loop.theta), C.red],
        ["需求", state.mass * q.loop.speedSquared / state.radius, C.amber],
      ];
    } else if (state.mode === "hill") {
      bars = [["mg", state.mass * M.G, C.red], [
        "−N",
        -q.hill.normalForceN,
        C.cyan,
      ], ["需求", q.hill.requiredCentripetalN, C.amber]];
    } else {bars = [
        ["f实际", Math.min(q.flat.requiredForceN, q.flat.maxFrictionN), C.cyan],
        ["f上限", q.flat.maxFrictionN, C.red],
        ["需求", q.flat.requiredForceN, C.amber],
      ];}
    const max = Math.max(1, ...bars.map((b) => Math.abs(b[1]))),
      zero = h * .58,
      scale = h * .38 / max,
      bw = Math.min(48, (w - 90) / 3);
    lctx.strokeStyle = "rgba(223,229,223,.2)";
    lctx.beginPath();
    lctx.moveTo(20, zero);
    lctx.lineTo(w - 18, zero);
    lctx.stroke();
    bars.forEach((b, i) => {
      const x = 35 + i * (w - 70) / 3, v = b[1], bh = Math.abs(v) * scale;
      lctx.fillStyle = b[2];
      lctx.fillRect(x, v >= 0 ? zero - bh : zero, bw, bh);
      lctx.fillStyle = C.white;
      lctx.font = "9px ui-monospace,monospace";
      lctx.fillText(b[0], x, zero + (v >= 0 ? -bh - 6 : bh + 13));
    });
  }
  function describe(q) {
    if (state.mode === "banked") {
      const s = q.bank,
        u = Math.abs(s.requiredFrictionN) / Math.max(1, s.maxFrictionN),
        atLimit = Math.abs(Math.abs(s.requiredFrictionN) - s.maxFrictionN) <=
          Math.max(1, s.maxFrictionN * 1e-6);
      return {
        badge: (atLimit ? "临界" : s.safe ? "安全" : "侧滑") + " · " +
          fmt(u * 100, 0) + "%",
        cls: atLimit ? "is-limit" : s.safe ? "is-safe" : "is-fail",
        motion: "倾斜弯道",
        required: state.mass * state.speed ** 2 / state.radius,
        normal: s.normalForceN,
        util: u,
        critical: s.maximumSpeedMps,
        nature: atLimit
          ? "摩擦恰好达到上限 μN"
          : s.frictionDirection === "none"
          ? "无需摩擦"
          : s.safe
          ? "摩擦沿坡" +
            (s.frictionDirection === "down-slope" ? "向下" : "向上")
          : "摩擦不足，发生侧滑",
        explain: "理想速度 " + fmt(s.idealSpeedMps, 2) + " m/s；安全区间 " +
          fmt(s.minimumSpeedMps, 2) + "–" + fmt(s.maximumSpeedMps, 2) + " m/s",
        formula: "f需 = " + fmt(s.requiredFrictionN / 1000, 2) + " kN",
      };
    }
    if (state.mode === "loop") {
      const s = q.loop,
        ratio = state.speed / s.minimumBottomSpeedMps,
        atLimit = Math.abs(state.speed - s.minimumBottomSpeedMps) <=
          Math.max(1e-8, s.minimumBottomSpeedMps * 1e-8);
      return {
        badge: (atLimit
          ? "临界过顶"
          : s.completesWithContact
          ? "可过顶"
          : "将脱轨") +
          " · " +
          fmt(ratio * 100, 0) + "%",
        cls: atLimit
          ? "is-limit"
          : s.completesWithContact
          ? "is-safe"
          : "is-fail",
        motion: "竖直圆环 " + fmt(s.angleDeg, 0) + "°",
        required: s.reachesAngle
          ? state.mass * s.speedSquared / state.radius
          : 0,
        normal: Number.isFinite(s.normalForceN)
          ? Math.max(0, s.normalForceN)
          : 0,
        util: ratio,
        critical: s.minimumBottomSpeedMps,
        nature: atLimit
          ? "顶部 N=0，恰好保持接触"
          : s.completesWithContact
          ? "全程 N≥0"
          : "到达顶部前失去接触",
        explain: s.firstLossAngleDeg === null
          ? "顶部仍可保持接触"
          : "首次 N=0 约在 " + fmt(s.firstLossAngleDeg, 1) + "°",
        formula: "v底,min = √(5gr) = " + fmt(s.minimumBottomSpeedMps, 2) +
          " m/s",
      };
    }
    if (state.mode === "hill") {
      const s = q.hill,
        ratio = state.speed / s.criticalSpeedMps,
        atLimit = Math.abs(state.speed - s.criticalSpeedMps) <=
          Math.max(1e-8, s.criticalSpeedMps * 1e-8);
      return {
        badge: (atLimit ? "临界失重" : s.contact ? "保持接触" : "离开路面") +
          " · " +
          fmt(ratio * 100, 0) + "%",
        cls: atLimit ? "is-limit" : s.contact ? "is-safe" : "is-fail",
        motion: "拱桥顶部",
        required: s.requiredCentripetalN,
        normal: s.normalForceN,
        util: ratio,
        critical: s.criticalSpeedMps,
        nature: atLimit
          ? "N=0，恰好失去接触"
          : s.contact
          ? "N>0，仍受路面支持"
          : "N=0，进入抛体运动",
        explain: "速度增大时支持力 N=mg−mv²/r 持续减小",
        formula: "N = mg−mv²/r = " + fmt(s.normalForceN / 1000, 2) + " kN",
      };
    }
    const s = q.flat;
    const atLimit = Math.abs(s.marginN) <= Math.max(1, s.maxFrictionN * 1e-6);
    return {
      badge: (atLimit ? "临界" : s.safe ? "安全" : "打滑") + " · " +
        fmt(s.utilization * 100, 0) + "%",
      cls: atLimit ? "is-limit" : s.safe ? "is-safe" : "is-fail",
      motion: "平路转弯",
      required: s.requiredForceN,
      normal: s.normalForceN,
      util: s.utilization,
      critical: s.maxSpeedMps,
      nature: atLimit
        ? "静摩擦恰好达到上限 μN"
        : s.safe
        ? "静摩擦仍有余量"
        : "所需摩擦超过 μN",
      explain: atLimit
        ? "再增大速度，轮胎将无法维持圆周运动"
        : s.safe
        ? "实际静摩擦按向心需求自适应，尚未达到 μN"
        : "轮胎无法继续提供所需径向合力",
      formula: "f需=mv²/r=" + fmt(s.requiredForceN / 1000, 2) + " kN",
    };
  }
  function sync() {
    const q = current(),
      d = describe(q),
      mode = modes[state.mode],
      task = guide[state.guideStep];
    R.massValue.textContent = fmt(state.mass, 0) + " kg";
    R.radiusValue.textContent = fmt(state.radius, 0) + " m";
    R.speedValue.textContent = fmt(state.speed, 2) + " m/s";
    R.frictionValue.textContent = fmt(state.mu, 2);
    R.bankValue.textContent = fmt(state.bank, 0) + "°";
    R.playbackValue.textContent = (state.running ? "运行中" : "已暂停") +
      " · " + fmt(state.progress * 100, 0) + "%";
    R.modeTitle.textContent = mode.title;
    R.modeGoal.textContent = mode.goal;
    R.stageHint.textContent = mode.hint;
    R.stateBadge.textContent = d.badge;
    R.stateBadge.className = "state-badge " + d.cls;
    R.motionMetric.textContent = d.motion;
    R.velocityMetricLabel.innerHTML = state.mode === "loop"
      ? "当前位置速度 <i>v</i>"
      : "速度 <i>v</i>";
    R.velocityMetric.textContent = fmt(
      state.mode === "loop" && q.loop.reachesAngle
        ? q.loop.speedMps
        : state.speed,
      2,
    ) + " m/s";
    R.requiredMetric.textContent = fmt(d.required / 1000, 2) + " kN";
    R.normalMetric.textContent = fmt(d.normal / 1000, 2) + " kN";
    R.utilizationMetric.textContent = fmt(d.util * 100, 0) + "%";
    R.criticalMetricLabel.innerHTML = state.mode === "loop"
      ? "最低底速 <i>v₀,min</i>"
      : "临界速度";
    R.criticalMetric.textContent = fmt(d.critical, 2) + " m/s";
    R.criticalNature.textContent = d.nature;
    R.criticalExplanation.textContent = d.explain;
    R.formulaReadout.textContent = d.formula;
    R.frictionSection.hidden = state.mode === "loop" || state.mode === "hill";
    R.bankSection.hidden = state.mode !== "banked";
    R.massLabel.innerHTML = state.mode === "loop"
      ? "乘员质量 <i>m</i>"
      : "车辆质量 <i>m</i>";
    R.speedLabel.innerHTML = state.mode === "loop"
      ? "底部速度 <i>v₀</i>"
      : "车辆速度 <i>v</i>";
    R.demandTitle.textContent = state.mode === "banked"
      ? "所需摩擦-速度"
      : state.mode === "loop"
      ? "顶部支持力-底速"
      : state.mode === "hill"
      ? "向心需求-速度"
      : "摩擦需求-速度";
    R.demandStatus.textContent = state.mode === "loop"
      ? "能量+N≥0"
      : state.mode === "hill"
      ? "N=mg−mv²/r"
      : "需求∝v²";
    R.ledgerTitle.textContent = "径向受力账本";
    R.ledgerStatus.textContent = "ΣFr=mv²/r";
    R.stepIndex.textContent = "0" + (state.guideStep + 1);
    R.stepTitle.textContent = task.title;
    R.stepPrompt.textContent = task.prompt;
    R.playButton.setAttribute("aria-pressed", String(state.running));
    R.sceneTabs.forEach((b) =>
      b.classList.toggle("is-active", b.dataset.mode === state.mode)
    );
    R.routeSteps.forEach((b, i) =>
      b.classList.toggle("is-active", i === state.guideStep)
    );
    R.rates.forEach((b) =>
      b.classList.toggle("is-active", Number(b.dataset.rate) === state.rate)
    );
    [
      R.massInput,
      R.radiusInput,
      R.speedInput,
      R.frictionInput,
      R.bankInput,
      R.progressInput,
    ].forEach(progress);
  }
  function render() {
    drawScene();
    drawDemand();
    drawLedger();
    sync();
  }
  const defaults = {
    flat: { mass: 1200, radius: 40, speed: 14, mu: .55, bank: 20 },
    banked: { mass: 1200, radius: 80, speed: 22, mu: .25, bank: 20 },
    loop: { mass: 60, radius: 12, speed: 26, mu: 0, bank: 0 },
    hill: { mass: 1000, radius: 35, speed: 15, mu: 0, bank: 0 },
  };
  function setMode(mode) {
    state.mode = mode;
    Object.assign(state, defaults[mode]);
    state.progress = 0;
    state.running = false;
    R.massInput.min = mode === "loop" ? 20 : 200;
    R.massInput.max = mode === "loop" ? 200 : 2000;
    R.massInput.step = mode === "loop" ? 5 : 20;
    R.radiusInput.min = mode === "loop" ? 3 : 8;
    R.radiusInput.max = mode === "loop" ? 30 : mode === "banked" ? 200 : 120;
    R.speedInput.max = mode === "banked" ? 55 : mode === "loop" ? 45 : 40;
    R.massInput.value = state.mass;
    R.radiusInput.value = state.radius;
    R.speedInput.value = state.speed;
    R.frictionInput.value = state.mu;
    R.bankInput.value = state.bank;
    R.progressInput.value = 0;
    render();
  }
  function setState(next = {}) {
    [[R.massInput, "mass"], [R.radiusInput, "radius"], [R.speedInput, "speed"], [R.frictionInput, "mu"], [R.bankInput, "bank"]].forEach(([input, key]) => {
      if (next[key] !== undefined) state[key] = M.clamp(next[key], Number(input.min), Number(input.max));
      input.value = state[key];
    });
    if (next.progress !== undefined) state.progress = M.clamp(next.progress, 0, 1);
    if (next.rate !== undefined) state.rate = M.clamp(next.rate, .5, 1);
    if (next.guideStep !== undefined) state.guideStep = M.clamp(Math.round(next.guideStep), 0, guide.length - 1);
    [[R.showForcesToggle, "showForces"], [R.showRadialToggle, "showRadial"], [R.showLimitToggle, "showLimit"], [R.showTrailToggle, "showTrail"], [R.showTheoryToggle, "showTheory"]].forEach(([input, key]) => {
      if (next[key] !== undefined) state[key] = Boolean(next[key]);
      input.checked = state[key];
    });
    if (typeof next.mode === "string" && defaults[next.mode]) state.mode = next.mode;
    state.running = false;
    R.progressInput.value = state.progress;
    render();
  }
  let progressDragging = false;
  function setProgressFromPointer(event) {
    const rect = R.canvas.getBoundingClientRect();
    state.progress = M.clamp((event.clientX - rect.left) / rect.width, 0, 1);
    state.running = false;
    R.progressInput.value = state.progress;
    render();
  }
  R.canvas.addEventListener("pointerdown", (event) => { progressDragging = true; R.canvas.setPointerCapture?.(event.pointerId); setProgressFromPointer(event); });
  R.canvas.addEventListener("pointermove", (event) => { if (progressDragging) setProgressFromPointer(event); });
  R.canvas.addEventListener("pointerup", (event) => { progressDragging = false; if (R.canvas.hasPointerCapture?.(event.pointerId)) R.canvas.releasePointerCapture(event.pointerId); });
  R.canvas.addEventListener("pointercancel", () => { progressDragging = false; });
  R.sceneTabs.forEach((b) =>
    b.addEventListener("click", () => setMode(b.dataset.mode))
  );
  R.routeSteps.forEach((b, i) =>
    b.addEventListener("click", () => {
      state.guideStep = i;
      render();
    })
  );
  [[R.massInput, "mass"], [R.radiusInput, "radius"], [R.speedInput, "speed"], [
    R.frictionInput,
    "mu",
  ], [R.bankInput, "bank"]].forEach(([el, key]) =>
    el.addEventListener("input", () => {
      state[key] = Number(el.value);
      render();
    })
  );
  R.progressInput.addEventListener("input", () => {
    state.progress = Number(R.progressInput.value);
    state.running = false;
    render();
  });
  R.presets.forEach((b) =>
    b.addEventListener("click", () => {
      const p = b.dataset.preset, q = current();
      if (state.mode === "flat") {
        state.speed = p === "safe"
          ? q.flat.maxSpeedMps * .8
          : p === "limit"
          ? q.flat.maxSpeedMps
          : p === "fail"
          ? q.flat.maxSpeedMps * 1.12
          : q.flat.maxSpeedMps;
      } else if (state.mode === "banked") {
        state.speed = p === "ideal"
          ? q.bank.idealSpeedMps
          : p === "safe"
          ? (q.bank.minimumSpeedMps + q.bank.maximumSpeedMps) / 2
          : p === "limit"
          ? q.bank.maximumSpeedMps
          : q.bank.maximumSpeedMps * 1.12;
      } else if (state.mode === "loop") {
        state.speed = p === "safe"
          ? q.loop.minimumBottomSpeedMps * 1.08
          : p === "limit"
          ? q.loop.minimumBottomSpeedMps
          : p === "fail"
          ? q.loop.minimumBottomSpeedMps * .92
          : q.loop.minimumBottomSpeedMps;
      } else {state.speed = p === "safe"
          ? q.hill.criticalSpeedMps * .8
          : p === "limit"
          ? q.hill.criticalSpeedMps
          : p === "fail"
          ? q.hill.criticalSpeedMps * 1.12
          : q.hill.criticalSpeedMps;}
      R.speedInput.value = state.speed;
      render();
    })
  );
  R.rates.forEach((b) =>
    b.addEventListener("click", () => {
      state.rate = Number(b.dataset.rate);
      render();
    })
  );
  R.playButton.addEventListener("click", () => {
    state.running = true;
    state.lastTime = 0;
    render();
  });
  R.pauseButton.addEventListener("click", () => {
    state.running = false;
    render();
  });
  R.keyButton.addEventListener("click", () => {
    const q = current();
    state.speed = state.mode === "flat"
      ? q.flat.maxSpeedMps
      : state.mode === "banked"
      ? q.bank.maximumSpeedMps
      : state.mode === "loop"
      ? q.loop.minimumBottomSpeedMps
      : q.hill.criticalSpeedMps;
    state.progress = state.mode === "loop" ? .5 : 0;
    R.speedInput.value = state.speed;
    R.progressInput.value = state.progress;
    state.running = false;
    render();
  });
  R.resetButton.addEventListener("click", () => setMode(state.mode));
  [
    [R.showForcesToggle, "showForces"],
    [R.showRadialToggle, "showRadial"],
    [R.showLimitToggle, "showLimit"],
    [R.showTrailToggle, "showTrail"],
    [R.showTheoryToggle, "showTheory"],
  ].forEach(([el, key]) =>
    el.addEventListener("change", () => {
      state[key] = el.checked;
      render();
    })
  );
  R.guideButton.addEventListener("click", () => R.guideDialog.showModal());
  R.stepButton.addEventListener("click", () => {
    state.guideStep = (state.guideStep + 1) % guide.length;
    render();
  });
  R.focusButton.addEventListener("click", () => {
    document.body.classList.toggle("focus-mode");
    R.focusButton.setAttribute(
      "aria-pressed",
      String(document.body.classList.contains("focus-mode")),
    );
  });
  R.fullscreenButton.addEventListener("click", () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else document.exitFullscreen?.();
  });
  function frame(t) {
    if (state.running) {
      if (!state.lastTime) state.lastTime = t;
      state.progress += (t - state.lastTime) / 1000 * state.rate * .18;
      state.lastTime = t;
      if (state.progress >= 1) state.progress = 0;
      R.progressInput.value = state.progress;
      render();
    }
    requestAnimationFrame(frame);
  }
  window.circularCriticalLab = { getState: () => ({ ...state }), setState, setMode, solve: current };
  window.addEventListener("resize", render);
  render();
  requestAnimationFrame(frame);
})();
