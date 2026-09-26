/* حلقة البيت · home.js — جزء من الواجهة (ملفّات js/ui تُحمَّل بالترتيب في index.html وتتشارك النطاق العام) */
/* ================= الرئيسية ================= */
function viewHome(pid){
  const p = Store.profile(pid); setTop('حلقة البيت', '#/');
  const av = $('#topWho .av'); if (av) av.remove();   // يبقى عدّاد الطلبات
  const m = Stats.memorized(pid), sg = Stats.suggest(pid), d = Store.data(pid);
  const recent = d.sess.slice(-5).reverse();
  const edit = Cloud.canEdit(p), own = Cloud.mine(p);
  app.innerHTML = `
    <section class="who">${avatar(p)}<div><h1>${esc(p.name)}</h1><a href="#/" class="small">${own || !p.cloud ? 'تبديل الفرد' : 'رجوع إلى الحلقة'}</a></div></section>
    ${edit ? (own || !p.cloud ? '' : `<p class="note">تدير هذا الملف بصفتك ${T('guardian')}.</p>`) : '<p class="note">تعرض ملف ' + esc(p.name) + ' للاطّلاع فقط.</p>'}
    <div class="mini-stats" aria-label="المحفوظ">
      <span><b>${Q.dec(m.juz)}</b> جزء</span><span><b>${Q.dec(m.pages)}</b> وجه</span><span><b>${AR(m.ayat)}</b> آية</span><span><b>${Q.dec(m.pct)}٪</b> من القرآن</span>
    </div>
    <div class="qbar" aria-hidden="true"><i style="width:${m.pct}%"></i></div>
    ${own ? peerBanner() : ''}
    ${own ? majlisCard() : ''}
    ${m.words ? certCard(pid, Cloud.canEdit(p)) : ''}
    ${hwCard(pid)}
    ${!m.words ? (edit ? `
      <section class="panel today">
        <h2>لنبدأ</h2>
        <p>ثلاث خطوات قصيرة: ماذا تحفظ الآن، ثم مستواك، ثم تبدأ يومك.</p>
        <a class="btn primary" href="#/start">ابدأ</a>
      </section>` : '') : `<div class="today-grid">${hifzCard(pid, reciteMode(pid))}${wirdCard(pid, edit, sg, reciteMode(pid))}</div>`}
    ${goalPanel(pid, edit)}
    ${tankLine()}
    ${listenLine(pid)}
    <nav class="actions">
      ${Cloud.canRecite(p) ? `<a class="act" href="#/tasmee">${ICON.mic}سمّع للبرنامج</a>` : ''}
      ${own && p.cloud ? `<a class="act" href="#/ask">${ICON_EAR}اطلب تسميعًا</a>` : ''}
      ${!own && p.cloud && meId() ? `<a class="act" href="#/listen/new/${pid}">${ICON_EAR}سمّع لـ${esc(p.name)}</a>` : ''}
      ${Cloud.canRecite(p) && Stats.weakItems(pid, 1).length ? `<a class="act" href="#/drill">${ICON_TARGET}مواضع ضعفك</a>` : ''}
      ${Cloud.canRecite(p) ? `<a class="act" href="#/mut">${ICON_TWIN}المتشابهات</a>` : ''}
      <a class="act" href="#/map">${ICON.map}خريطة الحفظ</a>
      <a class="act" href="#/report">${ICON.chart}التقرير</a>
    </nav>
    ${recent.length ? `<section class="panel"><h3>آخر التسميعات</h3><ul class="list">${recent.map(s => `
      <li><span>${Q.rangeLabel(s.a, s.b)} <span class="small">· ${s.kind === 'review' ? 'مراجعة' : 'حفظ جديد'}${s.byName ? ' · بتسميع ' + esc(s.byName) : ''} · ${ago(s.t)} ${new Date(s.t).toLocaleTimeString('ar-SA', {hour: 'numeric', minute: '2-digit'})}</span></span><b>${AR(s.pct)}٪</b>${s.note ? `<span class="snote">«${esc(s.note)}»</span>` : ''}</li>`).join('')}</ul></section>` : ''}
    ${!p.cloud || isOwner() ? `<p class="row" style="justify-content:center;margin-top:24px">
      ${p.cloud && !own && Array.isArray(p.uids) && p.uids.length ? '<button class="btn small" id="rel" type="button">السماح بربطه بجهاز جديد</button>' : ''}
      <button class="btn small danger" id="del" type="button">حذف ملف ${esc(p.name)}</button></p>` : ''}`;
  bindPeerBanner(); bindHifz(pid); bindHw(pid);
  if ($('#rel')) $('#rel').onclick = async () => {
    if (!confirm(`سيُفكّ ربط ${p.name} بجهازه الحالي، ثم يختار «أنا ${p.name}» من جواله الجديد. متابعة؟`)) return;
    try { await Cloud.releaseMember(pid); viewHome(pid); } catch(e){ alert('تعذّر ذلك. تأكّد من الاتصال.'); }
  };
  if ($('#del'))
 $('#del').onclick = async () => {
    if (!p.cloud){
      if (confirm(`سيُحذف ملف ${p.name} وكل تسميعاته من هذا الجهاز. متأكّد؟`)){ Store.removeProfile(pid); location.hash = '#/'; }
      return;
    }
    if (!isOwner()) return alert('حذف الأفراد لوليّ أمر الحلقة فقط.');
    if (!confirm(`سيُحذف ${p.name} من حلقة العائلة على كل الأجهزة. متأكّد؟`)) return;
    try { await Cloud.removeMember(pid); Store.removeProfile(pid); location.hash = '#/'; }
    catch(e){ alert('تعذّر الحذف. تأكّد من الاتصال ثم أعد المحاولة.'); }
  };
  // جلسات هذا الفرد من الأجهزة الأخرى
  Cloud.loadSessions(pid).then(ch => { if (ch && location.hash === '#/home' && Store.cur === pid) viewHome(pid); }).catch(() => {});
}

