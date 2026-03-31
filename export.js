const { initializeFirebaseApp, backups } = require('firestore-export-import');
const fs = require('fs');
const serviceAccount = require('./old-key.json'); // 기존 DB 열쇠

// 1. 기존 파이어베이스 연결
const db = initializeFirebaseApp(serviceAccount);

console.log('데이터를 쏙쏙 뽑아내는 중입니다... 잠시만요!');

// 2. 전체 DB 백업 (반복문 없이 한 방에!)
backups(db)
    .then((data) => {
        fs.writeFileSync('backup.json', JSON.stringify(data, null, 2));
        console.log('🎉 추출 대성공! 왼쪽에 backup.json 파일이 생겼는지 확인하세요.');
    })
    .catch((err) => {
        console.error('앗, 에러 발생:', err);
    });