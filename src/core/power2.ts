// 권력의 길 ② — 근현대사의 권력 지도. 쿠데타 말고도 군·관료·정당·재야·재벌·외교·언론에서 권력의 정점으로 가는 길.
//
// 근거로 삼은 역사 (국가기록원·한국민족문화대백과·중앙선거관리위원회 역대선거 기록을 참고해 게임에 맞게 줄였다):
// · 1961.5.16 군사정변 → 국가재건최고회의(1961.5~1963.12, 최고위원 30여 명이 입법·행정을 겸했다). 내각수반도 군인.
// · 1963.2 민주공화당 창당: 정보기관이 몇 해 전부터 비밀리에 사전 조직했다 (이른바 "4대 의혹"의 자금).
// · 대통령 선거: 직선 1963(10.15)·1967(5.3)·1971(4.27) — 1963년 표차는 15만 6천여 표.
//   유신 뒤 간선: 1972(12.23)·1978(7.6)·1979(12.6) 통일주체국민회의 대의원 2,300여 명이 장충체육관에서 단독 후보를 뽑았다 ("체육관 선거").
//   1980(8.27) 통대, 1981(2.25) 대통령선거인단 5,278명. 1987.6 민주항쟁 → 6·29 선언 → 1987(12.16)부터 다시 직선 5년 단임.
// · 유신정우회(유정회, 1973~1980): 국회의원 정수의 3분의 1을 대통령이 추천하고 통대가 일괄 선출했다.
// · 국가보위비상대책위원회(국보위, 1980.5.31~10): 상임위원회가 사실상 정부 역할 → 국가보위입법회의 → 민주정의당(1981.1).
// · 1988 5공 비리·광주 청문회 TV 생중계. 1990 3당 합당. 1992 대기업 회장이 신당(통일국민당)을 만들어 총선 31석·대선 득표율 16%.
// · 서울특별시장은 1961~1995년 대통령이 임명했다 (첫 민선은 1995.6.27). 국무총리는 국회 동의, 2000년부터 인사청문회.
// · 경제기획원(1961~1994) 장관은 1963년부터 부총리를 겸했다. 대통령 비서실장은 "청와대의 2인자".
// · 1980년대 학생운동: 강제징집(이른바 녹화사업), 학원 사찰. 재야 인사·인권 변호사들이 1987년 이후 대거 정치권에 들어갔다.
// · 2006년 한국 외교부 장관이 유엔 사무총장에 선출됐다.
// 실존 인물·정당의 실명은 쓰지 않거나 일반명사로만 쓴다. 우리 가문 사람이 그 자리에 있었다면 어땠을지를 그린다.

import { chance, pick } from './rng';
import { gate, setJob, type Choice, type Ctx, type EventDef } from './ev-util';
import { addFlag, age, alive, check, checkOdds, clamp, fullName, hasFlag, hasTrait, head, isMainline, mark, markOf } from './people';
import { formatMoney, jobTitle, pay } from './economy';
import { grant } from './rewards';
import { imprison } from './crimes';
import { polOf, campaignMoney } from './career';
import { wageIndex } from './pay';
import { householder } from './people';
import type { GameState, Person } from './types';

const hap = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));
const up = (p: Person, k: keyof Person['actual'], d: number) => (p.actual[k] = clamp(p.actual[k] + d, 0, 100));
const who = (c: { p: Person }) => fullName(c.p);
/** 학생은 하숙집, 결혼했으면 셋집, 아니면 단골 구멍가게 */
const p_home = (c: { p: Person }) => (c.p.flags.includes('student') ? '하숙집' : c.p.spouseId ? '셋집' : '골목 구멍가게');
const hist = (s: GameState) => s.era === 'history' && s.year <= 2025;
const wi = (s: GameState) => wageIndex(s.year);
const W = (s: GameState, v: number) => Math.max(1, Math.round(v * wi(s)));
const seen = (s: GameState, key: string) => (s.storySeen ??= {})[key];
const see = (s: GameState, key: string) => ((s.storySeen ??= {})[key] = s.year);
const pending = (s: GameState, defId: string, p: Person) => s.events.some((e) => e.defId === defId && e.personId === p.id);
const q = (s: GameState, defId: string, p: Person, data?: unknown) => s.events.push({ uid: s.eventSeq++, defId, personId: p.id, data });
const famPres = (s: GameState) => Object.values(s.people).some((p) => alive(p) && p.job === 'president');
const ruling = (p: Person) => hasFlag(p, 'ruling');
const free = (p: Person) => !['president', 'minister'].includes(p.job) && !hasFlag(p, 'in_prison');
/** 대통령 관저·집무실의 이름 */
export const presHouse = (y: number) => (y < 1960 ? '경무대' : y < 2022 ? '청와대' : '대통령실');

/** 그해의 정치 체제 */
export type Regime = 'junta' | 'third' | 'yushin' | 'fifth' | 'demo';
export function regimeOf(y: number): Regime {
  if (y < 1963) return 'junta';
  if (y < 1972) return 'third';
  if (y < 1980) return 'yushin';
  if (y < 1988) return 'fifth';
  return 'demo';
}
const REGIME_NAME: Record<Regime, string> = { junta: '군정', third: '제3공화국', yushin: '유신 체제', fifth: '제5공화국', demo: '민주화 이후' };

/** 근현대사 대통령 선거: [해, 방식, 임기] — 직선/간선(통일주체국민회의·선거인단) */
export const HIST_PRES: Record<number, { how: 'direct' | 'gym'; term: number; note: string }> = {
  1963: { how: 'direct', term: 4, note: '제5대 대선 · 군정에서 민정으로' },
  1967: { how: 'direct', term: 4, note: '제6대 대선' },
  1971: { how: 'direct', term: 4, note: '제7대 대선 · 3선 개헌 뒤' },
  1972: { how: 'gym', term: 6, note: '제8대 · 통일주체국민회의 장충체육관' },
  1978: { how: 'gym', term: 6, note: '제9대 · 통일주체국민회의' },
  1979: { how: 'gym', term: 6, note: '제10대 · 10·26 뒤 통일주체국민회의' },
  1980: { how: 'gym', term: 7, note: '제11대 · 통일주체국민회의' },
  1981: { how: 'gym', term: 7, note: '제12대 · 대통령선거인단' },
  1987: { how: 'direct', term: 5, note: '제13대 · 16년 만의 직선' },
  1992: { how: 'direct', term: 5, note: '제14대' },
  1997: { how: 'direct', term: 5, note: '제15대 · IMF 한복판' },
  2002: { how: 'direct', term: 5, note: '제16대' },
  2007: { how: 'direct', term: 5, note: '제17대' },
  2012: { how: 'direct', term: 5, note: '제18대' },
  2017: { how: 'direct', term: 5, note: '제19대 · 탄핵 뒤 보궐' },
  2022: { how: 'direct', term: 5, note: '제20대' },
  2025: { how: 'direct', term: 5, note: '제21대 · 파면 뒤 보궐' },
};

