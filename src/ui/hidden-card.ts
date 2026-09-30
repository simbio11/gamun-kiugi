// 히든 카드: 플레이어가 준 고해상도 도트 그림에 움직임을 입힌다.
//   · 인물을 배경에서 오려 내(.fig) 따로 움직인다: 배경은 천천히 밀려가고, 인물은 숨 쉬듯 들썩이며 살짝 흔들린다 (gif 느낌)
//   · 아직 못 얻은 카드는 흐릿하고 어두운 배경 위 새까만 실루엣
//   · 직업마다 다른 입자 효과: 보케·지폐·촛불·마법 가루·카드·나뭇잎·비·스캔라인·불씨·연기…
//   · 히든 전용 테두리: 무지개빛 금테 + 광채 + 빛 스침
import { HIDDEN_BY_ID, isSuperHidden, type HiddenFx, type HiddenJob } from '../core/hidden-data';

const FILES = import.meta.glob('../assets/hidden/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const NAMED = Object.entries(FILES).map(([k, v]) => [k.split('/').pop()!.replace('.webp', ''), v] as const);
/** 전체 그림 / 인물만 오려 낸 그림 (배경 투명) */
const ART: Record<string, string> = Object.fromEntries(NAMED.filter(([n]) => !n.endsWith('.fig')));
const FIG: Record<string, string> = Object.fromEntries(NAMED.filter(([n]) => n.endsWith('.fig')).map(([n, v]) => [n.slice(0, -4), v]));

/** 이 직업·성별의 그림 (여러 장이면 seed로 고른다). 없으면 undefined */
export function hiddenArt(id: string, sex: 'M' | 'F' = 'F', seed = 0): { src: string; fig?: string } | undefined {
  const key = id.slice(3);
  const own = Object.keys(ART).filter((n) => n.startsWith(`${key}_${sex === 'F' ? 'f' : 'm'}`)).sort();
  if (!own.length) return undefined;
  const n = own[seed % own.length];
  return { src: ART[n], fig: FIG[n] };
}

/** 입자 효과: 색·모양·움직임 */
const FX: Record<HiddenFx, { n: number; kind: 'up' | 'down' | 'drift' | 'flicker' | 'rain'; col: string[]; glyph?: string[]; size: [number, number] }> = {
  bokeh: { n: 12, kind: 'up', col: ['#ff6aa8', '#ffb0d8', '#c070ff'], size: [4, 10] },
  neon: { n: 8, kind: 'flicker', col: ['#ff4aa0', '#4af0ff'], size: [3, 6] },
  money: { n: 12, kind: 'down', col: ['#6ad06a'], glyph: ['💵', '💸', '🪙'], size: [10, 15] },
  candle: { n: 10, kind: 'up', col: ['#ffc860', '#ff9a40'], size: [2, 4] },
  magic: { n: 16, kind: 'up', col: ['#d08aff', '#ffffff', '#ff8af0'], glyph: ['✦', '✧', '⋆'], size: [8, 13] },
  cards: { n: 8, kind: 'down', col: ['#ffffff'], glyph: ['🂡', '🃁', '🂱', '🃑'], size: [12, 16] },
  leaves: { n: 10, kind: 'down', col: ['#6ac04a'], glyph: ['🍃', '🍂'], size: [9, 13] },
  dust: { n: 14, kind: 'drift', col: ['#f0e0c0', '#ffffff'], size: [1, 3] },
  rain: { n: 26, kind: 'rain', col: ['#a8c8f0'], size: [1, 1] },
  screen: { n: 12, kind: 'down', col: ['#4aff9a', '#4ae0ff'], glyph: ['0', '1', '{', '}', '$'], size: [7, 10] },
  city: { n: 10, kind: 'flicker', col: ['#ffe28a', '#8ad8ff'], size: [2, 3] },
  crate: { n: 12, kind: 'drift', col: ['#d8c098'], size: [1, 3] },
  waves: { n: 12, kind: 'drift', col: ['#ffffff', '#a8e0ff'], size: [2, 4] },
  fire: { n: 16, kind: 'up', col: ['#ff8a2a', '#ffd04a', '#ff4a2a'], size: [2, 4] },
  smoke: { n: 8, kind: 'up', col: ['rgba(220,220,220,.35)'], size: [14, 24] },
  jungle: { n: 12, kind: 'flicker', col: ['#d8ff6a', '#ffffa0'], size: [2, 3] },
  spirit: { n: 10, kind: 'up', col: ['rgba(230,240,255,.55)', '#ffe08a'], size: [5, 12] },
  steam: { n: 8, kind: 'up', col: ['rgba(255,255,255,.3)'], size: [12, 20] },
  shadow: { n: 10, kind: 'flicker', col: ['#c0a0ff'], size: [2, 3] },
};
// 결정적인 난수: 같은 카드는 늘 같은 입자 배치
const rnd = (i: number, k: number) => {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

function particles(fx: HiddenFx): string {
  const f = FX[fx];
  let out = '';
  for (let i = 0; i < f.n; i++) {
    const x = Math.round(rnd(i, 1) * 100);
    const y = Math.round(rnd(i, 5) * 100);
    const s = f.size[0] + Math.round(rnd(i, 2) * (f.size[1] - f.size[0]));
    const d = (rnd(i, 3) * 6).toFixed(2);
    const t = (f.kind === 'rain' ? 0.6 + rnd(i, 4) * 0.5 : 3 + rnd(i, 4) * 4).toFixed(2);
    const col = f.col[i % f.col.length];
    const g = f.glyph ? f.glyph[i % f.glyph.length] : '';
    out += `<i class="hp hp-${f.kind}${g ? ' hp-g' : ''}" style="--x:${x}%;--y:${y}%;--s:${s}px;--d:-${d}s;--t:${t}s;--c:${col}">${g}</i>`;
  }
  return out;
}

/** 카드 앞면 (썸네일·크게 보기·보상 창 공용). 잠겨 있으면 실루엣과 힌트 */
export function hiddenCardHTML(id: string, o: { sex?: 'M' | 'F'; seed?: number; locked?: boolean; cls?: string } = {}): string {
  const h: HiddenJob | undefined = HIDDEN_BY_ID[id];
  if (!h) return '';
  const superJob = isSuperHidden(id);
  const pickSex = o.sex ?? ([...id].reduce((a, c) => a + c.charCodeAt(0), 0) % 2 ? 'M' : 'F');
  const a = hiddenArt(id, pickSex, o.seed ?? 0) ?? hiddenArt(id, pickSex === 'F' ? 'M' : 'F', o.seed ?? 0);
  if (o.locked)
    // 아직 모르는 직업: 흐릿하고 어두운 배경 위 새까만 실루엣. 이름은 숨기고 수수께끼만
    return `<div class="hid-card locked ${superJob ? 'is-super' : ''} ${o.cls ?? ''}"><div class="hid-stage">${
      a ? `<img class="hid-back" src="${a.src}" alt=""><img class="hid-img hid-blur" src="${a.src}" alt="">${a.fig ? `<img class="hid-img hid-sil" src="${a.fig}" alt="">` : ''}` : ''
    }<div class="hid-q">?</div></div><div class="hid-plate"><i class="hid-orn l"></i><div class="hid-pl-in only"><b>${superJob ? 'SUPER HIDDEN' : 'HIDDEN JOB'}</b></div><i class="hid-orn r"></i><em class="hid-medal">${superJob ? '👑' : '?'}</em></div></div>`;
  const art = a
    ? `<img class="hid-back" src="${a.src}" alt=""><div class="hid-pan"><img class="hid-img hid-bg" src="${a.src}" alt="">${a.fig ? `<img class="hid-img hid-fig" src="${a.fig}" alt="">` : ''}</div>`
    : `<div class="hid-q">${h.icon}<small>그림 준비 중</small></div>`;
  return `<div class="hid-card fx-${h.fx} ${superJob ? 'is-super' : ''} ${o.cls ?? ''}" style="--hc:${h.color}">
    <div class="hid-stage">${art}<div class="hid-fx">${particles(h.fx)}</div><i class="hid-shine"></i></div>
    <div class="hid-plate"><i class="hid-orn l"></i><div class="hid-pl-in"><b>${superJob ? '👑 SUPER HIDDEN 👑' : '✦ HIDDEN JOB ✦'}</b><span>${h.name}</span></div><i class="hid-orn r"></i><em class="hid-medal">${h.icon}</em></div>
    <i class="hid-glint g1"></i><i class="hid-glint g2"></i><i class="hid-glint g3"></i>
  </div>`;
}
