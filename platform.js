(function () {
  const lessons = [
    "motion-graphs.html",
    "friction.html",
    "newton-laws.html",
    "projectile.html",
    "circular.html",
    "ohm-law.html",
    "oscillation.html",
    "waves.html",
    "charged-particle.html",
    "refraction.html",
    "double-slit.html"
  ];
  const lessonTasks = {
    "motion-graphs.html": [
      "切换匀速和匀变速，比较 \\(x-t\\) 图像的斜率。",
      "拖动同一时刻的竖线，对照 \\(x-t\\) 和 \\(v-t\\) 图像上的点。",
      "观察 \\(v-t\\) 图像与时间轴围成的面积，说明它为什么表示位移。"
    ],
    "friction.html": [
      "逐渐增大外力，记录物体仍然静止时 \\(f_{\\mathrm{静}}\\) 的变化。",
      "定位 \\(f_{\\mathrm{max}}\\)，判断何时开始发生相对滑动。",
      "改变质量或摩擦因数，比较 \\(f_{\\mathrm{max}}\\) 和 \\(f_{\\mathrm{滑}}\\)。"
    ],
    "newton-laws.html": [
      "保持质量不变，改变 \\(F_{\\mathrm{合}}\\)，观察加速度如何变化。",
      "保持合力不变，改变质量，比较相同时间内速度的变化。",
      "把 \\(F_{\\mathrm{合}}\\) 调为零，判断物体可以保持什么运动状态。"
    ],
    "projectile.html": [
      "定位最高点，确认 \\(v_y = 0\\) 但速度并不为 0。",
      "改变发射角，比较飞行时间和水平射程。",
      "用 \\(v_x\\)、\\(v_y\\) 说明水平方向和竖直方向为什么可以分开研究。"
    ],
    "circular.html": [
      "定位三个关键位置，确认速度沿切线、加速度指向圆心。",
      "改变线速度，观察 \\(a_c\\) 如何变化。",
      "改变半径，比较 \\(F_c\\)、周期和速度方向的变化。"
    ],
    "oscillation.html": [
      "定位端点和平衡位置，比较速度与加速度的大小。",
      "在时间图像和相位圆中追踪 \\(x\\)、\\(v\\)、\\(a\\) 的相位关系。",
      "改变质量或劲度系数，观察周期如何变化。"
    ],
    "waves.html": [
      "分别观察入射波、反射波和合成波的传播方向。",
      "定位节点和腹部，比较它们的位移与振幅。",
      "改变波长，验证节点间距与波长的关系。"
    ],
    "charged-particle.html": [
      "比较仅电场和仅磁场，观察电场力与磁场力对运动的不同作用。",
      "进入配速法，把速度调到竖直合力接近 0。",
      "用 \\(v = v_{\\mathrm{配}} + v_{\\mathrm{余}}\\) 解释配速漂移与余速圆周运动。"
    ],
    "refraction.html": [
      "先确认入射角和折射角都是从法线量起，再比较两者大小。",
      "固定两种介质，改变入射角，观察折射角是否按斯涅尔定律变化。",
      "让光从高折射率介质射向低折射率介质，找到临界角并观察全反射。"
    ],
    "double-slit.html": [
      "先定位中央亮纹，再寻找两侧相邻亮纹，比较它们的间距。",
      "每次只改变一个参数，观察波长、双缝间距和屏距对条纹的影响。",
      "在屏上选择亮纹和暗纹位置，用路程差解释相长与相消干涉。"
    ]
  };
  const lessonPlans = {
    "motion-graphs.html": {
      goal: "建立 x-t、v-t 图像与运动状态之间的对应关系。",
      prerequisite: "位置可以用数轴表示，时间会不断向前推进；速度表示运动快慢，正负号可以表示方向。斜率和面积的含义不用提前背，实验会结合图像一步步看出来。",
      prompts: [
        "先隐藏图像，只看运动小车，让学生判断运动方向。",
        "显示 x-t 图像，追问某时刻曲线斜率对应哪个物理量。",
        "显示 v-t 图像，圈出面积并用位移解释正负。"
      ],
      takeaway: "\\(x-t\\) 图像的斜率表示速度，\\(v-t\\) 图像的斜率表示加速度，\\(v-t\\) 图像的有向面积表示位移。"
    },
    "friction.html": {
      goal: "区分静摩擦力的自适应性、最大静摩擦力和滑动摩擦力。",
      prerequisite: "知道力可以改变运动状态，物体静止时合力也可能为零；两种摩擦力的区别会通过外力变化直接观察。",
      prompts: [
        "先从零开始增大外力，让学生预测静摩擦力是否变化。",
        "暂停在临界点，比较外力、静摩擦力和最大静摩擦力。",
        "继续增大外力，观察滑动后摩擦力与加速度的变化。"
      ],
      takeaway: "静摩擦力由运动趋势决定且不超过最大值；滑动后 \\(f_{\\mathrm{滑}} \\approx \\mu_k N\\)。"
    },
    "newton-laws.html": {
      goal: "建立合力、质量和加速度的定量关系。",
      prerequisite: "知道力会改变运动状态，质量不同的物体变化快慢可能不同；公式不必提前背，实验会直接比较。",
      prompts: [
        "先只看受力箭头，让学生指出合力方向。",
        "固定质量改变合力，观察 a-F 图像是否通过原点。",
        "把合力调为零，区分加速度为零和速度为零。"
      ],
      takeaway: "加速度由合外力和质量共同决定；\\(F_{\\mathrm{合}} = 0\\) 时物体可以静止，也可以匀速直线运动。"
    },
    "projectile.html": {
      goal: "建立速度分解和独立运动的观念。",
      prerequisite: "知道速度有大小和方向，会把一个速度分成水平、竖直两个方向；两个方向怎样共同决定轨迹，会在实验中展开。",
      prompts: [
        "先让学生预测最高点的速度，再暂停到最高点核对。",
        "固定发射速度，改变角度，比较飞行时间和射程。",
        "回到 vx、vy 读数，用分运动解释轨迹。"
      ],
      takeaway: "平抛或斜抛运动可以分解为水平方向和竖直方向的独立运动。"
    },
    "circular.html": {
      goal: "区分速度方向和加速度方向，理解向心加速度。",
      prerequisite: "知道速度方向改变也算速度改变；为什么需要指向圆心的加速度，会结合圆轨道和箭头观察。",
      prompts: [
        "暂停在不同位置，让学生分别指出速度和加速度方向。",
        "保持半径不变改变速度，观察向心加速度的变化。",
        "改变半径，讨论周期、向心力和运动快慢。"
      ],
      takeaway: "匀速圆周运动的速率可以不变，但速度方向持续改变，所以仍有加速度。"
    },
    "oscillation.html": {
      goal: "建立位移、速度、加速度和能量的相位关系。",
      prerequisite: "知道物体会在平衡位置附近往复运动，周期表示重复一次所需的时间；位移、速度和加速度的关系会在相位图中展示。",
      prompts: [
        "先定位端点和平衡位置，让学生预测 v 和 a 的大小。",
        "拖动时间条，对照相位圆和时间图像。",
        "改变质量或劲度系数，观察周期变化并回到公式解释。"
      ],
      takeaway: "简谐运动中端点速度为零、加速度最大，平衡位置速度最大、加速度为零。"
    },
    "waves.html": {
      goal: "区分波的传播和介质质点的振动，理解叠加与驻波。",
      prerequisite: "知道波相遇后可以叠加，叠加后还会继续传播；相位相同或相反时图样如何变化，会用两列波观察。",
      prompts: [
        "分别显示两列波，让学生判断传播方向。",
        "切换合成波，寻找节点和腹部并比较振幅。",
        "改变波长，观察节点间距是否随之改变。"
      ],
      takeaway: "驻波由相向传播的波叠加形成，节点不振动，腹部振幅最大。"
    },
    "charged-particle.html": {
      goal: "比较电场力、磁场力和恒力，建立复合场中的受力分析。",
      prerequisite: "知道电场力和磁场力都可能改变带电粒子的运动；两种力什么时候能相互抵消，会跟踪粒子轨迹。",
      prompts: [
        "先比较仅电场和仅磁场，明确两种力对速率和方向的影响。",
        "进入配速法，先观察偏转，再寻找竖直合力接近零的速度。",
        "用 v = v配 + v余 解释漂移与圆周分运动。"
      ],
      takeaway: "复合场轨迹取决于各力的方向和大小，配速只消除特定方向的合力。"
    },
    "refraction.html": {
      goal: "建立入射角、折射角、折射率和临界角之间的联系。",
      prerequisite: "知道光线改变传播介质后可能改变方向，角度从法线量起；折射率如何影响偏折，会通过光路和读数直接观察。",
      prompts: [
        "先看法线和两条光线，判断折射光线向法线靠近还是远离。",
        "固定折射率改变入射角，用读数核对斯涅尔定律。",
        "切换到高折射率介质射向低折射率介质，寻找临界角和全反射。"
      ],
      takeaway: "折射满足 \\(n_1\\sin\\theta_1=n_2\\sin\\theta_2\\)；只有从高折射率介质射向低折射率介质时才可能发生全反射。"
    },
    "double-slit.html": {
      goal: "建立波长、双缝间距、屏距与条纹间距之间的定量关系。",
      prerequisite: "知道波可以叠加，光程差会造成相位差；亮纹和暗纹怎样由路程差决定，会通过屏上强度分布直接观察。",
      prompts: [
        "先找到中央亮纹，观察两侧亮纹是否近似对称。",
        "改变波长或屏距，比较相邻亮纹的距离。",
        "切换路程差观察，判断相长和相消干涉的条件。"
      ],
      takeaway: "双缝干涉条纹间距近似满足 \\(\\beta=\\lambda L/d\\)；暗纹处仍有光，只是两列光相消。"
    }
  };
  const curriculumSource = window.physicsCurriculum || { books: [], models: [], categories: ["全部"], statusLabels: {} };
  const curriculum = window.physicsPlatformProtocol
    ? window.physicsPlatformProtocol.normalizeCurriculum(curriculumSource)
    : curriculumSource;
  const courseBooks = curriculum.books;
  const storageKey = "physics-visual-lab-progress-v1";
  const audienceStorageKey = "physics-visual-lab-audience-v1";
  const moduleStorageKey = "physics-visual-lab-module-v1";
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const isHome = currentPage === "index.html";
  const courseModules = [
    { id: "kinematics", title: "运动学与力学基础", description: "用坐标、时间、图像和误差理解运动描述。", chapterIds: ["required-1-1", "required-1-2"] },
    { id: "forces", title: "相互作用与牛顿运动定律", description: "从受力分析进入力、质量和加速度的动态关系。", chapterIds: ["required-1-3", "required-1-4"] },
    { id: "curved-motion", title: "曲线运动与万有引力", description: "把二维运动拆成分运动，并扩展到圆周和轨道。", chapterIds: ["required-2-5", "required-2-6", "required-2-7"] },
    { id: "energy", title: "功和机械能", description: "用功、动能和势能追踪能量转化。", chapterIds: ["required-2-8"] },
    { id: "electric-field", title: "电场与电荷", description: "聚焦电荷相互作用、电场、电势和静电器件。", chapterIds: ["required-3-9", "required-3-10"] },
    { id: "current", title: "恒定电流与电路", description: "联动电路图、器材、电表和数据图像。", chapterIds: ["required-3-11", "required-3-12"] },
    { id: "magnetic-field", title: "磁场与电磁感应", description: "观察磁场、磁力、粒子轨迹和感应电流。", chapterIds: ["required-3-13", "selective-2-1", "selective-2-2", "selective-2-3", "selective-2-4", "selective-2-5"] },
    { id: "momentum", title: "动量与碰撞", description: "用守恒量理解短时间相互作用和碰撞。", chapterIds: ["selective-1-1"] },
    { id: "waves", title: "机械振动与机械波", description: "用相位、波形和传播过程统一振动与波。", chapterIds: ["selective-1-2", "selective-1-3"] },
    { id: "optics", title: "光学", description: "用可拖拽光路理解成像、干涉和衍射。", chapterIds: ["selective-1-4"] },
    { id: "thermal", title: "热学与气体", description: "连接宏观状态量、微观粒子运动和热力学过程。", chapterIds: ["selective-3-1", "selective-3-2", "selective-3-3"] },
    { id: "modern-physics", title: "原子物理与近代物理", description: "用统计和能级图像理解微观实验现象。", chapterIds: ["selective-3-4", "selective-3-5"] }
  ];
  let katexPromise = null;
  let mathTypesetRequest = 0;
  let controlValueObserver = null;

  function loadKaTeX() {
    if (window.renderMathInElement) return Promise.resolve();
    if (katexPromise) return katexPromise;
    katexPromise = new Promise((resolve) => {
      if (!document.querySelector("link[data-katex]")) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.dataset.katex = "true";
        link.href = "./vendor/katex/katex.min.css?v=0.17.0";
        document.head.appendChild(link);
      }
      const loadScript = (src, next) => {
        const script = document.createElement("script");
        script.async = true;
        script.src = src;
        script.addEventListener("load", next, { once: true });
        script.addEventListener("error", resolve, { once: true });
        document.head.appendChild(script);
      };
      loadScript("./vendor/katex/katex.min.js?v=0.17.0", () => {
        loadScript("./vendor/katex/contrib/auto-render.min.js?v=0.17.0", resolve);
      });
    });
    return katexPromise;
  }

  function typesetMath() {
    prepareControlValues();
    const targets = Array.from(document.querySelectorAll(
      ".task-panel, .guide-formula, .formula-panel, .critical-card, .equation-lines, .speed-match-formula, .equation-note, .label-math, .input-unit, .metric-name, .math-label, .speed-label, .label-row > strong, .metric-card > strong"
    )).filter((target) => ["\\(", "\\[", "$$", "$"]
      .some((delimiter) => target.textContent.includes(delimiter)));
    if (!targets.length) return;
    const request = ++mathTypesetRequest;
    loadKaTeX().then(() => {
      if (request !== mathTypesetRequest || !window.renderMathInElement) return null;
      const latestTargets = Array.from(document.querySelectorAll(
        ".task-panel, .guide-formula, .formula-panel, .critical-card, .equation-lines, .speed-match-formula, .equation-note, .label-math, .input-unit, .metric-name, .math-label, .speed-label, .label-row > strong, .metric-card > strong"
    )).filter((target) => ["\\(", "\\[", "$$", "$"]
        .some((delimiter) => target.textContent.includes(delimiter)));
      latestTargets.forEach((target) => window.renderMathInElement(target, {
        delimiters: [
          { left: "\\[", right: "\\]", display: true },
          { left: "\\(", right: "\\)", display: false },
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false }
        ],
        throwOnError: false,
        ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
        ignoredClasses: ["katex"]
      }));
    }).catch(() => {
      // Formula text remains readable if the local typesetter is unavailable.
    });
  }

  function controlValueToTex(rawValue) {
    const value = rawValue.trim();
    if (!/^[+\-−]?\d/.test(value)) return null;
    let tex = value
      .replace(/×\s*10\^(-?\d+)/g, "\\times 10^{$1}")
      .replace(/m\/s²/g, "\\mathrm{m/s^2}")
      .replace(/m\/s/g, "\\mathrm{m/s}")
      .replace(/N\/C/g, "\\mathrm{N/C}")
      .replace(/N\/m/g, "\\mathrm{N/m}")
      .replace(/μs/g, "\\mu\\mathrm{s}")
      .replace(/°/g, "{}^\\circ")
      .replace(/\b(kg|Hz|N|T|J|m|s|e)\b/g, "\\mathrm{$1}")
      .replace(/\s+/g, "\\,");
    return tex;
  }

  function prepareControlValues() {
    document.querySelectorAll(".controls .label-row > strong, .controls .metric-card > strong").forEach((element) => {
      if (element.querySelector(".katex")) return;
      const tex = controlValueToTex(element.textContent);
      if (tex) element.innerHTML = `\\(${tex}\\)`;
    });
  }

  function observeControlValues() {
    const controls = document.querySelector(".controls");
    if (!controls || controlValueObserver || !window.MutationObserver) return;
    let queued = false;
    controlValueObserver = new MutationObserver((records) => {
      const relevant = records.some((record) => {
        const node = record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement;
        return node?.closest(".label-row > strong, .metric-card > strong");
      });
      if (!relevant || queued) return;
      queued = true;
      window.requestAnimationFrame(() => {
        queued = false;
        typesetMath();
      });
    });
    controlValueObserver.observe(controls, { childList: true, characterData: true, subtree: true });
  }
  window.physicsTypesetMath = typesetMath;

  function readAudience() {
    try {
      return window.localStorage.getItem(audienceStorageKey) === "teacher" ? "teacher" : "student";
    } catch {
      return "student";
    }
  }

  function saveAudience(audience) {
    try {
      window.localStorage.setItem(audienceStorageKey, audience);
    } catch {
      // Audience mode is a preference, never a requirement for using an experiment.
    }
  }

  function readModule() {
    try {
      const stored = window.localStorage.getItem(moduleStorageKey);
      return courseModules.some((module) => module.id === stored) ? stored : courseModules[0].id;
    } catch {
      return courseModules[0].id;
    }
  }

  function saveModule(moduleId) {
    try {
      window.localStorage.setItem(moduleStorageKey, moduleId);
    } catch {
      // The course navigator remains usable when storage is unavailable.
    }
  }

  function applyAudience(audience) {
    document.body.dataset.audience = audience;
    const heroDescription = document.getElementById("heroDescription");
    if (heroDescription) {
      heroDescription.textContent = audience === "teacher"
        ? "用演示路线、关键问题和动态现象，组织一节看得见物理关系的新课。"
        : "用可调参数、动态轨迹和关键状态，把公式背后的物理关系看清楚。";
    }
    document.querySelectorAll(".task-body-head .task-note").forEach((note) => {
      note.textContent = audience === "teacher"
        ? "按演示路线组织观察，让学生先判断，再用读数和轨迹核对。"
        : "先观察现象，再用读数、图像和公式验证自己的判断。";
    });
    document.querySelectorAll("[data-audience]").forEach((control) => {
      control.classList.toggle("active", control.dataset.audience === audience);
      control.setAttribute("aria-pressed", control.dataset.audience === audience ? "true" : "false");
    });
    document.querySelectorAll("[data-audience-content]").forEach((content) => {
      const active = content.dataset.audienceContent === audience;
      content.hidden = !active;
      content.style.display = active ? "" : "none";
    });
    document.querySelectorAll(".task-summary").forEach((summary) => {
      const label = summary.querySelector("span");
      const count = summary.querySelector(".task-count");
      if (label) label.textContent = audience === "teacher" ? "课堂演示" : "学习任务";
      if (count) count.hidden = audience === "teacher";
    });
  }

  function renderCourseNavigation() {
    if (!isHome) return;
    const tabs = Array.from(document.querySelectorAll("[data-module]"));
    const title = document.getElementById("courseTitle");
    const description = document.getElementById("moduleDescription");
    const empty = document.getElementById("volumeEmpty");
    const modelCatalog = document.getElementById("modelCatalog");
    const lessonCards = Array.from(document.querySelectorAll("[data-lesson-card]"));
    if (!tabs.length) return;

    const escapeHtml = (value) => String(value || "").replace(/[&<>\"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[character]));
    const subjectClass = (category) => {
      if (/电磁|电场|电路|磁场/.test(category || "")) return "electromagnetism";
      if (/波|振动/.test(category || "")) return "waves";
      if (/光学/.test(category || "")) return "optics";
      return "mechanics";
    };
    const modelModules = (model) => courseModules
      .filter((module) => (module.chapterIds || []).includes(model.chapterId))
      .map((module) => module.id);
    const modelCards = [];
    if (modelCatalog && !modelCatalog.dataset.rendered) {
      const plannedModels = (curriculum.models || []).filter((model) => !model.lab);
      plannedModels.forEach((model) => {
        const modules = modelModules(model);
        if (!modules.length) return;
        const status = model.status === "open" ? "可视化实验已开放" : "模型内容已整理";
        const action = model.status === "open" && model.lab
          ? `./${model.lab}`
          : `./model.html?id=${encodeURIComponent(model.id)}`;
        const actionLabel = model.status === "open" && model.lab ? "进入实验" : "查看模型";
        const card = document.createElement("article");
        card.className = `model-card${model.status === "open" ? " is-open" : ""}`;
        card.dataset.modelCard = model.id;
        card.dataset.modules = modules.join(" ");
        card.innerHTML = `
          <div class="model-card-topline">
            <span class="chapter-tag">${escapeHtml(model.category)}</span>
            <span class="subject-tag ${subjectClass(model.category)}">${escapeHtml(model.category)}</span>
            <span class="model-status">${escapeHtml(status)}</span>
          </div>
          <h3>${escapeHtml(model.title)}</h3>
          <p>${escapeHtml(model.summary)}</p>
          <div class="model-card-meta">
            <span>核心关系：${escapeHtml((model.relations || []).slice(0, 2).join(" · "))}</span>
            <span>观察重点：${escapeHtml((model.explore || ["建立模型与现象的对应关系"])[0])}</span>
          </div>
          <a class="card-link" href="${action}">${actionLabel}<span aria-hidden="true">→</span></a>`;
        modelCatalog.append(card);
        modelCards.push(card);
      });
      modelCatalog.dataset.rendered = "true";
    } else if (modelCatalog) {
      modelCards.push(...modelCatalog.querySelectorAll("[data-model-card]"));
    }
    const cards = [...lessonCards, ...modelCards];

    tabs.forEach((tab) => {
      const module = courseModules.find((item) => item.id === tab.dataset.module);
      if (!module || tab.querySelector(".module-count")) return;
      const count = cards.filter((card) => (card.dataset.modules || "").split(/\s+/).includes(module.id)).length;
      const countLabel = document.createElement("span");
      countLabel.className = "module-count";
      countLabel.textContent = `${count}`;
      countLabel.setAttribute("aria-label", `${count} 个目录条目`);
      tab.append(countLabel);
    });

    const selectModule = (moduleId) => {
      const module = courseModules.find((item) => item.id === moduleId) || courseModules[0];
      const matchedCards = cards.filter((card) => (card.dataset.modules || "").split(/\s+/).includes(module.id));

      tabs.forEach((tab) => {
        const active = tab.dataset.module === module.id;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", active ? "true" : "false");
      });
      cards.forEach((card) => {
        card.hidden = !(card.dataset.modules || "").split(/\s+/).includes(module.id);
      });
      if (title) title.textContent = module.title;
      if (description) description.textContent = module.description;
      if (empty) empty.hidden = matchedCards.length > 0;
      saveModule(module.id);
    };

    tabs.forEach((tab) => tab.addEventListener("click", () => selectModule(tab.dataset.module)));
    selectModule(readModule());
  }

  const audience = readAudience();
  document.querySelectorAll("[data-audience]").forEach((control) => {
    control.addEventListener("click", () => {
      const nextAudience = control.dataset.audience;
      if (!nextAudience) return;
      saveAudience(nextAudience);
      applyAudience(nextAudience);
    });
  });
  applyAudience(audience);

  function readProgress() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(storageKey) || "{}");
      if (!parsed || typeof parsed !== "object") return { visited: {}, completed: {}, tasks: {}, lastVisited: "" };
      const visited = parsed.visited && typeof parsed.visited === "object" ? parsed.visited : {};
      lessons.forEach((lesson) => {
        if (parsed[lesson]) visited[lesson] = true;
      });
      return {
        visited,
        completed: parsed.completed && typeof parsed.completed === "object" ? parsed.completed : {},
        tasks: parsed.tasks && typeof parsed.tasks === "object" ? parsed.tasks : {},
        lastVisited: lessons.includes(parsed.lastVisited) ? parsed.lastVisited : ""
      };
    } catch {
      return { visited: {}, completed: {}, tasks: {}, lastVisited: "" };
    }
  }

  function saveProgress(progress) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch {
      // Progress is helpful but should never block an experiment.
    }
  }

  const progress = readProgress();
  if (!isHome && lessons.includes(currentPage)) {
    progress.visited[currentPage] = true;
    progress.lastVisited = currentPage;
    saveProgress(progress);
  }

  document.querySelectorAll("[data-lesson-link]").forEach((link) => {
    link.addEventListener("click", () => {
      const lesson = link.dataset.lessonLink;
      if (!lesson || !lessons.includes(lesson)) return;
      const nextProgress = readProgress();
      nextProgress.visited[lesson] = true;
      nextProgress.lastVisited = lesson;
      saveProgress(nextProgress);
    });
  });

  if (isHome) {
    const completed = lessons.filter((lesson) => progress.completed[lesson]).length;
    const count = document.getElementById("progressCount");
    const fill = document.getElementById("progressFill");
    if (count) count.textContent = `${completed} / ${lessons.length}`;
    if (fill) fill.style.width = `${(completed / lessons.length) * 100}%`;

    const cards = Array.from(document.querySelectorAll("[data-lesson-card]"));
    const recentLink = document.getElementById("recentLessonLink");
    const recentNote = document.getElementById("recentLessonNote");
    const recentCard = cards.find((card) => card.dataset.lessonCard === progress.lastVisited);
    if (recentLink && recentNote && recentCard) {
      const title = recentCard.querySelector("h3")?.textContent?.trim() || progress.lastVisited;
      recentLink.href = `./${progress.lastVisited}`;
      recentLink.textContent = `继续：${title}`;
      recentLink.hidden = false;
      recentNote.textContent = "从上次离开的实验继续观察。";
    }

    cards.forEach((card) => {
      const lesson = card.dataset.lessonCard;
      const link = card.querySelector(".card-link");
      if (progress.visited[lesson]) {
        card.classList.add("visited");
        if (link) link.innerHTML = '再次进入<span aria-hidden="true">→</span>';
      }
      if (progress.completed[lesson]) card.classList.add("completed");
    });
    renderCourseNavigation();
    const catalogCards = Array.from(document.querySelectorAll("[data-lesson-card], [data-model-card]"));
    const searchInput = document.getElementById("experimentSearch");
    const subjectFilter = document.getElementById("subjectFilter");
    const resultCount = document.getElementById("experimentResultCount");
    const catalogTitle = document.getElementById("courseTitle");
    const catalogDescription = document.getElementById("moduleDescription");
    const applyCatalogFilters = () => {
      const query = (searchInput?.value || "").trim().toLocaleLowerCase();
      const subject = subjectFilter?.value || "all";
      const activeModule = document.querySelector("[data-module].active")?.dataset.module || readModule();
      const isSearching = query.length > 0;
      let visibleCount = 0;
      catalogCards.forEach((card) => {
        const matchesQuery = !query || card.textContent.toLocaleLowerCase().includes(query);
        const matchesSubject = subject === "all" || Boolean(card.querySelector(`.subject-tag.${subject}`));
        const matchesModule = isSearching || (card.dataset.modules || "").split(/\s+/).includes(activeModule);
        const visible = matchesQuery && matchesSubject && matchesModule;
        card.hidden = !visible;
        card.classList.toggle("search-match", isSearching && visible);
        if (visible) visibleCount += 1;
      });
      document.querySelectorAll("[data-module]").forEach((tab) => {
        const moduleId = tab.dataset.module;
        const hasMatch = isSearching && catalogCards.some((card) => {
          const belongs = (card.dataset.modules || "").split(/\s+/).includes(moduleId);
          const matchesText = card.textContent.toLocaleLowerCase().includes(query);
          const matchesSubject = subject === "all" || Boolean(card.querySelector(`.subject-tag.${subject}`));
          return belongs && matchesText && matchesSubject;
        });
        tab.classList.toggle("module-match", hasMatch);
      });
      if (catalogTitle && isSearching) catalogTitle.textContent = "搜索结果";
      if (catalogDescription && isSearching) catalogDescription.textContent = `跨 ${courseModules.length} 个模型模块查找实验。`;
      if (catalogTitle && !isSearching) {
        const active = courseModules.find((module) => module.id === activeModule) || courseModules[0];
        catalogTitle.textContent = active.title;
        if (catalogDescription) catalogDescription.textContent = active.description;
      }
      if (resultCount) resultCount.textContent = `${visibleCount} 个目录条目`;
      const empty = document.getElementById("volumeEmpty");
      if (empty) {
        empty.hidden = visibleCount > 0;
        empty.textContent = isSearching || subject !== "all" ? "没有符合条件的实验。" : "本模块暂未开放实验。";
      }
    };
    [searchInput, subjectFilter].filter(Boolean).forEach((control) => control.addEventListener("input", applyCatalogFilters));
    document.querySelectorAll("[data-module]").forEach((tab) => tab.addEventListener("click", () => window.requestAnimationFrame(applyCatalogFilters)));
    applyCatalogFilters();
    typesetMath();
    return;
  }

  function renderTaskPanel() {
    const tasks = lessonTasks[currentPage];
    const plan = lessonPlans[currentPage];
    const stage = document.querySelector(".stage");
    if (!tasks || !plan || !stage || document.querySelector(".task-panel")) return;

    const savedTasks = progress.tasks[currentPage] || [];
    const panel = document.createElement("details");
    panel.className = "task-panel";
    panel.open = true;
    panel.innerHTML = `
     <summary class="task-summary">
       <span>学习任务</span>
        <span class="task-summary-note">完成三个关键观察</span>
       <strong class="task-count">0 / ${tasks.length}</strong>
     </summary>
     <div class="task-body">
        <div class="task-body-head">
          <p class="task-note">先观察现象，再用读数、图像和公式解释。</p>
          <div class="audience-switch" role="group" aria-label="学习方式">
            <span class="platform-kicker">学习方式</span>
            <div class="segmented-control">
              <button type="button" data-audience="student">学生自学</button>
              <button type="button" data-audience="teacher">教师演示</button>
            </div>
          </div>
        </div>
       <div class="lesson-meta">
          <div><span>本课目标</span><strong>${plan.goal}</strong></div>
          <div><span>开始前，你只需要知道</span><strong>${plan.prerequisite}</strong></div>
       </div>
       <div class="audience-content" data-audience-content="student">
         <div class="task-list"></div>
       </div>
       <div class="audience-content teacher-content" data-audience-content="teacher">
          <p class="task-note">按以下顺序组织演示，让学生先作出判断，再用读数和轨迹核对。</p>
          <ol class="teacher-prompts">${plan.prompts.map((prompt) => `<li>${prompt}</li>`).join("")}</ol>
          <div class="takeaway"><span>本课结论</span><strong>${plan.takeaway}</strong></div>
        </div>
      </div>`;

    const guide = stage.querySelector(".lesson-guide");
    const subtitle = stage.querySelector(".stage-subtitle");
    const anchor = guide || subtitle;
    if (anchor) anchor.insertAdjacentElement("afterend", panel);
    else stage.prepend(panel);

    const list = panel.querySelector(".task-list");
    tasks.forEach((task, index) => {
      const id = `task-${currentPage.replace(/[^a-z0-9]+/gi, "-")}-${index}`;
      const item = document.createElement("label");
      item.className = "task-item";
      item.innerHTML = `<input type="checkbox" id="${id}" ${savedTasks[index] ? "checked" : ""} /><span>${task}</span>`;
      list.appendChild(item);
    });

    const updateTasks = () => {
      const checks = Array.from(panel.querySelectorAll("input[type=checkbox]"));
      const values = checks.map((input) => input.checked);
      const count = values.filter(Boolean).length;
      progress.tasks[currentPage] = values;
      progress.completed[currentPage] = count === tasks.length;
      saveProgress(progress);
      panel.querySelector(".task-count").textContent = `${count} / ${tasks.length}`;
      panel.classList.toggle("complete", count === tasks.length);
    };

    panel.querySelectorAll("input[type=checkbox]").forEach((input) => input.addEventListener("change", updateTasks));
    panel.querySelectorAll("[data-audience]").forEach((control) => {
      control.addEventListener("click", () => {
        const nextAudience = control.dataset.audience;
        if (!nextAudience) return;
        saveAudience(nextAudience);
        applyAudience(nextAudience);
      });
    });
   applyAudience(audience);
   updateTasks();
    typesetMath();
  }

  function moveActionsToCanvas() {
    const actions = document.querySelector(".actions");
    const canvasWrap = document.querySelector(".canvas-wrap");
    if (!actions || !canvasWrap || canvasWrap.querySelector(".canvas-action-dock")) return;
    const buttons = Array.from(actions.querySelectorAll("button"));
    if (!buttons.length) return;
    const dock = document.createElement("div");
    dock.className = "canvas-action-dock";
    dock.setAttribute("role", "group");
    dock.setAttribute("aria-label", "画面控制");
    buttons.forEach((button) => dock.appendChild(button));
    canvasWrap.prepend(dock);
  }

  const actions = document.querySelector(".actions");
  if (actions && !actions.querySelector('a[href="./index.html"]')) {
    const link = document.createElement("a");
    link.className = "ghost-link directory-link";
    link.href = "./index.html";
    link.textContent = "实验目录";
    actions.prepend(link);
 }

  function renderExperimentNavigation() {
    if (isHome || !actions) return;
    const currentIndex = lessons.indexOf(currentPage);
    if (currentIndex < 0) return;
    [
      { index: currentIndex - 1, label: "上一个实验" },
      { index: currentIndex + 1, label: "下一个实验" }
    ].forEach(({ index, label }) => {
      const lesson = lessons[index];
      if (!lesson || actions.querySelector(`[data-lab-nav="${lesson}"]`)) return;
      const link = document.createElement("a");
      link.className = "lab-nav-link";
      link.dataset.labNav = lesson;
      link.href = `./${lesson}`;
      link.textContent = label;
      actions.append(link);
    });
    const heading = document.querySelector(".stage-head h1");
    if (heading && !heading.querySelector(".lab-context")) {
      const context = document.createElement("span");
      context.className = "lab-context";
      context.textContent = `实验 ${currentIndex + 1} / ${lessons.length}`;
      heading.insertAdjacentElement("beforebegin", context);
    }
  }

  renderExperimentNavigation();
 moveActionsToCanvas();
  observeControlValues();
  typesetMath();
})();
