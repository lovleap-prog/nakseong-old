// 수업 슬라이드를 단원마다 묶는다. 단원은 src/<단원>/lesson.json 이 있는 폴더를 모두 찾아 만든다.
//   node build.mjs            → <단원>/index.html  파일 하나로 열리는 완성본(Three.js 포함, 인터넷 없이 열림)
//                             → docs/              웹에 올리는 판(첫 화면 + 단원, 수업방 연결)
//   node build.mjs <폴더>     → 위에 더해, claude.ai 게시용 조각(문서 틀 없이, Three.js는 CDN)을 <폴더>/<단원>.html 에 쓴다
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';

const at = (p) => new URL(p, import.meta.url);
const read = (p) => readFileSync(at(p), 'utf8');
const safe = (js) => js.replace(/<\/script/gi, '<\\/script');

const FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jua&family=Noto+Sans+KR:wght@400;500;700&display=swap">';
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-';
const css0 = read('./src/common/style.css');
const core = safe(read('./src/common/core.js'));
const three = safe(read('./node_modules/three/build/three.min.js'));
const outDir = process.argv[2];

const lessons = readdirSync(at('./src/'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(at(`./src/${d.name}/lesson.json`)))
  .map((d) => Object.assign({ id: d.name }, JSON.parse(read(`./src/${d.name}/lesson.json`))))
  .sort((a, b) => a.label.localeCompare(b.label, 'ko'));

const head = (title, css) => `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
${FONTS}
<style>
${css}</style>`;

mkdirSync(at('./docs/'), { recursive: true });
for (const L of lessons) {
  const extra = at(`./src/${L.id}/style.css`);
  const css = css0 + (existsSync(extra) ? readFileSync(extra, 'utf8') : '');
  const body = read(`./src/${L.id}/body.html`);
  const app = core + '\n' + safe(read(`./src/${L.id}/app.js`));

  // 1) 파일 하나짜리 완성본
  mkdirSync(at(`./${L.id}/`), { recursive: true });
  writeFileSync(at(`./${L.id}/index.html`), `<!doctype html>
<html lang="ko">
<head>
${head(L.title, css)}
</head>
<body>
${body}
<script>${three}</script>
<script>
${app}</script>
</body>
</html>
`);

  // 2) 웹에 올리는 판: Three.js와 수업방(파이어베이스)을 따로 읽는다
  mkdirSync(at(`./docs/${L.id}/`), { recursive: true });
  writeFileSync(at(`./docs/${L.id}/index.html`), `<!doctype html>
<html lang="ko">
<head>
${head(L.title, css)}
</head>
<body data-lesson="${L.id}">
${body}
<script src="../three.min.js"></script>
<script src="${SDK}app-compat.js"></script>
<script src="${SDK}auth-compat.js"></script>
<script src="${SDK}database-compat.js"></script>
<script src="../firebase-config.js"></script>
<script src="../room.js"></script>
<script>
${app}</script>
</body>
</html>
`);

  // 3) claude.ai 게시용 조각
  if (outDir) {
    mkdirSync(outDir, { recursive: true });
    writeFileSync(`${outDir}/${L.id}.html`, `<title>${L.title}</title>
<meta name="claude:viewport-fit-sides" content="cover">
${FONTS}
<style>
${css}</style>
${body}
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
${app}</script>
`);
  }
  console.log(`${L.id}: ${L.label} ${L.name}`);
}

// 웹 첫 화면과 함께 쓰는 파일
const units = lessons.map((L) => `      <li><a href="${L.id}/"><small>${L.label}</small><h3>${L.name}</h3><span>${L.summary}</span></a></li>`).join('\n');
writeFileSync(at('./docs/index.html'), read('./src/web/index.html').replace('<!--UNITS-->', units));
for (const f of ['room.js', 'firebase-config.js']) writeFileSync(at(`./docs/${f}`), read(`./src/web/${f}`));
writeFileSync(at('./docs/three.min.js'), read('./node_modules/three/build/three.min.js'));
console.log(`${lessons.length}개 단원을 만들었어요.`);
