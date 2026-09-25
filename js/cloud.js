/* المزامنة مع Firebase: الدخول، وإنشاء حلقة العائلة بدعوة، والانضمام برمز العائلة،
   ومزامنة الأفراد وجلساتهم، والأرقام المجمّعة للوحة القيادة (pub وdaily).

   Firestore:
   invites/{رمز}                 دعوات إنشاء العائلات (تنشئها لوحة القيادة)
   joinCodes/{رمز}               رمز العائلة ← fid
   families/{fid}                {name, owner, joinCode, invite, created}
   families/{fid}/access/{uid}   من يحقّ له الدخول
   families/{fid}/members/{mid}  {name, color, mem, rev, mis, up}
     …/members/{mid}/sessions/{id}
   users/{uid}                   {fid}
   pub/{mid}                     أرقام فقط للوحة: {fid, mem:{l,w,a,p,j}, tot:{s,w,l,p}}
   daily/{اليوم}                 مجاميع التسميع اليومية لكل المنصّة */
const Cloud = (() => {
  const CONFIG = {
    apiKey: 'AIzaSyAmgAJu228LDA_lltp3WHjsd91EgVRlrJc',
    authDomain: 'halaqa-albait.firebaseapp.com',
    projectId: 'halaqa-albait',
    storageBucket: 'halaqa-albait.firebasestorage.app',
    messagingSenderId: '255342838963',
    appId: '1:255342838963:web:684d768a402f887fc01cc6'
  };
  const ADMIN_EMAIL = 'o.alhatlani@gmail.com';
  const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // بلا حروف ملتبسة (O/0، I/1، L)
  const code = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => ALPHA[b % ALPHA.length]).join('');
  const FV = () => firebase.firestore.FieldValue;

  let auth = null, db = null, user = null, unsubMembers = null, unsubReq = null, unsubFam = null;
  const st = {ok: false, user: null, fid: null, family: null, error: null, requests: []};
  const subs = new Set();
  const emit = () => subs.forEach(f => { try { f(st); } catch(e){} });

  function init(){
    if (!window.firebase){ st.error = 'offline'; return Promise.resolve(st); }
    firebase.initializeApp(CONFIG);
    auth = firebase.auth(); db = firebase.firestore();
    db.enablePersistence({synchronizeTabs: true}).catch(() => {});
    Store.hooks.changed = id => { if (st.fid) schedulePush(id); };
    Store.hooks.session = (id, rec, isNew) => { if (st.fid) pushSession(id, rec, isNew); };
    return new Promise(resolve => {
      let first = true;
      auth.onAuthStateChanged(async u => {
        user = u; st.user = u ? {uid: u.uid, email: u.email, anon: u.isAnonymous, admin: isAdminUser(u)} : null;
        if (u) await attach().catch(e => { st.error = e.code || e.message; });
        else detach();
        st.ok = true; emit();
        if (first){ first = false; resolve(st); }
      });
    });
  }
  const isAdminUser = u => !!(u && u.email === ADMIN_EMAIL && u.emailVerified);

  /* ---------- ربط الجهاز بعائلته ---------- */
  async function attach(){
    const us = await db.doc(`users/${user.uid}`).get();
    if (!us.exists){ st.fid = null; st.family = null; return; }
    const fid = us.data().fid;
    const fam = await db.doc(`families/${fid}`).get().catch(() => null);
    if (!fam || !fam.exists){ cleanupDeleted(); return; }
    st.fid = fid; st.family = {id: fid, ...fam.data()};
    // المكافأة وغيرها قد يغيّرها وليّ الأمر من جهازه
    if (unsubFam) unsubFam();
    unsubFam = db.doc(`families/${fid}`).onSnapshot(s => {
      if (s.exists){ st.family = {id: fid, ...s.data()}; emit(); }
      else if (!s.metadata.fromCache){ detach(); cleanupDeleted(); emit(); }   // حذفها وليّ أمرها
    }, () => {});
    Store.DB.fid = fid; Store.save();
    if (st.family.owner === user.uid && !Store.pref('fstat-' + fid, false))
      db.doc(`fstat/${fid}`).set({created: st.family.created || Date.now()}).then(() => Store.setPref('fstat-' + fid, true)).catch(() => {});
    if (st.family.owner === user.uid) db.doc(`joinCodes/${st.family.joinCode}`).get().then(s => {
      if (s.exists && s.data().name !== st.family.name) s.ref.update({name: st.family.name}).catch(() => {});
    }).catch(() => {});
    await uploadLocal();
    if (unsubMembers) unsubMembers();
    unsubMembers = db.collection(`families/${fid}/members`).onSnapshot(snap => {
      let changed = false;
      snap.docChanges().forEach(ch => {
        if (ch.doc.metadata.hasPendingWrites) return;   // صدى كتابة هذا الجهاز
        changed = true;
        if (ch.type === 'removed'){ Store.removeProfile(ch.doc.id); return; }
        const x = ch.doc.data();
        Store.applyRemote(ch.doc.id, {...x, mem: decodeMem(x.mem)});
        if (!Array.isArray(x.uids) && (uploadedHere(ch.doc.id) || isOwner()))
          ch.doc.ref.update({uids: uploadedHere(ch.doc.id) ? [user.uid] : []}).catch(() => {});
      });
      if (changed) emit();
    }, () => {});
    // طلبات «سمّعني» في آخر أسبوعين
    if (unsubReq) unsubReq();
    unsubReq = db.collection(`families/${fid}/requests`).where('created', '>=', Date.now() - 14 * 864e5).onSnapshot(snap => {
      st.requests = snap.docs.map(d => ({id: d.id, ...d.data()})).sort((a, b) => b.created - a.created);
      // نتيجة جاهزة لفرد يملكه هذا الجهاز: تُطبَّق على ملفّه مرة واحدة
      st.requests.filter(r => { const p = Store.profile(r.from);
        const heard = r.result && Store.profile(r.result.listener);
        return r.type !== 'relink' && r.status === 'done' && !r.applied && (mine(p) || (isOwner() && p && ((Array.isArray(p.uids) && !p.uids.length) || mine(heard)))); }).forEach(r => {
        try { if (Cloud.onPeerDone) Cloud.onPeerDone(r); db.doc(`families/${fid}/requests/${r.id}`).update({applied: true}).catch(() => {}); }
        catch(e){ console.error(e); }
      });
      emit();
    }, () => {});
  }
  const uploadedHere = id => Object.values(Store.DB.alias || {}).includes(id);
  const isOwner = () => !!(st.family && user && st.family.owner === user.uid);
  // الأفراد الذين يملكهم هذا الجهاز
  const mine = p => !!(p && (!p.cloud || (user && Array.isArray(p.uids) && p.uids.includes(user.uid))));
  const canEdit = p => !!(p && (mine(p) || (p.cloud && isOwner())));
  // التسميع الصوتي باسم الفرد: لصاحبه، أو لوليّ الأمر إن كان الفرد بلا جوال (غير مربوط بجهاز)
  const canRecite = p => !!(p && (mine(p) || (p.cloud && isOwner() && Array.isArray(p.uids) && !p.uids.length)));
  // الحلقة لم تعد موجودة (حذفها وليّ أمرها): يُمسح ما يخصّها من هذا الجهاز
  function cleanupDeleted(){
    Store.profiles().filter(p => p.cloud).map(p => p.id).forEach(id => Store.removeProfile(id));
    Store.DB.fid = null; Store.save();
    if (user) db.doc(`users/${user.uid}`).delete().catch(() => {});
    st.fid = null; st.family = null;
  }
  function detach(){
    if (unsubMembers){ unsubMembers(); unsubMembers = null; }
    if (unsubReq){ unsubReq(); unsubReq = null; }
    if (unsubFam){ unsubFam(); unsubFam = null; }
    st.fid = null; st.family = null; st.requests = [];
  }

  const encodeMem = r => r.map(([a, b]) => a === b ? `${a}` : `${a}-${b}`).join(',');
  const decodeMem = s => !s ? [] : s.split(',').map(x => { const [a, b] = x.split('-').map(Number); return [a, b === undefined ? a : b]; });

  /* ---------- رفع البيانات المحلية (أول انضمام) ---------- */
  // الأفراد المحليون الذين لم يُرفعوا بعد: يُدمجون بفرد بالاسم نفسه أو يُنشأ لهم فرد جديد
  async function uploadLocal(){
    const local = Store.profiles().filter(p => !p.cloud);
    if (!local.length) return;
    const existing = await db.collection(`families/${st.fid}/members`).get();
    const byName = {};
    existing.forEach(d => { const u = d.data().uids; if (Array.isArray(u) && u.length === 0) byName[d.data().name.trim()] = d; });
    for (const p of local){
      const match = byName[p.name.trim()];
      const ref = match ? match.ref : db.collection(`families/${st.fid}/members`).doc();
      const d = Store.data(p.id);
      if (match){   // دمج: اتحاد المحفوظ، وأحدث تسميع لكل آية
        const x = match.data();
        const m = new Uint8Array(Q.TOTAL_AYAT);
        [...decodeMem(x.mem), ...d.mem].forEach(([a, b]) => m.fill(1, a, b + 1));
        const ranges = []; let s = -1;
        for (let i = 0; i <= m.length; i++){ if (i < m.length && m[i]){ if (s < 0) s = i; } else if (s >= 0){ ranges.push([s, i - 1]); s = -1; } }
        const rev = {...(x.rev || {})};
        Object.entries(d.rev).forEach(([i, v]) => { if (!rev[i] || rev[i][0] < v[0]) rev[i] = v; });
        const mis = {...(x.mis || {})};
        Object.entries(d.mis).forEach(([g, c]) => { mis[g] = (mis[g] || 0) + c; });
        Object.assign(d, {mem: ranges, rev, mis});
      }
      Store.renameProfile(p.id, ref.id);
      const prof = Store.profile(ref.id); prof.cloud = true;
      prof.uids = p.forOther && isOwner() ? [] : [user.uid];
      if (match){ prof.name = match.data().name; prof.color = match.data().color; }
      d.up = Date.now(); Store.save();
      await ref.set(memberDoc(ref.id));
      // الجلسات دفعاتٍ لا تتجاوز ٤٠٠
      for (let k = 0; k < d.sess.length; k += 400){
        const b = db.batch();
        d.sess.slice(k, k + 400).forEach(s => { s.id = s.id || Store.uid(); b.set(ref.collection('sessions').doc(s.id), s); });
        await b.commit();
      }
      Store.save();
      await pushPub(ref.id, d.sess);
    }
  }
  function weekHist(p, d){
    const hst = {...(d.wkp || {})};
    if (mine(p)){
      const c = Stats.contribution(p.id, true), w = Stats.weekStart(Store.today());
      if (c.hasGoal || c.bonus) hst[w] = Math.round(c.pct);
      Object.keys(hst).map(Number).sort((a, b) => b - a).slice(12).forEach(k => delete hst[k]);
    }
    return hst;
  }
  function progFor(p, d){
    const w = Stats.week(p.id), r = d.prog;
    if (mine(p) || !r || r.w !== w.w) return w;
    return {w: w.w, np: Math.max(w.np, r.np || 0), na: Math.max(w.na, r.na || 0), rp: Math.max(w.rp, r.rp || 0)};
  }
  function memberDoc(id){
    const p = Store.profile(id), d = Store.data(id);
    return {name: p.name, color: p.color, uids: p.uids || [], mem: encodeMem(d.mem), rev: d.rev, mis: d.mis, up: d.up || Date.now(),
            goal: d.goal || null, nl: d.nl || {}, prog: progFor(p, d), wird: d.wird || null, lis: d.lis || {}, wkp: weekHist(p, d), hifz: d.hifz || null, mapLock: d.mapLock || null, certs: d.certs || {}};
  }

  /* ---------- رفع التعديلات ---------- */
  const timers = {};
  function schedulePush(id){
    clearTimeout(timers[id]);
    timers[id] = setTimeout(() => pushMember(id), 1200);
  }
  async function pushMember(id){
    id = Store.R(id);
    const p = Store.profile(id); if (!p || !st.fid) return;
    if (!p.cloud){ await uploadLocal(); return; }
    if (!canEdit(p)) return;
    await db.doc(`families/${st.fid}/members/${id}`).set(memberDoc(id));
    await pushPub(id);
  }
  // الأرقام العامة للوحة القيادة: المحفوظ يُحسب كاملًا، والتسميع يزيد تراكميًّا
  async function pushPub(id, initialSessions){
    const m = Stats.memorized(id);
    const doc = {fid: st.fid, mem: {l: m.letters, w: m.words, a: m.ayat, p: +m.pages.toFixed(3), j: +m.juz.toFixed(3)}, up: Date.now()};
    const prog = Stats.week(id), gs = Stats.goalStatus(id, prog);
    const c = Stats.contribution(id, true);
    doc.goal = gs ? {w: prog.w, met: !!gs.met, pct: Math.round(c.pct), has: c.hasGoal} : null;   // للوحة: الهدف ونصيب الخزّان
    if (initialSessions){
      const t = {s: 0, w: 0, l: 0, p: 0};
      initialSessions.forEach(s => { t.s++; t.w += s.words || 0; t.l += s.letters || 0; t.p += s.pages || 0; });
      doc.tot = t;
    }
    await db.doc(`pub/${id}`).set(doc, {merge: true});
  }
  async function pushSession(id, rec, isNew){
    id = Store.R(id);
    const p = Store.profile(id); if (!p || !p.cloud) return schedulePush(id);
    if (!canEdit(p)) return;
    await db.doc(`families/${st.fid}/members/${id}/sessions/${rec.id}`).set(rec);
    if (!isNew) return;
    const inc = FV().increment;
    await db.doc(`pub/${id}`).set({fid: st.fid, tot: {s: inc(1), w: inc(rec.words), l: inc(rec.letters), p: inc(rec.pages)}}, {merge: true});
    await db.doc(`daily/${Store.today()}`).set({d: Store.today(), s: inc(1), w: inc(rec.words), l: inc(rec.letters), p: inc(rec.pages)}, {merge: true});
  }
  // جلسات فرد (لتقاريره على جهاز آخر)
  const loaded = new Set();
  async function loadSessions(id, force){
    if (!st.fid || (loaded.has(id) && !force)) return false;
    loaded.add(id);
    const snap = await db.collection(`families/${st.fid}/members/${id}/sessions`).orderBy('t', 'desc').limit(1000).get();
    Store.mergeSessions(id, snap.docs.map(d => d.data()));
    return true;
  }

  /* ---------- الدخول ---------- */
  async function googleSignIn(){
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({prompt: 'select_account'});
    try { await auth.signInWithPopup(provider); }
    catch(e){
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') await auth.signInWithRedirect(provider);
      else throw e;
    }
  }
  // الخروج: تبقى بيانات العائلة في السحابة، ويُمسح نسخها من هذا الجهاز
  async function signOut(){
    await auth.signOut();
    Store.profiles().filter(p => p.cloud).map(p => p.id).forEach(id => Store.removeProfile(id));
    Store.DB.fid = null; Store.save();
  }
  /* ---------- «سمّعني» ---------- */
  const reqCol = () => db.collection(`families/${st.fid}/requests`);
  // الحافظ يطلب (to = المسمِّع أو null لأي فرد)
  async function sendRequest(from, to, a, b){
    return (await reqCol().add({from, to: to || null, a, b, status: 'pending', created: Date.now(), by: user.uid})).id;
  }
  const setStatus = (id, status) => reqCol().doc(id).update({status, at: Date.now()});
  // المسمِّع يرسل النتيجة: لطلب قائم (id) أو لتسميع حضوري جديد (id = null)
  // direct: جهاز المسمِّع يملك حقّ الكتابة في ملف الحافظ (وليّ الأمر) فيسجّلها بنفسه فورًا
  function makeResult(to, marks, note){
    const listener = Store.profile(to);
    return {marks, note: note || '', t: Date.now(), listener: to, listenerName: listener ? listener.name : ''};
  }
  async function submitResult(id, {from, to, a, b, result, direct}){
    const ref = id ? reqCol().doc(id) : reqCol().doc();
    if (id) await ref.update({to, status: 'done', result, applied: !!direct});
    else await ref.set({from, to, a, b, status: 'done', created: Date.now(), by: user.uid, result, applied: !!direct});
    return ref.id;
  }

  /* ---------- حماية هوية الأولاد ---------- */
  // جهاز جديد يطلب ربط ملفّ موجود (مسح بيانات سفاري أو تغيير الجوال)
  async function requestRelink(mid){
    await reqCol().add({type: 'relink', from: mid, to: null, status: 'pending', created: Date.now(), by: user.uid});
  }
  // وليّ الأمر يوافق: الملفّ يصير لهذا الجهاز الجديد
  async function approveRelink(r){
    await db.doc(`families/${st.fid}/members/${r.from}`).update({uids: [r.by]});
    await reqCol().doc(r.id).update({status: 'done', at: Date.now()});
  }
  // ربط الدخول المجهول بحساب Google: الهوية نفسها، وتعود على أي جهاز بالدخول بـ Google
  async function linkGoogle(){
    const provider = new firebase.auth.GoogleAuthProvider(); provider.setCustomParameters({prompt: 'select_account'});
    try { await auth.currentUser.linkWithPopup(provider); }
    catch(e){
      if (e.code === 'auth/popup-blocked') return auth.currentUser.linkWithRedirect(provider);
      if (e.code === 'auth/credential-already-in-use' && e.credential){ await auth.signInWithCredential(e.credential); return; }
      throw e;
    }
    await auth.currentUser.reload(); user = auth.currentUser;
    st.user = {uid: user.uid, email: user.email, anon: user.isAnonymous, admin: isAdminUser(user)}; emit();
  }
  // قراءة رمز العائلة قبل الانضمام (لعرض اسمها)
  async function peekJoinCode(jc){
    jc = jc.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!auth.currentUser) await auth.signInAnonymously();
    const s = await db.doc(`joinCodes/${jc}`).get();
    return s.exists ? {jc, ...s.data()} : null;
  }

  // وليّ الأمر: حذف الحلقة كاملة. القراءات أولًا (تحتاج العضوية)، ثم الحذف، وصلاحية وليّ الأمر آخرًا
  async function deleteFamily(progress = () => {}){
    const fid = st.fid, base = db.doc(`families/${fid}`), jc = st.family.joinCode;
    const delAll = async refs => { for (let i = 0; i < refs.length; i += 400){ const b = db.batch(); refs.slice(i, i + 400).forEach(r => b.delete(r)); await b.commit(); } };
    progress('جمع البيانات');
    const members = (await base.collection('members').get()).docs;
    const sessions = [];
    for (const m of members) (await m.ref.collection('sessions').get()).docs.forEach(s => sessions.push(s.ref));
    const requests = (await base.collection('requests').get()).docs.map(d => d.ref);
    const access = (await base.collection('access').get()).docs;
    progress('حذف الجلسات'); await delAll(sessions);
    progress('حذف الأفراد'); await delAll(members.map(m => m.ref));
    await delAll(requests);
    await delAll(members.map(m => db.doc(`pub/${m.id}`)));
    if (jc) await db.doc(`joinCodes/${jc}`).delete().catch(() => {});
    await db.doc(`fstat/${fid}`).delete().catch(() => {});
    await delAll(access.filter(a => a.id !== user.uid).map(a => a.ref));
    progress('حذف الحلقة');
    await base.delete();
    await db.doc(`families/${fid}/access/${user.uid}`).delete().catch(() => {});
    if (unsubMembers){ unsubMembers(); unsubMembers = null; }
    if (unsubReq){ unsubReq(); unsubReq = null; }
    if (unsubFam){ unsubFam(); unsubFam = null; }
    cleanupDeleted(); emit();
  }

  /* ---------- استرجاع نسخة الحلقة (وليّ الأمر) ----------
     دمج آمن: لا يمحو شيئًا مما هو موجود الآن، ويضيف ما فُقد.
     المحفوظ: اتحاد · حالة كل آية: الأحدث · مواضع الأخطاء: الأكبر · الشهادات: اتحاد · الهدف: الحالي إن وُجد
     الجلسات: تُدمج بالمعرّف · الفرد المحذوف يعود بمعرّفه وبياناته */
  function mergeData(cur, bak){
    const m = new Uint8Array(Q.TOTAL_AYAT);
    [...(cur.mem || []), ...(bak.mem || [])].forEach(([a, b]) => m.fill(1, a, b + 1));
    const ranges = []; let s = -1;
    for (let i = 0; i <= m.length; i++){ if (i < m.length && m[i]){ if (s < 0) s = i; } else if (s >= 0){ ranges.push([s, i - 1]); s = -1; } }
    const rev = {...(bak.rev || {})};
    Object.entries(cur.rev || {}).forEach(([i, v]) => { if (!rev[i] || rev[i][0] <= v[0]) rev[i] = v; });
    const mis = {...(bak.mis || {})};
    Object.entries(cur.mis || {}).forEach(([g, c]) => { mis[g] = Math.max(mis[g] || 0, c); });
    const certs = {...(bak.certs || {}), ...(cur.certs || {})};
    const nl = {...(bak.nl || {}), ...(cur.nl || {})};
    const lis = {...(bak.lis || {}), ...(cur.lis || {})};
    return {mem: ranges, rev, mis, certs, nl, lis, goal: cur.goal || bak.goal || null, mapLock: cur.mapLock || bak.mapLock || null};
  }
  async function restoreFamily(bk, progress = () => {}){
    if (!bk || bk.kind !== 'family-backup' || !Array.isArray(bk.members)) throw new Error('bad-backup');
    const base = db.doc(`families/${st.fid}`);
    let k = 0;
    for (const bm of bk.members){
      progress(`${++k} / ${bk.members.length}: ${bm.name}`);
      const ref = base.collection('members').doc(bm.id);
      const snap = await ref.get();
      const cx = snap.exists ? snap.data() : null;
      const cur = cx ? {...cx, mem: decodeMem(cx.mem)} : {};
      const md = mergeData(cur, bm.data || {});
      const doc = {name: cx ? cx.name : bm.name, color: cx ? cx.color : bm.color, uids: cx ? (cx.uids || []) : (bm.uids || []),
                   mem: encodeMem(md.mem), rev: md.rev, mis: md.mis, certs: md.certs, nl: md.nl, lis: md.lis,
                   goal: md.goal, mapLock: md.mapLock, prog: cx ? (cx.prog || null) : null, wkp: {...((bm.data || {}).wkp || {}), ...((cx && cx.wkp) || {})},
                   wird: null, hifz: null, up: Date.now()};
      await ref.set(doc);
      // الجلسات: كتابة بالمعرّف (لا تكرار)
      const ss = ((bm.data || {}).sess || []).filter(x => x && x.id);
      for (let i = 0; i < ss.length; i += 400){ const b = db.batch(); ss.slice(i, i + 400).forEach(x => b.set(ref.collection('sessions').doc(x.id), x)); await b.commit(); }
      // النسخة المحلية ثم أرقام اللوحة من الجلسات كاملة
      Store.applyRemote(bm.id, {...doc, mem: md.mem});
      await loadSessions(bm.id, true);
      Store.mergeSessions(bm.id, ss);
      await pushPub(bm.id, Store.data(bm.id).sess);
    }
    emit();
    return {members: bk.members.length, sessions: bk.members.reduce((t, x) => t + (((x.data || {}).sess) || []).length, 0)};
  }

  // وليّ الأمر: مكافأة الأسبوع
  async function setReward(reward){
    await db.doc(`families/${st.fid}`).update({reward: reward.slice(0, 80), rewardAt: Date.now()});
  }

  // «هذا أنا»: ربط فرد غير مربوط بهذا الجهاز
  async function claimMember(id){
    await db.doc(`families/${st.fid}/members/${id}`).update({uids: [user.uid]});
    const p = Store.profile(id); p.uids = [user.uid]; Store.save(); emit();
  }
  // وليّ الأمر: يسمح بربط الفرد بجهاز جديد (مثلًا بعد تغيير الجوال)
  async function releaseMember(id){
    await db.doc(`families/${st.fid}/members/${id}`).update({uids: []});
    const p = Store.profile(id); p.uids = []; Store.save(); emit();
  }
  // حذف فرد (لوليّ الأمر)
  async function removeMember(id){
    await db.doc(`families/${st.fid}/members/${id}`).delete();
    await db.doc(`pub/${id}`).delete().catch(() => {});
  }

  /* ---------- إنشاء حلقة عائلة (بدعوة، أو مباشرةً للمدير) ---------- */
  async function createFamily(name, inviteCode){
    if (!user || user.isAnonymous) throw new Error('need-google');
    const admin = isAdminUser(user);
    const fref = db.collection('families').doc(), fid = fref.id;
    let jc = code(6);
    while ((await db.doc(`joinCodes/${jc}`).get()).exists) jc = code(6);
    const b = db.batch();
    const fam = {name, owner: user.uid, joinCode: jc, created: Date.now()};
    if (!admin || inviteCode){
      const inv = await db.doc(`invites/${inviteCode}`).get();
      if (!inv.exists) throw new Error('invite-missing');
      if (inv.data().used) throw new Error('invite-used');
      fam.invite = inviteCode;
      b.update(inv.ref, {used: true, usedBy: user.uid, fid, usedAt: Date.now()});
    }
    b.set(fref, fam);
    b.set(db.doc(`families/${fid}/access/${user.uid}`), {role: 'owner', at: Date.now()});
    b.set(db.doc(`joinCodes/${jc}`), {fid, name});
    b.set(db.doc(`fstat/${fid}`), {created: fam.created});
    b.set(db.doc(`users/${user.uid}`), {fid});
    await b.commit();
    await attach(); emit();
  }

  /* ---------- الانضمام برمز العائلة ---------- */
  async function joinFamily(jc){
    jc = jc.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!user) await auth.signInAnonymously();
    const j = await db.doc(`joinCodes/${jc}`).get();
    if (!j.exists) throw new Error('code-missing');
    const fid = j.data().fid;
    await db.doc(`families/${fid}/access/${auth.currentUser.uid}`).set({role: 'member', code: jc, at: Date.now()});
    await db.doc(`users/${auth.currentUser.uid}`).set({fid});
    user = auth.currentUser;
    await attach(); emit();
  }

  return {
    init, st, subscribe: f => { subs.add(f); return () => subs.delete(f); },
    deleteFamily, restoreFamily, requestRelink, approveRelink, linkGoogle, peekJoinCode, setReward, sendRequest, setStatus, submitResult, makeResult, onPeerDone: null,
    googleSignIn, signOut, removeMember, claimMember, releaseMember, mine, canEdit, canRecite, isOwner, createFamily, joinFamily, loadSessions,
    get db(){ return db; }, get auth(){ return auth; }, ADMIN_EMAIL, code, isAdminUser
  };
})();
