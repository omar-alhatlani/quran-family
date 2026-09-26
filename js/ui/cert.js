/* حلقة البيت · cert.js — جزء من الواجهة (ملفّات js/ui تُحمَّل بالترتيب في index.html وتتشارك النطاق العام) */
/* ================= شهادات إتمام الأجزاء ================= */
const JUZ_NAMES = ['', 'الم', 'سيقول', 'تلك الرسل', 'لن تنالوا', 'والمحصنات', 'لا يحب الله', 'وإذا سمعوا', 'ولو أننا', 'قال الملأ',
  'واعلموا', 'يعتذرون', 'وما من دابة', 'وما أبرئ', 'ربما', 'سبحان', 'قال ألم', 'اقترب', 'قد أفلح', 'وقال الذين', 'أمن خلق',
  'اتل ما أوحي', 'ومن يقنت', 'وما لي', 'فمن أظلم', 'إليه يرد', 'حم', 'قال فما خطبكم', 'قد سمع', 'تبارك', 'عمّ'];
const juzTitle = j => `الجزء ${AR(j)} (جزء ${JUZ_NAMES[j]})`;
// الأجزاء المكتملة: {الجزء: اليوم}؛ القيمة السالبة = اكتمل قبل تفعيل الشهادات (تاريخه غير معروف بدقّة)
function certsOf(pid, write){
  const d = Store.data(pid), m = Store.mem(pid), c = d.certs = d.certs || {};
  let changed = false;
  for (let j = 1; j <= 30; j++){
    let full = true; for (let i = Q.juzFirst[j]; i <= Q.juzLast[j]; i++) if (!m[i]){ full = false; break; }
    if (full && !c[j]){ c[j] = -(typeof d.mapLock === 'number' ? Store.dayOf(d.mapLock) : Store.today()); changed = true; }
    else if (!full && c[j]){ delete c[j]; changed = true; }
  }
  if (changed && write) Store.touch(pid);
  return c;
}
// بطاقة التهنئة في الرئيسية: جزء اكتمل خلال آخر ٧ أيام ولم تُفتح شهادته بعد
function certCard(pid, own){
  const c = certsOf(pid, own), seen = Store.pref('certSeen', {})[pid] || [];
  const j = Object.keys(c).map(Number).find(k => c[k] > 0 && Store.today() - c[k] <= 7 && !seen.includes(k));
  if (!j) return '';
  const p = Store.profile(pid);
  return `<a class="panel cert-card" href="#/cert/${j}"><span class="cc-ic">🎉</span>
    <span><b>${own ? 'أتممت' : esc(p.name) + ':'} حفظ ${juzTitle(j)}!</b><span class="small">${own ? 'اعرض شهادتك واطبعها.' : 'اعرض شهادته.'}</span></span></a>`;
}
function certList(pid){
  const c = certsOf(pid, false), js = Object.keys(c).map(Number).sort((a, b) => b - a);
  if (!js.length) return '';
  return `<section class="panel"><h2>الشهادات</h2><ul class="list">${js.map(j => `<li><span>🏅 ${juzTitle(j)}</span><a class="btn small" href="#/cert/${j}">اعرض</a></li>`).join('')}</ul></section>`;
}
// الشهادة: صفحة للطباعة أو الحفظ PDF
function viewCert(pid, [j]){
  const p = Store.profile(pid), c = certsOf(pid, false);
  if (!p || !c[j]) return location.replace('#/home');
  const seen = Store.pref('certSeen', {}); seen[pid] = [...new Set([...(seen[pid] || []), j])]; Store.setPref('certSeen', seen);
  setTop('شهادة ' + p.name, '#/home');
  document.body.classList.add('cert-mode');
  const day = Math.abs(c[j]);
  const greg = new Date(day * 864e5).toLocaleDateString('ar-SA-u-ca-gregory', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'});
  const hij = new Date(day * 864e5).toLocaleDateString('ar-SA-u-ca-islamic-umalqura', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'});
  const fam = Cloud.st.family ? Cloud.st.family.name : '';
  app.innerHTML = `
    <div class="cert-actions"><button class="btn primary" id="cPrint" type="button">طباعة أو حفظ PDF</button><a class="btn" href="#/home">رجوع</a></div>
    <article class="cert" style="--c:${p.color}">
      <div class="cert-in">
        <div class="cert-bas">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>
        <div class="cert-t">شهادة إتمام حفظ</div>
        <p class="cert-l">${fam ? `تشهد حلقة ${esc(fam)} بإتمام` : 'تشهد حلقة البيت بإتمام'}</p>
        <div class="cert-name">${esc(p.name)}</div>
        <p class="cert-l">حفظ</p>
        <div class="cert-juz">${juzTitle(j)}</div>
        <p class="cert-l">من كتاب الله العزيز${c[j] > 0 ? `، في ${hij} الموافق ${greg}` : ''}.</p>
        <p class="cert-dua">جعل الله القرآن حجّةً لـ${esc(p.name)}، ورفع به الدرجات، ونفع به.</p>
        <div class="cert-foot"><span>﴿وَرَتِّلِ ٱلْقُرْءَانَ تَرْتِيلًا﴾</span><span>حلقة البيت</span></div>
      </div>
    </article>`;
  $('#cPrint').onclick = () => window.print();
  cleanup = () => document.body.classList.remove('cert-mode');
}

