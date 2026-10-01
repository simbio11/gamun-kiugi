// 뉴스·신문·속보에 실리는 "보도사진" (120×72 도트).
//   근현대사 큰 사건마다 그 장면을 대표하는 구도(초상·광장의 인파·탱크·올림픽 성화·붉은 응원 물결…),
//   그 밖의 뉴스는 글의 낱말로 고른다. 매체에 따라 화면에서 흑백 망점(호외)·컬러(TV·포털)로 보인다.
// 실제 보도사진은 저작권·초상권 문제가 있어 쓰지 않고, 그 장면을 도트로 다시 그린다.
const W = 120;
const H = 72;
const cache = new Map<string, string>();
type C = CanvasRenderingContext2D;
const R = (g: C, x: number, y: number, w: number, h: number, c: string) => {
  g.fillStyle = c;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
const P = (g: C, x: number, y: number, c: string) => R(g, x, y, 1, 1, c);
function bands(g: C, x: number, y: number, w: number, h: number, cols: string[]) {
  cols.forEach((c, i) => R(g, x, y + Math.floor((h * i) / cols.length), w, Math.ceil(h / cols.length) + 1, c));
}
let seed = 1;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

/** 군중: 머리 점들이 겹겹이 (뒤로 갈수록 작고 어둡게) */
function crowd(g: C, y0: number, rows: number, cloth: string[], skin = '#e8c8a0', hair = '#1a1414') {
  for (let r = 0; r < rows; r++) {
    const y = y0 + r * 5;
    for (let x = -2; x < W; x += 4 + (r % 2)) {
      const c = cloth[Math.floor(rnd() * cloth.length)];
      R(g, x, y + 3, 4, 8, c);
      R(g, x + 1, y, 3, 3, rnd() < 0.15 ? skin : hair);
    }
  }
}
/** 플래카드·피켓 */
function placard(g: C, x: number, y: number, w: number, h: number, bg: string, ink: string) {
  R(g, x + w / 2 - 0.5, y + h, 1, 8, '#6a4a2a');
  R(g, x, y, w, h, bg);
  for (let i = 2; i < w - 2; i += 3) R(g, x + i, y + 2 + ((i * 7) % 3), 2, h - 5, ink);
}
/** 초상 (정장·근조 리본·선글라스) */
function portrait(g: C, o: { suit: string; tie: string; glasses?: boolean; mourning?: boolean; uniform?: boolean; bg: string[] }) {
  bands(g, 0, 0, W, H, o.bg);
  const cx = 60;
  // 액자
  R(g, cx - 26, 4, 52, 66, o.mourning ? '#141414' : '#8a6a3a');
  bands(g, cx - 23, 7, 46, 60, ['#bcb8b0', '#a8a49c', '#9a968e']);
  // 어깨·옷
  R(g, cx - 20, 48, 40, 19, o.suit);
  R(g, cx - 6, 48, 12, 12, '#f0f0f0');
  R(g, cx - 2, 49, 4, 14, o.tie);
  if (o.uniform) {
    R(g, cx - 20, 48, 40, 19, '#4a5a3a');
    R(g, cx - 18, 50, 6, 3, '#d8b040');
    R(g, cx + 12, 50, 6, 3, '#d8b040');
    R(g, cx - 6, 48, 12, 5, '#3a4a2a');
  }
  // 목·얼굴
  R(g, cx - 4, 42, 8, 7, '#d8b090');
  R(g, cx - 10, 20, 20, 24, '#e0b896');
  R(g, cx - 10, 40, 20, 4, '#c89c7a');
  // 머리 (짧은 포마드)
  R(g, cx - 11, 14, 22, 8, '#1a1612');
  R(g, cx - 11, 20, 3, 8, '#1a1612');
  R(g, cx + 8, 20, 3, 8, '#1a1612');
  if (o.uniform) {
    R(g, cx - 13, 12, 26, 6, '#4a5a3a');
    R(g, cx - 14, 17, 28, 2, '#2a3a1a');
    R(g, cx - 2, 13, 4, 3, '#d8b040');
  }
  // 눈·눈썹·입
  if (o.glasses) {
    R(g, cx - 9, 27, 8, 5, '#101010');
    R(g, cx + 1, 27, 8, 5, '#101010');
    R(g, cx - 1, 28, 2, 1, '#101010');
    P(g, cx - 7, 28, '#5a5a6a');
    P(g, cx + 3, 28, '#5a5a6a');
  } else {
    R(g, cx - 8, 26, 6, 1, '#2a1a12');
    R(g, cx + 2, 26, 6, 1, '#2a1a12');
    R(g, cx - 7, 29, 3, 2, '#2a1a12');
    R(g, cx + 4, 29, 3, 2, '#2a1a12');
  }
  R(g, cx - 1, 31, 2, 5, '#c89c7a');
  R(g, cx - 4, 38, 8, 1, '#8a4a3a');
  if (o.mourning) {
    // 근조 리본 (액자 위 모서리 검은 띠)
    for (let i = 0; i < 14; i++) R(g, cx + 12 + i, 4 + i, 4, 2, '#000');
    for (let i = 0; i < 14; i++) R(g, cx - 26 + i, 17 - i, 4, 2, '#000');
    // 국화
    for (const fx of [cx - 34, cx + 30]) for (let k = 0; k < 4; k++) {
      R(g, fx, 50 + k * 5, 5, 4, '#f4f4f0');
      P(g, fx + 2, 51 + k * 5, '#e8d870');
    }
  }
}
/** 탱크·장갑차 */
function tank(g: C, x: number, y: number, c = '#4a5a3a') {
  R(g, x, y + 6, 30, 8, c);
  R(g, x + 6, y, 14, 7, c);
  R(g, x + 19, y + 2, 16, 2, c);
  R(g, x - 1, y + 13, 32, 4, '#2a2a2a');
  for (let i = 1; i < 30; i += 5) R(g, x + i, y + 14, 3, 2, '#5a5a5a');
}
/** 건물 실루엣 */
function city(g: C, y: number, c: string, lit?: string) {
  for (let x = 0; x < W; ) {
    const w = 8 + Math.floor(rnd() * 14);
    const h = 10 + Math.floor(rnd() * 28);
    R(g, x, y - h, w, h, c);
    if (lit) for (let wy = y - h + 3; wy < y - 2; wy += 4) for (let wx = x + 2; wx < x + w - 1; wx += 3) if (rnd() < 0.4) P(g, wx, wy, lit);
    x += w + 1;
  }
}

const SCENES: Record<string, (g: C) => void> = {
  // 1961·1979: 초상
  park516: (g) => portrait(g, { suit: '#4a5a3a', tie: '#3a4a2a', glasses: true, uniform: true, bg: ['#8a9aa8', '#7a8a98'] }),
  park1026: (g) => portrait(g, { suit: '#1a1a22', tie: '#2a2a3a', mourning: true, bg: ['#f0eee8', '#e0ded8'] }),
  // 4·19 · 6·10: 거리의 학생·시민, 피켓
  protest: (g) => {
    bands(g, 0, 0, W, H, ['#a8b8c8', '#b8c4d0']);
    city(g, 34, '#7a8090');
    for (let i = 0; i < 6; i++) R(g, 10 + i * 18, 4 + (i % 2) * 4, 22, 20, 'rgba(230,230,230,0.35)'); // 최루탄 연기
    crowd(g, 30, 9, ['#2a2a3a', '#f0f0f0', '#3a3a4a', '#4a4a5a']);
    placard(g, 14, 14, 20, 9, '#f8f8f0', '#c02020');
    placard(g, 52, 10, 24, 10, '#f8f8f0', '#101010');
    placard(g, 88, 15, 18, 9, '#f8f8f0', '#c02020');
  },
  // 5·18 · 12·3: 장갑차·계엄군
  martial: (g) => {
    bands(g, 0, 0, W, H, ['#6a7480', '#7a8490', '#8a8e90']);
    city(g, 40, '#4a5058');
    R(g, 0, 40, W, 32, '#5a5a5a');
    tank(g, 10, 36);
    tank(g, 70, 40, '#3a4a2a');
    for (let i = 0; i < 10; i++) {
      const x = 44 + i * 3;
      R(g, x, 50, 2, 8, '#3a4a2a');
      R(g, x, 48, 2, 2, '#2a3a1a');
    }
    crowd(g, 58, 3, ['#2a2a3a', '#5a4a3a', '#1a1a2a']);
  },
  assembly: (g) => {
    bands(g, 0, 0, W, H, ['#0a0e1e', '#141a30', '#1c2440']);
    // 국회 돔
    R(g, 30, 22, 60, 22, '#c8c8c0');
    for (let i = 0; i < 20; i++) R(g, 40 + i, 22 - Math.round(Math.sqrt(400 - (i - 10) * (i - 10)) * 0.8), 40 - i * 2 > 0 ? 40 - i * 2 : 1, 1, '#8aa0a0');
    R(g, 40, 6, 40, 16, '#7a9a98');
    for (let x = 32; x < 90; x += 6) R(g, x, 26, 3, 18, '#e8e8e0');
    tank(g, 44, 48, '#3a4a3a');
    crowd(g, 54, 4, ['#1a1a2a', '#2a2a3a', '#3a3a4a']);
    for (let i = 0; i < 12; i++) P(g, 5 + i * 10, 56 + (i % 3), '#fff4a0'); // 휴대폰 불빛
  },
  // 화폐개혁·금융실명제
  money: (g) => {
    bands(g, 0, 0, W, H, ['#e8e0c8', '#d8d0b8']);
    R(g, 0, 44, W, 28, '#8a6a4a');
    R(g, 0, 44, W, 3, '#6a4a2a');
    for (let i = 0; i < 6; i++) {
      const x = 8 + i * 18;
      R(g, x, 18 + (i % 2) * 6, 26, 13, '#c8b880');
      R(g, x + 2, 20 + (i % 2) * 6, 22, 9, '#a89860');
      R(g, x + 15, 21 + (i % 2) * 6, 7, 7, '#e8dca8');
    }
    crowd(g, 52, 3, ['#3a3a4a', '#5a4a3a', '#2a2a3a']);
  },
  // 파독·월남·중동: 공항·부두 환송
  depart: (g) => {
    bands(g, 0, 0, W, H, ['#9ac8e8', '#b8d8ee', '#d0e4f0']);
    R(g, 0, 46, W, 26, '#7a7a7a');
    // 비행기
    R(g, 20, 26, 70, 10, '#e8e8f0');
    R(g, 84, 22, 10, 10, '#e8e8f0');
    R(g, 44, 18, 14, 26, '#d8d8e0');
    for (let x = 26; x < 82; x += 5) R(g, x, 29, 3, 3, '#3a5a8a');
    R(g, 30, 36, 2, 10, '#aaaaaa');
    R(g, 60, 36, 2, 10, '#aaaaaa');
    crowd(g, 50, 4, ['#3a3a4a', '#f0f0f0', '#4a5a3a', '#5a4a3a']);
    for (let i = 0; i < 8; i++) R(g, 8 + i * 14, 46, 2, 3, '#f8f8f8'); // 흔드는 손수건
  },
  // 1·21: 청와대 지붕
  bluehouse: (g) => {
    bands(g, 0, 0, W, H, ['#1a2238', '#222c48']);
    R(g, 16, 30, 88, 8, '#3a6aa8');
    R(g, 10, 26, 100, 5, '#2a5a98');
    R(g, 22, 38, 76, 18, '#e8e4d8');
    for (let x = 26; x < 96; x += 7) R(g, x, 40, 3, 16, '#c8c0b0');
    R(g, 0, 56, W, 16, '#2a3a2a');
    for (let i = 0; i < 8; i++) {
      R(g, 6 + i * 15, 52, 3, 10, '#4a5a3a');
      R(g, 6 + i * 15, 50, 3, 2, '#3a4a2a');
    }
    for (let i = 0; i < 3; i++) R(g, 20 + i * 40, 0, 1, 30, 'rgba(255,255,220,0.25)'); // 서치라이트
  },
  saemaul: (g) => {
    bands(g, 0, 0, W, H, ['#9ad0f0', '#c0e0f0']);
    R(g, 0, 40, W, 32, '#7ab050');
    for (let i = 0; i < 4; i++) {
      R(g, 10 + i * 28, 24, 20, 16, '#e8e0d0');
      R(g, 8 + i * 28, 20, 24, 5, ['#d84a3a', '#3a7ad8', '#e8a030', '#4aa860'][i]);
    }
    R(g, 100, 6, 1, 30, '#6a4a2a');
    R(g, 101, 6, 14, 9, '#f8f8f8');
    R(g, 105, 8, 6, 5, '#3a9a3a');
    crowd(g, 54, 2, ['#e8e0d0', '#6a6a7a', '#c8b890']);
  },
  // 강남 땅·신도시·영끌: 크레인과 아파트
  land: (g) => {
    bands(g, 0, 0, W, H, ['#a8c8e0', '#c8dcea']);
    R(g, 0, 54, W, 18, '#a88a5a');
    for (let i = 0; i < 5; i++) {
      const x = 4 + i * 24;
      const h = 22 + (i % 3) * 8;
      R(g, x, 54 - h, 18, h, '#e8e4dc');
      for (let wy = 54 - h + 3; wy < 52; wy += 4) for (let wx = x + 2; wx < x + 16; wx += 4) R(g, wx, wy, 2, 2, '#8aa0b8');
    }
    R(g, 96, 4, 2, 50, '#e8b830');
    R(g, 70, 4, 46, 2, '#e8b830');
    R(g, 74, 6, 1, 14, '#5a5a5a');
  },
  oil: (g) => {
    bands(g, 0, 0, W, H, ['#d8c8a8', '#c8b898']);
    R(g, 70, 20, 44, 6, '#c03030');
    R(g, 74, 26, 4, 30, '#e8e8e8');
    R(g, 104, 26, 4, 30, '#e8e8e8');
    R(g, 84, 34, 10, 20, '#d84040');
    R(g, 0, 56, W, 16, '#6a6a6a');
    for (let i = 0; i < 6; i++) {
      R(g, 4 + i * 12, 48, 10, 6, ['#3a5a8a', '#8a3a3a', '#e8e0d0', '#3a3a3a'][i % 4]);
      R(g, 6 + i * 12, 54, 2, 2, '#1a1a1a');
      R(g, 11 + i * 12, 54, 2, 2, '#1a1a1a');
    }
  },
  school: (g) => {
    bands(g, 0, 0, W, H, ['#e8e0c8', '#d8d0b8']);
    R(g, 10, 6, 100, 30, '#2a4a3a');
    R(g, 10, 36, 100, 3, '#8a6a3a');
    for (let i = 0; i < 4; i++) R(g, 18 + i * 22, 14, 14, 1, '#e8e8e8');
    R(g, 40, 22, 40, 6, '#f8f8f8');
    for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) {
      R(g, 6 + i * 19, 46 + r * 12, 14, 4, '#a87a4a');
      R(g, 9 + i * 19, 40 + r * 12, 6, 6, '#1a1a2a');
    }
  },
  tvfamily: (g) => {
    bands(g, 0, 0, W, H, ['#3a3a4a', '#2a2a3a']);
    R(g, 20, 6, 80, 50, '#1a1a1a');
    bands(g, 24, 10, 72, 42, ['#5a7a9a', '#4a6a8a']);
    for (let i = 0; i < 4; i++) {
      R(g, 28 + i * 17, 20, 14, 26, '#f0ece0');
      for (let k = 0; k < 5; k++) R(g, 30 + i * 17, 23 + k * 4, 10, 1, '#2a2a2a');
    }
    R(g, 54, 56, 12, 6, '#1a1a1a');
    crowd(g, 60, 2, ['#5a4a3a', '#3a3a4a'], '#e8c8a0', '#d8d8d8');
  },
  olympic: (g) => {
    bands(g, 0, 0, W, H, ['#5aa0e0', '#80b8e8']);
    R(g, 0, 40, W, 32, '#c84a3a');
    for (let r = 0; r < 4; r++) for (let x = 0; x < W; x += 2) P(g, x, 42 + r * 6 + (x % 4 === 0 ? 1 : 0), ['#f0f0f0', '#e8c840', '#3a6ad8', '#2a2a2a'][(x + r) % 4]);
    const rc = ['#3a6ad8', '#1a1a1a', '#d83a3a', '#e8c030', '#3aa860'];
    rc.forEach((c, i) => {
      const cx = 36 + i * 12;
      const cy = 14 + (i % 2) * 6;
      for (let a = 0; a < 32; a++) P(g, cx + Math.round(Math.cos(a / 5) * 5), cy + Math.round(Math.sin(a / 5) * 5), c);
    });
    R(g, 104, 22, 4, 18, '#c8c8c8');
    R(g, 102, 16, 8, 6, '#ff8a20');
    R(g, 104, 12, 4, 5, '#ffd040');
  },
  crash: (g) => {
    bands(g, 0, 0, W, H, ['#101820', '#18202a']);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 6; c++) {
      R(g, 4 + c * 19, 4 + r * 8, 17, 6, '#0a1018');
      R(g, 6 + c * 19, 6 + r * 8, 10, 2, (r + c) % 3 ? '#3080ff' : '#ff3030');
    }
    for (let i = 0; i < 40; i++) R(g, 10 + i * 2.5, 10 + i * 1.2 + (i % 3), 3, 3, '#ff3030');
    crowd(g, 58, 2, ['#2a2a3a', '#3a3a4a', '#1a1a2a']);
  },
  redsea: (g) => {
    bands(g, 0, 0, W, H, ['#1a2a5a', '#2a3a6a']);
    for (let i = 0; i < 20; i++) P(g, (i * 37) % W, (i * 11) % 20, '#fff4b0');
    crowd(g, 18, 11, ['#d82020', '#e83030', '#c01818', '#f0f0f0'], '#e8c8a0', '#1a1414');
    R(g, 40, 10, 40, 12, '#f8f8f8');
    R(g, 54, 12, 12, 8, '#d82020');
    P(g, 59, 15, '#2050c0');
  },
  cards: (g) => {
    bands(g, 0, 0, W, H, ['#e8e8e0', '#d8d8d0']);
    for (let i = 0; i < 7; i++) {
      const x = 8 + i * 15;
      R(g, x, 18 + (i % 3) * 8, 22, 14, ['#3a6ad8', '#d8a030', '#2a2a2a', '#c03a3a'][i % 4]);
      R(g, x + 3, 22 + (i % 3) * 8, 6, 4, '#e8d070');
      R(g, x + 12, 18 + (i % 3) * 8, 2, 14, '#e8e8e0'); // 가위로 자른 금
    }
    R(g, 90, 46, 20, 3, '#8a8a8a');
    R(g, 88, 48, 6, 6, '#3a3a3a');
  },
  ribbon: (g) => {
    bands(g, 0, 0, W, H, ['#2a3a4a', '#3a4a5a', '#5a6a7a']);
    R(g, 0, 50, W, 22, '#3a5a7a');
    for (let x = 0; x < W; x += 6) R(g, x, 52 + (x % 12 ? 0 : 2), 4, 1, '#8aa0b8');
    // 노란 리본
    const cx = 60;
    R(g, cx - 3, 14, 6, 6, '#f0c020');
    for (let i = 0; i < 10; i++) {
      R(g, cx - 4 - i, 14 - i * 0.6, 4, 4, '#f0c020');
      R(g, cx + i, 14 - i * 0.6, 4, 4, '#f0c020');
      R(g, cx - 3 - i * 0.8, 20 + i * 2, 4, 3, '#f0c020');
      R(g, cx + i * 0.8, 20 + i * 2, 4, 3, '#f0c020');
    }
  },
  candle: (g) => {
    bands(g, 0, 0, W, H, ['#060a18', '#0c1224']);
    city(g, 26, '#141a2c', '#3a3a20');
    for (let r = 0; r < 9; r++) for (let x = (r % 2) * 3; x < W; x += 6) {
      R(g, x, 28 + r * 5, 4, 5, '#1a1a2a');
      P(g, x + 1, 26 + r * 5, '#ffd060');
      P(g, x + 1, 25 + r * 5, '#fff0a0');
    }
  },
  covid: (g) => {
    bands(g, 0, 0, W, H, ['#e0e8ee', '#d0d8e0']);
    R(g, 0, 50, W, 22, '#9aa0a8');
    for (let i = 0; i < 6; i++) {
      const x = 6 + i * 20;
      R(g, x, 26, 8, 22, ['#3a4a6a', '#6a4a3a', '#2a2a2a'][i % 3]);
      R(g, x + 1, 18, 6, 8, '#e8c8a0');
      R(g, x + 1, 22, 6, 3, '#f8f8f8');
      R(g, x, 17, 8, 3, '#1a1414');
      R(g, x + 9, 48, 6, 1, '#e8d040'); // 거리두기 선
    }
  },
  // 미래 뉴스용
  space: (g) => {
    bands(g, 0, 0, W, H, ['#05060f', '#0a0c1e']);
    for (let i = 0; i < 40; i++) P(g, (i * 41) % W, (i * 17) % H, '#ffffff');
    R(g, 78, 30, 30, 30, '#c84a2a');
    R(g, 82, 34, 8, 6, '#a83a1a');
    R(g, 30, 10, 6, 40, '#e8e8f0');
    R(g, 31, 6, 4, 5, '#c03030');
    R(g, 28, 46, 10, 4, '#a0a0a8');
    R(g, 30, 50, 6, 10, '#ff9a30');
    R(g, 31, 58, 4, 6, '#ffe060');
  },
  robot: (g) => {
    bands(g, 0, 0, W, H, ['#d8e0e8', '#c0c8d0']);
    for (let i = 0; i < 3; i++) {
      const x = 14 + i * 36;
      R(g, x, 20, 18, 26, '#e8ecf0');
      R(g, x + 3, 8, 12, 12, '#f0f4f8');
      R(g, x + 5, 12, 3, 3, '#30c0ff');
      R(g, x + 10, 12, 3, 3, '#30c0ff');
      R(g, x + 2, 46, 5, 16, '#a0a8b0');
      R(g, x + 11, 46, 5, 16, '#a0a8b0');
    }
  },
  ai: (g) => {
    bands(g, 0, 0, W, H, ['#0a1420', '#10202e']);
    for (let i = 0; i < 30; i++) {
      const x = (i * 29) % W;
      const y = (i * 13) % H;
      R(g, x, y, 1, 6, '#2a8aff');
      P(g, x, y, '#a0e0ff');
    }
    for (let a = 0; a < 60; a++) P(g, 60 + Math.round(Math.cos(a / 9.5) * 20), 36 + Math.round(Math.sin(a / 9.5) * 20), '#40c0ff');
    R(g, 54, 30, 12, 12, '#40c0ff');
  },
  climate: (g) => {
    bands(g, 0, 0, W, H, ['#e89048', '#f0b060', '#f8d090']);
    R(g, 0, 48, W, 24, '#3a6a9a');
    city(g, 52, '#6a5a50');
    for (let x = 0; x < W; x += 5) R(g, x, 48 + (x % 10 ? 1 : 0), 4, 1, '#8ac0e8');
  },
};

