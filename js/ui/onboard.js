/* حلقة البيت · onboard.js — جزء من الواجهة (ملفّات js/ui تُحمَّل بالترتيب في index.html وتتشارك النطاق العام) */
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
        <div class="row" style="margin-top:10px">
          <label class="chk"><input type="radio" name="invType" value="family" checked> حلقة عائلة</label>
          <label class="chk"><input type="radio" name="invType" value="school"> حلقة مدرسية (معلّم وطلاب)</label>
        </div>
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
    try { await Cloud.createFamily($('#invName').value.trim(), inv.toUpperCase(), $('input[name=invType]:checked').value); clearQuery(); route(); }
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

