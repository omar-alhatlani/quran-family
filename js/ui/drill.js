/* حلقة البيت · drill.js — جزء من الواجهة (ملفّات js/ui تُحمَّل بالترتيب في index.html وتتشارك النطاق العام) */
/* ================= تدرّب على مواضع ضعفك ================= */
let drill = null;   // {pid, items: [[أ، ب]], k, before: مجموع الأخطاء قبل التدريب}
const ICON_TARGET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>';
// نصّ مقطع بالعثماني مع تظليل الكلمات التي تكرّر خطؤها
function weakText(pid, a, b){
  const mis = Store.data(pid).mis || {};
  let out = '';
  for (let i = a; i <= b; i++) Q.ayahWords(i).forEach(w => { out += (mis[w.g] > 0 ? `<mark title="أخطأت فيها ${mis[w.g]}">${w.u}</mark>` : w.u) + ' '; });
  return out;
}
function viewDrill(pid){
  const p = Store.profile(pid);
  if (!Cloud.canRecite(p)) return location.replace('#/home');
  setTop('مواضع ضعفك', '#/home');
  const items = Stats.weakItems(pid), mis = Store.data(pid).mis || {};
  if (!items.length){
    app.innerHTML = `<section class="panel today met"><h2>لا مواضع ضعف الآن</h2>
      <p class="small">ما شاء الله. تظهر هنا الكلمات التي تتكرّر أخطاؤك فيها أثناء التسميع، وتختفي حين تقرؤها صحيحة.</p>
      <a class="btn" href="#/home">رجوع</a></section>`;
    return;
  }
  const cnt = (a, b) => { let n = 0; for (let i = a; i <= b; i++) Q.ayahWords(i).forEach(w => { if (mis[w.g] > 0) n += mis[w.g]; }); return n; };
  app.innerHTML = `
    <section class="panel">
      <h2>مواضع ضعفك</h2>
      <p class="small" style="margin:4px 0 0">المظلَّل كلماتٌ أخطأت فيها أكثر من مرة. سمّع كل مقطع للبرنامج؛ وكلما قرأتها صحيحة خفّ أثرها حتى تزول من هنا.</p>
    </section>
    <ol class="drill-list">${items.map(([a, b]) => `<li>
      <div class="small">${itemLabel(a, b)}${cnt(a, b) ? ` · أخطأت فيها ${count(cnt(a, b), 'مرة', 'مرتين', 'مرات', 'مرة')}` : ''}</div>
      <p class="q">${weakText(pid, a, b)}</p></li>`).join('')}</ol>
    <button class="btn primary big" id="dStart" type="button">${ICON.mic} ابدأ التدريب (${count(items.length, 'مقطع واحد', 'مقطعان', 'مقاطع', 'مقطعًا')})</button>`;
  $('#dStart').onclick = () => {
    drill = {pid, items, k: 0, before: Stats.misTotal(pid)};
    const [a, b] = items[0]; location.hash = `#/tasmee/${Q.sur[a]}/${Q.num[a]}/${Q.num[b]}`;
  };
}
// بعد كل تسميع في التدريب: المقطع التالي، أو الخلاصة
function drillNext(pid, A, B){
  if (!drill || drill.pid !== pid) return null;
  const k = drill.items.findIndex(([a, b]) => a === A && b === B);
  if (k < 0) return null;
  drill.k = k + 1;
  if (drill.k < drill.items.length){ const [a, b] = drill.items[drill.k]; return {href: tasmeeHref(a, b), label: `التالي في التدريب (${AR(drill.k + 1)} من ${AR(drill.items.length)})`}; }
  const healed = Math.max(0, drill.before - Stats.misTotal(pid));
  const res = {href: '#/drill', label: 'أنهيت التدريب ✓', note: healed ? `خفّ أثر ${count(healed, 'موضع واحد', 'موضعين', 'مواضع', 'موضعًا')} من مواضع ضعفك.` : 'استمرّ، فالمواضع تزول بتكرار القراءة الصحيحة.'};
  drill = null;
  return res;
}

