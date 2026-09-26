/* حلقة البيت · adhkar.js — أذكار الصباح والمساء (حصن المسلم)، وسورة الكهف يوم الجمعة.
   خاصّة بصاحبها: تُحفظ في هذا الجهاز فقط، ولا تظهر للأهل ولا في التقارير ولا في الخزّان. */
let ADHKAR = null;
const loadAdhkar = async () => ADHKAR || (ADHKAR = await fetch('data/adhkar.json?v=1').then(r => r.json()));

// أوقات ثابتة تقريبية: الصباح من ٤ إلى ١٢، والمساء من ٣ عصرًا إلى منتصف الليل؛ والكهف من مغرب الخميس إلى مغرب الجمعة (٦ مساءً)
const ADH_NAME = {m: 'أذكار الصباح', e: 'أذكار المساء'}, KAHF_H = 18;
function adhNow(d = new Date()){ const h = d.getHours(); return h >= 4 && h < 12 ? 'm' : h >= 15 ? 'e' : null; }
// يوم الجمعة المعنيّ الآن (رقمه)، أو null خارج وقتها
function kahfDay(d = new Date()){
  const dw = d.getDay(), h = d.getHours(), t = Store.dayOf(d.getTime());
  return dw === 5 && h < KAHF_H ? t : dw === 4 && h >= KAHF_H ? t + 1 : null;
}
const KAHF = () => { const A = Q.idx(18, 1), B = Q.idx(18, 110); return {A, B, P0: Q.page[A], n: Q.page[B] - Q.page[A] + 1}; };

// الحالة (في هذا الجهاز): adh[pid] = {m: آخر يوم أُتمّت فيه، e: …، pos: {k, day, i, left}}؛ kahf[pid] = {f: يوم الجمعة، p: أوجه قُرئت، done}
const privGet = (key, pid) => (Store.pref(key, {}) || {})[pid] || {};
const privSet = (key, pid, v) => { const all = {...Store.pref(key, {})}; all[pid] = v; Store.setPref(key, all); };
const adhDone = (pid, k) => privGet('adh', pid)[k] === Store.today();
const kahfState = (pid, f) => { const s = privGet('kahf', pid); return s.f === f ? s : {f, p: 0, done: false}; };
const ownsPrivate = p => !!p && (!p.cloud || Cloud.mine(p));

// بطاقتا الرئيسية: الأذكار في وقتها، والكهف في وقتها
function devotionCards(pid){
  const p = Store.profile(pid); if (!ownsPrivate(p)) return '';
  const k = adhNow(), f = kahfDay(), out = [];
  if (k){
    const done = adhDone(pid, k), pos = privGet('adh', pid).pos, mid = !done && pos && pos.k === k && pos.day === Store.today() && pos.i > 0;
    out.push(`<a class="dv${done ? ' done' : ''}" href="#/adhkar/${k === 'm' ? 1 : 2}"><span class="dv-i" aria-hidden="true">${k === 'm' ? '☀️' : '🌙'}</span>
      <span><b>${done ? '✓ أتممت ' + ADH_NAME[k] : ADH_NAME[k]}</b><span class="small">${done ? 'تقبّل الله منك' : mid ? 'أكمل من حيث توقّفت' : 'من حصن المسلم'}</span></span></a>`);
  }
  if (f !== null){
    const s = kahfState(pid, f), {n} = KAHF();
    out.push(`<a class="dv${s.done ? ' done' : ''}" href="#/kahf"><span class="dv-i" aria-hidden="true">📖</span>
      <span><b>${s.done ? '✓ قرأت سورة الكهف' : 'سورة الكهف'}</b><span class="small">${s.done ? 'هذه الجمعة، تقبّل الله منك' : s.p ? `قرأت ${AR(s.p)} من ${AR(n)} أوجه` : new Date().getDay() === 4 ? 'ليلة الجمعة' : 'يوم الجمعة'}</span></span></a>`);
  }
  return out.length ? `<div class="dv-row">${out.join('')}</div>` : '';
}

