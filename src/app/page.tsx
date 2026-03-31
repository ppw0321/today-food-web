"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  UtensilsCrossed, Star, Plus, RefreshCw, ChefHat, MapPin,
  ExternalLink, Check, Copy, LogIn, LogOut, User, Search, Tag,
  Pencil, X, Camera, Image as ImageIcon, ChevronLeft, ChevronRight,
  Compass, Loader2, Trash2, Mail, Lock, Eye, EyeOff, Share2
} from "lucide-react";
import { auth, googleProvider, db, storage } from "@/lib/firebase";
import {
  signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail
} from "firebase/auth";
import {
  collection, addDoc, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp, limit, where, getCountFromServer, getDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const BASE_MENUS = [
  "삼겹살", "목살", "돼지갈비", "소갈비", "LA갈비", "차돌박이", "대패삼겹살", "항정살", "갈매기살", "육회", "곱창", "막창", "대창", "닭갈비", "닭발", "오리불고기",
  "김치찌개", "된장찌개", "부대찌개", "순두부찌개", "동태찌개", "청국장", "제육볶음", "오징어볶음", "낙지볶음", "쭈꾸미볶음", "비빔밥", "돌솥비빔밥", "육회비빔밥", "순대국", "뼈해장국", "감자탕", "설렁탕", "갈비탕", "곰탕", "돼지국밥", "찜닭", "닭볶음탕", "아구찜", "해물찜", "갈비찜",
  "물냉면", "비빔냉면", "밀면", "막국수", "콩국수", "칼국수", "수제비", "잔치국수", "비빔국수",
  "짜장면", "간짜장", "짬뽕", "볶음짬뽕", "탕수육", "꿔바로우", "볶음밥", "마파두부", "유산슬", "깐풍기", "양꼬치", "마라탕", "마라샹궈", "훠궈", "우육면",
  "초밥", "사시미", "참치회", "연어회", "돈까스", "치즈돈까스", "라멘", "마제소바", "우동", "소바", "텐동", "사케동", "카레", "규동", "오꼬노미야끼", "타코야끼",
  "토마토파스타", "크림파스타", "오일파스타", "피자", "화덕피자", "스테이크", "리조또", "필라프", "수제버거", "샐러드", "샌드위치", "브런치", "바베큐",
  "쌀국수", "팟타이", "똠양꿍", "반미", "나시고랭", "월남쌈", "분짜", "커리", "타코", "브리또", "퀘사디아", "파히타", "포케", "샤브샤브", "편백찜",
  "떡볶이", "로제떡볶이", "라볶이", "김밥", "참치김밥", "순대", "튀김", "쫄면", "라면", "후라이드치킨", "양념치킨", "간장치킨", "족발", "불족발", "보쌈", "닭강정", "핫도그"
];

const DEFAULT_CATEGORIES = ["한식", "중식", "일식", "양식", "카페", "분식", "동남아", "기타"];

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "한식": ["찌개", "국밥", "볶음", "구이", "찜", "전", "김치", "된장", "순대국", "해장", "삼겹", "제육", "비빔", "칼국수", "냉면", "수제비", "설렁탕", "갈비탕", "감자탕", "불고기", "백반", "국수", "막국수", "탕", "국", "밥", "돼지갈비", "갈비", "목살", "치킨", "통닭", "밀면", "항정살", "갈매기", "육회", "곱창", "막창", "대창", "닭갈비", "닭발", "아구찜", "해물찜", "족발", "보쌈", "차돌박이", "대패", "오리", "청국장", "곰탕", "쭈꾸미", "낙지"],
  "중식": ["짜장", "짬뽕", "탕수", "탕수육", "마라", "마라샹궈", "볶음밥", "만두", "자장", "꿔바로우", "유산슬", "양꼬치", "훠궈", "마파두부", "깐풍기", "우육면"],
  "일식": ["초밥", "스시", "라멘", "우동", "돈까스", "카츠", "사시미", "회", "소바", "텐동", "덮밥", "가라아게", "오꼬노미야끼", "타코야끼", "규동", "카레", "연어", "참치", "마제"],
  "양식": ["피자", "파스타", "버거", "스테이크", "햄버거", "리조또", "샐러드", "샌드위치", "바베큐", "스프", "필라프", "브런치", "오일", "크림", "토마토"],
  "카페": ["커피", "라떼", "디저트", "케이크", "빵", "브런치", "와플", "마카롱", "빙수", "스무디", "에이드"],
  "분식": ["떡볶이", "순대", "튀김", "라볶이", "김밥", "오뎅", "어묵", "쫄면", "라면", "컵밥", "핫도그", "닭강정"],
  "동남아": ["쌀국수", "퍼", "팟타이", "카레", "똠양꿍", "반미", "나시고랭", "월남쌈", "미고랭", "분짜"],
  "기타": ["타코", "브리또", "포케", "샤브샤브", "편의점", "야식", "퀘사디아", "파히타", "편백찜"]
};

const SYNONYM_GROUPS: string[][] = [
  ["순대국", "순대국밥"],
  ["돈까스", "돈가스", "돈카츠", "카츠", "치즈카츠", "치돈"],
  ["짜장면", "자장면", "짜장", "간짜장"],
  ["짬뽕", "짬봉", "짬뽕밥"],
  ["떡볶이", "떡볶", "라볶이", "로제떡볶이"],
  ["마라탕", "마라샹궈", "마라"],
  ["치킨", "닭", "통닭", "후라이드치킨", "양념치킨", "닭강정"],
  ["칼국수", "칼국", "국수", "바지락칼국수"],
  ["삼겹살", "삼겹", "오겹살", "목살"],
  ["초밥", "스시", "회", "사시미", "연어회", "참치회"],
  ["냉면", "물냉", "비냉", "물냉면", "비빔냉면", "밀면"],
  ["햄버거", "버거", "수제버거"],
  ["쌀국수", "베트남쌀국수", "퍼"],
  ["파스타", "스파게티", "크림파스타", "토마토파스타"],
  ["피자", "피짜", "화덕피자"]
];

