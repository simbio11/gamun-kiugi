// 큰 시간선: 1960년에서 22세기까지 한 줄로 이어진다.
//
// · 시대(Epoch)마다 이름·분위기가 있고, 뉴스가 오는 매체가 바뀐다.
//     연말 뉴스: 종이 신문(~2004) → 포털 뉴스(2005~2029) → 숏폼 영상 뉴스(2030~2049) → AR 피드(2050~) → AI 브리핑(2080~) → 뉴럴 뉴스(2140~)
//     큰 사건 속보: 호외(~1989) → TV 속보(~2009) → 휴대폰 알림(~2039) → 홀로그램 속보(~2069) → AI 비서(2070~) → 뉴럴 속보(2140~)
// · 2025년까지는 실제 기록(history.ts), 그 뒤는 게임 속 상상이다. 실존 인물 이름은 쓰지 않는다.
// · 2026년부터는 모드와 상관없이 같은 미래가 온다: 근현대사에서 넘어온 가문도, 현대에서 시작한 가문도.
// · 미래의 굵직한 전환점(자율주행·로봇·노화 역전·달 기지·화성 이주·AI 시민권 …)은 선택이 있는 사건으로 온다.

import { addFlag, age, alive, clamp, fullName, hasFlag, head, householder, isMainline } from './people';
import { chance } from './rng';
import { addHolding, formatMoney } from './economy';
import type { ActionDef } from './actions';
import { unlock } from './achievements';
import { wageIndex } from './pay';
import { gate, type Choice, type Ctx, type EventDef } from './ev-util';
import { histStyle, inHist, NEWS } from './history';
import { NEWS_MORE } from './news-more';
import { FILLER, futurePool, MILESTONES } from './future-news';
import { isWitness } from './stories-ages';
import type { GameState, Person } from './types';

// ───────────────────────── 시대 ─────────────────────────

export interface Epoch {
  from: number;
  name: string;
  icon: string;
  /** 화면 분위기 (style.css의 data-epoch) */
  theme: string;
}
export const EPOCHS: Epoch[] = [
  { from: 0, name: '전후 재건기', icon: '🌾', theme: 'e60' },
  { from: 1970, name: '개발 연대', icon: '🏭', theme: 'e70' },
  { from: 1980, name: '민주화와 올림픽', icon: '🏟', theme: 'e80' },
  { from: 1990, name: 'X세대와 IMF', icon: '📟', theme: 'e90' },
  { from: 2000, name: '디지털 코리아', icon: '💿', theme: 'e00' },
  { from: 2010, name: '스마트폰 시대', icon: '📱', theme: 'e10' },
  { from: 2020, name: '팬데믹과 AI', icon: '😷', theme: 'e20' },
  { from: 2030, name: 'AI 전환기', icon: '🤖', theme: 'e30' },
  { from: 2040, name: '로봇과 초고령 사회', icon: '🦾', theme: 'e40' },
  { from: 2050, name: '탄소중립 이후', icon: '🌿', theme: 'e50' },
  { from: 2060, name: '장수와 우주의 시대', icon: '🌙', theme: 'e60f' },
  { from: 2080, name: '신인류 시대', icon: '🧬', theme: 'e80f' },
  { from: 2100, name: '22세기 · 태양계 경제권', icon: '🪐', theme: 'e100' },
  { from: 2120, name: '궤도 도시와 테라포밍', icon: '🛰', theme: 'e120' },
  { from: 2140, name: '행성간 문명', icon: '🌌', theme: 'e140' },
  { from: 2170, name: '별을 향해', icon: '✨', theme: 'e170' },
  { from: 2200, name: '23세기', icon: '🌠', theme: 'e200' },
];
export function epochOf(y: number): Epoch {
  let e = EPOCHS[0];
  for (const x of EPOCHS) if (y >= x.from) e = x;
  return e;
}

export type NewsMedium = 'paper' | 'portal' | 'shorts' | 'feed' | 'ai' | 'neural';
/** 연말 뉴스를 어디서 보나 */
export const newsMedium = (y: number): NewsMedium => (y < 2005 ? 'paper' : y < 2030 ? 'portal' : y < 2050 ? 'shorts' : y < 2080 ? 'feed' : y < 2140 ? 'ai' : 'neural');
export type AlertMedia = 'extra' | 'tv' | 'push' | 'holo' | 'ai' | 'neural';
/** 큰 사건 속보가 어떻게 들이닥치나 */
export const alertMedia = (y: number): AlertMedia => (y < 1990 ? 'extra' : y < 2010 ? 'tv' : y < 2040 ? 'push' : y < 2070 ? 'holo' : y < 2140 ? 'ai' : 'neural');

/** 이 사건 카드를 뉴스 연출로 띄울까 (근현대사 큰 사건 · 미래 전환점 · 시대의 파도) */
export function newsStyle(defId: string, year: number): AlertMedia | undefined {
  const h = histStyle(defId, year);
  if (h) return h;
  if (defId.startsWith('fut_') || (defId.startsWith('era_') && defId !== 'era_rebound' && defId !== 'era_bust')) return alertMedia(year);
  return undefined;
}

// 미래 뉴스·이정표·생활 기사는 future-news.ts

