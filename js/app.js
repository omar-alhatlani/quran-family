/* حلقة البيت: الشاشات والتنقّل */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const AR = Q.ar;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
// تمييز العدد: ١ آية واحدة، ٢ آيتان، ٣–١٠ آيات، ١١+ آية
const count = (n, one, two, few, many) => n === 1 ? one : n === 2 ? two : (n % 100 >= 3 && n % 100 <= 10) ? AR(n) + ' ' + few : AR(n) + ' ' + many;
const COLORS = ['#0f5f55', '#7b4bb3', '#c0572b', '#2f6fb3', '#b3386e', '#6b7d1f'];
const app = $('#app');
let cleanup = null;   // ما يلزم إيقافه عند مغادرة الشاشة

const ICON = {
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>'
};

function avatar(p, cls = ''){ return `<span class="av ${cls}" style="--c:${p.color}">${esc(p.name.trim()[0] || '؟')}</span>`; }
function setTop(title, back){
  $('#topTitle').textContent = title;
  $('#back').hidden = !back;
  $('#back').onclick = () => { location.hash = back; };
  const p = Store.cur && Store.profile(Store.cur);
  $('#topWho').innerHTML = p && back ? avatar(p, 'sm') : '';
}
function ago(t){
  const d = Store.today() - Math.floor((t - new Date().getTimezoneOffset() * 60000) / 864e5);
  return d <= 0 ? 'اليوم' : d === 1 ? 'أمس' : d === 2 ? 'قبل يومين' : d <= 10 ? `قبل ${AR(d)} أيام` : `قبل ${AR(d)} يومًا`;
}
const STATE_TXT = {fresh: 'ثابت', stale: 'يحتاج مراجعة', weak: 'ضعيف', unrev: 'لم يُسمَّع بعد'};

/* ================= التنقّل ================= */
function route(keepScroll){
  if (cleanup){ cleanup(); cleanup = null; }
  const y = scrollY;
  document.body.classList.remove('has-bar');
  const parts = (location.hash.slice(1) || '/').split('/').filter(Boolean);
  const pid = Store.cur;
  if (parts[0] === 'listen') return viewListen(pid, parts.slice(1));
  if (!parts.length || !pid) return viewProfiles();
  ({home: viewHome, map: viewMap, tasmee: viewTasmee, report: viewReport, goal: viewGoal, ask: viewAsk}[parts[0]] || viewProfiles)(pid, parts.slice(1).map(Number));
  window.scrollTo(0, keepScroll === true ? y : 0);
}
window.addEventListener('hashchange', () => route());

