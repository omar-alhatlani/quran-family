// حالات الاختبار: تُنفَّذ داخل صفحة البرنامج (دوالّه العامة متاحة). تُرجع [{name, ok, err}].
(async () => {
  const out = [];
  const eq = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg || ''} توقّعت ${JSON.stringify(b)} ووجدت ${JSON.stringify(a)}`); };
  const ok = (v, msg) => { if (!v) throw new Error(msg || 'شرط لم يتحقّق'); };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const reset = () => { Store.importJSON(JSON.stringify({v: 1, profiles: [], cur: null, d: {}, prefs: {}})); drill = null; };
  const test = async (name, fn) => { try { reset(); await fn(); out.push({name, ok: true}); } catch(e){ out.push({name, ok: false, err: e.message}); } };
  const kid = (name = 'هيثم') => { const p = Store.addProfile(name, '#2f6fb3'); Store.cur = p.id; return p; };
  const mkW = (A, B) => rangeWords(A, B).map(w => ({...w, s: Engine.norm(w.raw)}));
  const recite = (A, B, text) => {
    const W = mkW(A, B); let done = false;
    Engine.setup(W, {firstWord: false, mode: 'continuous'}, {update(){}, warn(){}, done(){ done = true; }});
    Engine.S.running = true; Engine.onHeard(text !== undefined ? text : W.map(w => w.raw).join(' '), true);
    if (!done) Engine.finish();
    return Engine.S;
  };
  const bad = S => S.marks.map((m, i) => m && m.st !== 'ok' ? m.st : null).filter(Boolean);

  /* ---------- البيانات ---------- */
  await test('المصحف: ٦٢٣٦ آية و٧٧٬٤٣٠ كلمة و٦٠٤ أوجه', () => {
    eq(Q.TOTAL_AYAT, 6236); eq(Q.totalWords, 77430); eq(Q.page[Q.TOTAL_AYAT - 1], 604);
    eq(Q.sim[Q.idx(2, 21)].split('\t')[0], 'يا أيها', '«يَٰٓأَيُّهَا» وحدة واحدة تقابل «يا أيها»');
  });

  /* ---------- محرّك التسميع ---------- */
  await test('المحرّك: قراءة صحيحة كاملة', () => { const S = recite(Q.idx(67, 1), Q.idx(67, 3)); eq(bad(S), []); eq(S.pos, S.marks.length); });
  await test('المحرّك: كلمة متروكة وكلمة مبدّلة وإعادة', () => {
    const W = mkW(Q.idx(67, 1), Q.idx(67, 2)).map(w => w.raw);
    const said = [...W]; said.splice(2, 1); said[10] = 'ليبلونا';
    said.splice(5, 0, W[1], W[2]);   // إعادة كلمتين سابقتين
    const S = recite(Q.idx(67, 1), Q.idx(67, 2), said.join(' '));
    eq(bad(S).sort(), ['skip', 'wrong'].sort());
  });
  await test('المحرّك: نتائج أندرويد التراكمية بلا تكرار', () => {
    const A = Q.idx(67, 1), B = Q.idx(67, 4), ay = []; for (let i = A; i <= B; i++) ay.push(Q.sim[i].split('\t').join(' '));
    let acc = '', cum = []; ay.forEach(a => { acc = (acc + ' ' + a).trim(); cum.push(acc); });
    eq(Engine.joinResults(cum), ay.join(' '));
    eq(bad(recite(A, B, cum.join(' '))), [], 'النص المكرّر لا يُحسب أخطاء');
  });

  /* ---------- الأهداف والورد وحفظ اليوم ---------- */
  await test('الأسبوع يبدأ السبت', () => { const s = Stats.weekStart(Store.today()); eq((s + 4) % 7, 6, 'يوم السبت'); });
  await test('الحفظ الجديد: الإضافة الكبيرة رسم لا حفظ', () => {
    const p = kid(); Store.setMem(p.id, Q.juzFirst[30], Q.juzLast[30], true);
    const d = Store.data(p.id); d.goal = {n: 2, nu: 'page', dy: 5, rc: 4, since: Store.today()};
    Store.setMem(p.id, Q.idx(67, 1), Q.idx(67, 12), true); Store.setMem(p.id, Q.juzFirst[28], Q.juzLast[28], true);
    eq(Math.round(Stats.week(p.id).np), 1);
  });
  await test('ورد المراجعة: ثابت، ومقداره لا يتجاوز ضعف النصيب', () => {
    const p = kid(); Store.setMem(p.id, Q.juzFirst[30], Q.juzLast[30], true);
    Store.data(p.id).goal = {n: 2, nu: 'page', dy: 5, rc: 4, since: Store.today()};
    const w1 = Stats.wird(p.id, true), w2 = Stats.wird(p.id, true);
    eq(JSON.stringify(w1.items), JSON.stringify(w2.items), 'الورد ثابت');
    ok(w1.q <= 2 * Math.round(Stats.memorized(p.id).pages / 4) / 7 + 0.6, 'المقدار ' + w1.q);
  });
  await test('حفظ اليوم: من الناس صعودًا، وتُتمّ بقية السورة القليلة', () => {
    const p = kid(); Store.setMem(p.id, 6188, 6235, true);
    Store.data(p.id).goal = {n: 2, nu: 'page', dy: 5, rc: 4, since: Store.today()};
    const hz = Stats.hifz(p.id, true); eq(hz.items.map(([a, b]) => itemLabel(a, b)), ['سورة الهمزة كاملة']);
  });

  /* ---------- «سمّعني» والواجب والشهادات ---------- */
  await test('نتيجة المسمِّع: مرة واحدة، و٩٠٪+ تضيف الجديد', () => {
    const p = kid(); Store.setMem(p.id, 6188, 6235, true);
    const A = Q.idx(103, 1), B = Q.idx(103, 3), r = (id, marks, dt) => ({id, from: p.id, a: A, b: B, result: {marks, t: Date.now() + dt, listener: 'L', listenerName: 'أبو هيثم'}});
    applyPeer(r('a', {1: 'wrong', 4: 'wrong', 6: 'wrong'}, 0)); eq(Store.mem(p.id)[A], 0, 'أقل من ٩٠٪ لا يُضاف');
    applyPeer(r('b', {}, 600e3)); applyPeer(r('b', {}, 600e3)); eq(Store.mem(p.id)[A], 1, '١٠٠٪ يُضاف');
    eq(Store.data(p.id).sess.filter(s => s.id === 'peer-b').length, 1, 'بلا تكرار');
  });
  await test('واجب المدرسة: الإتقان بتسميعين في يومين', () => {
    const p = kid(), d = Store.data(p.id), A = Q.idx(67, 1), B = Q.idx(67, 15);
    d.hw = [{id: 'h', a: A, b: B, due: null, created: Store.today(), passes: []}];
    const r = (id, dt) => ({id, from: p.id, a: A, b: B, result: {marks: {}, t: Date.now() + dt, listener: 'L', listenerName: 'أ'}});
    applyPeer(r('x', 0)); eq(hwStatus(d.hw[0]).k, 'one');
    applyPeer(r('y', 60e3)); eq(hwStatus(d.hw[0]).k, 'one', 'اليوم نفسه لا يكفي');
    applyPeer(r('z', 864e5)); eq(hwStatus(d.hw[0]).k, 'done');
  });
  await test('الشهادات: الرسم الأول قديم، والإتمام بعد القفل جديد', () => {
    const p = kid(), d = Store.data(p.id);
    Store.setMem(p.id, Q.juzFirst[30], Q.juzLast[30], true); ok(d.certs[30] < 0, 'الرسم الأول بالسالب');
    d.goal = {n: 2, nu: 'page', dy: 5, rc: 4, since: Store.today()};
    Store.setMem(p.id, Q.juzFirst[29], Q.juzLast[29], true); eq(d.certs[29], Store.today());
  });
  await test('قفل الخريطة بعد وضع الهدف', () => {
    const p = kid(); ok(!mapLocked(p.id)); Store.data(p.id).goal = {n: 1, nu: 'page', dy: 5, rc: 4}; ok(mapLocked(p.id));
    Store.data(p.id).mapLock = 'open'; ok(!mapLocked(p.id), 'إعادة الفتح');
  });

  /* ---------- المتشابهات ومواضع الضعف ---------- */
  await test('المتشابهات: البقرة ٥٨ ↔ الأعراف ١٦١، والتنبيه أثناء التسميع', async () => {
    await loadMut(); ok((MUT[Q.idx(2, 58)] || []).some(([j]) => j === Q.idx(7, 161)));
    eq(mutHint(Q.idx(2, 58), 'قيل'), Q.idx(7, 161));
  });
  await test('مواضع الضعف: المتجاورة مقطع واحد', () => {
    const p = kid(); Store.setMem(p.id, Q.juzFirst[30], Q.juzLast[30], true); const d = Store.data(p.id);
    d.mis[Q.ayahWords(Q.idx(78, 13))[1].g] = 3; d.mis[Q.ayahWords(Q.idx(78, 14))[2].g] = 2; d.mis[Q.ayahWords(Q.idx(89, 5))[0].g] = 1;
    eq(Stats.weakItems(p.id).map(([a, b]) => itemLabel(a, b)), ['سورة النبأ: من الآية ١٣ إلى الآية ١٤', 'سورة الفجر: الآية ٥']);
  });

  /* ---------- تقرير الأسبوع والتذكير ---------- */
  await test('تقرير الأسبوع: نصّ فيه الاسم والمحفوظ والواجب', () => {
    const p = kid(); Store.setMem(p.id, Q.juzFirst[30], Q.juzLast[30], true); const d = Store.data(p.id);
    d.goal = {n: 2, nu: 'page', dy: 5, rc: 4, since: Store.today()};
    d.hw = [{id: 'h', a: Q.idx(67, 1), b: Q.idx(67, 15), due: null, created: Store.today(), passes: []}];
    const t = memberReportText(p.id);
    ['تقرير الأسبوع · هيثم', 'أيام التسميع', 'المحفوظ', 'واجب المدرسة: سورة الملك'].forEach(s => ok(t.includes(s), 'ينقص: ' + s));
  });
  await test('التقرير يعرض الأسبوع الذي فيه التسميع (ولو كان اليوم سبتًا)', () => {
    const p = kid(), t = Store.today(), w = Stats.weekStart(t);
    eq(reportWeek([p.id]), t === w ? w - 7 : w, 'بلا عمل');
    const A = Q.idx(112, 1), B = Q.idx(112, 4); recite(A, B); applySession(p.id, A, B, mkW(A, B));
    eq(reportWeek([p.id]), w, 'بعد التسميع');
  });
  await test('حفظ بالتسميع يُحسب جديدًا مهما طال، ولو قبل وضع الهدف', () => {
    const p = kid(), d = Store.data(p.id), A = Q.idx(2, 1), B = Q.idx(2, 40);
    d.hw = [{id: 'h', a: A, b: B, due: null, created: Store.today(), passes: []}];
    applyPeer({id: 'q', from: p.id, a: A, b: B, result: {marks: {}, t: Date.now(), listener: 'L', listenerName: 'أ'}});
    ok(weekSummary(p.id, Stats.weekStart(Store.today())).np > 3, 'أكثر من ٣ أوجه');
    Store.setMem(p.id, Q.juzFirst[30], Q.juzLast[30], true); eq(Object.keys(d.nl).length, 1, 'الرسم لا يُحسب');
  });
  await test('تقرير الأسبوع صورةً: للفرد وللحلقة', async () => {
    const p = kid(); Store.setMem(p.id, Q.juzFirst[30], Q.juzLast[30], true); const d = Store.data(p.id);
    d.goal = {n: 2, nu: 'page', dy: 5, rc: 4, since: Store.today()};
    d.hw = [{id: 'h', a: Q.idx(67, 1), b: Q.idx(67, 15), due: null, created: Store.today(), passes: []}];
    const cv = await memberReportImage(p.id); ok(cv.width === 1080 && cv.height > 900, 'مقاس ' + cv.width + '×' + cv.height);
    const fam = Cloud.st.family; p.cloud = true; Cloud.st.family = {name: 'التجربة', reward: 'نزهة'};
    try { const c2 = await circleReportImage(); ok(c2.height > 700, 'الحلقة ' + c2.height); ok(circleReportText().includes('حلقة التجربة')); }
    finally { Cloud.st.family = fam; delete p.cloud; }
  });
  await test('التذكير اليومي: حدث تقويم متكرّر بتنبيه', async () => {
    let text = null; const orig = URL.createObjectURL;
    URL.createObjectURL = b => { b.text().then(x => { text = x; }); return 'blob:x'; };
    const click = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function(){};
    try { reminderICS(20, 30); await wait(100); } finally { URL.createObjectURL = orig; HTMLAnchorElement.prototype.click = click; }
    ['BEGIN:VCALENDAR', 'RRULE:FREQ=DAILY', 'T203000', 'BEGIN:VALARM', 'ورد القرآن'].forEach(s => ok(text && text.includes(s), 'ينقص: ' + s));
  });

  /* ---------- الشاشات: كلّها تُعرض بلا أخطاء ---------- */
  await test('الشاشات تُعرض', async () => {
    const p = kid(); Store.setMem(p.id, Q.juzFirst[30], Q.juzLast[30], true);
    Store.data(p.id).goal = {n: 2, nu: 'page', dy: 5, rc: 4, since: Store.today()};
    const routes = ['#/', '#/home', '#/map', '#/tasmee/67/1/5', '#/report', '#/goal', '#/start/2', '#/drill', '#/mut', '#/play/67/1/5', '#/play/wird', '#/cert/30', '#/start/3'];
    for (const h of routes){
      location.hash = h; await wait(350);
      ok(document.querySelector('#app').innerText.trim().length > 20, 'شاشة فارغة: ' + h);
    }
    location.hash = '#/';
  });

  reset();
  return out;
})();
