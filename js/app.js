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
  // عدّاد ما ينتظرني: طلبات تسميع موجّهة إليّ (أو لأي فرد)، وطلبات ربط لوليّ الأمر
  const me = typeof meId === 'function' ? meId() : null, rs = Cloud.st.requests || [];
  const n = me ? rs.filter(r => r.status === 'pending' && (r.type === 'relink' ? isOwner() : r.from !== me && (r.to === me || r.to == null))).length : 0;
  $('#topWho').innerHTML = (n ? `<a class="badge" href="#/" aria-label="طلبات بانتظارك">🔔 ${AR(n)}</a>` : '') + (p && back ? avatar(p, 'sm') : '');
  document.title = (n ? `(${n}) ` : '') + 'حلقة البيت';
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
  if (parts[0] === 'majlis') return viewMajlis();
  if (parts[0] === 'play' && parts[1] === 'wird' && pid) return viewPlayWird(pid);
  if (!parts.length || !pid) return viewProfiles();
  ({home: viewHome, map: viewMap, tasmee: viewTasmee, report: viewReport, goal: viewGoal, ask: viewAsk, play: viewPlay, start: viewStart, mut: viewMut, cert: viewCert, drill: viewDrill}[parts[0]] || viewProfiles)(pid, parts.slice(1).map(Number));
  window.scrollTo(0, keepScroll === true ? y : 0);
}
window.addEventListener('hashchange', () => route());

/* ================= الأفراد ================= */
function viewProfiles(){
  setTop('حلقة البيت');
  const ps = Store.profiles(), inFam = !!(Cloud.st.fid && Cloud.st.family);
  const qs = new URLSearchParams(location.search);
  if (Cloud.st.ok && !inFam && qs.get('inv')) return viewInviteLanding(qs.get('inv'));
  if (Cloud.st.ok && !inFam && qs.get('j')) return viewJoinLanding(qs.get('j').toUpperCase());
  if (inFam && (qs.get('inv') || qs.get('j'))) clearQuery();
  const notice = viewProfiles.notice; viewProfiles.notice = '';
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
    // ملفّات مربوطة بأجهزة أخرى (عدا وليّ الأمر، فهو يعود بحساب Google)
    const taken = others.filter(p => Array.isArray(p.uids) && p.uids.length && !p.uids.includes(Cloud.st.family.owner));
    const myRelink = (Cloud.st.requests || []).find(r => r.type === 'relink' && r.by === (Cloud.st.user && Cloud.st.user.uid) && r.status === 'pending');
    body = `
    <section class="intro"><h1>${me.length ? 'أهلًا ' + esc(me[0].name) : 'من أنت؟'}</h1>
      <p class="muted">${me.length ? 'اضغط اسمك لتكمل حفظك ومراجعتك.' : 'اختر اسمك إن أضافه وليّ الأمر، أو أضف اسمك.'}</p></section>
    ${me.length ? `<div class="profiles">${me.map(card).join('')}</div>` : `
    <section class="panel today">
      ${free.length ? `<h3>هل أنت أحد هؤلاء؟</h3><div class="row" style="margin-top:8px">${free.map(p => `<button class="btn claim" type="button" data-id="${p.id}">أنا ${esc(p.name)}</button>`).join('')}</div>` : ''}
      ${addForm('meForm', free.length ? 'أو أضف اسمك' : 'اسمك', 'دخول باسمي')}
    </section>
    ${taken.length ? `<section class="panel">
      <h3>ملفّك موجود لكنه على جهاز آخر؟</h3>
      <p class="small" style="margin:4px 0 8px">يحدث هذا بعد تغيير الجوال أو مسح بيانات المتصفّح. اضغط اسمك فيصل طلبك إلى وليّ الأمر، وحين يوافق يعود ملفّك كاملًا إلى هذا الجهاز.</p>
      ${myRelink ? `<p class="metmsg" style="color:var(--hint)">⏳ أُرسل طلبك لربط ملفّ ${esc(pname(myRelink.from))}. انتظر موافقة وليّ الأمر.</p>`
        : `<div class="row">${taken.map(p => `<button class="btn relink" type="button" data-id="${p.id}">أنا ${esc(p.name)}</button>`).join('')}</div>`}
    </section>` : ''}`}
    ${majlisCard()}
    ${tankCard()}
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
  app.innerHTML = (notice ? `<p class="warn">${esc(notice)}</p>` : '') + body + `
${inFam && !isOwner() ? '' : `
    <section class="panel">
      <h3>${inFam ? 'نسخة احتياطية للحلقة كاملة' : 'النسخة الاحتياطية'}</h3>
      <p class="small">${inFam
        ? 'بيانات الحلقة محفوظة في السحابة. وهذه نسخة إضافية في جهازك: محفوظ كل الأفراد ومراجعاتهم وأهدافهم وسجلّ جلساتهم كاملًا. يحسن تنزيلها مرة في الشهر.'
        : 'البيانات محفوظة في هذا الجهاز فقط. نزّل نسخة احتياطية بين حين وآخر، ويمكنك استرجاعها في أي جهاز.'}</p>
      ${inFam ? (() => { const t = Store.pref('famBackup', 0); const days = t ? Store.today() - Store.dayOf(t) : -1;
        return `<p class="small ${days < 0 || days > 30 ? 'due' : ''}">${days < 0 ? 'لم تُنزَّل نسخة بعد.' : 'آخر نسخة: ' + ago(t) + (days > 30 ? ' — حان وقت نسخة جديدة.' : '')}</p>`; })() : ''}
      <div class="row">
        <button class="btn" id="exp" type="button">${inFam ? 'تنزيل نسخة الحلقة' : 'تنزيل نسخة احتياطية'}</button>
        ${inFam ? '<label class="btn" for="impFam" style="color:var(--ink);font-size:14px">استرجاع من نسخة</label><input type="file" id="impFam" accept="application/json,.json" hidden>'
          : '<label class="btn" for="imp" style="color:var(--ink);font-size:14px">استرجاع من ملف</label><input type="file" id="imp" accept="application/json,.json" hidden>'}
      </div>
      ${inFam ? '<p class="small" id="restoreSt" style="margin:8px 0 0">الاسترجاع يضيف ما فُقد ولا يمحو شيئًا مما هو موجود الآن.</p>' : ''}
      <div>
      </div>
    </section>`}`;

  $$('.prof').forEach(b => b.onclick = () => { Store.cur = b.dataset.id; location.hash = '#/home'; });
  $$('.relink').forEach(b => b.onclick = async () => {
    b.disabled = true;
    try { await Cloud.requestRelink(b.dataset.id); }
    catch(e){ b.disabled = false; alert('تعذّر إرسال الطلب. تأكّد من الاتصال.'); }
  });
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
  bindPeerBanner(); bindTank();
  bindFamilyPanel();
  const download = (txt, name) => {
    const blob = new Blob([txt], {type: 'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  if ($('#exp')) $('#exp').onclick = async () => {
    const date = new Date().toISOString().slice(0, 10);
    if (!inFam) return download(Store.exportJSON(), `حلقة-البيت-${date}.json`);
    const btn = $('#exp'); btn.disabled = true; btn.textContent = 'جارٍ جمع بيانات الحلقة…';
    try {
      const members = Store.profiles().filter(p => p.cloud);
      for (const p of members) await Cloud.loadSessions(p.id, true);
      const fam = Cloud.st.family;
      const out = {v: 1, kind: 'family-backup', at: Date.now(),
        family: {id: fam.id, name: fam.name, joinCode: fam.joinCode, created: fam.created, reward: fam.reward || ''},
        members: members.map(p => ({id: p.id, name: p.name, color: p.color, uids: p.uids || [], data: Store.data(p.id)}))};
      download(JSON.stringify(out), `حلقة-${fam.name.replace(/s+/g, '-')}-${date}.json`);
      Store.setPref('famBackup', Date.now());
      const n = members.reduce((t, p) => t + Store.data(p.id).sess.length, 0);
      btn.textContent = `نُزّلت: ${count(members.length, 'فرد واحد', 'فردان', 'أفراد', 'فردًا')} و${count(n, 'جلسة واحدة', 'جلستان', 'جلسات', 'جلسة')}`;
    } catch(e){ btn.disabled = false; btn.textContent = 'تنزيل نسخة الحلقة'; alert('تعذّر جمع البيانات. تأكّد من الاتصال ثم أعد المحاولة.'); }
  };
  // وليّ الأمر: استرجاع نسخة الحلقة (دمج آمن)
  if ($('#impFam')) $('#impFam').onchange = async e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    let bk; try { bk = JSON.parse(await file.text()); } catch(x){ return alert('هذا الملف ليس نسخة احتياطية صالحة.'); }
    if (!bk || bk.kind !== 'family-backup' || !Array.isArray(bk.members)) return alert('هذا الملف ليس نسخة احتياطية لحلقة. نسخة الحلقة تُنزَّل من زرّ «تنزيل نسخة الحلقة».');
    const nS = bk.members.reduce((t, x) => t + (((x.data || {}).sess) || []).length, 0);
    const other = bk.family && bk.family.id !== Cloud.st.fid;
    const msg = `نسخة بتاريخ ${new Date(bk.at).toLocaleDateString('ar-SA-u-ca-gregory', {day: 'numeric', month: 'long', year: 'numeric'})}
`
      + `فيها ${count(bk.members.length, 'فرد واحد', 'فردان', 'أفراد', 'فردًا')} و${count(nS, 'جلسة واحدة', 'جلستان', 'جلسات', 'جلسة')}.
`
      + (other ? `تنبيه: النسخة من «حلقة ${bk.family.name}» لا من حلقتك الحالية، وستُضاف أفرادها إليها.
` : '')
      + 'الاسترجاع يضيف ما فُقد ولا يمحو شيئًا موجودًا. متابعة؟';
    if (!confirm(msg)) return;
    const st = $('#restoreSt');
    try {
      const r = await Cloud.restoreFamily(bk, p => { st.textContent = 'جارٍ الاسترجاع: ' + p; });
      st.textContent = `تمّ الاسترجاع: ${count(r.members, 'فرد واحد', 'فردان', 'أفراد', 'فردًا')} و${count(r.sessions, 'جلسة واحدة', 'جلستان', 'جلسات', 'جلسة')}.`;
    } catch(x){ st.textContent = 'تعذّر إكمال الاسترجاع: ' + (x.code || x.message) + '. أعد المحاولة؛ لا ضرر من التكرار.'; }
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
      <p style="margin:12px 0 0"><a class="btn" href="#/majlis">📺 مجلس الجمعة</a> <span class="small">اعرضه على التلفزيون مع العائلة</span></p>
      ${st.user.anon ? `<div class="protect"><b>🛡️ احمِ ملفّك</b>
        <p class="small" style="margin:2px 0 8px">اربطه بحساب Google، فيعود إليك على أي جوال بالدخول بـ Google، ولا يضيع إن مُسحت بيانات المتصفّح.</p>
        <button class="btn small primary" id="linkG" type="button">اربط بحساب Google</button></div>` : ''}
      <p style="margin:10px 0 0" class="small">${st.user.email ? esc(st.user.email) + ' · ' : ''}<button class="btn small" id="signOut" type="button">تسجيل الخروج من هذا الجهاز</button></p>${admin}
      ${isOwner() ? `<details class="danger-zone"><summary class="small">حذف الحلقة كاملة</summary>
        <p class="small" style="margin:6px 0 8px">يحذف نهائيًّا كل أفراد الحلقة وجلساتهم وطلباتهم وأرقامهم، ويُلغي رمز العائلة. لا يمكن التراجع. يحسن تنزيل نسخة احتياطية قبله.</p>
        <button class="btn small danger" id="delFam" type="button">حذف الحلقة كاملة</button></details>` : ''}
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
      ${g ? '' : '<p class="small" style="margin:10px 0 0">ربطت ملفّك بحساب Google من قبل؟ <button class="btn small" id="gBack" type="button">الدخول بحساب Google</button></p>'}
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
  if ($('#delFam')) $('#delFam').onclick = async () => {
    const name = Cloud.st.family.name;
    if (!confirm(`حذف «حلقة ${name}» نهائيًّا بكل أفرادها وجلساتهم؟`)) return;
    const typed = prompt(`للتأكيد اكتب اسم الحلقة كما هو:
${name}`);
    if ((typed || '').trim() !== name.trim()) return alert('لم يطابق الاسم، فلم يُحذف شيء.');
    const b = $('#delFam'); b.disabled = true;
    try { await Cloud.deleteFamily(step => { b.textContent = step + '…'; }); location.hash = '#/'; route(); alert('حُذفت الحلقة.'); }
    catch(e){ b.disabled = false; b.textContent = 'حذف الحلقة كاملة'; alert('تعذّر إكمال الحذف: ' + (e.code || e.message) + '. أعد المحاولة؛ يكمل من حيث توقّف.'); }
  };
  if ($('#gBack')) $('#gBack').onclick = () => Cloud.googleSignIn().catch(err);
  if ($('#linkG')) $('#linkG').onclick = async () => {
    try { await Cloud.linkGoogle(); alert('تمّ الربط. ملفّك الآن محفوظ بحساب Google، ويعود إليك على أي جوال بالدخول به.'); route(true); }
    catch(e){ alert(e.code === 'auth/popup-closed-by-user' ? 'أُغلقت نافذة الدخول قبل إكماله.' : 'تعذّر الربط: ' + (e.code || e.message)); }
  };
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
  const av = $('#topWho .av'); if (av) av.remove();   // يبقى عدّاد الطلبات
  const m = Stats.memorized(pid), sg = Stats.suggest(pid), d = Store.data(pid);
  const recent = d.sess.slice(-5).reverse();
  const edit = Cloud.canEdit(p), own = Cloud.mine(p);
  app.innerHTML = `
    <section class="who">${avatar(p)}<div><h1>${esc(p.name)}</h1><a href="#/" class="small">${own || !p.cloud ? 'تبديل الفرد' : 'رجوع إلى الحلقة'}</a></div></section>
    ${edit ? (own || !p.cloud ? '' : '<p class="note">تدير هذا الملف بصفتك وليّ الأمر.</p>') : '<p class="note">تعرض ملف ' + esc(p.name) + ' للاطّلاع فقط.</p>'}
    <div class="mini-stats" aria-label="المحفوظ">
      <span><b>${Q.dec(m.juz)}</b> جزء</span><span><b>${Q.dec(m.pages)}</b> وجه</span><span><b>${AR(m.ayat)}</b> آية</span><span><b>${Q.dec(m.pct)}٪</b> من القرآن</span>
    </div>
    <div class="qbar" aria-hidden="true"><i style="width:${m.pct}%"></i></div>
    ${own ? peerBanner() : ''}
    ${own ? majlisCard() : ''}
    ${m.words ? certCard(pid, Cloud.canEdit(p)) : ''}
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
  bindPeerBanner(); bindHifz(pid);
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
  // إعادة إرسال النتيجة نفسها (المقطع والمسمِّع نفساهما خلال ٥ دقائق) لا تُحسب جلسة ثانية
  if (d.sess.some(s => s.mode === 'peer' && s.a === r.a && s.b === r.b && s.by === r.result.listener && Math.abs(s.t - r.result.t) < 5 * 60e3)) return;
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
  Store.addSession(pid, rec);
  // حفظ جديد أتقنه أمام أحد أهله: يُضاف إلى محفوظه
  if (rec.kind === 'new' && rec.pct >= 90) Object.keys(per).map(Number).filter(i => !mem[i]).forEach(i => Store.setMem(pid, i, i, true));
  Store.touch(pid); Store.hooks.session(pid, rec, true);
}
Cloud.onPeerDone = applyPeer;

