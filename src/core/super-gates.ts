// 슈퍼 히든의 문: 직업마다 다른 "사연"이 쌓여야 3단계 미션(sh_step1~3)이 열린다.
//   텐프로 에이스 — 본인이나 부모 집이 강남, 도덕 35 이하
//   카지노 퀸 — 친구 따라 간 카지노에 세 번 발을 들이면 중독 (거절하면 10년에 한 번쯤 다시 권유). 남자는 타짜의 길
//   핏빛 후작부인 — 1% 선천 [흡혈 적성]: 시름시름 앓다 → 피 맛을 알게 됨 → 백신이 나와도 거부하면 (쉬운 길)
//   드리프트 퀸 — [질주본능] + 중형 이상 자동차
//   시간 정지의 여제 — 지능 78+ · 높은 직급에서, 어느 날 문득 시간이 멈춘다 (확률)
//   향의 연금술사 — 조향사 + 매력, 긴가민가한 향 사건을 믿어 보면
//   계약서의 여주인 — 매력·지능 + 법조 직업 + 고소득 남편
//   색욕의 성녀 — 매력 + 연애·이별 5번 이상 (많을수록 잘 열린다, 35세까지)
//   허니트랩 요원 — 싸우는 직업(군인·경찰 등) + 매력, 특수 임무 성공
//   아홉 꼬리 신부 — 전 남자친구 9명, 또는 매력 85+로 아홉 번의 사소한(?) 선택
import type { EventDef } from './ev-util';
import { HIDDEN_BY_ID } from './hidden-data';
import { homeOf } from './housing';
import { JOBS } from './data';
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
export const exesOf = (p: Person) => num(p, 'exes');
const push = (s: GameState, defId: string, p: Person, data: Record<string, unknown> = {}) => {
  if (!s.events.some((e) => e.defId === defId && e.personId === p.id)) s.events.push({ uid: s.eventSeq++, defId, personId: p.id, data });
};
const seen = (s: GameState) => (s.storySeen ??= {});

/** 강남 집: 본인 집이나 부모님 집이 강남 (또는 서울 아파트 보유) */
export function gangnam(s: GameState, p: Person): boolean {
  const homes = [p, s.people[p.fatherId ?? ''], s.people[p.motherId ?? '']].filter(Boolean).map((q) => homeOf(s, q));
  if (homes.some((h) => h?.tier === 'gangnam')) return true;
  const ids = [p.id, p.fatherId, p.motherId].filter(Boolean) as string[];
  return s.assets.some((a) => a.kind === 'apt_seoul' && ids.includes(a.ownerId));
}
/** 중형 세단 이상 자동차가 있나 */
export function goodCar(s: GameState, p: Person): boolean {
  const mine = [...vehiclesOf(s, [p.id]), ...(p.id === s.headId || spouseOf(s, s.people[s.headId])?.id === p.id ? myVehicles(s) : [])];
  return mine.some((a) => {
    const m = modelOf(a);
    return !!m && !m.yacht && m.price >= 3200;
  });
}
const LAW = ['lawyer', 'judge', 'prosecutor', 'patent_attorney', 'labor_attorney', 'scrivener', 'court_officer', 'tax_accountant'];
const FIGHT = ['officer', 'nco', 'police', 'coast_guard', 'prison_guard', 'security', 'security_guard', 'firefighter'];
const payOf = (q: Person) => {
  const j = JOBS[q.job];
  return j ? j.base + j.perLevel * q.jobLevel : 0;
};
const richSpouse = (s: GameState, p: Person) => {
  const sp = spouseOf(s, p);
  return !!sp && alive(sp) && (payOf(sp) >= 9000 || (JOBS[sp.job]?.base ?? 0) >= 7000 || sp.job.startsWith('hj_'));
};

