// 직업이 여는 히든의 길: 지금 하는 일에서 조건이 맞으면, 해마다 한 걸음씩 세 장면을 지나 히든 직업 제안(hid_offer)에 닿는다.
// 헌책방·밤거리 헤매기와 달리 "하던 일"에서 새어 나오는 길. 장면 글은 분위기만 (방법은 그리지 않는다).
//   예) 잘나가는 한의사인데 성품이 낮다 → 무당의 길
import type { EventDef } from './ev-util';
import { HIDDEN_BY_ID } from './hidden-data';
import { JOBS } from './data';
import { age, alive, fullName, isMainline } from './people';
import { chance } from './rng';
import type { GameState, Person } from './types';

interface Path {
  id: string;
  jobs: string[];
  when: (s: GameState, p: Person) => boolean;
  /** 첫 장면: 그 직업에서 생기는 작은 계기 */
  open: string;
}
const A = (s: GameState, p: Person) => age(s, p);
const st = (p: Person) => p.actual;

export const PATHS: Path[] = [
  { id: 'hj_shaman', jobs: ['kmd'], when: (s, p) => p.jobLevel >= 2 && st(p).mor <= 50 && A(s, p) >= 30, open: '진료실에 "원장님 뒤에 누가 서 있다"는 환자가 자꾸 찾아온다.' },
  { id: 'hj_tarot', jobs: ['psychologist', 'speech_therapist', 'social_worker', 'librarian'], when: (s, p) => st(p).cha >= 55 && A(s, p) >= 24, open: '내담자가 놓고 간 낡은 카드 한 벌. 뒤집는 그림마다 그날 들은 고민과 닮았다.' },
  { id: 'hj_cult', jobs: ['clergy'], when: (s, p) => st(p).mor <= 45 && st(p).cha >= 58 && A(s, p) >= 30, open: '신도들이 교단보다 {n}의 말을 더 따르기 시작했다.' },
  { id: 'hj_exorcist', jobs: ['clergy', 'funeral_director', 'nurse', 'caregiver'], when: (s, p) => st(p).mor >= 68 && A(s, p) >= 28, open: '임종을 지키던 밤, 방 안이 얼음처럼 차가워졌다가 {n}의 기도에 다시 따뜻해졌다.' },
  { id: 'hj_bounty', jobs: ['police', 'court_officer', 'prison_guard', 'security_guard', 'coast_guard'], when: (s, p) => st(p).str >= 55 && A(s, p) >= 28, open: '눈앞에서 놓친 수배범이 해외로 사라졌다. 수사는 종결됐지만 {n}은(는) 잊지 못한다.' },
  { id: 'hj_magician', jobs: ['actor', 'film_actor', 'entertainer', 'comedian', 'musician', 'dancer'], when: (_s, p) => st(p).cha >= 58 && st(p).int >= 52, open: '무대 뒤에서 은퇴한 노신사가 {n}의 손놀림을 유심히 본다.' },
  { id: 'hj_spy', jobs: ['diplomat', 'translator', 'journalist'], when: (s, p) => st(p).int >= 60 && st(p).cha >= 56 && A(s, p) >= 25 && A(s, p) <= 50, open: '해외 출장 중, 호텔 로비의 낯선 사람이 {n}의 이름을 정확히 불렀다.' },
  { id: 'hj_pirate', jobs: ['fisher', 'ship_captain', 'navigator', 'shipbuilder', 'sea_farmer'], when: (s, p) => st(p).str >= 58 && st(p).mor <= 50 && A(s, p) <= 50, open: '항구 선술집에서 외눈 선장이 {n}에게 술잔을 민다.' },
  { id: 'hj_adventurer', jobs: ['photographer', 'journalist', 'tour_guide', 'forest_ranger', 'pilot'], when: (s, p) => st(p).str >= 58 && A(s, p) <= 48, open: '취재·촬영 중 들른 오지 마을에서 오래된 지도 한 장을 얻었다.' },
  { id: 'hj_natural', jobs: ['farmer', 'smart_farmer', 'beekeeper', 'forest_ranger', 'rancher'], when: (s, p) => A(s, p) >= 38 && (p.happiness < 45 || st(p).hp < 50), open: '산속 깊은 곳에 들어갈 때마다 몸이 가벼워진다.' },
  { id: 'hj_av', jobs: ['model', 'film_actor', 'actor', 'streamer'], when: (s, p) => s.year >= 1995 && p.sex === 'F' && st(p).cha >= 60 && A(s, p) <= 33, open: '해외 에이전시라는 곳에서 {n}에게 연락이 왔다.' },
  { id: 'hj_trader', jobs: ['fund_manager', 'analyst', 'banker', 'actuary', 'trader'], when: (s, p) => s.year >= 1985 && st(p).int >= 62 && A(s, p) >= 26, open: '{n}이(가) 쓴 보고서가 뉴욕의 누군가에게 전달됐다고 한다.' },
  { id: 'hj_massage', jobs: ['pt', 'makeup_artist', 'nail_artist', 'hairdresser', 'dental_hygienist'], when: (s, p) => st(p).cha >= 58 && A(s, p) <= 45, open: '단골 손님이 "청담동 살롱에서 당신을 찾는다"고 귀띔했다.' },
  { id: 'hj_mercenary', jobs: ['officer', 'nco'], when: (s, p) => st(p).str >= 62 && A(s, p) <= 50, open: '전역을 앞두고, 외국 경비 회사의 명함이 책상 위에 놓여 있었다.' },
  { id: 'hj_fighter', jobs: ['athlete', 'sports_instructor', 'trainer', 'delivery_rider', 'parttime'], when: (s, p) => st(p).str >= 62 && A(s, p) <= 36 && p.cash < 5000, open: '체육관 구석에서 누군가 {n}에게 "밤에 한 판 뛰어 볼래?"라고 속삭인다.' },
  { id: 'hj_memecoin', jobs: ['streamer', 'youtuber', 'developer', 'startup_emp'], when: (s, p) => s.year >= 2013 && A(s, p) >= 20, open: '방송 채팅창에 개 그림 코인 이야기가 끝없이 올라온다.' },
  { id: 'hj_nomad', jobs: ['writer', 'novelist', 'photographer', 'illustrator', 'translator'], when: (s, p) => !p.spouseId && A(s, p) >= 24 && A(s, p) <= 50, open: '마감을 끝낸 밤, 편도 비행기표 검색창을 닫지 못한다.' },
  { id: 'hj_hermit', jobs: ['none', 'parttime'], when: (s, p) => A(s, p) >= 20 && A(s, p) <= 40 && p.happiness < 45, open: '며칠째 방 밖으로 나가지 않았다. 이상하게 편하다.' },
];
const STEP = ['🌘 작은 틈', '🌗 더 깊이', '🌑 마지막 문'];
const MID = ['자꾸 그 일이 떠오른다. 비슷한 일이 한 번 더 일어났다.', '주변 사람들이 {n}을(를) 다르게 보기 시작했다. 돌아갈 길이 좁아진다.'];

