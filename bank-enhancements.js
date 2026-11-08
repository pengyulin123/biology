/* =========================================================
   资料库增强工具
   提供文件类型识别、大小格式化、拖拽上传等基础能力
   （被 bank-library-tools.js 调用）
   ========================================================= */
(function () {
  "use strict";

  var ICONS = {
    pdf: "📕", doc: "📘", docx: "📘", txt: "📄", md: "📝",
    rtf: "📄", xls: "📗", xlsx: "📗", ppt: "📙", pptx: "📙",
    png: "🖼", jpg: "🖼", jpeg: "🖼", zip: "🗜"
  };

  function ext(name) {
    var m = /\.([a-z0-9]+)$/i.exec(String(name || ""));
    return m ? m[1].toLowerCase() : "";
  }

  function iconOf(name) {
    return ICONS[ext(name)] || "📄";
  }

  function niceSize(bytes) {
    var n = Number(bytes) || 0;
    if (n < 1024) return n + " B";
    if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
    if (n < 1073741824) return (n / 1048576).toFixed(1) + " MB";
    return (n / 1073741824).toFixed(2) + " GB";
  }

  function niceTime(ts) {
    var d = new Date(ts || Date.now());
    function p(n) { return n < 10 ? "0" + n : "" + n; }
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
      " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  /* 让 #bankUploadInput 所在区域可拖拽投放 */
  function enableDrop(zone, onFiles) {
    if (!zone) return;
    var over = false;
    zone.addEventListener("dragover", function (e) {
      e.preventDefault();
      if (!over) { over = true; zone.style.borderColor = "rgba(33,230,166,.6)"; }
    });
    zone.addEventListener("dragleave", function () {
      over = false;
      zone.style.borderColor = "";
    });
    zone.addEventListener("drop", function (e) {
      e.preventDefault();
      over = false;
      zone.style.borderColor = "";
      var fs = e.dataTransfer && e.dataTransfer.files;
      if (fs && fs.length) onFiles(fs);
    });
  }

  window.BankUtil = {
    ext: ext,
    iconOf: iconOf,
    niceSize: niceSize,
    niceTime: niceTime,
    enableDrop: enableDrop
  };
})();
