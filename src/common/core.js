/* 모든 단원이 함께 쓰는 도구: 입체 화면(Three.js), 그래프, 해 볼 일, 장 넘기기, 선생님 따라 넘기기.
   단원 파일은 const { ... } = window.Lesson 으로 꺼내 쓰고, 마지막에 Lesson.start(parts)를 부른다. */
window.Lesson = (function () {
  'use strict';
  const T = window.THREE;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  // 움직임 줄이기: 기기 설정(prefers-reduced-motion) 또는 화면의 «움직임 멈추기» 단추. 단원 코드는 L.reduce 로 매번 읽는다
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let still = false;
  try { still = window.localStorage.getItem('lesson:still') === '1'; } catch (e) { still = false; }
  const calm = () => motionQuery.matches || still;
  const rootCss = getComputedStyle(document.documentElement);
  const tok = (k) => rootCss.getPropertyValue('--' + k).trim();
  const DEG = Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const FONT = '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

  /* ---------- 입체 화면 공용 ---------- */
  function makeView(canvas, o) {
    const wrap = canvas.parentElement;
    let renderer = null;
    try { renderer = T && new T.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { renderer = null; }
    if (!renderer) { wrap.classList.add('no3d'); return null; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(o.fov || 38, 1, 0.1, 300);
    const v = { yaw: o.yaw, pitch: o.pitch, dist: o.dist };
    const target = new T.Vector3(o.target[0], o.target[1], o.target[2]);
    let w = 0, h = 0, active = false, raf = 0, last = 0, frame = null;

    function fit() {
      const cw = wrap.clientWidth, ch = wrap.clientHeight;
      if (!cw || !ch || (cw === w && ch === h)) return;
      w = cw; h = ch;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    function place() {
      const p = v.pitch * DEG, y = v.yaw * DEG;
      const d = v.dist * Math.max(1, (o.aspect || 1.5) / camera.aspect);   // 좁은 화면에서는 물러난다
      camera.position.set(target.x + d * Math.cos(p) * Math.sin(y), target.y + d * Math.sin(p), target.z + d * Math.cos(p) * Math.cos(y));
      camera.lookAt(target);
    }
    function tick(t) {
      if (!active) return;
      const dt = Math.min(0.05, (t - last) / 1000 || 0);
      last = t;
      fit();
      if (frame) frame(dt);
      place();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    }
    let drag = null;
    canvas.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX, y: e.clientY, yaw: v.yaw, pitch: v.pitch };
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* 일부 기기 */ }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!drag) return;
      v.yaw = drag.yaw - (e.clientX - drag.x) * 0.4;
      v.pitch = clamp(drag.pitch + (e.clientY - drag.y) * 0.3, o.pmin || 6, o.pmax || 82);
    });
    const end = () => { drag = null; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      v.dist = clamp(v.dist * (1 + Math.sign(e.deltaY) * 0.08), o.min, o.max);
    }, { passive: false });

    return {
      scene, camera, renderer,
      onFrame(f) { frame = f; },
      setActive(on) {
        if (on === active) return;
        active = on;
        if (on) { last = performance.now(); raf = requestAnimationFrame(tick); } else cancelAnimationFrame(raf);
      },
    };
  }

  // 글자 딱지(항상 화면을 향한다)
  function label(text, o) {
    o = o || {};
    const px = 56, c = document.createElement('canvas'), g = c.getContext('2d');
    const tex = new T.CanvasTexture(c);
    const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sp.renderOrder = 10;
    const size = o.size || 0.55;
    sp.set = function (t) {
      g.font = '700 ' + px + 'px ' + FONT;
      const tw = Math.ceil(g.measureText(t).width);
      const cw = o.round ? px * 1.7 : tw + px * 0.9, chh = px * 1.7;
      c.width = cw; c.height = chh;
      if (o.bg) {
        g.fillStyle = o.bg;
        const r = chh / 2;
        g.beginPath(); g.moveTo(r, 0); g.arcTo(cw, 0, cw, chh, r); g.arcTo(cw, chh, 0, chh, r); g.arcTo(0, chh, 0, 0, r); g.arcTo(0, 0, cw, 0, r); g.closePath(); g.fill();
      }
      g.font = '700 ' + px + 'px ' + FONT;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = o.color || '#14273d';
      g.fillText(t, cw / 2, chh / 2 + px * 0.06);
      tex.needsUpdate = true;
      sp.scale.set(size * cw / chh, size, 1);
    };
    sp.set(text);
    return sp;
  }
  function glowSprite(color, size) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 6, 64, 64, 64);
    gr.addColorStop(0, color); gr.addColorStop(0.35, color + 'aa'); gr.addColorStop(1, color + '00');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false }));
    sp.scale.set(size, size, 1);
    return sp;
  }
  function line(points, color, opacity) {
    const geo = new T.BufferGeometry().setFromPoints(points);
    return new T.Line(geo, new T.LineBasicMaterial({ color, transparent: opacity < 1, opacity: opacity == null ? 1 : opacity }));
  }
  const V3 = (x, y, z) => new T.Vector3(x, y, z);
  function ring(r, y, n) {
    const pts = [];
    for (let i = 0; i <= (n || 96); i++) { const a = i / (n || 96) * Math.PI * 2; pts.push(V3(Math.cos(a) * r, y, Math.sin(a) * r)); }
    return pts;
  }

  /* ---------- 평면 무대: 800×500 칸에 그리고 화면에 맞춰 줄인다 ---------- */
  function flat(cv, draw, onTap) {
    const g = cv.getContext('2d');
    let active = false, raf = 0, last = 0, t = 0, k = 1, ox0 = 0, oy0 = 0;
    function paint(dt) {
      const w = cv.clientWidth, h = cv.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      k = Math.min(w / 800, h / 500); ox0 = (w - 800 * k) / 2; oy0 = (h - 500 * k) / 2;
      g.translate(ox0, oy0); g.scale(k, k);
      g.lineCap = 'round'; g.lineJoin = 'round';
      draw(g, t, dt || 0);
    }
    function frame(now) {
      if (!active) return;
      const dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now; t += dt;
      paint(dt);
      raf = requestAnimationFrame(frame);
    }
    if (onTap) cv.addEventListener('click', (e) => {
      const r = cv.getBoundingClientRect();
      onTap((e.clientX - r.left - ox0) / k, (e.clientY - r.top - oy0) / k);
    });
    return {
      setActive(on) {
        if (on === active) return;
        active = on;
        if (on) { last = performance.now(); raf = requestAnimationFrame(frame); } else cancelAnimationFrame(raf);
      },
    };
  }

  // 둥근 네모 길(채우거나 테두리를 그리기 전에 부른다)
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  // 캔버스 글자. align 기본은 가운데
  function text(g, s, x, y, size, color, align) { g.font = '700 ' + (size || 18) + 'px ' + FONT; g.fillStyle = color || tok('ink'); g.textAlign = align || 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y); }
  // 받침에 맞춰 조사를 고른다: josa('깡통', '이', '가') → '깡통이'
  const josa = (w, a, b) => w + ((w.charCodeAt(w.length - 1) - 0xAC00) % 28 ? a : b);

  /* ---------- 그래프 공용 ---------- */
  function plot(cv, draw) {
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    g.font = '600 12px ' + FONT;
    g.lineJoin = 'round'; g.lineCap = 'round';
    draw(g, w, h);
  }
  function series(g, pts, color) {
    if (!pts.length) return;
    g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 2.5;
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
    pts.forEach((p) => { g.beginPath(); g.arc(p[0], p[1], 4, 0, Math.PI * 2); g.fill(); });
  }
  function gridY(g, x0, x1, ys) {
    g.strokeStyle = tok('line'); g.lineWidth = 1;
    ys.forEach((y) => { g.beginPath(); g.moveTo(x0, Math.round(y) + 0.5); g.lineTo(x1, Math.round(y) + 0.5); g.stroke(); });
  }

  // 해 볼 일 표시: n번까지 마침
  function todo(root, n) {
    const items = $$('.todo li', root);
    items.forEach((li, i) => li.classList.toggle('done', i < n));
    const learn = $('.learn', root);
    if (!learn) return;
    const slide = root.closest('.slide') || root, pr = $('.predict', slide);
    const picked = !pr || !!pr.dataset.picked;
    learn.classList.toggle('open', n >= items.length && picked);
    if (pr && picked) {
      let mine = $('.mine', learn);
      if (!mine) { mine = document.createElement('span'); mine.className = 'mine'; learn.appendChild(mine); }
      const v = pr.dataset.picked, btn = $('.opt[data-v="' + v + '"]', pr);
      mine.textContent = v === 'skip' ? '예상을 고르지 않고 해 봤어요.'
        : '내 예상 «' + (btn ? btn.textContent : '') + '» → ' + (v === pr.dataset.answer ? '예상과 같았어요.' : '예상과 달랐어요. 무엇이 달랐는지 이야기해 봐요.');
    }
  }

  /* ---------- 예상하기 ----------
     체험 장의 .side 맨 위 <div class="predict" data-answer="정답 data-v">. 고르기 전에는 무대(.stage)를 가림막이 덮는다.
     고른 뒤에는 바꿀 수 없다(먼저 생각하고 확인하는 차례를 지키려고). «예상 없이 해 보기»로 건너뛸 수 있다. */
  function predict(slide) {
    const pr = $('.predict', slide), stage = $('.stage', slide);
    if (!pr) return;
    const btns = $$('.opt', pr), note = $('.pr', pr);
    let veil = null;
    if (stage) {
      veil = document.createElement('div');
      veil.className = 'veil';
      veil.innerHTML = '<p>먼저 예상해 보세요</p><span>«예상해 보기»에서 하나를 골라요</span><button type="button" class="skip">예상 없이 해 보기</button>';
      stage.appendChild(veil);
      // 좁은 화면에서는 예상하기가 아래에 있으니 가림막을 누르면 그리로 데려간다
      veil.addEventListener('click', (e) => { if (!e.target.closest('.skip')) pr.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'center' }); });
    }
    const pick = (v) => {
      pr.dataset.picked = v;
      btns.forEach((b) => { b.setAttribute('aria-pressed', String(b.dataset.v === v)); b.disabled = true; });
      if (note) note.textContent = v === 'skip' ? '예상하지 않고 시작했어요.' : '골랐어요. 이제 직접 해 보며 확인해요.';
      pr.classList.add('done');
      if (veil) veil.remove();
      slide.dispatchEvent(new CustomEvent('predicted', { detail: v }));
    };
    btns.forEach((b) => b.addEventListener('click', () => pick(b.dataset.v)));
    if (veil) $('.skip', veil).addEventListener('click', () => pick('skip'));
  }

  /* ---------- 도전과 도장 ----------
     <div class="challenge"><b>도전</b><p>목표</p></div>. 조각이 목표를 이루었을 때 stamp(root)를 부른다.
     도장은 이 기기에 남고(단원마다), 위쪽 차례 단추에 ✓가 붙는다. 시연 중에는 찍히지 않는다. */
  const STAMP_KEY = 'stamps:' + document.title;
  let stamps = {};
  try { stamps = JSON.parse(window.localStorage.getItem(STAMP_KEY) || '{}') || {}; } catch (e) { stamps = {}; }
  const stampHooks = [];
  function paintStamp(slide) {
    const ch = $('.challenge', slide), on = !!stamps[slide.dataset.name];
    if (ch) {
      ch.classList.toggle('done', on);
      let mark = $('.stamp', ch);
      if (on && !mark) { mark = document.createElement('span'); mark.className = 'stamp'; mark.textContent = '참 잘했어요'; ch.appendChild(mark); }
      if (!on && mark) mark.remove();
    }
    stampHooks.forEach((f) => f());
  }
  function stamp(root) {
    if (demoing) return;
    const slide = root.closest('.slide') || root, n = slide.dataset.name;
    if (stamps[n]) return;
    stamps[n] = 1;
    try { window.localStorage.setItem(STAMP_KEY, JSON.stringify(stamps)); } catch (e) { /* 이 기기에만 못 남김 */ }
    paintStamp(slide);
    const ch = $('.challenge', slide);
    if (ch && !calm()) { ch.classList.remove('pop'); void ch.offsetWidth; ch.classList.add('pop'); }
    if (ch) ch.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'nearest' });   // 오른쪽 칸 아래에 있어도 도장이 보이게
  }
  function clearStamps() {
    stamps = {};
    try { window.localStorage.removeItem(STAMP_KEY); } catch (e) { /* 그대로 */ }
    $$('.slide').forEach(paintStamp);
  }

  /* ---------- 시연(보여 주기) ----------
     demo(root, [[말, async (d) => { … }], …]). .ctrl 의 <button class="btn" data-demo> 를 누르면 차례대로 실행한다.
     d.slide(막대, 값, 밀리초) · d.press(단추) · d.wait(밀리초). 화면 위에 «1/4 말»이 뜬다.
     다시 누르거나, 사람이 무대를 만지거나, 장을 떠나면 멈춘다. */
  let demoing = false;
  const demoStops = [];
  function demo(root, steps) {
    const btn = $('[data-demo]', root), view = $('.view', root);
    if (!btn) return { stop() {} };
    const say = document.createElement('p');
    say.className = 'demo-say'; say.hidden = true; say.setAttribute('aria-live', 'polite');
    if (view) view.appendChild(say);
    let run = 0;
    const label = btn.textContent;
    function stop() {
      run++;
      demoing = false;
      btn.textContent = label; btn.setAttribute('aria-pressed', 'false');
      say.hidden = true;
    }
    demoStops.push(stop);
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', async () => {
      if (btn.getAttribute('aria-pressed') === 'true') { stop(); return; }
      demoStops.forEach((f) => f());
      const id = ++run;
      demoing = true;
      btn.textContent = '■ 멈추기'; btn.setAttribute('aria-pressed', 'true');
      say.hidden = false;
      const alive = () => { if (id !== run) throw new Error('stop'); };
      const wait = (ms) => new Promise((ok, no) => setTimeout(() => (id === run ? ok() : no(new Error('stop'))), ms));
      const d = {
        wait,
        press(el) { alive(); if (el && !el.disabled) el.click(); },
        async slide(el, to, ms) {
          alive();
          const from = +el.value, n = calm() ? 1 : Math.max(1, Math.round((ms || 1500) / 40));
          for (let i = 1; i <= n; i++) {
            el.value = from + (to - from) * i / n;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            if (i < n) await wait(40);
          }
        },
      };
      try {
        for (let i = 0; i < steps.length; i++) {
          say.textContent = (i + 1) + '/' + steps.length + '  ' + steps[i][0];
          await steps[i][1](d);
          await wait(1600);
        }
      } catch (e) { /* 멈춤 */ }
      if (id === run) stop();
    });
    // 사람이 무대나 조작 칸을 직접 만지면 시연을 멈춘다(프로그램이 누르는 것은 pointerdown이 없다)
    root.addEventListener('pointerdown', (e) => { if (btn.getAttribute('aria-pressed') === 'true' && !btn.contains(e.target)) stop(); }, true);
    return { stop };
  }
  // 고르는 물음: 맞히면 done(true)
  function ask(box, right, done) {
    const btns = $$('.opt', box);
    btns.forEach((b) => b.addEventListener('click', () => {
      const ok = b.dataset.v === right;
      btns.forEach((x) => x.classList.remove('wrong'));
      b.classList.add(ok ? 'right' : 'wrong');
      if (ok) btns.forEach((x) => { x.disabled = x !== b; });
      done(ok);
    }));
  }

  // OX 문제 묶음. 다 풀면 점수를 보여 준다
  function ox(root) {
    const items = $$('.ox li', root), score = $('.score', root);
    let right = 0, doneN = 0;
    items.forEach((li) => {
      const btns = $$('.bt button', li);
      let first = true;
      btns.forEach((b) => b.addEventListener('click', () => {
        const ok = b.dataset.v === li.dataset.a;
        btns.forEach((x) => x.classList.remove('wrong', 'right'));
        b.classList.add(ok ? 'right' : 'wrong');
        if (first) { first = false; doneN++; if (ok) right++; }
        if (ok) { $('.why', li).hidden = false; btns.forEach((x) => { x.disabled = true; }); }
        score.textContent = doneN < items.length ? doneN + '문제 풀었어요.' : '처음에 맞힌 문제: ' + right + ' / ' + items.length;
      }));
    });
  }

  /* ---------- 핵심 낱말 ----------
     장의 .head 에 <div class="words"><button type="button" class="word" data-def="뜻">낱말</button>…</div>.
     누르면 뜻이 말풍선으로 뜬다. 모든 장의 낱말을 모아 «낱말 모음»을 만든다. */
  function words(slides, go) {
    $$('.words').forEach((box) => {
      const tip = document.createElement('p');
      tip.className = 'worddef'; tip.hidden = true; tip.setAttribute('role', 'status');
      box.appendChild(tip);
      $$('.word', box).forEach((w) => {
        w.setAttribute('aria-expanded', 'false');
        w.addEventListener('click', (e) => {
          e.stopPropagation();
          const open = w.getAttribute('aria-expanded') !== 'true';
          $$('.word', box).forEach((x) => x.setAttribute('aria-expanded', 'false'));
          w.setAttribute('aria-expanded', String(open));
          tip.hidden = !open;
          if (open) { tip.textContent = w.textContent.trim() + ': ' + w.dataset.def; tip.style.left = Math.max(0, w.offsetLeft) + 'px'; }
        });
      });
    });
    document.addEventListener('click', () => {
      $$('.worddef').forEach((t) => { t.hidden = true; });
      $$('.word').forEach((w) => w.setAttribute('aria-expanded', 'false'));
    });

    const btn = $('#glossBtn');
    if (!btn) return;
    const all = new Map();
    slides.forEach((s, i) => $$('.word', s).forEach((w) => {
      const t = w.textContent.trim();
      if (!all.has(t)) all.set(t, { def: w.dataset.def, at: [] });
      if (!all.get(t).at.includes(i)) all.get(t).at.push(i);
    }));
    if (!all.size) { btn.hidden = true; return; }
    const esc = (x) => String(x).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m]);
    const panel = document.createElement('div');
    panel.className = 'gloss'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', '낱말 모음');
    const items = Array.from(all.entries()).sort((a, b) => a[0].localeCompare(b[0], 'ko'));
    panel.innerHTML = '<div class="gin"><div class="ghead"><h2>낱말 모음</h2><button type="button" class="btn" data-close>닫기</button></div><dl>' +
      items.map(([t, v]) => '<div class="gitem"><dt>' + esc(t) + '</dt><dd>' + esc(v.def) + '<span class="at">' +
        v.at.map((i) => '<button type="button" data-go="' + i + '">' + (i + 1) + ' ' + esc(slides[i].dataset.label) + '</button>').join('') + '</span></dd></div>').join('') +
      '</dl></div>';
    document.body.appendChild(panel);
    const close = () => { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.focus(); };
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', () => { panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); $('[data-close]', panel).focus(); });
    panel.addEventListener('click', (e) => {
      if (e.target === panel || e.target.closest('[data-close]')) { close(); return; }
      const g = e.target.closest('[data-go]');
      if (g) { close(); go(+g.dataset.go, true); }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) close(); });
  }

  function start(parts) {
  /* ---------- 넘기기 ---------- */
  const slides = $$('.slide'), names = slides.map((s) => s.dataset.name), live = {};
  const steps = $('#steps'), prevB = $('#prev'), nextB = $('#next'), posEl = $('#pos');
  let idx = -1;
  let onGo = function () {};
  slides.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = '<i>' + (i + 1) + '</i><span>' + s.dataset.label + '</span>';
    b.setAttribute('aria-label', (i + 1) + '장 ' + s.dataset.label);
    b.addEventListener('click', () => go(i, true));
    steps.appendChild(b);
    predict(s);
  });
  // 도장: 차례 단추의 ✓, 확인 장의 «받은 도장» 칸
  const withChallenge = slides.filter((s) => $('.challenge', s));
  stampHooks.push(() => {
    slides.forEach((s, k) => $$('button', steps)[k].classList.toggle('stamped', !!stamps[s.dataset.name]));
    const sum = $('#stampSum');
    if (sum) {
      const got = withChallenge.filter((s) => stamps[s.dataset.name]);
      sum.textContent = got.length + ' / ' + withChallenge.length + (got.length ? ' · ' + got.map((s) => s.dataset.label).join(', ') : '');
    }
  });
  slides.forEach(paintStamp);
  const clr = $('#stampClear');
  if (clr) {
    let armed = 0;
    clr.addEventListener('click', () => {
      if (!armed) { clr.textContent = '한 번 더 누르면 지워요'; armed = setTimeout(() => { armed = 0; clr.textContent = '도장 지우기'; }, 3000); return; }
      clearTimeout(armed); armed = 0; clr.textContent = '도장 지우기';
      clearStamps();
    });
  }
  function go(i, push) {
    i = clamp(i, 0, slides.length - 1);
    if (i === idx) return;
    if (idx >= 0 && live[names[idx]]) live[names[idx]].setActive(false);
    demoStops.forEach((f) => f());
    idx = i;
    slides.forEach((s, k) => { s.hidden = k !== i; });
    $$('button', steps).forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
    prevB.disabled = i === 0; nextB.disabled = i === slides.length - 1;
    posEl.textContent = (i + 1) + ' / ' + slides.length;
    $('#deck').scrollTop = 0;
    const n = names[i];
    if (!live[n] && parts[n]) live[n] = parts[n](slides[i]);
    if (live[n]) live[n].setActive(true);
    if (push) { try { window.location.hash = n; } catch (e) { /* 미리 보기 */ } }
    onGo(n);
    seen(n);
  }
  prevB.addEventListener('click', () => go(idx - 1, true));
  nextB.addEventListener('click', () => go(idx + 1, true));
  document.addEventListener('keydown', (e) => {
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { go(idx + 1, true); e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { go(idx - 1, true); e.preventDefault(); }
  });
  /* 움직임 멈추기: 이 기기에 기억한다. 계속 도는 그림과 흐르는 점이 멈추고, 바뀐 결과는 그대로 보인다 */
  const stillBtn = $('#stillBtn');
  const paintStill = () => {
    document.body.classList.toggle('still', still);
    if (stillBtn) { stillBtn.setAttribute('aria-pressed', String(still)); stillBtn.textContent = still ? '움직임 켜기' : '움직임 멈추기'; }
  };
  if (stillBtn) stillBtn.addEventListener('click', () => {
    still = !still;
    try { window.localStorage.setItem('lesson:still', still ? '1' : '0'); } catch (e) { /* 이번만 */ }
    paintStill();
  });
  paintStill();
  words(slides, go);

  /* 이어 보기: 마지막으로 본 장을 이 기기에 기억하고, 다음에 처음부터 열면 이어 볼지 묻는다 */
  const LAST = 'last:' + document.title;
  let last = '';
  try { last = window.localStorage.getItem(LAST) || ''; } catch (e) { last = ''; }
  let resume = null;
  function seen(n) {                                        // go() 가 장을 넘길 때마다 부른다
    try { window.localStorage.setItem(LAST, n); } catch (e) { /* 기억 못 함 */ }
    if (resume && n !== names[0]) { resume.remove(); resume = null; }
  }
  const fromHash = () => Math.max(0, names.indexOf((window.location.hash || '').slice(1)));
  window.addEventListener('hashchange', () => go(fromHash(), false));
  window.addEventListener('resize', () => { const p = live[names[idx]]; if (p && p.refresh) p.refresh(); });
  const memoBtn = $('#memoBtn');
  memoBtn.addEventListener('click', () => {
    const on = document.body.classList.toggle('memo-on');
    memoBtn.setAttribute('aria-pressed', String(on));
  });
  go(fromHash(), false);
  if (!window.location.hash && !/[?&]room=/.test(window.location.search) && names.indexOf(last) > 0) {
    const k = names.indexOf(last);
    resume = document.createElement('div');
    resume.className = 'resume'; resume.setAttribute('role', 'status');
    resume.innerHTML = '<span>지난번에 <b></b>까지 봤어요.</span><button type="button" class="btn go" data-act="go">이어 보기</button><button type="button" class="btn" data-act="no">처음부터</button>';
    $('b', resume).textContent = (k + 1) + ' ' + slides[k].dataset.label;
    resume.addEventListener('click', (e) => {
      const a = e.target.closest('[data-act]');
      if (!a) return;
      const r = resume; resume = null; r.remove();
      if (a.dataset.act === 'go') go(k, true);
    });
    $('.app').appendChild(resume);
  }

  /* ---------- 선생님 따라 넘기기 ----------
     진행하는 기기가 지금 장을 공유 저장소에 적고, 다른 기기는 그것을 지켜보다 따라 넘긴다.
     저장소는 두 가지 중 있는 것을 쓴다.
       수업방(window.LessonRoom, 웹에 올린 판): 선생님이 구글로 로그인해 방을 열고, 학생은 참여 코드로 로그인 없이 들어온다.
       claude.ai 공유 저장소: 로그인한 사람끼리만 된다.
     둘 다 없으면(파일로 열기) 단추가 나타나지 않는다. */
    async function claudeStore() {
      if (!window.claude || !window.claude.use) return null;
      let db = null, user = null;
      try { db = await window.claude.use('db'); user = await window.claude.use('user'); } catch (e) { db = null; }
      if (!db) return null;
      let canLead = false;
      try { canLead = user ? await user.canEdit() : false; } catch (e) { canLead = false; }
      const me = Math.random().toString(36).slice(2, 10), ref = db.doc('live/state');
      let busy = Promise.resolve();
      const put = (d) => { busy = busy.then(() => ref.set(d)).catch(() => {}); };
      return {
        canLead, me, leadLabel: '수업 진행',
        open: async () => '',
        close: (slide) => put({ on: false, slide, by: me }),
        write: (slide) => put({ on: true, slide, by: me }),
        watch: (cb, fail) => ref.onSnapshot((snap) => cb(snap.exists ? snap.data() : null), fail),
      };
    }
    (async function follow() {
      let store = null;
      try { store = window.LessonRoom ? await window.LessonRoom.connect() : await claudeStore(); } catch (e) { store = null; }
      if (!store) return;
      const leadBtn = $('#leadBtn'), followBtn = $('#followBtn'), codeEl = $('#roomCode');
      let leading = false, following = true, remote = null, code = '';
      function paint() {
        leadBtn.hidden = !store.canLead;
        leadBtn.setAttribute('aria-pressed', String(leading));
        leadBtn.textContent = leading ? '수업 진행 중 · 끝내기' : store.leadLabel;
        if (codeEl) { codeEl.hidden = !(leading && code); codeEl.textContent = code ? '참여 코드 ' + code.slice(0, 3) + ' ' + code.slice(3) : ''; }
        const live = !!(remote && remote.on && !leading);
        followBtn.hidden = !live;
        followBtn.setAttribute('aria-pressed', String(following));
        followBtn.textContent = following ? '선생님 따라가는 중' : '따로 보는 중 · 따라가기';
      }
      onGo = (n) => { if (leading) store.write(n); };
      leadBtn.addEventListener('click', async () => {
        if (leading) { leading = false; store.close(names[idx]); paint(); return; }
        leadBtn.disabled = true;
        try { code = (await store.open(names[idx])) || ''; leading = true; store.write(names[idx]); }
        catch (e) { leadBtn.textContent = '열지 못했어요 · 다시 누르기'; leadBtn.disabled = false; return; }
        leadBtn.disabled = false;
        paint();
      });
      followBtn.addEventListener('click', () => {
        following = !following;
        if (following && remote && remote.on) go(Math.max(0, names.indexOf(remote.slide)), false);
        paint();
      });
      store.watch((d) => {
        remote = d && typeof d.slide === 'string' ? d : null;
        if (remote && remote.on && remote.by !== store.me) {
          leading = false;                                 // 다른 기기가 진행을 맡았다
          if (following && names.indexOf(remote.slide) >= 0) go(names.indexOf(remote.slide), false);
        }
        paint();
      }, () => { leadBtn.hidden = true; followBtn.hidden = true; });
      paint();
    })();
  }

  return { T, $, $$, get reduce() { return calm(); }, tok, DEG, clamp, FONT, makeView, label, glowSprite, line, V3, ring, flat, rr, text, josa, plot, series, gridY, todo, ask, ox, stamp, demo, start };
})();
