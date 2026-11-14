# 공통 도구와 틀

차례: 폴더 · 장의 HTML 틀 · 조각(part) · 2D 무대 · 3D 무대 · 그래프 · 해 볼 일과 물음 · 색 토큰 · 끝까지 해 보기

## 폴더

```
src/common/core.js     모든 단원이 쓰는 도구(window.Lesson). 장 넘기기, 따라 넘기기도 여기 있다
src/common/style.css   공통 모양과 색 토큰
src/<id>/lesson.json   { title, label, name, summary, avoid }
src/<id>/body.html     장의 글과 틀
src/<id>/app.js        장마다의 조작
src/<id>/style.css     이 단원에서만 쓰는 모양(없어도 됨)
src/web/               웹 첫 화면과 수업방(파이어베이스)
build.mjs              묶기. src 아래에서 lesson.json 이 있는 폴더를 모두 찾는다
<id>/index.html, docs/ 묶은 결과. 손으로 고치지 않는다
```

공통 파일은 새 단원을 만들 때 고치지 않는 것이 기본이다. 두 단원 이상이 쓸 도구가 생겼을 때만 `core.js`로 옮기고, 옮겼으면 모든 단원을 다시 점검한다.

## 장의 HTML 틀

장은 `<section class="slide …" data-name="영문" data-label="차례에 보일 이름">`이다. 첫 장만 `hidden`이 없다.

| 종류 | class | 안에 넣는 것 |
|---|---|---|
| 표지 | `slide cover` | `.txt`(`.kind`, `h1`, `ol.goals`, `#pred.pick`, `.memo`) + `svg` |
| 체험 | `slide lab` | `.head`(`.kind`, `h2`, `.memo`) + `.stage`(`.view` + `.ctrl`) + `.side` |
| 확인 | `slide check` | `.head` + `ul.ox` + `.sum` |

체험 장의 조각들:

```html
<div class="stage">
  <div class="view">                         <!-- 2D면 class="view flat" -->
    <canvas class="gl" aria-label="…"></canvas>      <!-- 2D면 class="flat2d" id="…" -->
    <div class="over">…화면 위에 얹는 단추(모드·카드 고르기)…</div>
    <p class="clock" hidden></p>              <!-- 오른쪽 위 딱지(시각 등) -->
    <p class="hint">빈 곳을 끌면 돌려 볼 수 있어요</p>     <!-- 3D만 -->
    <p class="fallback">이 기기에서는 입체 화면을 띄울 수 없어요. …</p>   <!-- 3D만 -->
  </div>
  <div class="ctrl">
    <label for="x">이름</label><input type="range" id="x" …><output id="xOut" for="x"></output>
    <button class="btn go" type="button">주된 동작</button>     <!-- 주황 -->
    <button class="btn" type="button" aria-pressed="false">고르기</button>
    <label class="chk"><input type="checkbox" id="…"> 선택</label>
  </div>
</div>
<div class="side">
  <div class="reads"><div class="read" style="--c: var(--sun)"><span>이름</span><b id="…">0</b><small>단위</small></div></div>
  <div class="plot"><ul class="legend"><li style="--c: var(--sun)">이름</li></ul><canvas id="…"></canvas></div>
  <div class="tablewrap"><table>…</table></div>
  <ol class="todo"><li>…</li></ol>
  <div class="quest" id="…Q" hidden><p>물음</p><div class="opts row"><button class="opt" data-v="a">보기</button></div><p class="say" aria-live="polite"></p></div>
  <div class="learn"><b>알게 된 것</b><span class="lock">해 볼 일을 마치면 열려요.</span><span class="body">…</span></div>
  <div class="card" style="--c: var(--cold)"><b>제목</b><p>…</p></div>
  <p class="fine">값의 출처, 단순화한 점</p>
</div>
```

- 긴 값은 `<b class="sm">`로 작게 쓴다
- 보기가 길면 `.opts`(세로), 짧으면 `.opts.row`(가로)
- 모든 `input`과 `canvas`에 `id`와 `aria-label`(또는 `label for`)을 단다
- 한 장에 실험이 둘이면 `.side` 안을 `<div class="box" id="…">` 두 개로 나누고 하나를 `hidden`으로 바꿔 가며 보인다. `todo(상자, n)`은 상자 단위로 동작한다

## 조각(part)

```js
parts.<data-name> = function (root) {
  // 그 장을 처음 볼 때 한 번 불린다. root 는 그 장의 section
  return {
    setActive(on) { … },   // 장이 보이면 true, 떠나면 false. 무대의 setActive 를 그대로 넘긴다
    refresh() { … },       // (선택) 창 크기가 바뀔 때. 그래프를 다시 그린다
  };
};
start(parts);              // 파일 맨 끝에서 한 번
```

조각 안은 «상태 변수 → `upd()`가 상태를 읽어 읽을값·표·해 볼 일·무대를 모두 맞춤» 한 방향으로 쓴다. 단추와 막대의 처리기는 상태만 바꾸고 `upd()`를 부른다. 이렇게 해야 화면과 값이 어긋나지 않는다.

## 2D 무대

```js
const stage = flat(canvas, (g, t, dt) => { … }, (x, y) => { … });   // 그리기, (선택) 눌렀을 때
return { setActive: stage.setActive };
```

