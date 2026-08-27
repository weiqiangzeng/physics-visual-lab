(function () {
  "use strict";
  const M = window.ForceCompositionModel;
  if (!M) throw new Error("ForceCompositionModel is required");

  const MODES = {
    compose: ["正向合成", "拖动 F₁、F₂ 端点，观察两分力怎样共同决定合力"],
    decompose: ["逆向分解", "固定合力与两条方向，用分量方程反求两个分力"],
    apparatus: ["实验装置", "拖动两支测力计，读取平衡力并检查圆环闭合残差"],
    boundary: ["模型边界", "拖动目标 R 或两条方向，观察角度误差怎样被放大"],
  };
  const STEPS = [
    ["先做几何闭合", "为什么两个力不能只把大小直接相加，而必须同时保留方向？"],
    ["再解逆问题", "给定合力后，还必须补充什么条件才能得到唯一的两个分力？"],
    ["最后检查边界", "为什么两条分力方向越接近，测角误差造成的分力波动越大？"],
  ];
  const PRESETS = {
    345: { mode: "compose", force1N: 6, force2N: 8, direction1Deg: 0, direction2Deg: 90, targetForceN: 10, targetDirectionDeg: 53.13010235415598 },
    symmetric: { mode: "decompose", force1N: 6, force2N: 6, direction1Deg: 25, direction2Deg: 155, targetForceN: 8, targetDirectionDeg: 90 },
    collinear: { mode: "boundary", force1N: 5, force2N: 5, direction1Deg: 30, direction2Deg: 31, targetForceN: 10, targetDirectionDeg: 30.5, angleResolutionDeg: .5 },
  };
  const state = {
    mode: "compose", force1N: 6, force2N: 8, direction1Deg: 0, direction2Deg: 90,
    targetForceN: 10, targetDirectionDeg: 53.13010235415598, forceResolutionN: .1,
    angleResolutionDeg: .5, readingNoise: .25, seed: 41, guideStep: 0,
    showComponents: true, showParallelogram: true, showValues: true, showUncertainty: true, dragging: false, dragRole: null,
  };
  const $ = (id) => document.getElementById(id);
  const R = {
    main: $("forceCanvas"), response: $("responseChart"), evidence: $("evidenceChart"),
    force1: $("force1Input"), force2: $("force2Input"), direction1: $("direction1Input"), direction2: $("direction2Input"), target: $("targetInput"), targetDirection: $("targetDirectionInput"),
    forceResolution: $("forceResolutionInput"), angleResolution: $("angleResolutionInput"), noise: $("noiseInput"), seed: $("seedInput"),
    force1Value: $("force1Value"), force2Value: $("force2Value"), direction1Value: $("direction1Value"), direction2Value: $("direction2Value"), targetValue: $("targetValue"), targetDirectionValue: $("targetDirectionValue"),
    forceResolutionValue: $("forceResolutionValue"), angleResolutionValue: $("angleResolutionValue"), noiseValue: $("noiseValue"), seedValue: $("seedValue"),
    force1Metric: $("force1Metric"), force2Metric: $("force2Metric"), resultantMetric: $("resultantMetric"), angleMetric: $("angleMetric"), closureMetric: $("closureMetric"), conditionMetric: $("conditionMetric"),
    modeTitle: $("modeTitle"), modeGoal: $("modeGoal"), interactionHint: $("interactionModeHint"), stageHint: document.querySelector(".drag-hint"), badge: $("stateBadge"), nature: $("natureText"), explanation: $("explanationText"),
    dataKicker: $("dataKicker"), dataTitle: $("dataTitle"), dataStatus: $("dataStatus"), evidenceKicker: $("evidenceKicker"), evidenceTitle: $("evidenceTitle"), evidenceStatus: $("evidenceStatus"),
    stepIndex: $("stepIndex"), stepTitle: $("stepTitle"), stepPrompt: $("stepPrompt"), formula: $("formulaReadout"),
    components: $("showComponentsToggle"), parallelogram: $("showParallelogramToggle"), values: $("showValuesToggle"), uncertainty: $("showUncertaintyToggle"),
    tabs: [...document.querySelectorAll(".scene-tab[data-mode]")], route: [...document.querySelectorAll(".route-step")], presets: [...document.querySelectorAll(".preset-button")],
    reset: $("resetButton"), guide: $("guideButton"), step: $("stepButton"), focus: $("focusButton"), fullscreen: $("fullscreenButton"), dialog: $("guideDialog"),
  };
  const ctx = R.main.getContext("2d"), rctx = R.response.getContext("2d"), ectx = R.evidence.getContext("2d");
  const C = { bg: "#070b0c", grid: "rgba(223,229,223,.045)", text: "#dfe5df", muted: "#7f8d86", cyan: "#63cfda", amber: "#f2bd5a", violet: "#b991e8", green: "#76d6a0", red: "#ff7f72" };
  const clamp = M.clamp;
  const fmt = (value, digits = 2) => Number.isFinite(value) ? Number(value).toFixed(digits) : "—";
  const rad = (degrees) => degrees * M.DEG;

  function size(canvas, context, minHeight = 180) {
    const box = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    const width = Math.max(280, Math.round(box.width)), height = Math.max(minHeight, Math.round(box.height));
    if (canvas.width !== width * dpr || canvas.height !== height * dpr) { canvas.width = width * dpr; canvas.height = height * dpr; }
    context.setTransform(dpr, 0, 0, dpr, 0, 0); return { width, height };
  }
  function line(context, x1, y1, x2, y2, color, width = 1, dash = []) { context.save(); context.strokeStyle = color; context.lineWidth = width; context.setLineDash(dash); context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke(); context.restore(); }
  function text(context, value, x, y, color = C.text, px = 9, align = "left", weight = 600) { context.fillStyle = color; context.font = `${weight} ${px}px ui-sans-serif,system-ui`; context.textAlign = align; context.fillText(value, x, y); }
  function background(context, width, height) { context.fillStyle = C.bg; context.fillRect(0, 0, width, height); for (let x = 16; x < width; x += 42) line(context, x, 0, x, height, C.grid); for (let y = 16; y < height; y += 42) line(context, 0, y, width, y, C.grid); }
  function axes(context, viewport, xmin, xmax, ymin, ymax) { const p = { l: 43, r: 14, t: 20, b: 29 }; const x = (v) => p.l + (v - xmin) / (xmax - xmin || 1) * (viewport.width - p.l - p.r); const y = (v) => viewport.height - p.b - (v - ymin) / (ymax - ymin || 1) * (viewport.height - p.t - p.b); line(context, p.l, p.t, p.l, viewport.height - p.b, "rgba(223,229,223,.28)"); line(context, p.l, viewport.height - p.b, viewport.width - p.r, viewport.height - p.b, "rgba(223,229,223,.28)"); return { x, y }; }
  function range(element, value) { element.value = value; element.style.setProperty("--range-progress", `${(value - +element.min) / (+element.max - +element.min) * 100}%`); }
  function arrow(context, origin, vector, scale, color, label, dashed = false) {
    const end = { x: origin.x + vector.x * scale, y: origin.y - vector.y * scale };
    line(context, origin.x, origin.y, end.x, end.y, color, 2.6, dashed ? [6, 4] : []);
    const a = Math.atan2(end.y - origin.y, end.x - origin.x), h = 10;
    context.fillStyle = color; context.beginPath(); context.moveTo(end.x, end.y); context.lineTo(end.x - h * Math.cos(a - .42), end.y - h * Math.sin(a - .42)); context.lineTo(end.x - h * Math.cos(a + .42), end.y - h * Math.sin(a + .42)); context.closePath(); context.fill();
    if (label && state.showValues) text(context, label, end.x + 7 * Math.cos(a - 1.1), end.y + 7 * Math.sin(a - 1.1), color, 9, "left", 700);
    return end;
  }
  function arcDirection(context, origin, angleDeg, radius, color) { context.save(); context.strokeStyle = color; context.lineWidth = 1.2; context.beginPath(); context.arc(origin.x, origin.y, radius, 0, -rad(angleDeg), angleDeg > 0); context.stroke(); context.restore(); }

  function current() {
    if (state.mode === "compose") return { kind: "compose", result: M.compose(state) };
    if (state.mode === "apparatus") return { kind: "apparatus", result: M.apparatus(state) };
    return { kind: "decompose", result: M.decompose(state), sensitivity: M.sensitivity(state) };
  }
  function pointAt(origin, angleDeg, radius) { return { x: origin.x + Math.cos(rad(angleDeg)) * radius, y: origin.y - Math.sin(rad(angleDeg)) * radius }; }
  function endpoint(origin, vector, scale) { return { x: origin.x + vector.x * scale, y: origin.y - vector.y * scale }; }
  function mainGeometry(solution, viewport) {
    const origin = { x: viewport.width * .42, y: viewport.height * .57 }, q = solution.result;
    const f1 = solution.kind === "decompose" ? q.force1 : solution.kind === "apparatus" ? q.measured.force1 : q.force1;
    const f2 = solution.kind === "decompose" ? q.force2 : solution.kind === "apparatus" ? q.measured.force2 : q.force2;
    const resultant = solution.kind === "decompose" ? q.target : solution.kind === "apparatus" ? q.measured.resultant : q.resultant;
    const maximum = Math.max(1, Math.abs(f1?.x || 0), Math.abs(f1?.y || 0), Math.abs(f2?.x || 0), Math.abs(f2?.y || 0), Math.hypot(resultant?.x || 0, resultant?.y || 0));
    const scale = Math.min(viewport.width * .3, viewport.height * .34) / maximum;
    const f1End = endpoint(origin, f1, scale), f2End = endpoint(origin, f2, scale), resultEnd = endpoint(origin, resultant, scale);
    const handleRadius = Math.max(58, Math.min(viewport.width, viewport.height) * .16);
    return { viewport, origin, scale, f1, f2, resultant, f1End, f2End, resultEnd,
      handles: solution.kind === "decompose" ? {
        target: resultEnd,
        direction1: pointAt(origin, state.direction1Deg, handleRadius),
        direction2: pointAt(origin, state.direction2Deg, handleRadius + 20),
      } : { force1: f1End, force2: f2End } };
  }
  function drawHandle(point, color, label, active) {
    ctx.save(); ctx.strokeStyle = active ? C.text : color; ctx.lineWidth = active ? 2.5 : 1.5;
    ctx.fillStyle = active ? color : "rgba(7,11,12,.9)"; ctx.beginPath(); ctx.arc(point.x, point.y, active ? 10 : 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = `${color}99`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(point.x, point.y, 14, 0, Math.PI * 2); ctx.stroke();
    text(ctx, label, point.x + 17, point.y - 10, active ? C.text : color, 9, "left", 700); ctx.restore();
  }
  function drawSpringScale(origin, end, color) {
    const dx = end.x - origin.x, dy = end.y - origin.y, length = Math.hypot(dx, dy);
    if (length < 24) return;
    const angle = Math.atan2(dy, dx), bodyCenter = { x: origin.x + dx * .43, y: origin.y + dy * .43 };
    ctx.save(); ctx.translate(bodyCenter.x, bodyCenter.y); ctx.rotate(angle);
    ctx.strokeStyle = `${color}aa`; ctx.lineWidth = 1.2; ctx.fillStyle = "rgba(11,17,17,.94)";
    ctx.beginPath(); ctx.rect(-26, -8, 52, 16); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = `${color}70`; ctx.lineWidth = 1;
    for (let tick = -16; tick <= 16; tick += 8) line(ctx, tick, -5, tick, 5, `${color}70`, 1);
    ctx.restore();
    line(ctx, origin.x, origin.y, bodyCenter.x - Math.cos(angle) * 27, bodyCenter.y - Math.sin(angle) * 27, `${color}70`, 1.2);
    line(ctx, bodyCenter.x + Math.cos(angle) * 27, bodyCenter.y + Math.sin(angle) * 27, end.x, end.y, `${color}70`, 1.2);
  }
  function drawMain(solution) {
    const viewport = size(R.main, ctx, 280); background(ctx, viewport.width, viewport.height);
    const geometry = mainGeometry(solution, viewport); state.mainGeometry = geometry;
    const { origin, scale, f1, f2, resultant } = geometry, q = solution.result;
    line(ctx, 24, origin.y, viewport.width - 24, origin.y, "rgba(223,229,223,.16)"); line(ctx, origin.x, 24, origin.x, viewport.height - 24, "rgba(223,229,223,.16)");
    text(ctx, "+x", viewport.width - 30, origin.y - 7, C.muted); text(ctx, "+y", origin.x + 7, 31, C.muted);
    if (state.showComponents && resultant) { line(ctx, origin.x, origin.y, origin.x + resultant.x * scale, origin.y, "rgba(242,189,90,.45)", 1, [4,4]); line(ctx, origin.x + resultant.x * scale, origin.y, origin.x + resultant.x * scale, origin.y - resultant.y * scale, "rgba(242,189,90,.45)", 1, [4,4]); }
    if (state.showParallelogram && f1 && f2) { const p1 = geometry.f1End, p2 = geometry.f2End; line(ctx, p1.x, p1.y, p1.x + f2.x * scale, p1.y - f2.y * scale, "rgba(185,145,232,.55)", 1.4, [5,4]); line(ctx, p2.x, p2.y, p2.x + f1.x * scale, p2.y - f1.y * scale, "rgba(185,145,232,.55)", 1.4, [5,4]); }
    if (solution.kind === "apparatus") { drawSpringScale(origin, geometry.f1End, C.violet); drawSpringScale(origin, geometry.f2End, C.cyan); text(ctx, "两支测力计共同拉住同一圆环", 18, 28, C.muted, 10, "left", 700); }
    if (Number.isFinite(f1?.x)) arrow(ctx, origin, f1, scale, C.violet, `F₁ ${fmt(Math.hypot(f1.x,f1.y),1)}N`);
    if (Number.isFinite(f2?.x)) arrow(ctx, origin, f2, scale, C.cyan, `F₂ ${fmt(Math.hypot(f2.x,f2.y),1)}N`);
    if (resultant) arrow(ctx, origin, resultant, scale, C.amber, `${solution.kind === "decompose" ? "目标 R" : "R"} ${fmt(Math.hypot(resultant.x,resultant.y),1)}N`);
    if (solution.kind === "apparatus") {
      arrow(ctx, origin, q.balancing, scale, C.green, `平衡力 ${fmt(q.measuredResultantN,1)}N`);
      ctx.strokeStyle = C.text; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(origin.x, origin.y, 13, 0, Math.PI * 2); ctx.stroke();
      text(ctx, `仪器闭合残差 ${fmt(q.closureResidualN,3)} N`, 18, 47, q.closureResidualN < state.forceResolutionN ? C.green : C.red, 10, "left", 700);
    } else if (solution.kind === "decompose" && state.showUncertainty) {
      const targetLow = M.vector(state.targetForceN, state.targetDirectionDeg - state.angleResolutionDeg), targetHigh = M.vector(state.targetForceN, state.targetDirectionDeg + state.angleResolutionDeg);
      arrow(ctx, origin, targetLow, scale, "rgba(242,189,90,.28)", "", true); arrow(ctx, origin, targetHigh, scale, "rgba(242,189,90,.28)", "", true);
    }
    arcDirection(ctx, origin, state.direction1Deg, 28, C.violet); arcDirection(ctx, origin, state.direction2Deg, 42, C.cyan);
    if (solution.kind === "decompose") {
      drawHandle(geometry.handles.target, C.amber, "R", state.dragRole === "target");
      drawHandle(geometry.handles.direction1, C.violet, "θ₁", state.dragRole === "direction1");
      drawHandle(geometry.handles.direction2, C.cyan, "θ₂", state.dragRole === "direction2");
    } else {
      drawHandle(geometry.handles.force1, C.violet, "F₁", state.dragRole === "force1");
      drawHandle(geometry.handles.force2, C.cyan, "F₂", state.dragRole === "force2");
    }
    text(ctx, solution.kind === "decompose" ? "拖动 R 改变目标，拖动 θ₁ / θ₂ 改变分解方向" : "拖动 F₁ / F₂ 端点：同时改变大小与方向", 16, viewport.height - 10, C.muted, 8);
  }

  function drawResponse(solution) {
    const viewport = size(R.response, rctx); background(rctx, viewport.width, viewport.height);
    if (state.mode === "compose" || state.mode === "apparatus") {
      const points = Array.from({ length: 181 }, (_, i) => { const angle = i; const result = M.compose({ ...state, direction1Deg: 0, direction2Deg: angle }); return { angle, value: result.resultantN }; });
      const ymax = state.force1N + state.force2N || 1, a = axes(rctx, viewport, 0, 180, 0, ymax * 1.08);
      rctx.strokeStyle = C.cyan; rctx.lineWidth = 2; rctx.beginPath(); points.forEach((p,i) => i ? rctx.lineTo(a.x(p.angle),a.y(p.value)) : rctx.moveTo(a.x(p.angle),a.y(p.value))); rctx.stroke();
      const delta = Math.abs(M.directionSeparation(state.direction1Deg,state.direction2Deg)); const value = M.compose(state).resultantN; line(rctx,a.x(delta),a.y(0),a.x(delta),a.y(value),C.amber,1.5,[4,4]);
      text(rctx,"R/N",7,13,C.cyan); text(rctx,"夹角/°",viewport.width-8,viewport.height-6,C.muted,8,"right");
    } else {
      const low = Math.min(state.direction1Deg,state.direction2Deg), high = Math.max(state.direction1Deg,state.direction2Deg), span = Math.max(1,high-low);
      const points = Array.from({length:121},(_,i)=>M.decompose({...state,targetDirectionDeg:low+span*i/120}));
      const ymax = Math.max(state.targetForceN, ...points.flatMap(p=>[p.force1N,p.force2N]).filter(v=>Number.isFinite(v)&&v<100)) * 1.1;
      const a=axes(rctx,viewport,low,high,0,ymax); [["force1N",C.violet],["force2N",C.cyan]].forEach(([key,color])=>{rctx.strokeStyle=color;rctx.lineWidth=2;rctx.beginPath();points.forEach((p,i)=>{const y=clamp(p[key],0,ymax);i?rctx.lineTo(a.x(p.targetDirectionDeg),a.y(y)):rctx.moveTo(a.x(p.targetDirectionDeg),a.y(y));});rctx.stroke();});
      line(rctx,a.x(state.targetDirectionDeg),a.y(0),a.x(state.targetDirectionDeg),a.y(ymax),C.amber,1,[4,4]); text(rctx,"F/N",7,13,C.violet); text(rctx,"目标方向/°",viewport.width-8,viewport.height-6,C.muted,8,"right");
    }
  }
  function drawEvidence(solution) {
    const viewport=size(R.evidence,ectx); background(ectx,viewport.width,viewport.height);
    if (state.mode === "boundary") {
      const points=Array.from({length:160},(_,i)=>{const separation=.5+i*179/159;return {separation,condition:M.decompose({...state,direction2Deg:state.direction1Deg+separation}).conditionNumber};});
      const a=axes(ectx,viewport,.5,180,0,120); ectx.strokeStyle=C.red;ectx.lineWidth=2;ectx.beginPath();points.forEach((p,i)=>i?ectx.lineTo(a.x(p.separation),a.y(Math.min(120,p.condition))):ectx.moveTo(a.x(p.separation),a.y(Math.min(120,p.condition))));ectx.stroke();
      const sep=Math.abs(M.directionSeparation(state.direction1Deg,state.direction2Deg)); line(ectx,a.x(sep),a.y(0),a.x(sep),a.y(Math.min(120,solution.result.conditionNumber)),C.amber,1.5,[4,4]); text(ectx,"条件数",7,13,C.red);text(ectx,"方向夹角/°",viewport.width-8,viewport.height-6,C.muted,8,"right"); return;
    }
    const q=solution.result; const f1=solution.kind==="decompose"?q.force1:solution.kind==="apparatus"?q.measured.force1:q.force1; const f2=solution.kind==="decompose"?q.force2:solution.kind==="apparatus"?q.measured.force2:q.force2; const target=solution.kind==="decompose"?q.target:solution.kind==="apparatus"?q.measured.resultant:q.resultant;
    const values=[f1.x,f2.x,target.x,f1.y,f2.y,target.y]; const max=Math.max(1,...values.map(Math.abs))*1.2; const a=axes(ectx,viewport,0,7,-max,max); line(ectx,a.x(0),a.y(0),a.x(7),a.y(0),C.muted,1);
    values.forEach((value,index)=>{const x=a.x(index+1);line(ectx,x,a.y(0),x,a.y(value),index%3===2?C.amber:index%3===0?C.violet:C.cyan,12);text(ectx,["F₁x","F₂x","Rx","F₁y","F₂y","Ry"][index],x,viewport.height-10,C.muted,8,"center");}); text(ectx,"分量/N",7,13,C.violet);
  }

  function pointerPoint(event) {
    const box = R.main.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  }
  function hitTest(point) {
    const geometry = state.mainGeometry;
    if (!geometry) return null;
    const entries = state.mode === "decompose" || state.mode === "boundary"
      ? [["target", geometry.handles.target], ["direction1", geometry.handles.direction1], ["direction2", geometry.handles.direction2]]
      : [["force1", geometry.handles.force1], ["force2", geometry.handles.force2]];
    const threshold = 24;
    return entries.map(([role, handle]) => ({ role, distance: Math.hypot(point.x - handle.x, point.y - handle.y) }))
      .filter((entry) => entry.distance <= threshold).sort((a, b) => a.distance - b.distance)[0]?.role || null;
  }
  function applyDrag(event) {
    const geometry = state.mainGeometry;
    if (!geometry || !state.dragRole) return;
    const point = pointerPoint(event), dx = point.x - geometry.origin.x, dy = geometry.origin.y - point.y;
    const angle = clamp(Math.atan2(dy, dx) / M.DEG, -170, 170);
    const magnitude = clamp(Math.hypot(dx, dy) / geometry.scale, 0, 20);
    if (state.dragRole === "force1") { state.force1N = magnitude; state.direction1Deg = angle; }
    if (state.dragRole === "force2") { state.force2N = magnitude; state.direction2Deg = angle; }
    if (state.dragRole === "target") { state.targetForceN = clamp(magnitude, .5, 20); state.targetDirectionDeg = angle; }
    if (state.dragRole === "direction1") state.direction1Deg = angle;
    if (state.dragRole === "direction2") state.direction2Deg = angle;
    render();
  }

  function render() {
    const solution=current(), q=solution.result;
    [[R.force1,state.force1N],[R.force2,state.force2N],[R.direction1,state.direction1Deg],[R.direction2,state.direction2Deg],[R.target,state.targetForceN],[R.targetDirection,state.targetDirectionDeg],[R.forceResolution,state.forceResolutionN],[R.angleResolution,state.angleResolutionDeg],[R.noise,state.readingNoise],[R.seed,state.seed]].forEach(([el,v])=>range(el,v));
    R.force1Value.textContent=`${fmt(state.force1N,1)} N`;R.force2Value.textContent=`${fmt(state.force2N,1)} N`;R.direction1Value.textContent=`${fmt(state.direction1Deg,1)}°`;R.direction2Value.textContent=`${fmt(state.direction2Deg,1)}°`;R.targetValue.textContent=`${fmt(state.targetForceN,1)} N`;R.targetDirectionValue.textContent=`${fmt(state.targetDirectionDeg,1)}°`;R.forceResolutionValue.textContent=`${fmt(state.forceResolutionN,2)} N`;R.angleResolutionValue.textContent=`${fmt(state.angleResolutionDeg,2)}°`;R.noiseValue.textContent=`${fmt(state.readingNoise*100,0)}%`;R.seedValue.textContent=String(state.seed);
    const f1=solution.kind==="decompose"?q.force1N:solution.kind==="apparatus"?q.measuredForce1N:state.force1N, f2=solution.kind==="decompose"?q.force2N:solution.kind==="apparatus"?q.measuredForce2N:state.force2N;
    const resultN=solution.kind==="decompose"?state.targetForceN:solution.kind==="apparatus"?q.measuredResultantN:q.resultantN, angle=solution.kind==="decompose"?state.targetDirectionDeg:solution.kind==="apparatus"?q.measuredResultantDirectionDeg:q.resultantDirectionDeg;
    const closure=solution.kind==="compose"?Math.hypot(q.componentResidualX,q.componentResidualY):q.closureResidualN, condition=solution.kind==="compose"?1:M.decompose(state).conditionNumber;
    R.force1Metric.textContent=`${fmt(f1,2)} N`;R.force2Metric.textContent=`${fmt(f2,2)} N`;R.resultantMetric.textContent=`${fmt(resultN,2)} N`;R.angleMetric.textContent=`${fmt(angle,2)}°`;R.closureMetric.textContent=`${fmt(closure,3)} N`;R.conditionMetric.textContent=condition>999?">999":fmt(condition,2);
    const invalid=solution.kind==="decompose"&&!q.validTensions, unstable=condition>20;
    R.badge.textContent=invalid?"绳张力不可实现":unstable?"误差高度放大":state.mode==="apparatus"?"有限精度闭合":"矢量闭合";R.badge.className=`state-badge${invalid||unstable?" is-warning":""}`;
    R.nature.textContent=invalid?"目标方向超出两条拉力的可实现扇区":unstable?"当前分解几何处于病态区":state.mode==="apparatus"?"仪器读数存在有限闭合残差":"两分力与合力满足矢量闭合";
    R.explanation.textContent=invalid?"负解意味着其中一条绳必须推圆环，而绳不能提供推力":unstable?`条件数 ${fmt(condition,1)}：微小测角误差会被显著放大`:state.mode==="apparatus"?"改变分度值与实验编号，比较重复读数":"合力由 x、y 分量分别相加得到";
    const labRoot = document.querySelector(".force-composition-lab");
    if (labRoot) labRoot.dataset.mode = state.mode;
    R.modeTitle.textContent=MODES[state.mode][0];R.modeGoal.textContent=MODES[state.mode][1];
    R.interactionHint.textContent=state.mode==="decompose"||state.mode==="boundary"?"画布可拖动 R、θ₁、θ₂": "画布可拖动 F₁、F₂";
    R.stageHint.textContent=state.mode==="apparatus"?"拖动两支测力计端点":state.mode==="decompose"||state.mode==="boundary"?"拖动 R、θ₁、θ₂": "拖动 F₁、F₂ 端点";
    R.tabs.forEach(b=>b.classList.toggle("is-active",b.dataset.mode===state.mode));R.route.forEach((b,i)=>b.classList.toggle("is-active",i===state.guideStep));
    R.stepIndex.textContent=String(state.guideStep+1).padStart(2,"0");R.stepTitle.textContent=STEPS[state.guideStep][0];R.stepPrompt.textContent=STEPS[state.guideStep][1];R.formula.textContent=state.mode==="compose"?"R=F₁+F₂":state.mode==="apparatus"?"F₁+F₂+F₃≈0":"[F₁ F₂]·c=R";
    if(state.mode==="compose"||state.mode==="apparatus"){R.dataKicker.textContent="ANGLE RESPONSE";R.dataTitle.textContent="夹角改变时的合力";R.dataStatus.textContent=`R=${fmt(resultN,2)}N`;R.evidenceKicker.textContent="COMPONENT LEDGER";R.evidenceTitle.textContent="x / y 分量账本";R.evidenceStatus.textContent=`残差 ${fmt(closure,3)}N`;}
    else if(state.mode==="boundary"){R.dataKicker.textContent="INVERSE RESPONSE";R.dataTitle.textContent="目标方向改变时的分力";R.dataStatus.textContent=`波动 ${fmt(solution.sensitivity.spreadN,2)}N`;R.evidenceKicker.textContent="GEOMETRY CONDITION";R.evidenceTitle.textContent="方向夹角与误差放大";R.evidenceStatus.textContent=`κ=${condition>999?">999":fmt(condition,1)}`;}
    else{R.dataKicker.textContent="INVERSE RESPONSE";R.dataTitle.textContent="目标方向改变时的分力";R.dataStatus.textContent=invalid?"存在负拉力":`F₁=${fmt(f1,2)}N`;R.evidenceKicker.textContent="COMPONENT CLOSURE";R.evidenceTitle.textContent="逆向分解的分量闭合";R.evidenceStatus.textContent=`κ=${fmt(condition,2)}`;}
    drawMain(solution);drawResponse(solution);drawEvidence(solution);
  }
  function setMode(mode){if(!MODES[mode])return;state.mode=mode;if(mode==="boundary"&&Math.abs(M.directionSeparation(state.direction1Deg,state.direction2Deg))>8)Object.assign(state,PRESETS.collinear);render();}
  function reset(){Object.assign(state,{mode:"compose",force1N:6,force2N:8,direction1Deg:0,direction2Deg:90,targetForceN:10,targetDirectionDeg:53.13010235415598,forceResolutionN:.1,angleResolutionDeg:.5,readingNoise:.25,seed:41,guideStep:0,showComponents:true,showParallelogram:true,showValues:true,showUncertainty:true,dragging:false,dragRole:null});[[R.components,"showComponents"],[R.parallelogram,"showParallelogram"],[R.values,"showValues"],[R.uncertainty,"showUncertainty"]].forEach(([el,key])=>el.checked=state[key]);render();}
  function setState(next={}){if(MODES[next.mode])state.mode=next.mode;Object.assign(state,M.normalize({...state,...next}));if(Number.isFinite(+next.guideStep))state.guideStep=Math.round(clamp(+next.guideStep,0,2));["showComponents","showParallelogram","showValues","showUncertainty"].forEach(key=>{if(typeof next[key]==="boolean")state[key]=next[key];});state.dragging=false;state.dragRole=null;render();}
  [[R.force1,"force1N"],[R.force2,"force2N"],[R.direction1,"direction1Deg"],[R.direction2,"direction2Deg"],[R.target,"targetForceN"],[R.targetDirection,"targetDirectionDeg"],[R.forceResolution,"forceResolutionN"],[R.angleResolution,"angleResolutionDeg"],[R.noise,"readingNoise"],[R.seed,"seed"]].forEach(([el,key])=>el.addEventListener("input",()=>{state[key]=+el.value;render();}));
  [[R.components,"showComponents"],[R.parallelogram,"showParallelogram"],[R.values,"showValues"],[R.uncertainty,"showUncertainty"]].forEach(([el,key])=>el.addEventListener("change",()=>{state[key]=el.checked;render();}));
  R.tabs.forEach(b=>b.addEventListener("click",()=>setMode(b.dataset.mode)));R.route.forEach((b,i)=>b.addEventListener("click",()=>{state.guideStep=i;render();}));R.presets.forEach(b=>b.addEventListener("click",()=>{Object.assign(state,PRESETS[b.dataset.preset]);render();}));
  R.reset.addEventListener("click",reset);R.guide.addEventListener("click",()=>R.dialog.showModal());R.step.addEventListener("click",()=>{state.guideStep=(state.guideStep+1)%3;render();});R.focus.addEventListener("click",()=>{const active=document.body.classList.toggle("focus-mode");R.focus.setAttribute("aria-pressed",String(active));});R.fullscreen.addEventListener("click",()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen());
  R.main.addEventListener("pointerdown",event=>{const role=hitTest(pointerPoint(event));if(!role)return;state.dragRole=role;state.dragging=true;R.main.classList.add("is-dragging");R.main.setPointerCapture?.(event.pointerId);applyDrag(event);});
  R.main.addEventListener("pointermove",event=>{if(state.dragging)applyDrag(event);else R.main.style.cursor=hitTest(pointerPoint(event))?"grab":"crosshair";});
  R.main.addEventListener("pointerup",()=>{state.dragging=false;state.dragRole=null;R.main.classList.remove("is-dragging");render();});
  R.main.addEventListener("pointercancel",()=>{state.dragging=false;state.dragRole=null;R.main.classList.remove("is-dragging");render();});
  window.addEventListener("resize",render);
  window.forceCompositionLab={compose:M.compose,decompose:M.decompose,apparatus:M.apparatus,sensitivity:M.sensitivity,workEquivalence:M.workEquivalence,getState:()=>({...state}),getInteractionGeometry:()=>state.mainGeometry?{origin:state.mainGeometry.origin,scale:state.mainGeometry.scale,handles:state.mainGeometry.handles}:null,setState,setMode,reset};render();
})();
