(function () {
  "use strict";

  const data = window.physicsKnowledgeBase;
  if (!data) throw new Error("Knowledge base data is required");

  const elements = {
    search: document.getElementById("kbSearch"),
    clear: document.getElementById("clearSearch"),
    categoryNav: document.getElementById("categoryNav"),
    resultTitle: document.getElementById("resultTitle"),
    resultCount: document.getElementById("resultCount"),
    list: document.getElementById("articleList"),
    empty: document.getElementById("emptyState"),
    emptyFeedback: document.getElementById("emptyFeedback"),
    contextPanel: document.getElementById("contextPanel"),
    contextLesson: document.getElementById("contextLesson"),
    backToLesson: document.getElementById("backToLesson"),
  };

  const lessonLabels = {
    "double-slit.html": "双缝干涉",
    "single-slit.html": "单缝衍射",
    "refraction.html": "折射与全反射",
  };
  const params = new URLSearchParams(window.location.search);
  const contextLesson = /^[a-z0-9-]+\.html$/i.test(params.get("lesson") || "") ? params.get("lesson") : "";
  const validCategories = new Set(data.categories.map((category) => category.id));
  let activeCategory = validCategories.has(params.get("category")) ? params.get("category") : "all";

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/[\s，。！？、；：,.!?;:()（）\-_]/g, "");
  }

  function normalizeQuery(value) {
    const aliases = [
      ["完全用不了", "不能用"],
      ["用不了", "不能用"],
      ["没反应", "不能用"],
      ["没有反应", "不能用"],
      ["看不见", "看不到"],
      ["打不开", "加载失败"],
      ["黑屏", "空白"],
      ["很卡", "卡顿"],
      ["旧页面", "旧界面"],
    ];
    return aliases.reduce((query, pair) => query.replaceAll(pair[0], pair[1]), normalize(value));
  }

  function searchable(article) {
    return normalize([article.title, article.summary, ...(article.keywords || []), ...article.steps].join(" "));
  }

  function scoreArticle(article, query) {
    const raw = normalizeQuery(query);
    if (!raw) return article.lessons?.includes(contextLesson) ? 20 : 1;
    const title = normalize(article.title);
    const keywords = normalize((article.keywords || []).join(" "));
    const body = searchable(article);
    let score = 0;
    if (title.includes(raw)) score += 24;
    if (keywords.includes(raw)) score += 14;
    if (body.includes(raw)) score += 8;
    const chunks = raw.length > 2
      ? Array.from({ length: raw.length - 1 }, (_, index) => raw.slice(index, index + 2))
      : [raw];
    const matched = chunks.filter((chunk) => body.includes(chunk)).length;
    if (!score && matched < Math.min(2, chunks.length)) return 0;
    score += matched;
    if (article.lessons?.includes(contextLesson)) score += 5;
    return score;
  }

  function issueUrl(article, query) {
    const title = article ? "[使用问题] " + article.title : "[使用问题] 未找到答案：" + (query || "请描述问题");
    const body = [
      "### 实验页面",
      contextLesson ? "https://weiqiangzeng.github.io/physics-visual-lab/" + contextLesson : "请填写",
      "",
      "### 操作步骤",
      "1. ",
      "",
      "### 预期结果",
      "",
      "### 实际结果",
      "",
      "### 设备与浏览器",
      "",
    ].join("\n");
    return "https://github.com/weiqiangzeng/physics-visual-lab/issues/new?" + new URLSearchParams({ title, body }).toString();
  }

  function createArticle(article, index) {
    const details = document.createElement("details");
    details.className = "kb-article";
    details.id = article.id;

    const summary = document.createElement("summary");
    const number = document.createElement("span");
    number.className = "article-index";
    number.textContent = String(index + 1).padStart(2, "0");
    const title = document.createElement("span");
    title.className = "article-title";
    const strong = document.createElement("strong");
    strong.textContent = article.title;
    const description = document.createElement("span");
    description.textContent = article.summary;
    title.append(strong, description);
    const toggle = document.createElement("span");
    toggle.className = "article-toggle";
    toggle.setAttribute("aria-hidden", "true");
    toggle.textContent = "+";
    summary.append(number, title, toggle);

    const body = document.createElement("div");
    body.className = "article-body";
    const steps = document.createElement("ol");
    article.steps.forEach((step) => {
      const item = document.createElement("li");
      item.textContent = step;
      steps.append(item);
    });
    body.append(steps);

    const links = document.createElement("div");
    links.className = "article-links";
    (article.related || []).forEach((related) => {
      const link = document.createElement("a");
      link.href = related.href;
      link.textContent = related.label;
      if (/^https?:/i.test(related.href)) {
        link.target = "_blank";
        link.rel = "noopener";
      }
      links.append(link);
    });
    const feedback = document.createElement("a");
    feedback.className = "article-feedback";
    feedback.href = issueUrl(article, elements.search.value);
    feedback.target = "_blank";
    feedback.rel = "noopener";
    feedback.textContent = "仍未解决";
    links.append(feedback);
    body.append(links);

    const tags = document.createElement("div");
    tags.className = "article-tags";
    (article.keywords || []).slice(0, 6).forEach((keyword) => {
      const tag = document.createElement("span");
      tag.textContent = keyword;
      tags.append(tag);
    });
    body.append(tags);
    details.append(summary, body);
    details.addEventListener("toggle", () => {
      if (details.open) window.history.replaceState(null, "", "#" + article.id);
    });
    return details;
  }

  function syncUrl(query) {
    const next = new URL(window.location.href);
    query ? next.searchParams.set("q", query) : next.searchParams.delete("q");
    activeCategory === "all" ? next.searchParams.delete("category") : next.searchParams.set("category", activeCategory);
    window.history.replaceState(null, "", next.pathname + next.search + next.hash);
  }

  function render() {
    const query = elements.search.value.trim();
    const ranked = data.articles
      .map((article) => ({ article, score: scoreArticle(article, query) }))
      .filter((item) => item.score > 0 && (activeCategory === "all" || item.article.category === activeCategory))
      .sort((a, b) => b.score - a.score || data.articles.indexOf(a.article) - data.articles.indexOf(b.article));

    elements.list.replaceChildren(...ranked.map((item, index) => createArticle(item.article, index)));
    elements.empty.hidden = ranked.length > 0;
    elements.emptyFeedback.href = issueUrl(null, query);
    elements.clear.hidden = !query;
    const category = data.categories.find((item) => item.id === activeCategory);
    elements.resultTitle.textContent = query ? "搜索结果" : category ? category.label : contextLesson ? "与当前实验相关" : "全部问题";
    elements.resultCount.textContent = "找到 " + ranked.length + " 条答案";
    elements.categoryNav.querySelectorAll("button").forEach((button) => button.classList.toggle("is-active", button.dataset.category === activeCategory));
    syncUrl(query);

    const hashId = decodeURIComponent(window.location.hash.slice(1));
    const target = hashId && document.getElementById(hashId);
    if (target && target.matches("details")) target.open = true;
  }

  function renderCategories() {
    const all = [{ id: "all", label: "全部问题" }, ...data.categories];
    all.forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.category = category.id;
      const label = document.createElement("strong");
      label.textContent = category.label;
      const count = document.createElement("span");
      count.textContent = category.id === "all"
        ? data.articles.length
        : data.articles.filter((article) => article.category === category.id).length;
      button.append(label, count);
      button.addEventListener("click", () => {
        activeCategory = category.id;
        render();
      });
      elements.categoryNav.append(button);
    });
  }

  if (contextLesson) {
    elements.contextPanel.hidden = false;
    elements.contextLesson.textContent = lessonLabels[contextLesson] || contextLesson.replace(/\.html$/, "");
    elements.backToLesson.href = "./" + contextLesson;
  }

  renderCategories();
  elements.search.value = params.get("q") || "";
  elements.search.addEventListener("input", render);
  elements.clear.addEventListener("click", () => {
    elements.search.value = "";
    elements.search.focus();
    render();
  });
  window.addEventListener("hashchange", render);
  render();
})();
