// 희귀 직업 테마 장식: 직업마다 화면에 걸리는 소품과 움직임.
//   · 테두리(edge): 상단 바 아래에 걸리는 띠 — 흐르는 피, 덩굴, 부적, 무대 커튼, 시세 전광판…
//   · 그림자(sil): 배경 뒤를 지나가는 도트 실루엣 — 박쥐, 갈매기, 유령, 비둘기…
//   · 입자(ptc): 화면 위로 떨어지거나 피어오르는 것 — 핏방울, 나뭇잎, 동전, 불씨, 연기, 코드…
//   · 귀퉁이(corner): 카드 왼쪽 위에 찍히는 작은 도트 문양
// 도트는 문자 격자를 SVG(사각형 픽셀)로 바꿔 data URL로 쓴다. 테두리는 SVG 안의 SMIL 애니메이션으로 움직인다.

type Grid = { rows: string[]; pal: Record<string, string> };
const S = (rows: string[], pal: Record<string, string>): Grid => ({ rows, pal });

/** 도트 격자 → SVG data URL */
export function pixURL(g: Grid, tint?: Record<string, string>): string {
  const pal = { ...g.pal, ...tint };
  const w = Math.max(...g.rows.map((r) => r.length));
  const h = g.rows.length;
  let rects = '';
  g.rows.forEach((row, y) => [...row].forEach((c, x) => c !== '.' && pal[c] && (rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${pal[c]}"/>`)));
  return `url('data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges">${rects}</svg>`)}')`;
}
const svgURL = (w: number, h: number, body: string) => `url('data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`)}')`;