/** 슈퍼 히든별 새 자격 (3단계 미션 1단계가 열리는 조건) */
export const GATE_READY: Record<string, (s: GameState, p: Person) => boolean> = {
  hj_madam: (s, p) => F(p) && A(s, p) >= 21 && A(s, p) <= 34 && p.actual.cha >= 66 && p.actual.mor <= 35 && gangnam(s, p),
  hj_bunny: (s, p) => F(p) && A(s, p) >= 20 && A(s, p) <= 40 && p.actual.cha >= 60 && hasFlag(p, 'casino_addict'),
  hj_drifter: (s, p) => F(p) && A(s, p) >= 19 && (p.traits?.includes('speed_demon') ?? false) && goodCar(s, p),
  hj_honeytrap: (s, p) => F(p) && A(s, p) >= 22 && A(s, p) <= 42 && hasFlag(p, 'honey_mission'),
  hj_timetraveler: (_s, p) => F(p) && hasFlag(p, 'time_awake'),
  hj_perfumer: (_s, p) => F(p) && hasFlag(p, 'perfume_awake'),
  hj_succubus: (s, p) => F(p) && A(s, p) >= 25 && A(s, p) <= 58 && p.actual.cha >= 66 && p.actual.int >= 72 && LAW.includes(p.job) && richSpouse(s, p),
  hj_lamia: (s, p) => F(p) && A(s, p) < 35 && hasFlag(p, 'lamia_awake'),
  hj_gumiho: (s, p) => F(p) && A(s, p) >= 20 && A(s, p) <= 45 && hasFlag(p, 'gumiho_ready'),
};
/** 옛 조건을 버리고 새 사연만으로 여는 직업 (나머지는 "새 사연 또는 옛 조건") */
export const GATE_ONLY = new Set(['hj_madam', 'hj_bunny', 'hj_drifter', 'hj_honeytrap']);

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
    // 🎰 카지노: 한번 가면 해마다 부른다. 끊으면 10년에 한 번쯤 친구가 다시
    if (free(p) && a >= 20 && a <= 55 && !hasFlag(p, 'casino_addict')) {
      const visits = num(p, 'casino');
      const off = sn[k('casino_off')];
      let pr = visits === 0 ? (p.traits?.includes('gambler') ? 0.08 : 0.025) : 0.9;
      if (off !== undefined) pr = s.year - off >= 5 ? 0.1 : 0;
      if (chance(s, pr)) push(s, 'gt_casino', p);
    }
    // 🩸 흡혈 적성: 해마다 한 걸음씩
    if (F(p) && p.traits?.includes('blood_thirst') && free(p) && !hasFlag(p, 'vamp_cured')) {
      const st = num(p, 'vamp');
      const last = sn[k('vamp')] ?? -99;
      if (st === 0 && a >= 15 && chance(s, 0.35)) push(s, 'gt_vamp', p, { st: 0 });
      else if (st === 1 && s.year - last >= 1 && chance(s, 0.6)) push(s, 'gt_vamp', p, { st: 1 });
      else if (st === 2 && s.year - last >= 3 && a >= 20 && chance(s, 0.5)) push(s, 'gt_vamp', p, { st: 2 });
    }
    // ⏳ 시간이 멈춘다: 지능 78+ · 직급이 높을 때, 드물게
    if (F(p) && free(p) && !hasFlag(p, 'time_awake') && p.actual.int >= 78 && p.jobLevel >= 3 && chance(s, 0.05)) push(s, 'gt_time', p);
    // ⚗ 긴가민가한 향
    if (F(p) && p.job === 'perfumer' && !hasFlag(p, 'perfume_awake') && p.actual.cha >= 65 && chance(s, 0.12)) push(s, 'gt_perfume', p);
    // 🐍 연애를 반복할수록
    if (F(p) && free(p) && a < 35 && !hasFlag(p, 'lamia_awake') && p.actual.cha >= 70) {
      const ex = exesOf(p);
      if (ex >= 5 && chance(s, Math.min(0.85, 0.12 * (ex - 4)))) push(s, 'gt_lamia', p);
    }
    // 💄 싸우는 직업 + 매력: 특수 임무
    if (F(p) && FIGHT.includes(p.job) && !hasFlag(p, 'honey_mission') && p.actual.cha >= 67 && a >= 22 && a <= 42 && (sn[k('honey')] ?? -99) < s.year - 3 && chance(s, 0.12)) {
      sn[k('honey')] = s.year;
      push(s, 'gt_honey', p);
    }
    // 🦊 전 남자친구 아홉 명 / 매력 85+이면 아홉 번의 선택
    if (F(p) && free(p) && a >= 18 && a <= 45 && !hasFlag(p, 'gumiho_ready')) {
      if (exesOf(p) >= 9 && !hasFlag(p, 'gumiho_nine')) {
        addFlag(p, 'gumiho_nine');
        push(s, 'gt_fox9', p);
      } else if (p.actual.cha >= 85 && num(p, 'fox') < 9 && chance(s, 0.4)) push(s, 'gt_fox', p, { n: num(p, 'fox') });
    }
  }
}

