// 집안 형편 테마의 실내 배경 (180×320 도트, 화면에 꽉 차게 키워서 깐다).
//   0 반지하 · 1 원룸 · 2 서민 주택 · 3 아파트 · 4 고급 주택 · 5 빌딩 꼭대기 · 6 금고
// 화면 위쪽(상단 바 뒤)에 잘 보이도록 창문·천장 소품을 위 1/3에, 가구는 아래·양옆에 둔다.
const W = 180;
const H = 320;
const cache = new Map<number, string>();

type C = CanvasRenderingContext2D;
const R = (g: C, x: number, y: number, w: number, h: number, c: string) => {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
const P = (g: C, x: number, y: number, c: string) => R(g, x, y, 1, 1, c);
/** 위→아래 단계 그라데이션 (도트 띠) */
function bands(g: C, x: number, y: number, w: number, h: number, cols: string[]) {
  const n = cols.length;
  for (let i = 0; i < n; i++) R(g, x, y + Math.floor((h * i) / n), w, Math.ceil(h / n) + 1, cols[i]);
}
/** 흩뿌린 점 (얼룩·별·먼지) */
function speckle(g: C, x: number, y: number, w: number, h: number, c: string, n: number, seed: number) {
  let s = seed;
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280;
    const a = s / 233280;
    s = (s * 9301 + 49297) % 233280;
    P(g, x + Math.floor(a * w), y + Math.floor((s / 233280) * h), c);
  }
}
/** 마루: 가로 널빤지 + 이음매 */
function planks(g: C, y: number, c: string, line: string, seam: string) {
  R(g, 0, y, W, H - y, c);
  for (let yy = y + 6; yy < H; yy += 7) R(g, 0, yy, W, 1, line);
  for (let yy = y, k = 0; yy < H; yy += 7, k++) for (let x = (k * 23) % 37; x < W; x += 37) R(g, x, yy, 1, 7, seam);
}
/** 창문 (틀 + 유리 + 십자 창살) */
function windowFrame(g: C, x: number, y: number, w: number, h: number, frame: string, glass: (gx: number, gy: number, gw: number, gh: number) => void, bars = true) {
  R(g, x - 3, y - 3, w + 6, h + 6, frame);
  glass(x, y, w, h);
  if (bars) {
    R(g, x + Math.floor(w / 2), y, 2, h, frame);
    R(g, x, y + Math.floor(h / 2), w, 2, frame);
  }
  R(g, x - 4, y + h + 3, w + 8, 3, frame);
}
/** 도시 야경 (빌딩 실루엣 + 불 켜진 창) */
function skyline(g: C, x: number, y: number, w: number, h: number, sky: string[], bld: string, lit: string, seed: number) {
  bands(g, x, y, w, h, sky);
  let s = seed;
  for (let bx = x; bx < x + w; ) {
    s = (s * 9301 + 49297) % 233280;
    const bw = 6 + Math.floor((s / 233280) * 12);
    s = (s * 9301 + 49297) % 233280;
    const bh = Math.floor(h * (0.3 + (s / 233280) * 0.6));
    R(g, bx, y + h - bh, Math.min(bw, x + w - bx), bh, bld);
    for (let wy = y + h - bh + 3; wy < y + h - 2; wy += 4) for (let wx = bx + 2; wx < Math.min(bx + bw - 1, x + w); wx += 3) if ((wx * 7 + wy * 13 + seed) % 5 < 2) P(g, wx, wy, lit);
    bx += bw + 1;
  }
}

