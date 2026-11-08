/* =========================================================
   每日一练 · 判断式题库与判分
   题型严格模仿联赛：每题 4 个陈述，逐个判断 T / F
   计分：答对 4 个 2 分｜3 个 1 分｜2 个 0.2 分｜0—1 个 0 分
   ========================================================= */
(function () {
  "use strict";

  var BUILTIN = [
    {
      topic: "生物化学",
      stem: "关于酶，判断下列说法。",
      kw: "酶的催化机制",
      opts: [
        { t: "酶通过降低反应的活化能来加快反应速率", a: "T" },
        { t: "绝大多数酶的化学本质是蛋白质，少数是 RNA", a: "T" },
        { t: "竞争性抑制剂使表观 Km 增大，但不改变 Vmax", a: "T" },
        { t: "所有酶的最适 pH 都接近中性", a: "F" }
      ],
      exp:
        "A 对：催化本质就是降活化能。B 对：少数 RNA 也具有催化活性（核酶）。" +
        "C 对：竞争性抑制剂与底物争夺活性中心，提高底物浓度可克服，故 Vmax 不变、表观 Km 增大。" +
        "D 错：不同酶最适 pH 差异极大，如胃蛋白酶约 1.5—2，胰蛋白酶约 8。"
    },
    {
      topic: "细胞生物学",
      stem: "关于细胞结构与功能，判断下列说法。",
      kw: "线粒体",
      opts: [
        { t: "线粒体内膜向内折叠形成嵴，是氧化磷酸化的主要场所", a: "T" },
        { t: "溶酶体含多种酸性水解酶，可分解经胞吞进入的物质", a: "T" },
        { t: "原核细胞依靠微管构成的纺锤体完成染色体分配", a: "F" },
        { t: "核糖体由 rRNA 与蛋白质组成，是蛋白质合成的场所", a: "T" }
      ],
      exp:
        "A 对：嵴扩大了内膜面积，呼吸链与 ATP 合酶位于内膜。B 对：溶酶体是细胞的消化车间。" +
        "C 错：原核细胞没有微管纺锤体，其染色体分配依赖附着在膜上的机制。" +
        "D 对：核糖体是翻译机器。"
    },
    {
      topic: "植物生理学",
      stem: "关于光合作用，判断下列说法。",
      kw: "光呼吸",
      opts: [
        { t: "光反应在类囊体膜上进行，产生 ATP 和 NADPH", a: "T" },
        { t: "C4 植物在维管束鞘细胞中完成卡尔文循环", a: "T" },
        { t: "C3 植物在强光高温下会发生光呼吸，消耗能量并损失碳", a: "T" },
        { t: "叶绿素主要吸收绿光，所以叶片看起来是绿色", a: "F" }
      ],
      exp:
        "A 对：光反应在类囊体膜，暗反应（卡尔文循环）在叶绿体基质。" +
        "B 对：C4 植物先在叶肉细胞固定 CO₂ 成四碳酸，再运到维管束鞘细胞释放 CO₂ 进入卡尔文循环。" +
        "C 对：Rubisco 具加氧活性，高温强光下光呼吸显著，消耗 ATP 与碳。" +
        "D 错：叶绿素主要吸收红光和蓝紫光，绿光吸收少而被反射，叶片才显绿色。"
    },
    {
      topic: "遗传学",
      stem: "关于遗传的基本规律，判断下列说法。",
      kw: "分离定律",
      opts: [
        { t: "一对等位基因的分离发生在减数第一次分裂后期", a: "T" },
        { t: "交叉互换发生在同源染色体的非姐妹染色单体之间", a: "T" },
        { t: "自由组合定律适用于位于同一条染色体上的两对非等位基因", a: "F" },
        { t: "X 连锁隐性遗传病中，男性患者通常多于女性患者", a: "T" }
      ],
      exp:
        "A 对：等位基因随同源染色体分开而分离。B 对：这是基因重组的细胞学基础。" +
        "C 错：同一条染色体上的基因表现为连锁，只有发生交换才部分重组，不遵循自由组合。" +
        "D 对：男性只有一条 X，一个隐性致病基因即发病。"
    },
    {
      topic: "动物生理学",
      stem: "关于神经与血液，判断下列说法。",
      kw: "静息电位",
      opts: [
        { t: "静息电位主要由 K⁺ 外流形成", a: "T" },
        { t: "动作电位的上升支由 Na⁺ 内流引起", a: "T" },
        { t: "哺乳动物成熟红细胞无线粒体，主要依靠糖酵解供能", a: "T" },
        { t: "交感神经兴奋使心率减慢、瞳孔缩小", a: "F" }
      ],
      exp:
        "A 对：静息时膜对 K⁺ 通透性高，K⁺ 外流形成内负外正。B 对：Na⁺ 通道开放导致去极化。" +
        "C 对：成熟红细胞无细胞核和细胞器，只能进行无氧糖酵解。" +
        "D 错：交感兴奋使心率加快、瞳孔扩大（战斗或逃跑反应），副交感才相反。"
    },
    {
      topic: "植物生理学",
      stem: "关于植物激素与水分代谢，判断下列说法。",
      kw: "气孔",
      opts: [
        { t: "气孔开闭主要取决于保卫细胞膨压的变化", a: "T" },
        { t: "生长素主要在根尖分生组织合成", a: "F" },
        { t: "脱落酸促进气孔关闭，增强植物的抗旱能力", a: "T" },
        { t: "赤霉素能促进种子萌发和茎的伸长", a: "T" }
      ],
      exp:
        "A 对：保卫细胞吸水膨胀则气孔张开，失水则关闭。" +
        "B 错：生长素主要合成部位是幼嫩的芽、叶和发育中的种子，根尖虽能合成少量但不是主要来源。" +
        "C 对：ABA 是典型的胁迫激素，干旱时促气孔关闭。D 对：GA 打破休眠、促进萌发与节间伸长。"
    },
    {
      topic: "生态学",
      stem: "关于种群、群落与生态系统，判断下列说法。",
      kw: "竞争排斥",
      opts: [
        { t: "能量沿营养级传递的效率一般约为 10%", a: "T" },
        { t: "竞争排斥原理认为生态位高度重叠的两个物种难以长期共存", a: "T" },
        { t: "群落演替总是从裸岩开始", a: "F" },
        { t: "生态系统中能量单向流动，而物质可以循环", a: "T" }
      ],
      exp:
        "A 对：林德曼十分之一定律。B 对：竞争排斥原理（高斯假说）。" +
        "C 错：演替分初生演替（如裸岩）和次生演替（如弃耕农田、火灾后的森林），后者更常见。" +
        "D 对：能量流动单向递减，物质可循环利用。"
    },
    {
      topic: "微生物学",
      stem: "关于微生物，判断下列说法。",
      kw: "革兰氏",
      opts: [
        { t: "细菌的遗传物质通常是环状双链 DNA", a: "T" },
        { t: "病毒不能在宿主细胞外独立完成复制", a: "T" },
        { t: "革兰氏阳性菌细胞壁的肽聚糖层较厚", a: "T" },
        { t: "真菌都是单细胞生物", a: "F" }
      ],
      exp:
        "A 对：细菌染色体为拟核中的环状双链 DNA，另有质粒。" +
        "B 对：病毒是严格的细胞内寄生，无独立代谢系统。" +
        "C 对：革兰氏阳性菌肽聚糖层厚、含磷壁酸，革兰氏阴性菌层薄但有外膜。" +
        "D 错：酵母菌为单细胞，但霉菌、蕈菌都是多细胞真菌。"
    },
    {
      topic: "动物学",
      stem: "关于动物类群特征，判断下列说法。",
      kw: "环节动物",
      opts: [
        { t: "昆虫具三对足，身体分头、胸、腹三部分", a: "T" },
        { t: "鸟类骨骼中多有气腔，可以减轻体重", a: "T" },
        { t: "蚯蚓所属的环节动物为开放式循环系统", a: "F" },
        { t: "两栖动物成体以肺呼吸，皮肤可辅助呼吸", a: "T" }
      ],
      exp:
        "A 对：昆虫纲的鉴别特征。B 对：气质骨是鸟类适应飞行的特征之一。" +
        "C 错：环节动物是闭管式循环，血液始终在血管内流动；开放式循环见于节肢动物和多数软体动物。" +
        "D 对：两栖类肺不发达，皮肤裸露湿润，承担相当比例的气体交换。"
    },
    {
      topic: "分子生物学",
      stem: "关于遗传信息的传递，判断下列说法。",
      kw: "剪接",
      opts: [
        { t: "DNA 复制为半保留复制", a: "T" },
        { t: "真核生物 mRNA 前体需经剪接去除外显子", a: "F" },
        { t: "逆转录是以 RNA 为模板合成 DNA 的过程", a: "T" },
        { t: "遗传密码共 64 组，其中 61 组编码氨基酸", a: "T" }
      ],
      exp:
        "A 对：每条子链保留一条母链。B 错：剪接去除的是内含子，保留外显子。" +
        "C 对：逆转录酶（如逆转录病毒编码）以 RNA 为模板合成 cDNA。" +
        "D 对：64 组密码子中 3 组为终止密码子，不编码氨基酸。"
    },
    {
      topic: "演化生物学",
      stem: "关于演化机制，判断下列说法。",
      kw: "遗传漂变",
      opts: [
        { t: "自然选择直接作用于个体的表型", a: "T" },
        { t: "遗传漂变在小种群中的作用通常比在大种群中更明显", a: "T" },
        { t: "适应是环境诱导产生的定向突变的结果", a: "F" },
        { t: "同源器官来源于共同祖先，但功能可能不同", a: "T" }
      ],
      exp:
        "A 对：选择作用于表型，进而改变基因频率。B 对：小种群中随机抽样误差影响更大，易发生瓶颈效应与奠基者效应。" +
        "C 错：突变是不定向的，选择才是定向的——这是演化理论最常考的一句。" +
        "D 对：如人的上肢、蝙蝠的翼、鲸的鳍。"
    },
    {
      topic: "演化 / 生物信息学",
      stem: "关于系统发育分析与统计方法，判断下列说法。",
      kw: "系统发育树",
      opts: [
        { t: "可以通过序列比对寻找同源基因", a: "T" },
        { t: "在系统发育树中，分支越长表示两个类群亲缘关系越近", a: "F" },
        { t: "Hardy-Weinberg 平衡要求无突变、无迁移、随机交配且种群足够大", a: "T" },
        { t: "t 检验可用于判断两组数据的均值是否存在显著差异", a: "T" }
      ],
      exp:
        "A 对：序列相似性比对（如 BLAST）是同源性推断的基本手段。" +
        "B 错：枝长表示该分支上发生的遗传变异量或时间，亲缘远近看的是最近共同祖先的位置（拓扑结构）。" +
        "C 对：这四条加上无选择，即 H-W 平衡的五个条件。D 对：t 检验比较均值。"
    }
  ];

  var LS_KEY = "biolab.drill.v1";
  var QKEY = "biolab.customq.v1";
  var CUSTOM = [];
  var QUESTIONS = [];
  var MEM = {};
  function lsGet(k) {
    try { var v = localStorage.getItem(k); if (v !== null) return v; } catch (e) {}
    return MEM[k] || null;
  }
  function lsSet(k, v) {
    try { localStorage.setItem(k, v); } catch (e) {}
    MEM[k] = v;
  }

  function loadCustom() {
    try { CUSTOM = JSON.parse(lsGet(QKEY) || "[]"); } catch (e) { CUSTOM = []; }
    if (!Array.isArray(CUSTOM)) CUSTOM = [];
  }
  function saveCustom() {
    lsSet(QKEY, JSON.stringify(CUSTOM));
  }
  function rebuildQuestions() {
    QUESTIONS = BUILTIN.concat(CUSTOM);
  }
  /* 把各种写法的题目统一成标准结构；失败时返回原因 */
  function normalizeQ(q) {
    if (!q || typeof q !== "object") return { err: "不是对象" };

    var stem = q.stem || q.question || q.title || q.q || q.content || "";
    if (typeof stem !== "string" || !stem.trim()) return { err: "缺少题干（stem / question）" };

    var raw = q.opts || q.options || q.choices || q.items || q.answers || [];
    if (!Array.isArray(raw)) return { err: "选项不是数组（opts / options）" };
    if (raw.length !== 4) return { err: "选项有 " + raw.length + " 个，需要 4 个" };

    var norm = [];
    for (var i = 0; i < 4; i++) {
      var o = raw[i];
      var text = "", ans = "";
      if (typeof o === "string") {
        text = o;
        ans = normTF(q["a" + (i + 1)] || q["answer" + (i + 1)] || "");
      } else if (o && typeof o === "object") {
        text = o.t || o.text || o.content || o.label || o.option || "";
        ans = normTF(o.a != null ? o.a : (o.answer != null ? o.answer : o.correct));
      }
      if (!text) return { err: "第 " + (i + 1) + " 个选项没有文字（t / text）" };
      if (!ans) return { err: "第 " + (i + 1) + " 个选项的答案不是 T/F（现在写的是「" +
        (o && o.a != null ? o.a : "") + "」）" };
      norm.push({ t: String(text).trim(), a: ans });
    }

    return {
      q: {
        topic: q.topic || q.subject || q.category || "导入题目",
        stem: stem.trim(),
        opts: norm,
        exp: q.exp || q.explain || q.explanation || q.analysis || "（无解析）",
        kw: q.kw || q.keyword || q.tag || ""
      }
    };
  }
  var state = { graded: false };

  function scoreOf(correctCount) {
    if (correctCount >= 4) return 2;
    if (correctCount === 3) return 1;
    if (correctCount === 2) return 0.2;
    return 0;
  }

  function build() {
    var host = document.getElementById("qlist");
    if (!host) return;

    var html = "";
    for (var i = 0; i < QUESTIONS.length; i++) {
      var q = QUESTIONS[i];
      html += '<div class="q-card" data-qi="' + i + '">';
      html += '<div class="q-head"><span class="q-no">Q' + (i + 1 < 10 ? "0" : "") + (i + 1) +
        '</span><span class="q-topic">' + q.topic + "</span></div>";
      html += '<div class="q-stem">' + q.stem + "</div>";
      html += '<div class="opts">';
      for (var j = 0; j < q.opts.length; j++) {
        var letter = "ABCD".charAt(j);
        html += '<div class="opt" data-oi="' + j + '">' +
          '<span class="oidx">' + letter + "</span>" +
          '<span class="otext">' + q.opts[j].t + "</span>" +
          '<span class="tf">' +
          '<button type="button" class="tfbtn" data-v="T">T</button>' +
          '<button type="button" class="tfbtn" data-v="F">F</button>' +
          "</span></div>";
      }
      html += "</div>";
      html += '<div class="q-result"></div>';
      html += '<div class="q-explain"><b>解析</b>　' + q.exp + "</div>";
      html += "</div>";
    }
    host.innerHTML = html;

    // 绑定 T / F
    var cards = host.querySelectorAll(".q-card");
    for (var k = 0; k < cards.length; k++) {
      bindCard(cards[k]);
    }
  }

  function bindCard(card) {
    var btns = card.querySelectorAll(".tfbtn");
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function () {
        if (card.classList.contains("graded")) return;
        var group = this.parentElement;
        var all = group.querySelectorAll(".tfbtn");
        var wasOn = this.classList.contains("on-" + this.getAttribute("data-v").toLowerCase());
        for (var n = 0; n < all.length; n++) {
          all[n].classList.remove("on-t", "on-f");
        }
        if (!wasOn) this.classList.add("on-" + this.getAttribute("data-v").toLowerCase());
        updateAnswered();
      });
    }
  }

  function updateAnswered() {
    var total = QUESTIONS.length;
    var answered = 0;
    var cards = document.querySelectorAll(".q-card");
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].querySelector(".tfbtn.on-t, .tfbtn.on-f")) answered++;
    }
    var el = document.getElementById("answeredCount");
    if (el) el.textContent = answered + " / " + total;
  }

  function grade() {
    var cards = document.querySelectorAll(".q-card");
    var totalScore = 0;
    var fullScore = QUESTIONS.length * 2;

    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      if (card.classList.contains("graded")) continue;
      var qi = parseInt(card.getAttribute("data-qi"), 10);
      var q = QUESTIONS[qi];
      var opts = card.querySelectorAll(".opt");
      var right = 0;
      var mine = [];

      for (var j = 0; j < opts.length; j++) {
        var on = opts[j].querySelector(".tfbtn.on-t, .tfbtn.on-f");
        var userAns = on ? on.getAttribute("data-v") : null;
        mine.push(userAns);
        var truth = q.opts[j].a;
        opts[j].classList.remove("right", "wrong", "missed");
        if (userAns === truth) {
          opts[j].classList.add("right");
          right++;
        } else if (userAns === null) {
          opts[j].classList.add("missed");
        } else {
          opts[j].classList.add("wrong");
        }
      }

      var sc = scoreOf(right);
      totalScore += sc;

      var res = card.querySelector(".q-result");
      res.className = "q-result show";
      var okAll = right === 4;
      res.innerHTML = '答对 <span class="' + (right >= 3 ? "ok" : "bad") + '">' +
        right + '</span> / 4 个选项　→　本题 <span class="' +
        (sc >= 1 ? "ok" : "bad") + '">' + sc.toFixed(1) + "</span> 分" +
        (okAll ? "" : "　<span style=\"color:#7f8f8b\">（正确答案：" +
          q.opts.map(function (o) { return o.a; }).join(" ") + "）</span>");

      card.querySelector(".q-explain").classList.add("show");
      card.classList.add("graded");
      recordWrong(q, mine, right);
      // 锁定
      var btns = card.querySelectorAll(".tfbtn");
      for (var b = 0; b < btns.length; b++) btns[b].style.opacity = "0.7";
    }

    var scEl = document.getElementById("scoreNum");
    if (scEl) {
      scEl.innerHTML = totalScore.toFixed(1) + ' <small>/ ' + fullScore + " 分</small>";
    }
    var btn = document.getElementById("gradeBtn");
    if (btn) btn.textContent = "重新开始";
    state.graded = true;
    saveScore(totalScore);
    renderWrong();
    updateWrongCnt();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- 题库管理 ---------- */
  var OPT_RE = /^\s*([A-Da-d])\s*[.、)．]\s*(.+?)\s*[（(]\s*([TFtf对错✓✗])\s*[)）]\s*$/;
  var EXP_RE = /^\s*(?:解析|说明|答)\s*[:：]\s*(.*)$/;

  function normTF(v) {
    if (v === true) return "T";
    if (v === false) return "F";
    var s = String(v == null ? "" : v).trim();
    if (!s) return "";
    var u = s.toUpperCase();
    if (u === "T" || u === "TRUE" || u === "1" || u === "Y" || u === "YES" ||
        s === "对" || s === "正确" || s === "是" || s === "√" || s === "✓") return "T";
    if (u === "F" || u === "FALSE" || u === "0" || u === "N" || u === "NO" ||
        s === "错" || s === "错误" || s === "否" || s === "×" || s === "✗") return "F";
    return "";
  }

  /* 解析纯文本题目：题干 + A-D 四个选项（每项末尾标 T/F），可选「解析：」 */
  function parseTextFormat(text) {
    var lines = String(text || "").split(/\r?\n/);
    var out = [], cur = null, buf = [];

    function push() {
      if (!cur) return;
      if (cur.opts.length === 4 && buf.length) cur.exp = buf.join("");
      if (cur.opts.length === 4 && cur.stem) {
        out.push({
          topic: cur.topic || "导入题目",
          stem: cur.stem,
          opts: cur.opts.slice(0, 4),
          exp: cur.exp || "（无解析）",
          kw: cur.kw || ""
        });
      }
      cur = null; buf = [];
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;

      var mo = OPT_RE.exec(line);
      if (mo) {
        if (!cur) cur = { stem: "", opts: [], exp: "" };
        cur.opts.push({ t: mo[2], a: normTF(mo[3]) });
        continue;
      }
      var me = EXP_RE.exec(line);
      if (me) {
        if (cur) cur.exp = me[1];
        continue;
      }
      // 新题干
      if (cur && cur.opts.length >= 4) push();
      if (!cur) cur = { stem: "", opts: [], exp: "" };
      if (cur.opts.length === 0) cur.stem = (cur.stem ? cur.stem : "") + line;
      else buf.push(line);
    }
    push();
    return out;
  }

  function addQuestions(arr) {
    var ok = 0, fail = [];
    (arr || []).forEach(function (raw, i) {
      var r = normalizeQ(raw);
      if (r.err) { fail.push("第 " + (i + 1) + " 题：" + r.err); return; }
      CUSTOM.push(r.q);
      ok++;
    });
    if (ok) { saveCustom(); rebuildQuestions(); }
    return { ok: ok, fail: fail };
  }

  function reportResult(res) {
    if (!res.fail.length) { toastMsg("成功导入 " + res.ok + " 道题"); return; }
    var detail = res.fail.slice(0, 3).join("\n");
    if (res.fail.length > 3) detail += "\n…还有 " + (res.fail.length - 3) + " 条";
    alert("导入 " + res.ok + " 道，失败 " + res.fail.length + " 道\n\n" + detail +
      "\n\n要求：每题 4 个选项，答案写 T/F（也接受 true/false、对/错、1/0）。");
  }

  function renderBank() {
    var host = document.getElementById("bankList");
    if (!host) return;
    var stat = document.getElementById("bankStat");
    if (stat) stat.textContent = "内置 " + BUILTIN.length + " 题 · 自定义 " + CUSTOM.length + " 题";
    if (!CUSTOM.length) {
      host.innerHTML = '<div class="fc-empty">还没有导入题目。<br>用上面的输入框粘贴题目，或选择 JSON 文件。</div>';
      return;
    }
    var h = "";
    CUSTOM.forEach(function (q, i) {
      h += '<div class="term"><div class="term-top"><span class="term-cn">' + (i + 1) + ". " +
        escHtml(q.topic) + '</span><span class="term-en">' +
        q.opts.map(function (o) { return o.a; }).join(" ") + "</span></div>" +
        '<div class="term-desc">' + escHtml(q.stem) + "</div>" +
        '<span class="term-src" data-delq="' + i + '" style="color:var(--rose);border-color:rgba(255,122,138,.3)">删除</span></div>';
    });
    host.innerHTML = h;
    host.querySelectorAll("[data-delq]").forEach(function (el) {
      el.addEventListener("click", function () {
        var i = parseInt(this.getAttribute("data-delq"), 10);
        CUSTOM.splice(i, 1);
        saveCustom(); rebuildQuestions(); renderBank(); resetQuiz(); build(); updateAnswered();
        toastMsg("已删除");
      });
    });
  }

  function escHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function toastMsg(msg) {
    var t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;left:50%;top:20%;transform:translateX(-50%);z-index:200;" +
      "background:rgba(10,22,19,.96);border:1px solid rgba(33,230,166,.4);color:#21e6a6;" +
      "padding:10px 18px;border-radius:11px;font-size:13.5px";
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 1600);
  }

  function bindBank() {
    var parseBtn = document.getElementById("bankParse");
    if (!parseBtn) return;

    parseBtn.addEventListener("click", function () {
      var txt = document.getElementById("bankText").value;
      if (!txt.trim()) { toastMsg("先粘贴题目"); return; }
      var qs = parseTextFormat(txt);
      if (!qs.length) { alert("没解析出题目。\n每道题需要：题干一行，然后 A-D 四个选项，每项末尾用 (T) 或 (F) 标注。"); return; }
      var res = addQuestions(qs);
      document.getElementById("bankText").value = "";
      renderBank(); resetQuiz(); build(); updateAnswered();
      reportResult(res);
    });

    var fileBtn = document.getElementById("bankFile");
    var fileInput = document.getElementById("bankFileInput");
    if (fileBtn && fileInput) {
      fileBtn.addEventListener("click", function () { fileInput.click(); });
      fileInput.addEventListener("change", function (e) {
        var f = e.target.files && e.target.files[0];
        if (!f) return;
        var r = new FileReader();
        r.onload = function () {
          try {
            var data = JSON.parse(r.result);
            if (!Array.isArray(data)) {
              var keys = ["questions", "items", "list", "data"];
              for (var ki = 0; ki < keys.length; ki++) {
                if (data && Array.isArray(data[keys[ki]])) { data = data[keys[ki]]; break; }
              }
            }
            if (!Array.isArray(data)) throw new Error("not-array");
            if (!data.length) { alert("这个文件里没有题目（数组是空的）"); return; }
            var res = addQuestions(data);
            renderBank(); resetQuiz(); build(); updateAnswered();
            reportResult(res);
          } catch (err) {
            alert("文件不是合法 JSON，或结构不对。\n\n正确结构是数组：\n" +
              '[{"stem":"题干","opts":[{"t":"选项1","a":"T"},{"t":"选项2","a":"F"},' +
              '{"t":"选项3","a":"T"},{"t":"选项4","a":"F"}],"exp":"解析"}]');
          }
        };
        r.readAsText(f);
        e.target.value = "";
      });
    }

    var expBtn = document.getElementById("bankExport");
    if (expBtn) expBtn.addEventListener("click", function () {
      if (!CUSTOM.length) { toastMsg("还没有自定义题"); return; }
      var blob = new Blob([JSON.stringify(CUSTOM, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "bio-lab-questions.json";
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      toastMsg("已导出");
    });

    var clr = document.getElementById("bankClear");
    if (clr) clr.addEventListener("click", function () {
      if (!CUSTOM.length) return;
      if (!confirm("清空全部 " + CUSTOM.length + " 道自定义题？")) return;
      CUSTOM = []; saveCustom(); rebuildQuestions();
      renderBank(); resetQuiz(); build(); updateAnswered();
      toastMsg("已清空");
    });
  }

  /* ---------- 错题本 ---------- */
  var WKEY = "biolab.wrong.v1";

  function readWrong() {
    try { return JSON.parse(lsGet(WKEY) || "[]"); } catch (e) { return []; }
  }
  function writeWrong(a) {
    lsSet(WKEY, JSON.stringify(a.slice(0, 200)));
  }

  function recordWrong(q, mine, right) {
    if (right >= 4) return;
    var arr = readWrong();
    var rec = { stem: q.stem, topic: q.topic, opts: q.opts, mine: mine,
                right: right, exp: q.exp, kw: q.kw || "", ts: Date.now() };
    arr = arr.filter(function (x) { return x.stem !== q.stem; });
    arr.unshift(rec);
    writeWrong(arr);
    updateWrongCnt();
  }

  function updateWrongCnt() {
    var el = document.getElementById("wrongCnt");
    if (el) el.textContent = readWrong().length;
  }

  function renderWrong() {
    var host = document.getElementById("wrongOut");
    if (!host) return;
    var arr = readWrong();
    if (!arr.length) {
      host.innerHTML = '<div class="fc-empty">错题本是空的。<br>做完一套练习，答错 3 个及以下选项的题会自动进这里。</div>';
      return;
    }
    var h = '<div class="res-head"><span>共 <b class="hl">' + arr.length + "</b> 条</span>" +
      '<span style="cursor:pointer;color:var(--rose)" id="wrongClear">清空</span></div>';
    h += '<div class="term-list">';
    arr.forEach(function (x, i) {
      h += '<div class="term"><div class="term-top"><span class="term-cn">' + x.topic + "</span>" +
        '<span class="term-en">答对 ' + x.right + "/4 · " + (x.right >= 3 ? 1 : x.right === 2 ? 0.2 : 0) + " 分</span></div>" +
        '<div class="term-desc" style="color:var(--text)">' + x.stem + "</div>";
      h += '<div style="margin-top:8px;display:flex;flex-direction:column;gap:5px">';
      x.opts.forEach(function (o, j) {
        var m = x.mine[j];
        var ok = m === o.a;
        h += '<div style="font-size:12.5px;line-height:1.65;color:' + (ok ? "var(--text-dim)" : "var(--rose)") + '">' +
          '<span class="mono" style="opacity:.6">' + "ABCD"[j] + "</span> " +
          (ok ? "✓" : "✗ 你选 " + (m || "空") + "，应为 " + o.a) + "　" + o.t + "</div>";
      });
      h += "</div>";
      h += '<div class="q-explain show" style="margin-top:9px">' + x.exp + "</div>";
      if (x.kw) {
        h += '<a class="term-src" href="knowledge.html?q=' + encodeURIComponent(x.kw) + '">相关：' + x.kw + " →</a>";
      }
      h += '<span class="term-src" style="margin-left:6px;color:var(--rose);border-color:rgba(255,122,138,.35)" data-del="' + i + '">移除</span>';
      h += "</div>";
    });
    h += "</div>";
    host.innerHTML = h;

    var cl = document.getElementById("wrongClear");
    if (cl) cl.addEventListener("click", function () {
      if (confirm("清空全部错题？")) { writeWrong([]); renderWrong(); updateWrongCnt(); }
    });
    host.querySelectorAll("[data-del]").forEach(function (el) {
      el.addEventListener("click", function () {
        var arr2 = readWrong();
        arr2.splice(parseInt(this.getAttribute("data-del"), 10), 1);
        writeWrong(arr2);
        renderWrong();
        updateWrongCnt();
      });
    });
  }

  function saveScore(score) {
    try {
      var hist = JSON.parse(lsGet(LS_KEY) || "[]");
      hist.push({ d: new Date().toISOString().slice(0, 16).replace("T", " "), s: score });
      if (hist.length > 30) hist = hist.slice(hist.length - 30);
      lsSet(LS_KEY, JSON.stringify(hist));
      renderHist();
    } catch (e) {}
  }

  function renderHist() {
    var host = document.getElementById("hist");
    if (!host) return;
    var hist;
    try {
      hist = JSON.parse(lsGet(LS_KEY) || "[]");
    } catch (e) {
      hist = [];
    }
    if (!hist.length) {
      host.innerHTML = '<span class="faint">还没有记录。做完一套提交后会出现在这里。</span>';
      return;
    }
    var h = "";
    for (var i = hist.length - 1; i >= 0; i--) {
      h += '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--line);font-size:13px">' +
        '<span class="mono" style="color:var(--text-faint)">' + hist[i].d + "</span>" +
        '<span class="mono" style="color:var(--mint)">' + hist[i].s + " / 24</span></div>";
    }
    host.innerHTML = h;
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadCustom();
    rebuildQuestions();
    build();
    updateAnswered();
    renderHist();
    updateWrongCnt();
    renderWrong();
    renderBank();
    bindBank();
    var wt = document.querySelectorAll("#dtabs button");
    for (var t = 0; t < wt.length; t++) {
      wt[t].addEventListener("click", function () {
        var id = this.getAttribute("data-tab");
        for (var u = 0; u < wt.length; u++) wt[u].classList.toggle("on", wt[u] === this);
        document.getElementById("pane-quiz").classList.toggle("on", id === "quiz");
        document.getElementById("pane-wrong").classList.toggle("on", id === "wrong");
        document.getElementById("pane-bank").classList.toggle("on", id === "bank");
        if (id === "wrong") renderWrong();
        if (id === "bank") renderBank();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
    var btn = document.getElementById("gradeBtn");
    if (btn)
      btn.addEventListener("click", function () {
        if (state.graded) {
          location.reload();
          return;
        }
        grade();
      });
  });
})();
