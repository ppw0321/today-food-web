import "./globals.css";

export const metadata = {
  title: "오늘 뭐 먹지?",
  description: "나만의 맛집 지도와 메뉴 추천",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* ✅ 안전하게 프리텐다드 폰트 불러오기 */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}