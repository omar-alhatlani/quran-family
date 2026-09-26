/* حلقة البيت · share.js — تقرير الأسبوع للمشاركة (صورة أو نصّ)، والتذكير اليومي في تقويم الجوال */

// الأسبوع المعروض: الحالي؛ إلا يوم السبت (أوّله) إن لم يُعمل فيه شيء بعدُ، فالأسبوع الذي انتهى للتوّ
const weekActive = (pid, w) => { const s = weekSummary(pid, w); return !!(s.ss || s.np || s.na || s.lis); };
function reportWeek(pids){
  const t = Store.today(), w = Stats.weekStart(t);
  if (t !== w) return w;
  return (pids || []).some(id => weekActive(id, w)) ? w : w - 7;
}
const gDate = (d, o) => new Date(d * 864e5).toLocaleDateString('ar-SA-u-ca-gregory', {timeZone: 'UTC', ...o});
const hDate = (d, o) => new Date(d * 864e5).toLocaleDateString('ar-SA-u-ca-islamic-umalqura', {timeZone: 'UTC', ...o});
const weekRange = w => `${gDate(w, {day: 'numeric', month: 'long'})} – ${gDate(w + 6, {day: 'numeric', month: 'long'})}`;
// «من السبت ٢٦ سبتمبر إلى الجمعة ٢ أكتوبر» (وحتى اليوم إن كان الأسبوع جاريًا)
function periodTxt(w){
  const t = Store.today(), end = Math.min(w + 6, t), f = d => `${dowName(d)} ${gDate(d, {day: 'numeric', month: 'long'})}`;
  return end === w ? `يوم ${f(w)}` : `من ${f(w)} إلى ${f(end)}`;
}
const hijriRange = w => { const e = Math.min(w + 6, Store.today()), full = {day: 'numeric', month: 'long', year: 'numeric'}; return e === w ? hDate(w, full) : `${hDate(w, {day: 'numeric', month: 'long'})} – ${hDate(e, full)}`; };
const pagesTxt = n => unitTxt(n, 'page');
const newTxt = s => s.unit === 'ayah' ? count(s.na, 'آية واحدة', 'آيتان', 'آيات', 'آية') : pagesTxt(s.np);
const hwOfWeek = (d, w) => (d.hw || []).filter(x => !x.school || x.school >= w);

function memberReportLines(p, w){
  const s = weekSummary(p.id, w), m = Stats.memorized(p.id), d = Store.data(p.id), L = [];
  const mark = ok => ok ? ' ✓' : '';
  if (s.newT) L.push(`• الحفظ الجديد: ${newTxt(s)} من ${unitTxt(s.newT, s.unit)}${mark(s.newD >= s.newT)}`);
  else if (s.np) L.push(`• الحفظ الجديد: ${pagesTxt(s.np)}`);
  if (s.revT) L.push(`• المراجعة: ${pagesTxt(s.rp)} من ${pagesTxt(s.revT)}${mark(s.rp >= s.revT)}`);
  else if (s.rp) L.push(`• المراجعة: ${pagesTxt(s.rp)}`);
  L.push(`• أيام التسميع: ${AR(s.days)} من ٧`);
  if (s.lis) L.push(`• سمّع لـ${T('hisPeople')}: ${count(s.lis, 'مرة', 'مرتين', 'مرات', 'مرة')}`);
  hwOfWeek(d, w).forEach(x => L.push(`• واجب المدرسة: ${itemLabel(x.a, x.b)} · ${hwStatus(x).txt}`));
  L.push(`• المحفوظ: ${Q.dec(m.juz)} جزء · ${pagesTxt(m.pages)}`);
  if (s.met) L.push('🎉 حقّق هدف الأسبوع');
  return {lines: L, s};
}
function memberReportText(pid){
  const p = Store.profile(pid), w = reportWeek([pid]), {lines} = memberReportLines(p, w);
  return `📖 تقرير الأسبوع · ${p.name}\n${periodTxt(w)}\n\n${lines.join('\n')}\n\n— حلقة البيت`;
}
const circleMembers = () => Store.profiles().filter(p => p.cloud);
function circleReportText(){
  const fam = Cloud.st.family, ps = circleMembers(), w = reportWeek(ps.map(p => p.id));
  let cap = 0, sum = 0;
  const lines = ps.map(p => {
    const s = weekSummary(p.id, w); if (s.hasGoal) cap += 100; sum += s.pct;
    const parts = [];
    if (s.np) parts.push(`حفظ ${pagesTxt(s.np)}`);
    if (s.rp) parts.push(`مراجعة ${pagesTxt(s.rp)}`);
    parts.push(`${AR(s.days)} أيام`);
    return `• ${p.name}: ${parts.join(' · ')}${s.met ? ' ✓' : ''}`;
  });
  const tank = cap ? `\n🛢️ الخزّان: ${AR(Math.round(Math.min(1, sum / cap) * 100))}٪${sum >= cap ? ' — امتلأ!' : ''}` : '';
  const rw = fam.reward ? `\n🎁 المكافأة: ${fam.reward}` : '';
  return `📖 تقرير حلقة ${fam.name}\n${periodTxt(w)}\n\n${lines.join('\n')}${tank}${rw}\n\n— حلقة البيت`;
}
// مشاركة النصّ: قائمة الجوال إن وُجدت، وإلا واتساب
async function shareText(text){
  if (navigator.share){ try { await navigator.share({text}); return; } catch(e){ if (e.name === 'AbortError') return; } }
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
}

