// 권력의 길: 법조(변호사·판사·검사), 정보기관(중앙정보부 → 안기부 → 국정원), 군 사조직(하나회)과 쿠데타.
//
// 실제 제도·역사를 따랐고 게임에 맞게 줄였다.
// · 사법시험(1963~2017) 합격 → 사법연수원 2년 → 연수원 성적순으로 판사·검사 임관, 나머지는 변호사 개업.
// · 로스쿨(2009~) → 변호사시험(5회 제한) → 검사는 졸업 직후 임용(성적·실무수습), 판사는 법조경력이 있어야 한다
//   (법원조직법 법조일원화: 2013년 3년 → 2018년 5년 이상으로 단계 상향. 게임에선 5년으로 둔다).
// · 판사: 판사 → 부장판사(임관 후 약 15년) → 고법판사 → 법원장 → 대법관(대통령 임명·국회 동의) → 대법원장.
// · 검사: 평검사 → 부부장 → 부장검사(약 13~15년) → 차장검사 → 검사장 → 검찰총장(임기 2년).
// · 중앙정보부: 1961년 5·16 직후 창설, 1981년 국가안전기획부, 1999년 국가정보원으로 개칭. 수장은 "부장(원장)".
//   남산 분실 조사·정치 사찰·선거 개입·해외 공작으로 악명이 높았다. 1979년 10·26 때 부장이 대통령을 쐈다.
// · 하나회: 1963년 육사 11기 중심으로 결성된 군 내 사조직. 기수마다 소수만 비밀리에 받아 요직(보안사·수경사·특전사)을 독점했고,
//   1979년 12·12 군사반란과 1980년 5·17로 정권을 잡았다. 1993년 문민정부가 숙청했고, 1995~97년 반란 수괴들이 처벌받았다.
// 실존 인물의 이름은 쓰지 않는다. 우리 가문의 사람이 그 자리에 있었다면 어땠을지를 그린다.

import { chance, pick } from './rng';
import { gate, setJob, setStudy, type Choice, type Ctx, type EventDef } from './ev-util';
import { addFlag, age, alive, check, checkOdds, clamp, fullName, hasFlag, hasTrait, isMainline, mark, markOf, spouseOf } from './people';
import { formatMoney, jobTitle } from './economy';
import { grant } from './rewards';
import { imprison } from './crimes';
import { tryPromote } from './rank';
import { wageIndex } from './pay';
import type { GameState, Person } from './types';

const hap = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));
const up = (p: Person, k: keyof Person['actual'], d: number) => (p.actual[k] = clamp(p.actual[k] + d, 0, 100));
const who = (c: { p: Person }) => fullName(c.p);
const hist = (s: GameState) => s.era === 'history' && s.year <= 2025;
const wi = (s: GameState) => wageIndex(s.year);
const seen = (s: GameState, key: string) => (s.storySeen ??= {})[key];
const see = (s: GameState, key: string) => ((s.storySeen ??= {})[key] = s.year);
const q = (s: GameState, defId: string, p: Person, data?: unknown) => s.events.push({ uid: s.eventSeq++, defId, personId: p.id, data });
const pending = (s: GameState, defId: string, p: Person) => s.events.some((e) => e.defId === defId && e.personId === p.id);

/** 정보기관 이름 (그해) */
export const agencyName = (y: number) => (y < 1981 ? '중앙정보부' : y < 1999 ? '국가안전기획부' : '국가정보원');
export const agencyChief = (y: number) => (y < 1981 ? '중앙정보부장' : y < 1999 ? '안기부장' : '국정원장');
/** 권위주의 시절 (쿠데타가 "가능했던" 시대) */
const darkAge = (s: GameState) => hist(s) && s.year >= 1961 && s.year < 1988;
const familyPresident = (s: GameState) => Object.values(s.people).some((p) => alive(p) && p.job === 'president');
/** 법조 경력 햇수 (변호사·검사·판사로 일한 해) */
export const lawYears = (p: Person) => markOf(p, 'law_y');

// ───────────────────────── 1) 법조의 문 ─────────────────────────

/** 시험 합격 직후: 사법시험은 연수원으로, 변호사시험은 진로 선택으로 */
export function afterExamPass(s: GameState, p: Person, examId: string): string {
  if (examId === 'sashi') {
    setJob(p, 'none');
    setStudy(s, p, 2, 'jtri');
    addFlag(p, 'passed:bar');
    mark(p, 'jtri_score', 0);
    return '\n⚖ 사법연수원 입소. 2년 동안 판결문·공소장을 쓰며 성적 경쟁을 한다. 연수원 성적이 판사·검사·변호사를 가른다.';
  }
  if (examId === 'bar' && isMainline(s, p)) {
    q(s, 'law_path', p);
    return '';
  }
  return '';
}

/** 연수원·로스쿨 성적 (판·검사 임용 경쟁력) */
const lawScore = (p: Person) => p.actual.int * 0.75 + p.actual.mor * 0.1 + p.actual.cha * 0.15 + (hasFlag(p, 'univ_top') ? 6 : 0) + Math.min(10, markOf(p, 'jtri_score') * 2) + (hasTrait(p, 'diligent') ? 3 : 0);

const lawPath: EventDef = {
  id: 'law_path',
  title: (c) => (c.ev.data?.jtri ? '⚖ 사법연수원 수료' : '⚖ 변호사시험 합격 — 어느 법조인이 될까'),
  valid: (c) => alive(c.p),
  text: (c) =>
    c.ev.data?.jtri
      ? `${who(c)}, 사법연수원 2년을 마쳤다. 수료 성적이 곧 진로다.\n성적 상위권은 판사로, 그다음은 검사로 임관하고, 나머지는 변호사로 개업한다.\n(연수원 성적: ${lawScore(c.p) >= 72 ? '최상위권' : lawScore(c.p) >= 64 ? '상위권' : lawScore(c.p) >= 56 ? '중위권' : '하위권'})`
      : `${who(c)}, 변호사시험에 합격했다. 이제 어느 길로 갈까?\n· 검사는 로스쿨 성적과 실무수습 평가로 바로 임용한다.\n· 판사는 법조경력 5년이 있어야 지원할 수 있다 (법조일원화). 변호사나 검사로 경력을 쌓아야 한다.\n· 대형 로펌은 연봉이 높지만 밤이 없다.`,
  choices: (c) => {
    const p = c.p;
    const sc = lawScore(p);
    const jtri = !!c.ev.data?.jtri;
    const out: Choice[] = [];
    if (jtri)
      out.push({
        label: '⚖ 판사로 임관한다',
        odds: checkOdds(sc, 70, 6),
        req: ['연수원 성적 최상위권'],
        run: (x) => {
          if (!check(x.s, lawScore(x.p), 70, 6)) return { text: '성적이 판사 임관선에 조금 모자랐다. 다른 길을 고르자.', keep: true };
          setJob(x.p, 'judge');
          x.s.fame += 4;
          grant(x.s, '⚖', `판사 임관: ${fullName(x.p)}`, '법복을 입었다. 이제 남의 인생을 판결한다.', 'epic');
          return '⚖ 판사 임관! 지방법원 배석판사로 첫 발령을 받았다.';
        },
      });
    out.push({
      label: jtri ? '🔍 검사로 임관한다' : '🔍 검사 임용에 지원한다',
      odds: checkOdds(sc, jtri ? 64 : 67, 7),
      req: [jtri ? '연수원 성적 상위권' : '로스쿨 성적·실무수습'],
      run: (x) => {
        if (!check(x.s, lawScore(x.p), jtri ? 64 : 67, 7)) return { text: '검사 임용에서 떨어졌다. 다른 길을 고르자.', keep: true };
        setJob(x.p, 'prosecutor');
        x.s.fame += 3;
        grant(x.s, '🔍', `검사 임용: ${fullName(x.p)}`, '검사 선서를 했다. "공익의 대표자"가 됐다.', 'epic');
        return '🔍 검사 임용! 지방검찰청 형사부 초임검사로 발령났다. 첫날 사건 기록이 책상에 산처럼 쌓였다.';
      },
    });
    if (!jtri && c.s.year >= 2012)
      out.push({
        label: '📚 재판연구원(로클럭) 2년 → 경력 쌓아 판사 도전',
        odds: checkOdds(sc, 66, 7),
        req: ['로스쿨 성적 상위권'],
        run: (x) => {
          if (!check(x.s, lawScore(x.p), 66, 7)) return { text: '재판연구원 선발에서 떨어졌다. 다른 길을 고르자.', keep: true };
          setJob(x.p, 'lawyer');
          addFlag(x.p, 'clerk');
          mark(x.p, 'law_y', 2); // 재판연구원 2년은 법조경력으로 인정
          return '고등법원 재판연구원이 됐다. 판사들 옆에서 판결문을 쓴다. 2년 뒤엔 변호사로 경력을 채우고 판사 임용에 도전한다.';
        },
      });
    out.push(
      {
        label: '🏢 대형 로펌에 들어간다',
        odds: checkOdds(sc, 62, 7),
        req: ['성적·학벌'],
        run: (x) => {
          if (!check(x.s, lawScore(x.p) + (hasFlag(x.p, 'univ_top') ? 4 : 0), 62, 7)) return { text: '대형 로펌 최종 면접에서 떨어졌다.', keep: true };
          setJob(x.p, 'lawyer');
          addFlag(x.p, 'bigfirm');
          x.p.cash += Math.round(1500 * wi(x.s));
          return '대형 로펌 어쏘 변호사가 됐다. 사이닝 보너스가 들어왔다. 사무실 불은 새벽 2시에 꺼진다.';
        },
      },
      {
        label: '⚖ 작은 로펌·개업 변호사가 된다',
        run: (x) => (setJob(x.p, 'lawyer'), '동네 법률사무소에서 시작했다. 이혼·임대차·교통사고… 의뢰인의 사연이 다 다르다.'),
      },
      {
        label: '🕊 공익·인권 변호사가 된다',
        run: (x) => {
          setJob(x.p, 'lawyer');
          addFlag(x.p, 'rights_lawyer');
          up(x.p, 'mor', 4);
          hap(x.p, 6);
          return hist(x.s) && x.s.year < 1988 ? '시국 사건 변론을 맡겠다고 했다. 선배가 말렸다. "자네 이름이 정보부 명단에 오를 걸세."' : '공익법률재단에 들어갔다. 연봉은 친구들의 절반, 보람은 두 배.';
        },
      },
    );
    return out;
  },
};

