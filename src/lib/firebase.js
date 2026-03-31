import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// (참고: getAnalytics는 서버 렌더링 환경에서 에러를 유발할 수 있어 안전을 위해 제외했습니다)

// 기획자님이 주신 Firebase 설정값
const firebaseConfig = {
  apiKey: "AIzaSyBYu_FsNCxQTn5W5iZWkKsH1SJl8BovLpU",
  authDomain: "today-food-d7fc4.firebaseapp.com",
  projectId: "today-food-d7fc4",
  storageBucket: "today-food-d7fc4.firebasestorage.app",
  messagingSenderId: "185612502302",
  appId: "1:185612502302:web:1f2d5b2a2a213c1fac750f",
  measurementId: "G-SES5308VR7"
};

// 파이어베이스 초기화 및 도구 세팅
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);

// 다른 파일(page.tsx 등)에서 쓸 수 있도록 내보내기 (가장 중요!)
export { app, auth, googleProvider, db, storage };