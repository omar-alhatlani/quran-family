/* حلقة البيت · hw.js — جزء من الواجهة (ملفّات js/ui تُحمَّل بالترتيب في index.html وتتشارك النطاق العام) */
/* ================= واجب الحفظ المدرسي =================
   hw: [{id, a, b, due (يوم|null), created, passes: [أيام التسميع الناجح], done (يوم الإتقان), school (يوم التسميع في المدرسة)}]
   الإتقان: تسميعان ناجحان (٩٠٪ فأكثر) للمقطع كاملًا في يومين مختلفين. */
const HW_PASS = 90, HW_DAYS = 2;
let hwEditing = null;   // معرّف الواجب الذي يُعدَّل الآن
const dowName = d => ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][(d + 4) % 7];
// بعد كل جلسة (صوتية أو بتسميع أحد الأهل): هل غطّت واجبًا مفتوحًا بنجاح؟
function hwCheck(pid, rec){
  const d = Store.data(pid); if (!d.hw || !d.hw.length || rec.pct < HW_PASS) return;
  const day = Store.dayOf(rec.t); let changed = false;
  d.hw.forEach(x => {
    if (x.school || rec.a > x.a || rec.b < x.b) return;
    x.passes = [...new Set([...(x.passes || []), day])];
    if (!x.done && x.passes.length >= HW_DAYS) x.done = day;
    changed = true;
    // حفظ جديد أتقنه: يُضاف إلى محفوظه (فيُحسب في هدفه وفي الخزّان)
    const m = Store.mem(pid); for (let i = x.a; i <= x.b; i++) if (!m[i]){ Store.setMem(pid, x.a, x.b, true, true); break; }
  });
  if (changed) Store.touch(pid);
}
function hwStatus(x){
  const t = Store.today(), n = (x.passes || []).length;
  if (x.school) return {k: 'school', txt: '✓ سُمّع في المدرسة'};
  if (x.done) return {k: 'done', txt: '✓ أتقنه، جاهز للمدرسة'};
  if (n === 1) return {k: 'one', txt: x.passes[0] === t ? 'تسميع ناجح واحد، سمّعه غدًا مرة أخرى ليثبت' : 'تسميع ناجح واحد، سمّعه اليوم ليثبت'};
  return {k: 'none', txt: 'لم يُسمَّع بعد'};
}
const hwOpen = d => (d.hw || []).filter(x => !x.school && !(x.done && x.due !== null && x.due !== undefined && Store.today() > x.due + 7));
function hwDue(x){
  if (x.due === null || x.due === undefined) return '';
  const left = x.due - Store.today();
  return left < 0 ? `<span class="hw-late">فات موعده (${dowName(x.due)})</span>` : left === 0 ? '<b class="hw-today">التسميع اليوم</b>'
    : left === 1 ? `التسميع غدًا (${dowName(x.due)})` : `التسميع يوم ${dowName(x.due)} · باقي ${count(left, 'يوم', 'يومان', 'أيام', 'يومًا')}`;
}
// حقول الواجب (السورة، من، إلى، الموعد): للإضافة والتعديل
const hwFields = (px, x) => {
  const s = x ? Q.sur[x.a] : 67, iso = dd => new Date(dd * 864e5).toISOString().slice(0, 10);
  return `<div class="row" style="margin-top:8px">
      <label for="${px}S">السورة</label><select id="${px}S" data-a="${x ? Q.num[x.a] : 1}" data-b="${x ? Q.num[x.b] : ''}">${Q.surahs.map(q => `<option value="${q.n}" ${q.n === s ? 'selected' : ''}>${AR(q.n)}. ${q.name}</option>`).join('')}</select>
    </div>
    <div class="row" style="margin-top:8px">
      <label for="${px}A">من آية</label><select id="${px}A"></select>
      <label for="${px}B">إلى آية</label><select id="${px}B"></select>
    </div>
    <div class="row" style="margin-top:8px">
      <label for="${px}D">موعد التسميع في المدرسة (اختياري)</label><input type="date" id="${px}D" value="${x && x.due != null ? iso(x.due) : ''}">
    </div>`;
};
// تعبئة قائمتي الآيات بحسب السورة (مع قيم أولية عند التعديل)
function hwFill(px, keep){
  const sel = $('#' + px + 'S'); if (!sel) return;
  const s = Q.surahs[+sel.value - 1], o = n => Array.from({length: n}, (_, k) => `<option value="${k + 1}">${AR(k + 1)}</option>`).join('');
  $('#' + px + 'A').innerHTML = o(s.count); $('#' + px + 'B').innerHTML = o(s.count);
  $('#' + px + 'A').value = keep && sel.dataset.a ? sel.dataset.a : 1;
  $('#' + px + 'B').value = keep && sel.dataset.b ? sel.dataset.b : s.count;
}
const hwRead = px => {
  const s = +$('#' + px + 'S').value; let a = +$('#' + px + 'A').value, b = +$('#' + px + 'B').value; if (a > b) [a, b] = [b, a];
  return {a: Q.idx(s, a), b: Q.idx(s, b), due: $('#' + px + 'D').value ? Math.floor(Date.parse($('#' + px + 'D').value) / 864e5) : null};
};
// بطاقة الواجب في صفحة الابن (ولوليّ الأمر: إضافة وتعديل وإغلاق وحذف)
function hwCard(pid){
  const p = Store.profile(pid), d = Store.data(pid), open = hwOpen(d);
  // من يضيف الواجب: وليّ الأمر لملف غيره، أو الجهاز نفسه إن لم يكن في حلقة
  const guard = p.cloud ? isOwner() && !Cloud.mine(p) : true, rmode = reciteMode(pid);
  if (!open.length && !guard) return '';
  return `<section class="panel hw">
    <div class="row between"><h2>📚 واجب المدرسة</h2>${open.length ? `<span class="chip">${count(open.length, 'واجب واحد', 'واجبان', 'واجبات', 'واجبًا')}</span>` : ''}</div>
    ${open.length ? `<ul class="hw-list">${open.map(x => { const s = hwStatus(x);
      if (guard && hwEditing === x.id) return `<li class="hw-edit"><b>تعديل الواجب</b>${hwFields('hwE', x)}
        <p class="small" style="margin:6px 0">تغيير الموعد وحده يُبقي التقدّم. وتغيير السورة أو الآيات يبدأ الإتقان من جديد.</p>
        <div class="row"><button class="btn primary small" type="button" data-hwsave="${x.id}">حفظ</button><button class="btn small" type="button" id="hwCancel">إلغاء</button></div></li>`;
      return `<li class="hw-${s.k}">
      <div class="hw-t"><b>${itemLabel(x.a, x.b)}</b>${hwDue(x) ? `<span class="small">${hwDue(x)}</span>` : ''}</div>
      <div class="hw-s">${s.txt}${(x.passes || []).length === 1 && !x.done ? ' <span class="small">(١ من ٢)</span>' : ''}</div>
      <div class="hz-acts">
        <a class="btn small" href="#/play/${Q.sur[x.a]}/${Q.num[x.a]}/${Q.num[x.b]}">${ICON_PLAY} استمع</a>
        ${rmode ? `<a class="btn small ${x.done ? '' : 'primary'}" href="${segHref(pid, rmode, x.a, x.b)}">${rmode === 'self' ? ICON.mic + ' سمّع للبرنامج' : ICON_EAR + ' سمّع له'}</a>` : ''}
        ${rmode === 'self' && p.cloud ? `<a class="btn small" href="#/ask/${Q.sur[x.a]}/${Q.num[x.a]}/${Q.num[x.b]}">${ICON_EAR} اطلب تسميعًا</a>` : ''}
        ${guard ? `<button class="btn small" type="button" data-hwschool="${x.id}">سُمّع في المدرسة ✓</button>
          <button class="btn small" type="button" data-hwedit="${x.id}">تعديل</button>
          <button class="btn small danger" type="button" data-hwdel="${x.id}">حذف</button>` : ''}
      </div></li>`; }).join('')}</ul>` : '<p class="small">لا واجب الآن.</p>'}
    ${guard ? `<details class="hw-add"${open.length ? '' : ' open'}><summary class="small">إضافة واجب مدرسي</summary>
      ${hwFields('hw', null)}
      <p class="small" style="margin:6px 0">يظهر الواجب في صفحته، ويُعدّ مُتقَنًا بعد تسميعين ناجحين في يومين مختلفين.</p>
      <button class="btn primary small" id="hwAdd" type="button">أضف الواجب</button>
    </details>` : ''}
  </section>`;
}
function bindHw(pid){
  const d = Store.data(pid);
  if ($('#hwS')){ hwFill('hw', false); $('#hwS').onchange = () => hwFill('hw', false); }
  if ($('#hwES')){ hwFill('hwE', true); $('#hwES').onchange = () => hwFill('hwE', false); }
  if ($('#hwAdd')) $('#hwAdd').onclick = () => {
    const v = hwRead('hw');
    (d.hw = d.hw || []).push({id: Store.uid(), a: v.a, b: v.b, due: v.due, created: Store.today(), passes: []});
    Store.touch(pid); route(true);
  };
  $$('[data-hwedit]').forEach(b => b.onclick = () => { hwEditing = b.dataset.hwedit; route(true); });
  if ($('#hwCancel')) $('#hwCancel').onclick = () => { hwEditing = null; route(true); };
  $$('[data-hwsave]').forEach(b => b.onclick = () => {
    const x = (d.hw || []).find(y => y.id === b.dataset.hwsave); if (!x) return;
    const v = hwRead('hwE'), moved = v.a !== x.a || v.b !== x.b;
    if (moved && (x.passes || []).length && !confirm('تغيير السورة أو الآيات يبدأ الإتقان من جديد. متابعة؟')) return;
    Object.assign(x, {a: v.a, b: v.b, due: v.due});
    if (moved){ x.passes = []; delete x.done; }
    hwEditing = null; Store.touch(pid); route(true);
  });
  $$('[data-hwschool]').forEach(b => b.onclick = () => {
    const x = (d.hw || []).find(y => y.id === b.dataset.hwschool); if (!x) return;
    if (!x.done && !confirm('لم يُتقنه بعد في البرنامج. هل سُمّع في المدرسة فعلًا؟')) return;
    x.school = Store.today(); Store.touch(pid); route(true);
  });
  $$('[data-hwdel]').forEach(b => b.onclick = () => {
    if (!confirm('حذف هذا الواجب؟')) return;
    d.hw = (d.hw || []).filter(y => y.id !== b.dataset.hwdel); Store.touch(pid); route(true);
  });
}
// عمود «واجب المدرسة» في متابعة الحلقة
function hwBrief(pid){
  const open = hwOpen(Store.data(pid)); if (!open.length) return '—';
  const x = open.slice().sort((p, q) => (p.due ?? 1e9) - (q.due ?? 1e9))[0], s = hwStatus(x);
  return s.k === 'done' ? '<b class="ok">✓ أتقنه</b>' : s.k === 'one' ? '<span class="part">١ من ٢</span>' : '<span class="no">لم يبدأ</span>';
}