/** 법조경력이 찬 변호사·검사에게 오는 판사 임용 공고 */
const judgeApply: EventDef = {
  id: 'judge_apply',
  title: () => '⚖ 경력 법관 임용 공고',
  valid: (c) => alive(c.p) && ['lawyer', 'prosecutor'].includes(c.p.job),
  text: (c) => `대법원이 경력 법관을 뽑는다. ${who(c)}의 법조경력 ${lawYears(c.p)}년.\n서류·실무능력 평가·면접을 거친다. 붙으면 지금 자리는 내려놓는다 (연봉이 줄 수도 있다).`,
  choices: (c) => [
    {
      label: '판사 임용에 지원한다',
      odds: checkOdds(lawScore(c.p) + Math.min(6, lawYears(c.p)), 68, 7),
      run: (x) => {
        if (!check(x.s, lawScore(x.p) + Math.min(6, lawYears(x.p)), 68, 7)) {
          hap(x.p, -4);
          return '면접에서 떨어졌다. 법원은 문이 좁다.';
        }
        setJob(x.p, 'judge');
        x.p.flags = x.p.flags.filter((f) => f !== 'bigfirm');
        x.s.fame += 4;
        grant(x.s, '⚖', `판사 임용: ${fullName(x.p)}`, `법조경력 ${lawYears(x.p)}년 만에 법복을 입었다.`, 'epic');
        return '⚖ 판사 임용! 첫 재판에서 법정 경위가 "모두 일어서 주십시오"라고 외쳤다.';
      },
    },
    { label: '지금 자리에 남는다', run: () => '법원 대신 지금의 일을 계속하기로 했다.' },
  ],
};

interface Story {
  id: string;
  title: string;
  ok: (s: GameState, p: Person) => boolean;
  text: (c: Ctx) => string;
  choices: (c: Ctx) => Choice[];
}