/* ================= الأهداف ================= */
// «٣ أوجه»، «وجهان»، «٢٫٥ وجه»: الكسور بصيغة المفرد، والأعداد الصحيحة بالتمييز
// المثنّى مجرور/منصوب افتراضًا («نحو وجهين»، «متأخّر وجهين»)، ومرفوع مع nom («بقي وجهان»)
const unitTxt = (n, u, nom) => {
  if (u === 'ayah') return count(Math.round(n), 'آية واحدة', nom ? 'آيتان' : 'آيتين', 'آيات', 'آية');
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) && r > 0 ? count(r, 'وجه واحد', nom ? 'وجهان' : 'وجهين', 'أوجه', 'وجهًا') : Q.dec(r) + ' وجه';
};
const dayDate = d => new Date(d * 864e5).toLocaleDateString('ar-SA-u-ca-gregory', {day: 'numeric', month: 'long', timeZone: 'UTC'});
const pct = (a, b) => b ? Math.min(100, a / b * 100) : 0;

// سطر مختصر لبطاقات الأفراد
function goalLine(p){
  const gs = Stats.goalStatus(p.id, Stats.weekShared(p.id, Cloud.canEdit(p) || !p.cloud));
  if (!gs) return '';
  if (gs.met) return '<small class="gline ok">✓ حقّق هدف الأسبوع</small>';
  const parts = [];
  if (gs.newT) parts.push(`حفظ ${gs.unit === 'ayah' ? AR(gs.newD) : Q.dec(gs.newD)}/${gs.unit === 'ayah' ? AR(gs.newT) : Q.dec(gs.newT)}`);
  if (gs.revT) parts.push(`مراجعة ${Q.dec(gs.revD)}/${Q.dec(gs.revT)}`);
  return `<small class="gline">الأسبوع: ${parts.join(' · ')}</small>`;
}

