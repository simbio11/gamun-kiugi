// 🎓 명문대·과학기술원·해외 대학 캠퍼스 이야기: 들어가기 힘든 만큼 열리는 길도 다르다.
//  · 과학기술원(KAST·POSTEK·UNISTEK): 학부 연구생, 창업 동아리, 반도체 계약학과(졸업 후 입사 보장), 교환학생
//  · 해외 대학: 향수병, 차별, 실리콘밸리 인턴, 졸업 뒤 현지 취업(OPT) vs 귀국, 학비 부담
//  · 국내 최상위 대학: 동아리 인맥, 고시반, 고액 과외 알바, 대기업 조기 리크루팅
//  · 졸업 전에 받은 입사 제안(offer:)은 졸업하는 해에 자동으로 입사로 이어진다.
//
// 참고: KAIST·POSTECH 반도체 계약학과(삼성전자·SK하이닉스 채용 연계, 2023~), 미국 OPT(졸업 후 최대 1년, STEM 3년) 제도,
//   국내 대학 고시반(행정·사법·회계), 교육부 해외 유학생 통계(미국 유학생 약 4만 명).
import { chance, int, pick } from './rng';
import { gate, setJob, type Choice, type Ctx, type EventDef } from './ev-util';
import { addFlag, age, alive, check, clamp, fullName, isMainline, mark } from './people';
import { COMPANY_BY_ID, pickCompany, setCompany, TIER_NAME, type Company } from './companies';
import { formatMoney } from './economy';
import { JOBS } from './data';
import { wageIndex } from './pay';
import type { GameState, Person } from './types';

const hp = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));
const nm = (c: Ctx) => fullName(c.p);
const W = (s: GameState, v: number) => Math.max(1, Math.round(v * wageIndex(s.year)));
const school = (p: Person) => p.flags.filter((f) => f.startsWith('school:')).pop()?.slice(7) ?? '대학';
const ch = (c: Ctx, list: (Choice | false | undefined)[]) => gate(c.s, list.filter((x): x is Choice => !!x));
/** 입사 제안 저장: offer:<job>:<회사 id 또는 이름>:<급> */
function offer(p: Person, job: string, c: Company) {
  p.flags = p.flags.filter((f) => !f.startsWith('offer:'));
  p.flags.push(`offer:${job}:${c.tier}:${COMPANY_BY_ID[c.id] ? c.id : c.name}`);
}
const isStem = (p: Person) => p.flags.some((f) => /^major:(cs|ee|eng|math|phys|chem|bio|stats|ai|mech)/.test(f));

