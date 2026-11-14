# 저장과 게시

## 저장소에 올리기

- 원본은 `src/<id>/`, 묶은 결과는 `<id>/index.html`과 `docs/`다. 묶은 결과도 함께 올린다(선생님이 파일로 바로 열 수 있게)
- 세션에 지정된 작업 가지에만 올린다. 풀 리퀘스트는 사용자가 말할 때만 만든다
- 올리기 전에 `node .claude/skills/science-lesson/scripts/check.js <id>`가 통과해야 한다
- `.check/`(점검 화면)와 `node_modules/`는 올리지 않는다

## 여는 방법 세 가지

| 방법 | 어디서 | 따라 넘기기 |
|---|---|---|
| 파일 | `<id>/index.html`을 내려받아 연다. 인터넷 없이 열린다(글꼴만 기본 글꼴) | 없음 |
| claude.ai 게시 | Artifact 링크 | 로그인한 사람끼리만 |
| 웹(`docs/`) | GitHub Pages 주소 | 수업방: 학생은 로그인 없이 참여 코드로 |

## claude.ai에 게시하기 (Artifact 도구가 있을 때)

1. `node build.mjs <임시 폴더>`로 `<임시 폴더>/<id>.html`을 만든다. 이 파일은 문서 틀이 없고 Three.js를 cdnjs에서 읽는다
2. 새 단원이면 Artifact 도구로 그 파일을 게시한다. `icon`은 단원을 나타내는 낱말 하나, `description`은 한 문장, `capabilities`는 아래 값. 처음 선언하기 전에 `artifact-capabilities` 스킬을 읽는다

   ```json
   { "db": { "rules": [{ "path": "live", "read": "view", "write": "admin" }] } }
   ```

3. 이미 게시한 단원을 고쳤으면 같은 파일 경로로 다시 게시한다(같은 주소가 유지된다). 다른 대화에서 만든 것이면 그 주소를 `url`로 넘기고, 먼저 `read`로 읽는다. `capabilities`는 생략하면 그대로 유지된다
4. 게시한 쪽에서는 `alert`·`confirm`, 인쇄, 내려받기 링크, 다른 서버와의 통신이 막혀 있다. 그래서 수업방(파이어베이스)은 이쪽에서 동작하지 않고, 대신 `core.js`가 claude.ai 공유 저장소로 따라 넘기기를 한다. 이 기능은 로그인한 사람에게만 열린다
5. 링크는 처음에 만든 사람만 볼 수 있다. 사용자가 공유 메뉴에서 풀어야 한다고 알린다

## 웹에 올리기 (`docs/`)

- `docs/`는 `node build.mjs`가 매번 새로 만든다. 첫 화면의 단원 목록도 `lesson.json`에서 자동으로 만들어진다
- GitHub Pages가 저장소의 `docs/` 폴더를 내보낸다. 켜는 것은 사용자가 한다: 저장소 Settings → Pages → Branch에서 가지와 `/docs` 선택
- 주소는 `https://<계정>.github.io/<저장소>/`

## 수업방(파이어베이스)

- 설정값은 `src/web/firebase-config.js`의 `window.FIREBASE_CONFIG`에 넣는다. `null`이면 수업방이 꺼지고 나머지는 그대로 동작한다. 이 값은 비밀이 아니다(웹 쪽에 그대로 실린다). 접근은 규칙이 막는다
- 규칙은 `src/web/database.rules.json`. 사용자가 파이어베이스 콘솔의 Realtime Database → 규칙에 붙여 넣는다
- 자료 꼴: `rooms/<여섯 자리 코드> = { owner, lesson, slide, on, at }`. 선생님은 구글 로그인으로 자기 방에만 쓰고, 학생은 로그인 없이 코드를 아는 방만 읽는다. 학생의 이름이나 응답은 저장하지 않는다
- 새 단원을 더해도 수업방 쪽은 고칠 것이 없다. `lesson`에는 단원 id가, `slide`에는 장의 `data-name`이 들어간다
- 학생 응답 모으기처럼 저장하는 자료를 늘릴 때는 규칙을 함께 고치고, 무엇이 저장되는지 사용자에게 먼저 알린다. 학생 개인정보는 넣지 않는다
- 서비스 계정 키, 비밀번호 같은 비밀은 저장소와 대화에 넣지 않는다

## 교과서 자료

- 사용자가 준 교과서 PDF는 읽기만 한다. 저장소에 올리지 않고, 쪽 그림을 결과물에 넣지 않는다
- 교과서의 문장은 정리 문장과 용어 수준에서만 쓰고, 그림은 다시 그린다
