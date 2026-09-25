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
    // أول مقطع محفوظ متّصل من الوجه داخل سورة واحدة
    for (const [a, b] of Q.pageSegments(best.pg)){
      let s = -1;
      for (let i = a; i <= b + 1; i++){
        if (i <= b && m[i]){ if (s < 0) s = i; }
        else if (s >= 0) return {a: s, b: i - 1, pg: best.pg, state: best.state};
      }
    }
    return null;
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

  return {memorized, pageInfo, suggest, period, coverage, weekly, weakSpots, ayahOfWord, FRESH_DAYS};
})();