// ───── 과학기술원 ─────
const KS_LAB: EventDef = {
  id: 'cp_lab',
  title: () => '🔬 학부 연구생 모집',
  text: (c) => `${school(c.p)} ${nm(c)}의 전공 교수님이 연구실 학부 연구생을 뽑는다. 새벽까지 실험하는 대학원생 선배들의 눈 밑이 검다.`,
  choices: (c) =>
    ch(c, [
      { label: '연구실에 들어간다', run: (x) => (mark(x.p, 'study', 2), (x.p.papers = (x.p.papers ?? 0) + (check(x.s, x.p.actual.int, 70, 8) ? 1 : 0)), (x.p.actual.int = clamp(x.p.actual.int + 2, 0, 100)), addFlag(x.p, 'ug_research'), x.p.papers ? '학부생 공저자로 논문에 이름이 올랐다! 대학원 진학 길이 활짝 열렸다.' : '논문은 아직이지만 연구가 뭔지 알았다.') },
      { label: '동아리·대외활동에 집중한다', run: (x) => (mark(x.p, 'network', 2), hp(x.p, 6), '해커톤에서 상을 받았다. 연락처가 수십 개 늘었다.') },
    ]),
};
const KS_STARTUP: EventDef = {
  id: 'cp_startup',
  title: () => '🚀 창업 동아리',
  text: (c) => `기숙사 옆방 친구가 ${nm(c)}을(를) 불렀다. "우리 이거 앱으로 만들면 대박 날 것 같지 않냐?" 학교 창업지원단이 사무실을 내준다.`,
  choices: (c) =>
    ch(c, [
      { label: '휴학하고 올인한다', run: (x) => (check(x.s, x.p.actual.int * 0.5 + x.p.actual.cha * 0.5, 62, 10) ? (addFlag(x.p, 'campus_startup'), mark(x.p, 'network', 2), hp(x.p, 8), '시드 투자 1억을 받았다! 졸업하면 창업가로 바로 나선다.') : (hp(x.p, -8), '6개월 만에 접었다. 그래도 실패에서 배운 게 많다.')) },
      { label: '학업과 병행한다', run: (x) => (mark(x.p, 'network', 1), (x.p.actual.cha = clamp(x.p.actual.cha + 2, 0, 100)), '주말마다 피칭 연습. 발표 실력이 늘었다.') },
      { label: '공부에 집중한다', run: () => '지금은 학점이 먼저다.' },
    ]),
};
const KS_CONTRACT: EventDef = {
  id: 'cp_contract',
  title: () => '🏭 반도체 계약학과 제안',
  text: (c) => {
    const co = c.ev.data.co as Company;
    return `${co.name}에서 장학금과 졸업 후 입사를 보장하는 계약학과 자리를 제안했다. 등록금 전액 지원, 대신 졸업하면 몇 년은 그 회사에서 일해야 한다.`;
  },
  choices: (c) => {
    const co = c.ev.data.co as Company;
    return ch(c, [
      { label: '계약한다 (등록금 지원 + 입사 보장)', run: (x) => (offer(x.p, 'chip_engineer', co), (x.p.flags = x.p.flags.filter((f) => !f.startsWith('tuition:'))), x.p.flags.push('tuition:0'), hp(x.p, 6), `${co.name} 입사가 예약됐다. 동기들이 부러워한다.`) },
      { label: '내 길은 내가 찾는다', run: () => '자유를 택했다. 졸업 후 진로는 열려 있다.' },
    ]);
  },
};
const KS_EXCHANGE: EventDef = {
  id: 'cp_exchange',
  title: () => '✈ 교환학생',
  text: (c) => `${nm(c)}이(가) ${pick(c.s, ['미국 서부', '스위스', '싱가포르', '네덜란드', '일본 도쿄'])}의 대학 교환학생에 뽑혔다. 한 학기, 생활비는 집에서 보태야 한다.`,
  choices: (c) =>
    ch(c, [
      { label: '간다', cost: 800, run: (x) => (addFlag(x.p, 'abroad'), (x.p.actual.int = clamp(x.p.actual.int + 2, 0, 100)), (x.p.actual.cha = clamp(x.p.actual.cha + 2, 0, 100)), hp(x.p, 10), '세상이 넓다는 걸 알았다. 외국인 친구들과 아직도 연락한다.') },
      { label: '돈이 아깝다', run: () => '한국에서 학기를 마쳤다.' },
    ]),
};

