(function () {
  const lessons = [
    "motion-graphs.html",
    "friction.html",
    "newton-laws.html",
    "projectile.html",
    "circular.html",
    "oscillation.html",
    "waves.html",
    "charged-particle.html"
  ];
  const lessonTasks = {
    "motion-graphs.html": [
      "切换匀速和匀变速，比较 x-t 图像的斜率。",
      "拖动同一时刻的竖线，对照 x-t 和 v-t 图像上的点。",
      "观察 v-t 图像与时间轴围成的面积，说明它为什么表示位移。"
    ],
    "friction.html": [
      "逐渐增大外力，记录物体仍然静止时摩擦力的变化。",
      "定位最大静摩擦力，判断何时开始发生相对滑动。",
      "改变质量或摩擦因数，比较最大静摩擦力和滑动摩擦力。"
    ],
    "newton-laws.html": [
      "保持质量不变，改变合力，观察加速度如何变化。",
      "保持合力不变，改变质量，比较相同时间内速度的变化。",
      "把合力调为零，判断物体可以保持什么运动状态。"
    ],
    "projectile.html": [
      "定位最高点，确认 vy = 0 但速度并不为 0。",
      "改变发射角，比较飞行时间和水平射程。",
      "用 vx、vy 说明水平方向和竖直方向为什么可以分开研究。"
    ],
    "circular.html": [
      "定位三个关键位置，确认速度沿切线、加速度指向圆心。",
      "改变线速度，观察向心加速度如何变化。",
      "改变半径，比较向心力、周期和速度方向的变化。"
    ],
    "oscillation.html": [
      "定位端点和平衡位置，比较速度与加速度的大小。",
      "在时间图像和相位圆中追踪 x、v、a 的相位关系。",
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
      "用 v = v配 + v余 解释配速漂移与余速圆周运动。"
    ]
  };
  const lessonPlans = {
    "motion-graphs.html": {
      goal: "建立 x-t、v-t 图像与运动状态之间的对应关系。",
      prerequisite: "位置、速度、加速度和函数图像的斜率与面积。",
      prompts: [
        "先隐藏图像，只看运动小车，让学生判断运动方向。",
        "显示 x-t 图像，追问某时刻曲线斜率对应哪个物理量。",
        "显示 v-t 图像，圈出面积并用位移解释正负。"
      ],
      takeaway: "x-t 图像的斜率表示速度，v-t 图像的斜率表示加速度，v-t 图像的有向面积表示位移。"
    },
    "friction.html": {
      goal: "区分静摩擦力的自适应性、最大静摩擦力和滑动摩擦力。",
      prerequisite: "受力分析、平衡条件、牛顿第二定律和正压力。",
      prompts: [
        "先从零开始增大外力，让学生预测静摩擦力是否变化。",
        "暂停在临界点，比较外力、静摩擦力和最大静摩擦力。",
        "继续增大外力，观察滑动后摩擦力与加速度的变化。"
      ],
      takeaway: "静摩擦力由运动趋势决定且不超过最大值；滑动后摩擦力近似为 μkN。"
    },
    "newton-laws.html": {
      goal: "建立合力、质量和加速度的定量关系。",
      prerequisite: "受力图、合力、速度和加速度。",
      prompts: [
        "先只看受力箭头，让学生指出合力方向。",
        "固定质量改变合力，观察 a-F 图像是否通过原点。",
        "把合力调为零，区分加速度为零和速度为零。"
      ],
      takeaway: "加速度由合外力和质量共同决定；合力为零时物体可以静止，也可以匀速直线运动。"
    },
    "projectile.html": {
      goal: "建立速度分解和独立运动的观念。",
      prerequisite: "位移、速度、加速度的矢量方向。",
      prompts: [
        "先让学生预测最高点的速度，再暂停到最高点核对。",
        "固定发射速度，改变角度，比较飞行时间和射程。",
        "回到 vx、vy 读数，用分运动解释轨迹。"
      ],
      takeaway: "平抛或斜抛运动可以分解为水平方向和竖直方向的独立运动。"
    },
    "circular.html": {
      goal: "区分速度方向和加速度方向，理解向心加速度。",
      prerequisite: "速度方向、加速度定义和牛顿第二定律。",
      prompts: [
        "暂停在不同位置，让学生分别指出速度和加速度方向。",
        "保持半径不变改变速度，观察向心加速度的变化。",
        "改变半径，讨论周期、向心力和运动快慢。"
      ],
      takeaway: "匀速圆周运动的速率可以不变，但速度方向持续改变，所以仍有加速度。"
    },
    "oscillation.html": {
      goal: "建立位移、速度、加速度和能量的相位关系。",
      prerequisite: "周期运动、力与加速度、动能和势能。",
      prompts: [
        "先定位端点和平衡位置，让学生预测 v 和 a 的大小。",
        "拖动时间条，对照相位圆和时间图像。",
        "改变质量或劲度系数，观察周期变化并回到公式解释。"
      ],
      takeaway: "简谐运动中端点速度为零、加速度最大，平衡位置速度最大、加速度为零。"
    },
    "waves.html": {
      goal: "区分波的传播和介质质点的振动，理解叠加与驻波。",
      prerequisite: "周期、频率、波长和振动图像。",
      prompts: [
        "分别显示两列波，让学生判断传播方向。",
        "切换合成波，寻找节点和腹部并比较振幅。",
        "改变波长，观察节点间距是否随之改变。"
      ],
      takeaway: "驻波由相向传播的波叠加形成，节点不振动，腹部振幅最大。"
    },
    "charged-particle.html": {
      goal: "比较电场力、磁场力和恒力，建立复合场中的受力分析。",
      prerequisite: "牛顿第二定律、电场力、洛伦兹力和速度分解。",
      prompts: [
        "先比较仅电场和仅磁场，明确两种力对速率和方向的影响。",
        "进入配速法，先观察偏转，再寻找竖直合力接近零的速度。",
        "用 v = v配 + v余 解释漂移与圆周分运动。"
      ],
      takeaway: "复合场轨迹取决于各力的方向和大小，配速只消除特定方向的合力。"
    }
  };
  const curriculum = window.physicsCurriculum || { books: [], models: [], categories: ["全部"], statusLabels: {} };
  const courseBooks = curriculum.books;
  const storageKey = "physics-visual-lab-progress-v1";
  const audienceStorageKey = "physics-visual-lab-audience-v1";
  const volumeStorageKey = "physics-visual-lab-volume-v1";
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const isHome = currentPage === "index.html";

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

  function readVolume() {
    try {
      const stored = window.localStorage.getItem(volumeStorageKey);
      return courseBooks.some((book) => book.id === stored) ? stored : courseBooks[0].id;
    } catch {
      return courseBooks[0].id;
    }
  }

  function saveVolume(volume) {
    try {
      window.localStorage.setItem(volumeStorageKey, volume);
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
    document.querySelectorAll("[data-audience]").forEach((control) => {
      control.classList.toggle("active", control.dataset.audience === audience);
      control.setAttribute("aria-pressed", control.dataset.audience === audience ? "true" : "false");
    });
    document.querySelectorAll("[data-audience-content]").forEach((content) => {
      content.hidden = content.dataset.audienceContent !== audience;
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
    const tabs = Array.from(document.querySelectorAll("[data-volume]"));
    const outline = document.getElementById("courseOutline");
    const title = document.getElementById("courseTitle");
    const courseSummary = document.getElementById("courseSummary");
    const lessonTitle = document.getElementById("lessonTitle");
    const volumeSummary = document.getElementById("volumeSummary");
    const empty = document.getElementById("volumeEmpty");
    const cards = Array.from(document.querySelectorAll("[data-lesson-card]"));
    const modelTitle = document.getElementById("modelTitle");
    const modelSummary = document.getElementById("modelSummary");
    const modelSelectionNote = document.getElementById("modelSelectionNote");
    const modelFilters = document.getElementById("modelFilters");
    const modelCatalog = document.getElementById("modelCatalog");
    if (!tabs.length || !outline || !modelCatalog) return;

    let selectedChapterId = "";
    let selectedCategory = "全部";
    const directoryModels = curriculum.directoryModels || curriculum.models;

    const chapterModels = (book) => directoryModels.filter((item) => book.chapters.some((chapter) => chapter.id === item.chapterId));

    const renderModelCatalog = (book) => {
      const models = chapterModels(book).filter((item) => {
        const chapterMatch = !selectedChapterId || item.chapterId === selectedChapterId;
        const categoryMatch = selectedCategory === "全部" || item.category === selectedCategory;
        return chapterMatch && categoryMatch;
      });
      const chaptersById = new Map(book.chapters.map((chapter) => [chapter.id, chapter.title]));
      const openCount = models.filter((item) => item.status === "open").length;
      if (modelTitle) {
        const scope = selectedChapterId ? chaptersById.get(selectedChapterId) : `${book.title} · 全部模型`;
        modelTitle.textContent = scope || `${book.title} · 全部模型`;
      }
      if (modelSummary) {
        modelSummary.textContent = `精选 ${models.length} 个模型 · ${openCount} 个可视化实验已开放。`;
      }
      if (modelSelectionNote) modelSelectionNote.textContent = curriculum.selectionNote || "只展示适合通过动态关系帮助理解的核心模型。";
      if (!models.length) {
        modelCatalog.innerHTML = '<p class="catalog-empty">当前筛选下暂无模型。</p>';
        return;
      }
      modelCatalog.innerHTML = models.map((item) => `
        <article class="model-card ${item.status === "open" ? "is-open" : "is-planned"}">
          <div class="model-card-topline">
            <span class="subject-tag">${item.category}</span>
            <span class="model-status">${curriculum.statusLabels[item.status] || item.status}</span>
          </div>
          <h3>${item.title}</h3>
          <p>${item.summary}</p>
          <div class="model-card-meta">
            <span>${chaptersById.get(item.chapterId) || "高中物理"}</span>
            <span>${item.visual}</span>
          </div>
          <a class="card-link" href="./model.html?id=${encodeURIComponent(item.id)}">查看模型内容<span aria-hidden="true">→</span></a>
        </article>`).join("");
    };

    const renderFilters = (book) => {
      const available = new Set(chapterModels(book).map((item) => item.category));
      const categories = curriculum.categories.filter((category) => category === "全部" || available.has(category));
      if (!modelFilters) return;
      modelFilters.innerHTML = categories.map((category) => `
        <button type="button" class="model-filter ${selectedCategory === category ? "active" : ""}" data-category="${category}" aria-pressed="${selectedCategory === category ? "true" : "false"}">${category}</button>`).join("");
      modelFilters.querySelectorAll("[data-category]").forEach((button) => {
        button.addEventListener("click", () => {
          selectedCategory = button.dataset.category || "全部";
          renderFilters(book);
          renderModelCatalog(book);
        });
      });
    };

    const renderOutline = (book) => {
      outline.innerHTML = book.chapters.map((chapter) => {
        const models = directoryModels.filter((item) => item.chapterId === chapter.id);
        const openCount = models.filter((item) => item.status === "open").length;
        const active = selectedChapterId === chapter.id;
        const status = openCount
          ? `${openCount} 个实验已开放`
          : models.length
            ? `${models.length} 个模型待开发`
            : "本章暂不单列可视化模型";
        return `<button type="button" class="course-chapter ${openCount ? "has-lab" : "building"} ${active ? "active" : ""}" data-chapter="${chapter.id}" aria-pressed="${active ? "true" : "false"}">
          <strong>${chapter.title}</strong>
          <span>${models.length} 个模型 · ${status}</span>
        </button>`;
      }).join("");
      outline.querySelectorAll("[data-chapter]").forEach((button) => {
        button.addEventListener("click", () => {
          selectedChapterId = selectedChapterId === button.dataset.chapter ? "" : button.dataset.chapter;
          renderOutline(book);
          renderModelCatalog(book);
        });
      });
    };

    const selectVolume = (volumeId) => {
      const book = courseBooks.find((item) => item.id === volumeId) || courseBooks[0];
      selectedChapterId = "";
      selectedCategory = "全部";
      const matchedCards = cards.filter((card) => (card.dataset.volumes || "").split(/\s+/).includes(book.id));
      const matchedChapters = new Set();
      matchedCards.forEach((card) => {
        (card.dataset.chapters || "").split(/\s+/).forEach((chapter) => matchedChapters.add(chapter));
      });

      tabs.forEach((tab) => {
        const active = tab.dataset.volume === book.id;
        tab.classList.toggle("active", active);
        tab.setAttribute("aria-selected", active ? "true" : "false");
      });
      cards.forEach((card) => {
        card.hidden = !(card.dataset.volumes || "").split(/\s+/).includes(book.id);
      });
      if (title) title.textContent = book.title;
      if (courseSummary) courseSummary.textContent = book.summary;
      if (lessonTitle) lessonTitle.textContent = `${book.title} · 可视化实验`;
      if (volumeSummary) {
        volumeSummary.textContent = matchedCards.length
          ? `本册已有 ${matchedCards.length} 个可视化实验，先观察现象，再回到章节概念。`
          : "本册暂未开放可视化实验，章节内容正在建设中。";
      }
      if (empty) empty.hidden = matchedCards.length > 0;
      renderOutline(book);
      renderFilters(book);
      renderModelCatalog(book);
      saveVolume(book.id);
    };

    tabs.forEach((tab) => tab.addEventListener("click", () => selectVolume(tab.dataset.volume)));
    selectVolume(readVolume());
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
      if (!parsed || typeof parsed !== "object") return { visited: {}, completed: {}, tasks: {} };
      const visited = parsed.visited && typeof parsed.visited === "object" ? parsed.visited : {};
      lessons.forEach((lesson) => {
        if (parsed[lesson]) visited[lesson] = true;
      });
      return {
        visited,
        completed: parsed.completed && typeof parsed.completed === "object" ? parsed.completed : {},
        tasks: parsed.tasks && typeof parsed.tasks === "object" ? parsed.tasks : {}
      };
    } catch {
      return { visited: {}, completed: {}, tasks: {} };
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
    saveProgress(progress);
  }

  document.querySelectorAll("[data-lesson-link]").forEach((link) => {
    link.addEventListener("click", () => {
      const lesson = link.dataset.lessonLink;
      if (!lesson || !lessons.includes(lesson)) return;
      const nextProgress = readProgress();
      nextProgress.visited[lesson] = true;
      saveProgress(nextProgress);
    });
  });

  if (isHome) {
    const completed = lessons.filter((lesson) => progress.completed[lesson]).length;
    const count = document.getElementById("progressCount");
    const fill = document.getElementById("progressFill");
    if (count) count.textContent = `${completed} / ${lessons.length}`;
    if (fill) fill.style.width = `${(completed / lessons.length) * 100}%`;

    document.querySelectorAll("[data-lesson-card]").forEach((card) => {
      const lesson = card.dataset.lessonCard;
      const link = card.querySelector(".card-link");
      if (progress.visited[lesson]) {
        card.classList.add("visited");
        if (link) link.innerHTML = '再次进入<span aria-hidden="true">→</span>';
      }
      if (progress.completed[lesson]) card.classList.add("completed");
    });
    renderCourseNavigation();
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
        <strong class="task-count">0 / ${tasks.length}</strong>
      </summary>
      <div class="task-body">
        <div class="lesson-meta">
          <div><span>本课目标</span><strong>${plan.goal}</strong></div>
          <div><span>前置知识</span><strong>${plan.prerequisite}</strong></div>
        </div>
        <div class="audience-content" data-audience-content="student">
          <p class="task-note">完成观察、操作和解释后，再把本实验标记为完成。</p>
          <div class="task-list"></div>
        </div>
        <div class="audience-content teacher-content" data-audience-content="teacher">
          <p class="task-note">按以下顺序组织课堂演示，重点让学生先作出判断，再用读数和轨迹核对。</p>
          <ol class="teacher-prompts">${plan.prompts.map((prompt) => `<li>${prompt}</li>`).join("")}</ol>
          <div class="takeaway"><span>本课结论</span><strong>${plan.takeaway}</strong></div>
        </div>
        <div class="audience-switch" role="group" aria-label="学习方式">
          <span class="platform-kicker">学习方式</span>
          <div class="segmented-control">
            <button type="button" data-audience="student">学生自学</button>
            <button type="button" data-audience="teacher">教师演示</button>
          </div>
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
  }

  renderTaskPanel();

  const actions = document.querySelector(".actions");
  if (actions && !actions.querySelector('a[href="./index.html"]')) {
    const link = document.createElement("a");
    link.className = "ghost-link directory-link";
    link.href = "./index.html";
    link.textContent = "实验目录";
    actions.prepend(link);
  }
})();