// ───────────────────────── 1) 군정과 집권 세력 ─────────────────────────

interface Story {
  id: string;
  title: string;
  ok: (s: GameState, p: Person) => boolean;
  /** 이 해들에만 (근현대사) */
  years?: [number, number];
  text: (c: Ctx) => string;
  choices: (c: Ctx) => Choice[];
}

const elite = (s: GameState, p: Person) =>
  (p.job === 'professor' && p.jobLevel >= 2) ||
  (['judge', 'prosecutor'].includes(p.job) && p.jobLevel >= 2) ||
  (p.job === 'officer' && p.jobLevel >= 5) ||
  (p.job === 'journalist' && p.jobLevel >= 3) ||
  (['civil', 'tax_officer', 'diplomat'].includes(p.job) && p.jobLevel >= 4) ||
  (p.job === 'founder' && p.jobLevel >= 3) ||
  (p.job === 'doctor' && p.jobLevel >= 4) ||
  (p.job === 'lawyer' && p.jobLevel >= 2) ||
  (p.job === 'agent' && p.jobLevel >= 3) ||
  age(s, p) >= 40 && s.fame >= 80;

const REGIME: Story[] = [
  {
    id: 'pw_516_join', title: '혁명공약에 서명하라', years: [1961, 1961],
    ok: (s, p) => p.job === 'officer' && p.jobLevel >= 1 && age(s, p) >= 25 && age(s, p) <= 50,
    text: (c) => `1961년 5월 15일 밤. 육사 선배가 ${who(c)} ${jobTitle(c.p)}의 관사 문을 두드렸다. "내일 새벽 한강을 건넌다. 부대를 이끌고 오면 자네는 혁명 주체다." 혁명공약 여섯 줄이 적힌 종이가 탁자에 놓였다.`,
    choices: () => [
      { label: '서명하고 부대를 이끈다', run: (x) => {
        addFlag(x.p, 'junta'); addFlag(x.p, 'ruling'); mark(x.p, 'favor', 3); up(x.p, 'mor', -3);
        x.p.jobLevel = Math.min(9, x.p.jobLevel + 1);
        x.s.fame += 6;
        grant(x.s, '🎖', `혁명 주체: ${fullName(x.p)}`, '국가재건최고회의의 일원이 됐다. 훗날 장관·국회의원·국영기업 사장 자리가 이 명단에서 나온다.', 'epic');
        return `새벽 4시, 한강 인도교를 건넜다. 아침 라디오에서 혁명공약이 흘러나왔다. ${fullName(x.p)}은(는) 최고회의 분과위원이 됐다.`;
      } },
      { label: '"군인은 정치에 나서면 안 됩니다"', run: (x) => {
        up(x.p, 'mor', 4); addFlag(x.p, 'refused_junta');
        if (chance(x.s, 0.35)) { setJob(x.p, 'none'); hap(x.p, -15); return '몇 달 뒤 "반혁명 혐의"로 예편당했다. 그래도 서명하지 않은 걸 후회하진 않는다.'; }
        return '선배는 말없이 돌아갔다. 진급이 몇 년 늦어졌다.';
      } },
    ],
  },
  {
    id: 'pw_party_63', title: '새 집권당의 사전 조직', years: [1962, 1964],
    ok: (s, p) => !ruling(p) && free(p) && age(s, p) >= 30 && age(s, p) <= 65 && (hasFlag(p, 'junta') || elite(s, p)),
    text: (c) => `민정 이양을 앞두고 군정 핵심부가 새 집권당을 비밀리에 조직하고 있다. 정보기관 사람이 ${who(c)}을(를) 찾아왔다. "지역구 하나 맡아 주십시오. 선거 자금과 조직은 걱정 마십시오."`,
    choices: (c) => [
      { label: '집권당 창당 발기인이 된다', odds: checkOdds(c.p.actual.cha + 10, 50, 9), run: (x) => {
        addFlag(x.p, 'ruling');
        if (!check(x.s, x.p.actual.cha + 10, 50, 9)) return '발기인으로 이름은 올렸지만 공천에서 밀렸다. 당 중앙위원 감투만 받았다.';
        setJob(x.p, 'politician'); x.p.pol = { approval: 55, fund: W(x.s, 8000), slush: W(x.s, 3000), heat: 10 };
        x.s.fame += 8;
        grant(x.s, '🗳', `집권당 국회의원: ${fullName(x.p)}`, '여당 공천은 곧 당선이던 시절이다. 대신 정권과 운명을 같이한다.', 'epic');
        return '🗳 여당 공천 → 당선. 선거 자금이 넘쳤다. 어디서 났는지는 묻지 않았다.';
      } },
      { label: '야당으로 간다', run: (x) => (addFlag(x.p, 'opposition'), up(x.p, 'mor', 3), chance(x.s, 0.4) ? (setJob(x.p, 'politician'), (x.p.pol = { approval: 50, fund: 0, slush: 0, heat: 0 }), (x.s.fame += 5), '야당 공천으로 당선! 돈은 없지만 이름은 깨끗하다.') : '야당 후보로 나섰다가 낙선했다. 투표함이 이상하게 무거웠다는 말이 돈다.') },
      { label: '정치에 관심 없다', run: () => '"제 일이나 열심히 하겠습니다."' },
    ],
  },
  {
    id: 'pw_tongdae', title: '통일주체국민회의 대의원', years: [1972, 1978],
    // 현역 군인·공무원은 대의원이 될 수 없었다
    ok: (s, p) => free(p) && age(s, p) >= 30 && !['officer', 'nco', 'agent', 'civil', 'police', 'judge', 'prosecutor'].includes(p.job) && (JOBS_LOCAL.includes(p.job) || p.jobLevel >= 2) && !hasFlag(p, 'tongdae'),
    text: (c) => `유신헌법으로 생긴 통일주체국민회의. 동네 유지 몇 명이 ${who(c)}에게 대의원 출마를 권한다. 정당 가입은 금지, 대신 대통령을 "체육관에서" 뽑는다. 동네에선 감투다.`,
    choices: () => [
      { label: '출마한다', run: (x) => (addFlag(x.p, 'tongdae'), addFlag(x.p, 'ruling'), (x.s.fame += 3), up(x.p, 'mor', -2), chance(x.s, 0.7) ? '당선. 장충체육관에서 단독 후보에게 표를 던졌다. 찬성 2,357표, 무효 2표.' : '낙선했다. 면장 추천을 받은 사람이 됐다.') },
      { label: '거절한다', run: (x) => (up(x.p, 'mor', 2), '"그건 선거가 아니지요."') },
    ],
  },
  {
    id: 'pw_yujeong', title: '유신정우회 국회의원 추천', years: [1973, 1979],
    ok: (s, p) => free(p) && p.job !== 'politician' && age(s, p) >= 38 && age(s, p) <= 70 && elite(s, p),
    text: (c) => `청와대에서 연락이 왔다. 대통령이 국회의원 3분의 1을 추천하는 "유신정우회" 명단에 ${who(c)}을(를) 넣겠다고 한다. 선거운동은 필요 없다. 통대가 일괄 선출한다.`,
    choices: () => [
      { label: '받아들인다', run: (x) => {
        setJob(x.p, 'politician'); addFlag(x.p, 'ruling'); addFlag(x.p, 'yujeong');
        x.p.pol = { approval: 45, fund: W(x.s, 3000), slush: 0, heat: 5 };
        x.s.fame += 6; up(x.p, 'mor', -3);
        return '유정회 의원 배지를 달았다. 지역구는 없고, 표결 때 손을 드는 게 일이다. "거수기"라는 말이 귀에 박힌다.';
      } },
      { label: '고사한다', run: (x) => (up(x.p, 'mor', 3), mark(x.p, 'favor', -1), '"지금 하는 일이 제 자리입니다." 정보기관의 관심이 조금 늘었다.') },
    ],
  },
  {
    id: 'pw_kukbowi', title: '국가보위비상대책위원회', years: [1980, 1980],
    ok: (s, p) => free(p) && age(s, p) >= 32 && ((p.job === 'officer' && p.jobLevel >= 4) || (['civil', 'prosecutor', 'judge', 'agent', 'tax_officer'].includes(p.job) && p.jobLevel >= 3) || (p.job === 'professor' && p.jobLevel >= 1)),
    text: (c) => `1980년 5월 31일. 계엄 아래 "국가보위비상대책위원회"가 생겼다. ${who(c)}에게 상임위원회 분과 위원으로 들어오라는 통보가 왔다. 정부 위의 정부다. 광주에서 무슨 일이 있었는지 아는 사람은 다 안다.`,
    choices: () => [
      { label: '참여한다', run: (x) => {
        addFlag(x.p, 'kukbowi'); addFlag(x.p, 'ruling'); mark(x.p, 'favor', 3); up(x.p, 'mor', -6);
        x.s.scandal = Math.min(100, (x.s.scandal ?? 0) + 8);
        x.s.fame += 4;
        return '언론 통폐합·공직자 숙정·삼청교육대 계획서가 책상을 오갔다. 몇 달 뒤 입법회의 의원 명단에 이름이 올랐다.';
      } },
      { label: '병가를 내고 피한다', run: (x) => (up(x.p, 'mor', 3), mark(x.p, 'favor', -2), chance(x.s, 0.3) ? (setJob(x.p, 'none'), hap(x.p, -10), '"숙정 대상" 명단에 이름이 올라 옷을 벗었다.') : '조용히 비켜섰다.') },
    ],
  },
  {
    id: 'pw_ruling_party_81', title: '새 집권당 창당', years: [1981, 1981],
    ok: (s, p) => free(p) && p.job !== 'politician' && (hasFlag(p, 'kukbowi') || (ruling(p) && age(s, p) >= 35)),
    text: (c) => `국보위 출신들이 새 집권당을 만든다. ${who(c)}에게 지역구 공천이 내려왔다. "1구 2인 선거구제라 2등만 해도 당선입니다."`,
    choices: () => [
      { label: '출마한다', run: (x) => (setJob(x.p, 'politician'), addFlag(x.p, 'ruling'), (x.p.pol = { approval: 50, fund: W(x.s, 6000), slush: W(x.s, 5000), heat: 15 }), (x.s.fame += 6), '🗳 당선. 지역구에 새 아스팔트가 깔렸다. 비자금 장부도 생겼다.') },
      { label: '본업으로 돌아간다', run: () => '"정치는 제 일이 아닙니다."' },
    ],
  },
  {
    id: 'pw_5gong_hearing', title: '5공 청문회 증인 출석', years: [1988, 1989],
    ok: (_s, p) => hasFlag(p, 'kukbowi') || hasFlag(p, 'coup_leader') || (hasFlag(p, 'hanahoe') && hasFlag(p, 'keypost')),
    text: (c) => `국회 5공 비리·광주 특위. TV 생중계로 온 국민이 본다. 초선 의원이 ${who(c)}에게 서류를 들이민다. "증인, 기억이 안 난다는 말만 벌써 마흔 번째입니다."`,
    choices: (c) => [
      { label: '아는 것을 털어놓는다', run: (x) => (up(x.p, 'mor', 6), (x.s.fame = Math.max(0, x.s.fame - 3)), x.p.flags = x.p.flags.filter((f) => f !== 'ruling'), '양심선언이 1면에 실렸다. 옛 동지들이 등을 돌렸다. 대신 밤에 잠이 온다.') },
      { label: '"기억나지 않습니다"', odds: checkOdds(c.p.actual.cha, 50, 10), run: (x) => (check(x.s, x.p.actual.cha, 50, 10) ? '버텼다. 청문회는 흐지부지 끝났다.' : ((x.s.fame = Math.max(0, x.s.fame - 10)), (x.s.scandal = Math.min(100, (x.s.scandal ?? 0) + 10)), '명패를 던진 의원의 화면이 수십 번 재방송됐다. 가문 이름이 조롱거리가 됐다.')) },
    ],
  },
];
const JOBS_LOCAL = ['farmer', 'shopkeeper', 'restaurant', 'founder', 'landlord', 'doctor', 'pharmacist', 'teacher', 'clergy', 'sme_ceo', 'rancher', 'fisher'];

