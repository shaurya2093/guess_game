// Run with: node tests/test.js
const assert = require("assert");
const { PLAYERS, COUNTRIES, ROLES } = require("../players.js");
const Core = require("../core.js");

// --- data checks ---
const names = new Set();
for (const p of PLAYERS) {
  assert(!names.has(p.name), "duplicate player: " + p.name);
  names.add(p.name);
  assert(COUNTRIES[p.country], "unknown country for " + p.name);
  assert(ROLES[p.role], "unknown role for " + p.name);
  assert(p.bat === "L" || p.bat === "R", "bad batting hand for " + p.name);
  assert(p.born >= 1900 && p.born <= 2010, "bad birth year for " + p.name);
  const age = p.debut - p.born;
  assert(age >= 15 && age <= 40, "implausible debut age " + age + " for " + p.name);
}

// --- no two players share every clue (otherwise a puzzle could be unwinnable by logic) ---
const sig = new Map();
for (const p of PLAYERS) {
  const key = [p.country, p.role, p.bat, p.born, p.debut].join("|");
  assert(!sig.has(key), "identical clues: " + p.name + " and " + sig.get(key));
  sig.set(key, p.name);
}

// --- daily selection ---
const n = PLAYERS.length;
const firstCycle = new Set();
for (let d = 0; d < n; d++) {
  const i = Core.dailyIndex(d, n);
  assert(i >= 0 && i < n);
  firstCycle.add(i);
}
assert.strictEqual(firstCycle.size, n, "every player should appear once per cycle");
assert.strictEqual(Core.dailyIndex(5, n), Core.dailyIndex(5, n), "selection must be deterministic");
assert(Core.dailyIndex(-1, n) >= 0, "days before launch must still work");
assert.strictEqual(Core.dayNumber(new Date(2026, 10, 15, 0, 0, 1)), 0);
assert.strictEqual(Core.dayNumber(new Date(2026, 10, 15, 23, 59, 59)), 0);
assert.strictEqual(Core.dayNumber(new Date(2026, 10, 16, 0, 0, 0)), 1);
assert.strictEqual(Core.dayNumber(new Date(2027, 10, 15)), 365);

// --- comparison ---
const get = (name) => PLAYERS.find((p) => p.name === name);
const kohli = get("Virat Kohli");
const rohit = get("Rohit Sharma");
const lara = get("Brian Lara");
let r = Core.compare(kohli, kohli);
assert(Core.FIELDS.every((f) => r[f].status === "hit" && r[f].dir === ""));
r = Core.compare(rohit, kohli); // Rohit: 1987/2007, Kohli: 1988/2008
assert.strictEqual(r.country.status, "hit");
assert.deepStrictEqual(r.born, { status: "near", dir: "up" });
assert.deepStrictEqual(r.debut, { status: "near", dir: "up" });
r = Core.compare(kohli, lara); // Lara: WI, left, 1969/1990
assert.strictEqual(r.country.status, "miss");
assert.strictEqual(r.bat.status, "miss");
assert.deepStrictEqual(r.born, { status: "miss", dir: "down" });

// --- search ---
const found = Core.search(PLAYERS, "koh", [], 6).map((p) => p.name);
assert.deepStrictEqual(found, ["Virat Kohli"]);
assert(Core.search(PLAYERS, "sharma", [], 6).length === 2);
assert(Core.search(PLAYERS, "sharma", ["Rohit Sharma"], 6).length === 1, "guessed players are hidden");
assert(Core.search(PLAYERS, "ab de", [], 6)[0].name === "AB de Villiers");
assert(Core.search(PLAYERS, "", [], 6).length === 0);

// --- share text ---
const text = Core.shareText(12, [rohit, kohli], kohli, true, "https://example.com/");
assert(text.startsWith("Third Umpire #12 2/8\n"));
assert.strictEqual(text.split("\n").length, 4);
assert(!text.includes("Kohli"), "share text must not reveal the answer");
assert(Core.shareText(1, [lara], kohli, false, "").startsWith("Third Umpire #1 X/8"));

console.log("All tests passed (" + n + " players).");
