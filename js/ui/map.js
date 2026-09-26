/* حلقة البيت · map.js — جزء من الواجهة (ملفّات js/ui تُحمَّل بالترتيب في index.html وتتشارك النطاق العام) */
/* ================= الخريطة ================= */
let mapMode = 'mem', mapSel = 0, openSurah = 0;
// الخريطة مفتوحة للرسم الأول، ثم تُقفل: بزرّ «أنهيت رسم خريطتي» أو تلقائيًّا بوضع أول هدف.
// بعد القفل لا يُضاف محفوظ من الخريطة (الإضافة بالتسميع فقط)، وتبقى الإزالة. وليّ الأمر يعيد فتح الرسم.
const mapLocked = pid => { const d = Store.data(pid); return d.mapLock === 'open' ? false : !!(d.mapLock || d.goal); };
function viewMap(pid){
  setTop('خريطة الحفظ', '#/home');
  const edit = Cloud.canEdit(Store.profile(pid)), rmode = reciteMode(pid), locked = mapLocked(pid);
  const pOwn = Store.profile(pid), canReopen = pOwn.cloud ? isOwner() : true;
  const today = Store.today(), m = Store.mem(pid);
  const byJuz = Array.from({length: 31}, () => []);
  for (let pg = 1; pg <= Q.PAGES; pg++) byJuz[Q.juz[Q.pageFirst[pg]]].push(pg);
  const juzState = j => { let a = 0, t = 0; for (let i = Q.juzFirst[j]; i <= Q.juzLast[j]; i++){ t++; a += m[i]; } return a === 0 ? '' : a === t ? 'full' : 'part'; };
  const surState = s => { let a = 0; for (let i = s.start; i < s.start + s.count; i++) a += m[i]; return a; };
  const cellHTML = pg => {
    const info = Stats.pageInfo(pid, pg, today);
    return `<button class="cell ${mapMode === 'rev' && info.state ? info.state : ''} ${pg === mapSel ? 'sel' : ''}" type="button" data-pg="${pg}" style="--f:${info.frac.toFixed(2)}" aria-label="الوجه ${pg}"></button>`;
  };
  app.innerHTML = `
    <div class="row between" style="margin-top:14px">
      <div class="seg" role="group" aria-label="طريقة العرض">
        <button type="button" data-m="mem" aria-pressed="${mapMode === 'mem'}">الحفظ</button>
        <button type="button" data-m="rev" aria-pressed="${mapMode === 'rev'}">قوة المراجعة</button>
      </div>
      <span class="small">كل مربع وجه، وكل سطر جزء</span>
    </div>
    <div class="legend">${mapMode === 'mem'
      ? '<span><i style="background:var(--accent)"></i>محفوظ</span><span><i style="background:linear-gradient(to top,var(--accent) 50%,var(--cell) 0)"></i>محفوظ جزئيًّا</span><span><i style="background:var(--cell)"></i>لم يُحفظ</span>'
      : '<span><i style="background:var(--fresh)"></i>ثابت</span><span><i style="background:var(--stale)"></i>يحتاج مراجعة</span><span><i style="background:var(--weak)"></i>ضعيف</span><span><i style="background:var(--unrev)"></i>لم يُسمَّع بعد</span>'}</div>
    <div class="grid ${mapMode === 'rev' ? 'rv' : ''}">${byJuz.slice(1).map((pages, k) =>
      `<div class="jrow"><span class="jn">${AR(k + 1)}</span><div class="cells">${pages.map(cellHTML).join('')}</div></div>`).join('')}</div>
    <section class="panel" id="sheet" ${mapSel ? '' : 'hidden'}></section>
    ${edit ? '' : '<p class="note">خريطة ' + esc(Store.profile(pid).name) + ' للاطّلاع فقط.</p>'}
    ${!edit ? '' : locked ? `<section class="panel lockp">
        <h3>🔒 الخريطة مكتملة</h3>
        <p class="small" style="margin:4px 0 0">لا يُضاف حفظ جديد إلا بتسميعه: للبرنامج أو لأحد أهلك. ويمكنك إزالة ما نسيته.</p>
        ${canReopen ? '<p style="margin:8px 0 0"><button class="btn small" id="reopen" type="button">إعادة فتح الرسم</button></p>' : ''}
      </section>` : m.some(x => x) ? `<section class="panel today">
        <h3>ارسم كل ما تحفظه الآن</h3>
        <p class="small" style="margin:4px 0 8px">بعد إنهاء الرسم (أو وضع أول هدف) لا يُضاف حفظ جديد إلا بتسميع.</p>
        <div class="row"><a class="btn primary" href="#/start/2">التالي: اختر مستواك</a>
        <button class="btn" id="lockMap" type="button">أنهيت رسم خريطتي</button></div>
      </section>` : ''}
    <section class="panel" ${edit && !locked ? '' : 'hidden'}>
      <h3>تعليم سريع بالجزء</h3>
      <p class="small" style="margin:2px 0 0">اضغط الجزء الذي تحفظه كاملًا، واضغطه مرّة أخرى لإلغائه.</p>
      <div class="chips">${Array.from({length: 30}, (_, k) => `<button type="button" class="jchip ${juzState(k + 1)}" data-j="${k + 1}">${AR(k + 1)}</button>`).join('')}</div>
    </section>
    <section class="panel" ${edit ? '' : 'hidden'}>
      <h3>السور</h3>
      <div class="slist">${Q.surahs.map(s => {
        const a = surState(s), st = a === 0 ? '—' : a === s.count ? 'كاملة' : `${AR(a)} من ${AR(s.count)}`;
        return `<div class="srow" data-s="${s.n}">
          <div class="h"><span class="nm">${AR(s.n)}. ${s.name}<small>${count(s.count, 'آية واحدة', 'آيتان', 'آيات', 'آية')}</small></span>
            <span class="st ${a === s.count ? 'full' : ''}">${st}</span>
            ${locked ? (a ? '<button class="btn small" type="button" data-act="toggle">إزالة</button>' : '')
              : `<button class="btn small" type="button" data-act="toggle">${a === s.count ? 'إلغاء' : 'كاملة'}</button>`}
            ${!locked || a ? `<button class="btn small" type="button" data-act="range" aria-expanded="${openSurah === s.n}">آيات</button>` : ''}</div>
          ${openSurah === s.n ? `<div class="rng">
            <label>من</label><select data-r="a">${Array.from({length: s.count}, (_, k) => `<option value="${k + 1}">${AR(k + 1)}</option>`).join('')}</select>
            <label>إلى</label><select data-r="b">${Array.from({length: s.count}, (_, k) => `<option value="${k + 1}" ${k + 1 === s.count ? 'selected' : ''}>${AR(k + 1)}</option>`).join('')}</select>
            ${locked ? '' : '<button class="btn small primary" type="button" data-act="mark">محفوظة</button>'}
            <button class="btn small" type="button" data-act="unmark">غير محفوظة</button></div>` : ''}
        </div>`;
      }).join('')}</div>
    </section>`;

  const rerender = () => { const y = scrollY; viewMap(pid); scrollTo(0, y); };
  if ($('#lockMap')) $('#lockMap').onclick = () => {
    if (!confirm('بعد إنهاء الرسم لا يُضاف حفظ جديد من الخريطة، بل بالتسميع فقط. هل رسمت كل ما تحفظه؟')) return;
    Store.data(pid).mapLock = Date.now(); Store.touch(pid); rerender();
  };
  if ($('#reopen')) $('#reopen').onclick = () => {
    if (!confirm('إعادة فتح الرسم تسمح بإضافة المحفوظ من الخريطة مباشرة. متابعة؟')) return;
    Store.data(pid).mapLock = 'open'; Store.touch(pid); rerender();
  };
  $$('.seg button').forEach(b => b.onclick = () => { mapMode = b.dataset.m; rerender(); });
  $$('.cell').forEach(c => c.onclick = () => { mapSel = +c.dataset.pg; rerender(); $('#sheet').scrollIntoView({behavior: 'smooth', block: 'nearest'}); });
  $$('.jchip').forEach(b => b.onclick = () => {
    const j = +b.dataset.j, full = b.classList.contains('full');
    if (full && !confirm(`إلغاء تعليم الجزء ${AR(j)} كاملًا؟`)) return;
    Store.setMem(pid, Q.juzFirst[j], Q.juzLast[j], !full); rerender();
  });
  $$('.srow').forEach(r => {
    const s = Q.surahs[r.dataset.s - 1];
    const tg = r.querySelector('[data-act=toggle]');
    if (tg) tg.onclick = () => {
      const full = surState(s) === s.count, remove = locked || full;
      if (remove && !confirm(`إزالة سورة ${s.name} من محفوظك؟`)) return;
      Store.setMem(pid, s.start, s.start + s.count - 1, !remove); rerender();
    };
    const rg = r.querySelector('[data-act=range]');
    if (rg) rg.onclick = () => { openSurah = openSurah === s.n ? 0 : s.n; rerender(); };
    const mk = r.querySelector('[data-act=mark]'), un = r.querySelector('[data-act=unmark]');
    const rng = () => { let a = +r.querySelector('[data-r=a]').value, b = +r.querySelector('[data-r=b]').value; if (a > b) [a, b] = [b, a]; return [s.start + a - 1, s.start + b - 1]; };
    if (mk) mk.onclick = () => { const [a, b] = rng(); Store.setMem(pid, a, b, true); rerender(); };
    if (un) un.onclick = () => { const [a, b] = rng(); Store.setMem(pid, a, b, false); rerender(); };
  });

  // بطاقة الوجه المختار
  if (mapSel){
    const pg = mapSel, info = Stats.pageInfo(pid, pg, today), rev = Store.data(pid).rev;
    const segs = Q.pageSegments(pg);
    $('#sheet').innerHTML = `
      <div class="row between"><h3>الوجه ${AR(pg)} <span class="small">· الجزء ${AR(Q.juz[Q.pageFirst[pg]])}</span></h3>
        ${info.state ? `<span class="chip ${info.state}">${STATE_TXT[info.state]}</span>` : ''}</div>
      <ul class="list">${segs.map(([a, b]) => {
        let n = 0; for (let i = a; i <= b; i++) n += m[i];
        const all = n === b - a + 1, last = Math.max(...Array.from({length: b - a + 1}, (_, k) => rev[a + k] ? rev[a + k][0] : -1));
        return `<li data-a="${a}" data-b="${b}"><span><span class="q">${Q.rangeLabel(a, b)}</span>
          <span class="small"> · ${n === 0 ? 'غير محفوظ' : all ? 'محفوظ' : `محفوظ ${AR(n)} من ${AR(b - a + 1)}`}${last >= 0 ? ' · سُمِّع ' + ago(Date.now() - (today - last) * 864e5) : ''}</span></span>
          ${edit ? `<span class="row">${locked && !n ? '' : `<button class="btn small" type="button" data-act="t">${locked ? 'إزالة' : all ? 'إلغاء' : 'محفوظ'}</button>`}
          ${rmode ? `<a class="btn small primary" href="${segHref(pid, rmode, a, b)}">${rmode === 'self' ? 'سمّع' : 'سمّع له'}</a>` : ''}</span>` : ''}</li>`;
      }).join('')}</ul>`;
    if (edit) $$('#sheet li').forEach(li => { const t = li.querySelector('[data-act=t]'); if (t) t.onclick = () => {
      const a = +li.dataset.a, b = +li.dataset.b; let n = 0; for (let i = a; i <= b; i++) n += m[i];
      const add = !locked && n !== b - a + 1;
      if (!add && locked && !confirm('إزالة هذا المقطع من محفوظك؟')) return;
      Store.setMem(pid, a, b, add); rerender();
    }; });
  }
}

