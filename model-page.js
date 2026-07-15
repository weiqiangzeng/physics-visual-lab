(function () {
  const curriculum = window.physicsCurriculum;
  const params = new URLSearchParams(window.location.search);
  const modelId = params.get("id");
  const item = curriculum?.models.find((model) => model.id === modelId);
  const content = document.getElementById("modelContent");
  const notFound = document.getElementById("modelNotFound");

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value || "";
  };

  const renderList = (id, values) => {
    const list = document.getElementById(id);
    if (!list) return;
    list.replaceChildren(...(values || []).map((value) => {
      const itemElement = document.createElement("li");
      itemElement.textContent = value;
      return itemElement;
    }));
  };

  if (!item) {
    if (notFound) notFound.hidden = false;
    return;
  }

  const book = curriculum.books.find((volume) => volume.chapters.some((chapter) => chapter.id === item.chapterId));
  const chapter = book?.chapters.find((entry) => entry.id === item.chapterId);
  const status = curriculum.statusLabels[item.status] || item.status;

  document.title = `${item.title} · 高中物理模型`;
  content.hidden = false;
  setText("modelBreadcrumb", `${book?.title || "高中物理"} / ${chapter?.title || "模型内容"}`);
  setText("modelCategory", item.category);
  setText("modelStatus", status);
  setText("modelTitle", item.title);
  setText("modelSummary", item.summary);
  setText("modelVisual", item.visual);
  setText("modelHook", item.hook);
  setText("modelDefinition", item.model);
  setText("modelMisconceptions", item.misconceptions);
  setText("modelPrerequisite", item.prerequisite);
  renderList("modelRelations", item.relations);
  renderList("modelExplore", item.explore);

  const labLink = document.getElementById("modelLabLink");
  const nextStep = document.getElementById("modelNextStep");
  if (item.lab) {
    labLink.hidden = false;
    labLink.href = `./${item.lab}`;
    if (nextStep) nextStep.textContent = "这个模型已有交互实验，可以直接进入并用参数变化核对上面的关系。";
  } else if (nextStep) {
    nextStep.textContent = "当前已完成模型内容整理，交互实验正在按课程优先级逐步开发。";
  }
})();