// ───────────────────────── 도트 그림 ─────────────────────────
const K = '#120c12';
export const SPR: Record<string, Grid> = {
  bat: S(['k.........k', 'kk..k.k..kk', 'kkkkkkkkkkk', '.kkkkrkkkk.', '..kk.k.kk..', '...k...k...'], { k: '#1a0a12', r: '#c01030' }),
  drop: S(['.r.', '.r.', 'rrr', 'rRr', '.r.'], { r: '#9a0a1e', R: '#e04050' }),
  rose: S(['..rr...', '.rRrr..', 'rrRRrr.', '.rrrr..', '..gg...', 'g.g....', '.gg....', '..g....'], { r: '#8a0a20', R: '#d02040', g: '#2a4a20' }),
  card: S(['wwwwwww', 'wr....w', 'w..r..w', 'w.rrr.w', 'wrrrrrw', 'w..r..w', 'w.rrr.w', 'w....rw', 'wwwwwww'], { w: '#f4f0e8', r: '#c01a2a' }),
  spade: S(['wwwwwww', 'wk....w', 'w..k..w', 'w.kkk.w', 'wkkkkkw', 'wkkkkkw', 'w..k..w', 'w.kkk.w', 'wwwwwww'], { w: '#f4f0e8', k: '#141414' }),
  coin: S(['..yyy..', '.yYYYy.', 'yYyyyYy', 'yYyWyYy', 'yYyyyYy', '.yYYYy.', '..yyy..'], { y: '#f0c030', Y: '#b07a10', W: '#fff6c0' }),
  chip: S(['..rrr..', '.rwrwr.', 'rwrrrwr', 'rrrWrrr', 'rwrrrwr', '.rwrwr.', '..rrr..'], { r: '#b0102a', w: '#f4f0e8', W: '#f0c030' }),
  leaf: S(['....gg.', '..gGGg.', '.gGgGg.', 'gGgGg..', 'gGGg...', '.gg....', 'b......'], { g: '#3a7a2a', G: '#6ab04a', b: '#5a3a1a' }),
  maple: S(['...o...', 'o.ooo.o', '.ooOoo.', 'ooOOOoo', '..oOo..', '...b...', '...b...'], { o: '#d0601a', O: '#f0a040', b: '#6a3a1a' }),
  petal: S(['.pp.', 'pPPp', '.pp.'], { p: '#7a0a20', P: '#b02040' }),
  ghost: S(['..www..', '.wwwww.', 'wwkwkww', 'wwwwwww', 'wwwkwww', 'wwwwwww', 'w.w.w.w'], { w: '#e8f0ff', k: '#2a2a4a' }),
  talisman: S(['yyyyy', 'yrrry', 'yyryy', 'yrrry', 'yyryy', 'yryry', 'yyryy', 'yrrry', 'yyyyy', '.y.y.'], { y: '#f0d050', r: '#c01a1a' }),
  bell: S(['..y..', '.yyy.', '.yYy.', 'yyYyy', 'yyyyy', 'YYYYY', '..y..'], { y: '#e0b030', Y: '#9a7010' }),
  flame: S(['.y.', 'yoy', 'oro', '.o.'], { y: '#fff0a0', o: '#ff9a20', r: '#e04010' }),
  dagger: S(['.s.', '.s.', '.s.', '.s.', '.S.', '.s.', 'bbb', '.k.', '.k.'], { s: '#d0d8e0', S: '#ffffff', b: '#8a6a2a', k: '#3a2a1a' }),
  skull: S(['.wwwww.', 'wwwwwww', 'wkkwkkw', 'wwwkwww', '.wwwww.', '.w.w.w.'], { w: '#f0ece0', k: K }),
  anchor: S(['..k..', '.kkk.', '..k..', '..k..', 'k.k.k', 'kkkkk', '.kkk.'], { k: '#2a3a4a' }),
  star: S(['..y..', '.yyy.', 'yyYyy', '.yyy.', '..y..'], { y: '#ffe08a', Y: '#ffffff' }),
  mask: S(['kkkk.kkkk', 'kwwkkkwwk', 'kkkk.kkkk', '.kk...kk.'], { k: '#141420', w: '#e8e0ff' }),
  bird: S(['k.....k', '.k...k.', '..k.k..', '...k...'], { k: '#2a2a30' }),
  gull: S(['w.....w', '.w...w.', '..www..', '...w...'], { w: '#f0f4f8' }),
  dove: S(['...ww....', '..wwwk...', 'wwwwwwwy.', '.wwwwww..', '..ww.ww..'], { w: '#f8f8ff', k: K, y: '#f0a040' }),
  butterfly: S(['pp.pp', 'pPkPp', '.pkp.', 'pp.pp'], { p: '#e080c0', P: '#f8c0e0', k: K }),
  gem: S(['.cccc.', 'cCccCc', 'cccccc', '.cccc.', '..cc..'], { c: '#40c0e0', C: '#e0ffff' }),
  crate: S(['bbbbbbbb', 'bBbbbbBb', 'bbBbbBbb', 'bbbBBbbb', 'bbBbbBbb', 'bBbbbbBb', 'bbbbbbbb'], { b: '#8a5a2a', B: '#5a3a1a' }),
  bill: S(['gggggggggg', 'gGggGGggGg', 'gggGWWGggg', 'gGggGGggGg', 'gggggggggg'], { g: '#4a9a4a', G: '#2a6a2a', W: '#d0f0c0' }),
  arrow: S(['...g...', '..ggg..', '.ggggg.', 'ggggggg', '..ggg..', '..ggg..', '..ggg..'], { g: '#30d070' }),
  rocket: S(['..w..', '.wbw.', '.www.', '.wbw.', '.www.', 'r.w.r', 'rrwrr', '.oyo.', '..o..'], { w: '#f0f0f0', b: '#40a0e0', r: '#d03030', o: '#ff9020', y: '#ffe060' }),
  shiba: S(['o.....o', 'oo...oo', 'ooooooo', 'owkokwo', 'oowwwoo', '.owkwo.', '..www..'], { o: '#e09030', w: '#fff0d8', k: K }),
  knight: S(['..kk..', '.kkkk.', 'kkwkkk', '..kkk.', '..kkk.', '.kkkk.', 'kkkkkk'], { k: '#f0ece0', w: '#141414' }),
  queen: S(['k.k.k', 'kkkkk', '.kkk.', '..k..', '.kkk.', 'kkkkk'], { k: '#141414' }),
  plane: S(['.....w.....', '....www....', 'wwwwwwwwwww', '....www....', '...w.w.w...'], { w: '#f4f6fa' }),
  cloud: S(['...wwww.....', '.wwwwwwww.ww', 'wwwwwwwwwwww', '.wwwwwwwwww.'], { w: 'rgba(255,255,255,.85)' }),
  glass: S(['a...a', 'aYYYa', 'aYyYa', 'aYYYa', '.aaa.', '..a..', '.aaa.'], { a: '#c0d0e0', y: '#d08a30', Y: '#a06010' }),
  heart: S(['.pp.pp.', 'pPppppp', 'ppppppp', '.ppppp.', '..ppp..', '...p...'], { p: '#ff5aa0', P: '#ffd0e8' }),
  note: S(['..kk', '..kk', '..k.', '..k.', 'kkk.', 'kkk.'], { k: '#a0e0ff' }),
  moon: S(['..yyy..', '.yyy...', 'yyy....', 'yyy....', 'yyy....', '.yyy...', '..yyy..'], { y: '#f8e8b0' }),
  bigmoon: S(['...rrrr...', '.rrrrrrrr.', 'rrrRrrrrrr', 'rrrrrrrRrr', 'rrRrrrrrrr', 'rrrrrrrrrr', '.rrrrrRrr.', '...rrrr...'], { r: '#c0303a', R: '#901820' }),
  eye: S(['..ppppp..', '.p.....p.', 'p..yky..p', '.p.....p.', '..ppppp..'], { p: '#c080ff', y: '#ffe080', k: K }),
  crosshair: S(['....r....', '....r....', '..rrrrr..', '..r...r..', 'rrr.r.rrr', '..r...r..', '..rrrrr..', '....r....', '....r....'], { r: '#e03030' }),
  compass: S(['..bbb..', '.b.r.b.', 'b..r..b', 'b.wkw.b', 'b..w..b', '.b...b.', '..bbb..'], { b: '#c09040', r: '#d02020', w: '#e0e0e0', k: K }),
  palette: S(['..wwww...', '.wrwwbw..', 'wwwwwwgw.', 'wyw..wwww', 'wwww..ww.', '.wwwwww..'], { w: '#e8d0a0', r: '#d03030', b: '#3060d0', g: '#30a040', y: '#f0c020' }),
  wisp: S(['.c.', 'cCc', '.c.', '.c.'], { c: '#a0f0e0', C: '#ffffff' }),
  tire: S(['.kkk.', 'kgggk', 'kgkgk', 'kgggk', '.kkk.'], { k: '#202020', g: '#606060' }),
  web: S(['w...w...w', '.w..w..w.', '..wwwww..', 'wwwkwkwww', '..wwwww..', '.w..w..w.', 'w...w...w'], { w: 'rgba(220,220,230,.7)', k: 'rgba(0,0,0,0)' }),
  noodle: S(['.sss.', 's.s.s', 'rrrrr', 'rwwwr', '.rrr.'], { s: '#e0e0e0', r: '#d03030', w: '#f8f0e0' }),
  candle: S(['.y.', '.o.', 'www', 'www', 'www', 'www'], { y: '#fff0a0', o: '#ff9020', w: '#efe6d0' }),
  // ── 집안 형편 테마 마스코트 (두 칸이면 번갈아 움직인다) ──
  rat: S(['..........', '.gg.......', 'gggg..ggg.', 'ggkgggggggt', '.ggggggggt.', '..p..p.p...'], { g: '#7a7a82', k: '#101010', t: '#c09098', p: '#c09098' }),
  rat2: S(['..........', '.gg.......', 'gggg..ggg.', 'ggkggggggg.', '.gggggggg.t', '.p..p..p..t'], { g: '#7a7a82', k: '#101010', t: '#c09098', p: '#c09098' }),
  fan: S(['..bbb..', '.b.b.b.', 'bbbcbbb', '.b.b.b.', '..bbb..', '...w...', '...w...', '...w...', '.wwwww.'], { b: '#8ac8f0', c: '#ffffff', w: '#e8e8e8' }),
  fan2: S(['.b...b.', '..bbb..', '.bbcbb.', '..bbb..', '.b...b.', '...w...', '...w...', '...w...', '.wwwww.'], { b: '#8ac8f0', c: '#ffffff', w: '#e8e8e8' }),
  cooker: S(['..s....', '...s...', '..s....', '.wwwww.', 'wrrrrrw', 'wwwwwww', 'wwgwwww', '.wwwww.'], { s: 'rgba(255,255,255,.8)', w: '#f0f0f0', r: '#c03030', g: '#40c040' }),
  cooker2: S(['...s...', '..s....', '...s...', '.wwwww.', 'wrrrrrw', 'wwwwwww', 'wwwwgww', '.wwwww.'], { s: 'rgba(255,255,255,.8)', w: '#f0f0f0', r: '#c03030', g: '#40c040' }),
  aircon: S(['wwwww', 'wbbbw', 'wwwww', 'wgggw', 'wgggw', 'wgggw', 'wwwww', 'wwwww', 'wwwww'], { w: '#f8f8f8', b: '#40c0ff', g: '#d0d6dc' }),
  aircon2: S(['wwwww', 'wBBBw', 'wwwww', 'wgggw', 'wgggw', 'wgggw', 'wwwww', 'wwwww', 'wwwww'], { w: '#f8f8f8', B: '#a0e8ff', g: '#d0d6dc' }),
  chandelier: S(['...y...', '.yyyyy.', 'y.y.y.y', 'w.w.w.w', '.......'], { y: '#e8c060', w: '#fff8d0' }),
  chandelier2: S(['...y...', '.yyyyy.', 'y.y.y.y', '.w.w.w.', 'w.....w'], { y: '#e8c060', w: '#ffffff' }),
  trophy: S(['yyyyyyy', 'yyWyyyy', '.yyyyy.', '..yyy..', '...y...', '..bbb..', '.bbbbb.'], { y: '#f0c040', W: '#fff8c0', b: '#5a3a24' }),
  trophy2: S(['yyyyyyy', 'yyyyyWy', '.yyyyy.', '..yyy..', '...y...', '..bbb..', '.bbbbb.'], { y: '#f0c040', W: '#fff8c0', b: '#5a3a24' }),
  goldpile: S(['....yy....', '...yWyy...', '..yyyyyy..', '.yyyWyyyy.', 'yyyyyyyyyy', 'dddddddddd'], { y: '#f0c040', W: '#fff8c0', d: '#a07810' }),
  goldpile2: S(['....yy....', '...yyyW...', '..yWyyyy..', '.yyyyyyWy.', 'yyyyyyyyyy', 'dddddddddd'], { y: '#f0c040', W: '#fff8c0', d: '#a07810' }),
  fedora: S(['..kkkk..', '.kkkkkk.', '.krrrrk.', 'kkkkkkkk'], { k: '#1a1a1a', r: '#7a1a1a' }),
};

