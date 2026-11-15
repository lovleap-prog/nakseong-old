/* __LABEL__ «__NAME__» 수업 슬라이드.
   장마다 조각(part)을 하나씩 붙인다. parts.<data-name> = function (root) { … return { setActive(on), refresh? } }
   조각은 그 장을 처음 볼 때 한 번 만들어지고, 장이 보일 때만 setActive(true) 가 된다. */
(function () {
  'use strict';
  const L = window.Lesson;   // L.reduce 는 «움직임 멈추기»에 따라 바뀌므로 꺼내 두지 않고 매번 읽는다
  const { T, $, $$, tok, DEG, clamp, makeView, label, glowSprite, line, V3, ring, flat, rr, text, josa, plot, series, gridY, todo, ask, ox, stamp, demo, start } = window.Lesson;
  const parts = {};

  /* ---------- 평면(2D) 체험의 본보기 ----------
     flat(캔버스, 그리기, 누르기?) 는 800×500 칸에 그리면 화면 크기에 맞춰 준다. 그리기는 장이 보이는 동안 매 프레임 불린다. */
  parts.flatlab = function (root) {
    const slider = $('#flatX'), out = $('#flatOut'), qbox = $('#flatQ'), say = $('.say', qbox);
    let moved = false, sawBoth = false, okQ = false, lo = false, hi = false;
    const model = (x) => 5 + x * 0.3;                      // 상태 → 값. 계산식은 한곳에 두고 화면과 읽을값이 함께 쓴다

    const stage = flat($('#flatCv'), (g, t) => {
      const x = +slider.value;
      g.fillStyle = tok('ground'); g.fillRect(0, 400, 800, 100);
      g.lineWidth = 3; g.strokeStyle = tok('ink');
      g.fillStyle = tok('sun'); rr(g, 100 + x * 5, 330, 90, 70, 10); g.fill(); g.stroke();
      text(g, '여기에 그려요', 400, 120, 22, tok('ink-2'));
    });

    function upd() {
      const x = +slider.value;
      out.textContent = x + ' cm';
      $('#flatVal').textContent = model(x).toFixed(1);
      if (x <= 10) lo = true;
      if (x >= 90) hi = true;
      sawBoth = lo && hi;
      qbox.hidden = !sawBoth;                              // 물음은 견줄 것을 다 본 뒤에 연다
      todo(root, sawBoth && okQ ? 3 : sawBoth ? 2 : moved ? 1 : 0);   // 예상을 골랐을 때만 «알게 된 것»이 열린다(공통 도구가 확인)
      if (Math.abs(x - 50) <= 2) stamp(root);              // 도전: 숫자나 상태로 판정. 시연 중에는 찍히지 않는다
    }
    slider.addEventListener('input', () => { moved = true; upd(); });
    ask($('.opts', qbox), 'a', (ok) => { okQ = okQ || ok; say.textContent = ok ? '맞았어요.' : '화면을 다시 살펴보세요.'; upd(); });
    upd();
    // 보여 주기: 3~5단계. 말은 학생이 볼 결과를 한 문장으로, 동작은 학생이 할 조작과 같은 단추·막대로
    demo(root, [
      ['TODO 처음 모습을 설명하는 한 문장', (d) => d.slide(slider, 0, 800)],
      ['TODO 바꾸면 무엇이 달라지는지', (d) => d.slide(slider, 100, 3000)],
      ['TODO 이 장의 결론 한 문장', (d) => d.wait(600)],
    ]);
    return { setActive: stage.setActive };
  };

  /* ---------- 입체(3D) 체험의 본보기 ----------
     makeView(캔버스, 보기) 는 끌어서 돌려 보기·바퀴로 다가가기·크기 맞추기를 해 준다. WebGL이 안 되면 null. */
  parts.spacelab = function (root) {
    const slider = $('#spaceA'), out = $('#spaceOut');
    const view = makeView($('canvas.gl', root), { yaw: 25, pitch: 24, dist: 12, target: [0, 1.2, 0], min: 6, max: 24, aspect: 1.5 });
    let box = null, tag = null, lo = false, hi = false;
    if (view) {
      const S = view.scene;
      S.add(new T.HemisphereLight(0xffffff, 0xd8e2ea, 0.75));            // 빛은 합쳐서 1을 넘지 않게(넘으면 색이 날아간다)
      const sun = new T.DirectionalLight(0xffffff, 0.3); sun.position.set(4, 8, 5); S.add(sun);
      const floor = new T.Mesh(new T.CircleGeometry(6, 64), new T.MeshLambertMaterial({ color: tok('ground') }));
      floor.rotation.x = -Math.PI / 2; S.add(floor);
      box = new T.Mesh(new T.BoxGeometry(1.4, 2.4, 1.4), new T.MeshLambertMaterial({ color: tok('sun') }));
      box.position.y = 1.2; S.add(box);
      tag = label('0°', { bg: '#ffffff', color: tok('hot'), size: 0.6 }); tag.position.set(0, 3.1, 0); S.add(tag);
      // 계속 움직이는 것이 있으면 view.onFrame((dt) => { … }) 에 쓴다. prefers-reduced-motion(L.reduce)이면 멈춘다.
    }
    function upd() {
      const a = +slider.value;
      out.textContent = a + '°';
      $('#spaceVal').textContent = a;                      // 읽을값은 입체 화면이 없어도 바뀌어야 한다
      if (a <= 10) lo = true;
      if (a >= 80) hi = true;
      todo(root, lo && hi ? 2 : lo || hi ? 1 : 0);
      if (a === 45) stamp(root);
      if (!view) return;
      box.rotation.z = -a * DEG;
      tag.set(a + '°');
    }
    slider.addEventListener('input', upd);
    upd();
    demo(root, [
      ['TODO', (d) => d.slide(slider, 0, 1000)],
      ['TODO', (d) => d.slide(slider, 90, 3000)],
      ['TODO', (d) => d.wait(600)],
    ]);
    return { setActive(on) { if (view) view.setActive(on); } };
  };

  /* ---------- 표지와 확인 ---------- */
  let pred = '';
  const PRED = {                                           // 보기 → [학생이 고른 말, 마지막 장에서 보여 줄 풀이]
    a: ['TODO 흔한 오개념', 'TODO 어느 체험에서 무엇을 봤는지로 바로잡는 말'],
    b: ['TODO 과학적인 생각', '맞아요. TODO'],
    c: ['TODO 또 다른 오개념', 'TODO'],
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