const key = (p: Person) => p.flags.find((f) => f.startsWith('hp:'));
const fill = (t: string, p: Person) => t.replaceAll('{n}', fullName(p));

/** 해마다: 조건이 맞으면 첫 장면, 걷고 있으면 다음 장면 */
export function pathYear(s: GameState): void {
  const seen = (s.storySeen ??= {});
  for (const p of Object.values(s.people)) {
    if (!alive(p) || !isMainline(s, p) || p.job.startsWith('hj_') || A(s, p) < 18) continue;
    if (s.events.some((e) => e.defId === 'hp_step' && e.personId === p.id)) continue;
    const cur = key(p);
    if (cur) {
      const [, id, n] = cur.split(':');
      if (chance(s, 0.55)) s.events.push({ uid: s.eventSeq++, defId: 'hp_step', personId: p.id, data: { id, n: Number(n) } });
      continue;
    }
    if ((seen[`hp:${p.id}`] ?? -99) > s.year - 6) continue; // 한 번 고사하면 6년은 조용
    const cands = PATHS.filter((x) => x.jobs.includes(p.job) && x.when(s, p));
    if (cands.length && chance(s, 0.06)) {
      const x = cands[Math.floor(s.year + p.birthYear) % cands.length];
      s.events.push({ uid: s.eventSeq++, defId: 'hp_step', personId: p.id, data: { id: x.id, n: 0 } });
    }
  }
}

const step: EventDef = {
  id: 'hp_step',
  title: (c) => STEP[c.ev.data.n as number] ?? STEP[2],
  valid: (c) => alive(c.p) && !c.p.job.startsWith('hj_'),
  text: (c) => {
    const n = c.ev.data.n as number;
    const x = PATHS.find((q) => q.id === c.ev.data.id)!;
    const body = n === 0 ? x.open : n === 1 ? MID[0] : MID[1];
    return `${fullName(c.p)} (${JOBS[c.p.job]?.name ?? ''}): ${fill(body, c.p)}\n\n"${HIDDEN_BY_ID[x.id].hint}"\n(${n + 1}/3 · 끝까지 따라가면 히든 직업의 문이 열린다)`;
  },
  choices: (c) => {
    const n = c.ev.data.n as number;
    const id = c.ev.data.id as string;
    return [
      {
        label: n < 2 ? '이 흐름을 따라가 본다' : '문을 연다',
        run: (x) => {
          x.p.flags = x.p.flags.filter((f) => !f.startsWith('hp:'));
          if (n >= 2) {
            x.s.events.push({ uid: x.s.eventSeq++, defId: 'hid_offer', personId: x.p.id, data: { id } });
            return '🚪 마지막 문이 열렸다. 곧 누군가 찾아올 것이다…';
          }
          x.p.flags.push(`hp:${id}:${n + 1}`);
          return `한 걸음 더 들어갔다. (${n + 1}/3)`;
        },
      },
      {
        label: '평소의 삶으로 돌아간다',
        run: (x) => {
          x.p.flags = x.p.flags.filter((f) => !f.startsWith('hp:'));
          (x.s.storySeen ??= {})[`hp:${x.p.id}`] = x.s.year;
          return '없던 일로 했다.';
        },
      },
    ];
  },
};
export const PATH_EVENTS: EventDef[] = [step];
