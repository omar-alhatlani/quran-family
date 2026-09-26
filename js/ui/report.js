/* حلقة البيت · report.js — جزء من الواجهة (ملفّات js/ui تُحمَّل بالترتيب في index.html وتتشارك النطاق العام) */
/* ================= التقرير ================= */
let repDays = 7;
function viewReport(pid){
  const p = Store.profile(pid), rm = reciteMode(pid);
  Cloud.loadSessions(pid).then(ch => { if (ch && location.hash === '#/report') viewReport(pid); }).catch(() => {});
  setTop('تقرير ' + p.name, '#/home');
  const m = Stats.memorized(pid), pr = Stats.period(pid, repDays), cov = Stats.coverage(pid), wk = Stats.weekly(pid), weak = Stats.weakSpots(pid);
  const max = Math.max(...wk, 1);
  const bw = 34, gap = 10, H = 120, Wd = wk.length * (bw + gap);
  const chart = `<svg viewBox="0 0 ${Wd} ${H + 34}" role="img" aria-label="الكلمات المسمَّعة في آخر ٨ أسابيع">
    <line x1="0" x2="${Wd}" y1="${H}" y2="${H}" stroke="var(--line)"/>
    ${wk.map((v, k) => { const h = v / max * (H - 18), x = Wd - (k + 1) * (bw + gap) + gap / 2;
      return `<rect x="${x}" y="${H - h}" width="${bw}" height="${Math.max(h, v ? 2 : 0)}" rx="4" fill="${k === wk.length - 1 ? 'var(--accent)' : 'var(--unrev)'}"/>
      ${v ? `<text class="v" x="${x + bw / 2}" y="${H - h - 5}" text-anchor="middle">${AR(v)}</text>` : ''}
      <text x="${x + bw / 2}" y="${H + 16}" text-anchor="middle">${k === wk.length - 1 ? 'هذا' : AR(wk.length - 1 - k)}</text>`; }).join('')}
    <text x="${Wd / 2}" y="${H + 32}" text-anchor="middle">الأسابيع الماضية ← هذا الأسبوع</text></svg>`;
  app.innerHTML = `
    <section class="panel">
      <h2>المحفوظ</h2>
      <div class="kv">
        <div><b>${Q.dec(m.juz)}</b><span>جزء</span></div>
        <div><b>${Q.dec(m.pages)}</b><span>وجه من ${AR(604)}</span></div>
        <div><b>${AR(m.ayat)}</b><span>آية من ${AR(6236)}</span></div>
        <div><b>${AR(m.words)}</b><span>كلمة</span></div>
        <div><b>${AR(m.letters)}</b><span>حرف</span></div>
        <div><b>${Q.dec(m.pct)}٪</b><span>من القرآن</span></div>
      </div>
      <div class="qbar"><i style="width:${m.pct}%"></i></div>
    </section>
    <section class="panel">
      <div class="row between"><h2>التسميع والمراجعة</h2>
        <div class="seg" role="group" aria-label="المدّة">${[[7, 'أسبوع'], [30, 'شهر'], [0, 'الكل']].map(([v, t]) => `<button type="button" data-d="${v}" aria-pressed="${repDays === v}">${t}</button>`).join('')}</div></div>
      <div class="kv">
        <div><b>${AR(pr.sessions)}</b><span>جلسة تسميع</span></div>
        <div><b>${AR(pr.words)}</b><span>كلمة مسمَّعة</span></div>
        <div><b>${AR(pr.letters)}</b><span>حرف</span></div>
        <div><b>${Q.dec(pr.pages)}</b><span>وجه</span></div>
        <div><b>${pr.acc === null ? '—' : AR(Math.round(pr.acc)) + '٪'}</b><span>دقّة التسميع</span></div>
        <div><b>${pr.errPer100 === null ? '—' : Q.dec(pr.errPer100)}</b><span>خطأ لكل ١٠٠ كلمة</span></div>
      </div>
      <p class="small">${AR(pr.review)} مراجعة و${AR(pr.fresh)} حفظ جديد.</p>
      <div class="note">والحرف بعشر أمثالها. عدد الأحرف هنا لما سمّعته فقط، والأجر عند الله.</div>
    </section>
    <section class="panel">
      <h2>تغطية المراجعة</h2>
      <p style="margin:6px 0 0"><b style="font-size:26px;color:var(--accent)">${cov === null ? '—' : AR(Math.round(cov)) + '٪'}</b>
        <span class="small">من محفوظك سُمِّع خلال آخر أسبوعين</span></p>
      <div class="qbar"><i style="width:${cov || 0}%"></i></div>
      <p class="small">كلما اقتربت من ١٠٠٪ كان حفظك أثبت. خريطة «قوة المراجعة» تبيّن أي الأوجه تحتاجك.</p>
    </section>
    ${certList(pid)}
    <section class="panel chart"><h2>الكلمات المسمَّعة أسبوعيًّا</h2>${chart}</section>
    <section class="panel">
      <div class="row between"><h2>مواضع تحتاج انتباهًا</h2>${weak.length && rm === 'self' ? '<a class="btn small primary" href="#/drill">تدرّب عليها</a>' : ''}</div>
      ${weak.length ? `<ul class="list">${weak.map(x => `<li><span><span class="q">${x.word}</span> <span class="small">${Q.label(x.i)} · أخطأت فيها ${count(x.c, 'مرة', 'مرتين', 'مرات', 'مرة')}</span></span>
        ${rm ? `<a class="btn small primary" href="${segHref(pid, rm, x.i, x.i)}">${rm === 'self' ? 'سمّع الآية' : 'سمّع له الآية'}</a>` : ''}</li>`).join('')}</ul>`
        : '<p class="small">لا مواضع ضعف حتى الآن. تظهر هنا الكلمات التي تتكرّر أخطاؤك فيها، وتختفي حين تقرؤها صحيحة.</p>'}
    </section>`;
  $$('.seg button').forEach(bt => bt.onclick = () => { repDays = +bt.dataset.d; viewReport(pid); });
}

