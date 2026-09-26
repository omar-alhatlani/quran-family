/* حلقة البيت · boot.js — جزء من الواجهة (ملفّات js/ui تُحمَّل بالترتيب في index.html وتتشارك النطاق العام) */
/* ================= البدء ================= */
(async function boot(){
  try { await Q.load(); }
  catch(e){ app.innerHTML = '<p class="warn">تعذّر تحميل المصحف. تأكّد من الاتصال بالإنترنت ثم أعد فتح الصفحة.</p>'; return; }
  // لا ننتظر السحابة أكثر من ٤ ثوانٍ؛ البرنامج يعمل على الجهاز ثم يتزامن
  await Promise.race([Cloud.init().catch(() => {}), new Promise(r => setTimeout(r, 4000))]);
  route();
  // تحديثات السحابة (أفراد جدد، تعديلات من أجهزة أخرى) تُعرض إلا أثناء التسميع والخريطة
  Cloud.subscribe(() => { if (!/^#\/(tasmee|map|listen|goal|ask|majlis)/.test(location.hash)) route(true); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