// ───────────────────────── 0 반지하 ─────────────────────────
function banjiha(g: C) {
  bands(g, 0, 0, W, 250, ['#2a3028', '#2e3530', '#333a33', '#363d35', '#394036']);
  // 곰팡이 얼룩·벗겨진 벽지
  for (const [x, y, r] of [[18, 40, 9], [150, 30, 12], [130, 150, 8], [30, 170, 10]] as const)
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy < r * r && (dx * 3 + dy * 5) % 4) P(g, x + dx, y + dy, (dx + dy) % 3 ? '#252b22' : '#3f4a33');
  R(g, 98, 120, 22, 30, '#454b3c');
  R(g, 98, 120, 22, 1, '#20251e');
  R(g, 118, 120, 2, 30, '#20251e');
  speckle(g, 0, 0, W, 250, '#22281f', 260, 3);
  // 천장 가까이 좁은 창: 쇠창살 너머로 행인의 발이 지나간다
  windowFrame(g, 40, 10, 100, 34, '#1a1d18', (x, y, w, h) => {
    bands(g, x, y, w, h, ['#5a6878', '#68788a', '#8a8f86']);
    R(g, x, y + h - 9, w, 9, '#6e6a60'); // 보도블록
    for (let i = x; i < x + w; i += 8) R(g, i, y + h - 9, 1, 9, '#5a564e');
    // 발 두 켤레
    R(g, x + 20, y + 6, 5, 15, '#2c2e3a');
    R(g, x + 18, y + 21, 9, 4, '#141414');
    R(g, x + 30, y + 9, 5, 12, '#2c2e3a');
    R(g, x + 30, y + 21, 9, 4, '#141414');
    R(g, x + 70, y + 4, 4, 17, '#7a3a2a');
    R(g, x + 69, y + 21, 7, 4, '#d8d0c0');
  }, false);
  for (let bx = 44; bx < 140; bx += 9) R(g, bx, 8, 2, 38, '#121410'); // 쇠창살
  // 누수: 물방울 + 양동이
  R(g, 160, 0, 2, 70, '#3a4a4a');
  R(g, 152, 230, 16, 14, '#5a6a7a');
  R(g, 151, 229, 18, 2, '#7a8a9a');
  R(g, 154, 232, 12, 3, '#4a6a8a');
  // 백열전구 한 알
  R(g, 89, 0, 1, 56, '#151515');
  R(g, 87, 56, 5, 6, '#ffe9a0');
  for (let r = 1; r < 26; r += 5) for (let a = 0; a < 40; a++) P(g, 89 + Math.round(Math.cos(a) * r * 1.4), 59 + Math.round(Math.sin(a) * r), 'rgba(255,233,160,0.06)');
  // 바닥: 장판 + 매트리스 + 상자
  bands(g, 0, 250, W, 70, ['#5a4a32', '#524430', '#4a3d2c']);
  for (let x = 0; x < W; x += 30) R(g, x, 250, 1, 70, '#3a3022');
  R(g, 10, 236, 70, 22, '#8a8a7a');
  R(g, 10, 236, 70, 3, '#a8a898');
  R(g, 14, 232, 24, 8, '#c8c0a8'); // 베개
  R(g, 112, 206, 30, 40, '#9a7a4a');
  R(g, 116, 186, 24, 22, '#a8865a');
  R(g, 112, 206, 30, 2, '#7a5a3a');
  R(g, 116, 196, 24, 1, '#7a5a3a');
}

