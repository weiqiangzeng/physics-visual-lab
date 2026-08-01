(function () {
  "use strict";

  const data = window.physicsTeacherPacks;
  const tools = window.physicsTeacherTools;
  if (!data || !tools) return;

  const list = document.getElementById("teacherPackList");
  const detail = document.getElementById("teacherPackDetail");
  const search = document.getElementById("teacherSearch");
  const moduleFilter = document.getElementById("teacherModule");
  const useFilter = document.getElementById("teacherUse");
  const count = document.getElementById("teacherResultCount");
  const empty = document.getElementById("teacherEmpty");
  const metrics = document.getElementById("teacherMetrics");
  let activeLesson = "";

  const escapeHtml = (value) => String(value).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
  const unique = (key) => [...new Set(data.packs.map((pack) => pack[key]))];
  const normalize = (value) => String(value || "").trim().toLocaleLowerCase("zh-CN");

  function fillOptions(select, values) {
    values.forEach((value) => select.insertAdjacentHTML("beforeend", `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`));
  }

  function packSearchText(pack) {
    return normalize([pack.title, pack.module, pack.lessonUse, pack.summary, pack.misconception, ...pack.tags, ...pack.objectives].join(" "));
  }

  function renderCatalog() {
    const query = normalize(search.value);
    const packs = data.packs.filter((pack) =>
      (!query || packSearchText(pack).includes(query))
      && (moduleFilter.value === "all" || pack.module === moduleFilter.value)
      && (useFilter.value === "all" || pack.lessonUse === useFilter.value));
    count.textContent = String(packs.length);
    empty.hidden = packs.length > 0;
    list.innerHTML = packs.map((pack) => `
      <article class="teacher-pack${pack.lesson === activeLesson ? " is-active" : ""}" data-pack="${pack.lesson}" tabindex="0">
        <div class="teacher-pack-media"><img src="${pack.image}" alt="${escapeHtml(pack.title)}实验界面" loading="lazy" /></div>
        <div class="teacher-pack-copy">
          <div class="teacher-pack-meta"><span>${escapeHtml(pack.module)}</span><span>${pack.duration} 分钟</span><span>${escapeHtml(pack.lessonUse)}</span></div>
          <h3>${escapeHtml(pack.title)}</h3><p>${escapeHtml(pack.summary)}</p><button type="button">查看课堂方案 →</button>
        </div>
      </article>`).join("");
    list.querySelectorAll("[data-pack]").forEach((item) => {
      const open = () => selectPack(item.dataset.pack, true);
      item.addEventListener("click", open);
      item.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } });
    });
  }

  function presetUrl(pack, preset) {
    return tools.buildSceneUrl(pack.lesson, preset.state, window.location.href);
  }

  function renderDetail(pack) {
    const steps = pack.sequence.map((step, index) => `
      <section class="teacher-step"><span>${String(index + 1).padStart(2, "0")} · ${escapeHtml(step.phase)} · ${step.minutes} 分钟</span><h4>${escapeHtml(step.prompt)}</h4><p>${escapeHtml(step.action)}</p><small>证据：${escapeHtml(step.evidence)}</small></section>`).join("");
    const presets = pack.presets.map((preset) => `
      <section class="teacher-preset"><strong>${escapeHtml(preset.title)}</strong><p>${escapeHtml(preset.note)}</p><a href="${escapeHtml(presetUrl(pack, preset))}" data-preset="${preset.id}">带参数打开实验</a></section>`).join("");
    const questions = pack.questions.map((item) => `<details><summary>${escapeHtml(item.prompt)}</summary><p>${escapeHtml(item.answer)}</p></details>`).join("");
    detail.innerHTML = `
      <header class="teacher-detail-head"><div><span class="teacher-kicker">${escapeHtml(pack.grade)} · ${escapeHtml(pack.lessonUse)} · ${pack.duration} 分钟</span><h2>${escapeHtml(pack.title)}</h2><p>${escapeHtml(pack.summary)}</p></div>
        <div class="teacher-detail-actions"><a class="teacher-command primary" href="./${pack.lesson}">打开实验</a><button class="teacher-command" type="button" data-print="teacher">打印教师版</button><button class="teacher-command" type="button" data-print="student">打印学生版</button></div></header>
      <div class="teacher-detail-grid teacher-only"><section class="teacher-block"><h3>学习目标</h3><ul>${pack.objectives.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section><section class="teacher-misconception"><strong>关键误区</strong>${escapeHtml(pack.misconception)}</section></div>
      <section class="teacher-only"><div class="teacher-section-head"><span class="teacher-kicker">5-PHASE FLOW</span><h3>课堂流程</h3></div><div class="teacher-sequence">${steps}</div></section>
      <section class="teacher-only" style="margin-top:30px"><div class="teacher-section-head"><span class="teacher-kicker">LIVE PRESETS</span><h3>课堂预设</h3></div><div class="teacher-presets">${presets}</div></section>
      <div class="teacher-detail-grid"><section class="teacher-block teacher-qa teacher-only"><h3>课堂追问与答案</h3>${questions}</section><section class="teacher-block student-sheet"><h3>学生记录单</h3><ol>${pack.worksheet.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol></section></div>
      <footer class="teacher-footer-note"><div><strong>本节结论</strong><p>${escapeHtml(pack.takeaway)}</p></div><div><strong>模型边界</strong><p>${escapeHtml(pack.boundary)}</p></div></footer>`;
    detail.hidden = false;
    detail.querySelectorAll("[data-preset]").forEach((link) => link.addEventListener("click", () => { tools.record("preset-opened", { lesson: pack.lesson }); renderMetrics(); }));
    detail.querySelectorAll("[data-print]").forEach((button) => button.addEventListener("click", () => {
      document.body.dataset.printMode = button.dataset.print;
      tools.record("pack-printed", { lesson: pack.lesson });
      window.print();
    }));
  }

  function selectPack(lesson, shouldScroll) {
    const pack = data.get(lesson);
    if (!pack) return;
    activeLesson = lesson;
    const url = new URL(window.location.href);
    url.searchParams.set("lesson", lesson);
    window.history.replaceState(null, "", url);
    renderCatalog();
    renderDetail(pack);
    tools.record("pack-opened", { lesson });
    renderMetrics();
    if (shouldScroll) detail.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderMetrics() {
    const data = tools.readMetrics();
    const rows = [["全部操作", data.total], ["查看方案", data.events["pack-opened"] || 0], ["打开预设", data.events["preset-opened"] || 0], ["创建分享", data.events["scene-created"] || 0]];
    metrics.innerHTML = rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("");
  }

  fillOptions(moduleFilter, unique("module"));
  fillOptions(useFilter, unique("lessonUse"));
  [search, moduleFilter, useFilter].forEach((control) => control.addEventListener(control === search ? "input" : "change", renderCatalog));
  document.getElementById("teacherResetMetrics").addEventListener("click", () => { tools.resetMetrics(); renderMetrics(); });
  document.getElementById("teacherFeedbackLink").href = tools.feedbackUrl("teacher-resources.html", "教师课堂资源中心");
  window.addEventListener("afterprint", () => { delete document.body.dataset.printMode; });
  renderCatalog();
  renderMetrics();
  const initial = new URLSearchParams(window.location.search).get("lesson");
  if (data.get(initial)) selectPack(initial, false);
})();
