#!/usr/bin/env node
/* 단원 하나를 묶고, 브라우저로 장마다 띄워 점검한다.
     node .claude/skills/science-lesson/scripts/check.js <단원 id> [결과 폴더]
   하는 일
     1. node build.mjs
     2. 구조 점검: 표지·체험 장·확인 장에 있어야 할 것(쪽수, 해 볼 일, 알게 된 것, 선생님 메모 …)
     3. 낱말 점검: lesson.json 의 "avoid" 낱말이 화면 글에 들어 있는지
     4. 시연 점검: 체험 장마다 예상을 고르고 «보여 주기»를 끝까지 재생해 본다(오류, 멈춤, 시간)
     5. 실행 점검: 장마다 막대를 끝까지 움직이고 단추를 모두 눌러 보며 오류·가로 넘침을 찾는다
     6. 화면 찍기: <결과 폴더>/d-<번호>-<장>-a.png(처음, 예상 전) · -demo.png(시연 중) · -b.png(눌러 본 뒤) · m-<번호>-<장>.png(휴대폰)
   오류가 있으면 끝날 때 1을 돌려준다. 찍힌 화면은 반드시 직접 열어 본다(이 스크립트는 모양을 판단하지 못한다). */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs'), cp = require('child_process');

const ROOT = path.resolve(__dirname, '../../../..');
const id = process.argv[2];
if (!id || !fs.existsSync(path.join(ROOT, 'src', id, 'lesson.json'))) {
  console.error('쓰는 법: node check.js <단원 id>   (src/<단원 id>/lesson.json 이 있어야 해요)');
  process.exit(2);
}
const out = path.resolve(process.argv[3] || path.join(ROOT, '.check', id));
fs.mkdirSync(out, { recursive: true });
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', id, 'lesson.json'), 'utf8'));
const problems = [], notes = [];
const bad = (m) => { problems.push(m); };