/* ================= الأفراد ================= */
function viewProfiles(){
  setTop('حلقة البيت');
  const ps = Store.profiles(), inFam = !!(Cloud.st.fid && Cloud.st.family);
  const card = p => {
    const m = Stats.memorized(p.id);
    return `<button class="prof" type="button" data-id="${p.id}">${avatar(p)}<span><b>${esc(p.name)}</b><small>${m.words ? Q.dec(m.juz) + ' جزء · ' + Q.dec(m.pages) + ' وجه' : 'لم يرسم خريطته بعد'}</small>${goalLine(p)}</span></button>`;
  };
  const addForm = (id, label, btn) => `
      <form id="${id}" class="addf" style="margin-top:10px">
        <label for="${id}-n">${label}</label>
        <input type="text" id="${id}-n" maxlength="24" required autocomplete="off">
        <div class="small" style="margin-top:10px">اللون</div>
        <div class="swatches">${COLORS.map((c, i) => `<label><input type="radio" name="${id}-c" value="${c}" ${i === ps.length % COLORS.length ? 'checked' : ''}><span style="background:${c}"></span></label>`).join('')}</div>
        <button class="btn primary" type="submit">${btn}</button>
      </form>`;
  let body;
  if (inFam){
    const me = ps.filter(Cloud.mine), others = ps.filter(p => !Cloud.mine(p));
    const free = others.filter(p => Array.isArray(p.uids) && p.uids.length === 0);
    body = `
    <section class="intro"><h1>${me.length ? 'أهلًا ' + esc(me[0].name) : 'من أنت؟'}</h1>
      <p class="muted">${me.length ? 'اضغط اسمك لتكمل حفظك ومراجعتك.' : 'اختر اسمك إن أضافه وليّ الأمر، أو أضف اسمك.'}</p></section>
    ${me.length ? `<div class="profiles">${me.map(card).join('')}</div>` : `
    <section class="panel today">
      ${free.length ? `<h3>هل أنت أحد هؤلاء؟</h3><div class="row" style="margin-top:8px">${free.map(p => `<button class="btn claim" type="button" data-id="${p.id}">أنا ${esc(p.name)}</button>`).join('')}</div>` : ''}
      ${addForm('meForm', free.length ? 'أو أضف اسمك' : 'اسمك', 'دخول باسمي')}
    </section>`}
    ${peerBanner()}
    ${others.length ? `<h3 style="margin-top:18px">أفراد الحلقة <span class="small">(للاطّلاع)</span></h3><div class="profiles">${others.map(card).join('')}</div>` : ''}
    ${familyPanel()}
    ${isOwner() ? `<details class="panel"><summary>إضافة فرد ليس معه جوال</summary>
      <p class="small">تديره أنت من جوالك، ويمكنه لاحقًا أن يختاره من جواله بعبارة «أنا …».</p>${addForm('otherForm', 'الاسم', 'إضافة')}</details>` : ''}`;
  } else {
    body = `
    <section class="intro">
      <h1>${ps.length ? 'من سيسمّع الآن؟' : 'أهلًا بكم في حلقة البيت'}</h1>
      <p class="muted">${ps.length ? 'اختر اسمك لتكمل حفظك ومراجعتك.' : 'اربط جوالك بحلقة عائلتك، أو جرّب البرنامج على هذا الجهاز وحده.'}</p>
    </section>
    <div class="profiles">${ps.map(card).join('')}</div>
    ${familyPanel()}
    <details class="panel" ${ps.length || Cloud.st.ok ? '' : 'open'}><summary>إضافة فرد على هذا الجهاز</summary>${addForm('addForm', 'الاسم', 'إضافة')}</details>`;
  }
  app.innerHTML = body + `
    <section class="panel">
      <h3>النسخة الاحتياطية</h3>
      <p class="small">${inFam ? 'بيانات الحلقة محفوظة في السحابة. ويمكنك مع ذلك تنزيل نسخة من هذا الجهاز.' : 'البيانات محفوظة في هذا الجهاز فقط. نزّل نسخة احتياطية بين حين وآخر، ويمكنك استرجاعها في أي جهاز.'}</p>
      <div class="row">
        <button class="btn" id="exp" type="button">تنزيل نسخة احتياطية</button>
        ${inFam ? '' : '<label class="btn" for="imp" style="color:var(--ink);font-size:14px">استرجاع من ملف</label><input type="file" id="imp" accept="application/json,.json" hidden>'}
      </div>
    </section>`;

  $$('.prof').forEach(b => b.onclick = () => { Store.cur = b.dataset.id; location.hash = '#/home'; });
  $$('.claim').forEach(b => b.onclick = async () => {
    b.disabled = true;
    try { await Cloud.claimMember(b.dataset.id); Store.cur = b.dataset.id; location.hash = '#/home'; }
    catch(e){ b.disabled = false; alert('تعذّر الربط. ربما اختاره جهاز آخر؛ اطلب من وليّ الأمر أن يسمح بربطه من جديد.'); }
  });
  const bindAdd = (id, forOther) => { const f = $('#' + id); if (!f) return; f.onsubmit = e => {
    e.preventDefault();
    const name = $(`#${id}-n`).value.trim(); if (!name) return;
    const p = Store.addProfile(name, $(`input[name=${id}-c]:checked`).value, undefined, forOther);
    if (forOther){ route(true); return; }
    Store.cur = p.id; location.hash = '#/home';
  }; };
  bindAdd('addForm', false); bindAdd('meForm', false); bindAdd('otherForm', true);
  bindPeerBanner();
  bindFamilyPanel();
  $('#exp').onclick = () => {
    const blob = new Blob([Store.exportJSON()], {type: 'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `حلقة-البيت-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  if ($('#imp')) $('#imp').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    if (!confirm('سيحلّ محتوى الملف محلّ كل البيانات في هذا الجهاز. متابعة؟')) return;
    try { Store.importJSON(await f.text()); route(); }
    catch(err){ alert('هذا الملف ليس نسخة احتياطية من حلقة البيت.'); }
  };
}

/* ================= حلقة العائلة (السحابة) ================= */
const ERR = {
  'invite-missing': 'رمز الدعوة غير صحيح. تأكّد منه ثم أعد المحاولة.',
  'invite-used': 'رمز الدعوة هذا استُعمل من قبل. اطلب رمزًا جديدًا.',
  'code-missing': 'رمز العائلة غير صحيح. تأكّد منه ثم أعد المحاولة.',
  'need-google': 'إنشاء الحلقة يحتاج الدخول بحساب Google.',
  'auth/popup-closed-by-user': 'أُغلقت نافذة الدخول قبل إكماله.',
  'auth/network-request-failed': 'لا يوجد اتصال بالإنترنت.',
  'permission-denied': 'لا تملك صلاحية لهذا الإجراء.'
};
const errText = e => ERR[e && (e.message in ERR ? e.message : e.code)] || 'حدث خطأ غير متوقّع. أعد المحاولة بعد قليل.';
const isOwner = () => !!(Cloud.st.family && Cloud.st.user && Cloud.st.family.owner === Cloud.st.user.uid);
const joinLink = c => location.origin + location.pathname + '?j=' + c;

function familyPanel(){
  const st = Cloud.st;
  if (!st.ok) return '';
  const admin = st.user && st.user.admin ? '<p style="margin:10px 0 0"><a class="btn small" href="admin.html">لوحة القيادة</a></p>' : '';
  if (st.fid && st.family) return `
    <section class="panel today">
      <div class="row between"><h2>حلقة ${esc(st.family.name)}</h2>${isOwner() ? '<span class="chip">وليّ الأمر</span>' : ''}</div>
      <p class="small" style="margin:4px 0 8px">أرسل رمز العائلة لأهلك ليدخلوا من جوالاتهم، ويرى كل واحد تقدّم الحلقة.</p>
      <div class="row"><b class="jcode" dir="ltr">${st.family.joinCode}</b>
        <button class="btn small primary" id="copyJoin" type="button">نسخ رابط الانضمام</button></div>
      <p style="margin:10px 0 0" class="small">${st.user.email ? esc(st.user.email) + ' · ' : ''}<button class="btn small" id="signOut" type="button">تسجيل الخروج من هذا الجهاز</button></p>${admin}
    </section>`;
  const q = new URLSearchParams(location.search).get('j') || '';
  const g = st.user && !st.user.anon;
  return `
    <section class="panel today">
      <h2>حلقة العائلة</h2>
      <p class="small" style="margin:4px 0 10px">اربط جوالك بعائلتك لتتزامن بياناتكم ويرى كل واحد تقدّم الحلقة.</p>
      <form id="joinForm" class="row">
        <label for="jc">رمز العائلة</label>
        <input type="text" id="jc" class="codein" value="${esc(q)}" maxlength="8" autocomplete="off" dir="ltr" required>
        <button class="btn primary" type="submit">انضمّ</button>
      </form>
      <div id="famErr" class="warn" hidden></div>
      <details style="margin-top:12px" ${g ? 'open' : ''}><summary class="small" style="font-weight:600">وليّ أمر معه دعوة؟ أنشئ حلقة لعائلتك</summary>
        ${g ? `<form id="createForm" style="margin-top:10px">
            <p class="small" style="margin:0 0 8px">دخلت باسم ${esc(st.user.email || '')} · <button class="btn small" id="signOut" type="button">خروج</button></p>
            <label for="fname">اسم العائلة</label><input type="text" id="fname" maxlength="30" required placeholder="مثل: آل فلان">
            ${st.user.admin ? '<p class="small">أنت المدير: لا تحتاج رمز دعوة.</p>' : '<label for="inv" style="display:block;margin-top:8px">رمز الدعوة</label><input type="text" id="inv" class="codein" maxlength="10" required dir="ltr">'}
            <div style="margin-top:10px"><button class="btn primary" type="submit">أنشئ الحلقة</button></div>
          </form>` : '<div style="margin-top:10px"><button class="btn" id="gIn" type="button">الدخول بحساب Google</button></div>'}
      </details>${admin}
    </section>`;
}
function bindFamilyPanel(){
  const err = e => { const b = $('#famErr'); if (b){ b.textContent = errText(e); b.hidden = false; } else alert(errText(e)); };
  const busy = (form, on) => form && $$('button, input', form).forEach(x => { x.disabled = on; });
  if ($('#copyJoin')) $('#copyJoin').onclick = () => {
    const f = Cloud.st.family;
    const t = `انضمّ إلى حلقة ${f.name} لحفظ القرآن الكريم:\n${joinLink(f.joinCode)}\nرمز العائلة: ${f.joinCode}`;
    navigator.clipboard.writeText(t).then(() => { $('#copyJoin').textContent = 'نُسخ ✓'; }).catch(() => prompt('انسخ الرسالة:', t));
  };
  $$('#signOut').forEach(b => b.onclick = async () => {
    if (Cloud.st.fid && !confirm('ستُمسح بيانات العائلة من هذا الجهاز وتبقى محفوظة في السحابة، وتعود إليها بالرمز متى شئت. متابعة؟')) return;
    await Cloud.signOut(); route();
  });
  if ($('#gIn')) $('#gIn').onclick = () => Cloud.googleSignIn().catch(err);
  if ($('#joinForm')) $('#joinForm').onsubmit = async e => {
    e.preventDefault(); busy(e.target, true);
    try { await Cloud.joinFamily($('#jc').value); history.replaceState(null, '', location.pathname + '#/'); route(); }
    catch(x){ busy(e.target, false); err(x); }
  };
  if ($('#createForm')) $('#createForm').onsubmit = async e => {
    e.preventDefault(); busy(e.target, true);
    try { await Cloud.createFamily($('#fname').value.trim(), $('#inv') ? $('#inv').value.trim().toUpperCase() : ''); route(); }
    catch(x){ busy(e.target, false); err(x); }
  };
}

/* ================= الرئيسية ================= */
function viewHome(pid){
  const p = Store.profile(pid); setTop('حلقة البيت', '#/');
  $('#topWho').innerHTML = '';
  const m = Stats.memorized(pid), sg = Stats.suggest(pid), d = Store.data(pid);
  const recent = d.sess.slice(-5).reverse();
  const edit = Cloud.canEdit(p), own = Cloud.mine(p);
  app.innerHTML = `
    <section class="who">${avatar(p)}<div><h1>${esc(p.name)}</h1><a href="#/" class="small">${own || !p.cloud ? 'تبديل الفرد' : 'رجوع إلى الحلقة'}</a></div></section>
    ${edit ? (own || !p.cloud ? '' : '<p class="note">تدير هذا الملف بصفتك وليّ الأمر.</p>') : '<p class="note">تعرض ملف ' + esc(p.name) + ' للاطّلاع فقط.</p>'}
    <div class="big">
      <div><b>${Q.dec(m.juz)}</b><span>جزء</span></div>
      <div><b>${Q.dec(m.pages)}</b><span>وجه</span></div>
      <div><b>${AR(m.ayat)}</b><span>آية</span></div>
      <div><b>${Q.dec(m.pct)}٪</b><span>من القرآن</span></div>
    </div>
    <div class="qbar" aria-hidden="true"><i style="width:${m.pct}%"></i></div>
    ${listenLine(pid)}
    ${own ? peerBanner() : ''}
    ${goalPanel(pid, edit)}
    ${!m.words ? (edit ? `
      <section class="panel today">
        <h2>ابدأ برسم خريطتك</h2>
        <p>علّم ما تحفظه من القرآن الآن، بالجزء أو بالسورة أو بالوجه، ليعرف البرنامج ماذا يراجع معك.</p>
        <a class="btn primary" href="#/map">ارسم خريطتي</a>
      </section>` : '') : wirdCard(pid, edit, sg)}
    <nav class="actions">
      ${edit ? `<a class="act" href="#/tasmee">${ICON.mic}تسميع</a>` : ''}
      ${own && p.cloud ? `<a class="act" href="#/ask">${ICON_EAR}سمّعني</a>` : ''}
      ${!own && p.cloud && meId() ? `<a class="act" href="#/listen/new/${pid}">${ICON_EAR}سمّع له</a>` : ''}
      <a class="act" href="#/map">${ICON.map}خريطة الحفظ</a>
      <a class="act" href="#/report">${ICON.chart}التقرير</a>
    </nav>
    ${recent.length ? `<section class="panel"><h3>آخر التسميعات</h3><ul class="list">${recent.map(s => `
      <li><span>${Q.rangeLabel(s.a, s.b)} <span class="small">· ${s.kind === 'review' ? 'مراجعة' : 'حفظ جديد'}${s.byName ? ' · بتسميع ' + esc(s.byName) : ''} · ${ago(s.t)} ${new Date(s.t).toLocaleTimeString('ar-SA', {hour: 'numeric', minute: '2-digit'})}</span></span><b>${AR(s.pct)}٪</b>${s.note ? `<span class="snote">«${esc(s.note)}»</span>` : ''}</li>`).join('')}</ul></section>` : ''}
    ${!p.cloud || isOwner() ? `<p class="row" style="justify-content:center;margin-top:24px">
      ${p.cloud && !own && Array.isArray(p.uids) && p.uids.length ? '<button class="btn small" id="rel" type="button">السماح بربطه بجهاز جديد</button>' : ''}
      <button class="btn small danger" id="del" type="button">حذف ملف ${esc(p.name)}</button></p>` : ''}`;
  bindPeerBanner();
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
      <p class="small" style="margin:4px 0 10px">مقدار حفظ جديد كل أسبوع، ودورة مراجعة لمحفوظك، وهدف كبير إن شئت.</p>
      <a class="btn primary" href="#/goal">ضع هدفي</a>
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
    d.goal = {n: Math.max(0, +$('#gn').value || 0), nu: $('#gu').value, dy: +$('#gd').value, rc: +$('#gr').value,
              big: bigG, since: (d.goal && d.goal.since) || today, by: Cloud.st.user ? Cloud.st.user.uid : null};
    d.nl = d.nl || {};
    Store.touch(pid); location.hash = '#/home';
  };
}

/* ================= ورد المراجعة اليوم ================= */
const tasmeeHref = (a, b) => `#/tasmee/${Q.sur[a]}/${Q.num[a]}/${Q.num[b]}`;
function itemLabel(a, b){
  const s = Q.surahOf(a), x = Q.num[a], y = Q.num[b];
  if (x === 1 && y === s.count) return `سورة ${s.name} كاملة`;
  if (x === y) return `سورة ${s.name}: الآية ${AR(x)}`;
  return `سورة ${s.name}: من الآية ${AR(x)} إلى الآية ${AR(y)}`;
}
function wirdCard(pid, edit, sg){
  const w = Stats.wird(pid, edit);
  if (!w || !w.items.length) return '';
  const ws = Stats.wirdStatus(pid, w);
  const extra = ws.complete && edit && sg ? `<p class="small" style="margin:8px 0 0">مراجعة إضافية إن شئت: <a href="${tasmeeHref(sg.a, sg.b)}">${itemLabel(sg.a, sg.b)}</a></p>` : '';
  return `
      <section class="panel today wird ${ws.complete ? 'met' : ''}">
        <div class="row between"><h2>ورد المراجعة اليوم</h2><span class="chip">${unitTxt(ws.total, 'page')}</span></div>
        <ol class="wlist">${ws.items.map(x => `<li class="${x.done ? 'done' : ''}">
          ${edit ? `<a href="${tasmeeHref(x.a, x.b)}">${itemLabel(x.a, x.b)}</a>` : `<span>${itemLabel(x.a, x.b)}</span>`}
          <span class="wk" aria-label="${x.done ? 'تمّ' : 'لم يتمّ'}">${x.done ? '✓' : ''}</span></li>`).join('')}</ol>
        <div class="gl"><span>التقدّم</span><b>${Q.dec(ws.done)} من ${unitTxt(ws.total, 'page')}</b></div>
        <div class="qbar ${ws.complete ? 'okb' : ''}"><i style="width:${pct(ws.done, ws.total)}%"></i></div>
        ${ws.complete ? '<p class="metmsg">أتممت ورد اليوم، بارك الله فيك.</p>' + extra
          : edit ? `<p style="margin:10px 0 0"><a class="btn primary" href="${tasmeeHref(ws.next.a, ws.next.b)}">${ICON.mic} ${ws.done ? 'تابع الورد' : 'ابدأ الورد'}</a></p>` : ''}
      </section>`;
}

/* ================= «سمّعني»: التسميع المتبادل ================= */
const meId = () => { const p = Store.profiles().find(x => x.cloud && Cloud.mine(x)); return p ? p.id : null; };
const pname = id => { const p = Store.profile(id); return p ? p.name : 'أحد الأفراد'; };
const rangeText = (a, b) => itemLabel(a, b);
const ICON_EAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8.5a6 6 0 1 1 12 0c0 4-4 4.5-4 8a3 3 0 0 1-5.5 1.6"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0"/></svg>';
function rangeWords(A, B){
  const W = [];
  for (let i = A; i <= B; i++) Q.ayahWords(i).forEach((w, k) => W.push({...w, raw: w.s, n: Q.num[i], i, first: k === 0}));
  return W;
}
// مقطع افتراضي لفرد: التالي في ورده، ثم مراجعة مقترحة، ثم الملك ١–٥
function defaultRange(pid){
  const w = Stats.wird(pid, false), ws = w && Stats.wirdStatus(pid, w);
  if (ws && ws.next) return [ws.next.a, ws.next.b];
  const sg = Stats.suggest(pid);
  return sg ? [sg.a, sg.b] : [Q.idx(67, 1), Q.idx(67, 5)];
}

/* تطبيق نتيجة التسميع على ملف الحافظ: يعمل على جهازه (أو جهاز وليّ الأمر لفرد بلا جوال) مرة واحدة */
function applyPeer(r){
  const pid = Store.R(r.from); if (!Store.profile(pid) || !r.result) return;
  const d = Store.data(pid), id = 'peer-' + r.id;
  if (d.sess.some(s => s.id === id)) return;
  const mem = Store.mem(pid), W = rangeWords(r.a, r.b), marks = r.result.marks || {}, day = Store.dayOf(r.result.t);
  const rec = {id, t: r.result.t, a: r.a, b: r.b, ok: 0, wrong: 0, skip: 0, hint: 0, gap: 0, given: 0, fixed: 0,
               words: 0, letters: 0, pages: 0, ayat: 0, mode: 'peer', by: r.result.listener, byName: r.result.listenerName, note: r.result.note || ''};
  const per = {};
  W.forEach((w, k) => {
    const st = marks[k] === 'wrong' || marks[k] === 'hint' ? marks[k] : 'ok';
    rec[st]++; rec.words++;
    rec.letters += w.raw.replace(/[^ء-غف-ي]/g, '').length;
    rec.pages += 1 / Q.pageWords[Q.page[w.i]];
    const pa = per[w.i] || (per[w.i] = {err: 0}); if (st !== 'ok') pa.err++;
    if (st === 'wrong') d.mis[w.g] = (d.mis[w.g] || 0) + 1;
    else if (st === 'ok' && d.mis[w.g] > 0){ d.mis[w.g]--; if (!d.mis[w.g]) delete d.mis[w.g]; }
  });
  Object.entries(per).forEach(([i, pa]) => { const cur = d.rev[i]; if (!cur || cur[0] <= day) d.rev[i] = [day, pa.err]; });
  rec.ayat = Object.keys(per).length;
  const graded = rec.ok + rec.wrong + rec.hint;
  rec.pct = graded ? Math.round(rec.ok / graded * 100) : 0;
  rec.kind = Object.keys(per).every(i => mem[i]) ? 'review' : 'new';
  Store.addSession(pid, rec); Store.touch(pid); Store.hooks.session(pid, rec, true);
}
Cloud.onPeerDone = applyPeer;

/* بطاقات الطلبات: الواردة إليّ، والتي أرسلتها */
function peerBanner(){
  const me = meId(); if (!me || !Cloud.st.fid) return '';
  const rs = Cloud.st.requests || [];
  const incoming = rs.filter(r => r.status === 'pending' && r.from !== me && (r.to === me || r.to == null));
  const mineOut = rs.filter(r => r.from === me && (r.status === 'pending' || (r.status === 'declined' && Date.now() - (r.at || 0) < 864e5)));
  if (!incoming.length && !mineOut.length) return '';
  return `<section class="panel peer">
    ${incoming.map(r => `<div class="preq">
      <p><b>${esc(pname(r.from))}</b> يطلب أن ${r.to ? 'تسمّع' : 'يسمّع أحدكم'} له: ${rangeText(r.a, r.b)}</p>
      <div class="row"><a class="btn primary small" href="#/listen/${r.id}">${ICON_EAR} سمّع له</a>
      ${r.to ? `<button class="btn small" type="button" data-decline="${r.id}">أعتذر الآن</button>` : ''}</div></div>`).join('')}
    ${mineOut.map(r => `<div class="preq mine">
      <p>${r.status === 'declined' ? `اعتذر ${esc(pname(r.to))} عن طلبك` : `طلبت ${r.to ? 'من ' + esc(pname(r.to)) : 'من الحلقة'} أن ${r.to ? 'يسمّع' : 'يسمّع أحدهم'} لك`}: ${rangeText(r.a, r.b)}${r.status === 'pending' ? ' · بانتظاره' : ''}</p>
      ${r.status === 'pending' ? `<button class="btn small" type="button" data-cancel="${r.id}">إلغاء الطلب</button>` : ''}</div>`).join('')}
  </section>`;
}
function bindPeerBanner(){
  $$('[data-decline]').forEach(b => b.onclick = () => Cloud.setStatus(b.dataset.decline, 'declined').catch(() => alert('تعذّر ذلك. تأكّد من الاتصال.')));
  $$('[data-cancel]').forEach(b => b.onclick = () => Cloud.setStatus(b.dataset.cancel, 'cancelled').catch(() => alert('تعذّر ذلك. تأكّد من الاتصال.')));
}

/* اختيار السورة والآيات (مشترك بين «سمّعني» و«سمّع له») */
function rangePicker(A, B, onChange){
  const s = Q.surahOf(A), opts = (n, v) => Array.from({length: n}, (_, k) => `<option value="${k + 1}" ${k + 1 === v ? 'selected' : ''}>${AR(k + 1)}</option>`).join('');
  setTimeout(() => {
    const go = (sn, a, b) => onChange(Q.idx(sn, a), Q.idx(sn, b));
    $('#rpS').onchange = e => { const n = +e.target.value; go(n, 1, Math.min(Q.surahs[n - 1].count, 5)); };
    $('#rpA').onchange = e => { const v = +e.target.value; go(s.n, v, Math.max(v, Q.num[B])); };
    $('#rpB').onchange = e => { const v = +e.target.value; go(s.n, Math.min(Q.num[A], v), v); };
  });
  return `<div class="row"><label for="rpS">السورة</label>
      <select id="rpS">${Q.surahs.map(x => `<option value="${x.n}" ${x.n === s.n ? 'selected' : ''}>${AR(x.n)}. ${x.name}</option>`).join('')}</select></div>
    <div class="row" style="margin-top:8px"><label for="rpA">من آية</label><select id="rpA">${opts(s.count, Q.num[A])}</select>
      <label for="rpB">إلى آية</label><select id="rpB">${opts(s.count, Q.num[B])}</select></div>`;
}

/* «سمّعني»: الحافظ يرسل طلبًا */
function viewAsk(pid){
  const p = Store.profile(pid), me = meId();
  if (!Cloud.st.fid || !me || !Cloud.mine(p)) return location.replace('#/home');
  setTop('سمّعني', '#/home');
  let [A, B] = viewAsk.range && viewAsk.range.pid === pid ? viewAsk.range.r : defaultRange(pid);
  const others = Store.profiles().filter(x => x.cloud && x.id !== pid);
  const render = () => {
    app.innerHTML = `
      ${peerBanner()}
      <section class="panel">
        <h2>ماذا ستسمّع؟</h2>
        <div style="margin-top:10px">${rangePicker(A, B, (a, b) => { A = a; B = b; viewAsk.range = {pid, r: [a, b]}; render(); })}</div>
        <p class="small">${rangeText(A, B)}</p>
      </section>
      <section class="panel">
        <h2>مَن يسمّع لك؟</h2>
        <div class="choose" role="radiogroup" style="margin-top:10px">
          <label class="chk"><input type="radio" name="to" value="" checked> أي فرد من الحلقة</label>
          ${others.map(x => `<label class="chk"><input type="radio" name="to" value="${x.id}"> ${esc(x.name)}</label>`).join('')}
        </div>
        <div class="row" style="margin-top:12px">
          <button class="btn primary" id="send" type="button">${ICON.mic} أرسل الطلب</button>
          <a class="btn" id="wa" href="#" target="_blank" rel="noopener">أخبره في واتساب</a>
        </div>
        <p class="small">يصله الطلب في البرنامج، فيفتح النصّ على جواله ويعلّم أخطاءك وأنت تقرأ، ثم تصلك النتيجة في ملفّك.</p>
      </section>
      <p class="note">إن كنتما معًا الآن فلا حاجة إلى طلب: يفتح هو ملفّك من «أفراد الحلقة» ويضغط «سمّع له».</p>`;
    bindPeerBanner();
    const to = () => ($('input[name=to]:checked') || {}).value || '';
    const waText = () => `${to() ? 'يا ' + pname(to()) + '، ' : ''}هل تسمّع لي ${rangeText(A, B)}؟ افتح «حلقة البيت»: ${location.origin + location.pathname}`;
    const setWa = () => { $('#wa').href = 'https://wa.me/?text=' + encodeURIComponent(waText()); };
    $$('input[name=to]').forEach(x => x.onchange = setWa); setWa();
    $('#send').onclick = async () => {
      $('#send').disabled = true;
      try { await Cloud.sendRequest(pid, to() || null, A, B); render(); }
      catch(e){ $('#send').disabled = false; alert('تعذّر الإرسال. تأكّد من الاتصال.'); }
    };
  };
  render();
}

/* «سمّع له»: المسمِّع يرى النصّ ويعلّم الأخطاء. args: [rid] أو ['new', mid, s, a, b] */
function viewListen(_, args){
  const me = meId();
  if (!Cloud.st.fid || !me) return location.replace('#/');
  let req = null, from, A, B;
  if (args[0] !== 'new'){
    req = (Cloud.st.requests || []).find(r => r.id === args[0]);
    if (!req || req.status !== 'pending'){
      setTop('سمّع له', '#/');
      app.innerHTML = '<section class="panel"><h2>انتهى هذا الطلب</h2><p class="small">سمّع له غيرك، أو ألغاه صاحبه.</p><a class="btn" href="#/">رجوع</a></section>';
      return;
    }
    from = req.from; A = req.a; B = req.b;
  } else {
    from = args[1];
    if (args[2]){ A = Q.idx(+args[2], +args[3]); B = Q.idx(+args[2], +args[4]); } else [A, B] = defaultRange(from);
  }
  if (from === me) return location.replace('#/home');
  setTop('تسمّع لـ ' + pname(from), '#/');
  const W = rangeWords(A, B), marks = {};
  const sur = Q.surahOf(A);
  app.innerHTML = `
    ${req ? `<section class="panel"><h2>${rangeText(A, B)}</h2></section>` :
      `<section class="panel"><h2>ماذا سيسمّع ${esc(pname(from))}؟</h2><div style="margin-top:10px">${rangePicker(A, B, (a, b) =>
        location.replace(`#/listen/new/${from}/${Q.sur[a]}/${Q.num[a]}/${Q.num[b]}`))}</div></section>`}
    <p class="note">اضغط الكلمة التي أخطأ فيها: مرة للخطأ (أحمر)، ومرتين إن فتحتَ عليه (أصفر)، وثالثة للإلغاء.</p>
    <section class="mushaf">
      <div class="sura-head">سُورَةُ ${sur.name}</div>
      ${Q.num[A] === 1 && sur.n !== 1 && sur.n !== 9 ? '<div class="basmala">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>' : ''}
      <div class="text lis" id="ltext"></div>
    </section>
    <section class="panel">
      <div class="row between"><b id="lcount">لا أخطاء</b><span class="small">${count(W.length, 'كلمة واحدة', 'كلمتان', 'كلمات', 'كلمة')}</span></div>
      <label for="lnote" style="display:block;margin-top:10px">ملاحظة له (اختياري)</label>
      <textarea id="lnote" rows="2" maxlength="300" placeholder="مثل: انتبه لمتشابه الآية ٥"></textarea>
      <div class="row" style="margin-top:10px">
        <button class="btn primary" id="lsend" type="button">إرسال النتيجة إلى ${esc(pname(from))}</button>
        <a class="btn" href="#/">إلغاء</a>
      </div>
    </section>`;
  const box = $('#ltext');
  W.forEach((w, k) => {
    const sp = document.createElement('button'); sp.type = 'button'; sp.className = 'w'; sp.dataset.k = k; sp.textContent = w.u;
    box.appendChild(sp); box.appendChild(document.createTextNode(' '));
    if (!W[k + 1] || W[k + 1].i !== w.i){ const n = document.createElement('span'); n.className = 'num'; n.textContent = '﴿' + AR(w.n) + '﴾'; box.appendChild(n); box.appendChild(document.createTextNode(' ')); }
  });
  const upd = () => {
    const e = Object.values(marks).filter(x => x === 'wrong').length, h = Object.values(marks).filter(x => x === 'hint').length;
    $('#lcount').textContent = !e && !h ? 'لا أخطاء' : [e ? count(e, 'خطأ واحد', 'خطآن', 'أخطاء', 'خطأً') : '', h ? count(h, 'فتح واحد', 'فتحان', 'فتحات', 'فتحًا') : ''].filter(Boolean).join(' · ');
  };
  box.onclick = e => {
    const sp = e.target.closest('.w'); if (!sp) return;
    const k = sp.dataset.k, cur = marks[k];
    const next = !cur ? 'wrong' : cur === 'wrong' ? 'hint' : null;
    if (next) marks[k] = next; else delete marks[k];
    sp.className = 'w' + (next === 'wrong' ? ' lw' : next === 'hint' ? ' lh' : '');
    upd();
  };
  $('#lsend').onclick = async () => {
    $('#lsend').disabled = true;
    try {
      await Cloud.submitResult(req ? req.id : null, {from, to: me, a: A, b: B, marks, note: $('#lnote').value.trim()});
      // نصيب المسمِّع
      const dm = Store.data(me), t = Store.today(), e = (dm.lis = dm.lis || {})[t] || [0, 0];
      dm.lis[t] = [e[0] + 1, e[1] + W.length];
      Object.keys(dm.lis).forEach(k => { if (+k < t - 60) delete dm.lis[k]; });
      Store.touch(me);
      const err = Object.values(marks).length, pctv = Math.round((W.length - err) / W.length * 100);
      app.innerHTML = `<section class="panel today met"><h2>أُرسلت النتيجة إلى ${esc(pname(from))}</h2>
        <p style="font-size:34px;font-weight:700;color:var(--accent);margin:6px 0">${AR(pctv)}٪</p>
        <p class="small">ستظهر في ملفّه وتُحسب في مراجعته. جزاك الله خيرًا على التسميع.</p>
        <a class="btn primary" href="#/">رجوع إلى الحلقة</a></section>`;
    } catch(x){ $('#lsend').disabled = false; alert('تعذّر الإرسال. تأكّد من الاتصال ثم أعد المحاولة.'); }
  };
}

// نصيب المسمِّع هذا الأسبوع
function listenLine(pid){
  const lis = Store.data(pid).lis || {}, w = Stats.weekStart(Store.today()); let n = 0, words = 0;
  Object.entries(lis).forEach(([k, v]) => { if (+k >= w){ n += v[0]; words += v[1]; } });
  return n ? `<p class="small lisline">${ICON_EAR} سمّع لأهله هذا الأسبوع ${count(n, 'مرة واحدة', 'مرتين', 'مرات', 'مرة')} (${count(words, 'كلمة واحدة', 'كلمتين', 'كلمات', 'كلمة')})</p>` : '';
}

/* ================= الخريطة ================= */
let mapMode = 'mem', mapSel = 0, openSurah = 0;
function viewMap(pid){
  setTop('خريطة الحفظ', '#/home');
  const edit = Cloud.canEdit(Store.profile(pid));
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
    <section class="panel" ${edit ? '' : 'hidden'}>
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
            <button class="btn small" type="button" data-act="toggle">${a === s.count ? 'إلغاء' : 'كاملة'}</button>
            <button class="btn small" type="button" data-act="range" aria-expanded="${openSurah === s.n}">آيات</button></div>
          ${openSurah === s.n ? `<div class="rng">
            <label>من</label><select data-r="a">${Array.from({length: s.count}, (_, k) => `<option value="${k + 1}">${AR(k + 1)}</option>`).join('')}</select>
            <label>إلى</label><select data-r="b">${Array.from({length: s.count}, (_, k) => `<option value="${k + 1}" ${k + 1 === s.count ? 'selected' : ''}>${AR(k + 1)}</option>`).join('')}</select>
            <button class="btn small primary" type="button" data-act="mark">محفوظة</button>
            <button class="btn small" type="button" data-act="unmark">غير محفوظة</button></div>` : ''}
        </div>`;
      }).join('')}</div>
    </section>`;

  const rerender = () => { const y = scrollY; viewMap(pid); scrollTo(0, y); };
  $$('.seg button').forEach(b => b.onclick = () => { mapMode = b.dataset.m; rerender(); });
  $$('.cell').forEach(c => c.onclick = () => { mapSel = +c.dataset.pg; rerender(); $('#sheet').scrollIntoView({behavior: 'smooth', block: 'nearest'}); });
  $$('.jchip').forEach(b => b.onclick = () => {
    const j = +b.dataset.j, full = b.classList.contains('full');
    if (full && !confirm(`إلغاء تعليم الجزء ${AR(j)} كاملًا؟`)) return;
    Store.setMem(pid, Q.juzFirst[j], Q.juzLast[j], !full); rerender();
  });
  $$('.srow').forEach(r => {
    const s = Q.surahs[r.dataset.s - 1];
    r.querySelector('[data-act=toggle]').onclick = () => {
      const full = surState(s) === s.count;
      if (full && !confirm(`إلغاء تعليم سورة ${s.name}؟`)) return;
      Store.setMem(pid, s.start, s.start + s.count - 1, !full); rerender();
    };
    r.querySelector('[data-act=range]').onclick = () => { openSurah = openSurah === s.n ? 0 : s.n; rerender(); };
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
          ${edit ? `<span class="row"><button class="btn small" type="button" data-act="t">${all ? 'إلغاء' : 'محفوظ'}</button>
          <a class="btn small primary" href="#/tasmee/${Q.sur[a]}/${Q.num[a]}/${Q.num[b]}">سمّع</a></span>` : ''}</li>`;
      }).join('')}</ul>`;
    if (edit) $$('#sheet li').forEach(li => li.querySelector('[data-act=t]').onclick = () => {
      const a = +li.dataset.a, b = +li.dataset.b; let n = 0; for (let i = a; i <= b; i++) n += m[i];
      Store.setMem(pid, a, b, n !== b - a + 1); rerender();
    });
  }
}

/* ================= التسميع ================= */
function viewTasmee(pid, [s, a, b]){
  if (!Cloud.canEdit(Store.profile(pid))) return location.replace('#/home');
  // المقطع الافتراضي: المقترح، ثم آخر تسميع، ثم الملك ١–٥
  if (!s){
    const sg = Stats.suggest(pid), last = Store.data(pid).sess.slice(-1)[0];
    const r = sg ? [sg.a, sg.b] : last ? [last.a, last.b] : [Q.idx(67, 1), Q.idx(67, 5)];
    return location.replace(`#/tasmee/${Q.sur[r[0]]}/${Q.num[r[0]]}/${Q.num[r[1]]}`);
  }
  const sur = Q.surahs[Math.min(Math.max(s, 1), 114) - 1];
  a = Math.min(Math.max(a || 1, 1), sur.count); b = Math.min(Math.max(b || a, a), sur.count);
  const A = sur.start + a - 1, B = sur.start + b - 1;
  setTop('تسميع ' + sur.name, '#/home');
  document.body.classList.add('has-bar');

  const mem = Store.mem(pid);
  let memN = 0; for (let i = A; i <= B; i++) memN += mem[i];
  const opt = {firstWord: Store.pref('firstWord', false), showLive: Store.pref('showLive', true), mode: Store.pref('listen-mode', 'continuous')};
  const W = [];
  for (let i = A; i <= B; i++) Q.ayahWords(i).forEach((w, k) => W.push({...w, s: Engine.norm(w.s), raw: w.s, n: Q.num[i], i, first: k === 0}));
  const opts = n => Array.from({length: n}, (_, k) => `<option value="${k + 1}">${AR(k + 1)}</option>`).join('');

  app.innerHTML = `
    <section class="panel">
      <div class="row">
        <label for="ts">السورة</label>
        <select id="ts">${Q.surahs.map(x => `<option value="${x.n}" ${x.n === sur.n ? 'selected' : ''}>${AR(x.n)}. ${x.name}</option>`).join('')}</select>
      </div>
      <div class="row" style="margin-top:8px">
        <label for="ta">من آية</label><select id="ta">${opts(sur.count)}</select>
        <label for="tb">إلى آية</label><select id="tb">${opts(sur.count)}</select>
        <span class="small">${count(b - a + 1, 'آية واحدة', 'آيتان', 'آيات', 'آية')} · ${count(W.length, 'كلمة واحدة', 'كلمتان', 'كلمات', 'كلمة')} · ${memN === B - A + 1 ? 'مراجعة' : memN ? 'فيه حفظ جديد' : 'حفظ جديد'}</span>
      </div>
      <details style="margin-top:8px"><summary class="small" style="font-weight:400">خيارات</summary>
        <div class="row" style="margin-top:8px">
          <label class="chk"><input type="checkbox" id="optFirst" ${opt.firstWord ? 'checked' : ''}> إظهار أول كلمة من كل آية</label>
          <label class="chk"><input type="checkbox" id="optLive" ${opt.showLive ? 'checked' : ''}> عرض ما يسمعه البرنامج</label>
        </div>
        <div class="row" style="margin-top:8px" ${Engine.IS_ANDROID ? '' : 'hidden'}>
          <label for="optMode">طريقة الاستماع</label>
          <select id="optMode"><option value="continuous">متواصل</option><option value="sentence">جملة جملة (نغمة عند كل توقّف)</option></select>
        </div>
      </details>
    </section>
    <div id="warn" class="warn" hidden></div>
    <section class="mushaf" aria-label="نص المقطع">
      <div class="sura-head">سُورَةُ ${sur.name}</div>
      ${a === 1 && sur.n !== 1 && sur.n !== 9 ? '<div class="basmala">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>' : ''}
      <div class="text" id="text"></div>
    </section>
    <section class="panel" id="livePanel" ${opt.showLive ? '' : 'hidden'}>
      <div class="small">ما يسمعه البرنامج الآن:</div>
      <div class="live" id="live">—</div>
      <details class="log"><summary>سجلّ التشخيص</summary>
        <button class="btn small" id="copyLog" type="button" style="margin-top:8px">نسخ السجلّ</button>
        <pre id="logText"></pre></details>
    </section>
    <section class="panel" id="result" hidden></section>
    <div class="bar"><div class="wrap">
      <button class="mic" id="mic" type="button" aria-label="ابدأ التسميع">${ICON.mic}</button>
      <div class="prog"><div class="t" id="progT">اضغط الميكروفون لتبدأ</div><div class="track"><i id="progI"></i></div></div>
      <button class="btn" id="hint" type="button" disabled>تلميح</button>
      <button class="btn" id="finish" type="button" disabled>إنهاء</button>
    </div></div>`;

  $('#ta').value = a; $('#tb').value = b; $('#optMode').value = opt.mode;
  const goRange = (s2, a2, b2) => location.replace(`#/tasmee/${s2}/${a2}/${b2}`);
  $('#ts').onchange = e => { const n = +e.target.value; goRange(n, 1, Math.min(Q.surahs[n - 1].count, 5)); };
  $('#ta').onchange = e => { const v = +e.target.value; goRange(sur.n, v, Math.max(v, b)); };
  $('#tb').onchange = e => { const v = +e.target.value; goRange(sur.n, Math.min(a, v), v); };
  $('#optFirst').onchange = e => { Store.setPref('firstWord', e.target.checked); route(); };
  $('#optLive').onchange = e => { Store.setPref('showLive', e.target.checked); $('#livePanel').hidden = !e.target.checked; opt.showLive = e.target.checked; };
  $('#optMode').onchange = e => { Store.setPref('listen-mode', e.target.value); opt.mode = e.target.value; };
  $('#copyLog').onclick = () => {
    const txt = navigator.userAgent + '\n' + Engine.LOG.join('\n');
    navigator.clipboard.writeText(txt).then(() => { $('#copyLog').textContent = 'نُسخ'; }).catch(() => {});
  };

  // بناء النص المخفي
  const box = $('#text');
  W.forEach((w, k) => {
    const sp = document.createElement('span'); sp.className = 'w h'; sp.dataset.k = k; sp.textContent = w.u;
    box.appendChild(sp); box.appendChild(document.createTextNode(' '));
    if (!W[k + 1] || W[k + 1].i !== w.i){
      const num = document.createElement('span'); num.className = 'num'; num.textContent = '﴿' + AR(w.n) + '﴾';
      box.appendChild(num); box.appendChild(document.createTextNode(' '));
    }
  });
  const spans = $$('.w', box), revealed = new Set();
  const pillW = k => (W[k].raw.replace(/\s/g, '').length * 0.42 + 0.5) + 'em';

  function render(text){
    const S = Engine.S;
    spans.forEach((sp, k) => {
      const st = Engine.statusOf(k); let c;
      if (S.done) c = !st ? 'w far' : S.fixed.has(k) ? 'w ok fixed' : 'w ' + st.st;
      else if (st && ['ok', 'hint', 'given', 'gap'].includes(st.st)){
        c = 'w ' + st.st;
        if (st.st === 'ok' && !revealed.has(k)){ revealed.add(k); c += ' fresh'; }
      } else c = k === S.pos && S.running ? 'w h cur' : 'w h';
      if (sp.className !== c) sp.className = c;
      sp.style.minWidth = /^w h( |$)/.test(c) ? pillW(k) : '';
    });
    const N = W.length;
    $('#progI').style.width = (S.pos / N * 100) + '%';
    $('#progT').textContent = S.done ? 'انتهى التسميع' : S.running ? `${AR(S.pos)} من ${AR(N)} كلمة` : S.pos ? `متوقّف عند ${AR(S.pos)} من ${AR(N)}` : 'اضغط الميكروفون لتبدأ';
    $('#mic').classList.toggle('on', S.running);
    $('#mic').setAttribute('aria-label', S.running ? 'أوقف مؤقتًا' : 'ابدأ التسميع');
    $('#hint').disabled = !S.running; $('#finish').disabled = S.done || !S.pos;
    ['#ts', '#ta', '#tb', '#optFirst', '#optMode'].forEach(id => { $(id).disabled = S.running; });
    if (text !== undefined && opt.showLive){
      $('#live').innerHTML = (text ? '<b>' + esc(text) + '</b>' : '—') + (S.lost >= 4 ? '<div class="lostmsg">لم أتبيّن موضعك، أعد الآية من أوّلها.</div>' : '');
    }
    $('#logText').textContent = Engine.LOG.join('\n');
    const cur = $('.cur', box);
    if (cur && S.running){ const r = cur.getBoundingClientRect(); if (r.bottom > innerHeight - 130 || r.top < 60) cur.scrollIntoView({block: 'center', behavior: 'smooth'}); }
  }

  let saved = null;
  Engine.setup(W, opt, {
    update: render,
    warn: msg => { const w = $('#warn'); w.textContent = msg; w.hidden = false; },
    done: () => { render(); saved = applySession(pid, A, B, W, null); showResult(); }
  });
  render();
  if (!Engine.SR) $('#warn').textContent = 'هذا المتصفح لا يدعم التعرّف على الكلام. على آيفون افتح البرنامج في سفاري، وعلى أندرويد في كروم.', $('#warn').hidden = false;

  $('#mic').onclick = () => { if (Engine.S.done) return route(); Engine.S.running ? Engine.stop() : Engine.start(); };
  $('#hint').onclick = () => { Engine.hint(); $('#hint').classList.remove('hl'); };
  $('#finish').onclick = () => Engine.finish();
  const timer = setInterval(() => { const S = Engine.S; if (S && S.running && Date.now() - S.lastMove > 5000) $('#hint').classList.add('hl'); }, 1000);
  cleanup = () => { clearInterval(timer); Engine.stop(true); };

  function showResult(){
    const S = Engine.S, c = saved.rec, graded = c.ok + c.wrong + c.skip + c.hint;
    const errs = W.map((w, k) => ({w, k, st: S.marks[k]})).filter(x => x.st && (x.st.st === 'wrong' || x.st.st === 'skip'));
    const newAyat = saved.reached.filter(i => !Store.mem(pid)[i]);
    const nextA = b + 1 <= sur.count ? b + 1 : 0;
    const wr = Stats.wird(pid, false), ws = wr && Stats.wirdStatus(pid, wr);
    const inWird = ws && ws.items.some(x => x.a <= B && x.b >= A);
    const wirdNext = inWird && ws.next, wirdDone = inWird && ws.complete;
    const box = $('#result'); box.hidden = false;
    box.innerHTML = `
      <div class="row between">
        <div><div class="score">${AR(c.pct)}٪</div><div class="small">نسبة الكلمات الصحيحة · حُفظت النتيجة</div></div>
        <div class="row"><button class="btn" id="again" type="button">أعد المقطع</button>
        ${wirdNext ? `<a class="btn primary" href="${tasmeeHref(wirdNext.a, wirdNext.b)}">التالي في الورد</a>` : wirdDone ? `<a class="btn primary" href="#/home">أتممت الورد ✓</a>` : nextA ? `<a class="btn primary" href="#/tasmee/${sur.n}/${nextA}/${Math.min(sur.count, nextA + (b - a))}">المقطع التالي</a>` : `<a class="btn primary" href="#/home">الرئيسية</a>`}</div>
      </div>
      <div class="stats">
        <div class="stat okc"><b>${AR(c.ok)}</b><span>صحيحة</span></div>
        <div class="stat wc"><b>${AR(c.wrong)}</b><span>خطأ</span></div>
        <div class="stat"><b>${AR(c.skip)}</b><span>متروكة</span></div>
        <div class="stat hc"><b>${AR(c.hint)}</b><span>بتلميح</span></div>
      </div>
      <p class="small">سمّعت ${count(c.words, 'كلمة واحدة', 'كلمتين', 'كلمات', 'كلمة')} و${count(c.letters, 'حرفًا واحدًا', 'حرفين', 'أحرف', 'حرفًا')}، وأتممت ${count(c.ayat, 'آية واحدة', 'آيتين', 'آيات', 'آية')}.${c.gap ? ` ولم تُحتسب ${count(c.gap, 'كلمة واحدة', 'كلمتان', 'كلمات', 'كلمة')} ${c.gap === 2 ? 'ضاعتا' : 'ضاعت'} لحظة فتح الميكروفون.` : ''}</p>
      ${newAyat.length && c.pct >= 90 ? `<div class="panel addmem"><b>أحسنت!</b> في هذا المقطع ${count(newAyat.length, 'آية واحدة', 'آيتان', 'آيات', 'آية')} لم تكن في محفوظك.
        <div style="margin-top:8px"><button class="btn primary" id="addMem" type="button">أضفها إلى محفوظي</button></div></div>` : ''}
      ${errs.length ? `<div class="small" style="margin-top:8px">مواضع تحتاج انتباهًا. إذا قرأت الكلمة صحيحة وأخطأ البرنامج، اضغط «قرأتها صحيحة»:</div>
        <ul class="errs">${errs.map(x => `<li class="${S.fixed.has(x.k) ? 'fixed' : ''}"><span><span class="q">${x.w.u}</span>
          <span class="small">آية ${AR(x.w.n)} · ${x.st.st === 'wrong' ? `سُمِع: «${esc(x.st.heard)}»` : 'لم تُقرأ'}</span></span>
          <button class="btn small" type="button" data-k="${x.k}">${S.fixed.has(x.k) ? 'تراجع' : 'قرأتها صحيحة'}</button></li>`).join('')}</ul>` : ''}`;
    $('#again').onclick = () => route();
    if ($('#addMem')) $('#addMem').onclick = () => { newAyat.forEach(i => Store.setMem(pid, i, i, true)); $('#addMem').closest('.addmem').innerHTML = '<b>أُضيفت إلى محفوظك.</b> بارك الله في حفظك.'; };
    $$('.errs button').forEach(btn => btn.onclick = () => {
      const k = +btn.dataset.k; S.fixed.has(k) ? S.fixed.delete(k) : S.fixed.add(k);
      saved = applySession(pid, A, B, W, saved); render(); showResult();
    });
    if (!showResult.scrolled){ box.scrollIntoView({behavior: 'smooth', block: 'start'}); showResult.scrolled = true; }
  }
  showResult.scrolled = false;
}

/* يحفظ نتيجة الجلسة (أو يعيد حسابها بعد «قرأتها صحيحة»): السجلّ، وآخر تسميع لكل آية، ومواضع الأخطاء */
function applySession(pid, A, B, W, prev){
  const S = Engine.S, d = Store.data(pid), mem = Store.mem(pid), today = Store.today();
  if (prev){   // تراجع عن أثر الحفظ السابق
    Object.entries(prev.misDelta).forEach(([g, v]) => { d.mis[g] = (d.mis[g] || 0) - v; if (d.mis[g] <= 0) delete d.mis[g]; });
    Object.entries(prev.revPrev).forEach(([i, v]) => { if (v) d.rev[i] = v; else delete d.rev[i]; });
  }
  const rec = prev ? prev.rec : {t: Date.now(), a: A, b: B};
  Object.assign(rec, {ok: 0, wrong: 0, skip: 0, hint: 0, gap: 0, given: 0, fixed: S.fixed.size, words: 0, letters: 0, pages: 0, ayat: 0});
  const misDelta = {}, revPrev = {}, perAyah = {};
  W.forEach((w, k) => {
    const m = S.marks[k]; const pa = perAyah[w.i] || (perAyah[w.i] = {n: 0, seen: 0, err: 0});
    pa.n++; if (!m) return;
    pa.seen++;
    const st = S.fixed.has(k) ? 'ok' : m.st; rec[st]++;
    rec.words++; rec.letters += w.raw.replace(/[^ء-غف-ي]/g, '').length;
    rec.pages += 1 / Q.pageWords[Q.page[w.i]];
    if (st === 'wrong' || st === 'skip' || st === 'hint') pa.err++;
    if (st === 'wrong' || st === 'skip'){ misDelta[w.g] = 1; d.mis[w.g] = (d.mis[w.g] || 0) + 1; }
    else if (st === 'ok' && d.mis[w.g] > 0 && !prev){ misDelta[w.g] = -1; d.mis[w.g]--; if (!d.mis[w.g]) delete d.mis[w.g]; }
  });
  if (prev) Object.entries(prev.misDelta).forEach(([g, v]) => { if (v < 0 && !(g in misDelta)){ misDelta[g] = v; d.mis[g] = (d.mis[g] || 0) + v; if (d.mis[g] <= 0) delete d.mis[g]; } });
  const reached = [];
  Object.entries(perAyah).forEach(([i, pa]) => {
    if (pa.seen === pa.n){ reached.push(+i); revPrev[i] = d.rev[i] || null; d.rev[i] = [today, pa.err]; }
  });
  rec.ayat = reached.length;
  const graded = rec.ok + rec.wrong + rec.skip + rec.hint;
  rec.pct = graded ? Math.round(rec.ok / graded * 100) : 0;
  rec.kind = reached.length && reached.every(i => mem[i]) ? 'review' : 'new';
  if (!prev) Store.addSession(pid, rec);
  Store.touch(pid);
  Store.hooks.session(pid, rec, !prev);
  return {rec, misDelta, revPrev, reached};
}

/* ================= التقرير ================= */
let repDays = 7;
function viewReport(pid){
  const p = Store.profile(pid);
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
    <section class="panel chart"><h2>الكلمات المسمَّعة أسبوعيًّا</h2>${chart}</section>
    <section class="panel">
      <h2>مواضع تحتاج انتباهًا</h2>
      ${weak.length ? `<ul class="list">${weak.map(x => `<li><span><span class="q">${x.word}</span> <span class="small">${Q.label(x.i)} · أخطأت فيها ${count(x.c, 'مرة', 'مرتين', 'مرات', 'مرة')}</span></span>
        <a class="btn small primary" href="#/tasmee/${Q.sur[x.i]}/${Q.num[x.i]}/${Q.num[x.i]}">سمّع الآية</a></li>`).join('')}</ul>`
        : '<p class="small">لا مواضع ضعف حتى الآن. تظهر هنا الكلمات التي تتكرّر أخطاؤك فيها، وتختفي حين تقرؤها صحيحة.</p>'}
    </section>`;
  $$('.seg button').forEach(bt => bt.onclick = () => { repDays = +bt.dataset.d; viewReport(pid); });
}

/* ================= البدء ================= */
(async function boot(){
  try { await Q.load(); }
  catch(e){ app.innerHTML = '<p class="warn">تعذّر تحميل المصحف. تأكّد من الاتصال بالإنترنت ثم أعد فتح الصفحة.</p>'; return; }
  // لا ننتظر السحابة أكثر من ٤ ثوانٍ؛ البرنامج يعمل على الجهاز ثم يتزامن
  await Promise.race([Cloud.init().catch(() => {}), new Promise(r => setTimeout(r, 4000))]);
  route();
  // تحديثات السحابة (أفراد جدد، تعديلات من أجهزة أخرى) تُعرض إلا أثناء التسميع والخريطة
  Cloud.subscribe(() => { if (!/^#\/(tasmee|map|listen|goal|ask)/.test(location.hash)) route(true); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