/* ---------- التقرير صورةً (لوحة ١٠٨٠ بكسل) ---------- */
const IMG = {W: 1080, pad: 56, accent: '#0f5f55', soft: '#d6ebe7', gold: '#a8812f', ink: '#18282a', muted: '#5d6f70', bg: '#eef2f1', line: '#d5dfdd', font: '"IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif'};
function rrect(c, x, y, w, h, r){
  c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
}
// نصّ من اليمين عند x، يصغر خطّه حتى يسع maxW
function rtext(c, s, x, y, size, {w = 400, color = IMG.ink, maxW = 0, align = 'right'} = {}){
  let f = size; c.font = `${w} ${f}px ${IMG.font}`;
  while (maxW && f > 14 && c.measureText(s).width > maxW){ f -= 2; c.font = `${w} ${f}px ${IMG.font}`; }
  c.fillStyle = color; c.textAlign = align; c.fillText(s, x, y);
  return c.measureText(s).width;
}
// ترويسة: السطر الصغير، ثم العنوان، ثم الفترة بالميلادي والهجري
function imgHeader(c, top, title, w){
  const {W, pad} = IMG;
  c.fillStyle = IMG.accent; c.fillRect(0, 0, W, 318);
  c.fillStyle = 'rgba(255,255,255,.07)'; c.beginPath(); c.arc(90, 60, 190, 0, 7); c.fill();
  rtext(c, top, W - pad, 78, 30, {w: 500, color: 'rgba(255,255,255,.82)'});
  rtext(c, title, W - pad, 156, 62, {w: 700, color: '#fff', maxW: W - 2 * pad});
  rtext(c, 'تقرير الفترة ' + periodTxt(w), W - pad, 222, 34, {w: 500, color: '#fff', maxW: W - 2 * pad});
  rtext(c, hijriRange(w), W - pad, 270, 27, {color: 'rgba(255,255,255,.75)', maxW: W - 2 * pad});
  return 318;
}
function imgFooter(c, y){
  const {W} = IMG;
  c.strokeStyle = IMG.line; c.lineWidth = 2; c.beginPath(); c.moveTo(IMG.pad, y); c.lineTo(W - IMG.pad, y); c.stroke();
  rtext(c, 'حلقة البيت · حفظ القرآن مع الأهل', W / 2, y + 52, 26, {color: IMG.muted, align: 'center'});
  return y + 90;
}
// شريط تقدّم (من اليمين)
function bar(c, x, y, w, h, frac, color){
  rrect(c, x, y, w, h, h / 2); c.fillStyle = IMG.line; c.fill();
  const f = Math.max(0, Math.min(1, frac)); if (!f) return;
  rrect(c, x + w - w * f, y, Math.max(h, w * f), h, h / 2); c.fillStyle = color; c.fill();
}
// اللوحة تُرسم مرتين: الأولى لحساب الطول، والثانية بالطول الصحيح
async function paint(draw){
  try { await Promise.all(['400', '500', '700'].map(w => document.fonts.load(`${w} 32px "IBM Plex Sans Arabic"`))); } catch(e){}
  const probe = document.createElement('canvas').getContext('2d'); probe.canvas.width = IMG.W; probe.canvas.height = 10;
  const H = draw(probe);
  const cv = document.createElement('canvas'); cv.width = IMG.W; cv.height = Math.ceil(H);
  const c = cv.getContext('2d'); c.direction = 'rtl'; c.fillStyle = IMG.bg; c.fillRect(0, 0, IMG.W, cv.height);
  draw(c);
  return cv;
}