/* بطاقات الطلبات: الواردة إليّ، والتي أرسلتها */
function peerBanner(){
  const me = meId(); if (!me || !Cloud.st.fid) return '';
  const all = Cloud.st.requests || [], rs = all.filter(r => r.type !== 'relink');
  const incoming = rs.filter(r => r.status === 'pending' && r.from !== me && (r.to === me || r.to == null));
  const mineOut = rs.filter(r => r.from === me && (r.status === 'pending' || (r.status === 'declined' && Date.now() - (r.at || 0) < 864e5)));
  const relinks = isOwner() ? all.filter(r => r.type === 'relink' && r.status === 'pending') : [];
  if (!incoming.length && !mineOut.length && !relinks.length) return '';
  return `<section class="panel peer">
    ${relinks.map(r => `<div class="preq">
      <p><b>${esc(pname(r.from))}</b> يطلب ربط ملفّه بجهاز جديد (غيّر جواله أو مُسحت بياناته).</p>
      <div class="row"><button class="btn primary small" type="button" data-relink="${r.id}">موافقة</button>
      <button class="btn small" type="button" data-relno="${r.id}">رفض</button></div></div>`).join('')}
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
  $$('[data-relink]').forEach(b => b.onclick = async () => {
    const r = (Cloud.st.requests || []).find(x => x.id === b.dataset.relink); if (!r) return;
    if (!confirm(`سيُربط ملفّ ${pname(r.from)} بالجهاز الجديد، ويُفكّ عن جهازه القديم. هل طلبه هو فعلًا؟`)) return;
    try { await Cloud.approveRelink(r); } catch(e){ alert('تعذّر ذلك. تأكّد من الاتصال.'); }
  });
  $$('[data-relno]').forEach(b => b.onclick = () => Cloud.setStatus(b.dataset.relno, 'declined').catch(() => {}));
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
function viewAsk(pid, [s0, a0, b0] = []){
  const p = Store.profile(pid), me = meId();
  if (s0 && a0) viewAsk.range = {pid, r: [Q.idx(s0, a0), Q.idx(s0, b0 || a0)]};
  if (!Cloud.st.fid || !me || !Cloud.mine(p)) return location.replace('#/home');
  setTop('اطلب تسميعًا', '#/home');
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
      try {
        await Cloud.sendRequest(pid, to() || null, A, B);
        const wa = $('#wa').href;
        render();
        app.insertAdjacentHTML('afterbegin', `<section class="panel today met"><h2>أُرسل الطلب ✓</h2>
          <p class="small" style="margin:4px 0 10px">يظهر في برنامجه حين يفتحه. أخبره الآن ليفتحه:</p>
          <a class="btn primary" href="${wa}" target="_blank" rel="noopener">أخبره في واتساب</a></section>`);
        scrollTo(0, 0);
      }
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
      const result = Cloud.makeResult(me, marks, $('#lnote').value.trim());
      const direct = Cloud.canEdit(Store.profile(from));
      const rid = await Cloud.submitResult(req ? req.id : null, {from, to: me, a: A, b: B, result, direct});
      if (direct) applyPeer({id: rid, from, a: A, b: B, result});
      // نصيب المسمِّع
      const dm = Store.data(me), t = Store.today(), e = (dm.lis = dm.lis || {})[t] || [0, 0];
      dm.lis[t] = [e[0] + 1, e[1] + W.length];
      Object.keys(dm.lis).forEach(k => { if (+k < t - 60) delete dm.lis[k]; });
      Store.touch(me);
      const err = Object.values(marks).length, pctv = Math.round((W.length - err) / W.length * 100);
      app.innerHTML = `<section class="panel today met"><h2>أُرسلت النتيجة إلى ${esc(pname(from))}</h2>
        <p style="font-size:34px;font-weight:700;color:var(--accent);margin:6px 0">${AR(pctv)}٪</p>
        <p class="small">${direct ? 'سُجّلت في ملفّه الآن.' : 'تُسجَّل في ملفّه حين يفتح برنامجه.'} ${pctv >= 90 ? 'وما لم يكن في محفوظه يُضاف إليه لأنه أتقنه.' : 'ولم يبلغ ٩٠٪، فلا يُضاف جديدٌ إلى محفوظه حتى يتقنه.'} جزاك الله خيرًا على التسميع.</p>
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

/* ================= بطاقة مجلس الجمعة (يوم الجمعة فقط) ================= */
const isFriday = () => (Store.today() + 5) % 7 === 6;
const majlisCard = () => Cloud.st.fid && isFriday() ? `<a class="panel majlis-card" href="#/majlis">
  <span class="mc-ic">📺</span><span><b>اليوم الجمعة: وقت مجلس الجمعة</b><span class="small">اجمع أهلك واعرض أسبوعكم على التلفزيون.</span></span></a>` : '';

/* ================= الخزّان العائلي ================= */
function familyTank(){
  const ps = Store.profiles().filter(p => p.cloud).map(p => ({p, local: Cloud.canRecite(p)}));
  return Stats.tank(ps);
}
// رسم الخزّان: طبقات بألوان الأفراد من الأسفل، بقدر نصيب كلٍّ من السعة
function tankSVG(t){
  const X = 14, Y = 14, Wd = 92, H = 172, fillH = Math.min(1, t.fill) * H;
  let y = Y + H, layers = '';
  if (t.cap) t.parts.filter(x => x.pct > 0).sort((a, b) => b.pct - a.pct).forEach(x => {
    const h = Math.min(y - (Y + H - fillH), x.pct / t.cap * H); if (h <= 0) return;
    y -= h;
    layers += `<rect x="${X}" y="${y.toFixed(1)}" width="${Wd}" height="${h.toFixed(1)}" fill="${x.p.color}" opacity=".88"/>`;
  });
  const top = Y + H - fillH;
  return `<svg class="tank-svg" viewBox="0 0 120 200" role="img" aria-label="امتلاء الخزّان ${Math.round(Math.min(1, t.fill) * 100)}٪">
    <defs><clipPath id="tclip"><rect x="${X}" y="${Y}" width="${Wd}" height="${H}" rx="16"/></clipPath></defs>
    <rect x="${X}" y="${Y}" width="${Wd}" height="${H}" rx="16" fill="var(--cell)"/>
    <g clip-path="url(#tclip)">${layers}
      ${fillH > 2 && fillH < H ? `<path d="M${X} ${top.toFixed(1)} q11.5 -5 23 0 t23 0 t23 0 t23 0" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>` : ''}
    </g>
    <rect x="${X}" y="${Y}" width="${Wd}" height="${H}" rx="16" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
    ${[0.25, 0.5, 0.75].map(k => `<line x1="${X + Wd - 10}" x2="${X + Wd}" y1="${(Y + H - k * H).toFixed(1)}" y2="${(Y + H - k * H).toFixed(1)}" stroke="var(--muted)" stroke-width="1.5"/>`).join('')}
  </svg>`;
}
function tankCard(){
  if (!Cloud.st.fid || !Cloud.st.family) return '';
  const t = familyTank(), fam = Cloud.st.family, owner = isOwner();
  const pctFill = Math.round(Math.min(1, t.fill) * 100);
  const left = Stats.weekStart(Store.today()) + 7 - Store.today();
  const reward = fam.reward ? `<p class="reward">🎁 مكافأة الأسبوع: <b>${esc(fam.reward)}</b></p>` : owner ? '' : '<p class="small">لم يحدّد وليّ الأمر مكافأة بعد.</p>';
  return `
    <section class="panel tank ${t.full ? 'full' : ''}">
      <div class="row between"><h2>خزّان الحلقة</h2><span class="small">${left <= 1 ? 'آخر يوم · الجمعة' : `باقي ${count(left, 'يوم', 'يومان', 'أيام', 'يومًا')}`}</span></div>
      <div class="tank-wrap">
        ${tankSVG(t)}
        <div class="tank-side">
          <div class="tank-pct">${t.cap ? AR(pctFill) + '٪' : '—'}</div>
          ${t.full ? `<p class="tank-full">امتلأ الخزّان! ${fam.reward ? 'استحققتم المكافأة 🎉' : 'بارك الله فيكم 🎉'}</p>`
            : t.cap ? `<p class="small" style="margin:0">يمتلئ حين يحقّق كل فرد هدفه هذا الأسبوع.</p>`
            : '<p class="small" style="margin:0">يبدأ بالامتلاء حين يضع أفراد الحلقة أهدافهم.</p>'}
          <ul class="tank-legend">${t.parts.map(x => `<li><i style="background:${x.p.color}"></i><span>${esc(x.p.name)}</span>
            <b>${x.hasGoal ? AR(Math.round(x.base)) + '٪' : '—'}${x.bonus ? ` <small>+${AR(x.bonus)}٪ تسميع لغيره</small>` : ''}</b></li>`).join('')}</ul>
        </div>
      </div>
      ${reward}
      ${owner ? `<form id="rewardForm" class="row" style="margin-top:8px">
        <label for="rw">مكافأة الأسبوع</label>
        <input type="text" id="rw" maxlength="80" value="${esc(fam.reward || '')}" placeholder="مثل: عشاء في المطعم" style="flex:1;min-width:10em">
        <button class="btn small" type="submit">${fam.reward ? 'تعديل' : 'حفظ'}</button></form>` : ''}
      <p class="small" style="margin:10px 0 0">نصيب كل فرد نسبة ما حقّقه من هدفه (إلى ١٥٠٪)، ومن سمّع لغيره زاد ٥٪ لكل تسميع.</p>
    </section>`;
}
function bindTank(){
  const f = $('#rewardForm'); if (!f) return;
  f.onsubmit = async e => {
    e.preventDefault();
    try { await Cloud.setReward($('#rw').value.trim()); } catch(x){ alert('تعذّر الحفظ. تأكّد من الاتصال.'); }
  };
}
// سطر مختصر في الرئيسية
function tankLine(){
  if (!Cloud.st.fid) return '';
  const t = familyTank(); if (!t.cap) return '';
  return `<a class="tankline ${t.full ? 'full' : ''}" href="#/"><span>خزّان الحلقة</span><span class="qbar"><i style="width:${Math.min(100, t.fill * 100)}%"></i></span><b>${AR(Math.round(Math.min(1, t.fill) * 100))}٪</b></a>`;
}

/* ================= مجلس الجمعة (شاشة عرض للتلفزيون) ================= */
// آية الأسبوع للتدبّر: ٥٢ مقطعًا (سورة، من، إلى)، روجعت أرقامها على نصّ المصحف، وتدور أسبوعيًّا
const WEEK_AYAT = [[17,9,9],[54,17,17],[38,29,29],[20,114,114],[66,6,6],[25,74,74],[14,40,41],[31,13,13],[13,28,28],[73,4,4],
  [2,152,152],[94,5,6],[3,103,103],[49,10,10],[17,23,24],[59,21,21],[10,57,57],[16,97,97],[39,9,9],[58,11,11],[2,286,286],
  [3,139,139],[20,25,28],[18,10,10],[35,29,30],[29,45,45],[8,2,2],[65,2,3],[33,41,42],[57,16,16],[2,185,185],[47,24,24],
  [41,33,33],[3,191,191],[46,15,15],[4,82,82],[103,1,3],[2,201,201],[112,1,4],[39,53,53],[7,204,204],[15,9,9],[36,12,12],
  [42,52,52],[64,16,16],[62,2,2],[11,114,114],[24,35,35],[76,8,9],[93,11,11],[28,77,77],[50,18,18]];
let mjWeek = 0, mjIdx = 0, mjPlay = true;

// ملخّص أسبوع لفرد من بياناته المزامَنة (جلسات، حفظ جديد، تسميع لغيره)
function weekSummary(id, w){
  const d = Store.data(id), inW = x => x >= w && x < w + 7, days = new Set();
  let rp = 0, np = 0, na = 0, ss = 0, words = 0, letters = 0, lis = 0;
  d.sess.forEach(s => { const sd = Store.dayOf(s.t); if (!inW(sd)) return; ss++; words += s.words || 0; letters += s.letters || 0; if (s.kind === 'review') rp += s.pages || 0; days.add(sd); });
  Object.entries(d.nl || {}).forEach(([k, v]) => { if (inW(+k)){ np += v[0]; na += v[1]; } });
  Object.entries(d.lis || {}).forEach(([k, v]) => { if (inW(+k)){ lis += v[0]; days.add(+k); } });
  const g = d.goal, m = Stats.memorized(id), parts = [];
  const revT = g && g.rc ? Math.max(1, Math.round(m.pages / g.rc * 2) / 2) : 0;
  const newD = g && g.nu === 'ayah' ? na : np;
  if (g && g.n) parts.push(Math.min(1.5, newD / g.n));
  if (revT) parts.push(Math.min(1.5, rp / revT));
  const base = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length * 100 : 0;
  const bonus = Math.min(Stats.TANK.listenCap, Stats.TANK.perListen * lis);
  return {rp, np, na, newD, ss, words, letters, lis, days: days.size, hasGoal: parts.length > 0, base: Math.min(150, base), bonus,
          pct: Math.min(150, base) + bonus, newT: g ? g.n : 0, unit: g ? g.nu : 'page', revT,
          met: parts.length > 0 && parts.every(x => x >= 1)};
}

function viewMajlis(){
  if (!Cloud.st.fid || !Cloud.st.family){ location.replace('#/'); return; }
  document.body.classList.add('stage');
  app.innerHTML = '<div class="stage-wrap"><p class="stage-load">جارٍ تحضير المجلس…</p></div>';
  const members = Store.profiles().filter(p => p.cloud);
  let timer = null, keyH = null, confT = null;
  cleanup = () => { clearInterval(timer); clearTimeout(confT); document.removeEventListener('keydown', keyH); document.body.classList.remove('stage'); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  Promise.all(members.map(p => Cloud.loadSessions(p.id).catch(() => {}))).then(() => { if (location.hash.startsWith('#/majlis')) build(); });

  function build(){
    const fam = Cloud.st.family, today = Store.today();
    const w = Stats.weekStart(today) + mjWeek * 7;
    const fmt = d => new Date(d * 864e5).toLocaleDateString('ar-SA-u-ca-gregory', {day: 'numeric', month: 'long', timeZone: 'UTC'});
    const hij = d => new Date(d * 864e5).toLocaleDateString('ar-SA-u-ca-islamic-umalqura', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'});
    const S = members.map(p => ({p, ...weekSummary(p.id, w)}));
    const withGoal = S.filter(x => x.hasGoal), cap = withGoal.length * 100, sum = S.reduce((t, x) => t + x.pct, 0);
    const tk = {parts: S.map(x => ({p: x.p, pct: x.pct, base: x.base, bonus: x.bonus, hasGoal: x.hasGoal})), cap, sum, fill: cap ? sum / cap : 0, full: cap > 0 && sum >= cap};
    // نجم الأسبوع: الانتظام (أيام التسميع) ثم نسبة الهدف ثم عدد الجلسات
    const star = [...S].filter(x => x.days > 0).sort((a, b) => (b.days - a.days) || (b.pct - a.pct) || (b.ss - a.ss))[0];
    const tot = S.reduce((t, x) => ({rp: t.rp + x.rp, np: t.np + x.np, words: t.words + x.words, letters: t.letters + x.letters, ss: t.ss + x.ss, lis: t.lis + x.lis}), {rp: 0, np: 0, words: 0, letters: 0, ss: 0, lis: 0});
    const [as, aa, ab] = WEEK_AYAT[((Math.floor(w / 7) % WEEK_AYAT.length) + WEEK_AYAT.length) % WEEK_AYAT.length];
    const A = Q.idx(as, aa), B = Q.idx(as, ab);
    let ayahHTML = '';
    for (let i = A; i <= B; i++) ayahHTML += Q.uth[i].split('\t').join(' ') + ` <span class="num">﴿${AR(Q.num[i])}﴾</span> `;
    // حجم خطّ الآية بحسب طولها، لتسع الشاشة
    let aw = 0; for (let i = A; i <= B; i++) aw += Q.words[i];
    const ayahSize = aw <= 14 ? 'clamp(30px,4.6vw,64px)' : aw <= 30 ? 'clamp(26px,3.6vw,52px)' : 'clamp(20px,2.5vw,38px)';
    const big = (v, lbl) => `<div class="mj-stat"><b>${v}</b><span>${lbl}</span></div>`;

    const slides = [
      // ١) الافتتاح
      `<div class="mj-cover">
        <div class="mj-basmala">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>
        <h1>مجلس الجمعة</h1>
        <p class="mj-fam">حلقة ${esc(fam.name)}</p>
        <p class="mj-date">${mjWeek ? 'الأسبوع الماضي' : 'هذا الأسبوع'}: ${fmt(w)} – ${fmt(w + 6)} · ${hij(w + 6)}</p>
      </div>`,
      // ٢) الخزّان
      `<h2 class="mj-h">خزّان الحلقة</h2>
       <div class="mj-tank">${tankSVG(tk)}
         <div><div class="mj-big ${tk.full ? 'gold' : ''}">${cap ? AR(Math.round(Math.min(1, tk.fill) * 100)) + '٪' : '—'}</div>
           ${tk.full ? `<p class="mj-gold">امتلأ الخزّان! ${fam.reward ? 'استحققتم: ' + esc(fam.reward) : 'بارك الله فيكم'} 🎉</p>`
             : fam.reward ? `<p class="mj-sub">🎁 المكافأة: ${esc(fam.reward)}</p>` : ''}
           <ul class="tank-legend mj-legend">${S.map(x => `<li><i style="background:${x.p.color}"></i><span>${esc(x.p.name)}</span><b>${x.hasGoal ? AR(Math.round(x.base)) + '٪' : '—'}${x.bonus ? ` <small>+${AR(x.bonus)}٪</small>` : ''}</b></li>`).join('')}</ul>
         </div></div>`,
      // ٣) أهداف الجميع
      `<h2 class="mj-h">أهداف الأسبوع</h2>
       <div class="mj-cards">${S.map(x => `<div class="mj-card ${x.met ? 'met' : ''}" style="--c:${x.p.color}">
         <div class="mj-card-h">${avatar(x.p)}<b>${esc(x.p.name)}</b>${x.met ? '<span class="mj-ok">✓ حقّق هدفه</span>' : ''}</div>
         ${!x.hasGoal ? '<p class="mj-sub">لم يضع هدفًا بعد</p>' : `
           ${x.newT ? `<div class="gl"><span>حفظ جديد</span><b>${x.unit === 'ayah' ? AR(x.na) : Q.dec(x.np)} من ${unitTxt(x.newT, x.unit)}</b></div><div class="qbar"><i style="width:${Math.min(100, x.newD / x.newT * 100)}%"></i></div>` : ''}
           ${x.revT ? `<div class="gl"><span>مراجعة</span><b>${Q.dec(x.rp)} من ${unitTxt(x.revT, 'page')}</b></div><div class="qbar"><i style="width:${Math.min(100, x.rp / x.revT * 100)}%"></i></div>` : ''}`}
         <p class="mj-sub">${count(x.days, 'يوم واحد', 'يومان', 'أيام', 'يومًا')} من ٧${x.lis ? ` · سمّع لغيره ${count(x.lis, 'مرة', 'مرتين', 'مرات', 'مرة')}` : ''}</p>
       </div>`).join('')}</div>`,
      // ٤) نجم الأسبوع
      star ? `<div class="mj-star">
        <div class="mj-star-icon">⭐</div>
        <p class="mj-sub">نجم الأسبوع</p>
        <h1 style="color:${star.p.color}">${esc(star.p.name)}</h1>
        <p class="mj-reason">سمّع في ${count(star.days, 'يوم واحد', 'يومين', 'أيام', 'يومًا')} من سبعة${star.hasGoal ? ` · وحقّق ${AR(Math.round(star.base))}٪ من هدفه` : ''}${star.lis ? ` · وسمّع لأهله ${count(star.lis, 'مرة', 'مرتين', 'مرات', 'مرة')}` : ''}</p>
        <p class="mj-sub">النجم بالانتظام لا بالكثرة، فالأحبّ إلى الله أدومه وإن قلّ.</p>
      </div>` : `<div class="mj-star"><div class="mj-star-icon">⭐</div><p class="mj-reason">يظهر نجم الأسبوع حين يسمّع أفراد الحلقة.</p></div>`,
      // ختمات الأسبوع (إن وُجدت)
      ...(() => { const done = []; members.forEach(p => { const c = Store.data(p.id).certs || {}; Object.keys(c).forEach(j => { if (c[j] >= w && c[j] < w + 7) done.push([p, +j]); }); });
        return done.length ? [`<div class="mj-star"><div class="mj-star-icon">🏅</div><p class="mj-sub">ختمات الأسبوع</p>
          ${done.map(([p, j]) => `<p class="mj-reason"><b style="color:${p.color}">${esc(p.name)}</b>: إتمام حفظ ${juzTitle(j)}</p>`).join('')}
          <p class="mj-sub">بارك الله في حفظهم، وجعله نورًا لهم.</p></div>`] : []; })(),
      // ٥) حصاد الأسبوع
      `<h2 class="mj-h">حصاد الأسبوع</h2>
       <div class="mj-stats">
         ${big(Q.dec(tot.rp), 'وجهًا راجعتموها')}${big(Q.dec(tot.np), 'وجهًا حفظتموها جديدًا')}${big(AR(tot.ss), 'جلسة تسميع')}
         ${big(AR(tot.lis), 'مرة سمّع بعضكم لبعض')}${big(AR(tot.words), 'كلمة')}${big(AR(tot.letters), 'حرفًا')}
       </div>
       <p class="mj-sub" style="text-align:center">والحرف بعشر أمثالها، والأجر عند الله.</p>`,
      // ٦) آية الأسبوع
      `<h2 class="mj-h">آية الأسبوع للتدبّر</h2>
       <div class="mj-ayah" style="font-size:${ayahSize}">${ayahHTML}</div>
       <p class="mj-ref">سورة ${Q.surahs[as - 1].name}${aa === ab ? ` · الآية ${AR(aa)}` : ` · الآيات ${AR(aa)}–${AR(ab)}`}</p>
       <p class="mj-q">ماذا تعلّمنا هذه الآية؟ وكيف نعمل بها هذا الأسبوع؟</p>`,
      // ٧) الختام
      `<div class="mj-cover">
        <h2 class="mj-h">الأسبوع القادم</h2>
        <p class="mj-reason">${fam.reward ? `🎁 المكافأة: ${esc(fam.reward)}` : 'ليضع كل فرد هدفه، ولنملأ الخزّان معًا.'}</p>
        <p class="mj-dua">اللهمّ اجعل القرآن ربيع قلوبنا، ونور صدورنا، وجلاء أحزاننا، وذهاب همومنا.</p>
      </div>`
    ];
    if (mjIdx >= slides.length) mjIdx = 0;

    app.innerHTML = `
      <div class="stage-wrap">
        <div class="stage-bar">
          <div class="seg" role="group" aria-label="الأسبوع">
            <button type="button" data-w="0" aria-pressed="${mjWeek === 0}">هذا الأسبوع</button>
            <button type="button" data-w="-1" aria-pressed="${mjWeek === -1}">الأسبوع الماضي</button>
          </div>
          <span class="stage-sp"></span>
          <button class="btn small" id="mjFs" type="button">ملء الشاشة</button>
          <a class="btn small" href="#/">خروج</a>
        </div>
        <div class="slide" id="slide" aria-live="polite"></div>
        <canvas id="confetti" aria-hidden="true"></canvas>
        <div class="stage-nav">
          <button class="btn" id="mjPrev" type="button" aria-label="السابق">›</button>
          <div class="dots">${slides.map((_, k) => `<button type="button" data-i="${k}" aria-label="الشريحة ${k + 1}"></button>`).join('')}</div>
          <button class="btn" id="mjNext" type="button" aria-label="التالي">‹</button>
          <button class="btn" id="mjPlay" type="button">${mjPlay ? 'إيقاف' : 'تشغيل'}</button>
        </div>
      </div>`;
    const show = i => {
      mjIdx = (i + slides.length) % slides.length;
      const el = $('#slide'); el.innerHTML = slides[mjIdx]; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
      $$('.dots button').forEach((b, k) => b.setAttribute('aria-current', k === mjIdx ? 'true' : 'false'));
      if ((mjIdx === 1 && tk.full) || (mjIdx === 3 && star)) confetti();
    };
    const restart = () => { clearInterval(timer); if (mjPlay) timer = setInterval(() => show(mjIdx + 1), 15000); };
    $('#mjNext').onclick = () => { show(mjIdx + 1); restart(); };
    $('#mjPrev').onclick = () => { show(mjIdx - 1); restart(); };
    $('#mjPlay').onclick = () => { mjPlay = !mjPlay; $('#mjPlay').textContent = mjPlay ? 'إيقاف' : 'تشغيل'; restart(); };
    $$('.dots button').forEach(b => b.onclick = () => { show(+b.dataset.i); restart(); });
    $$('.stage-bar [data-w]').forEach(b => b.onclick = () => { mjWeek = +b.dataset.w; mjIdx = 0; build(); });
    $('#mjFs').onclick = () => { const r = document.documentElement; (document.fullscreenElement ? document.exitFullscreen() : r.requestFullscreen ? r.requestFullscreen() : Promise.reject()).catch(() => {}); };
    document.removeEventListener('keydown', keyH);
    keyH = e => {
      if (e.key === 'ArrowLeft' || e.key === ' ' || e.key === 'PageDown'){ e.preventDefault(); show(mjIdx + 1); restart(); }
      else if (e.key === 'ArrowRight' || e.key === 'PageUp'){ e.preventDefault(); show(mjIdx - 1); restart(); }
    };
    document.addEventListener('keydown', keyH);
    show(mjIdx); restart();
  }

  // احتفال خفيف (قصاصات ملوّنة) — لا يعمل مع تقليل الحركة
  function confetti(){
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = $('#confetti'); if (!cv) return;
    const ctx = cv.getContext('2d'), W = cv.width = innerWidth, H = cv.height = innerHeight;
    const cols = members.map(p => p.color).concat(['#d8b25e', '#46b8a3']);
    const ps = Array.from({length: 140}, () => ({x: Math.random() * W, y: -20 - Math.random() * H * 0.5, r: 4 + Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)], vy: 2 + Math.random() * 3, vx: -1 + Math.random() * 2, a: Math.random() * 6}));
    const t0 = performance.now();
    const step = t => {
      ctx.clearRect(0, 0, W, H);
      ps.forEach(p => { p.y += p.vy; p.x += p.vx; p.a += 0.1; ctx.fillStyle = p.c; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); });
      if (t - t0 < 4500 && document.body.contains(cv)) requestAnimationFrame(step); else ctx.clearRect(0, 0, W, H);
    };
    requestAnimationFrame(step);
  }
}

