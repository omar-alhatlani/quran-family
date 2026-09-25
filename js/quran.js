/* بيانات المصحف: السور والآيات والأوجه والأجزاء، وعدد الكلمات والأحرف لكل آية.
   المصدر data/quran.json (يبنيه tools/build-data.js):
   surahs: [الاسم، عدد الآيات، فهرس أول آية]
   ayat:   [الوجه، الجزء، كلمات العثماني بفاصل \t، ما يقابلها إملائيًّا بفاصل \t] */
const Q = (() => {
  const TOTAL_AYAT = 6236, PAGES = 604, JUZ = 30;
  const q = {TOTAL_AYAT, PAGES, JUZ};
  const DIGITS = '٠١٢٣٤٥٦٧٨٩';
  q.ar = n => String(n).replace(/\d/g, d => DIGITS[d]);
  // عدد عشري بالأرقام العربية: ٣٫٢
  q.dec = (x, k = 1) => {
    const r = Math.round(x * 10 ** k) / 10 ** k;
    return q.ar(Number.isInteger(r) ? r : r.toFixed(k)).replace('.', '٫');
  };

  q.load = async () => {
    const res = await fetch('data/quran.json?v=1');
    const j = await res.json();
    q.surahs = j.surahs.map(([name, count, start], i) => ({n: i + 1, name, count, start}));
    const N = j.ayat.length;
    q.sur = new Int16Array(N); q.num = new Int16Array(N); q.page = new Int16Array(N); q.juz = new Int8Array(N);
    q.words = new Int16Array(N); q.letters = new Int16Array(N); q.wOff = new Int32Array(N + 1);
    q.uth = new Array(N); q.sim = new Array(N);
    q.pageWords = new Int32Array(PAGES + 1); q.juzWords = new Int32Array(JUZ + 1);
    q.pageFirst = new Int16Array(PAGES + 1).fill(-1); q.pageLast = new Int16Array(PAGES + 1);
    q.juzFirst = new Int16Array(JUZ + 1).fill(-1); q.juzLast = new Int16Array(JUZ + 1);
    let off = 0;
    q.surahs.forEach(s => { for (let k = 0; k < s.count; k++){ q.sur[s.start + k] = s.n; q.num[s.start + k] = k + 1; } });
    j.ayat.forEach(([pg, jz, u, s], i) => {
      q.page[i] = pg; q.juz[i] = jz; q.uth[i] = u; q.sim[i] = s;
      const w = u.split('\t').length;
      q.words[i] = w; q.letters[i] = s.replace(/[^ء-غف-ي]/g, '').length;
      q.wOff[i] = off; off += w;
      q.pageWords[pg] += w; q.juzWords[jz] += w;
      if (q.pageFirst[pg] < 0) q.pageFirst[pg] = i; q.pageLast[pg] = i;
      if (q.juzFirst[jz] < 0) q.juzFirst[jz] = i; q.juzLast[jz] = i;
    });
    q.wOff[N] = off; q.totalWords = off;
    q.totalLetters = q.letters.reduce((a, b) => a + b, 0);
  };

  q.idx = (s, a) => q.surahs[s - 1].start + a - 1;
  q.surahOf = i => q.surahs[q.sur[i] - 1];
  q.label = i => `${q.surahOf(i).name} ${q.ar(q.num[i])}`;
  // «الملك ١–١٢» لمدى داخل سورة واحدة
  q.rangeLabel = (a, b) => q.sur[a] === q.sur[b]
    ? `${q.surahOf(a).name} ${q.ar(q.num[a])}${b > a ? '–' + q.ar(q.num[b]) : ''}`
    : `${q.label(a)} ← ${q.label(b)}`;
  // كلمات آية: [{u: عثماني، s: إملائي، g: رقمها في المصحف كله}]
  q.ayahWords = i => {
    const u = q.uth[i].split('\t'), s = q.sim[i].split('\t');
    return u.map((w, k) => ({u: w, s: s[k], g: q.wOff[i] + k}));
  };
  // أجزاء الوجه مقسومة بالسور: [[أول آية، آخر آية]]
  q.pageSegments = pg => {
    const out = []; let a = q.pageFirst[pg];
    for (let i = a; i <= q.pageLast[pg]; i++){
      if (i === q.pageLast[pg] || q.sur[i + 1] !== q.sur[i]){ out.push([a, i]); a = i + 1; }
    }
    return out;
  };
  return q;
})();