// لوحة «هدف هذا الأسبوع» في الرئيسية
function goalPanel(pid, edit){
  const d = Store.data(pid), m = Stats.memorized(pid);
  if (!d.goal) return edit && m.words ? `
    <section class="panel goal">
      <h2>ضع هدفك الأسبوعي</h2>
      <p class="small" style="margin:4px 0 10px">مقدار حفظ جديد كل أسبوع، ودورة مراجعة لمحفوظك.${Cloud.st.fid ? ' <b>ولن يُحسب لك نصيب في خزّان الحلقة حتى تضعه.</b>' : ''}</p>
      <a class="btn primary" href="#/start/2">اختر مستواك</a>
    </section>` : '';
  const gs = Stats.goalStatus(pid, Stats.weekShared(pid, edit)), bs = Stats.bigStatus(pid);
  const bar = (label, done, target, unit, ok) => `
      <div class="gl"><span>${label}</span><b>${unit === 'ayah' ? AR(Math.round(done)) : Q.dec(done)} من ${unitTxt(target, unit)}</b></div>
      <div class="qbar ${ok ? 'okb' : ''}"><i style="width:${pct(done, target)}%"></i></div>`;
  const left = gs.daysLeft;
  let perDay = '';
  if (gs.newT && !gs.newOk){
    const rem = gs.newT - gs.newD, days = Math.max(1, Math.min(left, gs.days || left));
    perDay = `<p class="small" style="margin:6px 0 0">يلزمك نحو ${unitTxt(rem / days, gs.unit)} حفظًا في اليوم لتدرك هدفك.</p>`;
  }
  return `
    <section class="panel goal ${gs.met ? 'met' : ''}">
      <div class="row between"><h2>هدف هذا الأسبوع</h2><span class="small">${left <= 1 ? 'آخر يوم · الجمعة' : `باقي ${count(left, 'يوم', 'يومان', 'أيام', 'يومًا')} · حتى الجمعة`}</span></div>
      ${gs.newT ? bar('حفظ جديد', gs.newD, gs.newT, gs.unit, gs.newOk) : ''}
      ${gs.revT ? bar('مراجعة', gs.revD, gs.revT, 'page', gs.revOk) : ''}
      ${gs.met ? '<p class="metmsg">أحسنت! حقّقت هدف هذا الأسبوع، بارك الله فيك.</p>' : perDay}
      ${bs ? `<div class="big-goal">
        <div class="gl"><span>الهدف الكبير: ${esc(bs.label)}</span><b>${AR(Math.round(bs.frac * 100))}٪</b></div>
        <div class="qbar"><i style="width:${bs.frac * 100}%"></i></div>
        <p class="small" style="margin:6px 0 0">${bs.done ? 'تمّ بحمد الله 🎉' : bs.overdue ? `انتهى موعده (${dayDate(bs.due)}) وبقي ${unitTxt((1 - bs.frac) * bs.pages, 'page', true)}.`
          : `${bs.behind > 0.25 ? `<b class="behind">متأخّر ${unitTxt(bs.behind, 'page')}</b>` : bs.behind < -0.25 ? `<b class="ahead">متقدّم ${unitTxt(-bs.behind, 'page')}</b>` : '<b class="ahead">على المسار</b>'}
             · قبل ${dayDate(bs.due)} · يلزمك ${unitTxt(bs.perWeek, 'page')} أسبوعيًّا`}</p></div>` : ''}
      ${edit ? '<p style="margin:10px 0 0"><a class="btn small" href="#/goal">تعديل الهدف</a></p>' : ''}
    </section>`;
}

