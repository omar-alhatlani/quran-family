// يبني data/quran.json من نصّين من api.alquran.cloud:
//   quran-uthmani (للعرض) و quran-simple-clean (للمطابقة الصوتية)
// الاستعمال: node tools/build-data.js <q-uth.json> <q-simple.json>
// كل آية تُقسَّم إلى «وحدات» = كلمات الرسم العثماني، ولكل وحدة ما يقابلها من الرسم الإملائي
// (قد تقابل الوحدة كلمتين: «يَٰٓأَيُّهَا» = «يا أيها»).
const fs = require('fs');
const path = require('path');
const [uPath, sPath] = process.argv.slice(2);
const U = require(path.resolve(uPath)).data.surahs;
const S = require(path.resolve(sPath)).data.surahs;

const MARK = /^[ۖ-ۭ]+$/;
const strip = w => w.replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
  .replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[ؤئ]/g, 'ء')
  .replace(/[^ء-ي]/g, '');
function lev(a, b){
  let prev = Array.from({length: b.length + 1}, (_, j) => j);
  for (let i = 1; i <= a.length; i++){
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j-1] + 1, prev[j-1] + (a[i-1] === b[j-1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

// كلمات العثماني مع إلصاق علامات الوقف والأحزاب بالكلمة المجاورة
function uthWords(text){
  const out = []; let pre = '';
  for (const w of text.split(/\s+/).filter(Boolean)){
    if (MARK.test(w)){ if (out.length) out[out.length - 1] += ' ' + w; else pre += w + ' '; }
    else { out.push(pre + w); pre = ''; }
  }
  return out;
}
const simWords = text => text.split(/\s+/).filter(w => w && !MARK.test(w));

// محاذاة بالبرمجة الديناميكية: وحدة عثمانية ↔ ١–٣ كلمات إملائية، أو وحدتان ↔ كلمة
function alignAyah(uw, sw){
  const m = uw.length, n = sw.length, INF = 1e9;
  const cost = Array.from({length: m + 1}, () => new Array(n + 1).fill(INF));
  const from = Array.from({length: m + 1}, () => new Array(n + 1).fill(null));
  cost[0][0] = 0;
  const moves = [[1,1],[1,2],[1,3],[2,1]];
  for (let i = 0; i <= m; i++) for (let j = 0; j <= n; j++){
    if (cost[i][j] >= INF) continue;
    for (const [du, ds] of moves){
      const i2 = i + du, j2 = j + ds; if (i2 > m || j2 > n) continue;
      const a = strip(uw.slice(i, i2).join('')), b = strip(sw.slice(j, j2).join(''));
      const c = cost[i][j] + lev(a, b) + (du + ds > 2 ? 0.5 : 0);
      if (c < cost[i2][j2]){ cost[i2][j2] = c; from[i2][j2] = [i, j]; }
    }
  }
  const units = []; let i = m, j = n;
  while (i > 0 || j > 0){
    const [pi, pj] = from[i][j];
    units.unshift([uw.slice(pi, i).join(' '), sw.slice(pj, j).join(' ')]);
    i = pi; j = pj;
  }
  return {units, cost: cost[m][n]};
}

const surahs = [], ayat = [], report = [];
let gi = 0;
U.forEach((su, si) => {
  const name = su.name.replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '').replace(/ٱ/g, 'ا').replace(/^سورةs+/, '').trim();
  const FIX = {'ال عمران': 'آل عمران', 'سبإ': 'سبأ', 'النبإ': 'النبأ'};
  const nm = name.replace(/^سورة[^ء-ي]+/, '');
  surahs.push([FIX[nm] || nm, su.ayahs.length, gi]);
  su.ayahs.forEach((a, ai) => {
    let uw = uthWords(a.text), sw = simWords(S[si].ayahs[ai].text);
    // البسملة مدمجة في أول آية من كل سورة عدا الفاتحة والتوبة
    if (ai === 0 && si !== 0 && si !== 8){
      if (strip(uw.slice(0, 4).join('')) !== 'بسماللهالرحمنالرحيم') throw new Error('بسملة غير متوقّعة ' + (si + 1));
      uw = uw.slice(4); sw = sw.slice(4);
    }
    let units;
    if (uw.length === sw.length) units = uw.map((w, k) => [w, sw[k]]);
    else { const r = alignAyah(uw, sw); units = r.units; report.push([r.cost / units.length, `${si+1}:${ai+1}`, r.units.filter(u => u[1].includes(' ') || u[0].includes(' ') && !MARK.test(u[0].split(' ')[1] || '')).map(u => u.join('=')).join(' ، ')]); }
    ayat.push([a.page, a.juz, units.map(u => u[0]).join('\t'), units.map(u => u[1]).join('\t')]);
    gi++;
  });
});

report.sort((a, b) => b[0] - a[0]);
console.log('آيات مُحاذاة:', report.length);
report.slice(0, 8).forEach(r => console.log(r[0].toFixed(2), r[1], r[2]));
const words = ayat.reduce((t, a) => t + a[2].split('\t').length, 0);
console.log('surahs', surahs.length, 'ayat', ayat.length, 'units', words, 'pages', ayat[ayat.length - 1][0]);
fs.mkdirSync(path.join(__dirname, '..', 'data'), {recursive: true});
fs.writeFileSync(path.join(__dirname, '..', 'data', 'quran.json'), JSON.stringify({surahs, ayat}));
