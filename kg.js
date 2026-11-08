/* =========================================================
   知识总纲 · 目录树 / 全文检索 / 术语表 / 闪卡
   数据：data/index.js（索引）· data/book-XX.js（按册正文）· data/terms.js
   ========================================================= */
(function () {
  "use strict";

  var S = {
    idx: window.KG_INDEX || [],
    books: {},
    terms: window.KG_TERMS || [],
    star: 0,
    openBooks: {},
    openChaps: {},
    termBook: "",
    termLimit: 50,
    deepReady: false,
    deepBusy: false,
    cardMode: "term",
    cloze: false,
    hotBook: "",
    cardBook: "",
    pool: [],
    pos: 0,
    flipped: false,
    known: {},
    sheetBook: null,
    sheetItem: null,
    idxRaw: null
  };

  /* ---------- 编辑层（本机覆盖） ---------- */
  var LAYER = { items: {}, added: [], removed: {}, terms: {}, texts: {},
                chapters: {}, chAdded: [], chRemoved: {} };
  var EDIT_KEY = "biolab.edit.v1";
  var MEME = {};

  function lsGet(k) {
    try { var v = localStorage.getItem(k); if (v !== null) return v; } catch (e) {}
    return MEME[k] || null;
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, v); } catch (e) {}
    MEME[k] = v;
  }
  function loadLayer() {
    try {
      var raw = lsGet(EDIT_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        LAYER.items = o.items || {};
        LAYER.added = o.added || [];
        LAYER.removed = o.removed || {};
        LAYER.terms = o.terms || {};
        LAYER.texts = o.texts || {};
        LAYER.chapters = o.chapters || {};
        LAYER.chAdded = o.chAdded || [];
        LAYER.chRemoved = o.chRemoved || {};
      }
    } catch (e) {}
  }
  function saveLayer() { lsSet(EDIT_KEY, JSON.stringify(LAYER)); }

  function applyLayer() {
    if (!S.idxRaw) S.idxRaw = JSON.parse(JSON.stringify(S.idx));
    S.idx = JSON.parse(JSON.stringify(S.idxRaw));
    S.idx.forEach(function (b) {
      // 删除整章
      b.chapters = b.chapters.filter(function (ch) {
        return !LAYER.chRemoved[b.id + ":" + ch.n];
      });
      // 章改名
      b.chapters.forEach(function (ch) {
        var co = LAYER.chapters[b.id + ":" + ch.n];
        if (co && co.t) ch.t = co.t;
      });
      b.chapters.forEach(function (ch) {
        ch.i = ch.i.filter(function (it) {
          return !LAYER.removed[b.id + "|" + it[0]];
        }).map(function (it) {
          var o = LAYER.items[b.id + "|" + it[0]];
          return o ? [it[0], o.t || it[1], o.s != null ? o.s : it[2]] : it;
        });
      });
    });
    // 新增章
    LAYER.chAdded.forEach(function (a) {
      var b = bookById(a.book);
      if (!b) return;
      if (LAYER.chRemoved[a.book + ":" + a.no]) return;
      if (b.chapters.some(function (c) { return c.n === a.no; })) return;
      b.chapters.push({ n: a.no, t: a.title || ("第 " + a.no + " 章"), i: [] });
      b.chapters.sort(function (x, y) { return x.n - y.n; });
    });

    LAYER.added.forEach(function (a) {
      if (LAYER.removed[a.book + "|" + a.id]) return;
      var b = bookById(a.book);
      if (!b) return;
      var ch = null;
      for (var i = 0; i < b.chapters.length; i++) if (b.chapters[i].n === a.ch) ch = b.chapters[i];
      if (!ch) {
        ch = { n: a.ch, t: a.chTitle || ("第 " + a.ch + " 章"), i: [] };
        b.chapters.push(ch);
        b.chapters.sort(function (x, y) { return x.n - y.n; });
      }
      if (!ch.i.some(function (x) { return x[0] === a.id; })) ch.i.push([a.id, a.t, a.s]);
    });
  }

  function applyLayerToBook(id) {
    var arr = S.books[id];
    if (!arr) return arr;
    if (!S["raw_" + id]) S["raw_" + id] = arr.map(function (x) { return x; });
    var base = S["raw_" + id];
    var out = base.filter(function (it) {
      if (LAYER.removed[id + "|" + it.id]) return false;
      var cno = parseInt(String(it.c || "").split(".")[0], 10);
      if (cno && LAYER.chRemoved[id + ":" + cno]) return false;
      return true;
    }).map(function (it) {
      var o = LAYER.items[id + "|" + it.id];
      if (!o) return it;
      return {
        id: it.id,
        t: o.t || it.t,
        s: o.s != null ? o.s : it.s,
        c: it.c,
        x: o.x != null ? o.x : it.x
      };
    });
    LAYER.added.forEach(function (a) {
      if (a.book !== id) return;
      if (LAYER.removed[id + "|" + a.id]) return;
      if (out.some(function (x) { return x.id === a.id; })) return;
      out.push({ id: a.id, t: a.t, s: a.s, c: a.chTitle || ("第 " + a.ch + " 章"), x: a.x || "" });
    });
    S.books[id] = out;
    return out;
  }

  var BOOK_OF = {
    "生化": "01", "细胞": "02", "遗传": "03", "分子": "04", "动物": "05", "植物": "06",
    "微生物": "07", "动物生理": "08", "植物生理": "09", "行为": "10", "生态": "11",
    "系统": "12", "进化": "13", "信息": "14", "技术": "15", "补充": "16"
  };

  /* ---------- 工具 ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function hl(text, q) {
    var safe = esc(text);
    if (!q) return safe;
    try {
      return safe.replace(new RegExp("(" + escRe(esc(q)) + ")", "gi"), "<mark>$1</mark>");
    } catch (e) { return safe; }
  }
  function starStr(n) { return n >= 3 ? "★★★" : n === 2 ? "★★" : "★"; }
  function isEditing() {
    return !!(document.body && document.body.classList.contains("editing"));
  }
  function bookById(id) {
    for (var i = 0; i < S.idx.length; i++) if (S.idx[i].id === id) return S.idx[i];
    return null;
  }
  function flatCount(b) {
    var n = 0;
    for (var i = 0; i < b.chapters.length; i++) n += b.chapters[i].i.length;
    return n;
  }
  var GROUP_SIZE = 6;
  function groupOf(id) { return Math.ceil(parseInt(id, 10) / GROUP_SIZE); }

  function loadBook(id, cb) {
    if (S.books[id]) return cb(null, S.books[id]);
    var g = groupOf(id);
    var s = document.createElement("script");
    s.src = "books-" + g + ".js";
    s.onload = function () {
      var all = window.KG_BOOK || {};
      for (var k in all) {
        if (!Object.prototype.hasOwnProperty.call(all, k)) continue;
        if (groupOf(k) !== g) continue;
        if (S.books[k]) continue;
        S.books[k] = all[k];
        applyLayerToBook(k);
      }
      cb(null, S.books[id] || []);
    };
    s.onerror = function () { cb(new Error("加载失败：" + id)); };
    document.head.appendChild(s);
  }

  /* ---------- 标签页 ---------- */
  function bindTabs() {
    var btns = document.querySelectorAll("#tabs button");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () {
        var t = this.getAttribute("data-tab");
        for (var j = 0; j < btns.length; j++) btns[j].classList.toggle("on", btns[j] === this);
        ["tree", "terms", "cards", "hot"].forEach(function (k) {
          $("pane-" + k).classList.toggle("on", k === t);
        });
        if (t === "cards") renderCard();
        if (t === "hot") renderHot();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
    var n1 = $("cntTree"), n2 = $("cntTerm");
    if (n1) n1.textContent = S.idx.reduce(function (a, b) { return a + flatCount(b); }, 0);
    if (n2) n2.textContent = S.terms.length;
  }

  /* ---------- 目录树 ---------- */
  function renderTree() {
    var out = $("treeOut");
    if (!out) return;
    var html = '<div class="tree">';
    for (var i = 0; i < S.idx.length; i++) {
      var b = S.idx[i];
      var open = !!S.openBooks[b.id];
      html += '<div class="tree-book' + (open ? " open" : "") + '" data-book="' + b.id + '">';
      html += '<div class="tb-head"><span class="tb-no">' + b.id + '</span>' +
        '<span class="tb-name">' + esc(b.name) + '</span>' +
        '<span class="tb-cnt">' + flatCount(b) + '</span>' +
        '<span class="tb-chev">▶</span></div>';
      html += '<div class="tb-body">';
      if (open) html += chaptersHtml(b);
      html += "</div></div>";
    }
    html += "</div>";
    out.innerHTML = html;
    bindTree();
  }

  function chaptersHtml(b) {
    var h = "";
    for (var c = 0; c < b.chapters.length; c++) {
      var ch = b.chapters[c];
      var items = ch.i.filter(function (x) { return x[2] >= S.star; });
      if (!items.length && !isEditing()) continue;
      var key = b.id + ":" + ch.n;
      var open = !!S.openChaps[key];
      h += '<div class="tree-chap' + (open ? " open" : "") + '" data-key="' + key + '">';
      h += '<div class="tc-head"><span class="cn">' + ch.n + '</span>' +
        '<span class="ct">' + esc(ch.t) + '</span>' +
        '<span class="cc">' + items.length + '</span>' +
        (isEditing() ? '<span class="ch-del" data-delch="' + b.id + ":" + ch.n + '">✕</span>' : '') +
        '<span class="chev">▶</span></div>';
      h += '<div class="tc-body">';
      if (open) {
        for (var k = 0; k < items.length; k++) {
          h += '<div class="ti-row" data-book="' + b.id + '" data-id="' + items[k][0] + '">' +
            '<span class="tid">' + items[k][0] + '</span>' +
            '<span class="tt">' + esc(items[k][1]) + '</span>' +
            '<span class="ts">' + starStr(items[k][2]) + "</span></div>";
        }
      }
      h += "</div></div>";
    }
    if (isEditing()) {
      h += '<div class="ch-add" data-addch="' + b.id + '">＋ 新增章</div>';
    }
    return h || (isEditing()
      ? '<div class="ch-add" data-addch="' + b.id + '">＋ 新增章</div>'
      : '<div style="padding:14px 30px;font-size:13px;color:var(--text-faint)">该星级别下暂无条目</div>');
  }

  function bindTree() {
    var out = $("treeOut");
    out.querySelectorAll(".tb-head").forEach(function (el) {
      el.addEventListener("click", function () {
        var box = this.parentElement;
        var id = box.getAttribute("data-book");
        var willOpen = !box.classList.contains("open");
        box.classList.toggle("open", willOpen);
        S.openBooks[id] = willOpen;
        var body = box.querySelector(".tb-body");
        if (willOpen && !body.getAttribute("data-done")) {
          body.innerHTML = chaptersHtml(bookById(id));
          body.setAttribute("data-done", "1");
          bindChap(box);
          bindItems(box);
        }
      });
    });
    document.querySelectorAll("#treeOut .tree-book.open .tb-body").forEach(function (body) {
      if (!body.getAttribute("data-done")) {
        var id = body.parentElement.getAttribute("data-book");
        body.innerHTML = chaptersHtml(bookById(id));
        body.setAttribute("data-done", "1");
        bindChap(body);
        bindItems(body);
      }
    });
  }

  function bindChap(root) {
    root.querySelectorAll(".tc-head").forEach(function (el) {
      el.addEventListener("click", function (e) {
        e.stopPropagation();
        if (e.target.closest && e.target.closest(".ch-del")) return;
        var box = this.parentElement;
        var key = box.getAttribute("data-key");
        var willOpen = !box.classList.contains("open");
        box.classList.toggle("open", willOpen);
        S.openChaps[key] = willOpen;
        var bd = box.querySelector(".tc-body");
        if (willOpen && !bd.getAttribute("data-done")) {
          var book = bookById(key.split(":")[0]);
          var no = parseInt(key.split(":")[1], 10);
          var ch = null;
          for (var i = 0; i < book.chapters.length; i++)
            if (book.chapters[i].n === no) ch = book.chapters[i];
          if (ch) {
            var h = "";
            ch.i.filter(function (x) { return x[2] >= S.star; }).forEach(function (x) {
              h += '<div class="ti-row" data-book="' + book.id + '" data-id="' + x[0] + '">' +
                '<span class="tid">' + x[0] + '</span><span class="tt">' + esc(x[1]) +
                '</span><span class="ts">' + starStr(x[2]) + "</span></div>";
            });
            bd.innerHTML = h;
            bd.setAttribute("data-done", "1");
            bindItems(bd);
          }
        }
      });
    });
  }

  function bindItems(root) {
    root.querySelectorAll(".ti-row").forEach(function (el) {
      el.addEventListener("click", function () {
        openSheet(this.getAttribute("data-book"), this.getAttribute("data-id"));
      });
    });
  }

  /* ---------- 章节节点增删（委托给编辑面板） ---------- */
  function bindChapterActions() {
    document.addEventListener("click", function (e) {
      if (!isEditing()) return;
      var del = e.target.closest ? e.target.closest("[data-delch]") : null;
      if (del) {
        e.preventDefault(); e.stopPropagation();
        var p = del.getAttribute("data-delch").split(":");
        if (window.EDIT_DEL_CHAPTER) window.EDIT_DEL_CHAPTER(p[0], parseInt(p[1], 10));
        return;
      }
      var add = e.target.closest ? e.target.closest("[data-addch]") : null;
      if (add) {
        e.preventDefault(); e.stopPropagation();
        if (window.EDIT_ADD_CHAPTER) window.EDIT_ADD_CHAPTER(add.getAttribute("data-addch"));
        return;
      }
    });
  }

  /* ---------- 阅读面板 ---------- */
  function openSheet(bookId, itemId) {
    var sheet = $("sheet");
    if (!sheet) return;
    sheet.classList.add("on");
    document.body.style.overflow = "hidden";
    $("sheetTitle").textContent = "载入中…";
    $("sheetMeta").textContent = "";
    $("sheetMain").innerHTML = '<p style="color:var(--text-faint)">正在加载该册内容…</p>';
    loadBook(bookId, function (err, arr) {
      if (err) { $("sheetMain").innerHTML = '<p>加载失败，请刷新重试。</p>'; return; }
      var pos = -1;
      for (var i = 0; i < arr.length; i++) if (arr[i].id === itemId) { pos = i; break; }
      if (pos < 0) { $("sheetMain").innerHTML = "<p>未找到该条目。</p>"; return; }
      S.sheetBook = bookId;
      S.pos2 = pos;
      paintSheet(arr, pos);
    });
  }

  function paintSheet(arr, pos) {
    var it = arr[pos];
    var b = bookById(S.sheetBook);
    $("sheetTitle").textContent = it.id + " " + it.t;
    var meta = (b ? b.name : "") + " · " + it.c + " · " + starStr(it.s);
    var ex = (window.KG_EXAM || {})[(S.sheetBook || "") + "|" + it.id];
    if (ex && ex.length) meta += " · 真题命中 " + ex.join(" / ");
    $("sheetMeta").textContent = meta;
    var txt = it.x || "（本条暂无正文）";
    var paras = txt.split(/\n+/).filter(Boolean);
    $("sheetMain").innerHTML = paras.map(function (p) { return "<p>" + esc(p) + "</p>"; }).join("");
    $("sheetMain").scrollTop = 0;
    S.curArr = arr;
    S.curId = it.id;
    var prev = $("sheetPrev"), next = $("sheetNext");
    if (prev) prev.disabled = pos <= 0;
    if (next) next.disabled = pos >= arr.length - 1;
    if (typeof window.EDIT_ON_SHEET === "function") {
      try { window.EDIT_ON_SHEET(S.sheetBook, it); } catch (e) {}
    }
  }

  function bindSheet() {
    var sheet = $("sheet");
    if (!sheet) return;
    var close = function () {
      sheet.classList.remove("on");
      document.body.style.overflow = "";
    };
    sheet.querySelector(".sheet-mask").addEventListener("click", close);
    $("sheetClose").addEventListener("click", close);
    $("sheetPrev").addEventListener("click", function () {
      if (S.curArr && S.pos2 > 0) { S.pos2--; paintSheet(S.curArr, S.pos2); }
    });
    $("sheetNext").addEventListener("click", function () {
      if (S.curArr && S.pos2 < S.curArr.length - 1) { S.pos2++; paintSheet(S.curArr, S.pos2); }
    });
  }

  /* ---------- 总纲搜索 ---------- */
  function searchTree(q) {
    var out = $("treeSearchOut");
    var box = $("treeOut");
    if (!out || !box) return;
    q = q.trim();
    if (!q) {
      out.innerHTML = "";
      out.style.display = "none";
      box.style.display = "";
      return;
    }
    var res = [];
    for (var i = 0; i < S.idx.length; i++) {
      var b = S.idx[i];
      for (var c = 0; c < b.chapters.length; c++) {
        var ch = b.chapters[c];
        var chHit = ch.t.indexOf(q) >= 0;
        for (var k = 0; k < ch.i.length; k++) {
          var it = ch.i[k];
          if (it[1].indexOf(q) >= 0 || chHit) {
            res.push({ b: b, ch: ch, it: it });
            if (res.length > 120) break;
          }
        }
        if (res.length > 120) break;
      }
      if (res.length > 120) break;
    }
    var h = '<div class="res-head"><span>找到 <b class="hl">' + res.length + "</b> 条" +
      (res.length > 120 ? "（仅显示前 120 条）" : "") + "</span>" +
      '<span id="deepWrap"></span></div><div class="res-list">';
    for (var r = 0; r < res.length; r++) {
      var x = res[r];
      h += '<div class="res-row" data-book="' + x.b.id + '" data-id="' + x.it[0] + '">' +
        '<div class="res-path">' + esc(x.b.name) + " · " + esc(x.ch.t) + " · " + starStr(x.it[2]) + "</div>" +
        '<div class="res-title">' + x.it[0] + " " + hl(x.it[1], q) + "</div></div>";
    }
    if (!res.length) h += '<div class="fc-empty">没有匹配的知识点标题。<br>可以点下面按钮搜索正文全文。</div>';
    h += "</div>";
    out.innerHTML = h;
    out.style.display = "";
    box.style.display = "none";
    out.querySelectorAll(".res-row").forEach(function (el) {
      el.addEventListener("click", function () {
        openSheet(this.getAttribute("data-book"), this.getAttribute("data-id"));
      });
    });
    // 深度搜索按钮
    var dw = $("deepWrap");
    if (dw) {
      var btn = document.createElement("button");
      btn.className = "chip";
      btn.textContent = S.deepReady ? "在正文中搜索" : "在正文中搜索（首次需载入约 3MB）";
      btn.addEventListener("click", function () { deepSearch(q, btn); });
      dw.appendChild(btn);
    }
  }

  function deepSearch(q, btn) {
    if (S.deepBusy) return;
    var go = function () {
      var res = [];
      S.idx.forEach(function (b) {
        var arr = S.books[b.id] || [];
        arr.forEach(function (it) {
          var p = it.x.indexOf(q);
          if (p >= 0) {
            res.push({ b: b, it: it, snip: it.x.slice(Math.max(0, p - 30), p + 60) });
          }
        });
      });
      var out = $("treeSearchOut");
      var h = '<div class="res-head"><span>正文命中 <b class="hl">' + res.length + "</b> 条" +
        (res.length > 100 ? "（仅显示前 100 条）" : "") + "</span></div><div class=\"res-list\">";
      res.slice(0, 100).forEach(function (x) {
        h += '<div class="res-row" data-book="' + x.b.id + '" data-id="' + x.it.id + '">' +
          '<div class="res-path">' + esc(x.b.name) + " · " + esc(x.it.c) + "</div>" +
          '<div class="res-title">' + x.it.id + " " + hl(x.it.t, q) + "</div>" +
          '<div class="res-snip">…' + hl(x.snip, q) + "…</div></div>";
      });
      h += "</div>";
      out.innerHTML = h;
      out.querySelectorAll(".res-row").forEach(function (el) {
        el.addEventListener("click", function () {
          openSheet(this.getAttribute("data-book"), this.getAttribute("data-id"));
        });
      });
    };
    if (S.deepReady) return go();

    S.deepBusy = true;
    var ids = S.idx.map(function (b) { return b.id; });
    var done = 0;
    btn.textContent = "载入中 0 / " + ids.length;
    var step = function () {
      if (done >= ids.length) {
        S.deepBusy = false;
        S.deepReady = true;
        go();
        return;
      }
      loadBook(ids[done], function () {
        done++;
        btn.textContent = "载入中 " + done + " / " + ids.length;
        step();
      });
    };
    step();
  }

  /* ---------- 术语表 ---------- */
  function termView(t) {
    var o = LAYER.terms[t._i];
    if (!o) return t;
    return { t: o.t || t.t, e: o.e != null ? o.e : t.e, d: o.d != null ? o.d : t.d,
             s: t.s, c: t.c, _i: t._i };
  }

  function renderTerms() {
    var q = ($("qTerm").value || "").trim();
    var list = S.terms.map(termView);
    if (S.termBook) list = list.filter(function (t) { return t.s === S.termBook; });
    if (q) {
      var lq = q.toLowerCase();
      list = list.filter(function (t) {
        return t.t.toLowerCase().indexOf(lq) >= 0 || (t.e && t.e.toLowerCase().indexOf(lq) >= 0) ||
          (t.d && t.d.indexOf(q) >= 0);
      });
    }
    var out = $("termOut");
    var shown = list.slice(0, S.termLimit);
    var h = '<div class="res-head"><span>共 <b class="hl">' + list.length + "</b> 条</span>" +
      (list.length > shown.length ? "<span>显示前 " + shown.length + " 条</span>" : "") + "</div>";
    h += '<div class="term-list">';
    shown.forEach(function (t) {
      h += '<div class="term"><div class="term-top"><span class="term-cn">' + hl(t.t, q) + "</span>" +
        (t.e ? '<span class="term-en">' + hl(t.e, q) + "</span>" : "") + "</div>" +
        '<div class="term-desc">' + hl(t.d || "", q) + "</div>" +
        '<span class="term-src" data-book="' + (BOOK_OF[t.s] || "") + '" data-ch="' + t.c + '">' +
        esc(t.s) + " · 第 " + t.c + " 章 →</span>" +
        '<span class="term-src term-edit" style="margin-left:6px;cursor:pointer" data-ti="' + t._i + '">编辑</span></div>';
    });
    h += "</div>";
    if (list.length > shown.length) {
      h += '<button class="more-btn" id="termMore">再加载 ' +
        Math.min(50, list.length - shown.length) + " 条</button>";
    }
    if (!list.length) h += '<div class="fc-empty">没有匹配的术语，换个关键词试试。</div>';
    out.innerHTML = h;

    var more = $("termMore");
    if (more) more.addEventListener("click", function () { S.termLimit += 50; renderTerms(); });

    out.querySelectorAll(".term-src").forEach(function (el) {
      el.addEventListener("click", function () {
        var bid = this.getAttribute("data-book");
        var ch = parseInt(this.getAttribute("data-ch"), 10);
        if (!bid) return;
        var b = bookById(bid);
        if (!b) return;
        var target = null;
        for (var i = 0; i < b.chapters.length; i++) {
          if (b.chapters[i].n === ch) { target = b.chapters[i]; break; }
        }
        if (!target) { alert("该章未收录，可能在补充卷中。"); return; }
        S.openBooks[bid] = true;
        S.openChaps[bid + ":" + ch] = true;
        S.star = 0;
        document.querySelectorAll("#starChips .chip").forEach(function (c) { c.classList.remove("on"); });
        document.querySelector('#starChips .chip[data-star="0"]').classList.add("on");
        $("qTree").value = "";
        searchTree("");
        renderTree();
        var node = document.querySelector('#treeOut [data-key="' + bid + ":" + ch + '"]');
        if (node) {
          var el2 = node.closest(".tree-book");
          if (el2) el2.classList.add("open");
          setTimeout(function () {
            if (node.scrollIntoView) node.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 60);
        }
        document.querySelector('#tabs button[data-tab="tree"]').click();
      });
    });
  }

  /* ---------- 闪卡 ---------- */
  function buildPool() {
    if (S.cardMode === "term") {
      S.pool = S.terms.map(termView);
    } else {
      var bid = S.cardBook;
      if (!bid || !S.books[bid]) { S.pool = []; return; }
      S.pool = S.books[bid].map(function (it) {
        return { t: it.id + " " + it.t, e: it.c, d: it.x, k: bid + ":" + it.id };
      });
    }
    S.pool = S.pool.filter(function (x) { return !S.known[(x.k || x.t)]; });
    // 洗牌
    for (var i = S.pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = S.pool[i]; S.pool[i] = S.pool[j]; S.pool[j] = t;
    }
    S.pos = 0;
    S.flipped = false;
  }

  /* ---------- 挖空 ---------- */
  var CN = /[\u4e00-\u9fa5]/;
  var VOCAB = null;

  function buildVocab() {
    if (VOCAB) return VOCAB;
    var set = {};
    var push = function (w) {
      if (w.length >= 3 && w.length <= 8 && CN.test(w)) set[w] = 1;
    };
    for (var i = 0; i < S.terms.length; i++) push(S.terms[i].t);
    var splitPush = function (txt) {
      var parts = txt.split(/[^\u4e00-\u9fa5]+/);
      for (var k = 0; k < parts.length; k++) push(parts[k]);
    };
    for (var b = 0; b < S.idx.length; b++) {
      var bk = S.idx[b];
      for (var c = 0; c < bk.chapters.length; c++) {
        splitPush(bk.chapters[c].t);
        for (var m = 0; m < bk.chapters[c].i.length; m++) splitPush(bk.chapters[c].i[m][1]);
      }
    }
    VOCAB = Object.keys(set);
    return VOCAB;
  }

  function makeCloze(text) {
    if (!text) return { body: "", answers: [], ok: false };
    var vocab = buildVocab();
    var cand = [];
    for (var i = 0; i < vocab.length; i++) {
      var w = vocab[i];
      if (text.indexOf(w) >= 0) cand.push(w);
    }
    cand.sort(function (a, b) { return b.length - a.length; });

    var picked = [];
    var body = text;
    for (var k = 0; k < cand.length && picked.length < 3; k++) {
      var w2 = cand[k];
      if (body.indexOf(w2) < 0) continue;
      var overlap = false;
      for (var m = 0; m < picked.length; m++) {
        if (picked[m].indexOf(w2) >= 0 || w2.indexOf(picked[m]) >= 0) overlap = true;
      }
      if (overlap || body.indexOf("＿＿＿") >= 0 && w2.length < 4 && picked.length >= 1) {
        if (overlap) continue;
      }
      body = body.split(w2).join("＿＿＿");
      picked.push(w2);
    }
    if (!picked.length) return { body: text, answers: [], ok: false };

    // 只截取第一个空附近的上下文，避免正面过长
    var pos = body.indexOf("＿＿＿");
    var start = Math.max(0, pos - 90);
    var end = Math.min(body.length, pos + 150);
    var snippet = body.slice(start, end);
    if (start > 0) snippet = "…" + snippet;
    if (end < body.length) snippet = snippet + "…";
    return { body: snippet, answers: picked, ok: true };
  }

  /* ---------- 重点榜 ---------- */
  function renderHot() {
    var out = $("hotOut");
    if (!out) return;
    var html = "";
    // 每册三星占比
    html += '<div class="res-head"><span>按总纲自带星级统计 · <b class="hl">★★★</b> 为联赛与省选高频</span></div>';
    html += '<div class="term-list">';
    for (var i = 0; i < S.idx.length; i++) {
      var b = S.idx[i];
      var all = 0, s3 = 0;
      for (var c = 0; c < b.chapters.length; c++) {
        for (var k = 0; k < b.chapters[c].i.length; k++) {
          all++;
          if (b.chapters[c].i[k][2] === 3) s3++;
        }
      }
      var pct = all ? Math.round((s3 / all) * 100) : 0;
      html += '<div class="term" style="cursor:pointer" data-hot="' + b.id + '">' +
        '<div class="term-top"><span class="term-cn">' + b.id + " " + esc(b.name) + "</span>" +
        '<span class="term-en">' + s3 + " / " + all + " 条三星</span></div>" +
        '<div class="bar" style="margin-top:8px"><i style="width:' + pct + '%"></i></div></div>';
    }
    html += "</div>";

    // 三星条目清单
    var list = [];
    for (var i2 = 0; i2 < S.idx.length; i2++) {
      var b2 = S.idx[i2];
      if (S.hotBook && S.hotBook !== b2.id) continue;
      for (var c2 = 0; c2 < b2.chapters.length; c2++) {
        var ch = b2.chapters[c2];
        for (var k2 = 0; k2 < ch.i.length; k2++) {
          if (ch.i[k2][2] === 3) list.push({ b: b2, ch: ch, it: ch.i[k2] });
        }
      }
    }
    html += '<div class="res-head" style="margin-top:22px"><span>★★★ 条目 <b class="hl">' +
      list.length + "</b> 条" + (S.hotBook ? "（已筛选）" : "") + "</span>" +
      (S.hotBook ? '<span style="cursor:pointer;color:var(--mint)" id="hotClear">清除筛选</span>' : "") + "</div>";
    html += '<div class="res-list">';
    list.slice(0, 120).forEach(function (x) {
      html += '<div class="res-row" data-book="' + x.b.id + '" data-id="' + x.it[0] + '">' +
        '<div class="res-path">' + esc(x.b.name) + " · " + esc(x.ch.t) + "</div>" +
        '<div class="res-title">' + x.it[0] + " " + esc(x.it[1]) + "</div></div>";
    });
    html += "</div>";
    if (list.length > 120) {
      html += '<p class="faint" style="margin-top:10px">仅显示前 120 条，用上方板块聚合或搜索框继续缩小范围。</p>';
    }
    out.innerHTML = html;

    out.querySelectorAll("[data-hot]").forEach(function (el) {
      el.addEventListener("click", function () {
        S.hotBook = this.getAttribute("data-hot");
        renderHot();
        window.scrollTo({ top: 300, behavior: "smooth" });
      });
    });
    var hc = $("hotClear");
    if (hc) hc.addEventListener("click", function () { S.hotBook = ""; renderHot(); });
    out.querySelectorAll(".res-row").forEach(function (el) {
      el.addEventListener("click", function () {
        openSheet(this.getAttribute("data-book"), this.getAttribute("data-id"));
      });
    });
  }

  function renderCard() {
    var stage = $("fcStage");
    if (!stage) return;
    if (!S.pool.length && !S.poolBuilt) { buildPool(); S.poolBuilt = true; }
    var total = S.pool.length;
    if (!total) {
      stage.innerHTML = '<div class="fc-empty">这一组已经全部标记为「会了」。<br>' +
        '换一组，或点下面的按钮重置进度。</div>' +
        '<button class="btn" id="fcReset">重置进度</button>';
      var rb = $("fcReset");
      if (rb) rb.addEventListener("click", function () {
        S.known = {}; saveKnown(); S.poolBuilt = false; S.pool = []; renderCard();
      });
      return;
    }
    if (S.pos >= total) S.pos = 0;
    var c = S.pool[S.pos];
    var front = c.t;
    var backEn = c.e || "";
    var backD = c.d || "";
    var clozeAns = [];
    var isCloze = S.cardMode === "point" && S.cloze;
    if (isCloze) {
      var cz = makeCloze(c.d || "");
      if (cz.ok) {
        front = cz.body;
        clozeAns = cz.answers;
      } else {
        isCloze = false;
      }
    }
    stage.innerHTML =
      '<div class="fc-card' + (S.flipped ? " flipped" : "") + '" id="fcCard">' +
      '<span class="fc-tag">' + (S.cardMode === "term" ? "术语" : "知识点") + "　" + (S.pos + 1) + " / " + total + "</span>" +
      '<div class="fc-front' + (isCloze ? " long" : "") + '">' + esc(front) + "</div>" +
      '<div class="fc-back">' +
      (backEn ? '<div class="fc-en">' + esc(backEn) + "</div>" : "") +
      (clozeAns.length ? '<div class="fc-en" style="color:var(--amber)">挖空答案：' + esc(clozeAns.join(" / ")) + "</div>" : "") +
      '<div class="fc-desc">' + esc(backD) + "</div></div>" +
      '<span class="fc-hint">' + (S.flipped ? "" : (isCloze ? "补出 ＿＿＿ 处的术语，再点卡片核对" : "点击卡片翻面")) + "</span></div>" +
      '<div class="fc-actions">' +
      '<button class="btn btn-sm" id="fcNo">再练一次</button>' +
      '<button class="btn btn-primary btn-sm" id="fcYes">记住了</button></div>' +
      '<div class="fc-stat">已掌握 ' + Object.keys(S.known).length + " 张 · 本组剩余 " + total + " 张</div>";

    $("fcCard").addEventListener("click", function () {
      S.flipped = !S.flipped;
      this.classList.toggle("flipped", S.flipped);
      var hint = this.querySelector(".fc-hint");
      if (hint) hint.textContent = S.flipped ? "" : "点击卡片翻面";
    });
    $("fcYes").addEventListener("click", function (e) {
      e.stopPropagation();
      S.known[(c.k || c.t)] = 1;
      saveKnown();
      S.pool.splice(S.pos, 1);
      S.flipped = false;
      renderCard();
    });
    $("fcNo").addEventListener("click", function (e) {
      e.stopPropagation();
      S.pos = (S.pos + 1) % S.pool.length;
      S.flipped = false;
      renderCard();
    });
  }

  var MEMK = {};
  function saveKnown() {
    var v = JSON.stringify(S.known);
    try { localStorage.setItem("biolab.known.v1", v); } catch (e) { MEMK.k = v; }
    if (!MEMK.k) MEMK.k = v;
  }
  function readKnown() {
    var v = null;
    try { v = localStorage.getItem("biolab.known.v1"); } catch (e) {}
    return v || MEMK.k || "{}";
  }

  function bindCardControls() {
    var cz = $("fcCloze");
    if (cz) {
      cz.addEventListener("click", function () {
        S.cloze = !S.cloze;
        this.classList.toggle("on", S.cloze);
        if (S.cardMode !== "point") {
          document.querySelector('#cardMode .chip[data-mode="point"]').click();
        } else {
          S.poolBuilt = false; S.pool = [];
          renderCard();
        }
      });
    }
    document.querySelectorAll("#cardMode .chip").forEach(function (c) {
      c.addEventListener("click", function () {
        document.querySelectorAll("#cardMode .chip").forEach(function (x) { x.classList.remove("on"); });
        this.classList.add("on");
        S.cardMode = this.getAttribute("data-mode");
        S.poolBuilt = false; S.pool = [];
        var sel = $("cardBookSel");
        if (sel) sel.style.display = S.cardMode === "point" ? "" : "none";
        if (S.cardMode === "point" && !S.cardBook && S.idx.length) {
          S.cardBook = S.idx[0].id;
          if (sel) sel.value = S.cardBook;
          loadBook(S.cardBook, function () { renderCard(); });
        } else {
          renderCard();
        }
      });
    });
    var sel = $("cardBookSel");
    if (sel) {
      sel.innerHTML = "";
      S.idx.forEach(function (b) {
        var o = document.createElement("option");
        o.value = b.id;
        o.textContent = b.id + " " + b.name;
        sel.appendChild(o);
      });
      sel.addEventListener("change", function () {
        S.cardBook = this.value;
        loadBook(S.cardBook, function () {
          S.poolBuilt = false; S.pool = [];
          renderCard();
        });
      });
    }
  }

  window.KG_RELOAD_SHEET = function () {
    if (!S.curArr || !S.sheetBook) return;
    var arr = S.books[S.sheetBook] || [];
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].id === S.curId) { S.pos2 = i; paintSheet(arr, i); return; }
    }
  };

  /* ---------- 对外接口（供编辑面板调用） ---------- */
  window.KGAPI = {
    layer: function () { return LAYER; },
    save: function () { saveLayer(); },
    termView: termView,
    refreshAll: function () {
      applyLayer();
      renderTree();
      renderTerms();
      if (document.getElementById("pane-cards").classList.contains("on")) {
        S.poolBuilt = false; S.pool = [];
        renderCard();
      }
    },
    editItem: function (book, id, data) {
      LAYER.items[book + "|" + id] = data;
      saveLayer(); applyLayer(); applyLayerToBook(book); this.refreshAll();
    },
    addItem: function (a) {
      LAYER.added.push(a);
      saveLayer(); applyLayer(); applyLayerToBook(a.book); this.refreshAll();
    },
    removeItem: function (book, id) {
      var before = LAYER.added.length;
      LAYER.added = LAYER.added.filter(function (a) {
        return !(a.book === book && a.id === id);
      });
      if (LAYER.added.length === before) LAYER.removed[book + "|" + id] = 1;
      delete LAYER.items[book + "|" + id];
      saveLayer(); applyLayer(); applyLayerToBook(book); this.refreshAll();
    },
    restoreAll: function () {
      LAYER = { items: {}, added: [], removed: {}, terms: {}, texts: {},
                chapters: {}, chAdded: [], chRemoved: {} };
      saveLayer();
      S.idxRaw = null;
      Object.keys(S).forEach(function (k) {
        if (k.indexOf("raw_") === 0) delete S[k];
        if (k.indexOf("book") === 0) { /* keep */ }
      });
      location.reload();
    },
    addChapter: function (book, no, title) {
      LAYER.chAdded.push({ book: book, no: no, title: title });
      saveLayer(); applyLayer(); this.refreshAll();
    },
    renameChapter: function (book, no, title) {
      LAYER.chapters[book + ":" + no] = { t: title };
      saveLayer(); applyLayer(); this.refreshAll();
    },
    removeChapter: function (book, no) {
      var before = LAYER.chAdded.length;
      LAYER.chAdded = LAYER.chAdded.filter(function (a) {
        return !(a.book === book && a.no === no);
      });
      if (LAYER.chAdded.length === before) LAYER.chRemoved[book + ":" + no] = 1;
      saveLayer(); applyLayer(); applyLayerToBook(book); this.refreshAll();
    },
    editTerm: function (i, data) {
      LAYER.terms[i] = data;
      saveLayer(); renderTerms();
    },
    stats: function () {
      return {
        items: Object.keys(LAYER.items).length,
        added: LAYER.added.length,
        removed: Object.keys(LAYER.removed).length,
        terms: Object.keys(LAYER.terms).length,
        ch: LAYER.chAdded.length + Object.keys(LAYER.chRemoved).length
      };
    },
    exportJSON: function () { return JSON.stringify(LAYER, null, 2); },
    importJSON: function (obj) {
      LAYER.items = obj.items || {};
      LAYER.added = obj.added || [];
      LAYER.removed = obj.removed || {};
      LAYER.terms = obj.terms || {};
      LAYER.texts = obj.texts || {};
      LAYER.chapters = obj.chapters || {};
      LAYER.chAdded = obj.chAdded || [];
      LAYER.chRemoved = obj.chRemoved || {};
      saveLayer(); applyLayer(); this.refreshAll();
    }
  };

  /* ---------- 初始化 ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    try { S.known = JSON.parse(readKnown()); } catch (e) { S.known = {}; }
    if (window.__SINGLE__ && window.KG_BOOK) {
      S.books = {};
      for (var bk in window.KG_BOOK) {
        if (!Object.prototype.hasOwnProperty.call(window.KG_BOOK, bk)) continue;
        S.books[bk] = window.KG_BOOK[bk].map(function (x) { return x; });
        applyLayerToBook(bk);
      }
    }
    for (var ti = 0; ti < S.terms.length; ti++) S.terms[ti]._i = ti;
    loadLayer();
    applyLayer();
    bindTabs();
    bindSheet();
    bindChapterActions();
    bindCardControls();
    renderTree();

    var qt = $("qTree");
    var timer = null;
    if (qt) qt.addEventListener("input", function () {
      clearTimeout(timer);
      var v = this.value;
      timer = setTimeout(function () { searchTree(v); }, 180);
    });

    document.querySelectorAll("#starChips .chip").forEach(function (c) {
      c.addEventListener("click", function () {
        document.querySelectorAll("#starChips .chip").forEach(function (x) { x.classList.remove("on"); });
        this.classList.add("on");
        S.star = parseInt(this.getAttribute("data-star"), 10);
        S.openChaps = {};
        renderTree();
      });
    });

    var qm = $("qTerm");
    var t2 = null;
    if (qm) qm.addEventListener("input", function () {
      clearTimeout(t2);
      t2 = setTimeout(function () { S.termLimit = 50; renderTerms(); }, 180);
    });
    document.querySelectorAll("#termChips .chip").forEach(function (c) {
      c.addEventListener("click", function () {
        document.querySelectorAll("#termChips .chip").forEach(function (x) { x.classList.remove("on"); });
        this.classList.add("on");
        S.termBook = this.getAttribute("data-book");
        S.termLimit = 50;
        renderTerms();
      });
    });
    renderTerms();

    // 支持从错题本等外部跳转带搜索词：knowledge.html?q=光呼吸
    try {
      var up = new URLSearchParams(location.search).get("q");
      if (up) {
        var qt2 = $("qTree");
        if (qt2) { qt2.value = up; searchTree(up); }
      }
    } catch (e) {}
  });
})();
