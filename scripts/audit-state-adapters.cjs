const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const baseUrl = process.argv[2] || "http://127.0.0.1:4192";
const root = path.resolve(__dirname, "..");
const platform = fs.readFileSync(path.join(root, "platform.js"), "utf8");
const lessonBlock = platform.match(/const lessons = \[([\s\S]*?)\n  \];/);

if (!lessonBlock) throw new Error("Unable to read lesson list from platform.js");

const lessons = [...lessonBlock[1].matchAll(/"([^"]+\.html)"/g)].map((match) => match[1]);
const executablePath = process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
  const report = [];

  for (const lesson of lessons) {
    await page.goto(`${baseUrl}/${lesson}?reset=1`, { waitUntil: "networkidle" });
    const result = await page.evaluate(() => {
      const candidates = Object.keys(window)
        .filter((key) => /Lab$/.test(key))
        .map((key) => ({ key, value: window[key] }))
        .filter(({ value }) => value && typeof value === "object");
      const candidate = candidates.find(({ value }) =>
        typeof value.getState === "function" && typeof value.setState === "function"
      );
      if (!candidate) {
        return {
          api: candidates.map(({ key }) => key),
          compatible: false,
          fields: [],
          rejected: [],
        };
      }
      const state = candidate.value.getState();
      const fields = [];
      const rejected = [];
      Object.entries(state || {}).forEach(([key, value]) => {
        if (["string", "number", "boolean"].includes(typeof value)) fields.push(key);
        else rejected.push(`${key}:${Array.isArray(value) ? "array" : typeof value}`);
      });
      return { api: candidate.key, compatible: true, fields, rejected };
    });
    report.push({ lesson, ...result });
  }

  await browser.close();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
