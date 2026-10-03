// 슈퍼 히든의 문: 직업마다 다른 "사연"이 쌓여야 3단계 미션(sh_step1~3)이 열린다.
//   핏빛 후작부인 — 1% 선천 [흡혈 적성]: 시름시름 앓다 → 피 맛을 알게 됨 → 백신을 거부하면 (쉬운 길)
//   드리프트 퀸 — [질주본능] + 중형 이상 자동차
import type { EventDef } from './ev-util';
import { HIDDEN_BY_ID } from './hidden-data';
import { addFlag, age, alive, clamp, fullName, hasFlag, isMainline, spouseOf } from './people';
import { chance } from './rng';
import { modelOf, vehiclesOf, myVehicles } from './vehicle';
import type { GameState, Person } from './types';
import { awardCard } from './cards';

const A = (s: GameState, p: Person) => age(s, p);
const F = (p: Person) => p.sex === 'F';
const free = (p: Person) => !p.job.startsWith('hj_') && !p.flags.includes('student');
const num = (p: Person, key: string) => Number(p.flags.find((f) => f.startsWith(key + ':'))?.slice(key.length + 1) ?? 0);
function setNum(p: Person, key: string, v: number) {
  p.flags = p.flags.filter((f) => !f.startsWith(key + ':'));
  p.flags.push(`${key}:${v}`);
}
const push = (s: GameState, defId: string, p: Person, data: Record<string, unknown> = {}) => {
  if (!s.events.some((e) => e.defId === defId && e.personId === p.id)) s.events.push({ uid: s.eventSeq++, defId, personId: p.id, data });
};
const seen = (s: GameState) => (s.storySeen ??= {});

/** 중형 세단 이상 자동차가 있나 */
export function goodCar(s: GameState, p: Person): boolean {
  const mine = [...vehiclesOf(s, [p.id]), ...(p.id === s.headId || spouseOf(s, s.people[s.headId])?.id === p.id ? myVehicles(s) : [])];
  return mine.some((a) => {
    const m = modelOf(a);
    return !!m && !m.yacht && m.price >= 3200;
  });
}

// ───────────────────────── 루트별 입구 ─────────────────────────
// 슈퍼 히든은 "능력치 몇 이상"이 아니라 그 사람이 걸어온 길로 열린다. 조건이 맞으면 해마다 GATE_RATE 확률로 1단계 장면이 온다.
//   (그 위에 가문 숙련·카드 효과·이미 나온 직업 감쇠가 곱해진다 — super-hidden.ts)
const M = (p: Person) => p.sex === 'M';
/** 지금 하거나, 2년 넘게 했던 직업 */
export const did = (p: Person, ...ids: string[]) => ids.includes(p.job) || ids.some((id) => p.flags.includes('was:' + id));
const tal = (p: Person, ...ids: string[]) => p.talents.some((x) => ids.includes(x.id));
const tr = (p: Person, ...ids: string[]) => ids.some((id) => p.traits?.includes(id));
const st = (p: Person) => p.actual;
/** 연애한 횟수: 헤어진 사람 + 지금 만나는 사람(배우자 포함) */
export const loves = (p: Person) => num(p, 'exes') + (p.partnerId || p.spouseId ? 1 : 0);
/** 당사자가 받은 명예의 전당 카드 수 */
export const ownCards = (s: GameState, p: Person) => (s.cards ?? []).filter((c) => c.personId === p.id).length;
const markOf2 = (p: Person, k: string) => p.marks?.[k] ?? 0;
const DARK = ['hj_gambler', 'hj_smuggler', 'hj_fighter', 'hj_loan_shark'];
const LAW = ['police', 'prosecutor', 'coast_guard', 'officer', 'journalist', 'insurance', 'court_officer', 'security', 'hj_bounty', 'prison_guard'];
const SPACE = ['aero_engineer', 'air_controller', 'space_tech', 'data_scientist', 'drone_control', 'star_navigator', 'researcher', 'orbital_architect', 'asteroid_miner'];

