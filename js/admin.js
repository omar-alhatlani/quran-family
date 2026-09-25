/* لوحة القيادة: أرقام المنصّة لحظيًّا (onSnapshot) + إنشاء دعوات العائلات.
   تقرأ pub (أرقام كل فرد بلا أسماء)، وdaily (مجاميع كل يوم)، وعدد العائلات والدعوات. */
(() => {
  const CONFIG = {
    apiKey: 'AIzaSyAmgAJu228LDA_lltp3WHjsd91EgVRlrJc',
    authDomain: 'halaqa-albait.firebaseapp.com',
    projectId: 'halaqa-albait',
    storageBucket: 'halaqa-albait.firebasestorage.app',
    messagingSenderId: '255342838963',
    appId: '1:255342838963:web:684d768a402f887fc01cc6'
  };
  const ADMIN_EMAIL = 'o.alhatlani@gmail.com';
  const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const $ = s => document.querySelector(s);
  const fmt0 = new Intl.NumberFormat('ar-SA', {maximumFractionDigits: 0});
  const fmt1 = new Intl.NumberFormat('ar-SA', {maximumFractionDigits: 1});
  const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5);
  const APP_URL = location.origin + location.pathname.replace(/admin\.html$/, '');

  firebase.initializeApp(CONFIG);
  const auth = firebase.auth(), db = firebase.firestore();
  const unsubs = [];
  let lastUpdate = 0;

  /* ---------- عرض رقم مع عدّ تدريجي وومضة ---------- */
  const shown = {};
  function setNum(key, val, dec){
    const el = document.querySelector(`[data-k="${key}"]`); if (!el) return;
    const out = el.classList.contains('tile') ? el.querySelector('.v') : el;
    const from = shown[key] ?? 0; shown[key] = val;
    const f = dec ? fmt1 : fmt0;
    if (from === val){ out.textContent = f.format(val); return; }
    if (from !== 0 || val !== 0){ el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
    const t0 = performance.now(), dur = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700;
    const step = now => {
      const k = dur ? Math.min(1, (now - t0) / dur) : 1, e = 1 - Math.pow(1 - k, 3);
      out.textContent = f.format(from + (val - from) * e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    lastUpdate = Date.now();
  }
  // «آخر تحديث قبل …»
  setInterval(() => {
    if (!lastUpdate) return;
    const s = Math.round((Date.now() - lastUpdate) / 1000);
    $('#liveT').textContent = s < 5 ? 'مباشر · الآن' : s < 60 ? `مباشر · آخر تغيير قبل ${fmt0.format(s)} ث` : `مباشر · آخر تغيير قبل ${fmt0.format(Math.round(s / 60))} د`;
  }, 1000);

  /* ---------- الاشتراكات اللحظية ---------- */
  function watch(){
    const onErr = e => { $('#live').classList.add('off'); $('#liveT').textContent = e.code === 'permission-denied' ? 'لا صلاحية' : 'انقطع الاتصال'; };
    unsubs.push(db.collection('families').onSnapshot(s => { $('#live').classList.remove('off'); setNum('families', s.size); }, onErr));
    unsubs.push(db.collection('pub').onSnapshot(s => {
      const m = {l: 0, w: 0, a: 0, p: 0, j: 0}, t = {s: 0, w: 0, l: 0, p: 0};
      const wk = today() - ((today() + 5) % 7);   // بداية الأسبوع (السبت)
      let gall = 0, gmet = 0;
      s.forEach(d => {
        const x = d.data();
        if (x.goal){ gall++; if (x.goal.w === wk && x.goal.met) gmet++; }
        if (x.mem) for (const k in m) m[k] += x.mem[k] || 0;
        if (x.tot) for (const k in t) t[k] += x.tot[k] || 0;
      });
      setNum('members', s.size);
      setNum('gmet', gmet); setNum('gall', gall);
      document.getElementById('gmetU').textContent = gall ? `من ${fmt0.format(gall)} لديهم أهداف` : 'فرد';
      setNum('j', m.j, true); setNum('p', m.p, true); setNum('a', m.a); setNum('w', m.w); setNum('l', m.l);
      setNum('t.s', t.s); setNum('t.w', t.w); setNum('t.l', t.l); setNum('t.p', t.p, true);
    }, onErr));
    const d0 = today() - 6;
    unsubs.push(db.collection('daily').where('d', '>=', d0).onSnapshot(s => {
      const td = {s: 0, w: 0, l: 0, p: 0}, wk = {s: 0, w: 0, l: 0, p: 0}, now = today();
      s.forEach(doc => {
        const x = doc.data();
        for (const k in wk) wk[k] += x[k] || 0;
        if (x.d === now) for (const k in td) td[k] += x[k] || 0;
      });
      for (const k in td){ setNum('d.' + k, td[k], k === 'p'); setNum('w.' + k, wk[k], k === 'p'); }
    }, onErr));
    unsubs.push(db.collection('invites').onSnapshot(s => {
      const unused = s.docs.filter(d => !d.data().used).sort((a, b) => b.data().created - a.data().created);
      $('#invCounts').textContent = `${fmt0.format(unused.length)} غير مستعملة · ${fmt0.format(s.size - unused.length)} مستعملة`;
      $('#invList').innerHTML = unused.map(d => `<button class="chip" type="button" data-c="${d.id}">${d.id}</button>`).join('') || '<span class="muted">لا توجد.</span>';
      document.querySelectorAll('#invList .chip').forEach(b => b.onclick = () => copyInvite(b.dataset.c, b));
    }, onErr));
  }

  /* ---------- الدعوات ---------- */
  const inviteText = c => `السلام عليكم ورحمة الله\nدعوتك لإنشاء حلقة عائلتك في «حلقة البيت» لحفظ القرآن الكريم ومراجعته:\n1) افتح ${APP_URL} في سفاري (آيفون) أو كروم (أندرويد)\n2) اضغط «أنشئ حلقة لعائلتك» وادخل بحساب Google\n3) اكتب اسم العائلة ورمز الدعوة: ${c}`;
  function copyInvite(c, btn){
    navigator.clipboard.writeText(inviteText(c)).then(() => { const o = btn.textContent; btn.textContent = 'نُسخ ✓'; setTimeout(() => { btn.textContent = o; }, 1500); })
      .catch(() => prompt('انسخ رسالة الدعوة:', inviteText(c)));
  }
  $('#newInv').onclick = async () => {
    $('#newInv').disabled = true;
    try {
      let c;
      do { c = Array.from(crypto.getRandomValues(new Uint8Array(8)), b => ALPHA[b % ALPHA.length]).join(''); }
      while ((await db.doc(`invites/${c}`).get()).exists);
      await db.doc(`invites/${c}`).set({used: false, created: Date.now()});
      $('#invCode').textContent = c; $('#invNew').hidden = false;
      $('#copyInv').onclick = () => copyInvite(c, $('#copyInv'));
    } catch(e){ alert('تعذّر إنشاء الدعوة: ' + (e.code || e.message)); }
    $('#newInv').disabled = false;
  };

  /* ---------- الدخول ---------- */
  $('#signIn').onclick = async () => {
    const p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({prompt: 'select_account'});
    try { await auth.signInWithPopup(p); }
    catch(e){ if (e.code === 'auth/popup-blocked') await auth.signInWithRedirect(p); else { $('#gateErr').textContent = 'تعذّر الدخول: ' + e.code; $('#gateErr').hidden = false; } }
  };
  $('#signOut').onclick = () => auth.signOut();
  auth.onAuthStateChanged(u => {
    unsubs.splice(0).forEach(f => f());
    const ok = !!(u && u.email === ADMIN_EMAIL && u.emailVerified);
    $('#gate').hidden = ok; $('#dash').hidden = !ok;
    if (u && !ok){ $('#gateMsg').textContent = `الحساب ${u.email || 'الحالي'} ليس حساب المدير.`; $('#signIn').textContent = 'الدخول بحساب آخر'; }
    if (ok){ $('#email').textContent = u.email; watch(); }
  });
})();