// ───────────────────────── 2) 재야와 민주화 ─────────────────────────

const DEMO: Story[] = [
  {
    id: 'pw_campus', title: '교정의 스크럼', years: [1964, 1987],
    ok: (s, p) => p.flags.includes('student') && age(s, p) >= 19 && age(s, p) <= 26 && !hasFlag(p, 'dissident'),
    text: (c) => `${c.s.year < 1972 ? '한일회담 반대·3선 개헌 반대' : c.s.year < 1980 ? '유신 철폐' : '광주 학살 진상 규명·직선제 개헌'} 시위가 교정을 덮었다. 선배가 ${who(c)}에게 유인물 뭉치를 건넨다. "네가 연설 한 번만 해 줘."`,
    choices: (c) => [
      { label: '단상에 오른다', odds: checkOdds(c.p.actual.cha, 50, 10), run: (x) => {
        addFlag(x.p, 'dissident'); mark(x.p, 'network', 2); up(x.p, 'mor', 3);
        if (chance(x.s, 0.35)) {
          if (x.s.year >= 1980 && x.p.sex === 'M' && !x.p.flags.some((f) => f === 'served')) { x.p.flags.push('serving:' + (x.s.year + 2)); addFlag(x.p, 'forced_draft'); return '연행됐다. 며칠 뒤 영장도 없이 입영 열차에 태워졌다. 강제징집이다. 부대에서는 "특별 관리 대상"이 됐다.'; }
          return imprison(x.s, x.p, 1, 0, '집회·시위법 위반, 제적');
        }
        return check(x.s, x.p.actual.cha, 50, 10) ? '연설이 끝나자 수천 명이 교문으로 나섰다. 학생운동의 이름이 됐다.' : '목소리가 떨렸지만 끝까지 읽었다.';
      } },
      { label: '뒤에서 유인물만 돌린다', run: (x) => (mark(x.p, 'network', 1), chance(x.s, 0.15) ? (addFlag(x.p, 'dissident'), '형사가 하숙집에 찾아왔다. 이름이 명단에 올랐다.') : '조용히 밤새 등사기를 돌렸다.') },
      { label: '도서관으로 간다', run: (x) => (up(x.p, 'int', 1), hap(x.p, -2), '최루탄 냄새가 도서관까지 스며들었다.') },
    ],
  },
  // 떡밥: 잡혀가기 전에 먼저 "누군가 지켜보고 있다"는 낌새가 온다. 이 장면을 지나고 해가 바뀐 뒤에야 연행될 수 있다.
  {
    id: 'pw_watched', title: '골목 끝의 검은 지프', years: [1972, 1987],
    ok: (s, p) => hasFlag(p, 'dissident') && age(s, p) >= 19 && !hasFlag(p, 'in_prison') && free(p) && !hasFlag(p, 'jailed_dissident') && !p.flags.some((f) => f.startsWith('watched:')),
    text: (c) => `${p_home(c)} 주인이 ${who(c)}을(를) 붙잡는다. "어제 양복 입은 사람 둘이 자네 방이 어디냐고 묻고 갔어." 며칠째 골목 끝에 검은 지프가 서 있다. 전화를 들면 딸깍, 하는 소리가 섞인다.`,
    choices: () => [
      { label: '몸을 사린다 (유인물·책을 태우고 한동안 조용히)', run: (x) => {
        up(x.p, 'mor', -1); hap(x.p, -3);
        if (chance(x.s, 0.65)) { x.p.flags = x.p.flags.filter((f) => f !== 'dissident'); return '아궁이에 책을 넣는 손이 떨렸다. 몇 달 뒤, 골목의 지프가 사라졌다.'; }
        x.p.flags.push('watched:' + x.s.year);
        return '책은 태웠지만 이름은 이미 명단에 올라 있었다. 지프는 여전히 그 자리에 있다.';
      } },
      { label: '신경 쓰지 않는다', run: (x) => (x.p.flags.push('watched:' + x.s.year), up(x.p, 'mor', 2), '"죄지은 게 없다." 그날 밤에도 등사기를 돌렸다.') },
      { label: '동지들에게 알리고 연락망을 바꾼다', run: (x) => (x.p.flags.push('watched:' + x.s.year), mark(x.p, 'network', 1), addFlag(x.p, 'tipped'), '암호를 바꾸고 모임 장소를 옮겼다. 잡혀가더라도 동지들은 지킬 수 있다.') },
    ],
  },
  {
    id: 'pw_dissident_jail', title: '긴급조치 위반', years: [1974, 1987],
    ok: (s, p) => hasFlag(p, 'dissident') && p.flags.some((f) => f.startsWith('watched:') && Number(f.slice(8)) < s.year) && age(s, p) >= 20 && !hasFlag(p, 'in_prison') && free(p) && !hasFlag(p, 'jailed_dissident'),
    text: (c) => `새벽 4시. 골목에 서 있던 그 검은 지프다. 낯선 사내들이 ${who(c)}의 집 문을 두드린다. "잠깐 같이 가셔야겠습니다." ${c.s.year < 1980 ? '긴급조치 위반' : '국가보안법 위반'} 혐의다.${hasFlag(c.p, 'tipped') ? '\n(미리 연락망을 바꿔 둔 덕에 동지들의 이름은 지킬 수 있다)' : ''}`,
    choices: () => [
      { label: '끝까지 진술을 거부한다', run: (x) => {
        addFlag(x.p, 'jailed_dissident'); up(x.p, 'mor', 6); x.s.fame += hasFlag(x.p, 'tipped') ? 6 : 4; mark(x.p, 'network', 2);
        x.p.actual.hp = clamp(x.p.actual.hp - 8, 0, 100);
        return imprison(x.s, x.p, 2, 0, `${x.s.year < 1980 ? '긴급조치 9호' : '국가보안법'} 위반`) + '\n옥중 편지가 몰래 밖으로 나가 복사본으로 돌았다. 재야의 이름이 됐다.';
      } },
      { label: '각서를 쓰고 풀려난다', run: (x) => (up(x.p, 'mor', -3), hap(x.p, -6), x.p.flags = x.p.flags.filter((f) => f !== 'dissident'), '"다시는 시위에 참여하지 않겠습니다." 서명한 손이 오래 떨렸다.') },
    ],
  },
  {
    id: 'pw_june_1987', title: '국민운동본부', years: [1987, 1987],
    ok: (s, p) => (hasFlag(p, 'dissident') || hasFlag(p, 'rights_lawyer') || hasFlag(p, 'jailed_dissident')) && age(s, p) >= 22 && !hasFlag(p, 'in_prison'),
    text: (c) => `1987년 5월. 재야·종교계·야당이 모여 "민주헌법쟁취국민운동본부"를 만들었다. ${who(c)}에게 집행위원을 맡아 달라고 한다. 6월 10일, 전국 동시 집회가 예정돼 있다.`,
    choices: () => [
      { label: '집행위원을 맡는다', run: (x) => (addFlag(x.p, 'june87'), (x.s.fame += 8), mark(x.p, 'network', 3), up(x.p, 'cha', 2), '6월 내내 거리에 있었다. 29일, 여당 대표가 직선제 수용을 발표했다. 명동성당 계단에서 사람들이 부둥켜안았다.') },
      { label: '거리의 시민으로 함께한다', run: (x) => ((x.s.fame += 2), up(x.p, 'mor', 2), '넥타이 부대 사이에 섞여 "호헌 철폐"를 외쳤다.') },
    ],
  },
  {
    id: 'pw_recruit', title: '야당의 영입 제안', years: [1985, 2025],
    ok: (s, p) => (hasFlag(p, 'dissident') || hasFlag(p, 'rights_lawyer') || hasFlag(p, 'june87') || hasFlag(p, 'jailed_dissident') || hasFlag(p, 'people_prosecutor')) && p.job !== 'politician' && free(p) && age(s, p) >= 30 && age(s, p) <= 65,
    text: (c) => `총선을 앞두고 야당이 "새 인물"을 찾는다. ${who(c)}의 이름이 영입 명단 맨 위에 있다. ${c.s.year < 1988 ? '돈도 조직도 없지만 바람이 분다.' : '민주화 이후 첫 세대 정치인이 될 수 있다.'}`,
    choices: (c) => [
      { label: '출마한다', odds: checkOdds(c.p.actual.cha * 0.5 + c.p.actual.mor * 0.3 + Math.min(20, c.s.fame / 6), 50, 9), run: (x) => {
        if (!check(x.s, x.p.actual.cha * 0.5 + x.p.actual.mor * 0.3 + Math.min(20, x.s.fame / 6), 50, 9)) return '낙선했다. 그래도 득표율이 예상보다 높았다. 다음이 있다.';
        setJob(x.p, 'politician'); addFlag(x.p, 'democrat');
        x.p.pol = { approval: 58, fund: W(x.s, 1000), slush: 0, heat: 0 };
        x.s.fame += 10;
        grant(x.s, '🗳', `재야에서 국회로: ${fullName(x.p)}`, '거리에서 외치던 사람이 국회에 들어갔다.', 'epic');
        return '🗳 당선! 감옥 동기들이 꽃다발을 들고 왔다.';
      } },
      { label: '재야에 남는다', run: (x) => (up(x.p, 'mor', 2), '"제 자리는 거리입니다."') },
    ],
  },
];