/** 근현대사 큰 사건 → 장면 */
const BY_EVENT: Record<string, string> = {
  hist_h419: 'protest', hist_h516: 'park516', hist_hmoney: 'money', hist_hgermany: 'depart', hist_hvietnam: 'depart', hist_h121: 'bluehouse',
  hist_hsaemaul: 'saemaul', hist_hgangnam: 'land', hist_hoil: 'oil', hist_hmideast: 'depart', hist_h1026: 'park1026', hist_h518: 'martial',
  hist_h730: 'school', hist_hfamily83: 'tvfamily', hist_h610: 'protest', hist_h88: 'olympic', hist_hnewtown: 'land', hist_hrealname: 'money',
  hist_himf: 'crash', hist_hdotcom: 'crash', hist_hworldcup: 'redsea', hist_hcard: 'cards', hist_hlehman: 'crash', hist_hsewol: 'ribbon',
  hist_hcandle: 'candle', hist_hcovid: 'covid', hist_hyoungkkeul: 'land', hist_h1203: 'assembly',
};
/** 사진 설명 (호외·신문 캡션) */
export const CAPTION: Record<string, string> = {
  park516: '▲ 군사혁명위원회 박정희 소장',
  park1026: '▲ 고(故) 박정희 대통령 영정',
  protest: '▲ 거리로 나선 학생·시민들',
  martial: '▲ 시내에 진주한 계엄군 장갑차',
  assembly: '▲ 국회 앞, 장갑차를 막아선 시민들',
  money: '▲ 은행 창구에 몰린 시민들',
  depart: '▲ 가족들의 환송 속에 떠나는 사람들',
  bluehouse: '▲ 경계가 강화된 청와대',
  saemaul: '▲ 새마을 깃발이 걸린 마을',
  land: '▲ 허허벌판에 올라가는 아파트',
  oil: '▲ 주유소 앞에 늘어선 차량 행렬',
  school: '▲ 과외가 사라진 교실',
  tvfamily: '▲ 이산가족을 찾는 생방송 화면',
  olympic: '▲ 잠실 주경기장의 오륜기와 성화',
  crash: '▲ 객장 시세판이 온통 파랗게(하락) 물들었다',
  redsea: '▲ 광장을 가득 메운 붉은 응원 물결',
  cards: '▲ 잘려 나간 신용카드들',
  ribbon: '▲ 전국에 걸린 노란 리본',
  candle: '▲ 광화문을 밝힌 촛불',
  covid: '▲ 마스크를 쓰고 거리를 둔 시민들',
};

