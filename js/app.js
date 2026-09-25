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
  $('#topWho').innerHTML = p && back ? avatar(p, 'sm') : '';
}
function ago(t){
  const d = Store.today() - Math.floor((t - new Date().getTimezoneOffset() * 60000) / 864e5);
  return d <= 0 ? 'اليوم' : d === 1 ? 'أمس' : d === 2 ? 'قبل يومين' : d <= 10 ? `قبل ${AR(d)} أيام` : `قبل ${AR(d)} يومًا`;
}
const STATE_TXT = {fresh: 'ثابت', stale: 'يحتاج مراجعة', weak: 'ضعيف', unrev: 'لم يُسمَّع بعد'};

/* ================= التنقّل ================= */
function route(){
  if (cleanup){ cleanup(); cleanup = null; }
  document.body.classList.remove('has-bar');
  const parts = (location.hash.slice(1) || '/').split('/').filter(Boolean);
  const pid = Store.cur;
  if (!parts.length || !pid) return viewProfiles();
  ({home: viewHome, map: viewMap, tasmee: viewTasmee, report: viewReport}[parts[0]] || viewProfiles)(pid, parts.slice(1).map(Number));
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

/* ================= الأفراد ================= */
function viewProfiles(){
  setTop('حلقة البيت');
  const ps = Store.profiles();
  app.innerHTML = `
    <section class="intro">
      <h1>${ps.length ? 'من سيسمّع الآن؟' : 'أهلًا بكم في حلقة البيت'}</h1>
      <p class="muted">${ps.length ? 'اختر اسمك لتكمل حفظك ومراجعتك.' : 'أضيفوا أفراد العائلة، ثم يرسم كل واحد خريطة ما يحفظه من القرآن.'}</p>
    </section>
    <div class="profiles">${ps.map(p => {
      const m = Stats.memorized(p.id);
      return `<button class="prof" type="button" data-id="${p.id}">${avatar(p)}<span><b>${esc(p.name)}</b><small>${m.words ? Q.dec(m.juz) + ' جزء · ' + Q.dec(m.pages) + ' وجه' : 'لم يرسم خريطته بعد'}</small></span></button>`;
    }).join('')}</div>
    <details class="panel" ${ps.length ? '' : 'open'}>
      <summary>إضافة فرد من العائلة</summary>
      <form id="addForm" style="margin-top:10px">
        <label for="pname">الاسم</label>
        <input type="text" id="pname" maxlength="24" required autocomplete="off">
        <div class="small" style="margin-top:10px">اللون</div>
        <div class="swatches">${COLORS.map((c, i) => `<label><input type="radio" name="pcolor" value="${c}" ${i === ps.length % COLORS.length ? 'checked' : ''}><span style="background:${c}"></span></label>`).join('')}</div>
        <button class="btn primary" type="submit">إضافة</button>
      </form>
    </details>
    <section class="panel">
      <h3>النسخة الاحتياطية</h3>
      <p class="small">البيانات محفوظة في هذا الجهاز فقط. نزّل نسخة احتياطية بين حين وآخر، ويمكنك استرجاعها في أي جهاز.</p>
      <div class="row">
        <button class="btn" id="exp" type="button">تنزيل نسخة احتياطية</button>
        <label class="btn" for="imp" style="color:var(--ink);font-size:14px">استرجاع من ملف</label>
        <input type="file" id="imp" accept="application/json,.json" hidden>
      </div>
    </section>`;
  $$('.prof').forEach(b => b.onclick = () => { Store.cur = b.dataset.id; location.hash = '#/home'; });
  $('#addForm').onsubmit = e => {
    e.preventDefault();
    const name = $('#pname').value.trim(); if (!name) return;
    const p = Store.addProfile(name, $('input[name=pcolor]:checked').value);
    Store.cur = p.id; location.hash = '#/home';
  };
  $('#exp').onclick = () => {
    const blob = new Blob([Store.exportJSON()], {type: 'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `حلقة-البيت-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $('#imp').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    if (!confirm('سيحلّ محتوى الملف محلّ كل البيانات في هذا الجهاز. متابعة؟')) return;
    try { Store.importJSON(await f.text()); route(); }
    catch(err){ alert('هذا الملف ليس نسخة احتياطية من حلقة البيت.'); }
  };
}

/* ================= الرئيسية ================= */
function viewHome(pid){
  const p = Store.profile(pid); setTop('حلقة البيت', '#/');
  $('#topWho').innerHTML = '';
  const m = Stats.memorized(pid), sg = Stats.suggest(pid), d = Store.data(pid);
  const recent = d.sess.slice(-5).reverse();
  app.innerHTML = `
    <section class="who">${avatar(p)}<div><h1>${esc(p.name)}</h1><a href="#/" class="small">تبديل الفرد</a></div></section>
    <div class="big">
      <div><b>${Q.dec(m.juz)}</b><span>جزء</span></div>
      <div><b>${Q.dec(m.pages)}</b><span>وجه</span></div>
      <div><b>${AR(m.ayat)}</b><span>آية</span></div>
      <div><b>${Q.dec(m.pct)}٪</b><span>من القرآن</span></div>
    </div>
    <div class="qbar" aria-hidden="true"><i style="width:${m.pct}%"></i></div>
    ${!m.words ? `
      <section class="panel today">
        <h2>ابدأ برسم خريطتك</h2>
        <p>علّم ما تحفظه من القرآن الآن، بالجزء أو بالسورة أو بالوجه، ليعرف البرنامج ماذا يراجع معك.</p>
        <a class="btn primary" href="#/map">ارسم خريطتي</a>
      </section>` : sg ? `
      <section class="panel today">
        <div class="row between"><h2>مراجعة اليوم</h2><span class="chip ${sg.state}">${STATE_TXT[sg.state]}</span></div>
        <div class="t">${Q.rangeLabel(sg.a, sg.b)}</div>
        <p class="small" style="margin:0 0 10px">الوجه ${AR(sg.pg)} · ${count(sg.b - sg.a + 1, 'آية واحدة', 'آيتان', 'آيات', 'آية')}</p>
        <a class="btn primary" href="#/tasmee/${Q.sur[sg.a]}/${Q.num[sg.a]}/${Q.num[sg.b]}">${ICON.mic} سمّع الآن</a>
      </section>` : ''}
    <nav class="actions">
      <a class="act" href="#/tasmee">${ICON.mic}تسميع</a>
      <a class="act" href="#/map">${ICON.map}خريطة الحفظ</a>
      <a class="act" href="#/report">${ICON.chart}التقرير</a>
    </nav>
    ${recent.length ? `<section class="panel"><h3>آخر التسميعات</h3><ul class="list">${recent.map(s => `
      <li><span>${Q.rangeLabel(s.a, s.b)} <span class="small">· ${s.kind === 'review' ? 'مراجعة' : 'حفظ جديد'} · ${ago(s.t)}</span></span><b>${AR(s.pct)}٪</b></li>`).join('')}</ul></section>` : ''}
    <p style="text-align:center;margin-top:24px"><button class="btn small danger" id="del" type="button">حذف ملف ${esc(p.name)}</button></p>`;
  $('#del').onclick = () => {
    if (confirm(`سيُحذف ملف ${p.name} وكل تسميعاته من هذا الجهاز. متأكّد؟`)){ Store.removeProfile(pid); location.hash = '#/'; }
  };
}

/* ================= الخريطة ================= */
let mapMode = 'mem', mapSel = 0, openSurah = 0;
function viewMap(pid){
  setTop('خريطة الحفظ', '#/home');
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
    <section class="panel">
      <h3>تعليم سريع بالجزء</h3>
      <p class="small" style="margin:2px 0 0">اضغط الجزء الذي تحفظه كاملًا، واضغطه مرّة أخرى لإلغائه.</p>
      <div class="chips">${Array.from({length: 30}, (_, k) => `<button type="button" class="jchip ${juzState(k + 1)}" data-j="${k + 1}">${AR(k + 1)}</button>`).join('')}</div>
    </section>
    <section class="panel">
      <h3>السور</h3>
      <div class="slist">${Q.surahs.map(s => {
        const a = surState(s), st = a === 0 ? '—' : a === s.count ? 'كاملة' : `${AR(a)} من ${AR(s.count)}`;
        return `<div class="srow" data-s="${s.n}">
          <div class="h"><span class="nm">${AR(s.n)}. ${s.name}<small>${count(s.count, 'آية واحدة', 'آيتان', 'آيات', 'آية')}</small></span>
            <span class="st ${a === s.count ? 'full' : ''}">${st}</span>
            <button class="btn small" type="button" data-act="toggle">${a === s.count ? 'إلغاء' : 'كاملة'}</button>
            <button class="btn small" type="button" data-act="range" aria-expanded="${openSurah === s.n}">آيات</button></div>
          ${openSurah === s.n ? `<div class="rng">
            <label>من</label><select data-r="a">${Array.from({length: s.count}, (_, k) => `<option value="${k + 1}">${AR(k + 1)}</option>`).join('')}</select>
            <label>إلى</label><select data-r="b">${Array.from({length: s.count}, (_, k) => `<option value="${k + 1}" ${k + 1 === s.count ? 'selected' : ''}>${AR(k + 1)}</option>`).join('')}</select>
            <button class="btn small primary" type="button" data-act="mark">محفوظة</button>
            <button class="btn small" type="button" data-act="unmark">غير محفوظة</button></div>` : ''}
        </div>`;
      }).join('')}</div>
    </section>`;

  const rerender = () => { const y = scrollY; viewMap(pid); scrollTo(0, y); };
  $$('.seg button').forEach(b => b.onclick = () => { mapMode = b.dataset.m; rerender(); });
  $$('.cell').forEach(c => c.onclick = () => { mapSel = +c.dataset.pg; rerender(); $('#sheet').scrollIntoView({behavior: 'smooth', block: 'nearest'}); });
  $$('.jchip').forEach(b => b.onclick = () => {
    const j = +b.dataset.j, full = b.classList.contains('full');
    if (full && !confirm(`إلغاء تعليم الجزء ${AR(j)} كاملًا؟`)) return;
    Store.setMem(pid, Q.juzFirst[j], Q.juzLast[j], !full); rerender();
  });
  $$('.srow').forEach(r => {
    const s = Q.surahs[r.dataset.s - 1];
    r.querySelector('[data-act=toggle]').onclick = () => {
      const full = surState(s) === s.count;
      if (full && !confirm(`إلغاء تعليم سورة ${s.name}؟`)) return;
      Store.setMem(pid, s.start, s.start + s.count - 1, !full); rerender();
    };
    r.querySelector('[data-act=range]').onclick = () => { openSurah = openSurah === s.n ? 0 : s.n; rerender(); };
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
          <span class="row"><button class="btn small" type="button" data-act="t">${all ? 'إلغاء' : 'محفوظ'}</button>
          <a class="btn small primary" href="#/tasmee/${Q.sur[a]}/${Q.num[a]}/${Q.num[b]}">سمّع</a></span></li>`;
      }).join('')}</ul>`;
    $$('#sheet li').forEach(li => li.querySelector('[data-act=t]').onclick = () => {
      const a = +li.dataset.a, b = +li.dataset.b; let n = 0; for (let i = a; i <= b; i++) n += m[i];
      Store.setMem(pid, a, b, n !== b - a + 1); rerender();
    });
  }
}

/* ================= التسميع ================= */
function viewTasmee(pid, [s, a, b]){
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
    const box = $('#result'); box.hidden = false;
    box.innerHTML = `
      <div class="row between">
        <div><div class="score">${AR(c.pct)}٪</div><div class="small">نسبة الكلمات الصحيحة · حُفظت النتيجة</div></div>
        <div class="row"><button class="btn" id="again" type="button">أعد المقطع</button>
        ${nextA ? `<a class="btn primary" href="#/tasmee/${sur.n}/${nextA}/${Math.min(sur.count, nextA + (b - a))}">المقطع التالي</a>` : `<a class="btn primary" href="#/home">الرئيسية</a>`}</div>
      </div>
      <div class="stats">
        <div class="stat okc"><b>${AR(c.ok)}</b><span>صحيحة</span></div>
        <div class="stat wc"><b>${AR(c.wrong)}</b><span>خطأ</span></div>
        <div class="stat"><b>${AR(c.skip)}</b><span>متروكة</span></div>
        <div class="stat hc"><b>${AR(c.hint)}</b><span>بتلميح</span></div>
      </div>
      <p class="small">سمّعت ${count(c.words, 'كلمة واحدة', 'كلمتين', 'كلمات', 'كلمة')} و${count(c.letters, 'حرفًا واحدًا', 'حرفين', 'أحرف', 'حرفًا')}، وأتممت ${count(c.ayat, 'آية واحدة', 'آيتين', 'آيات', 'آية')}.${c.gap ? ` ولم تُحتسب ${count(c.gap, 'كلمة واحدة', 'كلمتان', 'كلمات', 'كلمة')} ${c.gap === 2 ? 'ضاعتا' : 'ضاعت'} لحظة فتح الميكروفون.` : ''}</p>
      ${newAyat.length && c.pct >= 90 ? `<div class="panel addmem"><b>أحسنت!</b> في هذا المقطع ${count(newAyat.length, 'آية واحدة', 'آيتان', 'آيات', 'آية')} لم تكن في محفوظك.
        <div style="margin-top:8px"><button class="btn primary" id="addMem" type="button">أضفها إلى محفوظي</button></div></div>` : ''}
      ${errs.length ? `<div class="small" style="margin-top:8px">مواضع تحتاج انتباهًا. إذا قرأت الكلمة صحيحة وأخطأ البرنامج، اضغط «قرأتها صحيحة»:</div>
        <ul class="errs">${errs.map(x => `<li class="${S.fixed.has(x.k) ? 'fixed' : ''}"><span><span class="q">${x.w.u}</span>
          <span class="small">آية ${AR(x.w.n)} · ${x.st.st === 'wrong' ? `سُمِع: «${esc(x.st.heard)}»` : 'لم تُقرأ'}</span></span>
          <button class="btn small" type="button" data-k="${x.k}">${S.fixed.has(x.k) ? 'تراجع' : 'قرأتها صحيحة'}</button></li>`).join('')}</ul>` : ''}`;
    $('#again').onclick = () => route();
    if ($('#addMem')) $('#addMem').onclick = () => { newAyat.forEach(i => Store.setMem(pid, i, i, true)); $('#addMem').closest('.addmem').innerHTML = '<b>أُضيفت إلى محفوظك.</b> بارك الله في حفظك.'; };
    $$('.errs button').forEach(btn => btn.onclick = () => {
      const k = +btn.dataset.k; S.fixed.has(k) ? S.fixed.delete(k) : S.fixed.add(k);
      saved = applySession(pid, A, B, W, saved); render(); showResult();
    });
    if (!showResult.scrolled){ box.scrollIntoView({behavior: 'smooth', block: 'start'}); showResult.scrolled = true; }
  }
  showResult.scrolled = false;
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
  if (!prev){ d.sess.push(rec); if (d.sess.length > 2000) d.sess.shift(); }
  Store.save();
  return {rec, misDelta, revPrev, reached};
}

/* ================= التقرير ================= */
let repDays = 7;
function viewReport(pid){
  const p = Store.profile(pid);
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
    <section class="panel chart"><h2>الكلمات المسمَّعة أسبوعيًّا</h2>${chart}</section>
    <section class="panel">
      <h2>مواضع تحتاج انتباهًا</h2>
      ${weak.length ? `<ul class="list">${weak.map(x => `<li><span><span class="q">${x.word}</span> <span class="small">${Q.label(x.i)} · أخطأت فيها ${count(x.c, 'مرة', 'مرتين', 'مرات', 'مرة')}</span></span>
        <a class="btn small primary" href="#/tasmee/${Q.sur[x.i]}/${Q.num[x.i]}/${Q.num[x.i]}">سمّع الآية</a></li>`).join('')}</ul>`
        : '<p class="small">لا مواضع ضعف حتى الآن. تظهر هنا الكلمات التي تتكرّر أخطاؤك فيها، وتختفي حين تقرؤها صحيحة.</p>'}
    </section>`;
  $$('.seg button').forEach(bt => bt.onclick = () => { repDays = +bt.dataset.d; viewReport(pid); });
}

/* ================= البدء ================= */
(async function boot(){
  try { await Q.load(); }
  catch(e){ app.innerHTML = '<p class="warn">تعذّر تحميل المصحف. تأكّد من الاتصال بالإنترنت ثم أعد فتح الصفحة.</p>'; return; }
  route();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