// ───────────────────────── 3) 관료·외교·재벌·임명직 ─────────────────────────

const APPOINT: Story[] = [
  {
    id: 'pw_seoul_mayor', title: '서울특별시장 임명', years: [1961, 1994],
    ok: (s, p) => free(p) && p.job !== 'mayor' && age(s, p) >= 40 && age(s, p) <= 65 && ((p.job === 'civil' && p.jobLevel >= 5) || (p.job === 'officer' && p.jobLevel >= 6) || (ruling(p) && p.job === 'politician')),
    text: (c) => `${presHouse(c.s.year)}에서 ${who(c)}을(를) 불렀다. "서울을 맡아 주게." 이 시절 서울시장은 대통령이 임명한다. 판자촌 철거, 지하철, 강남 개발 — 일은 산더미다.`,
    choices: () => [
      { label: '받아들인다', run: (x) => {
        x.p.flags = x.p.flags.filter((f) => !f.startsWith('mayor_of:') && !f.startsWith('prev:'));
        x.p.flags.push('prev:' + x.p.job + ':' + x.p.jobLevel, 'mayor_of:서울', 'mayor_appointed');
        setJob(x.p, 'mayor'); addFlag(x.p, 'ruling');
        x.p.pol ??= { approval: 50, fund: 0, slush: 0, heat: 0 };
        x.s.fame += 15;
        grant(x.s, '🏙', `서울특별시장: ${fullName(x.p)}`, '수도의 행정을 맡았다. 불도저처럼 밀어붙일 것인가, 사람을 볼 것인가.', 'epic');
        return '🏙 서울특별시장 취임. 시청 앞에 화환이 늘어섰다.';
      } },
      { label: '고사한다', run: () => '"제 그릇이 아닙니다."' },
    ],
  },
  {
    id: 'pw_mayor_work', title: '서울시장의 결단', years: [1961, 1994],
    ok: (_s, p) => p.job === 'mayor' && hasFlag(p, 'mayor_appointed'),
    text: (c) => pick(c.s, [
      `무허가 판자촌 철거 계획이 올라왔다. 이주민들이 갈 곳이 없다. ${who(c)} 시장의 결재만 남았다.`,
      '시민 아파트를 1년 안에 수백 동 짓자는 보고서. 공기가 너무 짧다는 기술자의 메모가 붙어 있다.',
      '강남 영동지구 개발 계획. 땅을 미리 사 둔 권력자들의 이름이 명단에 보인다.',
    ]),
    choices: (c) => [
      { label: '원칙대로 천천히', run: (x) => (up(x.p, 'mor', 3), (polOf(x.p).approval += 4), mark(x.p, 'favor', -1), '"실적이 느리다"는 질책을 받았지만 사고는 없었다.') },
      { label: '불도저처럼 밀어붙인다', odds: checkOdds(c.p.actual.int, 55, 10), run: (x) => {
        mark(x.p, 'favor', 2);
        if (chance(x.s, 0.25)) { (x.s.fame = Math.max(0, x.s.fame - 10)); hap(x.p, -15); setJob(x.p, 'none'); addFlag(x.p, 'was_mayor'); return '💥 날림 공사로 지은 아파트가 무너졌다. 사상자가 났다. 책임을 지고 물러났다.'; }
        x.s.fame += 4;
        return '석 달 만에 해냈다. "불도저 시장"이라는 별명이 붙었다.';
      } },
    ],
  },
  {
    id: 'pw_deputy_pm', title: '부총리 겸 경제기획원 장관', years: [1963, 1994],
    ok: (s, p) => free(p) && age(s, p) >= 45 && age(s, p) <= 68 && ((p.job === 'civil' && p.jobLevel >= 5) || (p.job === 'professor' && p.jobLevel >= 2) || (['banker', 'analyst', 'fund_manager'].includes(p.job) && p.jobLevel >= 4)),
    text: (c) => `경제개발 5개년 계획의 사령탑, 경제기획원. ${presHouse(c.s.year)}이 ${who(c)}에게 부총리 겸 장관을 맡기려 한다. 수출 목표, 중화학공업, 물가 — 숫자 하나에 나라가 움직인다.`,
    choices: () => [
      { label: '맡는다', run: (x) => {
        x.p.flags = x.p.flags.filter((f) => !f.startsWith('prev:'));
        x.p.flags.push('prev:' + x.p.job + ':' + x.p.jobLevel, 'role:deputy_pm');
        setJob(x.p, 'minister'); addFlag(x.p, 'was_minister'); addFlag(x.p, 'ruling');
        x.s.fame += 18;
        grant(x.s, '📈', `경제부총리: ${fullName(x.p)}`, '나라 경제의 설계도를 쥐었다.', 'epic');
        return '📈 부총리 취임. 첫 보고는 "올해 수출 목표 달성률"이었다.';
      } },
      { label: '고사한다', run: () => '"현장에 남겠습니다."' },
    ],
  },
  {
    id: 'pw_chief_of_staff', title: '대통령 비서실장', years: [1961, 2025],
    ok: (s, p) => free(p) && age(s, p) >= 42 && age(s, p) <= 70 && ((p.job === 'aide' && p.jobLevel >= 3) || (p.job === 'journalist' && p.jobLevel >= 4) || (p.job === 'politician' && p.jobLevel >= 1) || (p.job === 'civil' && p.jobLevel >= 5) || (p.job === 'agent' && p.jobLevel >= 4)),
    text: (c) => `${presHouse(c.s.year)}에서 ${who(c)}에게 비서실장을 제안했다. 대통령의 하루가 이 사람의 손을 거친다. "${presHouse(c.s.year)}의 2인자"라 불린다.`,
    choices: () => [
      { label: '받아들인다', run: (x) => {
        x.p.flags = x.p.flags.filter((f) => !f.startsWith('prev:'));
        x.p.flags.push('prev:' + x.p.job + ':' + x.p.jobLevel, 'role:chief');
        setJob(x.p, 'minister'); addFlag(x.p, 'was_minister'); mark(x.p, 'favor', 3);
        if (hist(x.s) && x.s.year < 1988) addFlag(x.p, 'ruling');
        x.s.fame += 15;
        grant(x.s, '🗝', `대통령 비서실장: ${fullName(x.p)}`, '대통령의 가장 가까운 자리에 섰다.', 'epic');
        return '🗝 비서실장 취임. 새벽 6시 출근, 자정 퇴근이 시작됐다.';
      } },
      { label: '고사한다', run: () => '"그 자리는 사람을 소진시킵니다."' },
    ],
  },
  {
    id: 'pw_premier', title: '국무총리 지명', years: [1963, 2200],
    ok: (s, p) => free(p) && age(s, p) >= 48 && age(s, p) <= 75 && (hasFlag(p, 'was_minister') || (p.job === 'politician' && p.jobLevel >= 2) || (p.job === 'professor' && p.jobLevel >= 3) || (p.job === 'judge' && p.jobLevel >= 4) || hasFlag(p, 'un_sg')),
    text: (c) => `대통령이 ${who(c)}을(를) 국무총리 후보로 지명했다. 행정 각부를 통할하는 자리다. ${c.s.year < 2000 ? '국회 임명동의만 받으면 된다.' : '국회 인사청문회와 임명동의를 거쳐야 한다.'}`,
    choices: (c) => [
      {
        label: c.s.year < 2000 ? '임명동의에 응한다' : '청문회에 선다',
        odds: checkOdds(c.p.actual.mor * 0.5 + c.p.actual.cha * 0.3 + c.p.actual.int * 0.2 + (c.s.year < 1988 && ruling(c.p) ? 15 : 0), 58, 8),
        run: (x) => {
          if (!check(x.s, x.p.actual.mor * 0.5 + x.p.actual.cha * 0.3 + x.p.actual.int * 0.2 + (x.s.year < 1988 && ruling(x.p) ? 15 : 0), 58, 8)) {
            x.s.fame = Math.max(0, x.s.fame - 6);
            return x.s.year < 2000 ? '야당이 표결을 막았다. 지명이 철회됐다.' : '청문회에서 자녀 문제가 터졌다. 낙마했다.';
          }
          x.p.flags = x.p.flags.filter((f) => !f.startsWith('prev:') && !f.startsWith('role:'));
          x.p.flags.push('prev:' + (x.p.job === 'minister' ? 'pension:0' : x.p.job + ':' + x.p.jobLevel), 'role:premier');
          setJob(x.p, 'minister'); addFlag(x.p, 'was_minister'); addFlag(x.p, 'was_premier');
          x.s.fame += 30;
          grant(x.s, '🏛', `국무총리: ${fullName(x.p)}`, '"일인지하 만인지상." 대통령 다음 자리다. 대선 후보 물망에 오른다.', 'legend');
          return '🏛 국무총리 취임!';
        },
      },
      { label: '고사한다', run: () => '"아직 부족합니다."' },
    ],
  },
  {
    id: 'pw_acting_pres', title: '대통령 권한대행', years: [1979, 1979],
    ok: (s, p) => p.job === 'minister' && hasFlag(p, 'role:premier') && !famPres(s),
    text: (c) => `10월 26일 밤, 대통령이 쓰러졌다. 헌법에 따라 국무총리 ${who(c)}이(가) 대통령 권한대행이 됐다. 군은 술렁이고, 통일주체국민회의가 다시 소집된다.`,
    choices: (c) => [
      { label: '통대 선거에 단독 출마한다', odds: checkOdds(c.p.actual.cha + markOf(c.p, 'favor') * 3, 55, 10), run: (x) => {
        if (!check(x.s, x.p.actual.cha + markOf(x.p, 'favor') * 3, 55, 10)) return '군부 실세들이 다른 사람을 밀었다. 권한대행만 하고 물러났다.';
        return becomePresident(x, 'gym', 6, '통일주체국민회의에서 대통령에 선출됐다. 그러나 진짜 권력은 계엄사령부에 있다는 걸 모두 안다.');
      } },
      { label: '"과도 정부로 개헌만 하고 물러나겠다"', run: (x) => (up(x.p, 'mor', 5), (x.s.fame += 6), '민주 개헌을 약속했다. 하지만 12월, 군 내부에서 총성이 울렸다.') },
    ],
  },
  {
    id: 'pw_army_chief', title: '육군참모총장', years: [1961, 2200],
    ok: (s, p) => p.job === 'officer' && p.jobLevel >= 9 && !hasFlag(p, 'army_chief') && age(s, p) >= 50,
    text: (c) => `${who(c)} 대장이 육군참모총장 후보에 올랐다. 50만 대군의 정점이다.${hist(c.s) && c.s.year < 1993 ? ' 이 시대엔 참모총장의 말 한마디가 정치를 흔든다.' : ''}`,
    choices: (c) => [
      { label: '임명을 받는다', odds: checkOdds(c.p.actual.mor * 0.4 + c.p.actual.cha * 0.3 + c.p.actual.int * 0.3 + markOf(c.p, 'favor') * 2, 58, 9), run: (x) => {
        if (!check(x.s, x.p.actual.mor * 0.4 + x.p.actual.cha * 0.3 + x.p.actual.int * 0.3 + markOf(x.p, 'favor') * 2, 58, 9)) return '동기가 총장이 됐다. 관례대로 전역을 준비한다.';
        addFlag(x.p, 'army_chief'); x.s.fame += 15;
        grant(x.s, '⭐', `육군참모총장: ${fullName(x.p)}`, '군의 정점에 섰다. 퇴임 뒤 국방부 장관·국회의원 자리가 기다린다.', 'legend');
        return '⭐ 참모총장 취임. 계룡대에 사열이 펼쳐졌다.';
      } },
      { label: '후배에게 길을 연다', run: (x) => (up(x.p, 'mor', 3), '"이제 물러날 때입니다."') },
    ],
  },
  {
    id: 'pw_un_sg', title: '유엔 사무총장 후보', years: [1990, 2200],
    ok: (s, p) => p.job === 'diplomat' && p.jobLevel >= 5 && age(s, p) >= 55 && !hasFlag(p, 'un_sg'),
    text: (c) => `정부가 ${who(c)} 대사를 유엔 사무총장 후보로 내세웠다. 안전보장이사회 상임이사국 다섯 나라가 한 나라도 거부권을 쓰면 끝이다.`,
    choices: (c) => [
      { label: '전 세계를 돌며 지지를 모은다', odds: checkOdds(c.p.actual.cha * 0.5 + c.p.actual.int * 0.3 + c.p.actual.mor * 0.2, 66, 8), run: (x) => {
        if (!check(x.s, x.p.actual.cha * 0.5 + x.p.actual.int * 0.3 + x.p.actual.mor * 0.2, 66, 8)) return '예비 투표에서 상임이사국 한 곳이 "반대"를 던졌다. 꿈은 거기까지였다.';
        addFlag(x.p, 'un_sg'); addFlag(x.p, 'was_minister'); x.s.fame += 60;
        grant(x.s, '🌐', `유엔 사무총장: ${fullName(x.p)}`, '세계의 대통령이라 불리는 자리에 올랐다. 뉴욕 유엔본부 38층.', 'legend');
        return '🌐 유엔 총회에서 박수로 선출됐다! 고향 마을에 현수막이 수십 개 걸렸다.';
      } },
      { label: '정중히 고사한다', run: () => '"조국 외교에 남겠습니다."' },
    ],
  },
  {
    id: 'pw_chaebol_party', title: '회장님의 신당', years: [1987, 2200],
    ok: (s, p) => p.job === 'founder' && p.jobLevel >= 4 && age(s, p) >= 50 && age(s, p) <= 78 && !hasFlag(p, 'party_leader'),
    text: (c) => `${who(c)} 회장이 정치판을 보며 혀를 찬다. "기업은 이렇게 안 굴러가." 측근들이 신당을 만들자고 한다. 창당 자금만 수백억, 실패하면 세무조사가 따라온다.`,
    choices: () => [
      { label: '신당을 만든다 (회사 자금 투입)', run: (x) => {
        const cost = W(x.s, 50000);
        pay(x.s, householder(x.s), cost);
        addFlag(x.p, 'party_leader');
        x.p.flags = x.p.flags.filter((f) => !f.startsWith('prev:'));
        x.p.flags.push('prev:founder:' + x.p.jobLevel);
        setJob(x.p, 'politician', 0);
        x.p.pol = { approval: 38, fund: W(x.s, 30000), slush: 0, heat: 20 };
        x.s.fame += 12;
        grant(x.s, '🏢', `신당 창당: ${fullName(x.p)}`, `창당 자금 ${formatMoney(cost)}. 총선에서 돌풍을 일으켰다. 대선이 다음 목표다.`, 'epic');
        return `🏢 창당대회에 수만 명이 모였다. 총선에서 원내 교섭단체를 이뤘다. (${formatMoney(cost)})`;
      } },
      { label: '기업인으로 남는다', run: () => '"장사꾼은 장사로 나라에 보탬이 된다."' },
    ],
  },
];