function circleReportImage(){
  const fam = Cloud.st.family, ps = circleMembers(), w = reportWeek(ps.map(p => p.id));
  const rows = ps.map(p => ({p, s: weekSummary(p.id, w)}));
  const cap = rows.filter(r => r.s.hasGoal).length * 100, sum = rows.reduce((t, r) => t + r.s.pct, 0);
  return paint(c => {
    c.direction = 'rtl';
    const {W, pad} = IMG;
    let y = imgHeader(c, 'حلقة البيت · تقرير الأسبوع', 'حلقة ' + fam.name, w) + 40;
    rows.forEach(({p, s}) => {
      const h = 176, x = pad, cw = W - 2 * pad;
      rrect(c, x, y, cw, h, 26); c.fillStyle = '#fff'; c.fill();
      c.fillStyle = p.color; rrect(c, x + cw - 12, y + 22, 12, h - 44, 6); c.fill();
      const R = x + cw - 44;
      c.fillStyle = p.color; c.beginPath(); c.arc(R - 34, y + 60, 34, 0, 7); c.fill();
      rtext(c, [...p.name.trim()][0] || '؟', R - 34, y + 73, 34, {w: 700, color: '#fff', align: 'center'});
      rtext(c, p.name, R - 84, y + 72, 40, {w: 700, maxW: cw - 330});
      const parts = [s.np || s.na ? `حفظ ${newTxt(s)}` : null, s.rp ? `مراجعة ${pagesTxt(s.rp)}` : null, s.days ? `${AR(s.days)} من ٧ أيام` : 'لم يسمّع بعد'].filter(Boolean);
      rtext(c, parts.join('  ·  '), R - 84, y + 124, 30, {color: IMG.muted, maxW: cw - 330});
      // يسار البطاقة: حقّق هدفه، أو نسبة ما أنجز من هدفه
      const lx = x + 36;
      if (s.met){
        rrect(c, lx, y + 44, 190, 64, 32); c.fillStyle = '#f6edd8'; c.fill();
        rtext(c, '✓ حقّق هدفه', lx + 95, y + 87, 28, {w: 700, color: IMG.gold, align: 'center'});
      } else if (s.hasGoal){
        const f = Math.min(1, s.base / 100);
        rtext(c, AR(Math.round(f * 100)) + '٪', lx + 95, y + 82, 40, {w: 700, color: IMG.accent, align: 'center'});
        bar(c, lx + 10, y + 104, 170, 14, f, IMG.accent);
        rtext(c, 'من هدفه', lx + 95, y + 150, 22, {color: IMG.muted, align: 'center'});
      } else rtext(c, 'بلا هدف', lx + 95, y + 98, 26, {color: IMG.muted, align: 'center'});
      y += h + 20;
    });
    if (cap){
      const fill = Math.min(1, sum / cap), full = sum >= cap;
      y += 16;
      rrect(c, pad, y, W - 2 * pad, fam.reward ? 250 : 190, 26); c.fillStyle = IMG.soft; c.fill();
      rtext(c, 'خزّان الحلقة', W - pad - 36, y + 64, 36, {w: 700, color: IMG.accent});
      rtext(c, AR(Math.round(fill * 100)) + '٪' + (full ? ' · امتلأ!' : ''), pad + 36, y + 64, 40, {w: 700, color: full ? IMG.gold : IMG.accent, align: 'left'});
      bar(c, pad + 36, y + 96, W - 2 * pad - 72, 36, fill, full ? IMG.gold : IMG.accent);
      rtext(c, full ? 'بارك الله في الجميع، امتلأ الخزّان هذا الأسبوع' : 'يمتلئ حين يحقّق الجميع أهدافهم معًا', W - pad - 36, y + 170, 26, {color: IMG.muted});
      if (fam.reward) rtext(c, '🎁 المكافأة: ' + fam.reward, W - pad - 36, y + 222, 30, {w: 600, color: IMG.ink, maxW: W - 2 * pad - 72});
      y += (fam.reward ? 250 : 190) + 20;
    }
    return imgFooter(c, y + 24);
  });
}

