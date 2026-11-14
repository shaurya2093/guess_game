// Pure game logic: no DOM access, so it can be tested with Node.
(function (root) {
  var MAX_GUESSES = 8;
  var NEAR_YEARS = 3;
  var EPOCH = Date.UTC(2026, 10, 15); // puzzle #1 is 15 Nov 2026
  var DAY_MS = 86400000;

  // Puzzle number for a date, using the player's local calendar day.
  function dayNumber(date) {
    var local = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.floor((local - EPOCH) / DAY_MS);
  }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffledOrder(n, seed) {
    var rand = mulberry32(seed);
    var order = [];
    for (var i = 0; i < n; i++) order.push(i);
    for (var j = n - 1; j > 0; j--) {
      var k = Math.floor(rand() * (j + 1));
      var tmp = order[j];
      order[j] = order[k];
      order[k] = tmp;
    }
    return order;
  }

  // Every player appears once before any repeats; each cycle is reshuffled.
  function dailyIndex(day, n) {
    var cycle = Math.floor(day / n);
    var pos = ((day % n) + n) % n;
    return shuffledOrder(n, 20261115 + cycle)[pos];
  }

  function compareYear(guess, answer) {
    if (guess === answer) return { status: "hit", dir: "" };
    return {
      status: Math.abs(guess - answer) <= NEAR_YEARS ? "near" : "miss",
      dir: answer > guess ? "up" : "down"
    };
  }

  function compare(guess, answer) {
    function exact(key) {
      return { status: guess[key] === answer[key] ? "hit" : "miss", dir: "" };
    }
    return {
      country: exact("country"),
      role: exact("role"),
      bat: exact("bat"),
      born: compareYear(guess.born, answer.born),
      debut: compareYear(guess.debut, answer.debut)
    };
  }

  var FIELDS = ["country", "role", "bat", "born", "debut"];
  var EMOJI = { hit: "🟩", near: "🟨", miss: "⬜" };

  function shareText(puzzleNo, guesses, answer, won, url) {
    var lines = guesses.map(function (g) {
      var result = compare(g, answer);
      return FIELDS.map(function (f) { return EMOJI[result[f].status]; }).join("");
    });
    var score = won ? guesses.length : "X";
    return "Third Umpire #" + puzzleNo + " " + score + "/" + MAX_GUESSES + "\n" +
      lines.join("\n") + (url ? "\n" + url : "");
  }

  function normalize(text) {
    return text.toLowerCase().replace(/[^a-z]/g, "");
  }

  // Matches on any word start first, then anywhere in the name.
  function search(players, query, excludeNames, limit) {
    var q = normalize(query);
    if (!q) return [];
    var starts = [];
    var contains = [];
    players.forEach(function (p) {
      if (excludeNames.indexOf(p.name) !== -1) return;
      var words = p.name.toLowerCase().split(/[\s-]+/).map(normalize);
      var full = normalize(p.name);
      if (full.indexOf(q) === 0 || words.some(function (w) { return w.indexOf(q) === 0; })) starts.push(p);
      else if (full.indexOf(q) !== -1) contains.push(p);
    });
    return starts.concat(contains).slice(0, limit || 6);
  }

  var api = {
    MAX_GUESSES: MAX_GUESSES, FIELDS: FIELDS,
    dayNumber: dayNumber, dailyIndex: dailyIndex, compare: compare,
    shareText: shareText, search: search
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.GameCore = api;
})(typeof window !== "undefined" ? window : this);
