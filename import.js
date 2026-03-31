const { initializeFirebaseApp, restore } = require('firestore-export-import');
const serviceAccount = require('./new-key.json'); // 새 DB 열쇠

// 1. 새 파이어베이스 연결
const db = initializeFirebaseApp(serviceAccount);

console.log('새 DB로 데이터를 팍팍 밀어넣는 중입니다...!');

// 2. 백업 파일 읽어서 그대로 복원하기
restore(db, 'backup.json')
    .then(() => {
        console.log('🎉 데이터 넣기 완료! 파이어베이스 콘솔을 새로고침 해보세요.');
    })
    .catch((err) => {
        console.error('앗, 에러 발생:', err);
    });