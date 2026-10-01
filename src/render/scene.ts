// 사건 한 장면을 도트 만화 컷으로.
// 사건 글에서 장면을 고르고(사슴벌레·비·학교·돈·연애·우주…), 주인공을 그 사람 색깔(머리·피부·옷)로
// 큰머리 캐릭터로 크게 그린다. 표정(반짝 눈·땀방울·하트 눈·$ 눈·눈물)과 몸짓(만세·깜짝·들기),
// 말풍선, 장면마다 2~3가지 연출이 있어 같은 종류의 사건도 매번 조금씩 다르다. 시대에 따라 집·색감이 바뀐다.
// 80×40 픽셀을 그려 크게 늘려 보여 준다.

import type { Person } from '../core/types';
import { bustGrid } from './bust';

type C = string;
const W = 80;
const H = 40;
const G = 32; // 땅 높이

export type SceneKey =
  | 'bug' | 'fish' | 'rain' | 'heat' | 'snow' | 'school' | 'hospital' | 'money' | 'love' | 'wedding' | 'baby' | 'funeral' | 'food'
  | 'night' | 'festival' | 'music' | 'game' | 'robot' | 'space' | 'house' | 'farm' | 'factory' | 'office' | 'war' | 'car' | 'travel'
  | 'sport' | 'pet' | 'study' | 'elder' | 'park' | 'fire';

/** 사건 글 → 장면 (앞에 있는 것이 우선) */
const RULES: [SceneKey, RegExp][] = [
  ['fire', /화재|불길|소방관|불이 났|불난 집/],
  ['war', /전쟁|공습|대피소|배급|소집 영장|전선|전사|피난/],
  ['bug', /사슴벌레|장수풍뎅이|곤충|매미|잠자리|채집|방아깨비|반딧불|올챙이/],
  ['space', /우주|달 기지|달 호텔|달에서|달 수학|달빛골|화성|궤도|토성|타이탄|가니메데|유로파|성간|엘리베이터 전망/],
  ['robot', /로봇|휴머노이드/],
  ['fish', /낚시|물고기|해녀|어장|양식장|바다 목장/],
  ['rain', /태풍|폭우|장마|침수|홍수|해일/],
  ['snow', /한파|폭설|눈사람|첫눈|연탄|눈싸움|썰매/],
  ['heat', /폭염|더위|에어컨|선풍기/],
  ['wedding', /결혼식|예식|함 사세요|웨딩|청첩장/],
  ['baby', /출산|아기|임신|돌잔치|돌반지|분유/],
  ['funeral', /장례|별세|영정|추모|제사|차례상|성묘|국립묘지/],
  ['hospital', /병원|수술|응급|치료|진단|간병|요양|약국|주사|인공 장기|인공 심장/],
  ['love', /연애|소개팅|맞선|데이트|고백|애인|미팅|첫사랑|전 애인/],
  ['pet', /강아지|반려견|고양이|반려동물|참새/],
  ['sport', /운동회|계주|축구|야구|마라톤|태권도|올림픽|체육/],
  ['festival', /축제|응원|월드컵|콘서트|불꽃|명절|설날|추석/],
  ['music', /노래|기타|음악|라디오|DJ|테이프|가수|노래방/],
  ['game', /게임|오락실|PC방|스타크래프트|래더/],
  ['school', /학교|교실|선생님|숙제|학원|과외|수능|시험|입시|졸업/],
  ['study', /공부|도서관|책|독서|논문|자격증/],
  ['food', /라면|짜장면|떡|수제비|도시락|치킨|김치|밥상|맛집|요리/],
  ['money', /돈|주식|코인|투자|대출|빚|복권|월급|곗돈|적금|보증금|채권|펀드|분양|청약/],
  ['farm', /농사|논|밭|새마을|모내기|보리|수확|온실|스마트팜/],
  ['factory', /공장|미싱|용접|조선소|공사장|현장|광산|채굴/],
  ['night', /회식|야근|포장마차|술자리|새벽|밤샘/],
  ['office', /회사|부장|팀장|보고|출근|사무실|승진|퇴사|면접/],
  ['car', /자동차|드라이브|택시|운전|마이카|로보택시|버스/],
  ['travel', /여행|휴가|관광|캠프/],
  ['house', /이사|전세|월세|셋방|아파트|집주인|집값|재개발|주택/],
  ['elder', /할머니|할아버지|노인정|환갑|효도|어르신/],
];
export function sceneFor(title: string, text: string): SceneKey {
  const t = title + ' ' + text;
  for (const [k, re] of RULES) if (re.test(t)) return k;
  return 'park';
}

/** 주인공 모습 (portrait.ts looksOf) */
export interface Looks { hair: C; skin: C; cloth: C; female: boolean; kid: boolean; old: boolean }
const DEFAULT: Looks = { hair: '#2b2220', skin: '#f6d7b8', cloth: '#3f6fb5', female: false, kid: false, old: false };

