// اختبارات «حلقة البيت» الآلية: خادم محلي + Chrome بلا واجهة عبر CDP، والحالات تُنفَّذ داخل الصفحة.
// الاستعمال: node tests/run.js      (يخرج بـ 1 إن فشل شيء)
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const {spawn} = require('child_process');
const ROOT = path.join(__dirname, '..');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json',
               '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json'};
const sleep = ms => new Promise(r => setTimeout(r, ms));

function serve(){
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, p);
      fs.readFile(f, (e, d) => { if (e){ r.writeHead(404); return r.end(); } r.writeHead(200, {'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store'}); r.end(d); });
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

// عميل CDP صغير فوق WebSocket المدمج في Node
function cdp(wsUrl){
  const ws = new WebSocket(wsUrl); let id = 0; const pend = new Map(), handlers = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)){ const {res, rej} = pend.get(m.id); pend.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } else handlers.forEach(h => h(m)); };
  return new Promise((res, rej) => {
    ws.onopen = () => res({
      send: (method, params = {}) => new Promise((r2, j2) => { const i = ++id; pend.set(i, {res: r2, rej: j2}); ws.send(JSON.stringify({id: i, method, params})); }),
      on: h => handlers.push(h), close: () => ws.close()
    });
    ws.onerror = rej;
  });
}

(async () => {
  const srv = await serve(), port = srv.address().port;
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'halaqa-test-'));
  const dbg = 9300 + Math.floor(Math.random() * 400);
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${dbg}`, `--user-data-dir=${prof}`,
    '--no-first-run', '--autoplay-policy=no-user-gesture-required', 'about:blank'], {stdio: 'ignore'});
  let ver = null;
  for (let k = 0; k < 50 && !ver; k++){ await sleep(200); ver = await fetch(`http://127.0.0.1:${dbg}/json/list`).then(r => r.json()).catch(() => null); }
  const page = ver.find(t => t.type === 'page');
  const c = await cdp(page.webSocketDebuggerUrl);
  const errors = [];
  c.on(m => {
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception ? m.params.exceptionDetails.exception.description : m.params.exceptionDetails.text);
  });
  await c.send('Runtime.enable');
  await c.send('Page.enable');
  await c.send('Emulation.setDeviceMetricsOverride', {width: 390, height: 844, deviceScaleFactor: 1, mobile: true});
  await c.send('Page.navigate', {url: `http://127.0.0.1:${port}/?test#/`});
  // انتظار تحميل المصحف والبدء
  for (let k = 0; k < 100; k++){
    await sleep(200);
    const r = await c.send('Runtime.evaluate', {expression: 'typeof Q !== "undefined" && !!Q.totalWords && typeof route === "function"', returnByValue: true});
    if (r.result.value) break;
  }
  const cases = fs.readFileSync(path.join(__dirname, 'cases.js'), 'utf8');
  const r = await c.send('Runtime.evaluate', {expression: cases, awaitPromise: true, returnByValue: true, timeout: 120000});
  c.close(); chrome.kill(); srv.close();
  try { fs.rmSync(prof, {recursive: true, force: true}); } catch(e){}
  if (r.exceptionDetails){ console.error('✗ تعذّر تشغيل الحالات:', r.exceptionDetails.exception && r.exceptionDetails.exception.description); process.exit(1); }
  const res = r.result.value;
  let fail = 0;
  res.forEach(t => { console.log(`${t.ok ? '✓' : '✗'} ${t.name}${t.ok ? '' : '\n    ' + t.err}`); if (!t.ok) fail++; });
  // أخطاء الصفحة غير الملتقطة (أثناء الحالات أو عرض الشاشات)
  const pageErr = errors.filter(e => !/firebase|network|Failed to fetch|auth\//i.test(e));
  if (pageErr.length){ console.log('✗ أخطاء في الصفحة:\n    ' + pageErr.join('\n    ')); fail++; }
  console.log(`\n${res.length - (fail && !pageErr.length ? fail : fail - (pageErr.length ? 1 : 0))} من ${res.length} نجحت${pageErr.length ? '، وفي الصفحة أخطاء' : ''}`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