(async () => {
  try { cp.execFileSync('node', ['build.mjs'], { cwd: ROOT, stdio: 'pipe' }); }
  catch (e) { console.error('묶기 실패:\n' + (e.stderr || e.message)); process.exit(1); }

  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const url = 'file://' + path.join(ROOT, id, 'index.html');

  async function open(viewport, tag) {
    const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|ERR_INTERNET|fonts\.g/.test(m.text())) bad(`[${tag}] 콘솔 오류: ${m.text()}`); });
    page.on('pageerror', (e) => bad(`[${tag}] 실행 오류: ${e.message}`));
    await page.route('**/fonts.g*/**', (r) => r.abort());
    await page.goto(url);
    await page.waitForTimeout(500);
    return page;
  }

  /* ---- 구조와 낱말 ---- */
  const d = await open({ width: 1366, height: 768 }, '데스크톱');
  const lint = await d.evaluate((avoid) => {
    const res = [], info = [];
    const slides = Array.from(document.querySelectorAll('.slide'));
    const names = slides.map((s) => s.dataset.name);
    if (!slides.length) res.push('장이 하나도 없어요(.slide).');
    if (names[0] !== 'cover') res.push('첫 장은 표지(data-name="cover")여야 해요.');
    if (new Set(names).size !== names.length) res.push('data-name 이 겹쳐요: ' + names.join(', '));
    names.forEach((n) => { if (!/^[a-z][a-z0-9-]*$/.test(n || '')) res.push('data-name 은 영문 소문자·숫자·붙임표만: ' + n); });
    slides.forEach((s) => {
      const n = s.dataset.name, q = (sel) => s.querySelector(sel);
      if (!s.dataset.label) res.push(`${n}: data-label(위쪽 차례에 보이는 이름)이 없어요.`);
      if (!q('.memo')) res.push(`${n}: 선생님 메모(.memo)가 없어요.`);
      if (n === 'cover') {
        if (!q('.goals')) res.push('cover: 배울 것(.goals)이 없어요.');
        if (!q('#pred')) res.push('cover: 내 생각 고르기(#pred)가 없어요.');
      }
      if (s.classList.contains('lab')) {
        const kind = q('.kind');
        if (!kind || !/쪽/.test(kind.textContent)) res.push(`${n}: .kind 에 교과서 쪽수가 없어요(예: 체험 1 · 과학 16~19쪽 · 실험 관찰 8~11쪽).`);
        if (!q('canvas')) res.push(`${n}: 체험 장인데 캔버스가 없어요.`);
        if (q('canvas.gl') && !q('.fallback')) res.push(`${n}: 입체 화면에 대체 글(.fallback)이 없어요.`);
        const todos = s.querySelectorAll('.todo');
        if (!todos.length) res.push(`${n}: 해 볼 일(.todo)이 없어요.`);
        todos.forEach((t) => { const c = t.querySelectorAll('li').length; if (c < 2 || c > 4) res.push(`${n}: 해 볼 일은 2~4개로(지금 ${c}개).`); });
        if (!q('.learn .body')) res.push(`${n}: 알게 된 것(.learn .body)이 없어요.`);
        if (!q('.challenge')) res.push(`${n}: 도전(.challenge)이 없어요.`);
        const ws = s.querySelectorAll('.head .words .word');
        if (!ws.length) res.push(`${n}: 핵심 낱말(.head 안 .words .word)이 없어요.`);
        ws.forEach((w) => { if (!(w.dataset.def || '').trim()) res.push(`${n}: 낱말 «${w.textContent.trim()}»에 뜻(data-def)이 없어요.`); });
        if (!q('.ctrl [data-demo]')) res.push(`${n}: 보여 주기 단추(.ctrl 안 [data-demo])가 없어요.`);
        const pr = q('.predict');
        if (!pr) info.push(`${n}: 예상하기(.predict)가 없어요. 장 안에서 따로 예상을 받는 장(예: 예상 → 확인 표)이 아니면 넣어요.`);
        else {
          const vs = Array.from(pr.querySelectorAll('.opt')).map((b) => b.dataset.v);
          if (vs.length < 2 || vs.length > 3) res.push(`${n}: 예상 보기는 2~3개로(지금 ${vs.length}개).`);
          if (!vs.includes(pr.dataset.answer)) res.push(`${n}: .predict 의 data-answer(${pr.dataset.answer})가 보기의 data-v 에 없어요.`);
          if (!pr.querySelector('.pq') || !pr.querySelector('.pr')) res.push(`${n}: .predict 안에 .pq(물음)와 .pr(알림 줄)이 있어야 해요.`);
        }
        if (!q('.fine')) info.push(`${n}: 값의 출처·단순화 고지(.fine)가 없어요. 계산값·예시값을 썼다면 넣어요.`);
      }
      if (n === 'check') {
        const items = s.querySelectorAll('.ox li');
        if (items.length < 4) res.push(`check: ○× 문제가 ${items.length}개예요(4개 이상).`);
        items.forEach((li, i) => { if (!li.dataset.a || !li.querySelector('.why')) res.push(`check: ${i + 1}번 문제에 data-a 또는 .why 가 없어요.`); });
        const o = Array.from(items).filter((li) => li.dataset.a === 'o').length;
        if (items.length && (o === 0 || o === items.length)) res.push('check: 정답이 모두 ○이거나 모두 ×예요.');
        if (!q('#predBack')) res.push('check: 표지의 생각을 다시 보여 주는 칸(#predBack)이 없어요.');
        if (!q('#stampSum') || !q('#stampClear')) res.push('check: 받은 도장 칸(#stampSum, #stampClear)이 없어요.');
      }
    });
    if (names.indexOf('check') !== names.length - 1) res.push('마지막 장은 확인(data-name="check")이어야 해요.');
    ['#steps', '#prev', '#next', '#pos', '#memoBtn', '#leadBtn', '#followBtn', '#roomCode', '#glossBtn', '#stillBtn'].forEach((sel) => { if (!document.querySelector(sel)) res.push('틀에 ' + sel + ' 이 없어요(본보기의 header/footer 를 그대로 써요).'); });
    const words = document.querySelector('.app').textContent;
    (avoid || []).forEach((w) => { if (words.includes(w)) res.push(`교과서에 없는 낱말 «${w}»이 화면 글에 있어요(lesson.json avoid).`); });
    if (/TODO|__[A-Z]+__|00~00쪽/.test(words)) res.push('본보기의 빈칸(TODO, 00~00쪽 …)이 남아 있어요.');
    return { res, info, names };
  }, meta.avoid || []);
  lint.res.forEach(bad); lint.info.forEach((m) => notes.push(m));

  /* ---- 장마다 실행 ---- */
  for (let i = 0; i < lint.names.length; i++) {
    const n = lint.names[i], tag = `${i + 1}-${n}`;
    await d.click(`#steps button:nth-child(${i + 1})`);
    await d.waitForTimeout(700);
    await d.screenshot({ path: path.join(out, `d-${tag}-a.png`) });
    const sel = `.slide[data-name="${n}"]`;
    if (await d.locator(`${sel} .predict .opt`).count()) {
      await d.locator(`${sel} .predict .opt`).first().click();
      await d.waitForTimeout(200);
      if (await d.locator(`${sel} .veil`).count()) bad(`${n}: 예상을 골랐는데 가림막이 남아 있어요.`);
    } else if (await d.locator(`${sel} .veil`).count()) bad(`${n}: 예상하기가 없는데 가림막이 있어요.`);
    const demoBtn = d.locator(`${sel} [data-demo]`);
    if (await demoBtn.count()) {
      const before = problems.length, t0 = Date.now();
      await demoBtn.click();
      await d.waitForTimeout(2500);
      const sayOn = await d.locator(`${sel} .demo-say`).isVisible().catch(() => false);
      if (!sayOn) bad(`${n}: 보여 주기를 눌렀는데 설명 줄(.demo-say)이 보이지 않아요.`);
      await d.screenshot({ path: path.join(out, `d-${tag}-demo.png`) });
      let ended = false;
      while (Date.now() - t0 < 90000) { if ((await demoBtn.getAttribute('aria-pressed')) !== 'true') { ended = true; break; } await d.waitForTimeout(500); }
      const secs = Math.round((Date.now() - t0) / 1000);
      if (!ended) { bad(`${n}: 보여 주기가 90초 안에 끝나지 않아요.`); await demoBtn.click(); }
      else notes.push(`${n}: 보여 주기 ${secs}초${problems.length > before ? ' (도중에 오류)' : ''}${secs > 60 ? ' (길어요. 줄여요)' : ''}`);
      const stamped = await d.locator(`${sel} .challenge.done`).count();
      if (stamped) bad(`${n}: 보여 주기만으로 도장이 찍혔어요(시연 중에는 찍히면 안 돼요).`);
    }
    const r = await d.evaluate(async (name) => {
      const s = document.querySelector(`.slide[data-name="${name}"]`), wait = (ms) => new Promise((f) => setTimeout(f, ms));
      const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));
      const shown = (el) => !!(el.offsetWidth || el.offsetHeight) && !el.disabled;
      for (const el of s.querySelectorAll('input[type="range"]')) {
        const lo = +el.min, hi = +el.max, st = +el.step || 1, k = Math.max(1, Math.round((hi - lo) / st / 40));
        for (let v = lo; v <= hi; v += st * k) { el.value = v; fire(el, 'input'); }
        el.value = hi; fire(el, 'input'); await wait(30);
        el.value = lo + Math.round((hi - lo) / 2 / st) * st; fire(el, 'input');
      }
      let clicks = 0;
      for (let round = 0; round < 3; round++) {                 // 눌러서 새로 생긴 단추까지 세 번 돈다
        for (const b of Array.from(s.querySelectorAll('button'))) { if (clicks >= 80) break; if (!shown(b) || b.hasAttribute('data-demo')) continue; b.click(); clicks++; await wait(40); }
      }
      for (const c of s.querySelectorAll('input[type="checkbox"]')) { if (shown(c)) { c.click(); c.click(); } }
      await wait(500);
      const sideText = (s.querySelector('.side') || s).innerText.replace(/\s+/g, '').length;
      return {
        clicks, sideText, no3d: !!s.querySelector('.view.no3d'),
        todo: Array.from(s.querySelectorAll('.todo')).map((t) => t.querySelectorAll('li.done').length + '/' + t.querySelectorAll('li').length).join(' '),
        overflow: document.documentElement.scrollWidth - window.innerWidth,
      };
    }, n);
    await d.screenshot({ path: path.join(out, `d-${tag}-b.png`) });
    if (r.overflow > 0) bad(`${n}: 데스크톱에서 가로로 ${r.overflow}px 넘쳐요.`);
    if (r.no3d) notes.push(`${n}: 이 점검 브라우저에서 입체 화면이 뜨지 않았어요(대체 글이 보임). 화면을 열어 확인해요.`);
    notes.push(`${n}: 단추 ${r.clicks}번 누름 · 해 볼 일 ${r.todo || '없음'} · 오른쪽 글자 수 ${r.sideText}${r.sideText > 520 ? ' (많아요. 줄일 수 있는지 봐요)' : ''}`);
  }
  /* ---- 공통 기능: 낱말 모음 · 움직임 멈추기 · 이어 보기 ---- */
  if (await d.locator('#glossBtn').isVisible()) {
    await d.click('#glossBtn'); await d.waitForTimeout(300);
    const nItems = await d.locator('.gloss .gitem').count();
    if (!nItems) bad('낱말 모음이 비어 있어요.');
    await d.screenshot({ path: path.join(out, 'z-glossary.png') });
    await d.locator('.gloss [data-go]').first().click(); await d.waitForTimeout(400);
    if (await d.locator('.gloss').isVisible()) bad('낱말 모음에서 장으로 가도 창이 닫히지 않아요.');
    notes.push(`낱말 모음: ${nItems}개`);
  } else notes.push('낱말 모음 단추가 숨어 있어요(낱말이 하나도 없음).');
  await d.click('#stillBtn');
  if (!(await d.evaluate(() => document.body.classList.contains('still') && window.Lesson.reduce))) bad('움직임 멈추기를 눌러도 멈춤 상태가 되지 않아요(L.reduce).');
  await d.click('#stillBtn');
  await d.click('#steps button:nth-child(3)'); await d.waitForTimeout(300);
  await d.goto(url); await d.waitForTimeout(700);
  if (!(await d.locator('.resume').isVisible())) bad('다시 열었을 때 «이어 보기»가 나오지 않아요.');
  else { await d.screenshot({ path: path.join(out, 'z-resume.png') }); await d.click('.resume [data-act="go"]'); await d.waitForTimeout(300);
    const at = await d.evaluate(() => document.querySelector('.slide:not([hidden])').dataset.name);
    if (at !== lint.names[2]) bad(`이어 보기를 눌렀는데 ${lint.names[2]} 이 아니라 ${at} 장이 열렸어요.`); }
  await d.close();

  const m = await open({ width: 400, height: 800 }, '휴대폰');
  for (let i = 0; i < lint.names.length; i++) {
    await m.click(`#steps button:nth-child(${i + 1})`);
    await m.waitForTimeout(500);
    const ov = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (ov > 0) bad(`${lint.names[i]}: 휴대폰 너비에서 가로로 ${ov}px 넘쳐요.`);
    await m.screenshot({ path: path.join(out, `m-${i + 1}-${lint.names[i]}.png`) });
  }
  await browser.close();

  console.log(`\n== ${meta.label} ${meta.name} (${id}) ==`);
  notes.forEach((x) => console.log('  · ' + x));
  if (problems.length) { console.log(`\n고칠 것 ${problems.length}개`); Array.from(new Set(problems)).forEach((x) => console.log('  ✗ ' + x)); }
  else console.log('\n자동 점검 통과.');
  console.log(`\n화면: ${out}\n  d-*-a.png 처음 모습, d-*-b.png 눌러 본 뒤, m-*.png 휴대폰. 하나씩 열어 모양을 확인하세요.`);
  process.exit(problems.length ? 1 : 0);
})();
