/* =========================================================
   账号与云同步（纯 fetch，不依赖任何 SDK）
   - 登录 / 注册 / 退出
   - 把本机的学习数据同步到 Supabase
   ========================================================= */
(function () {
  "use strict";

  var CFG = window.SUPABASE_CONFIG || {};
  var AKEY = "biolab.auth.v1";

  var SYNC_KEYS = [
    "biolab.edit.v1",
    "biolab.text.v1",
    "biolab.known.v1",
    "biolab.wrong.v1",
    "biolab.drill.v1",
    "biolab.customq.v1",
    "biolab.check.v1"
  ];

  var auth = null;
  var timer = null;
  var lastSnap = "";
  var busy = false;
  var MEM = {};

  function configured() { return !!(CFG.url && CFG.anonKey); }
  function base(p) { return String(CFG.url).replace(/\/+$/, "") + p; }

  function lsGet(k) {
    try { var v = localStorage.getItem(k); if (v !== null) return v; } catch (e) {}
    return MEM[k] || null;
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, v); } catch (e) {}
    MEM[k] = v;
  }
  function lsDel(k) {
    try { localStorage.removeItem(k); } catch (e) {}
    delete MEM[k];
  }

  function saveAuth(a) {
    auth = a;
    if (a) lsSet(AKEY, JSON.stringify(a));
    else lsDel(AKEY);
  }
  function loadAuth() {
    try { auth = JSON.parse(lsGet(AKEY) || "null"); } catch (e) { auth = null; }
    return auth;
  }

  function api(path, opt) {
    opt = opt || {};
    var headers = { "Content-Type": "application/json", apikey: CFG.anonKey };
    if (opt.token) headers.Authorization = "Bearer " + opt.token;
    else if (auth && auth.access_token) headers.Authorization = "Bearer " + auth.access_token;
    if (opt.headers) for (var k in opt.headers) headers[k] = opt.headers[k];

    return fetch(base(path), {
      method: opt.method || "GET",
      headers: headers,
      body: opt.body ? JSON.stringify(opt.body) : undefined
    }).then(function (r) {
      return r.text().then(function (t) {
        var data = null;
        try { data = t ? JSON.parse(t) : null; } catch (e) { data = t; }
        if (!r.ok) {
          var msg = (data && (data.msg || data.message || data.error_description || data.error)) || ("HTTP " + r.status);
          var err = new Error(msg);
          err.status = r.status;
          throw err;
        }
        return data;
      });
    });
  }

  function signUp(email, pwd) {
    return api("/auth/v1/signup", { method: "POST", body: { email: email, password: pwd } })
      .then(function (d) {
        if (d && d.access_token) {
          saveAuth({
            access_token: d.access_token,
            refresh_token: d.refresh_token,
            expires_at: Date.now() + (d.expires_in || 3600) * 1000,
            user: d.user
          });
          return { loggedIn: true, user: d.user };
        }
        return { loggedIn: false, user: d && d.user };
      });
  }

  function signIn(email, pwd) {
    return api("/auth/v1/token?grant_type=password", {
      method: "POST", body: { email: email, password: pwd }
    }).then(function (d) {
      saveAuth({
        access_token: d.access_token,
        refresh_token: d.refresh_token,
        expires_at: Date.now() + (d.expires_in || 3600) * 1000,
        user: d.user
      });
      return d.user;
    });
  }

  function refreshToken() {
    if (!auth || !auth.refresh_token) return Promise.reject(new Error("未登录"));
    return api("/auth/v1/token?grant_type=refresh_token", {
      method: "POST", body: { refresh_token: auth.refresh_token }
    }).then(function (d) {
      saveAuth({
        access_token: d.access_token,
        refresh_token: d.refresh_token,
        expires_at: Date.now() + (d.expires_in || 3600) * 1000,
        user: d.user || (auth && auth.user)
      });
      return auth;
    });
  }

  function ensureToken() {
    if (!auth) return Promise.reject(new Error("未登录"));
    if (auth.expires_at && Date.now() < auth.expires_at - 60000) return Promise.resolve(auth);
    return refreshToken();
  }

  function signOut() {
    var t = auth && auth.access_token;
    saveAuth(null);
    stopTimer();
    if (t) api("/auth/v1/logout", { method: "POST", token: t }).catch(function () {});
    return Promise.resolve();
  }

  function snapshot() {
    var o = {};
    SYNC_KEYS.forEach(function (k) {
      var v = lsGet(k);
      if (v) o[k] = v;
    });
    return o;
  }

  function pull() {
    return ensureToken().then(function (a) {
      var uid = a.user && a.user.id;
      return api("/rest/v1/" + (CFG.table || "user_data") +
        "?select=data,updated_at&user_id=eq." + uid, { token: a.access_token })
        .then(function (rows) {
          if (!rows || !rows.length) return null;
          return rows[0];
        });
    });
  }

  function push() {
    return ensureToken().then(function (a) {
      var uid = a.user && a.user.id;
      var data = snapshot();
      lastSnap = JSON.stringify(data);
      return api("/rest/v1/" + (CFG.table || "user_data"), {
        method: "POST",
        token: a.access_token,
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: { user_id: uid, data: data, updated_at: new Date().toISOString() }
      });
    });
  }

  function applyData(data) {
    if (!data || typeof data !== "object") return 0;
    var n = 0;
    SYNC_KEYS.forEach(function (k) {
      if (data[k] != null) {
        lsSet(k, typeof data[k] === "string" ? data[k] : JSON.stringify(data[k]));
        n++;
      }
    });
    return n;
  }

  function firstSync() {
    return pull().then(function (row) {
      if (!row) return push().then(function () { return { action: "pushed" }; });
      var cloud = row.data || {};
      var cloudKeys = Object.keys(cloud).length;
      if (!cloudKeys) return push().then(function () { return { action: "pushed" }; });

      var localKeys = Object.keys(snapshot()).length;
      if (localKeys && JSON.stringify(cloud) !== JSON.stringify(snapshot())) {
        var ok = confirm(
          "云端已有你账号的数据（" + cloudKeys + " 项）。\n\n" +
          "点「确定」用云端覆盖本机；\n点「取消」用本机覆盖云端。"
        );
        if (!ok) return push().then(function () { return { action: "pushed" }; });
      }
      applyData(cloud);
      lastSnap = JSON.stringify(snapshot());
      return { action: "pulled", n: cloudKeys };
    });
  }

  function startTimer() {
    stopTimer();
    lastSnap = JSON.stringify(snapshot());
    timer = setInterval(function () {
      if (!auth || busy) return;
      var s = JSON.stringify(snapshot());
      if (s === lastSnap) return;
      busy = true;
      push().then(function () { setStatus("已同步", "ok"); })
        .catch(function () { setStatus("同步失败", "err"); })
        .then(function () { busy = false; });
    }, 20000);
  }
  function stopTimer() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  var slot, modal;

  function buildUI() {
    var nav = document.querySelector(".nav-inner");
    if (!nav || document.getElementById("accountSlot")) return;

    slot = el("div", "account-slot");
    slot.id = "accountSlot";
    nav.appendChild(slot);

    modal = el("div", "modal");
    modal.id = "authModal";
    modal.innerHTML =
      '<div class="modal-mask" data-close="1"></div>' +
      '<div class="modal-box">' +
      '<h3 id="authTitle">登录</h3>' +
      '<p class="faint" id="authHint">登录后，错题本、闪卡进度、编辑内容会存到你的账号，换设备也能接着用。</p>' +
      '<div class="field" style="margin-top:14px"><label>邮箱</label>' +
      '<input id="authEmail" type="email" placeholder="you@example.com" autocomplete="email"></div>' +
      '<div class="field"><label>密码</label>' +
      '<input id="authPwd" type="password" placeholder="至少 6 位" autocomplete="current-password"></div>' +
      '<p class="faint" id="authErr" style="color:var(--rose);display:none;margin:0"></p>' +
      '<div class="modal-actions"><button class="btn" id="authSwitch">去注册</button>' +
      '<button class="btn btn-primary" id="authOk">登录</button></div>' +
      '<p class="faint" style="margin-top:14px;font-size:11.5px;line-height:1.7" id="authNote"></p>' +
      "</div>";
    document.body.appendChild(modal);

    slot.addEventListener("click", onSlotClick);
    modal.querySelectorAll("[data-close]").forEach(function (x) {
      x.addEventListener("click", closeModal);
    });
    document.getElementById("authSwitch").addEventListener("click", toggleMode);
    document.getElementById("authOk").addEventListener("click", submit);
    document.getElementById("authPwd").addEventListener("keydown", function (e) {
      if (e.key === "Enter") submit();
    });

    paintSlot();
  }

  var mode = "in";

  function paintSlot() {
    if (!slot) return;
    if (!configured()) {
      slot.innerHTML = '<button class="acc-btn">登录</button>';
      return;
    }
    if (auth && auth.user) {
      var email = auth.user.email || "";
      var ch = (email[0] || "?").toUpperCase();
      slot.innerHTML = '<button class="acc-avatar" title="' + esc(email) + '">' + esc(ch) + "</button>";
    } else {
      slot.innerHTML = '<button class="acc-btn">登录</button>';
    }
  }

  function onSlotClick() {
    if (!configured()) {
      alert("还没有配置 Supabase。\n\n打开 supabase-config.js，把项目的 URL 和 anon key 填进去，再刷新页面。");
      return;
    }
    if (auth && auth.user) openMenu();
    else openModal("in");
  }

  function openModal(m) {
    mode = m;
    document.getElementById("authTitle").textContent = m === "in" ? "登录" : "注册";
    document.getElementById("authSwitch").textContent = m === "in" ? "去注册" : "去登录";
    document.getElementById("authOk").textContent = m === "in" ? "登录" : "注册";
    document.getElementById("authErr").style.display = "none";
    document.getElementById("authEmail").value = "";
    document.getElementById("authPwd").value = "";
    setStatus("");
    modal.classList.add("on");
    setTimeout(function () { document.getElementById("authEmail").focus(); }, 80);
  }
  function closeModal() { modal.classList.remove("on"); }
  function toggleMode() { openModal(mode === "in" ? "up" : "in"); }

  function showErr(msg) {
    var e = document.getElementById("authErr");
    e.textContent = msg;
    e.style.display = "block";
  }

  function setStatus(txt, kind) {
    var n = document.getElementById("authNote");
    if (!n) return;
    if (!txt) { n.textContent = ""; return; }
    n.textContent = txt;
    n.style.color = kind === "err" ? "var(--rose)" : kind === "ok" ? "var(--mint)" : "var(--text-faint)";
  }

  function submit() {
    var email = document.getElementById("authEmail").value.trim();
    var pwd = document.getElementById("authPwd").value;
    document.getElementById("authErr").style.display = "none";
    if (!email || email.indexOf("@") < 0) { showErr("邮箱填错了"); return; }
    if (!pwd || pwd.length < 6) { showErr("密码至少 6 位"); return; }

    var btn = document.getElementById("authOk");
    btn.disabled = true;
    setStatus("处理中…");

    var job = mode === "in" ? signIn(email, pwd) : signUp(email, pwd);
    job.then(function (r) {
      if (mode === "up" && r && r.loggedIn === false) {
        setStatus("注册成功，去邮箱点确认链接，再回来登录。", "ok");
        btn.disabled = false;
        return;
      }
      closeModal();
      paintSlot();
      setStatus("");
      return firstSync().then(function (res) {
        startTimer();
        toast(res.action === "pulled"
          ? "已从云端载入 " + res.n + " 项数据，刷新后生效"
          : "本机数据已上传到云端");
        if (res.action === "pulled") { setTimeout(function () { location.reload(); }, 800); return; }
        return pullFiles().then(function (n) {
          if (n) toast("已从云端恢复 " + n + " 个文件");
        }).catch(function () {});
      });
    }).catch(function (err) {
      showErr(prettyErr(err));
    }).then(function () {
      btn.disabled = false;
    });
  }

  function prettyErr(err) {
    var m = String((err && err.message) || err);
    if (/Invalid login credentials/i.test(m)) return "邮箱或密码不对";
    if (/Email not confirmed/i.test(m)) return "邮箱还没确认，去邮箱点一下链接";
    if (/already registered|already exists/i.test(m)) return "这个邮箱已经注册过了，直接登录";
    if (/Password should be/i.test(m)) return "密码太短，至少 6 位";
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return "连不上服务器，检查网络或配置里的 URL";
    return m.slice(0, 90);
  }

  function openMenu() {
    var email = (auth.user && auth.user.email) || "";
    var m = el("div", "modal");
    m.innerHTML =
      '<div class="modal-mask" data-close="1"></div>' +
      '<div class="modal-box">' +
      '<h3>账号</h3>' +
      '<p style="font-size:13.5px;color:var(--text)">' + esc(email) + "</p>" +
      '<p class="faint" id="menuStat" style="margin-bottom:0">点下面的按钮手动同步一次</p>' +
      '<div class="modal-actions" style="flex-wrap:wrap">' +
      '<button class="btn" id="accSync">立即同步</button>' +
      '<button class="btn" id="accPull">从云端恢复</button>' +
      '<button class="btn" id="accFiles">同步文件</button>' +
      '<button class="btn" id="accOut" style="color:var(--rose)">退出登录</button>' +
      "</div></div>";
    document.body.appendChild(m);
    m.querySelectorAll("[data-close]").forEach(function (x) {
      x.addEventListener("click", function () { m.remove(); });
    });

    document.getElementById("accSync").addEventListener("click", function () {
      var st = document.getElementById("menuStat");
      st.textContent = "同步中…";
      push().then(function () { st.textContent = "已上传到云端"; })
        .catch(function (e) { st.textContent = "失败：" + prettyErr(e); });
    });
    document.getElementById("accPull").addEventListener("click", function () {
      if (!confirm("用云端数据覆盖本机？")) return;
      pull().then(function (row) {
        if (!row) { alert("云端还没有数据"); return; }
        var n = applyData(row.data || {});
        alert("已载入 " + n + " 项，刷新后生效");
        location.reload();
      }).catch(function (e) { alert(prettyErr(e)); });
    });
    var af = document.getElementById("accFiles");
    if (af) af.addEventListener("click", function () {
      var st = document.getElementById("menuStat");
      st.textContent = "同步文件中…";
      Promise.all([
        window.BankLibrary ? window.BankLibrary.syncUp() : null,
        pullFiles()
      ]).then(function (r) {
        st.textContent = "完成，云端拉回 " + (r[1] || 0) + " 个文件";
      }).catch(function (e) {
        st.textContent = "失败：" + prettyErr(e);
      });
    });

    document.getElementById("accOut").addEventListener("click", function () {
      signOut().then(function () {
        m.remove();
        paintSlot();
        toast("已退出，本机数据保留");
      });
    });
  }

  function toast(msg) {
    var t = el("div", "", msg);
    t.style.cssText = "position:fixed;left:50%;top:20%;transform:translateX(-50%);z-index:200;" +
      "background:rgba(10,22,19,.96);border:1px solid rgba(33,230,166,.4);color:#21e6a6;" +
      "padding:10px 18px;border-radius:11px;font-size:13.5px;max-width:80vw;text-align:center;" +
      "box-shadow:0 10px 30px rgba(0,0,0,.5)";
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2400);
  }


  /* ================= 文件云存储（Supabase Storage） ================= */
  var BUCKET = "biolab-files";

  function cReady() {
    return !!(configured() && auth && auth.access_token && auth.user && auth.user.id);
  }

  function enc(p) {
    return String(p).split("/").map(encodeURIComponent).join("/");
  }
  function dec(p) {
    return String(p).split("/").map(function (x) {
      try { return decodeURIComponent(x); } catch (e) { return x; }
    }).join("/");
  }

  function cloudPath(rec) {
    var uid = auth.user.id;
    var folder = rec.folder || "未分类";
    return uid + "/" + enc(folder) + "/" + enc(rec.name);
  }

  function uploadBlob(rec) {
    if (!cReady()) return Promise.reject(new Error("未登录"));
    var path = cloudPath(rec);
    var blob = rec.blob instanceof Blob ? rec.blob : new Blob([rec.blob || ""]);
    return ensureToken().then(function (a) {
      return fetch(base("/storage/v1/object/" + BUCKET + "/" + path), {
        method: "POST",
        headers: {
          apikey: CFG.anonKey,
          Authorization: "Bearer " + a.access_token,
          "Content-Type": blob.type || "application/octet-stream",
          "x-upsert": "true"
        },
        body: blob
      }).then(function (r) {
        if (!r.ok) return r.text().then(function (t) { throw new Error(t || ("HTTP " + r.status)); });
        return path;
      });
    });
  }

  function removeBlob(path) {
    if (!cReady() || !path) return Promise.resolve();
    return ensureToken().then(function (a) {
      return fetch(base("/storage/v1/object/" + BUCKET), {
        method: "DELETE",
        headers: {
          apikey: CFG.anonKey,
          Authorization: "Bearer " + a.access_token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prefixes: [path] })
      }).then(function () { return true; }).catch(function () { return false; });
    });
  }

  function listBlobs() {
    if (!cReady()) return Promise.resolve([]);
    return ensureToken().then(function (a) {
      var uid = a.user.id;
      var out = [];
      var page = function (offset) {
        return fetch(base("/storage/v1/object/list/" + BUCKET), {
          method: "POST",
          headers: {
            apikey: CFG.anonKey,
            Authorization: "Bearer " + a.access_token,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ prefix: uid + "/", limit: 100, offset: offset, sortBy: { column: "name", order: "asc" } })
        }).then(function (r) {
          if (!r.ok) return [];
          return r.json();
        }).then(function (rows) {
          if (!Array.isArray(rows) || !rows.length) return out;
          rows.forEach(function (row) {
            if (row.id === null || !row.name) return;   // 文件夹占位
            var rel = row.name.slice(uid.length + 1);
            var parts = dec(rel).split("/");
            var folder = parts.length > 1 ? parts.slice(0, -1).join("/") : "未分类";
            var fname = parts[parts.length - 1];
            out.push({
              path: row.name,
              name: fname,
              folder: folder === "未分类" ? "" : folder,
              size: row.metadata && row.metadata.size,
              ts: row.updated_at ? Date.parse(row.updated_at) : Date.now()
            });
          });
          if (rows.length < 100) return out;
          return page(offset + 100);
        });
      };
      return page(0);
    }).catch(function () { return []; });
  }

  function downloadBlob(path) {
    return ensureToken().then(function (a) {
      return fetch(base("/storage/v1/object/" + BUCKET + "/" + path), {
        headers: { apikey: CFG.anonKey, Authorization: "Bearer " + a.access_token }
      }).then(function (r) {
        if (!r.ok) throw new Error("下载失败 HTTP " + r.status);
        return r.blob();
      });
    });
  }

  /* 把云端有、本地没有的文件拉回来 */
  function pullFiles() {
    if (!cReady() || !window.BankLibrary) return Promise.resolve(0);
    return listBlobs().then(function (items) {
      if (!items.length) return 0;
      var local = window.BankLibrary.files() || [];
      var have = {};
      local.forEach(function (f) { have[(f.folder || "") + "|" + f.name] = 1; });

      var todo = items.filter(function (it) { return !have[(it.folder || "") + "|" + it.name]; });
      if (!todo.length) return 0;

      var n = 0;
      var chain = Promise.resolve();
      todo.forEach(function (it) {
        chain = chain.then(function () {
          return downloadBlob(it.path).then(function (blob) {
            return window.BankLibrary.put({
              id: "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
              name: it.name,
              folder: it.folder || "",
              size: blob.size,
              type: blob.type,
              ts: it.ts || Date.now(),
              blob: blob,
              cloud: true,
              cloudPath: it.path
            });
          }).then(function () { n++; }).catch(function () {});
        });
      });
      return chain.then(function () {
        window.BankLibrary.refresh();
        return n;
      });
    });
  }

  window.BioCloud = {
    ready: cReady,
    upload: uploadBlob,
    remove: removeBlob,
    list: listBlobs,
    download: downloadBlob,
    pull: pullFiles
  };

  function boot() {
    loadAuth();
    buildUI();
    if (auth && auth.user && configured()) {
      ensureToken()
        .then(function () { startTimer(); })
        .catch(function () { saveAuth(null); paintSlot(); });
    }
    window.BioAccount = {
      user: function () { return auth && auth.user; },
      sync: push,
      pull: pull,
      signOut: signOut
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