// ───────────────────────── 1 원룸 ─────────────────────────
function oneroom(g: C) {
  bands(g, 0, 0, W, 245, ['#ece8e0', '#e6e2da', '#e0dcd4']);
  for (let x = 6; x < W; x += 12) R(g, x, 0, 1, 245, '#e2ddd3');
  // 창 + 블라인드 + 바깥 원룸촌
  windowFrame(g, 28, 18, 90, 70, '#f8f8f8', (x, y, w, h) => {
    skyline(g, x, y, w, h, ['#8ec4ea', '#a8d2ee', '#c8e2f2'], '#c4b8a8', '#f8f0d0', 7);
  }, true);
  for (let y = 16; y < 58; y += 4) R(g, 25, y, 96, 2, 'rgba(240,240,240,0.92)'); // 반쯤 내린 블라인드
  R(g, 120, 16, 1, 44, '#c0c0c0');
  // 벽걸이 에어컨 대신 작은 벽시계 · 포스트잇
  R(g, 140, 26, 16, 16, '#3a3a3a');
  R(g, 142, 28, 12, 12, '#ffffff');
  R(g, 147, 30, 1, 5, '#222');
  R(g, 147, 34, 4, 1, '#222');
  for (const [x, y, c] of [[134, 60, '#ffe066'], [146, 64, '#9ae0a0'], [158, 58, '#ff9ab0']] as const) R(g, x, y, 9, 8, c);
  // 바닥
  planks(g, 245, '#c8a878', '#b0905e', '#a88858');
  // 싱글 침대
  R(g, 4, 222, 80, 30, '#6a8ac0');
  R(g, 4, 214, 80, 10, '#e8eef8');
  R(g, 6, 206, 26, 12, '#f8f8f8');
  R(g, 4, 252, 80, 6, '#4a5a7a');
  // 책상 + 노트북 + 스탠드
  R(g, 110, 200, 66, 5, '#e0d0b0');
  R(g, 112, 205, 3, 40, '#b0a080');
  R(g, 170, 205, 3, 40, '#b0a080');
  R(g, 126, 188, 26, 12, '#4a4a52');
  R(g, 128, 190, 22, 8, '#8ad0ff');
  R(g, 122, 200, 34, 2, '#6a6a72');
  R(g, 160, 176, 2, 24, '#555');
  R(g, 156, 174, 10, 4, '#f0f0f0');
  // 빨래 건조대
  for (let i = 0; i < 4; i++) R(g, 88 + i * 6, 250, 1, 24, '#b8b8b8');
  R(g, 86, 250, 22, 1, '#b8b8b8');
  R(g, 90, 251, 5, 10, '#ff8aa0');
  R(g, 98, 251, 6, 12, '#7ab0ff');
}

// ───────────────────────── 2 서민 주택 ─────────────────────────
function house(g: C) {
  bands(g, 0, 0, W, 240, ['#e8d8b8', '#e4d2b0', '#dfcca8']);
  for (let y = 4; y < 240; y += 14) for (let x = (y / 14) % 2 ? 0 : 7; x < W; x += 14) {
    P(g, x, y, '#d4bc90');
    P(g, x + 1, y + 1, '#d4bc90');
  }
  R(g, 0, 170, W, 3, '#b08a5a'); // 몰딩
  bands(g, 0, 173, W, 67, ['#cfae80', '#c8a676']); // 아래 징두리
  // 창 + 꽃무늬 커튼 + 화분
  windowFrame(g, 52, 22, 76, 60, '#8a5a3a', (x, y, w, h) => {
    bands(g, x, y, w, h, ['#9ad0f0', '#b8def4', '#d8eef8']);
    R(g, x, y + h - 14, w, 14, '#7ab060');
    R(g, x + 6, y + h - 26, 18, 12, '#d86a4a');
    R(g, x + 4, y + h - 28, 22, 3, '#a84a3a');
    R(g, x + 40, y + h - 30, 22, 16, '#e8e0d0');
    R(g, x + 38, y + h - 33, 26, 4, '#5a6a8a');
  });
  for (const side of [0, 1]) {
    const cx = side ? 128 : 36;
    R(g, cx, 16, 18, 74, '#d86a6a');
    for (let y = 20; y < 88; y += 8) for (let x = cx + 3; x < cx + 16; x += 6) R(g, x, y, 2, 2, '#fff0f0');
  }
  R(g, 30, 14, 120, 3, '#6a4a2a');
  R(g, 84, 86, 12, 10, '#b06a3a');
  R(g, 82, 78, 16, 9, '#4a9a4a');
  // 벽시계 + 가족사진
  R(g, 20, 30, 14, 14, '#7a4a2a');
  R(g, 22, 32, 10, 10, '#f8f0e0');
  R(g, 150, 40, 22, 18, '#a87a4a');
  R(g, 152, 42, 18, 14, '#e8d8c0');
  for (let i = 0; i < 3; i++) R(g, 154 + i * 5, 47, 3, 7, ['#5a3a2a', '#3a2a2a', '#6a4a3a'][i]);
  // 마루 + 소파 + 브라운관 TV
  planks(g, 240, '#a8784a', '#8a6038', '#7a5430');
  R(g, 6, 210, 86, 30, '#8a5a4a');
  R(g, 6, 200, 86, 12, '#9a6a5a');
  R(g, 2, 204, 8, 36, '#7a4a3a');
  R(g, 88, 204, 8, 36, '#7a4a3a');
  R(g, 16, 212, 20, 10, '#e8c890');
  R(g, 120, 214, 54, 26, '#6a4a2a');
  R(g, 126, 182, 42, 32, '#2a2a2a');
  R(g, 130, 186, 30, 24, '#5a8a9a');
  R(g, 162, 190, 4, 4, '#aaa');
  R(g, 140, 176, 2, 6, '#888');
  R(g, 148, 176, 2, 6, '#888');
}

