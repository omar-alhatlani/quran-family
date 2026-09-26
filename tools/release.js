// تجهيز النشر: يشغّل الاختبارات، ثم يرفع رقم الإصدار (?v=) لكل ملفّات الواجهة واسم ذاكرة التخزين المؤقت.
// ملفّات البيانات (data/*.json) لها إصدارها المستقل ولا تُمسّ.
// الاستعمال: node tools/release.js   ثم git commit وgit push
const fs = require('fs'), path = require('path'), {execFileSync} = require('child_process');
const ROOT = path.join(__dirname, '..');
try { execFileSync(process.execPath, [path.join(ROOT, 'tests', 'run.js')], {stdio: 'inherit'}); }
catch(e){ console.error('\n✗ فشلت الاختبارات: لم يُرفع الإصدار.'); process.exit(1); }
const ix = path.join(ROOT, 'index.html'), sw = path.join(ROOT, 'sw.js');
let h = fs.readFileSync(ix, 'utf8');
const cur = Math.max(...[...h.matchAll(/\?v=(\d+)/g)].map(m => +m[1])), v = cur + 1;
h = h.replace(/\?v=\d+/g, '?v=' + v);
fs.writeFileSync(ix, h);
let s = fs.readFileSync(sw, 'utf8');
s = s.replace(/'([^']+?)\?v=\d+'/g, (m, p) => p.startsWith('data/') ? m : `'${p}?v=${v}'`).replace(/'halaqa-v\d+'/, `'halaqa-v${v}'`);
fs.writeFileSync(sw, s);
console.log(`\n✓ الاختبارات ناجحة، والإصدار الآن ${v}.`);
