// 어려운 직업의 길: 교수(논문·임용·정년 심사)와 정치인(지지율·정치자금·비자금·명성).
// 오르기도 어렵지만 버티기는 더 어렵다. 대신 올라서면 가문 전체가 달라진다.

import { chance, int, normal, pick } from './rng';
import { gate, type Choice, type Ctx, type EventDef } from './ev-util';
import { addFlag, age, alive, check, clamp, fullName, hasFlag, hasTrait, isMainline, markOf } from './people';
import { formatMoney } from './economy';
import { wageIndex } from './pay';
import { awardHonor, grant } from './rewards';
import type { ActionDef } from './actions';
import type { GameState, Person } from './types';

const who = (c: Ctx) => fullName(c.p);
const hap = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));
const addPapers = (p: Person, n: number) => (p.papers = Math.max(0, (p.papers ?? 0) + n));

// ───────────────────────── 교수의 길 ─────────────────────────
// 대학원(석박사 5년) → 박사후연구원·시간강사 → 교수 임용 공고 → 조교수 → 정년보장 심사 → 정교수 → 석좌 → 총장

const PROF_TIERS = [
  { id: 'D', name: '지방 사립대', need: 18, fame: 1 },
  { id: 'C', name: '지방 거점국립대', need: 30, fame: 2 },
  { id: 'B', name: '인서울 대학', need: 42, fame: 3 },
  { id: 'S', name: '서울대·KAIST', need: 56, fame: 5 },
];
/** 임용 경쟁력: 논문 + 지능 + 학벌 + 해외 경험 + 인맥 */
export function profScore(p: Person): number {
  return (p.papers ?? 0) * 2.2 + p.actual.int * 0.25 + (hasFlag(p, 'univ_top') ? 6 : 0) + (hasFlag(p, 'abroad_grad') || hasFlag(p, 'abroad_postdoc') ? 8 : 0) + Math.min(6, Math.max(0, markOf(p, 'network')));
}
const profChance = (p: Person, need: number) => 1 / (1 + Math.exp(-(profScore(p) - need) / 4));

const profHire: EventDef = {
  id: 'prof_hire',
  title: () => '🎓 교수 임용 공고',
  valid: (c) => alive(c.p) && c.p.job !== 'professor' && hasFlag(c.p, 'phd'),
  text: (c) =>
    `${who(c)} 박사에게 교수 임용 공고가 떴다. 논문 ${c.p.papers ?? 0}편.\n` +
    `한 자리에 수십 명이 몰린다. 교수 한 명 뽑는 데 논문·학벌·인맥이 다 본다.` +
    (hasFlag(c.p, 'prof_fail') ? `\n(지난번엔 떨어졌다. 박사 ${c.s.year - Number(c.p.flags.find((f) => f.startsWith('phd_y:'))?.slice(5) ?? c.s.year)}년 차)` : ''),
  choices: (c) => {
    const p = c.p;
    const apply = (t: (typeof PROF_TIERS)[number]): Choice => {
      const ch = profChance(p, t.need);
      return {
        label: `${t.name}에 지원한다`,
        req: [ch >= 0.7 ? '유력' : ch >= 0.35 ? '해볼 만함' : ch >= 0.1 ? '도전' : '거의 불가', `논문 ${p.papers ?? 0}편`],
        run: (x) => {
          if (!chance(x.s, profChance(x.p, t.need))) {
            addFlag(x.p, 'prof_fail');
            hap(x.p, -8);
            return pick(x.s, ['최종 3인까지 올랐지만 "내정자"가 있었다는 소문이다.', '면접에서 "논문이 조금 부족하네요"라는 말을 들었다.', '학과 교수들의 제자가 뽑혔다. 씁쓸하다.']);
          }
          x.p.job = 'professor';
          x.p.jobLevel = 0;
          x.p.jobYears = 0;
          x.p.flags = x.p.flags.filter((f) => f !== 'prof_fail' && !f.startsWith('prof_at:'));
          x.p.flags.push('prof_at:' + t.id);
          x.s.fame += t.fame * 2;
          grant(x.s, '🎓', `교수 임용: ${fullName(x.p)}`, `${t.name} 조교수로 임용됐다! 박사 학위를 받은 지 ${x.s.year - Number(x.p.flags.find((f) => f.startsWith('phd_y:'))?.slice(5) ?? x.s.year)}년 만.\n앞으로 6년 안에 논문을 충분히 쌓아야 정년을 보장받는다.`, t.id === 'S' ? 'legend' : 'epic');
          return `🎉 ${t.name} 조교수 임용! 연구실 문에 이름표가 붙었다.`;
        },
      };
    };
    return gate(c.s, [
      ...PROF_TIERS.map(apply),
      { label: '해외 포닥을 간다 (2년, 논문↑)', cost: 1500, run: (x) => (addFlag(x.p, 'abroad_postdoc'), addPapers(x.p, int(x.s, 3, 6)), `미국 연구소에서 2년. 영어 논문이 늘었다. (논문 ${x.p.papers}편)`) },
      { label: '올해는 논문에 집중한다', run: (x) => (addPapers(x.p, int(x.s, 1, 3)), `연구실에서 밤을 새웠다. (논문 ${x.p.papers}편)`) },
      { label: '교수의 꿈을 접고 기업 연구소로', run: (x) => ((x.p.job = 'researcher'), (x.p.jobLevel = 1), (x.p.jobYears = 0), (x.p.flags = x.p.flags.filter((f) => f !== 'phd')), '대기업 연구소 선임연구원이 됐다. 연봉은 오히려 높다.') },
    ]);
  },
};