// ───────────────────────── 3 아파트 ─────────────────────────
function apartment(g: C) {
  bands(g, 0, 0, W, 246, ['#f2efe9', '#efebe4', '#ebe7df']);
  R(g, 0, 0, W, 8, '#ffffff');
  for (let x = 30; x < W; x += 60) R(g, x, 3, 10, 2, '#fff8d0'); // 매립등
  // 베란다 통창: 건너편 아파트 단지
  windowFrame(g, 14, 18, 152, 96, '#d8d8d8', (x, y, w, h) => {
    bands(g, x, y, w, h, ['#7ab8e8', '#98c8ee', '#b8daf2', '#d0e6f4']);
    for (let i = 0; i < 5; i++) {
      const bx = x + 4 + i * 30;
      const bh = 50 + (i % 2) * 14;
      R(g, bx, y + h - bh, 24, bh, i % 2 ? '#e8e0d4' : '#f0ece4');
      R(g, bx, y + h - bh, 24, 3, '#c8a878');
      for (let wy = y + h - bh + 6; wy < y + h - 4; wy += 6) for (let wx = bx + 2; wx < bx + 22; wx += 5) R(g, wx, wy, 3, 3, (wx + wy) % 7 ? '#8aa8c8' : '#f8e8b0');
    }
    R(g, x, y + h - 6, w, 6, '#6aa060');
  }, false);
  R(g, 89, 15, 3, 102, '#d8d8d8');
  // 커튼
  R(g, 4, 12, 10, 108, '#e8dccc');
  R(g, 166, 12, 10, 108, '#e8dccc');
  // 스탠드 에어컨 + 대형 TV + 거실장
  R(g, 150, 150, 22, 92, '#f8f8f8');
  R(g, 152, 156, 18, 30, '#e8eef4');
  for (let y = 192; y < 236; y += 3) R(g, 153, y, 16, 1, '#d0d6dc');
  R(g, 160, 160, 2, 2, '#40c0ff');
  R(g, 40, 140, 96, 52, '#141418');
  R(g, 42, 142, 92, 48, '#2a3a5a');
  bands(g, 42, 142, 92, 48, ['#2a4a7a', '#3a6aa0', '#5a8ac0']);
  R(g, 36, 212, 104, 18, '#d8c8b0');
  R(g, 36, 212, 104, 2, '#b8a890');
  // 마루 + 러그 + 화분 + 소파 등받이
  planks(g, 246, '#d8b888', '#c4a274', '#bc9a6c');
  R(g, 20, 266, 140, 40, '#c8c0d8');
  R(g, 24, 270, 132, 32, '#d8d0e6');
  R(g, 4, 196, 16, 50, '#e8e8e8');
  R(g, 6, 176, 12, 22, '#4a9a5a');
  R(g, 2, 182, 8, 10, '#5aaa6a');
  R(g, 0, 292, W, 28, '#8a8aa0');
  R(g, 0, 288, W, 6, '#9a9ab0');
}

