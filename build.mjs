// 수업 슬라이드를 단원마다 파일 하나로 묶는다.
//   node build.mjs            → <단원>/index.html (인터넷 없이 열리는 완성본, Three.js 포함)
//   node build.mjs <폴더>     → 위에 더해, 웹 게시용 조각(문서 틀 없이, Three.js는 CDN)을 <폴더>/<단원>.html 에 쓴다
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const at = (p) => new URL(p, import.meta.url);
const read = (p) => readFileSync(at(p), 'utf8');
const safe = (js) => js.replace(/<\/script/gi, '<\\/script');

const FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jua&family=Noto+Sans+KR:wght@400;500;700&display=swap">';
const LESSONS = { season: '계절의 변화 3D 수업', electric: '전기의 이용 수업' };
const css0 = read('./src/common/style.css');
const core = safe(read('./src/common/core.js'));
const three = safe(read('./node_modules/three/build/three.min.js'));
const outDir = process.argv[2];

for (const [name, TITLE] of Object.entries(LESSONS)) {
  if (!existsSync(at(`./src/${name}/body.html`))) continue;
  const extra = at(`./src/${name}/style.css`);
  const css = css0 + (existsSync(extra) ? readFileSync(extra, 'utf8') : '');
  const body = read(`./src/${name}/body.html`);
  const app = core + '\n' + safe(read(`./src/${name}/app.js`));
  const standalone = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${TITLE}</title>
${FONTS}
<style>
${css}</style>
</head>
<body>
${body}
<script>${three}</script>
<script>
${app}</script>
</body>
</html>
`;
  mkdirSync(at(`./${name}/`), { recursive: true });
  writeFileSync(at(`./${name}/index.html`), standalone);
  console.log(`${name}/index.html`, (standalone.length / 1024).toFixed(0) + ' KB');
  if (outDir) {
    const page = `<title>${TITLE}</title>
<meta name="claude:viewport-fit-sides" content="cover">
${FONTS}
<style>
${css}</style>
${body}
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
${app}</script>
`;
    mkdirSync(outDir, { recursive: true });
    writeFileSync(`${outDir}/${name}.html`, page);
    console.log(`${outDir}/${name}.html`, (page.length / 1024).toFixed(0) + ' KB');
  }
}
