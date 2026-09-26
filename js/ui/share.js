/* حلقة البيت · share.js — تقرير الأسبوع للمشاركة (واتساب وغيره)، والتذكير اليومي في تقويم الجوال */

// الأسبوع المعروض: الحالي، ويوم السبت (أوّله) الأسبوعُ الذي انتهى للتوّ
const reportWeek = () => { const t = Store.today(), w = Stats.weekStart(t); return t === w ? w - 7 : w; };
const weekRange = w => { const f = d => new Date(d * 864e5).toLocaleDateString('ar-SA-u-ca-gregory', {day: 'numeric', month: 'long', timeZone: 'UTC'}); return `${f(w)} – ${f(w + 6)}`; };
const pagesTxt = n => unitTxt(n, 'page');

function memberReportLines(p, w){
  const s = weekSummary(p.id, w), m = Stats.memorized(p.id), d = Store.data(p.id), L = [];
  const mark = ok => ok ? ' ✓' : '';
  if (s.newT) L.push(`• الحفظ الجديد: ${s.unit === 'ayah' ? count(s.na, 'آية واحدة', 'آيتان', 'آيات', 'آية') : pagesTxt(s.np)} من ${unitTxt(s.newT, s.unit)}${mark(s.newD >= s.newT)}`);
  else if (s.np) L.push(`• الحفظ الجديد: ${pagesTxt(s.np)}`);
  if (s.revT) L.push(`• المراجعة: ${pagesTxt(s.rp)} من ${pagesTxt(s.revT)}${mark(s.rp >= s.revT)}`);
  else if (s.rp) L.push(`• المراجعة: ${pagesTxt(s.rp)}`);
  L.push(`• أيام التسميع: ${AR(s.days)} من ٧`);
  if (s.lis) L.push(`• سمّع لـ${T('hisPeople')}: ${count(s.lis, 'مرة', 'مرتين', 'مرات', 'مرة')}`);
  (d.hw || []).filter(x => !x.school || x.school >= w).forEach(x => L.push(`• واجب المدرسة: ${itemLabel(x.a, x.b)} · ${hwStatus(x).txt.replace('✓ ', '✓ ')}`));
  L.push(`• المحفوظ: ${Q.dec(m.juz)} جزء · ${pagesTxt(m.pages)}`);
  if (s.met) L.push('🎉 حقّق هدف الأسبوع');
  return {lines: L, s};
}
function memberReportText(pid){
  const p = Store.profile(pid), w = reportWeek(), {lines} = memberReportLines(p, w);
  return `📖 تقرير الأسبوع · ${p.name}\n${weekRange(w)}\n\n${lines.join('\n')}\n\n— حلقة البيت`;
}
function circleReportText(){
  const fam = Cloud.st.family, w = reportWeek(), ps = Store.profiles().filter(p => p.cloud);
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
  return `📖 تقرير أسبوع حلقة ${fam.name}\n${weekRange(w)}\n\n${lines.join('\n')}${tank}${rw}\n\n— حلقة البيت`;
}
// المشاركة: قائمة الجوال إن وُجدت، وإلا واتساب
async function shareText(text){
  if (navigator.share){ try { await navigator.share({text}); return; } catch(e){ if (e.name === 'AbortError') return; } }
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
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
  if ($('#shareWeek')) $('#shareWeek').onclick = async () => { await Cloud.loadSessions(pid).catch(() => {}); shareText(memberReportText(pid)); };
  if ($('#remAdd')) $('#remAdd').onclick = () => {
    const [hh, mm] = ($('#remT').value || '20:00').split(':').map(Number); Store.setPref('remTime', $('#remT').value || '20:00');
    reminderICS(hh, mm);
  };
  if ($('#shareCircle')) $('#shareCircle').onclick = async () => {
    const b = $('#shareCircle'); b.disabled = true;
    for (const p of Store.profiles().filter(x => x.cloud)) await Cloud.loadSessions(p.id).catch(() => {});
    b.disabled = false; shareText(circleReportText());
  };
}