/* ================= حفظ اليوم ================= */
const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="3" y="14" width="4" height="7" rx="1.5"/><rect x="17" y="14" width="4" height="7" rx="1.5"/></svg>';
function hifzCard(pid, mode){
  const hz = Stats.hifz(pid, mode === 'self');
  if (!hz) return '';
  const hs = Stats.hifzStatus(pid, hz), unit = hz.unit;
  if (!hs.items.length) return `<section class="panel today hifz"><h2>حفظ اليوم</h2><p class="small">لا مقطع جديد في حدود هدفك؛ ما شاء الله، أتممت ما حدّدته. عدّل هدفك الكبير لتكمل.</p></section>`;
  const amt = unit === 'ayah' ? count(Math.round(hs.total), 'آية واحدة', 'آيتان', 'آيات', 'آية') : unitTxt(hs.total, 'page', true);
  return `
    <section class="panel today hifz ${hs.complete ? 'met' : ''}">
      <div class="row between"><h2>حفظ اليوم</h2><span class="chip">${amt}</span></div>
      <ol class="wlist">${hs.items.map(x => `<li class="${x.done ? 'done' : ''}">
        <span>${itemLabel(x.a, x.b)}</span><span class="wk">${x.done ? '✓' : ''}</span>
        ${!x.done ? `<div class="hz-acts">
          <a class="btn small" href="#/play/${Q.sur[x.a]}/${Q.num[x.a]}/${Q.num[x.b]}">${ICON_PLAY} استمع</a>
          ${mode === 'self' ? `<a class="btn small primary" href="${tasmeeHref(x.a, x.b)}">${ICON.mic} سمّع للبرنامج</a>
            ${Store.profile(pid).cloud ? `<a class="btn small" href="#/ask/${Q.sur[x.a]}/${Q.num[x.a]}/${Q.num[x.b]}">${ICON_EAR} اطلب تسميعًا</a>` : ''}`
          : mode === 'listen' ? `<a class="btn small primary" href="${listenHref(pid, x.a, x.b)}">${ICON_EAR} سمّع له</a>` : ''}
        </div>` : ''}</li>`).join('')}</ol>
      ${hs.complete ? '<p class="metmsg">أتممت حفظ اليوم، زادك الله حفظًا.</p>'
        : '<p class="small" style="margin:6px 0 0">استمع وكرّر حتى تحفظ، ثم سمّع للبرنامج أو لأحد أهلك؛ فإن أتقنته (٩٠٪ فأكثر) أُضيف إلى محفوظك.</p>'}
    </section>`;
}
// لا يُضاف حفظ جديد إلا بتسميع: للبرنامج (٩٠٪ فأكثر) أو لأحد الأهل عبر «سمّعني»
function bindHifz(){}