// نصّ آيات من المصحف (رسم عثماني)، مع البسملة لأوّل السورة
function ayatHtml(s, a, b){
  const A = Q.idx(s, a), B = Q.idx(s, b);
  return `${a === 1 && s !== 1 && s !== 9 ? '<p class="basmala">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p>' : ''}<p class="text adh-q">${
    Array.from({length: B - A + 1}, (_, k) => `${Q.uth[A + k].split('\t').join(' ')} <span class="num">﴿${AR(Q.num[A + k])}﴾</span>`).join(' ')}</p>`;
}

/* ---------- شاشة الأذكار: ذكر في كل شاشة، والضغط يعدّ ---------- */
function viewAdhkar(pid, [k]){
  const p = Store.profile(pid);
  if (k !== 1 && k !== 2){      // الاختيار
    setTop('الأذكار', '#/home');
    const now = adhNow();
    app.innerHTML = `<section class="panel"><h2>📿 الأذكار</h2>
      <p class="small">من كتاب حصن المسلم. ${ownsPrivate(p) ? 'ما تُتمّه يبقى لك وحدك، لا يراه أحد.' : ''}</p>
      <div class="dv-row col">
        <a class="dv${now === 'm' ? ' now' : ''}" href="#/adhkar/1"><span class="dv-i">☀️</span><span><b>أذكار الصباح</b><span class="small">${adhDone(pid, 'm') ? '✓ أتممتها اليوم' : 'بعد الفجر'}</span></span></a>
        <a class="dv${now === 'e' ? ' now' : ''}" href="#/adhkar/2"><span class="dv-i">🌙</span><span><b>أذكار المساء</b><span class="small">${adhDone(pid, 'e') ? '✓ أتممتها اليوم' : 'بعد العصر'}</span></span></a>
        <a class="dv" href="#/kahf"><span class="dv-i">📖</span><span><b>سورة الكهف</b><span class="small">يوم الجمعة</span></span></a>
      </div></section>`;
    return;
  }
  const key = k === 1 ? 'm' : 'e', own = ownsPrivate(p);
  setTop(ADH_NAME[key], '#/home');
  app.innerHTML = '<p class="loading">جارٍ التحميل…</p>';
  loadAdhkar().then(A => {
    if (location.hash !== '#/adhkar/' + k) return;
    const list = A[key], saved = privGet('adh', pid).pos;
    let i = 0, left = list[0].n;
    if (own && saved && saved.k === key && saved.day === Store.today() && saved.i < list.length && !adhDone(pid, key)){ i = saved.i; left = saved.left; }
    const keep = () => { if (own){ const s = privGet('adh', pid); s.pos = {k: key, day: Store.today(), i, left}; privSet('adh', pid, s); } };
    const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch(e){} };
    const finish = () => {
      if (own){ const s = privGet('adh', pid); s[key] = Store.today(); delete s.pos; privSet('adh', pid, s); }
      app.innerHTML = `<section class="panel adh-end"><div class="adh-end-i">${key === 'm' ? '☀️' : '🌙'}</div>
        <h2>أتممت ${ADH_NAME[key]}</h2><p>تقبّل الله منك، وحفظك في ${key === 'm' ? 'يومك' : 'ليلتك'}.</p>
        <a class="btn primary big" href="#/home">رجوع إلى الرئيسية</a></section>`;
    };
    const render = () => {
      const x = list[i];
      app.innerHTML = `
        <div class="adh-top"><span class="small">${AR(i + 1)} من ${AR(list.length)}</span><div class="track"><i style="width:${i / list.length * 100}%"></i></div></div>
        <section class="adh-card" id="adhTap">
          ${x.pre ? `<p class="adh-pre">${x.pre}</p>` : ''}
          ${x.q ? x.q.map(([s, a, b]) => ayatHtml(s, a, b)).join('') : `<p class="adh-t">${x.t}</p>`}
          ${x.note ? `<p class="small adh-note">${x.note}</p>` : ''}
        </section>
        <div class="adh-bar">
          <button class="btn" type="button" id="adhPrev" ${i ? '' : 'disabled'}>السابق</button>
          <button class="adh-c" type="button" id="adhC" aria-label="اضغط للعدّ"><b>${AR(left)}</b><span>${x.n > 1 ? 'من ' + AR(x.n) : 'اضغط'}</span></button>
          <button class="btn" type="button" id="adhNext">${i === list.length - 1 ? 'إنهاء' : 'التالي'}</button>
        </div>
        <p class="small adh-src">اضغط الدائرة أو النص مع كل مرة.</p>`;
      const go = d => { i += d; if (i >= list.length) return finish(); left = list[i].n; keep(); render(); scrollTo(0, 0); };
      const tap = () => {
        if (left <= 0) return;
        left--; keep();
        if (left > 0){ buzz(12); $('#adhC b').textContent = AR(left); $('#adhC').classList.remove('tick'); void $('#adhC').offsetWidth; $('#adhC').classList.add('tick'); }
        else { buzz([30, 40, 30]); $('#adhC').classList.add('fin'); setTimeout(() => go(1), 280); }
      };
      $('#adhC').onclick = tap; $('#adhTap').onclick = tap;
      $('#adhPrev').onclick = () => { if (i) go(-1); };
      $('#adhNext').onclick = () => go(1);
    };
    render();
  });
}