// ───── 해외 대학 ─────
const AB_HOME: EventDef = {
  id: 'cp_homesick',
  title: () => '🌙 향수병',
  text: (c) => `${school(c.p)} 기숙사, 새벽 세 시. ${nm(c)}은(는) 엄마가 끓여 준 김치찌개가 미치도록 먹고 싶다. 수업 토론에서 한마디도 못 한 날이었다.`,
  choices: (c) =>
    ch(c, [
      { label: '가족에게 영상통화를 건다', run: (x) => (hp(x.p, 6), (x.p.affinity = clamp(x.p.affinity + 6, -100, 100)), '엄마 얼굴을 보자 눈물이 났다. "힘들면 언제든 와."') },
      { label: '한인 학생회에 나간다', run: (x) => (mark(x.p, 'network', 1), hp(x.p, 4), '같은 처지의 친구들이 생겼다. 라면 파티가 열렸다.') },
      { label: '이를 악물고 영어로 버틴다', run: (x) => (check(x.s, x.p.actual.mor, 50, 10) ? ((x.p.actual.cha = clamp(x.p.actual.cha + 3, 0, 100)), '한 학기 뒤, 토론 시간에 손을 드는 사람이 됐다.') : (hp(x.p, -8), '번아웃이 왔다. 상담 센터에 다니기 시작했다.')) },
    ]),
};
const AB_INTERN: EventDef = {
  id: 'cp_intern',
  title: () => '💼 빅테크 인턴 면접',
  text: (c) => {
    const co = c.ev.data.co as Company;
    return `${co.name} 여름 인턴십 최종 면접. 화이트보드 코딩 문제가 나왔다. 합격하면 졸업 후 정규직 제안이 거의 확실하다.`;
  },
  choices: (c) => {
    const co = c.ev.data.co as Company;
    return ch(c, [
      { label: '침착하게 푼다', run: (x) => (check(x.s, x.p.actual.int, 70, 8) ? (offer(x.p, isStem(x.p) ? 'developer' : 'analyst', co), addFlag(x.p, 'abroad_offer'), hp(x.p, 12), `🎉 합격! 인턴을 마치자 ${co.name}에서 졸업 후 정규직 제안이 왔다.`) : (hp(x.p, -6), '마지막 문제에서 막혔다. 내년에 다시.')) },
      { label: '긴장해서 포기한다', run: (x) => (hp(x.p, -3), '면접장 앞에서 돌아섰다.') },
    ]);
  },
};
const AB_STAY: EventDef = {
  id: 'cp_stay',
  title: () => '🗽 졸업 뒤, 남을까 돌아갈까',
  text: (c) => `${school(c.p)} 졸업이 코앞이다. 현지에 남아 일하면(취업 비자) 연봉이 한국의 두 배. 하지만 부모님은 늙어 가고, 비자는 매년 추첨이다.`,
  choices: (c) =>
    ch(c, [
      { label: '현지에 남는다', run: (x) => {
        if (!check(x.s, x.p.actual.int * 0.6 + x.p.actual.cha * 0.4, 62, 9)) return (hp(x.p, -6), '비자 추첨에서 떨어졌다. 귀국 비행기 표를 끊었다.');
        if (!x.p.flags.some((f) => f.startsWith('offer:'))) offer(x.p, isStem(x.p) ? 'developer' : 'analyst', pickCompany(x.s, x.p, isStem(x.p) ? 'developer' : 'analyst', 'global'));
        addFlag(x.p, 'abroad_work');
        hp(x.p, 6);
        return '비자를 받았다. 현지 회사에서 첫 출근을 준비한다. 부모님은 공항에서 오래 손을 흔들었다.';
      } },
      { label: '한국으로 돌아간다', run: (x) => (mark(x.p, 'network', 1), (x.p.affinity = clamp(x.p.affinity + 8, -100, 100)), '귀국했다. "해외파"라는 이력이 이력서에서 빛난다.') },
    ]),
};
const AB_RACISM: EventDef = {
  id: 'cp_racism',
  title: () => '😠 낯선 시선',
  text: (c) => `카페에서 ${nm(c)}의 이름을 일부러 틀리게 부르며 킥킥거리는 무리가 있다. 처음이 아니다.`,
  choices: (c) =>
    ch(c, [
      { label: '당당하게 바로잡는다', run: (x) => (check(x.s, x.p.actual.cha, 50, 10) ? ((x.p.actual.mor = clamp(x.p.actual.mor + 2, 0, 100)), hp(x.p, 4), '"제 이름은 이렇게 읽어요." 조용해졌다. 옆자리 학생이 엄지를 들었다.') : (hp(x.p, -6), '말이 꼬였다. 집에 와서 한참 울었다.')) },
      { label: '학교에 신고한다', run: (x) => (hp(x.p, 2), '학교가 공식 사과와 교육 프로그램을 약속했다.') },
    ]),
};