const LEGAL: Story[] = [
  // ── 판사 ──
  {
    id: 'lg_chaebol_trial',
    title: '재벌 총수의 선고 공판',
    ok: (_s, p) => p.job === 'judge' && p.jobLevel >= 1,
    text: (c) => `${who(c)} 부장판사의 재판부에 그룹 총수의 횡령 사건이 배당됐다. 피해액 수백억.\n"경제에 미치는 영향을 고려해 달라"는 탄원서가 산더미다. 법조계엔 "징역 3년에 집행유예 5년"이라는 공식이 있다.`,
    choices: (c) => [
      { label: '실형을 선고하고 법정 구속한다', odds: checkOdds(c.p.actual.mor, 50, 10), run: (x) => (check(x.s, x.p.actual.mor, 50, 10) ? (up(x.p, 'mor', 3), (x.s.fame += 4), '"재벌도 법 앞에 평등하다." 판결문이 교과서에 실렸다.') : (up(x.p, 'mor', 2), hap(x.p, -6), '항소심에서 집행유예로 뒤집혔다. 그래도 소신은 지켰다.')) },
      { label: '집행유예 (3·5 공식)', run: (x) => (mark(x.p, 'favor', 1), (x.s.scandal = Math.min(100, (x.s.scandal ?? 0) + 4)), '"유전무죄" 피켓이 법원 앞에 섰다. 법원장은 "균형 잡힌 판결"이라 했다.') },
    ],
  },
  {
    id: 'lg_warrant',
    title: '새벽 영장 심사',
    ok: (_s, p) => p.job === 'judge' && p.jobLevel <= 2,
    text: (c) => `새벽 2시. 영장전담 ${who(c)} 판사 앞에 정치인 구속영장이 올라왔다. 법원 앞에 방송 차량이 진을 쳤다.`,
    choices: (c) => [
      { label: '기록을 끝까지 읽고 판단한다', odds: checkOdds(c.p.actual.int, 55, 10), run: (x) => (check(x.s, x.p.actual.int, 55, 10) ? (up(x.p, 'int', 2), mark(x.p, 'law_rep', 1), '아침 6시, 결정문이 나왔다. 양쪽 모두 반박하지 못했다.') : (hap(x.p, -5), '결정이 언론에서 난도질당했다. 판사 이름이 신문 1면에 올랐다.')) },
      { label: '정치권 눈치를 본다', run: (x) => (mark(x.p, 'favor', 1), up(x.p, 'mor', -3), '무난하게 넘어갔다. …법원 내부 게시판에 익명의 비판 글이 올라왔다.') },
    ],
  },
  {
    id: 'lg_emergency_decree',
    title: '긴급조치 위반 사건',
    ok: (s, p) => p.job === 'judge' && hist(s) && s.year >= 1974 && s.year < 1980,
    text: (c) => `유신 시절. "유신헌법을 비판했다"는 이유로 대학생들이 긴급조치 위반으로 기소됐다. 정보부 조정관이 ${who(c)} 판사실에 다녀갔다. "위에서 관심이 많습니다."`,
    choices: (c) => [
      { label: '무죄를 선고한다', odds: checkOdds(c.p.actual.mor, 55, 10), run: (x) => (addFlag(x.p, 'conscience_judge'), up(x.p, 'mor', 5), mark(x.p, 'favor', -3), '판결 다음 달 지방 지원으로 좌천 발령이 났다. 수십 년 뒤 그 학생들이 재심 무죄를 받던 날, 다시 이름이 불렸다.') },
      { label: '시키는 대로 유죄를 선고한다', run: (x) => (mark(x.p, 'favor', 2), up(x.p, 'mor', -6), addFlag(x.p, 'yushin_judge'), (x.s.scandal = Math.min(100, (x.s.scandal ?? 0) + 6)), '징역 7년. 피고인 어머니의 울음이 법정을 채웠다. 승진 명단에 이름이 올랐다.') },
    ],
  },
  {
    id: 'lg_justice_nominee',
    title: '대법관 후보 추천',
    ok: (s, p) => p.job === 'judge' && p.jobLevel === 3 && age(s, p) >= 50,
    text: (c) => `대법관후보추천위원회가 ${who(c)} 법원장을 후보로 올렸다. 대통령이 지명하면 국회 인사청문회를 거친다. 재산·자녀·위장전입까지 다 털린다.`,
    choices: (c) => [
      {
        label: '청문회에 선다',
        odds: checkOdds(c.p.actual.mor * 0.6 + c.p.actual.int * 0.4 + markOf(c.p, 'law_rep') * 3, 60, 8),
        run: (x) => {
          if (!check(x.s, x.p.actual.mor * 0.6 + x.p.actual.int * 0.4 + markOf(x.p, 'law_rep') * 3, 60, 8)) {
            hap(x.p, -10);
            return '청문회에서 20년 전 아파트 다운계약서가 나왔다. 임명동의안이 부결됐다.';
          }
          x.p.jobLevel = 4;
          x.s.fame += 12;
          grant(x.s, '⚖', `대법관: ${fullName(x.p)}`, '대한민국 최고법원의 대법관이 됐다. 전원합의체 판결문에 이름이 남는다.', 'legend');
          return '⚖ 임명동의안 가결! 대법관에 취임했다.';
        },
      },
      { label: '고사한다', run: (x) => (up(x.p, 'mor', 2), '"저는 일선 법원이 맞습니다."') },
    ],
  },
  {
    id: 'lg_chief_justice',
    title: '대법원장 지명',
    ok: (s, p) => p.job === 'judge' && p.jobLevel === 4 && age(s, p) >= 55,
    text: (c) => `대통령이 ${who(c)} 대법관을 대법원장 후보로 지명했다. 사법부의 수장, 임기 6년.`,
    choices: (c) => [
      {
        label: '수락한다',
        odds: checkOdds(c.p.actual.mor * 0.5 + c.p.actual.cha * 0.3 + c.p.actual.int * 0.2 + markOf(c.p, 'favor') * 2, 62, 8),
        run: (x) => {
          if (!check(x.s, x.p.actual.mor * 0.5 + x.p.actual.cha * 0.3 + x.p.actual.int * 0.2 + markOf(x.p, 'favor') * 2, 62, 8)) return '국회 표결에서 몇 표 차로 부결됐다. 대법관으로 남는다.';
          x.p.jobLevel = 5;
          x.s.fame += 25;
          grant(x.s, '🏛', `대법원장: ${fullName(x.p)}`, '삼권의 한 축, 사법부의 수장이 됐다.', 'legend');
          return '🏛 대법원장 취임!';
        },
      },
      { label: '고사한다', run: () => '"그릇이 아닙니다."' },
    ],
  },
  {
    id: 'lg_jeongwan',
    title: '전관 영입 제안',
    ok: (s, p) => (p.job === 'judge' || p.job === 'prosecutor') && p.jobLevel >= 2 && age(s, p) >= 48,
    text: (c) => `대형 로펌이 ${who(c)}에게 손을 내민다. "나오시면 첫해 수임료만 수십억입니다." 이른바 전관예우.`,
    choices: () => [
      {
        label: '옷을 벗고 로펌으로 간다',
        run: (x) => {
          const lv = Math.min(4, x.p.jobLevel + 1);
          setJob(x.p, 'lawyer', lv);
          addFlag(x.p, 'jeongwan');
          x.p.cash += Math.round(20000 * wi(x.s));
          x.s.scandal = Math.min(100, (x.s.scandal ?? 0) + 5);
          return `대형 로펌 ${jobTitle(x.p)} 변호사가 됐다. 영입 보너스 ${formatMoney(Math.round(20000 * wi(x.s)))}. 언론은 "전관예우"라 썼다.`;
        },
      },
      { label: '공직에 남는다', run: (x) => (up(x.p, 'mor', 2), mark(x.p, 'law_rep', 1), '"끝까지 공직자로 남겠습니다."') },
    ],
  },
  // ── 검사 ──
  {
    id: 'lg_special_unit',
    title: '특수부 발탁',
    ok: (_s, p) => p.job === 'prosecutor' && p.jobLevel <= 2 && !hasFlag(p, 'special_unit'),
    text: (c) => `서울중앙지검 특수부(반부패수사부)에서 ${who(c)} 검사를 부른다. 검찰의 꽃. 대신 야근과 정치적 사건이 따라온다.`,
    choices: () => [
      { label: '간다', run: (x) => (addFlag(x.p, 'special_unit'), mark(x.p, 'law_rep', 1), up(x.p, 'int', 2), '특수부 검사가 됐다. 압수수색 박스가 사무실 복도를 메운다.') },
      { label: '형사부에 남는다', run: (x) => (hap(x.p, 3), '민생 사건이 더 좋다. 저녁엔 집에 간다.') },
    ],
  },
  {
    id: 'lg_power_probe',
    title: '살아 있는 권력 수사',
    ok: (_s, p) => p.job === 'prosecutor' && (hasFlag(p, 'special_unit') || p.jobLevel >= 2),
    text: (c) => `${who(c)} 검사의 수사가 대통령 측근의 비리에 닿았다. 법무부에서 전화가 온다. "속도 조절 좀 합시다."`,
    choices: (c) => [
      {
        label: '끝까지 간다',
        odds: checkOdds(c.p.actual.mor * 0.6 + c.p.actual.int * 0.4, 55, 9),
        run: (x) => {
          if (check(x.s, x.p.actual.mor * 0.6 + x.p.actual.int * 0.4, 55, 9)) {
            x.s.fame += 8;
            mark(x.p, 'law_rep', 2);
            addFlag(x.p, 'people_prosecutor');
            return '측근을 구속 기소했다. "국민 검사"라는 별명이 붙었다. 대신 다음 인사에서 지방으로 좌천됐다.';
          }
          hap(x.p, -8);
          return '수사팀이 해체됐다. 지방 고검으로 발령났다.';
        },
      },
      { label: '수위를 조절한다', run: (x) => (mark(x.p, 'favor', 2), tryPromote(x.s.year, x.p, 1) ? `윗선이 만족했다. ${jobTitle(x.p)}(으)로 영전했다.` : '윗선이 만족했다. 다음 인사가 기대된다.') },
    ],
  },
  {
    id: 'lg_gongan',
    title: '공안 사건 지휘',
    ok: (s, p) => p.job === 'prosecutor' && hist(s) && s.year >= 1961 && s.year < 1990,
    text: (c) => `${agencyName(c.s.year)}가 "간첩단"을 잡았다며 피의자를 넘겼다. 조서를 보니 자백 말고는 증거가 없다. 피의자의 손목에 멍이 있다. ${who(c)} 검사가 기소 여부를 정해야 한다.`,
    choices: () => [
      { label: '보강 수사를 지시하고 기소를 미룬다', run: (x) => (up(x.p, 'mor', 5), mark(x.p, 'favor', -2), addFlag(x.p, 'conscience'), '정보부 조정관이 노골적으로 불쾌해했다. 진급 명단에서 이름이 빠졌다.') },
      { label: '그대로 기소한다', run: (x) => (mark(x.p, 'favor', 2), up(x.p, 'mor', -6), addFlag(x.p, 'spy_frameup'), '사형 구형. 신문 1면에 "간첩단 일망타진". 이 사건은 수십 년 뒤 재심에서 다시 열린다.') },
    ],
  },
  {
    id: 'lg_prosecutor_general',
    title: '검찰총장 후보',
    ok: (s, p) => p.job === 'prosecutor' && p.jobLevel === 4 && age(s, p) >= 50,
    text: (c) => `검찰총장후보추천위원회가 ${who(c)} 검사장을 추천했다. 임기 2년, 2천 명 검사의 수장. 인사청문회가 기다린다.`,
    choices: (c) => [
      {
        label: '청문회에 선다',
        odds: checkOdds(c.p.actual.mor * 0.4 + c.p.actual.cha * 0.3 + c.p.actual.int * 0.3 + markOf(c.p, 'law_rep') * 2 + markOf(c.p, 'favor') * 2, 62, 8),
        run: (x) => {
          if (!check(x.s, x.p.actual.mor * 0.4 + x.p.actual.cha * 0.3 + x.p.actual.int * 0.3 + markOf(x.p, 'law_rep') * 2 + markOf(x.p, 'favor') * 2, 62, 8)) return '다른 후보가 지명됐다. 동기가 총장이 되면 옷을 벗는 게 관례다…';
          x.p.jobLevel = 5;
          x.s.fame += 20;
          addFlag(x.p, 'was_top_prosecutor');
          grant(x.s, '🔍', `검찰총장: ${fullName(x.p)}`, '검찰의 수장이 됐다. 퇴임 뒤엔 정치권의 러브콜이 쏟아질 것이다.', 'legend');
          return '🔍 검찰총장 취임!';
        },
      },
      { label: '고사한다', run: () => '"후배들에게 길을 열어 주겠습니다."' },
    ],
  },
  {
    id: 'lg_politics_call',
    title: '정치권의 러브콜',
    ok: (s, p) => (hasFlag(p, 'was_top_prosecutor') || hasFlag(p, 'people_prosecutor') || (p.job === 'judge' && p.jobLevel >= 4) || hasFlag(p, 'rights_lawyer')) && age(s, p) >= 40 && age(s, p) <= 68 && p.job !== 'politician' && p.job !== 'president',
    text: (c) => `여야가 동시에 ${who(c)}에게 공천을 제안한다. "국민이 원하는 건 깨끗한 법조인입니다."`,
    choices: (c) => [
      {
        label: '정치에 뛰어든다 (총선 출마)',
        odds: checkOdds(c.p.actual.cha * 0.6 + c.p.actual.mor * 0.4 + Math.min(15, c.s.fame / 8), 55, 9),
        run: (x) => {
          if (!check(x.s, x.p.actual.cha * 0.6 + x.p.actual.mor * 0.4 + Math.min(15, x.s.fame / 8), 55, 9)) return '낙선. 법조인과 정치인은 다른 직업이었다.';
          setJob(x.p, 'politician');
          x.p.pol = { approval: 55, fund: 0, slush: 0, heat: 0 };
          x.s.fame += 10;
          grant(x.s, '🗳', `국회의원 당선: ${fullName(x.p)}`, '법조인 출신 의원이 됐다.', 'epic');
          return '🗳 당선! 금배지를 달았다.';
        },
      },
      { label: '법조인으로 남는다', run: () => '"정치는 제 길이 아닙니다."' },
    ],
  },
  // ── 변호사 ──
  {
    id: 'lg_public_defender',
    title: '국선 변호',
    ok: (_s, p) => p.job === 'lawyer' && p.jobLevel <= 2,
    text: (c) => `${who(c)} 변호사에게 국선 사건이 왔다. 배고파서 라면을 훔친 청년. 수임료는 몇십만 원.`,
    choices: (c) => [
      { label: '성심껏 변론한다', odds: checkOdds(c.p.actual.int, 50, 10), run: (x) => (check(x.s, x.p.actual.int, 50, 10) ? (up(x.p, 'mor', 3), hap(x.p, 8), mark(x.p, 'law_rep', 1), '선고유예. 청년이 법정 밖에서 고개를 숙였다. 그날 밤 잠이 잘 왔다.') : (hap(x.p, -2), '실형. 청년의 뒷모습이 오래 남았다.')) },
      { label: '대충 처리한다', run: (x) => (up(x.p, 'mor', -2), '서면 한 장으로 끝냈다. 다음 사건이 기다린다.') },
    ],
  },
  {
    id: 'lg_big_case',
    title: '거액 소송 수임',
    ok: (_s, p) => p.job === 'lawyer',
    text: (c) => `대기업이 ${who(c)} 변호사에게 수천억짜리 소송을 맡기려 한다. 상대는 하청 업체들. 이기면 성공보수가 크다.`,
    choices: (c) => [
      { label: '맡는다', odds: checkOdds(c.p.actual.int * 0.7 + c.p.actual.cha * 0.3, 58, 9), run: (x) => (check(x.s, x.p.actual.int * 0.7 + x.p.actual.cha * 0.3, 58, 9) ? ((x.p.cash += Math.round(6000 * wi(x.s))), mark(x.p, 'law_rep', 1), `승소! 성공보수 ${formatMoney(Math.round(6000 * wi(x.s)))}.`) : (hap(x.p, -6), '1심 패소. 의뢰인이 로펌을 바꿨다.')) },
      { label: '하청 업체 쪽을 맡는다', run: (x) => (up(x.p, 'mor', 3), (x.p.cash += Math.round(800 * wi(x.s))), '"골리앗과 싸우는 변호사." 수임료는 적었지만 이름이 났다.') },
    ],
  },
  {
    id: 'lg_rights_case',
    title: '시국 사건 변론',
    ok: (s, p) => p.job === 'lawyer' && hist(s) && s.year >= 1970 && s.year < 1988,
    text: (c) => `노동자·학생들이 줄줄이 구속되는데 변론을 맡겠다는 변호사가 없다. 가족들이 ${who(c)} 변호사 사무실 앞에서 기다린다.`,
    choices: () => [
      { label: '변론을 맡는다', run: (x) => (addFlag(x.p, 'rights_lawyer'), up(x.p, 'mor', 5), (x.s.fame += 3), mark(x.p, 'law_rep', 1), chance(x.s, 0.3) ? (hap(x.p, -8), '사무실에 세무조사가 들이닥쳤다. 그래도 법정에 섰다.') : '법정에서 "이 재판은 역사가 심판할 것"이라고 말했다. 방청석이 술렁였다.') },
      { label: '정중히 거절한다', run: () => '"제겐 지켜야 할 가족이 있습니다."' },
    ],
  },
];

