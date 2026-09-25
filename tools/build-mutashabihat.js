// يبني data/mutashabihat.json: لكل آية أقرب الآيات إليها لفظًا (المتشابهات)
// الطريقة: كل آية = مجموعة «ثلاثيات» كلماتها المتتالية (بعد التطبيع)؛ تُرشَّح الأزواج بفهرس الثلاثيات،
// ثم يُحسب التشابه = المشترك ÷ الأصغر من المجموعتين، ويُبقى ما بلغ الحدّ مع طول معقول.
// الاستعمال: node tools/build-mutashabihat.js
const fs = require('fs'), path = require('path');
const q = require(path.join(__dirname, '..', 'data', 'quran.json'));
const norm = w => w.replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
  .replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[ؤئ]/g, 'ء').replace(/[^ء-ي]/g, '');
const sur = [];
q.surahs.forEach(([, count, start], s) => { for (let k = 0; k < count; k++) sur[start + k] = s + 1; });

// مقياسان: نسبة الكلمات المشتركة (تلتقط الاختلاف المتفرّق مثل البقرة ٥٨ والأعراف ١٦١)،
// ونسبة الثنائيات المشتركة (تحفظ ترتيب الكلام فلا تُعدّ آيتان بالكلمات نفسها مبعثرةً متشابهتين)
const MIN_WORDS = 5, WORD_TH = 0.7, BI_TH = 0.3, COMMON = 150, TOP = 4;
const words = q.ayat.map(a => a[3].split('\t').join(' ').split(/\s+/).map(norm).filter(Boolean));
const bigrams = words.map(ws => { const s = new Set(); for (let i = 0; i + 1 < ws.length; i++) s.add(ws[i] + ' ' + ws[i + 1]); return s; });
const bag = ws => { const m = new Map(); ws.forEach(w => m.set(w, (m.get(w) || 0) + 1)); return m; };
const bags = words.map(bag);
const index = new Map();
bigrams.forEach((s, i) => { if (words[i].length < MIN_WORDS) return; s.forEach(g => { if (!index.has(g)) index.set(g, []); index.get(g).push(i); }); });

const near = {};
let pairs = 0;
for (let i = 0; i < words.length; i++){
  if (words[i].length < MIN_WORDS) continue;
  const cnt = new Map();
  bigrams[i].forEach(g => { const L = index.get(g); if (!L || L.length > COMMON) return; L.forEach(j => { if (j !== i) cnt.set(j, (cnt.get(j) || 0) + 1); }); });
  const cand = [];
  cnt.forEach((c, j) => {
    if (c < 3) return;
    const bi = c / Math.min(bigrams[i].size, bigrams[j].size);
    let common = 0; bags[i].forEach((n, w) => { common += Math.min(n, bags[j].get(w) || 0); });
    const wd = common / Math.min(words[i].length, words[j].length);
    const same = words[i].join(' ') === words[j].join(' ');
    // الآية المكرّرة حرفيًّا في السورة نفسها (مثل ﴿فبأي آلاء ربكما تكذبان﴾) ليست موضع اشتباه
    if (wd >= WORD_TH && bi >= BI_TH && !(same && sur[i] === sur[j])) cand.push([j, +((wd + bi) / 2).toFixed(2)]);
  });
  cand.sort((a, b) => b[1] - a[1]);
  if (cand.length){ near[i] = cand.slice(0, TOP); pairs += near[i].length; }
}
fs.writeFileSync(path.join(__dirname, '..', 'data', 'mutashabihat.json'), JSON.stringify(near));
const label = i => `${q.surahs[sur[i] - 1][0]} ${i - q.surahs[sur[i] - 1][2] + 1}`;
console.log('ayat with similar:', Object.keys(near).length, 'links:', pairs,
  'size KB:', (fs.statSync(path.join(__dirname, '..', 'data', 'mutashabihat.json')).size / 1024).toFixed(1));
// عيّنة للتحقّق
const idx = (s, a) => q.surahs[s - 1][2] + a - 1;
[[2, 58], [2, 35], [2, 49], [67, 1], [7, 161], [2, 4]].forEach(([s, a]) => {
  const i = idx(s, a); console.log(label(i), '→', (near[i] || []).map(([j, v]) => label(j) + ' (' + v + ')').join('، ') || '—');
});
