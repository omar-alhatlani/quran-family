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
  let lastUpdate = 0, famDocs = [], pubDocs = [];

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
    // سجلّ بلا أسماء لكل حلقة (تاريخ الإنشاء فقط)؛ لا تقرأ اللوحة مستندات العائلات نفسها
    unsubs.push(db.collection('fstat').onSnapshot(s => { $('#live').classList.remove('off'); setNum('families', s.size); famDocs = s.docs; renderFams(); }, onErr));
    unsubs.push(db.collection('pub').onSnapshot(s => {
      pubDocs = s.docs; renderFams();
      const m = {l: 0, w: 0, a: 0, p: 0, j: 0}, t = {s: 0, w: 0, l: 0, p: 0};
      const wk = today() - ((today() + 5) % 7);   // بداية الأسبوع (السبت)
      let gall = 0, gmet = 0; const fams = {};
      s.forEach(d => {
        const x = d.data();
        if (x.goal){ gall++; if (x.goal.w === wk && x.goal.met) gmet++; }
        // خزّان كل عائلة: ١٠٠٪ لكل فرد له هدف، ويُجمع نصيب الأفراد هذا الأسبوع
        if (x.goal && x.goal.w === wk){ const t = fams[x.fid] || (fams[x.fid] = {cap: 0, sum: 0}); if (x.goal.has) t.cap += 100; t.sum += x.goal.pct || 0; }
        if (x.mem) for (const k in m) m[k] += x.mem[k] || 0;
        if (x.tot) for (const k in t) t[k] += x.tot[k] || 0;
      });
      setNum('members', s.size);
      setNum('gmet', gmet); setNum('gall', gall);
      const tk = Object.values(fams).filter(t => t.cap);
      setNum('tfull', tk.filter(t => t.sum >= t.cap).length);
      setNum('tavg', tk.length ? Math.round(tk.reduce((s, t) => s + Math.min(1, t.sum / t.cap), 0) / tk.length * 100) : 0);
      document.getElementById('tfullU').textContent = tk.length ? `من ${fmt0.format(tk.length)} عائلة لها خزّان` : 'عائلة';
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
      $('#invList').innerHTML = unused.map(d => `<span class="invc"><button class="chip" type="button" data-c="${d.id}">${d.id}</button><button class="x" type="button" data-del="${d.id}" aria-label="إلغاء الدعوة ${d.id}">×</button></span>`).join('') || '<span class="muted">لا توجد.</span>';
      document.querySelectorAll('#invList .chip').forEach(b => b.onclick = () => copyInvite(b.dataset.c, b));
      document.querySelectorAll('#invList [data-del]').forEach(b => b.onclick = () => {
        if (confirm(`إلغاء الدعوة ${b.dataset.del}؟ لن يستطيع أحد استعمالها بعد ذلك.`)) db.doc(`invites/${b.dataset.del}`).delete().catch(e => alert('تعذّر: ' + e.code));
      });
    }, onErr));
  }

  /* ---------- العائلات (للاطّلاع، بلا أسماء) ---------- */
  const dfmt = t => t ? new Date(t).toLocaleDateString('ar-SA-u-ca-gregory', {day: 'numeric', month: 'short', year: 'numeric'}) : '—';
  const agoTxt = t => { if (!t) return '—'; const d = Math.floor((Date.now() - t) / 864e5); return d <= 0 ? 'اليوم' : d === 1 ? 'أمس' : `قبل ${fmt0.format(d)} يومًا`; };
  function renderFams(){
    const box = document.getElementById('famRows'); if (!box) return;
    const sorted = [...famDocs].sort((a, b) => (a.data().created || 0) - (b.data().created || 0));
    if (!sorted.length){ box.innerHTML = '<tr><td colspan="4" class="muted">لا عائلات بعد.</td></tr>'; return; }
    box.innerHTML = sorted.map((d, k) => {
      const ps = pubDocs.filter(p => p.data().fid === d.id), last = Math.max(0, ...ps.map(p => p.data().up || 0));
      return `<tr><td>الحلقة ${fmt0.format(k + 1)}</td><td>${dfmt(d.data().created)}</td><td>${fmt0.format(ps.length)}</td><td>${agoTxt(last)}</td></tr>`;
    }).join('');
  }

  /* ---------- الدعوات ---------- */
  // الرابط يحمل رمز الدعوة، فلا يكتبه وليّ الأمر بيده
  const inviteText = c => `السلام عليكم ورحمة الله\nدعوتك لإنشاء حلقة عائلتك في «حلقة البيت» لحفظ القرآن الكريم ومراجعته.\nافتح هذا الرابط في سفاري (آيفون) أو كروم (أندرويد)، ثم ادخل بحساب Google واكتب اسم العائلة:\n${APP_URL}?inv=${c}`;
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