// ───────────────────────── 2) 정보기관 ─────────────────────────

const AGENCY: Story[] = [
  {
    id: 'ag_namsan',
    title: '지하 조사실',
    ok: (s, p) => p.job === 'agent' && hist(s) && s.year < 1988,
    text: (c) => `${agencyName(c.s.year)} 지하 조사실. 상관이 ${who(c)}에게 말한다. "자백을 받아 와. 방법은 묻지 않겠다." 의자에 묶인 대학생이 떨고 있다.`,
    choices: () => [
      { label: '규정대로 조사하겠다고 한다', run: (x) => (up(x.p, 'mor', 5), mark(x.p, 'favor', -2), addFlag(x.p, 'conscience'), '"자네 같은 사람은 여기 안 맞아." 지방 분실로 쫓겨났다. 그래도 거울을 볼 수 있다.') },
      { label: '시키는 대로 한다', run: (x) => (up(x.p, 'mor', -8), mark(x.p, 'favor', 2), addFlag(x.p, 'torturer'), (x.s.scandal = Math.min(100, (x.s.scandal ?? 0) + 8)), hap(x.p, -6), '자백서가 나왔다. 그날 밤 술을 마셔도 잠이 오지 않았다. 이 일은 언젠가 돌아온다.') },
    ],
  },
  {
    id: 'ag_election',
    title: '선거 공작 지시',
    ok: (_s, p) => p.job === 'agent' && p.jobLevel >= 1,
    text: (c) => `윗선에서 내려온 지시: "야당 후보 쪽 동향을 파악하고, 여론을 '관리'하라." ${who(c)}의 팀이 맡는다.`,
    choices: (c) => [
      { label: '지시를 따른다', run: (x) => (mark(x.p, 'favor', 2), mark(x.p, 'spook_heat', 2), up(x.p, 'mor', -4), tryPromote(x.s.year, x.p, 1) ? `공로를 인정받아 ${jobTitle(x.p)}(으)로 승진했다. 서류는 모두 파쇄했다…고 믿는다.` : '윗선이 흡족해했다. 서류는 모두 파쇄했다…고 믿는다.') },
      { label: '못 하겠다고 버틴다', odds: checkOdds(c.p.actual.cha, 55, 10), run: (x) => (check(x.s, x.p.actual.cha, 55, 10) ? (up(x.p, 'mor', 3), '다른 팀이 맡게 됐다. 다행히 문책은 없었다.') : (mark(x.p, 'favor', -3), hap(x.p, -8), '"충성심이 부족하다"는 평가와 함께 한직으로 밀렸다.')) },
    ],
  },
  {
    id: 'ag_north',
    title: '대북 공작',
    ok: (_s, p) => p.job === 'agent',
    text: (c) => `${who(c)}에게 비밀 임무가 떨어졌다. 제3국에서 북측 인사와 접촉해 정보를 빼내야 한다. 실패하면 아무도 당신을 모른다고 할 것이다.`,
    choices: (c) => [
      { label: '임무를 수행한다', odds: checkOdds(c.p.actual.int * 0.6 + c.p.actual.cha * 0.4, 55, 9), run: (x) => (check(x.s, x.p.actual.int * 0.6 + x.p.actual.cha * 0.4, 55, 9) ? (mark(x.p, 'favor', 2), up(x.p, 'int', 2), tryPromote(x.s.year, x.p, 1) ? `임무 성공. 훈장은 금고 속에 보관된다. ${jobTitle(x.p)}(으)로 승진.` : '임무 성공. 훈장은 금고 속에 보관된다. 아무도 모르는 영웅.') : ((x.p.actual.hp = clamp(x.p.actual.hp - 10, 0, 100)), hap(x.p, -10), '접선이 노출됐다. 간신히 빠져나왔지만 동료 하나를 잃었다.')) },
      { label: '병가를 낸다', run: (x) => (mark(x.p, 'favor', -1), '임무는 다른 요원에게 넘어갔다.') },
    ],
  },
  {
    id: 'ag_abroad_op',
    title: '해외 "송환" 작전',
    ok: (s, p) => p.job === 'agent' && p.jobLevel >= 2 && hist(s) && s.year >= 1965 && s.year < 1985,
    text: (c) => `해외에서 정권을 비판하는 망명 정치인이 있다. 위에서 "모셔 오라"는 명령이 내려왔다. 방법은 맡긴다고 한다. ${who(c)}이(가) 작전 책임자다.`,
    choices: () => [
      { label: '작전을 실행한다', run: (x) => (mark(x.p, 'favor', 3), mark(x.p, 'spook_heat', 3), up(x.p, 'mor', -8), (x.s.scandal = Math.min(100, (x.s.scandal ?? 0) + 10)), chance(x.s, 0.5) ? '작전은 성공했지만 외신이 모든 걸 보도했다. 국제적 망신. 그래도 위에서는 "잘했다"고 했다.' : '작전 도중 미국 측이 개입했다. 겨우 목숨은 살렸다. 책임은 아랫사람에게 돌아갔다.') },
      { label: '"할 수 없습니다"', run: (x) => (mark(x.p, 'favor', -4), up(x.p, 'mor', 6), '그날로 보직 해임됐다. 하지만 역사 앞에 떳떳하다.') },
    ],
  },
  {
    id: 'ag_industrial',
    title: '산업 스파이 적발',
    ok: (s, p) => p.job === 'agent' && (!hist(s) || s.year >= 1995),
    text: (c) => `반도체 핵심 기술이 해외로 빠져나간다는 첩보. ${who(c)}의 팀이 추적한다.`,
    choices: (c) => [
      { label: '현장을 덮친다', odds: checkOdds(c.p.actual.int, 55, 10), run: (x) => (check(x.s, x.p.actual.int, 55, 10) ? (mark(x.p, 'favor', 1), (x.s.fame += 2), '공항에서 USB를 압수했다. 수조 원의 기술을 지켰다.') : '한발 늦었다. 범인은 이미 출국했다.') },
      { label: '더 큰 배후를 노린다', odds: checkOdds(c.p.actual.int * 0.5 + c.p.actual.cha * 0.5, 62, 9), run: (x) => (check(x.s, x.p.actual.int * 0.5 + x.p.actual.cha * 0.5, 62, 9) ? (mark(x.p, 'favor', 2), (x.s.fame += 4), tryPromote(x.s.year, x.p, 1) ? `조직 전체를 일망타진! ${jobTitle(x.p)}(으)로 승진.` : '조직 전체를 일망타진!') : (hap(x.p, -5), '눈치챈 조직이 증거를 모두 지웠다.')) },
    ],
  },
  {
    id: 'ag_rival',
    title: '권력 실세와의 암투',
    ok: (_s, p) => p.job === 'agent' && p.jobLevel >= 4,
    text: (c) => `대통령 경호실장이 사사건건 ${agencyName(c.s.year)}를 무시한다. 대통령의 귀를 누가 잡느냐의 싸움이다. ${who(c)}의 입지가 흔들린다.`,
    choices: (c) => [
      { label: '대통령 독대를 늘린다', odds: checkOdds(c.p.actual.cha, 58, 9), run: (x) => (check(x.s, x.p.actual.cha, 58, 9) ? (mark(x.p, 'favor', 2), '"역시 자네밖에 없어." 대통령이 등을 두드렸다.') : (mark(x.p, 'favor', -2), mark(x.p, 'grudge', 2), '독대 자리에서 경호실장이 끼어들었다. 대통령이 경호실장 편을 들었다. 모욕감이 쌓인다.')) },
      { label: '실세의 약점을 캔다', run: (x) => (mark(x.p, 'grudge', 1), mark(x.p, 'spook_heat', 1), '두툼한 파일이 생겼다. 쓸 날이 올까.') },
    ],
  },
];

