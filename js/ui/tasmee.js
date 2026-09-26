/* حلقة البيت · tasmee.js — جزء من الواجهة (ملفّات js/ui تُحمَّل بالترتيب في index.html وتتشارك النطاق العام) */
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
    if ($('#addMem')) $('#addMem').onclick = () => { newAyat.forEach(i => Store.setMem(pid, i, i, true, true)); $('#addMem').closest('.addmem').innerHTML = '<b>أُضيفت إلى محفوظك.</b> بارك الله في حفظك.'; };
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
  if (!prev){ Store.addSession(pid, rec); hwCheck(pid, rec); }
  Store.touch(pid);
  Store.hooks.session(pid, rec, !prev);
  return {rec, misDelta, revPrev, reached};
}