const KEYWORDS: [RegExp, string][] = [
  [/우주|달 |화성|궤도|로켓|성간/, 'space'],
  [/로봇|휴머노이드/, 'robot'],
  [/AI|인공지능|뉴럴|업로드/, 'ai'],
  [/기후|해수면|폭염|탄소|온난화|태풍/, 'climate'],
  [/폭락|급락|증시|코스피|주가|금리/, 'crash'],
  [/집값|아파트|분양|청약|재개발|신도시/, 'land'],
  [/월드컵|응원/, 'redsea'],
  [/올림픽/, 'olympic'],
  [/전염병|바이러스|팬데믹|감염/, 'covid'],
  [/시위|집회|촛불/, 'candle'],
];

/** 이 뉴스에 실릴 사진 장면 */
export function newsPhotoKey(defId: string, title: string, text: string): string | undefined {
  if (BY_EVENT[defId]) return BY_EVENT[defId];
  const t = `${title} ${text}`;
  for (const [re, k] of KEYWORDS) if (re.test(t)) return k;
  return undefined;
}

/** 보도사진 data URL */
export function newsPhotoURL(key: string): string {
  const hit = cache.get(key);
  if (hit) return hit;
  if (typeof document === 'undefined' || !SCENES[key]) return '';
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  seed = key.split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) & 0x7fffffff;
  SCENES[key](g);
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}