const tenure: EventDef = {
  id: 'prof_tenure',
  title: () => '📑 정년보장 심사',
  valid: (c) => c.p.job === 'professor' && c.p.jobLevel === 0,
  text: (c) => `조교수 6년 차. ${who(c)} 교수의 운명이 걸린 정년보장(테뉴어) 심사다.\n논문 ${c.p.papers ?? 0}편 (기준 약 12편) · 강의 평가 · 학과 기여를 본다.`,
  choices: () => [
    {
      label: '심사를 받는다',
      run: (x) => {
        const v = (x.p.papers ?? 0) + x.p.actual.mor / 20 + (hasTrait(x.p, 'diligent') ? 2 : 0);
        if (v >= 12 || chance(x.s, Math.max(0, (v - 6) / 12))) {
          x.p.jobLevel = 1;
          x.s.fame += 3;
          grant(x.s, '📜', `정년 보장: ${fullName(x.p)}`, '부교수 승진과 함께 정년이 보장됐다. 이제 65세까지 연구실을 지킨다.', 'epic');
          return '🎉 통과! 부교수로 승진했다.';
        }
        x.p.job = 'researcher';
        x.p.jobLevel = 1;
        x.p.jobYears = 0;
        hap(x.p, -20);
        return '재임용 탈락. 연구실을 비웠다. 연구소로 자리를 옮긴다.';
      },
    },
  ],
};

