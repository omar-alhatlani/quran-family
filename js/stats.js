/* الحسابات: المحفوظ، وحالة كل وجه، ومراجعة اليوم المقترحة، والتقارير */
const Stats = (() => {
  const FRESH_DAYS = 14;   // الوجه «ثابت» إذا سُمِّع خلال أسبوعين بلا أخطاء تُذكر

  function memorized(id){
    const m = Store.mem(id);
    let ayat = 0, words = 0, letters = 0, pages = 0, juz = 0;
    for (let i = 0; i < m.length; i++) if (m[i]){
      ayat++; words += Q.words[i]; letters += Q.letters[i];
      pages += Q.words[i] / Q.pageWords[Q.page[i]];
      juz += Q.words[i] / Q.juzWords[Q.juz[i]];
    }
    return {ayat, words, letters, pages, juz, pct: words / Q.totalWords * 100};
  }

  // حالة آية محفوظة: fresh ثابتة، stale تحتاج مراجعة، weak ضعيفة، unrev لم تُسمَّع بعد
  function ayahState(id, i, today){
    const r = Store.data(id).rev[i];
    if (!r) return 'unrev';
    if (r[1] >= 2) return 'weak';
    if (today - r[0] > FRESH_DAYS) return 'stale';
    return 'fresh';
  }
  const RANK = {weak: 4, stale: 3, unrev: 2, fresh: 1};
  // حالة الوجه = أسوأ حالات آياته المحفوظة، ونسبة المحفوظ منه بالكلمات
  function pageInfo(id, pg, today = Store.today()){
    const m = Store.mem(id); let w = 0, st = null;
    for (let i = Q.pageFirst[pg]; i <= Q.pageLast[pg]; i++) if (m[i]){
      w += Q.words[i];
      const s = ayahState(id, i, today);
      if (!st || RANK[s] > RANK[st]) st = s;
    }
    return {frac: w / Q.pageWords[pg], state: st};
  }

  // مراجعة اليوم: أضعف وجه محفوظ، ثم أقدمه تسميعًا
  function suggest(id){
    const m = Store.mem(id), rev = Store.data(id).rev, today = Store.today();
    let best = null, bestScore = -1;
    for (let pg = 1; pg <= Q.PAGES; pg++){
      const info = pageInfo(id, pg, today); if (!info.state) continue;
      let oldest = today;
      for (let i = Q.pageFirst[pg]; i <= Q.pageLast[pg]; i++) if (m[i]) oldest = Math.min(oldest, rev[i] ? rev[i][0] : -1);
      if (oldest === today) continue;   // سُمِّع اليوم كاملًا
      const age = oldest < 0 ? 60 : today - oldest;
      const score = {weak: 1000, stale: 500, unrev: 300, fresh: 0}[info.state] + Math.min(age, 365);
      if (score > bestScore){ bestScore = score; best = {pg, state: info.state}; }
    }
    if (!best) return null;
    // المقطع الذي يحتاج المراجعة فعلًا: الآية الأسوأ حالةً في الوجه (وأقدمها تسميعًا)،
    // ثم ما يتّصل بها من المحفوظ داخل سورتها وفي الوجه نفسه
    let worst = -1, wr = 0, wAge = -1;
    for (let i = Q.pageFirst[best.pg]; i <= Q.pageLast[best.pg]; i++) if (m[i]){
      const r = RANK[ayahState(id, i, today)], age = rev[i] ? today - rev[i][0] : 9999;
      if (r > wr || (r === wr && age > wAge)){ worst = i; wr = r; wAge = age; }
    }
    let a = worst, b = worst;
    while (a - 1 >= Q.pageFirst[best.pg] && m[a - 1] && Q.sur[a - 1] === Q.sur[worst]) a--;
    while (b + 1 <= Q.pageLast[best.pg] && m[b + 1] && Q.sur[b + 1] === Q.sur[worst]) b++;
    return {a, b, pg: best.pg, state: best.state};
  }

  // ملخّص التسميع خلال آخر `days` يومًا (أو الكل)
  function period(id, days){
    const since = days ? Date.now() - days * 864e5 : 0;
    const ss = Store.data(id).sess.filter(s => s.t >= since);
    const sum = k => ss.reduce((t, s) => t + (s[k] || 0), 0);
    const graded = sum('ok') + sum('wrong') + sum('skip') + sum('hint');
    return {
      sessions: ss.length, words: sum('words'), letters: sum('letters'), pages: sum('pages'), ayat: sum('ayat'),
      review: ss.filter(s => s.kind === 'review').length, fresh: ss.filter(s => s.kind !== 'review').length,
      acc: graded ? sum('ok') / graded * 100 : null,
      errPer100: graded ? (sum('wrong') + sum('skip')) / graded * 100 : null
    };
  }

  // نسبة المحفوظ (بالكلمات) الذي سُمِّع خلال آخر أسبوعين
  function coverage(id){
    const m = Store.mem(id), rev = Store.data(id).rev, today = Store.today();
    let all = 0, cov = 0;
    for (let i = 0; i < m.length; i++) if (m[i]){ all += Q.words[i]; if (rev[i] && today - rev[i][0] <= FRESH_DAYS) cov += Q.words[i]; }
    return all ? cov / all * 100 : null;
  }

  // كلمات مُسمَّعة في كل أسبوع من آخر ٨ أسابيع (الأقدم أولًا)
  function weekly(id){
    const out = new Array(8).fill(0), now = Date.now();
    Store.data(id).sess.forEach(s => { const w = Math.floor((now - s.t) / (7 * 864e5)); if (w < 8) out[7 - w] += s.words || 0; });
    return out;
  }

  function ayahOfWord(g){
    let lo = 0, hi = Q.TOTAL_AYAT - 1;
    while (lo < hi){ const mid = (lo + hi + 1) >> 1; if (Q.wOff[mid] <= g) lo = mid; else hi = mid - 1; }
    return lo;
  }
  function weakSpots(id, n = 5){
    return Object.entries(Store.data(id).mis).map(([g, c]) => ({g: +g, c})).filter(x => x.c > 0)
      .sort((a, b) => b.c - a.c || a.g - b.g).slice(0, n)
      .map(x => { const i = ayahOfWord(x.g); return {...x, i, word: Q.uth[i].split('\t')[x.g - Q.wOff[i]]}; });
  }

  /* ---------- الأهداف: الأسبوع من السبت إلى الجمعة ---------- */
  const weekStart = d => d - ((d + 5) % 7);   // اليوم ٠ (١ يناير ١٩٧٠) خميس
  // تقدّم الأسبوع من بيانات هذا الجهاز: حفظ جديد (أوجه/آيات) ومراجعة (أوجه)
  function week(id, w = weekStart(Store.today())){
    const d = Store.data(id); let np = 0, na = 0, rp = 0;
    Object.entries(d.nl || {}).forEach(([k, v]) => { if (+k >= w && +k < w + 7){ np += v[0]; na += v[1]; } });
    d.sess.forEach(s => { const sd = Store.dayOf(s.t); if (s.kind === 'review' && sd >= w && sd < w + 7) rp += s.pages || 0; });
    return {w, np: Math.max(0, +np.toFixed(2)), na: Math.max(0, na), rp: +rp.toFixed(2)};
  }
  // تقدّم فرد لا يملك هذا الجهاز بياناته كاملة: ما رفعه جهازه
  function weekShared(id, local){
    const w = weekStart(Store.today()), p = Store.data(id).prog;
    return local ? week(id, w) : p && p.w === w ? p : {w, np: 0, na: 0, rp: 0};
  }
  function goalStatus(id, prog){
    const g = Store.data(id).goal; if (!g) return null;
    const mem = memorized(id);
    const newT = +g.n || 0, newD = g.nu === 'ayah' ? prog.na : prog.np;
    const revT = g.rc ? Math.max(1, Math.round(mem.pages / g.rc * 2) / 2) : 0;
    const revD = prog.rp;
    const daysLeft = prog.w + 7 - Store.today();
    return {newT, newD, revT, revD, unit: g.nu, days: g.dy, daysLeft, rc: g.rc,
            newOk: !newT || newD >= newT, revOk: !revT || revD >= revT,
            met: (!newT || newD >= newT) && (!revT || revD >= revT) && (newT || revT)};
  }
  // الهدف الكبير: حفظ مدى (جزء أو سورة) قبل تاريخ؛ المتوقّع خطّيًّا من يوم وضعه
  function bigStatus(id){
    const g = Store.data(id).goal, big = g && g.big; if (!big) return null;
    const m = Store.mem(id); let tw = 0, mw = 0, tp = 0;
    for (let i = big.a; i <= big.b; i++){ tw += Q.words[i]; tp += Q.words[i] / Q.pageWords[Q.page[i]]; if (m[i]) mw += Q.words[i]; }
    const frac = tw ? mw / tw : 0, t = Store.today();
    const span = Math.max(1, big.due - big.since), k = Math.min(1, Math.max(0, (t - big.since) / span));
    const expected = big.f0 + (1 - big.f0) * k;
    const behind = (expected - frac) * tp;                  // بالأوجه؛ سالب = متقدّم
    const weeksLeft = Math.max(1, (big.due - t) / 7);
    return {label: big.label, frac, pages: tp, behind, done: frac >= 1, overdue: t > big.due && frac < 1,
            perWeek: (1 - frac) * tp / weeksLeft, due: big.due};
  }

  /* ---------- ورد المراجعة اليوم ---------- */
  const ayahPages = i => Q.words[i] / Q.pageWords[Q.page[i]];
  // مقدار اليوم بالأوجه: نصيب اليوم من هدف مراجعة الأسبوع (÷٧)، ويزيد عند التأخّر إلى ضعفه لا أكثر،
  // فلا يُحمَّل يومٌ واحد هدفَ الأسبوع كلّه. بلا هدف: وجهان.
  function dailyQuota(id){
    const d = Store.data(id), m = memorized(id);
    if (!m.pages) return 0;
    let q = 2;
    if (d.goal && d.goal.rc){
      const w = week(id), revT = Math.max(1, Math.round(m.pages / d.goal.rc * 2) / 2);
      const left = Math.max(1, w.w + 7 - Store.today());
      const base = revT / 7, need = (revT - w.rp) / left;
      q = need <= 0 ? base : Math.min(Math.max(base, need), 2 * base);
    }
    return Math.min(Math.round(q * 2) / 2 || 0.5, m.pages);
  }
  // الأوجه الضعيفة أولًا، ثم الأقدم تسميعًا (ولم يُسمَّع بعدُ قبل الجميع)، ثم ترتيب المصحف؛
  // فتدور المراجعة على المحفوظ كله بالتتابع
  function makeWird(id, quota){
    const m = Store.mem(id), rev = Store.data(id).rev, today = Store.today(), pages = [];
    for (let pg = 1; pg <= Q.PAGES; pg++){
      let frac = 0, last = Infinity, all = true, weak = false;
      for (let i = Q.pageFirst[pg]; i <= Q.pageLast[pg]; i++) if (m[i]){
        frac += ayahPages(i);
        const r = rev[i]; last = Math.min(last, r ? r[0] : -1);
        if (!r || r[0] !== today) all = false;
        if (r && r[1] >= 2) weak = true;
      }
      if (frac > 0 && !all) pages.push({pg, frac, last, weak});
    }
    pages.sort((x, y) => (y.weak - x.weak) || (x.last - y.last) || (x.pg - y.pg));
    const pick = []; let sum = 0;
    for (const p of pages){ if (sum >= quota - 0.1) break; pick.push(p.pg); sum += p.frac; }
    const idx = [];
    pick.forEach(pg => { for (let i = Q.pageFirst[pg]; i <= Q.pageLast[pg]; i++) if (m[i]) idx.push(i); });
    idx.sort((a, b) => a - b);
    const items = [];
    idx.forEach(i => { const L = items[items.length - 1]; if (L && L[1] === i - 1 && Q.sur[i] === Q.sur[L[0]]) L[1] = i; else items.push([i, i]); });
    return items;
  }
  // ورد اليوم: يُنشأ مرة في اليوم ويبقى ثابتًا (create لصاحب الملف فقط)
  function wird(id, create){
    const d = Store.data(id), t = Store.today(), m = Store.mem(id);
    if (d.wird && d.wird.d === t){
      const items = d.wird.items.filter(([a, b]) => { for (let i = a; i <= b; i++) if (!m[i]) return false; return true; });
      return {...d.wird, items};
    }
    if (!create) return null;
    const q = dailyQuota(id); if (!q) return null;
    d.wird = {d: t, q, items: makeWird(id, q)};
    Store.touch(id);
    return d.wird;
  }
  // حالة الورد: كل مقطع تمّ إذا سُمِّعت كل آياته اليوم
  function wirdStatus(id, w){
    const rev = Store.data(id).rev, t = Store.today();
    let total = 0, done = 0;
    const items = w.items.map(([a, b]) => {
      let p = 0, ok = true;
      for (let i = a; i <= b; i++){ p += ayahPages(i); if (!rev[i] || rev[i][0] !== t) ok = false; }
      total += p; if (ok) done += p;
      return {a, b, pages: p, done: ok};
    });
    return {items, total, done, next: items.find(x => !x.done) || null, complete: items.length > 0 && items.every(x => x.done)};
  }

  return {dailyQuota, wird, wirdStatus, weekStart, week, weekShared, goalStatus, bigStatus, memorized, pageInfo, suggest, period, coverage, weekly, weakSpots, ayahOfWord, FRESH_DAYS};
})();