/** 슈퍼 히든별 자격 (3단계 미션 1단계가 열리는 조건) */
export const GATE_READY: Record<string, (s: GameState, p: Person) => boolean> = {
  // 🎧 노래하는 아이가 방에 마이크를 들인다: 18~30세 여성 · PC · 목소리 재능(절대음감·스타성) 또는 방송 경력 · 매력 60+
  hj_vtuber: (s, p) => F(p) && A(s, p) >= 18 && A(s, p) <= 30 && !!s.gear?.pc && st(p).cha >= 60 && (tal(p, 'pitch', 'star') || did(p, 'streamer', 'youtuber', 'voice_actor', 'singer')),
  // 🏎 [질주본능] 여성 + 중형 이상 자동차
  hj_drifter: (s, p) => F(p) && A(s, p) >= 19 && tr(p, 'speed_demon') && goodCar(s, p),
  // 🥃 어두운 판에서 이름을 날린 남자: 28~60세 · 속임수 2번 이상·한탕 4번 이상·뒷골목 직업 이력 중 하나 · 근력이나 매력 57+
  hj_mafia: (s, p) => M(p) && A(s, p) >= 28 && A(s, p) <= 60 && (markOf2(p, 'cheat') >= 2 || markOf2(p, 'risk') >= 4 || did(p, ...DARK)) && (st(p).str >= 57 || st(p).cha >= 57),
  // 🖤 같은 판의 여자: 28~65세 · 같은 흔적 · 매력 57+·지능 55+ (총 대신 장부)
  hj_godmother: (s, p) => F(p) && A(s, p) >= 28 && A(s, p) <= 65 && (markOf2(p, 'cheat') >= 2 || markOf2(p, 'risk') >= 4 || did(p, ...DARK)) && st(p).cha >= 57 && st(p).int >= 55,
  // ✈ 20~26세 여성 · 연애 3번 이상 (사람을 대하는 법을 아는 사람)
  hj_private_jet: (s, p) => F(p) && A(s, p) >= 20 && A(s, p) <= 26 && loves(p) >= 3 && !p.flags.includes('no_private_jet'),
  // 🂡 카지노에서 세 번 따야 열린다 (casino.ts) — 여기선 열지 않는다
  hj_underground_dealer: () => false,
  // ♟ 13세 체스 대회 → 체스 선수 → 30세까지 유지하면 gt_chess_master (아래 gateYear) — 3단계 미션은 쓰지 않는다
  hj_chess_master: () => false,
  // 🖼 그림을 아는 수사관: 25~55세 · 지능 65+ · 경찰·미술 쪽 이력, 또는 가문이 위작을 사 본 적 있다 (속아 본 사람이 쫓는다)
  hj_art_investigator: (s, p) => A(s, p) >= 25 && A(s, p) <= 55 && st(p).int >= 65 && (did(p, 'police', 'curator', 'appraiser', 'painter', 'journalist', 'hj_forger', 'hj_thief') || s.assets.some((a) => a.kind === 'art' && a.fake)),
  // 🍽 혀가 기억하는 사람: 28~60세 · 지능 55+ · 절대미각, 또는 주방·와인 경력, 또는 요리 서바이벌 우승
  hj_michelin_inspector: (s, p) => A(s, p) >= 28 && A(s, p) <= 60 && st(p).int >= 55 && (tal(p, 'palate') || did(p, 'chef', 'sommelier', 'baker', 'restaurant') || p.flags.includes('cook_win')),
  // 📜 지능 75에 첫 장면 → 78에 2단계 → 80에 3단계 (super-hidden.ts when)
  hj_conservator: (s, p) => A(s, p) >= 24 && A(s, p) <= 70 && st(p).int >= 75,
  // 🛡 몸이 무기: 22~45세 · 근력 65+·건강 60+ · 제복·운동 경력이나 군필
  hj_bodyguard: (s, p) => A(s, p) >= 22 && A(s, p) <= 45 && st(p).str >= 65 && st(p).hp >= 60 && (did(p, 'police', 'officer', 'nco', 'security_guard', 'athlete', 'firefighter', 'coast_guard', 'sports_instructor', 'hj_fighter', 'hj_mercenary') || p.flags.some((f) => f.startsWith('served'))),
  // 🕵 경찰·기자·검사… 그 일을 그만둔 뒤 50세가 넘어서 · 지능 62+·매력 55+·건강 50+
  hj_detective: (s, p) => A(s, p) >= 50 && A(s, p) <= 72 && LAW.some((j) => p.flags.includes('vet:' + j)) && !LAW.includes(p.job) && st(p).int >= 62 && st(p).cha >= 55 && st(p).hp >= 50,
  // 🥃 [개코] · 건강 60+ · 매력 65+
  hj_perfumer: (s, p) => A(s, p) >= 20 && A(s, p) <= 60 && tr(p, 'keen_nose') && st(p).hp >= 60 && st(p).cha >= 65,
  // 🔮 사람의 운을 봐 온 사람: 30~70세 · 매력 60+ · 타로·무당 이력이나 공감 능력·맑은 눈
  hj_stargazer: (s, p) => A(s, p) >= 30 && A(s, p) <= 70 && st(p).cha >= 60 && (did(p, 'hj_tarot', 'hj_shaman', 'psychologist', 'clergy') || tal(p, 'empath') || tr(p, 'hypnotic_eye')),
  // 👑 성직자만 · 60세 이상 · 도덕성 75+ · 본인이 받은 명예의 전당 카드 5장 이상
  hj_pope: (s, p) => A(s, p) >= 60 && p.job === 'clergy' && st(p).mor >= 75 && ownCards(s, p) >= 5,
  // 🛰 2020년 이후 · 26~55세 · 지능 72+ · 항공우주·데이터·관제 일을 하거나 했던 사람 (75·78에 다음 단계)
  hj_space_analyst: (s, p) => s.year >= 2020 && A(s, p) >= 26 && A(s, p) <= 55 && st(p).int >= 72 && did(p, ...SPACE),
};
/** 조건이 맞을 때 해마다 1단계 장면이 올 확률 (기본 0.3) — 조건이 까다로울수록 높게 */
export const GATE_RATE: Record<string, number> = {
  hj_bodyguard: 0.2, hj_mafia: 0.25, hj_godmother: 0.25, hj_stargazer: 0.3,
  hj_conservator: 0.35, hj_perfumer: 0.6, hj_pope: 0.8, hj_detective: 0.4, hj_private_jet: 0.35, hj_drifter: 0.5, hj_space_analyst: 0.35, hj_vtuber: 0.3,
};
/** 모두 새 입구만 쓴다 (옛 능력치 조건은 버림) */
export const GATE_ONLY = new Set(Object.keys(GATE_READY));

