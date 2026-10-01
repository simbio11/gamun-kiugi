// 미래 의료 선택지: 나이 들거나 아픈 가족에게 그 시대의 최신 치료가 제안된다.
// 처음 나올 땐 비싸서 부자만 받는다 → 해마다 값이 내린다 → 25년쯤 지나면 건강보험이 덮는다.
// 받으면 사망 위험이 줄어든다 (medical.ts lifeTechMult). 돈이 많으면 더 오래 산다.
import { chance, pick } from './rng';
import { gate, type EventDef } from './ev-util';
import { wageIndex } from './pay';
import { addFlag, age, alive, clamp, fullName, householder, isMainline } from './people';
import { unlock } from './achievements';
import type { GameState, Person } from './types';

interface Tech {
  flag: string;
  name: string;
  from: number;
  /** 처음 나왔을 때 값 (2025년 돈, 만원) */
  price: number;
  pitch: string;
  after: string;
  /** 이 조건일 때만 권한다 */
  need?: (s: GameState, p: Person) => boolean;
}
const TECHS: Tech[] = [
  { flag: 'regen_joint', name: '줄기세포 관절 재생', from: 2030, price: 900, pitch: '무릎 연골을 자기 줄기세포로 다시 키운다. 인공 관절 수술보다 회복이 빠르다.', after: '계단을 다시 오른다. 등산 동호회에 복귀했다.' },
  // mRNA 맞춤형 암 백신: 2023~ 흑색종 2상(모더나·MSD)에서 재발 위험 44% 감소 보고 → 2030년대 상용화 가정
  { flag: 'cancer_vax', name: '맞춤형 mRNA 암 백신', from: 2033, price: 4000, pitch: '종양 유전자를 읽어 그 사람만을 위한 백신을 만든다. 재발 위험이 크게 준다.', after: '정기 검진 결과지에 "재발 소견 없음". 가족이 다 같이 울었다.', need: (_s, p) => p.actual.hp < 65 },
  { flag: 'retina', name: '인공 망막 이식', from: 2036, price: 1500, pitch: '황반변성으로 흐려진 눈에 전자 망막을 심는다. 손주 얼굴이 다시 또렷해진다.', after: '돋보기 없이 신문을 읽었다. 손주 얼굴의 주근깨까지 보인다.', need: (s, p) => age(s, p) >= 62 },
  { flag: 'organ:kidney', name: '3D 프린팅 인공 신장', from: 2038, price: 6000, pitch: '환자 세포로 찍어 낸 신장. 거부 반응이 없고, 투석을 끊을 수 있다.', after: '일주일에 세 번 가던 투석실과 작별했다.', need: (_s, p) => p.actual.hp < 70 },
  { flag: 'organ:heart', name: '인공 심장 이식', from: 2042, price: 16000, pitch: '평생 뛰는 기계 심장. 배터리는 몸 안에서 무선 충전된다.', after: '가슴에 손을 대 보니 조용히, 규칙적으로 뛴다.', need: (_s, p) => p.actual.hp < 75 },
  { flag: 'organ:liver', name: '배양 간 이식', from: 2045, price: 8000, pitch: '돼지 몸에서 키운 사람 간(이종 이식). 기증자를 기다릴 필요가 없다.', after: '얼굴빛이 돌아왔다. 술은 여전히 금지다.' },
  { flag: 'organ:lung', name: '인공 폐', from: 2048, price: 8000, pitch: '미세먼지에 망가진 폐를 통째로 바꾼다.', after: '숨이 깊게 들어간다. 몇 년 만의 깊은 숨.' },
  { flag: 'gene_fix', name: '노화 유전자 교정', from: 2052, price: 11000, pitch: '노화를 앞당기는 유전자 몇 개를 고친다. 한 번 맞는 주사.', after: '흰머리가 조금 줄었다. 효과는 10년 뒤에 안다.' },
  { flag: 'rejuvenated', name: '노화 역전 치료', from: 2057, price: 30000, pitch: '70세 몸을 50세로. 대기 명단이 길지만, 돈이 있으면 내일이라도.', after: '거울 속 얼굴이 몇 년 젊어졌다. 손주들과 축구를 했다.' },
  { flag: 'dementia_vax', name: '알츠하이머 예방 백신', from: 2060, price: 1200, pitch: '뇌에 쌓이는 단백질을 막는 백신. 맞으면 치매 위험이 눈에 띄게 준다.', after: '주사 두 번. "이제 내가 누군지 잊을 걱정은 덜었네."', need: (s, p) => age(s, p) >= 58 },
  { flag: 'nano_bots', name: '혈관 청소 나노봇', from: 2070, price: 5000, pitch: '혈관 속을 돌며 찌꺼기를 치우는 나노봇. 뇌졸중·심근경색 위험이 뚝.', after: '주사 한 대. 아무 느낌도 없었는데 검사 수치가 20대 같다.' },
  { flag: 'brain_backup', name: '뇌 백업 (기억 보험)', from: 2076, price: 2500, pitch: '치매가 와도 기억을 되살릴 수 있게 뇌 상태를 통째로 저장한다.', after: '"잊어도 괜찮아. 다 저장돼 있어." 조금 안심이 됐다.' },
  { flag: 'cell_regen', name: '전신 세포 재생', from: 2095, price: 45000, pitch: '온몸의 세포를 한 번에 새것으로. "두 번째 몸"이라고 부른다.', after: '몸이 가볍다. 두 번째 인생이 시작된 것 같다.' },
  { flag: 'mito_swap', name: '미토콘드리아 교체', from: 2115, price: 25000, pitch: '세포 속 발전소를 새것으로 갈아 끼운다. 지친 몸에 다시 불이 들어온다.', after: '아침에 눈이 번쩍 떠졌다. 30년 만의 개운함.' },
];

