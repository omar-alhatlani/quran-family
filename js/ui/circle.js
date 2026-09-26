/* حلقة البيت · circle.js — جزء من الواجهة (ملفّات js/ui تُحمَّل بالترتيب في index.html وتتشارك النطاق العام) */
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
    const taken = others.filter(p => Array.isArray(p.uids) && p.uids.length && !p.uids.includes(Cloud.st.family.owner) && !p.uids.includes('~owner'));
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
      <p class="small" style="margin:4px 0 8px">يحدث هذا بعد تغيير الجوال أو مسح بيانات المتصفّح. اضغط اسمك فيصل طلبك إلى ${T('guardian')}، وحين يوافق يعود ملفّك كاملًا إلى هذا الجهاز.</p>
      ${myRelink ? `<p class="metmsg" style="color:var(--hint)">⏳ أُرسل طلبك لربط ملفّ ${esc(pname(myRelink.from))}. انتظر موافقة ${T('guardian')}.</p>`
        : `<div class="row">${taken.map(p => `<button class="btn relink" type="button" data-id="${p.id}">أنا ${esc(p.name)}</button>`).join('')}</div>`}
    </section>` : ''}`}
    ${majlisCard()}
    ${overviewTable()}
    ${tankCard()}
    ${peerBanner()}
    ${others.length && seesOthers() ? `<h3 style="margin-top:18px">${T('members')} <span class="small">(للاطّلاع)</span></h3><div class="profiles">${others.map(card).join('')}</div>` : ''}
    ${familyPanel()}
    ${isOwner() ? `<details class="panel"><summary>${T('addNoPhone')}</summary>
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
  bindPeerBanner(); bindTank(); bindOverview(); bindCircles(); bindShare(null);
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
      download(JSON.stringify(out), `حلقة-${fam.name.replace(/\s+/g, '-')}-${date}.json`);
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

/* ================= نوع الحلقة: عائلة أو مدرسية ================= */
const isSchool = () => !!(Cloud.st.family && Cloud.st.family.type === 'school');
const TERMS = {
  family: {guardian: 'وليّ الأمر', members: 'أفراد الحلقة', member: 'فرد', yourPeople: 'أهلك', hisPeople: 'أهله', code: 'رمز العائلة',
           majlis: 'مجلس الجمعة', majlisWhere: 'اعرضه على التلفزيون مع العائلة', addNoPhone: 'إضافة فرد ليس معه جوال'},
  school: {guardian: 'المعلّم', members: 'طلاب الحلقة', member: 'طالب', yourPeople: 'طلابك', hisPeople: 'زملائه', code: 'رمز الحلقة',
           majlis: 'مجلس الأسبوع', majlisWhere: 'اعرضه على شاشة الفصل', addNoPhone: 'إضافة طالب ليس معه جوال'}
};
const T = k => TERMS[isSchool() ? 'school' : 'family'][k];
// الطالب لا يطّلع على ملفّات زملائه ولا نسبهم؛ المعلّم يرى الجميع
const seesOthers = () => !isSchool() || isOwner();

/* متابعة الحلقة (للمعلّم ووليّ الأمر): كل فرد بنظرة واحدة */
function overviewTable(){
  if (!isOwner()) return '';
  const ps = Store.profiles().filter(p => p.cloud), t = Store.today();
  if (ps.length < 2) return '';
  const rows = ps.map(p => {
    const d = Store.data(p.id), m = Stats.memorized(p.id);
    const c = Stats.contribution(p.id, Cloud.canRecite(p));
    let wird = '—';
    if (d.wird && d.wird.d === t){ const ws = Stats.wirdStatus(p.id, d.wird); wird = ws.complete ? '<b class="ok">✓</b>' : ws.done > 0 ? '<span class="part">جزئي</span>' : '<span class="no">لم يبدأ</span>'; }
    let hifz = '—';
    if (d.hifz && d.hifz.d === t){ const hs = Stats.hifzStatus(p.id, d.hifz); hifz = hs.complete ? '<b class="ok">✓</b>' : '<span class="no">لم يتمّ</span>'; }
    else if (!d.goal || !d.goal.n) hifz = '<span class="muted">بلا هدف</span>';
    const last = Math.max(-1, ...Object.values(d.rev || {}).map(r => r[0]));
    const lastTxt = last < 0 ? '—' : t - last <= 0 ? 'اليوم' : t - last === 1 ? 'أمس' : `قبل ${AR(t - last)} ${t - last <= 10 ? 'أيام' : 'يومًا'}`;
    return `<tr data-id="${p.id}"><td>${avatar(p, 'sm')} ${esc(p.name)}</td><td>${Q.dec(m.pages)}</td><td>${c.hasGoal ? AR(Math.round(c.base)) + '٪' : '—'}</td><td>${wird}</td><td>${hifz}</td><td>${hwBrief(p.id)}</td><td>${lastTxt}</td></tr>`;
  }).join('');
  return `<section class="panel ov">
    <div class="row between"><h2>متابعة الحلقة</h2><button class="btn small" type="button" id="shareCircle">📤 تقرير الحلقة</button></div>
    <div class="ov-wrap"><table>
      <thead><tr><th>${isSchool() ? 'الطالب' : 'الفرد'}</th><th>المحفوظ (وجه)</th><th>هدف الأسبوع</th><th>ورد اليوم</th><th>حفظ اليوم</th><th>واجب المدرسة</th><th>آخر تسميع</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    <p class="small" style="margin:6px 0 0">اضغط الاسم لفتح ملفّه.</p>
  </section>`;
}
function bindOverview(){ $$('.ov tr[data-id]').forEach(r => r.onclick = () => { Store.cur = r.dataset.id; location.hash = '#/home'; }); }

/* حلقاتي: التبديل بين حلقات الحساب، وإنشاء حلقة أخرى */
function circlesPanel(){
  const st = Cloud.st, cs = st.circles || [];
  const g = st.user && !st.user.anon;
  if (cs.length < 2 && !g) return '';
  return `<details class="circles"${cs.length > 1 ? ' open' : ''}><summary class="small">حلقاتي${cs.length > 1 ? ` (${AR(cs.length)})` : ''}</summary>
    ${cs.length > 1 ? `<div class="row" style="margin-top:8px">${cs.map(c => `<button class="btn small ${c.id === st.fid ? 'primary' : ''}" type="button" data-circle="${c.id}">${c.type === 'school' ? '🏫' : '🏠'} ${esc(c.name)}</button>`).join('')}</div>` : ''}
    ${g ? `<form id="newCircle" style="margin-top:10px">
      <label for="ncName">أنشئ حلقة أخرى</label>
      <input type="text" id="ncName" maxlength="30" required placeholder="مثل: حلقة الصف الثاني المتوسط">
      <div class="row" style="margin-top:8px">
        <label class="chk"><input type="radio" name="ncType" value="family" checked> حلقة عائلة</label>
        <label class="chk"><input type="radio" name="ncType" value="school"> حلقة مدرسية (معلّم وطلاب)</label>
      </div>
      ${st.user.admin ? '' : '<input type="text" id="ncInv" class="codein" maxlength="10" required placeholder="رمز الدعوة" dir="ltr" style="margin-top:8px">'}
      <div style="margin-top:8px"><button class="btn small primary" type="submit">أنشئ</button></div>
    </form>` : ''}
  </details>`;
}
function bindCircles(){
  $$('[data-circle]').forEach(b => b.onclick = async () => {
    if (b.dataset.circle === Cloud.st.fid) return;
    b.disabled = true;
    try { await Cloud.switchCircle(b.dataset.circle); location.hash = '#/'; route(); }
    catch(e){ b.disabled = false; alert('تعذّر التبديل. تأكّد من الاتصال.'); }
  });
  const f = $('#newCircle'); if (!f) return;
  f.onsubmit = async e => {
    e.preventDefault(); const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    try {
      await Cloud.createFamily($('#ncName').value.trim(), $('#ncInv') ? $('#ncInv').value.trim().toUpperCase() : '', f.querySelector('input[name=ncType]:checked').value);
      location.hash = '#/'; route();
    } catch(x){ btn.disabled = false; alert(errText(x)); }
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
      <div class="row between"><h2>حلقة ${esc(st.family.name)}</h2>${isOwner() ? `<span class="chip">${T('guardian')}</span>` : ''}</div>
      <p class="small" style="margin:4px 0 8px">أرسل ${T('code')} لـ${T('yourPeople')} ليدخلوا من جوالاتهم${isSchool() ? '' : '، ويرى كل واحد تقدّم الحلقة'}.</p>
      <div class="row"><b class="jcode" dir="ltr">${st.family.joinCode}</b>
        <button class="btn small primary" id="copyJoin" type="button">نسخ رابط الانضمام</button></div>
      ${seesOthers() ? `<p style="margin:12px 0 0"><a class="btn" href="#/majlis">📺 ${T('majlis')}</a> <span class="small">${T('majlisWhere')}</span></p>` : ''}
      ${circlesPanel()}
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
            <label for="fname">اسم الحلقة</label><input type="text" id="fname" maxlength="30" required placeholder="مثل: آل فلان، أو حلقة الصف الثاني">
            <div class="row" style="margin-top:8px">
              <label class="chk"><input type="radio" name="fType" value="family" checked> حلقة عائلة</label>
              <label class="chk"><input type="radio" name="fType" value="school"> حلقة مدرسية</label>
            </div>
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
    const t = `انضمّ إلى حلقة ${f.name} لحفظ القرآن الكريم:\n${joinLink(f.joinCode)}\n${T('code')}: ${f.joinCode}`;
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
    try { await Cloud.createFamily($('#fname').value.trim(), $('#inv') ? $('#inv').value.trim().toUpperCase() : '', $('input[name=fType]:checked').value); route(); }
    catch(x){ busy(e.target, false); err(x); }
  };
}