// ───────────────────────── 테두리 띠 (SVG) ─────────────────────────
const anim = (attr: string, vals: string, dur: number, begin = 0) => `<animate attributeName="${attr}" values="${vals}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/>`;

function edgeSVG(kind: string, c: string, c2: string): string {
  switch (kind) {
    case 'blood': {
      // 위에서 번져 내려오는 피: 띠 + 길이가 제각각인 핏물 줄기가 천천히 늘었다 줄었다 + 끝의 방울
      let d = '';
      const xs = [6, 17, 31, 40, 55, 68, 79, 93, 104, 115];
      xs.forEach((x, i) => {
        const l = 6 + ((i * 7) % 13);
        const w = 2 + (i % 3);
        d += `<rect x="${x}" y="4" width="${w}" height="${l}" rx="${w / 2}" fill="${c}">${anim('height', `${l};${l + 7};${l}`, 5 + (i % 4), i * 0.6)}</rect>`;
        d += `<circle cx="${x + w / 2}" cy="${4 + l}" r="${w / 2 + 0.8}" fill="${c}">${anim('cy', `${4 + l};${11 + l};${4 + l}`, 5 + (i % 4), i * 0.6)}</circle>`;
      });
      return svgURL(120, 30, `<path d="M0 0H120V5Q110 9 100 5T80 6T60 4T40 7T20 5T0 6Z" fill="${c}"/>${d}<path d="M0 0H120V2Q100 4 80 2T40 3T0 2Z" fill="${c2}" opacity=".6"/>`);
    }
    case 'vines': {
      let lv = '';
      for (let x = 6; x < 120; x += 14) lv += `<ellipse cx="${x}" cy="${x % 28 ? 9 : 4}" rx="4" ry="2" fill="${c2}" transform="rotate(${x % 28 ? 25 : -25} ${x} ${x % 28 ? 9 : 4})"/>`;
      return svgURL(120, 22, `<path d="M0 6Q15 0 30 6T60 6T90 6T120 6" stroke="${c}" stroke-width="2.5" fill="none"/>${lv}<path d="M45 6Q47 14 44 20" stroke="${c}" stroke-width="1.5" fill="none"/><path d="M95 6Q98 12 95 17" stroke="${c}" stroke-width="1.5" fill="none"/>`);
    }
    case 'bunting': {
      const g = ['♠', '♥', '♦', '♣'];
      let t = '';
      for (let i = 0; i < 6; i++) {
        const x = i * 20;
        const red = i % 2 === 1;
        t += `<path d="M${x + 1} 2L${x + 19} 2L${x + 10} 18Z" fill="${red ? '#f4ece0' : c}" stroke="${c2}" stroke-width=".8"/><text x="${x + 10}" y="10" font-size="7" text-anchor="middle" fill="${red ? '#c01a2a' : '#f4ece0'}">${g[i % 4]}</text>`;
      }
      return svgURL(120, 22, `<path d="M0 2Q60 6 120 2" stroke="${c2}" stroke-width="1"/>${t}`);
    }
    case 'talisman': {
      let t = '';
      for (let i = 0; i < 4; i++) {
        const x = 8 + i * 30;
        t += `<g>${anim('opacity', '1;.85;1', 3 + i, i)}<rect x="${x}" y="0" width="10" height="${20 + (i % 2) * 6}" fill="#f0d050"/><path d="M${x + 2} 4h6M${x + 5} 4v14M${x + 2} 10h6M${x + 3} 16l2-3 2 3" stroke="#c01a1a" stroke-width="1.2" fill="none"/></g>`;
      }
      return svgURL(120, 28, `<path d="M0 1H120" stroke="${c}" stroke-width="2"/>${t}`);
    }
    case 'curtain': {
      let s = '';
      for (let i = 0; i < 4; i++) s += `<path d="M${i * 30} 0Q${i * 30 + 15} 22 ${i * 30 + 30} 0Z" fill="${c}"/><path d="M${i * 30 + 3} 2Q${i * 30 + 15} 18 ${i * 30 + 27} 2" stroke="${c2}" stroke-width="1.5" fill="none"/>`;
      let f = '';
      for (let x = 2; x < 120; x += 5) f += `<rect x="${x}" y="${Math.round(10 - Math.abs(((x % 30) - 15) / 1.6))}" width="1.2" height="5" fill="${c2}"/>`;
      return svgURL(120, 24, s + f);
    }
    case 'neon': {
      return svgURL(120, 14, `<defs><filter id="g" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="1.6"/></filter></defs><g>${anim('opacity', '1;1;.4;1;1;.7;1', 4)}<path d="M0 4H120" stroke="${c}" stroke-width="3" filter="url(#g)"/><path d="M0 4H120" stroke="#fff" stroke-width=".8"/></g><g>${anim('opacity', '.9;.5;.9', 2.5)}<path d="M0 10H120" stroke="${c2}" stroke-width="2.4" filter="url(#g)"/><path d="M0 10H120" stroke="#fff" stroke-width=".6"/></g>`);
    }
    case 'rope': {
      let r = '';
      for (let x = 0; x < 120; x += 6) r += `<path d="M${x} 3L${x + 6} 9" stroke="${c}" stroke-width="3.2"/><path d="M${x + 1} 3L${x + 6} 8" stroke="${c2}" stroke-width="1"/>`;
      return svgURL(120, 12, r);
    }
    case 'chain': {
      let r = '';
      for (let x = 0; x < 120; x += 12) r += `<rect x="${x}" y="2" width="10" height="7" rx="3.5" fill="none" stroke="${c}" stroke-width="2"/><rect x="${x + 7}" y="4" width="8" height="3" rx="1.5" fill="none" stroke="${c2}" stroke-width="1.6"/>`;
      return svgURL(120, 12, r);
    }
    case 'tape': {
      let r = `<rect x="0" y="2" width="120" height="10" fill="#f0c020"/>`;
      for (let x = -10; x < 130; x += 10) r += `<path d="M${x} 12L${x + 6} 2H${x + 11}L${x + 5} 12Z" fill="#141414"/>`;
      return svgURL(120, 14, r);
    }
    case 'barbed': {
      let r = `<path d="M0 6H120" stroke="${c}" stroke-width="1.4"/><path d="M0 7H120" stroke="${c2}" stroke-width=".6"/>`;
      for (let x = 8; x < 120; x += 20) r += `<path d="M${x - 4} 2L${x + 4} 10M${x + 4} 2L${x - 4} 10" stroke="${c}" stroke-width="1.4"/>`;
      return svgURL(120, 12, r);
    }
    case 'gold': {
      let b = '';
      for (let x = 3; x < 120; x += 6) b += `<circle cx="${x}" cy="9" r="1.6" fill="#fff0b0"/>`;
      return svgURL(120, 14, `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="#6a4a10"/></linearGradient></defs><rect width="120" height="6" fill="url(#g)"/><rect y="7" width="120" height="4" fill="${c2}"/>${b}<rect y="12" width="120" height="1" fill="#6a4a10"/>`);
    }
    case 'checker': {
      let r = '';
      for (let x = 0; x < 120; x += 6) r += `<rect x="${x}" y="${(x / 6) % 2 ? 0 : 6}" width="6" height="6" fill="${c}"/><rect x="${x}" y="${(x / 6) % 2 ? 6 : 0}" width="6" height="6" fill="${c2}"/>`;
      return svgURL(120, 12, r);
    }
    case 'beads': {
      let r = `<path d="M0 3Q60 9 120 3" stroke="${c2}" stroke-width=".8" fill="none"/>`;
      for (let x = 3; x < 120; x += 7) r += `<circle cx="${x}" cy="${3 + 6 * Math.sin((x / 120) * Math.PI)}" r="2.8" fill="${c}"/><circle cx="${x - 0.8}" cy="${2.2 + 6 * Math.sin((x / 120) * Math.PI)}" r=".8" fill="#fff" opacity=".5"/>`;
      return svgURL(120, 14, r + `<path d="M60 9v8" stroke="#c02020" stroke-width="2"/><path d="M58 17h4l-1 6h-2z" fill="#c02020"/>`);
    }
    case 'lace': {
      let r = '';
      for (let i = 0; i < 8; i++) r += `<path d="M${i * 15} 0Q${i * 15 + 7.5} 16 ${i * 15 + 15} 0Z" fill="${c}"/><circle cx="${i * 15 + 7.5}" cy="5" r="2" fill="none" stroke="${c2}" stroke-width=".8"/><circle cx="${i * 15 + 7.5}" cy="11" r="1" fill="${c2}"/>`;
      return svgURL(120, 16, r);
    }
    case 'code': {
      let t = '';
      for (let row = 0; row < 3; row++) {
        let s = '';
        for (let i = 0; i < 24; i++) s += (i * 7 + row * 3) % 5 < 2 ? '1' : (i * 3 + row) % 4 ? '0' : ' ';
        t += `<text x="0" y="${5 + row * 6}" font-size="6" font-family="monospace" fill="${c}" opacity="${1 - row * 0.3}">${s}${anim('opacity', `${1 - row * 0.3};.2;${1 - row * 0.3}`, 1.5 + row, row * 0.4)}</text>`;
      }
      return svgURL(120, 20, t);
    }
    case 'ticker': {
      const msg = '▲ +420% ▲ TO THE MOON ▼ -12% ▲ +88% ';
      return svgURL(240, 12, `<rect width="240" height="12" fill="#0a1410"/><g>${'<animateTransform attributeName="transform" type="translate" from="0 0" to="-120 0" dur="6s" repeatCount="indefinite"/>'}<text x="0" y="9" font-size="8" font-family="monospace" fill="${c}">${msg}${msg}</text></g>`);
    }
    case 'waves': {
      return svgURL(120, 16, `<path d="M0 6Q10 0 20 6T40 6T60 6T80 6T100 6T120 6V0H0Z" fill="${c}"/><path d="M0 6Q10 0 20 6T40 6T60 6T80 6T100 6T120 6" stroke="#e8f8ff" stroke-width="1.4" fill="none">${anim('stroke-dashoffset', '0;20', 2)}</path><circle cx="30" cy="10" r="1" fill="#e8f8ff">${anim('cy', '9;14;9', 2)}</circle><circle cx="85" cy="10" r="1" fill="#e8f8ff">${anim('cy', '9;14;9', 2.6)}</circle>`);
    }
    case 'torn': {
      let p = 'M0 0H120V8';
      for (let x = 120; x >= 0; x -= 6) p += `L${x} ${8 + ((x * 13) % 7)}`;
      return svgURL(120, 16, `<path d="${p}Z" fill="${c}"/><path d="M0 3H120" stroke="${c2}" stroke-width=".6" stroke-dasharray="3 3"/>`);
    }
    case 'blinds': {
      let r = '';
      for (let y = 0; y < 18; y += 4) r += `<rect y="${y}" width="120" height="3" fill="${c}" opacity="${1 - y / 24}"/>`;
      return svgURL(120, 18, r + `<path d="M60 0V18" stroke="${c2}" stroke-width=".8"/>`);
    }
    case 'laser': {
      return svgURL(120, 18, `<defs><filter id="g"><feGaussianBlur stdDeviation=".8"/></filter></defs><g stroke="${c}" stroke-width="1" filter="url(#g)">${anim('opacity', '1;.3;1', 1.8)}<path d="M0 2L120 16"/><path d="M0 16L120 4"/><path d="M0 9L120 9"/></g><g stroke="#fff" stroke-width=".3"><path d="M0 2L120 16"/><path d="M0 16L120 4"/></g>`);
    }
    case 'fence': {
      let r = '';
      for (let x = -12; x < 132; x += 8) r += `<path d="M${x} 0L${x + 12} 12M${x + 12} 0L${x} 12" stroke="${c}" stroke-width="1"/>`;
      return svgURL(120, 12, r + `<path d="M0 12H120" stroke="${c2}" stroke-width="2"/>`);
    }
    default:
      return 'none';
  }
}