/* مشغّل التلاوة للحفظ: كل آية تُكرَّر عددًا يختاره الحافظ، والآية الحالية مظلَّلة */
const RECITERS = [['Husary_128kbps', 'الحصري'], ['Husary_Muallim_128kbps', 'الحصري (المصحف المعلّم)'], ['Minshawy_Murattal_128kbps', 'المنشاوي'], ['Alafasy_128kbps', 'العفاسي']];
const pad3 = n => String(n).padStart(3, '0');
function viewPlay(pid, [s, a, b]){
  const sur = Q.surahs[Math.min(Math.max(s || 67, 1), 114) - 1];
  a = Math.min(Math.max(a || 1, 1), sur.count); b = Math.min(Math.max(b || a, a), sur.count);
  const A = sur.start + a - 1, B = sur.start + b - 1;
  viewPlayList(pid, [[A, B]], 'استمع: ' + sur.name, 'hifz');
}
// ورد المراجعة كاملًا (قد يمتدّ على سور عدّة)
function viewPlayWird(pid){
  const w = Stats.wird(pid, false);
  if (!w || !w.items.length) return location.replace('#/home');
  viewPlayList(pid, w.items, 'استمع للورد', 'rev');
}
/* مشغّل التلاوة: مقاطع متتالية، كل آية تُكرَّر عددًا يُختار (للحفظ ٣ افتراضًا، وللمراجعة مرة)، والآية الحالية مظلَّلة */
function viewPlayList(pid, ranges, title, kind){
  setTop(title, '#/home');
  const repKey = kind === 'rev' ? 'repeatRev' : 'repeat';
  let rec = Store.pref('reciter', RECITERS[0][0]), rep = Store.pref(repKey, kind === 'rev' ? 1 : 3);
  const withBas = A => Q.num[A] === 1 && Q.sur[A] !== 1 && Q.sur[A] !== 9;
  const canR = Cloud.canRecite(Store.profile(pid));
  const recHref = kind === 'rev' ? (() => { const w = Stats.wird(pid, false), ws = w && Stats.wirdStatus(pid, w); return ws && ws.next ? tasmeeHref(ws.next.a, ws.next.b) : ''; })()
    : tasmeeHref(ranges[0][0], ranges[0][1]);
  app.innerHTML = `
    <section class="panel">
      <h2>${ranges.length === 1 ? itemLabel(ranges[0][0], ranges[0][1]) : `ورد المراجعة: ${count(ranges.length, 'مقطع واحد', 'مقطعان', 'مقاطع', 'مقطعًا')}`}</h2>
      <div class="row" style="margin-top:10px">
        <label for="pr">القارئ</label><select id="pr">${RECITERS.map(([k, n]) => `<option value="${k}" ${k === rec ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <label for="pp">تكرار كل آية</label><select id="pp">${[1, 3, 5, 10].map(n => `<option value="${n}" ${n === rep ? 'selected' : ''}>${count(n, 'مرة واحدة', 'مرتين', 'مرات', 'مرة')}</option>`).join('')}</select>
      </div>
    </section>
    ${ranges.map(([A, B]) => `<section class="mushaf">
      <div class="sura-head">سُورَةُ ${Q.surahOf(A).name}</div>
      ${withBas(A) ? '<div class="basmala">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>' : ''}
      <div class="text play-text">${Array.from({length: B - A + 1}, (_, k) => `<span class="pa" data-i="${A + k}">${Q.uth[A + k].split('\t').join(' ')} <span class="num">﴿${AR(Q.num[A + k])}﴾</span></span>`).join(' ')}</div>
    </section>`).join('')}
    <div class="bar"><div class="wrap">
      <button class="mic" id="pl" type="button" aria-label="تشغيل">${ICON_PLAY}</button>
      <div class="prog"><div class="t" id="pt">اضغط للاستماع</div><div class="track"><i id="pi"></i></div></div>
      ${canR && recHref ? `<a class="btn" href="${recHref}">${kind === 'rev' ? 'سمّع الورد' : 'سمّع حفظك'}</a>` : ''}
    </div></div>`;
  document.body.classList.add('has-bar');
  const audio = new Audio(); audio.preload = 'auto';
  // قائمة التشغيل: لكل مقطع [البسملة]، ثم كل آية مكرّرةً
  let list = [], pos = 0, playing = false;
  const build = () => {
    list = [];
    ranges.forEach(([A, B]) => {
      if (withBas(A)) list.push({i: -1, url: `https://everyayah.com/data/${rec}/001001.mp3`});
      for (let i = A; i <= B; i++) for (let k = 0; k < rep; k++) list.push({i, k, url: `https://everyayah.com/data/${rec}/${pad3(Q.sur[i])}${pad3(Q.num[i])}.mp3`});
    });
  };
  const mark = () => {
    const cur = list[pos];
    $$('.pa').forEach(el => el.classList.toggle('on', cur && +el.dataset.i === cur.i));
    const on = $('.pa.on'); if (on){ const r = on.getBoundingClientRect(); if (r.bottom > innerHeight - 130 || r.top < 60) on.scrollIntoView({block: 'center', behavior: 'smooth'}); }
    $('#pi').style.width = (list.length ? pos / list.length * 100 : 0) + '%';
    $('#pt').textContent = !cur ? 'انتهى' : cur.i < 0 ? 'البسملة' : `${Q.surahOf(cur.i).name} · الآية ${AR(Q.num[cur.i])}${rep > 1 ? ` · التكرار ${AR(cur.k + 1)} من ${AR(rep)}` : ''}`;
    $('#pl').classList.toggle('on', playing);
  };
  const playAt = p => {
    pos = p; if (pos >= list.length){ playing = false; pos = 0; mark(); $('#pt').textContent = kind === 'rev' ? 'انتهى الورد. سمّعه الآن وهو حاضر في ذهنك.' : 'انتهى. أعد الاستماع أو سمّع حفظك.'; return; }
    audio.src = list[pos].url; audio.play().then(() => { playing = true; mark(); }).catch(() => { playing = false; mark(); $('#pt').textContent = 'تعذّر التشغيل. تأكّد من الاتصال.'; });
  };
  audio.onended = () => playAt(pos + 1);
  build();
  $('#pl').onclick = () => { if (playing){ audio.pause(); playing = false; mark(); } else if (audio.src && audio.currentTime > 0 && !audio.ended){ audio.play(); playing = true; mark(); } else playAt(pos); };
  $('#pr').onchange = e => { rec = e.target.value; Store.setPref('reciter', rec); const was = playing; audio.pause(); build(); pos = 0; if (was) playAt(0); else mark(); };
  $('#pp').onchange = e => { rep = +e.target.value; Store.setPref(repKey, rep); const cur = list[pos]; build(); pos = Math.max(0, list.findIndex(x => cur && x.i === cur.i)); mark(); };
  $$('.pa').forEach(el => el.onclick = () => { const p = list.findIndex(x => x.i === +el.dataset.i); if (p >= 0) playAt(p); });
  mark();
  cleanup = () => { audio.pause(); audio.src = ''; };
}