// شاشة وضع الهدف وتعديله
function viewGoal(pid){
  const p = Store.profile(pid);
  if (!Cloud.canEdit(p)) return location.replace('#/home');
  setTop('هدف ' + p.name, '#/home');
  const d = Store.data(pid), g = d.goal || {n: 2, nu: 'page', dy: 5, rc: 4, big: null};
  const m = Stats.memorized(pid), big = g.big || {};
  const today = Store.today(), iso = x => new Date(x * 864e5).toISOString().slice(0, 10);
  const opt = (v, t, cur) => `<option value="${v}" ${String(v) === String(cur) ? 'selected' : ''}>${t}</option>`;
  app.innerHTML = `
    <form id="goalForm">
    <section class="panel">
      <h2>الحفظ الجديد كل أسبوع</h2>
      <div class="row" style="margin-top:10px">
        <input type="number" id="gn" min="0" max="100" step="0.5" value="${g.n}" style="width:6em" inputmode="decimal">
        <select id="gu">${opt('page', 'وجه', g.nu)}${opt('ayah', 'آية', g.nu)}</select>
        <label for="gd">على</label>
        <select id="gd">${[3, 4, 5, 6, 7].map(x => opt(x, count(x, 'يوم', 'يومين', 'أيام', 'يومًا'), g.dy)).join('')}</select>
      </div>
      <p class="small" id="gnHint"></p>
      <div class="row" style="margin-top:8px">
        <label for="go">ترتيب الحفظ</label>
        <select id="go">${opt('', 'تلقائي (بحسب محفوظك)', g.ord || '')}${opt('desc', 'من الناس صعودًا (جزء عمّ أولًا)', g.ord)}${opt('asc', 'بترتيب المصحف (من الفاتحة)', g.ord)}</select>
      </div>
      <p class="small">اكتب ٠ إن كنت تريد المراجعة فقط هذه الفترة.</p>
    </section>
    <section class="panel">
      <h2>المراجعة</h2>
      <div class="row" style="margin-top:10px">
        <label for="gr">أراجع كل محفوظي كل</label>
        <select id="gr">${[[2, 'أسبوعين'], [3, '٣ أسابيع'], [4, '٤ أسابيع'], [6, '٦ أسابيع'], [8, '٨ أسابيع'], [0, 'بلا هدف مراجعة']].map(([v, t]) => opt(v, t, g.rc)).join('')}</select>
      </div>
      <p class="small" id="grHint"></p>
    </section>
    <section class="panel">
      <h2>الهدف الكبير <span class="small">(اختياري)</span></h2>
      <div class="row" style="margin-top:10px">
        <select id="bk">${opt('', 'بلا هدف كبير', big.kind || '')}${opt('juz', 'حفظ جزء', big.kind)}${opt('surah', 'حفظ سورة', big.kind)}</select>
        <select id="bj" hidden>${Array.from({length: 30}, (_, k) => opt(k + 1, 'الجزء ' + AR(k + 1), big.kind === 'juz' ? big.v : 30)).join('')}</select>
        <select id="bs" hidden>${Q.surahs.map(s => opt(s.n, AR(s.n) + '. ' + s.name, big.kind === 'surah' ? big.v : 67)).join('')}</select>
      </div>
      <div class="row" id="bdRow" style="margin-top:10px" hidden>
        <label for="bd">قبل تاريخ</label>
        <input type="date" id="bd" min="${iso(today + 7)}" value="${big.due ? iso(big.due) : iso(today + 90)}">
      </div>
      <p class="small" id="bHint"></p>
    </section>
    ${!d.goal && !mapLocked(pid) ? '<p class="note">بوضع هدفك تُقفل خريطتك، فلا يُضاف حفظ جديد بعدها إلا بتسميع. ارسم كل ما تحفظه قبل ذلك.</p>' : ''}
    <p class="note">ابدأ بهدف أقلّ مما تظن أنك تقدر عليه، فتحقيقه أسبوعًا بعد أسبوع أنفع من هدف كبير ينكسر. ارفعه بعد شهر إن شئت.</p>
    <div class="row" style="margin-block:14px 24px">
      <button class="btn primary" type="submit">حفظ الهدف</button>
      ${d.goal ? '<button class="btn danger" id="gDel" type="button">إلغاء الهدف</button>' : ''}
    </div>
    </form>`;

  const rng = () => {
    const k = $('#bk').value;
    if (k === 'juz'){ const j = +$('#bj').value; return {kind: k, v: j, a: Q.juzFirst[j], b: Q.juzLast[j], label: 'الجزء ' + AR(j)}; }
    if (k === 'surah'){ const s = Q.surahs[+$('#bs').value - 1]; return {kind: k, v: s.n, a: s.start, b: s.start + s.count - 1, label: 'سورة ' + s.name}; }
    return null;
  };
  const hints = () => {
    const n = +$('#gn').value || 0, u = $('#gu').value, dy = +$('#gd').value, rc = +$('#gr').value;
    $('#gnHint').textContent = n ? `أي نحو ${unitTxt(n / dy, u)} في كل يوم من أيام الحفظ.` : 'لا حفظ جديد: التركيز على المراجعة.';
    $('#grHint').textContent = !rc ? '' : m.pages ? `محفوظك ${unitTxt(m.pages, 'page', true)}، فهدف مراجعتك نحو ${unitTxt(Math.max(1, Math.round(m.pages / rc * 2) / 2), 'page')} في الأسبوع، ويزيد تلقائيًّا كلما زاد محفوظك.` : 'ارسم خريطتك أولًا ليُحسب مقدار المراجعة.';
    const r = rng(), k = $('#bk').value;
    $('#bj').hidden = k !== 'juz'; $('#bs').hidden = k !== 'surah'; $('#bdRow').hidden = !r;
    if (!r){ $('#bHint').textContent = ''; return; }
    const due = Math.floor(Date.parse($('#bd').value) / 864e5);
    const mm = Store.mem(pid); let left = 0;
    for (let i = r.a; i <= r.b; i++) if (!mm[i]) left += Q.words[i] / Q.pageWords[Q.page[i]];
    const weeks = Math.max(1, (due - today) / 7);
    $('#bHint').textContent = !left ? `تحفظ ${r.label} كاملًا، ما شاء الله.` : `بقي من ${r.label} ${unitTxt(left, 'page', true)}، فيلزمك نحو ${unitTxt(left / weeks, 'page')} في الأسبوع.`;
  };
  $$('#goalForm input, #goalForm select').forEach(x => { x.oninput = hints; x.onchange = hints; });
  hints();
  if ($('#gDel')) $('#gDel').onclick = () => { if (confirm('إلغاء الهدف؟')){ d.goal = null; Store.touch(pid); location.hash = '#/home'; } };
  $('#goalForm').onsubmit = e => {
    e.preventDefault();
    const r = rng(), due = r ? Math.floor(Date.parse($('#bd').value) / 864e5) : 0;
    if (r && !(due > today)) return alert('اختر تاريخًا بعد اليوم للهدف الكبير.');
    let bigG = null;
    if (r){
      const same = big.kind === r.kind && big.v === r.v && big.due === due;
      const mm = Store.mem(pid); let tw = 0, mw = 0;
      for (let i = r.a; i <= r.b; i++){ tw += Q.words[i]; if (mm[i]) mw += Q.words[i]; }
      bigG = same ? big : {...r, due, since: today, f0: tw ? mw / tw : 0};
    }
    d.hifz = null;   // يُعاد حساب حفظ اليوم بالهدف الجديد
    d.goal = {n: Math.max(0, +$('#gn').value || 0), nu: $('#gu').value, dy: +$('#gd').value, rc: +$('#gr').value, ord: $('#go').value,
              big: bigG, since: (d.goal && d.goal.since) || today, by: Cloud.st.user ? Cloud.st.user.uid : null};
    d.nl = d.nl || {};
    Store.touch(pid); location.hash = '#/home';
  };
}