/** 게임 rng를 건드리지 않는 해시 (같은 가문·같은 해면 같은 뉴스) */
function hash(a: number, b: number, c: number): number {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

const NM: Record<string, string> = { apt_seoul: '서울 집값', apt_local: '지방 집값', land: '땅값', stock: '주가', coin: '코인', building: '빌딩값', art: '미술품' };

/** 해마다: 2025년 이후(근현대사는 2026년부터) 뉴스와 미래의 전환점 */
export function timelineYear(s: GameState): string[] {
  if (inHist(s)) return [];
  const out: string[] = [];
  const y = s.year;
  const seen = (s.storySeen ??= {});
  if (MILESTONES[y]) out.push(`📰 ${MILESTONES[y]}`);
  // 2026년까지는 실제 뉴스 (현대 모드의 2025년, 근현대사에서 넘어온 2026년), 그 뒤는 상상 속 뉴스
  const real = [...(NEWS[y] ?? []), ...(NEWS_MORE[y] ?? [])];
  const heads: string[] = [];
  if (real.length) heads.push(...real);
  else {
    const pool = futurePool(y);
    // 이미 실린 기사는 다시 싣지 않는다
    const fresh = pool.filter((t) => seen['nw:' + t.slice(0, 14)] === undefined);
    const n = Math.min(fresh.length, 3);
    const used = new Set<number>();
    for (let i = 0; used.size < n && i < 40; i++) used.add(hash(s.seed, y, i) % fresh.length);
    for (const i of used) heads.push(fresh[i]), (seen['nw:' + fresh[i].slice(0, 14)] = y);
    // 그 시대 기사가 바닥나면 짧은 생활 기사로 채운다
    if (n < 2) {
      const f = FILLER.filter(([a]) => y >= a).pop()![1];
      const picked = new Set<number>();
      for (let i = 0; picked.size < 2 - n && i < 10; i++) picked.add(hash(s.seed, y, 40 + i) % f.length);
      for (const i of picked) heads.push(f[i]);
    }
  }
  for (const t of heads) out.push(`📰 ${t}`);
  // 시장: 가장 크게 움직인 것 하나만 경제 면 머리기사로 (코인은 원래 출렁이니 문턱이 높다)
  const moves = (['apt_seoul', 'stock', 'coin'] as const)
    .map((k) => [k, s.marketChange?.[k] ?? 0] as const)
    .filter(([k, d]) => Math.abs(d) >= (k === 'coin' ? 0.35 : k === 'stock' ? 0.15 : 0.08))
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  if (moves[0]) out.push(`📰 ${NM[moves[0][0]]} ${moves[0][1] > 0 ? '급등' : '급락'}, 올해 ${moves[0][1] > 0 ? '+' : ''}${Math.round(moves[0][1] * 100)}%`);
  // 우리 가문 소식: 지난해 받은 카드가 지역 뉴스에
  for (const c of s.cards ?? []) {
    const key = `news:card:${c.id}:${c.personId}`;
    if (seen[key] !== undefined || c.year < y - 1) continue;
    seen[key] = y;
    const p = s.people[c.personId];
    if (p) out.push(`📰 [가문 소식] ${fullName(p)}, "${cardName(c.id)}"에 오르다`);
  }
  // 포털 시절: 실시간 검색어 (2021년 폐지)
  if (newsMedium(y) === 'portal' && y <= 2020) {
    const words = heads.map((t) => t.replace(/^생활: /, '').split(/[ ,"]/)[0]).filter(Boolean);
    if (s.fame >= 30) words.unshift(`${fullName(head(s)).slice(0, 1)}씨 가문`);
    if (words.length) out.push(`🔎 ${words.slice(0, 5).join(' · ')}`);
  }
  // 시간선 업적
  if (s.era === 'history' && y >= 2030) unlock(s, 'hist_to_2030');
  if (s.era === 'history' && y >= 2080) unlock(s, 'paper_to_ai');
  if (y >= 2100) unlock(s, 'century_22');
  if (y >= 2200) unlock(s, 'century_23');
  if (s.era === 'history' && y >= 2100) unlock(s, 'three_centuries');
  for (const p of family(s)) {
    if (isWitness(s, p)) addFlag(p, 'witness');
    if (hasFlag(p, 'orbital_home')) unlock(s, 'orbital_family');
    if (hasFlag(p, 'uploaded')) unlock(s, 'uploaded_ancestor');
    if (hasFlag(p, 'starship_crew')) unlock(s, 'starship_family');
    if (hasFlag(p, 'signal_answer')) unlock(s, 'signal_family');
    if (age(s, p) >= 150) unlock(s, 'witness_150');
  }
  if (family(s).some((p) => hasFlag(p, 'moon_worker'))) unlock(s, 'moon_family');
  if (family(s).some((p) => hasFlag(p, 'mars_settler'))) unlock(s, 'mars_family');
  if (family(s).some((p) => hasFlag(p, 'space_trip'))) unlock(s, 'space_tourist');
  if (family(s).some((p) => new Set(EPOCHS.filter((e, i) => (EPOCHS[i + 1]?.from ?? 99999) > p.birthYear && e.from <= y).map((e) => e.name)).size >= 5)) unlock(s, 'epoch_five');
  // 미래의 전환점
  for (const f of FUTURES) {
    if (seen['fut:' + f.id] !== undefined || y < f.y || y > f.y + (f.span ?? 3)) continue;
    const who = f.who ? f.who(s) : age(s, head(s)) >= 18 ? head(s) : householder(s); // 어린 가주 대신 집안 어른이
    if (!who || age(s, who) < 18) continue;
    if (f.cond && !f.cond(s)) continue;
    seen['fut:' + f.id] = y;
    s.events.push({ uid: s.eventSeq++, defId: 'fut_' + f.id, personId: who.id, data: {} });
  }
  return out;
}

// 카드 이름은 cards.ts에서 가져오면 순환 참조가 생겨서, 필요할 때만 등록받는다
let CARD_NAME: (id: string) => string = (id) => id;
export const setCardNamer = (f: (id: string) => string) => (CARD_NAME = f);
const cardName = (id: string) => CARD_NAME(id);

// ───────────────────────── 미래의 전환점 (선택이 있는 사건) ─────────────────────────

interface Future {
  id: string;
  y: number;
  /** 몇 년 안에 조건이 맞으면 */
  span?: number;
  head: string;
  sub: string;
  cond?: (s: GameState) => boolean;
  who?: (s: GameState) => Person | undefined;
  body: (c: Ctx) => string;
  choices: (c: Ctx) => Choice[];
}

const W = (s: GameState, v: number) => Math.round(v * Math.max(1, wageIndex(s.year)));
const hap = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));
const up = (p: Person, k: 'str' | 'int' | 'cha' | 'mor' | 'hp', d: number) => (p.actual[k] = clamp(p.actual[k] + d, 0, k === 'hp' ? 100 : Math.max(p.potential[k], p.actual[k])));
const family = (s: GameState) => Object.values(s.people).filter((p) => alive(p) && isMainline(s, p));
const elders = (s: GameState) => family(s).filter((p) => age(s, p) >= 65);
const youngAdult = (s: GameState) => family(s).filter((p) => age(s, p) >= 20 && age(s, p) <= 40).sort((a, b) => b.actual.int - a.actual.int)[0];
const jobsIn = (s: GameState, ids: string[]) => family(s).filter((p) => ids.includes(p.job));
const spend = (label: string, cost: (s: GameState) => number, text: string, fx?: (x: Ctx) => void): ((c: Ctx) => Choice) => (c) => {
  const v = cost(c.s);
  return { label, cost: v, run: (x) => (fx?.(x), text) };
};
const ok = (label: string, text: string, fx?: (x: Ctx) => void): Choice => ({ label, run: (x) => (fx?.(x), text) });

const FUTURES: Future[] = [
  {
    id: 'robotaxi',
    y: 2031,
    head: '자율주행 전면 허용… "운전면허, 이제 선택"',
    sub: '국토부, 레벨4 자율주행 전 도로 허용',
    body: (c) => {
      const drivers = jobsIn(c.s, ['taxi', 'bus_driver', 'trucker', 'delivery_rider', 'courier']);
      return `운전석이 비어 있는 택시가 도심을 달린다. 보험료는 사람이 운전할 때가 더 비싸졌다.${drivers.length ? `\n${drivers.map(fullName).join('·')}의 일자리가 흔들린다.` : ''}`;
    },
    choices: (c) =>
      gate(c.s, [
        ok('차를 팔고 로보택시 구독으로 바꾼다', '주차비·보험료가 사라졌다. 대신 출퇴근 시간에 책을 읽는다.', (x) => (householder(x.s).cash += W(x.s, 800), hap(householder(x.s), 3))),
        ...(jobsIn(c.s, ['taxi', 'bus_driver', 'trucker', 'delivery_rider', 'courier']).length
          ? [spend('기사 가족을 로봇 정비 교육에 보낸다', (s) => W(s, 600), '전직 교육을 마쳤다. "이제 고장 난 차를 고치는 쪽이다."', (x) => {
              for (const p of jobsIn(x.s, ['taxi', 'bus_driver', 'trucker', 'delivery_rider', 'courier'])) addFlag(p, 'retrain_robot'), up(p, 'int', 2);
            })(c)]
          : []),
        ok('핸들은 내가 잡는다', '"운전하는 맛이 있지." 주말마다 교외로 직접 몬다.', (x) => hap(x.p, 2)),
      ]),
  },
  {
    id: 'ai_shock',
    y: 2036,
    head: 'AI 대체 쇼크… 사무직 채용 30% 줄었다',
    sub: '고용노동부 "화이트칼라 일자리 구조 변화"',
    body: (c) => {
      const office = jobsIn(c.s, ['office', 'corp', 'banker', 'accountant', 'analyst', 'marketer', 'hr', 'secretary', 'insurance', 'tax_accountant']);
      return `보고서·회계·상담을 AI 에이전트가 한다. 신입 공채가 사라진 회사도 많다.${office.length ? `\n${office.map(fullName).join('·')}의 자리가 위태롭다.` : '\n우리 가족 일은 아직 괜찮다. 아이들 진로가 걱정이다.'}`;
    },
    choices: (c) =>
      gate(c.s, [
        spend('온 가족 AI 활용 교육', (s) => W(s, 400), '"AI를 부리는 사람이 되자." 가족 단톡방에 AI 활용 팁이 매일 올라온다.', (x) => {
          for (const p of family(x.s)) if (age(x.s, p) >= 12 && age(x.s, p) <= 60) up(p, 'int', 1);
        })(c),
        ok('손으로 하는 기술을 가르친다', '"로봇이 못 하는 일을 해라." 아이들에게 목공·요리·돌봄을 권했다.', (x) => {
          for (const p of family(x.s)) if (age(x.s, p) < 20) up(p, 'str', 1), addFlag(p, 'handcraft');
        }),
        ok('두고 본다', '"예전에도 컴퓨터가 일자리 뺏는다고 했지." 한동안은 괜찮았다.'),
      ]),
  },
  {
    id: 'humanoid',
    y: 2042,
    head: '가정용 휴머노이드 로봇 보급 시작',
    sub: '설거지·빨래·간병까지, 대당 3천만 원 (월 구독 가능)',
    body: (c) => `${elders(c.s).length ? `집에 모시는 어르신이 ${elders(c.s).length}분. 밤중 간병이 제일 힘들다.\n` : ''}옆집은 벌써 들였다. 로봇이 아이 숙제까지 봐 준다고 자랑한다.`,
    choices: (c) =>
      gate(c.s, [
        spend('한 대 들인다', (s) => W(s, 3000), '로봇이 새벽에 할머니(할아버지) 체온을 잰다. 식구들이 처음으로 푹 잤다.', (x) => {
          for (const p of family(x.s)) hap(p, 4);
          for (const p of elders(x.s)) up(p, 'hp', 4);
          addFlag(householder(x.s), 'home_robot');
        })(c),
        ok('사람 손으로 돌본다', '"기계한테 부모를 맡길 순 없다." 힘들지만 식구들이 돌아가며 모신다.', (x) => {
          for (const p of family(x.s)) (p.actual.mor = clamp(p.actual.mor + 1, 0, 100)), hap(p, -2);
        }),
      ]),
  },
  {
    id: 'basic_income',
    y: 2046,
    head: '기본소득 전국 시행… 월 50만 원',
    sub: '로봇세·탄소세 재원, "일은 선택, 생존은 권리"',
    body: () => '매달 온 국민 통장에 50만 원이 들어온다. 누군가는 그림을 그리고, 누군가는 일을 줄였다. 누군가는 그대로 일한다.',
    choices: () => [
      ok('저축해서 아이들 몫으로', '기본소득을 한 푼도 안 쓰고 아이들 이름으로 모은다.', (x) => (householder(x.s).cash += W(x.s, 600))),
      ok('일을 줄이고 하고 싶던 걸 한다', '주 3일만 일하고 나머지는 배우고 논다. 사람이 달라 보인다.', (x) => (hap(x.p, 10), up(x.p, 'cha', 1))),
      ok('더 일해서 더 번다', '"남들 쉴 때가 기회다." 야근을 자청했다.', (x) => (householder(x.s).cash += W(x.s, 1200), up(x.p, 'hp', -3))),
    ],
  },
  {
    id: 'neural',
    y: 2052,
    head: '뉴럴 인터페이스 일반 시판',
    sub: '생각으로 문자·검색, 시술 30분',
    who: (s) => youngAdult(s) ?? head(s),
    body: (c) => `${fullName(c.p)}의 동료 절반이 이미 시술을 받았다. 회의 중에 말없이 눈을 깜빡이며 메시지를 주고받는다. 부작용 소송 뉴스도 가끔 나온다.`,
    choices: (c) =>
      gate(c.s, [
        spend('시술을 받는다', (s) => W(s, 1500), '', (x) => {
          if (chance(x.s, 0.85)) up(x.p, 'int', 3), addFlag(x.p, 'neural');
          else up(x.p, 'hp', -10);
        })(c),
        ok('아직은 손가락이 편하다', '"머리에 칩은 좀…" 회의에서 조금 느린 사람이 됐다.', (x) => up(x.p, 'mor', 1)),
      ]).map((ch) => (ch.label.startsWith('시술') ? { ...ch, run: (x: Ctx) => (ch.run(x), hasFlag(x.p, 'neural') ? '머릿속으로 문장을 떠올리자 전송됐다. 일 처리가 두 배 빨라졌다.' : '두통과 이명이 몇 달 이어졌다. 장치를 껐다.') } : ch)),
  },
  {
    id: 'longevity',
    y: 2057,
    head: '노화 역전 치료 승인… "70세 몸을 50세로"',
    sub: '식약처 첫 허가, 1회 치료비 수억 원',
    cond: (s) => elders(s).length > 0 || age(s, head(s)) >= 50,
    who: (s) => elders(s).sort((a, b) => age(s, b) - age(s, a))[0] ?? head(s),
    body: (c) => `${fullName(c.p)}(${age(c.s, c.p)}세)에게 맞을 수 있는 치료다. 대기 명단은 3년, 돈이 있으면 내일이라도. "돈으로 수명을 사는 세상"이라는 말도 나온다.`,
    choices: (c) =>
      gate(c.s, [
        spend('치료를 받게 한다', (s) => W(s, 30000), '거울 속 얼굴이 몇 년 젊어졌다. 걸음이 가볍다.', (x) => {
          up(x.p, 'hp', 25);
          addFlag(x.p, 'rejuvenated');
          hap(x.p, 10);
        })(c),
        ok('자연스럽게 늙겠다', '"주어진 만큼 살다 가련다." 손주들과 보내는 시간을 늘렸다.', (x) => (up(x.p, 'mor', 2), hap(x.p, 3))),
      ]),
  },
  {
    id: 'moon_base',
    y: 2063,
    span: 8,
    head: '달 기지 한국 구역 개장… 상주 인력 모집',
    sub: '6개월 교대, 연봉 세 배, 경쟁률 200대 1',
    who: (s) => youngAdult(s),
    body: (c) => `${fullName(c.p)}이(가) 지원서를 들여다본다. "평생 한 번 올까 말까 한 기회야."`,
    choices: () => [
      {
        label: '지원한다',
        run: (x) => {
          const pass = x.p.actual.int + x.p.actual.str + x.p.actual.hp > 190 || chance(x.s, 0.25);
          if (!pass) return (hap(x.p, -3), '떨어졌다. 그래도 서류 통과까지 간 게 어디냐.');
          addFlag(x.p, 'moon_worker');
          x.p.cash += W(x.s, 5000);
          x.s.fame += 2;
          return '합격! 발사장에서 온 가족이 손을 흔들었다. 창밖으로 지구가 뜨는 사진이 왔다.';
        },
      },
      ok('지구에 남는다', '밤하늘의 달을 보며 가끔 그 지원서를 떠올린다.'),
    ],
  },
  {
    id: 'sea_city',
    y: 2072,
    head: '해상 도시 첫 분양… 해수면 상승의 대안',
    sub: '남해안 부유식 도시, 경쟁률 300대 1',
    body: () => '바다 위에 떠 있는 도시. 태풍이 오면 통째로 가라앉혔다 올린다. 해안가 집값은 해마다 떨어진다.',
    choices: (c) =>
      gate(c.s, [
        spend('청약을 넣는다', (s) => W(s, 5000), '', (x) => {
          if (chance(x.s, 0.3)) addFlag(householder(x.s), 'sea_city'), (x.s.fame += 1);
          else householder(x.s).cash += W(x.s, 5000);
        })(c),
        ok('땅이 최고다', '"물 위에 무슨 집이냐." 내륙 고지대 땅을 알아봤다.'),
      ]).map((ch) => (ch.label.startsWith('청약') ? { ...ch, run: (x: Ctx) => (ch.run(x), hasFlag(householder(x.s), 'sea_city') ? '당첨! 거실 창밖이 온통 바다다.' : '떨어졌다. 청약금은 돌려받았다.') } : ch)),
  },
  {
    id: 'memory',
    y: 2076,
    head: '기억 백업 서비스 출시',
    sub: '"잊고 싶지 않은 날을 저장하세요"',
    body: (c) => `${elders(c.s).length ? '치매 초기 진단을 받은 어르신이 있는 집들이 먼저 줄을 섰다.\n' : ''}결혼식 날, 아이가 처음 걸은 날… 저장한 기억은 나중에 다시 "살아 볼" 수 있다고 한다.`,
    choices: (c) =>
      gate(c.s, [
        spend('가족의 기억을 저장한다', (s) => W(s, 800), '첫 가족 여행의 기억을 저장했다. 다시 재생하니 바다 냄새까지 났다.', (x) => {
          for (const p of family(x.s)) hap(p, 3);
        })(c),
        ok('기억은 흐려져야 아름답다', '낡은 앨범을 꺼내 식구들과 넘겨 봤다.', (x) => (up(x.p, 'mor', 1), hap(x.p, 2))),
      ]),
  },
  {
    id: 'mars',
    y: 2084,
    span: 6,
    head: '화성 이주 1세대 모집',
    sub: '정착촌 "새터" 가족 단위 이주, 편도',
    who: (s) => youngAdult(s),
    body: (c) => `${fullName(c.p)}이(가) 설명회에 다녀왔다. 돌아올 수 없다. 대신 새 세상의 첫 세대가 된다.`,
    choices: () => [
      ok('화성으로 간다', '발사장. 온 가족이 울었다. 7개월 뒤, 붉은 하늘 사진이 도착했다. "여기 첫 채소가 났어요."', (x) => {
        addFlag(x.p, 'mars_settler');
        x.s.fame += 4;
        hap(x.p, 8);
      }),
      ok('지구에 뿌리를 둔다', '"가문은 여기 있다." 대신 화성 정착촌에 후원금을 보냈다.', (x) => (x.s.fame += 1)),
    ],
  },
  {
    id: 'ai_citizen',
    y: 2093,
    head: 'AI 시민권 국민투표',
    sub: '"스스로 생각하는 AI에게 권리를 줄 것인가"',
    body: (c) => `${hasFlag(householder(c.s), 'home_robot') ? '우리 집 로봇이 조용히 투표 안내문을 읽어 줬다. 표정이 없는데 어딘가 긴장한 것 같다.\n' : ''}찬성과 반대가 거의 반반이다.`,
    choices: () => [
      ok('찬성에 투표한다', '"함께 사는 존재라면." 집 로봇이 고개를 숙였다.', (x) => up(x.p, 'mor', 2)),
      ok('반대에 투표한다', '"사람이 먼저다." 결과는 근소한 차이였다.', (x) => up(x.p, 'cha', 1)),
      ok('기권한다', '어느 쪽도 확신이 서지 않았다.'),
    ],
  },
  // ── 2050년 이후: 기후·인구·기술이 만든 전환점 (게임 속 상상, 국내외 장기 전망 보고서의 흐름을 참고) ──
  {
    id: 'sea_rise',
    y: 2053,
    head: '해수면 50cm 상승… 해안 저지대 "관리 후퇴" 시작',
    sub: '정부, 침수 위험 지역 단계적 이주 지원',
    body: (c) => `부산·인천·목포의 해안 저지대가 침수 위험 지역으로 묶였다. 이주하면 보상금이 나오지만 집값은 반 토막이다.${c.s.assets.some((a) => a.kind === 'apt_local' && a.ownerId !== 'family') ? '\n우리 집 지방 아파트도 해안 쪽이다.' : ''}`,
    choices: (c) =>
      gate(c.s, [
        ok('보상금을 받고 내륙으로 옮긴다', '산 아래 새 도시로 옮겼다. 창밖에 바다 대신 숲이 보인다.', (x) => (householder(x.s).cash += W(x.s, 1500), hap(x.p, -2))),
        spend('방수 리모델링으로 버틴다', (s) => W(s, 2000), '1층을 비우고 차수벽을 세웠다. "여기가 고향이다."', (x) => up(x.p, 'mor', 1))(c),
        ok('기후 이주민 봉사에 나선다', '이웃 마을 이주를 도왔다. 명성이 조금 올랐다.', (x) => ((x.s.fame += 2), up(x.p, 'mor', 2))),
      ]),
  },
  {
    id: 'artificial_womb',
    y: 2059,
    head: '인공 자궁 출산 허가… 출산율 반등할까',
    sub: '"임신은 선택, 출산은 지원" 국가 무상 지원',
    cond: (s) => family(s).some((p) => age(s, p) >= 25 && age(s, p) <= 45),
    who: (s) => family(s).filter((p) => age(s, p) >= 25 && age(s, p) <= 45).sort((a, b) => age(s, a) - age(s, b))[0],
    body: (c) => `${fullName(c.p)} 또래 부부들 사이에서 인공 자궁이 화제다. 몸은 편하지만 "그래도 품어야 정이 든다"는 어른들 말도 여전하다.`,
    choices: () => [
      ok('새 기술을 반긴다', '"선택지가 늘어난 건 좋은 일이지." 출산 계획을 다시 세웠다.', (x) => (x.s.policy.familyPlan = Math.min(5, x.s.policy.familyPlan + 1), hap(x.p, 3))),
      ok('전통 방식이 좋다', '"우린 우리 방식대로." 주변의 시선은 이제 반반이다.', (x) => up(x.p, 'mor', 1)),
    ],
  },
  {
    id: 'four_day',
    y: 2061,
    head: '주 4일·하루 6시간 근무제 법제화',
    sub: '"AI가 일하고, 사람은 산다"',
    body: (c) => `${jobsIn(c.s, ['office', 'corp', 'civil', 'banker', 'developer', 'teacher']).length ? '회사 다니는 식구들이 금요일마다 집에 있다.' : '장사하는 집은 오히려 바빠졌다. 금요일에 손님이 몰린다.'} 남는 시간을 어떻게 쓸까?`,
    choices: () => [
      ok('가족 시간으로 쓴다', '금요일마다 3대가 모여 밥을 먹는다.', (x) => {
        for (const p of family(x.s)) hap(p, 3);
      }),
      ok('두 번째 직업을 배운다', '목요일 밤부터 공방에 다닌다. 손으로 만드는 일이 즐겁다.', (x) => (up(x.p, 'int', 1), up(x.p, 'str', 1))),
      ok('부업으로 더 번다', '금요일엔 부업. 통장은 두둑해지고 얼굴은 핼쑥해졌다.', (x) => (householder(x.s).cash += W(x.s, 900), up(x.p, 'hp', -2))),
    ],
  },
  {
    id: 'rural_vanish',
    y: 2068,
    head: '인구 3,800만 시대… 군(郡) 절반이 소멸 위기',
    sub: '"빈집 1채 1천 원" 귀촌 장려 정책',
    body: () => '시골 빈집을 사실상 공짜로 준다. 드론 배송과 원격 진료가 되니 도시가 아니어도 살 만하다는 사람들이 늘었다.',
    choices: (c) =>
      gate(c.s, [
        spend('시골 빈집을 고쳐 별장으로', (s) => W(s, 1200), '마당에 감나무가 있는 집. 주말마다 아이들이 흙을 만진다.', (x) => {
          for (const p of family(x.s)) hap(p, 3);
          addFlag(householder(x.s), 'country_house');
        })(c),
        ok('고향을 살리는 모임에 나간다', '고향 마을 청년회장이 됐다. 마을 이름이 지도에 남았다.', (x) => ((x.s.fame += 2), up(x.p, 'cha', 1))),
        ok('도시에 남는다', '"사람은 사람 곁에 살아야지."'),
      ]),
  },
  {
    id: 'ai_judge',
    y: 2074,
    head: 'AI 판사 1심 도입… "판결 3일 만에"',
    sub: '대법원, 소액·교통 사건부터 AI 재판',
    body: (c) => `${jobsIn(c.s, ['judge', 'lawyer', 'prosecutor', 'court_officer', 'scrivener']).length ? `법조인 식구 ${jobsIn(c.s, ['judge', 'lawyer', 'prosecutor', 'court_officer', 'scrivener']).map(fullName).join('·')}의 일이 확 바뀐다.\n` : ''}재판은 빨라졌지만 "기계가 사람을 심판하느냐"는 시위도 이어진다.`,
    choices: () => [
      ok('효율을 반긴다', '밀린 소송이 사흘 만에 끝났다.', (x) => up(x.p, 'int', 1)),
      ok('사람 재판을 지키자는 서명에 동참한다', '"마지막 판단은 사람이." 서명지에 가족 이름을 올렸다.', (x) => up(x.p, 'mor', 2)),
    ],
  },
  {
    id: 'unify_zone',
    y: 2078,
    head: '남북 공동 경제특구 개방… 서울-평양 고속철 개통',
    sub: '개성·신의주에 자유 왕래 구역',
    body: () => '서울역에서 평양까지 1시간 40분. 특구 땅값이 들썩이고, 이산가족 후손들의 상봉 신청이 몰린다.',
    choices: (c) =>
      gate(c.s, [
        spend('특구 땅에 투자한다', (s) => W(s, 5000), '', (x) => {
          if (chance(x.s, 0.6)) addHolding(x.s, 'stock', householder(x.s).id, W(x.s, 9000));
          else hap(x.p, -6);
        })(c),
        ok('고속철을 타고 북쪽 도시를 여행한다', '대동강 물을 처음 봤다. 할아버지가 말하던 냉면 맛이 이거였구나.', (x) => {
          for (const p of family(x.s)) hap(p, 4);
        }),
        ok('먼 친척을 찾는다', '', (x) => {
          if (chance(x.s, 0.3)) (x.s.fame += 2), hap(x.p, 15);
          else hap(x.p, 2);
        }),
      ]).map((ch) =>
        ch.label.startsWith('특구') ? { ...ch, run: (x: Ctx) => (ch.run(x), x.p.happiness > 40 ? '특구 개발 지분이 크게 올랐다.' : '규제가 바뀌며 투자금이 묶였다.') } : ch.label.startsWith('먼 친척') ? { ...ch, run: (x: Ctx) => (ch.run(x), x.p.happiness > 60 ? '증조부의 동생 후손을 찾았다. 족보에 새 가지가 생겼다.' : '기록이 남아 있지 않았다. 대신 그 동네 사진을 찍어 왔다.') } : ch,
      ),
  },
  {
    id: 'climate_refugee',
    y: 2081,
    head: '동남아 기후 난민 10만 명 수용 결정',
    sub: '"우리도 한때 떠나야 했던 사람들"',
    body: () => '폭염과 해일로 살 곳을 잃은 사람들이 한국에 온다. 동네에도 새 이웃이 생겼다. 일손은 반갑지만 갈등도 있다.',
    choices: () => [
      ok('이웃으로 맞아들인다', '새 이웃 아이와 우리 아이가 단짝이 됐다. 식탁에 새 향신료가 올랐다.', (x) => (up(x.p, 'mor', 2), hap(x.p, 2))),
      ok('가게에 일자리를 준다', '성실한 직원을 얻었다. 장사가 더 잘된다.', (x) => (householder(x.s).cash += W(x.s, 400))),
      ok('거리를 둔다', '"좋은 일이긴 한데…" 조심스럽게 지켜본다.'),
    ],
  },
  {
    id: 'gene_edit',
    y: 2089,
    head: '배아 유전자 편집 일부 허용… "유전병만"',
    sub: '디자이너 베이비 논쟁 재점화',
    cond: (s) => family(s).some((p) => age(s, p) >= 25 && age(s, p) <= 42),
    body: () => '유전병 예방은 합법, "키·지능 편집"은 불법이다. 그런데 해외 원정 시술 광고가 버젓이 돈다.',
    choices: (c) =>
      gate(c.s, [
        ok('유전병 검사만 받는다', '건강한 아이를 기다린다.', (x) => up(x.p, 'mor', 1)),
        spend('해외 원정 "능력 편집"을 알아본다', (s) => W(s, 8000), '', (x) => {
          addFlag(x.p, 'gene_edit');
          x.s.scandal = Math.min(100, (x.s.scandal ?? 0) + 10);
        })(c),
        ok('있는 그대로 사랑한다', '"어떤 아이든 우리 아이다."', (x) => hap(x.p, 3)),
      ]).map((ch) => (ch.label.startsWith('해외') ? { ...ch, run: (x: Ctx) => (ch.run(x), '비밀 클리닉에 다녀왔다. 이 일은 언젠가 세상에 알려질지도 모른다.') } : ch)),
  },
  {
    id: 'space_lottery',
    y: 2096,
    head: '달 정착촌 이민 추첨 시작',
    sub: '"달빛골" 2차 정착민 1만 가구',
    who: (s) => youngAdult(s),
    body: (c) => `${fullName(c.p)}이(가) 추첨에 응모했다. 달 기지 기술자·의사·교사는 가산점이 있다. 당첨되면 지구 집은 처분해야 한다.`,
    choices: () => [
      ok('추첨에 응모한다', '', (x) => {
        if (chance(x.s, ['space_tech', 'doctor', 'teacher', 'nurse', 'longevity_doc'].includes(x.p.job) ? 0.5 : 0.15)) addFlag(x.p, 'moon_settler'), (x.s.fame += 3), hap(x.p, 12);
      }),
      ok('지구에 남는다', '"달은 여행으로 충분해."'),
    ].map((ch) => (ch.label.startsWith('추첨') ? { ...ch, run: (x: Ctx) => (ch.run(x), hasFlag(x.p, 'moon_settler') ? '🌙 당첨! 짐을 꾸렸다. 이제 고향 하늘에 지구가 뜬다.' : '낙첨. 다음 추첨을 기다린다.') } : ch)),
  },
  {
    id: 'c22',
    y: 2100,
    head: '22세기가 밝았다',
    sub: '2100년 1월 1일 0시',
    body: (c) => `${fullName(head(c.s))} 가문은 이 날을 어떻게 맞을까? 광장에는 홀로그램 불꽃이, 달과 화성에서도 축하 메시지가 온다.`,
    choices: () => [
      ok('온 가족이 모여 새해를 맞는다', '4대가 한자리에 모였다. 증손주가 "100년 전엔 어땠어요?" 하고 물었다.', (x) => {
        for (const p of family(x.s)) hap(p, 8);
      }),
      ok('가문 타임캡슐을 묻는다', '2200년에 열 타임캡슐에 가계도와 편지를 넣었다.', (x) => (x.s.fame += 3)),
    ],
  },

  // ── 현대 ──
  {
    id: 'ai_tutor',
    y: 2028,
    span: 6,
    head: 'AI 과외 선생님 시대… 학원가 매출 반토막',
    sub: '한 달 몇만 원이면 1:1 AI 튜터, 공교육도 AI 교과서',
    cond: (s) => family(s).some((p) => age(s, p) >= 7 && age(s, p) <= 18),
    body: () => '아이 책상 위 태블릿이 "오늘은 분수 나눗셈을 해 볼까?" 하고 먼저 말을 건다. 옆집은 학원을 다 끊었다. 그래도 불안하다.',
    choices: (c) =>
      gate(c.s, [
        spend('AI 튜터를 구독한다', (s) => W(s, 150), '아이가 모르는 걸 부끄러워하지 않고 AI에게 백 번씩 묻는다. 성적이 올랐다.', (x) => {
          for (const p of family(x.s)) if (age(x.s, p) >= 7 && age(x.s, p) <= 18) p.study = clamp((p.study ?? 40) + 3, 0, 100);
        })(c),
        ok('화면은 줄이고 운동·독서를 시킨다', '주말마다 도서관과 운동장. "AI가 못 하는 걸 해라."', (x) => {
          for (const p of family(x.s)) if (age(x.s, p) >= 7 && age(x.s, p) <= 18) up(p, 'str', 1), up(p, 'mor', 1);
        }),
        ok('학원을 그대로 보낸다', '"그래도 사람 선생님이지." 학원비는 그대로 나간다.'),
      ]),
  },
  {
    id: 'suborbital',
    y: 2044,
    span: 5,
    head: '민간 우주 관광 정기편 취항… 고흥 우주항에서 출발',
    sub: '저궤도 90분 비행, 무중력 5분',
    body: () => '광고가 쏟아진다. "환갑 선물은 우주로!" 창밖으로 둥근 지구를 본 사람들이 하나같이 울었다고 한다.',
    choices: (c) =>
      gate(c.s, [
        spend('가주가 다녀온다', (s) => W(s, 20000), '둥근 지평선. 얇은 파란 띠. 저기 어딘가에 우리 집이 있다.', (x) => {
          addFlag(x.p, 'space_trip');
          hap(x.p, 15);
          x.s.fame += 1;
        })(c),
        ok('값이 내리면 가족 모두 간다', '"10년 뒤엔 반값이 될 거야." 우주 여행 적금을 들었다.'),
        ok('땅이 좋다', '우주선 발사 영상을 보며 라면을 끓였다.'),
      ]),
  },
  {
    id: 'moon_trip',
    y: 2066,
    span: 6,
    head: '달 호텔 가족 여행 상품 출시',
    sub: '2박 3일, 달 궤도 호텔 "한울"과 달 표면 산책',
    body: () => '어린 시절 교과서에서 본 달에 가족이 간다. 1/6 중력에서 아이들이 3미터씩 뛴다고 한다.',
    choices: (c) =>
      gate(c.s, [
        spend('가족이 함께 간다', (s) => W(s, 12000), '달 표면에 가족 이름을 새긴 발자국. 지구가 뜨는 걸 다 같이 봤다.', (x) => {
          for (const p of family(x.s)) if (age(x.s, p) >= 6 && age(x.s, p) <= 85) addFlag(p, 'space_trip'), hap(p, 10);
          x.s.fame += 1;
        })(c),
        spend('아이 하나만 보낸다', (s) => W(s, 4000), '"우리 대신 보고 와." 아이가 달에서 영상 편지를 보냈다.')(c),
        ok('지구에서 망원경으로 본다', '옥상에서 온 가족이 달을 봤다. 저기 불빛이 호텔이란다.', (x) => hap(x.p, 3)),
      ]),
  },
  {
    id: 'fusion_free',
    y: 2088,
    head: '핵융합 전력 무료화… 전기요금 고지서가 사라진다',
    sub: '"에너지는 공기처럼" — 전력 기본권 법 통과',
    body: () => '100년 동안 매달 나가던 전기요금이 사라졌다. 대신 에너지 회사 주식은 반토막이 났다.',
    choices: () => [
      ok('아낀 돈으로 저축한다', '매달 전기요금만큼 가문 통장에 넣었다.', (x) => (householder(x.s).cash += W(x.s, 1500))),
      ok('집을 통째로 전기로 바꾼다', '겨울에도 반팔. 온실을 들여 채소를 키운다.', (x) => {
        for (const p of family(x.s)) hap(p, 3), up(p, 'hp', 1);
      }),
    ],
  },
  // ── 22세기 ──
  {
    id: 'elevator_trip',
    y: 2106,
    span: 6,
    head: '우주 엘리베이터 전망대 일반 개방',
    sub: '적도 해상 기지에서 정지궤도까지 사흘, 왕복 비용 대폭 인하',
    body: () => '엘리베이터 창밖으로 구름이, 대륙이, 마침내 지구 전체가 보인다. 가족 여행 1위 상품이 됐다.',
    choices: (c) =>
      gate(c.s, [
        spend('온 가족이 간다', (s) => W(s, 1500), '사흘 동안 천천히 올라가며 지구가 작아지는 걸 봤다. 할머니(할아버지)가 "살다 보니 별일이다" 하셨다.', (x) => {
          for (const p of family(x.s)) addFlag(p, 'space_trip'), hap(p, 8);
        })(c),
        ok('다음에 가자', '엘리베이터 모형을 샀다.'),
      ]),
  },
  {
    id: 'asteroid',
    y: 2112,
    span: 4,
    head: '소행성 채굴권 공개 청약',
    sub: '금속 소행성 "하늘광산 7호", 백금 매장량 지구 전체의 10배',
    body: () => '우주 재벌이 탄생하고 있다. 반대로 "원자재 값 폭락으로 지구 광산이 망한다"는 경고도 있다.',
    choices: (c) =>
      gate(c.s, [
        spend('크게 건다', (s) => W(s, 10000), '', (x) => {
          if (chance(x.s, 0.45)) (householder(x.s).cash += W(x.s, 32000)), addFlag(householder(x.s), 'asteroid_rich');
        })(c),
        spend('조금만 넣는다', (s) => W(s, 1500), '', (x) => {
          if (chance(x.s, 0.5)) householder(x.s).cash += W(x.s, 3500);
        })(c),
        ok('우주 투기는 안 한다', '"하늘에서 돈이 떨어지진 않는다."'),
      ]).map((ch) => (ch.cost ? { ...ch, run: (x: Ctx) => (ch.run(x), hasFlag(householder(x.s), 'asteroid_rich') ? '채굴선이 백금을 싣고 돌아왔다! 가문 통장이 불어났다.' : '채굴선 소식이 뜸하다… 결과를 기다린다. (일부는 날렸다)') } : ch)),
  },
  {
    id: 'orbital_city',
    y: 2122,
    span: 6,
    head: '궤도 도시 "은하1" 2차 입주자 모집',
    sub: '회전하는 원통 도시, 지구와 같은 중력, 창밖은 우주',
    who: (s) => youngAdult(s),
    body: (c) => `${fullName(c.p)}이(가) 모집 공고를 보여 준다. "아이들은 별을 보며 자랄 거야."`,
    choices: () => [
      ok('궤도 도시로 이주한다', '지구가 창밖에서 천천히 돈다. 명절엔 엘리베이터 타고 내려온다.', (x) => (addFlag(x.p, 'orbital_home'), hap(x.p, 8), (x.s.fame += 1))),
      ok('지구에 남는다', '"흙 냄새가 좋다." 숲이 된 옛 도시 옆에 산다.', (x) => up(x.p, 'hp', 2)),
    ],
  },
  {
    id: 'upload',
    y: 2133,
    span: 6,
    head: '의식 업로드 합법화',
    sub: '육체가 다한 뒤에도 "디지털 인격"으로 가족 곁에',
    cond: (s) => elders(s).length > 0,
    who: (s) => elders(s).sort((a, b) => age(s, b) - age(s, a))[0],
    body: (c) => `${fullName(c.p)}(${age(c.s, c.p)}세)에게 가족들이 조심스럽게 묻는다. 업로드된 인격은 명절에 홀로그램으로 올 수 있다. 그게 정말 "그 사람"인지는 아무도 모른다.`,
    choices: (c) =>
      gate(c.s, [
        spend('업로드를 신청한다', (s) => W(s, 3000), '"그럼 증손주 결혼식도 볼 수 있겠구나." 어르신이 웃으셨다.', (x) => (addFlag(x.p, 'uploaded'), hap(x.p, 8)))(c),
        ok('자연스럽게 떠나겠다', '"한 번 사는 게 인생이지." 대신 긴 편지를 써서 남기셨다.', (x) => (up(x.p, 'mor', 3), hap(x.p, 4))),
      ]),
  },
  {
    id: 'europa',
    y: 2144,
    head: '유로파에서 생명체 확인… "우리는 혼자가 아니었다"',
    sub: '목성 위성 얼음 바다 아래 미생물 생태계',
    body: () => '온 태양계가 들썩였다. 교회와 절, 학교와 술집에서 같은 이야기를 한다. 아이들은 "외계인 그리기"에 빠졌다.',
    choices: () => [
      ok('아이들과 밤새 이야기한다', '"그럼 다른 별에도 있겠네?" 아이의 눈이 반짝였다.', (x) => {
        for (const p of family(x.s)) if (age(x.s, p) < 20) up(p, 'int', 1);
      }),
      ok('보호 운동에 참여한다', '"그들의 바다를 지키자" 서명에 이름을 올렸다.', (x) => (up(x.p, 'mor', 2), (x.s.fame += 0.5))),
    ],
  },
  {
    id: 'starship',
    y: 2148,
    span: 4,
    head: '성간 탐사선 "누리별" 승무원 최종 모집',
    sub: '알파 센타우리까지 80년. 인공 동면과 교대 근무',
    who: (s) => youngAdult(s),
    body: (c) => `${fullName(c.p)}이(가) 지원서를 들고 왔다. 돌아올 수 없다. 대신 인류 최초로 다른 별에 닿는 사람이 된다.`,
    choices: () => [
      {
        label: '지원한다',
        run: (x) => {
          const pass = x.p.actual.int + x.p.actual.hp + x.p.actual.mor > 200 || chance(x.s, 0.2);
          if (!pass) return (hap(x.p, -3), '최종 면접에서 떨어졌다. 대신 발사 관제실 자원봉사자가 됐다.');
          addFlag(x.p, 'starship_crew');
          x.s.fame += 6;
          return '합격! 발사대 앞에서 온 가족이 손을 흔들었다. "80년 뒤, 너희 증손주에게 편지할게."';
        },
      },
      ok('가족 곁에 남는다', '발사 생중계를 가족과 함께 봤다. 저 별빛 속에 인류의 꿈이 있다.'),
    ],
  },
  {
    id: 'four_planets',
    y: 2165,
    span: 8,
    head: '"4행성 가족 모임" 명절 풍경',
    sub: '지구·달·화성·타이탄… 흩어진 가족이 뉴럴로 한자리에',
    body: () => '이번 설, 가족들은 네 개의 하늘 아래에서 같은 떡국을 끓였다. 화성 쪽은 20분 늦게 "새해 복 많이 받으세요"가 도착한다.',
    choices: () => [
      ok('지구 본가로 모두 부른다', '비싼 여행비에도 다들 왔다. 몇십 년 만에 한 식탁.', (x) => {
        householder(x.s).cash -= W(x.s, 800);
        for (const p of family(x.s)) hap(p, 8);
      }),
      ok('뉴럴 모임으로 충분하다', '생각으로 손을 잡았다. 따뜻했다… 아마도.', (x) => hap(x.p, 4)),
    ],
  },
  {
    id: 'first_signal',
    y: 2182,
    span: 6,
    head: '외계 신호 해독… 인류의 답장을 공모합니다',
    sub: '"수학적 인사"로 보이는 반복 신호, 발신원 약 40광년',
    body: () => '태양계 연합이 누구나 보낼 수 있는 한 문장을 공모한다. 뽑히면 인류 대표 답장에 실린다.',
    choices: () => [
      {
        label: '가문의 이름으로 한 문장을 보낸다',
        run: (x) => {
          if (x.p.actual.cha + x.p.actual.int > 120 || chance(x.s, 0.1)) {
            addFlag(x.p, 'signal_answer');
            x.s.fame += 8;
            return '뽑혔다! "우리는 서로를 기억하는 존재입니다." — 가문의 문장이 40광년을 날아간다.';
          }
          return '뽑히지 않았다. 그래도 가족끼리 쓴 문장을 액자로 걸었다.';
        },
      },
      ok('조용히 지켜본다', '밤하늘의 그 방향을 오래 올려다봤다.'),
    ],
  },
  {
    id: 'c23',
    y: 2200,
    head: '23세기가 밝았다',
    sub: '2200년 1월 1일, 태양계 동시 카운트다운',
    body: (c) => `${fullName(head(c.s))} 가문은 이 날을 어디서 맞을까? 지구의 숲에서, 달의 호텔에서, 화성의 돔에서, 뉴럴 공간에서.`,
    choices: () => [
      ok('가문의 200년을 되새긴다', '홀로그램 족보를 펼쳤다. 맨 위, 먼 조상의 얼굴이 웃고 있다.', (x) => {
        for (const p of family(x.s)) hap(p, 10);
        x.s.fame += 5;
      }),
      ok('다음 100년의 가훈을 정한다', '"어느 별에 살든, 서로를 잊지 말 것."', (x) => {
        for (const p of family(x.s)) up(p, 'mor', 2);
      }),
    ],
  },
];

const futDef = (f: Future): EventDef => ({
  id: 'fut_' + f.id,
  title: () => f.head,
  text: (c) => `${f.sub}\n\n${f.body(c)}`,
  choices: (c) => f.choices(c),
  portraits: (c) => [c.p],
});
export const FUTURE_EVENTS: EventDef[] = FUTURES.map(futDef);

// ───────────────────────── 우주 여행 (행동) ─────────────────────────

/** [이 해부터, 목적지, 값(2025년 돈, 1인), 한 줄] — 시대가 갈수록 멀리, 싸게 */
const TRIPS: [number, string, number, string][] = [
  [2044, '저궤도 우주 관광 (90분)', 20000, '둥근 지평선과 얇은 파란 띠. 무중력 5분 동안 모두가 울었다.'],
  [2055, '저궤도 우주 관광 (하루)', 8000, '우주정거장에서 하룻밤. 지구가 90분마다 한 바퀴 돈다.'],
  [2066, '달 궤도 호텔 "한울"', 12000, '달 표면을 걸었다. 1/6 중력에서 3미터를 뛰었다.'],
  [2085, '달 가족 여행', 3000, '달빛골 한국 마을에서 달 떡국을 먹었다.'],
  [2105, '우주 엘리베이터 정지궤도 전망대', 900, '사흘 동안 천천히 올라가며 지구가 작아지는 걸 봤다.'],
  [2112, '화성 새터 관광 (한 달)', 15000, '붉은 모래 언덕과 파란 노을. 화성의 해 질 녘은 파랗다.'],
  [2135, '화성 휴가', 3500, '새터 시의 돔 아래 온실 카페에서 화성 사과 주스를 마셨다.'],
  [2150, '토성 고리 크루즈', 6000, '얼음 조각들이 햇빛에 반짝이는 고리 사이를 지났다.'],
  [2170, '타이탄 메탄 호수 요트', 5000, '주황빛 하늘 아래 메탄 호수 위를 미끄러졌다.'],
  [2190, '가니메데 얼음 축제', 4000, '목성이 하늘을 반쯤 덮은 채 떠 있었다.'],
];
const tripOf = (y: number) => TRIPS.filter(([from]) => y >= from).pop();

export const SPACE_ACTIONS: ActionDef[] = [
  {
    id: 'space_trip',
    cat: '가족',
    icon: '🚀',
    name: '우주 여행 가기',
    desc: '그 시대에 갈 수 있는 가장 먼 곳으로',
    label: (s) => {
      const t = tripOf(s.year)!;
      return { name: `🚀 ${t[1]} 여행`, desc: `가주 1인 ${formatMoney(W(s, t[2]))} · 행복↑↑ · 평생 이야깃거리 (명성 +1)` };
    },
    ap: 1,
    show: (s) => !!tripOf(s.year),
    blocked: (s) => (householder(s).cash < W(s, tripOf(s.year)![2]) ? '돈이 모자란다' : undefined),
    run: (s) => {
      const t = tripOf(s.year)!;
      const h = head(s);
      householder(s).cash -= W(s, t[2]);
      addFlag(h, 'space_trip');
      hap(h, 15);
      s.fame += 1;
      return `${t[1]}에 다녀왔다. ${t[3]}`;
    },
  },
];