const wi = (s: GameState) => Math.max(1, wageIndex(s.year));
/** 해마다 3%씩 내려 최저 15%까지 · 25년 지나면 건강보험 적용 (본인 부담 10%) */
export const techPrice = (s: GameState, t: Tech) => {
  const yrs = s.year - t.from;
  const base = t.price * Math.max(0.15, 1 - yrs * 0.03);
  return Math.round(base * (yrs >= 25 ? 0.1 : 1) * wi(s));
};

const offer: EventDef = {
  id: 'med_offer',
  title: (c) => `🧬 ${TECHS.find((t) => t.flag === c.ev.data?.flag)?.name ?? '새 치료'}`,
  portraits: (c) => [c.p],
  valid: (c) => alive(c.p) && !c.p.flags.includes(c.ev.data?.flag),
  text: (c) => {
    const t = TECHS.find((x) => x.flag === c.ev.data.flag)!;
    const yrs = c.s.year - t.from;
    return `${fullName(c.p)}(${age(c.s, c.p)}세)의 주치의가 권한다.\n\n${t.pitch}\n${yrs >= 25 ? '이제는 건강보험이 된다. 본인 부담은 10%.' : yrs < 5 ? '나온 지 얼마 안 된 치료라 값이 어마어마하다. 부자들만 받는다는 말이 돈다.' : '값이 처음보다 많이 내렸다.'}`;
  },
  choices: (c) => {
    const t = TECHS.find((x) => x.flag === c.ev.data.flag)!;
    const v = techPrice(c.s, t);
    return gate(c.s, [
      {
        label: '치료를 받는다',
        cost: v,
        run: (x) => {
          addFlag(x.p, t.flag);
          x.p.actual.hp = clamp(x.p.actual.hp + 12, 0, 100);
          x.p.happiness = clamp(x.p.happiness + 6, 0, 100);
          if (TECHS.filter((z) => x.p.flags.includes(z.flag)).length >= 3) unlock(x.s, 'cyborg');
          return t.after;
        },
      },
      { label: '나중에, 값이 내리면', run: (x) => (((x.s.storySeen ??= {})[`med_wait:${x.p.id}:${t.flag}`] = x.s.year), '"몇 년 기다리면 싸질 거야." 달력에 표시해 뒀다.') },
      { label: '주어진 만큼 살겠다', run: (x) => ((x.p.actual.mor = clamp(x.p.actual.mor + 1, 0, 100)), ((x.s.storySeen ??= {})['med_no:' + x.p.id] = x.s.year), '"자연스럽게 가는 게 복이지." 가족들은 서운해했다.') },
    ]);
  },
};

export const MEDICAL_EVENTS: EventDef[] = [offer];

/** 해마다: 55세 넘거나 몸이 약한 가족 한 명에게, 그 시대에 나온 치료 하나를 권한다 */
export function medicalYear(s: GameState): void {
  if (s.year < 2030 || !chance(s, 0.3)) return;
  const seen = (s.storySeen ??= {});
  const cands = Object.values(s.people).filter((p) => alive(p) && isMainline(s, p) && (age(s, p) >= 55 || p.actual.hp < 45) && !(s.year - (seen['med_no:' + p.id] ?? -99) < 10));
  if (!cands.length || s.events.some((e) => e.defId === 'med_offer')) return;
  const p = pick(s, cands);
  const avail = TECHS.filter((t) => s.year >= t.from && !p.flags.includes(t.flag) && (!t.need || t.need(s, p)) && !(s.year - (seen[`med_wait:${p.id}:${t.flag}`] ?? -99) < 4));
  if (!avail.length) return;
  const t = avail[avail.length - 1];
  // 너무 비싸면(가진 돈의 3배 넘게) 부자가 아닌 집엔 권하지 않는다 — 대신 다른 치료를
  const cash = householder(s).cash;
  const fit = avail.filter((x) => techPrice(s, x) <= Math.max(cash * 3, 1));
  const pickT = fit.length ? fit[fit.length - 1] : t;
  s.events.push({ uid: s.eventSeq++, defId: 'med_offer', personId: p.id, data: { flag: pickT.flag } });
}