/* ---------- سورة الكهف: وجهًا وجهًا، ويُحفظ الموضع ---------- */
function viewKahf(pid){
  setTop('سورة الكهف', '#/home');
  const p = Store.profile(pid), own = ownsPrivate(p), f = kahfDay(), {A, B, P0, n} = KAHF();
  const st = f !== null && own ? kahfState(pid, f) : {p: 0, done: false};
  let pg = st.done ? 0 : Math.min(st.p || 0, n - 1);
  const save = () => { if (f !== null && own) privSet('kahf', pid, st); };
  const render = () => {
    const a = Math.max(A, Q.pageFirst[P0 + pg]), b = Math.min(B, Q.pageLast[P0 + pg]), last = pg === n - 1;
    app.innerHTML = `
      <div class="adh-top"><span class="small">الوجه ${AR(pg + 1)} من ${AR(n)}${st.done ? ' · ✓ قرأتها هذه الجمعة' : ''}</span><div class="track"><i style="width:${(st.done ? n : st.p) / n * 100}%"></i></div></div>
      <section class="mushaf">
        ${pg === 0 ? '<div class="sura-head">سُورَةُ الكَهْفِ</div>' : ''}
        ${ayatHtml(18, Q.num[a], Q.num[b])}
      </section>
      <div class="adh-bar">
        <button class="btn" type="button" id="kPrev" ${pg ? '' : 'disabled'}>السابق</button>
        <a class="btn" href="#/play/kahf">🎧 استمع</a>
        <button class="btn primary" type="button" id="kNext">${last ? 'أتممت السورة ✓' : 'التالي'}</button>
      </div>
      ${f === null ? '<p class="small adh-src">يُسجَّل إتمامها من مغرب الخميس إلى مغرب الجمعة، والقراءة متاحة في كل وقت.</p>' : ''}`;
    $('#kPrev').onclick = () => { pg--; render(); scrollTo(0, 0); };
    $('#kNext').onclick = () => {
      st.p = Math.max(st.p || 0, pg + 1);
      if (last){
        st.done = true; save();
        app.innerHTML = `<section class="panel adh-end"><div class="adh-end-i">📖</div><h2>أتممت سورة الكهف</h2>
          <p>تقبّل الله منك، وجعل لك نورًا ما بين الجمعتين.</p><a class="btn primary big" href="#/home">رجوع إلى الرئيسية</a></section>`;
        return;
      }
      save(); pg++; render(); scrollTo(0, 0);
    };
  };
  render();
}