// ───────────────────────── 4) 대통령 선거 (근현대사) ─────────────────────────

/** 이 사람이 그해 대선에 나설 수 있나 */
function presEligible(s: GameState, p: Person, how: 'direct' | 'gym'): boolean {
  if (!alive(p) || hasFlag(p, 'in_prison') || p.job === 'president' || hasFlag(p, 'draft_dodger') || hasFlag(p, 'ex_president')) return false;
  const a = age(s, p);
  if (a < 40 || a > 75) return false;
  if (how === 'gym') return ruling(p) && (hasFlag(p, 'was_premier') || (p.job === 'politician' && p.jobLevel >= 1) || hasFlag(p, 'coup_leader') || hasFlag(p, 'army_chief') || (p.job === 'officer' && p.jobLevel >= 8) || hasFlag(p, 'role:chief') || (p.job === 'agent' && p.jobLevel === 5));
  return (p.job === 'politician' && p.jobLevel >= 1 && s.fame >= 70) || hasFlag(p, 'was_premier') || hasFlag(p, 'party_leader') || (hasFlag(p, 'was_minister') && s.fame >= 100) || hasFlag(p, 'was_top_prosecutor') || hasFlag(p, 'un_sg') || (hasFlag(p, 'june87') && s.fame >= 60) || (p.job === 'mayor' && s.fame >= 80);
}

