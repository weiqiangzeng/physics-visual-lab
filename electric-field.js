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
    fieldNature: document.getElementById("fieldNature"),
    fieldExplanation: document.getElementById("fieldExplanation"),
    profileKicker: document.getElementById("profileKicker"),
    profileTitle: document.getElementById("profileTitle"),
    profileStatus: document.getElementById("profileStatus"),
    vectorKicker: document.getElementById("vectorKicker"),
    vectorTitle: document.getElementById("vectorTitle"),
    vectorStatus: document.getElementById("vectorStatus"),
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
    single: { title: "单电荷场", goal: "电场先存在，试探电荷只负责测量", hint: "拖动探针，比较 E、F 和 V", q1: 6, q2: -6, separation: 3, probeX: 2.4, probeY: 1.2, key: "◎ 半径 2 m" },
    superposition: { title: "电场矢量叠加", goal: "同一点的合场来自各源电荷场强的矢量和", hint: "定位中垂线，寻找 V=0 但 E≠0", q1: 6, q2: -6, separation: 3, probeX: 0, probeY: 2, key: "◎ 偶极中垂线" },
    potential: { title: "等势线地形", goal: "把电势画成等高线：沿同一条线移动，电势能不变", hint: "拖动试探电荷，比较 V 与 U=qV", q1: 6, q2: -6, separation: 3, probeX: -1.1, probeY: 1.2, key: "◎ 定位等势线" },
    work: { title: "静电场做功", goal: "同一对端点间电场力做功与路径无关", hint: "比较直达与绕行路径的终点功", q1: 6, q2: -6, separation: 3, probeX: -3, probeY: -1.5, key: "◎ 到达共同终点" }
  };
  const guide = [
    { title: "先定义场强", prompt: "把 q₀ 变为零，空间中的 E 和 V 是否消失？" },
    { title: "比较标量与矢量", prompt: "为什么某一点可以 V=0 但 E 不等于零，或 E=0 但 V 不等于零？" },
    { title: "核对做功与能量", prompt: "两条路径形状不同，为什么终点的 W 和 ΔU 仍完全一致？" }
  ];
  const state = {
    mode: "potential",
    q1: 6,
    q2: -6,
    separation: 3,
    testCharge: 2,
    uniformField: 12,
    probeX: -1.1,
    probeY: 1.2,
    path: "direct",
    progress: 0,
    running: false,
    playbackRate: 0.5,
    guideStep: 0,
    dragging: false,
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
  const TERRAIN = { clipV: 100, verticalScale: 0.055, sampleX: 54, sampleY: 38 };
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
    if (state.mode === "work") return model.uniformState(inputState(), { x, y });
    return model.fieldFromSources(model.pointSources(inputState()), x, y);
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
    for (let j = 0; j <= ny; j += 1) {
      for (let i = 0; i <= nx; i += 1) {
        const x = WORLD.xMin + (WORLD.xMax - WORLD.xMin) * i / nx;
        const y = WORLD.yMin + (WORLD.yMax - WORLD.yMin) * j / ny;
        const sample = surfaceFieldAt(x, y);
        values[j * (nx + 1) + i] = Number.isFinite(sample.potential) ? sample.potential : NaN;
      }
    }
    return { nx, ny, values };
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
        const value = Number.isFinite(point.value) ? clamp(point.value, -TERRAIN.clipV, TERRAIN.clipV) : 0;
        positions.push(point.x, point.y, terrainHeight(value));
        const ratio = value / TERRAIN.clipV;
        if (ratio > .03) color.setHSL(.015, .72, .29 + .18 * ratio);
        else if (ratio < -.03) color.setHSL(.62, .72, .29 + .18 * -ratio);
        else color.setHSL(.48, .36, .27);
        colors.push(color.r, color.g, color.b);
      }
    }
    for (let j = 0; j < ny; j += 1) {
      for (let i = 0; i < nx; i += 1) {
        const a = j * (nx + 1) + i;
        const b = a + 1;
        const d = (j + 1) * (nx + 1) + i;
        const c = d + 1;
        indices.push(a, b, d, b, c, d);
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

  function buildEquipotentialLines(grid) {
    const points = [];
    const levels = state.mode === "work" ? [-36, -24, -12, 0, 12, 24, 36] : [-60, -40, -24, -12, 0, 12, 24, 40, 60];
    for (const level of levels) {
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
              points.push(a.x, a.y, terrainHeight(level) + .045, b.x, b.y, terrainHeight(level) + .045);
            }
          }
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    const material = new THREE.LineBasicMaterial({ color: 0xf1e8cb, transparent: true, opacity: .7, depthTest: false });
    const lines = new THREE.LineSegments(geometry, material);
    lines.visible = state.showEquipotential;
    return lines;
  }

  function addArrow(group, x, y, z, ex, ey, color, length = .42) {
    const magnitude = Math.hypot(ex, ey);
    if (!Number.isFinite(magnitude) || magnitude < 1e-8) return;
    const direction = new THREE.Vector3(ex / magnitude, ey / magnitude, 0);
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
    const grid = buildSurfaceGrid();
    clearDynamicScene();
    const terrain = buildTerrain(grid);
    threeState.dynamic.add(terrain);
    threeState.dynamic.add(buildEquipotentialLines(grid));
    if (state.mode === "work") addWorkScene(threeState.dynamic);
    else {
      addSourceMarkers(threeState.dynamic, sample.sources);
      addVectorGrid(threeState.dynamic);
    }
    addProbe(threeState.dynamic, sample);
    const { width, height } = resizeThree();
    const projected = new THREE.Vector3(sample.x, sample.y, terrainHeight(sample.potential) + .27).project(threeState.camera);
    fieldGeometry.mode = state.mode;
    fieldGeometry.probe = { x: (projected.x + 1) * width / 2, y: (1 - projected.y) * height / 2 };
    fieldGeometry.path = state.mode === "work" ? Array.from({ length: 91 }, (_, index) => {
      const point = model.pathPoint(state.path, index / 90);
      const pointSample = surfaceFieldAt(point.x, point.y);
      const screen = new THREE.Vector3(point.x, point.y, terrainHeight(pointSample.potential) + .2).project(threeState.camera);
      return { x: (screen.x + 1) * width / 2, y: (1 - screen.y) * height / 2, progress: index / 90 };
    }) : [];
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
    if (state.mode === "work") {
      return state.progress >= .999 ? { badge: "路径终点一致", className: "is-special", nature: "W = −ΔU", explanation: `路径 A、B 的总功均为 ${signed(sample.finalWorkNanoJ, 1)} nJ` } : { badge: "路径比较中", className: "is-special", nature: "静电场力是保守力", explanation: "沿途过程可以不同，端点决定总功和势能变化" };
    }
    if (state.mode === "superposition" && Math.abs(sample.potential) < 1e-8 && sample.magnitude > 1e-6) return { badge: "V=0，E≠0", className: "is-special", nature: "电势相消，场强未相消", explanation: "电势按标量相加；场强仍需按方向做矢量和" };
    if (state.mode === "potential" && sample.magnitude < 1e-8 && Math.abs(sample.potential) > 1e-6) return { badge: "E=0，V≠0", className: "is-special", nature: "场强相消，电势仍为正", explanation: "零场强只表示电势局部斜率为零，不表示电势为零" };
    if (sample.magnitude < 1e-8 && Math.abs(sample.potential) < 1e-8) return { badge: "场与电势均为零", className: "is-zero", nature: "源电荷贡献相消或为零", explanation: "改变源电荷后重新观察空间分布" };
    if (Math.abs(state.testCharge) < 1e-9) return { badge: "q₀=0，场仍存在", className: "is-special", nature: "E 与 q₀ 无关", explanation: "试探电荷为零时 F=U=0，但源电荷建立的 E、V 不变" };
    return { badge: sample.potential >= 0 ? "正电势区域" : "负电势区域", className: sample.potential >= 0 ? "is-positive" : "is-negative", nature: state.testCharge > 0 ? "F 与 E 同向" : "F 与 E 反向", explanation: "E 的方向按正试探电荷受力方向定义" };
  }

  function renderControls(sample) {
    const workMode = state.mode === "work";
    const twoSource = state.mode === "superposition" || state.mode === "potential";
    refs.source1Section.hidden = workMode;
    refs.source2Section.hidden = !twoSource;
    refs.separationSection.hidden = !twoSource;
    refs.uniformSection.hidden = !workMode;
    refs.pathSection.hidden = !workMode;
    refs.source1Input.value = state.q1;
    refs.source2Input.value = state.q2;
    refs.separationInput.value = state.separation;
    refs.uniformInput.value = state.uniformField;
    refs.testChargeInput.value = state.testCharge;
    refs.progressInput.value = state.progress;
    refs.source1Value.textContent = `${signed(state.q1)} nC`;
    refs.source2Value.textContent = `${signed(state.q2)} nC`;
    refs.separationValue.textContent = `${state.separation.toFixed(1)} m`;
    refs.uniformValue.textContent = `${signed(state.uniformField)} N/C`;
    refs.testChargeValue.textContent = `${signed(state.testCharge)} nC`;
    refs.progressLabel.textContent = workMode ? "路径进度" : "探针坐标";
    refs.progressValue.textContent = workMode ? `${(state.progress * 100).toFixed(1)}% · ${state.path === "direct" ? "路径 A" : "路径 B"}` : `x = ${sample.x.toFixed(2)} m · y = ${sample.y.toFixed(2)} m`;
    refs.progressInput.disabled = !workMode;
    refs.playButton.disabled = !workMode;
    refs.pauseButton.disabled = !workMode;
    refs.playButton.setAttribute("aria-pressed", String(state.running));
    refs.playButton.textContent = state.running ? "▶ 运行中" : "▶ 播放";
    refs.keyButton.textContent = modes[state.mode].key;
    refs.sceneTabs.forEach((button) => button.classList.toggle("is-active", button.dataset.mode === state.mode));
    refs.pathButtons.forEach((button) => button.classList.toggle("is-active", button.dataset.path === state.path));
    refs.rateButtons.forEach((button) => button.classList.toggle("is-active", Number(button.dataset.rate) === state.playbackRate));
    [refs.source1Input, refs.source2Input, refs.separationInput, refs.uniformInput, refs.testChargeInput, refs.progressInput].forEach(rangeProgress);
  }

  function renderReadouts(sample) {
    const angle = sample.magnitude > 1e-8 ? Math.atan2(sample.ey, sample.ex) * 180 / Math.PI : null;
    refs.fieldMetric.textContent = `${finite(sample.magnitude).toFixed(3)} N/C`;
    refs.directionMetric.textContent = angle === null ? "无确定方向" : `${signed(angle, 1)}°`;
    refs.potentialMetric.textContent = `${signed(finite(sample.potential), 3)} V`;
    refs.forceMetric.textContent = `${finite(sample.forceNanoN).toFixed(3)} nN`;
    refs.energyMetric.textContent = `${signed(finite(sample.energyNanoJ), 3)} nJ`;
    const status = statusFor(sample);
    refs.stateBadge.textContent = status.badge;
    refs.stateBadge.className = `state-badge ${status.className}`;
    refs.fieldNature.textContent = status.nature;
    refs.fieldExplanation.textContent = status.explanation;
    if (state.mode === "work") refs.formulaReadout.textContent = `W = ${signed(sample.workNanoJ, 2)} nJ = −ΔU`;
    else if (state.mode === "single") refs.formulaReadout.textContent = `E = k|Q|/r² = ${sample.magnitude.toFixed(3)} N/C`;
    else refs.formulaReadout.textContent = `E = E₁ + E₂ = ${sample.magnitude.toFixed(3)} N/C`;
  }

  function renderLabels(sample) {
    const config = modes[state.mode];
    refs.modeTitle.textContent = config.title;
    refs.modeGoal.textContent = config.goal;
    refs.stageHint.textContent = config.hint;
    if (state.mode === "single") {
      refs.profileKicker.textContent = "RADIAL PROFILE";
      refs.profileTitle.textContent = "场强 E(r)";
      refs.profileStatus.textContent = "E ∝ 1/r²";
      refs.vectorKicker.textContent = "POTENTIAL PROFILE";
      refs.vectorTitle.textContent = "电势 V(r)";
      refs.vectorStatus.textContent = "V ∝ 1/r";
    } else if (state.mode === "work") {
      refs.profileKicker.textContent = "PATH POTENTIAL";
      refs.profileTitle.textContent = "两条路径上的 V(s)";
      refs.profileStatus.textContent = `Vᴀ=${sample.start.potential.toFixed(1)} V · Vʙ=${sample.end.potential.toFixed(1)} V`;
      refs.vectorKicker.textContent = "CONSERVATIVE WORK";
      refs.vectorTitle.textContent = "W(s) 与 −ΔU(s)";
      refs.vectorStatus.textContent = `终点 W=${signed(sample.finalWorkNanoJ, 1)} nJ`;
    } else {
      refs.profileKicker.textContent = "SCALAR PROFILE";
      refs.profileTitle.textContent = "探针高度上的 V(x)";
      refs.profileStatus.textContent = state.mode === "superposition" ? "电势按代数和叠加" : "等势线越密，|∇V| 越大";
      refs.vectorKicker.textContent = "VECTOR COMPONENTS";
      refs.vectorTitle.textContent = "场强分量 Eₓ(x)、Eᵧ(x)";
      refs.vectorStatus.textContent = "E = −∇V";
    }
    refs.stepIndex.textContent = String(state.guideStep + 1).padStart(2, "0");
    refs.stepTitle.textContent = guide[state.guideStep].title;
    refs.stepPrompt.textContent = guide[state.guideStep].prompt;
    refs.routeSteps.forEach((button, index) => button.classList.toggle("is-active", index === state.guideStep));
  }

  function render() {
    const sample = solve();
    renderControls(sample);
    renderReadouts(sample);
    renderLabels(sample);
    drawThreeScene(sample);
    drawCharts(sample);
  }

  function setState(next) {
    if ("mode" in next && modes[next.mode]) state.mode = next.mode;
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
    [["showFieldLines", refs.showFieldLinesToggle], ["showVectors", refs.showVectorsToggle], ["showEquipotential", refs.showEquipotentialToggle], ["showForce", refs.showForceToggle], ["showPotentialMap", refs.showPotentialMapToggle]].forEach(([key, input]) => {
      if (key in next) state[key] = Boolean(next[key]);
      input.checked = state[key];
    });
    render();
  }

  function setMode(modeName) {
    const config = modes[modeName];
    if (!config) return;
    Object.assign(state, { mode: modeName, q1: config.q1, q2: config.q2, separation: config.separation, probeX: config.probeX, probeY: config.probeY, progress: 0, running: false, path: "direct" });
    render();
  }

  function keyState() {
    if (state.mode === "single") setState({ probeX: 2, probeY: 0, running: false });
    else if (state.mode === "superposition") setState({ probeX: 0, probeY: 2, running: false });
    else if (state.mode === "potential") setState({ probeX: 0, probeY: 0, running: false });
    else setState({ progress: 1, running: false });
  }

  [[refs.source1Input, "q1"], [refs.source2Input, "q2"], [refs.separationInput, "separation"], [refs.uniformInput, "uniformField"], [refs.testChargeInput, "testCharge"]].forEach(([input, key]) => input.addEventListener("input", () => setState({ [key]: input.value, running: false })));
  refs.progressInput.addEventListener("input", () => setState({ progress: refs.progressInput.value, running: false }));
  refs.sceneTabs.forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  refs.routeSteps.forEach((button, index) => button.addEventListener("click", () => { state.guideStep = index; render(); }));
  refs.pathButtons.forEach((button) => button.addEventListener("click", () => { state.path = button.dataset.path; state.progress = 0; state.running = false; render(); }));
  refs.rateButtons.forEach((button) => button.addEventListener("click", () => { state.playbackRate = Number(button.dataset.rate); render(); }));
  refs.presetButtons.forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.preset === "positive") setMode("single");
    else if (button.dataset.preset === "dipole") setMode("superposition");
    else if (button.dataset.preset === "like") setMode("potential");
    else { state.testCharge = state.testCharge === 0 ? -2 : -state.testCharge; state.running = false; render(); }
  }));
  refs.playButton.addEventListener("click", () => { if (state.mode !== "work") return; if (state.progress >= .999) state.progress = 0; setState({ running: true }); });
  refs.pauseButton.addEventListener("click", () => setState({ running: false }));
  refs.keyButton.addEventListener("click", keyState);
  refs.resetButton.addEventListener("click", () => {
    Object.assign(state, { mode: "potential", q1: 6, q2: -6, separation: 3, testCharge: 2, uniformField: 12, probeX: -1.1, probeY: 1.2, path: "direct", progress: 0, running: false, playbackRate: .5, guideStep: 0, showFieldLines: false, showVectors: false, showEquipotential: true, showForce: true, showPotentialMap: true });
    refs.showFieldLinesToggle.checked = false;
    refs.showVectorsToggle.checked = false;
    refs.showEquipotentialToggle.checked = true;
    refs.showForceToggle.checked = true;
    refs.showPotentialMapToggle.checked = true;
    render();
  });
  [[refs.showFieldLinesToggle, "showFieldLines"], [refs.showVectorsToggle, "showVectors"], [refs.showEquipotentialToggle, "showEquipotential"], [refs.showForceToggle, "showForce"], [refs.showPotentialMapToggle, "showPotentialMap"]].forEach(([input, key]) => input.addEventListener("change", () => { state[key] = input.checked; render(); }));
  refs.guideButton.addEventListener("click", () => refs.guideDialog.showModal());
  refs.stepButton.addEventListener("click", () => { state.guideStep = (state.guideStep + 1) % guide.length; render(); });
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
    if (state.running && state.mode === "work") {
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
})();