/* ================= ورد المراجعة اليوم ================= */
const tasmeeHref = (a, b) => `#/tasmee/${Q.sur[a]}/${Q.num[a]}/${Q.num[b]}`;
const listenHref = (pid, a, b) => `#/listen/new/${pid}/${Q.sur[a]}/${Q.num[a]}/${Q.num[b]}`;
// كيف يُفتح مقطع من ملف فرد: 'self' تسميع صوتي، 'listen' سمّع له، '' للاطّلاع فقط
function reciteMode(pid){
  const p = Store.profile(pid);
  if (Cloud.canRecite(p)) return 'self';
  return p && p.cloud && meId() && meId() !== pid ? 'listen' : '';
}
const segHref = (pid, mode, a, b) => mode === 'self' ? tasmeeHref(a, b) : listenHref(pid, a, b);
function itemLabel(a, b){
  const s = Q.surahOf(a), x = Q.num[a], y = Q.num[b];
  if (x === 1 && y === s.count) return `سورة ${s.name} كاملة`;
  if (x === y) return `سورة ${s.name}: الآية ${AR(x)}`;
  return `سورة ${s.name}: من الآية ${AR(x)} إلى الآية ${AR(y)}`;
}
function wirdCard(pid, edit, sg, mode){
  const w = Stats.wird(pid, mode === 'self');
  if (!w || !w.items.length) return '';
  const ws = Stats.wirdStatus(pid, w);
  const waiting = (Cloud.st.requests || []).filter(r => r.from === pid && r.status === 'done' && !r.applied);
  ws.items.forEach(x => { x.wait = !x.done && waiting.some(r => r.a <= x.a && r.b >= x.b); });
  const extra = ws.complete && mode === 'self' && sg ? `<p class="small" style="margin:8px 0 0">مراجعة إضافية إن شئت: <a href="${tasmeeHref(sg.a, sg.b)}">${itemLabel(sg.a, sg.b)}</a></p>` : '';
  return `
      <section class="panel today wird ${ws.complete ? 'met' : ''}">
        <div class="row between"><h2>ورد المراجعة اليوم</h2><span class="chip">${unitTxt(ws.total, 'page', true)}</span></div>
        <ol class="wlist">${ws.items.map(x => `<li class="${x.done ? 'done' : ''}">
          ${mode ? `<a href="${segHref(pid, mode, x.a, x.b)}">${itemLabel(x.a, x.b)}</a>` : `<span>${itemLabel(x.a, x.b)}</span>`}
          <a class="wplay" href="#/play/${Q.sur[x.a]}/${Q.num[x.a]}/${Q.num[x.b]}" aria-label="استمع إلى ${itemLabel(x.a, x.b)}">🎧</a>
          <span class="wk" aria-label="${x.done ? 'تمّ' : 'لم يتمّ'}">${x.done ? '✓' : ''}</span>${x.wait ? '<span class="wwait">⏳ أُرسلت، تُسجَّل حين يفتح برنامجه</span>' : ''}</li>`).join('')}</ol>
        <div class="gl"><span>التقدّم</span><b>${Q.dec(ws.done)} من ${unitTxt(ws.total, 'page')}</b></div>
        <div class="qbar ${ws.complete ? 'okb' : ''}"><i style="width:${pct(ws.done, ws.total)}%"></i></div>
        ${ws.complete ? '<p class="metmsg">أتممت ورد اليوم، بارك الله فيك.</p>' + extra
          : mode === 'self' ? `<p class="row" style="margin:10px 0 0"><a class="btn primary" href="${tasmeeHref(ws.next.a, ws.next.b)}">${ICON.mic} ${ws.done ? 'تابع الورد' : 'ابدأ الورد'}</a>
             <a class="btn" href="#/play/wird">${ICON_PLAY} استمع للورد</a></p>`
          : mode === 'listen' ? `<p style="margin:10px 0 0"><a class="btn primary" href="${listenHref(pid, ws.next.a, ws.next.b)}">${ICON_EAR} سمّع له وِرده</a></p>
             <p class="small" style="margin:6px 0 0">اضغط أي مقطع لتسمّعه له؛ يقرأ هو وتعلّم أنت أخطاءه.</p>` : ''}
      </section>`;
}

