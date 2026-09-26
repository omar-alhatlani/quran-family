/* حلقة البيت · hifz.js — جزء من الواجهة (ملفّات js/ui تُحمَّل بالترتيب في index.html وتتشارك النطاق العام) */
/* ================= حفظ اليوم ================= */
const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="3" y="14" width="4" height="7" rx="1.5"/><rect x="17" y="14" width="4" height="7" rx="1.5"/></svg>';
function hifzCard(pid, mode){
  const hz = Stats.hifz(pid, mode === 'self');
  if (!hz) return '';
  const hs = Stats.hifzStatus(pid, hz), unit = hz.unit;
  if (!hs.items.length) return `<section class="panel today hifz"><h2>حفظ اليوم</h2><p class="small">لا مقطع جديد في حدود هدفك؛ ما شاء الله، أتممت ما حدّدته. عدّل هدفك الكبير لتكمل.</p></section>`;
  const amt = unit === 'ayah' ? count(Math.round(hs.total), 'آية واحدة', 'آيتان', 'آيات', 'آية') : unitTxt(hs.total, 'page', true);
  return `
    <section class="panel today hifz ${hs.complete ? 'met' : ''}">
      <div class="row between"><h2>حفظ اليوم</h2><span class="chip">${amt}</span></div>
      <ol class="wlist">${hs.items.map(x => `<li class="${x.done ? 'done' : ''}">
        <span>${itemLabel(x.a, x.b)}</span><span class="wk">${x.done ? '✓' : ''}</span>
        ${!x.done ? `<div class="hz-acts">
          <a class="btn small" href="#/play/${Q.sur[x.a]}/${Q.num[x.a]}/${Q.num[x.b]}">${ICON_PLAY} استمع</a>
          ${mode === 'self' ? `<a class="btn small primary" href="${tasmeeHref(x.a, x.b)}">${ICON.mic} سمّع للبرنامج</a>
            ${Store.profile(pid).cloud ? `<a class="btn small" href="#/ask/${Q.sur[x.a]}/${Q.num[x.a]}/${Q.num[x.b]}">${ICON_EAR} اطلب تسميعًا</a>` : ''}`
          : mode === 'listen' ? `<a class="btn small primary" href="${listenHref(pid, x.a, x.b)}">${ICON_EAR} سمّع له</a>` : ''}
        </div>` : ''}</li>`).join('')}</ol>
      ${hs.complete ? '<p class="metmsg">أتممت حفظ اليوم، زادك الله حفظًا.</p>'
        : '<p class="small" style="margin:6px 0 0">استمع وكرّر حتى تحفظ، ثم سمّع للبرنامج أو لأحد أهلك؛ فإن أتقنته (٩٠٪ فأكثر) أُضيف إلى محفوظك.</p>'}
    </section>`;
}
// لا يُضاف حفظ جديد إلا بتسميع: للبرنامج (٩٠٪ فأكثر) أو لأحد الأهل عبر «سمّعني»
function bindHifz(){}