// ───── 국내 최상위 대학 ─────
const TU_CLUB: EventDef = {
  id: 'cp_club',
  title: () => '🤝 명문대 동아리',
  text: (c) => `${school(c.p)}의 오래된 ${pick(c.s, ['경제학회', '투자 동아리', '토론 동아리', '창업 학회', '오케스트라'])}. 선배 명단에 장관·CEO 이름이 수두룩하다.`,
  choices: (c) =>
    ch(c, [
      { label: '열심히 활동한다', run: (x) => (mark(x.p, 'network', 3), hp(x.p, 4), '선배들이 "우리 회사 와라"며 명함을 준다. 인맥이 평생 간다.') },
      { label: '학점 관리에 집중한다', run: (x) => ((x.p.actual.int = clamp(x.p.actual.int + 2, 0, 100)), '장학금을 탔다.') },
    ]),
};
const TU_GOSI: EventDef = {
  id: 'cp_gosi',
  title: () => '📚 고시반 입실 시험',
  text: (c) => `${school(c.p)} 고시반(행정·사법·회계) 입실 시험 공고가 붙었다. 붙으면 독서실과 선배 멘토링이 공짜다.`,
  choices: (c) =>
    ch(c, [
      { label: '응시한다', run: (x) => (check(x.s, x.p.actual.int, 68, 8) ? (addFlag(x.p, 'gosi_room'), mark(x.p, 'study', 2), '입실 합격! 고시 준비에 날개를 달았다 (국가고시 점수 +).') : (hp(x.p, -4), '떨어졌다. 혼자 공부하기로 했다.')) },
      { label: '고시는 내 길이 아니다', run: () => '다른 길을 보기로 했다.' },
    ]),
};
const TU_TUTOR: EventDef = {
  id: 'cp_tutor',
  title: () => '💰 고액 과외 제안',
  text: (c) => `"${school(c.p)} 학생이죠? 우리 애 수학 좀 봐 줄래요?" 강남 학부모의 연락. 시급이 일반 알바의 다섯 배다.`,
  choices: (c) =>
    ch(c, [
      { label: '한다', run: (x) => { const v = W(x.s, int(x.s, 600, 1500)); x.p.cash += v; return `학기 내내 과외. ${formatMoney(v)}을(를) 모았다. 학생 성적도 올랐다.`; } },
      { label: '공부에 방해된다', run: (x) => ((x.p.actual.int = clamp(x.p.actual.int + 1, 0, 100)), '거절했다.') },
    ]),
};
const TU_RECRUIT: EventDef = {
  id: 'cp_recruit',
  title: () => '🏢 조기 리크루팅',
  text: (c) => {
    const co = c.ev.data.co as Company;
    return `졸업반 ${nm(c)}에게 ${co.name} 인사팀이 먼저 연락했다. ${TIER_NAME[co.tier]}. "졸업 전에 계약하시면 입사 보너스도 드립니다."`;
  },
  choices: (c) => {
    const co = c.ev.data.co as Company;
    const job = c.ev.data.job as string;
    return ch(c, [
      { label: `${co.name} 입사를 확정한다`, run: (x) => (offer(x.p, job, co), hp(x.p, 8), `졸업과 동시에 ${co.name} ${JOBS[job]?.name ?? ''}(으)로 입사한다.`) },
      { label: '더 큰 꿈이 있다', run: () => '정중히 거절했다. 졸업 후 진로는 직접 고른다.' },
    ]);
  },
};

export const CAMPUS_EVENTS: EventDef[] = [KS_LAB, KS_STARTUP, KS_CONTRACT, KS_EXCHANGE, AB_HOME, AB_INTERN, AB_STAY, AB_RACISM, TU_CLUB, TU_GOSI, TU_TUTOR, TU_RECRUIT];

