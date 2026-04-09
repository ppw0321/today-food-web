"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  UtensilsCrossed, Star, Plus, RefreshCw, ChefHat, MapPin,
  ExternalLink, Check, Copy, LogIn, LogOut, User, Search, Tag,
  Pencil, X, Camera, Image as ImageIcon, ChevronLeft, ChevronRight,
  Compass, Loader2, Trash2, Mail, Lock, Eye, EyeOff, Share2, Download, MessageCircle, Users, Link as LinkIcon, UserMinus, Settings, Flame, Heart, XCircle, Trophy, Activity, Frown, PartyPopper, Sparkles
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
  const defaultTheme = { bgColor: "bg-[#F5F5F4]", textColor: "text-[#57534E]" };
  const theme = catThemes[category] || catThemes["기타"] || defaultTheme;
  return { emoji, bgColor: theme.bgColor, textColor: theme.textColor };
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
  id: string; storeName: string; menu: string; rating: number; comment: string; category: string; imageUrls?: string[]; userId?: string; userPhoto?: string; userName?: string; createdAt?: any;
  placeId?: string; placeUrl?: string; address?: string;
}

// =========================================================================
// 🌟 [중요] 여기에 기획자님의 API 키를 꼭 입력해주세요!
// =========================================================================
const KAKAO_JS_KEY = "6d8e9624fa45bf20fe85ee7dc75aa28d";   // 카톡 공유/초대용 (JavaScript 키)
const KAKAO_REST_KEY = "deb0556cf6ab2cc0e38a558fd65ae01b"; // 식당 검색용 (REST API 키)

