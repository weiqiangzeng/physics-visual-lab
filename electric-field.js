(function () {
  "use strict";

  const model = window.ElectricFieldModel;
  if (!model) throw new Error("ElectricFieldModel is required");

  const refs = {
    canvas: document.getElementById("fieldCanvas"),
    profileChart: document.getElementById("profileChart"),
    vectorChart: document.getElementById("vectorChart"),
    source1Input: document.getElementById("source1Input"),
    source2Input: document.getElementById("source2Input"),
    separationInput: document.getElementById("separationInput"),
    uniformInput: document.getElementById("uniformInput"),
    testChargeInput: document.getElementById("testChargeInput"),
    progressInput: document.getElementById("progressInput"),
    source1Value: document.getElementById("source1Value"),
    source2Value: document.getElementById("source2Value"),
    separationValue: document.getElementById("separationValue"),
    uniformValue: document.getElementById("uniformValue"),
    testChargeValue: document.getElementById("testChargeValue"),
    testChargeNote: document.getElementById("testChargeNote"),
    progressValue: document.getElementById("progressValue"),
    progressLabel: document.getElementById("progressLabel"),
    source1Section: document.getElementById("source1Section"),
    source2Section: document.getElementById("source2Section"),
    separationSection: document.getElementById("separationSection"),
    uniformSection: document.getElementById("uniformSection"),
    pathSection: document.getElementById("pathSection"),
    playButton: document.getElementById("playButton"),
    pauseButton: document.getElementById("pauseButton"),
    keyButton: document.getElementById("keyButton"),
    resetButton: document.getElementById("resetButton"),
    guideButton: document.getElementById("guideButton"),
    stepButton: document.getElementById("stepButton"),
    focusButton: document.getElementById("focusButton"),
    fullscreenButton: document.getElementById("fullscreenButton"),
    guideDialog: document.getElementById("guideDialog"),
    modeTitle: document.getElementById("modeTitle"),
    modeGoal: document.getElementById("modeGoal"),
    stateBadge: document.getElementById("stateBadge"),
    stageHint: document.getElementById("stageHint"),
    fieldMetric: document.getElementById("fieldMetric"),
    directionMetric: document.getElementById("directionMetric"),
    potentialMetric: document.getElementById("potentialMetric"),
    forceMetric: document.getElementById("forceMetric"),
    energyMetric: document.getElementById("energyMetric"),
    motionDirectionMetric: document.getElementById("motionDirectionMetric"),
    energyDeltaMetric: document.getElementById("energyDeltaMetric"),
    fieldNature: document.getElementById("fieldNature"),
    fieldExplanation: document.getElementById("fieldExplanation"),
    profileKicker: document.getElementById("profileKicker"),
    profileTitle: document.getElementById("profileTitle"),
    profileStatus: document.getElementById("profileStatus"),
    vectorKicker: document.getElementById("vectorKicker"),
    vectorTitle: document.getElementById("vectorTitle"),
    vectorStatus: document.getElementById("vectorStatus"),
    highlightPotentialLabel: document.getElementById("highlightPotentialLabel"),
    fieldInteractionHint: document.getElementById("fieldInteractionHint"),
    fieldColorLegend: document.querySelector(".field-color-legend"),
    motionTimeLabel: document.getElementById("motionTimeLabel"),
    stepIndex: document.getElementById("stepIndex"),
    stepTitle: document.getElementById("stepTitle"),
    stepPrompt: document.getElementById("stepPrompt"),
    formulaReadout: document.getElementById("formulaReadout"),
    showFieldLinesToggle: document.getElementById("showFieldLinesToggle"),
    showVectorsToggle: document.getElementById("showVectorsToggle"),
    showEquipotentialToggle: document.getElementById("showEquipotentialToggle"),
    showForceToggle: document.getElementById("showForceToggle"),
    showPotentialMapToggle: document.getElementById("showPotentialMapToggle"),
    sceneTabs: [...document.querySelectorAll("[data-mode]")],
    routeSteps: [...document.querySelectorAll(".route-step")],
    pathButtons: [...document.querySelectorAll("[data-path]")],
    presetButtons: [...document.querySelectorAll("[data-preset]")],
    rateButtons: [...document.querySelectorAll("[data-rate]")]
    ,polarityButtons: [...document.querySelectorAll("[data-charge-sign]")]
  };

  const COLORS = {
    background: "#0b0f0e",
    grid: "rgba(138,151,143,.12)",
    text: "#dce5df",
    muted: "#7e8b83",
    positive: "#ff7468",
    negative: "#7392ff",
    field: "#64c7d9",
    force: "#f2b84b",
    potential: "#b58ce5",
    green: "#79d992"
  };
  const WORLD = { xMin: -4.5, xMax: 4.5, yMin: -3, yMax: 3 };
  const modes = {
    potential: { title: "二维电势地形", goal: "z=V(x,y)：电势高度与等势线共同描述偶极子", hint: "拖动试探电荷，观察 V、E 与 F 的局部变化", q1: 6, q2: -6, separation: 3, probeX: 0, probeY: 2, key: "◎ 定位高亮等势线" },
    space3d: { title: "三维偶极子电场", goal: "E(x,y,z) 在空间中如何从正电荷指向负电荷？", hint: "旋转空间视角，观察场线和矢量的方向与强弱", q1: 6, q2: -6, separation: 3, probeX: 0, probeY: 2, key: "◎ 回到探针位置" }
  };
  // 老的教师预设仍可能传入这些模式名；只把它们映射到当前两个核心视图。
  const MODE_ALIASES = { single: "potential", superposition: "potential", work: "potential", potential: "potential", space3d: "space3d" };
  const guide = [
    { title: "沿等势线移动", prompt: "位置改变时，为什么 V 基本保持不变？" },
    { title: "穿越等势线", prompt: "跨过高亮线后，V 与地形高度怎样改变？" },
    { title: "反转试探电荷", prompt: "保持位置不变，为什么 E 不变而 F 反向？" }
  ];
  const generalGuide = [
    { title: "旋转空间电场", prompt: "从不同视角观察 E(x,y,z) 的方向和强弱如何分布？" },
    { title: "对照二维地形", prompt: "z=V(x,y) 的坡度如何对应电场方向？" },
    { title: "选择试探电荷", prompt: "改变 q₀ 的正负，为什么电场不变而受力方向改变？" }
  ];
  const state = {
    mode: "potential",
    q1: 6,
    q2: -6,
    separation: 3,
    testCharge: 2,
    uniformField: 12,
    probeX: 0,
    probeY: 2,
    path: "direct",
    progress: 0,
    running: false,
    playbackRate: 1,
    guideStep: 0,
    dragging: false,
    highlightLevel: 0,
    highlightAnchorX: 0,
    highlightAnchorY: 2,
    demoPhase: "idle",
    demoRunning: false,
    demoProgress: 0,
    demoPath: [],
    demoPathIndex: 0,
    demoSegments: { along: [], cross: [] },
    motionRunning: false,
    motionStarted: false,
    motionElapsed: 0,
    motionVelocityX: 0,
    motionVelocityY: 0,
    motionLastDirectionX: 0,
    motionLastDirectionY: 0,
    motionPauseReason: "",
    motionStartEnergyNanoJ: 0,
    motionTrajectory: [],
    showFieldLines: false,
    showVectors: false,
    showEquipotential: true,
    showForce: true,
    showPotentialMap: true
  };

  const profileContext = refs.profileChart.getContext("2d");
  const vectorContext = refs.vectorChart.getContext("2d");
  const fieldGeometry = { probe: null, path: [], mode: null };
  const THREE = window.THREE;
  if (!THREE) throw new Error("Three.js is required for the electric-field terrain");
  const threeState = {
    renderer: null,
    scene: null,
    camera: null,
    dynamic: null,
    probe: null,
    raycaster: new THREE.Raycaster(),
    pointer: new THREE.Vector2(),
    cameraMode: null,
    lastPointer: null,
    target: new THREE.Vector3(0, 0, 0),
    radius: 12,
    theta: -0.72,
    phi: 1.02
  };
  // The point-charge potential is singular at the source. Leave a small visual
  // hole for the source marker instead of connecting clipped samples across it.
  const TERRAIN = { clipV: 100, verticalScale: 0.055, sampleX: 72, sampleY: 48, surfaceHoleRadius: 0.28 };
  // 这是教学动画时间尺度，不对应真实实验计时；方向和加速度仍来自模型力矢量。
  const MOTION = {
    effectiveMassNanoKg: 1,
    timeScale: 1.15,
    maxSpeed: 1.4,
    minSpeed: .008,
    minForce: .001,
    safeRadius: Math.max(model.MIN_DISTANCE + .18, .42),
    maxTrail: 420
  };
  const clamp = model.clamp;
  const signed = (value, digits = 1) => `${value > 1e-10 ? "+" : value < -1e-10 ? "−" : ""}${Math.abs(value).toFixed(digits)}`;
  const finite = (value) => Number.isFinite(value) ? value : 0;

  function inputState(extra = {}) {
    return {
      mode: state.mode,
      q1: state.q1,
      q2: state.q2,
      separation: state.separation,
      testCharge: state.testCharge,
      uniformField: state.uniformField,
      path: state.path,
      x: state.probeX,
      y: state.probeY,
      ...extra
    };
  }

  function solve() {
    return state.mode === "work" ? model.workState(inputState(), state.progress) : model.pointState(inputState());
  }

  function terrainHeight(value) {
    return clamp(finite(value), -TERRAIN.clipV, TERRAIN.clipV) * TERRAIN.verticalScale;
  }

  function surfaceFieldAt(x, y) {
    return model.fieldFromSources(model.pointSources(inputState()), x, y);
  }

  function spaceFieldAt(x, y, z) {
    const sources = model.pointSources(inputState({ mode: "potential" }));
    let ex = 0;
    let ey = 0;
    let ez = 0;
    let potential = 0;
    let nearest = Infinity;
    for (const source of sources) {
      if (Math.abs(source.qNanoC) < 1e-12) continue;
      const dx = x - source.x;
      const dy = y - source.y;
      const dz = z;
      const radius = Math.hypot(dx, dy, dz);
      nearest = Math.min(nearest, radius);
      if (radius < 1e-6) return { ex: NaN, ey: NaN, ez: NaN, potential: NaN, magnitude: Infinity, nearest: 0 };
      const scale = model.K * source.qNanoC * 1e-9 / (radius * radius * radius);
      ex += scale * dx;
      ey += scale * dy;
      ez += scale * dz;
      potential += model.K * source.qNanoC * 1e-9 / radius;
    }
    return { ex, ey, ez, potential, magnitude: Math.hypot(ex, ey, ez), nearest: nearest === Infinity ? null : nearest };
  }

  function highlightTolerance() {
    return Math.max(.45, Math.abs(state.highlightLevel) * .025);
  }

  function highlightDelta(sample) {
    const deltaV = Number.isFinite(sample.potential) ? sample.potential - state.highlightLevel : 0;
    return { deltaV, deltaU: state.testCharge * deltaV, work: -state.testCharge * deltaV };
  }

  function traceEquipotentialBranch(start, direction, steps = 150) {
    const points = [{ x: start.x, y: start.y }];
    let point = { x: start.x, y: start.y };
    for (let index = 0; index < steps; index += 1) {
      const sample = surfaceFieldAt(point.x, point.y);
      if (!Number.isFinite(sample.magnitude) || sample.magnitude < 1e-7) break;
      const tangentX = -sample.ey / sample.magnitude * direction;
      const tangentY = sample.ex / sample.magnitude * direction;
      let next = { x: point.x + tangentX * .055, y: point.y + tangentY * .055 };
      if (next.x < WORLD.xMin || next.x > WORLD.xMax || next.y < WORLD.yMin || next.y > WORLD.yMax) break;
      if (model.pointSources(inputState()).some((source) => Math.hypot(next.x - source.x, next.y - source.y) < .34)) break;
      const correction = surfaceFieldAt(next.x, next.y);
      if (Number.isFinite(correction.potential) && correction.magnitude > 1e-7) {
        const error = correction.potential - state.highlightLevel;
        next = {
          x: next.x + correction.ex / correction.magnitude * error / correction.magnitude,
          y: next.y + correction.ey / correction.magnitude * error / correction.magnitude
        };
      }
      if (next.x < WORLD.xMin || next.x > WORLD.xMax || next.y < WORLD.yMin || next.y > WORLD.yMax) break;
      points.push(next);
      point = next;
    }
    return points;
  }

  function highlightPath() {
    const anchor = { x: state.highlightAnchorX, y: state.highlightAnchorY };
    const backward = traceEquipotentialBranch(anchor, -1).reverse();
    const forward = traceEquipotentialBranch(anchor, 1);
    return backward.concat(forward.slice(1));
  }

  function refreshHighlightAtProbe() {
    const sample = solve();
    if (!Number.isFinite(sample.potential)) return;
    state.highlightLevel = sample.potential;
    state.highlightAnchorX = state.probeX;
    state.highlightAnchorY = state.probeY;
  }

  function resizeCanvas(canvas, context) {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { width: rect.width, height: rect.height };
  }

  function line(context, x1, y1, x2, y2, color, width = 1, dash = []) {
    context.save();
    context.strokeStyle = color;
    context.lineWidth = width;
    context.setLineDash(dash);
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
    context.restore();
  }

  function text(context, value, x, y, color = COLORS.text, size = 10, align = "left", weight = "500") {
    context.save();
    context.fillStyle = color;
    context.font = `${weight} ${size}px system-ui, sans-serif`;
    context.textAlign = align;
    context.textBaseline = "middle";
    context.fillText(value, x, y);
    context.restore();
  }

  function disposeObject(object) {
    if (!object) return;
    object.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => { if (material.map) material.map.dispose(); material.dispose(); });
      }
    });
  }

  function clearDynamicScene() {
    while (threeState.dynamic.children.length) {
      const child = threeState.dynamic.children.pop();
      disposeObject(child);
    }
  }

  function updateCamera() {
    const { radius, theta, phi, target } = threeState;
    threeState.camera.position.set(
      target.x + radius * Math.sin(phi) * Math.cos(theta),
      target.y + radius * Math.sin(phi) * Math.sin(theta),
      target.z + radius * Math.cos(phi)
    );
    threeState.camera.lookAt(target);
  }

  function resizeThree() {
    const rect = refs.canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    threeState.renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
    threeState.renderer.setSize(width, height, false);
    threeState.camera.aspect = width / height;
    threeState.camera.updateProjectionMatrix();
    return { width, height };
  }

  function makeLabel(label, color) {
    const canvas = document.createElement("canvas");
    canvas.width = 320; canvas.height = 80;
    const context = canvas.getContext("2d");
    context.font = "700 30px system-ui, sans-serif";
    context.fillStyle = color;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, 160, 40);
    const texture = new THREE.CanvasTexture(canvas);
    if ("colorSpace" in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
    sprite.scale.set(1.5, .38, 1);
    return sprite;
  }

  function initializeThree() {
    threeState.renderer = new THREE.WebGLRenderer({ canvas: refs.canvas, antialias: true, alpha: false });
    threeState.renderer.setClearColor(COLORS.background, 1);
    if ("outputColorSpace" in threeState.renderer && THREE.SRGBColorSpace) threeState.renderer.outputColorSpace = THREE.SRGBColorSpace;
    threeState.scene = new THREE.Scene();
    threeState.camera = new THREE.PerspectiveCamera(42, 1, .1, 500);
    threeState.camera.up.set(0, 0, 1);
    threeState.dynamic = new THREE.Group();
    threeState.scene.add(threeState.dynamic);
    threeState.scene.add(new THREE.HemisphereLight(0xdcebe6, 0x0b1110, 1.2));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(-5, -4, 12);
    threeState.scene.add(keyLight);
    const grid = new THREE.GridHelper(12, 12, 0x314b48, 0x19302e);
    grid.rotation.x = Math.PI / 2;
    grid.position.set(0, 0, -TERRAIN.clipV * TERRAIN.verticalScale - .18);
    threeState.scene.add(grid);
    updateCamera();
    resizeThree();
  }

  function buildSurfaceGrid() {
    const nx = TERRAIN.sampleX;
    const ny = TERRAIN.sampleY;
    const values = new Array((nx + 1) * (ny + 1));
    const magnitudes = new Array((nx + 1) * (ny + 1));
    for (let j = 0; j <= ny; j += 1) {
      for (let i = 0; i <= nx; i += 1) {
        const x = WORLD.xMin + (WORLD.xMax - WORLD.xMin) * i / nx;
        const y = WORLD.yMin + (WORLD.yMax - WORLD.yMin) * j / ny;
        const sample = surfaceFieldAt(x, y);
        const index = j * (nx + 1) + i;
        const valid = Number.isFinite(sample.potential) && (sample.nearest === null || sample.nearest >= TERRAIN.surfaceHoleRadius);
        values[index] = valid ? sample.potential : NaN;
        magnitudes[index] = valid && Number.isFinite(sample.magnitude) ? sample.magnitude : NaN;
      }
    }
    const finiteMagnitudes = magnitudes.filter((value) => Number.isFinite(value) && value >= 0).sort((a, b) => a - b);
    const referenceIndex = Math.max(0, Math.floor((finiteMagnitudes.length - 1) * .72));
    const fieldReference = Math.max(1e-6, finiteMagnitudes[referenceIndex] || 1);
    return { nx, ny, values, magnitudes, fieldReference };
  }

  function gridPoint(grid, i, j) {
    return {
      x: WORLD.xMin + (WORLD.xMax - WORLD.xMin) * i / grid.nx,
      y: WORLD.yMin + (WORLD.yMax - WORLD.yMin) * j / grid.ny,
      value: grid.values[j * (grid.nx + 1) + i]
    };
  }

  function buildTerrain(grid) {
    const { nx, ny } = grid;
    const positions = [];
    const colors = [];
    const indices = [];
    const color = new THREE.Color();
    for (let j = 0; j <= ny; j += 1) {
      for (let i = 0; i <= nx; i += 1) {
        const point = gridPoint(grid, i, j);
        const index = j * (nx + 1) + i;
        const value = Number.isFinite(point.value) ? clamp(point.value, -TERRAIN.clipV, TERRAIN.clipV) : 0;
        positions.push(point.x, point.y, terrainHeight(value));
        const magnitude = Number.isFinite(grid.magnitudes[index]) ? grid.magnitudes[index] : 0;
        const fieldRatio = clamp(Math.log1p(magnitude / grid.fieldReference) / Math.log1p(12), 0, 1);
        const potentialRatio = value / TERRAIN.clipV;
        // Blend continuously from the V=0 neutral color; a wide threshold would make zero look like an area.
        const signBlend = clamp(Math.abs(potentialRatio) * 2.4, 0, 1);
        const neutralHue = .40;
        const positiveHue = .14 - .08 * fieldRatio;
        const negativeHue = .52 + .10 * fieldRatio;
        const targetHue = potentialRatio >= 0 ? positiveHue : negativeHue;
        const hue = neutralHue + (targetHue - neutralHue) * signBlend;
        const saturation = .55 + .28 * fieldRatio;
        const lightness = .27 + .21 * fieldRatio;
        color.setHSL(hue, saturation, lightness);
        colors.push(color.r, color.g, color.b);
      }
    }
    for (let j = 0; j < ny; j += 1) {
      for (let i = 0; i < nx; i += 1) {
        const a = j * (nx + 1) + i;
        const b = a + 1;
        const d = (j + 1) * (nx + 1) + i;
        const c = d + 1;
        if ([a, b, d, c].every((index) => Number.isFinite(grid.values[index]))) {
          indices.push(a, b, d, b, c, d);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .78, metalness: .04, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.visible = state.showPotentialMap;
    return mesh;
  }

  function contourHit(a, b, level) {
    if (!Number.isFinite(a.value) || !Number.isFinite(b.value)) return null;
    const da = a.value - level;
    const db = b.value - level;
    if (da * db > 0) return null;
    if (Math.abs(da - db) < 1e-10) return null;
    const t = da / (da - db);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  function contourSegments(grid, level, zOffset = .045) {
    const points = [];
    for (let j = 0; j < grid.ny; j += 1) {
      for (let i = 0; i < grid.nx; i += 1) {
        const p00 = gridPoint(grid, i, j);
        const p10 = gridPoint(grid, i + 1, j);
        const p11 = gridPoint(grid, i + 1, j + 1);
        const p01 = gridPoint(grid, i, j + 1);
        const hits = [contourHit(p00, p10, level), contourHit(p10, p11, level), contourHit(p11, p01, level), contourHit(p01, p00, level)].filter(Boolean);
        if (hits.length === 2 || hits.length === 4) {
          for (let index = 0; index < hits.length; index += 2) {
            const a = hits[index]; const b = hits[index + 1];
            points.push(a.x, a.y, terrainHeight(level) + zOffset, b.x, b.y, terrainHeight(level) + zOffset);
          }
        }
      }
    }
    return points;
  }

  function buildEquipotentialLines(grid) {
    const rawLevels = state.mode === "work" ? [-36, -24, -12, 0, 12, 24, 36] : [-60, -40, -24, -12, 0, 12, 24, 40, 60];
    const levels = rawLevels.filter((level) => state.mode !== "potential" || (Math.abs(level) > .01 && Math.abs(level - state.highlightLevel) > .01));
    const points = levels.flatMap((level) => contourSegments(grid, level));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    const material = new THREE.LineBasicMaterial({ color: 0xf1e8cb, transparent: true, opacity: .7, depthTest: false });
    const lines = new THREE.LineSegments(geometry, material);
    lines.visible = state.showEquipotential;
    return lines;
  }

  function buildZeroEquipotentialLine(grid) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(contourSegments(grid, 0, .085), 3));
    const material = new THREE.LineBasicMaterial({ color: 0xf6e7a8, transparent: true, opacity: .98, depthTest: false });
    const line = new THREE.LineSegments(geometry, material);
    line.visible = state.showEquipotential && state.mode === "potential";
    return line;
  }

  function buildHighlightLine() {
    const points = highlightPath();
    const positions = points.flatMap((point) => [point.x, point.y, terrainHeight(state.highlightLevel) + .09]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xf2b84b, transparent: true, opacity: .98, depthTest: false }));
    line.visible = state.showEquipotential && state.mode === "potential" && Math.abs(state.highlightLevel) > .01;
    return line;
  }

  function addArrow(group, x, y, z, ex, ey, color, length = .42, ez = 0) {
    const magnitude = Math.hypot(ex, ey, ez);
    if (!Number.isFinite(magnitude) || magnitude < 1e-8) return;
    const direction = new THREE.Vector3(ex / magnitude, ey / magnitude, ez / magnitude);
    const arrow = new THREE.ArrowHelper(direction, new THREE.Vector3(x, y, z), length, color, .12, .07);
    group.add(arrow);
  }

  function addSourceMarkers(group, sources) {
    sources.forEach((source, index) => {
      if (Math.abs(source.qNanoC) < 1e-12) return;
      const positive = source.qNanoC > 0;
      const color = positive ? 0xff7468 : 0x7392ff;
      const geometry = new THREE.SphereGeometry(.28, 24, 16);
      const material = new THREE.MeshStandardMaterial({ color, roughness: .45, metalness: .05, emissive: color, emissiveIntensity: .1 });
      const marker = new THREE.Mesh(geometry, material);
      marker.scale.set(positive ? 1 : .86, positive ? 1 : .86, positive ? 1 : 1.28);
      const local = surfaceFieldAt(source.x + (positive ? .35 : -.35), source.y);
      const surfaceZ = terrainHeight(local.potential);
      const markerZ = positive ? Math.max(1.0, surfaceZ + .45) : Math.max(-2.2, surfaceZ + .45);
      marker.position.set(source.x, source.y, markerZ);
      group.add(marker);
      const label = makeLabel(`Q${index + 1} ${signed(source.qNanoC)} nC`, positive ? "#ff9b91" : "#9badff");
      label.position.set(source.x, source.y, markerZ + (positive ? .55 : .62));
      group.add(label);
      if (!positive) {
        const stringGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(source.x, source.y, markerZ - .35), new THREE.Vector3(source.x, source.y, terrainHeight(local.potential))]);
        group.add(new THREE.Line(stringGeometry, new THREE.LineBasicMaterial({ color, transparent: true, opacity: .7 })));
      }
    });
  }

  function traceSpaceFieldLine(start, direction, steps = 92) {
    const points = [new THREE.Vector3(start.x, start.y, start.z)];
    let point = { x: start.x, y: start.y, z: start.z };
    for (let index = 0; index < steps; index += 1) {
      const sample = spaceFieldAt(point.x, point.y, point.z);
      if (!Number.isFinite(sample.magnitude) || sample.magnitude < 1e-7 || sample.nearest < .24) break;
      const step = .105;
      const next = {
        x: point.x + direction * sample.ex / sample.magnitude * step,
        y: point.y + direction * sample.ey / sample.magnitude * step,
        z: point.z + direction * sample.ez / sample.magnitude * step
      };
      if (next.x < WORLD.xMin || next.x > WORLD.xMax || next.y < WORLD.yMin || next.y > WORLD.yMax || next.z < -3.2 || next.z > 3.2) break;
      points.push(new THREE.Vector3(next.x, next.y, next.z));
      point = next;
    }
    return points;
  }

  function buildSpaceFieldLines(group, sources) {
    const positive = sources.find((source) => source.qNanoC > 0);
    const negative = sources.find((source) => source.qNanoC < 0);
    const paths = [];
    if (positive) {
      for (let index = 0; index < 16; index += 1) {
        const angle = index * Math.PI * 2 / 16;
        const radius = .42;
        const start = { x: positive.x + radius * Math.cos(angle), y: positive.y + radius * Math.sin(angle), z: .15 * Math.sin(angle * 2) };
        const path = traceSpaceFieldLine(start, 1);
        if (path.length > 8) paths.push(path);
      }
    }
    if (negative) {
      for (let index = 0; index < 8; index += 1) {
        const angle = index * Math.PI * 2 / 8 + Math.PI / 8;
        const radius = .42;
        const start = { x: negative.x + radius * Math.cos(angle), y: negative.y + radius * Math.sin(angle), z: .38 * Math.sin(angle) };
        const path = traceSpaceFieldLine(start, -1);
        if (path.length > 8) paths.push(path);
      }
    }
    paths.forEach((path, index) => {
      const geometry = new THREE.BufferGeometry().setFromPoints(path);
      const material = new THREE.LineBasicMaterial({ color: index % 3 === 0 ? 0xf2b84b : 0x64c7d9, transparent: true, opacity: .68, depthTest: false });
      group.add(new THREE.Line(geometry, material));
    });
  }

  function addSpaceVectorGrid(group) {
    if (!state.showVectors) return;
    for (const z of [-1.55, 0, 1.55]) {
      for (let y = -2.4; y <= 2.4; y += 1.2) {
        for (let x = -4; x <= 4; x += 1.2) {
          const sample = spaceFieldAt(x, y, z);
          if (!Number.isFinite(sample.magnitude) || sample.magnitude < 1e-5 || sample.nearest < .5) continue;
          const ratio = clamp(Math.log1p(sample.magnitude / 8) / Math.log1p(10), 0, 1);
          const color = new THREE.Color().setHSL(.5 - .12 * ratio, .72, .48 + .12 * ratio).getHex();
          addArrow(group, x, y, z, sample.ex, sample.ey, color, .2 + .3 * ratio, sample.ez);
        }
      }
    }
  }

  function addSpaceSourceMarkers(group, sources) {
    sources.forEach((source, index) => {
      if (Math.abs(source.qNanoC) < 1e-12) return;
      const positive = source.qNanoC > 0;
      const color = positive ? 0xff7468 : 0x7392ff;
      const marker = new THREE.Mesh(new THREE.SphereGeometry(.3, 24, 16), new THREE.MeshStandardMaterial({ color, roughness: .4, metalness: .08, emissive: color, emissiveIntensity: .16 }));
      marker.position.set(source.x, source.y, .18);
      group.add(marker);
      const label = makeLabel(`Q${index + 1} ${signed(source.qNanoC)} nC`, positive ? "#ff9b91" : "#9badff");
      label.position.set(source.x, source.y, .72);
      group.add(label);
    });
  }

  function addSpaceProbe(group, sample) {
    const color = state.testCharge > 0 ? 0xf2b84b : state.testCharge < 0 ? 0xb58ce5 : 0xdce5df;
    const probe = new THREE.Mesh(new THREE.SphereGeometry(.23, 24, 16), new THREE.MeshStandardMaterial({ color, roughness: .32, metalness: .1, emissive: color, emissiveIntensity: .2 }));
    probe.position.set(sample.x, sample.y, .3);
    probe.userData.isProbe = true;
    group.add(probe);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.34, .025, 8, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: state.dragging ? .95 : .6 }));
    ring.position.copy(probe.position);
    group.add(ring);
    const label = makeLabel(`q₀ ${signed(state.testCharge)} nC`, state.testCharge >= 0 ? "#ffd77d" : "#d4c2ff");
    label.position.set(sample.x, sample.y, .78);
    group.add(label);
    if (sample.magnitude > 1e-8) {
      const space = spaceFieldAt(sample.x, sample.y, 0);
      addArrow(group, sample.x, sample.y, .3, space.ex, space.ey, 0x64c7d9, .62, space.ez);
      if (state.showForce && Math.abs(state.testCharge) > 1e-9) addArrow(group, sample.x, sample.y, .34, sample.forceXNanoN, sample.forceYNanoN, 0xf2b84b, .78, 0);
    }
    const velocityMagnitude = Math.hypot(state.motionVelocityX, state.motionVelocityY);
    const directionMagnitude = velocityMagnitude > 1e-7 ? velocityMagnitude : Math.hypot(state.motionLastDirectionX, state.motionLastDirectionY);
    if (state.motionStarted && directionMagnitude > 1e-7) {
      const directionX = velocityMagnitude > 1e-7 ? state.motionVelocityX : state.motionLastDirectionX;
      const directionY = velocityMagnitude > 1e-7 ? state.motionVelocityY : state.motionLastDirectionY;
      addArrow(group, sample.x, sample.y, .48, directionX, directionY, 0x79d992, .92);
    }
    threeState.probe = probe;
  }

  function addWorkScene(group) {
    const leftPositive = state.uniformField >= 0;
    [-4.15, 4.15].forEach((x, index) => {
      const positive = index === 0 ? leftPositive : !leftPositive;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(.12, 5.4, .3), new THREE.MeshStandardMaterial({ color: positive ? 0xff7468 : 0x7392ff, emissive: positive ? 0xff7468 : 0x7392ff, emissiveIntensity: .08 }));
      mesh.position.set(x, 0, 0);
      group.add(mesh);
    });
    ["direct", "curve"].forEach((path) => {
      const positions = [];
      for (let index = 0; index <= 90; index += 1) {
        const point = model.pathPoint(path, index / 90);
        positions.push(point.x, point.y, terrainHeight(-state.uniformField * point.x) + .12);
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      const active = state.path === path;
      group.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: path === "direct" ? 0xf2b84b : 0xb58ce5, transparent: true, opacity: active ? .95 : .28, linewidth: active ? 2 : 1 })));
    });
  }

  function addMotionTrail(group) {
    if (state.motionTrajectory.length < 2) return;
    const positions = [];
    state.motionTrajectory.forEach((point) => {
      const height = state.mode === "space3d" ? .16 : terrainHeight(surfaceFieldAt(point.x, point.y).potential) + .16;
      positions.push(point.x, point.y, height);
    });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    group.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x79d992, transparent: true, opacity: .9, depthTest: false })));
  }

  function addProbe(group, sample) {
    const color = state.testCharge > 0 ? 0xf2b84b : state.testCharge < 0 ? 0xb58ce5 : 0xdce5df;
    const probe = new THREE.Mesh(new THREE.SphereGeometry(.22, 24, 16), new THREE.MeshStandardMaterial({ color, roughness: .35, metalness: .1, emissive: color, emissiveIntensity: .18 }));
    probe.position.set(sample.x, sample.y, terrainHeight(sample.potential) + .27);
    probe.userData.isProbe = true;
    group.add(probe);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.32, .025, 8, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: state.dragging ? .95 : .58 }));
    ring.position.copy(probe.position);
    group.add(ring);
    const label = makeLabel(`q₀ ${signed(state.testCharge)} nC`, state.testCharge >= 0 ? "#ffd77d" : "#d4c2ff");
    label.position.set(sample.x, sample.y, probe.position.z + .47);
    group.add(label);
    if (sample.magnitude > 1e-8) {
      addArrow(group, sample.x, sample.y, probe.position.z, sample.ex, sample.ey, 0x64c7d9, .58);
      if (state.showForce && Math.abs(state.testCharge) > 1e-9) addArrow(group, sample.x, sample.y, probe.position.z + .03, sample.forceXNanoN, sample.forceYNanoN, 0xf2b84b, .78);
    }
    const velocityMagnitude = Math.hypot(state.motionVelocityX, state.motionVelocityY);
    const directionMagnitude = velocityMagnitude > 1e-7
      ? velocityMagnitude
      : Math.hypot(state.motionLastDirectionX, state.motionLastDirectionY);
    if (state.motionStarted && directionMagnitude > 1e-7) {
      const directionX = velocityMagnitude > 1e-7 ? state.motionVelocityX : state.motionLastDirectionX;
      const directionY = velocityMagnitude > 1e-7 ? state.motionVelocityY : state.motionLastDirectionY;
      addArrow(group, sample.x, sample.y, probe.position.z + .12, directionX, directionY, 0x79d992, .92);
    }
    threeState.probe = probe;
  }

  function addVectorGrid(group) {
    if (!state.showVectors) return;
    for (let y = -2.25; y <= 2.25; y += .9) {
      for (let x = -3.75; x <= 3.75; x += 1.1) {
        const sample = surfaceFieldAt(x, y);
        if (!Number.isFinite(sample.magnitude) || sample.magnitude < 1e-5 || sample.nearest !== null && sample.nearest < .48) continue;
        addArrow(group, x, y, terrainHeight(sample.potential) + .1, sample.ex, sample.ey, 0x64c7d9, .3);
      }
    }
  }

  function drawThreeScene(sample) {
    if (!threeState.renderer) return;
    clearDynamicScene();
    if (state.mode === "space3d") {
      const spacePlane = new THREE.GridHelper(12, 12, 0x416360, 0x1d3937);
      spacePlane.rotation.x = Math.PI / 2;
      spacePlane.position.z = 0;
      spacePlane.material.transparent = true;
      spacePlane.material.opacity = .55;
      threeState.dynamic.add(spacePlane);
      addSpaceSourceMarkers(threeState.dynamic, sample.sources);
      if (state.showFieldLines) buildSpaceFieldLines(threeState.dynamic, sample.sources);
      addSpaceVectorGrid(threeState.dynamic);
      addMotionTrail(threeState.dynamic);
      addSpaceProbe(threeState.dynamic, sample);
    } else {
      const grid = buildSurfaceGrid();
      threeState.dynamic.add(buildTerrain(grid));
      threeState.dynamic.add(buildEquipotentialLines(grid));
      threeState.dynamic.add(buildZeroEquipotentialLine(grid));
      threeState.dynamic.add(buildHighlightLine());
      addSourceMarkers(threeState.dynamic, sample.sources);
      addVectorGrid(threeState.dynamic);
      addMotionTrail(threeState.dynamic);
      addProbe(threeState.dynamic, sample);
    }
    const { width, height } = resizeThree();
    const projected = new THREE.Vector3(sample.x, sample.y, state.mode === "space3d" ? .3 : terrainHeight(sample.potential) + .27).project(threeState.camera);
    fieldGeometry.mode = state.mode;
    fieldGeometry.probe = { x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2 };
    fieldGeometry.path = [];
    threeState.renderer.render(threeState.scene, threeState.camera);
  }

  function drawGraph(canvas, context, series, options) {
    const { width, height } = resizeCanvas(canvas, context);
    context.fillStyle = "#111512";
    context.fillRect(0, 0, width, height);
    const pad = { left: 45, right: 16, top: 18, bottom: 26 };
    const all = series.flatMap((item) => item.points).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    let xMin = options.xMin ?? Math.min(...all.map((point) => point.x));
    let xMax = options.xMax ?? Math.max(...all.map((point) => point.x));
    let yMin = Math.min(0, ...all.map((point) => point.y));
    let yMax = Math.max(0, ...all.map((point) => point.y));
    if (!Number.isFinite(xMin) || xMin === xMax) { xMin = 0; xMax = 1; }
    if (!Number.isFinite(yMin) || yMin === yMax) { yMin = -1; yMax = 1; }
    const yPad = Math.max(1e-9, (yMax - yMin) * .12);
    yMin -= yPad;
    yMax += yPad;
    const px = (x) => pad.left + (x - xMin) / (xMax - xMin) * (width - pad.left - pad.right);
    const py = (y) => pad.top + (yMax - y) / (yMax - yMin) * (height - pad.top - pad.bottom);
    for (let index = 0; index <= 4; index += 1) {
      const gx = pad.left + (width - pad.left - pad.right) * index / 4;
      const gy = pad.top + (height - pad.top - pad.bottom) * index / 4;
      line(context, gx, pad.top, gx, height - pad.bottom, "rgba(129,143,134,.12)");
      line(context, pad.left, gy, width - pad.right, gy, "rgba(129,143,134,.12)");
    }
    if (yMin < 0 && yMax > 0) line(context, pad.left, py(0), width - pad.right, py(0), "rgba(210,221,214,.28)");
    for (const item of series) {
      context.save();
      context.strokeStyle = item.color;
      context.lineWidth = item.width || 1.8;
      context.setLineDash(item.dash || []);
      context.beginPath();
      let drawing = false;
      for (const point of item.points) {
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) { drawing = false; continue; }
        if (!drawing) { context.moveTo(px(point.x), py(point.y)); drawing = true; }
        else context.lineTo(px(point.x), py(point.y));
      }
      context.stroke();
      context.restore();
    }
    if (Number.isFinite(options.cursorX)) line(context, px(options.cursorX), pad.top, px(options.cursorX), height - pad.bottom, COLORS.green, 1.2, [4, 4]);
    text(context, options.yLabel, pad.left, 8, COLORS.muted, 8);
    text(context, options.xLabel, width - pad.right, height - 8, COLORS.muted, 8, "right");
    series.slice(0, 3).forEach((item, index) => text(context, item.label, width - pad.right - index * 80, 9, item.color, 8, "right", "700"));
  }

  function pointProfile() {
    const points = [];
    for (let index = 0; index <= 140; index += 1) {
      const radius = .5 + 4.5 * index / 140;
      const sample = model.pointState(inputState({ mode: "single", x: radius, y: 0 }));
      points.push({ r: radius, e: sample.magnitude, v: sample.potential });
    }
    return points;
  }

  function axisProfile(y) {
    const potential = [];
    const ex = [];
    const ey = [];
    const sources = model.pointSources(inputState());
    for (let index = 0; index <= 180; index += 1) {
      const x = -4.2 + 8.4 * index / 180;
      const sample = model.fieldFromSources(sources, x, y);
      const valid = (sample.nearest === null || sample.nearest >= .3) && Number.isFinite(sample.potential);
      potential.push({ x, y: valid ? sample.potential : NaN });
      ex.push({ x, y: valid ? sample.ex : NaN });
      ey.push({ x, y: valid ? sample.ey : NaN });
    }
    return { potential, ex, ey };
  }

  function workProfile() {
    const result = { directV: [], curveV: [], directW: [], curveW: [], selectedMinusU: [] };
    for (let index = 0; index <= 120; index += 1) {
      const progress = index / 120;
      const direct = model.workState(inputState({ path: "direct" }), progress);
      const curve = model.workState(inputState({ path: "curve" }), progress);
      const selected = state.path === "direct" ? direct : curve;
      result.directV.push({ x: progress, y: direct.potential });
      result.curveV.push({ x: progress, y: curve.potential });
      result.directW.push({ x: progress, y: direct.workNanoJ });
      result.curveW.push({ x: progress, y: curve.workNanoJ });
      result.selectedMinusU.push({ x: progress, y: -selected.deltaEnergyNanoJ });
    }
    return result;
  }

  function drawCharts(sample) {
    if (state.mode === "single") {
      const profile = pointProfile();
      const radius = Math.hypot(sample.x, sample.y);
      drawGraph(refs.profileChart, profileContext, [{ label: "E", color: COLORS.field, points: profile.map((point) => ({ x: point.r, y: point.e })) }], { xLabel: "r / m", yLabel: "E / (N/C)", cursorX: radius, xMin: .5, xMax: 5 });
      drawGraph(refs.vectorChart, vectorContext, [{ label: "V", color: COLORS.potential, points: profile.map((point) => ({ x: point.r, y: point.v })) }], { xLabel: "r / m", yLabel: "V / V", cursorX: radius, xMin: .5, xMax: 5 });
      return;
    }
    if (state.mode === "work") {
      const profile = workProfile();
      drawGraph(refs.profileChart, profileContext, [{ label: "路径 A", color: COLORS.force, points: profile.directV }, { label: "路径 B", color: COLORS.potential, points: profile.curveV, dash: [5, 4] }], { xLabel: "路径进度", yLabel: "V / V", cursorX: state.progress, xMin: 0, xMax: 1 });
      drawGraph(refs.vectorChart, vectorContext, [{ label: "W_A", color: COLORS.force, points: profile.directW }, { label: "W_B", color: COLORS.potential, points: profile.curveW, dash: [5, 4] }, { label: "−ΔU", color: COLORS.field, points: profile.selectedMinusU, dash: [2, 3] }], { xLabel: "路径进度", yLabel: "能量 / nJ", cursorX: state.progress, xMin: 0, xMax: 1 });
      return;
    }
    const profile = axisProfile(state.probeY);
    drawGraph(refs.profileChart, profileContext, [{ label: "V(x)", color: COLORS.potential, points: profile.potential }], { xLabel: `x / m（y=${state.probeY.toFixed(2)} m）`, yLabel: "V / V", cursorX: state.probeX, xMin: -4.2, xMax: 4.2 });
    drawGraph(refs.vectorChart, vectorContext, [{ label: "Eₓ", color: COLORS.field, points: profile.ex }, { label: "Eᵧ", color: COLORS.force, points: profile.ey, dash: [5, 4] }], { xLabel: `x / m（y=${state.probeY.toFixed(2)} m）`, yLabel: "E / (N/C)", cursorX: state.probeX, xMin: -4.2, xMax: 4.2 });
  }

  function rangeProgress(input) {
    const value = Number(input.value);
    const min = Number(input.min);
    const max = Number(input.max);
    input.style.setProperty("--range-progress", `${(value - min) / (max - min) * 100}%`);
  }

  function statusFor(sample) {
    if (state.motionRunning) {
      return { badge: "运动中", className: "is-motion", nature: "F = q₀E 驱动", explanation: `沿电场力方向推进 · 教学动画时间 ${state.motionElapsed.toFixed(1)} s` };
    }
    if (state.motionStarted && state.motionPauseReason) {
      const automatic = state.motionPauseReason.startsWith("自动暂停");
      return { badge: automatic ? "自动暂停" : "已暂停", className: automatic ? "is-critical" : "is-special", nature: "当前位置已保留", explanation: state.motionPauseReason };
    }
    if (state.mode === "potential" && !state.motionStarted) {
      return { badge: "准备观察", className: "is-motion", nature: "地形坡度给出电场方向", explanation: "拖动试探电荷，比较等势线间距、地形坡度和局部场强" };
    }
    if (state.mode === "potential") {
      if (Math.abs(state.testCharge) < 1e-9) return { badge: "q₀=0，场仍存在", className: "is-special", nature: "E 与 V 仍由源电荷决定", explanation: "试探电荷为零时 F=0；电势地形与等势线不受影响" };
      const delta = highlightDelta(sample);
      if (Math.abs(delta.deltaV) <= highlightTolerance()) {
        return { badge: state.demoRunning ? "沿等势线观察" : "同一等势线", className: "is-special", nature: "V 基本不变", explanation: `位置改变 · ΔV≈${signed(delta.deltaV, 2)} V` };
      }
      return { badge: "穿越等势线", className: "is-critical", nature: "电势正在改变", explanation: `ΔV=${signed(delta.deltaV, 2)} V · 地形高度随 V 改变` };
    }
    if (state.mode === "space3d" && Math.abs(sample.potential) < 1e-8 && sample.magnitude > 1e-6) return { badge: "空间场分布", className: "is-special", nature: "E=-∇V", explanation: "场线从正电荷出发指向负电荷；箭头长度表示场强相对大小" };
    if (sample.magnitude < 1e-8 && Math.abs(sample.potential) < 1e-8) return { badge: "场与电势均为零", className: "is-zero", nature: "源电荷贡献相消或为零", explanation: "改变源电荷后重新观察空间分布" };
    if (Math.abs(state.testCharge) < 1e-9) return { badge: "q₀=0，场仍存在", className: "is-special", nature: "E 与 q₀ 无关", explanation: "试探电荷为零时 F=U=0，但源电荷建立的 E、V 不变" };
    return { badge: sample.potential >= 0 ? "正电势区域" : "负电势区域", className: sample.potential >= 0 ? "is-positive" : "is-negative", nature: state.testCharge > 0 ? "F 与 E 同向" : "F 与 E 反向", explanation: "E 的方向按正试探电荷受力方向定义" };
  }

  function renderControls(sample) {
    const workMode = false;
    const twoSource = true;
    refs.source1Section.hidden = workMode;
    refs.source2Section.hidden = !twoSource;
    refs.separationSection.hidden = !twoSource;
    if (refs.uniformSection) refs.uniformSection.hidden = !workMode;
    if (refs.pathSection) refs.pathSection.hidden = !workMode;
    refs.source1Input.value = state.q1;
    refs.source2Input.value = state.q2;
    refs.separationInput.value = state.separation;
    if (refs.uniformInput) refs.uniformInput.value = state.uniformField;
    refs.testChargeInput.value = state.testCharge;
    if (refs.progressInput) refs.progressInput.value = state.progress;
    refs.source1Value.textContent = `${signed(state.q1)} nC`;
    refs.source2Value.textContent = `${signed(state.q2)} nC`;
    refs.separationValue.textContent = `${state.separation.toFixed(1)} m`;
    if (refs.uniformValue) refs.uniformValue.textContent = `${signed(state.uniformField)} N/C`;
    refs.testChargeValue.textContent = `${signed(state.testCharge)} nC`;
    const chargeSign = Math.sign(state.testCharge);
    refs.polarityButtons.forEach((button) => {
      const active = chargeSign !== 0 && Number(button.dataset.chargeSign) === chargeSign;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    refs.testChargeNote.textContent = chargeSign < 0
      ? "已选择负试探电荷：F 与 E 反向，指向正电荷一侧"
      : chargeSign > 0
        ? "已选择正试探电荷：F 与 E 同向，指向负电荷一侧"
        : "q₀=0 时没有电场力；请选择正或负试探电荷观察受力方向";
    refs.progressLabel.textContent = "探针坐标";
    refs.progressValue.textContent = `x = ${sample.x.toFixed(2)} m · y = ${sample.y.toFixed(2)} m`;
    if (refs.progressInput) refs.progressInput.disabled = true;
    const playing = workMode ? state.running : state.motionRunning;
    refs.playButton.disabled = false;
    refs.pauseButton.disabled = false;
    refs.playButton.setAttribute("aria-pressed", String(playing));
    refs.playButton.textContent = playing ? "▶ 运行中" : (state.motionStarted ? "▶ 继续" : "▶ 播放");
    refs.motionTimeLabel.textContent = state.motionStarted ? `教学动画时间：${state.motionElapsed.toFixed(1)} s` : "教学动画时间：未播放";
    refs.keyButton.textContent = modes[state.mode].key;
    refs.sceneTabs.forEach((button) => button.classList.toggle("is-active", button.dataset.mode === state.mode));
    refs.pathButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.path === state.path));
    refs.rateButtons.forEach((button) => button.classList.toggle("is-active", Number(button.dataset.rate) === state.playbackRate));
    [[refs.showFieldLinesToggle, state.showFieldLines], [refs.showVectorsToggle, state.showVectors], [refs.showEquipotentialToggle, state.showEquipotential], [refs.showForceToggle, state.showForce], [refs.showPotentialMapToggle, state.showPotentialMap]].forEach(([input, checked]) => { if (input) input.checked = checked; });
    if (refs.showFieldLinesToggle) refs.showFieldLinesToggle.closest("label").hidden = state.mode !== "space3d";
    if (refs.showVectorsToggle) refs.showVectorsToggle.closest("label").hidden = state.mode !== "space3d";
    if (refs.showEquipotentialToggle) refs.showEquipotentialToggle.closest("label").hidden = state.mode === "space3d";
    if (refs.showPotentialMapToggle) refs.showPotentialMapToggle.closest("label").hidden = state.mode === "space3d";
    [refs.source1Input, refs.source2Input, refs.separationInput, refs.uniformInput, refs.testChargeInput, refs.progressInput].filter(Boolean).forEach(rangeProgress);
  }

  function renderReadouts(sample) {
    const angle = sample.magnitude > 1e-8 ? Math.atan2(sample.ey, sample.ex) * 180 / Math.PI : null;
    refs.fieldMetric.textContent = `${finite(sample.magnitude).toFixed(3)} N/C`;
    refs.directionMetric.textContent = angle === null ? "无确定方向" : `${signed(angle, 1)}°`;
    refs.potentialMetric.textContent = `${signed(finite(sample.potential), 3)} V`;
    refs.forceMetric.textContent = `${finite(sample.forceNanoN).toFixed(3)} nN`;
    refs.energyMetric.textContent = `${signed(finite(sample.energyNanoJ), 3)} nJ`;
    const velocityMagnitude = Math.hypot(state.motionVelocityX, state.motionVelocityY);
    const velocityAngle = velocityMagnitude > 1e-7 ? Math.atan2(state.motionVelocityY, state.motionVelocityX) * 180 / Math.PI : null;
    refs.motionDirectionMetric.textContent = velocityAngle === null ? (state.motionStarted ? "速度≈0" : "未开始") : `${signed(velocityAngle, 1)}°`;
    refs.energyDeltaMetric.textContent = state.motionStarted ? `${signed(finite(sample.energyNanoJ - state.motionStartEnergyNanoJ), 3)} nJ` : "未开始";
    const status = statusFor(sample);
    refs.stateBadge.textContent = status.badge;
    refs.stateBadge.className = `state-badge ${status.className}`;
    refs.fieldNature.textContent = status.nature;
    refs.fieldExplanation.textContent = status.explanation;
    refs.formulaReadout.textContent = state.mode === "potential" ? `z = V(x,y) = ${sample.potential.toFixed(3)} V` : `E = −∇V · |E| = ${sample.magnitude.toFixed(3)} N/C`;
  }

  function renderLabels(sample) {
    const config = modes[state.mode];
    const currentGuide = state.mode === "potential" ? guide : generalGuide;
    refs.modeTitle.textContent = config.title;
    refs.modeGoal.textContent = config.goal;
    if (refs.fieldColorLegend) refs.fieldColorLegend.hidden = state.mode === "space3d";
    refs.stageHint.textContent = config.hint;
    if (state.mode === "potential") {
      const delta = highlightDelta(sample);
      refs.stageHint.textContent = state.demoRunning
        ? state.demoPhase === "along" ? "演示：沿高亮等势线移动，观察 V 基本不变" : "演示：穿越高亮等势线，观察 V 和地形高度变化"
        : state.demoPhase === "complete" ? "结论：同一等势线对应相同电势；穿越等势线时电势改变" : config.hint;
      refs.highlightPotentialLabel.textContent = Math.abs(state.highlightLevel) <= .01
        ? "零势线：V = 0.00 V"
        : `高亮等势线：V = ${state.highlightLevel.toFixed(2)} V`;
      refs.fieldInteractionHint.textContent = state.demoRunning
        ? state.demoPhase === "along" ? "位置在改变 · 高亮线上的 V 基本不变" : "正在穿线 · V 和地形高度正在改变"
        : state.demoPhase === "complete" ? "结论已停在穿线后状态 · 可拖回高亮线复核" : "点击播放：从 V≈0 的中垂线释放 q₀；也可拖动 q₀";
      if (Math.abs(delta.deltaV) <= highlightTolerance()) refs.stepTitle.textContent = "沿等势线移动";
    } else {
      refs.highlightPotentialLabel.textContent = "空间电场：E(x,y,z)";
      refs.fieldInteractionHint.textContent = "旋转视角观察场线与矢量 · 拖动 q₀ 读取局部场强";
    }
    if (state.mode !== "work" && state.motionRunning) {
      refs.stageHint.textContent = "播放中：试探电荷按 F=q₀E 运动，绿色箭头表示速度方向";
      refs.fieldInteractionHint.textContent = "运动中 · 绿色轨迹与箭头表示运动 · 教学动画时间";
    } else if (state.mode !== "work" && state.motionStarted && state.motionPauseReason) {
      refs.stageHint.textContent = state.motionPauseReason;
      refs.fieldInteractionHint.textContent = "已停在当前位置 · 点击继续，或拖动 q₀ 后从新位置开始";
    }
    const routeStep = state.mode === "potential" ? (state.demoPhase === "complete" ? 1 : Math.abs(highlightDelta(sample).deltaV) <= highlightTolerance() ? 0 : 1) : state.guideStep;
    refs.stepIndex.textContent = String(routeStep + 1).padStart(2, "0");
    refs.stepTitle.textContent = state.mode === "potential" && state.demoPhase === "complete" ? "穿越等势线" : currentGuide[routeStep].title;
    refs.stepPrompt.textContent = currentGuide[routeStep].prompt;
    refs.routeSteps.forEach((button, index) => button.classList.toggle("is-active", index === routeStep));
    if (refs.stepButton) refs.stepButton.textContent = state.mode === "potential" ? (state.demoRunning ? "暂停演示" : state.demoPhase === "complete" ? "重新演示" : state.demoPath.length ? "继续演示" : "分步演示") : "查看提示";
  }

  function buildCrossingPath(start) {
    const sample = surfaceFieldAt(start.x, start.y);
    if (!Number.isFinite(sample.magnitude) || sample.magnitude < 1e-7) return [start];
    const points = [{ x: start.x, y: start.y }];
    let point = { x: start.x, y: start.y };
    const direction = { x: sample.ex / sample.magnitude, y: sample.ey / sample.magnitude };
    for (let index = 0; index < 58; index += 1) {
      const next = { x: point.x + direction.x * .06, y: point.y + direction.y * .06 };
      if (next.x < WORLD.xMin + .2 || next.x > WORLD.xMax - .2 || next.y < WORLD.yMin + .2 || next.y > WORLD.yMax - .2) break;
      if (model.pointSources(inputState()).some((source) => Math.hypot(next.x - source.x, next.y - source.y) < .42)) break;
      points.push(next);
      point = next;
    }
    return points;
  }

  function resetMotionState() {
    state.motionRunning = false;
    state.motionStarted = false;
    state.motionElapsed = 0;
    state.motionVelocityX = 0;
    state.motionVelocityY = 0;
    state.motionLastDirectionX = 0;
    state.motionLastDirectionY = 0;
    state.motionPauseReason = "";
    state.motionStartEnergyNanoJ = 0;
    state.motionTrajectory = [{ x: state.probeX, y: state.probeY }];
  }

  function restoreClassicMotionStart() {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(String(window.location.hash || "").replace(/^#/, ""));
    if (hash.has("scene") || search.get("resume") === "1") return;
    Object.assign(state, {
      mode: "potential",
      q1: 6,
      q2: -6,
      separation: 3,
      testCharge: 2,
      probeX: 0,
      probeY: 2,
      progress: 0,
      running: false,
      playbackRate: 1,
      path: "direct",
      demoPhase: "idle",
      demoRunning: false,
      demoProgress: 0,
      demoPath: [],
      demoPathIndex: 0,
      showFieldLines: false,
      showVectors: false,
      showEquipotential: true,
      showForce: true,
      showPotentialMap: true
    });
    resetMotionState();
    refreshHighlightAtProbe();
    render();
  }

  function motionBoundaryReason(point, sample) {
    if (sample.nearest !== null && sample.nearest <= MOTION.safeRadius) {
      return `自动暂停：试探电荷已接近源电荷安全半径 ${MOTION.safeRadius.toFixed(2)} m`;
    }
    const atBoundary = point.x <= WORLD.xMin + .2 || point.x >= WORLD.xMax - .2 || point.y <= WORLD.yMin + .2 || point.y >= WORLD.yMax - .2;
    return atBoundary ? "自动暂停：试探电荷已到达画布边界" : "";
  }

  function pauseMotion(reason = "手动暂停，当前位置已保留") {
    if (state.mode === "work") {
      state.running = false;
      render();
      return;
    }
    if (!state.motionStarted) return;
    state.motionRunning = false;
    state.motionPauseReason = reason;
    render();
  }

  function startMotion() {
    if (state.mode === "work") {
      if (state.progress >= .999) state.progress = 0;
      state.running = true;
      render();
      return;
    }
    if (!state.motionStarted) {
      const sample = solve();
      state.motionStartEnergyNanoJ = finite(sample.energyNanoJ);
      state.motionTrajectory = [{ x: state.probeX, y: state.probeY }];
      state.motionStarted = true;
      state.motionElapsed = 0;
      state.motionVelocityX = 0;
      state.motionVelocityY = 0;
    }
    state.motionRunning = true;
    state.motionPauseReason = "";
    state.running = false;
    state.demoRunning = false;
    render();
  }

  function advanceMotion(delta) {
    if (!state.motionRunning || state.mode === "work") return;
    const current = solve();
    const currentReason = motionBoundaryReason({ x: state.probeX, y: state.probeY }, current);
    if (currentReason) {
      pauseMotion(currentReason);
      return;
    }
    const speed = Math.hypot(state.motionVelocityX, state.motionVelocityY);
    if (current.forceNanoN < MOTION.minForce && speed < MOTION.minSpeed) {
      pauseMotion("自动暂停：电场力接近零，速度方向不再确定");
      return;
    }
    const teachingDelta = delta * state.playbackRate * MOTION.timeScale;
    const accelerationX = current.forceXNanoN / MOTION.effectiveMassNanoKg;
    const accelerationY = current.forceYNanoN / MOTION.effectiveMassNanoKg;
    state.motionVelocityX += accelerationX * teachingDelta;
    state.motionVelocityY += accelerationY * teachingDelta;
    const nextSpeed = Math.hypot(state.motionVelocityX, state.motionVelocityY);
    if (nextSpeed > MOTION.maxSpeed) {
      state.motionVelocityX *= MOTION.maxSpeed / nextSpeed;
      state.motionVelocityY *= MOTION.maxSpeed / nextSpeed;
    }
    const updatedSpeed = Math.hypot(state.motionVelocityX, state.motionVelocityY);
    if (updatedSpeed > 1e-7) {
      state.motionLastDirectionX = state.motionVelocityX / updatedSpeed;
      state.motionLastDirectionY = state.motionVelocityY / updatedSpeed;
    }
    const next = {
      x: state.probeX + state.motionVelocityX * teachingDelta,
      y: state.probeY + state.motionVelocityY * teachingDelta
    };
    const nextSample = surfaceFieldAt(next.x, next.y);
    const nextReason = motionBoundaryReason(next, nextSample);
    if (nextReason && nextSample.nearest !== null && nextSample.nearest <= MOTION.safeRadius) {
      pauseMotion(nextReason);
      return;
    }
    state.probeX = clamp(next.x, WORLD.xMin + .2, WORLD.xMax - .2);
    state.probeY = clamp(next.y, WORLD.yMin + .2, WORLD.yMax - .2);
    state.motionElapsed += teachingDelta;
    const lastPoint = state.motionTrajectory[state.motionTrajectory.length - 1];
    if (!lastPoint || Math.hypot(state.probeX - lastPoint.x, state.probeY - lastPoint.y) > .012) {
      state.motionTrajectory.push({ x: state.probeX, y: state.probeY });
      if (state.motionTrajectory.length > MOTION.maxTrail) state.motionTrajectory.shift();
    }
    if (nextReason) {
      pauseMotion(nextReason);
      return;
    }
    if (updatedSpeed < MOTION.minSpeed && current.forceNanoN < MOTION.minForce) {
      pauseMotion("自动暂停：速度接近零，当前位置已保留");
      return;
    }
    render();
  }

  function prepareTeachingDemo() {
    const anchor = { x: state.highlightAnchorX, y: state.highlightAnchorY };
    state.probeX = anchor.x;
    state.probeY = anchor.y;
    const forward = traceEquipotentialBranch(anchor, 1, 64);
    const backward = traceEquipotentialBranch(anchor, -1, 64);
    const along = forward.length >= 10 ? forward : backward;
    state.demoSegments = { along, cross: [] };
    state.demoPath = along;
    state.demoPathIndex = 0;
    state.demoProgress = 0;
    state.demoPhase = "along";
    state.guideStep = 0;
    state.demoRunning = true;
  }

  function toggleTeachingDemo() {
    if (state.mode !== "potential") {
      state.guideStep = (state.guideStep + 1) % generalGuide.length;
      render();
      return;
    }
    if (state.demoRunning) {
      state.demoRunning = false;
      render();
      return;
    }
    if (state.demoPhase === "complete" || !state.demoPath.length) prepareTeachingDemo();
    else state.demoRunning = true;
    render();
  }

  function advanceTeachingDemo(delta) {
    if (!state.demoRunning || state.mode !== "potential" || state.demoPath.length < 2) return;
    state.demoProgress = Math.min(1, state.demoProgress + delta * (state.playbackRate === 1 ? .7 : .42));
    const index = Math.min(state.demoPath.length - 1, Math.floor(state.demoProgress * (state.demoPath.length - 1)));
    const point = state.demoPath[index];
    state.demoPathIndex = index;
    state.probeX = point.x;
    state.probeY = point.y;
    if (state.demoProgress < 1) {
      render();
      return;
    }
    if (state.demoPhase === "along") {
      const cross = buildCrossingPath(point);
      state.demoSegments.cross = cross;
      state.demoPath = cross;
      state.demoPathIndex = 0;
      state.demoProgress = 0;
      state.demoPhase = "cross";
      state.guideStep = 1;
    } else {
      state.demoRunning = false;
      state.demoPhase = "complete";
      state.guideStep = 1;
    }
    render();
  }

  function render() {
    const sample = solve();
    renderControls(sample);
    renderReadouts(sample);
    renderLabels(sample);
    drawThreeScene(sample);
  }

  function setState(next) {
    const sourceChanged = ["mode", "q1", "q2", "separation", "uniformField"].some((key) => key in next);
    const probeChanged = "probeX" in next || "probeY" in next;
    const stateChanged = sourceChanged || "testCharge" in next;
    if ("mode" in next) {
      const normalizedMode = MODE_ALIASES[next.mode] || next.mode;
      if (modes[normalizedMode]) state.mode = normalizedMode;
    }
    if ("q1" in next) state.q1 = clamp(next.q1, -8, 8);
    if ("q2" in next) state.q2 = clamp(next.q2, -8, 8);
    if ("separation" in next) state.separation = clamp(next.separation, 1.2, 5);
    if ("uniformField" in next) state.uniformField = clamp(next.uniformField, -20, 20);
    if ("testCharge" in next) state.testCharge = clamp(next.testCharge, -4, 4);
    if ("probeX" in next) state.probeX = clamp(next.probeX, WORLD.xMin + .2, WORLD.xMax - .2);
    if ("probeY" in next) state.probeY = clamp(next.probeY, WORLD.yMin + .2, WORLD.yMax - .2);
    if ("progress" in next) state.progress = clamp(next.progress, 0, 1);
    if ("running" in next) state.running = Boolean(next.running);
    if ("path" in next && ["direct", "curve"].includes(next.path)) state.path = next.path;
    if ("playbackRate" in next && [.5, 1].includes(Number(next.playbackRate))) state.playbackRate = Number(next.playbackRate);
    if ("guideStep" in next) state.guideStep = clamp(Math.round(next.guideStep), 0, guide.length - 1);
    if (stateChanged || probeChanged) {
      state.demoRunning = false;
      state.demoPhase = "idle";
      state.demoPath = [];
      state.demoProgress = 0;
      resetMotionState();
    }
    if ((sourceChanged || state.mode === "potential" && !probeChanged && "mode" in next) && state.mode === "potential") refreshHighlightAtProbe();
    [["showFieldLines", refs.showFieldLinesToggle], ["showVectors", refs.showVectorsToggle], ["showEquipotential", refs.showEquipotentialToggle], ["showForce", refs.showForceToggle], ["showPotentialMap", refs.showPotentialMapToggle]].forEach(([key, input]) => {
      if (key in next) state[key] = Boolean(next[key]);
      input.checked = state[key];
    });
    render();
  }

  function setMode(modeName) {
    const normalizedMode = MODE_ALIASES[modeName] || modeName;
    const config = modes[normalizedMode];
    if (!config) return;
    Object.assign(state, { mode: normalizedMode, q1: config.q1, q2: config.q2, separation: config.separation, probeX: config.probeX, probeY: config.probeY, progress: 0, running: false, path: "direct", demoRunning: false, demoPhase: "idle", demoPath: [], demoProgress: 0 });
    Object.assign(state, normalizedMode === "space3d"
      ? { showFieldLines: true, showVectors: true, showEquipotential: false, showForce: true, showPotentialMap: false }
      : { showFieldLines: false, showVectors: false, showEquipotential: true, showForce: true, showPotentialMap: true });
    resetMotionState();
    if (normalizedMode === "potential") refreshHighlightAtProbe();
    render();
  }

  function keyState() {
    if (state.mode === "potential") setState({ probeX: state.highlightAnchorX, probeY: state.highlightAnchorY, running: false });
    else setState({ probeX: 0, probeY: 2, running: false });
  }

  [[refs.source1Input, "q1"], [refs.source2Input, "q2"], [refs.separationInput, "separation"], [refs.uniformInput, "uniformField"], [refs.testChargeInput, "testCharge"]].filter(([input]) => input).forEach(([input, key]) => input.addEventListener("input", () => setState({ [key]: input.value, running: false })));
  if (refs.progressInput) refs.progressInput.addEventListener("input", () => setState({ progress: refs.progressInput.value, running: false }));
  refs.sceneTabs.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  refs.routeSteps.forEach((button, index) => button.addEventListener("click", () => { state.guideStep = index; render(); }));
  refs.pathButtons.forEach((button) => button.addEventListener("click", () => { state.path = button.dataset.path; state.progress = 0; state.running = false; render(); }));
  refs.rateButtons.forEach((button) => button.addEventListener("click", () => { state.playbackRate = Number(button.dataset.rate); render(); }));
  refs.polarityButtons.forEach((button) => button.addEventListener("click", () => {
    const magnitude = Math.max(Math.abs(state.testCharge), 2);
    setState({ testCharge: Number(button.dataset.chargeSign) * magnitude, running: false });
  }));
  refs.presetButtons.forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.preset === "dipole") setMode("potential");
    else if (button.dataset.preset === "space") setMode("space3d");
    else if (button.dataset.preset === "positive") setState({ testCharge: Math.max(Math.abs(state.testCharge), 2), running: false });
    else if (button.dataset.preset === "negative") setState({ testCharge: -Math.max(Math.abs(state.testCharge), 2), running: false });
    else setState({ testCharge: state.testCharge === 0 ? -2 : -state.testCharge, running: false });
  }));
  refs.playButton.addEventListener("click", startMotion);
  refs.pauseButton.addEventListener("click", () => pauseMotion());
  refs.keyButton.addEventListener("click", keyState);
  refs.resetButton.addEventListener("click", () => {
    Object.assign(state, { mode: "potential", q1: 6, q2: -6, separation: 3, testCharge: 2, uniformField: 12, probeX: 0, probeY: 2, path: "direct", progress: 0, running: false, playbackRate: 1, guideStep: 0, highlightLevel: 0, highlightAnchorX: 0, highlightAnchorY: 2, demoPhase: "idle", demoRunning: false, demoProgress: 0, demoPath: [], demoPathIndex: 0, showFieldLines: false, showVectors: false, showEquipotential: true, showForce: true, showPotentialMap: true });
    resetMotionState();
    refs.showFieldLinesToggle.checked = false;
    refs.showVectorsToggle.checked = false;
    refs.showEquipotentialToggle.checked = true;
    refs.showForceToggle.checked = true;
    refs.showPotentialMapToggle.checked = true;
    render();
  });
  [[refs.showFieldLinesToggle, "showFieldLines"], [refs.showVectorsToggle, "showVectors"], [refs.showEquipotentialToggle, "showEquipotential"], [refs.showForceToggle, "showForce"], [refs.showPotentialMapToggle, "showPotentialMap"]].forEach(([input, key]) => input.addEventListener("change", () => { state[key] = input.checked; render(); }));
  refs.guideButton.addEventListener("click", () => refs.guideDialog.showModal());
  if (refs.stepButton) refs.stepButton.addEventListener("click", toggleTeachingDemo);
  refs.focusButton.addEventListener("click", () => { const active = document.body.classList.toggle("focus-mode"); refs.focusButton.setAttribute("aria-pressed", String(active)); });
  refs.fullscreenButton.addEventListener("click", () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());

  function worldPointFromPointer(event) {
    const rect = refs.canvas.getBoundingClientRect();
    threeState.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    threeState.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    threeState.raycaster.setFromCamera(threeState.pointer, threeState.camera);
    const point = new THREE.Vector3();
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    return threeState.raycaster.ray.intersectPlane(plane, point);
  }

  function pointerToState(event) {
    const rect = refs.canvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    if (state.mode === "work") {
      let bestProgress = 0;
      let bestDistance = Infinity;
      for (const point of fieldGeometry.path) {
        const distance = Math.hypot(point.x - px, point.y - py);
        if (distance < bestDistance) { bestDistance = distance; bestProgress = point.progress; }
      }
      setState({ progress: bestProgress, running: false });
      return;
    }
    const point = worldPointFromPointer(event);
    if (!point) return;
    const x = clamp(point.x, WORLD.xMin + .2, WORLD.xMax - .2);
    const y = clamp(point.y, WORLD.yMin + .2, WORLD.yMax - .2);
    const sources = model.pointSources(inputState());
    if (sources.some((source) => Math.hypot(x - source.x, y - source.y) < .42)) return;
    setState({ probeX: x, probeY: y, running: false });
  }

  function probeHit(event) {
    if (!threeState.probe) return false;
    const rect = refs.canvas.getBoundingClientRect();
    threeState.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    threeState.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    threeState.raycaster.setFromCamera(threeState.pointer, threeState.camera);
    return threeState.raycaster.intersectObject(threeState.probe, false).length > 0;
  }

  refs.canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (probeHit(event)) {
      state.dragging = true;
      threeState.cameraMode = "probe";
    } else {
      threeState.cameraMode = event.button === 2 || event.shiftKey ? "pan" : "orbit";
    }
    threeState.lastPointer = { x: event.clientX, y: event.clientY };
    refs.canvas.classList.add("is-dragging");
    refs.canvas.setPointerCapture(event.pointerId);
  });
  refs.canvas.addEventListener("pointermove", (event) => {
    if (!threeState.lastPointer) threeState.lastPointer = { x: event.clientX, y: event.clientY };
    const dx = event.clientX - threeState.lastPointer.x;
    const dy = event.clientY - threeState.lastPointer.y;
    threeState.lastPointer = { x: event.clientX, y: event.clientY };
    if (state.dragging && threeState.cameraMode === "probe") {
      refs.canvas.style.cursor = "grabbing";
      pointerToState(event);
      return;
    }
    if (!threeState.cameraMode || threeState.cameraMode === "probe") {
      refs.canvas.style.cursor = probeHit(event) ? "grab" : "grab";
      return;
    }
    if (threeState.cameraMode === "orbit") {
      threeState.theta -= dx * .008;
      threeState.phi = clamp(threeState.phi + dy * .008, .42, 1.38);
    } else if (threeState.cameraMode === "pan") {
      threeState.target.x -= dx * .012;
      threeState.target.y += dy * .012;
    }
    updateCamera();
    drawThreeScene(solve());
  });
  refs.canvas.addEventListener("pointerup", (event) => { state.dragging = false; threeState.cameraMode = null; threeState.lastPointer = null; refs.canvas.classList.remove("is-dragging"); refs.canvas.style.cursor = "grab"; if (refs.canvas.hasPointerCapture(event.pointerId)) refs.canvas.releasePointerCapture(event.pointerId); render(); });
  refs.canvas.addEventListener("pointercancel", (event) => { state.dragging = false; threeState.cameraMode = null; threeState.lastPointer = null; refs.canvas.classList.remove("is-dragging"); refs.canvas.style.cursor = "grab"; if (refs.canvas.hasPointerCapture(event.pointerId)) refs.canvas.releasePointerCapture(event.pointerId); render(); });
  refs.canvas.addEventListener("wheel", (event) => { event.preventDefault(); threeState.radius = clamp(threeState.radius * Math.exp(event.deltaY * .001), 7, 24); updateCamera(); drawThreeScene(solve()); }, { passive: false });
  refs.canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  window.addEventListener("resize", render);

  let lastFrame = performance.now();
  function frame(now) {
    const delta = Math.min(.05, (now - lastFrame) / 1000);
    lastFrame = now;
    if (state.motionRunning && state.mode !== "work") advanceMotion(delta);
    else if (state.demoRunning && state.mode === "potential") advanceTeachingDemo(delta);
    else if (state.running && state.mode === "work") {
      state.progress += delta * state.playbackRate / 4;
      if (state.progress >= 1) { state.progress = 1; state.running = false; }
      render();
    }
    requestAnimationFrame(frame);
  }

  initializeThree();
  window.electricFieldLab = {
    solve: (input = {}) => input.mode === "work" ? model.workState({ ...inputState(), ...input }, input.progress ?? state.progress) : model.pointState({ ...inputState(), ...input }),
    getState: () => ({ ...state }),
    getInteractionGeometry: () => JSON.parse(JSON.stringify(fieldGeometry)),
    setState,
    setMode
  };
  render();
  requestAnimationFrame(frame);
  window.setTimeout(restoreClassicMotionStart, 0);
})();
