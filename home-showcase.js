(function () {
  "use strict";

  const packs = window.physicsTeacherPacks;
  const tools = window.physicsTeacherTools;
  const grid = document.getElementById("teacherCaseGrid");
  if (!packs || !tools || !grid) return;

  const featuredLessons = [
    "electric-field.html",
    "charged-particle.html",
    "electromagnetic-induction.html",
    "double-slit.html",
  ];
  const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[character]));

  function sceneUrl(pack, preset) {
    return tools.buildSceneUrl(pack.lesson, preset.state, window.location.href);
  }

  function renderCard(pack) {
    const leadPreset = pack.presets[0];
    const question = pack.sequence[0]?.prompt || "改变一个参数，物理结论会怎样变化？";
    const presetLinks = pack.presets.map((preset) => `
      <a class="teacher-case-preset" href="${escapeHtml(sceneUrl(pack, preset))}" data-lesson="${escapeHtml(pack.lesson)}" data-preset="${escapeHtml(preset.id)}">
        <strong>${escapeHtml(preset.title)}</strong><span>${escapeHtml(preset.note)}</span>
      </a>`).join("");
    return `
      <article class="teacher-case-card">
        <div class="teacher-case-media"><img src="${escapeHtml(pack.image)}" alt="${escapeHtml(pack.title)}实验界面截图" loading="eager" /></div>
        <div class="teacher-case-body">
          <div class="teacher-case-meta"><span>${escapeHtml(pack.module)}</span><span>${escapeHtml(pack.lessonUse)}</span></div>
          <h3>${escapeHtml(pack.title)}</h3>
          <div class="teacher-case-question"><span>课堂问题</span><strong>${escapeHtml(question)}</strong></div>
          <div class="teacher-case-conclusion"><span>物理结论</span><p>${escapeHtml(pack.takeaway)}</p></div>
          <a class="teacher-case-primary" href="${escapeHtml(sceneUrl(pack, leadPreset))}" data-lesson="${escapeHtml(pack.lesson)}" data-preset="${escapeHtml(leadPreset.id)}">开始演示<span aria-hidden="true">→</span></a>
        </div>
        <div class="teacher-case-presets" aria-label="${escapeHtml(pack.title)}教师预设">${presetLinks}</div>
      </article>`;
  }

  const featuredPacks = featuredLessons.map((lesson) => packs.get(lesson)).filter(Boolean);
  grid.innerHTML = featuredPacks.map(renderCard).join("");
  grid.querySelectorAll("[data-preset]").forEach((link) => link.addEventListener("click", () => {
    tools.record("preset-opened", { lesson: link.dataset.lesson });
  }));
})();
