/* =========================================================
   资料库：本地文件 + 文件夹管理 + 云端同步
   存储：IndexedDB（files / folders）
   同步：window.BioCloud（由 account.js 提供，未登录时自动跳过）
   ========================================================= */
(function () {
  "use strict";

  var DB_NAME = "biolab-library";
  var DB_VER = 2;
  var U = window.BankUtil || {
    iconOf: function () { return "📄"; },
    niceSize: function (n) { return (n / 1024).toFixed(1) + " KB"; },
    niceTime: function (t) { return new Date(t).toLocaleString(); },
    enableDrop: function () {}
  };

  var dbp = null;
  var state = { folder: "", files: [], folders: [], memFiles: [], memFolders: [] };
  var useMem = false;

  /* ---------------- IndexedDB ---------------- */
  function openDB() {
    if (dbp) return dbp;
    dbp = new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error("no indexedDB"));
      var req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains("files")) {
          var st = db.createObjectStore("files", { keyPath: "id" });
          st.createIndex("folder", "folder", { unique: false });
        }
        if (!db.objectStoreNames.contains("folders")) {
          db.createObjectStore("folders", { keyPath: "name" });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbp;
  }

  function doTx(store, mode, fn) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(store, mode);
        var st = t.objectStore(store);
        var req = fn(st);
        var out;
        if (req) req.onsuccess = function () { out = req.result; };
        t.oncomplete = function () { resolve(out); };
        t.onerror = function () { reject(t.error); };
      });
    });
  }

  function dbAll(store) {
    return doTx(store, "readonly", function (st) { return st.getAll(); })
      .catch(function () {
        useMem = true;
        return store === "files" ? state.memFiles : state.memFolders;
      });
  }
  function dbPut(store, rec) {
    return doTx(store, "readwrite", function (st) { return st.put(rec); })
      .catch(function () {
        useMem = true;
        if (store === "files") {
          state.memFiles = state.memFiles.filter(function (x) { return x.id !== rec.id; });
          state.memFiles.push(rec);
        } else {
          state.memFolders = state.memFolders.filter(function (x) { return x.name !== rec.name; });
          state.memFolders.push(rec);
        }
      });
  }
  function dbDel(store, key) {
    return doTx(store, "readwrite", function (st) { return st.delete(key); })
      .catch(function () {
        useMem = true;
        if (store === "files") state.memFiles = state.memFiles.filter(function (x) { return x.id !== key; });
        else state.memFolders = state.memFolders.filter(function (x) { return x.name !== key; });
      });
  }

  function uid() { return "f" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function toast(msg) {
    var t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;left:50%;top:20%;transform:translateX(-50%);z-index:200;" +
      "background:rgba(10,22,19,.96);border:1px solid rgba(33,230,166,.4);color:#21e6a6;" +
      "padding:10px 18px;border-radius:11px;font-size:13.5px;max-width:80vw;text-align:center;" +
      "box-shadow:0 10px 30px rgba(0,0,0,.5)";
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1800);
  }

  /* ---------------- 渲染 ---------------- */
  function folderNames() {
    var set = {};
    state.folders.forEach(function (f) { if (f.name) set[f.name] = 1; });
    state.files.forEach(function (f) { if (f.folder) set[f.folder] = 1; });
    return Object.keys(set).sort();
  }

  function countOf(name) {
    if (!name) return state.files.filter(function (f) { return !f.folder; }).length;
    return state.files.filter(function (f) { return f.folder === name; }).length;
  }

  function renderFolders() {
    var bar = document.getElementById("bankFileFolders");
    if (!bar) return;
    var names = folderNames();

    var h = '<button class="bank-folder-chip' + (state.folder === "" ? " on" : "") +
      '" data-folder="">全部<span class="n">' + state.files.length + "</span></button>";

    names.forEach(function (n) {
      var custom = state.folders.some(function (f) { return f.name === n; });
      h += '<span class="bank-folder-chip' + (state.folder === n ? " on" : "") +
        '" data-folder="' + esc(n) + '">' + esc(n) +
        '<span class="n">' + countOf(n) + "</span>" +
        (custom ? '<i class="chip-x" data-delfolder="' + esc(n) + '">✕</i>' : "") +
        "</span>";
    });

    var loose = state.files.filter(function (f) { return !f.folder; }).length;
    if (loose && names.length) {
      h += '<button class="bank-folder-chip' + (state.folder === "__none" ? " on" : "") +
        '" data-folder="__none">未分类<span class="n">' + loose + "</span></button>";
    }

    h += '<button class="bank-folder-chip bank-folder-new" id="bankNewFolder">＋ 新建文件夹</button>';

    bar.innerHTML = h;

    bar.querySelectorAll("[data-folder]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        if (e.target.closest && e.target.closest("[data-delfolder]")) return;
        state.folder = this.getAttribute("data-folder");
        renderFiles();
        renderFolders();
      });
    });
    bar.querySelectorAll("[data-delfolder]").forEach(function (x) {
      x.addEventListener("click", function (e) {
        e.stopPropagation();
        removeFolder(this.getAttribute("data-delfolder"));
      });
    });
    var nf = document.getElementById("bankNewFolder");
    if (nf) nf.addEventListener("click", createFolder);
  }

  function visibleFiles() {
    if (state.folder === "__none") return state.files.filter(function (f) { return !f.folder; });
    if (!state.folder) return state.files.slice();
    return state.files.filter(function (f) { return f.folder === state.folder; });
  }

  function renderFiles() {
    var list = document.getElementById("bankFileList");
    var empty = document.getElementById("bankFileEmpty");
    if (!list) return;
    var show = visibleFiles().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });

    if (empty) {
      empty.style.display = show.length ? "none" : "";
      empty.textContent = state.folder
        ? "「" + (state.folder === "__none" ? "未分类" : state.folder) + "」里还没有文件。"
        : "还没有上传文件。支持 PDF / Word / Excel / PPT / 图片 / 文本 / 压缩包。";
    }
    if (!show.length) { list.innerHTML = ""; return; }

    var h = "";
    show.forEach(function (f) {
      var cloud = f.cloud ? '<span class="cloud-dot ok" title="已同步">☁</span>'
        : '<span class="cloud-dot" title="仅本机">☁</span>';
      h += '<div class="bank-file-item">' +
        '<div class="ic">' + U.iconOf(f.name) + "</div>" +
        '<div class="meta"><div class="nm">' + esc(f.name) + " " + cloud + "</div>" +
        '<div class="sub">' + esc(f.folder || "未分类") + " · " + U.niceSize(f.size) +
        " · " + U.niceTime(f.ts) + "</div></div>" +
        '<div class="act"><button data-dl="' + f.id + '">下载</button>' +
        '<button data-mv="' + f.id + '">移动</button>' +
        '<button class="del" data-rm="' + f.id + '">删除</button></div></div>';
    });
    list.innerHTML = h;
    bindFileActions(list);
  }

  function bindFileActions(list) {
    list.querySelectorAll("[data-dl]").forEach(function (b) {
      b.addEventListener("click", function () { download(this.getAttribute("data-dl")); });
    });
    list.querySelectorAll("[data-rm]").forEach(function (b) {
      b.addEventListener("click", function () { removeFile(this.getAttribute("data-rm")); });
    });
    list.querySelectorAll("[data-mv]").forEach(function (b) {
      b.addEventListener("click", function () { moveFile(this.getAttribute("data-mv")); });
    });
  }

  function render() {
    return Promise.all([dbAll("files"), dbAll("folders")]).then(function (r) {
      state.files = Array.isArray(r[0]) ? r[0] : [];
      state.folders = Array.isArray(r[1]) ? r[1] : [];
      renderFolders();
      renderFiles();
    });
  }

  /* ---------------- 文件夹 ---------------- */
  function createFolder() {
    var name = prompt("新文件夹名称：", "");
    if (name == null) return;
    name = name.trim();
    if (!name) return;
    if (folderNames().indexOf(name) >= 0) { toast("已经有这个文件夹了"); return; }
    dbPut("folders", { name: name, ts: Date.now() }).then(function () {
      state.folder = name;
      render();
      toast("已新建「" + name + "」");
    });
  }

  function removeFolder(name) {
    var n = countOf(name);
    var msg = "删除文件夹「" + name + "」？";
    if (n) msg += "\n\n里面有 " + n + " 个文件。点「确定」连文件一起删除，点「取消」只删除文件夹（文件移到未分类）。";
    var delFiles = n ? confirm(msg) : (confirm(msg), false);

    var jobs = [];
    if (delFiles) {
      state.files.filter(function (f) { return f.folder === name; }).forEach(function (f) {
        jobs.push(delOne(f));
      });
    } else {
      state.files.filter(function (f) { return f.folder === name; }).forEach(function (f) {
        f.folder = "";
        jobs.push(dbPut("files", f));
      });
    }
    jobs.push(dbDel("folders", name));
    Promise.all(jobs).then(function () {
      if (state.folder === name) state.folder = "";
      render();
      toast("已删除文件夹");
    });
  }

  /* ---------------- 文件 ---------------- */
  var ALLOW = ".pdf,.doc,.docx,.txt,.md,.rtf,.xls,.xlsx,.csv,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.zip,.rar,.7z,.epub";

  function addFiles(fileList) {
    var arr = Array.prototype.slice.call(fileList || []);
    if (!arr.length) return;
    var folder = state.folder === "__none" ? "" : state.folder;

    var jobs = arr.map(function (f) {
      var rec = {
        id: uid(),
        name: f.name,
        size: f.size,
        type: f.type || "",
        folder: folder,
        ts: Date.now(),
        blob: f,
        cloud: false
      };
      return dbPut("files", rec);
    });

    Promise.all(jobs).then(function () {
      return render();          // 先刷新 state.files，再谈同步
    }).then(function () {
      toast("已保存 " + arr.length + " 个文件" + (folder ? "到「" + folder + "」" : ""));
      if (window.BioCloud && window.BioCloud.ready()) syncUp();
    });
  }

  function syncUp() {
    if (!window.BioCloud || !window.BioCloud.ready()) return;
    var pending = state.files.filter(function (f) { return !f.cloud; });
    if (!pending.length) return;
    var chain = Promise.resolve();
    pending.forEach(function (f) {
      chain = chain.then(function () {
        return window.BioCloud.upload(f).then(function (path) {
          f.cloud = true;
          f.cloudPath = path;
          return dbPut("files", f);
        }).catch(function () {});
      });
    });
    chain.then(function () { render(); });
  }

  function download(id) {
    var f = state.files.filter(function (x) { return x.id === id; })[0];
    if (!f) return;
    var blob = f.blob instanceof Blob ? f.blob : new Blob([f.blob || ""]);
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = f.name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }

  function delOne(f) {
    var jobs = [dbDel("files", f.id)];
    if (f.cloud && f.cloudPath && window.BioCloud && window.BioCloud.ready()) {
      jobs.push(window.BioCloud.remove(f.cloudPath).catch(function () {}));
    }
    return Promise.all(jobs);
  }

  function removeFile(id) {
    var f = state.files.filter(function (x) { return x.id === id; })[0];
    if (!f) return;
    if (!confirm("删除「" + f.name + "」？\n本地和云端都会删除。")) return;
    delOne(f).then(function () {
      render();
      toast("已删除");
    });
  }

  function moveFile(id) {
    var f = state.files.filter(function (x) { return x.id === id; })[0];
    if (!f) return;
    var names = folderNames();
    var tips = "输入目标文件夹名：\n" + (names.length ? "已有：" + names.join(" / ") : "（还没有文件夹，输入新名字会新建）");
    var to = prompt(tips, f.folder || "");
    if (to == null) return;
    to = to.trim();
    var old = f.folder;
    f.folder = to;
    f.cloud = false;   // 路径变了，需要重新上传
    dbPut("files", f).then(function () {
      if (to && folderNames().indexOf(to) < 0) return dbPut("folders", { name: to, ts: Date.now() });
      return null;
    }).then(function () {
      render();
      toast("已移动到「" + (to || "未分类") + "」");
      if (window.BioCloud && window.BioCloud.ready() && f.cloudPath) {
        window.BioCloud.remove(f.cloudPath).catch(function () {}).then(function () { syncUp(); });
      } else {
        syncUp();
      }
    });
  }

  /* ---------------- 初始化 ---------------- */
  function init() {
    var btn = document.getElementById("bankUploadBtn");
    var input = document.getElementById("bankUploadInput");
    if (!btn || !input) return;

    input.setAttribute("accept", ALLOW);
    input.setAttribute("multiple", "multiple");

    btn.addEventListener("click", function () { input.click(); });
    input.addEventListener("change", function (e) {
      addFiles(e.target.files);
      e.target.value = "";
    });

    var panel = document.querySelector(".bank-doc-panel");
    if (panel) U.enableDrop(panel, addFiles);

    render();

    window.BankLibrary = {
      refresh: render,
      syncUp: syncUp,
      files: function () { return state.files; },
      folders: function () { return state.folders; },
      put: function (rec) { return dbPut("files", rec); }
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
