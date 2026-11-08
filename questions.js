/* =========================================================
   全题库页面：展示所有题目，10 题一页
   数据：window.QUIZ_BUILTIN（内置）+ localStorage 自定义题
   ========================================================= */
(function () {
  "use strict";

  var PER = 10;
  var QKEY = "biolab.customq.v1";

  var all = [];
  var view = [];
  var page = 1;
  var filter = "all";   // all | builtin | custom
  var kw = "";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function hl(text, q) {
    var safe = esc(text);
    if (!q) return safe;
    try {
      var re = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi");
      return safe.replace(re, "<mark>$1</mark>");
    } catch (e) { return safe; }
  }

  function load() {
    var builtin = (window.QUIZ_BUILTIN || []).map(function (q) {
      return { q: q, from: "builtin" };
    });
    var custom = [];
    try {
      var raw = localStorage.getItem(QKEY);
      var arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) {
        custom = arr.map(function (q) { return { q: q, from: "custom" }; });
      }
    } catch (e) {}
    all = builtin.concat(custom);
  }

  function apply() {
    view = all.filter(function (x) {
      if (filter === "builtin" && x.from !== "builtin") return false;
      if (filter === "custom" && x.from !== "custom") return false;
      if (!kw) return true;
      var q = x.q;
      var hay = (q.stem || "") + " " + (q.topic || "") + " " + (q.exp || "");
      (q.opts || []).forEach(function (o) { hay += " " + (o.t || ""); });
      return hay.toLowerCase().indexOf(kw.toLowerCase()) >= 0;
    });
    var maxPage = Math.max(1, Math.ceil(view.length / PER));
    if (page > maxPage) page = maxPage;
    if (page < 1) page = 1;
  }

  function render() {
    apply();
    var stat = document.getElementById("qStat");
    if (stat) {
      stat.textContent = "共 " + view.length + " 题" +
        (view.length !== all.length ? "（筛选自 " + all.length + " 题）" : "");
    }

    var host = document.getElementById("qList");
    if (!host) return;

    if (!view.length) {
      host.innerHTML = '<div class="empty-box">没有匹配的题目。换个关键词，或去练习页「题库」标签导入。</div>';
      renderPager();
      return;
    }

    var start = (page - 1) * PER;
    var slice = view.slice(start, start + PER);

    var h = "";
    slice.forEach(function (x, i) {
      var q = x.q;
      var no = start + i + 1;
      h += '<div class="q-card">' +
        '<div class="q-head">' +
        '<span class="q-no">Q' + (no < 10 ? "0" + no : no) + "</span>" +
        '<span class="q-topic">' + hl(q.topic || "未分类", kw) + "</span>" +
        '<span class="tag ' + (x.from === "builtin" ? "tag-sky" : "tag-mint") + '" style="margin-left:auto">' +
        (x.from === "builtin" ? "内置" : "我的") + "</span></div>" +
        '<div class="q-stem">' + hl(q.stem || "", kw) + "</div>" +
        '<div class="opts">';

      (q.opts || []).forEach(function (o, j) {
        var letter = "ABCD".charAt(j);
        var ans = String(o.a || "").toUpperCase();
        h += '<div class="opt" style="cursor:default">' +
          '<span class="oidx">' + letter + "</span>" +
          '<span class="otext">' + hl(o.t || "", kw) + "</span>" +
          '<span class="tfbtn ' + (ans === "T" ? "on-t" : "on-f") + '" style="pointer-events:none">' +
          (ans === "T" ? "T" : "F") + "</span></div>";
      });

      h += "</div>";
      h += '<details style="margin-top:10px"><summary style="font-size:12.5px;color:var(--mint);cursor:pointer">查看解析</summary>' +
        '<div class="q-explain show" style="margin-top:8px">' + hl(q.exp || "（无解析）", kw) + "</div></details>";
      h += "</div>";
    });
    host.innerHTML = h;
    renderPager();
  }

  function renderPager() {
    var p = document.getElementById("qPager");
    var info = document.getElementById("qPageInfo");
    if (!p) return;
    var maxPage = Math.max(1, Math.ceil(view.length / PER));
    if (info) info.textContent = "第 " + page + " / " + maxPage + " 页";

    var h = '<button class="btn btn-sm" data-go="' + (page - 1) + '"' +
      (page <= 1 ? " disabled" : "") + ">上一页</button>";

    var from = Math.max(1, page - 2);
    var to = Math.min(maxPage, from + 4);
    from = Math.max(1, to - 4);
    for (var i = from; i <= to; i++) {
      h += '<button class="btn btn-sm' + (i === page ? " btn-primary" : "") +
        '" data-go="' + i + '">' + i + "</button>";
    }
    h += '<button class="btn btn-sm" data-go="' + (page + 1) + '"' +
      (page >= maxPage ? " disabled" : "") + ">下一页</button>";

    p.innerHTML = h;
    p.querySelectorAll("[data-go]").forEach(function (b) {
      b.addEventListener("click", function () {
        var n = parseInt(this.getAttribute("data-go"), 10);
        if (isNaN(n) || n < 1 || n > maxPage) return;
        page = n;
        render();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });
  }

  function bind() {
    var sel = document.querySelectorAll("#qFilter .chip");
    for (var i = 0; i < sel.length; i++) {
      sel[i].addEventListener("click", function () {
        for (var j = 0; j < sel.length; j++) sel[j].classList.remove("on");
        this.classList.add("on");
        filter = this.getAttribute("data-f");
        page = 1;
        render();
      });
    }
    var input = document.getElementById("qSearch");
    var t = null;
    if (input) input.addEventListener("input", function () {
      var v = this.value;
      clearTimeout(t);
      t = setTimeout(function () { kw = v.trim(); page = 1; render(); }, 180);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    load();
    bind();
    render();
  });
})();
