/* حلقة البيت · peer.js — جزء من الواجهة (ملفّات js/ui تُحمَّل بالترتيب في index.html وتتشارك النطاق العام) */
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
  hwCheck(pid, rec);
  // حفظ جديد أتقنه أمام أحد أهله: يُضاف إلى محفوظه
  if (rec.kind === 'new' && rec.pct >= 90) Object.keys(per).map(Number).filter(i => !mem[i]).forEach(i => Store.setMem(pid, i, i, true, true));
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
  const seen = Store.pref('seenResults', []);
  const results = rs.filter(r => r.from === me && r.status === 'done' && r.result && Date.now() - r.result.t < 3 * 864e5 && !seen.includes(r.id));
  if (!incoming.length && !mineOut.length && !relinks.length && !results.length) return '';
  return `<section class="panel peer">
    ${results.map(r => { const n = rangeWords(r.a, r.b).length, e = Object.values(r.result.marks || {}).filter(x => x === 'wrong').length,
        hn = Object.values(r.result.marks || {}).filter(x => x === 'hint').length, pc = n ? Math.round((n - e - hn) / n * 100) : 0;
      return `<div class="preq res">
      <p>✓ سمّع لك <b>${esc(r.result.listenerName || pname(r.to))}</b>: ${rangeText(r.a, r.b)} · <b>${AR(pc)}٪</b>${e ? ` · ${count(e, 'خطأ واحد', 'خطآن', 'أخطاء', 'خطأً')}` : ' · بلا أخطاء'}${hn ? ` · ${count(hn, 'فتح واحد', 'فتحان', 'فتحات', 'فتحًا')}` : ''}</p>
      ${r.result.note ? `<p class="small">«${esc(r.result.note)}»</p>` : ''}
      <div class="row"><button class="btn small" type="button" data-seen="${r.id}">حسنًا</button></div></div>`; }).join('')}
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
  $$('[data-seen]').forEach(b => b.onclick = () => { Store.setPref('seenResults', [...Store.pref('seenResults', []), b.dataset.seen].slice(-100)); route(true); });
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
      <div id="askBanner">${peerBanner()}</div>
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
  // حين يُجيب المسمِّع (أو يعتذر) تتحدّث اللافتة دون إعادة رسم الصفحة
  const off = Cloud.subscribe(() => { const bx = $('#askBanner'); if (bx){ bx.innerHTML = peerBanner(); bindPeerBanner(); } });
  cleanup = () => off();
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
  return n ? `<p class="small lisline">${ICON_EAR} سمّع لـ${T('hisPeople')} هذا الأسبوع ${count(n, 'مرة واحدة', 'مرتين', 'مرات', 'مرة')} (${count(words, 'كلمة واحدة', 'كلمتين', 'كلمات', 'كلمة')})</p>` : '';
}