// =========================================================================
// 🌟 격리된 순수 컴포넌트들 (타이핑 렉 방지 및 재사용)
// =========================================================================
const PlaceSearchModal = ({ onClose, onSelectTarget, initialQuery = "" }: { onClose: () => void, onSelectTarget: (place: any) => void, initialQuery?: string }) => {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);

  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedQuery(query); }, 500);
    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.trim()) {
      const fetchPlaces = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(debouncedQuery)}&size=15`, {
            headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` }
          });
          const data = await res.json();
          setResults((data.documents || []).filter((p: any) => ['FD6', 'CE7'].includes(p.category_group_code)));
        } catch (e) { }
        setIsLoading(false);
      };
      fetchPlaces();
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  return (
    <div className="fixed inset-0 z-[260] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white w-full max-w-md h-[80vh] sm:h-[600px] sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col animate-in slide-in-from-bottom-10" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-stone-100 flex items-center justify-between shrink-0">
          <h3 className="font-bold text-stone-800 flex items-center gap-2"><Search size={18} className="text-blue-500" /> 맛집 찾기</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 cursor-pointer"><X size={18} /></button>
        </div>
        <div className="p-4 shrink-0 flex gap-2">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="식당 이름을 검색하세요 (예: 마담밍 선릉)" className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none" autoFocus />
          <div className="shrink-0 bg-blue-50 text-blue-500 px-5 rounded-xl font-bold text-sm flex items-center justify-center w-[70px]">
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : "검색"}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
          {results.length === 0 && query.trim() !== "" && !isLoading ? (
            <div className="h-full flex items-center justify-center text-sm text-stone-400 font-bold">검색 결과가 없습니다.</div>
          ) : (
            results.map((p, idx) => (
              <button key={idx} onClick={() => setSelectedPlace(p)} className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer group ${selectedPlace?.id === p.id ? 'border-blue-500 bg-blue-50' : 'border-stone-100 bg-white hover:bg-blue-50 hover:border-blue-200'}`}>
                <div className={`font-bold text-sm ${selectedPlace?.id === p.id ? 'text-blue-600' : 'text-stone-800 group-hover:text-blue-600'}`}>{p.place_name}</div>
                <div className="text-[11px] text-stone-400 mt-1">{p.road_address_name || p.address_name}</div>
              </button>
            ))
          )}
        </div>
        <div className="p-4 border-t border-stone-100 shrink-0">
          <button disabled={!selectedPlace} onClick={() => onSelectTarget(selectedPlace)} className="w-full bg-stone-900 hover:bg-black text-white font-bold py-3.5 rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer">
            선택한 맛집 연동하기
          </button>
        </div>
      </div>
    </div>
  );
};

const CategorySelector = ({ value, onChange, showCustom, onToggleCustom, customValue, onCustomChange, availableCats }: any) => (
  <div>
    <label className="block text-sm font-semibold text-stone-600 mb-2 ml-1 flex items-center gap-1.5"><Tag size={14} />카테고리</label>
    <div className="flex flex-wrap gap-2 mb-2">
      {availableCats.map((cat: string) => (
        <button key={cat} type="button" onClick={() => { onChange(cat); if (showCustom) onToggleCustom(); }} className={`text-xs font-semibold px-3 py-2 rounded-xl transition-all ${!showCustom && value === cat ? "bg-orange-500 text-white shadow-sm" : "bg-stone-100 text-stone-600"}`}>{cat}</button>
      ))}
      <button type="button" onClick={onToggleCustom} className={`text-xs font-semibold px-3 py-2 rounded-xl transition-all flex items-center gap-1 ${showCustom ? "bg-orange-500 text-white shadow-sm" : "bg-stone-100 text-stone-600"}`}><Plus size={12} />직접 입력</button>
    </div>
    {showCustom && <input type="text" value={customValue} onChange={(e) => onCustomChange(e.target.value)} placeholder="새 카테고리 입력" className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 focus:ring-2 focus:ring-orange-500/50 outline-none text-sm" />}
  </div>
);

const MultiImagePicker = ({ existingUrls = [], newPreviews = [], onSelect, onRemoveExisting, onRemoveNew }: any) => {
  const totalCount = existingUrls.length + newPreviews.length;
  const galleryRef = useRef<HTMLInputElement>(null); const cameraRef = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="block text-sm font-semibold text-stone-600 mb-2 ml-1 flex items-center gap-1.5"><Camera size={14} />사진 (최대 5장)</label>
      <input type="file" accept="image/*" multiple ref={galleryRef} className="hidden" onChange={(e) => onSelect(e, totalCount)} />
      <input type="file" accept="image/*" capture="environment" ref={cameraRef} className="hidden" onChange={(e) => onSelect(e, totalCount)} />
      <div className="grid grid-cols-3 gap-2">
        {existingUrls.map((src: string, i: number) => (<div key={`exist-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200"><img src={src} className="w-full h-full object-cover" /><button type="button" onClick={() => onRemoveExisting(i)} className="absolute top-1.5 right-1.5 bg-black/60 text-white p-1 rounded-full"><X size={14} /></button></div>))}
        {newPreviews.map((src: string, i: number) => (<div key={`new-${i}`} className="relative aspect-square rounded-xl overflow-hidden border border-orange-200"><img src={src} className="w-full h-full object-cover" /><button type="button" onClick={() => onRemoveNew(i)} className="absolute top-1.5 right-1.5 bg-black/60 text-white p-1 rounded-full"><X size={14} /></button></div>))}
        {totalCount < 5 && (
          <><button type="button" onClick={() => galleryRef.current?.click()} className="aspect-square border-2 border-dashed border-stone-200 rounded-xl flex flex-col items-center justify-center gap-1 text-stone-400 hover:text-blue-500"><ImageIcon size={20} /><span className="text-[10px] font-bold">앨범</span></button>
            <button type="button" onClick={() => cameraRef.current?.click()} className="aspect-square border-2 border-dashed border-stone-200 rounded-xl flex flex-col items-center justify-center gap-1 text-stone-400 hover:text-orange-500"><Camera size={20} /><span className="text-[10px] font-bold">촬영</span></button></>
        )}
      </div>
    </div>
  );
};
// =========================================================================
// 🌟 메인 앱 컴포넌트 시작
// =========================================================================
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

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileNickname, setProfileNickname] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [partnerCode, setPartnerCode] = useState("");
  const [partnerUids, setPartnerUids] = useState<string[]>([]);
  const [partnersData, setPartnersData] = useState<Record<string, any>>({});
  const [showGroupRecords, setShowGroupRecords] = useState(false);
  const [selectedAuthorFilter, setSelectedAuthorFilter] = useState<string>("all");
  const [isConnecting, setIsConnecting] = useState(false);

  const [pendingImport, setPendingImport] = useState<boolean>(false);
  const [pendingImportTrigger, setPendingImportTrigger] = useState(0);
  const [recommendedMenu, setRecommendedMenu] = useState<string | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [nearbySaved, setNearbySaved] = useState<Review[]>([]);
  const [nearbyExternal, setNearbyExternal] = useState<any[]>([]);
  const [sortOrder, setSortOrder] = useState<"accuracy" | "distance">("accuracy");

  const [reviews, setReviews] = useState<Review[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [knownCategories, setKnownCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  const [storeName, setStoreName] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [placeUrl, setPlaceUrl] = useState("");
  const [address, setAddress] = useState("");
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
  const [editPlaceId, setEditPlaceId] = useState("");
  const [editPlaceUrl, setEditPlaceUrl] = useState("");
  const [editAddress, setEditAddress] = useState("");
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

  const [isPlaceSearchModalOpen, setIsPlaceSearchModalOpen] = useState(false);
  const [placeSearchTarget, setPlaceSearchTarget] = useState<'add' | 'edit'>('add');

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

  const [tinderState, setTinderState] = useState<'idle' | 'setup' | 'share_room' | 'playing' | 'leaderboard' | 'winner_reveal' | 'final_menu'>('idle');
  const [tinderRoomId, setTinderRoomId] = useState<string | null>(null);
  const [tinderMode, setTinderMode] = useState<'menu' | 'restaurant'>('menu');
  const [tinderItems, setTinderItems] = useState<any[]>([]);
  const [currentTinderIndex, setCurrentTinderIndex] = useState(0);
  const [likedTinderItems, setLikedTinderItems] = useState<any[]>([]);

  const [roomData, setRoomData] = useState<any>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [guestId, setGuestId] = useState("");
  const [tinderFinalPick, setTinderFinalPick] = useState<number>(0);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [touchStartX, setTouchStartX] = useState(0);
  const [touchCurrentX, setTouchCurrentX] = useState(0);

  const [isKakaoBrowser, setIsKakaoBrowser] = useState(false);

  const myReviewsCount = reviews.filter((r: Review) => r.userId === user?.uid).length;
  const displayBadge = activeBadge || getCurrentBadge(myReviewsCount);

  const filterOptions = useMemo(() => ["전체", ...knownCategories], [knownCategories]);
  const filteredReviews = useMemo(() => {
    return reviews.filter((r: Review) => {
      if (!showGroupRecords && r.userId !== user?.uid) return false;
      if (showGroupRecords && selectedAuthorFilter !== "all" && r.userId !== selectedAuthorFilter) return false;
      return true;
    });
  }, [reviews, showGroupRecords, selectedAuthorFilter, user]);

  const roomLeaderboard = useMemo(() => {
    if (!roomData || !tinderItems.length) return [];
    const counts: Record<string, number> = {};

    // 무조건 모든 항목에 0표로 기본값 세팅!
    tinderItems.forEach((item: any) => {
      const id = item.type === 'menu' ? item.name : item.data.id;
      counts[id] = 0;
    });

    Object.values(roomData.votes || {}).forEach((likes: any) => {
      likes.forEach((id: string) => {
        if (counts[id] !== undefined) counts[id] += 1;
      });
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, item: tinderItems.find(i => (i.type === 'menu' ? i.name : i.data.id) === name) }))
      .filter(r => r.item !== undefined)
      .sort((a, b) => b.count - a.count);
  }, [roomData, tinderItems]);

  const normalize = (s: string) => s.replace(/[\s()（）]/g, "").toLowerCase();
  const getMenuCategory = (menuName: string): string | null => {
    const norm = normalize(menuName); let bestMatchCat: string | null = null; let maxKwLen = 0;
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const kw of keywords) {
        const nKw = normalize(kw);
        if (norm.includes(nKw) || nKw.includes(norm)) { if (nKw.length > maxKwLen) { maxKwLen = nKw.length; bestMatchCat = cat; } }
      }
    }
    return bestMatchCat;
  };

  const matchedCategory = recommendedMenu ? (getMenuCategory(recommendedMenu) || "기타") : "기타";
  const iconThemeData = getMenuIconDetails(recommendedMenu || "", matchedCategory);
  const safeIconTheme = iconThemeData || { bgColor: "bg-stone-100", textColor: "text-stone-800", emoji: "🍽️" };

  const totalBadgesCount = GENERAL_BADGES.length + Object.values(CATEGORY_BADGES).reduce((acc, curr) => acc + curr.length, 0);
  const collectedGeneralCount = GENERAL_BADGES.filter(b => badgeStats.total >= b.threshold).length;
  const collectedCategoryCount = Object.entries(CATEGORY_BADGES).reduce((acc, [cat, badges]) => {
    const catCount = badgeStats.categories[cat] || 0; return acc + badges.filter(b => catCount >= b.threshold).length;
  }, 0);
  const totalCollectedBadges = collectedGeneralCount + collectedCategoryCount;
  const lockedBadgesCount = totalBadgesCount - totalCollectedBadges;

  const generateRandomString = (length = 6) => Math.random().toString(36).substring(2, 2 + length).toUpperCase();
  const myId = user ? user.uid : guestId;
  const myName = user ? profileNickname : guestId;
  const isHost = roomData?.hostUid === myId;

  // 🌟 (버그 수정 5, 4) 방장이 대기방에서 나갈 땐 폭파, 게스트는 명단 삭제
  const handleCloseTinder = async () => {
    if (tinderState === 'setup') {
      closeTinderFlow();
      return;
    }
    if (tinderState === 'share_room' && !isHost) {
      if (window.confirm("투표 대기방에서 나가시겠습니까?")) {
        if (tinderRoomId) await updateDoc(doc(db, "rooms", tinderRoomId), { participants: arrayRemove(myName) });
        closeTinderFlow();
      }
      return;
    }
    if (window.confirm("투표방을 나가시겠습니까?\n방장이 나갈 경우 투표방이 폭파됩니다.")) {
      if (isHost && tinderRoomId) {
        await updateDoc(doc(db, "rooms", tinderRoomId), { status: 'destroyed' });
      }
      closeTinderFlow();
    }
  };

  const closeTinderFlow = () => {
    setTinderState('idle'); setTinderRoomId(null); setRoomData(null); setHasVoted(false);
    setCurrentTinderIndex(0); setLikedTinderItems([]); setSwipeDirection(null); setTouchCurrentX(0); setTinderFinalPick(0);
    setRecommendedMenu(null); setNearbySaved([]); setNearbyExternal([]); setIsLocating(false);
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  // -------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.includes("kakaotalk")) {
        setIsKakaoBrowser(true);
        window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(window.location.href)}`;
      }
    }
  }, []);

  useEffect(() => {
    const loadKakaoSdk = () => {
      const w = window as any;
      if (w.Kakao && w.Kakao.isInitialized()) return;
      if (!document.getElementById("kakao-sdk")) {
        const script = document.createElement("script");
        script.id = "kakao-sdk";
        script.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
        script.async = true;
        script.onload = () => {
          if (w.Kakao && !w.Kakao.isInitialized()) {
            try { w.Kakao.init(KAKAO_JS_KEY); } catch (e) { }
          }
        };
        document.head.appendChild(script);
      }
    };
    loadKakaoSdk();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let gId = localStorage.getItem("tf_guest_id");
      if (!gId) { gId = `익명_${Math.floor(Math.random() * 10000)}`; localStorage.setItem("tf_guest_id", gId); }
      setGuestId(gId);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u); setAuthLoading(false);
      if (u) { setIsAuthModalOpen(false); setAuthMode("login"); setAuthEmail(""); setAuthPassword(""); }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || authLoading || !myName) return;
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");
    const uidParam = params.get("uid");
    const ridParam = params.get("rid");

    if (roomParam) {
      joinRoom(roomParam);
    } else if (uidParam && ridParam) {
      const fetchSharedReview = async () => {
        try {
          const snap = await getDoc(doc(db, "users", uidParam, "reviews", ridParam));
          if (snap.exists()) {
            sessionStorage.setItem('pendingImport', JSON.stringify(snap.data()));
            setPendingImportTrigger(p => p + 1);
          } else { alert("존재하지 않거나 삭제된 링크입니다."); }
        } catch (error) { } finally {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      };
      fetchSharedReview();
    }
  }, [authLoading, myName]);

  useEffect(() => {
    const checkAndImport = async () => {
      const stored = sessionStorage.getItem('pendingImport');
      if (stored && !authLoading) {
        if (user) {
          const data = JSON.parse(stored);
          sessionStorage.removeItem('pendingImport');

          if (data.placeId) {
            const qSnap = await getDocs(query(collection(db, "users", user.uid, "reviews"), where("placeId", "==", data.placeId), limit(1)));
            if (!qSnap.empty) {
              alert("이미 내 맛집 리스트에 저장된 곳입니다!");
              const existingDoc = qSnap.docs[0];
              setShareReview({ id: existingDoc.id, ...existingDoc.data() } as Review);
              return;
            }
          }

          resetForm();
          setStoreName(data.storeName || ""); setMenu(data.menu || "");
          setCategory(knownCategories.includes(data.category) ? data.category : "기타");
          if (!knownCategories.includes(data.category)) { setCustomCategory(data.category); setShowCustomCategory(true); }
          setRating(Number(data.rating) || 5); setComment(data.comment || ""); setImportedUrls(data.imageUrls || []);
          setPlaceId(data.placeId || ""); setPlaceUrl(data.placeUrl || ""); setAddress(data.address || "");
          setPendingImport(true);
          setIsScrapModalOpen(true);
        } else {
          setAuthMode("signup");
          setIsAuthModalOpen(true);
        }
      }
    };
    checkAndImport();
  }, [user, authLoading, pendingImportTrigger, knownCategories]);

  // 🌟 (버그 수정 1) 방 입장 시 0.8초간 닉네임 로딩을 기다리고 모든 유령 ID를 삭제합니다!
  const joinRoom = async (roomId: string) => {
    try {
      const roomRef = doc(db, "rooms", roomId);
      const roomDoc = await getDoc(roomRef);
      if (roomDoc.exists()) {
        const rData = roomDoc.data();
        if (rData.status !== 'closed' && rData.status !== 'reveal' && rData.status !== 'destroyed') {
          setTimeout(async () => {
            const freshDoc = await getDoc(roomRef);
            if (freshDoc.exists()) {
              let currentParticipants = freshDoc.data().participants || [];
              if (user) {
                // 로그인 유저라면 모든 유령(익명_) 데이터 삭제
                currentParticipants = currentParticipants.filter((p: string) => !p.startsWith("익명_"));
              }
              if (!currentParticipants.includes(myName)) {
                currentParticipants.push(myName);
              }
              await updateDoc(roomRef, { participants: currentParticipants }).catch(e => { });
            }
          }, 800);
        }
        setTinderRoomId(roomId); setTinderMode(rData.mode); setTinderItems(rData.items || []);
        setCurrentTinderIndex(0); setLikedTinderItems([]); setTinderFinalPick(0);
        const myVotes = rData.votes?.[myId];
        setHasVoted(!!myVotes);
      } else {
        alert("존재하지 않거나 삭제된 투표방입니다.");
        closeTinderFlow();
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (!tinderRoomId) return;
    const unsub = onSnapshot(doc(db, "rooms", tinderRoomId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        if (data.status === 'destroyed') {
          if (data.hostUid !== myId) alert("방장이 투표방을 종료했습니다.");
          closeTinderFlow(); return;
        }

        setRoomData(data);
        if (data.items) setTinderItems(data.items);

        const myVotesInDb = data.votes?.[myId];
        if (!myVotesInDb && hasVoted) {
          setHasVoted(false); setCurrentTinderIndex(0); setLikedTinderItems([]); setTinderFinalPick(0);
        }

        setTinderState((prevState) => {
          if (data.status === 'waiting') return 'share_room';
          if (data.status === 'playing' && prevState !== 'leaderboard' && prevState !== 'winner_reveal' && prevState !== 'final_menu') return myVotesInDb ? 'leaderboard' : 'playing';
          if (data.status === 'closed' && prevState !== 'winner_reveal' && prevState !== 'final_menu') return 'leaderboard';
          if (data.status === 'reveal' && prevState === 'leaderboard') return 'winner_reveal';
          if (data.status === 'final_menu' && prevState === 'winner_reveal') return 'final_menu';
          return prevState;
        });
      }
    });
    return () => unsub();
  }, [tinderRoomId, hasVoted, myId]);

  useEffect(() => {
    if (!user) { setActiveBadge(null); setPartnerUids([]); setProfileNickname(""); setProfilePhotoUrl(""); return; }
    const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.selectedBadge) setActiveBadge(data.selectedBadge);
        if (data.partnerUids) setPartnerUids(data.partnerUids);
        if (data.nickname === undefined) setDoc(doc(db, "users", user.uid), { nickname: user.displayName || "나", photoUrl: user.photoURL || "" }, { merge: true });
        setProfileNickname(data.nickname || user.displayName || "나");
        setProfilePhotoUrl(data.photoUrl || user.photoURL || "");
      } else {
        setDoc(doc(db, "users", user.uid), { nickname: user.displayName || "나", photoUrl: user.photoURL || "", partnerUids: [] }, { merge: true });
      }
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (partnerUids.length === 0) { setPartnersData({}); return; }
    const unsubs = partnerUids.map(uid => onSnapshot(doc(db, "users", uid), (snap) => {
      if (snap.exists()) setPartnersData(prev => ({ ...prev, [uid]: { ...snap.data(), uid } }));
    }));
    return () => unsubs.forEach(unsub => unsub());
  }, [partnerUids]);

  useEffect(() => {
    if (!user) { setReviews([]); setTotalCount(0); return; }
    const targetUids = showGroupRecords ? [user.uid, ...partnerUids] : [user.uid];
    const unsubs: any[] = [];
    const allFetchedReviews: Review[] = [];

    targetUids.forEach(uid => {
      let q = query(collection(db, "users", uid, "reviews"), orderBy("createdAt", "desc"), limit(30));
      if (filterCategory !== "전체") q = query(collection(db, "users", uid, "reviews"), where("category", "==", filterCategory), orderBy("createdAt", "desc"), limit(30));

      const unsub = onSnapshot(q, (snap) => {
        let uPhoto = ""; let uName = "친구";
        if (uid === user.uid) { uPhoto = profilePhotoUrl; uName = profileNickname; }
        else if (partnersData[uid]) { uPhoto = partnersData[uid].photoUrl || ""; uName = partnersData[uid].nickname || "친구"; }

        const userReviews = snap.docs.map(d => ({ id: d.id, ...d.data() as any, userId: uid, userPhoto: uPhoto, userName: uName }));
        const otherUsersReviews = allFetchedReviews.filter((r: Review) => r.userId !== uid);
        allFetchedReviews.length = 0;
        allFetchedReviews.push(...otherUsersReviews, ...userReviews);
        allFetchedReviews.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        setReviews([...allFetchedReviews]);
        setTotalCount(allFetchedReviews.length);
        setKnownCategories(prev => {
          const newCats = allFetchedReviews.map((r: Review) => r.category).filter((c: string) => !prev.includes(c));
          return newCats.length > 0 ? [...prev, ...newCats] : prev;
        });
      });
      unsubs.push(unsub);
    });
    return () => unsubs.forEach(fn => fn());
  }, [user, showGroupRecords, partnerUids, filterCategory, profileNickname, profilePhotoUrl, partnersData]);

  // -------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user) return; setIsSavingProfile(true);
    try {
      let finalPhotoUrl = profilePhotoUrl;
      if (profileImageFile) {
        const storageRef = ref(storage, `users/${user.uid}/profile_${Date.now()}`); await uploadBytes(storageRef, profileImageFile); finalPhotoUrl = await getDownloadURL(storageRef);
      }
      await setDoc(doc(db, "users", user.uid), { nickname: profileNickname, photoUrl: finalPhotoUrl }, { merge: true });
      setIsProfileModalOpen(false); setProfileImageFile(null);
    } catch (e) { alert("프로필 저장 실패"); } setIsSavingProfile(false);
  };

  const handleProfileImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]; setProfileImageFile(file);
      const reader = new FileReader(); reader.onloadend = () => setProfilePhotoUrl(reader.result as string); reader.readAsDataURL(file);
    }
  };

  const handleConnectPartner = async () => {
    if (!user || !partnerCode || partnerCode.trim().length < 5) return;
    if (partnerCode.trim() === user.uid) { alert("자신의 코드는 입력할 수 없습니다."); return; }
    if (partnerUids.includes(partnerCode.trim())) { alert("이미 연결된 친구입니다."); return; }
    setIsConnecting(true);
    try {
      const partnerDoc = await getDoc(doc(db, "users", partnerCode.trim()));
      if (!partnerDoc.exists()) { alert("유효하지 않은 연결 코드입니다."); setIsConnecting(false); return; }
      await setDoc(doc(db, "users", user.uid), { partnerUids: arrayUnion(partnerCode.trim()) }, { merge: true });
      await setDoc(doc(db, "users", partnerCode.trim()), { partnerUids: arrayUnion(user.uid) }, { merge: true });
      alert("축하합니다! 친구와 지도가 성공적으로 연결되었습니다. 🎉");
      setPartnerCode(""); setShowGroupRecords(true);
    } catch (e) { alert("연결 중 오류 발생"); } setIsConnecting(false);
  };

  const handleDisconnect = async (partnerUid: string, partnerName: string) => {
    if (!user || !window.confirm(`${partnerName}님과의 공유를 끊으시겠습니까?`)) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { partnerUids: arrayRemove(partnerUid) });
      await updateDoc(doc(db, "users", partnerUid), { partnerUids: arrayRemove(user.uid) });
      if (selectedAuthorFilter === partnerUid) setSelectedAuthorFilter("all");
    } catch (e) { alert("연결 해제 오류"); }
  };

  const openBadgeModal = async () => {
    setIsBadgeModalOpen(true); setBadgeTab("general");
    if (!user) return; setIsLoadingBadges(true);
    try {
      const snap = await getDocs(collection(db, "users", user.uid, "reviews"));
      const counts: Record<string, number> = {};
      snap.forEach(doc => { const cat = doc.data().category || "기타"; counts[cat] = (counts[cat] || 0) + 1; });
      setBadgeStats({ total: snap.size, categories: counts });
    } catch (e) { } setIsLoadingBadges(false);
  };

  const handleSelectBadge = async (badge: any, type: 'general' | 'category') => {
    if (!user) return;
    await setDoc(doc(db, "users", user.uid), { selectedBadge: { icon: badge.icon, title: badge.title, color: badge.color || "text-stone-800", bg: badge.bg || (type === 'category' ? "bg-white border-stone-200" : "bg-stone-100 border-stone-200") } }, { merge: true });
  };

  const searchLocationBasedPlaces = async (menu: string, lat: number, lng: number, sort: string) => {
    setIsLocating(true);
    try {
      const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(menu)}&y=${lat}&x=${lng}&radius=3000&size=15&sort=${sort}`, {
        headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` }
      });
      const data = await res.json();
      const places = (data.documents || []).filter((p: any) => ['FD6', 'CE7'].includes(p.category_group_code));
      const saved: Review[] = []; const external: any[] = [];

      places.forEach((p: any) => {
        const matched = reviews.find((r: Review) => {
          if (r.placeId) return r.placeId === p.id;
          return normalize(r.storeName).includes(normalize(p.place_name)) || normalize(p.place_name).includes(normalize(r.storeName));
        });

        if (matched) {
          if (!saved.some((s: Review) => s.id === matched.id)) saved.push(matched);
        } else {
          if (external.length < 5) external.push(p);
        }
      });
      setNearbySaved(saved); setNearbyExternal(external);
    } catch (e) { setLocationError("주변 검색 실패"); }
    setIsLocating(false);
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
    setIsSpinning(true); let count = 0;
    const interval = setInterval(() => {
      setRecommendedMenu(BASE_MENUS[Math.floor(Math.random() * BASE_MENUS.length)]); count++;
      if (count > 10) {
        clearInterval(interval);
        const final = BASE_MENUS[Math.floor(Math.random() * BASE_MENUS.length)];
        setRecommendedMenu(final); setIsSpinning(false); searchLocationBasedPlaces(final, lat, lng, sortOrder);
      }
    }, 50);
  };

  const handleSortChange = (newSort: "accuracy" | "distance") => {
    if (sortOrder === newSort || !recommendedMenu || !userLocation) return;
    setSortOrder(newSort); searchLocationBasedPlaces(recommendedMenu, userLocation.lat, userLocation.lng, newSort);
  };

  const resetForm = () => {
    setStoreName(""); setPlaceId(""); setPlaceUrl(""); setAddress("");
    setMenu(""); setRating(5); setComment(""); setCategory("한식");
    setCustomCategory(""); setShowCustomCategory(false); setImageFiles([]); setImagePreviews([]); setImportedUrls([]);
    setPendingImport(false);
  };

  const handleScrapPlace = (place: any) => {
    if (!user) { setAuthMode("signup"); setIsAuthModalOpen(true); return; }
    resetForm(); setStoreName(place.place_name); setMenu(recommendedMenu || "");
    setPlaceId(place.id); setPlaceUrl(place.place_url); setAddress(place.road_address_name || place.address_name);
    const cat = matchedCategory || "기타";
    if (knownCategories.includes(cat)) { setCategory(cat); setShowCustomCategory(false); }
    else { setCategory("기타"); setCustomCategory(cat); setShowCustomCategory(true); }
    setIsScrapModalOpen(true);
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault(); if (!storeName || !menu || !comment || !user) return; setIsSubmitting(true);
    const finalCategory = showCustomCategory && customCategory.trim() ? customCategory.trim() : category;
    try {
      const urls = [];
      for (const file of imageFiles) {
        const storageRef = ref(storage, `users/${user.uid}/reviews/${Date.now()}_${file.name}`); await uploadBytes(storageRef, file); urls.push(await getDownloadURL(storageRef));
      }
      const finalUrls = [...importedUrls, ...urls].slice(0, 5);
      await addDoc(collection(db, "users", user.uid, "reviews"), { storeName, menu, rating, comment, category: finalCategory, imageUrls: finalUrls, placeId, placeUrl, address, createdAt: serverTimestamp() });
      resetForm(); setIsScrapModalOpen(false);
    } catch (e) { } setIsSubmitting(false);
  };

  const openEditModal = (review: Review) => {
    setEditingReview(review); setEditStoreName(review.storeName); setEditMenu(review.menu); setEditRating(review.rating);
    setEditComment(review.comment); setEditCategory(review.category); setEditCustomCategory(""); setEditShowCustomCategory(false);
    setEditExistingUrls(review.imageUrls || []); setEditImageFiles([]); setEditImagePreviews([]);
    setEditPlaceId(review.placeId || ""); setEditPlaceUrl(review.placeUrl || ""); setEditAddress(review.address || "");
  };

  const handleUpdateReview = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingReview || !user) return; setIsUpdating(true);
    const finalCat = editShowCustomCategory && editCustomCategory.trim() ? editCustomCategory.trim() : editCategory;
    try {
      let finalUrls = [...editExistingUrls];
      for (const file of editImageFiles) {
        const sRef = ref(storage, `users/${user.uid}/reviews/${Date.now()}_${file.name}`); await uploadBytes(sRef, file); finalUrls.push(await getDownloadURL(sRef));
      }
      await updateDoc(doc(db, "users", user.uid, "reviews", editingReview.id), { storeName: editStoreName, menu: editMenu, rating: editRating, comment: editComment, category: finalCat, imageUrls: finalUrls.slice(0, 5), placeId: editPlaceId, placeUrl: editPlaceUrl, address: editAddress });
      setEditingReview(null);
    } catch (e) { } setIsUpdating(false);
  };

  const handleDeleteReview = async (id: string) => {
    if (!user || !window.confirm("삭제할까요?")) return;
    await deleteDoc(doc(db, "users", user.uid, "reviews", id));
  };

  const handleImagesSelect = (e: React.ChangeEvent<HTMLInputElement>, currentTotal: number, setFiles: React.Dispatch<React.SetStateAction<File[]>>, setPreviews: React.Dispatch<React.SetStateAction<string[]>>) => {
    const files = e.target.files; if (!files || files.length === 0) return;
    const allowedCount = 5 - currentTotal; if (allowedCount <= 0) return;
    const newFilesArray = Array.from(files).slice(0, allowedCount);
    setFiles((prev) => [...prev, ...newFilesArray]);
    Promise.all(newFilesArray.map((file) => new Promise<string>((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(file); })))
      .then((results) => { setPreviews((prev) => [...prev, ...results]); e.target.value = ""; });
  };

  const executeKakaoShare = (shareLogic: (kakao: any) => void) => {
    const w = window as any;
    if (!w.Kakao) {
      alert("카카오톡 공유 모듈이 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.\n(광고 차단 프로그램이 켜져 있다면 꺼주세요)");
      return;
    }
    if (!w.Kakao.isInitialized()) {
      try {
        w.Kakao.init(KAKAO_JS_KEY);
      } catch (error) {
        alert("카카오톡 연동 에러가 발생했습니다. 카카오 개발자 센터의 도메인 설정이나 키 값을 확인해주세요.");
        return;
      }
    }
    shareLogic(w.Kakao);
  };

  const handleLobbyKakaoShare = () => {
    if (!tinderRoomId) return;
    executeKakaoShare((kakao) => {
      const url = `${window.location.origin}/?room=${tinderRoomId}`;
      kakao.Share.sendDefault({
        objectType: 'feed',
        content: { title: `🔥 맛집 투표방이 열렸습니다!`, description: `친구들과 다같이 카드를 스와이프하고\n오늘 뭐 먹을지 투표로 결정하세요!`, imageUrl: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1', link: { mobileWebUrl: url, webUrl: url } },
        buttons: [{ title: '투표 참여하기', link: { mobileWebUrl: url, webUrl: url } }],
      });
    });
  };

  // 🌟 (버그 수정 4, 6) 외부 맛집 다이렉트 맵 링크 변환 및 공유 성공 시 자동 방폭파 취소
  const handleFinalResultKakaoShare = async (place: any, isSavedPlace: boolean) => {
    executeKakaoShare(async (kakao) => {
      const linkUrl = isSavedPlace ? `${window.location.origin}/?uid=${place.userId || user?.uid}&rid=${place.id}` : `https://map.kakao.com/link/search/${encodeURIComponent(place.place_name)}`;
      const storeName = isSavedPlace ? place.storeName : place.place_name;

      kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: `🎉 오늘의 맛집으로 결정!`,
          description: `방장이 [${storeName}] (으)로 최종 결정했습니다!`,
          imageUrl: isSavedPlace && place.imageUrls?.[0] ? place.imageUrls[0] : 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1',
          link: { mobileWebUrl: linkUrl, webUrl: linkUrl }
        },
        buttons: [{ title: isSavedPlace ? '영수증 확인하기' : '카카오맵에서 보기', link: { mobileWebUrl: linkUrl, webUrl: linkUrl } }],
      });
    });
  };

  const handleTrackBShare = async () => {
    if (!roomData?.finalWinner) return;
    const winnerData = roomData.finalWinner.data;
    executeKakaoShare(async (kakao) => {
      const url = `${window.location.origin}/?uid=${winnerData.userId || user?.uid}&rid=${winnerData.id}`;
      kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: `🏆 오늘 우리의 최종 선택!`,
          description: `1위로 선정된 [${winnerData.storeName}]\n지금 바로 확인해보세요!`,
          imageUrl: winnerData.imageUrls?.[0] || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1',
          link: { mobileWebUrl: url, webUrl: url }
        },
        buttons: [{ title: '맛집 정보 보기', link: { mobileWebUrl: url, webUrl: url } }],
      });
    });
  };

  const handleKakaoShare = () => {
    if (!shareReview || !user) return;
    executeKakaoShare((kakao) => {
      const url = `${window.location.origin}/?uid=${shareReview.userId || user.uid}&rid=${shareReview.id}`;
      kakao.Share.sendDefault({
        objectType: 'feed',
        content: { title: `🍽️ [오늘 뭐 먹지?] ${shareReview.storeName}`, description: `⭐ 별점: ${shareReview.rating}.0\n💬 "${shareReview.comment}"`, imageUrl: shareReview.imageUrls?.[receiptImageIndex] || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1', link: { mobileWebUrl: url, webUrl: url } },
        buttons: [{ title: '맛집 저장하기', link: { mobileWebUrl: url, webUrl: url } }],
      });
    });
  };

  const handleDownloadReceipt = async () => {
    if (!receiptRef.current || !shareReview) return; setIsGeneratingImage(true);
    try {
      const url = await toPng(receiptRef.current, { cacheBust: true, backgroundColor: '#ffffff', pixelRatio: 2, fontEmbedCSS: '' });
      const link = document.createElement("a"); link.href = url; link.download = `today_food_${shareReview.storeName}.png`; link.click();
    } catch (e) { alert("저장 실패"); }
    setIsGeneratingImage(false);
  };

  const handleCopyLink = async () => {
    if (!user || !shareReview) return;
    const url = `${window.location.origin}/?uid=${shareReview.userId || user.uid}&rid=${shareReview.id}`;
    await navigator.clipboard.writeText(url); alert("링크 복사 완료!");
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
    try { auth.languageCode = "ko"; await sendPasswordResetEmail(auth, authEmail); setResetMessage("메일 전송 완료!"); } catch (error: any) { setAuthError("메일 발송 오류"); }
  };

  const handleGoogleLogin = async () => { try { await signInWithPopup(auth, googleProvider); } catch (e) { } };
  const handleLogout = async () => { await signOut(auth); };

  const handleRestartVote = async () => {
    if (!tinderRoomId || !isHost) return;
    let generatedItems: any[] = [];
    if (tinderMode === 'menu') {
      const shuffled = [...BASE_MENUS].sort(() => 0.5 - Math.random()).slice(0, 10);
      generatedItems = shuffled.map(m => ({ type: 'menu', name: m, category: getMenuCategory(m) || "기타", theme: getMenuIconDetails(m, getMenuCategory(m) || "기타") }));
    } else {
      const shuffled = [...filteredReviews].sort(() => 0.5 - Math.random()).slice(0, 10);
      generatedItems = shuffled.map(r => ({ type: 'restaurant', data: r }));
    }
    try {
      await updateDoc(doc(db, "rooms", tinderRoomId), {
        items: generatedItems, status: 'waiting', votes: {}, completedUsers: [], finalWinner: null
      });
      setCurrentTinderIndex(0); setLikedTinderItems([]); setHasVoted(false); setTinderFinalPick(0);
    } catch (e) { alert("재투표 생성에 실패했습니다."); }
  };

  const handleCreateRoom = async (mode: 'menu' | 'restaurant') => {
    setTinderMode(mode);
    const newRoomId = generateRandomString();
    let generatedItems: any[] = [];
    if (mode === 'menu') {
      const shuffled = [...BASE_MENUS].sort(() => 0.5 - Math.random()).slice(0, 10);
      generatedItems = shuffled.map(m => ({ type: 'menu', name: m, category: getMenuCategory(m) || "기타", theme: getMenuIconDetails(m, getMenuCategory(m) || "기타") }));
    } else {
      const shuffled = [...filteredReviews].sort(() => 0.5 - Math.random()).slice(0, 10);
      generatedItems = shuffled.map(r => ({ type: 'restaurant', data: r }));
    }
    try {
      setCurrentTinderIndex(0); setLikedTinderItems([]); setHasVoted(false); setTinderFinalPick(0);
      let hostLat = userLocation?.lat || 37.498095;
      let hostLng = userLocation?.lng || 127.027610;
      if (!userLocation && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => { hostLat = pos.coords.latitude; hostLng = pos.coords.longitude; setUserLocation({ lat: hostLat, lng: hostLng }); });
      }
      await setDoc(doc(db, "rooms", newRoomId), {
        mode, items: generatedItems, createdAt: serverTimestamp(), hostUid: myId, status: 'waiting', participants: [myName], completedUsers: [], votes: {}, finalWinner: null, location: { lat: hostLat, lng: hostLng }
      });
      setTinderItems(generatedItems); setTinderRoomId(newRoomId); setTinderState('share_room');
    } catch (e) { alert("방 생성 실패. 파이어베이스 보안 규칙을 다시 확인해주세요!"); }
  };

  const submitVotes = async (finalLikes: any[]) => {
    if (!tinderRoomId) return;
    try {
      const likeIds = finalLikes.map((item: any) => item.type === 'menu' ? item.name : item.data.id);
      await updateDoc(doc(db, "rooms", tinderRoomId), {
        [`votes.${myId}`]: likeIds,
        completedUsers: arrayUnion(myName)
      });
      setHasVoted(true);
    } catch (e) { }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (swipeDirection !== null) return; setSwipeDirection(direction);
    setTimeout(() => {
      let updatedLikes = [...likedTinderItems];
      if (direction === 'right') { updatedLikes.push(tinderItems[currentTinderIndex]); setLikedTinderItems(updatedLikes); }
      if (currentTinderIndex + 1 < tinderItems.length) { setCurrentTinderIndex(prev => prev + 1); setSwipeDirection(null); setTouchCurrentX(0); setTouchStartX(0); }
      else { submitVotes(updatedLikes); setTinderState('leaderboard'); setSwipeDirection(null); setTouchCurrentX(0); setTouchStartX(0); }
    }, 300);
  };

  const onTouchStart = (e: React.TouchEvent) => setTouchStartX(e.targetTouches[0].clientX);
  const onTouchMove = (e: React.TouchEvent) => setTouchCurrentX(e.targetTouches[0].clientX - touchStartX);
  const onTouchEnd = () => {
    if (touchCurrentX > 100) handleSwipe('right');
    else if (touchCurrentX < -100) handleSwipe('left');
    setTouchCurrentX(0);
  };

  const searchLocationAndSync = async (menuName: string) => {
    setIsLocating(true);
    setTinderState('final_menu');
    try {
      const searchLat = roomData?.location?.lat || userLocation?.lat || 37.498095;
      const searchLng = roomData?.location?.lng || userLocation?.lng || 127.027610;

      const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(menuName)}&y=${searchLat}&x=${searchLng}&radius=3000&size=15&sort=${sortOrder}`, {
        headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` }
      });
      const data = await res.json();
      const places = (data.documents || []).filter((p: any) => ['FD6', 'CE7'].includes(p.category_group_code));
      const saved: Review[] = []; const external: any[] = [];

      places.forEach((p: any) => {
        const matched = reviews.find((r: Review) => {
          if (r.placeId) return r.placeId === p.id;
          return normalize(r.storeName).includes(normalize(p.place_name)) || normalize(p.place_name).includes(normalize(r.storeName));
        });
        if (matched) { if (!saved.some((s: Review) => s.id === matched.id)) saved.push(matched); }
        else { if (external.length < 5) external.push(p); }
      });

      await updateDoc(doc(db, "rooms", tinderRoomId!), {
        status: 'final_menu',
        nearbySaved: saved,
        nearbyExternal: external,
        recommendedMenu: menuName
      });
    } catch (e) { alert("검색 동기화 실패"); }
    setIsLocating(false);
  };

  // -------------------------------------------------------------
  // Render
  // -------------------------------------------------------------

  if (isKakaoBrowser) {
    return (
      <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center text-white p-6 z-[9999] fixed inset-0">
        <span className="text-5xl mb-4">🚀</span>
        <p className="font-bold text-xl mb-3">기본 브라우저로 이동 중입니다!</p>
        <div className="bg-stone-800 p-5 rounded-2xl border border-stone-700 text-center">
          <p className="text-sm text-stone-300 break-keep leading-relaxed">
            안전한 환경을 위해 기본 브라우저로 연결합니다.<br />
            화면이 자동으로 넘어가지 않는다면 우측 하단의<br />
            <span className="text-orange-500 font-bold px-1">⋮ 버튼</span>을 눌러 <span className="text-orange-500 font-bold px-1">'다른 브라우저로 열기'</span>를 선택해주세요.
          </p>
        </div>
      </div>
    );
  }

  // 🌟 (개선 7) 가게명이 너무 길어도 UI가 깨지지 않고 말줄임표 처리되도록 Flexbox 구조 완벽 수정
  const renderReviewList = () => {
    if (filteredReviews.length === 0) {
      return <div className="py-12 text-center bg-white rounded-3xl border border-stone-100"><p className="text-stone-500 font-bold mb-1">저장된 맛집이 없어요 🥲</p></div>;
    }
    return (
      <div className="grid gap-6">
        {filteredReviews.map((review: Review) => (
          <div key={review.id} className="bg-white rounded-3xl overflow-hidden border border-stone-100 shadow-sm hover:shadow-md transition-shadow relative">
            {showGroupRecords && (
              <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-sm p-1.5 rounded-full shadow-md border border-white/50 flex items-center gap-2 pr-3">
                {review.userPhoto ? <img src={review.userPhoto} className="w-5 h-5 rounded-full object-cover" /> : <div className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center text-[10px]"><User size={10} /></div>}
                <span className="text-[10px] font-black text-stone-700">{review.userName}</span>
              </div>
            )}
            {review.imageUrls && review.imageUrls.length > 0 && (
              <div className="flex overflow-x-auto scrollbar-hide snap-x bg-stone-100 h-48">
                {review.imageUrls.map((url: string, idx: number) => <img key={idx} src={url} onClick={() => setFullScreenData({ urls: review.imageUrls!, currentIndex: idx })} className="h-full w-full object-cover snap-center min-w-full cursor-zoom-in" />)}
              </div>
            )}
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <h3 className="font-bold text-lg text-stone-800 truncate leading-tight">{review.storeName}</h3>
                    {review.placeUrl && <a href={review.placeUrl} target="_blank" className="text-blue-500 hover:text-blue-600 shrink-0"><LinkIcon size={14} /></a>}
                  </div>
                  <p className="text-orange-500 text-sm font-semibold truncate">{review.menu} | {review.category}</p>
                </div>
                <div className="flex gap-1 shrink-0 items-center">
                  <button onClick={() => { setShareReview(review); setReceiptImageIndex(0); }} className="p-2 bg-stone-50 rounded-lg text-stone-400 hover:text-blue-500 cursor-pointer"><Share2 size={14} /></button>
                  {review.userId === user?.uid && (
                    <>
                      <button onClick={() => openEditModal(review)} className="p-2 bg-stone-50 rounded-lg text-stone-400 hover:text-orange-500 cursor-pointer"><Pencil size={14} /></button>
                      <button onClick={() => handleDeleteReview(review.id)} className="p-2 bg-stone-50 rounded-lg text-stone-400 hover:text-red-500 cursor-pointer"><Trash2 size={14} /></button>
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
    );
  };

  return (
    <main className="min-h-screen bg-[#FFFDF6] text-stone-800 font-sans pb-20 relative">
      <header className="fixed top-0 left-0 right-0 bg-white z-[100] border-b border-orange-100 shadow-md">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-xl text-orange-500 shadow-sm"><ChefHat size={24} /></div>
            <h1 className="text-xl font-bold text-stone-800 tracking-tight">오늘 뭐 먹지?</h1>
          </div>
          {!authLoading && (
            <div className="shrink-0 pl-2">
              {user ? (
                <div className="flex items-center gap-2.5">
                  <button onClick={() => setIsSyncModalOpen(true)} className={`p-2 rounded-full transition-colors ${partnerUids.length > 0 ? 'bg-blue-50 text-blue-500 hover:bg-blue-100' : 'bg-stone-50 text-stone-400 hover:bg-stone-100'} cursor-pointer`}><Users size={18} /></button>
                  <button onClick={() => setIsProfileModalOpen(true)} className="flex items-center gap-1.5 bg-stone-50 hover:bg-stone-100 pl-1.5 pr-3 py-1.5 rounded-full transition-colors cursor-pointer">
                    {profilePhotoUrl ? <img src={profilePhotoUrl} className="w-6 h-6 rounded-full object-cover border border-stone-200" /> : <div className="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center text-stone-500"><User size={12} /></div>}
                    <span className="text-[11px] font-bold text-stone-600 truncate max-w-[60px]">{profileNickname}</span>
                  </button>
                </div>
              ) : (
                <button onClick={() => { setAuthMode("login"); setIsAuthModalOpen(true); }} className="text-sm font-bold bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl shadow-md cursor-pointer transition-colors">로그인</button>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="max-w-md mx-auto px-6 pt-24 pb-20 space-y-8 relative z-10">

        {user && !authLoading && (
          <div onClick={openBadgeModal} className="bg-white rounded-3xl p-5 shadow-sm border border-orange-100 flex items-center justify-between cursor-pointer relative z-20">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner ${displayBadge.bg}`}>{displayBadge.icon}</div>
              <div><p className="text-[11px] font-bold text-stone-400 mb-1">나의 대표 뱃지 👆</p><p className={`text-lg font-black ${displayBadge.color}`}>{displayBadge.title}</p></div>
            </div>
            <ChevronRight className="text-stone-400" size={20} />
          </div>
        )}

        <section onClick={() => setTinderState('setup')} className="relative overflow-hidden bg-gradient-to-r from-rose-500 to-orange-500 rounded-3xl p-6 shadow-lg cursor-pointer transform hover:scale-[1.02] transition-transform active:scale-95 group z-20">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 text-white opacity-20 transform rotate-12 group-hover:scale-110 transition-transform duration-500"><Flame size={120} /></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="text-left text-white space-y-1">
              <span className="bg-white/20 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">Multiplayer</span>
              <h2 className="text-2xl font-black tracking-tight leading-tight mt-2">단톡방 메뉴<br />투표 열기</h2>
              <p className="text-xs font-medium text-white/80 mt-1">친구들과 다같이 스와이프 하세요!</p>
            </div>
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-inner text-orange-500"><ChevronRight size={24} className="ml-0.5" /></div>
          </div>
        </section>

        <section className="bg-white rounded-3xl p-8 shadow-sm border border-orange-50 text-center flex flex-col items-center">
          <h2 className="text-stone-500 font-medium mb-6">결정이 어려울 땐 운명에 맡겨보세요</h2>
          {recommendedMenu && (
            <div className="relative w-44 h-44 rounded-[2rem] bg-white flex flex-col items-center justify-center shadow-md border border-stone-100 mb-6">
              <div className={`absolute top-4 ${safeIconTheme.bgColor} ${safeIconTheme.textColor} text-[10px] font-extrabold px-3 py-1 rounded-full`}>{matchedCategory}</div>
              <span className="text-[64px] mt-4">{safeIconTheme.emoji}</span>
            </div>
          )}
          <span className={`text-4xl font-black text-orange-500 mb-8 ${isSpinning ? 'animate-pulse' : ''}`}>{recommendedMenu || "메뉴를 골라볼까요?"}</span>
          <button onClick={handleRecommend} disabled={isSpinning || isLocating} className="w-full bg-orange-500 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 cursor-pointer">
            <RefreshCw size={20} className={isSpinning || isLocating ? "animate-spin" : ""} /> {isLocating ? "위치 파악 중..." : "추천받기"}
          </button>

          {(!isLocating && recommendedMenu && !isSpinning) && (
            <div className="mt-8 pt-6 w-full border-t border-orange-50 space-y-4">
              {locationError ? <p className="text-xs text-red-500 font-bold">{locationError}</p> : (
                <>
                  {nearbySaved.length > 0 && (
                    <div className="text-left">
                      <p className="text-sm font-bold text-stone-600 mb-3 flex items-center gap-1.5"><MapPin size={16} className="text-orange-500" />내 주변 단골 맛집</p>
                      {nearbySaved.map((r: Review) => (
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
                        {nearbyExternal.map((p: any, i: number) => {
                          const isAlreadySaved = reviews.some(r => r.placeId === p.id || (r.storeName && normalize(r.storeName).includes(normalize(p.place_name))));
                          return (
                            <div key={i} className="flex items-center justify-between bg-white border border-stone-100 rounded-xl px-4 py-3 shadow-sm group">
                              <a href={p.place_url} target="_blank" className="flex flex-col min-w-0 flex-1 cursor-pointer pr-2">
                                <span className="font-bold text-stone-700 text-sm truncate group-hover:text-stone-900 transition-colors">{p.place_name}</span>
                                <span className="text-[10px] text-stone-400 truncate">{p.address_name}</span>
                              </a>
                              <div className="flex flex-col items-end shrink-0 gap-1.5 ml-2">
                                <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{p.distance}m</span>
                                {isAlreadySaved ? (
                                  <button disabled className="text-[10px] font-bold bg-stone-200 text-stone-500 px-2 py-1 rounded cursor-not-allowed">✓ 저장됨</button>
                                ) : (
                                  <button onClick={() => handleScrapPlace(p)} className="text-[10px] font-bold bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600 transition-colors cursor-pointer">+ 저장</button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </section>

        {!user && !authLoading && (
          <section className="relative bg-white rounded-3xl border border-stone-100 overflow-hidden shadow-sm mt-12 mb-12 animate-in fade-in-up duration-500 z-20">
            <div className="p-6 filter blur-[6px] opacity-40 select-none pointer-events-none space-y-6">
              <div className="flex items-center gap-2 mb-2"><Star className="text-stone-400 fill-stone-400" size={18} /><h2 className="font-bold text-stone-800">맛집 직접 기록</h2></div>
              <div className="w-full bg-stone-100 rounded-xl h-12"></div>
              <div className="pt-6 border-t border-stone-100 mt-6">
                <h2 className="font-bold text-stone-800 mb-4">내 맛집 리스트 <span className="text-orange-500">12</span></h2>
                <div className="bg-white rounded-3xl border border-stone-100 overflow-hidden shadow-sm mb-4">
                  <img src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&q=80&w=600" className="w-full h-40 object-cover" alt="food" />
                  <div className="p-5 space-y-3"><div className="flex justify-between items-start"><div className="space-y-1.5"><div className="w-32 h-5 bg-stone-200 rounded-md"></div><div className="w-20 h-4 bg-stone-100 rounded-md"></div></div><div className="w-12 h-6 bg-stone-200 rounded-md"></div></div></div>
                </div>
              </div>
            </div>

            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/50 p-6 text-center backdrop-blur-[1px]">
              <div className="bg-white p-4 rounded-full shadow-lg mb-5 text-orange-500 border border-orange-100"><Lock size={30} className="stroke-[2.5]" /></div>
              <h3 className="text-xl font-black text-stone-900 mb-2.5 tracking-tight">나만의 맛집 지도 만들기</h3>
              <p className="text-sm text-stone-700 mb-7 font-medium leading-relaxed break-keep inline-block max-w-[85%]">잊고 싶지 않은 맛집 사진과 한줄평을 차곡차곡 기록해 보세요!</p>
              <button onClick={() => { setAuthMode('signup'); setIsAuthModalOpen(true); }} className="bg-stone-800 hover:bg-black text-white font-bold py-4 px-10 rounded-2xl shadow-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2">🚀 3초 만에 시작하기</button>
              <p className="text-xs text-stone-500 mt-5 font-medium">이미 계정이 있으신가요? <button onClick={() => { setAuthMode('login'); setIsAuthModalOpen(true); }} className="font-bold text-stone-700 hover:text-orange-500 underline underline-offset-2 transition-colors cursor-pointer">로그인</button></p>
            </div>
          </section>
        )}

        {user && (
          <section className="space-y-6 z-20 relative">
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
                {filterOptions.map((cat: string) => <button key={cat} onClick={() => setFilterCategory(cat)} className={`text-xs font-bold px-3 py-2 rounded-xl border whitespace-nowrap ${filterCategory === cat ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-stone-500'}`}>{cat}</button>)}
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

            {renderReviewList()}
          </section>
        )}

        <section className="bg-white rounded-3xl p-6 shadow-sm border border-orange-50 space-y-5 z-20 relative">
          <div className="flex items-center gap-2 mb-2"><Star className="text-orange-500 fill-orange-500" size={18} /><h2 className="font-bold text-stone-800">맛집 직접 기록</h2></div>

          <div className="flex gap-2">
            <input type="text" value={storeName} onChange={(e) => { setStoreName(e.target.value); setPlaceId(""); setPlaceUrl(""); setAddress(""); }} required placeholder="가게 이름" className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
            <button type="button" onClick={() => { setPlaceSearchTarget('add'); setIsPlaceSearchModalOpen(true); }} className="shrink-0 bg-blue-50 text-blue-600 px-4 rounded-xl font-bold text-xs hover:bg-blue-100 transition-colors whitespace-nowrap cursor-pointer">
              🔍 카카오맵
            </button>
          </div>
          {placeId && <p className="text-[10px] text-blue-500 font-bold ml-1 -mt-3 flex items-center gap-1"><Check size={12} />카카오맵 장소가 연결되었습니다.</p>}

          <div className="grid grid-cols-2 gap-3">
            <input type="text" value={menu} onChange={(e) => setMenu(e.target.value)} placeholder="메뉴" className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 outline-none text-sm focus:ring-2 focus:ring-orange-500" />
            <div className="flex items-center justify-center bg-stone-50 border border-stone-100 rounded-xl gap-1">
              {[1, 2, 3, 4, 5].map(s => <Star key={s} size={18} onClick={() => setRating(s)} className={`cursor-pointer ${rating >= s ? 'text-amber-400 fill-amber-400' : 'text-stone-300'}`} />)}
            </div>
          </div>
          <CategorySelector value={category} onChange={setCategory} showCustom={showCustomCategory} onToggleCustom={() => setShowCustomCategory(!showCustomCategory)} customValue={customCategory} onCustomChange={setCustomCategory} availableCats={knownCategories} />
          <MultiImagePicker existingUrls={[]} newPreviews={imagePreviews} onSelect={(e: any, t: number) => handleImagesSelect(e, t, setImageFiles, setImagePreviews)} onRemoveExisting={() => { }} onRemoveNew={(idx: number) => { setImageFiles(p => p.filter((_, i) => i !== idx)); setImagePreviews(p => p.filter((_, i) => i !== idx)); }} />
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="한줄평" className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 h-24 resize-none outline-none text-sm focus:ring-2 focus:ring-orange-500" />
          <button onClick={handleAddReview} disabled={isSubmitting} className="w-full bg-orange-500 text-white font-bold py-4 rounded-xl shadow-lg cursor-pointer">{isSubmitting ? "저장 중..." : "기록 저장하기"}</button>
        </section>
      </div>

      {isPlaceSearchModalOpen && (
        <PlaceSearchModal
          onClose={() => setIsPlaceSearchModalOpen(false)}
          onSelectTarget={(p) => {
            if (placeSearchTarget === 'add') {
              setStoreName(p.place_name); setPlaceId(p.id); setPlaceUrl(p.place_url); setAddress(p.road_address_name || p.address_name);
            } else {
              setEditStoreName(p.place_name); setEditPlaceId(p.id); setEditPlaceUrl(p.place_url); setEditAddress(p.road_address_name || p.address_name);
            }
            setIsPlaceSearchModalOpen(false);
          }}
          initialQuery={placeSearchTarget === 'add' ? storeName : editStoreName}
        />
      )}

      {tinderState !== 'idle' && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-900/95 backdrop-blur-md overflow-hidden p-4">

          {tinderState === 'setup' && (
            <div className="bg-white rounded-[2rem] p-6 shadow-2xl relative w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95">
              <button onClick={handleCloseTinder} className="absolute top-4 right-4 p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors z-50 cursor-pointer"><X size={18} /></button>

              <div className="text-center mb-8 mt-6">
                <Flame size={40} className="mx-auto text-rose-500 mb-3 animate-pulse" />
                <h2 className="text-3xl font-black text-stone-800 mb-1 tracking-tight">투표방 열기</h2>
                <p className="text-xs text-stone-500 font-medium">링크를 공유해서 다같이 결정하세요!</p>
              </div>
              <div className="space-y-4">
                <button onClick={() => handleCreateRoom('menu')} className="w-full bg-orange-50 rounded-2xl p-5 text-left border border-orange-100 hover:border-orange-400 cursor-pointer transition-colors group">
                  <div className="flex justify-between items-center mb-2">
                    <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">Track A</span>
                  </div>
                  <h3 className="text-lg font-black text-orange-700 mb-1">메뉴 이상형 월드컵</h3>
                  <p className="text-[11px] text-orange-600/80 font-medium leading-relaxed break-keep">랜덤으로 뽑힌 10가지 메뉴 중에서<br />다수가 좋아하는 메뉴를 찾아냅니다.</p>
                </button>
                <button
                  onClick={() => filteredReviews.length >= 5 ? handleCreateRoom('restaurant') : null}
                  className={`w-full rounded-2xl p-5 text-left border transition-all ${filteredReviews.length >= 5 ? 'bg-stone-50 border-stone-200 hover:border-rose-400 cursor-pointer group' : 'bg-stone-100 border-stone-200 cursor-not-allowed opacity-60'}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="bg-stone-200 text-stone-600 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">Track B</span>
                    {filteredReviews.length >= 5 ? null : <Lock size={14} className="text-stone-400" />}
                  </div>
                  <h3 className={`text-lg font-black mb-1 ${filteredReviews.length >= 5 ? 'text-stone-800' : 'text-stone-500'}`}>찐 맛집 데스매치</h3>
                  {filteredReviews.length >= 5 ? (
                    <p className="text-[11px] text-stone-500 font-medium leading-relaxed break-keep">우리가 저장한 맛집 리스트 중에서<br />오늘 갈 곳을 투표로 결정합니다.</p>
                  ) : (
                    <p className="text-[10px] text-rose-500 font-bold mt-2 bg-rose-50 inline-block px-2 py-1 rounded">🔒 맛집 5개 이상 필요 (현재 {filteredReviews.length}개)</p>
                  )}
                </button>
              </div>
            </div>
          )}

          {tinderState === 'share_room' && roomData && (
            <div className="bg-white rounded-[2rem] p-6 shadow-2xl relative w-full max-w-sm flex flex-col h-[550px] overflow-hidden animate-in zoom-in-95 text-center">
              <button onClick={handleCloseTinder} className="absolute top-4 right-4 p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors z-50 cursor-pointer"><X size={18} /></button>

              <div className="shrink-0 mt-6">
                <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3"><Users size={28} /></div>
                <h3 className="text-xl font-black text-stone-800 mb-1">투표 대기방</h3>
                <p className="text-[11px] text-stone-500 mb-4 break-keep">단톡방에 링크를 공유하고<br />친구들을 초대하세요.</p>
                <div className="bg-stone-50 p-2.5 rounded-xl flex items-center justify-between mb-4 border border-stone-200">
                  <span className="text-[11px] font-bold text-stone-600 tracking-wider pl-2 truncate">{window.location.origin}/?room={tinderRoomId}</span>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/?room=${tinderRoomId}`); alert('초대 링크가 복사되었습니다!'); }} className="bg-white p-1.5 rounded-md shadow-sm text-stone-500 hover:text-blue-500 transition-colors cursor-pointer"><Copy size={14} /></button>
                    <button onClick={handleLobbyKakaoShare} className="bg-[#FEE500] p-1.5 rounded-md shadow-sm text-stone-900 hover:bg-[#FDD800] transition-colors cursor-pointer"><MessageCircle size={14} /></button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide py-2 border-t border-b border-stone-100 mb-4">
                <p className="text-[11px] font-bold text-stone-400 mb-3 text-left">현재 접속자 ({roomData.participants?.length || 0}명)</p>
                <div className="flex flex-wrap gap-2">
                  {roomData.participants?.map((p: string, i: number) => (
                    <span key={i} className="bg-stone-50 text-stone-700 px-3 py-1.5 rounded-lg text-[11px] font-bold border border-stone-200 shadow-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="shrink-0">
                {isHost ? (
                  (roomData.participants?.length || 0) >= 2 ? (
                    <button
                      onClick={() => updateDoc(doc(db, "rooms", tinderRoomId!), { status: 'playing' })}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-3.5 rounded-xl shadow-md transition-colors text-sm cursor-pointer"
                    >
                      🚀 {roomData.participants?.length}명 투표 시작하기
                    </button>
                  ) : (
                    <button disabled className="w-full bg-stone-100 text-stone-400 font-black py-3.5 rounded-xl text-[13px] cursor-not-allowed border border-stone-200">
                      최소 2명 이상 참여해야 시작 가능
                    </button>
                  )
                ) : (
                  <div className="bg-stone-50 p-3.5 rounded-xl">
                    <p className="text-xs font-bold text-stone-500 flex items-center justify-center gap-2"><Loader2 className="animate-spin text-stone-400" size={14} /> 방장의 시작을 기다리는 중...</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {tinderState === 'playing' && tinderItems.length > 0 && (
            <div className="bg-white rounded-[2rem] p-5 shadow-2xl relative w-full max-w-sm flex flex-col h-[600px] overflow-hidden animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-4 shrink-0 z-10">
                <div className="flex gap-2 items-center">
                  <span className="bg-stone-100 text-stone-500 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest border border-stone-200">Room: {tinderRoomId}</span>
                  <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-2.5 py-1 rounded-md">{currentTinderIndex + 1} / {tinderItems.length}</span>
                </div>
                <button onClick={handleCloseTinder} className="p-1.5 bg-stone-100 rounded-full text-stone-500 hover:bg-stone-200 cursor-pointer"><X size={16} /></button>
              </div>

              <div className="relative flex-1 w-full perspective-[1000px] mb-2">
                {tinderItems.map((item: any, idx: number) => {
                  if (idx < currentTinderIndex) return null;
                  const isTop = idx === currentTinderIndex;
                  const zIndex = tinderItems.length - idx;
                  const scale = isTop ? 1 : 0.95;
                  const yOffset = isTop ? 0 : 20;

                  let transformStr = `translateY(${yOffset}px) scale(${scale})`;
                  if (isTop) {
                    if (swipeDirection === 'left') transformStr = `translateX(-150%) rotate(-20deg) scale(0.8)`;
                    else if (swipeDirection === 'right') transformStr = `translateX(150%) rotate(20deg) scale(0.8)`;
                    else if (touchCurrentX !== 0) transformStr = `translateX(${touchCurrentX}px) rotate(${touchCurrentX * 0.05}deg)`;
                  }

                  return (
                    <div
                      key={idx} onTouchStart={isTop ? onTouchStart : undefined} onTouchMove={isTop ? onTouchMove : undefined} onTouchEnd={isTop ? onTouchEnd : undefined}
                      className={`absolute inset-0 bg-white rounded-3xl shadow-xl border border-stone-200 flex flex-col overflow-hidden origin-bottom ${isTop && swipeDirection === null && touchCurrentX === 0 ? 'transition-transform duration-300' : ''} ${swipeDirection !== null ? 'transition-transform duration-300 ease-in-out' : ''}`}
                      style={{ zIndex, transform: transformStr }}
                    >
                      <div className={`w-full h-[55%] relative flex items-center justify-center shrink-0 ${item.type === 'menu' ? item.theme.bgColor : 'bg-stone-100'}`}>
                        {item.type === 'menu' ? <span className="text-8xl drop-shadow-md select-none">{item.theme.emoji}</span> : (item.data.imageUrls?.[0] ? <img src={item.data.imageUrls[0]} className="absolute inset-0 w-full h-full object-cover pointer-events-none" /> : <UtensilsCrossed size={48} className="text-stone-300" />)}
                      </div>
                      <div className="w-full h-[45%] p-5 bg-white flex flex-col justify-center border-t border-stone-100">
                        {item.type === 'menu' ? (
                          <div className="text-center">
                            <span className={`text-[10px] font-extrabold ${item.theme.bgColor} ${item.theme.textColor} px-2.5 py-1 rounded-full`}>{item.category}</span>
                            <h3 className="text-2xl font-black text-stone-800 mt-2 tracking-tight">{item.name}</h3>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2 mb-1.5"><span className="text-[10px] font-bold bg-stone-100 text-stone-500 px-2 py-0.5 rounded">{item.data.category}</span><div className="flex items-center text-[10px] font-bold text-amber-500"><Star size={10} className="fill-amber-500 mr-0.5" />{item.data.rating}.0</div></div>
                            <h3 className="text-xl font-black text-stone-800 truncate mb-1">{item.data.storeName}</h3>
                            <p className="text-orange-500 text-xs font-bold truncate">{item.data.menu}</p>
                            <p className="text-[11px] text-stone-400 mt-2 italic truncate break-keep line-clamp-2">"{item.data.comment}"</p>
                          </div>
                        )}
                      </div>
                      {isTop && touchCurrentX > 50 && <div className="absolute top-6 left-6 border-4 border-green-500 text-green-500 font-black text-2xl p-1.5 rounded-lg transform -rotate-12 opacity-80 pointer-events-none z-10">LIKE</div>}
                      {isTop && touchCurrentX < -50 && <div className="absolute top-6 right-6 border-4 border-rose-500 text-rose-500 font-black text-2xl p-1.5 rounded-lg transform rotate-12 opacity-80 pointer-events-none z-10">NOPE</div>}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-6 shrink-0 z-10 py-2">
                <button onClick={() => handleSwipe('left')} className="w-14 h-14 bg-white border border-stone-200 rounded-full flex items-center justify-center shadow-md text-rose-500 transform active:scale-90 transition-transform cursor-pointer"><X size={24} strokeWidth={3} /></button>
                <button onClick={() => handleSwipe('right')} className="w-14 h-14 bg-white border border-stone-200 rounded-full flex items-center justify-center shadow-md text-green-500 transform active:scale-90 transition-transform cursor-pointer"><Heart size={24} strokeWidth={3} className="fill-green-500" /></button>
              </div>
            </div>
          )}

          {tinderState === 'leaderboard' && (
            <div className="bg-white rounded-[2rem] p-6 shadow-2xl relative w-full max-w-sm flex flex-col h-[600px] overflow-hidden animate-in zoom-in-95 text-left">
              <button onClick={handleCloseTinder} className="absolute top-5 right-5 p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors z-50 cursor-pointer"><X size={18} /></button>

              <div className="shrink-0 mt-2 border-b border-stone-100 pb-4 mb-4">
                <h2 className="text-xl font-black text-stone-800 flex items-center gap-2"><Activity size={20} className="text-rose-500" /> 실시간 투표 현황</h2>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[10px] text-stone-400">
                    {roomData?.status === 'closed' ? "최종 결정할 항목을 선택하세요!" : "친구들의 투표를 실시간으로 확인하세요."}
                  </p>
                  <span className="bg-orange-50 text-orange-600 text-[10px] font-black px-2 py-0.5 rounded-md border border-orange-100">
                    {roomData?.completedUsers?.length || 0} / {roomData?.participants?.length || 0}명 완료
                  </span>
                </div>
              </div>

              {(() => {
                const maxVotes = roomLeaderboard.length > 0 ? Math.max(...roomLeaderboard.map(r => r.count)) : 0;
                // 🌟 (버그 수정 3) 0표일 때만 실패 창이 뜨도록 수정
                const isFailed = maxVotes === 0;
                const isTie = maxVotes > 0 && roomLeaderboard.filter(r => r.count === maxVotes).length > 1;

                if (roomData?.status === 'closed' && isFailed) {
                  return (
                    <div className="flex-1 flex flex-col items-center justify-center py-10 mt-6">
                      <Frown size={56} className="text-stone-300 mb-4" />
                      <p className="text-sm font-bold text-stone-600 text-center mb-2">아무도 메뉴를 통일하지 못했어요 🥲</p>
                      <p className="text-xs text-stone-400 text-center break-keep mb-6">모두가 각자 다른 메뉴를 골랐거나<br />아무도 투표를 하지 않았습니다.</p>
                      {isHost ? (
                        <button onClick={handleRestartVote} className="w-full bg-stone-800 hover:bg-black text-white px-5 py-3.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md">
                          <RefreshCw size={16} /> 새로운 메뉴로 다시 투표하기
                        </button>
                      ) : (
                        <div className="text-center p-3.5 bg-stone-50 rounded-xl w-full"><p className="text-[11px] font-bold text-stone-500 animate-pulse">방장이 새로운 투표를 준비 중입니다...</p></div>
                      )}
                    </div>
                  );
                }

                return (
                  <>
                    <div className="space-y-2.5 flex-1 overflow-y-auto scrollbar-hide pb-2">
                      {roomLeaderboard.map((result: any, idx: number) => {
                        const item = result.item;
                        const isTopTier = result.count === maxVotes && maxVotes > 0;
                        const isSelectable = roomData?.status === 'closed' && isTie && isTopTier && isHost;
                        const isSelected = tinderFinalPick === idx;

                        return (
                          <div
                            key={idx}
                            onClick={() => { if (isSelectable) setTinderFinalPick(idx); }}
                            className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${isSelectable && isSelected ? 'bg-orange-50 border-orange-500 shadow-md ring-2 ring-orange-200 cursor-pointer'
                              : isSelectable ? 'bg-white border-stone-200 cursor-pointer hover:border-orange-300'
                                : isTopTier && roomData?.status === 'closed' ? 'bg-orange-50 border-orange-500 shadow-md'
                                  : 'bg-white border-stone-200 opacity-70'
                              }`}
                          >
                            <div className="w-5 text-center font-black text-stone-400 text-xs shrink-0">{idx + 1}</div>
                            {item.type === 'menu' ? <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${item.theme.bgColor}`}>{item.theme.emoji}</div> : <div className="w-10 h-10 rounded-xl bg-stone-200 overflow-hidden shrink-0">{item.data.imageUrls?.[0] ? <img src={item.data.imageUrls[0]} className="w-full h-full object-cover" /> : <UtensilsCrossed className="w-full h-full p-2 text-stone-400" />}</div>}
                            <div className="min-w-0 flex-1">
                              <h4 className={`font-black truncate text-sm ${(isSelectable && isSelected) || (!isSelectable && isTopTier) ? 'text-orange-600' : 'text-stone-800'}`}>{item.type === 'menu' ? item.name : item.data.storeName}</h4>
                              <p className="text-[10px] text-stone-500 truncate">{item.type === 'menu' ? item.category : item.data.menu}</p>
                            </div>
                            <div className="shrink-0 flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-stone-200 shadow-sm"><Heart size={10} className={isTopTier ? "text-rose-500 fill-rose-500" : "text-stone-400 fill-stone-400"} /><span className={`font-black text-[11px] ${isTopTier ? 'text-rose-600' : 'text-stone-600'}`}>{result.count}</span></div>
                            {isSelectable && isSelected && <Check size={16} className="text-orange-500 shrink-0 ml-1" />}
                          </div>
                        )
                      })}
                    </div>

                    <div className="shrink-0 pt-4 border-t border-stone-100 mt-2">
                      {roomData?.status === 'closed' ? (
                        isTie ? (
                          isHost ? (
                            <button
                              onClick={() => {
                                const winner = roomLeaderboard[tinderFinalPick].item;
                                updateDoc(doc(db, "rooms", tinderRoomId!), { status: 'reveal', finalWinner: winner });
                              }}
                              className="w-full bg-stone-900 hover:bg-black text-white font-black py-3.5 rounded-xl shadow-lg active:scale-95 transition-transform text-sm cursor-pointer"
                            >
                              선택한 동점 항목으로 1위 발표하기 🚀
                            </button>
                          ) : (
                            <div className="text-center p-3 bg-stone-50 rounded-xl text-[11px] font-bold text-stone-500 animate-pulse">방장이 동점 항목 중 최종 1위를 결정하고 있습니다...</div>
                          )
                        ) : (
                          isHost ? (
                            <button
                              onClick={() => {
                                const winner = roomLeaderboard[0].item;
                                updateDoc(doc(db, "rooms", tinderRoomId!), { status: 'reveal', finalWinner: winner });
                              }}
                              className="w-full bg-stone-900 hover:bg-black text-white font-black py-3.5 rounded-xl shadow-lg active:scale-95 transition-transform text-sm cursor-pointer"
                            >
                              최종 1위 결과 발표하기 🚀
                            </button>
                          ) : (
                            <div className="text-center p-3 bg-stone-50 rounded-xl text-[11px] font-bold text-stone-500 animate-pulse">방장이 최종 결과를 발표할 때까지 기다려주세요...</div>
                          )
                        )
                      ) : (
                        isHost ? (
                          <button onClick={() => {
                            const allVoted = roomData?.completedUsers?.length === roomData?.participants?.length;
                            if (!allVoted) {
                              if (!window.confirm("아직 투표하지 않은 인원이 있습니다. 그래도 투표를 마감하시겠습니까?")) return;
                            }
                            updateDoc(doc(db, "rooms", tinderRoomId!), { status: 'closed' });
                          }} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-black py-3.5 rounded-xl shadow-md transition-colors text-sm cursor-pointer">
                            투표 마감하기 (결과 확인)
                          </button>
                        ) : (
                          <div className="text-center p-3.5 bg-stone-50 rounded-xl"><p className="text-[11px] font-bold text-stone-500 animate-pulse">방장이 투표를 마감할 때까지 기다려주세요...</p></div>
                        )
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {tinderState === 'winner_reveal' && roomData?.finalWinner && (
            <div className="bg-white rounded-[2rem] p-6 shadow-2xl relative w-full max-w-sm flex flex-col h-[600px] overflow-hidden animate-in zoom-in-95 text-center justify-center">
              <button onClick={handleCloseTinder} className="absolute top-5 right-5 p-1.5 rounded-full bg-white/50 hover:bg-white/80 text-stone-600 transition-colors z-50 cursor-pointer backdrop-blur-sm"><X size={18} /></button>
              <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-r from-amber-400 to-orange-500" />

              <PartyPopper size={56} className="mx-auto text-orange-500 mb-4 animate-bounce" />
              <div className="bg-orange-100 text-orange-600 text-[10px] font-black px-3 py-1 rounded-full mx-auto mb-2 tracking-widest"><Sparkles size={12} className="inline mr-1" />결과 발표</div>
              <h2 className="text-xl font-bold text-stone-600 mb-2">모두가 선택한 최종 1위는?</h2>

              <div className="bg-white border-2 border-orange-200 rounded-[2rem] p-8 mx-4 my-6 shadow-[0_0_40px_rgba(249,115,22,0.15)] transform scale-105 flex flex-col items-center justify-center">
                {roomData.finalWinner.type === 'menu' ? (
                  <>
                    <span className="text-7xl drop-shadow-sm mb-4 block">{roomData.finalWinner.theme.emoji}</span>
                    <h3 className="text-3xl font-black text-stone-800 tracking-tight">{roomData.finalWinner.name}</h3>
                  </>
                ) : (
                  <>
                    <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden mb-4 shadow-md border border-stone-100">{roomData.finalWinner.data.imageUrls?.[0] ? <img src={roomData.finalWinner.data.imageUrls[0]} className="w-full h-full object-cover" /> : <UtensilsCrossed className="w-full h-full p-4 bg-stone-200 text-stone-400" />}</div>
                    <h3 className="text-2xl font-black text-stone-800 truncate tracking-tight w-full px-2">{roomData.finalWinner.data.storeName}</h3>
                  </>
                )}
              </div>

              {isHost ? (
                <button
                  onClick={() => {
                    if (tinderMode === 'menu') {
                      searchLocationAndSync(roomData.finalWinner.name);
                    } else {
                      handleTrackBShare();
                    }
                  }}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-xl shadow-lg active:scale-95 transition-transform text-sm cursor-pointer mt-4 flex items-center justify-center gap-2"
                >
                  {tinderMode === 'menu' ? <><Search size={16} /> 이 메뉴로 주변 맛집 찾기</> : <><MessageCircle size={16} /> 이 맛집으로 결정 (카톡 공유)</>}
                </button>
              ) : (
                <div className="mt-4 p-4 bg-stone-50 rounded-xl">
                  {tinderMode === 'menu' ? (
                    <p className="text-[11px] font-bold text-stone-500 flex justify-center items-center gap-2 animate-pulse"><Loader2 className="animate-spin" size={14} /> 방장이 주변 맛집을 검색 중입니다...</p>
                  ) : (
                    <button onClick={() => setShareReview(roomData.finalWinner.data)} className="w-full bg-stone-800 text-white font-bold py-3.5 rounded-xl text-sm cursor-pointer">🧾 1위 맛집 영수증 보기</button>
                  )}
                </div>
              )}
            </div>
          )}

          {tinderState === 'final_menu' && (
            <div className="bg-white rounded-[2rem] p-6 shadow-2xl relative w-full max-w-sm flex flex-col h-[600px] overflow-hidden animate-in zoom-in-95 text-left">
              <div className="flex items-center justify-between mb-4 shrink-0 border-b border-stone-100 pb-3">
                <h2 className="text-xl font-black text-stone-800 tracking-tight">주변 맛집 추천</h2>
              </div>
              <button onClick={handleCloseTinder} className="absolute top-5 right-5 p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors z-50 cursor-pointer"><X size={18} /></button>

              <div className="flex items-center gap-3 bg-orange-50 p-3 rounded-xl mb-4 shrink-0 border border-orange-100 mt-2">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-xl shadow-sm">{safeIconTheme.emoji}</div>
                <div><p className="text-[10px] font-bold text-orange-500">투표 1위 메뉴</p><p className="text-lg font-black text-stone-800 leading-tight">{roomData?.recommendedMenu || recommendedMenu}</p></div>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide space-y-2 pb-4">
                {isLocating ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3"><Loader2 className="animate-spin text-orange-500" size={24} /><p className="text-xs font-bold text-stone-500">방장의 위치를 기준으로 맛집을 찾고 있어요...</p></div>
                ) : locationError ? (
                  <div className="h-full flex items-center justify-center"><p className="text-xs text-red-500 font-bold bg-red-50 p-3 rounded-xl">{locationError}</p></div>
                ) : (roomData?.nearbyExternal?.length === 0 && roomData?.nearbySaved?.length === 0) ? (
                  <div className="h-full flex items-center justify-center"><p className="text-xs font-bold text-stone-400">검색된 맛집이 없습니다 🥲</p></div>
                ) : (
                  <>
                    {(roomData?.nearbySaved || []).map((r: Review) => {
                      const isHostFav = r.userId === roomData?.hostUid;
                      // 🌟 (버그 수정 2) 게스트 화면에서도 '내 리뷰'에 있어야만 단골 맛집이라고 띄워줌
                      const isMyFav = reviews.some((myR) => myR.placeId === r.placeId || (myR.storeName && normalize(myR.storeName).includes(normalize(r.storeName))));

                      return (
                        <div key={r.id} className="flex items-center justify-between bg-orange-50 border border-orange-100 p-3 rounded-xl">
                          <div className="flex items-center gap-3 min-w-0">
                            {r.imageUrls?.[0] && <img src={r.imageUrls[0]} className="w-10 h-10 rounded-lg object-cover" />}
                            <div className="min-w-0">
                              {isHostFav && <span className="bg-orange-100 text-orange-600 text-[9px] font-black px-1.5 py-0.5 rounded-sm inline-block mb-1">👑 방장 단골 맛집</span>}
                              <p className="text-sm font-bold truncate text-orange-900">{r.storeName}</p>
                              {isMyFav && <p className="text-[10px] text-orange-600">내 단골 맛집</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 flex-col items-end">
                            <div className="flex items-center"><Star size={11} className="text-amber-500 fill-amber-500 mr-1" /><span className="text-xs font-bold text-amber-600">{r.rating}.0</span></div>
                            {isHost ? (
                              <button onClick={() => handleFinalResultKakaoShare(r, true)} className="mt-1 text-[10px] font-bold bg-stone-800 text-white px-2 py-1 rounded cursor-pointer">이 맛집으로 결정</button>
                            ) : (
                              <button onClick={() => setShareReview(r)} className="mt-1 text-[10px] font-bold bg-white border border-stone-200 text-stone-500 px-2 py-1 rounded cursor-pointer">영수증 보기</button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {(roomData?.nearbyExternal || []).map((p: any, i: number) => {
                      const isAlreadySaved = reviews.some(r => r.placeId === p.id || (r.storeName && normalize(r.storeName).includes(normalize(p.place_name))));
                      return (
                        <div key={i} className="flex items-center justify-between bg-white border border-stone-200 rounded-xl px-3 py-3 shadow-sm group">
                          <a href={p.place_url} target="_blank" className="flex flex-col min-w-0 flex-1 cursor-pointer pr-2">
                            <span className="font-bold text-stone-800 text-sm truncate group-hover:text-stone-900 transition-colors">{p.place_name}</span>
                            <span className="text-[10px] text-stone-400 truncate mt-0.5">{p.address_name}</span>
                          </a>
                          <div className="flex flex-col items-end shrink-0 gap-1.5 ml-2">
                            <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{p.distance}m</span>
                            {isHost ? (
                              <button onClick={() => handleFinalResultKakaoShare(p, false)} className="text-[10px] font-bold bg-stone-800 text-white px-2 py-1 rounded hover:bg-black transition-colors cursor-pointer">이 맛집으로 결정</button>
                            ) : (
                              <a href={p.place_url} target="_blank" className="text-[10px] font-bold bg-stone-100 text-stone-500 px-2 py-1 rounded hover:bg-stone-200 transition-colors cursor-pointer">카카오맵 보기</a>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>

              {isHost && (
                <div className="shrink-0 pt-4 border-t border-stone-100 mt-2">
                  <p className="text-center text-[10px] text-stone-400 mb-2">리스트 우측의 버튼을 눌러 카톡방에 결과를 공유하세요!</p>
                  <button onClick={handleCloseTinder} className="w-full bg-stone-100 hover:bg-stone-200 text-stone-600 font-black py-3.5 rounded-xl shadow-sm cursor-pointer text-sm">
                    방 닫기 (투표 종료)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isProfileModalOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsProfileModalOpen(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black flex items-center gap-2"><Settings className="text-orange-500" /> 내 프로필 설정</h3><button onClick={() => setIsProfileModalOpen(false)} className="p-1.5 rounded-full bg-stone-100 text-stone-500 cursor-pointer"><X size={18} /></button></div>
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-2 border-orange-200 bg-orange-50 overflow-hidden flex items-center justify-center">{profilePhotoUrl ? <img src={profilePhotoUrl} className="w-full h-full object-cover" /> : <User size={40} className="text-orange-300" />}</div>
                  <label className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md border border-stone-200 cursor-pointer hover:bg-stone-50 transition-colors"><Camera size={16} className="text-stone-600" /><input type="file" accept="image/*" className="hidden" onChange={handleProfileImageSelect} /></label>
                </div>
                <p className="text-[10px] text-stone-400">사진을 터치해 변경하세요</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-500 mb-2 uppercase tracking-wider ml-1">나의 닉네임</label>
                <input type="text" value={profileNickname} onChange={(e) => setProfileNickname(e.target.value)} required placeholder="닉네임을 입력하세요 (예: 맛잘알 지훈)" maxLength={10} className="w-full bg-stone-50 border border-stone-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all" />
              </div>
              <button type="submit" disabled={isSavingProfile} className="w-full bg-stone-800 hover:bg-black text-white font-black py-4 rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50 cursor-pointer">{isSavingProfile ? <Loader2 className="animate-spin mx-auto" /> : "프로필 저장하기"}</button>
            </form>
            <button type="button" onClick={() => { handleLogout(); setIsProfileModalOpen(false); }} className="w-full bg-stone-100 hover:bg-red-50 text-stone-600 hover:text-red-500 font-bold py-3.5 rounded-xl mt-3 transition-colors cursor-pointer flex justify-center items-center gap-2">
              <LogOut size={16} /> 로그아웃
            </button>
          </div>
        </div>
      )}

      {isSyncModalOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSyncModalOpen(false)} />
          <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 shrink-0"><h3 className="text-xl font-black flex items-center gap-2"><MapPin className="text-blue-500" fill="#E0F2FE" /> 공유 지도 만들기</h3><button onClick={() => setIsSyncModalOpen(false)} className="p-1.5 rounded-full bg-stone-100 text-stone-500 cursor-pointer"><X size={18} /></button></div>
            <div className="overflow-y-auto scrollbar-hide space-y-6 pb-2">
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center"><p className="text-[13px] font-bold text-blue-800 leading-relaxed">서로의 코드를 입력하면<br />맛집 지도가 하나로 합쳐져요! 🗺️✨</p></div>
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <p className="text-[11px] font-bold text-stone-400 mb-2 uppercase tracking-wider">나의 연결 코드</p>
                <div className="flex items-center justify-between">
                  <code className="text-sm font-black text-blue-600 tracking-widest bg-white px-2 py-1 rounded shadow-sm border border-stone-100">{user?.uid?.substring(0, 15)}...</code>
                  <button onClick={() => { navigator.clipboard.writeText(user?.uid || ""); alert("내 코드가 복사되었습니다!"); }} className="p-2 bg-white rounded-lg shadow-sm text-stone-400 hover:text-blue-500 cursor-pointer"><Copy size={16} /></button>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider ml-1">친구 코드 입력</p>
                <input type="text" value={partnerCode} onChange={(e) => setPartnerCode(e.target.value)} placeholder="친구의 코드를 붙여넣기 하세요" className="w-full bg-white border border-stone-200 rounded-xl py-4 px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm" />
                <button onClick={handleConnectPartner} disabled={isConnecting || !partnerCode} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-3.5 rounded-xl shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer">{isConnecting ? <Loader2 className="animate-spin mx-auto" /> : "연결 신청하기"}</button>
              </div>
              {partnerUids.length > 0 && (
                <div className="pt-4 border-t border-stone-100">
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider ml-1 mb-3">현재 연결된 친구들</p>
                  <div className="space-y-2">
                    {partnerUids.map(uid => {
                      const p = partnersData[uid];
                      return (
                        <div key={uid} className="flex items-center justify-between bg-white border border-stone-100 p-3 rounded-xl shadow-sm">
                          <div className="flex items-center gap-3">{p?.photoUrl ? <img src={p.photoUrl} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-400"><User size={14} /></div>}<span className="font-bold text-sm text-stone-700">{p?.nickname || "친구"}</span></div>
                          <button onClick={() => handleDisconnect(uid, p?.nickname || "친구")} className="text-[10px] font-bold bg-red-50 text-red-500 hover:bg-red-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"><UserMinus size={12} /> 연결 끊기</button>
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

      {isBadgeModalOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4" onClick={() => setIsBadgeModalOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 shrink-0"><h3 className="text-xl font-black flex items-center gap-2"><Star className="text-orange-500 fill-orange-500" size={20} /> 내 뱃지 도감</h3><button onClick={() => setIsBadgeModalOpen(false)} className="p-1.5 rounded-full bg-stone-100 cursor-pointer"><X size={18} /></button></div>
            {isLoadingBadges ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-orange-500" size={32} /></div> : (
              <>
                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 mb-3 flex items-center justify-between shrink-0">
                  <div><p className="text-xs font-bold text-orange-600 mb-0.5">나의 수집 진행도</p><p className="text-sm font-black text-stone-800"><span className="text-orange-500 text-xl">{totalCollectedBadges}</span> / {totalBadgesCount}개</p></div>
                  <div className="text-right"><p className="text-[11px] text-stone-500 font-medium">Locked</p><p className="text-sm font-bold text-stone-700">🔒 {lockedBadgesCount}개</p></div>
                </div>
                <div className="flex border-b border-stone-100 mb-4 shrink-0">
                  <button onClick={() => setBadgeTab("general")} className={`flex-1 pb-2 font-bold text-sm border-b-2 ${badgeTab === "general" ? "border-orange-500 text-orange-500" : "border-transparent text-stone-400"} cursor-pointer`}>🏆 미식가 등급</button>
                  <button onClick={() => setBadgeTab("category")} className={`flex-1 pb-2 font-bold text-sm border-b-2 ${badgeTab === "category" ? "border-orange-500 text-orange-500" : "border-transparent text-stone-400"} cursor-pointer`}>🏷️ 카테고리 뱃지</button>
                </div>
                <div className="overflow-y-auto scrollbar-hide flex-1 pb-4 space-y-3">
                  {badgeTab === "general" ? GENERAL_BADGES.map((b, i) => {
                    const isUnlocked = badgeStats.total >= b.threshold;
                    const isSelected = displayBadge.title === b.title;
                    return (
                      <div key={i} onClick={() => isUnlocked && handleSelectBadge(b, 'general')} className={`flex items-center gap-4 p-3 rounded-2xl border ${isUnlocked ? (isSelected ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200 cursor-pointer' : `${b.bg} cursor-pointer`) : 'bg-stone-50 border-stone-100 grayscale opacity-40'}`}>
                        <div className="text-3xl shrink-0 w-12 text-center">{isUnlocked ? b.icon : "🔒"}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-0.5"><span className={`font-black text-sm ${isUnlocked ? b.color : 'text-stone-500'}`}>{b.title}</span>{isUnlocked && isSelected && <Check size={16} className="text-orange-500" />}</div>
                          <p className="text-[11px] text-stone-500 truncate">{b.desc}</p>
                          <p className="text-[10px] font-bold text-stone-400 mt-1 bg-stone-100 inline-block px-1.5 py-0.5 rounded">🔒 목표: 총 {b.threshold}곳 저장</p>
                        </div>
                      </div>
                    );
                  }) : Object.entries(CATEGORY_BADGES).map(([cat, badges]) => (
                    <div key={cat}>
                      <h4 className="font-extrabold text-stone-700 mb-3 flex justify-between border-b border-stone-100 pb-2"><span>{cat} 영역</span><span className="text-xs bg-stone-100 text-stone-500 px-2 py-1 rounded-lg">누적 {badgeStats.categories[cat] || 0}곳</span></h4>
                      <div className="grid gap-2">
                        {badges.map((b: any) => {
                          const isUnlocked = (badgeStats.categories[cat] || 0) >= b.threshold;
                          const isSelected = displayBadge.title === b.title;
                          return (
                            <div key={b.title} onClick={() => isUnlocked && handleSelectBadge(b, 'category')} className={`flex items-center gap-3 p-3 rounded-2xl border ${isUnlocked ? (isSelected ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200 cursor-pointer' : 'bg-white border-orange-100 cursor-pointer') : 'bg-stone-50 border-stone-100 grayscale opacity-40'}`}>
                              <div className="text-2xl shrink-0 w-10 text-center">{isUnlocked ? b.icon : "🔒"}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-0.5"><span className="font-bold text-sm text-stone-800">{b.title}</span>{isUnlocked && isSelected && <Check size={16} className="text-orange-500" />}</div>
                                <p className="text-[11px] text-stone-500 truncate">{b.desc}</p>
                                <p className="text-[10px] font-bold text-stone-400 mt-1 bg-stone-100 inline-block px-1.5 py-0.5 rounded">🔒 목표: {cat} {b.threshold}곳 저장</p>
                              </div>
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

      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-end mb-2"><button onClick={() => { setIsAuthModalOpen(false); setAuthError(""); setResetMessage(""); }} className="p-1.5 rounded-full bg-stone-100 cursor-pointer"><X size={18} /></button></div>
            {authMode === "reset" ? (
              <>
                <div className="text-center mb-6"><div className="inline-flex bg-orange-100 p-3 rounded-full text-orange-500 mb-3"><Lock size={28} /></div><h3 className="text-xl font-black mb-2">비밀번호 재설정</h3></div>
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required placeholder="이메일 주소" className="w-full py-3 px-4 bg-stone-50 rounded-xl border border-stone-200" />
                  {authError && <p className="text-xs text-red-500 text-center">{authError}</p>}
                  <button type="submit" className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl cursor-pointer">재설정 메일 보내기</button>
                  <button type="button" onClick={() => setAuthMode("login")} className="w-full text-sm font-bold text-stone-400 cursor-pointer">로그인으로 돌아가기</button>
                </form>
              </>
            ) : (
              <>
                <div className="text-center mb-6"><div className="inline-flex bg-orange-100 p-3 rounded-full text-orange-500 mb-3"><ChefHat size={28} /></div><h3 className="text-xl font-black mb-2">나만의 맛집 지도 만들기</h3></div>
                <div className="flex p-1 bg-stone-100 rounded-xl mb-6">
                  <button onClick={() => setAuthMode("login")} className={`flex-1 py-2 text-sm font-bold rounded-lg cursor-pointer ${authMode === "login" ? "bg-white shadow-sm" : "text-stone-400"}`}>로그인</button>
                  <button onClick={() => setAuthMode("signup")} className={`flex-1 py-2 text-sm font-bold rounded-lg cursor-pointer ${authMode === "signup" ? "bg-white shadow-sm" : "text-stone-400"}`}>회원가입</button>
                </div>
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <input type="email" value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} required placeholder="이메일 주소" className="w-full py-3 px-4 bg-stone-50 rounded-xl border border-stone-200" />
                  <input type={showPassword ? "text" : "password"} value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} required placeholder="비밀번호" className="w-full py-3 px-4 bg-stone-50 rounded-xl border border-stone-200" />
                  {authError && <p className="text-xs text-red-500 text-center">{authError}</p>}
                  <button type="submit" className="w-full bg-stone-800 text-white font-bold py-3.5 rounded-xl cursor-pointer">{authMode === "login" ? "로그인" : "가입하기"}</button>
                </form>
                <div className="relative my-6 flex items-center py-2"><div className="flex-grow border-t border-stone-200"></div><span className="mx-4 text-stone-400 text-xs">또는</span><div className="flex-grow border-t border-stone-200"></div></div>
                <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-2 bg-white border border-stone-200 font-bold py-3.5 rounded-xl shadow-sm cursor-pointer">구글로 시작하기</button>
              </>
            )}
          </div>
        </div>
      )}

      {shareReview && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-0 sm:p-6" onClick={() => setShareReview(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 flex flex-col w-full h-full sm:h-auto sm:max-h-[90vh] max-w-md bg-[#FFFDF6] sm:rounded-[2rem] sm:border border-stone-200 shadow-2xl overflow-hidden animate-in zoom-in-95 sm:slide-in-from-bottom-0 slide-in-from-bottom-full duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center w-full p-5 shrink-0 bg-white border-b border-orange-50">
              <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2"><Share2 size={18} className="text-orange-500" /> 맛집 영수증</h3>
              <button onClick={() => setShareReview(null)} className="p-1.5 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 transition-colors cursor-pointer"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto w-full px-4 pt-6 flex flex-col items-center pb-6 scrollbar-hide">
              {shareReview.imageUrls && shareReview.imageUrls.length > 1 && (
                <div className="flex gap-2 mb-4 w-[300px] overflow-x-auto scrollbar-hide pb-2 shrink-0">
                  {shareReview.imageUrls.map((url: string, idx: number) => (
                    <button key={idx} onClick={() => setReceiptImageIndex(idx)} className={`w-12 h-12 shrink-0 rounded-lg border-2 overflow-hidden ${idx === receiptImageIndex ? 'border-orange-500 shadow-md' : 'border-transparent opacity-50'} cursor-pointer`}>
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
                <button onClick={handleKakaoShare} className="w-full bg-[#FEE500] hover:bg-[#FDD800] text-stone-900 font-black py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer"><MessageCircle size={18} className="fill-stone-900" /> 카카오톡으로 공유하기</button>

                <div className="mt-2 pt-3 border-t border-stone-100">
                  <p className="text-[11px] text-stone-500 font-bold mb-2 text-center flex items-center justify-center gap-1"><MapPin size={12} /> 이 맛집의 위치와 후기가 궁금하다면?</p>
                  <a href={`https://map.kakao.com/link/search/${encodeURIComponent(shareReview.storeName)}`} target="_blank" rel="noopener noreferrer" className="w-full bg-stone-800 hover:bg-black text-white font-black py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-colors text-sm">
                    카카오맵에서 식당 보기
                  </a>
                </div>

                <div className="flex gap-2 mt-1">
                  <button onClick={handleDownloadReceipt} disabled={isGeneratingImage} className="flex-1 bg-stone-50 text-stone-800 text-sm font-bold py-3.5 rounded-xl shadow-sm border border-stone-200 flex items-center justify-center gap-2 cursor-pointer">{isGeneratingImage ? <Loader2 size={16} className="animate-spin text-orange-500" /> : <Download size={16} className="text-orange-500" />} 이미지 저장</button>
                  <button onClick={handleCopyLink} className="flex-1 bg-stone-50 text-stone-800 text-sm font-bold py-3.5 rounded-xl shadow-sm border border-stone-200 flex items-center justify-center gap-2 cursor-pointer"><Copy size={16} className="text-blue-500" /> 링크 복사</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isScrapModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center" onClick={() => setIsScrapModalOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">{pendingImport ? <Copy size={18} className="text-blue-500" /> : <MapPin size={18} className="text-orange-500" />}{pendingImport ? "친구 맛집 가져오기" : "맛집 저장하기"}</h3>
              <button type="button" onClick={() => setIsScrapModalOpen(false)} className="p-1.5 rounded-full bg-stone-100 cursor-pointer"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddReview} className="space-y-4">

              <div className="flex gap-2">
                <input type="text" value={storeName} onChange={(e) => { setStoreName(e.target.value); setPlaceId(""); setPlaceUrl(""); setAddress(""); }} required placeholder="가게 이름" className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                <button type="button" onClick={() => { setPlaceSearchTarget('add'); setIsPlaceSearchModalOpen(true); }} className="shrink-0 bg-blue-50 text-blue-600 px-4 rounded-xl font-bold text-xs hover:bg-blue-100 transition-colors whitespace-nowrap cursor-pointer">
                  🔍 카카오맵
                </button>
              </div>
              {placeId && <p className="text-[10px] text-blue-500 font-bold ml-1 -mt-3 flex items-center gap-1"><Check size={12} />카카오맵 장소가 연결되었습니다.</p>}

              <div className="grid grid-cols-2 gap-4">
                <input type="text" value={menu} onChange={(e) => setMenu(e.target.value)} required placeholder="메뉴" className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 text-sm" />
                <div className="flex items-center justify-between bg-stone-50 border border-stone-100 rounded-xl px-3 h-[50px]">{[1, 2, 3, 4, 5].map((s) => <Star key={s} onClick={() => setRating(s)} size={22} className={`cursor-pointer ${rating >= s ? 'text-amber-400 fill-amber-400' : 'text-stone-300'}`} />)}</div>
              </div>
              <CategorySelector value={category} onChange={setCategory} showCustom={showCustomCategory} onToggleCustom={() => setShowCustomCategory(!showCustomCategory)} customValue={customCategory} onCustomChange={setCustomCategory} availableCats={knownCategories} />
              <MultiImagePicker existingUrls={importedUrls} newPreviews={imagePreviews} onSelect={(e: any, t: number) => handleImagesSelect(e, t, setImageFiles, setImagePreviews)} onRemoveExisting={(idx: number) => setImportedUrls(p => p.filter((_, i) => i !== idx))} onRemoveNew={(idx: number) => { setImageFiles(p => p.filter((_, i) => i !== idx)); setImagePreviews(p => p.filter((_, i) => i !== idx)); }} />
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} required placeholder="한줄평" className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 h-24 resize-none text-sm" />
              <button type="submit" disabled={isSubmitting} className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl cursor-pointer">{isSubmitting ? "저장 중..." : "리스트에 저장"}</button>
            </form>
          </div>
        </div>
      )}

      {editingReview && (
        <div className="fixed inset-0 z-[250] flex items-end sm:items-center justify-center" onClick={() => setEditingReview(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5"><h3 className="text-lg font-bold text-stone-800 flex items-center gap-2"><Pencil size={18} className="text-orange-500" /> 맛집 수정</h3><button onClick={() => setEditingReview(null)} className="p-1.5 rounded-full bg-stone-100 cursor-pointer"><X size={18} /></button></div>
            <form onSubmit={handleUpdateReview} className="space-y-4">

              <div className="flex gap-2">
                <input type="text" value={editStoreName} onChange={(e) => { setEditStoreName(e.target.value); setEditPlaceId(""); setEditPlaceUrl(""); setEditAddress(""); }} required className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
                <button type="button" onClick={() => { setPlaceSearchTarget('edit'); setIsPlaceSearchModalOpen(true); }} className="shrink-0 bg-blue-50 text-blue-600 px-4 rounded-xl font-bold text-xs hover:bg-blue-100 transition-colors whitespace-nowrap cursor-pointer">
                  🔍 카카오맵
                </button>
              </div>
              {editPlaceId && <p className="text-[10px] text-blue-500 font-bold ml-1 -mt-3 flex items-center gap-1"><Check size={12} />카카오맵 장소가 연결되었습니다.</p>}

              <div className="grid grid-cols-2 gap-4">
                <input type="text" value={editMenu} onChange={(e) => setEditMenu(e.target.value)} required className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 text-sm" />
                <div className="flex items-center justify-between bg-stone-50 border border-stone-100 rounded-xl px-3 h-[50px]">{[1, 2, 3, 4, 5].map((s) => <Star key={s} onClick={() => setEditRating(s)} size={22} className={`cursor-pointer ${editRating >= s ? 'text-amber-400 fill-amber-400' : 'text-stone-300'}`} />)}</div>
              </div>
              <CategorySelector value={editCategory} onChange={setCategory} showCustom={editShowCustomCategory} onToggleCustom={() => setEditShowCustomCategory(!editShowCustomCategory)} customValue={editCustomCategory} onCustomChange={setCustomCategory} availableCats={knownCategories} />
              <MultiImagePicker existingUrls={editExistingUrls} newPreviews={editImagePreviews} onSelect={(e: any, t: number) => handleImagesSelect(e, t, setEditImageFiles, setEditImagePreviews)} onRemoveExisting={(idx: number) => setEditExistingUrls(p => p.filter((_, i) => i !== idx))} onRemoveNew={(idx: number) => { setEditImageFiles(p => p.filter((_, i) => i !== idx)); setEditImagePreviews(p => p.filter((_, i) => i !== idx)); }} />
              <textarea value={editComment} onChange={(e) => setEditComment(e.target.value)} required className="w-full bg-stone-50 border border-stone-100 rounded-xl py-3 px-4 h-24 resize-none text-sm" />
              <button type="submit" disabled={isUpdating} className="w-full bg-orange-500 text-white font-bold py-3.5 rounded-xl cursor-pointer">{isUpdating ? "저장 중..." : "수정 완료"}</button>
            </form>
          </div>
        </div>
      )}

      {fullScreenData && (
        <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4" onClick={() => setFullScreenData(null)}>
          <button className="absolute top-6 right-6 text-white p-2 rounded-full hover:bg-white/20 cursor-pointer"><X size={24} /></button>
          <img src={fullScreenData.urls[fullScreenData.currentIndex]} className="max-w-full max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}

    </main>
  );
}