/** 정보기관 최고 자리 임명 (차장 → 부장/원장) */
const agencyChiefEv: EventDef = {
  id: 'ag_chief',
  title: (c) => `🕶 ${agencyChief(c.s.year)} 내정`,
  valid: (c) => alive(c.p) && c.p.job === 'agent' && c.p.jobLevel === 4,
  text: (c) => `청와대에서 ${who(c)} 차장을 불렀다. "${agencyName(c.s.year)}를 맡아 주게."\n${hist(c.s) && c.s.year < 1988 ? '나라의 2인자 자리다. 정치·경제·언론 모든 정보가 이 책상으로 모인다.' : '국회 인사청문회를 거쳐야 한다.'}`,
  choices: () => [
    {
      label: '맡겠습니다',
      run: (x) => {
        x.p.jobLevel = 5;
        x.s.fame += hist(x.s) && x.s.year < 1988 ? 30 : 15;
        mark(x.p, 'favor', 2);
        grant(x.s, '🕶', `${agencyChief(x.s.year)}: ${fullName(x.p)}`, hist(x.s) && x.s.year < 1988 ? '말단 요원에서 시작해 나라의 2인자가 됐다. 이 자리에서 내려간 사람 중 무사한 이가 드물다.' : '정보기관의 수장이 됐다.', 'legend');
        return `🕶 ${agencyChief(x.s.year)} 취임!`;
      },
    },
    { label: '고사한다', run: () => '"그 자리는 사람을 망칩니다."' },
  ],
};