/* ================= صفحتا الدعوة والانضمام (روابط مركّزة) ================= */
const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
const iosHint = () => IS_IOS ? '<p class="note">على الآيفون استعمل <b>سفاري</b>: إن فُتح الرابط داخل واتساب فاضغط زرّ البوصلة أو «⋯» ثم «فتح في سفاري» قبل المتابعة، ليُحفظ دخولك ويعمل التسميع الصوتي.</p>' : '';
const clearQuery = () => history.replaceState(null, '', location.pathname + '#/');
const landingCache = {};

// رابط العائلة (?j=الرمز): «حلقة فلان تدعوك» وزرّ واحد
async function viewJoinLanding(jc){
  setTop('حلقة البيت');
  if (!(jc in landingCache)){
    app.innerHTML = '<p class="loading">جارٍ فتح الدعوة…</p>';
    try { landingCache[jc] = await Cloud.peekJoinCode(jc); } catch(e){ landingCache[jc] = null; }
    if (Cloud.st.fid) return route();   // دخل الحلقة أثناء الانتظار
  }
  const info = landingCache[jc];
  if (!info){ clearQuery(); viewProfiles.notice = 'رمز العائلة في الرابط غير صحيح. اطلب من وليّ الأمر رابطًا جديدًا.'; return viewProfiles(); }
  app.innerHTML = `
    <section class="intro landing">
      <p class="small">دعوة للانضمام</p>
      <h1>حلقة ${esc(info.name || 'العائلة')} تدعوك</h1>
      <p class="muted">انضمّ لتحفظ القرآن وتراجعه مع أهلك: وردٌ كل يوم، وتسميعٌ بينكم، وخزّانٌ تملؤونه معًا.</p>
    </section>
    ${iosHint()}
    <button class="btn primary big" id="joinNow" type="button">انضمّ إلى الحلقة</button>
    <div id="famErr" class="warn" hidden></div>
    <p class="small" style="text-align:center;margin-top:18px"><button class="linkbtn" id="notMine" type="button">ليست عائلتي</button> · <a href="privacy.html">كيف نحفظ بياناتكم؟</a></p>`;
  $('#joinNow').onclick = async () => {
    $('#joinNow').disabled = true;
    try { await Cloud.joinFamily(info.jc); clearQuery(); route(); }
    catch(e){ $('#joinNow').disabled = false; const b = $('#famErr'); b.textContent = errText(e); b.hidden = false; }
  };
  $('#notMine').onclick = () => { clearQuery(); viewProfiles(); };
}