function becomePresident(x: Ctx, how: 'direct' | 'gym', term: number, line: string): string {
  const p = x.p;
  p.flags = p.flags.filter((f) => !f.startsWith('pres_term:') && !f.startsWith('role:'));
  setJob(p, 'president');
  addFlag(p, 'president');
  p.flags.push('pres_term:' + term);
  const pl = polOf(p);
  p.pol = { approval: how === 'gym' ? 45 : 60, fund: 0, slush: pl.slush, heat: pl.heat };
  x.s.fame += 150;
  for (const q2 of Object.values(x.s.people)) if (alive(q2)) q2.happiness = clamp(q2.happiness + 15, 0, 100);
  grant(x.s, '🇰🇷', `대통령 취임: ${fullName(p)}`, `${line}\n임기 ${term}년 · 명성 +150 · 재임 중 행동력 +1`, 'legend');
  x.s.log.push({ year: x.s.year, text: `🇰🇷 ${fullName(p)} 대통령 취임 (${how === 'gym' ? '간선' : '직선'})`, kind: 'achv' });
  (x.s.storySeen ??= {})['althist'] = x.s.year;
  return `🇰🇷 ${line}`;
}

const histPres: EventDef = {
  id: 'pw_pres',
  title: (c) => (HIST_PRES[c.s.year]?.how === 'gym' ? '🏟 체육관 선거' : '🗳 대통령 선거'),
  valid: (c) => alive(c.p) && !!HIST_PRES[c.s.year] && !famPres(c.s),
  text: (c) => {
    const e = HIST_PRES[c.s.year];
    const r = regimeOf(c.s.year);
    if (e.how === 'gym')
      return `${c.s.year}년 · ${e.note}\n${c.s.year <= 1980 ? '통일주체국민회의 대의원 2천여 명이 장충체육관에 모인다. 후보는 단 한 명, 토론도 연설도 없다.' : '대통령선거인단 5천여 명이 간접 선거로 뽑는다.'}\n집권 세력 안에서 ${who(c)}의 이름이 후보로 거론된다. 문제는 "낙점"이다.`;
    return `${c.s.year}년 · ${e.note} (${REGIME_NAME[r]})\n${r === 'third' ? '여당은 관권과 막걸리·고무신으로, 야당은 바람으로 싸운다.' : c.s.year === 1987 ? '16년 만의 직선. 야권 후보가 둘로 갈라질 조짐이다.' : '전국이 유세 현장이다. TV 토론이 승부를 가른다.'}\n${who(c)}에게 ${ruling(c.p) ? '여당' : hasFlag(c.p, 'party_leader') ? '신당' : '당'} 대선 후보 자리가 왔다. 선거비용 ${formatMoney(W(c.s, 30000))}.`;
  },
  choices: (c) => {
    const e = HIST_PRES[c.s.year];
    if (e.how === 'gym') {
      const sc = c.p.actual.cha * 0.3 + c.p.actual.int * 0.2 + markOf(c.p, 'favor') * 4 + (hasFlag(c.p, 'coup_leader') ? 25 : 0) + (hasFlag(c.p, 'was_premier') ? 8 : 0);
      return [
        { label: '"추대"를 받아들인다', odds: checkOdds(sc, 55, 8), run: (x) => {
          if (!check(x.s, sc, 55, 8)) { mark(x.p, 'favor', -2); return '마지막 순간, 다른 사람이 낙점됐다. 체육관 VIP석에서 박수를 쳤다.'; }
          up(x.p, 'mor', -3);
          return becomePresident(x, 'gym', e.term, `장충체육관. 찬성 2,500여 표, 반대 0표. ${fullName(x.p)}이(가) 대통령에 선출됐다.`);
        } },
        { label: '"직선제 개헌이 먼저다"라며 고사한다', run: (x) => (up(x.p, 'mor', 6), x.p.flags = x.p.flags.filter((f) => f !== 'ruling'), (x.s.fame += 3), '권력 핵심에서 밀려났다. 대신 훗날 이 말이 다시 인용된다.') },
      ];
    }
    const cost = W(c.s, 30000);
    const m = campaignMoney(c.p, cost);
    const auth = regimeOf(c.s.year) === 'third';
    const pl = polOf(c.p);
    const sc =
      c.p.actual.cha * 0.4 + c.p.actual.mor * 0.25 + Math.min(30, c.s.fame / 6) + (pl.approval - 50) * 0.35 + (hasTrait(c.p, 'leader') ? 6 : 0) +
      (auth ? (ruling(c.p) ? 14 : -6) : 0) + (hasFlag(c.p, 'june87') && c.s.year === 1987 ? 6 : 0) + (hasFlag(c.p, 'party_leader') ? 4 : 0) + (hasFlag(c.p, 'was_premier') ? 4 : 0);
    return gate(c.s, [
      { label: '출마한다', odds: checkOdds(sc, 78, 7), req: ['선거비용', '명성·지지율'], disabled: m.short > (householder(c.s).cash + Math.max(0, c.s.familyCash)), run: (x) => {
        const pl2 = polOf(x.p);
        pl2.fund -= m.fromFund; pl2.slush -= m.fromSlush;
        if (m.short) pay(x.s, householder(x.s), m.short);
        if (check(x.s, sc, 78, 7)) return becomePresident(x, 'direct', e.term, `${x.s.year}년 대선 승리! ${fullName(x.p)}이(가) 대통령에 당선됐다.`);
        if (sc > 62) { householder(x.s).cash += Math.round(cost * 0.6); x.s.fame += 6; return '아깝게 2위. 득표율 15%를 넘어 선거비용 일부를 돌려받았다. 다음을 기약한다.'; }
        x.s.fame = Math.max(0, x.s.fame - 5);
        return '참패. 선거비용이 허공으로 날아갔다.';
      } },
      { label: '불출마', run: () => '"때가 아니다."' },
    ]);
  },
};