// ───────────────────────── 4 고급 주택 ─────────────────────────
function mansion(g: C) {
  bands(g, 0, 0, W, 236, ['#3a2a24', '#4a342a', '#56402e']);
  // 웨인스코팅 패널
  for (let x = 6; x < W; x += 30) {
    R(g, x, 150, 24, 80, '#5e4632');
    R(g, x + 2, 152, 20, 76, '#4a3626');
  }
  R(g, 0, 146, W, 4, '#c8a050');
  // 아치형 대형 창: 정원과 분수
  for (const ox of [16, 112]) {
    R(g, ox - 3, 22, 58, 100, '#e8d8b0');
    bands(g, ox, 40, 52, 82, ['#7ab0d8', '#98c4e0', '#b0d6c0', '#78b068']);
    for (let i = 0; i < 26; i++) R(g, ox + 26 - i, 22 + Math.round(18 - Math.sqrt(Math.max(0, 26 * 26 - i * i)) * 0.7), i * 2, 1, '#e8d8b0');
    R(g, ox + 24, 90, 4, 22, '#d8e8f8');
    R(g, ox + 16, 110, 20, 6, '#c8c8c8');
    R(g, ox + 25, 40, 2, 82, '#e8d8b0');
  }
  // 샹들리에
  R(g, 89, 0, 2, 22, '#c8a050');
  R(g, 72, 22, 36, 4, '#e8c060');
  for (let i = 0; i < 7; i++) {
    R(g, 74 + i * 5, 26, 2, 8 + (i % 2) * 4, '#f8e8a0');
    P(g, 74 + i * 5, 35 + (i % 2) * 4, '#ffffff');
  }
  for (let r = 4; r < 34; r += 6) for (let a = 0; a < 60; a++) P(g, 90 + Math.round(Math.cos(a) * r * 1.3), 28 + Math.round(Math.sin(a) * r), 'rgba(255,230,150,0.07)');
  // 벽난로 + 유화
  R(g, 66, 150, 48, 80, '#d8ccb8');
  R(g, 74, 172, 32, 58, '#1a1210');
  R(g, 80, 214, 20, 8, '#ff8a30');
  R(g, 84, 206, 12, 10, '#ffc040');
  R(g, 62, 146, 56, 6, '#e8dcc8');
  R(g, 70, 96, 40, 44, '#c8a050');
  bands(g, 73, 99, 34, 38, ['#3a5a7a', '#5a7a5a', '#8a6a3a']);
  // 대리석 바닥 + 그랜드 피아노
  for (let y = 236; y < H; y += 12) for (let x = ((y / 12) % 2) * 12; x < W; x += 24) {
    R(g, x, y, 12, 12, '#e8e4dc');
    R(g, x + 12, y, 12, 12, '#d0ccc4');
  }
  R(g, 118, 226, 56, 18, '#121212');
  R(g, 122, 216, 48, 12, '#1a1a1a');
  R(g, 124, 226, 40, 3, '#f8f8f8');
  for (let k = 126; k < 162; k += 4) R(g, k, 226, 2, 2, '#121212');
  R(g, 122, 244, 3, 20, '#121212');
  R(g, 166, 244, 3, 20, '#121212');
}

// ───────────────────────── 5 빌딩 꼭대기 (회장실) ─────────────────────────
function penthouse(g: C) {
  R(g, 0, 0, W, H, '#0c1020');
  // 통유리: 야경 (창틀 기둥)
  skyline(g, 0, 0, W, 210, ['#0a1030', '#121a40', '#1a2450', '#24305a', '#2e3a64'], '#141a2e', '#ffd88a', 21);
  for (let i = 0; i < 30; i++) P(g, (i * 37) % W, (i * 23) % 60, '#ffffff');
  for (let x = 0; x < W; x += 45) R(g, x, 0, 3, 210, '#2a2e3a');
  R(g, 0, 0, W, 4, '#3a3e4a');
  // 반사광 사선
  for (let i = 0; i < 40; i++) P(g, 20 + i, 30 + i * 2, 'rgba(255,255,255,0.08)');
  // 바닥: 검은 대리석 + 반사
  bands(g, 0, 210, W, 110, ['#1a1a22', '#16161e', '#121218']);
  for (let y = 214; y < H; y += 16) R(g, 0, y, W, 1, '#24242e');
  for (let x = 0; x < W; x += 6) R(g, x, 212 + ((x * 7) % 9), 2, 1, '#3a3020');
  // 회장 책상 + 가죽 의자 + 트로피 진열장
  R(g, 40, 224, 100, 8, '#5a3a24');
  R(g, 44, 232, 92, 40, '#4a2e1c');
  R(g, 44, 232, 92, 2, '#c8a050');
  R(g, 74, 214, 32, 10, '#141414');
  R(g, 76, 216, 28, 6, '#2a4a7a');
  R(g, 80, 186, 20, 34, '#2a1a12');
  R(g, 78, 184, 24, 6, '#3a241a');
  R(g, 4, 140, 30, 132, '#2a2018');
  for (let y = 150; y < 268; y += 24) R(g, 6, y, 26, 2, '#c8a050');
  for (const [x, y] of [[10, 136], [20, 160], [10, 184], [22, 208]] as const) {
    R(g, x, y + 6, 6, 6, '#f0c040');
    R(g, x + 1, y + 12, 4, 4, '#c08a20');
  }
  R(g, 146, 150, 30, 120, '#2a2018');
  for (let y = 154; y < 268; y += 12) for (let x = 148; x < 174; x += 4) R(g, x, y, 3, 10, ['#7a2a2a', '#2a4a7a', '#3a6a3a', '#c8a050'][(x + y) % 4]);
}