/** 교수·대학원생 이야기 (해마다 가끔) */
const ACADEMIA: { id: string; title: string; text: (c: Ctx) => string; ok: (s: GameState, p: Person) => boolean; choices: (c: Ctx) => Choice[] }[] = [
  {
    id: 'ac_advisor',
    title: '지도교수의 갑질',
    ok: (_s, p) => p.flags.includes('track:grad_school'),
    text: (c) => `지도교수가 ${who(c)}에게 주말마다 개인 이삿짐을 나르게 한다. 졸업 논문 도장은 교수 손에 있다.`,
    choices: () => [
      { label: '참는다', run: (x) => (hap(x.p, -8), addPapers(x.p, 1), '이를 악물었다. 대신 공저 논문 한 편에 이름이 올라갔다.') },
      { label: '대학 인권센터에 신고한다', run: (x) => (check(x.s, x.p.actual.mor, 50, 10) ? ((x.p.actual.mor = clamp(x.p.actual.mor + 3, 0, 100)), '조사 끝에 지도교수가 바뀌었다. 연구실 동료들이 박수를 쳤다.') : (addPapers(x.p, -1), hap(x.p, -10), '"증거가 부족합니다." 연구실 분위기가 싸늘해졌다.')) },
      { label: '연구실을 옮긴다', run: (x) => (hap(x.p, 4), '1년을 손해 봤지만 좋은 교수를 만났다.') },
    ],
  },
  {
    id: 'ac_nature',
    title: '톱 저널 투고',
    ok: (_s, p) => p.flags.includes('track:grad_school') || ['professor', 'researcher'].includes(p.job),
    text: (c) => `${who(c)}의 연구 결과가 심상치 않다. 세계적 학술지에 투고해 볼까?`,
    choices: () => [
      { label: '네이처·사이언스에 도전', run: (x) => (check(x.s, x.p.actual.int, 75, 8) ? (addPapers(x.p, 5), (x.s.fame += 4), grant(x.s, '📰', `톱 저널 게재: ${fullName(x.p)}`, '세계 최고 학술지에 논문이 실렸다. 해외 학회 초청이 쏟아진다.', 'epic'), '🎉 게재 확정! 인용이 폭발한다. (논문 +5)') : (hap(x.p, -5), '리젝. 심사위원 3번이 끝까지 반대했다.')) },
      { label: '안전하게 국내 학술지에', run: (x) => (addPapers(x.p, 1), '무난히 게재됐다. (논문 +1)') },
    ],
  },
  {
    id: 'ac_grant',
    title: '연구비의 유혹',
    ok: (_s, p) => p.job === 'professor',
    text: (c) => `${who(c)} 교수의 연구실에 국가 과제 5억 원이 들어왔다. 행정실 직원이 귀띔한다. "다들 학생 인건비 좀 돌려 쓰세요. 교수님 몫으로."`,
    choices: () => [
      { label: '원칙대로 쓴다', run: (x) => ((x.p.actual.mor = clamp(x.p.actual.mor + 3, 0, 100)), addPapers(x.p, 2), '학생들에게 인건비를 온전히 줬다. 연구실 성과가 좋아졌다. (논문 +2)') },
      { label: '인건비를 회수한다 (비자금)', run: (x) => {
        x.p.cash += 3000;
        x.p.actual.mor = clamp(x.p.actual.mor - 6, 0, 100);
        if (chance(x.s, 0.35)) {
          x.p.job = 'none';
          x.p.jobLevel = 0;
          x.s.fame = Math.max(0, x.s.fame - 15);
          addFlag(x.p, 'criminal');
          return '💥 대학원생이 폭로했다. 연구비 횡령으로 해임, 가문 명성이 땅에 떨어졌다.';
        }
        return '3천만 원이 조용히 쌓였다. …학생들의 눈빛이 달라졌다.';
      } },
    ],
  },
  {
    id: 'ac_star',
    title: '스타 강의',
    ok: (_s, p) => p.job === 'professor',
    text: (c) => `${who(c)} 교수의 교양 강의가 입소문을 탔다. 방송국에서 강연 프로그램 섭외가 왔다.`,
    choices: () => [
      { label: '방송에 나간다', run: (x) => (check(x.s, x.p.actual.cha, 55, 10) ? ((x.s.fame += 6), (x.p.cash += 2000), '"국민 교수님"이 됐다. 책도 베스트셀러에 올랐다.') : ((x.s.fame += 1), '어려운 말만 하다 편집됐다.')) },
      { label: '연구에 집중한다', run: (x) => (addPapers(x.p, 1), '"교수는 논문으로 말한다."') },
    ],
  },
  {
    id: 'ac_plagiarism',
    title: '표절 의혹',
    ok: (_s, p) => p.job === 'professor' && (p.papers ?? 0) >= 10,
    text: (c) => `언론이 ${who(c)} 교수의 15년 전 논문에 표절 의혹을 제기했다. 연구진실성위원회가 열린다.`,
    choices: () => [
      { label: '당당히 해명한다', run: (x) => (check(x.s, x.p.actual.mor, 55, 10) ? ((x.s.fame += 2), '"인용 표기 누락일 뿐" 판정. 오히려 신뢰가 쌓였다.') : (addPapers(x.p, -3), (x.s.fame = Math.max(0, x.s.fame - 8)), '일부 표절로 결론. 논문 3편이 철회됐다.')) },
      { label: '대형 로펌을 선임한다', cost: 2000, run: (x) => (chance(x.s, 0.7) ? '"문제없음"으로 끝났다.' : (addPapers(x.p, -2), (x.s.fame = Math.max(0, x.s.fame - 5)), '로펌도 막지 못했다.')) },
    ],
  },
  {
    id: 'ac_dean',
    title: '총장 선거',
    ok: (_s, p) => p.job === 'professor' && p.jobLevel >= 3 && age(_s, p) >= 55,
    text: (c) => `교수 사회에서 ${who(c)}을(를) 총장 후보로 추대하려 한다. 교수·직원·학생 투표다.`,
    choices: () => [
      { label: '출마한다', cost: 3000, run: (x) => {
        const v = x.p.actual.cha * 0.4 + x.p.actual.mor * 0.3 + (x.p.papers ?? 0) * 0.5 + Math.min(10, markOf(x.p, 'network'));
        if (check(x.s, v, 55, 8)) {
          x.p.jobLevel = 4;
          x.s.fame += 15;
          grant(x.s, '🏛', `대학 총장: ${fullName(x.p)}`, '대학의 얼굴이 되었다. 정부 위원회 자리도 들어온다.', 'legend');
          return '🎉 총장 당선!';
        }
        return '2위로 낙선했다. 학내 정치는 논문보다 어렵다.';
      } },
      { label: '연구자로 남는다', run: () => '"연구실이 더 좋습니다."' },
    ],
  },
];