// ───────────────────────── 이벤트 ─────────────────────────
const casino: EventDef = {
  id: 'gt_casino',
  title: () => '🎰 카지노',
  valid: (c) => alive(c.p) && !hasFlag(c.p, 'casino_addict'),
  text: (c) => {
    const v = num(c.p, 'casino');
    const n = fullName(c.p);
    if (v === 0) return `친구가 ${n}을(를) 카지노에 데려가려 한다. "딱 구경만 하자. 칩 몇 개만."`;
    if (v === 1) return `지난번 카지노의 불빛이 자꾸 떠오른다. 딜러가 칩을 밀어 주던 소리가 귀에 맴돈다. 이번 주말에 또 갈까?`;
    return `${n}은(는) 요즘 주말마다 카지노 생각뿐이다. 딜러들이 이름을 외운다. 한 번만 더 가면…`;
  },
  choices: (c) => [
    {
      label: '간다',
      run: (x) => {
        const v = num(x.p, 'casino') + 1;
        setNum(x.p, 'casino', v);
        delete seen(x.s)[`casino_off:${x.p.id}`];
        const bet = Math.min(8000, Math.max(300, Math.round(x.p.cash * 0.15)));
        const win = chance(x.s, 0.4);
        x.p.cash += win ? bet : -bet;
        let out = win ? `칩이 쌓였다! (+${bet}만)` : `칩이 사라졌다. (−${bet}만) 본전 생각이 난다.`;
        if (v >= 3) {
          addFlag(x.p, 'casino_addict');
          out += '\n\n🎰 이제 카지노가 집처럼 편하다. 지하 층의 사람들이 먼저 인사를 건넨다…';
          if (x.p.sex === 'M' && !x.p.job.startsWith('hj_')) x.s.events.push({ uid: x.s.eventSeq++, defId: 'hid_offer', personId: x.p.id, data: { id: 'hj_gambler' } });
        }
        return out;
      },
    },
    {
      label: num(c.p, 'casino') ? '끊는다' : '거절한다',
      run: (x) => {
        seen(x.s)[`casino_off:${x.p.id}`] = x.s.year;
        x.p.actual.mor = clamp(x.p.actual.mor + 1, 0, 100);
        return '발길을 돌렸다. 잘 참았다.';
      },
    },
  ],
};