const getMenuIconDetails = (menuName: string, category: string) => {
  let emoji = "🍽️";

  if (/(치킨|닭강정|깐풍기|닭갈비|닭발|찜닭|볶음탕)/.test(menuName)) emoji = "🍗";
  else if (/(곱창|막창|대창|차돌|대패|베이컨)/.test(menuName)) emoji = "🥓";
  else if (/(삼겹|목살|갈비|항정|갈매기|육회|스테이크|불고기)/.test(menuName)) emoji = "🥩";
  else if (/(족발|보쌈|바베큐|갈비찜)/.test(menuName)) emoji = "🍖";
  else if (/(오징어|낙지|쭈꾸미|해물찜|아구찜)/.test(menuName)) emoji = "🦑";
  else if (/(동태|생선)/.test(menuName)) emoji = "🐟";
  else if (/(제육|마라샹궈|마파두부|떡볶이|라볶이|오꼬노미야끼)/.test(menuName)) emoji = "🥘";
  else if (/(찌개|국|탕|해장|수제비|마라탕|똠양꿍|훠궈|샤브|편백|전골)/.test(menuName)) emoji = "🍲";
  else if (/(비빔밥|백반)/.test(menuName)) emoji = "🍚";
  else if (/(볶음밥|나시고랭|카레|커리|리조또|필라프|규동|사케동)/.test(menuName)) emoji = "🍛";
  else if (/(김밥)/.test(menuName)) emoji = "🍙";
  else if (/(냉면|밀면|막국수|국수|라멘|우동|소바|짬뽕|쌀국수|팟타이|우육면|라면|쫄면)/.test(menuName)) emoji = "🍜";
  else if (/(파스타|스파게티|짜장)/.test(menuName)) emoji = "🍝";
  else if (/(순대|타코야끼|양꼬치|오뎅)/.test(menuName)) emoji = "🍢";
  else if (/(핫도그)/.test(menuName)) emoji = "🌭";
  else if (/(돈까스|카츠|텐동|튀김|탕수육|꿔바로우)/.test(menuName)) emoji = "🍤";
  else if (/(만두|딤섬|유산슬)/.test(menuName)) emoji = "🥟";
  else if (/(월남쌈|샐러드|포케)/.test(menuName)) emoji = "🥗";
  else if (/(버거)/.test(menuName)) emoji = "🍔";
  else if (/(피자)/.test(menuName)) emoji = "🍕";
  else if (/(타코|브리또|퀘사디아|파히타)/.test(menuName)) emoji = "🌮";
  else if (/(샌드위치|반미|토스트)/.test(menuName)) emoji = "🥪";
  else if (/(초밥|스시|사시미|회)/.test(menuName)) emoji = "🍣";
  else if (/(빵|디저트|케이크|마카롱)/.test(menuName)) emoji = "🍰";
  else if (/(커피|라떼|스무디)/.test(menuName)) emoji = "☕";
  else {
    const fallbackEmojis: Record<string, string> = { "한식": "🍚", "중식": "🥟", "일식": "🍱", "양식": "🍽️", "분식": "🥘", "카페": "🥤", "동남아": "🍜", "기타": "🍽️" };
    emoji = fallbackEmojis[category] || "🍽️";
  }

  const catThemes: Record<string, { bgColor: string, textColor: string }> = {
    "한식": { bgColor: "bg-[#F0F4F8]", textColor: "text-[#3B82F6]" },
    "중식": { bgColor: "bg-[#FEF2F2]", textColor: "text-[#EF4444]" },
    "일식": { bgColor: "bg-[#EEF2FF]", textColor: "text-[#6366F1]" },
    "양식": { bgColor: "bg-[#FFF7ED]", textColor: "text-[#F97316]" },
    "분식": { bgColor: "bg-[#FEFCE8]", textColor: "text-[#EAB308]" },
    "카페": { bgColor: "bg-[#FDF2F8]", textColor: "text-[#EC4899]" },
    "동남아": { bgColor: "bg-[#F0FDF4]", textColor: "text-[#14B8A6]" },
    "기타": { bgColor: "bg-[#F5F5F4]", textColor: "text-[#57534E]" }
  };

  const theme = catThemes[category] || catThemes["기타"];
  return { emoji, ...theme };
};

interface Review {
  id: string;
  storeName: string;
  menu: string;
  rating: number;
  comment: string;
  category: string;
  imageUrls?: string[];
}