// ───────────────────────── 정치의 길 ─────────────────────────

export function polOf(p: Person) {
  return (p.pol ??= { approval: 45, fund: 0, slush: 0, heat: 0 });
}
/** 의원직을 지키려면 필요한 가문 명성 */
export const fameNeed = (p: Person) => (p.job === 'president' ? 150 : 25 + p.jobLevel * 12);

const POLITICS: { id: string; title: string; text: (c: Ctx) => string; ok: (s: GameState, p: Person) => boolean; choices: (c: Ctx) => Choice[] }[] = [
  {
    id: 'pol_offer',
    title: '기업인의 "후원"',
    ok: () => true,
    text: (c) => `지역 건설사 회장이 ${who(c)} ${c.p.job === 'president' ? '대통령' : '의원'}을 조용히 만나자고 한다. 쇼핑백 안에 현금이 가득하다. "다음 선거 때 쓰시라고…"`,
    choices: () => [
      { label: '받는다 (비자금 +5억)', run: (x) => {
        const pl = polOf(x.p);
        pl.slush += 50000;
        pl.heat += 25;
        x.p.actual.mor = clamp(x.p.actual.mor - 5, 0, 100);
        return '금고가 두둑해졌다. 선거 조직을 돌릴 돈이다. …이 돈에는 꼬리표가 붙어 있다.';
      } },
      { label: '정중히 돌려보낸다', run: (x) => ((x.p.actual.mor = clamp(x.p.actual.mor + 3, 0, 100)), (polOf(x.p).approval += 2), '"마음만 받겠습니다." 소문이 나서 청렴 이미지가 생겼다.') },
      { label: '돌려보내고 공개한다', run: (x) => (check(x.s, x.p.actual.cha, 45, 10) ? ((polOf(x.p).approval += 8), (x.s.fame += 4), '"뇌물을 거절한 정치인" 뉴스가 났다. 지지율이 뛰었다.') : ((polOf(x.p).approval -= 3), '"정치 쇼"라는 비난을 받았다.')) },
    ],
  },
  {
    id: 'pol_book',
    title: '출판기념회',
    ok: (_s, p) => p.job === 'politician',
    text: (c) => `${who(c)} 의원이 자서전 출판기념회를 연다. 합법적인 정치자금 모금 창구다. 책값 봉투가 쌓인다.`,
    choices: () => [
      { label: '크게 연다 (정치자금↑)', run: (x) => {
        const g = int(x.s, 8000, 20000);
        polOf(x.p).fund += g;
        polOf(x.p).heat += 5;
        return `${formatMoney(g)}이 모였다. 기자들이 "책값"의 출처를 묻기 시작한다.`;
      } },
      { label: '조촐하게 (지지자만)', run: (x) => ((polOf(x.p).fund += 3000), (polOf(x.p).approval += 2), '진짜 지지자들만 모였다. 책 내용이 좋다는 평.') },
    ],
  },
  {
    id: 'pol_budget',
    title: '지역구 예산 전쟁',
    ok: (_s, p) => p.job === 'politician',
    text: (c) => `예산 시즌. ${who(c)} 의원의 지역구에 KTX역·국립병원 유치가 걸려 있다. 쪽지 예산 경쟁이 치열하다.`,
    choices: () => [
      { label: '밤샘 협상 (매력 판정)', run: (x) => (check(x.s, x.p.actual.cha, 55, 10) ? ((polOf(x.p).approval += 12), (x.s.fame += 3), '예산 1,200억 확보! 지역구에 현수막 30개가 걸렸다.') : ((polOf(x.p).approval -= 4), '다른 지역에 밀렸다. "힘없는 의원" 소리를 들었다.')) },
      { label: '정치자금으로 지역 행사를 챙긴다', run: (x) => {
        const pl = polOf(x.p);
        if (pl.fund < 3000) return '돈이 없다. 행사장에 빈손으로 갔다.';
        pl.fund -= 3000;
        pl.approval += 6;
        return '경로당·체육대회를 돌았다. 어르신들 표가 단단해졌다.';
      } },
    ],
  },
  {
    id: 'pol_gaffe',
    title: '막말 논란',
    ok: () => true,
    text: (c) => `${who(c)}의 술자리 발언이 녹음돼 퍼졌다. 포털 실검 1위, 댓글 3만 개.`,
    choices: () => [
      { label: '즉시 사과한다', run: (x) => (check(x.s, x.p.actual.mor, 45, 10) ? ((polOf(x.p).approval -= 3), '진정성 있는 사과로 불길을 잡았다.') : ((polOf(x.p).approval -= 10), '"사과문도 남이 써 줬냐"는 조롱이 이어졌다.')) },
      { label: '"악의적 편집"이라 맞선다', run: (x) => (chance(x.s, 0.3) ? ((polOf(x.p).approval += 4), '정말 앞뒤를 자른 편집이었다. 역풍이 언론사로 갔다.') : ((polOf(x.p).approval -= 15), (x.s.fame = Math.max(0, x.s.fame - 5)), '원본 파일이 공개됐다. 최악이다.')) },
    ],
  },
  {
    id: 'pol_audit',
    title: '국정감사 스타',
    ok: (_s, p) => p.job === 'politician',
    text: (c) => `국정감사 시즌. ${who(c)} 의원 보좌진이 대기업 비리 자료를 입수했다.`,
    choices: () => [
      { label: '생중계로 터뜨린다', run: (x) => (check(x.s, x.p.actual.int, 55, 10) ? ((polOf(x.p).approval += 10), (x.s.fame += 5), '"국감 스타" 탄생! 하루 만에 유튜브 조회수 300만.') : ((polOf(x.p).approval -= 5), '자료에 오류가 있었다. 역으로 공격받았다.')) },
      { label: '기업과 조용히 "협의"한다', run: (x) => ((polOf(x.p).slush += 20000), (polOf(x.p).heat += 20), '질의가 흐지부지 끝났다. 후원금 계좌에 2억이 들어왔다.') },
    ],
  },
  {
    id: 'pol_probe',
    title: '검찰 수사',
    ok: (_s, p) => polOf(p).heat >= 30,
    text: (c) => `검찰이 ${who(c)}의 정치자금 흐름을 들여다본다. 비자금 ${formatMoney(polOf(c.p).slush)}. 압수수색 영장이 청구됐다는 속보.`,
    choices: () => [
      { label: '비자금을 자진 반납한다', run: (x) => {
        const pl = polOf(x.p);
        pl.slush = 0;
        pl.heat = 0;
        pl.approval -= 12;
        x.s.fame = Math.max(0, x.s.fame - 6);
        return '고개를 숙였다. 기소유예로 끝났지만 "돈 먹은 정치인" 딱지가 붙었다.';
      } },
      { label: '대형 로펌 변호인단 (1억)', cost: 10000, run: (x) => {
        const pl = polOf(x.p);
        if (chance(x.s, clamp(0.75 - pl.heat / 200, 0.2, 0.75))) {
          pl.heat = Math.round(pl.heat / 2);
          return '무혐의! 변호인단이 증거를 하나씩 무력화했다.';
        }
        return fall(x);
      } },
      { label: '"정치 탄압"이라며 버틴다', run: (x) => (chance(x.s, 0.3) ? ((polOf(x.p).approval += 5), (polOf(x.p).heat = 10), '지지층이 결집했다. 수사가 흐지부지됐다.') : fall(x)) },
    ],
  },
];

