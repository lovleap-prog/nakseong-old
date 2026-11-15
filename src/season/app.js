/* 6학년 2학기 과학 1단원 «계절의 변화» 수업 슬라이드.
   장마다 조각(part)을 하나씩 붙인다: day(하루) · year(계절) · light(에너지) · orbit(공전) · check(확인).
   입체 화면은 Three.js(전역 THREE), 그래프는 2D 캔버스. 좌표는 +x 동쪽, +y 위, +z 남쪽. */
(function () {
  'use strict';
  const { T, $, $$, reduce, tok, DEG, clamp, makeView, label, glowSprite, line, V3, ring, plot, series, gridY, todo, ask, ox, stamp, demo, start } = window.Lesson;
  const LAT = 37.6 * DEG;      // 서울
  const NOON = 12.5;           // 우리나라에서 태양이 남중하는 시각(오후 12시 30분 무렵)
  const TILT = 23.5;

  /* ---------- 계산 ---------- */
  // 태양 방향(단위 벡터). h: 시각(시), dec: 태양의 적위(°)
  function sunDir(h, dec) {
    const H = (h - NOON) * 15 * DEG, d = dec * DEG;
    const east = -Math.cos(d) * Math.sin(H);
    const north = Math.cos(LAT) * Math.sin(d) - Math.sin(LAT) * Math.cos(d) * Math.cos(H);
    const up = Math.sin(LAT) * Math.sin(d) + Math.cos(LAT) * Math.cos(d) * Math.cos(H);
    return { x: east, y: up, z: -north };
  }
  const altOf = (h, dec) => Math.asin(clamp(sunDir(h, dec).y, -1, 1)) / DEG;
  const noonAlt = (dec) => 90 - LAT / DEG + dec;
  // 낮의 길이(시간). 해돋이·해넘이는 태양 윗부분이 지평선에 닿는 때(-0.83°)로 잡는다
  function dayLength(dec) {
    const d = dec * DEG;
    const c = (Math.sin(-0.83 * DEG) - Math.sin(LAT) * Math.sin(d)) / (Math.cos(LAT) * Math.cos(d));
    return 2 * Math.acos(clamp(c, -1, 1)) / DEG / 15;
  }
  function clock(min) {
    const h = Math.floor(min / 60), m = Math.round(min % 60);
    const h12 = h > 12 ? h - 12 : h;
    return (h < 12 ? '오전 ' : '오후 ') + h12 + '시' + (m ? ' ' + m + '분' : '');
  }

  /* ---------- 하늘 무대: 태양 고도 측정기 + 태양이 지나는 길 (체험 1·2) ---------- */
  function makeSky(canvas) {
    const view = makeView(canvas, { yaw: 196, pitch: 22, dist: 15, target: [0, 1.35, 0], min: 8, max: 26, aspect: 1.5 });
    if (!view) return null;
    const S = view.scene, R = 5.3, GR = 6, U = 1.5;   // U: 10 cm를 나타내는 길이
    S.add(new T.HemisphereLight(0xffffff, 0xc9d8b0, 0.72));
    const sunLight = new T.DirectionalLight(0xffffff, 0.3); S.add(sunLight);

    const ground = new T.Mesh(new T.CircleGeometry(GR, 72), new T.MeshLambertMaterial({ color: tok('ground') }));
    ground.rotation.x = -Math.PI / 2; S.add(ground);
    for (let r = 1; r <= 3; r++) S.add(line(ring(r * U, 0.006), tok('ink'), 0.22));
    S.add(line([V3(-GR, 0.006, 0), V3(GR, 0.006, 0)], tok('ink'), 0.28));
    S.add(line([V3(0, 0.006, -GR), V3(0, 0.006, GR)], tok('ink'), 0.28));
    [['동', GR + 0.5, 0], ['서', -GR - 0.5, 0], ['남', 0, GR + 0.5], ['북', 0, -GR - 0.5]].forEach((d) => {
      const l = label(d[0], { bg: tok('ink'), color: '#ffffff', round: true, size: 0.62 });
      l.position.set(d[1], 0.3, d[2]); S.add(l);
    });
    [1, 2, 3].forEach((r) => {
      const l = label(r * 10 + ' cm', { color: tok('ink-2'), size: 0.4 });
      l.position.set(-r * U * 0.707, 0.05, -r * U * 0.707); S.add(l);
    });

    // 측정기: 받침(우드록) · 막대기(10 cm) · 실 · 각
    const board = new T.Mesh(new T.BoxGeometry(0.9, 0.05, 0.9), new T.MeshLambertMaterial({ color: 0xffffff }));
    board.position.y = 0.0; S.add(board);
    const stick = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, U, 16), new T.MeshLambertMaterial({ color: tok('hot') }));
    stick.position.y = U / 2; S.add(stick);
    const sg = new T.PlaneGeometry(1, 0.18); sg.translate(0.5, 0, 0); sg.rotateX(-Math.PI / 2);
    const shadow = new T.Mesh(sg, new T.MeshBasicMaterial({ color: tok('shade'), transparent: true, opacity: 0.7 }));
    shadow.position.y = 0.03; S.add(shadow);
    const thread = line([V3(0, 1, 0), V3(1, 0, 0)], tok('ink'), 1); S.add(thread);
    const arc = line([V3(0, 0, 0), V3(1, 0, 0)], tok('hot'), 1); S.add(arc);
    const angLab = label('0°', { bg: '#ffffff', color: tok('hot'), size: 0.62 }); S.add(angLab);

    const sun = new T.Mesh(new T.SphereGeometry(0.34, 24, 16), new T.MeshBasicMaterial({ color: tok('sun') })); S.add(sun);
    const glow = glowSprite('#ffc94d', 2.6); S.add(glow);
    const ray = line([V3(0, 1, 0), V3(0, 5, 0)], tok('sun'), 0.75); S.add(ray);

    const pathGroup = new T.Group(); S.add(pathGroup);
    function paths(list) {
      while (pathGroup.children.length) { const c = pathGroup.children.pop(); c.geometry.dispose(); c.material.dispose(); }
      list.forEach((p) => {
        const pts = [];
        for (let h = 3; h <= 22; h += 0.1) { const d = sunDir(h, p.dec); if (d.y >= 0) pts.push(V3(d.x * R, d.y * R, d.z * R)); }
        if (pts.length > 1) pathGroup.add(line(pts, p.color, p.opacity == null ? 1 : p.opacity));
      });
    }

    function set(hour, dec) {
      const d = sunDir(hour, dec), alt = Math.asin(clamp(d.y, -1, 1)) / DEG, up = d.y > 0.03;
      [sun, glow, ray, shadow, thread, arc, angLab].forEach((m) => { m.visible = up; });
      sun.position.set(d.x * R, d.y * R, d.z * R); glow.position.copy(sun.position);
      sunLight.position.copy(sun.position); sunLight.intensity = 0.08 + 0.26 * Math.max(0, d.y);
      if (!up) return;
      const len = U / Math.tan(alt * DEG), hl = Math.hypot(d.x, d.z) || 1, ux = -d.x / hl, uz = -d.z / hl;
      const shown = Math.min(len, GR - 0.1);
      shadow.scale.x = shown; shadow.rotation.y = Math.atan2(-uz, ux);
      const tip = V3(ux * shown, 0.04, uz * shown);
      thread.geometry.setFromPoints([V3(0, U, 0), tip]);
      ray.geometry.setFromPoints([sun.position.clone(), V3(0, U, 0)]);
      const rr = Math.min(0.85, shown * 0.5), pts = [];
      for (let i = 0; i <= 24; i++) { const a = alt * DEG * i / 24; pts.push(V3(tip.x - ux * rr * Math.cos(a), tip.y + rr * Math.sin(a), tip.z - uz * rr * Math.cos(a))); }
      arc.geometry.setFromPoints(pts);
      const am = alt * DEG / 2, lr = rr + 0.7;
      angLab.position.set(tip.x - ux * lr * Math.cos(am), tip.y + lr * Math.sin(am) + 0.1, tip.z - uz * lr * Math.cos(am));
      angLab.set(Math.round(alt) + '°');
    }
    return { set, paths, setActive: view.setActive, onFrame: view.onFrame };
  }

  const parts = {};

  /* ---------- 체험 1: 하루 동안 태양 고도, 그림자 길이, 기온 ----------
     예시 값(계산)과 우리 반 측정값(실험 관찰 9쪽 표) 두 가지로 본다. 측정값은 이 기기에만 저장된다. */
  parts.day = function (root) {
    const sky = makeSky($('canvas.gl', root));
    const slider = $('#dayT'), out = $('#dayOut'), cv = $('#dayPlot'), qbox = $('#dayQ'), say = $('.say', qbox);
    const MARKS = [570, 630, 690, 750, 810, 870, 930], KEY = 'season-day-my';
    const rec = new Set();
    let prev = +slider.value, moved = false, okAlt = false, okTemp = false, mode = 'ex';
    const my = { date: '', stick: '10', overlay: true, rows: MARKS.map((m) => ({ t: toHM(m), a: '', l: '', c: '' })) };
    try {
      const saved = JSON.parse(window.localStorage.getItem(KEY) || 'null');
      if (saved && Array.isArray(saved.rows)) Object.assign(my, saved);
    } catch (e) { /* 저장소를 못 쓰는 기기 */ }
    const save = () => { try { window.localStorage.setItem(KEY, JSON.stringify(my)); } catch (e) { /* 그대로 둔다 */ } };

    function toHM(min) { return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); }
    function toMin(hm) { const m = /^(\d{1,2}):(\d{2})$/.exec(hm || ''); return m ? +m[1] * 60 + +m[2] : NaN; }
    const num = (v) => (v === '' || v == null || isNaN(+v) ? NaN : +v);
    const stickLen = () => (num(my.stick) > 0 ? num(my.stick) : 10);
    // 측정한 날짜의 태양 위치(날짜가 없으면 9월 23일 무렵)
    function myDec() {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(my.date);
      if (!m) return 0;
      const n = Math.round((Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(+m[1], 0, 0)) / 86400000);
      return 23.44 * Math.sin(2 * Math.PI * (n - 80) / 365);
    }
    const dec = () => (mode === 'my' ? myDec() : 0);
    const calc = (min, d, stick) => {
      const h = min / 60, alt = altOf(h, d);
      return { alt, len: alt > 1 ? stick / Math.tan(alt * DEG) : NaN, temp: 23.5 + 4.5 * Math.cos((h - 14.5) * 15 * DEG) };
    };
    function nice(lo, hi, minStep) {
      const steps = [1, 2, 2.5, 5, 10, 20, 25, 50, 100];
      for (let i = 0; i < steps.length; i++) {
        const st = steps[i];
        if (st < minStep) continue;
        const a = Math.floor(lo / st) * st;
        if (a + 4 * st >= hi) return [a, st];
      }
      return [0, 100];
    }
    const fmt = (v) => String(+v.toFixed(1));

    function draw() {
      plot(cv, (g, w, h) => {
        const L = 62, Rm = 38, Tm = 10, B = 26, x0 = L, x1 = w - Rm, y0 = h - B, y1 = Tm;
        let xa = 540, xb = 960, ticks = MARKS, sLen = [0, 5], sAlt = [20, 10], sTemp = [20, 3];
        let dLen = [], dAlt = [], dTemp = [], cLen = [], cAlt = [];
        if (mode === 'ex') {
          const got = MARKS.filter((m) => rec.has(m)).map((m) => [m, calc(m, 0, 10)]);
          dLen = got.map((p) => [p[0], p[1].len]); dAlt = got.map((p) => [p[0], p[1].alt]); dTemp = got.map((p) => [p[0], p[1].temp]);
        } else {
          const rows = my.rows.map((r) => ({ m: toMin(r.t), a: num(r.a), l: num(r.l), c: num(r.c) })).filter((r) => !isNaN(r.m)).sort((p, q) => p.m - q.m);
          if (rows.length) { xa = rows[0].m - 30; xb = rows[rows.length - 1].m + 30; ticks = rows.map((r) => r.m); }
          dAlt = rows.filter((r) => !isNaN(r.a)).map((r) => [r.m, r.a]);
          dLen = rows.filter((r) => !isNaN(r.l)).map((r) => [r.m, r.l]);
          dTemp = rows.filter((r) => !isNaN(r.c)).map((r) => [r.m, r.c]);
          if (my.overlay) rows.forEach((r) => { const c = calc(r.m, myDec(), stickLen()); if (c.alt > 1) { cAlt.push([r.m, c.alt]); cLen.push([r.m, c.len]); } });
          const range = (arrs, fb, minStep) => {
            const vs = [].concat.apply([], arrs).map((p) => p[1]);
            return vs.length ? nice(Math.min.apply(null, vs), Math.max.apply(null, vs), minStep) : fb;
          };
          sAlt = range([dAlt, cAlt], sAlt, 5); sLen = range([dLen, cLen], sLen, 1); sTemp = range([dTemp], sTemp, 1);
          if (sLen[0] > 0 && sLen[0] <= sLen[1]) sLen = nice(0, sLen[0] + 4 * sLen[1], sLen[1]);
        }
        const X = (m) => x0 + (m - xa) / (xb - xa) * (x1 - x0);
        const Y = (t) => y0 + t * (y1 - y0);
        const N = (sc) => (v) => Y((v - sc[0]) / (4 * sc[1]));
        gridY(g, x0, x1, [0, 0.25, 0.5, 0.75, 1].map(Y));
        g.textBaseline = 'middle';
        [0, 1, 2, 3, 4].forEach((i) => {
          const y = Y(i / 4);
          g.textAlign = 'right'; g.fillStyle = tok('shade'); g.fillText(fmt(sLen[0] + i * sLen[1]), x0 - 34, y);
          g.fillStyle = tok('sun'); g.fillText(fmt(sAlt[0] + i * sAlt[1]), x0 - 6, y);
          g.textAlign = 'left'; g.fillStyle = tok('hot'); g.fillText(fmt(sTemp[0] + i * sTemp[1]), x1 + 6, y);
        });
        g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = tok('ink-2');
        let lastX = -99;
        ticks.forEach((m) => { const x = X(m); if (x - lastX < 34) return; lastX = x; g.fillText(Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'), x, y0 + 6); });
        const cur = +slider.value;
        if (cur >= xa && cur <= xb) {
          g.strokeStyle = tok('ink'); g.lineWidth = 1; g.setLineDash([4, 4]);
          g.beginPath(); g.moveTo(X(cur), y0); g.lineTo(X(cur), y1); g.stroke(); g.setLineDash([]);
        }
        // 계산한 값(견주기용)은 점선
        [[cLen, sLen, tok('shade')], [cAlt, sAlt, tok('sun')]].forEach((c) => {
          if (c[0].length < 2) return;
          g.strokeStyle = c[2]; g.lineWidth = 1.5; g.setLineDash([5, 5]); g.globalAlpha = 0.7;
          g.beginPath(); c[0].forEach((p, i) => { const x = X(p[0]), y = N(c[1])(p[1]); if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke();
          g.setLineDash([]); g.globalAlpha = 1;
        });
        series(g, dLen.map((p) => [X(p[0]), N(sLen)(p[1])]), tok('shade'));
        series(g, dAlt.map((p) => [X(p[0]), N(sAlt)(p[1])]), tok('sun'));
        series(g, dTemp.map((p) => [X(p[0]), N(sTemp)(p[1])]), tok('hot'));
      });
    }

    // 우리 반 측정값에서 찾은 것
    function summary() {
      const rows = my.rows.map((r) => ({ m: toMin(r.t), a: num(r.a), l: num(r.l), c: num(r.c) })).filter((r) => !isNaN(r.m));
      const pick = (k, max) => {
        const ok = rows.filter((r) => !isNaN(r[k]));
        if (ok.length < 2) return null;
        return ok.reduce((b, r) => ((max ? r[k] > b[k] : r[k] < b[k]) ? r : b));
      };
      const a = pick('a', true), l = pick('l', false), c = pick('c', true);
      const line1 = (name, r, unit, k) => (r ? name + ': ' + clock(r.m) + ' (' + fmt(r[k]) + unit + ')' : name + ': 두 번 넘게 측정하면 나와요');
      $('#mySum').innerHTML = [
        line1('태양 고도가 가장 높은 때', a, '°', 'a'),
        line1('그림자 길이가 가장 짧은 때', l, ' cm', 'l'),
        line1('기온이 가장 높은 때', c, ' °C', 'c'),
      ].map((t) => '<li>' + t + '</li>').join('');
    }

    function upd() {
      const m = +slider.value, lo = Math.min(prev, m), hi = Math.max(prev, m);
      if (mode === 'ex') MARKS.forEach((k) => { if (k >= lo && k <= hi && moved) rec.add(k); });
      prev = m;
      const c = calc(m, dec(), mode === 'my' ? stickLen() : 10);
      out.textContent = clock(m);
      $('#dayAlt').textContent = Math.round(c.alt);
      $('#dayLen').textContent = isNaN(c.len) ? '-' : c.len.toFixed(1);
      $('#dayTemp').textContent = c.temp.toFixed(1);
      if (sky) sky.set(m / 60, dec());
      const all = rec.size === MARKS.length;
      qbox.hidden = !all;
      todo($('#dayExBox'), okAlt && okTemp ? 3 : all ? 2 : moved ? 1 : 0);
      draw();
    }
    function setMode(mo) {
      mode = mo;
      $$('button[data-mode]', root).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mo)));
      $('#dayReads').hidden = mo !== 'ex'; $('#dayExBox').hidden = mo !== 'ex';
      $('#dayMy').hidden = mo !== 'my'; $('#dayMyBox').hidden = mo !== 'my';
      $('#dayFine').textContent = mo === 'ex'
        ? '서울, 9월 23일 무렵을 계산한 값 · 막대기 길이 10 cm · 기온은 이해를 돕기 위한 예'
        : '측정값은 이 기기에만 저장돼요 · 점선과 입체 화면은 서울에서 그 날짜를 계산한 값';
      if (sky) sky.paths([{ dec: dec(), color: tok('sun'), opacity: 0.55 }]);
      upd();
    }

    // 측정값 표
    const tbody = $('#myTable tbody');
    function rowsHtml() {
      tbody.innerHTML = my.rows.map((r, i) =>
        '<tr><td><input type="time" step="600" id="my-t-' + i + '" data-i="' + i + '" data-k="t" value="' + r.t + '" aria-label="' + (i + 1) + '번째 측정 시각"></td>' +
        ['a', 'l', 'c'].map((k) => '<td><input type="number" inputmode="decimal" step="0.1" id="my-' + k + '-' + i + '" data-i="' + i + '" data-k="' + k + '" value="' + r[k] + '" aria-label="' + (i + 1) + '번째 ' + { a: '태양 고도', l: '그림자 길이', c: '기온' }[k] + '"></td>').join('') + '</tr>').join('');
    }
    tbody.addEventListener('input', (e) => {
      const el = e.target, i = +el.dataset.i;
      if (!my.rows[i]) return;
      my.rows[i][el.dataset.k] = el.value;
      save(); summary(); draw();
    });
    // 줄을 고르면 입체 화면의 태양도 그 시각으로 간다
    tbody.addEventListener('focusin', (e) => {
      const r = my.rows[+e.target.dataset.i], m = r ? toMin(r.t) : NaN;
      if (isNaN(m)) return;
      slider.value = clamp(m, +slider.min, +slider.max); prev = +slider.value; upd();
    });
    $('#myDate').value = my.date; $('#myStick').value = my.stick; $('#myEx').checked = !!my.overlay;
    $('#myDate').addEventListener('input', (e) => { my.date = e.target.value; save(); setMode(mode); });
    $('#myStick').addEventListener('input', (e) => { my.stick = e.target.value; save(); upd(); });
    $('#myEx').addEventListener('change', (e) => { my.overlay = e.target.checked; save(); draw(); });
    $('#myAdd').addEventListener('click', () => {
      if (my.rows.length >= 12) return;
      const last = toMin(my.rows[my.rows.length - 1].t);
      my.rows.push({ t: isNaN(last) || last + 60 > 1439 ? '' : toHM(last + 60), a: '', l: '', c: '' });
      save(); rowsHtml(); draw();
    });
    const clearBtn = $('#myClear');
    let armed = 0;
    clearBtn.addEventListener('click', () => {
      if (!armed) { clearBtn.textContent = '한 번 더 누르면 지워요'; armed = setTimeout(() => { armed = 0; clearBtn.textContent = '모두 지우기'; }, 3000); return; }
      clearTimeout(armed); armed = 0; clearBtn.textContent = '모두 지우기';
      my.rows = MARKS.map((m) => ({ t: toHM(m), a: '', l: '', c: '' }));
      save(); rowsHtml(); summary(); draw();
    });
    $$('button[data-mode]', root).forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));

    slider.addEventListener('input', () => { moved = true; upd(); });
    const answered = () => { if (okAlt && okTemp) say.textContent = '맞았어요. 두 때는 두 시간쯤 차이가 나요.'; upd(); };
    ask($('[data-q="alt"]', qbox), '750', (ok) => { okAlt = okAlt || ok; say.textContent = ok ? '맞았어요.' : '주황색 그래프에서 가장 높은 점을 찾아보세요.'; answered(); });
    ask($('[data-q="temp"]', qbox), '870', (ok) => { okTemp = okTemp || ok; say.textContent = ok ? '맞았어요.' : '빨간색 그래프에서 가장 높은 점을 찾아보세요.'; answered(); });
    rowsHtml(); summary(); setMode('ex');
    slider.addEventListener('change', () => { if (mode === 'ex' && Math.abs(+slider.value - 750) <= 10) stamp(root); });
    const exBtn = $('button[data-mode="ex"]', root);
    demo(root, [
      ['오전 9시 30분, 태양이 동쪽 낮은 곳에 있어 그림자가 길어요.', async (d) => { d.press(exBtn); await d.slide(slider, 570, 800); }],
      ['시간이 지나 태양이 높아질수록 그림자가 짧아져요.', (d) => d.slide(slider, 750, 3500)],
      ['오후 12시 30분 무렵 태양이 가장 높아요. 태양이 남중했다고 해요.', (d) => d.wait(800)],
      ['오후에는 태양이 낮아지고 그림자가 다시 길어져요.', (d) => d.slide(slider, 930, 3500)],
      ['기온은 오후 2시 30분 무렵에 가장 높아요. 세 그래프를 견주어 봐요.', (d) => d.slide(slider, 870, 1200)],
    ]);
    return { setActive(on) { if (sky) sky.setActive(on); if (on) upd(); }, refresh: draw };
  };

  /* ---------- 체험 2: 계절별 태양의 남중 고도와 낮의 길이 ---------- */
  parts.year = function (root) {
    const sky = makeSky($('canvas.gl', root));
    const slider = $('#yearM'), out = $('#yearOut'), cv = $('#yearPlot'), qbox = $('#yearQ'), say = $('.say', qbox);
    const playBtn = $('#yearPlay'), clk = $('#yearClock');
    const MONTHS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2];
    const DAYNO = { 1: 21, 2: 52, 3: 80, 4: 111, 5: 141, 6: 172, 7: 202, 8: 233, 9: 264, 10: 294, 11: 325, 12: 355 };   // 매월 21일
    const decOf = (mo) => 23.44 * Math.sin(2 * Math.PI * (DAYNO[mo] - 80) / 365);
    const seasonOf = (mo) => (mo >= 3 && mo <= 5 ? ['봄', tok('leaf')] : mo >= 6 && mo <= 8 ? ['여름', tok('hot')] : mo >= 9 && mo <= 11 ? ['가을', tok('sun')] : ['겨울', tok('cold')]);
    const rec = new Set([0]), played = new Set();
    let anim = null, okQ = false;
    const hm = (hours) => { const m = Math.round(hours * 60); return Math.floor(m / 60) + '시간 ' + (m % 60) + '분'; };

    function draw() {
      plot(cv, (g, w, h) => {
        const L = 30, Rm = 30, Tm = 10, B = 26, x0 = L, x1 = w - Rm, y0 = h - B, y1 = Tm;
        const X = (i) => x0 + (i + 0.5) / 12 * (x1 - x0);
        const Y = (deg) => y0 + deg / 80 * (y1 - y0);          // 왼쪽 눈금 0~80°
        const YL = (hr) => Y((hr - 8) * 10);                   // 오른쪽 눈금 9~16시간(교과서 종이 그래프와 같은 칸)
        gridY(g, x0, x1, [0, 10, 20, 30, 40, 50, 60, 70, 80].map(Y));
        g.textBaseline = 'middle';
        for (let d = 0; d <= 80; d += 20) { g.textAlign = 'right'; g.fillStyle = tok('sun'); g.fillText(String(d), x0 - 6, Y(d)); }
        for (let hr = 10; hr <= 16; hr += 2) { g.textAlign = 'left'; g.fillStyle = tok('cold'); g.fillText(String(hr), x1 + 6, YL(hr)); }
        g.textAlign = 'center'; g.textBaseline = 'top';
        const cur = +slider.value;
        MONTHS.forEach((mo, i) => { g.fillStyle = i === cur ? tok('ink') : tok('ink-2'); g.fillText(String(mo), X(i), y0 + 6); });
        g.strokeStyle = tok('ink'); g.lineWidth = 1; g.setLineDash([4, 4]);
        g.beginPath(); g.moveTo(X(cur), y0); g.lineTo(X(cur), y1); g.stroke(); g.setLineDash([]);
        const got = MONTHS.map((mo, i) => [i, decOf(mo)]).filter((p) => rec.has(p[0]));
        series(g, got.map((p) => [X(p[0]), YL(dayLength(p[1]))]), tok('cold'));
        series(g, got.map((p) => [X(p[0]), Y(noonAlt(p[1]))]), tok('sun'));
      });
    }
    function upd() {
      const i = +slider.value, mo = MONTHS[i], dec = decOf(mo), sn = seasonOf(mo), alt = noonAlt(dec);
      rec.add(i);
      out.textContent = mo + '월 21일 · ' + sn[0];
      $('#yearAlt').textContent = Math.round(alt);
      $('#yearLen').textContent = hm(dayLength(dec));
      $('#yearSh').textContent = (10 / Math.tan(alt * DEG)).toFixed(1);
      if (sky) {
        sky.paths([
          { dec: 23.44, color: tok('hot'), opacity: 0.28 }, { dec: 0, color: tok('leaf'), opacity: 0.28 }, { dec: -23.44, color: tok('cold'), opacity: 0.28 },
          { dec, color: sn[1], opacity: 1 },
        ]);
        if (!anim) sky.set(NOON, dec);
      }
      const all = rec.size === 12, both = played.has(3) && played.has(9);
      qbox.hidden = !(all && both);
      todo(root, okQ && all && both ? 3 : all && both ? 2 : all ? 1 : 0);
      if (mo === 12 && rec.size >= 6) stamp(root);
      draw();
    }
    function stop() { anim = null; clk.hidden = true; playBtn.textContent = '하루 보내기'; upd(); }
    playBtn.addEventListener('click', () => {
      if (anim) { stop(); return; }
      const i = +slider.value, dec = decOf(MONTHS[i]), half = dayLength(dec) / 2;
      anim = { t: 0, dec, from: NOON - half, to: NOON + half };
      played.add(i);
      playBtn.textContent = '멈추기'; clk.hidden = false;
    });
    slider.addEventListener('input', () => { if (anim) stop(); else upd(); });
    if (sky) sky.onFrame((dt) => {
      if (!anim) return;
      anim.t += dt / (reduce ? 2.5 : 5);
      const h = anim.from + (anim.to - anim.from) * Math.min(1, anim.t);
      sky.set(h, anim.dec);
      clk.textContent = clock(Math.round(h * 6) * 10);
      if (anim.t >= 1) stop();
    });
    ask($('.opts', qbox), 'long', (ok) => { okQ = okQ || ok; say.textContent = ok ? '맞았어요. 태양이 지평선 위에 떠 있는 시간이 길어져요.' : '두 그래프의 모양을 견주어 보세요.'; upd(); });
    upd();
    demo(root, [
      ['6월 21일(여름): 태양이 높이 떠서 오래 머물러요.', async (d) => { await d.slide(slider, 3, 800); d.press(playBtn); await d.wait(5600); }],
      ['12월 21일(겨울): 태양이 낮게 떠서 일찍 져요.', async (d) => { await d.slide(slider, 9, 800); d.press(playBtn); await d.wait(5600); }],
      ['3월부터 다음 해 2월까지 차례로 기록해요.', async (d) => { await d.slide(slider, 0, 400); await d.slide(slider, 11, 4500); }],
      ['남중 고도가 높은 달일수록 낮의 길이가 길어요.', (d) => d.wait(600)],
    ]);
    return { setActive(on) { if (sky) sky.setActive(on); if (!on && anim) stop(); if (on) upd(); }, refresh: draw };
  };

  /* ---------- 체험 3: 태양 고도와 태양 에너지양 (손전등 모형실험) ---------- */
  parts.light = function (root) {
    const slider = $('#lightA'), out = $('#lightOut');
    const view = makeView($('canvas.gl', root), { yaw: 22, pitch: 26, dist: 13.5, target: [0, 1.3, 0], min: 8, max: 22, aspect: 1.5 });
    const BR = 1.45, LL = 4.6, STICK = 0.5;
    let beam = null, spot = null, lamp = null, shadow = null, tablet = null;
    if (view) {
      const S = view.scene;
      S.add(new T.HemisphereLight(0xffffff, 0xd8e2ea, 0.95));
      const floor = new T.Mesh(new T.PlaneGeometry(14, 10), new T.MeshLambertMaterial({ color: 0xf4f7fa }));
      floor.rotation.x = -Math.PI / 2; S.add(floor);
      const pts = [];
      for (let i = -7; i <= 7; i++) pts.push(V3(i, 0.004, -5), V3(i, 0.004, 5));
      for (let j = -5; j <= 5; j++) pts.push(V3(-7, 0.004, j), V3(7, 0.004, j));
      S.add(new T.LineSegments(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: tok('line') })));

      spot = new T.Mesh(new T.CircleGeometry(BR, 64), new T.MeshBasicMaterial({ color: '#ffd24a', transparent: true, depthWrite: false }));
      spot.rotation.x = -Math.PI / 2; spot.position.y = 0.012; S.add(spot);
      // 스마트 기기(센서는 가운데)
      tablet = new T.Mesh(new T.BoxGeometry(2.2, 0.08, 1.4), new T.MeshLambertMaterial({ color: tok('shade') }));
      tablet.position.set(0.55, 0.04, 0); S.add(tablet);
      const sensor = new T.Mesh(new T.CircleGeometry(0.13, 24), new T.MeshBasicMaterial({ color: tok('sun') }));
      sensor.rotation.x = -Math.PI / 2; sensor.position.set(-0.3, 0.085, 0); S.add(sensor);
      const sl = label('센서', { bg: '#ffffff', color: tok('ink'), size: 0.36 }); sl.position.set(-0.3, 0.45, 0.55); S.add(sl);
      // 빨판 달린 막대와 그림자
      const st = new T.Mesh(new T.CylinderGeometry(0.045, 0.045, STICK, 12), new T.MeshLambertMaterial({ color: tok('hot') }));
      st.position.set(-0.3, STICK / 2, -1.05); S.add(st);
      const sg = new T.PlaneGeometry(1, 0.11); sg.translate(0.5, 0, 0); sg.rotateX(-Math.PI / 2);
      shadow = new T.Mesh(sg, new T.MeshBasicMaterial({ color: tok('shade'), transparent: true, opacity: 0.75 }));
      shadow.position.set(-0.3, 0.02, -1.05); S.add(shadow);
      // 손전등
      lamp = new T.Group();
      const body = new T.Mesh(new T.CylinderGeometry(0.28, 0.28, 1.3, 20), new T.MeshLambertMaterial({ color: tok('ink') }));
      body.position.y = -0.95;
      const head = new T.Mesh(new T.CylinderGeometry(0.5, 0.3, 0.5, 20), new T.MeshLambertMaterial({ color: tok('ink-2') }));
      head.position.y = -0.25;
      const lens = new T.Mesh(new T.CircleGeometry(0.46, 24), new T.MeshBasicMaterial({ color: '#fff3b0' }));
      lens.rotation.x = -Math.PI / 2; lens.position.y = 0.005;
      lamp.add(body, head, lens); S.add(lamp);
      // 빛줄기(위 고리 → 바닥 타원)
      const N = 48, pos = new Float32Array((N + 1) * 2 * 3), idx = [];
      for (let i = 0; i < N; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, c, b, d, c); }
      const bg = new T.BufferGeometry();
      bg.setAttribute('position', new T.BufferAttribute(pos, 3)); bg.setIndex(idx);
      beam = new T.Mesh(bg, new T.MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0.2, side: T.DoubleSide, depthWrite: false }));
      beam.userData.N = N; S.add(beam);
    }
    let lo = false, hi = false, summer = false, winter = false;
    function upd() {
      const a = +slider.value, s = Math.sin(a * DEG), c = Math.cos(a * DEG);
      out.textContent = a + '°';
      $('#lightAng').textContent = a;
      $('#lightSh').textContent = (STICK * 10 / Math.tan(a * DEG)).toFixed(1);
      $('#lightLux').textContent = Math.round(100 * s);
      $('#lightBar').style.width = Math.round(100 * s) + '%';
      $('#lightArea').textContent = (1 / s).toFixed(1) + '배';
      $('#areaBar').style.width = Math.round(100 / s / (1 / Math.sin(20 * DEG))) + '%';
      if (a >= 70) hi = true;
      if (a <= 30) lo = true;
      todo(root, hi && lo && summer && winter ? 3 : hi && lo ? 2 : hi ? 1 : 0);
      if (Math.round(100 * s) === 50) stamp(root);
      if (!view) return;
      spot.scale.set(1 / s, 1, 1);          // 평면이 눕기 전 x축 = 바닥의 x축
      spot.material.opacity = 0.25 + 0.7 * s;
      shadow.scale.x = STICK / Math.tan(a * DEG);
      const dir = V3(c, -s, 0);             // 빛이 나아가는 방향(왼쪽 위 → 가운데 바닥)
      lamp.position.set(-LL * c, LL * s, 0);
      lamp.quaternion.setFromUnitVectors(V3(0, 1, 0), dir);
      const N = beam.userData.N, p = beam.geometry.attributes.position, u = V3(s, c, 0);
      for (let i = 0; i <= N; i++) {
        const th = i / N * Math.PI * 2, k = 0.46 / BR;
        const tx = lamp.position.x + u.x * Math.cos(th) * BR * k, ty = lamp.position.y + u.y * Math.cos(th) * BR * k, tz = Math.sin(th) * BR * k;
        p.setXYZ(i * 2, tx, ty, tz);
        p.setXYZ(i * 2 + 1, Math.cos(th) * BR / s, 0.015, Math.sin(th) * BR);
      }
      p.needsUpdate = true;
    }
    slider.addEventListener('input', upd);
    $$('button[data-a]', root).forEach((b) => b.addEventListener('click', () => {
      slider.value = b.dataset.a;
      if (b.dataset.a === '76') summer = true; else winter = true;
      upd();
    }));
    upd();
    demo(root, [
      ['손전등을 똑바로 세우면 빛이 좁은 곳에 모여요.', (d) => d.slide(slider, 90, 1500)],
      ['여름의 남중 고도(76°)로 비추면 센서가 받는 빛이 세요.', (d) => d.slide(slider, 76, 1200)],
      ['겨울의 남중 고도(29°)로 눕히면 같은 빛이 넓게 퍼져 약해져요.', (d) => d.slide(slider, 29, 2500)],
      ['태양 고도가 낮을수록 일정한 면적이 받는 태양 에너지양이 적어요.', (d) => d.wait(600)],
    ]);
    return { setActive(on) { if (view) view.setActive(on); } };
  };

  /* ---------- 체험 4: 지구의 자전축 기울기와 공전 ---------- */
  parts.orbit = function (root) {
    const slider = $('#orbitP'), out = $('#orbitOut'), cv = $('#orbitPlot'), qbox = $('#orbitQ'), say = $('.say', qbox), playBtn = $('#orbitPlay');
    const view = makeView($('canvas.gl', root), { yaw: 0, pitch: 34, dist: 19, target: [0, 0, 0], min: 11, max: 30, aspect: 1.5, pmin: 8, pmax: 88 });
    const OR = 6, ER = 0.85, NREC = 72;
    const recs = { 1: new Array(NREC).fill(false), 0: new Array(NREC).fill(false) };
    let tilted = 1, prev = 0, anim = null, okUp = false, okTilt = false;
    let earth = null, tiltG = null, globe = null, sunRay = null;
    const POS = [['가', 0], ['나', 90], ['다', 180], ['라', 270]];
    const theta = (s) => (90 + s) * DEG;                       // 가(뒤)에서 시작해 시계 반대 방향
    const decAt = (s) => (tilted ? -TILT * Math.cos(theta(s)) : 0);
    const decFor = (s, t) => (t ? -TILT * Math.cos(theta(s)) : 0);

    if (view) {
      const S = view.scene;
      S.add(new T.AmbientLight(0xffffff, 0.32));
      S.add(new T.PointLight(0xffffff, 1.5, 0, 0));
      const stars = [];
      for (let i = 0; i < 260; i++) { const a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1); stars.push(V3(60 * Math.sin(b) * Math.cos(a), 60 * Math.cos(b), 60 * Math.sin(b) * Math.sin(a))); }
      S.add(new T.Points(new T.BufferGeometry().setFromPoints(stars), new T.PointsMaterial({ color: 0xffffff, size: 0.35, transparent: true, opacity: 0.7 })));
      S.add(new T.Mesh(new T.SphereGeometry(0.8, 32, 20), new T.MeshBasicMaterial({ color: '#ffb92e' })));
      S.add(glowSprite('#ffc94d', 4.6));
      const sunL = label('태양', { color: '#ffffff', size: 0.7 }); sunL.position.set(0, 1.6, 0); S.add(sunL);
      S.add(line(ring(OR, 0, 128), '#8fa6c4', 0.8));
      POS.forEach((p) => {
        const t = theta(p[1]), l = label(p[0], { bg: '#ffffff', color: tok('ink'), round: true, size: 0.72 });
        l.position.set(Math.cos(t) * (OR + 1.5), 0, -Math.sin(t) * (OR + 1.5)); S.add(l);
      });
      // 지구: earth(공전 위치) > tiltG(자전축 기울기, 항상 같은 방향) > globe(자전)
      earth = new T.Group(); tiltG = new T.Group(); earth.add(tiltG); S.add(earth);
      const c = document.createElement('canvas'); c.width = 512; c.height = 256;
      const g = c.getContext('2d');
      g.fillStyle = '#2f7fc4'; g.fillRect(0, 0, 512, 256);
      g.fillStyle = '#58a868';
      const land = (lon, lat, rx, ry) => { g.beginPath(); g.ellipse((lon + 180) / 360 * 512, (90 - lat) / 180 * 256, rx / 360 * 512, ry / 180 * 256, 0, 0, Math.PI * 2); g.fill(); };
      land(60, 52, 62, 20); land(100, 30, 26, 14); land(20, 5, 20, 30); land(-100, 48, 30, 22); land(-60, -15, 16, 28); land(134, -25, 17, 11); land(-40, 73, 12, 8);
      g.fillStyle = '#f2f6f8'; g.fillRect(0, 244, 512, 12);
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1;
      for (let la = 30; la < 180; la += 30) { g.beginPath(); g.moveTo(0, la / 180 * 256); g.lineTo(512, la / 180 * 256); g.stroke(); }
      for (let lo = 0; lo < 360; lo += 30) { g.beginPath(); g.moveTo(lo / 360 * 512, 0); g.lineTo(lo / 360 * 512, 256); g.stroke(); }
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 128); g.lineTo(512, 128); g.stroke();
      const tex = new T.CanvasTexture(c);
      globe = new T.Mesh(new T.SphereGeometry(ER, 40, 28), new T.MeshLambertMaterial({ map: tex }));
      const kor = new T.Mesh(new T.SphereGeometry(0.075, 12, 8), new T.MeshBasicMaterial({ color: tok('hot') }));
      const ku = (127 + 180) / 360 * Math.PI * 2;
      kor.position.set(-ER * Math.cos(LAT) * Math.cos(ku), ER * Math.sin(LAT), ER * Math.cos(LAT) * Math.sin(ku));
      globe.add(kor); tiltG.add(globe);
      const axis = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, ER * 3, 8), new T.MeshBasicMaterial({ color: '#ffffff' }));
      tiltG.add(axis);
      const al = label('자전축', { color: '#ffffff', size: 0.5 }); al.position.set(0, ER * 1.5 + 0.35, 0); tiltG.add(al);
      sunRay = line([V3(0, 0, 0), V3(1, 0, 0)], '#ffd24a', 0.6); S.add(sunRay);
      view.onFrame((dt) => {
        if (!reduce) globe.rotation.y += dt * 0.9;
        if (!anim) return;
        anim.t += dt / (reduce ? 4 : 9);
        slider.value = Math.round(360 * Math.min(1, anim.t));
        upd();
        if (anim.t >= 1) { anim = null; playBtn.textContent = '공전시키기'; }
      });
    }
    function draw() {
      plot(cv, (g, w, h) => {
        const L = 34, Rm = 12, Tm = 10, B = 26, x0 = L, x1 = w - Rm, y0 = h - B, y1 = Tm;
        const X = (s) => x0 + s / 360 * (x1 - x0), Y = (d) => y0 + (d - 20) / 65 * (y1 - y0);
        gridY(g, x0, x1, [29, 52, 76].map(Y));
        g.textBaseline = 'middle'; g.textAlign = 'right'; g.fillStyle = tok('ink-2');
        [29, 52, 76].forEach((d) => g.fillText(d + '°', x0 - 6, Y(d)));
        g.textAlign = 'center'; g.textBaseline = 'top';
        ['가', '나', '다', '라', '가'].forEach((n, i) => g.fillText(n, X(i * 90), y0 + 6));
        [[0, tok('cold')], [1, tok('sun')]].forEach((sr) => {
          g.strokeStyle = sr[1]; g.lineWidth = 3; g.beginPath();
          let pen = false;
          for (let i = 0; i <= NREC; i++) {
            const on = recs[sr[0]][i % NREC] && (i < NREC || recs[sr[0]][NREC - 1]);
            if (!on) { pen = false; continue; }
            const x = X(i * 5), y = Y(noonAlt(decFor(i * 5, sr[0])));
            if (pen) g.lineTo(x, y); else g.moveTo(x, y);
            pen = true;
          }
          g.stroke();
        });
        const s = +slider.value;
        g.fillStyle = tilted ? tok('sun') : tok('cold'); g.strokeStyle = tok('ink'); g.lineWidth = 2;
        g.beginPath(); g.arc(X(s), Y(noonAlt(decAt(s))), 6, 0, Math.PI * 2); g.fill(); g.stroke();
      });
    }
    function upd() {
      const s = +slider.value, lo = Math.min(prev, s), hi = Math.max(prev, s);
      for (let i = Math.ceil(lo / 5); i <= Math.floor(hi / 5); i++) recs[tilted][i % NREC] = true;
      prev = s;
      const dec = decAt(s), alt = noonAlt(dec), q = Math.round(s / 90) % 4;
      out.textContent = s % 90 === 0 ? POS[q][0] + ' 위치' : POS[Math.floor(s / 90) % 4][0] + ' → ' + POS[(Math.floor(s / 90) + 1) % 4][0];
      $('#orbitAlt').textContent = Math.round(alt);
      $('#orbitSh').textContent = (2 / Math.tan(alt * DEG)).toFixed(1);
      $('#orbitSeason').textContent = tilted ? ['봄', '여름', '가을', '겨울'][q] : '변화 없음';
      if (view) {
        const t = theta(s);
        earth.position.set(Math.cos(t) * OR, 0, -Math.sin(t) * OR);
        tiltG.rotation.z = tilted ? -TILT * DEG : 0;          // 북극이 +x(라 쪽)로 기운다
        sunRay.geometry.setFromPoints([V3(0, 0, 0), earth.position.clone()]);
      }
      const full = (a) => a.filter(Boolean).length >= NREC - 2;
      const d1 = full(recs[1]), d0 = full(recs[0]);
      qbox.hidden = !(d1 && d0);
      todo(root, d1 && d0 && okUp && okTilt ? 3 : d1 && d0 ? 2 : d1 ? 1 : 0);
      if (tilted && Math.abs(s - 270) <= 10) stamp(root);
      draw();
    }
    slider.addEventListener('input', () => { anim = null; playBtn.textContent = '공전시키기'; upd(); });
    playBtn.addEventListener('click', () => {
      if (anim) { anim = null; playBtn.textContent = '공전시키기'; return; }
      slider.value = 0; prev = 0; anim = { t: 0 }; playBtn.textContent = '멈추기';
      if (!view) { slider.value = 360; upd(); anim = null; playBtn.textContent = '공전시키기'; }
    });
    $$('button[data-tilt]', root).forEach((b) => b.addEventListener('click', () => {
      tilted = +b.dataset.tilt;
      $$('button[data-tilt]', root).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      anim = null; playBtn.textContent = '공전시키기'; prev = +slider.value; upd();
    }));
    const fin = () => { if (okUp && okTilt) say.textContent = '맞았어요. 자전축이 기울어져 있어야 태양의 남중 고도가 달라져요.'; upd(); };
    ask($('[data-q="up"]', qbox), 'same', (ok) => { okUp = okUp || ok; say.textContent = ok ? '맞았어요.' : '파란색 그래프의 모양을 보세요.'; fin(); });
    ask($('[data-q="tilt"]', qbox), 'change', (ok) => { okTilt = okTilt || ok; say.textContent = ok ? '맞았어요.' : '주황색 그래프의 모양을 보세요.'; fin(); });
    upd();
    const tiltOn = $('button[data-tilt="1"]', root), tiltOff = $('button[data-tilt="0"]', root);
    demo(root, [
      ['자전축이 기울어진 채 지구를 한 바퀴 공전시켜요.', async (d) => { d.press(tiltOn); await d.slide(slider, 0, 300); await d.slide(slider, 360, 6000); }],
      ['우리나라의 남중 고도가 76°에서 29°까지 달라져요. 그래서 계절이 생겨요.', (d) => d.wait(800)],
      ['이번에는 자전축을 똑바로 세우고 공전시켜요.', async (d) => { d.press(tiltOff); await d.slide(slider, 0, 300); await d.slide(slider, 360, 6000); }],
      ['남중 고도가 52°로 그대로예요. 계절이 생기지 않아요.', (d) => d.wait(800)],
      ['자전축이 기울어진 경우로 돌아가요.', async (d) => { d.press(tiltOn); await d.slide(slider, 90, 800); }],
    ]);
    return { setActive(on) { if (view) view.setActive(on); if (on) upd(); }, refresh: draw };
  };

  /* ---------- 확인 ---------- */
  let pred = '';
  const PRED = {
    near: ['여름에는 지구가 태양에 더 가까워져서', '체험 4에서 지구와 태양 사이의 거리는 변하지 않았는데도 계절이 달라졌어요.'],
    high: ['여름에는 태양이 더 높이 떠서', '맞아요. 태양의 남중 고도가 높아 일정한 면적의 지표면이 받는 태양 에너지양이 많아요.'],
    hot: ['여름에는 태양이 더 뜨거워져서', '태양은 그대로예요. 달라지는 것은 태양의 남중 고도예요.'],
  };
  parts.check = function (root) {
    ox(root);
    return {
      setActive(on) {
        if (!on) return;
        $('#predBack').textContent = pred ? '«' + PRED[pred][0] + '» → ' + PRED[pred][1] : '표지에서 아직 고르지 않았어요.';
      },
    };
  };

  /* ---------- 표지: 내 생각 고르기 ---------- */
  $$('#pred .opt').forEach((b) => b.addEventListener('click', () => {
    pred = b.dataset.v;
    $$('#pred .opt').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $('#predSay').textContent = '골랐어요. 마지막 장에서 다시 확인해요.';
  }));

  start(parts);
})();