// ───────────────────────── 3) 하나회 ─────────────────────────

const isKMA = (p: Person) => p.flags.some((f) => f === 'school:육군사관학교') || hasFlag(p, 'kma');

const hanahoeInvite: EventDef = {
  id: 'hanahoe_invite',
  title: () => '🤫 비밀 모임의 초대',
  valid: (c) => alive(c.p) && c.p.job === 'officer' && !hasFlag(c.p, 'hanahoe'),
  text: (c) =>
    `육사 선배가 ${who(c)} ${jobTitle(c.p)}을(를) 조용히 요정으로 불렀다. 장군들 몇이 앉아 있다.\n"자네, 하나회라고 들어 봤나? 기수마다 몇 명만 받는 모임이야. 우리끼리 끌어주고 밀어주지. 요직은 우리가 다 맡네."\n(가입하면 진급·보직이 빨라지지만, 군 안의 사조직이다)`,
  choices: () => [
    {
      label: '충성 서약을 한다',
      run: (x) => {
        addFlag(x.p, 'hanahoe');
        mark(x.p, 'favor', 2);
        up(x.p, 'mor', -3);
        return '선배가 잔을 채웠다. "이제 우린 한 몸이야." 다음 인사에서 수도권 핵심 부대로 발령이 났다.';
      },
    },
    { label: '"군인은 국가에만 충성합니다"', run: (x) => (up(x.p, 'mor', 4), mark(x.p, 'favor', -1), addFlag(x.p, 'refused_hanahoe'), '선배의 얼굴이 굳었다. 그 뒤로 진급 심사 때마다 이상하게 밀린다.') },
  ],
};

const MILITARY: Story[] = [
  {
    id: 'mil_keypost',
    title: '요직 발령',
    ok: (_s, p) => p.job === 'officer' && p.jobLevel >= 5 && !hasFlag(p, 'keypost'),
    text: (c) =>
      `${who(c)} ${jobTitle(c.p)}에게 ${hasFlag(c.p, 'hanahoe') ? '하나회 선배들이 힘을 써' : '인사'} 핵심 보직 제안이 왔다.\n수도경비사령부·보안사령부·특전사령부 — 서울을 쥐는 자리들이다.`,
    choices: () => [
      { label: '보안사령부 (정보를 쥔다)', run: (x) => (addFlag(x.p, 'keypost'), addFlag(x.p, 'post:security'), mark(x.p, 'favor', 1), '군 내부의 모든 정보가 이 책상으로 온다. 장군들의 약점까지.') },
      { label: '수도경비사령부 (서울을 쥔다)', run: (x) => (addFlag(x.p, 'keypost'), addFlag(x.p, 'post:capital'), '청와대·국방부·방송국이 내 병력의 사정거리 안에 있다.') },
      { label: '전방 사단장 (군인의 길)', run: (x) => (up(x.p, 'mor', 3), up(x.p, 'str', 2), '휴전선을 지키러 간다. 정치와는 멀어진다.') },
    ],
  },
  {
    id: 'mil_purge',
    title: '하나회 숙청',
    ok: (s, p) => p.job === 'officer' && hasFlag(p, 'hanahoe') && hist(s) && s.year >= 1993,
    text: (c) => `문민정부 출범 열흘 만에, 대통령이 육군참모총장과 기무사령관을 전격 경질했다. 하나회 숙청이 시작됐다. ${who(c)}의 이름도 명단에 있다.`,
    choices: () => [
      { label: '전역 지원서를 낸다', run: (x) => (setJob(x.p, 'none'), addFlag(x.p, 'purged'), hap(x.p, -15), (x.s.fame = Math.max(0, x.s.fame - 5)), '군복을 벗었다. 30년 군 생활이 한 장의 명단으로 끝났다.') },
      { label: '버텨 본다', run: (x) => (chance(x.s, 0.3) ? (x.p.flags = x.p.flags.filter((f) => f !== 'hanahoe' && f !== 'keypost'), '"하나회 활동은 형식적이었다"는 소명이 받아들여졌다. 한직으로 밀려났지만 군에 남았다.') : (setJob(x.p, 'none'), addFlag(x.p, 'purged'), hap(x.p, -20), '보직 해임 후 강제 전역. 신문에 이름이 실렸다.')) },
    ],
  },
];

// ───────────────────────── 4) 쿠데타 ─────────────────────────

interface CoupData {
  r: number;
  sc: number;
  last?: string;
  /** 거사 주체: 군 / 정보기관 */
  by: 'army' | 'agency';
}

/** 거사의 밑천: 조직·요직·신임·한 맺힘 */
function coupBase(p: Person): number {
  return (hasFlag(p, 'hanahoe') ? 10 : 0) + (hasFlag(p, 'keypost') ? 8 : 0) + (hasFlag(p, 'post:capital') ? 4 : 0) + (hasFlag(p, 'post:security') ? 4 : 0) + Math.min(8, markOf(p, 'favor')) + (p.job === 'agent' && p.jobLevel === 5 ? 6 : 0) + (hasTrait(p, 'leader') ? 4 : 0);
}

export function canCoup(s: GameState, p: Person): boolean {
  if (!darkAge(s) || familyPresident(s) || hasFlag(p, 'coup_tried')) return false;
  const a = age(s, p);
  if (a < 38 || a > 68) return false;
  if (p.job === 'officer') return p.jobLevel >= 6 && (hasFlag(p, 'hanahoe') || hasFlag(p, 'keypost'));
  if (p.job === 'agent') return p.jobLevel === 5;
  return false;
}

const coupChance: EventDef = {
  id: 'coup_chance',
  title: () => '🌑 밤의 결단',
  valid: (c) => alive(c.p) && canCoup(c.s, c.p),
  text: (c) => {
    const army = c.p.job === 'officer';
    const crisis = c.s.year === 1979 || c.s.year === 1980 ? '대통령이 쓰러졌고, 권력에 큰 공백이 생겼다.' : pick(c.s, ['정국이 극도로 혼란하다. 거리에는 연일 시위대가 넘친다.', '대통령의 건강이 나쁘다는 소문이 돈다. 후계 구도가 흔들린다.', '권력 실세들의 다툼이 끝을 향해 간다. 누군가는 먼저 움직일 것이다.']);
    return (
      `${crisis}\n` +
      (army
        ? `${who(c)} ${jobTitle(c.p)}의 집무실에 ${hasFlag(c.p, 'hanahoe') ? '하나회 동기·후배' : '믿을 만한 지휘관'}들이 모였다. "지금이 아니면 기회는 없습니다. 각하께서 결단하시면 병력은 우리가 움직입니다."`
        : `${agencyChief(c.s.year)} ${who(c)}의 금고에는 정권 실세들의 약점이 담긴 파일이 쌓여 있다. 부하 하나가 속삭인다. "부장님이 나서시면 따를 사람이 있습니다."`) +
      `\n\n⚠ 성공하면 정권을 쥔다. 실패하면 반역자로 사형대에 선다. 성공해도 훗날 역사의 심판이 기다린다.\n(거사의 밑천: ${coupBase(c.p) >= 20 ? '탄탄하다' : coupBase(c.p) >= 12 ? '해볼 만하다' : '위험하다'})`
    );
  },
  choices: (c) => [
    {
      label: '🌑 거사를 결행한다',
      run: (x) => {
        addFlag(x.p, 'coup_tried');
        x.s.events.splice(1, 0, { uid: x.s.eventSeq++, defId: 'coup_run', personId: x.p.id, data: { r: 0, sc: 0, by: x.p.job === 'officer' ? 'army' : 'agency' } satisfies CoupData });
        return '돌이킬 수 없는 밤이 시작됐다.';
      },
    },
    { label: '충성을 지킨다', run: (x) => (mark(x.p, 'favor', 1), up(x.p, 'mor', 2), '"없던 이야기로 하지." 모인 이들이 조용히 흩어졌다.') },
    ...(c.p.job === 'officer'
      ? [{ label: '모의 사실을 상부에 보고한다', run: (x: Ctx) => (up(x.p, 'mor', 3), mark(x.p, 'favor', 3), addFlag(x.p, 'coup_tried'), tryPromote(x.s.year, x.p, 2) ? `모의를 고발했다. 동료들이 끌려갔고, ${jobTitle(x.p)}(으)로 진급했다. 등 뒤가 서늘하다.` : '모의를 고발했다. 동료들이 끌려갔다. 등 뒤가 서늘하다.') } as Choice]
      : []),
  ],
};