const VAMP = [
  ['🩸 시름시름', '몇 달째 기운이 없다. 병원에선 이상이 없다는데, 햇빛만 보면 어지럽다.', '병원을 더 다닌다', '이상하게 날이 저물면 멀쩡하다…'],
  ['🩸 붉은 맛', '덜 익힌 스테이크의 핏물을 삼킨 순간, 온몸에 힘이 돌아왔다. 몇 달 만에 처음으로 개운하다.', '그 맛을 받아들인다', '못 본 척한다'],
  ['💉 백신', '"희귀 혈액 질환" 치료 백신이 나왔다. 맞으면 평범한 몸으로 돌아간다. 맞지 않으면… 다시는 돌아갈 수 없다.', '백신을 거부하고 밤의 삶을 택한다', '백신을 맞는다'],
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
        { label: VAMP[1][2], run: (x) => (next(x), (x.p.actual.hp = clamp(x.p.actual.hp + 12, 0, 100)), (x.p.actual.cha = clamp(x.p.actual.cha + 4, 0, 100)), '거울 속 얼굴에 생기가 돈다. 피부가 도자기처럼 빛난다. (건강 +12 · 매력 +4)') },
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
const perfume: EventDef = {
  id: 'gt_perfume',
  title: () => '⚗ 이상한 향',
  valid: (c) => alive(c.p) && c.p.job === 'perfumer',
  text: (c) => `${fullName(c.p)}이(가) 실수로 섞은 향을 맡은 손님이 갑자기 눈물을 흘리며 "어릴 적 엄마 품 냄새"라고 한다. 다른 손님은 화를 내다 말고 순해졌다. 우연일까?`,
  choices: () => [
    { label: '같은 배합을 몰래 기록해 둔다', run: (x) => (addFlag(x.p, 'perfume_awake'), '노트에 적었다. 다시 섞어 보니… 또 그랬다.') },
    { label: '우연이겠지', run: () => '배합은 잊혔다.' },
  ],
};
const lamia: EventDef = {
  id: 'gt_lamia',
  title: () => '🐍 또 한 번의 이별',
  valid: (c) => alive(c.p) && free(c.p),
  text: (c) => `${exesOf(c.p)}번째 이별. 그런데 ${fullName(c.p)}은(는) 슬프지 않다. 오히려 몸이 가볍다. 물안개 낀 온실 꿈을 자주 꾼다. 꿈속 초록 뱀이 손목을 감는다.`,
  choices: () => [
    { label: '꿈속 온실을 찾아간다', run: (x) => (addFlag(x.p, 'lamia_awake'), '식물원 가장 안쪽, 꿈과 똑같은 온실이 있었다.') },
    { label: '이제 연애는 쉰다', run: () => '한동안 혼자 지내기로 했다.' },
  ],
};
const honey: EventDef = {
  id: 'gt_honey',
  title: () => '💄 특수 임무',
  valid: (c) => alive(c.p) && FIGHT.includes(c.p.job),
  text: (c) => `상관이 ${fullName(c.p)}을(를) 조용히 불렀다. "외국 외교관 파티에 들어가 줄 사람이 필요하네. 드레스 입고, 웃고, 명단 하나만 가져오면 돼."`,
  choices: () => [
    {
      label: '임무를 맡는다 (매력·지능)',
      run: (x) => {
        const ok = chance(x.s, clamp((x.p.actual.cha + x.p.actual.int - 110) / 60, 0.15, 0.85));
        if (ok) return addFlag(x.p, 'honey_mission'), '명단을 손에 넣었다. 파티장의 누구도 눈치채지 못했다. 며칠 뒤, 정체 모를 번호에서 연락이 왔다.';
        x.p.happiness = clamp(x.p.happiness - 5, 0, 100);
        return '의심을 사 급히 빠져나왔다. 임무 실패.';
      },
    },
    { label: '제 일이 아닙니다', run: () => '본업으로 돌아갔다.' },
  ],
};
const FOX = [
  ['길고양이', '비 오는 밤, 골목에서 다친 여우 같은 고양이가 떨고 있다.', '우산을 씌워 준다'],
  ['낯선 노인', '산길에서 길 잃은 노인이 물을 청한다.', '물을 나눠 준다'],
  ['보름달', '보름달이 유난히 크다. 창문을 열고 싶어진다.', '창문을 열고 달을 본다'],
  ['붉은 실', '손목에 붉은 실이 감겨 있다. 누가 묶었는지 모르겠다.', '풀지 않고 둔다'],
  ['구슬', '서랍 속에 처음 보는 흰 구슬이 있다.', '주머니에 넣고 다닌다'],
  ['간식', '제사 음식 중 간을 유난히 좋아하게 됐다.', '맛있게 먹는다'],
  ['거울', '거울 속 내가 한 박자 늦게 웃는 것 같다.', '마주 보고 웃어 준다'],
  ['산', '자꾸 이름 모를 산이 꿈에 나온다.', '주말에 그 산을 찾아간다'],
  ['꼬리뼈', '꼬리뼈가 간질간질하다.', '대수롭지 않게 넘긴다'],
] as const;
const fox: EventDef = {
  id: 'gt_fox',
  title: (c) => `🌙 ${FOX[Math.min(8, c.ev.data.n as number)][0]}`,
  valid: (c) => alive(c.p) && free(c.p),
  text: (c) => `${fullName(c.p)}: ${FOX[Math.min(8, c.ev.data.n as number)][1]}`,
  choices: (c) => {
    const n = Math.min(8, c.ev.data.n as number);
    return [
      {
        label: FOX[n][2],
        run: (x) => {
          setNum(x.p, 'fox', n + 1);
          if (n + 1 >= 9) return addFlag(x.p, 'gumiho_ready'), '…아홉 번째. 등 뒤에서 무언가 부드러운 것이 스쳤다.';
          return '별일 없었다. 기분이 묘하게 좋다.';
        },
      },
      { label: '신경 쓰지 않는다', run: () => '평범한 하루였다.' },
    ];
  },
};
const fox9: EventDef = {
  id: 'gt_fox9',
  title: () => '🦊 아홉 번째 이별',
  valid: (c) => alive(c.p) && free(c.p),
  text: (c) => `아홉 번째 연인과 헤어진 밤, ${fullName(c.p)}의 그림자에 꼬리 같은 것이 아홉 개 흔들렸다. 달빛 아래 누군가 속삭인다. "이제 때가 되었구나."`,
  choices: () => [
    { label: '목소리를 따라간다', run: (x) => (addFlag(x.p, 'gumiho_ready'), '산길 끝, 붉은 등불이 켜져 있었다.') },
    { label: '귀를 막는다', run: () => '아침이 되자 모든 것이 꿈 같았다.' },
  ],
};

export const GATE_EVENTS: EventDef[] = [casino, vamp, time, perfume, lamia, honey, fox, fox9];