/** 몰락: 구속·직 상실 */
function fall(x: Ctx): string {
  const p = x.p;
  const wasPres = p.job === 'president';
  p.job = 'none';
  p.jobLevel = 0;
  p.jobYears = 0;
  p.pol = { approval: 0, fund: 0, slush: 0, heat: 0 };
  addFlag(p, 'criminal');
  addFlag(p, 'convicted_politician');
  x.s.fame = Math.max(0, x.s.fame - (wasPres ? 80 : 25));
  hap(p, -30);
  return wasPres ? '💥 전직 대통령 구속. 가문 전체가 기자들에게 둘러싸였다. 명성 -80' : '💥 구속 기소. 의원직을 잃었다. 명성 -25';
}

const polStory = (d: (typeof POLITICS)[number]): EventDef => ({ id: d.id, title: () => d.title, text: d.text, choices: (c) => gate(c.s, d.choices(c)), valid: (c) => alive(c.p) && (['politician', 'president'].includes(c.p.job) || (d.id === 'pol_probe' && hasFlag(c.p, 'ex_president') && polOf(c.p).heat >= 40)) });
const acStory = (d: (typeof ACADEMIA)[number]): EventDef => ({ id: d.id, title: () => d.title, text: d.text, choices: (c) => gate(c.s, d.choices(c)), valid: (c) => alive(c.p) });

