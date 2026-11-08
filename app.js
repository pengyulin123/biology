/* =========================================================
   生物竞赛作战台 · 交互脚本
   纯原生 JS，无依赖，可离线运行
   ========================================================= */
(function () {
  "use strict";

  /* ---------- 1. 导航高亮 ---------- */
  function markNav() {
    var path = location.pathname.split("/").pop() || "index.html";
    var links = document.querySelectorAll(".nav-links a");
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href") || "";
      if (href === path) links[i].classList.add("active");
    }
  }

  /* ---------- 2. 倒计时到下一次联赛 ---------- */
  // 全国生物学联赛：每年 5 月第二个周日
  function secondSundayOfMay(year) {
    var d = new Date(year, 4, 1);
    var firstDow = d.getDay(); // 0=周日
    var day = firstDow === 0 ? 8 : 8 + (7 - firstDow);
    return new Date(year, 4, day, 10, 0, 0);
  }

  function nextLeague() {
    var now = new Date();
    var y = now.getFullYear();
    var target = secondSundayOfMay(y);
    if (target.getTime() <= now.getTime()) target = secondSundayOfMay(y + 1);
    return target;
  }

  function renderCountdown() {
    var host = document.getElementById("countdown");
    if (!host) return;
    var target = nextLeague();
    function tick() {
      var diff = target.getTime() - new Date().getTime();
      if (diff < 0) diff = 0;
      var day = Math.floor(diff / 86400000);
      var hr = Math.floor((diff % 86400000) / 3600000);
      var mi = Math.floor((diff % 3600000) / 60000);
      var se = Math.floor((diff % 60000) / 1000);
      var boxes = host.querySelectorAll(".cd-box b");
      if (boxes.length >= 4) {
        boxes[0].textContent = day;
        boxes[1].textContent = hr < 10 ? "0" + hr : hr;
        boxes[2].textContent = mi < 10 ? "0" + mi : mi;
        boxes[3].textContent = se < 10 ? "0" + se : se;
      }
    }
    tick();
    setInterval(tick, 1000);

    var note = host.querySelector(".cd-note");
    if (note) {
      var y = target.getFullYear();
      note.textContent =
        "目标：20" + String(y).slice(1) + " 年 5 月 " + target.getDate() +
        " 日（5 月第二个周日 · 预估）";
    }
  }

  /* ---------- 3. 折叠面板 ---------- */
  function bindAccordion() {
    var heads = document.querySelectorAll(".phase-head");
    for (var i = 0; i < heads.length; i++) {
      heads[i].addEventListener("click", function () {
        this.parentElement.classList.toggle("open");
      });
    }
  }

  /* ---------- 4. 打卡（localStorage） ---------- */
  var LS_KEY = "biolab.check.v1";

  var MEMC = {};
  function readChecks() {
    var v = null;
    try { v = localStorage.getItem(LS_KEY); } catch (e) {}
    try { return JSON.parse(v || MEMC.v || "{}"); } catch (e) { return {}; }
  }
  function writeChecks(obj) {
    var v = JSON.stringify(obj);
    try { localStorage.setItem(LS_KEY, v); } catch (e) {}
    MEMC.v = v;
  }

  function bindChecks() {
    var inputs = document.querySelectorAll(".check input[type=checkbox]");
    if (!inputs.length) return;
    var store = readChecks();

    for (var i = 0; i < inputs.length; i++) {
      var id = inputs[i].getAttribute("data-id");
      if (!id) continue;
      if (store[id]) inputs[i].checked = true;
      inputs[i].addEventListener("change", function () {
        var s = readChecks();
        var key = this.getAttribute("data-id");
        if (this.checked) s[key] = 1;
        else delete s[key];
        writeChecks(s);
        updateProgress();
      });
    }
    updateProgress();
  }

  function updateProgress() {
    var line = document.getElementById("progressBar");
    var txt = document.getElementById("progressText");
    if (!line) return;
    var all = document.querySelectorAll(".check input[type=checkbox]");
    var checked = document.querySelectorAll(".check input[type=checkbox]:checked");
    var pct = all.length ? Math.round((checked.length / all.length) * 100) : 0;
    line.style.width = pct + "%";
    if (txt) txt.textContent = checked.length + " / " + all.length + " 项 · " + pct + "%";
  }

  /* ---------- 5. 回到顶部 ---------- */
  function bindTop() {
    var btn = document.querySelector(".totop");
    if (!btn) return;
    window.addEventListener("scroll", function () {
      if (window.scrollY > 500) btn.classList.add("show");
      else btn.classList.remove("show");
    });
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- 6. 页脚 ---------- */
  function renderFooter() {
    var f = document.querySelector(".footer-inner");
    if (!f) return;
    var year = new Date().getFullYear();
    f.innerHTML =
      '<div>生物竞赛作战台 · BioLab　<span class="faint">v0.6</span><br>' +
      '<a href="setup.html" style="font-size:12px">账号与云同步配置</a></div>' +
      '<div class="faint" style="max-width:420px">本站为个人学习辅助资源站，非官方平台。' +
      "所有赛制、时间、名额信息以<b>中国动物学会 / 中国植物学会</b>及本省竞赛分会的正式通知为准。" +
      "　© " + year + "</div>";
  }

  document.addEventListener("DOMContentLoaded", function () {
    markNav();
    renderCountdown();
    bindAccordion();
    bindChecks();
    bindTop();
    renderFooter();
  });
})();
