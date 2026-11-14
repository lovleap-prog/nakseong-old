/* 6학년 2학기 과학 3단원 «전기의 이용» 수업 슬라이드.
   circuit(전기 회로 카드) · series(전지의 직렬연결) · crane(전자석 기중기)은 평면 캔버스,
   magnet(전자석의 성질)은 옆과 위에서 모두 봐야 해서 입체 화면으로 만든다. */
(function () {
  'use strict';
  const { T, $, $$, reduce, tok, DEG, clamp, makeView, label, line, V3, flat, rr, text, josa, todo, ask, ox, start } = window.Lesson;
  const parts = {};

  /* ---------- 전기 부품 그림 ---------- */
  const C = { ink: tok('ink'), ink2: tok('ink-2'), line: tok('line'), paper: tok('paper'), sun: tok('sun'), hot: tok('hot'), cold: tok('cold'), shade: tok('shade'), ok: tok('ok') };
  // 전지(끼우개 포함). plusLeft: (+)극이 왼쪽. 양 끝 단자는 x±62
  function battery(g, x, y, plusLeft) {
    g.lineWidth = 3; g.strokeStyle = C.ink;
    g.fillStyle = C.cold; rr(g, x - 62, y - 26, 124, 52, 8); g.fill(); g.stroke();
    g.fillStyle = '#f6c84c'; rr(g, x - 44, y - 16, 88, 32, 6); g.fill(); g.stroke();
    const px = plusLeft ? x - 50 : x + 44;
    g.fillStyle = C.ink; g.fillRect(px, y - 7, 6, 14);
    text(g, plusLeft ? '(+)' : '(-)', x - 44, y - 42, 17);
    text(g, plusLeft ? '(-)' : '(+)', x + 44, y - 42, 17);
  }
  // 전구(끼우개 포함). b: 밝기 0~1. 단자는 x±58, y+23
  function bulb(g, x, y, b) {
    if (b > 0) {
      const R = 46 + 70 * b, gr = g.createRadialGradient(x, y - 12, 8, x, y - 12, R);
      gr.addColorStop(0, 'rgba(255,205,60,' + (0.35 + 0.55 * b) + ')'); gr.addColorStop(1, 'rgba(255,205,60,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y - 12, R, 0, Math.PI * 2); g.fill();
    }
    g.lineWidth = 3; g.strokeStyle = C.ink;
    g.fillStyle = '#ffffff'; rr(g, x - 70, y + 10, 140, 26, 6); g.fill(); g.stroke();
    g.fillStyle = C.line; g.fillRect(x - 12, y - 2, 24, 14); g.strokeRect(x - 12, y - 2, 24, 14);
    g.fillStyle = b > 0 ? 'rgb(255,' + Math.round(235 - 40 * b) + ',' + Math.round(150 - 110 * b) + ')' : '#eef3f7';
    g.beginPath(); g.arc(x, y - 20, 24, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = C.ink; g.beginPath(); g.arc(x - 58, y + 23, 5, 0, Math.PI * 2); g.arc(x + 58, y + 23, 5, 0, Math.PI * 2); g.fill();
  }
  // 스위치. 단자는 x±60, y+8
  function sw(g, x, y, closed) {
    g.lineWidth = 3; g.strokeStyle = C.ink;
    g.fillStyle = '#ffffff'; rr(g, x - 60, y - 4, 120, 24, 6); g.fill(); g.stroke();
    g.fillStyle = C.ink; g.beginPath(); g.arc(x - 40, y + 8, 6, 0, Math.PI * 2); g.arc(x + 40, y + 8, 6, 0, Math.PI * 2); g.fill();
    const a = closed ? 0 : -38 * DEG;
    g.lineWidth = 9; g.strokeStyle = C.ink2;
    g.beginPath(); g.moveTo(x - 40, y + 8); g.lineTo(x - 40 + 84 * Math.cos(a), y + 8 + 84 * Math.sin(a)); g.stroke();
  }
  const bez = (w, u) => { const v = 1 - u; return [v * v * w[0] + 2 * v * u * w[4] + u * u * w[2], v * v * w[1] + 2 * v * u * w[5] + u * u * w[3]]; };
  // 전선 w = [x0, y0, x1, y1, 조절점x, 조절점y, 색]. live면 전기가 흐르는 점이 지나간다
  function wire(g, w, live, t) {
    g.lineWidth = 6; g.strokeStyle = w[6];
    g.beginPath(); g.moveTo(w[0], w[1]); g.quadraticCurveTo(w[4], w[5], w[2], w[3]); g.stroke();
    g.fillStyle = w[6];
    [[w[0], w[1]], [w[2], w[3]]].forEach((p) => { g.beginPath(); g.arc(p[0], p[1], 8, 0, Math.PI * 2); g.fill(); });
    if (!live) return;
    g.fillStyle = '#ffd24a'; g.strokeStyle = C.ink; g.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
      const p = bez(w, ((reduce ? 0 : t * 0.5) + i / 5) % 1);
      g.beginPath(); g.arc(p[0], p[1], 5, 0, Math.PI * 2); g.fill(); g.stroke();
    }
  }
  function motor(g, x, y, ang) {
    g.lineWidth = 3; g.strokeStyle = C.ink;
    g.fillStyle = '#ffffff'; rr(g, x - 70, y + 10, 140, 26, 6); g.fill(); g.stroke();
    g.fillStyle = C.line; rr(g, x - 26, y - 22, 52, 34, 8); g.fill(); g.stroke();
    g.save(); g.translate(x, y - 46); g.rotate(ang);
    g.fillStyle = C.sun;
    for (let i = 0; i < 3; i++) { g.rotate(Math.PI * 2 / 3); g.beginPath(); g.ellipse(26, 0, 26, 9, 0, 0, Math.PI * 2); g.fill(); g.stroke(); }
    g.restore();
    g.fillStyle = C.ink; g.beginPath(); g.arc(x, y - 46, 5, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(x - 58, y + 23, 5, 0, Math.PI * 2); g.arc(x + 58, y + 23, 5, 0, Math.PI * 2); g.fill();
  }
  function buzzer(g, x, y, level, t) {
    g.lineWidth = 3; g.strokeStyle = C.ink;
    g.fillStyle = '#ffffff'; rr(g, x - 70, y + 10, 140, 26, 6); g.fill(); g.stroke();
    g.fillStyle = C.shade; g.beginPath(); g.arc(x, y - 16, 28, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = C.paper; g.beginPath(); g.arc(x, y - 16, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = C.ink; g.beginPath(); g.arc(x - 58, y + 23, 5, 0, Math.PI * 2); g.arc(x + 58, y + 23, 5, 0, Math.PI * 2); g.fill();
    if (level <= 0) return;
    const n = level > 0.7 ? 4 : 2;
    g.strokeStyle = C.hot; g.lineWidth = 4;
    for (let i = 0; i < n; i++) {
      const r = 40 + i * 14 + (reduce ? 0 : (t * 30) % 14);
      g.globalAlpha = 1 - i / (n + 1);
      g.beginPath(); g.arc(x, y - 16, r, -0.9, -0.25); g.stroke();
      g.beginPath(); g.arc(x, y - 16, r, Math.PI + 0.25, Math.PI + 0.9); g.stroke();
    }
    g.globalAlpha = 1;
  }

  /* ---------- 체험 1: 전기 회로 카드 가~라 / 전기가 흐르는 물질 ---------- */
  parts.circuit = function (root) {
    const PL = [108, 130], PR = [232, 130], SL = [550, 138], SR = [670, 138], UL = [342, 403], UR = [458, 403];
    const W = (a, b, cx, cy, col) => [a[0], a[1], b[0], b[1], cx, cy, col];
    const RED = C.hot, BLK = C.ink;
    // 실험 관찰 36쪽 카드와 같은 연결. 전기가 흐르는 차례대로 적는다
    const CARDS = {
      ga: { name: '가', wires: [W(PL, UL, 90, 320, RED), W(UR, SR, 700, 400, BLK)], lit: false },
      na: { name: '나', wires: [W(PL, UL, 90, 320, RED), W(UR, SR, 700, 400, BLK), W(SL, PR, 390, 40, BLK)], lit: true },
      da: { name: '다', wires: [W(PL, UL, 90, 320, RED), W(PL, SL, 330, -40, RED), W(UR, SR, 700, 400, BLK)], lit: false },
      ra: { name: '라', wires: [W(PR, UL, 250, 300, BLK), W(UR, SR, 700, 400, BLK)], lit: false },
    };
    const RODS = { plastic: ['플라스틱 막대', '#f2c230', false], rubber: ['고무 막대', '#3a3f47', false], metal: ['금속 막대', '#b9c2cc', true] };
    const swBtn = $('#cirSw'), out = $('#cirOut'), qbox = $('#cirQ'), say = $('.say', qbox);
    let exp = 1, card = 'ga', closed = false, rod = '', okA = false, okB = false;
    const guess = {}, tested = {}, rodDone = {};
    const lit = () => (exp === 1 ? CARDS[card].lit && closed : !!(rod && RODS[rod][2]));

    const stage = flat($('#cirCv'), (g, t) => {
      const on = lit(), ws = exp === 1 ? CARDS[card].wires : CARDS.na.wires;
      ws.forEach((w) => wire(g, w, on, t));
      battery(g, 170, 130, true);
      bulb(g, 400, 380, on ? 1 : 0);
      if (exp === 1) sw(g, 610, 130, closed);
      else if (rod) { g.lineWidth = 3; g.strokeStyle = C.ink; g.fillStyle = RODS[rod][1]; rr(g, 544, 128, 132, 20, 6); g.fill(); g.stroke(); text(g, RODS[rod][0], 610, 104, 17); }
      else { g.setLineDash([8, 8]); g.lineWidth = 3; g.strokeStyle = C.line; rr(g, 556, 128, 108, 20, 6); g.stroke(); g.setLineDash([]); text(g, '막대를 골라 연결해요', 610, 104, 16, C.ink2); }
      text(g, '전지', 170, 190, 17, C.ink2); text(g, '전구', 400, 440, 17, C.ink2); if (exp === 1) text(g, '스위치', 610, 176, 17, C.ink2);
      if (exp === 1) text(g, '전기 회로 카드 ' + CARDS[card].name, 400, 478, 18, C.ink2);
    }, (x, y) => { if (exp === 1 && x > 530 && x < 690 && y > 60 && y < 170) toggle(); });

    function table() {
      $('#cirTable').innerHTML = Object.keys(CARDS).map((k) => {
        const c = CARDS[k], gz = guess[k];
        const res = tested[k] ? (c.lit ? '불이 켜져요' : '켜지지 않아요') + (gz ? (gz === (c.lit ? 'on' : 'off') ? ' · 예상과 같아요' : ' · 예상과 달라요') : '') : '아직 안 해 봤어요';
        return '<tr><td><b>' + c.name + '</b></td><td><button class="mini" type="button" data-k="' + k + '" data-g="on" aria-pressed="' + (gz === 'on') + '">켜져요</button> <button class="mini" type="button" data-k="' + k + '" data-g="off" aria-pressed="' + (gz === 'off') + '">안 켜져요</button></td><td class="' + (tested[k] ? (c.lit ? 'yes' : 'no') : 'wait') + '">' + res + '</td></tr>';
      }).join('');
      $('#rodTable').innerHTML = Object.keys(RODS).map((k) => '<tr><td>' + RODS[k][0] + '</td><td class="' + (rodDone[k] ? (RODS[k][2] ? 'yes' : 'no') : 'wait') + '">' + (rodDone[k] ? (RODS[k][2] ? '켜져요' : '켜지지 않아요') : '아직 안 해 봤어요') + '</td></tr>').join('');
    }
    function upd() {
      swBtn.hidden = exp !== 1;
      swBtn.textContent = closed ? '스위치 열기' : '스위치 닫기';
      out.textContent = exp === 1 ? (closed ? (lit() ? '전구에 불이 켜졌어요.' : '전구에 불이 켜지지 않아요.') : '') : (rod ? (lit() ? '전구에 불이 켜졌어요.' : '전구에 불이 켜지지 않아요.') : '');
      $('#cirCards').hidden = exp !== 1; $('#cirRods').hidden = exp !== 2;
      $('#cirBox1').hidden = exp !== 1; $('#cirBox2').hidden = exp !== 2;
      $$('button[data-exp]', root).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.exp === exp)));
      $$('button[data-card]', root).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.card === card)));
      $$('button[data-rod]', root).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.rod === rod)));
      const allG = Object.keys(CARDS).every((k) => guess[k]), allT = Object.keys(CARDS).every((k) => tested[k]);
      qbox.hidden = !allT;
      todo($('#cirBox1'), allT && okA && okB ? 3 : allT ? 2 : allG ? 1 : 0);
      todo($('#cirBox2'), ['plastic', 'rubber', 'metal'].filter((k) => rodDone[k]).length === 3 ? 3 : rodDone.rubber && rodDone.plastic ? 2 : rodDone.plastic ? 1 : 0);
      table();
    }
    function toggle() { closed = !closed; if (closed) tested[card] = true; upd(); }
    swBtn.addEventListener('click', toggle);
    $$('button[data-card]', root).forEach((b) => b.addEventListener('click', () => { card = b.dataset.card; closed = false; upd(); }));
    $$('button[data-exp]', root).forEach((b) => b.addEventListener('click', () => { exp = +b.dataset.exp; closed = false; upd(); }));
    $$('button[data-rod]', root).forEach((b) => b.addEventListener('click', () => { rod = b.dataset.rod; rodDone[rod] = true; upd(); }));
    $('#cirTable').addEventListener('click', (e) => { const b = e.target.closest('button[data-g]'); if (!b) return; guess[b.dataset.k] = b.dataset.g; upd(); });
    ask($('[data-q="a"]', qbox), 'whole', (ok) => { okA = okA || ok; say.textContent = ok ? '맞았어요.' : '카드 나를 다시 살펴보세요.'; upd(); });
    ask($('[data-q="b"]', qbox), 'both', (ok) => { okB = okB || ok; say.textContent = ok ? '맞았어요.' : '카드 가, 다, 라는 전지의 어느 극에 연결되어 있나요?'; upd(); });
    upd();
    return { setActive: stage.setActive };
  };

  /* ---------- 체험 2: 전지 한 개 / 전지 두 개 직렬연결 ---------- */
  parts.series = function (root) {
    const swBtn = $('#serSw'), flipBtn = $('#serFlip'), sound = $('#serSound'), qbox = $('#serQ'), say = $('.say', qbox);
    const NAMES = { bulb: ['전구', '불이 켜져요', '더 밝아요'], motor: ['전동기', '천천히 돌아요', '더 빠르게 돌아요'], buzzer: ['버저', '소리가 작아요', '소리가 더 커요'] };
    let part = 'bulb', closed = false, flip = false, okQ = false, ang1 = 0, ang2 = 0;
    const done = {};
    let audio = null, osc = null, gain = null;
    const levels = () => [closed ? 0.45 : 0, closed && !flip ? 1 : 0];

    function hum() {
      const lv = levels(), want = sound.checked && part === 'buzzer' ? lv[0] * 0.05 + lv[1] * 0.12 : 0;
      if (want > 0 && !audio) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        try { audio = new AC(); osc = audio.createOscillator(); gain = audio.createGain(); osc.type = 'square'; osc.frequency.value = 620; gain.gain.value = 0; osc.connect(gain); gain.connect(audio.destination); osc.start(); } catch (e) { audio = null; return; }
      }
      if (audio) { if (want > 0 && audio.state === 'suspended') audio.resume(); gain.gain.value = want; }
    }
    function one(g, cx, cells, level, t, dt, which) {
      const s = 0.8, Lx = cx - (cells === 2 ? 102 : 50), Rx = cx + (cells === 2 ? 102 : 50), live = level > 0;
      wire(g, [Lx, 110, cx - 58, 393, cx - 150, 300, C.hot], live, t);
      wire(g, [cx + 58, 393, cx + 150, 258, cx + 160, 380, C.ink], live, t);
      wire(g, [cx + 62, 258, Rx, 110, cx + 150, 150, C.ink], live, t);
      g.save(); g.translate(cx, 110); g.scale(s, s);
      if (cells === 1) battery(g, 0, 0, true);
      else { battery(g, -65, 0, true); battery(g, 65, 0, !flip); }
      g.restore();
      g.save(); g.translate(cx + 106, 250); g.scale(0.72, 0.72); sw(g, 0, 0, closed); g.restore();
      if (part === 'bulb') bulb(g, cx, 370, level);
      else if (part === 'motor') { if (which === 1) ang1 += dt * level * 16; else ang2 += dt * level * 16; motor(g, cx, 370, reduce ? 0 : (which === 1 ? ang1 : ang2)); }
      else buzzer(g, cx, 370, level, t);
      text(g, cells === 1 ? '전지 한 개' : '전지 두 개 직렬연결', cx, 462, 19);
      if (cells === 2 && flip) text(g, '같은 극끼리 마주 보면 전기가 흐르지 않아요', cx, 30, 15, C.hot);
    }
    const stage = flat($('#serCv'), (g, t, dt) => {
      const lv = levels();
      g.strokeStyle = C.line; g.lineWidth = 2; g.setLineDash([6, 8]); g.beginPath(); g.moveTo(400, 20); g.lineTo(400, 480); g.stroke(); g.setLineDash([]);
      one(g, 195, 1, lv[0], t, dt, 1); one(g, 605, 2, lv[1], t, dt, 2);
    }, (x, y) => { if (y > 200 && y < 290 && ((x > 240 && x < 380) || (x > 650 && x < 790))) toggle(); });

    function upd() {
      swBtn.textContent = closed ? '스위치 열기' : '스위치 닫기';
      flipBtn.setAttribute('aria-pressed', String(flip));
      $$('button[data-part]', root).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.part === part)));
      if (closed && !flip) done[part] = true;
      $('#serTable').innerHTML = Object.keys(NAMES).map((k) => '<tr><td>' + NAMES[k][0] + '</td><td class="' + (done[k] ? 'no' : 'wait') + '">' + (done[k] ? NAMES[k][1] : '아직 안 해 봤어요') + '</td><td class="' + (done[k] ? 'yes' : 'wait') + '">' + (done[k] ? NAMES[k][2] : '아직 안 해 봤어요') + '</td></tr>').join('');
      const all = done.bulb && done.motor && done.buzzer;
      qbox.hidden = !all;
      todo(root, all && okQ ? 3 : all ? 2 : done.bulb ? 1 : 0);
      hum();
    }
    function toggle() { closed = !closed; upd(); }
    swBtn.addEventListener('click', toggle);
    flipBtn.addEventListener('click', () => { flip = !flip; upd(); });
    sound.addEventListener('change', hum);
    $$('button[data-part]', root).forEach((b) => b.addEventListener('click', () => { part = b.dataset.part; closed = false; upd(); }));
    ask($('.opts', qbox), 'lt', (ok) => { okQ = okQ || ok; say.textContent = ok ? '맞았어요. 전지 두 개를 직렬연결한 쪽이 더 밝아요.' : '두 전구의 밝기를 다시 견주어 보세요.'; upd(); });
    upd();
    return { setActive(on) { stage.setActive(on); if (!on && closed) { closed = false; upd(); } } };
  };

  /* ---------- 체험 3: 전자석의 성질 (입체) ---------- */
  parts.magnet = function (root) {
    const swBtn = $('#magSw'), flipBtn = $('#magFlip');
    const view = makeView($('canvas.gl', root), { yaw: 18, pitch: 24, dist: 10.5, target: [0, 1.25, 0], min: 6, max: 22, aspect: 1.5, pmax: 88 });
    let mode = 'power', cells = 1, flip = false, closed = false;
    const seen = { one: false, two: false, dirA: false, dirB: false };
    const RINGS = 10, HOLD = { 1: 3, 2: 7 };
    let em = null, coilMat = null, rings = [], comps = [], poleN = null, poleS = null, cellG = null, wireA = null, wireB = null, plusL = null, minusL = null;

    if (view) {
      const S = view.scene;
      S.add(new T.HemisphereLight(0xffffff, 0xd9c9a8, 0.8));
      const dl = new T.DirectionalLight(0xffffff, 0.35); dl.position.set(3, 8, 5); S.add(dl);
      const table = new T.Mesh(new T.PlaneGeometry(16, 11), new T.MeshLambertMaterial({ color: 0xe9d9b8 }));
      table.rotation.x = -Math.PI / 2; S.add(table);
      // 전자석: 둥근 머리 볼트 + 에나멜선
      em = new T.Group();
      const iron = new T.MeshLambertMaterial({ color: 0x9aa4ae });
      const bolt = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 3.6, 20), iron); em.add(bolt);
      const head = new T.Mesh(new T.CylinderGeometry(0.32, 0.32, 0.16, 20), iron); head.position.y = 1.86; em.add(head);
      coilMat = new T.MeshLambertMaterial({ color: 0xb8652a });
      for (let i = 0; i < 28; i++) { const c = new T.Mesh(new T.TorusGeometry(0.21, 0.045, 8, 20), coilMat); c.rotation.x = Math.PI / 2; c.position.y = -1.35 + i * 0.1; em.add(c); }
      S.add(em);
      // 둥근 철 고리
      const ringGeo = new T.TorusGeometry(0.16, 0.04, 8, 18), ringMat = new T.MeshLambertMaterial({ color: 0x6f7b87 });
      for (let i = 0; i < RINGS; i++) {
        const r = new T.Mesh(ringGeo, ringMat), a = i * 2.4, d = 0.5 + (i % 4) * 0.32;
        r.userData.home = V3(Math.cos(a) * d, 0.05, Math.sin(a) * d * 0.8 + 0.2);
        r.userData.hang = V3(Math.cos(i * 2.4) * (0.1 + 0.06 * (i % 3)), 0.86 - (i % 3) * 0.17, Math.sin(i * 2.4) * (0.1 + 0.06 * (i % 3)));
        r.position.copy(r.userData.home); r.rotation.x = Math.PI / 2;
        rings.push(r); S.add(r);
      }
      // 나침반 두 개(전자석의 양쪽 끝)
      [-3.05, 3.05].forEach((x) => {
        const cg = new T.Group();
        const dish = new T.Mesh(new T.CylinderGeometry(0.62, 0.62, 0.1, 32), new T.MeshLambertMaterial({ color: 0xffffff })); dish.position.y = 0.05; cg.add(dish);
        const rim = new T.Mesh(new T.TorusGeometry(0.62, 0.04, 8, 32), new T.MeshLambertMaterial({ color: tok('ink') })); rim.rotation.x = Math.PI / 2; rim.position.y = 0.1; cg.add(rim);
        const needle = new T.Group();
        const n = new T.Mesh(new T.BoxGeometry(0.5, 0.04, 0.12), new T.MeshBasicMaterial({ color: tok('hot') })); n.position.x = 0.25;
        const s = new T.Mesh(new T.BoxGeometry(0.5, 0.04, 0.12), new T.MeshBasicMaterial({ color: tok('cold') })); s.position.x = -0.25;
        needle.add(n, s); needle.position.y = 0.14; needle.rotation.y = Math.PI / 2; cg.add(needle);
        cg.position.set(x, 0, 0); cg.userData.needle = needle; comps.push(cg); S.add(cg);
      });
      poleN = label('N극', { bg: tok('hot'), color: '#ffffff', size: 0.6 }); poleS = label('S극', { bg: tok('cold'), color: '#ffffff', size: 0.6 }); S.add(poleN, poleS);
      // 전지와 전선
      cellG = new T.Group(); cellG.position.set(0, 0.26, 2.6); S.add(cellG);
      plusL = label('(+)', { color: tok('ink'), size: 0.42 }); minusL = label('(-)', { color: tok('ink'), size: 0.42 }); S.add(plusL, minusL);
      wireA = line([V3(0, 0, 0), V3(1, 0, 0)], tok('hot'), 1); wireB = line([V3(0, 0, 0), V3(1, 0, 0)], tok('ink'), 1); S.add(wireA, wireB);
      view.onFrame((dt) => {
        const k = reduce ? 1 : Math.min(1, dt * 6), hold = closed && mode === 'power' ? HOLD[cells] : 0;
        rings.forEach((r, i) => {
          const to = i < hold ? r.userData.hang : r.userData.home;
          r.position.lerp(to, k);
          r.rotation.x += ((i < hold ? (i % 2 ? 0.3 : 0) : Math.PI / 2) - r.rotation.x) * k;
        });
        const want = closed && mode === 'pole' ? (flip ? Math.PI : 0) : Math.PI / 2;
        comps.forEach((c) => { const n = c.userData.needle; n.rotation.y += (want - n.rotation.y) * k; });
      });
    }
    function build() {
      if (!view) return;
      const power = mode === 'power';
      em.rotation.z = power ? 0 : -Math.PI / 2;           // 눕히면 볼트 머리가 오른쪽(+x)
      em.position.set(0, power ? 2.8 : 0.42, 0);
      rings.forEach((r) => { r.visible = power; });
      comps.forEach((c) => { c.visible = !power; });
      coilMat.emissive.setHex(closed ? 0x5a2a00 : 0x000000);
      while (cellG.children.length) cellG.remove(cellG.children[0]);
      const n = power ? cells : 1, dir = !power && flip ? -1 : 1;
      for (let i = 0; i < n; i++) {
        const c = new T.Mesh(new T.CylinderGeometry(0.24, 0.24, 0.95, 20), new T.MeshLambertMaterial({ color: 0xf2bd3a }));
        c.rotation.z = Math.PI / 2; c.position.x = (i - (n - 1) / 2) * 1.0; cellG.add(c);
        const nub = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, 0.1, 12), new T.MeshLambertMaterial({ color: 0x555d66 }));
        nub.rotation.z = Math.PI / 2; nub.position.x = c.position.x + dir * 0.52; cellG.add(nub);
      }
      const half = n * 0.5 + 0.05, z = cellG.position.z, y = cellG.position.y;
      const pX = dir * half, mX = -dir * half;
      plusL.position.set(pX + dir * 0.35, y + 0.55, z); minusL.position.set(mX - dir * 0.35, y + 0.55, z);
      const endA = power ? V3(0.25, 4.15, 0) : V3(1.35, 0.42, 0.25), endB = power ? V3(-0.25, 1.45, 0) : V3(-1.35, 0.42, 0.25);
      wireA.geometry.setFromPoints([V3(pX, y, z), V3(pX + dir * 0.9, y, z - 0.6), endA]);
      wireB.geometry.setFromPoints([V3(mX, y, z), V3(mX - dir * 0.9, y, z - 0.6), endB]);
      const on = closed && !power;
      poleN.visible = poleS.visible = on;
      poleN.position.set(flip ? -1.9 : 1.9, 1.15, 0); poleS.position.set(flip ? 1.9 : -1.9, 1.15, 0);
    }
    function upd() {
      const power = mode === 'power';
      if (closed && power) { if (cells === 1) seen.one = true; else seen.two = true; }
      if (closed && !power) { if (flip) seen.dirB = true; else seen.dirA = true; }
      swBtn.textContent = closed ? '스위치 열기' : '스위치 닫기';
      $('#magCells').hidden = !power; flipBtn.hidden = power;
      flipBtn.setAttribute('aria-pressed', String(flip));
      $$('button[data-mode]', root).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
      $$('button[data-cells]', root).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.cells === cells)));
      $('#magOn').textContent = closed ? '흘러요' : '흐르지 않아요';
      $('#magRingBox').hidden = !power; $('#magPoleBox').hidden = power;
      $('#magRings').textContent = closed && power ? HOLD[cells] : 0;
      $('#magPoles').textContent = closed ? (flip ? '왼쪽 N극 · 오른쪽 S극' : '왼쪽 S극 · 오른쪽 N극') : '나타나지 않아요';
      todo(root, seen.one && seen.two && seen.dirA && seen.dirB ? 3 : seen.one && seen.two ? 2 : seen.one ? 1 : 0);
      build();
    }
    swBtn.addEventListener('click', () => { closed = !closed; upd(); });
    flipBtn.addEventListener('click', () => { flip = !flip; upd(); });
    $$('button[data-mode]', root).forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode; closed = false; upd(); }));
    $$('button[data-cells]', root).forEach((b) => b.addEventListener('click', () => { cells = +b.dataset.cells; upd(); }));
    upd();
    return { setActive(on) { if (view) view.setActive(on); } };
  };

  /* ---------- 체험 4: 전자석 기중기 ---------- */
  parts.crane = function (root) {
    const slider = $('#craX'), swBtn = $('#craSw'), qbox = $('#craQ'), say = $('.say', qbox);
    const GROUND = 430, MAG_Y = 330, BIN = [596, 744];
    const START = [
      { n: '못', iron: true, x: 130, w: 54, h: 12 }, { n: '플라스틱병', iron: false, x: 215, w: 30, h: 56 },
      { n: '깡통', iron: true, x: 305, w: 38, h: 46 }, { n: '나무토막', iron: false, x: 395, w: 58, h: 30 },
      { n: '볼트', iron: true, x: 485, w: 46, h: 18 },
    ];
    let items = [], on = false, held = null, okQ = false, picked = false, note = '';
    function reset() { items = START.map((s) => Object.assign({ y: GROUND - s.h, vy: 0, inBin: false }, s)); on = false; held = null; note = ''; slider.value = 120; upd(); }
    const delivered = () => items.filter((i) => i.inBin).length;

    function shape(g, it) {
      const x = it.x, y = it.y;
      g.lineWidth = 3; g.strokeStyle = C.ink;
      if (it.n === '못') { g.fillStyle = '#8f9aa5'; g.fillRect(x - 27, y + 3, 50, 6); g.strokeRect(x - 27, y + 3, 50, 6); g.fillRect(x + 21, y - 2, 6, 16); g.strokeRect(x + 21, y - 2, 6, 16); }
      else if (it.n === '깡통') { g.fillStyle = '#b6c0ca'; rr(g, x - 19, y, 38, 46, 5); g.fill(); g.stroke(); g.fillStyle = C.hot; g.fillRect(x - 17, y + 14, 34, 16); }
      else if (it.n === '볼트') { g.fillStyle = '#8f9aa5'; g.fillRect(x - 23, y + 4, 34, 10); g.strokeRect(x - 23, y + 4, 34, 10); rr(g, x + 9, y, 14, 18, 3); g.fill(); g.stroke(); }
      else if (it.n === '플라스틱병') { g.fillStyle = '#bfe6f5'; rr(g, x - 15, y + 12, 30, 44, 8); g.fill(); g.stroke(); g.fillStyle = C.cold; g.fillRect(x - 6, y, 12, 12); g.strokeRect(x - 6, y, 12, 12); }
      else { g.fillStyle = '#c99a5b'; rr(g, x - 29, y, 58, 30, 4); g.fill(); g.stroke(); }
    }
    const stage = flat($('#craCv'), (g, t, dt) => {
      const mx = +slider.value;
      // 떨어지는 물체
      items.forEach((it) => {
        if (it === held) { it.x = mx; it.y += (MAG_Y + 16 - it.y) * Math.min(1, dt * 12); return; }
        const floor = (it.inBin ? GROUND - 6 : GROUND) - it.h;
        if (it.y < floor) { it.vy += 1500 * dt; it.y = Math.min(floor, it.y + it.vy * dt); } else it.vy = 0;
      });
      g.fillStyle = tok('ground'); g.fillRect(0, GROUND, 800, 70);
      g.strokeStyle = C.ink; g.lineWidth = 3; g.beginPath(); g.moveTo(0, GROUND); g.lineTo(800, GROUND); g.stroke();
      // 상자
      g.fillStyle = '#ffffff'; g.fillRect(BIN[0], GROUND - 70, BIN[1] - BIN[0], 70);
      g.lineWidth = 5; g.beginPath(); g.moveTo(BIN[0], GROUND - 70); g.lineTo(BIN[0], GROUND); g.lineTo(BIN[1], GROUND); g.lineTo(BIN[1], GROUND - 70); g.stroke();
      text(g, '철 모으는 상자', (BIN[0] + BIN[1]) / 2, GROUND + 24, 17);
      // 기중기
      g.lineWidth = 8; g.strokeStyle = C.ink2; g.beginPath(); g.moveTo(30, 50); g.lineTo(770, 50); g.stroke();
      g.fillStyle = C.sun; g.lineWidth = 3; g.strokeStyle = C.ink; rr(g, mx - 34, 34, 68, 32, 6); g.fill(); g.stroke();
      g.lineWidth = 4; g.beginPath(); g.moveTo(mx, 66); g.lineTo(mx, MAG_Y - 26); g.stroke();
      g.fillStyle = on ? C.hot : '#9aa4ae'; rr(g, mx - 46, MAG_Y - 26, 92, 40, 10); g.fill(); g.stroke();
      text(g, on ? '전자석 켜짐' : '전자석 꺼짐', mx, MAG_Y - 46, 15, on ? C.hot : C.ink2);
      if (on && !reduce) { g.strokeStyle = C.hot; g.lineWidth = 2; for (let i = 0; i < 3; i++) { g.globalAlpha = 0.5 - i * 0.14; g.beginPath(); g.arc(mx, MAG_Y + 14, 22 + i * 12 + (t * 20) % 12, 0.25, Math.PI - 0.25); g.stroke(); } g.globalAlpha = 1; }
      items.forEach((it) => { shape(g, it); if (it !== held && !it.inBin) text(g, it.n, it.x, GROUND + 24, 15, C.ink2); });
      if (note) text(g, note, 400, 110, 19, C.ink);
    });
    function upd() {
      swBtn.textContent = on ? '스위치 열기' : '스위치 닫기';
      $('#craOn').textContent = on ? '켜짐' : '꺼짐';
      const n = delivered();
      $('#craN').textContent = n;
      qbox.hidden = n < 3;
      todo(root, n >= 3 && okQ ? 3 : n >= 3 ? 2 : picked ? 1 : 0);
    }
    swBtn.addEventListener('click', () => {
      on = !on;
      const mx = +slider.value;
      if (on) {
        const near = items.filter((i) => !i.inBin && Math.abs(i.x - mx) < 44).sort((a, b) => Math.abs(a.x - mx) - Math.abs(b.x - mx))[0];
        if (near && near.iron) { held = near; picked = true; note = josa(near.n, '이', '가') + ' 전자석에 붙었어요.'; }
        else note = near ? josa(near.n, '은', '는') + ' 전자석에 붙지 않아요.' : '';
      } else if (held) {
        const it = held; held = null; it.vy = 0;
        if (it.x > BIN[0] + 20 && it.x < BIN[1] - 20) { it.inBin = true; note = josa(it.n, '을', '를') + ' 상자에 옮겼어요.'; } else note = '전기가 흐르지 않아 물체가 떨어졌어요.';
      } else note = '';
      upd();
    });
    $('#craReset').addEventListener('click', reset);
    ask($('.opts', qbox), 'stick', (ok) => { okQ = okQ || ok; say.textContent = ok ? '맞았어요. 전자석은 스위치를 열면 물체가 떨어져요.' : '영구 자석은 항상 자석의 성질이 나타나요.'; upd(); });
    reset();
    return { setActive: stage.setActive };
  };

  /* ---------- 체험 5: 전기를 효율적이고 안전하게 ---------- */
  parts.safe = function (root) {
    const DATA = [
      ['빈 교실에 전등이 켜져 있어요.', '전등을 꺼요.', '곧 돌아올 테니 그대로 둬요.', 'eff'],
      ['플러그를 뽑으려고 해요.', '플러그의 머리 부분을 잡고 뽑아요.', '전선을 잡아당겨 뽑아요.', 'safe'],
      ['냉난방기를 사용하려고 해요.', '적정 온도를 유지해요.', '문을 열어 둔 채 세게 틀어요.', 'eff'],
      ['손에 물이 묻어 있어요.', '물기를 닦은 뒤 전기 기구를 만져요.', '젖은 손으로 플러그를 꽂아요.', 'safe'],
      ['냉장고에서 간식을 꺼내려고 해요.', '필요한 것만 빨리 꺼내고 문을 닫아요.', '문을 열어 둔 채 무엇을 먹을지 골라요.', 'eff'],
      ['멀티탭에 빈 곳이 없어요.', '플러그를 한꺼번에 많이 꽂지 않아요.', '멀티탭을 여러 개 이어 모두 꽂아요.', 'safe'],
      ['사용하지 않는 전기 기구가 있어요.', '플러그를 뽑아 둬요.', '언제 쓸지 모르니 계속 꽂아 둬요.', 'eff'],
      ['전선의 껍질이 벗겨져 있어요.', '사용하지 않고 어른께 알려요.', '조심해서 그대로 사용해요.', 'safe'],
    ];
    const list = $('#habits'), found = { eff: [], safe: [] };
    list.innerHTML = DATA.map((d, i) => {
      const a = '<button type="button" data-v="o">' + d[1] + '</button>', b = '<button type="button" data-v="x">' + d[2] + '</button>';
      return '<li data-i="' + i + '"><p class="q">' + d[0] + '</p><div class="bt">' + (i % 2 ? b + a : a + b) + '</div></li>';
    }).join('');
    let right = 0, doneN = 0;
    $$('li', list).forEach((li) => {
      const d = DATA[+li.dataset.i], btns = $$('button', li);
      let first = true;
      btns.forEach((b) => b.addEventListener('click', () => {
        const ok = b.dataset.v === 'o';
        btns.forEach((x) => x.classList.remove('wrong', 'right'));
        b.classList.add(ok ? 'right' : 'wrong');
        if (first) { first = false; doneN++; if (ok) right++; }
        if (!ok) return;
        btns.forEach((x) => { x.disabled = true; });
        found[d[3]].push(d[1]);
        const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = d[3] === 'eff' ? '효율' : '안전';
        $('.q', li).appendChild(tag);
        $('#habEff').textContent = found.eff.join(' ') || '아직 찾지 못했어요.';
        $('#habSafe').textContent = found.safe.join(' ') || '아직 찾지 못했어요.';
        $('#habScore').textContent = found.eff.length + found.safe.length < DATA.length ? (found.eff.length + found.safe.length) + ' / ' + DATA.length + ' 찾았어요.' : '모두 찾았어요. 우리 모둠의 전기 사용 생활 규칙을 정해 봐요.';
      }));
    });
    return { setActive() {} };
  };

  /* ---------- 표지와 확인 ---------- */
  let pred = '';
  const PRED = {
    make: ['스위치가 전기를 만들어 내서', '전기 에너지는 전지가 공급해요. 스위치는 전기 회로를 잇거나 끊어요.'],
    join: ['끊어져 있던 전기 회로가 연결되어서', '맞아요. 스위치를 닫으면 전기 회로가 연결되어 전기가 흘러요.'],
    warm: ['스위치가 전구를 뜨겁게 해서', '스위치는 전기 회로를 잇거나 끊을 뿐이에요.'],
  };
  $$('#pred .opt').forEach((b) => b.addEventListener('click', () => {
    pred = b.dataset.v;
    $$('#pred .opt').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $('#predSay').textContent = '골랐어요. 마지막 장에서 다시 확인해요.';
  }));
  parts.check = function (root) {
    ox(root);
    return { setActive(on) { if (on) $('#predBack').textContent = pred ? '«' + PRED[pred][0] + '» → ' + PRED[pred][1] : '표지에서 아직 고르지 않았어요.'; } };
  };

  start(parts);
})();
