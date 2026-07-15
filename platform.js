(function () {
  const lessons = [
    "projectile.html",
    "circular.html",
    "oscillation.html",
    "waves.html",
    "charged-particle.html"
  ];
  const lessonTasks = {
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
  const storageKey = "physics-visual-lab-progress-v1";
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const isHome = currentPage === "index.html";

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
    return;
  }

  function renderTaskPanel() {
    const tasks = lessonTasks[currentPage];
    const stage = document.querySelector(".stage");
    if (!tasks || !stage || document.querySelector(".task-panel")) return;

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
        <p class="task-note">完成观察、操作和解释后，再把本实验标记为完成。</p>
        <div class="task-list"></div>
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