/* مشغّل التلاوة للحفظ: كل آية تُكرَّر عددًا يختاره الحافظ، والآية الحالية مظلَّلة */
const RECITERS = [['Husary_128kbps', 'الحصري'], ['Husary_Muallim_128kbps', 'الحصري (المصحف المعلّم)'], ['Minshawy_Murattal_128kbps', 'المنشاوي'], ['Alafasy_128kbps', 'العفاسي']];
const pad3 = n => String(n).padStart(3, '0');
function viewPlay(pid, [s, a, b]){
  const sur = Q.surahs[Math.min(Math.max(s || 67, 1), 114) - 1];
  a = Math.min(Math.max(a || 1, 1), sur.count); b = Math.min(Math.max(b || a, a), sur.count);
  const A = sur.start + a - 1, B = sur.start + b - 1;
  viewPlayList(pid, [[A, B]], 'استمع: ' + sur.name, 'hifz');
}
// ورد المراجعة كاملًا (قد يمتدّ على سور عدّة)
function viewPlayWird(pid){
  const w = Stats.wird(pid, false);
  if (!w || !w.items.length) return location.replace('#/home');
  viewPlayList(pid, w.items, 'استمع للورد', 'rev');
}
/* مشغّل التلاوة: مقاطع متتالية، كل آية تُكرَّر عددًا يُختار (للحفظ ٣ افتراضًا، وللمراجعة مرة)، والآية الحالية مظلَّلة */
function viewPlayList(pid, ranges, title, kind){
  setTop(title, '#/home');
  const repKey = kind === 'rev' ? 'repeatRev' : 'repeat';
  let rec = Store.pref('reciter', RECITERS[0][0]), rep = Store.pref(repKey, kind === 'rev' ? 1 : 3);
  const withBas = A => Q.num[A] === 1 && Q.sur[A] !== 1 && Q.sur[A] !== 9;
  const canR = Cloud.canRecite(Store.profile(pid));
  const recHref = kind === 'rev' ? (() => { const w = Stats.wird(pid, false), ws = w && Stats.wirdStatus(pid, w); return ws && ws.next ? tasmeeHref(ws.next.a, ws.next.b) : ''; })()
    : tasmeeHref(ranges[0][0], ranges[0][1]);
  app.innerHTML = `
    <section class="panel">
      <h2>${ranges.length === 1 ? itemLabel(ranges[0][0], ranges[0][1]) : `ورد المراجعة: ${count(ranges.length, 'مقطع واحد', 'مقطعان', 'مقاطع', 'مقطعًا')}`}</h2>
      <div class="row" style="margin-top:10px">
        <label for="pr">القارئ</label><select id="pr">${RECITERS.map(([k, n]) => `<option value="${k}" ${k === rec ? 'selected' : ''}>${n}</option>`).join('')}</select>
        <label for="pp">تكرار كل آية</label><select id="pp">${[1, 3, 5, 10].map(n => `<option value="${n}" ${n === rep ? 'selected' : ''}>${count(n, 'مرة واحدة', 'مرتين', 'مرات', 'مرة')}</option>`).join('')}</select>
      </div>
    </section>
    ${ranges.map(([A, B]) => `<section class="mushaf">
      <div class="sura-head">سُورَةُ ${Q.surahOf(A).name}</div>
      ${withBas(A) ? '<div class="basmala">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>' : ''}
      <div class="text play-text">${Array.from({length: B - A + 1}, (_, k) => `<span class="pa" data-i="${A + k}">${Q.uth[A + k].split('\t').join(' ')} <span class="num">﴿${AR(Q.num[A + k])}﴾</span></span>`).join(' ')}</div>
    </section>`).join('')}
    <div class="bar"><div class="wrap">
      <button class="mic" id="pl" type="button" aria-label="تشغيل">${ICON_PLAY}</button>
      <div class="prog"><div class="t" id="pt">اضغط للاستماع</div><div class="track"><i id="pi"></i></div></div>
      ${canR && recHref ? `<a class="btn" href="${recHref}">${kind === 'rev' ? 'سمّع الورد' : 'سمّع حفظك'}</a>` : ''}
    </div></div>`;
  document.body.classList.add('has-bar');
  const audio = new Audio(); audio.preload = 'auto';
  // قائمة التشغيل: لكل مقطع [البسملة]، ثم كل آية مكرّرةً
  let list = [], pos = 0, playing = false;
  const build = () => {
    list = [];
    ranges.forEach(([A, B]) => {
      if (withBas(A)) list.push({i: -1, url: `https://everyayah.com/data/${rec}/001001.mp3`});
      for (let i = A; i <= B; i++) for (let k = 0; k < rep; k++) list.push({i, k, url: `https://everyayah.com/data/${rec}/${pad3(Q.sur[i])}${pad3(Q.num[i])}.mp3`});
    });
  };
  const mark = () => {
    const cur = list[pos];
    $$('.pa').forEach(el => el.classList.toggle('on', cur && +el.dataset.i === cur.i));
    const on = $('.pa.on'); if (on){ const r = on.getBoundingClientRect(); if (r.bottom > innerHeight - 130 || r.top < 60) on.scrollIntoView({block: 'center', behavior: 'smooth'}); }
    $('#pi').style.width = (list.length ? pos / list.length * 100 : 0) + '%';
    $('#pt').textContent = !cur ? 'انتهى' : cur.i < 0 ? 'البسملة' : `${Q.surahOf(cur.i).name} · الآية ${AR(Q.num[cur.i])}${rep > 1 ? ` · التكرار ${AR(cur.k + 1)} من ${AR(rep)}` : ''}`;
    $('#pl').classList.toggle('on', playing);
  };
  const playAt = p => {
    pos = p; if (pos >= list.length){ playing = false; pos = 0; mark(); $('#pt').textContent = kind === 'rev' ? 'انتهى الورد. سمّعه الآن وهو حاضر في ذهنك.' : 'انتهى. أعد الاستماع أو سمّع حفظك.'; return; }
    audio.src = list[pos].url; audio.play().then(() => { playing = true; mark(); }).catch(() => { playing = false; mark(); $('#pt').textContent = 'تعذّر التشغيل. تأكّد من الاتصال.'; });
  };
  audio.onended = () => playAt(pos + 1);
  build();
  $('#pl').onclick = () => { if (playing){ audio.pause(); playing = false; mark(); } else if (audio.src && audio.currentTime > 0 && !audio.ended){ audio.play(); playing = true; mark(); } else playAt(pos); };
  $('#pr').onchange = e => { rec = e.target.value; Store.setPref('reciter', rec); const was = playing; audio.pause(); build(); pos = 0; if (was) playAt(0); else mark(); };
  $('#pp').onchange = e => { rep = +e.target.value; Store.setPref(repKey, rep); const cur = list[pos]; build(); pos = Math.max(0, list.findIndex(x => cur && x.i === cur.i)); mark(); };
  $$('.pa').forEach(el => el.onclick = () => { const p = list.findIndex(x => x.i === +el.dataset.i); if (p >= 0) playAt(p); });
  mark();
  cleanup = () => { audio.pause(); audio.src = ''; };
}