// ───────────────────────── 직업별 설정 ─────────────────────────
type Motion = 'fall' | 'rise' | 'fly' | 'float' | 'twinkle' | 'sway';
interface Deco {
  edge: string;
  ec: string;
  ec2: string;
  /** 배경 뒤를 지나가는 실루엣 [그림, 개수, 움직임, 크기(px)] */
  sil?: [string, number, Motion, number][];
  /** 화면 위 입자 [종류 또는 그림, 개수, 움직임, 크기] — 'rain'·'smoke'·'ember'·'mote'는 그림 없이 CSS */
  ptc?: [string, number, Motion, number][];
  corner?: string;
  /** 화면 전체에 덧씌우는 분위기 */
  over?: 'moon' | 'scan' | 'spot' | 'fog' | 'noir' | 'heat' | 'sea' | 'stars';
}

export const DECO: Record<string, Deco> = {
  hj_vampire: { edge: 'blood', ec: '#7a0614', ec2: '#c0182a', sil: [['bat', 8, 'fly', 40], ['bigmoon', 1, 'float', 120], ['bat', 3, 'float', 30]], ptc: [['drop', 10, 'fall', 10], ['petal', 5, 'sway', 10]], corner: 'drop', over: 'moon' },
  hj_adventurer: { edge: 'vines', ec: '#3a5a20', ec2: '#6aa040', sil: [['bird', 5, 'fly', 22], ['compass', 1, 'float', 60]], ptc: [['leaf', 8, 'sway', 12], ['mote', 10, 'float', 3]], corner: 'compass', over: 'fog' },
  hj_magician: { edge: 'curtain', ec: '#6a1030', ec2: '#e0b040', sil: [['dove', 4, 'fly', 30], ['card', 5, 'float', 20]], ptc: [['star', 12, 'twinkle', 8], ['card', 4, 'sway', 14]], corner: 'star', over: 'spot' },
  hj_shaman: { edge: 'talisman', ec: '#b02020', ec2: '#f0d050', sil: [['bell', 3, 'float', 26], ['talisman', 4, 'sway', 22]], ptc: [['petal', 8, 'sway', 9], ['ember', 8, 'rise', 3]], corner: 'talisman', over: 'fog' },
  hj_cult: { edge: 'lace', ec: '#2a1440', ec2: '#c080ff', sil: [['eye', 2, 'float', 70], ['candle', 5, 'float', 20]], ptc: [['ember', 14, 'rise', 3], ['smoke', 4, 'rise', 60]], corner: 'eye', over: 'spot' },
  hj_memecoin: { edge: 'ticker', ec: '#40ff90', ec2: '#0a1410', sil: [['shiba', 3, 'float', 40], ['rocket', 3, 'rise', 26]], ptc: [['coin', 12, 'fall', 12], ['arrow', 4, 'rise', 14]], corner: 'coin', over: 'stars' },
  hj_gambler: { edge: 'bunting', ec: '#1a3a24', ec2: '#c0a040', sil: [['spade', 5, 'float', 24], ['card', 4, 'float', 24]], ptc: [['chip', 8, 'fall', 12], ['card', 4, 'sway', 14]], corner: 'spade', over: 'spot' },
  hj_natural: { edge: 'vines', ec: '#2a5a1a', ec2: '#80c050', sil: [['butterfly', 4, 'fly', 16], ['bird', 3, 'fly', 20]], ptc: [['leaf', 10, 'sway', 12], ['maple', 4, 'sway', 12]], corner: 'leaf', over: 'fog' },
  hj_hermit: { edge: 'blinds', ec: '#4a4a40', ec2: '#2a2a24', sil: [['noodle', 2, 'float', 34], ['moon', 1, 'float', 40]], ptc: [['mote', 18, 'float', 3]], corner: 'noodle', over: 'noir' },
  hj_assassin: { edge: 'barbed', ec: '#8a8a9a', ec2: '#3a3a44', sil: [['bird', 5, 'fly', 26], ['moon', 1, 'float', 50]], ptc: [['rain', 30, 'fall', 1], ['dagger', 2, 'float', 18]], corner: 'dagger', over: 'noir' },
  hj_hacker: { edge: 'code', ec: '#30ff80', ec2: '#0a2a1a', sil: [['skull', 2, 'float', 40]], ptc: [['code', 16, 'fall', 10]], corner: 'skull', over: 'scan' },
  hj_spy: { edge: 'laser', ec: '#ff2030', ec2: '#200a0a', sil: [['mask', 2, 'float', 40], ['crosshair', 2, 'float', 50]], ptc: [['mote', 10, 'float', 2]], corner: 'crosshair', over: 'noir' },
  hj_smuggler: { edge: 'rope', ec: '#8a6a3a', ec2: '#c0a070', sil: [['crate', 4, 'float', 30], ['gem', 3, 'twinkle', 18]], ptc: [['mote', 14, 'float', 3], ['gem', 4, 'twinkle', 10]], corner: 'gem', over: 'fog' },
  hj_pirate: { edge: 'waves', ec: '#1a4a7a', ec2: '#e8f8ff', sil: [['gull', 5, 'fly', 22], ['skull', 1, 'float', 50], ['anchor', 1, 'float', 40]], ptc: [['mote', 12, 'float', 3]], corner: 'anchor', over: 'sea' },
  hj_mercenary: { edge: 'barbed', ec: '#6a6a5a', ec2: '#3a3a2a', sil: [['plane', 2, 'fly', 40]], ptc: [['ember', 14, 'rise', 3], ['smoke', 4, 'rise', 70]], corner: 'crosshair', over: 'heat' },
  hj_trader: { edge: 'ticker', ec: '#40e0ff', ec2: '#0a1420', sil: [['arrow', 4, 'rise', 30], ['bill', 3, 'float', 30]], ptc: [['bill', 8, 'sway', 16]], corner: 'arrow', over: 'scan' },
  hj_bounty: { edge: 'rope', ec: '#7a5a2a', ec2: '#b08a50', sil: [['crosshair', 2, 'float', 50], ['bird', 3, 'fly', 22]], ptc: [['mote', 18, 'sway', 3]], corner: 'crosshair', over: 'heat' },
  hj_tarot: { edge: 'curtain', ec: '#2a1a4a', ec2: '#e0c060', sil: [['moon', 1, 'float', 60], ['eye', 1, 'float', 50]], ptc: [['star', 16, 'twinkle', 8], ['card', 3, 'sway', 14]], corner: 'star', over: 'stars' },
  hj_thief: { edge: 'laser', ec: '#ff3050', ec2: '#100a14', sil: [['mask', 1, 'float', 60], ['moon', 1, 'float', 50]], ptc: [['gem', 6, 'twinkle', 10], ['star', 6, 'twinkle', 6]], corner: 'mask', over: 'noir' },
  hj_exorcist: { edge: 'beads', ec: '#5a3a1a', ec2: '#2a1a0a', sil: [['ghost', 4, 'float', 30]], ptc: [['wisp', 10, 'rise', 8], ['ember', 6, 'rise', 3]], corner: 'talisman', over: 'fog' },
  hj_nomad: { edge: 'torn', ec: '#d8c090', ec2: '#8a6a3a', sil: [['bird', 4, 'fly', 20], ['compass', 1, 'float', 50]], ptc: [['mote', 22, 'sway', 3]], corner: 'compass', over: 'heat' },
  hj_fighter: { edge: 'fence', ec: '#8a8a8a', ec2: '#3a3a3a', ptc: [['smoke', 5, 'rise', 70], ['mote', 10, 'float', 3]], corner: 'skull', over: 'spot' },
  hj_forger: { edge: 'gold', ec: '#c0902a', ec2: '#6a2a1a', sil: [['palette', 2, 'float', 40]], ptc: [['drop', 6, 'fall', 7], ['mote', 10, 'float', 3]], corner: 'palette', over: 'spot' },
  hj_vtuber: { edge: 'neon', ec: '#ff4ab0', ec2: '#40e0ff', sil: [['heart', 4, 'float', 22], ['note', 4, 'float', 20]], ptc: [['heart', 10, 'rise', 10], ['star', 8, 'twinkle', 7]], corner: 'heart', over: 'scan' },
  hj_drifter: { edge: 'checker', ec: '#f0f0f0', ec2: '#141414', sil: [['tire', 2, 'float', 30]], ptc: [['smoke', 6, 'rise', 70], ['ember', 12, 'rise', 3]], corner: 'tire', over: 'heat' },
  hj_private_jet: { edge: 'gold', ec: '#d8b050', ec2: '#1a2a4a', sil: [['plane', 2, 'fly', 50], ['cloud', 5, 'fly', 70]], ptc: [['star', 8, 'twinkle', 6]], corner: 'star', over: 'stars' },
  hj_underground_dealer: { edge: 'gold', ec: '#c0902a', ec2: '#3a0a10', sil: [['card', 4, 'float', 26], ['chip', 4, 'float', 22]], ptc: [['chip', 8, 'fall', 12], ['coin', 6, 'fall', 10]], corner: 'chip', over: 'spot' },
  hj_chess_master: { edge: 'checker', ec: '#e8e0d0', ec2: '#1a1a1a', sil: [['knight', 2, 'float', 50], ['queen', 2, 'float', 40]], ptc: [['star', 8, 'twinkle', 6]], corner: 'knight', over: 'spot' },
  hj_mafia: { edge: 'chain', ec: '#8a8a90', ec2: '#3a3a40', sil: [['fedora', 2, 'float', 44], ['glass', 2, 'float', 30]], ptc: [['smoke', 6, 'rise', 80], ['rain', 18, 'fall', 1]], corner: 'fedora', over: 'noir' },
  hj_godmother: { edge: 'lace', ec: '#140810', ec2: '#a01a3a', sil: [['rose', 4, 'float', 30], ['web', 2, 'float', 50]], ptc: [['petal', 12, 'sway', 9], ['smoke', 3, 'rise', 70]], corner: 'rose', over: 'noir' },
};