export const CAREER_EVENTS: EventDef[] = [profHire, tenure, ...ACADEMIA.map(acStory), ...POLITICS.map(polStory)];

/** 해마다: 논문이 쌓이고, 정치인은 지지율·자금을 관리해야 한다 */
export function careerYear(s: GameState): string[] {
  const msgs: string[] = [];
  const q = (id: string, p: Person) => s.events.push({ uid: s.eventSeq++, defId: id, personId: p.id });
  for (const p of Object.values(s.people)) {
    if (!alive(p)) continue;
    const main = isMainline(s, p);
    // 논문
    if (p.flags.includes('track:grad_school') || p.job === 'professor' || (p.job === 'researcher' && hasFlag(p, 'phd'))) {
      const n = Math.max(0, Math.round(normal(s, p.actual.int / 40 + (hasTrait(p, 'diligent') ? 0.6 : 0) + (p.job === 'professor' ? 0.5 : 0), 0.8)));
      addPapers(p, n);
    }
    // 박사 → 해마다 임용 공고
    if (main && hasFlag(p, 'phd') && p.job !== 'professor' && age(s, p) <= 52 && chance(s, 0.6) && !s.events.some((e) => e.defId === 'prof_hire')) q('prof_hire', p);
    // 테뉴어 심사
    if (main && p.job === 'professor' && p.jobLevel === 0 && p.jobYears === 6) q('prof_tenure', p);
    // 교수 승진은 논문으로
    if (p.job === 'professor' && p.jobLevel === 1 && p.jobYears >= 5 && (p.papers ?? 0) >= 25) {
      p.jobLevel = 2;
      if (main) grant(s, '🎓', `정교수 승진: ${fullName(p)}`, `논문 ${p.papers}편. 학계에서 이름이 통한다.`, 'epic');
    }
    if (p.job === 'professor' && p.jobLevel === 2 && (p.papers ?? 0) >= 45 && chance(s, 0.2)) {
      p.jobLevel = 3;
      s.fame += 8;
      if (main) grant(s, '🏅', `석좌교수 추대: ${fullName(p)}`, '대학이 이름을 걸고 모시는 석학이 됐다.', 'legend');
    }
    // 대학원생·교수 이야기
    if (main && chance(s, 0.35)) {
      const pool = ACADEMIA.filter((d) => d.ok(s, p) && (s.storySeen?.[p.id + ':' + d.id] ?? -99) < s.year - 6);
      if (pool.length) {
        const d = pick(s, pool);
        (s.storySeen ??= {})[p.id + ':' + d.id] = s.year;
        q(d.id, p);
      }
    }
    // 정치인
    if (p.job === 'politician' || p.job === 'president') {
      const pl = polOf(p);
      const pres = p.job === 'president';
      // 후원금 (연 1.5억 한도) - 지역구 관리비
      const inflow = Math.min(15000, Math.round((s.fame * 40 + p.actual.cha * 60) * wageIndex(s.year) / 2));
      const upkeep = Math.round((pres ? 0 : 6000 + p.jobLevel * 1500) * wageIndex(s.year));
      pl.fund += inflow - upkeep;
      pl.approval = clamp(Math.round(pl.approval + normal(s, 0, 5) + (p.actual.mor - 55) / 20 + (p.actual.cha - 55) / 25 - (pres ? 3 : 0)), 5, 90);
      pl.heat = Math.max(0, pl.heat - 3 + (pl.slush > 0 ? 4 : 0));
      if (pl.fund < 0) {
        pl.approval = Math.max(5, pl.approval - 6);
        if (main) msgs.push(`💸 ${fullName(p)} 정치자금 바닥 (${formatMoney(pl.fund)}). 지역구 사무실 월세가 밀린다. 지지율 -6`);
      }
      if (s.fame < fameNeed(p)) {
        pl.approval = Math.max(5, pl.approval - 5);
        if (main) msgs.push(`📉 가문 명성(${Math.round(s.fame)})이 ${pres ? '대통령' : '의원'}의 체면(${fameNeed(p)})에 못 미친다. 지지율 -5`);
      }
      // 재임 중 가문 전체가 누리는 것
      s.fame += pres ? 6 : 1 + p.jobLevel * 0.5;
      if (main && chance(s, pl.heat >= 30 ? 0.5 : 0.35)) {
        const pool = POLITICS.filter((d) => d.ok(s, p) && (s.storySeen?.[p.id + ':' + d.id] ?? -99) < s.year - (d.id === 'pol_probe' ? 2 : 4));
        const d = pl.heat >= 50 && pool.some((x) => x.id === 'pol_probe') ? POLITICS.find((x) => x.id === 'pol_probe')! : pool.length ? pick(s, pool) : undefined;
        if (d) {
          (s.storySeen ??= {})[p.id + ':' + d.id] = s.year;
          q(d.id, p);
        }
      }
      if (main && pl.approval <= 12 && p.job === 'politician') msgs.push(`🔥 ${fullName(p)} 의원 지지율 ${pl.approval}%. 사퇴 요구가 빗발친다.`);
    }
  }
  return msgs;
}

