#!/usr/bin/env node
// 새 단원의 뼈대를 만든다.
//   node .claude/skills/science-lesson/scripts/new-lesson.mjs <id> "<단원 이름>" "<학년 학기 과목 단원>" "<한 줄 요약>"
//   예) node .claude/skills/science-lesson/scripts/new-lesson.mjs burning "연소와 소화" "6학년 2학기 과학 2단원" "연소의 조건, 연소 생성물, 소화"
// src/<id>/ 에 lesson.json · body.html · app.js · style.css 를 본보기에서 베껴 넣는다. 이미 있으면 건드리지 않는다.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const root = new URL('../../../../', import.meta.url);
const tpl = new URL('../assets/template/', import.meta.url);
const [id, name, label, summary] = process.argv.slice(2);
if (!id || !name || !label || !/^[a-z][a-z0-9-]*$/.test(id)) {
  console.error('쓰는 법: new-lesson.mjs <id: 영문 소문자> "<단원 이름>" "<학년 학기 과목 단원>" "<한 줄 요약>"');
  process.exit(2);
}
const dir = new URL(`src/${id}/`, root);
if (existsSync(dir)) { console.error(`src/${id}/ 가 이미 있어요. 다른 id 를 쓰거나 그 폴더를 고치세요.`); process.exit(1); }
mkdirSync(dir, { recursive: true });
const fill = (s) => s.replaceAll('__NAME__', name).replaceAll('__LABEL__', label).replaceAll('__ID__', id);
for (const f of ['body.html', 'app.js', 'style.css']) writeFileSync(new URL(f, dir), fill(readFileSync(new URL(f, tpl), 'utf8')));
writeFileSync(new URL('lesson.json', dir), JSON.stringify({ title: `${name} 수업`, label, name, summary: summary || '', avoid: [] }, null, 2) + '\n');
console.log(`src/${id}/ 를 만들었어요. 다음: 교과서를 읽고 body.html 과 app.js 를 채운 뒤\n  node .claude/skills/science-lesson/scripts/check.js ${id}`);
