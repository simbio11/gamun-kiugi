// 슈퍼 히든의 문: 직업마다 다른 "사연"이 쌓여야 3단계 미션(sh_step1~3)이 열린다.
//   핏빛 후작부인 — 1% 선천 [밤의 체질]: 시름시름 앓다 → 밤에 기운이 돌아옴 → 치료를 미루면 (쉬운 길)
//   드리프트 퀸 — [질주본능] + 중형 이상 자동차
//   시간 정지의 여제 — 지능 78+ · 높은 직급에서, 어느 날 문득 시간이 멈춘다 (확률)
import type { EventDef } from './ev-util';
import { HIDDEN_BY_ID } from './hidden-data';
import { addFlag, age, alive, clamp, fullName, hasFlag, isMainline, spouseOf } from './people';
import { chance } from './rng';
import { modelOf, vehiclesOf, myVehicles } from './vehicle';
import type { GameState, Person } from './types';

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

/** 슈퍼 히든별 새 자격 (3단계 미션 1단계가 열리는 조건) */
export const GATE_READY: Record<string, (s: GameState, p: Person) => boolean> = {
  hj_drifter: (s, p) => F(p) && A(s, p) >= 19 && (p.traits?.includes('speed_demon') ?? false) && goodCar(s, p),
  hj_timetraveler: (_s, p) => F(p) && hasFlag(p, 'time_awake'),
  hj_chess_master: (s, p) => F(p) && p.job === 'chess_player' && (p.traits?.includes('chess_prodigy') ?? false) && A(s, p) >= 35,
};
/** 옛 조건을 버리고 새 사연만으로 여는 직업 (나머지는 "새 사연 또는 옛 조건") */
export const GATE_ONLY = new Set(['hj_drifter', 'hj_chess_master']);

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
  return `\n\n✨ [슈퍼 히든 해금] ${h.icon} ${h.name}`;
}

// ───────────────────────── 해마다 ─────────────────────────
export function gateYear(s: GameState): void {
  const sn = seen(s);
  for (const p of Object.values(s.people)) {
    if (!alive(p) || !isMainline(s, p)) continue;
    const a = A(s, p);
    const k = (x: string) => `${x}:${p.id}`;
    // 🌙 밤의 체질: 해마다 한 걸음씩
    if (F(p) && p.traits?.includes('blood_thirst') && free(p) && !hasFlag(p, 'vamp_cured')) {
      const st = num(p, 'vamp');
      const last = sn[k('vamp')] ?? -99;
      if (st === 0 && a >= 15 && chance(s, 0.35)) push(s, 'gt_vamp', p, { st: 0 });
      else if (st === 1 && s.year - last >= 1 && chance(s, 0.6)) push(s, 'gt_vamp', p, { st: 1 });
      else if (st === 2 && s.year - last >= 3 && a >= 20 && chance(s, 0.5)) push(s, 'gt_vamp', p, { st: 2 });
    }
    // ⏳ 시간이 멈춘다: 지능 78+ · 직급이 높을 때, 드물게
    if (F(p) && free(p) && !hasFlag(p, 'time_awake') && p.actual.int >= 78 && p.jobLevel >= 3 && chance(s, 0.05)) push(s, 'gt_time', p);
    // ♟️ 체스 신동: 14~25세에 프로 체스 선수 고유 루트 제의
    if (F(p) && p.traits?.includes('chess_prodigy') && p.job !== 'chess_player' && !hasFlag(p, 'route:chess_player') && !hasFlag(p, 'chess_hobby') && !p.job.startsWith('hj_') && a >= 14 && a <= 25) {
      push(s, 'gt_chess_prodigy', p);
    }
    // 👑 여성 체스 그랜드마스터: 체스 선수로 35세까지 유지 시 전직
    if (F(p) && p.job === 'chess_player' && (p.traits?.includes('chess_prodigy') ?? false) && a >= 35 && !p.job.startsWith('hj_')) {
      push(s, 'gt_chess_master', p);
    }
  }
}

