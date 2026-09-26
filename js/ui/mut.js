/* حلقة البيت · mut.js — جزء من الواجهة (ملفّات js/ui تُحمَّل بالترتيب في index.html وتتشارك النطاق العام) */
/* ================= المتشابهات ================= */
let MUT = null;   // {فهرس الآية: [[فهرس المتشابه، الدرجة]]} من tools/build-mutashabihat.js
const loadMut = () => MUT ? Promise.resolve(MUT) : fetch('data/mutashabihat.json?v=1').then(r => r.json()).then(j => (MUT = j));
const ICON_TWIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="8" height="16" rx="2"/><rect x="13" y="4" width="8" height="16" rx="2"/><path d="M6 9h2M16 9h2M6 13h2M16 13h2"/></svg>';
const nwords = i => Q.sim[i].split('\t').join(' ').split(/\s+/).map(Engine.norm).filter(Boolean);

// الكلمات المختلفة بين آيتين (بأطول تتابع مشترك)؛ تُرجع مواضع المختلف في كلٍّ منهما
function wordDiff(a, b){
  const n = a.length, m = b.length, L = Array.from({length: n + 1}, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const da = new Set(a.map((_, k) => k)), db = new Set(b.map((_, k) => k));
  let i = 0, j = 0;
  while (i < n && j < m){ if (a[i] === b[j]){ da.delete(i); db.delete(j); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
  return [da, db];
}
// نصّ آية بالرسم العثماني مع تظليل كلمات بعينها (الوحدات العثمانية تقابل الإملائية)
function ayahMarked(i, diffSet){
  const units = Q.uth[i].split('\t'), sims = Q.sim[i].split('\t');
  let k = 0;
  return units.map((u, x) => { const n = sims[x].split(' ').length; let hit = false; for (let t = 0; t < n; t++) if (diffSet.has(k + t)) hit = true; k += n; return hit ? `<mark>${u}</mark>` : u; }).join(' ');
}

// لكل خطأ في التسميع: هل الكلمة المسموعة من آية متشابهة؟
function mutHint(i, heard){
  if (!MUT || !MUT[i] || !heard) return null;
  const h = Engine.norm(heard), own = new Set(nwords(i));
  if (own.has(h)) return null;
  const hit = MUT[i].find(([j]) => nwords(j).includes(h));
  return hit ? hit[0] : null;
}

/* تمرين المتشابهات: آية من محفوظك، في أي سورة هي؟ ثم مقارنتها بشبيهتها */
function viewMut(pid){
  const p = Store.profile(pid);
  if (!Cloud.canRecite(p)) return location.replace('#/home');
  setTop('المتشابهات', '#/home');
  app.innerHTML = '<p class="loading">جارٍ تحضير الأسئلة…</p>';
  loadMut().then(() => {
    const mem = Store.mem(pid), pool = [];
    Object.entries(MUT).forEach(([i, L]) => { i = +i; if (!mem[i]) return; L.forEach(([j]) => { if (Q.sur[j] !== Q.sur[i]) pool.push([i, j, mem[j] ? 2 : 1]); }); });
    if (!pool.length){
      app.innerHTML = `<section class="panel"><h2>لا متشابهات في محفوظك بعد</h2>
        <p class="small">تظهر هنا الآيات التي تشبه آياتٍ في سور أخرى. كلما زاد محفوظك ظهرت، وأكثرها في السور الطوال.</p>
        <a class="btn" href="#/home">رجوع</a></section>`;
      return;
    }
    // الأزواج المحفوظة كلا طرفيها أولًا، ثم عشوائيًّا
    pool.sort((a, b) => (b[2] - a[2]) || (Math.random() - 0.5));
    const qs = pool.slice(0, Math.min(10, pool.length)).sort(() => Math.random() - 0.5);
    const memSurahs = [...new Set(Array.from(mem.keys ? mem.keys() : []).filter(i => mem[i]).map(i => Q.sur[i]))];
    let k = 0, score = 0; const missed = [];
    const ask = () => {
      if (k >= qs.length){
        app.innerHTML = `<section class="panel today ${score === qs.length ? 'met' : ''}">
          <h2>النتيجة: ${AR(score)} من ${AR(qs.length)}</h2>
          <p class="small">${score === qs.length ? 'ما شاء الله، ميّزت المتشابهات كلها.' : 'راجع هذه المواضع، فهي أكثر ما يلتبس على الحفّاظ.'}</p>
          ${missed.length ? `<ul class="list">${missed.map(([i, j]) => `<li><span>${Q.label(i)} ↔ ${Q.label(j)}</span></li>`).join('')}</ul>` : ''}
          <div class="row" style="margin-top:12px"><button class="btn primary" id="mAgain" type="button">أسئلة جديدة</button><a class="btn" href="#/home">الرئيسية</a></div>
        </section>`;
        $('#mAgain').onclick = () => viewMut(pid);
        return;
      }
      const [i, j] = qs[k];
      // الخيارات: سورة الآية، وسورة شبيهتها، وسورتان أخريان
      const opts = new Set([Q.sur[i], Q.sur[j]]);
      (MUT[i] || []).forEach(([x]) => { if (opts.size < 4) opts.add(Q.sur[x]); });
      // سور المحفوظ أولًا، فإن قلّت فسور المصحف (قريبة الطول من سورة الآية)
      const extra = memSurahs.length >= 4 ? memSurahs : Q.surahs.map(s => s.n).filter(s => Math.abs(s - Q.sur[i]) <= 20);
      let guard = 0; while (opts.size < 4 && guard++ < 50) opts.add(extra[Math.floor(Math.random() * extra.length)]);
      const choices = [...opts].sort(() => Math.random() - 0.5);
      app.innerHTML = `
        <p class="small" style="margin-top:14px">السؤال ${AR(k + 1)} من ${AR(qs.length)} · الصحيح ${AR(score)}</p>
        <section class="mushaf"><div class="text mut-q">${Q.uth[i].split('\t').join(' ')}</div></section>
        <h3>في أي سورة هذه الآية؟</h3>
        <div class="mut-opts">${choices.map(s => `<button class="btn" type="button" data-s="${s}">سورة ${Q.surahs[s - 1].name}</button>`).join('')}</div>
        <div id="mAns"></div>`;
      $$('.mut-opts .btn').forEach(b => b.onclick = () => {
        const ok = +b.dataset.s === Q.sur[i];
        if (ok) score++; else missed.push([i, j]);
        $$('.mut-opts .btn').forEach(x => { x.disabled = true; if (+x.dataset.s === Q.sur[i]) x.classList.add('right'); else if (x === b) x.classList.add('wrongc'); });
        const [da, db] = wordDiff(nwords(i), nwords(j));
        $('#mAns').innerHTML = `
          <p class="${ok ? 'metmsg' : 'mut-no'}">${ok ? 'أحسنت!' : 'ليست هذه.'} الآية في <b>${Q.label(i)}</b>، وتشبهها:</p>
          <div class="mut-cmp">
            <div><span class="small">${Q.label(i)}</span><p class="q">${ayahMarked(i, da)}</p></div>
            <div><span class="small">${Q.label(j)}</span><p class="q">${ayahMarked(j, db)}</p></div>
          </div>
          <p class="small">المظلَّل هو موضع الاختلاف بين الآيتين.</p>
          <button class="btn primary" id="mNext" type="button">${k + 1 < qs.length ? 'التالي' : 'النتيجة'}</button>`;
        $('#mNext').onclick = () => { k++; ask(); scrollTo(0, 0); };
      });
    };
    ask();
  }).catch(() => { app.innerHTML = '<p class="warn">تعذّر تحميل المتشابهات. تأكّد من الاتصال.</p>'; });
}