/** 슈퍼 히든으로 바로 전직 (쉬운 길) */
function grantSuper(s: GameState, p: Person, id: string): string {
  p.job = id;
  p.jobLevel = 0;
  p.jobYears = 0;
  p.flags = p.flags.filter((f) => !f.startsWith(`sh:${id}`));
  addFlag(p, 'hidden:' + id);
  p.happiness = clamp(p.happiness + 25, 0, 100);
  s.fame += 5;
  const h = HIDDEN_BY_ID[id];
  awardCard(s, p, id, `${h?.name ?? id} 해금`);
  return `\n\n✨ [슈퍼 히든 해금] ${h?.icon ?? ''} ${h?.name ?? id}\n🎴 명예의 전당 카드를 획득했습니다!`;
}

// ───────────────────────── 해마다 ─────────────────────────
export function gateYear(s: GameState): void {
  const sn = seen(s);
  for (const p of Object.values(s.people)) {
    if (!alive(p) || !isMainline(s, p)) continue;
    const a = A(s, p);
    const k = (x: string) => `${x}:${p.id}`;
    // 🩸 흡혈 적성: 해마다 한 걸음씩
    if (F(p) && p.traits?.includes('blood_thirst') && free(p) && !hasFlag(p, 'vamp_cured')) {
      const st = num(p, 'vamp');
      const last = sn[k('vamp')] ?? -99;
      if (st === 0 && a >= 15 && chance(s, 0.35)) push(s, 'gt_vamp', p, { st: 0 });
      else if (st === 1 && s.year - last >= 1 && chance(s, 0.6)) push(s, 'gt_vamp', p, { st: 1 });
      else if (st === 2 && s.year - last >= 3 && a >= 20 && chance(s, 0.5)) push(s, 'gt_vamp', p, { st: 2 });
    }
    // 💼 지나온 직업: 2년 넘게 한 일은 "was:직업"으로 남는다 (은퇴한 경찰의 탐정 루트 등)
    if (!['none', 'parttime', 'pension'].includes(p.job) && (p.jobYears ?? 0) >= 2) addFlag(p, 'was:' + p.job);
    // 8년 넘게 한 일은 "vet:직업" (베테랑: 사립탐정은 수사 쪽 일을 8년 이상)
    if (!['none', 'parttime', 'pension'].includes(p.job) && (p.jobYears ?? 0) >= 8) addFlag(p, 'vet:' + p.job);
    // ♟️ 체스 신동: 13세에 첫 공식 대회 (못 넘으면 15세까지 한 번 더)
    if (p.traits?.includes('chess_prodigy') && p.job !== 'chess_player' && !hasFlag(p, 'route:chess_player') && !hasFlag(p, 'chess_hobby') && !p.job.startsWith('hj_') && a >= 13 && a <= 15 && num(p, 'chess_try') < 2 && sn[k('chess_try')] !== s.year) {
      push(s, 'gt_chess_prodigy', p);
    }
    // 👑 체스 그랜드마스터: 체스 선수를 30세까지 이어 가면
    if (p.job === 'chess_player' && hasFlag(p, 'route:chess_player') && a >= 30) {
      push(s, 'gt_chess_master', p);
    }
  }
}

