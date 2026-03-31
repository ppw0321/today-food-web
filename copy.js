const admin = require('firebase-admin');
const oldKey = require('./old-key.json');
const newKey = require('./new-key.json');

// 1. 기존 DB 연결 (old)
const oldApp = admin.initializeApp({ credential: admin.credential.cert(oldKey) }, 'oldApp');
const oldDb = oldApp.firestore();

// 2. 새 DB 연결 (new)
const newApp = admin.initializeApp({ credential: admin.credential.cert(newKey) }, 'newApp');
const newDb = newApp.firestore();

async function copyData() {
    console.log('👻 유령 문서를 뚫고 reviews 데이터를 직접 복사합니다...');

    try {
        // 3. collectionGroup을 사용해 부모 문서 상태와 상관없이 'reviews' 데이터 싹 다 긁어오기
        const snapshot = await oldDb.collectionGroup('reviews').get();

        if (snapshot.empty) {
            console.log('가져올 리뷰 데이터가 없습니다.');
            process.exit(0);
        }

        let count = 0;
        // 4. 가져온 데이터를 새 DB의 "완전히 똑같은 경로"에 하나씩 꽂아넣기
        for (const doc of snapshot.docs) {
            const exactPath = doc.ref.path; // 예: users/123/reviews/456
            const data = doc.data();

            await newDb.doc(exactPath).set(data);
            count++;
            console.log(`${count}번째 리뷰 복사 완료: ${exactPath}`);
        }

        console.log(`🎉 대성공! 총 ${count}개의 리뷰 데이터가 새 DB로 완벽하게 이사했습니다!`);
        process.exit(0);
    } catch (error) {
        console.error('앗, 에러 발생:', error);
        process.exit(1);
    }
}

copyData();