// ───────────────────────── 이벤트 ─────────────────────────
const VAMP = [
  ['🌙 시름시름', '몇 달째 기운이 없다. 병원에선 이상이 없다는데, 햇빛만 보면 어지럽다.', '병원을 더 다닌다', '이상하게 날이 저물면 멀쩡하다…'],
  ['🌙 달빛 산책', '밤공기를 마시며 걷자 온몸에 힘이 돌아왔다. 몇 달 만에 처음으로 개운하다. 밤이 부르는 것 같다.', '밤의 리듬을 받아들인다', '억지로 낮에 맞춰 산다'],
  ['💊 치료제', '"희귀 체질" 치료제가 나왔다. 먹으면 평범한 몸으로 돌아간다. 먹지 않으면… 다시는 돌아갈 수 없다.', '치료를 미루고 밤의 삶을 택한다', '치료제를 먹는다'],
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
        { label: VAMP[1][2], run: (x) => (next(x), (x.p.actual.hp = clamp(x.p.actual.hp + 12, 0, 100)), (x.p.actual.cha = clamp(x.p.actual.cha + 4, 0, 100)), '거울 속 얼굴에 생기가 돈다. 눈빛이 달라졌다. (건강 +12 · 매력 +4)') },
        { label: VAMP[1][3], run: (x) => (addFlag(x.p, 'vamp_cured'), '그 뒤로 다시는 생각하지 않았다. 기운 없는 날들이 이어졌다.') },
      ];
    return [
      { label: VAMP[2][2], run: (x) => '영원의 밤이 시작됐다. 고성의 초대장이 도착했다.' + grantSuper(x.s, x.p, 'hj_vampire') },
      { label: VAMP[2][3], run: (x) => (addFlag(x.p, 'vamp_cured'), (x.p.traits = x.p.traits?.filter((t) => t !== 'blood_thirst')), '평범한 몸이 되었다. 햇빛이 따뜻하다.') },
    ];
  },
};

const time: EventDef = {
  id: 'gt_time',
  title: () => '⏳ 멈춘 1초',
  valid: (c) => alive(c.p) && free(c.p),
  text: (c) => `회의 중, ${fullName(c.p)}의 손에서 떨어진 펜이 공중에 멈춰 있다. 시계 초침도, 사람들의 입도. …1초 뒤 모든 것이 다시 움직였다. 아무도 모르는 눈치다.`,
  choices: () => [
    { label: '다시 해 본다 (숨을 참고 집중한다)', run: (x) => (addFlag(x.p, 'time_awake'), '…멈췄다. 이번엔 3초. 착각이 아니었다.') },
    { label: '과로 탓이다', run: () => '푹 자고 나니 괜찮아졌다. 아마도.' },
  ],
};

const chessProdigy: EventDef = {
  id: 'gt_chess_prodigy',
  title: () => '♟️ [고유 루트] 체스 신동의 제의',
  valid: (c) => alive(c.p) && F(c.p) && (c.p.traits?.includes('chess_prodigy') ?? false) && !hasFlag(c.p, 'route:chess_player') && !c.p.job.startsWith('hj_'),
  text: (c) => `${fullName(c.p)}은(는) 반상 위에서 이미 기성 프로 마스터들을 압도하는 수읽기를 뽐내고 있다. 국제 체스 연맹과 공식 후원사에서 프로 전향을 강력히 제안해 왔다.\n\n"이 재능은 한 세대에 한 번 나올까 말까 한 천재성입니다. 프로 체스 선수의 길로 들어서십시오."`,
  choices: () => [
    {
      label: '🏆 프로 체스 선수로 데뷔한다 (고유 루트 전직)',
      run: (x) => {
        x.p.job = 'chess_player';
        x.p.jobLevel = 0;
        x.p.jobYears = 0;
        x.p.flags = x.p.flags.filter((f) => f !== 'student');
        addFlag(x.p, 'route:chess_player');
        x.p.happiness = clamp(x.p.happiness + 20, 0, 100);
        x.p.actual.int = clamp(x.p.actual.int + 6, 0, 100);
        x.s.fame += 3;
        return `${fullName(x.p)}은(는) 프로 체스 선수의 길을 선택했다! 64칸 판 위에서 전설적인 행보가 시작된다. (지능 +6 · 가문 명성 +3)`;
      },
    },
    {
      label: '📚 체스는 취미로만 두고 일반적인 학업을 이어간다',
      run: (x) => {
        addFlag(x.p, 'chess_hobby');
        return '체스는 어디까지나 취미로만 남겨두기로 했다.';
      },
    },
  ],
};

const chessMaster: EventDef = {
  id: 'gt_chess_master',
  title: () => '👑 여성 체스 그랜드마스터 (FIDE Grandmaster)',
  valid: (c) => alive(c.p) && F(c.p) && c.p.job === 'chess_player' && (c.p.traits?.includes('chess_prodigy') ?? false) && !c.p.job.startsWith('hj_'),
  text: (c) => `어린 시절부터 35세가 된 지금까지 수십 년간 64칸의 반상 위에서 세계적인 거장들과 사투를 벌여 온 ${fullName(c.p)}.\n\n마침내 세계 체스 연맹(FIDE) 공식 최고 권위이자 인류 지성의 정점을 상징하는 「여성 체스 그랜드마스터」의 자리에 등극했다!`,
  choices: () => [
    {
      label: '👑 영광의 그랜드마스터 왕관을 쓴다',
      run: (x) => '👑 반상 위의 절대적인 지배자! 전설의 여성 체스 그랜드마스터로 등극했다!' + grantSuper(x.s, x.p, 'hj_chess_master'),
    },
  ],
};

export const GATE_EVENTS: EventDef[] = [vamp, time, chessProdigy, chessMaster];