// رابط الدعوة (?inv=الرمز): وليّ الأمر ينشئ حلقته بخطوتين
function viewInviteLanding(inv){
  setTop('حلقة البيت');
  const st = Cloud.st, g = st.user && !st.user.anon;
  app.innerHTML = `
    <section class="intro landing">
      <p class="small">دعوة خاصة</p>
      <h1>أنشئ حلقة عائلتك</h1>
      <p class="muted">بصفتك وليّ أمر الحلقة: تدعو أهلك، وتتابع حفظهم ومراجعتهم، وتحدّد مكافأة الأسبوع.</p>
    </section>
    ${iosHint()}
    <ol class="steps">
      <li class="${g ? 'done' : 'cur'}"><b>الدخول بحساب Google</b><span>ليكون حسابك وليّ أمر الحلقة، فتعود إليها من أي جهاز.</span></li>
      <li class="${g ? 'cur' : ''}"><b>اسم العائلة</b><span>مثل: آل فلان</span></li>
    </ol>
    ${g ? `<form id="invForm" class="panel">
        <p class="small" style="margin:0 0 8px">دخلت باسم ${esc(st.user.email || '')} · <button class="linkbtn" id="invOut" type="button">حساب آخر</button></p>
        <label for="invName">اسم العائلة</label>
        <input type="text" id="invName" maxlength="30" required placeholder="مثل: آل فلان">
        <div style="margin-top:12px"><button class="btn primary big" type="submit">أنشئ الحلقة</button></div>
      </form>`
      : '<button class="btn primary big" id="invG" type="button">الدخول بحساب Google</button>'}
    <div id="famErr" class="warn" hidden></div>
    <p class="small" style="text-align:center;margin-top:14px">بياناتكم لعائلتكم وحدها، وتُحفظ في الدمام. <a href="privacy.html">صفحة الخصوصية</a></p>`;
  const err = e => { const b = $('#famErr'); b.textContent = errText(e); b.hidden = false; };
  if ($('#invG')) $('#invG').onclick = () => Cloud.googleSignIn().catch(err);
  if ($('#invOut')) $('#invOut').onclick = async () => { await Cloud.signOut(); Cloud.googleSignIn().catch(err); };
  if ($('#invForm')) $('#invForm').onsubmit = async e => {
    e.preventDefault(); const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
    try { await Cloud.createFamily($('#invName').value.trim(), inv.toUpperCase()); clearQuery(); route(); }
    catch(x){ btn.disabled = false; err(x); }
  };
}

