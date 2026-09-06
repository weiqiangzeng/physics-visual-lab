const fs = require("node:fs");
const vm = require("node:vm");

const root = process.cwd();
const indexSource = fs.readFileSync(`${root}/index.html`, "utf8");
const platformSource = fs.readFileSync(`${root}/platform.js`, "utf8");
const configSource = fs.readFileSync(`${root}/showcase-config.js`, "utf8");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const configContext = { window: {} };
vm.runInNewContext(configSource, configContext);
const config = configContext.window.physicsShowcaseConfig;
const featured = config.featuredExperiments;
const cards = [...indexSource.matchAll(/data-lesson-card="([^"]+\.html)"/g)]
  .map((match) => match[1]);
const links = [...indexSource.matchAll(/href="\.\/([^"?#]+\.html)(?:[?#][^"]*)?"/g)]
  .map((match) => match[1]);
const lessonsBlock = platformSource.match(/const lessons = \[([\s\S]*?)\n  \];/);
assert(lessonsBlock, "cannot read lesson order from platform.js");
const lessons = [...lessonsBlock[1].matchAll(/"([^\"]+\.html)"/g)]
  .map((match) => match[1]);

assert(config.showcaseMode === true, "showcase mode is not enabled");
assert(config.showAllExperiments === false, "showAllExperiments must default to false");
assert(featured.length === 3, `expected 3 featured experiments, found ${featured.length}`);
assert(new Set(featured).size === featured.length, "featured experiments contain duplicates");
featured.forEach((lesson) => {
  assert(lessons.includes(lesson), `featured lesson missing from platform order: ${lesson}`);
  assert(cards.includes(lesson), `featured lesson missing from index cards: ${lesson}`);
  assert(fs.existsSync(`${root}/${lesson}`), `featured page missing: ${lesson}`);
});
assert(cards.length === 65, `expected 65 static cards, found ${cards.length}`);
assert(lessons.length === 65, `expected 65 platform lessons, found ${lessons.length}`);
assert(lessons.every((lesson) => fs.existsSync(`${root}/${lesson}`)), "some lesson URL target is missing");
assert(indexSource.includes("showAll=1"), "full directory recovery link missing");
assert(indexSource.includes("showcase-config.js"), "showcase config is not loaded by index.html");
assert(platformSource.includes("showAll") && platformSource.includes("featuredExperimentSet"), "platform showcase logic missing");

console.log(`PASS showcase config: ${featured.join(", ")}`);
console.log(`PASS preserved ${lessons.length} lesson URLs and ${cards.length} static cards`);
console.log("PASS full directory recovery link and runtime filter are present");