export default function Home() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup" | "reset">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [pendingImport, setPendingImport] = useState<any>(null);

  const [recommendedMenu, setRecommendedMenu] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  // ✅ 위치 정보를 저장할 State 추가 (미리 받아두기 위해)
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);

  const [nearbySaved, setNearbySaved] = useState<Review[]>([]);
  const [nearbyExternal, setNearbyExternal] = useState<any[]>([]);

  const [sortOrder, setSortOrder] = useState<"accuracy" | "distance">("accuracy");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewLimit, setReviewLimit] = useState(5);
  const [hasMoreReviews, setHasMoreReviews] = useState(true);

  const [totalCount, setTotalCount] = useState<number>(0);
  const [knownCategories, setKnownCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  const [storeName, setStoreName] = useState("");
  const [menu, setMenu] = useState("");
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [category, setCategory] = useState("한식");
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  const [importedUrls, setImportedUrls] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScrapModalOpen, setIsScrapModalOpen] = useState(false);

  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editStoreName, setEditStoreName] = useState("");
  const [editMenu, setEditMenu] = useState("");
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");
  const [editCategory, setEditCategory] = useState("한식");
  const [editCustomCategory, setEditCustomCategory] = useState("");
  const [editShowCustomCategory, setEditShowCustomCategory] = useState(false);

  const [editExistingUrls, setEditExistingUrls] = useState<string[]>([]);
  const [editImageFiles, setEditImageFiles] = useState<File[]>([]);
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]);

  const [isUpdating, setIsUpdating] = useState(false);
  const [filterCategory, setFilterCategory] = useState("전체");
  const [fullScreenData, setFullScreenData] = useState<{ urls: string[], currentIndex: number } | null>(null);

  // ✅ [수정 2] 카카오톡 인앱 브라우저 감지 및 외부 브라우저(크롬/사파리) 강제 이동
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userAgent = navigator.userAgent.toLowerCase();
      // 카카오톡 내장 브라우저인지 확인
      if (userAgent.indexOf("kakaotalk") > -1) {
        // 안드로이드/iOS 모두 작동하는 외부 브라우저 호출 스킴으로 리다이렉트
        window.location.href = "kakaotalk://web/openExternal?url=" + encodeURIComponent(window.location.href);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const uid = params.get("uid");
      const rid = params.get("rid");

      if (uid && rid) {
        const fetchSharedReview = async () => {
          try {
            const docRef = doc(db, "users", uid, "reviews", rid);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
              const data = snap.data();
              setPendingImport({
                storeName: data.storeName || "",
                menu: data.menu || "",
                category: data.category || "기타",
                rating: Number(data.rating) || 5,
                comment: data.comment || "",
                imageUrls: data.imageUrls || (data.imageUrl ? [data.imageUrl] : [])
              });
            } else {
              alert("존재하지 않거나 삭제된 맛집 링크입니다.");
            }
          } catch (error) {
            console.error("공유된 맛집 불러오기 실패:", error);
          } finally {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        };
        fetchSharedReview();
      }
    }
  }, []);

  useEffect(() => {
    if (user && pendingImport) {
      resetForm();
      setStoreName(pendingImport.storeName);
      setMenu(pendingImport.menu);
      setRating(pendingImport.rating);
      setComment(pendingImport.comment);
      setImportedUrls(pendingImport.imageUrls || []);

      if (knownCategories.includes(pendingImport.category)) {
        setCategory(pendingImport.category);
        setShowCustomCategory(false);
      } else {
        setCategory("기타");
        setCustomCategory(pendingImport.category);
        setShowCustomCategory(true);
      }

      setIsScrapModalOpen(true);
      setPendingImport(null);
    } else if (!user && pendingImport) {
      setAuthMode("signup");
      setIsAuthModalOpen(true);
    }
  }, [user, pendingImport, knownCategories]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        setIsAuthModalOpen(false);
        setAuthMode("login");
        setAuthEmail("");
        setAuthPassword("");
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setReviews([]); setTotalCount(0); return; }
    const reviewsRef = collection(db, "users", user.uid, "reviews");

    let q;
    let countQ;

    if (filterCategory === "전체") {
      q = query(reviewsRef, orderBy("createdAt", "desc"), limit(reviewLimit + 1));
      countQ = reviewsRef;
    } else {
      q = query(reviewsRef, where("category", "==", filterCategory), orderBy("createdAt", "desc"), limit(reviewLimit + 1));
      countQ = query(reviewsRef, where("category", "==", filterCategory));
    }

    const fetchTotalCount = async () => {
      try {
        const snapshot = await getCountFromServer(countQ);
        setTotalCount(snapshot.data().count);
      } catch (error) {
        console.error("전체 카운트 로딩 실패:", error);
      }
    };

    const unsubscribe = onSnapshot(q, (snap) => {
      const fetchedDocs = [...snap.docs];

      if (fetchedDocs.length > reviewLimit) {
        setHasMoreReviews(true);
        fetchedDocs.pop();
      } else {
        setHasMoreReviews(false);
      }

      const mappedReviews = fetchedDocs.map((d) => ({
        id: d.id,
        storeName: d.data().storeName,
        menu: d.data().menu,
        rating: d.data().rating,
        comment: d.data().comment,
        category: d.data().category || "기타",
        imageUrls: d.data().imageUrls || (d.data().imageUrl ? [d.data().imageUrl] : []),
      }));

      setReviews(mappedReviews);

      setKnownCategories(prev => {
        const newCats = mappedReviews.map(r => r.category).filter(c => !prev.includes(c));
        if (newCats.length > 0) return [...prev, ...newCats];
        return prev;
      });

      fetchTotalCount();
    }, (error) => {
      console.error("데이터 로딩 에러:", error);
    });

    return () => unsubscribe();
  }, [user, reviewLimit, filterCategory]);

  const handleFilterChange = (cat: string) => {
    setFilterCategory(cat);
    setReviewLimit(5);
  };

  const filterOptions = useMemo(() => ["전체", ...knownCategories], [knownCategories]);
  const filteredReviews = reviews;

  const normalize = (s: string) => s.replace(/[\s()（）]/g, "").toLowerCase();

  const getMenuCategory = (menuName: string): string | null => {
    const norm = normalize(menuName);
    let bestMatchCat: string | null = null;
    let maxKwLen = 0;

    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const kw of keywords) {
        const nKw = normalize(kw);
        if (norm.includes(nKw) || nKw.includes(norm)) {
          if (nKw.length > maxKwLen) {
            maxKwLen = nKw.length;
            bestMatchCat = cat;
          }
        }
      }
    }
    return bestMatchCat;
  };

  // ✅ [수정 3] 룰렛 돌리기 전, '위치 권한' 먼저 받도록 로직 분리
  const handleRecommend = () => {
    setLocationError(null);
    setNearbySaved([]);
    setNearbyExternal([]);

    // 이미 위치 정보가 있다면 바로 룰렛 시작
    if (userLocation) {
      startRoulette(userLocation.lat, userLocation.lng);
      return;
    }

    if (!navigator.geolocation) {
      setLocationError("현재 브라우저에서 위치 기능을 지원하지 않습니다.");
      return;
    }

    setIsLocating(true); // 위치 정보 받는 중 표시

    // 위치 권한 먼저 묻기
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation({ lat, lng }); // 받아온 위치 저장
        setIsLocating(false);
        startRoulette(lat, lng); // 권한 허용되면 룰렛 시작!
      },
      (error) => {
        let errMsg = "위치 정보를 가져올 수 없습니다.";
        if (error.code === 1) errMsg = "위치 권한이 거부되었습니다. 기기의 설정에서 위치 권한을 허용해 주세요.";
        if (error.code === 2) errMsg = "현재 위치 파악 불가. GPS 신호가 약합니다.";
        if (error.code === 3) errMsg = "위치 요청 시간이 초과되었습니다.";
        setLocationError(errMsg);
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  };

  // 룰렛 돌리고 + 맛집 찾는 로직
  const startRoulette = (lat: number, lng: number) => {
    const pool = BASE_MENUS;
    setIsSpinning(true);
    let count = 0;

    const interval = setInterval(() => {
      setRecommendedMenu(pool[Math.floor(Math.random() * pool.length)]);
      count++;
      if (count > 10) {
        clearInterval(interval);
        const finalMenu = pool[Math.floor(Math.random() * pool.length)];
        setRecommendedMenu(finalMenu);
        setIsSpinning(false);
        // 룰렛 끝나면 바로 주변 맛집 검색
        searchLocationBasedPlaces(finalMenu, lat, lng, sortOrder);
      }
    }, 50);
  };

  const searchLocationBasedPlaces = async (finalMenu: string, lat: number, lng: number, currentSort: "accuracy" | "distance") => {
    setIsLocating(true);
    try {
      const KAKAO_API_KEY = "deb0556cf6ab2cc0e38a558fd65ae01b";
      const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(finalMenu)}&y=${lat}&x=${lng}&radius=3000&size=15&sort=${currentSort}`, {
        headers: { Authorization: `KakaoAK ${KAKAO_API_KEY}` }
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.msg || "카카오 API 에러");
      }

      const places = data.documents || [];
      const saved: Review[] = [];
      const external: any[] = [];

      places.forEach((place: any) => {
        const pName = normalize(place.place_name);
        const matched = reviews.find(r => normalize(r.storeName).includes(pName) || pName.includes(normalize(r.storeName)));

        if (matched) {
          if (!saved.some(s => s.id === matched.id)) saved.push(matched);
        } else {
          if (external.length < 5) external.push(place);
        }
      });

      setNearbySaved(saved);
      setNearbyExternal(external);
    } catch (err: any) {
      setLocationError(err.message || "주변 맛집을 불러오는데 실패했습니다.");
    } finally {
      setIsLocating(false);
    }
  };

  const handleSortChange = (newSort: "accuracy" | "distance") => {
    if (sortOrder === newSort || !recommendedMenu || !userLocation) return;
    setSortOrder(newSort);
    // 이미 저장된 userLocation을 사용하여 재검색
    searchLocationBasedPlaces(recommendedMenu, userLocation.lat, userLocation.lng, newSort);
  };

  const resetForm = () => {
    setStoreName(""); setMenu(""); setRating(5); setComment(""); setCategory("한식");
    setCustomCategory(""); setShowCustomCategory(false); setImageFiles([]); setImagePreviews([]); setImportedUrls([]);
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName || !menu || !comment || !user) return;
    setIsSubmitting(true);
    const finalCategory = showCustomCategory && customCategory.trim() ? customCategory.trim() : category;
    try {
      const urls = await uploadMultipleImages(imageFiles, user.uid);
      const finalUrls = [...importedUrls, ...urls].slice(0, 5);
      await addDoc(collection(db, "users", user.uid, "reviews"), {
        storeName, menu, rating, comment, category: finalCategory, imageUrls: finalUrls, createdAt: serverTimestamp(),
      });
      resetForm();
      setIsScrapModalOpen(false);
    } catch (error) { console.error("기록 저장 실패:", error); }
    setIsSubmitting(false);
  };

  const uploadMultipleImages = async (files: File[], userId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const storageRef = ref(storage, `users/${userId}/reviews/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      urls.push(url);
    }
    return urls;
  };

  const handleImagesSelect = (
    e: React.ChangeEvent<HTMLInputElement>, currentTotal: number,
    setFiles: React.Dispatch<React.SetStateAction<File[]>>, setPreviews: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const allowedCount = 5 - currentTotal;
    if (allowedCount <= 0) return;
    const newFilesArray = Array.from(files).slice(0, allowedCount);
    setFiles((prev) => [...prev, ...newFilesArray]);

    const readPromises = newFilesArray.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises).then((results) => {
      setPreviews((prev) => [...prev, ...results]);
      e.target.value = "";
    });
  };

  const openEditModal = (review: Review) => {
    setEditingReview(review);
    setEditStoreName(review.storeName);
    setEditMenu(review.menu);
    setEditRating(review.rating);
    setEditComment(review.comment);
    setEditCategory(review.category);
    setEditCustomCategory("");
    setEditShowCustomCategory(false);
    setEditExistingUrls(review.imageUrls || []);
    setEditImageFiles([]);
    setEditImagePreviews([]);
  };

  const handleUpdateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview || !user) return;
    setIsUpdating(true);
    const finalCategory = editShowCustomCategory && editCustomCategory.trim() ? editCustomCategory.trim() : editCategory;
    try {
      let finalUrls = [...editExistingUrls];
      if (editImageFiles.length > 0) {
        const newUrls = await uploadMultipleImages(editImageFiles, user.uid);
        finalUrls = [...finalUrls, ...newUrls].slice(0, 5);
      }
      const docRef = doc(db, "users", user.uid, "reviews", editingReview.id);
      await updateDoc(docRef, {
        storeName: editStoreName, menu: editMenu, rating: editRating,
        comment: editComment, category: finalCategory, imageUrls: finalUrls,
      });
      setEditingReview(null);
    } catch (error) { console.error("수정 실패:", error); }
    setIsUpdating(false);
  };

  const handleDeleteReview = async (id: string) => {
    if (!user) return;
    const isConfirm = window.confirm("이 맛집 기록을 정말 삭제할까요?");
    if (!isConfirm) return;
    try { await deleteDoc(doc(db, "users", user.uid, "reviews", id)); }
    catch (error) { console.error("삭제 실패:", error); alert("삭제 중 오류가 발생했습니다."); }
  };

  // ✅ [수정 1] 공유 텍스트 중복 현상 방지 (깔끔하게 수정)
  const handleShareReview = async (review: Review) => {
    if (!user) return;
    const importUrl = `${window.location.origin}/?uid=${user.uid}&rid=${review.id}`;

    // Title에는 직관적인 메뉴/식당 이름만
    const shareTitle = `🍽️ [오늘 뭐 먹지?] ${review.storeName}`;
    // Text에는 부가 정보와 링크만 넣어서 중복을 최소화합니다.
    const shareText = `⭐ 별점: ${review.rating}.0\n💬 "${review.comment}"\n\n👇 아래 링크를 눌러 내 맛집 지도에 [사진]과 함께 바로 저장하세요!\n${importUrl}`;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
        });
      } catch (error) {
        console.log('공유가 취소되었거나 실패했습니다.', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareTitle}\n${shareText}`);
        alert("맛집 정보와 사진 추가 링크가 복사되었습니다! 카카오톡이나 메시지 창에 붙여넣기 해주세요.");
      } catch (err) {
        console.error('클립보드 복사 실패:', err);
        alert("공유하기를 지원하지 않는 환경입니다.");
      }
    }
  };

  const handleScrapPlace = (place: any) => {
    if (!user) {
      setAuthMode("signup");
      setIsAuthModalOpen(true);
      return;
    }

    resetForm();
    setStoreName(place.place_name);
    setMenu(recommendedMenu || "");

    const cat = matchedCategory || "기타";
    if (knownCategories.includes(cat)) {
      setCategory(cat);
      setShowCustomCategory(false);
    } else {
      setCategory("기타");
      setCustomCategory(cat);
      setShowCustomCategory(true);
    }
    setIsScrapModalOpen(true);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setResetMessage("");
    try {
      if (authMode === "signup") {
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      }
      setAuthEmail("");
      setAuthPassword("");
    } catch (error: any) {
      console.error("Auth error:", error);
      if (error.code === 'auth/email-already-in-use') setAuthError("이미 가입된 이메일입니다.");
      else if (error.code === 'auth/weak-password') setAuthError("비밀번호가 너무 짧습니다 (최소 6자리).");
      else if (error.code === 'auth/invalid-email') setAuthError("유효하지 않은 이메일 형식입니다.");
      else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') setAuthError("이메일 또는 비밀번호가 올바르지 않습니다.");
      else setAuthError("인증 처리 중 오류가 발생했습니다. 다시 시도해 주세요.");
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setResetMessage("");
    if (!authEmail) {
      setAuthError("이메일 주소를 입력해 주세요.");
      return;
    }
    try {
      auth.languageCode = "ko";
      await sendPasswordResetEmail(auth, authEmail);
      setResetMessage("비밀번호 재설정 메일이 발송되었습니다.\n메일함을 확인해 주세요!");
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') setAuthError("가입되지 않은 이메일입니다.");
      else if (error.code === 'auth/invalid-email') setAuthError("유효하지 않은 이메일 형식입니다.");
      else setAuthError("메일 발송 중 오류가 발생했습니다. 다시 시도해 주세요.");
    }
  };

  const handleGoogleLogin = async () => { try { await signInWithPopup(auth, googleProvider); } catch (e) { console.error("로그인 실패:", e); } };
  const handleLogout = async () => { try { await signOut(auth); } catch (e) { console.error("로그아웃 실패:", e); } };

  const getKeywords = (menuName: string): string[] => {
    const norm = normalize(menuName);
    const keywords = new Set<string>();
    keywords.add(norm);
    if (norm.length >= 2) { for (let i = 0; i < norm.length - 1; i++) keywords.add(norm.slice(i, i + 2)); }
    for (const group of SYNONYM_GROUPS) {
      const ng = group.map(normalize);
      if (ng.some((s) => norm.includes(s) || s.includes(norm))) ng.forEach((s) => keywords.add(s));
    }
    return Array.from(keywords);
  };

  const matchedCategory = recommendedMenu ? (getMenuCategory(recommendedMenu) || "기타") : "기타";
  const iconTheme = getMenuIconDetails(recommendedMenu || "", matchedCategory);

  const fallbackMatchedReviews = recommendedMenu && !isSpinning
    ? reviews.filter((r) => {
      const kws = getKeywords(recommendedMenu);
      const c = normalize(r.menu) + normalize(r.storeName);
      return kws.some((kw) => c.includes(kw)) || (matchedCategory ? r.category === matchedCategory : false);
    }) : [];

  // --- Components ---
  const CategorySelector = ({ value, onChange, showCustom, onToggleCustom, customValue, onCustomChange, availableCats }: any) => (
    <div>
      <label className="block text-sm font-semibold text-stone-600 mb-2 ml-1 flex items-center gap-1.5"><Tag size={14} />카테고리</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {availableCats.map((cat: string) => (
          <button key={cat} type="button" onClick={() => { onChange(cat); if (showCustom) onToggleCustom(); }}
            className={`text-xs font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer ${!showCustom && value === cat ? "bg-orange-500 text-white shadow-sm" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
          >{cat}</button>
        ))}
        <button type="button" onClick={onToggleCustom}
          className={`text-xs font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 ${showCustom ? "bg-orange-500 text-white shadow-sm" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
        ><Plus size={12} />직접 입력</button>
      </div>
      {showCustom && (
        <input type="text" value={customValue} onChange={(e) => onCustomChange(e.target.value)} placeholder="새 카테고리 입력"
          className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all placeholder:text-stone-400 text-sm" />
      )}
    </div>
  );

  const MultiImagePicker = ({ existingUrls = [], newPreviews = [], onSelect, onRemoveExisting, onRemoveNew }: any) => {
    const totalCount = existingUrls.length + newPreviews.length;
    const galleryRef = useRef<HTMLInputElement>(null);
    const cameraRef = useRef<HTMLInputElement>(null);

    return (
      <div>
        <label className="block text-sm font-semibold text-stone-600 mb-2 ml-1 flex items-center gap-1.5"><Camera size={14} />사진 (최대 5장)</label>
        <input type="file" accept="image/*" multiple ref={galleryRef} className="hidden" onChange={(e) => onSelect(e, totalCount)} />
        <input type="file" accept="image/*" capture="environment" ref={cameraRef} className="hidden" onChange={(e) => onSelect(e, totalCount)} />

        <div className="grid grid-cols-3 gap-2">
          {existingUrls.map((src: string, i: number) => (
            <div key={`exist-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 shadow-sm bg-stone-100">
              <img src={src} className="w-full h-full object-cover" alt="preview" />
              <button type="button" onClick={() => onRemoveExisting(i)} className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black text-white p-1 rounded-full backdrop-blur-sm cursor-pointer"><X size={14} /></button>
            </div>
          ))}
          {newPreviews.map((src: string, i: number) => (
            <div key={`new-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-orange-200 shadow-sm bg-stone-100">
              <img src={src} className="w-full h-full object-cover" alt="preview" />
              <button type="button" onClick={() => onRemoveNew(i)} className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-black text-white p-1 rounded-full backdrop-blur-sm cursor-pointer"><X size={14} /></button>
            </div>
          ))}

          {totalCount < 5 && (
            <>
              <button type="button" onClick={() => galleryRef.current?.click()} className="aspect-square border-2 border-dashed border-stone-200 rounded-xl flex flex-col items-center justify-center gap-1 text-stone-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 cursor-pointer transition-colors">
                <ImageIcon size={20} /><span className="text-[10px] font-bold">앨범 ({totalCount}/5)</span>
              </button>
              <button type="button" onClick={() => cameraRef.current?.click()} className="aspect-square border-2 border-dashed border-stone-200 rounded-xl flex flex-col items-center justify-center gap-1 text-stone-400 hover:border-orange-400 hover:text-orange-500 hover:bg-orange-50 cursor-pointer transition-colors">
                <Camera size={20} /><span className="text-[10px] font-bold">촬영</span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#FFFDF6] text-stone-800 font-sans pb-20 selection:bg-orange-200">

      {/* 회원가입/로그인 통합 모달 */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-end mb-2">
              <button onClick={() => { setIsAuthModalOpen(false); setAuthError(""); setResetMessage(""); }} className="p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors cursor-pointer"><X size={18} /></button>
            </div>

            {/* 비밀번호 찾기 모드 화면 */}
            {authMode === "reset" ? (
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex bg-orange-100 p-3 rounded-full text-orange-500 mb-3"><Lock size={28} /></div>
                  <h3 className="text-xl font-black text-stone-800 tracking-tight mb-2">비밀번호 재설정</h3>
                  <p className="text-sm text-stone-500">가입하신 이메일을 입력하시면<br />비밀번호 재설정 링크를 보내드립니다.</p>
                </div>

                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div>
                    <div className="relative border border-stone-200 rounded-xl overflow-hidden focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 transition-all">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400"><Mail size={16} /></div>
                      <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required placeholder="이메일 주소" className="w-full pl-10 pr-4 py-3 bg-stone-50 focus:bg-white outline-none text-sm" />
                    </div>
                  </div>

                  {authError && <p className="text-[13px] text-red-500 font-bold text-center bg-red-50 py-2 rounded-lg">{authError}</p>}
                  {resetMessage && <p className="text-[13px] text-green-600 font-bold text-center bg-green-50 py-2 rounded-lg whitespace-pre-line leading-relaxed">{resetMessage}</p>}

                  <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-colors cursor-pointer shadow-md">
                    비밀번호 재설정 메일 보내기
                  </button>
                  <button type="button" onClick={() => { setAuthMode("login"); setAuthError(""); setResetMessage(""); }} className="w-full text-sm font-bold text-stone-400 hover:text-stone-600 py-2 cursor-pointer">
                    로그인으로 돌아가기
                  </button>
                </form>
              </>
            ) : (
              /* 일반 로그인/가입 화면 */
              <>
                <div className="text-center mb-6">
                  <div className="inline-flex bg-orange-100 p-3 rounded-full text-orange-500 mb-3"><ChefHat size={28} /></div>
                  <h3 className="text-xl font-black text-stone-800 tracking-tight mb-2">나만의 맛집 지도 만들기</h3>
                  <div className="text-sm text-stone-500 space-y-1.5 font-medium bg-stone-50 py-3 rounded-xl border border-stone-100">
                    <p>📸 잊고 싶지 않은 사진과 한줄평 저장</p>
                    <p>🗺️ 내 주변 단골 맛집 우선 추천</p>
                    <p>⭐️ 클릭 한 번으로 친구 맛집 자동 저장</p>
                  </div>
                </div>

                <div className="flex p-1 bg-stone-100 rounded-xl mb-6">
                  <button onClick={() => { setAuthMode("login"); setAuthError(""); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${authMode === "login" ? "bg-white text-stone-800 shadow-sm" : "text-stone-400 hover:text-stone-600"}`}>로그인</button>
                  <button onClick={() => { setAuthMode("signup"); setAuthError(""); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${authMode === "signup" ? "bg-white text-stone-800 shadow-sm" : "text-stone-400 hover:text-stone-600"}`}>회원가입</button>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div>
                    <div className="relative border border-stone-200 rounded-xl overflow-hidden focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 transition-all">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400"><Mail size={16} /></div>
                      <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required placeholder="이메일 주소" className="w-full pl-10 pr-4 py-3 bg-stone-50 focus:bg-white outline-none text-sm" />
                    </div>
                    {authMode === "signup" && <p className="text-[11px] text-stone-400 mt-1.5 ml-1">* 올바른 이메일 형식을 입력해 주세요 (예: user@mail.com)</p>}
                  </div>
                  <div>
                    <div className="relative border border-stone-200 rounded-xl overflow-hidden focus-within:border-orange-500 focus-within:ring-1 focus-within:ring-orange-500 transition-all">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400"><Lock size={16} /></div>
                      <input type={showPassword ? "text" : "password"} value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required placeholder="비밀번호" minLength={6} className="w-full pl-10 pr-12 py-3 bg-stone-50 focus:bg-white outline-none text-sm" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600 cursor-pointer">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {authMode === "signup" && <p className="text-[11px] text-stone-400 mt-1.5 ml-1">* 비밀번호는 6자리 이상 설정해 주세요</p>}
                  </div>

                  {authError && <p className="text-[13px] text-red-500 font-bold text-center bg-red-50 py-2 rounded-lg">{authError}</p>}

                  <button type="submit" className="w-full bg-stone-800 hover:bg-black text-white font-bold py-3.5 rounded-xl transition-colors cursor-pointer shadow-md">
                    {authMode === "login" ? "이메일로 로그인" : "이메일로 가입하기"}
                  </button>

                  {authMode === "login" && (
                    <div className="text-center mt-2">
                      <button type="button" onClick={() => { setAuthMode("reset"); setAuthError(""); }} className="text-xs font-bold text-stone-400 hover:text-stone-600 cursor-pointer underline underline-offset-2">
                        비밀번호를 잊으셨나요?
                      </button>
                    </div>
                  )}
                </form>

                <div className="relative my-6 flex items-center py-2">
                  <div className="flex-grow border-t border-stone-200"></div>
                  <span className="flex-shrink-0 mx-4 text-stone-400 text-xs font-semibold">또는</span>
                  <div className="flex-grow border-t border-stone-200"></div>
                </div>

                <button onClick={handleGoogleLogin} type="button" className="w-full flex items-center justify-center gap-2 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-bold py-3.5 rounded-xl transition-colors shadow-sm cursor-pointer">
                  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                  구글 계정으로 시작하기
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Full Screen Image Modal */}
      {fullScreenData && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setFullScreenData(null)}>
          <button className="absolute top-6 right-6 text-white bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all cursor-pointer z-[110]"><X size={24} /></button>
          {fullScreenData.urls.length > 1 && (
            <button className="absolute left-2 sm:left-10 text-white/50 hover:text-white z-[110] p-4 cursor-pointer" onClick={(e) => { e.stopPropagation(); setFullScreenData(p => p ? { ...p, currentIndex: p.currentIndex === 0 ? p.urls.length - 1 : p.currentIndex - 1 } : null) }}><ChevronLeft size={48} /></button>
          )}
          <div className="relative max-w-full max-h-[90vh] flex items-center justify-center">
            <img src={fullScreenData.urls[fullScreenData.currentIndex]} onClick={(e) => e.stopPropagation()} className="max-w-full max-h-[90vh] object-contain rounded-lg animate-in fade-in duration-200" alt="Full" />
            {fullScreenData.urls.length > 1 && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-white/70 font-semibold tracking-widest text-sm">{fullScreenData.currentIndex + 1} / {fullScreenData.urls.length}</div>
            )}
          </div>
          {fullScreenData.urls.length > 1 && (
            <button className="absolute right-2 sm:right-10 text-white/50 hover:text-white z-[110] p-4 cursor-pointer" onClick={(e) => { e.stopPropagation(); setFullScreenData(p => p ? { ...p, currentIndex: (p.currentIndex + 1) % p.urls.length } : null) }}><ChevronRight size={48} /></button>
          )}
        </div>
      )}

      {/* 추천 맛집 스크랩(저장) 모달 */}
      {isScrapModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" onClick={() => setIsScrapModalOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-8 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                {pendingImport ? <Copy size={18} className="text-blue-500" /> : <MapPin size={18} className="text-orange-500" />}
                {pendingImport ? "친구 맛집 가져오기" : "맛집 저장하기"}
              </h3>
              <button type="button" onClick={() => setIsScrapModalOpen(false)} className="p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddReview} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-600 mb-2 ml-1">가게 이름</label>
                <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} required placeholder="가게 이름 (지역과 함께 쓰면 더 정확해요!)" className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 focus:ring-2 focus:ring-orange-500/50 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-600 mb-2 ml-1">메뉴</label>
                  <input type="text" value={menu} onChange={(e) => setMenu(e.target.value)} required className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 focus:ring-2 focus:ring-orange-500/50 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-600 mb-2 ml-1">별점</label>
                  <div className="flex items-center h-[50px] bg-stone-50 border border-stone-100 rounded-xl px-3 justify-between">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} type="button" onClick={() => setRating(s)} className="hover:scale-110 transition-transform cursor-pointer">
                        <Star size={22} className={rating >= s ? 'text-amber-400 fill-amber-400' : 'text-stone-300'} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <CategorySelector value={category} onChange={setCategory} showCustom={showCustomCategory} onToggleCustom={() => setShowCustomCategory(!showCustomCategory)} customValue={customCategory} onCustomChange={setCustomCategory} availableCats={knownCategories} />

              <MultiImagePicker existingUrls={importedUrls} newPreviews={imagePreviews} onSelect={(e: any, total: number) => handleImagesSelect(e, total, setImageFiles, setImagePreviews)} onRemoveExisting={(idx: number) => setImportedUrls(prev => prev.filter((_, i) => i !== idx))} onRemoveNew={(idx: number) => { setImageFiles(prev => prev.filter((_, i) => i !== idx)); setImagePreviews(prev => prev.filter((_, i) => i !== idx)); }} />

              <div>
                <label className="block text-sm font-semibold text-stone-600 mb-2 ml-1">한줄평</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} required className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 h-24 resize-none focus:ring-2 focus:ring-orange-500 outline-none text-sm" placeholder={pendingImport ? "나만의 코멘트를 남겨보세요!" : "어떤 점이 좋았나요?"} />
              </div>
              <button type="submit" disabled={isSubmitting} className={`w-full ${pendingImport ? 'bg-blue-500 hover:bg-blue-600' : 'bg-orange-500 hover:bg-orange-600'} text-white font-bold py-3.5 px-6 rounded-xl shadow-md disabled:opacity-60 cursor-pointer`}>
                {isSubmitting ? "저장 중..." : (pendingImport ? "내 리스트에 추가하기" : "리스트에 저장")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal (수정용 모달) */}
      {editingReview && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" onClick={() => setEditingReview(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-8 duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2"><Pencil size={18} className="text-orange-500" />맛집 수정</h3>
              <button type="button" onClick={() => setEditingReview(null)} className="p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateReview} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-stone-600 mb-2 ml-1">가게 이름</label>
                <input type="text" value={editStoreName} onChange={(e) => setStoreName(e.target.value)} required placeholder="가게 이름 (지역과 함께 쓰면 더 정확해요!)" className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 focus:ring-2 focus:ring-orange-500/50 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-600 mb-2 ml-1">메뉴</label>
                  <input type="text" value={editMenu} onChange={(e) => setEditMenu(e.target.value)} required className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 focus:ring-2 focus:ring-orange-500/50 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-600 mb-2 ml-1">별점</label>
                  <div className="flex items-center h-[50px] bg-stone-50 border border-stone-100 rounded-xl px-3 justify-between">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} type="button" onClick={() => setEditRating(s)} className="hover:scale-110 transition-transform cursor-pointer">
                        <Star size={22} className={editRating >= s ? 'text-amber-400 fill-amber-400' : 'text-stone-300'} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <CategorySelector value={editCategory} onChange={setCategory} showCustom={editShowCustomCategory} onToggleCustom={() => setEditShowCustomCategory(!editShowCustomCategory)} customValue={editCustomCategory} onCustomChange={setCustomCategory} availableCats={knownCategories} />
              <MultiImagePicker editExistingUrls={editExistingUrls} newPreviews={editImagePreviews} onSelect={(e: any, total: number) => handleImagesSelect(e, total, setEditImageFiles, setEditImagePreviews)} onRemoveExisting={(idx: number) => setEditExistingUrls(prev => prev.filter((_, i) => i !== idx))} onRemoveNew={(idx: number) => { setEditImageFiles(prev => prev.filter((_, i) => i !== idx)); setEditImagePreviews(prev => prev.filter((_, i) => i !== idx)); }} />
              <div>
                <label className="block text-sm font-semibold text-stone-600 mb-2 ml-1">한줄평</label>
                <textarea value={editComment} onChange={(e) => setComment(e.target.value)} required className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 h-24 resize-none focus:ring-2 focus:ring-orange-500/50 text-sm" />
              </div>
              <button type="submit" disabled={isUpdating} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 px-6 rounded-xl shadow-md disabled:opacity-60 cursor-pointer">{isSubmitting ? "저장 중..." : "수정 완료"}</button>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white sticky top-0 z-50 border-b border-orange-100 shadow-md">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-xl text-orange-500 shadow-sm"><ChefHat size={24} /></div>
            <h1 className="text-xl font-bold text-stone-800 tracking-tight">오늘 뭐 먹지?</h1>
          </div>
          {!authLoading && (
            <div>
              {user ? (
                <div className="flex items-center gap-2">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="profile" className="w-8 h-8 rounded-full border-2 border-orange-200 object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-orange-200 bg-orange-100 flex items-center justify-center text-orange-500 shrink-0">
                      <User size={16} />
                    </div>
                  )}
                  <button onClick={handleLogout} className="text-xs font-semibold text-stone-500 bg-stone-100 hover:bg-stone-200 px-2 py-1 rounded-lg cursor-pointer">로그아웃</button>
                </div>
              ) : (
                <button onClick={() => { setAuthMode("login"); setIsAuthModalOpen(true); }} className="text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl shadow-md cursor-pointer">로그인</button>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="max-w-md mx-auto px-6 pt-20 space-y-12">
        {/* Recommendation Section */}
        <section className="bg-white rounded-3xl p-8 shadow-sm border border-orange-50 text-center flex flex-col items-center">

          <div className="relative pt-4 mb-4">
            <h2 className="text-stone-500 font-medium">결정이 어려울 땐 운명에 맡겨보세요</h2>
          </div>

          <div className="flex justify-center mb-6 w-full">
            {recommendedMenu && (
              <div className={`relative w-44 h-44 rounded-[2rem] bg-white flex flex-col items-center justify-center shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-stone-100 transition-all duration-300 animate-in zoom-in-95 group`}>
                <div className={`absolute top-4 ${iconTheme.bgColor} ${iconTheme.textColor} text-[10px] font-extrabold px-3 py-1 rounded-full`}>
                  {matchedCategory}
                </div>
                <span className="text-[64px] mt-4 drop-shadow-sm transition-transform duration-200 group-hover:scale-110 select-none">
                  {iconTheme.emoji}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center mb-8 h-auto">
            <span className={`text-4xl font-black text-orange-500 tracking-tight ${isSpinning ? 'animate-pulse' : ''}`}>
              {recommendedMenu || "메뉴를 골라볼까요?"}
            </span>
          </div>

          {/* 위치 권한을 먼저 받는 개선된 추천 버튼 로직 */}
          <button onClick={handleRecommend} disabled={isSpinning || isLocating} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70">
            <RefreshCw size={20} className={isSpinning || isLocating ? "animate-spin" : ""} />
            {isLocating ? "위치 파악 중..." : (isSpinning ? "고민 중..." : "추천받기")}
          </button>

          {/* 결과 로딩 및 출력 영역 */}
          {(!isLocating && recommendedMenu && !isSpinning) && (
            <div className="mt-8 pt-6 w-full border-t border-orange-50 space-y-4">
              {locationError ? (
                <>
                  <p className="text-xs text-stone-400 mb-2 bg-red-50 text-red-500 p-2 rounded-lg text-center break-keep-all font-semibold">
                    {locationError}
                  </p>
                  {fallbackMatchedReviews.length > 0 ? (
                    <div className="text-left">
                      <p className="text-sm font-bold text-stone-600 mb-3 flex items-center gap-1.5"><Tag size={16} className="text-orange-500" />내 맛집 기록</p>
                      {fallbackMatchedReviews.map(r => (
                        <div key={r.id} className="flex items-center gap-3 bg-stone-50 p-3 rounded-xl mb-2">
                          {r.imageUrls?.[0] && <img src={r.imageUrls[0]} className="w-10 h-10 rounded-lg object-cover" alt="" />}
                          <div className="text-left min-w-0">
                            <p className="text-sm font-bold truncate text-stone-800">{r.storeName}</p>
                            <p className="text-xs text-stone-500">{r.menu}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-stone-400 mb-4">앗! 주변 맛집을 검색할 수 없고, 기록하신 <span className="font-semibold text-stone-600">{recommendedMenu}</span> 맛집도 없어요.</p>
                      <a href={`https://map.naver.com/v5/search/${encodeURIComponent(recommendedMenu + " 맛집")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 px-4 py-2.5 rounded-xl transition-colors"><Search size={14} />{recommendedMenu} 검색하기<ExternalLink size={11} className="opacity-50" /></a>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {(nearbySaved.length === 0 && nearbyExternal.length === 0) ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-stone-400 mb-4">앗! 반경 3km 내 맛집도, 기록하신 <span className="font-semibold text-stone-600">{recommendedMenu}</span> 맛집도 없네요.</p>
                      <a href={`https://map.naver.com/v5/search/${encodeURIComponent(recommendedMenu + " 맛집")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 px-4 py-2.5 rounded-xl transition-colors"><Search size={14} />지도로 넓게 검색하기<ExternalLink size={11} className="opacity-50" /></a>
                    </div>
                  ) : (
                    <>
                      {/* 1순위: 내 주변 저장 맛집 */}
                      {nearbySaved.length > 0 && (
                        <div className="text-left mb-6">
                          <p className="text-sm font-bold text-stone-600 mb-3 flex items-center gap-1.5"><MapPin size={16} className="text-orange-500" />내 주변 단골 맛집</p>
                          {nearbySaved.map(r => (
                            <div key={r.id} className="flex items-center justify-between bg-orange-50 p-3 rounded-xl mb-2">
                              <div className="flex items-center gap-3 min-w-0">
                                {r.imageUrls?.[0] && <img src={r.imageUrls[0]} className="w-10 h-10 rounded-lg object-cover" alt="" />}
                                <div className="text-left min-w-0">
                                  <p className="text-sm font-bold truncate text-stone-800">{r.storeName}</p>
                                  <p className="text-[10px] text-orange-500">{r.menu}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                <Star size={11} className="text-amber-500 fill-amber-500" /><span className="text-xs font-bold text-amber-600">{r.rating}.0</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 2순위: 외부 추천 맛집 */}
                      {nearbyExternal.length > 0 && (
                        <div className="text-left">

                          {!user && (
                            <div className="mb-6 bg-orange-50 border border-orange-200 rounded-2xl p-5 flex flex-col items-center text-center gap-4 shadow-sm animate-in fade-in duration-300">
                              <div className="w-full">
                                <p className="text-[14px] font-bold text-orange-800 flex items-center justify-center gap-1.5 truncate">
                                  <Star size={16} className="fill-orange-500 text-orange-500 shrink-0" />
                                  가보고 싶은 맛집을 찾으셨나요?
                                </p>
                                <p className="text-[12px] text-orange-600 mt-2 break-keep text-center leading-relaxed inline-block max-w-[80%]">
                                  아래 맛집을 스크랩하거나,<br />나만의 맛집을 직접 기록해 보세요!
                                </p>
                              </div>
                              <button onClick={() => { setAuthMode('signup'); setIsAuthModalOpen(true); }} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-[13px] font-bold py-3.5 rounded-xl transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2 active:scale-95">
                                🗺️ 나만의 맛집 지도 시작하기
                              </button>
                            </div>
                          )}

                          <div className="flex justify-between items-center mb-3 gap-2">
                            <p className="text-sm font-bold text-stone-600 flex items-center gap-1.5 min-w-0">
                              <Compass size={16} className="text-blue-500 shrink-0" />
                              <span className="truncate">주변 {recommendedMenu} 맛집</span>
                              <span className="text-[10px] text-stone-400 font-normal shrink-0">(최대 5곳)</span>
                            </p>
                            <div className="flex bg-stone-100 p-1 rounded-lg shrink-0">
                              <button onClick={() => handleSortChange("accuracy")} className={`text-[10px] px-2 py-1 rounded-md transition-all cursor-pointer ${sortOrder === "accuracy" ? "bg-white shadow-sm font-bold text-stone-800" : "text-stone-400 font-medium"}`}>정확도순</button>
                              <button onClick={() => handleSortChange("distance")} className={`text-[10px] px-2 py-1 rounded-md transition-all cursor-pointer ${sortOrder === "distance" ? "bg-white shadow-sm font-bold text-stone-800" : "text-stone-400 font-medium"}`}>거리순</button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {nearbyExternal.map((place, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-white border border-stone-100 hover:border-stone-200 rounded-xl px-4 py-3 transition-colors group shadow-sm">
                                <a href={place.place_url} target="_blank" rel="noopener noreferrer" className="flex flex-col min-w-0 pr-2 flex-1 cursor-pointer">
                                  <span className="font-bold text-stone-700 text-sm truncate group-hover:text-stone-900 transition-colors">{place.place_name}</span>
                                  <span className="text-[10px] text-stone-400 truncate mt-0.5">{place.address_name}</span>
                                </a>
                                <div className="flex flex-col items-end shrink-0 gap-1.5">
                                  <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">{place.distance}m</span>
                                  <button onClick={() => handleScrapPlace(place)} className="text-[10px] font-bold bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600 transition-colors cursor-pointer">
                                    + 저장
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        {!user && (
          <section className="relative bg-white rounded-3xl border border-stone-100 overflow-hidden shadow-sm mt-12 mb-12 animate-in fade-in-up duration-500">
            <div className="p-6 filter blur-[6px] opacity-40 select-none pointer-events-none space-y-6">

              <div className="flex items-center gap-2 mb-2"><Star className="text-stone-400 fill-stone-400" size={18} /><h2 className="font-bold text-stone-800">맛집 직접 기록</h2></div>
              <div className="w-full bg-stone-100 rounded-xl h-12"></div>

              <div className="pt-6 border-t border-stone-100 mt-6">
                <h2 className="font-bold text-stone-800 mb-4">내 맛집 리스트 <span className="text-orange-500">12</span></h2>

                <div className="bg-white rounded-3xl border border-stone-100 overflow-hidden shadow-sm mb-4">
                  <img src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=600" className="w-full h-40 object-cover" alt="food" />
                  <div className="p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1.5">
                        <div className="w-32 h-5 bg-stone-200 rounded-md"></div>
                        <div className="w-20 h-4 bg-stone-100 rounded-md"></div>
                      </div>
                      <div className="w-12 h-6 bg-stone-200 rounded-md"></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-stone-100 overflow-hidden shadow-sm">
                  <img src="https://images.unsplash.com/photo-1499028344343-cd173ffc68a9?auto=format&fit=crop&q=80&w=600" className="w-full h-40 object-cover" alt="food" />
                  <div className="p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1.5">
                        <div className="w-40 h-5 bg-stone-200 rounded-md"></div>
                        <div className="w-24 h-4 bg-stone-100 rounded-md"></div>
                      </div>
                      <div className="w-12 h-6 bg-stone-200 rounded-md"></div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50 p-6 text-center animate-in zoom-in-95 duration-300 backdrop-blur-[1px]">
              <div className="bg-white p-4 rounded-full shadow-lg mb-5 text-orange-500 border border-orange-100">
                <Lock size={30} className="stroke-[2.5]" />
              </div>
              <h3 className="text-xl font-black text-stone-900 mb-2.5 tracking-tight">나만의 맛집 지도 만들기</h3>
              <p className="text-sm text-stone-700 mb-7 font-medium leading-relaxed break-keep inline-block max-w-[85%]">
                잊고 싶지 않은 맛집 사진과 한줄평을 차곡차곡 기록해 보세요!
              </p>
              <button onClick={() => { setAuthMode('signup'); setIsAuthModalOpen(true); }} className="bg-stone-800 hover:bg-black text-white font-bold py-4 px-10 rounded-2xl shadow-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2">
                🚀 3초 만에 시작하기
              </button>
              <p className="text-xs text-stone-500 mt-5 font-medium">이미 계정이 있으신가요? <button onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); }} className="font-bold text-stone-700 hover:text-orange-500 underline underline-offset-2 transition-colors cursor-pointer">로그인</button></p>
            </div>
          </section>
        )}

        {user && (
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-orange-50 space-y-5">
            <div className="flex items-center gap-2 mb-2"><Star className="text-orange-500 fill-orange-500" size={18} /><h2 className="font-bold text-stone-800">맛집 직접 기록</h2></div>
            <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="가게 이름 (지역과 함께 쓰면 더 정확해요!)" className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={menu} onChange={(e) => setMenu(e.target.value)} placeholder="메뉴" className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
              <div className="flex items-center justify-center bg-stone-50 border border-stone-100 rounded-xl gap-1">
                {[1, 2, 3, 4, 5].map(s => <Star key={s} size={18} onClick={() => setRating(s)} className={`cursor-pointer hover:scale-110 transition-all ${rating >= s ? 'text-amber-400 fill-amber-400' : 'text-stone-300'}`} />)}
              </div>
            </div>
            <CategorySelector value={category} onChange={setCategory} showCustom={showCustomCategory} onToggleCustom={() => setShowCustomCategory(!showCustomCategory)} customValue={customCategory} onCustomChange={setCustomCategory} availableCats={knownCategories} />
            <MultiImagePicker existingUrls={[]} newPreviews={imagePreviews} onSelect={(e: any, total: number) => handleImagesSelect(e, total, setImageFiles, setImagePreviews)} onRemoveNew={(idx: number) => { setImageFiles(prev => prev.filter((_, i) => i !== idx)); setImagePreviews(prev => prev.filter((_, i) => i !== idx)); }} />
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="한줄평" className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 h-24 resize-none focus:ring-2 focus:ring-orange-500 outline-none text-sm" />
            <button onClick={handleAddReview} disabled={isSubmitting} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl active:scale-95 transition-all disabled:opacity-60 cursor-pointer">{isSubmitting ? "저장 중..." : "기록 저장하기"}</button>
          </section>
        )}

        {user && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="font-bold text-stone-800 shrink-0 whitespace-nowrap">맛집 리스트 <span className="text-orange-500">{totalCount}</span></h2>

              <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1 w-full sm:w-auto">
                {filterOptions.map(cat => (
                  <button key={cat} onClick={() => handleFilterChange(cat)} className={`text-xs font-bold px-3 py-2 rounded-xl border transition-all whitespace-nowrap cursor-pointer ${filterCategory === cat ? 'bg-orange-500 text-white border-orange-500 shadow-sm' : 'bg-white text-stone-500 border-stone-100 hover:bg-stone-50'}`}>{cat}</button>
                ))}
              </div>
            </div>

            {filteredReviews.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-3xl border border-stone-100 shadow-sm">
                <p className="text-stone-500 font-bold mb-1">아직 저장된 맛집이 없어요 🥲</p>
                <p className="text-sm text-stone-400">새로운 맛집을 찾고 기록해보세요!</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredReviews.map(review => (
                  <div key={review.id} className="bg-white rounded-3xl overflow-hidden border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
                    {review.imageUrls && review.imageUrls.length > 0 && (
                      <div className="flex overflow-x-auto scrollbar-hide snap-x gap-1 bg-stone-100 h-48 relative">
                        {review.imageUrls.map((url, idx) => (
                          <img key={idx} src={url} onClick={() => setFullScreenData({ urls: review.imageUrls!, currentIndex: idx })} className="h-full w-full object-cover snap-center cursor-zoom-in min-w-full" alt={`Img ${idx}`} />
                        ))}
                        {review.imageUrls.length > 1 && (
                          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full font-semibold pointer-events-none">1 / {review.imageUrls.length} 👉</div>
                        )}
                      </div>
                    )}
                    <div className="p-5 space-y-4">

                      <div className="flex justify-between items-start">
                        <div className="min-w-0 pr-2">
                          <h3 className="font-bold text-lg text-stone-800 truncate">{review.storeName}</h3>
                          <p className="text-orange-500 text-sm font-semibold truncate">{review.menu} <span className="text-stone-300 mx-1">|</span> {review.category}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => handleShareReview(review)} className="p-2 bg-stone-50 rounded-lg text-stone-400 hover:text-blue-500 cursor-pointer transition-colors" title="공유하기"><Share2 size={14} /></button>
                          <button onClick={() => openEditModal(review)} className="p-2 bg-stone-50 rounded-lg text-stone-400 hover:text-orange-500 cursor-pointer transition-colors" title="수정하기"><Pencil size={14} /></button>
                          <button onClick={() => handleDeleteReview(review.id)} className="p-2 bg-stone-50 rounded-lg text-stone-400 hover:text-red-500 cursor-pointer transition-colors" title="삭제하기"><Trash2 size={14} /></button>
                          <div className="flex items-center bg-amber-50 px-2 rounded-lg gap-1 shadow-sm">
                            <Star size={12} className="text-amber-500 fill-amber-500" /><span className="text-xs font-bold text-amber-600">{review.rating}.0</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#FFFDF6] p-4 rounded-2xl italic text-stone-600 text-sm border border-orange-50/50">"{review.comment}"</div>
                      <div className="flex gap-2">
                        <a href={`https://map.naver.com/v5/search/${encodeURIComponent(review.storeName)}`} target="_blank" className="flex-1 bg-green-50 text-green-700 hover:bg-green-100 py-3 rounded-xl text-xs font-bold text-center transition-colors">네이버 지도</a>
                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(review.storeName)}`} target="_blank" className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 py-3 rounded-xl text-xs font-bold text-center transition-colors">구글 지도</a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {hasMoreReviews && filteredReviews.length > 0 && (
              <button
                onClick={() => setReviewLimit(prev => prev + 5)}
                className="w-full mt-6 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold py-4 rounded-2xl transition-colors cursor-pointer shadow-sm"
              >
                더 보기 (5개) ▼
              </button>
            )}

            {!hasMoreReviews && filteredReviews.length > 0 && (
              <div className="text-center py-6 text-stone-400 text-sm font-semibold">
                모든 맛집을 다 불러왔습니다! 🎉
              </div>
            )}

          </section>
        )}
      </div>
    </main>
  );
}