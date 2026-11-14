/* 수업방(파이어베이스 Realtime Database). 웹에 올린 판에서만 쓴다.
   rooms/<여섯 자리 코드> = { owner: 선생님 uid, lesson: 단원, slide: 지금 장, on: 진행 중인지, at: 시각 }
   선생님은 구글로 로그인해 방을 열고 자기 방에만 쓴다. 학생은 로그인 없이 코드를 아는 방 하나만 읽는다.
   주소에 ?room=코드 가 있으면 학생(따라가기), 없으면 선생님(방 열기)으로 본다. */
window.LessonRoom = (function () {
  'use strict';
  const cfg = window.FIREBASE_CONFIG;
  if (!cfg || !window.firebase) return null;
  let app = null;
  const init = () => { if (!app) app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(cfg); return app; };
  const lesson = () => document.body.dataset.lesson || '';
  const codeInUrl = () => { const c = new URLSearchParams(window.location.search).get('room') || ''; return /^\d{6}$/.test(c) ? c : ''; };

  // 선생님: 구글 로그인 뒤 비어 있는 코드로 방을 만든다
  async function openRoom(slide) {
    init();
    const auth = window.firebase.auth(), db = window.firebase.database();
    if (!auth.currentUser) await auth.signInWithPopup(new window.firebase.auth.GoogleAuthProvider());
    const uid = auth.currentUser.uid;
    for (let i = 0; i < 8; i++) {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const ref = db.ref('rooms/' + code);
      try {
        await ref.set({ owner: uid, lesson: lesson(), slide, on: true, at: window.firebase.database.ServerValue.TIMESTAMP });
        ref.onDisconnect().update({ on: false });           // 창을 닫으면 진행이 끝난 것으로 표시
        return { code, ref };
      } catch (e) { /* 이미 있는 코드(다른 선생님 방)면 다시 뽑는다 */ }
    }
    throw new Error('room');
  }

  async function connect() {
    init();
    const db = window.firebase.database(), code = codeInUrl();
    if (code) {                                             // 학생
      const ref = db.ref('rooms/' + code);
      return {
        canLead: false, me: '', leadLabel: '',
        open: async () => '', close() {}, write() {},
        watch(cb, fail) { ref.on('value', (snap) => { const d = snap.val(); cb(d ? { on: !!d.on, slide: d.slide, by: d.owner } : null); }, fail); },
      };
    }
    let room = null;                                        // 선생님
    return {
      canLead: true, me: 'teacher', leadLabel: '수업방 열기',
      async open(slide) { room = await openRoom(slide); return room.code; },
      close(slide) { if (room) { room.ref.update({ on: false, slide }); } },
      write(slide) { if (room) room.ref.update({ on: true, slide }); },
      watch() {},
    };
  }

  // 첫 화면: 코드로 방을 찾아 그 단원 주소를 돌려준다
  async function find(code) {
    init();
    const snap = await window.firebase.database().ref('rooms/' + code).get();
    const d = snap.val();
    return d && d.lesson ? { lesson: d.lesson, on: !!d.on } : null;
  }

  return { connect, find };
})();