// ───────────────────────── 이벤트 ─────────────────────────
const VAMP = [
  ['🩸 시름시름', '몇 달째 기운이 없다. 병원에선 이상이 없다는데, 햇빛만 보면 어지럽다.', '병원을 더 다닌다', '이상하게 날이 저물면 멀쩡하다…'],
  ['🩸 붉은 맛', '덜 익힌 스테이크의 핏물을 삼킨 순간, 온몸에 힘이 돌아왔다. 몇 달 만에 처음으로 개운하다. 송곳니가 근질거린다.', '그 맛을 받아들인다', '못 본 척한다'],
  ['💉 백신', '"흡혈 증후군" 치료 백신이 나왔다. 맞으면 평범한 인간으로 돌아간다. 맞지 않으면… 다시는 햇빛 아래로 돌아갈 수 없다.', '백신을 거부하고 뱀파이어로 깨어난다', '백신을 맞는다'],
] as const;
const vamp: EventDef = {
  id: 'gt_vamp',
  title: (c) => VAMP[c.ev.data.st as number][0],
  valid: (c) => alive(c.p) && free(c.p),
  text: (c) => `${fullName(c.p)}: ${VAMP[c.ev.data.st as number][1]}`,
  choices: (c) => {
    const st = c.ev.data.st as number;
    const next = (x: { s: GameState; p: Person }) => {
      setNum(x.p, 'vamp', st + 1);
      seen(x.s)[`vamp:${x.p.id}`] = x.s.year;
    };
    if (st === 0) return [{ label: VAMP[0][2], run: (x) => (next(x), (x.p.actual.hp = clamp(x.p.actual.hp - 5, 0, 100)), VAMP[0][3] + ' (건강 −5)') }];
    if (st === 1)
      return [
        { label: VAMP[1][2], run: (x) => (next(x), (x.p.actual.hp = clamp(x.p.actual.hp + 12, 0, 100)), (x.p.actual.cha = clamp(x.p.actual.cha + 4, 0, 100)), '거울 속 얼굴에 생기가 돈다. 피부가 도자기처럼 빛나고 눈동자가 붉게 반짝인다. (건강 +12 · 매력 +4)') },
        { label: VAMP[1][3], run: (x) => (addFlag(x.p, 'vamp_cured'), '그 뒤로 다시는 생각하지 않았다. 기운 없는 날들이 이어졌다.') },
      ];
    return [
      { label: VAMP[2][2], run: (x) => '영원의 밤이 시작됐다. 고성의 초대장이 도착했다.' + grantSuper(x.s, x.p, 'hj_vampire') },
      { label: VAMP[2][3], run: (x) => (addFlag(x.p, 'vamp_cured'), (x.p.traits = x.p.traits?.filter((t) => t !== 'blood_thirst')), '평범한 몸이 되었다. 햇빛이 따뜻하다.') },
    ];
  },
};