/* ================= معالج البداية: ماذا تحفظ؟ ← مستواك ← جاهز ================= */
const LEVELS = [
  {k: 'rev',  t: 'مراجعة فقط', d: 'أثبّت ما أحفظه دون حفظ جديد الآن', n: 0, rc: 4},
  {k: 'lite', t: 'خفيف',       d: 'بداية مريحة',                   n: 1, rc: 6},
  {k: 'mid',  t: 'متوسط',      d: 'التزام يومي معتدل',              n: 2, rc: 4},
  {k: 'pro',  t: 'جادّ',        d: 'لمن يريد التقدّم بسرعة',          n: 5, rc: 3}
];
function viewStart(pid, [step] = []){
  const p = Store.profile(pid);
  if (!Cloud.canEdit(p)) return location.replace('#/home');
  step = step || 1;
  const d = Store.data(pid), m = Stats.memorized(pid);
  if (step === 1 && mapLocked(pid)) step = d.goal ? 3 : 2;
  setTop('البداية', '#/home');
  const dots = `<ol class="wiz">${['ماذا تحفظ؟', 'مستواك', 'جاهز'].map((t, k) => `<li class="${k + 1 < step ? 'done' : k + 1 === step ? 'cur' : ''}">${t}</li>`).join('')}</ol>`;
  if (step === 1){
    const mm = Store.mem(pid);
    const juzState = j => { let a = 0, t = 0; for (let i = Q.juzFirst[j]; i <= Q.juzLast[j]; i++){ t++; a += mm[i]; } return a === 0 ? '' : a === t ? 'full' : 'part'; };
    app.innerHTML = `${dots}
      <section class="panel">
        <h2>ماذا تحفظ من القرآن الآن؟</h2>
        <p class="small" style="margin:4px 0 10px">اضغط كل جزء تحفظه كاملًا. أكثر الأولاد يبدؤون بالجزء ٣٠ (جزء عمّ).</p>
        <div class="chips">${Array.from({length: 30}, (_, k) => `<button type="button" class="jchip ${juzState(30 - k)}" data-j="${30 - k}">${AR(30 - k)}</button>`).join('')}</div>
        <p class="small" style="margin:12px 0 0">تحفظ سورًا متفرقة أو بعض الآيات؟ <a href="#/map">علّمها في الخريطة المفصّلة</a> ثم ارجع إلى هنا.</p>
      </section>
      <p class="wiz-sum">${m.words ? `محفوظك الآن: <b>${Q.dec(m.juz)}</b> جزء · <b>${Q.dec(m.pages)}</b> وجه · <b>${AR(m.ayat)}</b> آية` : 'لم تعلّم شيئًا بعد.'}</p>
      <div class="wiz-nav">
        <a class="btn primary big" href="#/start/2">${m.words ? 'التالي' : 'لا أحفظ شيئًا بعد، التالي'}</a>
      </div>`;
    $$('.jchip').forEach(b => b.onclick = () => {
      const j = +b.dataset.j, full = b.classList.contains('full');
      Store.setMem(pid, Q.juzFirst[j], Q.juzLast[j], !full); const y = scrollY; viewStart(pid, [1]); scrollTo(0, y);
    });
    return;
  }
  if (step === 2){
    const rev = rc => m.pages ? unitTxt(Math.max(1, Math.round(m.pages / rc * 2) / 2), 'page') : '';
    app.innerHTML = `${dots}
      <section class="panel">
        <h2>اختر مستواك</h2>
        <p class="small" style="margin:4px 0 0">ابدأ بأقلّ مما تظن أنك تقدر عليه، وارفعه بعد شهر إن شئت. يمكنك تغييره متى أردت.</p>
      </section>
      <div class="levels">${LEVELS.map(L => `<button type="button" class="level" data-k="${L.k}">
        <b>${L.t}</b><span class="small">${L.d}</span>
        <span>${L.n ? `حفظ ${unitTxt(L.n, 'page')} في الأسبوع (نحو ${unitTxt(L.n / 5, 'page')} يوميًّا على ٥ أيام)` : 'بلا حفظ جديد'}</span>
        <span>${m.pages ? `ومراجعة محفوظك كل ${count(L.rc, 'أسبوع', 'أسبوعين', 'أسابيع', 'أسبوعًا')} (نحو ${rev(L.rc)} في الأسبوع)` : `ومراجعة ما تحفظه كل ${count(L.rc, 'أسبوع', 'أسبوعين', 'أسابيع', 'أسبوعًا')}`}</span>
      </button>`).join('')}</div>
      <p class="note">باختيار المستوى تكتمل خريطتك، فلا يُضاف حفظ جديد بعدها إلا بتسميع.</p>
      <p class="small" style="text-align:center"><a href="#/goal">أريد ضبط الهدف بنفسي</a> · <a href="#/start/1">رجوع</a></p>`;
    $$('.level').forEach(b => b.onclick = () => {
      const L = LEVELS.find(x => x.k === b.dataset.k);
      d.hifz = null;
      d.goal = {n: L.n, nu: 'page', dy: 5, rc: L.rc, ord: '', big: null, since: (d.goal && d.goal.since) || Store.today(), by: Cloud.st.user ? Cloud.st.user.uid : null};
      Store.touch(pid); location.hash = '#/start/3';
    });
    return;
  }
  app.innerHTML = `${dots}
    <section class="panel today met">
      <h2>كل شيء جاهز، بارك الله فيك</h2>
      <p>كل يوم تجد في صفحتك مهمّتين:</p>
      <ul class="wiz-list">
        ${d.goal && d.goal.n ? '<li><b>حفظ اليوم</b>: مقطع جديد صغير، تستمع إليه وتكرّره ثم تسمّعه.</li>' : ''}
        <li><b>ورد المراجعة</b>: ما تراجعه اليوم من محفوظك، يختاره البرنامج من الأضعف والأقدم.</li>
      </ul>
      <p class="small">وإذا سمّع لك أحد أهلك أو سمّعت له، امتلأ خزّان الحلقة أسرع.</p>
      <a class="btn primary big" href="#/home">ابدأ يومك</a>
    </section>`;
}

/* ================= المتشابهات ================= */
let MUT = null;   // {فهرس الآية: [[فهرس المتشابه، الدرجة]]} من tools/build-mutashabihat.js
const loadMut = () => MUT ? Promise.resolve(MUT) : fetch('data/mutashabihat.json?v=1').then(r => r.json()).then(j => (MUT = j));
const ICON_TWIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="8" height="16" rx="2"/><rect x="13" y="4" width="8" height="16" rx="2"/><path d="M6 9h2M16 9h2M6 13h2M16 13h2"/></svg>';
const nwords = i => Q.sim[i].split('\t').join(' ').split(/\s+/).map(Engine.norm).filter(Boolean);