// ───────── 그리기 도구 ─────────
let ctx: CanvasRenderingContext2D;
let rnd = 1;
const r = () => ((rnd = (rnd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const ri = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
const pickc = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
const px = (x: number, y: number, c: C) => {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
};
const rect = (x: number, y: number, w: number, h: number, c: C) => {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
};
const disc = (cx: number, cy: number, rr: number, c: C) => {
  for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) if (x * x + y * y <= rr * rr + rr * 0.6) px(cx + x, cy + y, c);
};
function spr(x: number, y: number, rows: string[], pal: Record<string, C>, sc = 1, flip = false) {
  rows.forEach((row, j) =>
    [...row].forEach((ch, i) => {
      if (ch === '.' || !pal[ch]) return;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(Math.round(x + (flip ? row.length - 1 - i : i) * sc), Math.round(y + j * sc), sc, sc);
    }),
  );
}
const OUT = '#1d1620';

// ───────── 큰머리 캐릭터 ─────────
type Face = 'normal' | 'happy' | 'shock' | 'sad' | 'angry' | 'money' | 'love' | 'sleep' | 'cry' | 'smug';
/** 몸짓: 서기 · 만세(두 팔 위로) · 깜짝(팔 벌림) · 들기(팔 앞으로) · 손 흔들기 */
type Pose = 'stand' | 'up' | 'out' | 'hold' | 'wave';
const BODY = ['..hhhh..', '.hhhhhh.', 'hhhhhhhh', 'hssssssh', '.ssssss.', '.ssssss.', '..ssss..', '.cccccc.', '.cccccc.', '.pppppp.', '.kk..kk.'];
const BODY_KID = ['..hhhh..', '.hhhhhh.', 'hhhhhhhh', 'hssssssh', '.ssssss.', '.ssssss.', '..ssss..', '.cccccc.', '.kk..kk.'];
/** x,y: 머리 꼭대기 왼쪽. 2배 크기 (16×22, 아이 16×18) */
/** 초상화 합성 모드: 장면 속 꼬마 인물 대신 표정·말풍선만 받아 두었다가 초상화로 그린다 */
let capture: { faces: Face[]; emotes: Emote[] } | null = null;
function chibi(x: number, y: number, L: Looks, face: Face = 'normal', pose: Pose = 'stand', flip = false) {
  if (capture) {
    capture.faces.push(face);
    return;
  }
  const rows = L.kid ? BODY_KID : BODY;
  const armY = y + 14;
  // 팔 (몸보다 먼저, 외곽선까지)
  const arms: [number, number, number, number][] = []; // x, y, w, h (2배 단위 아님, 픽셀)
  if (pose === 'stand') arms.push([x, armY, 2, 4], [x + 14, armY, 2, 4]);
  if (pose === 'up') arms.push([x - 2, y + 4, 2, 11], [x + 16, y + 4, 2, 11]);
  if (pose === 'out') arms.push([x - 4, armY, 6, 2], [x + 14, armY, 6, 2]);
  if (pose === 'hold') arms.push([x + (flip ? -4 : 12), armY + 1, 8, 2], [x + 2, armY, 2, 4]);
  if (pose === 'wave') arms.push([x + (flip ? -2 : 16), y + 4, 2, 11], [x, armY, 2, 4]);
  for (const [ax, ay, aw, ah] of arms) rect(ax - 1, ay - 1, aw + 2, ah + 2, OUT);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) spr(x + dx, y + dy, rows, { h: OUT, s: OUT, c: OUT, p: OUT, k: OUT }, 2, flip);
  for (const [ax, ay, aw, ah] of arms) {
    rect(ax, ay, aw, ah, L.cloth);
    // 손
    if (pose === 'up' || (pose === 'wave' && ax !== x)) rect(ax, ay, aw, 2, L.skin);
    else if (pose === 'out' || pose === 'hold') rect(aw > 2 ? ax + (ax < x + 8 ? 0 : aw - 2) : ax, ay, 2, ah, L.skin);
    else rect(ax, ay + ah - 2, aw, 2, L.skin);
  }
  spr(x, y, rows, { h: L.hair, s: L.skin, c: L.cloth, p: '#3a3a4a', k: '#222' }, 2, flip);
  if (L.female) {
    rect(x, y + 6, 2, 8, L.hair);
    rect(x + 14, y + 6, 2, 8, L.hair);
    rect(x + 12, y + 1, 2, 2, '#ff6a8a');
  }
  if (L.old) rect(x + 3, y + 7, 3, 1, '#8a7a7a'), rect(x + 10, y + 7, 3, 1, '#8a7a7a');
  drawFace(x, y, face);
}
function drawFace(x: number, y: number, f: Face) {
  const E = '#1d1620';
  const eye = (ex: number) => {
    const X = x + ex;
    const Y = y + 8;
    switch (f) {
      case 'happy':
      case 'smug':
        px(X, Y + 1, E), px(X + 1, Y, E), px(X + 2, Y + 1, E);
        break;
      case 'shock':
        rect(X, Y - 1, 3, 3, '#ffffff'), px(X + 1, Y, E);
        break;
      case 'sleep':
        rect(X, Y + 1, 3, 1, E);
        break;
      case 'money':
        rect(X, Y - 1, 3, 3, '#f0c020'), px(X + 1, Y - 1, '#a07000'), px(X + 1, Y + 1, '#a07000');
        break;
      case 'love':
        px(X, Y, '#ff3a6a'), px(X + 2, Y, '#ff3a6a'), rect(X, Y + 1, 3, 1, '#ff3a6a'), px(X + 1, Y + 2, '#ff3a6a');
        break;
      case 'angry':
        rect(X, Y, 2, 2, E), px(ex < 8 ? X - 1 : X + 2, Y - 2, E), px(X + (ex < 8 ? 0 : 1), Y - 1, E);
        break;
      default:
        rect(X, Y, 2, 2, E), px(X, Y, '#ffffff');
    }
  };
  eye(3);
  eye(10);
  const my = y + 11;
  if (f === 'happy' || f === 'love' || f === 'money') rect(x + 6, my, 4, 1, '#c03a4a'), rect(x + 7, my + 1, 2, 1, '#c03a4a');
  else if (f === 'shock') rect(x + 7, my - 1, 2, 3, '#5a1a2a');
  else if (f === 'sad' || f === 'cry') rect(x + 7, my, 2, 1, '#8a4a4a'), px(x + 6, my + 1, '#8a4a4a'), px(x + 9, my + 1, '#8a4a4a');
  else if (f === 'angry') rect(x + 6, my + 1, 4, 1, '#5a1a2a');
  else if (f === 'smug') rect(x + 7, my, 3, 1, '#c03a4a'), px(x + 10, my - 1, '#c03a4a');
  else if (f !== 'sleep') rect(x + 7, my, 2, 1, '#c05a5a');
  if (f === 'happy' || f === 'love') px(x + 2, y + 10, '#ff9aaa'), px(x + 13, y + 10, '#ff9aaa');
  if (f === 'cry') for (let i = 0; i < 4; i++) px(x + 3, y + 10 + i, '#6ac0ff'), px(x + 12, y + 10 + i, '#6ac0ff');
  if (f === 'sad') px(x + 12, y + 10, '#6ac0ff');
}

// ───────── 말풍선·효과 ─────────
type Emote = '!' | '?' | '♥' | '♪' | '$' | 'z' | '💢' | '!!' | '…';
const GLYPH: Record<Emote, [string[], C]> = {
  '!': [['.x.', '.x.', '.x.', '...', '.x.'], '#e02020'],
  '!!': [['x.x', 'x.x', 'x.x', '...', 'x.x'], '#e02020'],
  '?': [['xxx', '..x', '.x.', '...', '.x.'], '#2050c0'],
  '♥': [['x.x', 'xxx', 'xxx', '.x.', '...'], '#ff3a6a'],
  '♪': [['.xx', '.x.', '.x.', 'xx.', 'xx.'], '#6a3ac0'],
  '$': [['.x.', 'xxx', 'x..', 'xxx', '.x.'], '#c09000'],
  z: [['xxx', '..x', '.x.', 'x..', 'xxx'], '#4a6aa0'],
  '💢': [['x.x', '.x.', 'x.x', '...', '...'], '#e02020'],
  '…': [['...', '...', '...', '...', 'x.x'], '#555'],
};
function bubble(x: number, y: number, e: Emote) {
  if (capture) {
    capture.emotes.push(e);
    return;
  }
  rect(x - 1, y - 1, 7, 7, OUT);
  rect(x, y, 5, 5, '#ffffff');
  px(x + 1, y + 5, OUT), px(x + 1, y + 6, OUT), px(x + 2, y + 5, '#ffffff');
  const [g, c] = GLYPH[e];
  spr(x + 1, y, g, { x: c });
}
const sweat = (x: number, y: number) => capture || spr(x, y, ['.b', 'bb', 'bb'], { b: '#8ad0ff' });
const sparkle = (x: number, y: number, c = '#fff4a0') => (px(x, y, c), px(x - 1, y, c), px(x + 1, y, c), px(x, y - 1, c), px(x, y + 1, c));
const speedLines = (c = 'rgba(255,255,255,.55)') => {
  for (let i = 0; i < 16; i++) rect(0, ri(2, H - 4), ri(10, 30), 1, c);
};
const burst = (cx: number, cy: number, c: C) => {
  for (let a = 0; a < 16; a += 2) {
    const t = (a / 16) * Math.PI * 2;
    for (let d = 10; d < 40; d++) px(cx + Math.cos(t) * d, cy + Math.sin(t) * d * 0.7, c);
  }
};
const confetti = (n = 30) => {
  for (let i = 0; i < n; i++) rect(ri(0, W), ri(0, H - 10), 1, ri(1, 2), pickc(['#ff5a7a', '#ffd23a', '#4ad0ff', '#6ae07a', '#c07aff']));
};
const other = (): Looks => ({ ...DEFAULT, hair: pickc(['#2b2220', '#4a3426', '#7a4b2a', '#1c1c28']), cloth: pickc(['#d05a3a', '#4a8a4a', '#8a4ac0', '#e0a040', '#34506e']), female: r() < 0.5 });

// ───────── 시대 배경 ─────────
interface Era { sky: [C, C]; ground: C; ground2: C; wall: C; roof: C; accent: C; tint?: C }
function eraOf(y: number, night = false): Era {
  if (night) return { sky: ['#0e1430', '#2a3868'], ground: '#1e2a24', ground2: '#26352c', wall: '#3a3a48', roof: '#22222c', accent: '#ffd870' };
  if (y < 1980) return { sky: ['#d8c898', '#efe2ba'], ground: '#8a7a50', ground2: '#9a8a5c', wall: '#d8c8a0', roof: '#5a4a3a', accent: '#b04a30', tint: 'rgba(120,90,40,.15)' };
  if (y < 2000) return { sky: ['#8fb8d8', '#d6e8f2'], ground: '#6a9a4a', ground2: '#7aaa56', wall: '#e0d8c8', roof: '#8a4a3a', accent: '#d05a3a' };
  if (y < 2050) return { sky: ['#5aa8ee', '#cceaff'], ground: '#5aa04a', ground2: '#6ab058', wall: '#eef0f4', roof: '#4a5a7a', accent: '#e05a6a' };
  if (y < 2120) return { sky: ['#4a8ad8', '#c0f0ff'], ground: '#4aa878', ground2: '#5ab888', wall: '#e0f4f8', roof: '#3a8aa8', accent: '#4fe0e8' };
  return { sky: ['#2a2a6a', '#9a7ac8'], ground: '#3a6a6a', ground2: '#4a7a7a', wall: '#d8d0f0', roof: '#6a4aa8', accent: '#ffd08a' };
}
function sky(e: Era, stars = false) {
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const mix = (i: number) => Math.round(parseInt(e.sky[0].slice(i, i + 2), 16) * (1 - t) + parseInt(e.sky[1].slice(i, i + 2), 16) * t).toString(16).padStart(2, '0');
    rect(0, y, W, 1, `#${mix(1)}${mix(3)}${mix(5)}`);
  }
  if (stars) for (let i = 0; i < 30; i++) px(r() * W, r() * H * 0.6, r() < 0.3 ? '#fff4c0' : '#ffffff');
}
const ground = (e: Era, y = G) => {
  rect(0, y, W, H - y, e.ground);
  for (let i = 0; i < 40; i++) px(r() * W, y + r() * (H - y), e.ground2);
};
function building(x: number, y0: number, e: Era, year: number, big = false) {
  if (year < 1980) {
    rect(x, y0 - 6, 12, 6, e.wall);
    for (let i = -2; i < 14; i++) px(x + i, y0 - 7 - (i < 6 ? i / 3 : (12 - i) / 3), '#8a6a3a');
    rect(x - 2, y0 - 8, 16, 2, '#a08050');
    rect(x + 5, y0 - 4, 2, 4, '#5a3a20');
  } else if (year < 2050) {
    const h = big ? 22 : 13;
    rect(x, y0 - h, 12, h, e.wall);
    for (let j = 3; j < h - 2; j += 3) for (let i = 2; i < 10; i += 3) rect(x + i, y0 - h + j, 2, 1, r() < 0.5 ? '#ffe89a' : '#8aa0c0');
    rect(x, y0 - h - 1, 12, 1, e.roof);
  } else {
    for (let i = 0; i < 7; i++) rect(x + 6 - i, y0 - 7 + i, i * 2, 1, i < 2 ? e.accent : e.wall);
  }
}
const tree = (x: number, y: number, c = '#3a8a3a') => (rect(x, y - 4, 2, 4, '#6a4a2a'), disc(x + 1, y - 7, 4, c));
const sunFace = (x: number, y: number, c = '#ffd23a', mad = false) => {
  disc(x, y, 6, c);
  px(x - 2, y - 1, OUT), px(x + 2, y - 1, OUT);
  rect(x - (mad ? 2 : 1), y + 2, mad ? 5 : 3, 1, OUT);
};

