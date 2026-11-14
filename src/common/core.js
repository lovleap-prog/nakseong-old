/* 모든 단원이 함께 쓰는 도구: 입체 화면(Three.js), 그래프, 해 볼 일, 장 넘기기, 선생님 따라 넘기기.
   단원 파일은 const { ... } = window.Lesson 으로 꺼내 쓰고, 마지막에 Lesson.start(parts)를 부른다. */
window.Lesson = (function () {
  'use strict';
  const T = window.THREE;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    if (learn) learn.classList.toggle('open', n >= items.length);
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
  });
  function go(i, push) {
    i = clamp(i, 0, slides.length - 1);
    if (i === idx) return;
    if (idx >= 0 && live[names[idx]]) live[names[idx]].setActive(false);
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
  }
  prevB.addEventListener('click', () => go(idx - 1, true));
  nextB.addEventListener('click', () => go(idx + 1, true));
  document.addEventListener('keydown', (e) => {
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') { go(idx + 1, true); e.preventDefault(); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { go(idx - 1, true); e.preventDefault(); }
  });
  const fromHash = () => Math.max(0, names.indexOf((window.location.hash || '').slice(1)));
  window.addEventListener('hashchange', () => go(fromHash(), false));
  window.addEventListener('resize', () => { const p = live[names[idx]]; if (p && p.refresh) p.refresh(); });
  const memoBtn = $('#memoBtn');
  memoBtn.addEventListener('click', () => {
    const on = document.body.classList.toggle('memo-on');
    memoBtn.setAttribute('aria-pressed', String(on));
  });
  go(fromHash(), false);

  /* ---------- 선생님 따라 넘기기 ----------
     진행하는 기기가 지금 장을 공유 저장소 문서(live/state)에 적고, 다른 기기는 그 문서를 지켜보다 따라 넘긴다.
     공유 저장소는 로그인한 사람에게만 열리므로, 없으면(파일로 열기·로그인 안 함) 단추가 나타나지 않는다. */
  (async function follow() {
    if (!window.claude || !window.claude.use) return;
    let db = null, user = null;
    try { db = await window.claude.use('db'); user = await window.claude.use('user'); } catch (e) { db = null; }
    if (!db) return;
    let canLead = false;
    try { canLead = user ? await user.canEdit() : false; } catch (e) { canLead = false; }
    const ME = Math.random().toString(36).slice(2, 10);
    const ref = db.doc('live/state'), leadBtn = $('#leadBtn'), followBtn = $('#followBtn');
    let leading = false, following = true, remote = null, busy = Promise.resolve();
    const write = (data) => { busy = busy.then(() => ref.set(data)).catch(() => {}); };
    function paint() {
      leadBtn.hidden = !canLead;
      leadBtn.setAttribute('aria-pressed', String(leading));
      leadBtn.textContent = leading ? '수업 진행 중 · 끝내기' : '수업 진행';
      const live = !!(remote && remote.on && !leading);
      followBtn.hidden = !live;
      followBtn.setAttribute('aria-pressed', String(following));
      followBtn.textContent = following ? '선생님 따라가는 중' : '따로 보는 중 · 따라가기';
    }
    onGo = (n) => { if (leading) write({ on: true, slide: n, by: ME }); };
    leadBtn.addEventListener('click', () => {
      leading = !leading;
      write(leading ? { on: true, slide: names[idx], by: ME } : { on: false, slide: names[idx], by: ME });
      paint();
    });
    followBtn.addEventListener('click', () => {
      following = !following;
      if (following && remote && remote.on) go(Math.max(0, names.indexOf(remote.slide)), false);
      paint();
    });
    ref.onSnapshot((snap) => {
      const d = snap.exists ? snap.data() : null;
      remote = d && typeof d.slide === 'string' ? d : null;
      if (remote && remote.on && remote.by !== ME) {
        leading = false;                                   // 다른 기기가 진행을 맡았다
        if (following && names.indexOf(remote.slide) >= 0) go(names.indexOf(remote.slide), false);
      }
      paint();
    }, () => { leadBtn.hidden = true; followBtn.hidden = true; });
    paint();
  })();
  }

  return { T, $, $$, reduce, tok, DEG, clamp, FONT, makeView, label, glowSprite, line, V3, ring, plot, series, gridY, todo, ask, ox, start };
})();