// ───────────────────────── 6 금고 ─────────────────────────
function vault(g: C) {
  bands(g, 0, 0, W, H, ['#1a1610', '#221c12', '#2a2214', '#1a1610']);
  // 강철 벽 리벳
  for (let y = 0; y < H; y += 20) R(g, 0, y, W, 1, '#3a3020');
  for (let y = 10; y < H; y += 20) for (let x = 6; x < W; x += 20) P(g, x, y, '#6a5a3a');
  // 둥근 금고문 (위쪽 가운데)
  const cx = 90;
  const cy = 64;
  for (let r = 50; r >= 0; r--) {
    const c = r > 46 ? '#5a5a62' : r > 42 ? '#8a8a92' : r > 38 ? '#6a6a72' : r > 12 ? '#7a7a82' : '#9a9aa2';
    for (let a = 0; a < 360; a += 1) P(g, cx + Math.round(Math.cos((a * Math.PI) / 180) * r), cy + Math.round(Math.sin((a * Math.PI) / 180) * r * 0.95), c);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    R(g, cx + Math.cos(a) * 26 - 2, cy + Math.sin(a) * 26 - 2, 5, 5, '#c8c8d0');
  }
  R(g, cx - 2, cy - 22, 4, 44, '#b8b8c0');
  R(g, cx - 22, cy - 2, 44, 4, '#b8b8c0');
  // 금괴 피라미드
  const bar = (x: number, y: number) => {
    R(g, x, y, 14, 6, '#e8b830');
    R(g, x + 1, y, 12, 2, '#fff0a0');
    R(g, x, y + 5, 14, 1, '#a07810');
    R(g, x + 13, y, 1, 6, '#b88a18');
  };
  for (const [ox, rows] of [[4, 7], [104, 7]] as const)
    for (let r = 0; r < rows; r++) for (let i = 0; i <= rows - 1 - r; i++) bar(ox + i * 10 + r * 5, 290 - r * 6);
  // 선반 위 금괴·금화 자루
  for (const sy of [140, 186]) {
    R(g, 6, sy + 12, 60, 3, '#5a4a30');
    R(g, 114, sy + 12, 60, 3, '#5a4a30');
    for (let i = 0; i < 4; i++) {
      bar(8 + i * 14, sy + 6);
      bar(116 + i * 14, sy + 6);
    }
  }
  for (const [x, y] of [[70, 262], [92, 270]] as const) {
    R(g, x, y, 18, 18, '#a87a3a');
    R(g, x + 5, y - 4, 8, 5, '#8a5a2a');
    R(g, x + 4, y + 6, 10, 6, '#f0c040');
  }
  speckle(g, 0, 240, W, 80, '#fff4b0', 60, 9);
  // 스포트라이트
  for (const sx of [40, 140]) for (let y = 0; y < 300; y += 2) R(g, sx - y / 8, y, y / 4, 1, 'rgba(255,230,150,0.035)');
}

const DRAW = [banjiha, oneroom, house, apartment, mansion, penthouse, vault];

/** 실내 배경 data URL (tier 0~6) */
export function roomURL(tier: number): string {
  const t = Math.max(0, Math.min(6, tier));
  const hit = cache.get(t);
  if (hit) return hit;
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  DRAW[t](g);
  const url = c.toDataURL();
  cache.set(t, url);
  return url;
}