/** 해마다: 재학생에게 캠퍼스 이야기 + 졸업한 사람의 입사 제안 처리 */
export function campusYear(s: GameState): string[] {
  const out: string[] = [];
  const seen = (s.storySeen ??= {});
  for (const p of Object.values(s.people)) {
    if (!alive(p)) continue;
    // 졸업했고 입사 제안이 있다 → 입사
    const of = p.flags.find((f) => f.startsWith('offer:'));
    if (of && !p.flags.includes('student')) {
      const [, job, tier, ...rest] = of.split(':');
      const key = rest.join(':');
      p.flags = p.flags.filter((f) => f !== of);
      if (JOBS[job] && (p.job === 'none' || p.job === 'parttime')) {
        setJob(p, job);
        const co: Company = COMPANY_BY_ID[key] ?? { id: `${tier}:${key}`, name: key, tier: tier as Company['tier'], field: 'all', blurb: '' };
        setCompany(p, co);
        p.flags = p.flags.filter((f) => !f.startsWith('cojob:'));
        p.flags.push('cojob:' + job, 'offer_taken:' + s.year);
        if (isMainline(s, p)) out.push(`🎓→🏢 ${fullName(p)} 졸업과 동시에 ${co.name} 입사 (${JOBS[job].name})`);
      }
      continue;
    }
    // 창업 동아리 출신: 졸업하면 창업가로
    if (p.flags.includes('campus_startup') && !p.flags.includes('student') && p.job === 'none') {
      p.flags = p.flags.filter((f) => f !== 'campus_startup');
      setJob(p, 'founder');
      p.flags.push('offer_taken:' + s.year);
      if (isMainline(s, p)) out.push(`🚀 ${fullName(p)} 졸업과 동시에 창업 (캠퍼스 스타트업)`);
      continue;
    }
    if (!p.flags.includes('student') || !isMainline(s, p) || s.events.length > 5) continue;
    if (s.year - (seen['cp:' + p.id] ?? -99) < 1 || !chance(s, 0.55)) continue;
    const kaist = p.flags.includes('kaist');
    const abroad = p.flags.includes('abroad_grad');
    const top = p.flags.includes('univ_top');
    const gradYear = Number(p.flags.find((f) => f.startsWith('grad:'))?.slice(5) ?? 0);
    const last = gradYear && gradYear - s.year <= 1;
    const pool: [string, number, Record<string, unknown>?][] = [];
    const once = (id: string) => !seen[id + ':' + p.id];
    if (kaist) {
      if (once('cp_lab')) pool.push(['cp_lab', 1]);
      if (once('cp_startup')) pool.push(['cp_startup', 0.8]);
      if (once('cp_contract') && (p.flags.includes('major:ee') || p.flags.includes('major:cs') || p.flags.includes('major:phys'))) pool.push(['cp_contract', 1, { co: pickCompany(s, p, 'chip_engineer', 'S') }]);
      if (once('cp_exchange')) pool.push(['cp_exchange', 0.6]);
    }
    if (abroad) {
      if (once('cp_homesick')) pool.push(['cp_homesick', 1]);
      if (once('cp_racism')) pool.push(['cp_racism', 0.5]);
      if (once('cp_intern') && age(s, p) >= 20) pool.push(['cp_intern', 1, { co: pickCompany(s, p, isStem(p) ? 'developer' : 'analyst', 'global') }]);
      if (last && once('cp_stay')) pool.push(['cp_stay', 3]);
    }
    if (top && !kaist && !abroad) {
      if (once('cp_club')) pool.push(['cp_club', 1]);
      if (once('cp_gosi') && !isStem(p)) pool.push(['cp_gosi', 0.8]);
      if (once('cp_tutor')) pool.push(['cp_tutor', 0.7]);
    }
    if ((top || kaist) && last && once('cp_recruit') && !p.flags.some((f) => f.startsWith('offer:'))) {
      const job = isStem(p) ? (p.flags.includes('major:cs') ? 'developer' : 'researcher') : 'corp';
      pool.push(['cp_recruit', 2, { co: pickCompany(s, p, job, p.actual.int >= 75 ? 'S' : 'A'), job }]);
    }
    if (!pool.length) continue;
    const tot = pool.reduce((t, x) => t + x[1], 0);
    let r = (int(s, 0, 9999) / 10000) * tot;
    const [id, , data] = pool.find((x) => (r -= x[1]) <= 0) ?? pool[pool.length - 1];
    seen['cp:' + p.id] = s.year;
    seen[id + ':' + p.id] = s.year;
    s.events.push({ uid: s.eventSeq++, defId: id, personId: p.id, data: data ?? {} });
  }
  return out;
}