/** 13세 체스 대회 통과 확률: 지능이 높을수록 (지능 50이면 60%, 70이면 85%) */
export const chessOdds = (p: Person) => clamp(0.6 + (p.actual.int - 50) * 0.0125, 0.35, 0.92);
const chessProdigy: EventDef = {
  id: 'gt_chess_prodigy',
  title: (c) => (num(c.p, 'chess_try') ? '♟️ 체스 대회 재도전' : '♟️ 전국 청소년 체스 선수권'),
  valid: (c) => alive(c.p) && (c.p.traits?.includes('chess_prodigy') ?? false) && !hasFlag(c.p, 'route:chess_player') && !c.p.job.startsWith('hj_'),
  text: (c) => `${fullName(c.p)}(${A(c.s, c.p)}세)이(가) 처음으로 공식 대회에 나간다. 어른들도 끼어 있는 오픈 섹션. 7라운드 스위스 방식, 상위 입상하면 프로 연맹 등록 자격이 생긴다.\n\n아이는 벌써 상대의 다음 세 수를 중얼거리고 있다.`,
  choices: (c) => [
    {
      label: `🏆 출전한다 (통과 확률 ${Math.round(chessOdds(c.p) * 100)}%)`,
      odds: chessOdds(c.p),
      run: (x) => {
        setNum(x.p, 'chess_try', num(x.p, 'chess_try') + 1);
        seen(x.s)[`chess_try:${x.p.id}`] = x.s.year;
        if (!chance(x.s, chessOdds(x.p))) return '마지막 라운드에서 시간 압박에 몰려 졌다. 집에 오는 길에 기보를 처음부터 다시 둬 봤다. (지능 +2)' + ((x.p.actual.int = clamp(x.p.actual.int + 2, 0, 100)), '');
        x.p.job = 'chess_player';
        x.p.jobLevel = 0;
        x.p.jobYears = 0;
        x.p.flags = x.p.flags.filter((f) => f !== 'student');
        addFlag(x.p, 'route:chess_player');
        x.p.happiness = clamp(x.p.happiness + 20, 0, 100);
        x.p.actual.int = clamp(x.p.actual.int + 6, 0, 100);
        x.s.fame += 3;
        return `🥇 우승! ${fullName(x.p)}이(가) 최연소로 프로 연맹에 등록됐다. 이제 체스 선수다. 30세까지 이 길을 지키면 그랜드마스터의 문이 열린다. (지능 +6 · 가문 명성 +3)`;
      },
    },
    {
      label: '📚 대회는 나가지 않는다 (체스는 취미로)',
      run: (x) => {
        addFlag(x.p, 'chess_hobby');
        return '체스는 어디까지나 취미로만 남겨두기로 했다.';
      },
    },
  ],
};

const chessMaster: EventDef = {
  id: 'gt_chess_master',
  title: () => '👑 체스 그랜드마스터 (FIDE Grandmaster)',
  valid: (c) => alive(c.p) && c.p.job === 'chess_player' && hasFlag(c.p, 'route:chess_player'),
  text: (c) => `열세 살 첫 대회부터 서른이 된 지금까지 수십 년간 64칸의 반상 위에서 세계적인 거장들과 사투를 벌여 온 ${fullName(c.p)}.\n\n마침내 세계 체스 연맹(FIDE) 공식 최고 권위이자 인류 지성의 정점을 상징하는 「체스 그랜드마스터」의 자리에 등극했다!`,
  choices: () => [
    {
      label: '👑 영광의 그랜드마스터 왕관을 쓴다',
      run: (x) => '👑 반상 위의 절대적인 지배자! 전설의 체스 그랜드마스터로 등극했다!' + grantSuper(x.s, x.p, 'hj_chess_master'),
    },
  ],
};

export const GATE_EVENTS: EventDef[] = [vamp, chessProdigy, chessMaster];