// الكلمات المختلفة بين آيتين (بأطول تتابع مشترك)؛ تُرجع مواضع المختلف في كلٍّ منهما
function wordDiff(a, b){
  const n = a.length, m = b.length, L = Array.from({length: n + 1}, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const da = new Set(a.map((_, k) => k)), db = new Set(b.map((_, k) => k));
  let i = 0, j = 0;
  while (i < n && j < m){ if (a[i] === b[j]){ da.delete(i); db.delete(j); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
  return [da, db];
}
// نصّ آية بالرسم العثماني مع تظليل كلمات بعينها (الوحدات العثمانية تقابل الإملائية)
function ayahMarked(i, diffSet){
  const units = Q.uth[i].split('\t'), sims = Q.sim[i].split('\t');
  let k = 0;
  return units.map((u, x) => { const n = sims[x].split(' ').length; let hit = false; for (let t = 0; t < n; t++) if (diffSet.has(k + t)) hit = true; k += n; return hit ? `<mark>${u}</mark>` : u; }).join(' ');
}

// لكل خطأ في التسميع: هل الكلمة المسموعة من آية متشابهة؟
function mutHint(i, heard){
  if (!MUT || !MUT[i] || !heard) return null;
  const h = Engine.norm(heard), own = new Set(nwords(i));
  if (own.has(h)) return null;
  const hit = MUT[i].find(([j]) => nwords(j).includes(h));
  return hit ? hit[0] : null;
}

/* تمرين المتشابهات: آية من محفوظك، في أي سورة هي؟ ثم مقارنتها بشبيهتها */
function viewMut(pid){
  const p = Store.profile(pid);
  if (!Cloud.canRecite(p)) return location.replace('#/home');
  setTop('المتشابهات', '#/home');
  app.innerHTML = '<p class="loading">جارٍ تحضير الأسئلة…</p>';
  loadMut().then(() => {
    const mem = Store.mem(pid), pool = [];
    Object.entries(MUT).forEach(([i, L]) => { i = +i; if (!mem[i]) return; L.forEach(([j]) => { if (Q.sur[j] !== Q.sur[i]) pool.push([i, j, mem[j] ? 2 : 1]); }); });
    if (!pool.length){
      app.innerHTML = `<section class="panel"><h2>لا متشابهات في محفوظك بعد</h2>
        <p class="small">تظهر هنا الآيات التي تشبه آياتٍ في سور أخرى. كلما زاد محفوظك ظهرت، وأكثرها في السور الطوال.</p>
        <a class="btn" href="#/home">رجوع</a></section>`;
      return;
    }
    // الأزواج المحفوظة كلا طرفيها أولًا، ثم عشوائيًّا
    pool.sort((a, b) => (b[2] - a[2]) || (Math.random() - 0.5));
    const qs = pool.slice(0, Math.min(10, pool.length)).sort(() => Math.random() - 0.5);
    const memSurahs = [...new Set(Array.from(mem.keys ? mem.keys() : []).filter(i => mem[i]).map(i => Q.sur[i]))];
    let k = 0, score = 0; const missed = [];
    const ask = () => {
      if (k >= qs.length){
        app.innerHTML = `<section class="panel today ${score === qs.length ? 'met' : ''}">
          <h2>النتيجة: ${AR(score)} من ${AR(qs.length)}</h2>
          <p class="small">${score === qs.length ? 'ما شاء الله، ميّزت المتشابهات كلها.' : 'راجع هذه المواضع، فهي أكثر ما يلتبس على الحفّاظ.'}</p>
          ${missed.length ? `<ul class="list">${missed.map(([i, j]) => `<li><span>${Q.label(i)} ↔ ${Q.label(j)}</span></li>`).join('')}</ul>` : ''}
          <div class="row" style="margin-top:12px"><button class="btn primary" id="mAgain" type="button">أسئلة جديدة</button><a class="btn" href="#/home">الرئيسية</a></div>
        </section>`;
        $('#mAgain').onclick = () => viewMut(pid);
        return;
      }
      const [i, j] = qs[k];
      // الخيارات: سورة الآية، وسورة شبيهتها، وسورتان أخريان
      const opts = new Set([Q.sur[i], Q.sur[j]]);
      (MUT[i] || []).forEach(([x]) => { if (opts.size < 4) opts.add(Q.sur[x]); });
      // سور المحفوظ أولًا، فإن قلّت فسور المصحف (قريبة الطول من سورة الآية)
      const extra = memSurahs.length >= 4 ? memSurahs : Q.surahs.map(s => s.n).filter(s => Math.abs(s - Q.sur[i]) <= 20);
      let guard = 0; while (opts.size < 4 && guard++ < 50) opts.add(extra[Math.floor(Math.random() * extra.length)]);
      const choices = [...opts].sort(() => Math.random() - 0.5);
      app.innerHTML = `
        <p class="small" style="margin-top:14px">السؤال ${AR(k + 1)} من ${AR(qs.length)} · الصحيح ${AR(score)}</p>
        <section class="mushaf"><div class="text mut-q">${Q.uth[i].split('\t').join(' ')}</div></section>
        <h3>في أي سورة هذه الآية؟</h3>
        <div class="mut-opts">${choices.map(s => `<button class="btn" type="button" data-s="${s}">سورة ${Q.surahs[s - 1].name}</button>`).join('')}</div>
        <div id="mAns"></div>`;
      $$('.mut-opts .btn').forEach(b => b.onclick = () => {
        const ok = +b.dataset.s === Q.sur[i];
        if (ok) score++; else missed.push([i, j]);
        $$('.mut-opts .btn').forEach(x => { x.disabled = true; if (+x.dataset.s === Q.sur[i]) x.classList.add('right'); else if (x === b) x.classList.add('wrongc'); });
        const [da, db] = wordDiff(nwords(i), nwords(j));
        $('#mAns').innerHTML = `
          <p class="${ok ? 'metmsg' : 'mut-no'}">${ok ? 'أحسنت!' : 'ليست هذه.'} الآية في <b>${Q.label(i)}</b>، وتشبهها:</p>
          <div class="mut-cmp">
            <div><span class="small">${Q.label(i)}</span><p class="q">${ayahMarked(i, da)}</p></div>
            <div><span class="small">${Q.label(j)}</span><p class="q">${ayahMarked(j, db)}</p></div>
          </div>
          <p class="small">المظلَّل هو موضع الاختلاف بين الآيتين.</p>
          <button class="btn primary" id="mNext" type="button">${k + 1 < qs.length ? 'التالي' : 'النتيجة'}</button>`;
        $('#mNext').onclick = () => { k++; ask(); scrollTo(0, 0); };
      });
    };
    ask();
  }).catch(() => { app.innerHTML = '<p class="warn">تعذّر تحميل المتشابهات. تأكّد من الاتصال.</p>'; });
}

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

/* ================= التسميع ================= */
function viewTasmee(pid, [s, a, b]){
  // التسميع الصوتي باسم الفرد لصاحبه (أو لوليّ الأمر لفرد بلا جوال)؛ ولغيرهما «سمّع له»
  if (!Cloud.canRecite(Store.profile(pid))){
    const m = reciteMode(pid);
    return location.replace(m === 'listen' && s ? `#/listen/new/${pid}/${s}/${a || 1}/${b || a || 1}` : '#/home');
  }
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
  loadMut().catch(() => {});
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
  // مواضع الضعف: كلمات تكرّر خطؤها، تُؤطَّر وهي مخفية ليتنبّه لها الحافظ
  const misD = Store.data(pid).mis || {}, weakK = new Set(W.map((w, k) => misD[w.g] > 0 ? k : -1).filter(k => k >= 0));
  if (weakK.size) $('.mushaf').insertAdjacentHTML('beforebegin', `<p class="note">المؤطَّر بالذهبي ${weakK.size === 1 ? 'موضعٌ أخطأت فيه سابقًا، فانتبه له' : 'مواضع أخطأت فيها سابقًا، فانتبه لها'}.</p>`);
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
      if (weakK.has(k) && /^w h/.test(c)) c += ' weakw';
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
    const dn = showResult.dn !== undefined ? showResult.dn : (showResult.dn = drillNext(pid, A, B));
    const box = $('#result'); box.hidden = false;
    box.innerHTML = `
      <div class="row between">
        <div><div class="score">${AR(c.pct)}٪</div><div class="small">نسبة الكلمات الصحيحة · حُفظت النتيجة</div></div>
        <div class="row"><button class="btn" id="again" type="button">أعد المقطع</button>
        ${dn ? `<a class="btn primary" href="${dn.href}">${dn.label}</a>` : wirdNext ? `<a class="btn primary" href="${tasmeeHref(wirdNext.a, wirdNext.b)}">التالي في الورد</a>` : wirdDone ? `<a class="btn primary" href="#/home">أتممت الورد ✓</a>` : nextA ? `<a class="btn primary" href="#/tasmee/${sur.n}/${nextA}/${Math.min(sur.count, nextA + (b - a))}">المقطع التالي</a>` : `<a class="btn primary" href="#/home">الرئيسية</a>`}</div>
      </div>
      <div class="stats">
        <div class="stat okc"><b>${AR(c.ok)}</b><span>صحيحة</span></div>
        <div class="stat wc"><b>${AR(c.wrong)}</b><span>خطأ</span></div>
        <div class="stat"><b>${AR(c.skip)}</b><span>متروكة</span></div>
        <div class="stat hc"><b>${AR(c.hint)}</b><span>بتلميح</span></div>
      </div>
      ${dn && dn.note ? `<p class="metmsg">${dn.note}</p>` : ''}
      <p class="small">سمّعت ${count(c.words, 'كلمة واحدة', 'كلمتين', 'كلمات', 'كلمة')} و${count(c.letters, 'حرفًا واحدًا', 'حرفين', 'أحرف', 'حرفًا')}، وأتممت ${count(c.ayat, 'آية واحدة', 'آيتين', 'آيات', 'آية')}.${c.gap ? ` ولم تُحتسب ${count(c.gap, 'كلمة واحدة', 'كلمتان', 'كلمات', 'كلمة')} ${c.gap === 2 ? 'ضاعتا' : 'ضاعت'} لحظة فتح الميكروفون.` : ''}</p>
      ${newAyat.length && c.pct >= 90 ? `<div class="panel addmem"><b>أحسنت!</b> في هذا المقطع ${count(newAyat.length, 'آية واحدة', 'آيتان', 'آيات', 'آية')} لم تكن في محفوظك.
        <div style="margin-top:8px"><button class="btn primary" id="addMem" type="button">أضفها إلى محفوظي</button></div></div>` : ''}
      ${errs.length ? `<div class="small" style="margin-top:8px">مواضع تحتاج انتباهًا. إذا قرأت الكلمة صحيحة وأخطأ البرنامج، اضغط «قرأتها صحيحة»:</div>
        <ul class="errs">${errs.map(x => `<li class="${S.fixed.has(x.k) ? 'fixed' : ''}"><span><span class="q">${x.w.u}</span>
          <span class="small">آية ${AR(x.w.n)} · ${x.st.st === 'wrong' ? `سُمِع: «${esc(x.st.heard)}»` : 'لم تُقرأ'}${(() => { const j = x.st.st === 'wrong' ? mutHint(x.w.i, x.st.heard) : null; return j !== null ? ` · <b class="mutw">لعلّك انتقلت إلى متشابه: ${Q.label(j)}</b>` : ''; })()}</span></span>
          <button class="btn small" type="button" data-k="${x.k}">${S.fixed.has(x.k) ? 'تراجع' : 'قرأتها صحيحة'}</button></li>`).join('')}</ul>` : ''}`;
    $('#again').onclick = () => route();
    if ($('#addMem')) $('#addMem').onclick = () => { newAyat.forEach(i => Store.setMem(pid, i, i, true)); $('#addMem').closest('.addmem').innerHTML = '<b>أُضيفت إلى محفوظك.</b> بارك الله في حفظك.'; };
    $$('.errs button').forEach(btn => btn.onclick = () => {
      const k = +btn.dataset.k; S.fixed.has(k) ? S.fixed.delete(k) : S.fixed.add(k);
      saved = applySession(pid, A, B, W, saved); render(); showResult();
    });
    if (!showResult.scrolled){ box.scrollIntoView({behavior: 'smooth', block: 'start'}); showResult.scrolled = true; }
  }
  showResult.scrolled = false; showResult.dn = undefined;
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

/* ================= البدء ================= */
(async function boot(){
  try { await Q.load(); }
  catch(e){ app.innerHTML = '<p class="warn">تعذّر تحميل المصحف. تأكّد من الاتصال بالإنترنت ثم أعد فتح الصفحة.</p>'; return; }
  // لا ننتظر السحابة أكثر من ٤ ثوانٍ؛ البرنامج يعمل على الجهاز ثم يتزامن
  await Promise.race([Cloud.init().catch(() => {}), new Promise(r => setTimeout(r, 4000))]);
  route();
  // تحديثات السحابة (أفراد جدد، تعديلات من أجهزة أخرى) تُعرض إلا أثناء التسميع والخريطة
  Cloud.subscribe(() => { if (!/^#\/(tasmee|map|listen|goal|ask|majlis)/.test(location.hash)) route(true); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
