// 수업 슬라이드를 파일 하나로 묶는다.
//   node build.mjs            → season/index.html (인터넷 없이 열리는 완성본, Three.js 포함)
//   node build.mjs <경로>     → 위에 더해, 웹 게시용 조각(문서 틀 없이, Three.js는 CDN)을 <경로>에 쓴다
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const safe = (js) => js.replace(/<\/script/gi, '<\\/script');

const TITLE = '계절의 변화 3D 수업';
const FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jua&family=Noto+Sans+KR:wght@400;500;700&display=swap">';
const css = read('./src/season/style.css');
const body = read('./src/season/body.html');
const app = safe(read('./src/season/app.js'));
const three = safe(read('./node_modules/three/build/three.min.js'));

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
mkdirSync(new URL('./season/', import.meta.url), { recursive: true });
writeFileSync(new URL('./season/index.html', import.meta.url), standalone);
console.log('season/index.html', (standalone.length / 1024).toFixed(0) + ' KB');

const out = process.argv[2];
if (out) {
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
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, page);
  console.log(out, (page.length / 1024).toFixed(0) + ' KB');
}