interface CoupRound {
  title: string;
  text: (d: CoupData, s: GameState) => string;
  opts: { label: string; stat: keyof Person['actual']; need: number; win: number; lose: number; wt: string; lt: string }[];
}
const COUP_ROUNDS: CoupRound[] = [
  {
    title: '1막 · 동지 규합',
    text: (d) => (d.by === 'army' ? '거사 당일 저녁, 연희동 안가. 누가 끝까지 함께할지 확인해야 한다.' : '궁정동 안가의 만찬. 함께 움직일 부하는 몇이나 될까.'),
    opts: [
      { label: '선후배의 의리에 호소한다', stat: 'cha', need: 55, win: 2, lose: 0, wt: '"끝까지 함께하겠습니다." 지휘관들이 잔을 들었다.', lt: '두 명이 자리를 떴다. 그들이 어디로 갔을지 불안하다.' },
      { label: '약점 파일로 입을 묶는다', stat: 'int', need: 58, win: 2, lose: -1, wt: '파일을 본 이들의 얼굴이 하얘졌다. 아무도 배신하지 못한다.', lt: '협박에 반발한 한 명이 정보를 흘렸다.' },
    ],
  },
  {
    title: '2막 · 병력 동원',
    text: (d) => (d.by === 'army' ? '자정. 전방 사단과 공수여단을 서울로 불러야 한다. 지휘 계통을 무시한 출동이다.' : '정보부 요원만으로는 부족하다. 군을 끌어들여야 한다.'),
    opts: [
      { label: '공수부대를 한강 다리로 보낸다', stat: 'str', need: 58, win: 3, lose: -2, wt: '탱크와 장갑차가 행주대교를 건넜다. 서울이 손에 들어왔다.', lt: '한 부대장이 출동을 거부했다. 계획이 어긋났다.' },
      { label: '참모들과 동선을 치밀하게 짠다', stat: 'int', need: 55, win: 2, lose: -1, wt: '방송국·국방부·청와대 길목을 차례로 막았다.', lt: '무전이 감청당했다.' },
    ],
  },
  {
    title: '3막 · 상관 제압',
    text: () => '진압군 쪽 사령관이 반격을 준비한다는 보고. 계엄사령관을 먼저 잡아야 한다.',
    opts: [
      { label: '총장 공관을 급습한다', stat: 'str', need: 60, win: 2, lose: -2, wt: '총성 끝에 계엄사령관을 연행했다.', lt: '경비대의 저항에 막혔다. 사상자가 났다.' },
      { label: '전화로 회유한다', stat: 'cha', need: 60, win: 2, lose: -1, wt: '"대세는 이미 기울었네." 진압군 사령관이 망설이다 물러섰다.', lt: '회유는 통하지 않았다. "반란군과 협상은 없다."' },
    ],
  },
  {
    title: '4막 · 새벽의 방송',
    text: () => '날이 밝는다. 국민과 미국이 이 상황을 어떻게 받아들일지가 남았다.',
    opts: [
      { label: '"국가 안보를 위한 불가피한 조치" 담화', stat: 'cha', need: 56, win: 2, lose: -1, wt: '라디오에서 담화가 흘러나왔다. 사람들은 숨을 죽였다.', lt: '담화가 어색했다. 외신이 "쿠데타"라고 보도한다.' },
      { label: '미 대사관에 밀사를 보낸다', stat: 'int', need: 58, win: 2, lose: -1, wt: '미국이 "질서 회복"을 언급했다. 사실상의 묵인.', lt: '미국이 공개적으로 우려를 표명했다.' },
    ],
  },
];
const COUP_GOAL = 6;

export const coupOdds = (p: Person, o: CoupRound['opts'][number]) => clamp(checkOdds(p.actual[o.stat] + coupBase(p), o.need, 10), 0.1, 0.92);

const coupRun: EventDef = {
  id: 'coup_run',
  title: (c) => `🌑 거사 · ${COUP_ROUNDS[Math.min((c.ev.data as CoupData).r, COUP_ROUNDS.length - 1)].title}`,
  valid: (c) => alive(c.p),
  text: (c) => {
    const d = c.ev.data as CoupData;
    return (d.last ? d.last + '\n\n' : '') + COUP_ROUNDS[d.r].text(d, c.s) + `\n\n(거사 진행도 ${d.sc} / ${COUP_GOAL})`;
  },
  choices: (c) => {
    const d = c.ev.data as CoupData;
    return COUP_ROUNDS[d.r].opts.map(
      (o): Choice => ({
        label: o.label,
        odds: coupOdds(c.p, o),
        run: (x) => {
          const dd = x.ev.data as CoupData;
          const ok = chance(x.s, coupOdds(x.p, o));
          dd.sc += ok ? o.win : o.lose;
          dd.last = ok ? `✅ ${o.wt}` : `❌ ${o.lt}`;
          dd.r++;
          if (dd.r < COUP_ROUNDS.length) return { text: '', keep: true };
          return dd.last + '\n\n' + (dd.sc >= COUP_GOAL ? coupWin(x, dd) : coupFail(x, dd));
        },
      }),
    );
  },
};

function coupWin(x: Ctx, d: CoupData): string {
  const p = x.p;
  const prev = `${p.job}:${p.jobLevel}`;
  setJob(p, 'president');
  addFlag(p, 'president');
  addFlag(p, 'coup_leader');
  addFlag(p, 'coup_pres');
  p.flags = p.flags.filter((f) => !f.startsWith('prev:'));
  p.flags.push('prev:' + prev);
  p.pol = { approval: 35, fund: 0, slush: 30000, heat: 30 };
  x.s.fame += 120;
  x.s.scandal = Math.min(100, (x.s.scandal ?? 0) + 30);
  for (const q of Object.values(x.s.people)) if (alive(q) && !q.inLaw) q.happiness = clamp(q.happiness + (q.actual.mor >= 60 ? -10 : 8), 0, 100);
  grant(x.s, '🌑', `정권 장악: ${fullName(p)}`, `${d.by === 'army' ? '군사반란' : '정보기관의 거사'}으로 권력을 쥐었다. 체육관 선거로 대통령에 올랐다(임기 7년).\n명성 +120 · 비자금 3억 · 지지율 35%\n⚠ 민주화가 오면, 역사가 이 밤을 심판할 것이다.`, 'legend');
  x.s.log.push({ year: x.s.year, text: `🌑 ${fullName(p)}, 거사 성공 · 대통령 취임`, kind: 'achv' });
  return `🌑 거사 성공. ${fullName(p)}이(가) 국가보위 비상대책을 선포하고, 몇 달 뒤 체육관 선거로 대통령에 올랐다.\n거리엔 계엄군이, 신문엔 검열관이 있다. 이 권력의 값은 언젠가 치러야 한다.`;
}

function coupFail(x: Ctx, d: CoupData): string {
  const p = x.p;
  addFlag(p, 'coup_failed');
  addFlag(p, 'criminal');
  // 가문 재산 일부 몰수
  const seized = Math.max(0, Math.round(p.cash * 0.6));
  p.cash -= seized;
  const sp = spouseOf(x.s, p);
  if (sp && alive(sp)) hap(sp, -25);
  const msg = imprison(x.s, p, d.sc >= 3 ? 15 : 20, 60, '내란 수괴 · 사형 선고 후 무기징역으로 감형');
  return `💥 거사 실패. ${d.by === 'army' ? '진압군이 새벽에 사령부를 포위했다.' : '군은 움직이지 않았다. 새벽, 보안사 수사관들이 집 문을 두드렸다.'}\n군사법정은 사형을 선고했고, 몇 년 뒤 무기징역으로 감형됐다.\n${msg}\n재산 ${formatMoney(seized)} 몰수.`;
}

