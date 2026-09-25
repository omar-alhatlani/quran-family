/* محرّك التسميع: التعرّف على الكلام + مطابقة ما سُمع بالكلمات المتوقّعة.
   منقول من صفحة التجربة (tajriba.html) بعد اختباره: ١٠٠٪ على آيفون وهونر. */
const Engine = (() => {
  /* ---------- التطبيع والمطابقة ---------- */
  function norm(w){
    return w.replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
      .replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
      .replace(/[ؤئ]/g, 'ء')
      .replace(/[^ء-ي]/g, '');
  }
  const tokenize = t => t.split(/\s+/).map(norm).filter(Boolean);
  function lev(a, b){
    let prev = Array.from({length: b.length + 1}, (_, j) => j);
    for (let i = 1; i <= a.length; i++){
      const cur = [i];
      for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j-1] + 1, prev[j-1] + (a[i-1] === b[j-1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }
  function sim(a, b){
    if (!a || !b) return false;
    if (a === b) return true;
    const d = lev(a, b), L = Math.max(a.length, b.length);
    if (L <= 2) return false;
    return L <= 4 ? d <= 1 : d / L <= 0.25;
  }

  /* ---------- الحالة ---------- */
  let W = [];   // الكلمات المتوقّعة: {s: مطبَّع، first: أول كلمة في الآية}
  let S = null; // حالة الجلسة
  let opt = {firstWord: false, mode: 'continuous'};
  let cb = {update(){}, done(){}, warn(){}};

  function fresh(){
    return {marks: [], live: {}, start: 0, pos: 0, hinted: new Set(), fixed: new Set(),
            running: false, done: false, tokens: [], raw: '', lastMove: Date.now(), lost: 0};
  }

  /* المحاذاة: تقابل ما سُمع بالكلمات المتوقّعة ابتداءً من start */
  function align(tokens, start, final){
    const res = {}; let p = start, i = 0; const N = W.length;
    const E = k => W[k] && W[k].s;
    const skipAuto = () => { while (p < N && (S.hinted.has(p) || (W[p].first && opt.firstWord))){ res[p] = {st: S.hinted.has(p) ? 'hint' : 'given'}; p++; } };
    const isRep = t => { for (let k = 1; k <= 3; k++) if (p - k >= 0 && sim(t, E(p - k))) return true; return false; };
    // إعادة قراءة جزء سابق: كلمتان فأكثر تطابق موضعًا قبل p ← تُتجاهل
    const repRun = () => {
      if (i + 1 >= tokens.length) return 0;
      for (let q = Math.max(0, p - 80); q < p - 1; q++){
        if (sim(tokens[i], E(q)) && sim(tokens[i + 1], E(q + 1))){
          let n = 2; while (i + n < tokens.length && q + n < p && sim(tokens[i + n], E(q + n))) n++;
          return n;
        }
      }
      return 0;
    };
    const chain = (j, q, n) => { for (let m = 1; m <= n; m++){ if (q + m >= N) return true; if (j + m >= tokens.length) return final; if (!sim(tokens[j + m], E(q + m))) return false; } return true; };
    let lost = 0;
    while (i < tokens.length){
      skipAuto(); if (p >= N) break;
      const t = tokens[i], nx = tokens[i + 1];
      if (sim(t, E(p))){ res[p] = {st: 'ok', heard: t}; p++; i++; lost = 0; continue; }
      if (p + 1 < N && sim(t, E(p) + E(p + 1))){ res[p] = {st: 'ok', heard: t}; res[p+1] = {st: 'ok', heard: t}; p += 2; i++; lost = 0; continue; }
      if (nx !== undefined && sim(t + nx, E(p))){ res[p] = {st: 'ok', heard: t + ' ' + nx}; p++; i += 2; lost = 0; continue; }
      const rr = repRun(); if (rr){ i += rr; continue; }
      // إعادة التزامن: القفزة ≤٤ تكفيها كلمة تأكيد، وحتى ١٥ كلمتان، وحتى ٤٠ (آية متروكة) ثلاث
      let best = null;
      for (let j = i; j < Math.min(tokens.length, i + 6) && !best; j++){
        for (let k = 0; k <= 40 && p + k < N; k++){
          if (j === i && k === 0) continue;
          if (!sim(tokens[j], E(p + k))) continue;
          const last = j + 1 >= tokens.length, endOfRange = p + k + 1 >= N;
          const c1 = !last && sim(tokens[j + 1], E(p + k + 1));
          const confirmed = k <= 4 ? endOfRange || c1 || (last && (final || k === 0)) : chain(j, p + k, k <= 15 ? 2 : 3);
          if (confirmed){ best = {j, k}; break; }
        }
      }
      if (best){
        const garbage = tokens.slice(i, best.j).filter(x => !isRep(x));
        // أول كلمة أو كلمتان في جلسة جديدة ضاعتا لحظة فتح الميكروفون ← «لم تُسمع»
        if (i === 0 && best.j === 0 && best.k <= 2){
          for (let q = 0; q < best.k; q++) res[p + q] = {st: 'gap'};
        } else {
          for (let q = 0; q < best.k; q++) res[p + q] = q < garbage.length ? {st: 'wrong', heard: garbage[q]} : {st: 'skip'};
        }
        p += best.k; i = best.j; lost = 0; continue;
      }
      if (isRep(t)){ i++; continue; }
      if (!final && tokens.length - i < 4) break;
      lost++; i++;   // لم نتبيّن موضعه: لا نحكم بالخطأ
    }
    skipAuto();
    return {res, p, lost: lost + (tokens.length - i)};
  }

  function statusOf(i){ return S.marks[i] || S.live[i] || null; }

  function onHeard(text, isFinal){
    if (!S || S.done) return;
    S.raw = text; S.tokens = tokenize(text);
    const r = align(S.tokens, S.start, isFinal);
    if (isFinal){
      Object.entries(r.res).forEach(([k, v]) => { S.marks[k] = v; });
      S.live = {}; S.start = r.p; S.raw = ''; S.tokens = [];
    } else S.live = r.res;
    if (r.p !== S.pos){ S.pos = r.p; S.lastMove = Date.now(); }
    S.lost = isFinal ? 0 : r.lost;
    cb.update(text);
    const last = statusOf(W.length - 1);
    if (S.pos >= W.length && last && last.st !== 'wrong' && last.st !== 'skip') finish();
  }

  /* ---------- سجلّ التشخيص ---------- */
  const LOG = [];
  function log(kind, txt){
    const d = new Date();
    LOG.push(`${d.toTimeString().slice(0, 8)} ${kind}${txt ? ': ' + txt : ''}`);
    if (LOG.length > 150) LOG.shift();
  }

  // كروم أندرويد يعيد إرسال ما سبق داخل النتيجة الجديدة ← ندمج بلا تكرار
  function joinResults(list){
    let acc = '';
    for (const t0 of list){
      const t = t0.trim(), a = acc.trim(); if (!t) continue;
      if (!a) acc = t;
      else if (t.startsWith(a)) acc = t;
      else if (t.length >= 8 && a.endsWith(t)) {}
      else acc = a + ' ' + t;
    }
    return acc;
  }

  /* ---------- التعرّف على الكلام ---------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const IS_ANDROID = /Android/i.test(navigator.userAgent);
  let rec = null, wakeLock = null;

  function startRec(){
    if (!SR) return;
    rec = new SR();
    rec.lang = 'ar-SA'; rec.continuous = !IS_ANDROID || opt.mode === 'continuous';
    rec.interimResults = true; rec.maxAlternatives = 1;
    let finalText = '';
    const sess = S, mine = () => S === sess;   // أحداث متأخّرة من جلسة سابقة تُتجاهل
    log('بدء', rec.continuous ? 'متواصل' : 'جملة جملة');
    rec.onresult = e => {
      if (!mine()) return;
      const fin = [], all = [];
      for (let k = 0; k < e.results.length; k++){
        const tr = e.results[k][0].transcript; all.push(tr); if (e.results[k].isFinal) fin.push(tr);
      }
      log('نتيجة', `[${e.resultIndex}/${e.results.length}] ` + [...e.results].map(r => (r.isFinal ? '✓' : '…') + r[0].transcript.trim()).join(' | '));
      finalText = joinResults(fin);
      onHeard(joinResults(all), false);
    };
    rec.onerror = e => {
      log('خطأ', e.error);
      if (!mine()) return;
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed'){ cb.warn('لم يُسمح باستخدام الميكروفون. اسمح للمتصفح بالوصول إلى الميكروفون من الإعدادات ثم أعد المحاولة.'); stop(); }
      else if (e.error === 'network'){ cb.warn('التعرّف على الكلام يحتاج اتصالًا بالإنترنت. تأكّد من الاتصال ثم اضغط الميكروفون.'); stop(); }
      else if (e.error === 'language-not-supported'){ cb.warn('هذا الجهاز لا يدعم التعرّف على العربية. على آيفون: الإعدادات ← عام ← لوحة المفاتيح ← فعّل الإملاء، وأضف لوحة مفاتيح عربية.'); stop(); }
    };
    rec.onend = () => {
      log('نهاية', finalText);
      if (!mine()) return;
      onHeard(finalText, true);
      if (S && S.running && !S.done){ try { startRec(); } catch(err){ S.running = false; cb.update(); } }
    };
    try { rec.start(); } catch(err){}
  }

  function setup(words, options, callbacks){
    stop(true);
    W = words; opt = options; cb = Object.assign({update(){}, done(){}, warn(){}}, callbacks);
    S = fresh();
    const r0 = align([], 0, false); S.pos = r0.p; S.live = r0.res;
  }
  function start(){
    S.running = true; S.lastMove = Date.now();
    if ('wakeLock' in navigator) navigator.wakeLock.request('screen').then(l => wakeLock = l).catch(() => {});
    startRec(); cb.update();
  }
  function stop(silent){
    if (S) S.running = false;
    if (rec){ try { rec.stop(); } catch(e){} }
    if (wakeLock){ wakeLock.release().catch(() => {}); wakeLock = null; }
    if (!silent) cb.update();
  }
  function hint(){
    if (!S || S.pos >= W.length) return;
    S.hinted.add(S.pos);
    onHeard(S.raw || '', false);
    S.lastMove = Date.now();
  }
  function finish(){
    if (!S || S.done) return;
    stop(true);
    Object.entries(S.live).forEach(([k, v]) => { if (!S.marks[k]) S.marks[k] = v; });
    S.done = true;
    cb.done();
  }

  return {norm, tokenize, sim, align, joinResults, setup, start, stop, hint, finish, onHeard, statusOf,
          LOG, SR, IS_ANDROID, get S(){ return S; }, get W(){ return W; }};
})();