// ───────── 장면들 ─────────
function draw(k: SceneKey, year: number, L: Looks, v: number) {
  const night = k === 'night' || k === 'funeral';
  const e = eraOf(year, night);
  if (k === 'space') {
    sky({ ...e, sky: ['#05060f', '#1a2250'] }, true);
    disc(62, 26, 14, year >= 2080 ? '#c86a3a' : '#3a7ae0');
    if (year < 2080) for (let i = 0; i < 20; i++) px(52 + r() * 20, 16 + r() * 20, '#4ac070');
    const ax = 12 + v * 4;
    chibi(ax, 6, { ...L, hair: '#e8e8f0', cloth: '#e8e8f0' }, v === 1 ? 'shock' : 'happy', v === 1 ? 'out' : 'wave', v === 2);
    rect(ax + 2, 13, 12, 5, 'rgba(120,200,255,.35)');
    bubble(ax + 20, 3, v === 1 ? '!!' : '♥');
    for (let i = 0; i < 4; i++) sparkle(ri(30, 78), ri(2, 12));
    return;
  }
  sky(e, night);
  if (night) disc(70, 7, 4, '#fff4c0');
  else if (!['rain', 'snow', 'heat', 'school', 'study', 'office', 'game', 'hospital', 'food', 'wedding', 'baby', 'music', 'elder', 'factory', 'war', 'fire'].includes(k)) disc(70, 7, 4, '#fff0a0');
  switch (k) {
    case 'bug': {
      ground(e);
      rect(40, 0, 12, G, '#6a4a2a');
      for (let i = 0; i < 12; i++) px(40 + r() * 12, r() * G, '#5a3a1a');
      disc(46, -2, 12, '#3a8a3a');
      spr(38, 8, ['k......k', '.k....k.', '..kkkk..', '.kbbbbk.', 'kbbwbbbk', '.kbbbbk.', 'k.k..k.k'], { k: '#2a1a10', b: '#6a3a1a', w: '#b08050' }, 3);
      if (v === 1) {
        chibi(12, 12, L, 'cry', 'hold');
        bubble(4, 4, '💢');
      } else {
        chibi(12, 12, L, v === 2 ? 'love' : 'shock', v === 2 ? 'up' : 'out');
        bubble(24, 4, v === 2 ? '♥' : '!!');
        for (let i = 0; i < 4; i++) sparkle(ri(34, 64), ri(4, 30));
        rect(64, 10, 1, 22, '#8a6a3a');
        spr(60, 4, ['.ww.', 'wwww', 'wwww', '.ww.'], { w: '#eeeeee' }, 2);
      }
      break;
    }
    case 'fish': {
      rect(0, 22, W, 18, '#3a7ac0');
      for (let i = 0; i < 20; i++) rect(r() * W, 22 + r() * 18, 3, 1, '#6aa8e0');
      spr(4, 20, ['..bbbbbb..', 'bbbbbbbbbb', '.bbbbbbbb.'], { b: '#8a5a3a' }, 2);
      chibi(8, 0, L, v === 0 ? 'shock' : 'happy', 'hold');
      for (let i = 0; i < 30; i++) px(24 + i, 2 + i * i * 0.012, '#dddddd');
      const fy = v === 2 ? 20 : 10;
      spr(50, fy, ['...ss...', '.sssss.t', 'swsssssst', '.sssss.t', '...ss...'], { s: pickc(['#e8a040', '#d0d8e0', '#e86a6a']), w: '#222', t: '#d08030' }, 2);
      for (let i = 0; i < 8; i++) px(48 + r() * 24, 20 + r() * 4, '#ffffff');
      bubble(28, 0, v === 0 ? '!!' : '♪');
      break;
    }
    case 'rain': {
      ground(e);
      building(4, G, e, year);
      building(62, G, e, year, true);
      for (let i = 0; i < 70; i++) {
        const x = r() * W;
        const y = r() * H;
        px(x, y, '#aac8f0'), px(x - 1, y + 1, '#aac8f0');
      }
      rect(0, G + 2, W, 6, '#4a6a9a');
      if (v === 1) {
        chibi(30, 10, L, 'shock', 'up');
        spr(26, 0, ['r......r', 'rr....rr', '.rrrrrr.', '...kk...'], { r: '#d04a4a', k: '#333' }, 2);
        bubble(50, 4, '!!');
      } else {
        chibi(30, 12, L, v === 2 ? 'sad' : 'normal', 'hold');
        spr(26, 2, ['..rrrrrr..', '.rrrrrrrr.', 'rrrrrrrrrr', '....k.....', '....k.....'], { r: pickc(['#d04a4a', '#e0c040', '#4a8ae0']), k: '#333' }, 2);
        sweat(48, 14);
      }
      break;
    }
    case 'snow': {
      rect(0, G, W, H - G, '#eef4f8');
      building(4, G, e, year);
      for (let i = 0; i < 50; i++) px(r() * W, r() * H, '#ffffff');
      disc(58, 26, 7, '#ffffff');
      disc(58, 15, 5, '#ffffff');
      px(56, 14, OUT), px(60, 14, OUT);
      rect(58, 16, 4, 1, '#ff8a3a');
      rect(54, 9, 8, 2, pickc(['#d04a4a', '#3a6aa8', '#2a2a2a']));
      chibi(22, 12, { ...L, cloth: '#d04a4a' }, 'happy', v === 0 ? 'up' : 'hold');
      if (v !== 0) disc(42, 14, 2, '#ffffff'), speedLines('rgba(180,200,220,.7)');
      bubble(36, 4, v === 2 ? '!' : '♪');
      break;
    }
    case 'fire': {
      // 불난 건물: 창마다 불길, 위로 검은 연기, 앞에서 소방관이 물을 뿌린다
      ground(e);
      rect(42, 4, 34, G - 4, '#8a7a6a');
      for (let wy = 8; wy < G - 4; wy += 8)
        for (let wx = 46; wx < 72; wx += 9) {
          rect(wx, wy, 6, 5, '#2a1a14');
          const hot = r() < 0.7;
          if (hot) rect(wx, wy + 1, 6, 4, pickc(['#ff6a1a', '#ff9a2a'])), rect(wx + 1, wy - 2, 4, 3, '#ffd23a');
        }
      for (let i = 0; i < 7; i++) disc(46 + i * 4 + ri(-2, 2), 2 - (i % 2) * 2, ri(3, 5), pickc(['#3a3a40', '#55555c', '#2a2a30']));
      for (let i = 0; i < 12; i++) px(42 + r() * 34, 4 + r() * 20, pickc(['#ffd23a', '#ff8a2a']));
      chibi(12, 10, { ...L, cloth: '#c8302a', hair: '#e8c040' }, v === 1 ? 'shock' : 'angry', 'hold');
      for (let i = 0; i < 16; i++) px(30 + i, 15 - i * 0.4 + (i * i) * 0.02, '#8ad0ff'), px(30 + i, 16 - i * 0.4 + (i * i) * 0.02, '#cfeeff');
      bubble(28, 2, v === 2 ? '!' : '!!');
      break;
    }
    case 'heat':
      ground(e);
      building(2, G, e, year, true);
      sunFace(66, 8, '#ff7a2a', true);
      for (let i = 0; i < 10; i++) rect(r() * W, 14 + r() * 14, 5, 1, 'rgba(255,190,120,.6)');
      chibi(30, 10, { ...L, cloth: '#f0f0f0' }, v === 1 ? 'sleep' : 'sad', v === 1 ? 'stand' : 'out');
      sweat(27, 12), sweat(47, 10), sweat(45, 18);
      if (year >= 1970) spr(52, 18, ['.bbb.', 'bbbbb', '.bbb.', '..k..', '..k..', '.kkk.'], { b: '#8ad0f0', k: '#666' }, 2);
      break;
    case 'school':
    case 'study': {
      rect(0, 0, W, G + 2, year >= 2050 ? '#dfe8ee' : '#e8dcc0');
      rect(0, G + 2, W, H - G, '#b08a5a');
      if (year >= 2050) rect(6, 3, 68, 14, 'rgba(120,220,255,.55)');
      else rect(6, 3, 68, 14, '#2e4e36'), rect(5, 2, 70, 1, '#8a6a4a');
      for (let i = 0; i < 4; i++) rect(10 + i * 16, 7 + (i % 2) * 4, 9, 1, '#ffffff');
      const L2 = L.kid || L.cloth === '#3f6fb5' ? { ...L, cloth: year < 1983 && !L.kid ? '#1e1e28' : L.cloth } : L;
      if (v === 0) {
        chibi(30, 14, L2, 'sleep');
        bubble(48, 8, 'z');
      } else if (v === 1) {
        chibi(30, 14, L2, 'shock', 'out');
        rect(52, 28, 12, 8, '#ffffff');
        rect(54, 30, 6, 1, '#e02020'), rect(54, 32, 4, 1, '#e02020');
        bubble(48, 8, '!!');
        sweat(28, 16);
      } else {
        chibi(30, 14, L2, 'happy', 'up');
        rect(52, 28, 12, 8, '#ffffff');
        spr(53, 29, ['x.xxx.xxx', 'x.x.x.x.x', 'x.xxx.xxx'], { x: '#e02020' });
        for (let i = 0; i < 3; i++) sparkle(ri(50, 74), ri(18, 26));
      }
      rect(24, 34, 32, 2, '#8a6a4a');
      break;
    }
    case 'hospital': {
      rect(0, 0, W, H, '#eef2f6');
      rect(0, 30, W, 10, '#c8d4e0');
      rect(8, 22, 40, 8, '#ffffff');
      rect(8, 20, 8, 4, '#ffffff');
      chibi(12, 10, L, v === 2 ? 'happy' : 'sleep', v === 2 ? 'wave' : 'stand');
      rect(28, 22, 20, 6, '#a0c8f0');
      rect(54, 4, 22, 14, '#1a2a2a');
      const ys = [10, 10, 10, 6, 14, 10, 10, 10, 8, 12, 10, 10];
      for (let i = 0; i < 20; i++) px(55 + i, 4 + ys[i % ys.length], '#4ae08a');
      if (v === 1) chibi(58, 14, { ...other(), cloth: '#ffffff' }, 'normal', 'hold', true), bubble(52, 0, '?');
      if (v === 2) bubble(30, 4, '♥');
      break;
    }
    case 'money': {
      ground(e);
      building(2, G, e, year, true);
      if (v === 1) {
        for (let i = 0; i < 24; i++) px(44 + i, 4 + i * 0.9, '#3a6ae0');
        rect(66, 24, 3, 3, '#3a6ae0');
        chibi(20, 10, L, 'cry', 'out');
        bubble(38, 2, '…');
      } else {
        burst(30, 18, 'rgba(255,230,120,.5)');
        for (let i = 0; i < 16; i++) disc(ri(40, 76), ri(0, 30), 1, pickc(['#f0c040', '#e0a020', '#fff080']));
        for (let i = 0; i < 24; i++) px(44 + i, 28 - i * 0.9, '#e04a4a');
        spr(64, 2, ['.x.', 'xxx', 'x.x'], { x: '#e04a4a' }, 2);
        chibi(20, 10, L, 'money', 'up');
        bubble(38, 2, '$');
      }
      break;
    }
    case 'love': {
      ground(e);
      tree(4, G);
      tree(70, G);
      const o = other();
      o.female = !L.female;
      chibi(22, 10, L, 'love', v === 2 ? 'hold' : 'stand');
      chibi(40, 10, o, v === 1 ? 'shock' : 'love', v === 1 ? 'out' : 'stand', true);
      spr(34, 0, ['.xx.xx.', 'xxxxxxx', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...'], { x: '#ff4a7a' });
      for (let i = 0; i < 6; i++) spr(ri(2, 74), ri(2, 20), ['x.x', 'xxx', '.x.'], { x: '#ffa0b8' });
      if (v === 1) bubble(60, 4, '!!');
      break;
    }
    case 'wedding': {
      rect(0, 0, W, H, '#fff4f4');
      for (let i = 0; i < 16; i++) disc(4 + i * 5, 2, 3, i % 2 ? '#ffc0d0' : '#ffffff');
      rect(0, G, W, H - G, '#e8d8e8');
      chibi(22, 10, { ...L, cloth: L.female ? '#ffffff' : '#222232' }, 'happy', v === 1 ? 'up' : 'stand');
      chibi(40, 10, { ...other(), female: !L.female, cloth: L.female ? '#222232' : '#ffffff' }, 'happy', 'stand', true);
      if (L.female) rect(20, 6, 20, 3, 'rgba(255,255,255,.8)');
      confetti(40);
      bubble(37, 0, '♥');
      break;
    }
    case 'baby': {
      rect(0, 0, W, H, '#fff0f4');
      rect(0, G, W, H - G, '#f0d8e0');
      chibi(12, 10, L, 'love', 'hold');
      disc(52, 20, 10, '#ffe0c8');
      rect(46, 18, 2, 2, OUT), rect(56, 18, 2, 2, OUT);
      if (v === 1) rect(50, 23, 4, 3, '#c04a5a');
      else rect(50, 24, 4, 1, '#e07a8a');
      px(46, 22, '#ffaab8'), px(58, 22, '#ffaab8');
      rect(44, 10, 16, 3, v === 1 ? '#ffb0c8' : '#a8d0f8');
      for (let i = 0; i < 5; i++) sparkle(ri(36, 76), ri(2, 36));
      bubble(30, 4, v === 1 ? '!!' : '♥');
      break;
    }
    case 'funeral': {
      rect(0, 0, W, H, '#14141c');
      rect(28, 4, 24, 20, '#2a2a2a');
      rect(30, 6, 20, 16, '#e8e0d0');
      disc(40, 12, 4, '#9a9aa0');
      rect(35, 16, 10, 6, '#7a7a80');
      for (let i = 0; i < 7; i++) disc(22 + i * 6, 28, 2, '#f8f8f8');
      rect(24, 24, 1, 4, '#e8c040'), px(24, 23, '#ff9a3a');
      rect(56, 24, 1, 4, '#e8c040'), px(56, 23, '#ff9a3a');
      chibi(4, 16, { ...L, cloth: '#1a1a22' }, v === 1 ? 'cry' : 'sad');
      chibi(60, 16, { ...other(), cloth: '#1a1a22' }, 'sad', 'stand', true);
      break;
    }
    case 'food': {
      rect(0, 0, W, H, year < 1990 ? '#e8d8b0' : '#f0e4d0');
      rect(0, 26, W, 14, '#b08a5a');
      chibi(4, 6, L, v === 2 ? 'shock' : 'happy', v === 2 ? 'out' : 'hold');
      disc(48, 28, 12, '#ffffff');
      rect(36, 16, 26, 10, year < 1970 ? '#e0d8b0' : v === 1 ? '#3a2a1a' : '#e8a040');
      for (let i = 0; i < 6; i++) rect(38 + i * 4, 18 + (i % 2), 3, 1, v === 1 ? '#6a4a2a' : '#fff0a0');
      rect(36, 16, 26, 1, '#ffffff');
      for (let i = 0; i < 3; i++) for (let j = 0; j < 6; j++) px(42 + i * 6 + Math.round(Math.sin(j)), 14 - j * 2, 'rgba(255,255,255,.8)');
      rect(56, 2, 1, 18, '#8a6a3a'), rect(59, 2, 1, 18, '#8a6a3a');
      bubble(24, 0, v === 2 ? '!!' : '♥');
      break;
    }
    case 'night': {
      ground(e);
      building(2, G, e, year, true);
      building(66, G, e, year, true);
      rect(20, 10, 44, 3, '#e04a3a');
      rect(20, 13, 44, 18, 'rgba(255,140,80,.35)');
      disc(26, 16, 2, '#ffd26a');
      rect(22, 26, 40, 3, '#8a6a4a');
      chibi(24, 12, L, v === 1 ? 'sleep' : 'happy', v === 1 ? 'stand' : 'up');
      chibi(44, 12, other(), 'happy', 'hold', true);
      for (let i = 0; i < 3; i++) rect(38 + i * 3, 22, 2, 4, '#4ac86a');
      bubble(40, 4, v === 1 ? 'z' : '!');
      break;
    }
    case 'festival':
    case 'sport': {
      ground(e);
      for (let i = 0; i < 10; i++) spr(i * 8, 2 + (i % 2), ['xxxxx', '.xxx.', '..x..'], { x: ['#e04a4a', '#4a8ae0', '#f0c040', '#4ac070'][i % 4] });
      if (k === 'sport') {
        speedLines();
        chibi(28, 10, { ...L, cloth: v === 1 ? '#e04a4a' : '#ffffff' }, v === 2 ? 'cry' : 'happy', v === 2 ? 'stand' : 'up');
        disc(58, 18, 3, '#ffffff'), px(57, 17, OUT), px(59, 19, OUT);
        bubble(48, 4, v === 2 ? '…' : '!!');
      } else {
        for (let i = 0; i < 4; i++) disc(ri(10, 70), ri(4, 14), 5, pickc(['rgba(255,90,120,.6)', 'rgba(255,220,80,.6)', 'rgba(90,200,255,.6)']));
        chibi(10, 12, L, 'happy', 'up');
        chibi(32, 12, other(), 'happy', 'wave');
        chibi(54, 12, other(), 'shock', 'up', true);
        confetti(20);
      }
      break;
    }
    case 'music': {
      rect(0, 0, W, H, '#1a1030');
      disc(40, 30, 16, 'rgba(255,240,160,.25)');
      chibi(32, 8, L, 'happy', v === 1 ? 'up' : 'hold');
      rect(48, 14, 2, 8, '#888'), disc(49, 13, 2, '#333');
      for (let i = 0; i < 6; i++) spr(ri(4, 76), ri(2, 26), ['.xx', '.x.', 'xx.'], { x: pickc(['#ffd23a', '#ff7ab0', '#7ad0ff']) });
      bubble(52, 2, '♪');
      break;
    }
    case 'game': {
      rect(0, 0, W, H, '#10101c');
      rect(20, 2, 40, 26, '#2a2a3a');
      rect(23, 5, 34, 18, '#0a0a14');
      spr(34, 8, ['x.....x', '.x...x.', 'xxxxxxx', 'xx.x.xx', 'xxxxxxx', 'x.x.x.x'], { x: pickc(['#4ae0a0', '#e04ab0', '#4a9ae0']) }, 2);
      chibi(28, 20, L, v === 1 ? 'cry' : v === 2 ? 'angry' : 'shock', v === 0 ? 'up' : 'hold');
      bubble(48, 18, v === 1 ? '…' : v === 2 ? '💢' : '!!');
      break;
    }
    case 'robot': {
      ground(e);
      building(2, G, e, year);
      spr(42, 2, ['..aaaaaa..', '.aaaaaaaa.', '.acaaaaca.', '.aaaaaaaa.', '.aammmmaa.', '..aaaaaa..', 'aaaaaaaaaa', 'a.aaaaaa.a', 'a.aaaaaa.a', '..aa..aa..'], { a: '#b8c4d8', c: v === 2 ? '#ff4a7a' : '#4fe0ff', m: '#4a5a6a' }, 3);
      chibi(10, 12, L, v === 1 ? 'shock' : 'happy', v === 1 ? 'out' : 'wave');
      bubble(28, 4, v === 1 ? '?' : '♥');
      break;
    }
    case 'house': {
      ground(e);
      building(4, G, e, year, true);
      building(64, G, e, year);
      spr(26, 16, ['bbbbbbbb....', 'bbbbbbbbcc..', 'bbbbbbbbccc.', 'bbbbbbbbcccc', 'bbbbbbbbbbbb', '.kk.....kk..'], { b: '#e8e8e8', c: '#4a8ae0', k: '#222' }, 2);
      chibi(4, 12, L, v === 1 ? 'sad' : 'happy', 'hold');
      spr(18, 20, ['bbbb', 'bbbb', 'bbbb'], { b: '#c89a5a' }, 2);
      sweat(3, 12);
      bubble(22, 4, v === 1 ? '…' : '!');
      break;
    }
    case 'farm': {
      ground(e);
      for (let i = 0; i < 4; i++) rect(0, G + 1 + i * 2, W, 1, '#5a8a3a');
      for (let i = 0; i < 16; i++) rect(2 + i * 5, G - 4, 1, 4, year >= 2040 ? '#6ae0a0' : '#8ac04a');
      chibi(14, 10, { ...L, cloth: year < 1980 ? '#e8e0c0' : L.cloth }, 'happy', v === 1 ? 'up' : 'hold');
      spr(12, 8, ['..yyyy..', 'yyyyyyyy'], { y: '#e0c060' }, 2);
      if (v === 1) disc(52, 24, 8, '#ff9a2a'), rect(51, 14, 2, 3, '#3a7a2a');
      else spr(44, 10, ['..gg..', '.gggg.', '..ww..', '.wwww.', '.wwww.', '..ww..', '..w...'], { g: '#4ab04a', w: '#f8f8f0' }, 3);
      sweat(32, 12);
      bubble(32, 2, '!!');
      break;
    }
    case 'factory': {
      rect(0, 0, W, H, '#5a5a68');
      rect(0, G, W, H - G, '#3a3a44');
      rect(40, 16, 36, 16, '#8a8a98');
      for (let i = 0; i < 12; i++) px(40 + r() * 10, 12 + r() * 10, pickc(['#ffd23a', '#ff8a2a', '#ffffff']));
      chibi(16, 10, { ...L, cloth: '#4a6aa8' }, v === 1 ? 'sad' : 'normal', 'hold');
      rect(16, 8, 16, 3, '#f0c040');
      sweat(14, 12);
      bubble(34, 2, v === 1 ? '…' : '!');
      break;
    }
    case 'office': {
      rect(0, 0, W, H, '#d8dce4');
      rect(0, G, W, H - G, '#a8b0bc');
      rect(4, 26, 36, 3, '#8a8a98');
      for (let i = 0; i < 12; i++) rect(6 + (i % 2), 26 - i * 2 - 2, 10, 2, i % 2 ? '#ffffff' : '#eeeeee');
      rect(26, 18, 10, 8, year < 1990 ? '#c8c0a0' : '#2a3a5a');
      chibi(22, 8, L, v === 0 ? 'sad' : v === 1 ? 'sleep' : 'smug', v === 2 ? 'up' : 'stand');
      if (v === 0) chibi(52, 8, { ...other(), cloth: '#2a2a3a', hair: '#555' }, 'angry', 'out', true), bubble(70, 2, '💢');
      else bubble(40, 2, v === 1 ? 'z' : '♪');
      break;
    }
    case 'war': {
      rect(0, 0, W, H, '#2a1a1a');
      for (let i = 0; i < 3; i++) for (let d = 0; d < 40; d++) px(10 + i * 30 + d * 0.3 * (i - 1), H - d, 'rgba(255,240,180,.25)');
      rect(0, G, W, H - G, '#3a3020');
      building(6, G, e, year);
      building(60, G, e, year, true);
      for (let i = 0; i < 4; i++) disc(ri(10, 70), ri(4, 14), 3, 'rgba(120,110,100,.8)');
      spr(20, 26, ['ssssssssss', 'ssssssssss'], { s: '#8a7a5a' }, 2);
      chibi(28, 8, { ...L, cloth: '#4a5a3a' }, v === 1 ? 'cry' : 'normal', v === 1 ? 'stand' : 'hold');
      bubble(46, 2, v === 1 ? '…' : '!');
      break;
    }
    case 'car': {
      ground(e);
      building(2, G, e, year);
      rect(0, G + 1, W, 6, '#4a4a52');
      for (let i = 0; i < 6; i++) rect(i * 14, G + 3, 7, 1, '#e8e8e8');
      speedLines('rgba(255,255,255,.7)');
      spr(20, 14, ['...cccccc...', '..cwwwwwwc..', '.cccccccccc.', 'cccccccccccc', 'cccccccccccc', '.kk......kk.'], { c: year < 1990 ? '#d8d0b0' : year < 2050 ? pickc(['#d04a4a', '#4a8ae0', '#f0f0f0']) : '#e8f0f8', w: '#a8d0f0', k: '#222' }, 3);
      disc(34, 19, 3, L.hair), rect(33, 20, 3, 2, L.skin);
      bubble(58, 4, year >= 2031 ? '♪' : '!');
      break;
    }
    case 'travel': {
      rect(0, 20, W, 12, '#4a9ad8');
      for (let i = 0; i < 10; i++) rect(r() * W, 21 + r() * 10, 4, 1, '#8ac8f0');
      disc(12, 20, 8, '#6a8a6a'), disc(26, 22, 6, '#7a9a7a');
      ground(e, G);
      spr(50, 2, ['....w....', 'wwwwwwwww', '....w....', '...www...'], { w: '#ffffff' }, 2);
      chibi(30, 10, L, 'happy', 'wave');
      spr(50, 22, ['.hh.', 'bbbb', 'bbbb', 'bbbb'], { h: '#555', b: pickc(['#c05a3a', '#3a8ac0', '#e0a040']) }, 2);
      bubble(48, 12, '♪');
      break;
    }
    case 'pet': {
      ground(e);
      building(2, G, e, year);
      chibi(14, 10, L, 'love', 'hold');
      spr(40, 6, ['dd....dd', 'dddddddd', 'dwkddkwd', 'dddddddd', 'ddddnddd', '.ddttdd.', '..dttd..'], { d: pickc(['#c8a060', '#f0e0c0', '#6a4a2a']), w: '#ffffff', k: '#1d1620', n: '#1d1620', t: '#ff7a9a' }, 3);
      bubble(32, 2, '♥');
      break;
    }
    case 'elder': {
      rect(0, 0, W, H, '#f0e2c8');
      rect(0, G, W, H - G, '#c8a878');
      rect(10, 26, 60, 3, '#8a6a4a');
      chibi(12, 8, { ...L, old: true, hair: '#c9c4bd' }, 'happy', 'hold');
      chibi(44, 12, { ...other(), kid: true }, v === 1 ? 'sleep' : 'happy', v === 1 ? 'stand' : 'up', true);
      rect(32, 22, 6, 4, '#ffffff'), rect(33, 20, 1, 2, 'rgba(255,255,255,.7)');
      bubble(30, 2, v === 1 ? 'z' : '♪');
      break;
    }
    default: {
      ground(e);
      tree(4, G);
      tree(70, G);
      building(52, G, e, year);
      chibi(24, 10, L, pickc<Face>(['happy', 'normal', 'smug', 'shock']), pickc<Pose>(['stand', 'wave', 'hold']));
      bubble(42, 2, pickc<Emote>(['?', '!', '♪', '…']));
    }
  }
  if (e.tint) rect(0, 0, W, H, e.tint);
}

const cache = new Map<string, string>();
/** seed가 다르면 연출(표정·몸짓·말풍선·구도)이 달라진다 */
export function sceneURL(k: SceneKey, year: number, seed: number, looks: Looks = DEFAULT): string {
  const band = year < 1980 ? 0 : year < 2000 ? 1 : year < 2050 ? 2 : year < 2120 ? 3 : 4;
  const s = Math.abs(seed);
  const key = `${k}:${band}:${s % 12}:${looks.hair}:${looks.cloth}:${looks.skin}:${looks.female}:${looks.kid}:${looks.old}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  ctx = c.getContext('2d')!;
  rnd = (s % 12) * 7919 + 17;
  draw(k, year, looks, s % 3);
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}

// ───────── 사건 그림: 장면 + 초상화 (인물 창과 같은 도트 크기) ─────────
const AW = 96;
const AH = 48;
const art = new Map<string, string>();
/** 장면(80×40)을 96×48 판 가운데에 놓고 하늘·땅을 가장자리로 이어 붙인 뒤, 주인공(과 상대)의 48×48 초상화를 사건 표정으로 세운다 */
export function sceneArtURL(k: SceneKey, year: number, seed: number, people: { p: Person; age: number }[], blink = false): string {
  const s = Math.abs(seed);
  const key = `${k}:${year}:${s % 12}:${people.map((x) => x.p.id + ':' + x.age).join(',')}:${blink}`;
  const hit = art.get(key);
  if (hit) return hit;
  // 1) 장면 (사람 빼고)
  const bg = document.createElement('canvas');
  bg.width = W;
  bg.height = H;
  ctx = bg.getContext('2d')!;
  rnd = (s % 12) * 7919 + 17;
  const got: { faces: Face[]; emotes: Emote[] } = { faces: [], emotes: [] };
  capture = got;
  try {
    draw(k, year, DEFAULT, s % 3);
  } finally {
    capture = null;
  }
  // 2) 넓은 판에 장면을 놓고 가장자리를 늘여 채운다
  const c = document.createElement('canvas');
  c.width = AW;
  c.height = AH;
  const x2 = c.getContext('2d')!;
  x2.imageSmoothingEnabled = false;
  const ox = (AW - W) / 2;
  const oy = AH - H;
  x2.drawImage(bg, 0, 0, W, 1, ox, 0, W, oy); // 위 하늘
  x2.drawImage(bg, ox, oy);
  x2.drawImage(bg, 0, 0, 1, H, 0, oy, ox, H); // 왼쪽
  x2.drawImage(bg, W - 1, 0, 1, H, ox + W, oy, ox, H); // 오른쪽
  x2.drawImage(c, ox, 0, 1, oy, 0, 0, ox, oy);
  x2.drawImage(c, ox + W - 1, 0, 1, oy, ox + W, 0, ox, oy);
  // 3) 초상화: 주인공은 왼쪽, 상대는 오른쪽에서 마주 본다
  const faces = got.faces.length ? got.faces : ['normal' as Face];
  const put = (who: { p: Person; age: number }, face: Face, bx: number, flip: boolean) => {
    const g = bustGrid(who.p, who.age, year, face, blink && (face === 'normal' || face === 'sad' || face === 'angry' || face === 'smug' || face === 'shock'));
    // 바닥에 그림자
    x2.fillStyle = 'rgba(0,0,0,.18)';
    x2.fillRect(bx + 8, AH - 2, 32, 2);
    for (let y = 0; y < 48; y++)
      for (let x = 0; x < 48; x++) {
        const col = g[y][flip ? 47 - x : x];
        if (col) {
          x2.fillStyle = col;
          x2.fillRect(bx + x, y + (AH - 48), 1, 1);
        }
      }
  };
  const lead = people[0];
  if (lead) put(lead, faces[0], -4, false);
  if (people[1] && faces.length > 1) put(people[1], faces[1], AW - 44, true);
  // 4) 말풍선은 주인공 머리 옆에
  const e = got.emotes[0];
  if (e) {
    ctx = x2;
    bubble(38, 3, e);
  }
  const url = c.toDataURL();
  art.set(key, url);
  return url;
}
