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
  // عدّاد ما ينتظرني: طلبات تسميع موجّهة إليّ (أو لأي فرد)، وطلبات ربط لوليّ الأمر
  const me = typeof meId === 'function' ? meId() : null, rs = Cloud.st.requests || [];
  const n = me ? rs.filter(r => r.status === 'pending' && (r.type === 'relink' ? isOwner() : r.from !== me && (r.to === me || r.to == null))).length : 0;
  $('#topWho').innerHTML = (n ? `<a class="badge" href="#/" aria-label="طلبات بانتظارك">🔔 ${AR(n)}</a>` : '') + (p && back ? avatar(p, 'sm') : '');
  document.title = (n ? `(${n}) ` : '') + 'حلقة البيت';
}
function ago(t){
  const d = Store.today() - Math.floor((t - new Date().getTimezoneOffset() * 60000) / 864e5);
  return d <= 0 ? 'اليوم' : d === 1 ? 'أمس' : d === 2 ? 'قبل يومين' : d <= 10 ? `قبل ${AR(d)} أيام` : `قبل ${AR(d)} يومًا`;
}
const STATE_TXT = {fresh: 'ثابت', stale: 'يحتاج مراجعة', weak: 'ضعيف', unrev: 'لم يُسمَّع بعد'};

/* ================= التنقّل ================= */
function route(keepScroll){
  if (cleanup){ cleanup(); cleanup = null; }
  const y = scrollY;
  document.body.classList.remove('has-bar');
  const parts = (location.hash.slice(1) || '/').split('/').filter(Boolean);
  const pid = Store.cur;
  if (parts[0] === 'listen') return viewListen(pid, parts.slice(1));
  if (parts[0] === 'majlis') return viewMajlis();
  if (parts[0] === 'play' && parts[1] === 'wird' && pid) return viewPlayWird(pid);
  if (!parts.length || !pid) return viewProfiles();
  ({home: viewHome, map: viewMap, tasmee: viewTasmee, report: viewReport, goal: viewGoal, ask: viewAsk, play: viewPlay, start: viewStart, mut: viewMut, cert: viewCert, drill: viewDrill}[parts[0]] || viewProfiles)(pid, parts.slice(1).map(Number));
  window.scrollTo(0, keepScroll === true ? y : 0);
}
window.addEventListener('hashchange', () => route());