// ───────────────────────── 그리기 ─────────────────────────
const rnd = (seed: number) => {
  let x = seed;
  return () => ((x = (x * 9301 + 49297) % 233280) / 233280);
};
const CSS_ONLY = new Set(['rain', 'smoke', 'ember', 'mote', 'code']);

/** 배경 뒤 실루엣 (.theme-bg 안에) */
export function silHTML(jobId: string): string {
  const d = DECO[jobId];
  if (!d?.sil) return '';
  const r = rnd(jobId.length * 97);
  let out = '';
  for (const [spr, n, mo, size] of d.sil)
    for (let i = 0; i < n; i++) {
      const sz = Math.round(size * (0.7 + r() * 0.6));
      const top = mo === 'fly' ? 8 + r() * 45 : spr === 'bigmoon' || spr === 'moon' ? 6 + r() * 6 : 10 + r() * 75;
      const left = spr === 'bigmoon' || spr === 'moon' ? 62 + r() * 20 : r() * 90;
      out += `<i class="td-s m-${mo}" style="--x:${left.toFixed(1)}%;--y:${top.toFixed(1)}%;--sz:${sz}px;--d:${(8 + r() * 14).toFixed(1)}s;--dl:${(-r() * 20).toFixed(1)}s;background-image:${pixURL(SPR[spr])}"></i>`;
    }
  return out;
}

