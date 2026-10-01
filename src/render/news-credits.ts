// 뉴스 실제 사진 (src/assets/news/<사건 id 또는 장면>.webp): 사진 설명과 출처.
// 공개 저작물만 쓴다 — 퍼블릭 도메인·CC0·CC BY·CC BY-SA·공공누리 제1유형(위키미디어 공용에서 내려받음).
// 출처 표기는 라이선스 조건이다. 파일 원본: 아래 file 이름으로 commons.wikimedia.org 에서 찾을 수 있다.
export const NEWS_CREDITS: Record<string, { cap?: string; credit: string; file?: string }> = {
  hist_h1026: { cap: "▲ 고(故) 박정희 대통령", credit: "작자 미상 · Public domain · 위키미디어 공용", file: "File:Park Chung-hee (cropped).jpg" },
  hist_h419: { cap: "▲ 1960년 4월 19일, 독재에 항의하는 시민들", credit: "한국정책방송원 (KTV) · KOGL Type 1 · 위키미디어 공용", file: "File:4월 19일 독재에 항의하는 시민들의 규탄집회.jpg" },
  hist_h516: { cap: "▲ 1961년 5월 16일, 서울 시내에 나선 박정희 소장(가운데)", credit: "작자 미상 · Public domain · 위키미디어 공용", file: "File:5.16 Coup Park Chung-hee.jpg" },
};