/** 대통령 퇴임: 지지율이 높으면 성공한 대통령, 비자금이 있으면 수사가 기다린다 */
export function presidentLeaves(s: GameState, p: Person) {
  const pl = polOf(p);
  if (pl.approval >= 50) {
    s.fame += 30;
    grant(s, '🇰🇷', `성공한 대통령: ${fullName(p)}`, `퇴임 지지율 ${pl.approval}%. 박수받으며 청와대를 떠났다. 역사책에 이름이 남는다.`, 'legend');
  }
  if (pl.slush > 0 || pl.heat >= 40) {
    pl.heat = Math.max(pl.heat, 60);
    s.events.push({ uid: s.eventSeq++, defId: 'pol_probe', personId: p.id });
  }
}

/** 장관 퇴임 훈장 */
export function ministerLeaves(s: GameState, p: Person) {
  awardHonor(s, p, 'cheongjo', '장관직 수행');
}

/** 정치자금이 부족하면 비자금이라도 써야 한다 (선거비) */
export function campaignMoney(p: Person, cost: number): { fromFund: number; fromSlush: number; short: number } {
  const pl = polOf(p);
  const fromFund = Math.max(0, Math.min(pl.fund, cost));
  const fromSlush = Math.min(pl.slush, cost - fromFund);
  return { fromFund, fromSlush, short: cost - fromFund - fromSlush };
}

