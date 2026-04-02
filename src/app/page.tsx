"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  UtensilsCrossed, Star, Plus, RefreshCw, ChefHat, MapPin,
  ExternalLink, Check, Copy, LogIn, LogOut, User, Search, Tag,
  Pencil, X, Camera, Image as ImageIcon, ChevronLeft, ChevronRight,
  Compass, Loader2, Trash2, Mail, Lock, Eye, EyeOff, Share2, Download, MessageCircle, Users, Link as LinkIcon, UserMinus, Settings
} from "lucide-react";
import { toPng } from 'html-to-image';
import { auth, googleProvider, db, storage } from "@/lib/firebase";
import {
  signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail,
  updateProfile
} from "firebase/auth";
import {
  collection, addDoc, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp, limit, where, getCountFromServer, getDoc, getDocs, setDoc, arrayUnion, arrayRemove
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
  ["순대국", "순대국밥"], ["돈까스", "돈가스", "돈카츠", "카츠", "치즈카츠", "치돈"], ["짜장면", "자장면", "짜장", "간짜장"], ["짬뽕", "짬봉", "짬뽕밥"], ["떡볶이", "떡복", "라볶이", "로제떡볶이"], ["마라탕", "마라샹궈", "마라"], ["치킨", "닭", "통닭", "후라이드치킨", "양념치킨", "닭강정"], ["칼국수", "칼국", "국수", "바지락칼국수"], ["삼겹살", "삼겹", "오겹살", "목살"], ["초밥", "스시", "회", "사시미", "연어회", "참치회"], ["냉면", "물냉", "비냉", "물냉면", "비빔냉면", "밀면"], ["햄버거", "버거", "수제버거"], ["쌀국수", "베트남쌀국수", "퍼"], ["파스타", "스파게티", "크림파스타", "토마토파스타"], ["피자", "피짜", "화덕피자"]
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

const GENERAL_BADGES = [
  { threshold: 0, icon: "🐣", title: "맛집 뽀시래기", desc: "맛집 탐험의 첫 걸음", color: "text-stone-500", bg: "bg-stone-100 border-stone-200" },
  { threshold: 1, icon: "🥄", title: "첫 숟가락", desc: "역사적인 첫 맛집 기록", color: "text-orange-600", bg: "bg-orange-100 border-orange-200" },
  { threshold: 5, icon: "🚶", title: "동네 산책러", desc: "우리 동네 맛집은 내가 안다", color: "text-emerald-600", bg: "bg-emerald-100 border-emerald-200" },
  { threshold: 10, icon: "🕵️", title: "맛집 스카우터", desc: "숨은 맛집을 찾아내는 매의 눈", color: "text-blue-600", bg: "bg-blue-100 border-blue-200" },
  { threshold: 20, icon: "🎒", title: "쩝쩝 학사", desc: "맛집학 개론 이수 완료", color: "text-red-600", bg: "bg-red-100 border-red-200" },
  { threshold: 30, icon: "📸", title: "맛집 인플루언서", desc: "내 픽이 곧 유행이다", color: "text-indigo-600", bg: "bg-indigo-100 border-indigo-200" },
  { threshold: 50, icon: "🎓", title: "쩝쩝 석사", desc: "맛집 연구에 통달한 자", color: "text-purple-600", bg: "bg-purple-100 border-purple-200" },
  { threshold: 75, icon: "💎", title: "미식 감별사", desc: "절대 미각의 소유자", color: "text-teal-600", bg: "bg-teal-100 border-teal-200" },
  { threshold: 100, icon: "🧑‍🔬", title: "쩝쩝 박사", desc: "맛집계의 최고 권위자", color: "text-fuchsia-600", bg: "bg-fuchsia-100 border-fuchsia-200" },
  { threshold: 150, icon: "👑", title: "골목의 지배자", desc: "이 구역 맛집은 내 손안에", color: "text-amber-600", bg: "bg-amber-100 border-amber-300" },
  { threshold: 200, icon: "🌟", title: "미슐랭 가이드", desc: "당신의 별점이 곧 기준", color: "text-rose-600", bg: "bg-rose-100 border-rose-200" },
  { threshold: 300, icon: "🐉", title: "전설의 식신", desc: "신화로 남을 전설적인 미식가", color: "text-red-700", bg: "bg-red-100 border-red-400 border-2" },
];

const CATEGORY_BADGES: Record<string, any[]> = {
  "한식": [{ threshold: 1, icon: "🍚", title: "국밥 한 그릇", desc: "든든한 K-푸드의 시작" }, { threshold: 5, icon: "🥘", title: "찌개 감별사", desc: "뚝배기 좀 깨본 사람" }, { threshold: 10, icon: "🌶️", title: "K-입맛 마니아", desc: "김치 없인 못 살아 정말 못 살아" }, { threshold: 20, icon: "🧑‍🍳", title: "한식대첩 장인", desc: "동네 백반집 사장님도 인정" }, { threshold: 50, icon: "🏛️", title: "국밥부 장관", desc: "대한민국 한식의 정점" }],
  "중식": [{ threshold: 1, icon: "🥟", title: "단무지 추가요", desc: "기름진 매력에 퐁당" }, { threshold: 5, icon: "🍜", title: "짜장 vs 짬뽕", desc: "인류 최대의 난제 해결사" }, { threshold: 10, icon: "🔥", title: "웍 마스터", desc: "입안에 퍼지는 강렬한 불맛" }, { threshold: 20, icon: "🐉", title: "중원 무림고수", desc: "마라의 한계를 넘어서다" }, { threshold: 50, icon: "👨‍🍳", title: "흑백 요리사", desc: "황금 볶음밥의 창시자" }],
  "일식": [{ threshold: 1, icon: "🍣", title: "초밥 한 점", desc: "정갈한 일식의 세계로" }, { threshold: 5, icon: "🌿", title: "와사비 러버", desc: "코끝이 찡해지는 이 쾌감" }, { threshold: 10, icon: "🥢", title: "프로 혼밥러", desc: "다찌석이 가장 편안한 사람" }, { threshold: 20, icon: "🍱", title: "오마카세 단골", desc: "주방장님, 늘 먹던 걸로 부탁해요" }, { threshold: 50, icon: "🐟", title: "미스터 초밥왕", desc: "장인의 숨결을 느끼다" }],
  "양식": [{ threshold: 1, icon: "🍝", title: "포크와 나이프", desc: "우아한 칼질의 시작" }, { threshold: 5, icon: "🧀", title: "치즈 중독자", desc: "모든 음식에 치즈 폭포 추가" }, { threshold: 10, icon: "🍷", title: "분위기 메이커", desc: "데이트 코스 100% 성공 보장" }, { threshold: 20, icon: "🇮🇹", title: "명예 이탈리아인", desc: "파스타면은 무조건 알단테로" }, { threshold: 50, icon: "⭐", title: "미슐랭 3스타", desc: "궁극의 서양 미식을 찾아서" }],
  "카페": [{ threshold: 1, icon: "☕", title: "아아 한 잔", desc: "현대인의 영혼을 채우는 생명수" }, { threshold: 5, icon: "🍰", title: "디저트 사냥꾼", desc: "밥 배와 디저트 배는 철저히 따로" }, { threshold: 10, icon: "📸", title: "감성 스나이퍼", desc: "인스타 감성 카페 마스터" }, { threshold: 20, icon: "🧸", title: "명예 알바생", desc: "사장님이 내 메뉴를 외웠다" }, { threshold: 50, icon: "🩸", title: "혈중 카페인 99%", desc: "커피 없이 살 수 없는 몸" }],
  "분식": [{ threshold: 1, icon: "🍢", title: "어묵 국물 한 컵", desc: "추운 날 길거리 간식의 유혹" }, { threshold: 5, icon: "튀", title: "떡순튀 진리", desc: "분식 삼신기를 아는 자" }, { threshold: 10, icon: "😋", title: "학교 앞 단골", desc: "추억의 맛을 찾아 떠나는 여행" }, { threshold: 20, icon: "🎪", title: "포장마차 VIP", desc: "늦은 밤 야식의 제왕" }, { threshold: 50, icon: "👑", title: "분식의 신", desc: "궁극의 가성비 킹 미식가" }],
  "동남아": [{ threshold: 1, icon: "🍜", title: "쌀국수 입문", desc: "따뜻하고 진한 국물의 위로" }, { threshold: 5, icon: "🌿", title: "고수 마니아", desc: "사장님 여기 고수 팍팍 넣어주세요" }, { threshold: 10, icon: "🌶️", title: "향신료 러버", desc: "자극적이고 이국적인 맛의 노예" }, { threshold: 20, icon: "✈️", title: "방콕 현지인", desc: "입맛만은 이미 현지 패치 완료" }, { threshold: 50, icon: "🗺️", title: "아시아 미식 왕", desc: "동남아시아 맛 지도를 완성하다" }],
  "기타": [{ threshold: 1, icon: "🌮", title: "이색 탐험가", desc: "새로운 맛을 향한 발걸음" }, { threshold: 5, icon: "🌎", title: "글로벌 입맛", desc: "세계 요리 완전 정복기" }, { threshold: 10, icon: "🏪", title: "편의점 VIP", desc: "신상 털이 및 조합 전문가" }, { threshold: 20, icon: "🦉", title: "야행성 미식가", desc: "밤에 먹는 게 제일 맛있는 법" }, { threshold: 50, icon: "👽", title: "우주 최강 잡식성", desc: "세상의 모든 맛을 보다" }]
};

const getCurrentBadge = (count: number) => {
  return [...GENERAL_BADGES].reverse().find(b => count >= b.threshold) || GENERAL_BADGES[0];
};

interface Review {
  id: string;
  storeName: string;
  menu: string;
  rating: number;
  comment: string;
  category: string;
  imageUrls?: string[];
  userId?: string;
  userPhoto?: string;
  userName?: string;
  createdAt?: any;
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

  // 🌟 프로필 설정 State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileNickname, setProfileNickname] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // 🌟 그룹 연동 기능 State
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [partnerCode, setPartnerCode] = useState("");
  const [partnerUids, setPartnerUids] = useState<string[]>([]);
  const [partnersData, setPartnersData] = useState<Record<string, any>>({});
  const [showGroupRecords, setShowGroupRecords] = useState(false);
  const [selectedAuthorFilter, setSelectedAuthorFilter] = useState<string>("all"); // 전체, 내기록, 친구1, 친구2...
  const [isConnecting, setIsConnecting] = useState(false);

  const [pendingImport, setPendingImport] = useState<any>(null);
  const [recommendedMenu, setRecommendedMenu] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
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
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [importedUrls, setImportedUrls] = useState<string[]>([]);

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
  const [isBadgeModalOpen, setIsBadgeModalOpen] = useState(false);
  const [badgeTab, setBadgeTab] = useState<"general" | "category">("general");
  const [badgeStats, setBadgeStats] = useState<{ total: number, categories: Record<string, number> }>({ total: 0, categories: {} });
  const [isLoadingBadges, setIsLoadingBadges] = useState(false);
  const [shareReview, setShareReview] = useState<Review | null>(null);
  const [receiptImageIndex, setReceiptImageIndex] = useState(0);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [activeBadge, setActiveBadge] = useState<{ icon: string, title: string, color: string, bg: string } | null>(null);

  const displayBadge = activeBadge || getCurrentBadge(totalCount);

  // 🌟 내 정보 및 파트너 UID 감시
  useEffect(() => {
    if (!user) { setActiveBadge(null); setPartnerUids([]); setProfileNickname(""); setProfilePhotoUrl(""); return; }
    const userDocRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.selectedBadge) setActiveBadge(data.selectedBadge);
        if (data.partnerUids) setPartnerUids(data.partnerUids);
        setProfileNickname(data.nickname || user.displayName || "나");
        setProfilePhotoUrl(data.photoUrl || user.photoURL || "");
      } else {
        // 첫 로그인 시 유저 문서 생성
        setDoc(userDocRef, { nickname: user.displayName || "나", photoUrl: user.photoURL || "", partnerUids: [] }, { merge: true });
      }
    });
    return () => unsub();
  }, [user]);

  // 🌟 연결된 파트너들의 상세 프로필 데이터 실시간 감시
  useEffect(() => {
    if (partnerUids.length === 0) { setPartnersData({}); return; }
    const unsubs = partnerUids.map(uid =>
      onSnapshot(doc(db, "users", uid), (snap) => {
        if (snap.exists()) {
          setPartnersData(prev => ({ ...prev, [uid]: { ...snap.data(), uid } }));
        }
      })
    );
    return () => unsubs.forEach(unsub => unsub());
  }, [partnerUids]);

  // 리뷰 불러오기 (나 + 파트너 통합)
  useEffect(() => {
    if (!user) { setReviews([]); setTotalCount(0); return; }
    const targetUids = showGroupRecords ? [user.uid, ...partnerUids] : [user.uid];
    const unsubs: any[] = [];
    const allFetchedReviews: Review[] = [];

    targetUids.forEach(uid => {
      const reviewsRef = collection(db, "users", uid, "reviews");
      let q = query(reviewsRef, orderBy("createdAt", "desc"), limit(30)); // 넉넉히
      if (filterCategory !== "전체") {
        q = query(reviewsRef, where("category", "==", filterCategory), orderBy("createdAt", "desc"), limit(30));
      }

      const unsub = onSnapshot(q, (snap) => {
        let uPhoto = "";
        let uName = "친구";

        if (uid === user.uid) {
          uPhoto = profilePhotoUrl;
          uName = profileNickname;
        } else if (partnersData[uid]) {
          uPhoto = partnersData[uid].photoUrl || "";
          uName = partnersData[uid].nickname || "친구";
        }

        const userReviews = snap.docs.map(d => ({
          id: d.id, ...d.data() as any, userId: uid, userPhoto: uPhoto, userName: uName
        }));

        const otherUsersReviews = allFetchedReviews.filter(r => r.userId !== uid);
        allFetchedReviews.length = 0;
        allFetchedReviews.push(...otherUsersReviews, ...userReviews);
        allFetchedReviews.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        setReviews([...allFetchedReviews]);
        setTotalCount(allFetchedReviews.length);

        setKnownCategories(prev => {
          const newCats = allFetchedReviews.map(r => r.category).filter(c => !prev.includes(c));
          if (newCats.length > 0) return [...prev, ...newCats];
          return prev;
        });
      });
      unsubs.push(unsub);
    });

    return () => unsubs.forEach(fn => fn());
  }, [user, showGroupRecords, partnerUids, filterCategory, profileNickname, profilePhotoUrl, partnersData]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
    script.async = true;
    document.head.appendChild(script);
    return () => { if (document.head.contains(script)) document.head.removeChild(script); };
  }, []);

  // 🌟 프로필 저장 로직
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);
    try {
      let finalPhotoUrl = profilePhotoUrl;
      if (profileImageFile) {
        const storageRef = ref(storage, `users/${user.uid}/profile_${Date.now()}`);
        await uploadBytes(storageRef, profileImageFile);
        finalPhotoUrl = await getDownloadURL(storageRef);
      }

      await setDoc(doc(db, "users", user.uid), {
        nickname: profileNickname,
        photoUrl: finalPhotoUrl
      }, { merge: true });

      setIsProfileModalOpen(false);
      setProfileImageFile(null);
    } catch (e) {
      console.error(e);
      alert("프로필 저장에 실패했습니다.");
    }
    setIsSavingProfile(false);
  };

  const handleProfileImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setProfilePhotoUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // 🌟 친구 연동 신청 로직
  const handleConnectPartner = async () => {
    if (!user || !partnerCode || partnerCode.trim().length < 5) return;
    if (partnerCode.trim() === user.uid) { alert("자신의 코드는 입력할 수 없습니다."); return; }
    if (partnerUids.includes(partnerCode.trim())) { alert("이미 연결된 친구입니다."); return; }

    setIsConnecting(true);
    try {
      const partnerDoc = await getDoc(doc(db, "users", partnerCode.trim()));
      if (!partnerDoc.exists()) {
        alert("유효하지 않은 연결 코드입니다. 친구의 코드를 다시 확인해 주세요!");
        setIsConnecting(false); return;
      }

      const myRef = doc(db, "users", user.uid);
      const partnerRef = doc(db, "users", partnerCode.trim());

      await setDoc(myRef, { partnerUids: arrayUnion(partnerCode.trim()) }, { merge: true });
      await setDoc(partnerRef, { partnerUids: arrayUnion(user.uid) }, { merge: true });

      alert("축하합니다! 친구와 지도가 성공적으로 연결되었습니다. 🎉");
      setPartnerCode("");
      setShowGroupRecords(true);
    } catch (e) {
      console.error(e); alert("연결 중 오류가 발생했습니다.");
    }
    setIsConnecting(false);
  };

  // 🌟 친구 연동 끊기 로직 (실시간 분리)
  const handleDisconnect = async (partnerUid: string, partnerName: string) => {
    if (!user || !window.confirm(`${partnerName}님과의 맛집 지도 공유를 끊으시겠습니까?\n서로의 리스트에서 즉시 삭제됩니다.`)) return;
    try {
      const myRef = doc(db, "users", user.uid);
      const partnerRef = doc(db, "users", partnerUid);

      await updateDoc(myRef, { partnerUids: arrayRemove(partnerUid) });
      await updateDoc(partnerRef, { partnerUids: arrayRemove(user.uid) });

      // 만약 방금 끊은 사람 필터가 적용중이었다면 'all'로 초기화
      if (selectedAuthorFilter === partnerUid) setSelectedAuthorFilter("all");

    } catch (e) {
      console.error(e); alert("연결 해제 중 오류가 발생했습니다.");
    }
  };

  const openBadgeModal = async () => {
    setIsBadgeModalOpen(true);
    setBadgeTab("general");
    if (!user) return;
    setIsLoadingBadges(true);
    try {
      const snap = await getDocs(collection(db, "users", user.uid, "reviews"));
      const counts: Record<string, number> = {};
      snap.forEach(doc => {
        const cat = doc.data().category || "기타";
        counts[cat] = (counts[cat] || 0) + 1;
      });
      setBadgeStats({ total: snap.size, categories: counts });
    } catch (e) { console.error(e); }
    setIsLoadingBadges(false);
  };

  // 🌟 [추가됨] 뱃지 선택 함수
  const handleSelectBadge = async (badge: any, type: 'general' | 'category') => {
    if (!user) return;
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, {
      selectedBadge: {
        icon: badge.icon, title: badge.title, color: badge.color || "text-stone-800",
        bg: badge.bg || (type === 'category' ? "bg-white border-stone-200" : "bg-stone-100 border-stone-200")
      }
    }, { merge: true });
  };

  const totalBadgesCount = GENERAL_BADGES.length + Object.values(CATEGORY_BADGES).reduce((acc, curr) => acc + curr.length, 0);
  const collectedGeneralCount = GENERAL_BADGES.filter(b => badgeStats.total >= b.threshold).length;
  const collectedCategoryCount = Object.entries(CATEGORY_BADGES).reduce((acc, [cat, badges]) => {
    const catCount = badgeStats.categories[cat] || 0;
    return acc + badges.filter(b => catCount >= b.threshold).length;
  }, 0);
  const totalCollectedBadges = collectedGeneralCount + collectedCategoryCount;
  const lockedBadgesCount = totalBadgesCount - totalCollectedBadges;

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.indexOf("kakaotalk") > -1) {
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
                storeName: data.storeName || "", menu: data.menu || "", category: data.category || "기타",
                rating: Number(data.rating) || 5, comment: data.comment || "", imageUrls: data.imageUrls || (data.imageUrl ? [data.imageUrl] : [])
              });
            } else { alert("존재하지 않거나 삭제된 맛집 링크입니다."); }
          } catch (error) { console.error(error); } finally {
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
      setStoreName(pendingImport.storeName); setMenu(pendingImport.menu); setRating(pendingImport.rating);
      setComment(pendingImport.comment); setImportedUrls(pendingImport.imageUrls || []);
      if (knownCategories.includes(pendingImport.category)) { setCategory(pendingImport.category); setShowCustomCategory(false); }
      else { setCategory("기타"); setCustomCategory(pendingImport.category); setShowCustomCategory(true); }
      setIsScrapModalOpen(true); setPendingImport(null);
    } else if (!user && pendingImport) { setAuthMode("signup"); setIsAuthModalOpen(true); }
  }, [user, pendingImport, knownCategories]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u); setAuthLoading(false);
      if (u) { setIsAuthModalOpen(false); setAuthMode("login"); setAuthEmail(""); setAuthPassword(""); }
    });
    return () => unsubscribe();
  }, []);

  const filterOptions = useMemo(() => ["전체", ...knownCategories], [knownCategories]);

  // 🌟 작성자 칩 필터링 적용된 최종 뷰 데이터
  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      if (!showGroupRecords && r.userId !== user?.uid) return false;
      if (showGroupRecords && selectedAuthorFilter !== "all" && r.userId !== selectedAuthorFilter) return false;
      return true;
    });
  }, [reviews, showGroupRecords, selectedAuthorFilter, user]);

  const normalize = (s: string) => s.replace(/[\s()（）]/g, "").toLowerCase();
  const getMenuCategory = (menuName: string): string | null => {
    const norm = normalize(menuName);
    let bestMatchCat: string | null = null;
    let maxKwLen = 0;
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const kw of keywords) {
        const nKw = normalize(kw);
        if (norm.includes(nKw) || nKw.includes(norm)) {
          if (nKw.length > maxKwLen) { maxKwLen = nKw.length; bestMatchCat = cat; }
        }
      }
    }
    return bestMatchCat;
  };

  const handleRecommend = () => {
    setLocationError(null); setNearbySaved([]); setNearbyExternal([]);
    if (userLocation) { startRoulette(userLocation.lat, userLocation.lng); return; }
    if (!navigator.geolocation) { setLocationError("위치 기능을 지원하지 않습니다."); return; }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setIsLocating(false); startRoulette(pos.coords.latitude, pos.coords.longitude); },
      (err) => { setLocationError("위치 권한을 허용해 주세요."); setIsLocating(false); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  const startRoulette = (lat: number, lng: number) => {
    setIsSpinning(true);
    let count = 0;
    const interval = setInterval(() => {
      setRecommendedMenu(BASE_MENUS[Math.floor(Math.random() * BASE_MENUS.length)]);
      count++;
      if (count > 10) {
        clearInterval(interval);
        const final = BASE_MENUS[Math.floor(Math.random() * BASE_MENUS.length)];
        setRecommendedMenu(final); setIsSpinning(false);
        searchLocationBasedPlaces(final, lat, lng, sortOrder);
      }
    }, 50);
  };

  const searchLocationBasedPlaces = async (menu: string, lat: number, lng: number, sort: string) => {
    setIsLocating(true);
    try {
      const KAKAO_KEY = "deb0556cf6ab2cc0e38a558fd65ae01b";
      const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(menu)}&y=${lat}&x=${lng}&radius=3000&size=15&sort=${sort}`, {
        headers: { Authorization: `KakaoAK ${KAKAO_KEY}` }
      });
      const data = await res.json();
      const places = data.documents || [];
      const saved: Review[] = [];
      const external: any[] = [];
      places.forEach((p: any) => {
        const matched = reviews.find(r => normalize(r.storeName).includes(normalize(p.place_name)));
        if (matched) { if (!saved.some(s => s.id === matched.id)) saved.push(matched); }
        else { if (external.length < 5) external.push(p); }
      });
      setNearbySaved(saved); setNearbyExternal(external);
    } catch (e) { setLocationError("주변 검색 실패"); }
    setIsLocating(false);
  };

  const handleSortChange = (newSort: "accuracy" | "distance") => {
    if (sortOrder === newSort || !recommendedMenu || !userLocation) return;
    setSortOrder(newSort); searchLocationBasedPlaces(recommendedMenu, userLocation.lat, userLocation.lng, newSort);
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
      const urls = [];
      for (const file of imageFiles) {
        const storageRef = ref(storage, `users/${user.uid}/reviews/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        urls.push(await getDownloadURL(storageRef));
      }
      const finalUrls = [...importedUrls, ...urls].slice(0, 5);
      await addDoc(collection(db, "users", user.uid, "reviews"), {
        storeName, menu, rating, comment, category: finalCategory, imageUrls: finalUrls, createdAt: serverTimestamp(),
      });
      resetForm(); setIsScrapModalOpen(false);
    } catch (e) { console.error(e); }
    setIsSubmitting(false);
  };

  const handleImagesSelect = (e: React.ChangeEvent<HTMLInputElement>, currentTotal: number, setFiles: React.Dispatch<React.SetStateAction<File[]>>, setPreviews: React.Dispatch<React.SetStateAction<string[]>>) => {
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
    Promise.all(readPromises).then((results) => { setPreviews((prev) => [...prev, ...results]); e.target.value = ""; });
  };

  const openEditModal = (review: Review) => {
    setEditingReview(review); setEditStoreName(review.storeName); setEditMenu(review.menu); setEditRating(review.rating);
    setEditComment(review.comment); setEditCategory(review.category); setEditCustomCategory(""); setEditShowCustomCategory(false);
    setEditExistingUrls(review.imageUrls || []); setEditImageFiles([]); setEditImagePreviews([]);
  };

  const handleUpdateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview || !user) return;
    setIsUpdating(true);
    const finalCat = editShowCustomCategory && editCustomCategory.trim() ? editCustomCategory.trim() : editCategory;
    try {
      let finalUrls = [...editExistingUrls];
      if (editImageFiles.length > 0) {
        for (const file of editImageFiles) {
          const sRef = ref(storage, `users/${user.uid}/reviews/${Date.now()}_${file.name}`);
          await uploadBytes(sRef, file);
          finalUrls.push(await getDownloadURL(sRef));
        }
      }
      await updateDoc(doc(db, "users", user.uid, "reviews", editingReview.id), {
        storeName: editStoreName, menu: editMenu, rating: editRating, comment: editComment, category: finalCat, imageUrls: finalUrls.slice(0, 5)
      });
      setEditingReview(null);
    } catch (e) { console.error(e); }
    setIsUpdating(false);
  };

  const handleDeleteReview = async (id: string) => {
    if (!user || !window.confirm("삭제할까요?")) return;
    try { await deleteDoc(doc(db, "users", user.uid, "reviews", id)); } catch (e) { console.error(e); }
  };

  const handleKakaoShare = () => {
    if (!shareReview || !user) return;
    const kakao = (window as any).Kakao;
    if (kakao && !kakao.isInitialized()) kakao.init('6d8e9624fa45bf20fe85ee7dc75aa28d');
    if (kakao) {
      const url = `${window.location.origin}/?uid=${shareReview.userId || user.uid}&rid=${shareReview.id}`;
      kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: `🍽️ [오늘 뭐 먹지?] ${shareReview.storeName}`,
          description: `⭐ 별점: ${shareReview.rating}.0\n💬 "${shareReview.comment}"`,
          imageUrl: shareReview.imageUrls?.[receiptImageIndex] || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1',
          link: { mobileWebUrl: url, webUrl: url },
        },
        buttons: [{ title: '맛집 저장하기', link: { mobileWebUrl: url, webUrl: url } }],
      });
    }
  };

  const handleDownloadReceipt = async () => {
    if (!receiptRef.current || !shareReview) return;
    setIsGeneratingImage(true);
    try {
      const url = await toPng(receiptRef.current, { cacheBust: true, backgroundColor: '#ffffff', pixelRatio: 2, fontEmbedCSS: '' });
      const link = document.createElement("a");
      link.href = url; link.download = `today_food_${shareReview.storeName}.png`; link.click();
    } catch (e) { alert("저장 실패"); }
    setIsGeneratingImage(false);
  };

  const handleCopyLink = async () => {
    if (!user || !shareReview) return;
    const url = `${window.location.origin}/?uid=${shareReview.userId || user.uid}&rid=${shareReview.id}`;
    await navigator.clipboard.writeText(url);
    alert("링크 복사 완료!");
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(""); setResetMessage("");
    try {
      if (authMode === "signup") await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      else await signInWithEmailAndPassword(auth, authEmail, authPassword);
      setAuthEmail(""); setAuthPassword("");
    } catch (error: any) { setAuthError("이메일 또는 비밀번호를 확인해주세요."); }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(""); setResetMessage("");
    if (!authEmail) { setAuthError("이메일 주소를 입력해 주세요."); return; }
    try { auth.languageCode = "ko"; await sendPasswordResetEmail(auth, authEmail); setResetMessage("메일 전송 완료!"); }
    catch (error: any) { setAuthError("메일 발송 오류"); }
  };

  const handleGoogleLogin = async () => { try { await signInWithPopup(auth, googleProvider); } catch (e) { } };
  const handleLogout = async () => { await signOut(auth); };

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

  const CategorySelector = ({ value, onChange, showCustom, onToggleCustom, customValue, onCustomChange, availableCats }: any) => (
    <div>
      <label className="block text-sm font-semibold text-stone-600 mb-2 ml-1 flex items-center gap-1.5"><Tag size={14} />카테고리</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {availableCats.map((cat: string) => (
          <button key={cat} type="button" onClick={() => { onChange(cat); if (showCustom) onToggleCustom(); }}
            className={`text-xs font-semibold px-3 py-2 rounded-xl transition-all ${!showCustom && value === cat ? "bg-orange-500 text-white shadow-sm" : "bg-stone-100 text-stone-600"}`}
          >{cat}</button>
        ))}
        <button type="button" onClick={onToggleCustom} className={`text-xs font-semibold px-3 py-2 rounded-xl transition-all flex items-center gap-1 ${showCustom ? "bg-orange-500 text-white shadow-sm" : "bg-stone-100 text-stone-600"}`}><Plus size={12} />직접 입력</button>
      </div>
      {showCustom && (
        <input type="text" value={customValue} onChange={(e) => onCustomChange(e.target.value)} placeholder="새 카테고리 입력" className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 focus:ring-2 focus:ring-orange-500/50 outline-none text-sm" />
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
            <div key={`exist-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200"><img src={src} className="w-full h-full object-cover" /><button type="button" onClick={() => onRemoveExisting(i)} className="absolute top-1.5 right-1.5 bg-black/60 text-white p-1 rounded-full"><X size={14} /></button></div>
          ))}
          {newPreviews.map((src: string, i: number) => (
            <div key={`new-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-orange-200"><img src={src} className="w-full h-full object-cover" /><button type="button" onClick={() => onRemoveNew(i)} className="absolute top-1.5 right-1.5 bg-black/60 text-white p-1 rounded-full"><X size={14} /></button></div>
          ))}
          {totalCount < 5 && (
            <>
              <button type="button" onClick={() => galleryRef.current?.click()} className="aspect-square border-2 border-dashed border-stone-200 rounded-xl flex flex-col items-center justify-center gap-1 text-stone-400 hover:text-blue-500"><ImageIcon size={20} /><span className="text-[10px] font-bold">앨범</span></button>
              <button type="button" onClick={() => cameraRef.current?.click()} className="aspect-square border-2 border-dashed border-stone-200 rounded-xl flex flex-col items-center justify-center gap-1 text-stone-400 hover:text-orange-500"><Camera size={20} /><span className="text-[10px] font-bold">촬영</span></button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[#FFFDF6] text-stone-800 font-sans pb-20">

      {/* 🌟 내 프로필 설정 모달 */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsProfileModalOpen(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black flex items-center gap-2"><Settings className="text-orange-500" /> 내 프로필 설정</h3>
              <button onClick={() => setIsProfileModalOpen(false)} className="p-1.5 rounded-full bg-stone-100 text-stone-500"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-2 border-orange-200 bg-orange-50 overflow-hidden flex items-center justify-center">
                    {profilePhotoUrl ? <img src={profilePhotoUrl} className="w-full h-full object-cover" /> : <User size={40} className="text-orange-300" />}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md border border-stone-200 cursor-pointer hover:bg-stone-50 transition-colors">
                    <Camera size={16} className="text-stone-600" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleProfileImageSelect} />
                  </label>
                </div>
                <p className="text-[10px] text-stone-400">사진을 터치해 변경하세요</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider ml-1">나의 닉네임</label>
                <input
                  type="text" value={profileNickname} onChange={(e) => setProfileNickname(e.target.value)} required
                  placeholder="닉네임을 입력하세요 (예: 맛잘알 지훈)" maxLength={10}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                />
              </div>

              <button type="submit" disabled={isSavingProfile} className="w-full bg-stone-800 hover:bg-black text-white font-black py-4 rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50">
                {isSavingProfile ? <Loader2 className="animate-spin mx-auto" /> : "프로필 저장하기"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 👥 공유 지도(파트너 연동) 모달 (Phase 2.1 고도화) */}
      {isSyncModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSyncModalOpen(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-xl font-black flex items-center gap-2"><MapPin className="text-blue-500" fill="#E0F2FE" /> 공유 지도 만들기</h3>
              <button onClick={() => setIsSyncModalOpen(false)} className="p-1.5 rounded-full bg-stone-100 text-stone-500"><X size={18} /></button>
            </div>

            <div className="overflow-y-auto scrollbar-hide space-y-6 pb-2">
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
                <p className="text-[13px] font-bold text-blue-800 leading-relaxed">서로의 코드를 입력하면<br />맛집 지도가 하나로 합쳐져요! 🗺️✨</p>
              </div>

              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <p className="text-[11px] font-bold text-stone-400 mb-2 uppercase tracking-wider">나의 연결 코드</p>
                <div className="flex items-center justify-between">
                  <code className="text-sm font-black text-blue-600 tracking-widest bg-white px-2 py-1 rounded shadow-sm border border-stone-100">{user?.uid?.substring(0, 15)}...</code>
                  <button onClick={() => { navigator.clipboard.writeText(user?.uid || ""); alert("내 코드가 복사되었습니다!"); }} className="p-2 bg-white rounded-lg shadow-sm text-stone-400 hover:text-blue-500"><Copy size={16} /></button>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider ml-1">친구 코드 입력</p>
                <input
                  type="text" value={partnerCode} onChange={(e) => setPartnerCode(e.target.value)}
                  placeholder="친구의 코드를 붙여넣기 하세요"
                  className="w-full bg-white border border-stone-200 rounded-xl py-4 px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                />
                <button
                  onClick={handleConnectPartner} disabled={isConnecting || !partnerCode}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-3.5 rounded-xl shadow-md active:scale-95 transition-all disabled:opacity-50"
                >
                  {isConnecting ? <Loader2 className="animate-spin mx-auto" /> : "연결 신청하기"}
                </button>
              </div>

              {/* 🌟 현재 연결된 친구 목록 및 끊기 */}
              {partnerUids.length > 0 && (
                <div className="pt-4 border-t border-stone-100">
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider ml-1 mb-3">현재 연결된 친구들</p>
                  <div className="space-y-2">
                    {partnerUids.map(uid => {
                      const p = partnersData[uid];
                      return (
                        <div key={uid} className="flex items-center justify-between bg-white border border-stone-100 p-3 rounded-xl shadow-sm">
                          <div className="flex items-center gap-3">
                            {p?.photoUrl ? <img src={p.photoUrl} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400"><User size={14} /></div>}
                            <span className="font-bold text-sm text-stone-700">{p?.nickname || "친구"}</span>
                          </div>
                          <button onClick={() => handleDisconnect(uid, p?.nickname || "친구")} className="text-[10px] font-bold bg-red-50 text-red-500 hover:bg-red-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors">
                            <UserMinus size={12} /> 연결 끊기
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-end mb-2"><button onClick={() => { setIsAuthModalOpen(false); setAuthError(""); setResetMessage(""); }} className="p-1.5 rounded-full bg-stone-100"><X size={18} /></button></div>
            {authMode === "reset" ? (
              <>
                <div className="text-center mb-6"><div className="inline-flex bg-orange-100 p-3 rounded-full text-orange-500 mb-3"><Lock size={28} /></div><h3 className="text-xl font-black mb-2">비밀번호 재설정</h3></div>
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required placeholder="이메일 주소" className="w-full py-3 px-4 bg-stone-50 rounded-xl border border-stone-200" />
                  {authError && <p className="text-xs text-red-500 text-center">{authError}</p>}
                  <button type="submit" className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl">재설정 메일 보내기</button>
                  <button type="button" onClick={() => setAuthMode("login")} className="w-full text-sm font-bold text-stone-400">로그인으로 돌아가기</button>
                </form>
              </>
            ) : (
              <>
                <div className="text-center mb-6"><div className="inline-flex bg-orange-100 p-3 rounded-full text-orange-500 mb-3"><ChefHat size={28} /></div><h3 className="text-xl font-black mb-2">나만의 맛집 지도 만들기</h3></div>
                <div className="flex p-1 bg-stone-100 rounded-xl mb-6">
                  <button onClick={() => setAuthMode("login")} className={`flex-1 py-2 text-sm font-bold rounded-lg ${authMode === "login" ? "bg-white shadow-sm" : "text-stone-400"}`}>로그인</button>
                  <button onClick={() => setAuthMode("signup")} className={`flex-1 py-2 text-sm font-bold rounded-lg ${authMode === "signup" ? "bg-white shadow-sm" : "text-stone-400"}`}>회원가입</button>
                </div>
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required placeholder="이메일 주소" className="w-full py-3 px-4 bg-stone-50 rounded-xl border border-stone-200" />
                  <input type={showPassword ? "text" : "password"} value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required placeholder="비밀번호" className="w-full py-3 px-4 bg-stone-50 rounded-xl border border-stone-200" />
                  {authError && <p className="text-xs text-red-500 text-center">{authError}</p>}
                  <button type="submit" className="w-full bg-stone-800 text-white font-bold py-3.5 rounded-xl">{authMode === "login" ? "로그인" : "가입하기"}</button>
                </form>
                <div className="relative my-6 flex items-center py-2"><div className="flex-grow border-t border-stone-200"></div><span className="mx-4 text-stone-400 text-xs">또는</span><div className="flex-grow border-t border-stone-200"></div></div>
                <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-2 bg-white border border-stone-200 font-bold py-3.5 rounded-xl shadow-sm">구글로 시작하기</button>
              </>
            )}
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
          {user && (
            <div className="flex items-center gap-2.5">
              <button onClick={() => setIsSyncModalOpen(true)} className={`p-2 rounded-full transition-colors ${partnerUids.length > 0 ? 'bg-blue-50 text-blue-500 hover:bg-blue-100' : 'bg-stone-50 text-stone-400 hover:bg-stone-100'}`}><Users size={18} /></button>
              <button onClick={() => setIsProfileModalOpen(true)} className="flex items-center gap-1.5 bg-stone-50 hover:bg-stone-100 pl-1.5 pr-3 py-1.5 rounded-full transition-colors">
                {profilePhotoUrl ? <img src={profilePhotoUrl} className="w-6 h-6 rounded-full object-cover border border-stone-200" /> : <div className="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center text-stone-500"><User size={12} /></div>}
                <span className="text-[11px] font-bold text-stone-600 truncate max-w-[60px]">{profileNickname}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-md mx-auto px-6 pt-6 pb-20 space-y-8">

        {user && !authLoading && (
          <div onClick={openBadgeModal} className="bg-white rounded-3xl p-5 shadow-sm border border-orange-100 flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner ${displayBadge.bg}`}>{displayBadge.icon}</div>
              <div><p className="text-[11px] font-bold text-stone-400 mb-1">나의 대표 뱃지 👆</p><p className={`text-lg font-black ${displayBadge.color}`}>{displayBadge.title}</p></div>
            </div>
            <ChevronRight className="text-stone-400" size={20} />
          </div>
        )}

        <section className="bg-white rounded-3xl p-8 shadow-sm border border-orange-50 text-center flex flex-col items-center">
          <h2 className="text-stone-500 font-medium mb-6">결정이 어려울 땐 운명에 맡겨보세요</h2>
          {recommendedMenu && (
            <div className="relative w-44 h-44 rounded-[2rem] bg-white flex flex-col items-center justify-center shadow-md border border-stone-100 mb-6">
              <div className={`absolute top-4 ${iconTheme.bgColor} ${iconTheme.textColor} text-[10px] font-extrabold px-3 py-1 rounded-full`}>{matchedCategory}</div>
              <span className="text-[64px] mt-4">{iconTheme.emoji}</span>
            </div>
          )}
          <span className={`text-4xl font-black text-orange-500 mb-8 ${isSpinning ? 'animate-pulse' : ''}`}>{recommendedMenu || "메뉴를 골라볼까요?"}</span>
          <button onClick={handleRecommend} disabled={isSpinning || isLocating} className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2">
            <RefreshCw size={20} className={isSpinning || isLocating ? "animate-spin" : ""} /> {isLocating ? "위치 파악 중..." : "추천받기"}
          </button>

          {(!isLocating && recommendedMenu && !isSpinning) && (
            <div className="mt-8 pt-6 w-full border-t border-orange-50 space-y-4">
              {locationError ? <p className="text-xs text-red-500 font-bold">{locationError}</p> : (
                <>
                  {nearbySaved.length > 0 && (
                    <div className="text-left">
                      <p className="text-sm font-bold text-stone-600 mb-3 flex items-center gap-1.5"><MapPin size={16} className="text-orange-500" />내 주변 단골 맛집</p>
                      {nearbySaved.map(r => (
                        <div key={r.id} className="flex items-center justify-between bg-orange-50 p-3 rounded-xl mb-2">
                          <div className="flex items-center gap-3 min-w-0">{r.imageUrls?.[0] && <img src={r.imageUrls[0]} className="w-10 h-10 rounded-lg object-cover" />}<div className="min-w-0"><p className="text-sm font-bold truncate">{r.storeName}</p><p className="text-[10px] text-orange-500">{r.menu}</p></div></div>
                          <div className="flex items-center gap-1 shrink-0"><Star size={11} className="text-amber-500 fill-amber-500" /><span className="text-xs font-bold">{r.rating}.0</span></div>
                        </div>
                      ))}
                    </div>
                  )}
                  {nearbyExternal.length > 0 && (
                    <div className="text-left">
                      <div className="flex justify-between items-center mb-3">
                        <p className="text-sm font-bold text-stone-600 flex items-center gap-1.5"><Compass size={16} className="text-blue-500" />주변 {recommendedMenu} 맛집</p>
                      </div>
                      <div className="space-y-2">
                        {nearbyExternal.map((p, i) => (
                          <div key={i} className="flex items-center justify-between bg-white border border-stone-100 rounded-xl px-4 py-3 shadow-sm">
                            <a href={p.place_url} target="_blank" className="flex flex-col min-w-0 flex-1"><span className="font-bold text-stone-700 text-sm truncate">{p.place_name}</span><span className="text-[10px] text-stone-400 truncate">{p.address_name}</span></a>
                            <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2 py-1 rounded-md ml-2">{p.distance}m</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        {user && (
          <section className="space-y-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-stone-800">맛집 리스트 <span className="text-orange-500">{filteredReviews.length}</span></h2>
                {partnerUids.length > 0 && (
                  <div className="flex bg-stone-100 p-1 rounded-xl shadow-inner shrink-0">
                    <button onClick={() => setShowGroupRecords(false)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!showGroupRecords ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-400'}`}><User size={14} /> 나만 보기</button>
                    <button onClick={() => setShowGroupRecords(true)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showGroupRecords ? 'bg-blue-500 text-white shadow-sm' : 'text-stone-400'}`}><Users size={14} /> 우리 기록</button>
                  </div>
                )}
              </div>

              <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                {filterOptions.map(cat => <button key={cat} onClick={() => setFilterCategory(cat)} className={`text-xs font-bold px-3 py-2 rounded-xl border whitespace-nowrap ${filterCategory === cat ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-stone-500'}`}>{cat}</button>)}
              </div>

              {showGroupRecords && partnerUids.length > 0 && (
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 pt-1 border-b border-stone-100">
                  <button onClick={() => setSelectedAuthorFilter("all")} className={`text-[11px] font-bold px-3 py-1.5 rounded-full transition-all whitespace-nowrap border ${selectedAuthorFilter === "all" ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-500 border-stone-200'}`}>전체 기록</button>
                  <button onClick={() => setSelectedAuthorFilter(user.uid)} className={`text-[11px] font-bold px-3 py-1.5 rounded-full transition-all whitespace-nowrap border flex items-center gap-1 ${selectedAuthorFilter === user.uid ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-500 border-stone-200'}`}>
                    {profilePhotoUrl && <img src={profilePhotoUrl} className="w-3 h-3 rounded-full object-cover" />}내 픽
                  </button>
                  {partnerUids.map(uid => {
                    const p = partnersData[uid];
                    return (
                      <button key={uid} onClick={() => setSelectedAuthorFilter(uid)} className={`text-[11px] font-bold px-3 py-1.5 rounded-full transition-all whitespace-nowrap border flex items-center gap-1 ${selectedAuthorFilter === uid ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-500 border-stone-200'}`}>
                        {p?.photoUrl && <img src={p.photoUrl} className="w-3 h-3 rounded-full object-cover" />}{p?.nickname || "친구"}픽
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {filteredReviews.length === 0 ? (
              <div className="py-12 text-center bg-white rounded-3xl border border-stone-100"><p className="text-stone-500 font-bold mb-1">저장된 맛집이 없어요 🥲</p></div>
            ) : (
              <div className="grid gap-6">
                {filteredReviews.map(review => (
                  <div key={review.id} className="bg-white rounded-3xl overflow-hidden border border-stone-100 shadow-sm hover:shadow-md transition-shadow relative">

                    {showGroupRecords && (
                      <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-md border border-white/50 flex items-center gap-2 pr-3">
                        {review.userPhoto ? <img src={review.userPhoto} className="w-5 h-5 rounded-full object-cover" /> : <div className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center text-[10px]"><User size={10} /></div>}
                        <span className="text-[10px] font-black text-stone-700">{review.userName}</span>
                      </div>
                    )}

                    {review.imageUrls && review.imageUrls.length > 0 && (
                      <div className="flex overflow-x-auto scrollbar-hide snap-x bg-stone-100 h-48">
                        {review.imageUrls.map((url, idx) => <img key={idx} src={url} onClick={() => setFullScreenData({ urls: review.imageUrls!, currentIndex: idx })} className="h-full w-full object-cover snap-center min-w-full" />)}
                      </div>
                    )}
                    <div className="p-5 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 pr-2"><h3 className="font-bold text-lg text-stone-800 truncate">{review.storeName}</h3><p className="text-orange-500 text-sm font-semibold truncate">{review.menu} | {review.category}</p></div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => { setShareReview(review); setReceiptImageIndex(0); }} className="p-2 bg-stone-50 rounded-lg text-stone-400 hover:text-blue-500"><Share2 size={14} /></button>
                          {review.userId === user.uid && (
                            <>
                              <button onClick={() => openEditModal(review)} className="p-2 bg-stone-50 rounded-lg text-stone-400 hover:text-orange-500"><Pencil size={14} /></button>
                              <button onClick={() => handleDeleteReview(review.id)} className="p-2 bg-stone-50 rounded-lg text-stone-400 hover:text-red-500"><Trash2 size={14} /></button>
                            </>
                          )}
                          <div className="flex items-center bg-amber-50 px-2 rounded-lg gap-1"><Star size={12} className="text-amber-500 fill-amber-500" /><span className="text-xs font-bold">{review.rating}.0</span></div>
                        </div>
                      </div>
                      <div className="bg-[#FFFDF6] p-4 rounded-2xl italic text-stone-600 text-sm border border-orange-50/50">"{review.comment}"</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 맛집 입력창 */}
        {user && (
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-orange-50 space-y-5">
            <div className="flex items-center gap-2 mb-2"><Star className="text-orange-500 fill-orange-500" size={18} /><h2 className="font-bold text-stone-800">맛집 직접 기록</h2></div>
            <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="가게 이름" className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 outline-none text-sm focus:ring-2 focus:ring-orange-500" />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={menu} onChange={(e) => setMenu(e.target.value)} placeholder="메뉴" className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 outline-none text-sm focus:ring-2 focus:ring-orange-500" />
              <div className="flex items-center justify-center bg-stone-50 border border-stone-100 rounded-xl gap-1">
                {[1, 2, 3, 4, 5].map(s => <Star key={s} size={18} onClick={() => setRating(s)} className={`cursor-pointer ${rating >= s ? 'text-amber-400 fill-amber-400' : 'text-stone-300'}`} />)}
              </div>
            </div>
            <CategorySelector value={category} onChange={setCategory} showCustom={showCustomCategory} onToggleCustom={() => setShowCustomCategory(!showCustomCategory)} customValue={customCategory} onCustomChange={setCustomCategory} availableCats={knownCategories} />
            <MultiImagePicker existingUrls={[]} newPreviews={imagePreviews} onSelect={(e: any, t: number) => handleImagesSelect(e, t, setImageFiles, setImagePreviews)} onRemoveExisting={() => { }} onRemoveNew={(idx: number) => { setImageFiles(p => p.filter((_, i) => i !== idx)); setImagePreviews(p => p.filter((_, i) => i !== idx)); }} />
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="한줄평" className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 h-24 resize-none outline-none text-sm focus:ring-2 focus:ring-orange-500" />
            <button onClick={handleAddReview} disabled={isSubmitting} className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl shadow-lg">{isSubmitting ? "저장 중..." : "기록 저장하기"}</button>
          </section>
        )}
      </div>

      {/* 📸 공유 모달 */}
      {shareReview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-6" onClick={() => setShareReview(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 flex flex-col w-full h-full sm:h-auto sm:max-h-[90vh] max-w-md bg-[#FFFDF6] sm:rounded-[2rem] sm:border border-stone-200 shadow-2xl overflow-hidden animate-in zoom-in-95 sm:slide-in-from-bottom-0 slide-in-from-bottom-full duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center w-full p-5 shrink-0 bg-white border-b border-orange-50">
              <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2"><Share2 size={18} className="text-orange-500" /> 맛집 공유하기</h3>
              <button onClick={() => setShareReview(null)} className="p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto w-full px-4 pt-6 flex flex-col items-center pb-6 scrollbar-hide">
              {shareReview.imageUrls && shareReview.imageUrls.length > 1 && (
                <div className="flex gap-2 mb-4 w-[300px] overflow-x-auto scrollbar-hide pb-2 shrink-0">
                  {shareReview.imageUrls.map((url, idx) => (
                    <button key={idx} onClick={() => setReceiptImageIndex(idx)} className={`w-12 h-12 shrink-0 rounded-lg border-2 overflow-hidden ${idx === receiptImageIndex ? 'border-orange-500 shadow-md' : 'border-transparent opacity-50'}`}>
                      <img src={url} crossOrigin="anonymous" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div ref={receiptRef} className="bg-white w-[300px] p-6 shadow-2xl relative overflow-hidden shrink-0 border border-stone-100" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
                <div className="absolute top-0 left-0 right-0 h-2 bg-transparent" style={{ backgroundImage: "linear-gradient(-45deg, transparent 4px, white 4px), linear-gradient(45deg, transparent 4px, white 4px)", backgroundSize: "8px 8px" }} />
                <div className="border-b-2 border-dashed border-stone-300 pb-4 mb-4 text-center mt-2">
                  <h2 className="text-2xl font-black text-stone-800 tracking-tighter uppercase">TODAY FOOD</h2>
                  <p className="text-[10px] text-stone-500 mt-1">맛있는 기억을 기록하다</p>
                </div>
                {shareReview.imageUrls && shareReview.imageUrls[receiptImageIndex] && (
                  <div className="mb-4 rounded-xl border border-stone-200 p-1 bg-stone-50"><img src={shareReview.imageUrls[receiptImageIndex]} crossOrigin="anonymous" className="w-full h-40 object-cover rounded-lg" /></div>
                )}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-end border-b border-stone-100 pb-1"><span className="text-[11px] text-stone-400 font-bold">STORE</span><span className="text-lg font-black text-stone-800 truncate pl-4">{shareReview.storeName}</span></div>
                  <div className="flex justify-between items-end border-b border-stone-100 pb-1"><span className="text-[11px] text-stone-400 font-bold">MENU</span><span className="text-sm font-bold text-stone-600 truncate pl-4">{shareReview.menu}</span></div>
                  <div className="flex justify-between items-end pb-1"><span className="text-[11px] text-stone-400 font-bold">RATING</span><span className="text-sm font-bold text-amber-500">{"★".repeat(shareReview.rating)}{"☆".repeat(5 - shareReview.rating)}</span></div>
                </div>
                <div className="border-t-2 border-dashed border-stone-300 pt-4 mb-2"><p className="text-sm font-medium text-stone-700 italic text-center break-keep bg-stone-50 p-3 rounded-xl">"{shareReview.comment}"</p></div>
                <div className="flex flex-col items-center justify-center mt-6 mb-2">
                  <div className="p-1.5 bg-white border border-stone-200 rounded-xl shadow-sm mb-2">
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`${window.location.origin}/?uid=${shareReview.userId || user?.uid}&rid=${shareReview.id}`)}`} crossOrigin="anonymous" className="w-16 h-16 opacity-90" />
                  </div>
                  <p className="text-[10px] text-stone-500 font-bold tracking-widest">SCAN TO SAVE</p>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-transparent rotate-180" style={{ backgroundImage: "linear-gradient(-45deg, transparent 4px, white 4px), linear-gradient(45deg, transparent 4px, white 4px)", backgroundSize: "8px 8px" }} />
              </div>
            </div>
            <div className="shrink-0 w-full p-4 bg-white border-t border-stone-100 pb-8 sm:pb-5">
              <div className="flex flex-col gap-2 w-full max-w-[300px] mx-auto">
                <button onClick={handleKakaoShare} className="w-full bg-[#FEE500] hover:bg-[#FDD800] text-stone-900 font-black py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2"><MessageCircle size={18} className="fill-stone-900" /> 카카오톡으로 공유하기</button>
                <div className="flex gap-2">
                  <button onClick={handleDownloadReceipt} disabled={isGeneratingImage} className="flex-1 bg-stone-50 text-stone-800 text-sm font-bold py-3.5 rounded-xl shadow-sm border border-stone-200 flex items-center justify-center gap-2">{isGeneratingImage ? <Loader2 size={16} className="animate-spin text-orange-500" /> : <Download size={16} className="text-orange-500" />} 이미지 저장</button>
                  <button onClick={handleCopyLink} className="flex-1 bg-stone-50 text-stone-800 text-sm font-bold py-3.5 rounded-xl shadow-sm border border-stone-200 flex items-center justify-center gap-2"><Copy size={16} className="text-blue-500" /> 링크 복사</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 기타 모달 모음 (수정, 스크랩, 도감, 풀스크린 등) */}
      {isScrapModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" onClick={() => setIsScrapModalOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">{pendingImport ? <Copy size={18} className="text-blue-500" /> : <MapPin size={18} className="text-orange-500" />}{pendingImport ? "친구 맛집 가져오기" : "맛집 저장하기"}</h3>
              <button type="button" onClick={() => setIsScrapModalOpen(false)} className="p-1.5 rounded-full bg-stone-100"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddReview} className="space-y-4">
              <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} required placeholder="가게 이름" className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 text-sm" />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" value={menu} onChange={(e) => setMenu(e.target.value)} required placeholder="메뉴" className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 text-sm" />
                <div className="flex items-center justify-between bg-stone-50 border border-stone-100 rounded-xl px-3 h-[50px]">{[1, 2, 3, 4, 5].map((s) => <Star key={s} onClick={() => setRating(s)} size={22} className={`cursor-pointer ${rating >= s ? 'text-amber-400 fill-amber-400' : 'text-stone-300'}`} />)}</div>
              </div>
              <CategorySelector value={category} onChange={setCategory} showCustom={showCustomCategory} onToggleCustom={() => setShowCustomCategory(!showCustomCategory)} customValue={customCategory} onCustomChange={setCustomCategory} availableCats={knownCategories} />
              <MultiImagePicker existingUrls={importedUrls} newPreviews={imagePreviews} onSelect={(e: any, t: number) => handleImagesSelect(e, t, setImageFiles, setImagePreviews)} onRemoveExisting={(idx: number) => setImportedUrls(p => p.filter((_, i) => i !== idx))} onRemoveNew={(idx: number) => { setImageFiles(p => p.filter((_, i) => i !== idx)); setImagePreviews(p => p.filter((_, i) => i !== idx)); }} />
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} required placeholder="한줄평" className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 h-24 resize-none text-sm" />
              <button type="submit" disabled={isSubmitting} className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl">{isSubmitting ? "저장 중..." : "리스트에 저장"}</button>
            </form>
          </div>
        </div>
      )}

      {editingReview && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" onClick={() => setEditingReview(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h3 className="text-lg font-bold text-stone-800 flex items-center gap-2"><Pencil size={18} className="text-orange-500" /> 맛집 수정</h3><button onClick={() => setEditingReview(null)} className="p-1.5 rounded-full bg-stone-100"><X size={18} /></button></div>
            <form onSubmit={handleUpdateReview} className="space-y-4">
              <input type="text" value={editStoreName} onChange={(e) => setEditStoreName(e.target.value)} required className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 text-sm" />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" value={editMenu} onChange={(e) => setEditMenu(e.target.value)} required className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 text-sm" />
                <div className="flex items-center justify-between bg-stone-50 border border-stone-100 rounded-xl px-3 h-[50px]">{[1, 2, 3, 4, 5].map((s) => <Star key={s} onClick={() => setEditRating(s)} size={22} className={`cursor-pointer ${editRating >= s ? 'text-amber-400 fill-amber-400' : 'text-stone-300'}`} />)}</div>
              </div>
              <CategorySelector value={editCategory} onChange={setEditCategory} showCustom={editShowCustomCategory} onToggleCustom={() => setEditShowCustomCategory(!editShowCustomCategory)} customValue={editCustomCategory} onCustomChange={setCustomCategory} availableCats={knownCategories} />
              <MultiImagePicker existingUrls={editExistingUrls} newPreviews={editImagePreviews} onSelect={(e: any, t: number) => handleImagesSelect(e, t, setEditImageFiles, setEditImagePreviews)} onRemoveExisting={(idx: number) => setEditExistingUrls(p => p.filter((_, i) => i !== idx))} onRemoveNew={(idx: number) => { setEditImageFiles(p => p.filter((_, i) => i !== idx)); setEditImagePreviews(p => p.filter((_, i) => i !== idx)); }} />
              <textarea value={editComment} onChange={(e) => setEditComment(e.target.value)} required className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 h-24 resize-none text-sm" />
              <button type="submit" disabled={isUpdating} className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl">{isUpdating ? "저장 중..." : "수정 완료"}</button>
            </form>
          </div>
        </div>
      )}

      {isBadgeModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" onClick={() => setIsBadgeModalOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 shrink-0"><h3 className="text-xl font-black flex items-center gap-2"><Star className="text-orange-500 fill-orange-500" size={20} /> 내 뱃지 도감</h3><button onClick={() => setIsBadgeModalOpen(false)} className="p-1.5 rounded-full bg-stone-100"><X size={18} /></button></div>
            {isLoadingBadges ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-orange-500" size={32} /></div> : (
              <>
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-3 flex items-center justify-between shrink-0">
                  <div><p className="text-xs font-bold text-orange-600 mb-0.5">나의 수집 진행도</p><p className="text-sm font-black text-stone-800"><span className="text-orange-500 text-xl">{totalCollectedBadges}</span> / {totalBadgesCount}개</p></div>
                  <div className="text-right"><p className="text-[11px] text-stone-500 font-medium">Locked</p><p className="text-sm font-bold text-stone-700">🔒 {lockedBadgesCount}개</p></div>
                </div>
                <div className="flex border-b border-stone-100 mb-4 shrink-0">
                  <button onClick={() => setBadgeTab("general")} className={`flex-1 pb-2 font-bold text-sm border-b-2 ${badgeTab === "general" ? "border-orange-500 text-orange-500" : "border-transparent text-stone-400"}`}>🏆 미식가 등급</button>
                  <button onClick={() => setBadgeTab("category")} className={`flex-1 pb-2 font-bold text-sm border-b-2 ${badgeTab === "category" ? "border-orange-500 text-orange-500" : "border-transparent text-stone-400"}`}>🏷️ 카테고리 뱃지</button>
                </div>
                <div className="overflow-y-auto scrollbar-hide flex-1 pb-4 space-y-3">
                  {badgeTab === "general" ? GENERAL_BADGES.map((b, i) => {
                    const isUnlocked = badgeStats.total >= b.threshold;
                    const isSelected = displayBadge.title === b.title;
                    return (
                      <div key={i} onClick={() => isUnlocked && handleSelectBadge(b, 'general')} className={`flex items-center gap-4 p-3 rounded-2xl border ${isUnlocked ? (isSelected ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200' : `${b.bg} cursor-pointer`) : 'bg-stone-50 border-stone-100 grayscale opacity-40'}`}>
                        <div className="text-3xl shrink-0 w-12 text-center">{isUnlocked ? b.icon : "🔒"}</div>
                        <div className="flex-1 min-w-0"><div className="flex justify-between items-center mb-0.5"><span className={`font-black text-sm ${isUnlocked ? b.color : 'text-stone-500'}`}>{b.title}</span>{isUnlocked && isSelected && <Check size={16} className="text-orange-500" />}</div><p className="text-[11px] text-stone-500 truncate">{b.desc}</p></div>
                      </div>
                    );
                  }) : Object.entries(CATEGORY_BADGES).map(([cat, badges]) => (
                    <div key={cat}>
                      <h4 className="font-extrabold text-stone-700 mb-3 flex justify-between border-b border-stone-100 pb-2"><span>{cat} 영역</span><span className="text-xs bg-stone-100 text-stone-500 px-2 py-1 rounded-lg">누적 {badgeStats.categories[cat] || 0}곳</span></h4>
                      <div className="grid gap-2">
                        {badges.map(b => {
                          const isUnlocked = (badgeStats.categories[cat] || 0) >= b.threshold;
                          const isSelected = displayBadge.title === b.title;
                          return (
                            <div key={b.title} onClick={() => isUnlocked && handleSelectBadge(b, 'category')} className={`flex items-center gap-3 p-3 rounded-2xl border ${isUnlocked ? (isSelected ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200' : 'bg-white border-orange-100 cursor-pointer') : 'bg-stone-50 border-stone-100 grayscale opacity-40'}`}>
                              <div className="text-2xl shrink-0 w-10 text-center">{isUnlocked ? b.icon : "🔒"}</div>
                              <div className="flex-1 min-w-0"><div className="flex justify-between items-center mb-0.5"><span className="font-bold text-sm text-stone-800">{b.title}</span>{isUnlocked && isSelected && <Check size={16} className="text-orange-500" />}</div><p className="text-[11px] text-stone-500 truncate">{b.desc}</p></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {fullScreenData && (
        <div className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center p-4" onClick={() => setFullScreenData(null)}>
          <button className="absolute top-6 right-6 text-white p-2 rounded-full hover:bg-white/20"><X size={24} /></button>
          <img src={fullScreenData.urls[fullScreenData.currentIndex]} className="max-w-full max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}

    </main>
  );
}