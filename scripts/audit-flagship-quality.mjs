import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "quality/flagship-standard.json"), "utf8"));

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function count(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function modesWithin(html, marker) {
  const start = html.indexOf(marker);
  if (start < 0) return [];
  const end = html.indexOf("</nav>", start);
  const fragment = html.slice(start, end < 0 ? html.length : end);
  return [...fragment.matchAll(/data-mode=["']([^"']+)["']/g)].map((match) => match[1]);
}

function score(checks) {
  const passed = checks.filter(Boolean).length;
  if (passed === checks.length) return 3;
  if (passed >= Math.ceil(checks.length * 0.67)) return 2;
  if (passed > 0) return 1;
  return 0;
}

let failed = false;
for (const lab of manifest.labs) {
  const html = read(lab.html);
  const script = read(lab.script);
  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map((match) => match[1]);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  const desktopModes = modesWithin(html, "lesson-rail");
  const mobileModes = modesWithin(html, "mobile-scene-tabs");
  const canvases = count(html, /<canvas\b/g);
  const labeledCanvases = count(html, /<canvas\b[^>]*aria-label=/g);
  const routeSteps = count(html, /class=["'][^"']*route-step/g);
  const sharedScripts = manifest.requiredSharedScripts.map((name) => html.includes(name));
  const requiredMarkup = manifest.requiredMarkup.map((token) => html.includes(token));
  const modeParity = desktopModes.length >= 3
    && JSON.stringify([...new Set(desktopModes)].sort()) === JSON.stringify([...new Set(mobileModes)].sort());

  const dimensions = {
    physics: score([
      html.includes("rail-equation"),
      html.includes("law-check"),
      html.includes("formulaReadout"),
      script.includes(`window.${lab.api}`),
      !lab.model || fs.existsSync(path.join(root, lab.model))
    ]),
    stateConsistency: score([
      modeParity,
      script.includes("resetButton"),
      script.includes("is-active"),
      html.includes("stateBadge")
    ]),
    directManipulation: score([
      /type=["']range["']/.test(html),
      script.includes("pointerdown"),
      script.includes("pointermove")
    ]),
    linkedEvidence: score([
      canvases >= lab.minimumCanvasCount,
      html.includes("live-readouts"),
      html.includes("analysis-grid"),
      html.includes("formulaReadout")
    ]),
    modelBoundaries: score([
      /近似|临界|边界|失效/.test(html),
      html.includes("guideDialog"),
      /模型|忽略|示意|适用/.test(html)
    ]),
    learningLoop: score([
      routeSteps >= 3,
      html.includes("observation-bar"),
      html.includes("guideDialog"),
      html.includes("learning-records.js")
    ]),
    productQuality: score([
      requiredMarkup.every(Boolean),
      sharedScripts.every(Boolean),
      labeledCanvases === canvases,
      duplicateIds.length === 0,
      html.includes("aria-label")
    ])
  };

  const values = Object.values(dimensions);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const hardFailures = [
    !modeParity && "desktop/mobile scene modes differ",
    !requiredMarkup.every(Boolean) && "required workbench markup missing",
    !sharedScripts.every(Boolean) && "shared protocol script missing",
    canvases < lab.minimumCanvasCount && "insufficient analysis canvases",
    labeledCanvases !== canvases && "canvas aria-label missing",
    duplicateIds.length > 0 && "duplicate ids"
  ].filter(Boolean);
  const labFailed = hardFailures.length > 0
    || values.some((value) => value < manifest.minimumDimensionScore)
    || average < manifest.minimumAverageScore;
  failed ||= labFailed;

  console.log(`${lab.id}: ${labFailed ? "FAIL" : "PASS"} (${average.toFixed(2)}/3)`);
  console.log(Object.entries(dimensions).map(([name, value]) => `  ${name}: ${value}`).join("\n"));
  if (hardFailures.length) console.log(`  hard failures: ${hardFailures.join(", ")}`);
  if (!modeParity) console.log(`  mode parity: desktop=[${desktopModes}] mobile=[${mobileModes}]`);
  if (duplicateIds.length) console.log(`  duplicate ids: ${duplicateIds.join(", ")}`);
}

if (failed) process.exitCode = 1;