// ───────────────────────── 등록 · 해마다 ─────────────────────────

const ALL: Story[] = [...REGIME, ...DEMO, ...APPOINT];
const toEv = (d: Story): EventDef => ({ id: d.id, title: () => d.title, text: d.text, choices: (c) => gate(c.s, d.choices(c)), valid: (c) => alive(c.p) && d.ok(c.s, c.p) && (!d.years || (c.s.year >= d.years[0] && c.s.year <= d.years[1])) });
export const POWER2_EVENTS: EventDef[] = [...ALL.map(toEv), histPres];

/** 반드시 그해에 오는 역사 고비 (5·16·국보위 등): 해당되는 가족이 있으면 확률 없이 */
const MUST = new Set(['pw_516_join', 'pw_kukbowi', 'pw_june_1987', 'pw_acting_pres', 'pw_5gong_hearing', 'pw_ruling_party_81']);
/** 근현대사 전용 (현대 모드 2025~ 에서도 열리는 것은 years 끝이 2200) */
const histOnly = (d: Story) => !d.years || d.years[1] <= 2025;

export function power2Year(s: GameState): string[] {
  const msgs: string[] = [];
  const people = Object.values(s.people).filter((p) => alive(p) && !p.inLaw && (isMainline(s, p) || p.id === head(s).fatherId || p.id === head(s).motherId));
  for (const p of people) {
    if (hasFlag(p, 'in_prison')) continue;
    const pool = ALL.filter((d) => (!d.years || (s.year >= d.years[0] && s.year <= d.years[1])) && (!histOnly(d) || hist(s)) && d.ok(s, p) && seen(s, p.id + ':' + d.id) === undefined && !pending(s, d.id, p));
    for (const d of pool.filter((x) => MUST.has(x.id))) {
      see(s, p.id + ':' + d.id);
      q(s, d.id, p);
    }
    const rest = pool.filter((x) => !MUST.has(x.id));
    // 임명·영입 제안은 드물게 (가주는 조금 더 자주)
    if (rest.length && chance(s, p.id === s.headId ? 0.22 : 0.1)) {
      const d = pick(s, rest);
      // 반복되는 일(서울시장의 결단)은 몇 해 쉬었다가
      if (d.id !== 'pw_mayor_work') see(s, p.id + ':' + d.id);
      else (s.storySeen ??= {})[p.id + ':' + d.id + ':' + s.year] = s.year;
      q(s, d.id, p);
    }
    // 임명직 서울시장: 2~4년 하고 물러난다 (지방선거 없음)
    if (p.job === 'mayor' && hasFlag(p, 'mayor_appointed') && p.jobYears >= 3 && chance(s, 0.5)) {
      p.flags = p.flags.filter((f) => f !== 'mayor_appointed');
      addFlag(p, 'was_mayor');
      addFlag(p, 'was_minister');
      const [pj, pl] = (p.flags.find((f) => f.startsWith('prev:'))?.slice(5) ?? 'pension:0').split(':');
      p.job = pj; p.jobLevel = Number(pl); p.jobYears = 5;
      if (isMainline(s, p)) msgs.push(`🏙 ${fullName(p)} 서울시장 이임. 장관급 예우를 받으며 물러났다.`);
    }
  }
  // 근현대사 대선: 그해 출마 자격이 되는 가족 한 명에게
  const e = hist(s) ? HIST_PRES[s.year] : undefined;
  if (e && !famPres(s) && !s.events.some((x) => x.defId === 'pw_pres')) {
    const cands = people.filter((p) => isMainline(s, p) && presEligible(s, p, e.how)).sort((a, b) => Number(b.id === s.headId) - Number(a.id === s.headId) || b.jobLevel - a.jobLevel);
    if (cands[0]) q(s, 'pw_pres', cands[0]);
  }
  return msgs;
}

/** 대통령 임기 (근현대사 간선·직선마다 다르다) */
export const presTerm = (p: Person) => Number(p.flags.find((f) => f.startsWith('pres_term:'))?.slice(10) ?? (hasFlag(p, 'coup_pres') ? 7 : 5));

/** 장관급 자리 이름 (국무총리·부총리·비서실장·장관) */
export function ministerTitle(p: Person): string {
  if (p.flags.includes('role:premier')) return '국무총리';
  if (p.flags.includes('role:deputy_pm')) return '부총리';
  if (p.flags.includes('role:chief')) return '대통령 비서실장';
  return '장관';
}

