(function () {
  "use strict";

  const SCENE_VERSION = 1;
  const EVENT_STORAGE_KEY = "physics-visual-lab-teacher-events-v1";
  const QR_SCRIPT = "./vendor/qrcode-generator/qrcode.js?v=2.0.4";
  const MAX_SCENE_LENGTH = 12000;
  let qrPromise = null;

  function toBase64Url(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function fromBase64Url(value) {
    const encoded = String(value || "");
    if (!encoded || encoded.length > MAX_SCENE_LENGTH || !/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error("Invalid scene encoding");
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function primitiveState(state) {
    const output = {};
    Object.entries(state || {}).slice(0, 64).forEach(([key, value]) => {
      if (/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(key)
        && ["string", "number", "boolean"].includes(typeof value)
        && (typeof value !== "number" || Number.isFinite(value))
        && (typeof value !== "string" || value.length <= 120)) output[key] = value;
    });
    return output;
  }

  function validLesson(lesson) {
    return typeof lesson === "string" && /^[a-z0-9-]+\.html$/i.test(lesson);
  }

  function encodeScene(lesson, state) {
    if (!validLesson(lesson)) throw new Error("Invalid lesson path");
    return toBase64Url(JSON.stringify({ version: SCENE_VERSION, lesson, state: primitiveState(state) }));
  }

  function decodeScene(encoded) {
    try {
      const payload = JSON.parse(fromBase64Url(encoded));
      if (payload?.version !== SCENE_VERSION || !validLesson(payload.lesson)
        || !payload.state || typeof payload.state !== "object" || Array.isArray(payload.state)) return null;
      return { version: SCENE_VERSION, lesson: payload.lesson, state: primitiveState(payload.state) };
    } catch {
      return null;
    }
  }

  function readScene(hash = window.location.hash) {
    const params = new URLSearchParams(String(hash || "").replace(/^#/, ""));
    return decodeScene(params.get("scene"));
  }

  function buildSceneUrl(lesson, state, base) {
    const url = new URL(lesson, base || window.location.href);
    url.search = "";
    url.hash = new URLSearchParams({ scene: encodeScene(lesson, state) }).toString();
    return url.toString();
  }

  function emptyMetrics() {
    return { version: 1, total: 0, events: {}, lessons: {}, lastEvent: null };
  }

  function readMetrics() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(EVENT_STORAGE_KEY) || "null");
      return parsed?.version === 1 && parsed.events && parsed.lessons ? parsed : emptyMetrics();
    } catch {
      return emptyMetrics();
    }
  }

  function record(eventName, detail = {}) {
    if (typeof eventName !== "string" || !/^[a-z0-9-]{1,48}$/i.test(eventName)) return;
    try {
      const data = readMetrics();
      const lesson = validLesson(detail.lesson) ? detail.lesson : "";
      data.total = Number(data.total || 0) + 1;
      data.events[eventName] = Number(data.events[eventName] || 0) + 1;
      if (lesson) data.lessons[lesson] = Number(data.lessons[lesson] || 0) + 1;
      data.lastEvent = { name: eventName, lesson, at: new Date().toISOString() };
      window.localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Metrics are optional, local-only, and never block a classroom action.
    }
  }

  function resetMetrics() {
    try { window.localStorage.removeItem(EVENT_STORAGE_KEY); } catch { /* optional */ }
  }

  function loadQr() {
    if (window.qrcode) return Promise.resolve(window.qrcode);
    if (qrPromise) return qrPromise;
    qrPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = QR_SCRIPT;
      script.addEventListener("load", () => window.qrcode ? resolve(window.qrcode) : reject(new Error("QR generator unavailable")), { once: true });
      script.addEventListener("error", () => reject(new Error("QR generator failed to load")), { once: true });
      document.head.appendChild(script);
    });
    return qrPromise;
  }

  async function renderQr(container, value, options = {}) {
    if (!container) throw new Error("QR container is required");
    const factory = await loadQr();
    const qr = factory(0, options.level || "M");
    qr.addData(String(value));
    qr.make();
    container.innerHTML = qr.createSvgTag({ cellSize: options.cellSize || 5, margin: options.margin || 4, scalable: true });
    const svg = container.querySelector("svg");
    if (svg) {
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", options.label || "课堂场景二维码");
    }
    return svg;
  }

  function feedbackUrl(lesson, title) {
    const body = [
      "### 实验", title || lesson || "请填写",
      "", "### 使用场景", "新课 / 复习 / 演示 / 学生探究（请保留适用项）",
      "", "### 哪一步有效或遇到了什么问题？", "",
      "### 建议", "",
      "### 设备与浏览器（如为技术问题）", "",
    ].join("\n");
    return "https://github.com/weiqiangzeng/physics-visual-lab/issues/new?" + new URLSearchParams({ title: "[教师反馈] " + (title || lesson || "课堂使用"), body }).toString();
  }

  window.physicsTeacherTools = Object.freeze({
    SCENE_VERSION,
    EVENT_STORAGE_KEY,
    primitiveState,
    encodeScene,
    decodeScene,
    readScene,
    buildSceneUrl,
    readMetrics,
    record,
    resetMetrics,
    renderQr,
    feedbackUrl,
  });
})();