function memberReportImage(pid){
  const p = Store.profile(pid), w = reportWeek([pid]), s = weekSummary(pid, w), m = Stats.memorized(pid), d = Store.data(pid);
  const fam = Cloud.st.family, hws = hwOfWeek(d, w);
  return paint(c => {
    c.direction = 'rtl';
    const {W, pad} = IMG;
    let y = imgHeader(c, fam ? 'حلقة ' + fam.name : 'حلقة البيت', p.name, w) + 40;
    const tile = (i, label, value, sub, ok) => {
      const tw = (W - 2 * pad - 24) / 2, th = 196, tx = W - pad - tw - (i % 2) * (tw + 24), ty = y + Math.floor(i / 2) * (th + 24);
      rrect(c, tx, ty, tw, th, 26); c.fillStyle = '#fff'; c.fill();
      rtext(c, label, tx + tw - 32, ty + 54, 28, {w: 500, color: IMG.muted});
      rtext(c, value, tx + tw - 32, ty + 124, 50, {w: 700, color: ok ? IMG.gold : IMG.accent, maxW: tw - 64});
      if (sub) rtext(c, sub, tx + tw - 32, ty + 170, 25, {color: ok ? IMG.gold : IMG.muted, maxW: tw - 64});
    };
    tile(0, 'الحفظ الجديد', s.newT || s.np || s.na ? newTxt(s) : '—', s.newT ? `الهدف ${unitTxt(s.newT, s.unit)}${s.newD >= s.newT ? ' ✓' : ''}` : '', s.newT && s.newD >= s.newT);
    tile(1, 'المراجعة', s.rp ? pagesTxt(s.rp) : '—', s.revT ? `الهدف ${pagesTxt(s.revT)}${s.rp >= s.revT ? ' ✓' : ''}` : '', s.revT && s.rp >= s.revT);
    tile(2, 'أيام التسميع', `${AR(s.days)} من ٧`, s.lis ? `وسمّع لغيره ${count(s.lis, 'مرة', 'مرتين', 'مرات', 'مرة')}` : '', false);
    tile(3, 'المحفوظ', `${Q.dec(m.juz)} جزء`, pagesTxt(m.pages), false);
    y += 2 * 196 + 24 + 32;
    if (hws.length){
      rtext(c, 'واجب المدرسة', W - pad, y + 36, 32, {w: 700});
      y += 58;
      hws.forEach(x => {
        const st = hwStatus(x), done = st.k === 'done' || st.k === 'school';
        rrect(c, pad, y, W - 2 * pad, 104, 22); c.fillStyle = '#fff'; c.fill();
        rtext(c, itemLabel(x.a, x.b), W - pad - 32, y + 46, 30, {w: 600, maxW: W - 2 * pad - 64});
        rtext(c, st.txt, W - pad - 32, y + 86, 25, {color: done ? IMG.gold : IMG.muted, maxW: W - 2 * pad - 64});
        y += 120;
      });
      y += 12;
    }
    if (s.met){
      rrect(c, pad, y, W - 2 * pad, 100, 26); c.fillStyle = '#f6edd8'; c.fill();
      rtext(c, '🎉 حقّق هدف الأسبوع، بارك الله فيه', W / 2, y + 63, 34, {w: 700, color: IMG.gold, align: 'center'});
      y += 120;
    }
    return imgFooter(c, y + 24);
  });
}

