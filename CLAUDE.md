# 움직이는 초등 과학 수업

초등 과학 교과서(아이스크림미디어, 2022 개정) 단원을 조작형 수업 슬라이드로 만드는 저장소다. 쓰는 사람은 초등학교 선생님과 학생이다.

- 단원을 새로 만들거나 고칠 때는 `science-lesson` 스킬(`.claude/skills/science-lesson/SKILL.md`)을 먼저 읽고 그 순서를 따른다.
- 원본은 `src/<단원>/`, 공통 도구는 `src/common/`. `<단원>/index.html`과 `docs/`는 `node build.mjs`가 만든 결과이니 손으로 고치지 않는다.
- 고친 뒤에는 `node .claude/skills/science-lesson/scripts/check.js <단원>`을 돌리고, 찍힌 화면(`.check/<단원>/`)을 직접 열어 본다.
- 사용자에게는 개발 용어를 줄이고 쉬운 말로 알린다. 교과서 값이 아닌 것과 확인하지 못한 것을 빠뜨리지 않는다.