- 그리기는 800×500 칸 기준이다. 화면 크기에 맞춰 줄여 준다. `t`는 지난 시간(초), `dt`는 프레임 사이 시간
- 눌렀을 때의 `x, y`도 800×500 칸 기준이다
- `rr(g, x, y, w, h, r)` 둥근 네모 길. 뒤에 `g.fill(); g.stroke();`
- `text(g, '글', x, y, 크기, 색, 맞춤)` 기본은 가운데 맞춤, 18px
- 테두리는 `g.lineWidth = 3; g.strokeStyle = tok('ink')`로 통일한다
- 부품 그림(전지, 전구, 스위치, 전선, 전동기, 버저)은 `src/electric/app.js`에 있다. 다른 단원에서 쓰려면 `core.js`로 옮긴다

## 3D 무대

```js
const view = makeView(canvas, { yaw: 25, pitch: 24, dist: 12, target: [0, 1.2, 0], min: 6, max: 24, aspect: 1.5, pmin: 6, pmax: 82 });
if (view) { const S = view.scene; … view.onFrame((dt) => { … }); }
return { setActive(on) { if (view) view.setActive(on); } };
```

- `yaw` 0이면 카메라가 +z 쪽(남쪽)에서 본다. 180이면 북쪽에서 남쪽을 본다. `pitch`는 내려다보는 각, `dist`는 거리
- 좌표: +x 동쪽(오른쪽), +y 위, +z 남쪽(앞)
- `T`는 Three.js r128. 재질은 `MeshLambertMaterial`(빛 받음)과 `MeshBasicMaterial`(빛과 무관, 해·딱지·그림자)
- `label('글', { bg, color, size, round })` 항상 화면을 향하는 글 딱지. `.set('새 글')`로 바꾼다
- `line([V3(...), …], 색, 투명도)` 선. 점을 바꾸려면 `obj.geometry.setFromPoints([...])`
- `ring(r, y, n)` 원 둘레의 점들(→ `line`), `glowSprite('#ffc94d', 크기)` 빛 번짐
- 그림자는 그림자 맵 대신 납작한 어두운 판을 계산한 자리에 놓는다(가늘어도 또렷하다)
- 부드럽게 움직이려면 `onFrame`에서 `값 += (목표 - 값) * Math.min(1, dt * 6)`

## 그래프

```js
plot(canvas, (g, w, h) => { … });          // 크기·해상도를 맞추고 지운 뒤 그리기를 부른다
gridY(g, x0, x1, [y…]);                     // 가로 눈금선
series(g, [[x, y], …], tok('sun'));         // 꺾은선 + 점
```

- 눈금과 축 이름을 교과서 그래프와 맞춘다(범위, 단위, 가로축 차례)
- 기록한 점만 그린다. 학생이 조작해 지나간 곳이 쌓이게 한다
- 지금 값의 자리에 세로 점선이나 큰 점을 둔다
- 범례는 캔버스 밖 `ul.legend`에 쓴다

## 해 볼 일과 물음

```js
todo(root, n);                              // 앞에서 n개를 마침으로. 다 마치면 .learn 이 열린다
ask(보기상자, '정답의 data-v', (ok) => { … });   // 맞히면 그 보기만 남는다. 틀리면 다시 고를 수 있다
ox(root);                                   // 확인 장의 ○× 묶음
josa('깡통', '이', '가');                    // '깡통이'
```

- 해 볼 일의 조건은 느슨하게 잡는다(«90° 이상»이 아니라 «70° 이상»). 정확히 끝값을 맞춰야 하면 터치로는 어렵다
- 물음 상자는 견줄 것을 다 본 뒤에 `hidden`을 푼다
- 틀렸을 때의 말은 화면의 어디를 다시 보면 되는지 알려 준다(«주황색 그래프에서 가장 높은 점을 찾아보세요»)

## 색 토큰

`--sky`(바탕) `--paper`(칸) `--ink`(글·테두리) `--ink-2`(흐린 글) `--line`(눈금) `--sun`(강조·주황) `--sun-soft` `--hot`(빨강) `--cold`(파랑) `--leaf`(초록) `--ground`(땅) `--shade`(그림자·어두운 회색) `--ok` `--ok-soft` `--no-soft`

- 한 장 안에서 색의 뜻을 고정한다(태양 고도는 늘 주황, 기온은 늘 빨강). 읽을값의 윗줄 색, 그래프 선, 범례가 같은 색이어야 한다
- 새 색이 꼭 필요하면 `src/common/style.css`의 `:root`에 토큰으로 더한다

## 끝까지 해 보기

`check.js`는 무작정 눌러 볼 뿐이라 정답 경로를 모른다. 장마다 한 번은 정답 경로를 따라가 «알게 된 것»이 열리는지 본다. 임시 폴더에 스크립트를 쓴다.

```js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1366, height: 800 } });
  p.on('pageerror', (e) => console.log('오류', e.message));
  await p.route('**/fonts.g*/**', (r) => r.abort());
  await p.goto('file:///…/<id>/index.html#<data-name>');
  const setR = (sel, v) => p.evaluate(([s, v]) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }, [sel, v]);
  await setR('#flatX', 5); await setR('#flatX', 95);         // 해 볼 일 1, 2
  await p.click('#flatQ [data-v="a"]');                       // 물음
  console.log('열림:', await p.locator('[data-name="<data-name>"] .learn.open').count());
  await p.screenshot({ path: '…/done.png' });
  await b.close();
})();
```

Playwright와 Chromium은 이 환경에 깔려 있다. 다시 설치하지 않는다.