/** 화면 위 입자 (콘텐츠 위, 클릭은 통과) */
export function ptcHTML(jobId: string): string {
  const d = DECO[jobId];
  if (!d?.ptc) return '';
  const r = rnd(jobId.length * 131 + 7);
  let out = '';
  for (const [k, n, mo, size] of d.ptc)
    for (let i = 0; i < n; i++) {
      const sz = Math.max(1, Math.round(size * (0.7 + r() * 0.7)));
      const css = CSS_ONLY.has(k);
      const img = css ? (k === 'code' ? '' : '') : `background-image:${pixURL(SPR[k])};`;
      const txt = k === 'code' ? (r() > 0.5 ? '1' : '0') : '';
      out += `<i class="td-p m-${mo}${css ? ` c-${k}` : ''}" style="--x:${(r() * 100).toFixed(1)}%;--y:${(r() * 100).toFixed(1)}%;--sz:${sz}px;--d:${(k === 'rain' ? 0.7 + r() * 0.6 : 6 + r() * 10).toFixed(2)}s;--dl:${(-r() * 16).toFixed(2)}s;${img}">${txt}</i>`;
    }
  return out;
}

/** #app 에 꽂을 CSS 변수 (테두리 띠·카드 귀퉁이) */
export function decoVars(jobId: string): Record<string, string> {
  const d = DECO[jobId];
  if (!d) return {};
  return {
    '--td-edge': edgeSVG(d.edge, d.ec, d.ec2),
    '--td-edge-h': `${['ticker', 'code', 'neon', 'rope', 'chain', 'tape', 'barbed', 'checker', 'fence', 'gold'].includes(d.edge) ? 14 : d.edge === 'blood' ? 30 : 24}px`,
    '--td-corner': d.corner ? pixURL(SPR[d.corner]) : 'none',
  };
}
export const decoOver = (jobId: string) => DECO[jobId]?.over ?? '';
export const decoEdge = (jobId: string) => DECO[jobId]?.edge ?? '';

/** 두 칸 그림을 가로로 이어 붙인 스프라이트 시트 (steps(2) 애니메이션용) */
export function sheetURL(a: string, b: string): string {
  const A = SPR[a];
  const B = SPR[b];
  const w = Math.max(...A.rows.map((r) => r.length), ...B.rows.map((r) => r.length));
  const h = Math.max(A.rows.length, B.rows.length);
  const pad = (rows: string[]) => Array.from({ length: h }, (_, i) => (rows[i] ?? '').padEnd(w, '.'));
  const ra = pad(A.rows);
  const rb = pad(B.rows);
  const pal = { ...A.pal };
  // 두 번째 그림 색은 대문자/소문자가 겹칠 수 있어 그대로 합친다 (같은 글자는 같은 색으로 맞춰 둠)
  Object.assign(pal, B.pal);
  return pixURL({ rows: ra.map((r, i) => r + rb[i]), pal });
}
