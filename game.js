(function () {
  var Data = window.GameData;
  var Core = window.GameCore;
  var PLAYERS = Data.PLAYERS;
  var byName = {};
  PLAYERS.forEach(function (p) { byName[p.name] = p; });

  var STATE_KEY = "thirdUmpire.state.v1";
  var STATS_KEY = "thirdUmpire.stats.v1";

  // Storage can be unavailable (private mode, blocked cookies); the game still works without it.
  function load(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  var $ = function (id) { return document.getElementById(id); };
  var input = $("guessInput");
  var list = $("suggestions");
  var rowsEl = $("rows");

  var today = Core.dayNumber(new Date());
  var game = null;      // { practice, answer, guesses: [names], done, won }
  var matches = [];
  var active = -1;

  function defaultStats() {
    return { played: 0, wins: 0, streak: 0, best: 0, lastWinDay: null, dist: [0, 0, 0, 0, 0, 0, 0, 0] };
  }
  function getStats() {
    var s = load(STATS_KEY);
    if (!s || !Array.isArray(s.dist) || s.dist.length !== Core.MAX_GUESSES) return defaultStats();
    return s;
  }

  function startDaily() {
    today = Core.dayNumber(new Date());
    var answer = PLAYERS[Core.dailyIndex(today, PLAYERS.length)];
    var saved = load(STATE_KEY);
    var guesses = [];
    if (saved && saved.day === today && Array.isArray(saved.guesses)) {
      guesses = saved.guesses.filter(function (n) { return byName[n]; }).slice(0, Core.MAX_GUESSES);
    }
    game = { practice: false, answer: answer, guesses: guesses, done: false, won: false };
    settle();
    renderAll(false);
  }

  function startPractice() {
    var dailyName = PLAYERS[Core.dailyIndex(today, PLAYERS.length)].name;
    var pool = PLAYERS.filter(function (p) { return p.name !== dailyName; });
    var answer = pool[Math.floor(Math.random() * pool.length)];
    game = { practice: true, answer: answer, guesses: [], done: false, won: false };
    renderAll(false);
    input.focus();
  }

  // Works out whether the current guesses have ended the game.
  function settle() {
    var last = game.guesses[game.guesses.length - 1];
    game.won = last === game.answer.name;
    game.done = game.won || game.guesses.length >= Core.MAX_GUESSES;
  }

  function submit(name) {
    if (game.done) return;
    var player = byName[name];
    if (!player) { toast("Pick a player from the list"); return; }
    if (game.guesses.indexOf(name) !== -1) { toast("Already guessed"); return; }
    game.guesses.push(name);
    settle();
    if (!game.practice) {
      save(STATE_KEY, { day: today, guesses: game.guesses });
      if (game.done) recordResult();
    }
    input.value = "";
    closeList();
    renderAll(true);
  }

  function recordResult() {
    var s = getStats();
    s.played += 1;
    if (game.won) {
      s.wins += 1;
      s.streak = s.lastWinDay === today - 1 ? s.streak + 1 : 1;
      s.lastWinDay = today;
      s.best = Math.max(s.best, s.streak);
      s.dist[game.guesses.length - 1] += 1;
    } else {
      s.streak = 0;
    }
    save(STATS_KEY, s);
  }

  // ---------- rendering ----------

  function cellText(field, player) {
    if (field === "country") return player.country;
    if (field === "role") return Data.ROLES[player.role];
    if (field === "bat") return player.bat === "L" ? "Left" : "Right";
    return String(player[field]);
  }

  var LABELS = { country: "Country", role: "Role", bat: "Bats", born: "Born", debut: "Debut" };
  var STATUS_WORDS = { hit: "match", near: "close", miss: "no match" };

  function buildRow(name, isNew) {
    var player = byName[name];
    var result = Core.compare(player, game.answer);
    var li = document.createElement("li");
    if (isNew) li.className = "new";
    var title = document.createElement("p");
    title.className = "row-name";
    title.textContent = player.name;
    var cells = document.createElement("div");
    cells.className = "cells";
    Core.FIELDS.forEach(function (field) {
      var r = result[field];
      var cell = document.createElement("div");
      cell.className = "cell " + r.status;
      var arrow = r.dir === "up" ? " ▲" : r.dir === "down" ? " ▼" : "";
      cell.textContent = cellText(field, player) + arrow;
      var hint = r.dir === "up" ? ", answer is later" : r.dir === "down" ? ", answer is earlier" : "";
      cell.setAttribute("aria-label", LABELS[field] + " " + cellText(field, player) + ": " + STATUS_WORDS[r.status] + hint);
      if (field === "country") cell.title = Data.COUNTRIES[player.country];
      cells.appendChild(cell);
    });
    li.appendChild(title);
    li.appendChild(cells);
    return li;
  }

  function renderAll(animateLast) {
    rowsEl.innerHTML = "";
    // Newest guess on top so it is visible without scrolling on a phone.
    for (var i = game.guesses.length - 1; i >= 0; i--) {
      rowsEl.appendChild(buildRow(game.guesses[i], animateLast && i === game.guesses.length - 1));
    }
    var hasGuesses = game.guesses.length > 0;
    $("gridHead").hidden = !hasGuesses;
    $("emptyHint").hidden = hasGuesses;
    $("practiceBar").hidden = !game.practice;
    $("subtitle").textContent = game.practice ? "Practice round" : "Puzzle #" + (today + 1);
    $("counter").textContent = game.guesses.length + "/" + Core.MAX_GUESSES;
    input.disabled = game.done;
    input.placeholder = game.done ? "Come back tomorrow" : "Type a cricketer's name";
    if (game.practice && game.done) input.placeholder = "Round over";
    renderResult();
  }

  function renderResult() {
    var box = $("result");
    box.hidden = !game.done;
    if (!game.done) return;
    var a = game.answer;
    $("resultTitle").textContent = game.won
      ? "Howzat! Got it in " + game.guesses.length + (game.guesses.length === 1 ? " guess" : " guesses")
      : "Out! Better luck next time";
    $("resultAnswer").textContent = a.name + " · " + Data.COUNTRIES[a.country] + " · " + Data.ROLES[a.role];
    $("shareBtn").hidden = game.practice;
    $("nextWrap").hidden = game.practice;
    $("practiceBtn").textContent = game.practice ? "Play another round" : "Play a practice round";
  }

  function renderStats() {
    var s = getStats();
    $("stPlayed").textContent = s.played;
    $("stWin").textContent = s.played ? Math.round((s.wins / s.played) * 100) : 0;
    // A streak only counts if the last win was today or yesterday.
    var live = s.lastWinDay !== null && s.lastWinDay >= today - 1 ? s.streak : 0;
    $("stStreak").textContent = live;
    $("stBest").textContent = s.best;
    var dist = $("dist");
    dist.innerHTML = "";
    var max = Math.max.apply(null, s.dist.concat([1]));
    var mine = !game.practice && game.won ? game.guesses.length - 1 : -1;
    s.dist.forEach(function (count, i) {
      var row = document.createElement("div");
      row.className = "dist-row";
      var label = document.createElement("span");
      label.textContent = i + 1;
      var bar = document.createElement("div");
      bar.className = "dist-bar" + (i === mine ? " best" : "");
      bar.style.width = Math.max(8, Math.round((count / max) * 100)) + "%";
      bar.textContent = count;
      row.appendChild(label);
      row.appendChild(bar);
      dist.appendChild(row);
    });
  }

  // ---------- suggestions ----------

  function openList() {
    matches = Core.search(PLAYERS, input.value, game.guesses, 6);
    active = matches.length ? 0 : -1;
    list.innerHTML = "";
    matches.forEach(function (p, i) {
      var li = document.createElement("li");
      li.setAttribute("role", "option");
      li.id = "opt-" + i;
      li.setAttribute("aria-selected", i === active ? "true" : "false");
      var nameEl = document.createElement("span");
      nameEl.textContent = p.name;
      var meta = document.createElement("small");
      meta.textContent = p.country;
      li.appendChild(nameEl);
      li.appendChild(meta);
      // mousedown fires before the input loses focus, so the pick is not lost.
      li.addEventListener("mousedown", function (e) { e.preventDefault(); submit(p.name); });
      list.appendChild(li);
    });
    list.hidden = matches.length === 0;
    input.setAttribute("aria-expanded", matches.length ? "true" : "false");
  }

  function closeList() {
    matches = [];
    active = -1;
    list.hidden = true;
    list.innerHTML = "";
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  }

  function moveActive(step) {
    if (!matches.length) return;
    active = (active + step + matches.length) % matches.length;
    Array.prototype.forEach.call(list.children, function (li, i) {
      li.setAttribute("aria-selected", i === active ? "true" : "false");
      if (i === active) {
        input.setAttribute("aria-activedescendant", li.id);
        if (li.scrollIntoView) li.scrollIntoView({ block: "nearest" });
      }
    });
  }

  input.addEventListener("input", openList);
  input.addEventListener("focus", function () { if (input.value) openList(); });
  input.addEventListener("blur", closeList);
  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); moveActive(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); moveActive(-1); }
    else if (e.key === "Escape") { closeList(); }
  });
  $("guessForm").addEventListener("submit", function (e) {
    e.preventDefault();
    if (active >= 0 && matches[active]) { submit(matches[active].name); return; }
    var typed = input.value.trim().toLowerCase();
    var exact = PLAYERS.filter(function (p) { return p.name.toLowerCase() === typed; })[0];
    if (exact) submit(exact.name);
    else if (typed) toast("Pick a player from the list");
  });

  // ---------- sharing, modals, countdown ----------

  var toastTimer = null;
  function toast(message) {
    var el = $("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2200);
  }

  function copyFallback(text) {
    var area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(area);
    toast(ok ? "Score copied" : "Couldn't copy the score");
  }

  $("shareBtn").addEventListener("click", function () {
    var guesses = game.guesses.map(function (n) { return byName[n]; });
    var url = location.origin + location.pathname;
    var text = Core.shareText(today + 1, guesses, game.answer, game.won, url);
    var isTouch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (navigator.share && isTouch) {
      navigator.share({ text: text }).catch(function () { /* user closed the share sheet */ });
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("Score copied"); }, function () { copyFallback(text); });
    } else {
      copyFallback(text);
    }
  });

  $("practiceBtn").addEventListener("click", startPractice);
  $("backToDaily").addEventListener("click", startDaily);

  function openModal(dialog) {
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute("open", "");
  }
  function closeModal(dialog) {
    if (dialog.close) dialog.close();
    else dialog.removeAttribute("open");
  }
  $("helpBtn").addEventListener("click", function () { openModal($("helpModal")); });
  $("statsBtn").addEventListener("click", function () { renderStats(); openModal($("statsModal")); });
  Array.prototype.forEach.call(document.querySelectorAll("dialog"), function (dialog) {
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog || e.target.hasAttribute("data-close")) closeModal(dialog);
    });
  });

  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function tick() {
    var now = new Date();
    // A new day began while the page was open: load the new puzzle.
    if (Core.dayNumber(now) !== today && !game.practice) { startDaily(); return; }
    var midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    var left = Math.max(0, Math.floor((midnight - now) / 1000));
    $("countdown").textContent = pad(Math.floor(left / 3600)) + ":" + pad(Math.floor((left % 3600) / 60)) + ":" + pad(left % 60);
  }

  startDaily();
  tick();
  setInterval(tick, 1000);

  var SEEN_KEY = "thirdUmpire.seenHelp.v1";
  if (!load(SEEN_KEY)) {
    save(SEEN_KEY, true);
    openModal($("helpModal"));
  }
})();
