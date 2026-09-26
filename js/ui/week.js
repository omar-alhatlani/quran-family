/* حلقة البيت · week.js — جزء من الواجهة (ملفّات js/ui تُحمَّل بالترتيب في index.html وتتشارك النطاق العام) */
/* ================= بطاقة مجلس الجمعة (يوم الجمعة فقط) ================= */
const isFriday = () => (Store.today() + 5) % 7 === (isSchool() ? 5 : 6);   // الخميس آخر أيام الدراسة
const majlisCard = () => Cloud.st.fid && isFriday() && seesOthers() ? `<a class="panel majlis-card" href="#/majlis">
  <span class="mc-ic">📺</span><span><b>اليوم ${isSchool() ? 'الخميس' : 'الجمعة'}: وقت ${T('majlis')}</b><span class="small">${isSchool() ? 'اجمع طلابك واعرض أسبوعهم على شاشة الفصل.' : 'اجمع أهلك واعرض أسبوعكم على التلفزيون.'}</span></span></a>` : '';

/* ================= الخزّان العائلي ================= */
function familyTank(){
  // الطالب في الحلقة المدرسية لا يقرأ ملفّات زملائه: الخزّان من الأنصبة المنشورة (أرقام بلا بيانات)
  if (isSchool() && !isOwner()){
    const w = Stats.weekStart(Store.today()), sh = Cloud.st.shares || {};
    const parts = Store.profiles().filter(p => p.cloud).map(p => {
      if (Cloud.mine(p)) return {p, ...Stats.contribution(p.id, true)};
      const s = sh[p.id], ok = s && s.w === w;
      return {p, pct: ok ? s.pct : 0, base: ok ? s.base : 0, bonus: ok ? s.bonus : 0, hasGoal: !!(s && s.has)};
    });
    const cap = parts.filter(x => x.hasGoal).length * 100, sum = parts.reduce((t, x) => t + x.pct, 0);
    return {parts, cap, sum, fill: cap ? sum / cap : 0, full: cap > 0 && sum >= cap};
  }
  const ps = Store.profiles().filter(p => p.cloud).map(p => ({p, local: Cloud.canRecite(p)}));
  return Stats.tank(ps);
}
// رسم الخزّان: طبقات بألوان الأفراد من الأسفل، بقدر نصيب كلٍّ من السعة
function tankSVG(t){
  const X = 14, Y = 14, Wd = 92, H = 172, fillH = Math.min(1, t.fill) * H;
  let y = Y + H, layers = '';
  if (t.cap) t.parts.filter(x => x.pct > 0).sort((a, b) => b.pct - a.pct).forEach(x => {
    const h = Math.min(y - (Y + H - fillH), x.pct / t.cap * H); if (h <= 0) return;
    y -= h;
    layers += `<rect x="${X}" y="${y.toFixed(1)}" width="${Wd}" height="${h.toFixed(1)}" fill="${x.p.color}" opacity=".88"/>`;
  });
  const top = Y + H - fillH;
  return `<svg class="tank-svg" viewBox="0 0 120 200" role="img" aria-label="امتلاء الخزّان ${Math.round(Math.min(1, t.fill) * 100)}٪">
    <defs><clipPath id="tclip"><rect x="${X}" y="${Y}" width="${Wd}" height="${H}" rx="16"/></clipPath></defs>
    <rect x="${X}" y="${Y}" width="${Wd}" height="${H}" rx="16" fill="var(--cell)"/>
    <g clip-path="url(#tclip)">${layers}
      ${fillH > 2 && fillH < H ? `<path d="M${X} ${top.toFixed(1)} q11.5 -5 23 0 t23 0 t23 0 t23 0" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2"/>` : ''}
    </g>
    <rect x="${X}" y="${Y}" width="${Wd}" height="${H}" rx="16" fill="none" stroke="var(--accent)" stroke-width="2.5"/>
    ${[0.25, 0.5, 0.75].map(k => `<line x1="${X + Wd - 10}" x2="${X + Wd}" y1="${(Y + H - k * H).toFixed(1)}" y2="${(Y + H - k * H).toFixed(1)}" stroke="var(--muted)" stroke-width="1.5"/>`).join('')}
  </svg>`;
}
function tankCard(){
  if (!Cloud.st.fid || !Cloud.st.family) return '';
  const t = familyTank(), fam = Cloud.st.family, owner = isOwner();
  const pctFill = Math.round(Math.min(1, t.fill) * 100);
  const left = Stats.weekStart(Store.today()) + 7 - Store.today();
  const reward = fam.reward ? `<p class="reward">🎁 مكافأة الأسبوع: <b>${esc(fam.reward)}</b></p>` : owner ? '' : '<p class="small">لم يحدّد وليّ الأمر مكافأة بعد.</p>';
  return `
    <section class="panel tank ${t.full ? 'full' : ''}">
      <div class="row between"><h2>خزّان الحلقة</h2><span class="small">${left <= 1 ? 'آخر يوم · الجمعة' : `باقي ${count(left, 'يوم', 'يومان', 'أيام', 'يومًا')}`}</span></div>
      <div class="tank-wrap">
        ${tankSVG(t)}
        <div class="tank-side">
          <div class="tank-pct">${t.cap ? AR(pctFill) + '٪' : '—'}</div>
          ${t.full ? `<p class="tank-full">امتلأ الخزّان! ${fam.reward ? 'استحققتم المكافأة 🎉' : 'بارك الله فيكم 🎉'}</p>`
            : t.cap ? `<p class="small" style="margin:0">يمتلئ حين يحقّق كل فرد هدفه هذا الأسبوع.</p>`
            : '<p class="small" style="margin:0">يبدأ بالامتلاء حين يضع أفراد الحلقة أهدافهم.</p>'}
          <ul class="tank-legend">${(seesOthers() ? t.parts : t.parts.filter(x => Cloud.mine(x.p))).map(x => `<li><i style="background:${x.p.color}"></i><span>${esc(x.p.name)}</span>
            <b>${x.hasGoal ? AR(Math.round(x.base)) + '٪' : '—'}${x.bonus ? ` <small>+${AR(x.bonus)}٪ تسميع لغيره</small>` : ''}</b></li>`).join('')}</ul>
        </div>
      </div>
      ${reward}
      ${owner ? `<form id="rewardForm" class="row" style="margin-top:8px">
        <label for="rw">مكافأة الأسبوع</label>
        <input type="text" id="rw" maxlength="80" value="${esc(fam.reward || '')}" placeholder="مثل: عشاء في المطعم" style="flex:1;min-width:10em">
        <button class="btn small" type="submit">${fam.reward ? 'تعديل' : 'حفظ'}</button></form>` : ''}
      <p class="small" style="margin:10px 0 0">نصيب كل فرد نسبة ما حقّقه من هدفه (إلى ١٥٠٪)، ومن سمّع لغيره زاد ٥٪ لكل تسميع.</p>
    </section>`;
}
function bindTank(){
  const f = $('#rewardForm'); if (!f) return;
  f.onsubmit = async e => {
    e.preventDefault();
    try { await Cloud.setReward($('#rw').value.trim()); } catch(x){ alert('تعذّر الحفظ. تأكّد من الاتصال.'); }
  };
}
// سطر مختصر في الرئيسية
function tankLine(){
  if (!Cloud.st.fid) return '';
  const t = familyTank(); if (!t.cap) return '';
  return `<a class="tankline ${t.full ? 'full' : ''}" href="#/"><span>خزّان الحلقة</span><span class="qbar"><i style="width:${Math.min(100, t.fill * 100)}%"></i></span><b>${AR(Math.round(Math.min(1, t.fill) * 100))}٪</b></a>`;
}

/* ================= مجلس الجمعة (شاشة عرض للتلفزيون) ================= */
// آية الأسبوع للتدبّر: ٥٢ مقطعًا (سورة، من، إلى)، روجعت أرقامها على نصّ المصحف، وتدور أسبوعيًّا
const WEEK_AYAT = [[17,9,9],[54,17,17],[38,29,29],[20,114,114],[66,6,6],[25,74,74],[14,40,41],[31,13,13],[13,28,28],[73,4,4],
  [2,152,152],[94,5,6],[3,103,103],[49,10,10],[17,23,24],[59,21,21],[10,57,57],[16,97,97],[39,9,9],[58,11,11],[2,286,286],
  [3,139,139],[20,25,28],[18,10,10],[35,29,30],[29,45,45],[8,2,2],[65,2,3],[33,41,42],[57,16,16],[2,185,185],[47,24,24],
  [41,33,33],[3,191,191],[46,15,15],[4,82,82],[103,1,3],[2,201,201],[112,1,4],[39,53,53],[7,204,204],[15,9,9],[36,12,12],
  [42,52,52],[64,16,16],[62,2,2],[11,114,114],[24,35,35],[76,8,9],[93,11,11],[28,77,77],[50,18,18]];
let mjWeek = 0, mjIdx = 0, mjPlay = true;

// ملخّص أسبوع لفرد من بياناته المزامَنة (جلسات، حفظ جديد، تسميع لغيره)
function weekSummary(id, w){
  const d = Store.data(id), inW = x => x >= w && x < w + 7, days = new Set();
  let rp = 0, np = 0, na = 0, ss = 0, words = 0, letters = 0, lis = 0;
  d.sess.forEach(s => { const sd = Store.dayOf(s.t); if (!inW(sd)) return; ss++; words += s.words || 0; letters += s.letters || 0; if (s.kind === 'review') rp += s.pages || 0; days.add(sd); });
  Object.entries(d.nl || {}).forEach(([k, v]) => { if (inW(+k)){ np += v[0]; na += v[1]; } });
  Object.entries(d.lis || {}).forEach(([k, v]) => { if (inW(+k)){ lis += v[0]; days.add(+k); } });
  const g = d.goal, m = Stats.memorized(id), parts = [];
  const revT = g && g.rc ? Math.max(1, Math.round(m.pages / g.rc * 2) / 2) : 0;
  const newD = g && g.nu === 'ayah' ? na : np;
  if (g && g.n) parts.push(Math.min(1.5, newD / g.n));
  if (revT) parts.push(Math.min(1.5, rp / revT));
  const base = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length * 100 : 0;
  const bonus = Math.min(Stats.TANK.listenCap, Stats.TANK.perListen * lis);
  return {rp, np, na, newD, ss, words, letters, lis, days: days.size, hasGoal: parts.length > 0, base: Math.min(150, base), bonus,
          pct: Math.min(150, base) + bonus, newT: g ? g.n : 0, unit: g ? g.nu : 'page', revT,
          met: parts.length > 0 && parts.every(x => x >= 1)};
}

function viewMajlis(){
  if (!Cloud.st.fid || !Cloud.st.family){ location.replace('#/'); return; }
  document.body.classList.add('stage');
  app.innerHTML = '<div class="stage-wrap"><p class="stage-load">جارٍ تحضير المجلس…</p></div>';
  const members = Store.profiles().filter(p => p.cloud);
  let timer = null, keyH = null, confT = null;
  cleanup = () => { clearInterval(timer); clearTimeout(confT); document.removeEventListener('keydown', keyH); document.body.classList.remove('stage'); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  Promise.all(members.map(p => Cloud.loadSessions(p.id).catch(() => {}))).then(() => { if (location.hash.startsWith('#/majlis')) build(); });

  function build(){
    const fam = Cloud.st.family, today = Store.today();
    const w = Stats.weekStart(today) + mjWeek * 7;
    const fmt = d => new Date(d * 864e5).toLocaleDateString('ar-SA-u-ca-gregory', {day: 'numeric', month: 'long', timeZone: 'UTC'});
    const hij = d => new Date(d * 864e5).toLocaleDateString('ar-SA-u-ca-islamic-umalqura', {day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'});
    const S = members.map(p => ({p, ...weekSummary(p.id, w)}));
    const withGoal = S.filter(x => x.hasGoal), cap = withGoal.length * 100, sum = S.reduce((t, x) => t + x.pct, 0);
    const tk = {parts: S.map(x => ({p: x.p, pct: x.pct, base: x.base, bonus: x.bonus, hasGoal: x.hasGoal})), cap, sum, fill: cap ? sum / cap : 0, full: cap > 0 && sum >= cap};
    // نجم الأسبوع: الانتظام (أيام التسميع) ثم نسبة الهدف ثم عدد الجلسات
    const star = [...S].filter(x => x.days > 0).sort((a, b) => (b.days - a.days) || (b.pct - a.pct) || (b.ss - a.ss))[0];
    const tot = S.reduce((t, x) => ({rp: t.rp + x.rp, np: t.np + x.np, words: t.words + x.words, letters: t.letters + x.letters, ss: t.ss + x.ss, lis: t.lis + x.lis}), {rp: 0, np: 0, words: 0, letters: 0, ss: 0, lis: 0});
    const [as, aa, ab] = WEEK_AYAT[((Math.floor(w / 7) % WEEK_AYAT.length) + WEEK_AYAT.length) % WEEK_AYAT.length];
    const A = Q.idx(as, aa), B = Q.idx(as, ab);
    let ayahHTML = '';
    for (let i = A; i <= B; i++) ayahHTML += Q.uth[i].split('\t').join(' ') + ` <span class="num">﴿${AR(Q.num[i])}﴾</span> `;
    // حجم خطّ الآية بحسب طولها، لتسع الشاشة
    let aw = 0; for (let i = A; i <= B; i++) aw += Q.words[i];
    const ayahSize = aw <= 14 ? 'clamp(30px,4.6vw,64px)' : aw <= 30 ? 'clamp(26px,3.6vw,52px)' : 'clamp(20px,2.5vw,38px)';
    const big = (v, lbl) => `<div class="mj-stat"><b>${v}</b><span>${lbl}</span></div>`;

    const slides = [
      // ١) الافتتاح
      `<div class="mj-cover">
        <div class="mj-basmala">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>
        <h1>${T('majlis')}</h1>
        <p class="mj-fam">حلقة ${esc(fam.name)}</p>
        <p class="mj-date">${mjWeek ? 'الأسبوع الماضي' : 'هذا الأسبوع'}: ${fmt(w)} – ${fmt(w + 6)} · ${hij(w + 6)}</p>
      </div>`,
      // ٢) الخزّان
      `<h2 class="mj-h">خزّان الحلقة</h2>
       <div class="mj-tank">${tankSVG(tk)}
         <div><div class="mj-big ${tk.full ? 'gold' : ''}">${cap ? AR(Math.round(Math.min(1, tk.fill) * 100)) + '٪' : '—'}</div>
           ${tk.full ? `<p class="mj-gold">امتلأ الخزّان! ${fam.reward ? 'استحققتم: ' + esc(fam.reward) : 'بارك الله فيكم'} 🎉</p>`
             : fam.reward ? `<p class="mj-sub">🎁 المكافأة: ${esc(fam.reward)}</p>` : ''}
           <ul class="tank-legend mj-legend">${S.map(x => `<li><i style="background:${x.p.color}"></i><span>${esc(x.p.name)}</span><b>${x.hasGoal ? AR(Math.round(x.base)) + '٪' : '—'}${x.bonus ? ` <small>+${AR(x.bonus)}٪</small>` : ''}</b></li>`).join('')}</ul>
         </div></div>`,
      // ٣) أهداف الجميع
      `<h2 class="mj-h">أهداف الأسبوع</h2>
       <div class="mj-cards">${S.map(x => `<div class="mj-card ${x.met ? 'met' : ''}" style="--c:${x.p.color}">
         <div class="mj-card-h">${avatar(x.p)}<b>${esc(x.p.name)}</b>${x.met ? '<span class="mj-ok">✓ حقّق هدفه</span>' : ''}</div>
         ${!x.hasGoal ? '<p class="mj-sub">لم يضع هدفًا بعد</p>' : `
           ${x.newT ? `<div class="gl"><span>حفظ جديد</span><b>${x.unit === 'ayah' ? AR(x.na) : Q.dec(x.np)} من ${unitTxt(x.newT, x.unit)}</b></div><div class="qbar"><i style="width:${Math.min(100, x.newD / x.newT * 100)}%"></i></div>` : ''}
           ${x.revT ? `<div class="gl"><span>مراجعة</span><b>${Q.dec(x.rp)} من ${unitTxt(x.revT, 'page')}</b></div><div class="qbar"><i style="width:${Math.min(100, x.rp / x.revT * 100)}%"></i></div>` : ''}`}
         <p class="mj-sub">${count(x.days, 'يوم واحد', 'يومان', 'أيام', 'يومًا')} من ٧${x.lis ? ` · سمّع لغيره ${count(x.lis, 'مرة', 'مرتين', 'مرات', 'مرة')}` : ''}</p>
       </div>`).join('')}</div>`,
      // ٤) نجم الأسبوع
      star ? `<div class="mj-star">
        <div class="mj-star-icon">⭐</div>
        <p class="mj-sub">نجم الأسبوع</p>
        <h1 style="color:${star.p.color}">${esc(star.p.name)}</h1>
        <p class="mj-reason">سمّع في ${count(star.days, 'يوم واحد', 'يومين', 'أيام', 'يومًا')} من سبعة${star.hasGoal ? ` · وحقّق ${AR(Math.round(star.base))}٪ من هدفه` : ''}${star.lis ? ` · وسمّع لأهله ${count(star.lis, 'مرة', 'مرتين', 'مرات', 'مرة')}` : ''}</p>
        <p class="mj-sub">النجم بالانتظام لا بالكثرة، فالأحبّ إلى الله أدومه وإن قلّ.</p>
      </div>` : `<div class="mj-star"><div class="mj-star-icon">⭐</div><p class="mj-reason">يظهر نجم الأسبوع حين يسمّع أفراد الحلقة.</p></div>`,
      // ختمات الأسبوع (إن وُجدت)
      ...(() => { const done = []; members.forEach(p => { const c = Store.data(p.id).certs || {}; Object.keys(c).forEach(j => { if (c[j] >= w && c[j] < w + 7) done.push([p, +j]); }); });
        return done.length ? [`<div class="mj-star"><div class="mj-star-icon">🏅</div><p class="mj-sub">ختمات الأسبوع</p>
          ${done.map(([p, j]) => `<p class="mj-reason"><b style="color:${p.color}">${esc(p.name)}</b>: إتمام حفظ ${juzTitle(j)}</p>`).join('')}
          <p class="mj-sub">بارك الله في حفظهم، وجعله نورًا لهم.</p></div>`] : []; })(),
      // ٥) حصاد الأسبوع
      `<h2 class="mj-h">حصاد الأسبوع</h2>
       <div class="mj-stats">
         ${big(Q.dec(tot.rp), 'وجهًا راجعتموها')}${big(Q.dec(tot.np), 'وجهًا حفظتموها جديدًا')}${big(AR(tot.ss), 'جلسة تسميع')}
         ${big(AR(tot.lis), 'مرة سمّع بعضكم لبعض')}${big(AR(tot.words), 'كلمة')}${big(AR(tot.letters), 'حرفًا')}
       </div>
       <p class="mj-sub" style="text-align:center">والحرف بعشر أمثالها، والأجر عند الله.</p>`,
      // ٦) آية الأسبوع
      `<h2 class="mj-h">آية الأسبوع للتدبّر</h2>
       <div class="mj-ayah" style="font-size:${ayahSize}">${ayahHTML}</div>
       <p class="mj-ref">سورة ${Q.surahs[as - 1].name}${aa === ab ? ` · الآية ${AR(aa)}` : ` · الآيات ${AR(aa)}–${AR(ab)}`}</p>
       <p class="mj-q">ماذا تعلّمنا هذه الآية؟ وكيف نعمل بها هذا الأسبوع؟</p>`,
      // ٧) الختام
      `<div class="mj-cover">
        <h2 class="mj-h">الأسبوع القادم</h2>
        <p class="mj-reason">${fam.reward ? `🎁 المكافأة: ${esc(fam.reward)}` : 'ليضع كل فرد هدفه، ولنملأ الخزّان معًا.'}</p>
        <p class="mj-dua">اللهمّ اجعل القرآن ربيع قلوبنا، ونور صدورنا، وجلاء أحزاننا، وذهاب همومنا.</p>
      </div>`
    ];
    if (mjIdx >= slides.length) mjIdx = 0;

    app.innerHTML = `
      <div class="stage-wrap">
        <div class="stage-bar">
          <div class="seg" role="group" aria-label="الأسبوع">
            <button type="button" data-w="0" aria-pressed="${mjWeek === 0}">هذا الأسبوع</button>
            <button type="button" data-w="-1" aria-pressed="${mjWeek === -1}">الأسبوع الماضي</button>
          </div>
          <span class="stage-sp"></span>
          <button class="btn small" id="mjFs" type="button">ملء الشاشة</button>
          <a class="btn small" href="#/">خروج</a>
        </div>
        <div class="slide" id="slide" aria-live="polite"></div>
        <canvas id="confetti" aria-hidden="true"></canvas>
        <div class="stage-nav">
          <button class="btn" id="mjPrev" type="button" aria-label="السابق">›</button>
          <div class="dots">${slides.map((_, k) => `<button type="button" data-i="${k}" aria-label="الشريحة ${k + 1}"></button>`).join('')}</div>
          <button class="btn" id="mjNext" type="button" aria-label="التالي">‹</button>
          <button class="btn" id="mjPlay" type="button">${mjPlay ? 'إيقاف' : 'تشغيل'}</button>
        </div>
      </div>`;
    const show = i => {
      mjIdx = (i + slides.length) % slides.length;
      const el = $('#slide'); el.innerHTML = slides[mjIdx]; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
      $$('.dots button').forEach((b, k) => b.setAttribute('aria-current', k === mjIdx ? 'true' : 'false'));
      if ((mjIdx === 1 && tk.full) || (mjIdx === 3 && star)) confetti();
    };
    const restart = () => { clearInterval(timer); if (mjPlay) timer = setInterval(() => show(mjIdx + 1), 15000); };
    $('#mjNext').onclick = () => { show(mjIdx + 1); restart(); };
    $('#mjPrev').onclick = () => { show(mjIdx - 1); restart(); };
    $('#mjPlay').onclick = () => { mjPlay = !mjPlay; $('#mjPlay').textContent = mjPlay ? 'إيقاف' : 'تشغيل'; restart(); };
    $$('.dots button').forEach(b => b.onclick = () => { show(+b.dataset.i); restart(); });
    $$('.stage-bar [data-w]').forEach(b => b.onclick = () => { mjWeek = +b.dataset.w; mjIdx = 0; build(); });
    $('#mjFs').onclick = () => { const r = document.documentElement; (document.fullscreenElement ? document.exitFullscreen() : r.requestFullscreen ? r.requestFullscreen() : Promise.reject()).catch(() => {}); };
    document.removeEventListener('keydown', keyH);
    keyH = e => {
      if (e.key === 'ArrowLeft' || e.key === ' ' || e.key === 'PageDown'){ e.preventDefault(); show(mjIdx + 1); restart(); }
      else if (e.key === 'ArrowRight' || e.key === 'PageUp'){ e.preventDefault(); show(mjIdx - 1); restart(); }
    };
    document.addEventListener('keydown', keyH);
    show(mjIdx); restart();
  }

  // احتفال خفيف (قصاصات ملوّنة) — لا يعمل مع تقليل الحركة
  function confetti(){
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = $('#confetti'); if (!cv) return;
    const ctx = cv.getContext('2d'), W = cv.width = innerWidth, H = cv.height = innerHeight;
    const cols = members.map(p => p.color).concat(['#d8b25e', '#46b8a3']);
    const ps = Array.from({length: 140}, () => ({x: Math.random() * W, y: -20 - Math.random() * H * 0.5, r: 4 + Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)], vy: 2 + Math.random() * 3, vx: -1 + Math.random() * 2, a: Math.random() * 6}));
    const t0 = performance.now();
    const step = t => {
      ctx.clearRect(0, 0, W, H);
      ps.forEach(p => { p.y += p.vy; p.x += p.vx; p.a += 0.1; ctx.fillStyle = p.c; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); });
      if (t - t0 < 4500 && document.body.contains(cv)) requestAnimationFrame(step); else ctx.clearRect(0, 0, W, H);
    };
    requestAnimationFrame(step);
  }
}