/** 민주화 뒤: 반란 수괴 재판 (1995~1997 역사 바로세우기) */
const coupTrial: EventDef = {
  id: 'coup_trial',
  title: () => '⚖ 역사 바로세우기 — 반란 수괴 재판',
  valid: (c) => alive(c.p) && hasFlag(c.p, 'coup_leader') && !hasFlag(c.p, 'coup_judged'),
  text: (c) => `"성공한 쿠데타도 처벌할 수 있다." 특별법이 만들어지고, 검찰이 ${who(c)} 전 대통령을 반란·내란 수괴 혐의로 구속했다. 수의를 입고 법정에 섰다.`,
  choices: () => [
    {
      label: '법정에서 고개를 숙인다',
      run: (x) => {
        addFlag(x.p, 'coup_judged');
        const fine = Math.round(Math.max(0, x.p.cash) * 0.7);
        x.p.cash -= fine;
        x.s.fame = Math.max(0, x.s.fame - 40);
        return imprison(x.s, x.p, 2, 0, '반란 수괴 · 1심 사형 → 항소심 무기징역 → 2년 뒤 특별사면') + `\n추징금 ${formatMoney(fine)}.`;
      },
    },
    {
      label: '"역사가 평가할 것"이라며 버틴다',
      run: (x) => {
        addFlag(x.p, 'coup_judged');
        const fine = Math.round(Math.max(0, x.p.cash) * 0.9);
        x.p.cash -= fine;
        x.s.fame = Math.max(0, x.s.fame - 60);
        return imprison(x.s, x.p, 2, 0, '반란 수괴 · 무기징역 → 특별사면') + `\n추징금 ${formatMoney(fine)}. "통장에 29만 원뿐"이라는 말이 두고두고 회자됐다.`;
      },
    },
  ],
};

/** 고문·공작에 손을 더럽힌 사람에게 돌아오는 재심·진상규명 */
const truthReturns: EventDef = {
  id: 'truth_returns',
  title: () => '📜 진실의 귀환',
  valid: (c) => alive(c.p),
  text: (c) =>
    `수십 년이 흘렀다. 진실·화해를 위한 과거사정리위원회가 ${hasFlag(c.p, 'spy_frameup') ? '그 "간첩단" 사건' : hasFlag(c.p, 'torturer') ? '남산 지하실의 고문 사건' : hasFlag(c.p, 'yushin_judge') ? '긴급조치 재판' : '그 시절의 공작'}을 다시 들여다본다. 피해자들이 재심에서 무죄를 받았다. 기자들이 ${who(c)}의 집 앞에 섰다.`,
  choices: () => [
    { label: '피해자에게 사죄한다', run: (x) => (up(x.p, 'mor', 6), hap(x.p, 5), (x.s.fame = Math.max(0, x.s.fame - 3)), '피해자 앞에서 무릎을 꿇었다. 용서받지 못했지만, 마음의 짐 하나를 내려놓았다.') },
    { label: '"그땐 다들 그랬다"', run: (x) => ((x.s.fame = Math.max(0, x.s.fame - 10)), hap(x.p, -6), (x.s.scandal = Math.min(100, (x.s.scandal ?? 0) + 6)), '가문 이름이 기사에 실렸다. 손주가 학교에서 그 기사를 봤다.') },
  ],
};

// ───────────────────────── 등록 · 해마다 ─────────────────────────

const toEv = (d: Story): EventDef => ({ id: d.id, title: () => d.title, text: d.text, choices: (c) => gate(c.s, d.choices(c)), valid: (c) => alive(c.p) && d.ok(c.s, c.p) });

export const POWER_EVENTS: EventDef[] = [lawPath, judgeApply, agencyChiefEv, hanahoeInvite, coupChance, coupRun, coupTrial, truthReturns, ...[...LEGAL, ...AGENCY, ...MILITARY].map(toEv)];

/** 해마다: 법조 경력·정보기관·군 사조직·쿠데타의 흐름 */
export function powerYear(s: GameState): string[] {
  const msgs: string[] = [];
  for (const p of Object.values(s.people)) {
    if (!alive(p) || hasFlag(p, 'in_prison')) continue;
    if (['lawyer', 'prosecutor', 'judge'].includes(p.job)) mark(p, 'law_y', 1);
    if (!isMainline(s, p) || p.inLaw) continue;
    const a = age(s, p);
    // 법조경력 5년 → 판사 임용 공고 (법조일원화, 2013~). 그 전엔 연수원에서 바로 임관
    if (['lawyer', 'prosecutor'].includes(p.job) && (!hist(s) || s.year >= 2013) && lawYears(p) >= 5 && a <= 55 && !pending(s, 'judge_apply', p) && s.year - (seen(s, 'ja:' + p.id) ?? -99) >= 3 && chance(s, hasFlag(p, 'clerk') ? 0.6 : 0.25)) {
      see(s, 'ja:' + p.id);
      q(s, 'judge_apply', p);
    }
    // 정보기관 차장 → 부장(원장)
    if (p.job === 'agent' && p.jobLevel === 4 && a >= 45 && !pending(s, 'ag_chief', p) && chance(s, clamp(0.08 + markOf(p, 'favor') * 0.03, 0.05, 0.4))) q(s, 'ag_chief', p);
    // 하나회 초대: 근현대사, 1963~1992, 육사 출신 위관·영관
    if (p.job === 'officer' && hist(s) && s.year >= 1963 && s.year < 1993 && isKMA(p) && p.jobLevel <= 4 && !hasFlag(p, 'hanahoe') && !hasFlag(p, 'refused_hanahoe') && !pending(s, 'hanahoe_invite', p) && p.actual.int + p.actual.cha >= 100 && chance(s, 0.2)) q(s, 'hanahoe_invite', p);
    // 쿠데타: 권력의 공백기(1979~80)엔 자주, 그 밖엔 드물게
    if (canCoup(s, p) && !pending(s, 'coup_chance', p) && !pending(s, 'coup_run', p) && chance(s, s.year === 1979 || s.year === 1980 ? 0.7 : 0.08 + Math.min(0.15, markOf(p, 'grudge') * 0.04))) q(s, 'coup_chance', p);
    // 역사의 심판
    if (hasFlag(p, 'coup_leader') && !hasFlag(p, 'coup_judged') && hist(s) && s.year >= 1995 && p.job !== 'president' && !pending(s, 'coup_trial', p)) q(s, 'coup_trial', p);
    if ((hasFlag(p, 'torturer') || hasFlag(p, 'spy_frameup') || hasFlag(p, 'yushin_judge')) && hist(s) && s.year >= 2005 && !hasFlag(p, 'truth_seen') && chance(s, 0.3)) {
      addFlag(p, 'truth_seen');
      q(s, 'truth_returns', p);
    }
    // 이야기
    const pool = [...LEGAL, ...AGENCY, ...MILITARY].filter((d) => d.ok(s, p) && s.year - (seen(s, p.id + ':' + d.id) ?? -99) >= (d.id === 'mil_purge' ? 99 : 5));
    if (pool.length && chance(s, p.id === s.headId ? 0.45 : 0.2)) {
      const d = pick(s, pool);
      see(s, p.id + ':' + d.id);
      q(s, d.id, p);
    }
  }
  return msgs;
}

/** 정보기관 직급 이름 (그 시대) */
export function agentTitle(lv: number, year: number): string {
  return ['요원', '조정관', '과장', '단장', '차장', agencyChief(year)][lv] ?? '요원';
}

