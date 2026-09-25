/* التخزين على الجهاز (localStorage). لكل فرد:
   mem:  مديات الآيات المحفوظة [[أول، آخر]] بفهرس المصحف (٠–٦٢٣٥)
   rev:  آخر تسميع لكل آية {فهرس: [اليوم، عدد الأخطاء]}
   sess: سجلّ جلسات التسميع
   mis:  مواضع الأخطاء {رقم الكلمة في المصحف: عدد مرات الخطأ} */
const Store = (() => {
  const KEY = 'qf1';
  let DB;
  try { DB = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch(e){ DB = null; }
  if (!DB || DB.v !== 1) DB = {v: 1, profiles: [], cur: null, d: {}, prefs: {}};
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  const memCache = {};
  function save(){
    try { localStorage.setItem(KEY, JSON.stringify(DB)); return true; }
    catch(e){ alert('تعذّر الحفظ على الجهاز. قد تكون الذاكرة ممتلئة أو التصفّح خاصًّا.'); return false; }
  }
  const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function data(id){ return DB.d[id] || (DB.d[id] = {mem: [], rev: {}, sess: [], mis: {}}); }

  // المحفوظ كمصفوفة بتات للحساب السريع
  function mem(id){
    if (memCache[id]) return memCache[id];
    const m = new Uint8Array(Q.TOTAL_AYAT);
    data(id).mem.forEach(([a, b]) => m.fill(1, a, b + 1));
    return memCache[id] = m;
  }
  function setMem(id, a, b, val){
    const m = mem(id); m.fill(val ? 1 : 0, a, b + 1);
    const ranges = []; let s = -1;
    for (let i = 0; i <= m.length; i++){
      if (i < m.length && m[i]){ if (s < 0) s = i; }
      else if (s >= 0){ ranges.push([s, i - 1]); s = -1; }
    }
    data(id).mem = ranges; save();
  }

  return {
    get DB(){ return DB; }, save, today, data, mem, setMem,
    profiles: () => DB.profiles,
    profile: id => DB.profiles.find(p => p.id === id),
    get cur(){ return DB.cur && DB.profiles.find(p => p.id === DB.cur) ? DB.cur : null; },
    set cur(id){ DB.cur = id; save(); },
    addProfile(name, color){ const p = {id: uid(), name, color, created: Date.now()}; DB.profiles.push(p); data(p.id); save(); return p; },
    removeProfile(id){ DB.profiles = DB.profiles.filter(p => p.id !== id); delete DB.d[id]; delete memCache[id]; if (DB.cur === id) DB.cur = null; save(); },
    pref(k, d){ return k in DB.prefs ? DB.prefs[k] : d; },
    setPref(k, v){ DB.prefs[k] = v; save(); },
    exportJSON: () => JSON.stringify(DB),
    importJSON(txt){
      const x = JSON.parse(txt);
      if (!x || x.v !== 1 || !Array.isArray(x.profiles)) throw new Error('bad');
      DB = x; Object.keys(memCache).forEach(k => delete memCache[k]); save();
    }
  };
})();
