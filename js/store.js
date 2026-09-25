/* التخزين على الجهاز (localStorage)، وهو نسخة العمل الفورية؛ والسحابة (cloud.js) تزامنه.
   لكل فرد:
   mem:  مديات الآيات المحفوظة [[أول، آخر]] بفهرس المصحف (٠–٦٢٣٥)
   rev:  آخر تسميع لكل آية {فهرس: [اليوم، عدد الأخطاء]}
   sess: سجلّ جلسات التسميع (لكل جلسة id)
   mis:  مواضع الأخطاء {رقم الكلمة في المصحف: عدد مرات الخطأ}
   up:   وقت آخر تعديل (للمقارنة مع نسخة السحابة) */
const Store = (() => {
  const KEY = 'qf1';
  let DB;
  try { DB = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch(e){ DB = null; }
  if (!DB || DB.v !== 1) DB = {v: 1, profiles: [], cur: null, d: {}, prefs: {}};
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  const memCache = {};
  const hooks = {changed(){}, session(){}};   // تضبطها cloud.js
  function save(){
    try { localStorage.setItem(KEY, JSON.stringify(DB)); return true; }
    catch(e){ alert('تعذّر الحفظ على الجهاز. قد تكون الذاكرة ممتلئة أو التصفّح خاصًّا.'); return false; }
  }
  const today = () => Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 864e5);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  function data(id){ return DB.d[id] || (DB.d[id] = {mem: [], rev: {}, sess: [], mis: {}, up: 0}); }
  // تعديل محلّي: يُحفظ ويُبلَّغ للمزامنة
  function touch(id){ data(id).up = Date.now(); save(); hooks.changed(id); }

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
    data(id).mem = ranges; touch(id);
  }

  return {
    get DB(){ return DB; }, hooks, save, today, uid, data, mem, setMem, touch,
    profiles: () => DB.profiles,
    profile: id => DB.profiles.find(p => p.id === id),
    get cur(){ return DB.cur && DB.profiles.find(p => p.id === DB.cur) ? DB.cur : null; },
    set cur(id){ DB.cur = id; save(); },
    addProfile(name, color, id = uid()){
      const p = {id, name, color, created: Date.now()}; DB.profiles.push(p); data(p.id); touch(p.id); return p;
    },
    removeProfile(id){ DB.profiles = DB.profiles.filter(p => p.id !== id); delete DB.d[id]; delete memCache[id]; if (DB.cur === id) DB.cur = null; save(); },
    // تغيير معرّف فرد محلّي إلى معرّفه في السحابة
    renameProfile(oldId, newId){
      const p = DB.profiles.find(x => x.id === oldId); if (!p || oldId === newId) return;
      p.id = newId; DB.d[newId] = DB.d[oldId]; delete DB.d[oldId]; delete memCache[oldId];
      if (DB.cur === oldId) DB.cur = newId; save();
    },
    // نسخة السحابة أحدث: تحلّ محلّ المحلية
    applyRemote(id, {name, color, mem: ranges, rev, mis, up}){
      let p = DB.profiles.find(x => x.id === id);
      if (!p){ p = {id, name, color, created: Date.now()}; DB.profiles.push(p); }
      p.name = name; p.color = color; p.cloud = true;
      const d = data(id);
      if ((up || 0) > (d.up || 0)){ d.mem = ranges; d.rev = rev || {}; d.mis = mis || {}; d.up = up; delete memCache[id]; }
      save();
    },
    // جلسات من السحابة تُدمج بالمعرّف
    mergeSessions(id, list){
      const d = data(id), seen = new Set(d.sess.map(s => s.id));
      list.forEach(s => { if (!seen.has(s.id)) d.sess.push(s); });
      d.sess.sort((a, b) => a.t - b.t); save();
    },
    addSession(id, rec){ const d = data(id); rec.id = rec.id || uid(); d.sess.push(rec); if (d.sess.length > 2000) d.sess.shift(); },
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