// معاينة الصورة، ومنها المشاركة (نقرة جديدة يقبلها سفاري) أو التنزيل أو النصّ
async function showReport(makeImg, text, name){
  const ov = document.createElement('div'); ov.className = 'shot-ov';
  ov.innerHTML = '<div class="shot-box"><p class="loading">جارٍ تجهيز الصورة…</p></div>';
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.onclick = e => { if (e.target === ov) close(); };
  let cv; try { cv = await makeImg(); } catch(e){ console.error(e); close(); return shareText(text); }
  const blob = await new Promise(r => cv.toBlob(r, 'image/png')), url = URL.createObjectURL(blob);
  const file = new File([blob], name + '.png', {type: 'image/png'});
  const canFile = !!(navigator.canShare && navigator.canShare({files: [file]}));
  ov.querySelector('.shot-box').innerHTML = `<img src="${url}" alt="صورة التقرير">
    <div class="row shot-acts">
      ${canFile ? '<button class="btn primary" type="button" data-a="share">📤 مشاركة الصورة</button>' : ''}
      <button class="btn${canFile ? '' : ' primary'}" type="button" data-a="save">تنزيل الصورة</button>
      <button class="btn" type="button" data-a="text">نصًّا بدلها</button>
      <button class="btn" type="button" data-a="close">إغلاق</button>
    </div>`;
  ov.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => {
    const a = b.dataset.a;
    if (a === 'close'){ close(); URL.revokeObjectURL(url); }
    else if (a === 'text') shareText(text);
    else if (a === 'save'){ const l = document.createElement('a'); l.href = url; l.download = file.name; l.click(); }
    else if (a === 'share'){ try { await navigator.share({files: [file]}); } catch(e){ if (e.name !== 'AbortError') shareText(text); } }
  });
}

/* التذكير اليومي: ملف تقويم (ics) بحدث يتكرّر كل يوم في الساعة المختارة، مع تنبيه */
function reminderICS(hh, mm){
  const pad = n => String(n).padStart(2, '0'), t = new Date(Date.now() + 864e5);
  const day = `${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}`;
  const url = location.origin + location.pathname;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Halaqa Albait//AR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:halaqa-${Date.now()}@halaqa-albait`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART:${day}T${pad(hh)}${pad(mm)}00`, 'DURATION:PT20M', 'RRULE:FREQ=DAILY',
    'SUMMARY:ورد القرآن · حلقة البيت', `DESCRIPTION:حفظ اليوم وورد المراجعة\\n${url}`, `URL:${url}`,
    'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:وقت ورد القرآن', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'];
  const blob = new Blob([lines.join('\r\n') + '\r\n'], {type: 'text/calendar;charset=utf-8'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'تذكير-حلقة-البيت.ics'; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
// سطر الأزرار في الرئيسية
function shareRow(pid){
  const p = Store.profile(pid), own = Cloud.mine(p);
  return `<div class="share-row">
    <button class="btn small" type="button" id="shareWeek">📤 تقرير الأسبوع</button>
    ${own ? `<details class="rem"><summary class="btn small">⏰ تذكير يومي</summary>
      <div class="row" style="margin-top:8px"><label for="remT">الساعة</label><input type="time" id="remT" value="${Store.pref('remTime', '20:00')}">
      <button class="btn small primary" type="button" id="remAdd">أضفه إلى التقويم</button></div>
      <p class="small" style="margin:6px 0 0">يُنزَّل حدث يتكرّر كل يوم بتنبيه؛ افتحه فيضيفه الجوال إلى تقويمه.</p></details>` : ''}
  </div>`;
}
function bindShare(pid){
  if ($('#shareWeek')) $('#shareWeek').onclick = async () => {
    await Cloud.loadSessions(pid).catch(() => {});
    showReport(() => memberReportImage(pid), memberReportText(pid), 'تقرير-' + Store.profile(pid).name.replace(/\s+/g, '-'));
  };
  if ($('#remAdd')) $('#remAdd').onclick = () => {
    const [hh, mm] = ($('#remT').value || '20:00').split(':').map(Number); Store.setPref('remTime', $('#remT').value || '20:00');
    reminderICS(hh, mm);
  };
  if ($('#shareCircle')) $('#shareCircle').onclick = async () => {
    const b = $('#shareCircle'); b.disabled = true;
    for (const p of circleMembers()) await Cloud.loadSessions(p.id).catch(() => {});
    b.disabled = false;
    showReport(circleReportImage, circleReportText(), 'تقرير-حلقة-' + Cloud.st.family.name.replace(/\s+/g, '-'));
  };
}