// ───────────────────────── 행동 ─────────────────────────

export const CAREER_ACTIONS: ActionDef[] = [
  {
    id: 'write_paper',
    cat: '진로·자기계발',
    icon: '📝',
    name: '논문 쓰기',
    desc: '논문↑ · 교수 임용·승진의 핵심 (대학원생·박사·교수)',
    ap: 1,
    fit: 'edu',
    show: (s) => { const p = s.people[s.headId]; return p.flags.includes('track:grad_school') || hasFlag(p, 'phd') || p.job === 'professor'; },
    run: (s) => {
      const p = s.people[s.headId];
      const n = check(s, p.actual.int, 60, 10) ? int(s, 1, 3) : chance(s, 0.5) ? 1 : 0;
      addPapers(p, n);
      return n ? `${pick(s, ['실험 데이터가 드디어 맞아떨어졌다.', '새벽 4시, 초고를 완성했다.', '공동 연구자와 밤새 수정했다.'])} (논문 +${n}, 총 ${p.papers}편)` : '리뷰어가 전면 수정을 요구했다. 올해는 게재 실패.';
    },
  },
  {
    id: 'pol_fundraise',
    cat: '사회',
    icon: '💼',
    name: '후원회 모금 행사',
    desc: '정치자금↑ · 합법 모금 (국회의원)',
    ap: 1,
    show: (s) => s.people[s.headId].job === 'politician',
    run: (s) => {
      const p = s.people[s.headId];
      const g = Math.round((2000 + p.actual.cha * 60 + s.fame * 20) * clamp(normal(s, 1, 0.25), 0.5, 1.6) * wageIndex(s.year));
      polOf(p).fund += g;
      return `후원의 밤. ${formatMoney(g)}이 모였다. (정치자금 ${formatMoney(polOf(p).fund)})`;
    },
  },
  {
    id: 'pol_ground',
    cat: '사회',
    icon: '🤝',
    name: '지역구 민원 챙기기',
    desc: '지지율↑ · 시장·경로당·민원실을 돈다 (정치인)',
    ap: 1,
    show: (s) => ['politician', 'president'].includes(s.people[s.headId].job),
    run: (s) => {
      const p = s.people[s.headId];
      const d = check(s, p.actual.cha, 50, 10) ? int(s, 4, 8) : int(s, 1, 3);
      polOf(p).approval = clamp(polOf(p).approval + d, 5, 90);
      return `${pick(s, ['새벽시장에서 상인들과 국밥을 먹었다.', '민원실에서 하루 종일 하소연을 들었다.', '경로당 어르신들 손을 잡아 드렸다.'])} (지지율 +${d}% → ${polOf(p).approval}%)`;
    },
  },
];
