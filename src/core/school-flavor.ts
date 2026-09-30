// 학년마다 같은 선택지만 반복되지 않게: 올해의 분위기 한 줄 + 학년·학교·성적·동네에 따라 열리는 특별한 한 해.
import type { Choice, Ctx } from './ev-util';
import type { GameState, Person, StatKey } from './types';
import { chance, pick } from './rng';
import { age, check, clamp, discoverTalent, hasFlag, mark } from './people';
import { hoodOf } from './housing';
import { addStudy, standing, standingChange } from './school';
import { TALENTS } from './data';
import { histMood } from './histpack';

/** 화면을 다시 그려도 바뀌지 않게, 사람·해마다 고정된 무작위 */
function hnum(key: string): number {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return Math.abs(h);
}
const hpick = <T>(arr: T[], key: string): T => arr[hnum(key) % arr.length];

const BAND_LINES: [number, number, string[]][] = [
  [8, 9, ['받아쓰기 시험이 시작됐다. 맞춤법이 영 엉망이다.', '짝꿍이 바뀌었다며 하루 종일 그 얘기다.', '학교 앞 문방구가 아지트가 됐다.', '구구단을 외우느라 목이 쉬었다.', '줄넘기 급수 따기에 온 반이 난리다.']],
  [10, 11, ['반에서 휴대폰 없는 애가 거의 없다.', '수학에 분수가 나오면서 갑자기 어려워졌다.', '학원 가방이 책가방보다 무겁다.', '반에 유행하는 게임 캐릭터를 모르면 대화에 못 낀다.', '처음으로 수학 단원평가에서 반 평균이 공개됐다.']],
  [12, 13, ['사춘기의 문턱. 거울 보는 시간이 늘었다.', '중학교 선행을 안 하면 늦는다는 말이 학부모 단톡방을 돈다.', '6학년 수학여행 방 배정에 목숨을 건다.', '졸업 앨범 사진에 신경을 쓴다.']],
  [14, 14, ['중학교 1학년, 자유학년제라 시험이 없다.', '교복이 아직 한 치수 크다.', '처음 보는 과목 선생님들이 무섭다.', '동아리 가입 신청서를 들고 고민한다.']],
  [15, 15, ['말수가 줄고 방문이 자주 닫힌다. 중2다.', '"중2병"이라는 말에 발끈한다.', '첫 중간고사 성적표에 등수가 찍혔다.', '친구 관계가 세상의 전부다.']],
  [16, 16, ['고등학교 원서 얘기가 오간다.', '특목고 설명회 전단이 우편함에 쌓인다.', '내신이 고입에 들어간다는 걸 이제 깨달았다.', '중학교 마지막 해. 졸업식 날짜가 벌써 나왔다.']],
  [17, 17, ['첫 모의고사 성적표가 나왔다. 중학교 때와 다르다.', '내신 5등급제의 쓴맛을 봤다.', '야자 시간에 몰래 휴대폰을 본다.', '고등학교 급식이 유일한 낙이다.']],
  [18, 18, ['선택과목을 골라야 한다. 진로가 벌써 정해져야 한단다.', '생기부 세특을 챙기라는 말을 매일 듣는다.', '수시냐 정시냐, 담임 상담이 잡혔다.', '친구들이 하나둘 기숙학원 얘기를 한다.']],
  [19, 19, ['교실 뒤에 수능 D-day 달력이 걸렸다.', '6월 모의평가가 코앞이다.', '수시 원서 6장을 어디에 쓸지 밤마다 고민한다.', '고3 교실은 조용하다. 연필 소리만 들린다.']],
];

/** 올해의 분위기 한 줄 (학년 + 처지) */
export function yearMood(s: GameState, p: Person): string {
  const hm = histMood(s, p);
  if (hm) return hm;
  const a = age(s, p);
  const band = BAND_LINES.find(([lo, hi]) => a >= lo && a <= hi);
  const lines: string[] = band ? [...band[2]] : [];
  const st = standing(p);
  const hood = hoodOf(s, p).hood;
  if (st.grade <= 2) lines.push('반에서 1~2등을 다툰다. 선생님들이 기대를 건다.', '성적표를 받아 오는 발걸음이 가볍다.');
  if (st.grade >= 7) lines.push('수업을 따라가기 벅차다. 교과서가 외계어 같단다.', '성적표를 가방 깊숙이 숨겨 왔다.');
  if (p.happiness < 30) lines.push('요즘 부쩍 웃음이 줄었다. 밥도 깨작거린다.');
  if (hood === 'elite' || hood === 'rich') lines.push('반 친구들 절반이 이미 두 학년 선행 중이다.', '학원가 셔틀버스가 줄을 선다.');
  if (hood === 'poor' || hood === 'modest') lines.push('친구들은 학원에 가는데 {n}은 지역아동센터로 간다.', '집이 좁아 공부는 도서관에서 한다.');
  if (hasFlag(p, 'high_art') || hasFlag(p, 'high_sport')) lines.push('실기 연습에 하루가 다 간다.');
  if (hasFlag(p, 'high_meister') || hasFlag(p, 'high_voc')) lines.push('실습실 기계 소리에 익숙해졌다. 자격증 시험이 다가온다.');
  if (hasFlag(p, 'high_sci')) lines.push('기숙사 불이 새벽 두 시까지 꺼지지 않는다.');
  return hpick(lines.length ? lines : ['새 학년이 시작됐다.'], p.id + ':' + s.year).replace('{n}', p.name);
}

interface Special {
  label: string;
  cost: number;
  show: (s: GameState, p: Person, a: number) => boolean;
  run: (x: Ctx) => string;
}

const up = (p: Person, k: StatKey, n: number) => (p.actual[k] = clamp(p.actual[k] + n, 0, Math.max(p.potential[k], p.actual[k])));
const happy = (p: Person, n: number) => (p.happiness = clamp(p.happiness + n, 0, 100));
/** 공부량을 바꾸고 성적 변화를 한 줄로 */
function study(x: Ctx, n: number): string {
  const before = standing(x.p);
  addStudy(x.s, x.p, n);
  return `\n성적: ${standingChange(before, x.p)}.`;
}
const spent = (p: Person, v: number) => (p.eduSpent = (p.eduSpent ?? 0) + v);
const noVoc = (p: Person) => !hasFlag(p, 'high_voc') && !hasFlag(p, 'high_meister');

const SPECIALS: Special[] = [
  // ── 초등 ──
  { label: '방과후 교실 + 태권도', cost: 150, show: (_s, _p, a) => a <= 10, run: (x) => {
    mark(x.p, 'sport', 1); up(x.p, 'str', 2); happy(x.p, 4); spent(x.p, 150);
    return pick(x.s, ['노란 띠에서 빨간 띠까지! 기합 소리가 우렁차졌다.', '방과후 로봇 교실에서 만든 자동차를 자랑한다.', '품새 대회에서 동메달. 목에 걸고 잤다.']) + study(x, 1);
  } },
  { label: '영재교육원 시험 준비', cost: 400, show: (_s, p, a) => a >= 9 && a <= 13 && !hasFlag(p, 'gifted_center') && p.actual.int >= 45, run: (x) => {
    spent(x.p, 400);
    if (check(x.s, x.p.actual.int, 60, 10)) {
      x.p.flags.push('gifted_center'); mark(x.p, 'study', 2);
      return '🌟 교육청 영재교육원 합격! 토요일마다 실험하러 간다. 생기부에 한 줄이 생겼다.' + study(x, 4);
    }
    return '💦 창의적 문제해결력 시험에서 떨어졌다. 그래도 문제 푸는 재미를 알았다.' + study(x, 2);
  } },
  { label: '해외 어학연수 1년 (캐나다·필리핀)', cost: 3000, show: (s, p, a) => a >= 10 && a <= 14 && !hasFlag(p, 'abroad_kid') && ['rich', 'elite', 'middle'].includes(hoodOf(s, p).hood), run: (x) => {
    x.p.flags.push('abroad_kid'); mark(x.p, 'network', 1); up(x.p, 'cha', 3); happy(x.p, 5); spent(x.p, 3000);
    return pick(x.s, ['1년 만에 돌아온 {n}의 발음이 달라졌다. 대신 한국 수학 진도를 놓쳤다.', '홈스테이 가족과 눈물의 작별. 영어로 꿈을 꾼단다.']).replace('{n}', x.p.name) + study(x, -1);
  } },
  { label: '중학교 수학 선행 (1년치)', cost: 1500, show: (s, p, a) => a >= 11 && a <= 13 && hoodOf(s, p).hood !== 'poor', run: (x) => {
    spent(x.p, 1500); happy(x.p, -5); mark(x.p, 'study', 1);
    return pick(x.s, ['방정식을 초등학생이 푼다. 대신 놀이터에서 사라졌다.', '선행 진도는 빠른데, 기초 연산에서 자꾸 실수한다.']) + study(x, 5);
  } },
  // ── 중학교 ──
  { label: '자유학년제: 진로 체험에 몰두', cost: 50, show: (_s, _p, a) => a === 14, run: (x) => {
    spent(x.p, 50); happy(x.p, 6);
    const t = x.p.talents.find((t) => !t.discovered);
    const found = t && chance(x.s, 0.4);
    if (found) discoverTalent(x.p, t!.id);
    return pick(x.s, ['방송국·병원·소방서 직업 체험을 다녔다.', '진로 체험으로 제과점에서 빵을 구웠다.', '코딩 캠프에서 게임을 하나 만들었다.']) + (found ? ` ✨ [${TALENTS[t!.id].name}] 재능이 보인다!` : '') + study(x, 0);
  } },
  { label: '사춘기: 간섭하지 않고 믿어 준다', cost: 0, show: (_s, _p, a) => a === 15, run: (x) => {
    if (check(x.s, x.p.actual.mor, 45, 10)) {
      happy(x.p, 7); x.p.affinity = clamp(x.p.affinity + 6, -100, 100); mark(x.p, 'warmth', 1);
      return '🌟 잔소리를 줄였더니 오히려 먼저 말을 걸어 온다. 알아서 공부 계획표를 짰다.' + study(x, 2);
    }
    happy(x.p, 4); mark(x.p, 'risk', 1);
    return '💦 믿고 뒀더니 PC방에서 살았다. 성적표를 보고 둘 다 말이 없었다.' + study(x, -4);
  } },
  { label: '특목고·자사고 대비반', cost: 2000, show: (_s, p, a) => a === 16 && standing(p).grade <= 3, run: (x) => {
    spent(x.p, 2000); happy(x.p, -6); mark(x.p, 'study', 2);
    return pick(x.s, ['자기소개서와 면접 준비로 방학이 사라졌다.', '대비반 모의 면접에서 "왜 우리 학교냐"는 질문에 말문이 막혔다.']) + study(x, 6);
  } },
  { label: '기술을 배워 일찍 사회로 (특성화고 탐방)', cost: 0, show: (_s, p, a) => a === 16 && standing(p).grade >= 5, run: (x) => {
    mark(x.p, 'cert', 1); happy(x.p, 5);
    return '마이스터고·특성화고 설명회에 다녀왔다. 졸업하자마자 취업한 선배 얘기에 눈이 반짝였다.' + study(x, 0);
  } },
  // ── 고등학교 (인문계) ──
  { label: '생기부 관리 (수행평가·세특·탐구 보고서)', cost: 300, show: (_s, p, a) => a >= 17 && a <= 18 && noVoc(p), run: (x) => {
    spent(x.p, 300); mark(x.p, 'study', 2); mark(x.p, 'honest', 1); if (!hasFlag(x.p, 'club')) x.p.flags.push('club');
    return pick(x.s, ['탐구 보고서 주제로 "우리 동네 미세먼지"를 골랐다. 세특에 두 줄이 붙었다.', '발표 수행평가 때마다 손을 들었다. 선생님이 이름을 기억한다.', '독서록이 서른 권을 넘겼다. 면접 때 할 얘기가 생겼다.']) + study(x, 2);
  } },
  { label: '내신 올인 (학교 시험만 판다)', cost: 600, show: (_s, p, a) => a >= 17 && a <= 18 && noVoc(p), run: (x) => {
    spent(x.p, 600); happy(x.p, -4); mark(x.p, 'study', 1);
    return pick(x.s, ['기출문제를 열 번씩 돌렸다. 선생님 말투까지 외웠다.', '시험 기간엔 급식 줄에서도 단어장을 본다.']) + study(x, 5);
  } },
  { label: '밴드·댄스 동아리 공연', cost: 50, show: (_s, _p, a) => a >= 16 && a <= 18, run: (x) => {
    spent(x.p, 50); mark(x.p, 'art', 2); up(x.p, 'cha', 2); happy(x.p, 8); if (!hasFlag(x.p, 'club')) x.p.flags.push('club');
    return pick(x.s, ['축제 무대에서 앵콜이 나왔다. 인생 최고의 3분.', '공연 영상이 학교 SNS에서 조회수 1만을 넘겼다.', '박자를 놓쳤지만 친구들과 끝까지 웃었다.']) + study(x, -2);
  } },
  { label: '수학·과학 올림피아드 도전', cost: 300, show: (_s, p, a) => a >= 15 && a <= 18 && p.actual.int >= 55 && !hasFlag(p, 'olympiad'), run: (x) => {
    spent(x.p, 300);
    if (check(x.s, x.p.actual.int, 68, 10)) {
      x.p.flags.push('olympiad'); mark(x.p, 'study', 2); x.s.fame += 1;
      return '🌟 한국수학올림피아드 은상! 대학 입학처가 주목하는 이력이 생겼다.' + study(x, 3);
    }
    return '💦 2차 시험에서 떨어졌다. 어려운 문제에 몇 시간씩 매달리는 법은 배웠다.' + study(x, 2);
  } },
  // ── 고3 ──
  { label: '정시 올인 (수능만 판다)', cost: 1500, show: (_s, p, a) => a === 19 && noVoc(p), run: (x) => {
    spent(x.p, 1500); happy(x.p, -8); x.p.flags.push('jeongsi');
    return pick(x.s, ['내신은 버렸다. 새벽 여섯 시 독서실 첫 입장.', '모의고사 오답 노트가 다섯 권이 됐다.']) + study(x, 8);
  } },
  { label: '수시 올인 (자소서·면접 준비)', cost: 400, show: (_s, p, a) => a === 19 && noVoc(p), run: (x) => {
    spent(x.p, 400); mark(x.p, 'study', 1); mark(x.p, 'network', 1); mark(x.p, 'honest', 1);
    return pick(x.s, ['면접 스터디를 꾸렸다. 거울 앞에서 매일 1분 자기소개.', '학생부를 처음부터 다시 읽으며 내 이야기를 정리했다.']) + study(x, 2);
  } },
  { label: '고3이지만 건강부터', cost: 100, show: (_s, _p, a) => a === 19, run: (x) => {
    spent(x.p, 100); up(x.p, 'hp', 3); happy(x.p, 5);
    return '저녁마다 30분 걷고 12시 전에 잤다. 오히려 집중력이 좋아졌다.' + study(x, 3);
  } },
  // ── 예체능·특목·특성화 ──
  { label: '입시 실기 레슨 (1:1)', cost: 1800, show: (_s, p, a) => a >= 16 && (hasFlag(p, 'high_art') || hasFlag(p, 'high_sport')), run: (x) => {
    spent(x.p, 1800); const art = hasFlag(x.p, 'high_art');
    mark(x.p, art ? 'art' : 'sport', 2); up(x.p, art ? 'cha' : 'str', 3); happy(x.p, -2);
    return (art ? pick(x.s, ['레슨 선생님이 "이제 소리가 나온다"고 했다.', '실기곡을 하루 여덟 시간씩 연습했다.']) : pick(x.s, ['기록이 0.3초 줄었다.', '코치가 전국체전 엔트리를 언급했다.'])) + study(x, 0);
  } },
  { label: '전국대회·콩쿠르 출전', cost: 300, show: (_s, p, a) => a >= 15 && (hasFlag(p, 'high_art') || hasFlag(p, 'high_sport') || hasFlag(p, 'club')), run: (x) => {
    spent(x.p, 300);
    const k = hasFlag(x.p, 'high_sport') ? 'str' : 'cha';
    if (check(x.s, x.p.actual[k], 60, 10)) {
      x.s.fame += 1; mark(x.p, k === 'str' ? 'sport' : 'art', 2); happy(x.p, 8); x.p.flags.push('award');
      return '🌟 전국대회 입상! 지역 신문에 이름이 실렸다.' + study(x, 0);
    }
    happy(x.p, -3);
    return '💦 예선 탈락. 무대 뒤에서 한참 울었다. 내년을 기약한다.' + study(x, 0);
  } },
  { label: '국가기술자격증 따기', cost: 100, show: (_s, p, a) => a >= 16 && !noVoc(p), run: (x) => {
    spent(x.p, 100); mark(x.p, 'cert', 2); x.p.flags.push('cert');
    return pick(x.s, ['전기기능사 실기 합격! 선배들이 부러워한다.', '용접 기능사를 땄다. 손에 화상 자국이 훈장처럼 남았다.', '컴퓨터활용능력 1급에 정보처리기능사까지.']) + study(x, 0);
  } },
  { label: '현장실습 (기업 연계)', cost: 0, show: (_s, p, a) => a >= 18 && !noVoc(p), run: (x) => {
    mark(x.p, 'intern', 1); x.p.cash += 300; up(x.p, 'str', 1);
    return pick(x.s, ['공장 라인에서 석 달 일했다. 첫 월급으로 부모님 선물을 샀다.', '실습 나간 회사에서 "졸업하면 오라"는 말을 들었다.']) + study(x, 0);
  } },
  { label: '해외 대학 준비 (SAT·AP)', cost: 2500, show: (_s, p, a) => a >= 17 && (hasFlag(p, 'high_lang') || hasFlag(p, 'abroad_kid')), run: (x) => {
    spent(x.p, 2500); mark(x.p, 'study', 1); up(x.p, 'cha', 1); x.p.flags.push('sat_prep');
    return pick(x.s, ['SAT 1500점을 넘겼다. 에세이 주제로 이민 간 사촌 얘기를 썼다.', 'AP 과목 네 개. 밤마다 미국 대학 입학처 홈페이지를 본다.']) + study(x, 3);
  } },
  // ── 처지 ──
  { label: '1년 쉬어 가기 (상담·휴식)', cost: 100, show: (_s, p) => p.happiness < 30, run: (x) => {
    spent(x.p, 100); happy(x.p, 16); x.p.affinity = clamp(x.p.affinity + 5, -100, 100);
    return '학원을 다 끊고 상담을 받았다. 주말엔 같이 산에 갔다. 얼굴에 다시 웃음이 돌아왔다.' + study(x, -2);
  } },
  { label: '지역아동센터 + 무료 인강 + 장학금 도전', cost: 0, show: (s, p) => ['poor', 'modest'].includes(hoodOf(s, p).hood), run: (x) => {
    mark(x.p, 'study', 1); mark(x.p, 'thrift', 1);
    if (check(x.s, x.p.actual.mor, 45, 10)) {
      x.p.cash += 200; x.p.flags.push('scholar');
      return '🌟 EBS 인강을 두 바퀴 돌렸다. 구청 장학금 200만 원을 받았다!' + study(x, 5);
    }
    return '센터 선생님이 숙제를 봐 줬다. 조금씩 나아지고 있다.' + study(x, 3);
  } },
  { label: '대치동 입시 컨설팅', cost: 5000, show: (s, p, a) => a >= 16 && ['rich', 'elite'].includes(hoodOf(s, p).hood), run: (x) => {
    spent(x.p, 5000); mark(x.p, 'study', 2); mark(x.p, 'network', 1); happy(x.p, -4);
    return pick(x.s, ['컨설턴트가 생기부 로드맵을 짜 줬다. 동아리부터 독서 목록까지.', '"이 학생은 스토리가 약해요." 컨설턴트의 한마디에 봉사 동아리를 새로 만들었다.']) + study(x, 4);
  } },
];

/** 올해 열리는 특별한 선택지 (최대 3개, 사람·해마다 다르게) */
export function specialChoices(s: GameState, p: Person): Choice[] {
  const a = age(s, p);
  const open = SPECIALS.filter((sp) => sp.show(s, p, a));
  // 매해 같은 조합이 되지 않도록 해시로 섞어 3개만
  const key = p.id + ':' + s.year;
  const picked = [...open].sort((x, y) => hnum(key + x.label) - hnum(key + y.label)).slice(0, 3);
  return picked.map((sp) => ({ label: `✦ ${sp.label}`, cost: sp.cost ? Math.round((sp.cost * (sp.cost >= 300 ? hoodOf(s, p).cost : 1)) / 10) * 10 : undefined, run: sp.run }));
}

/** 기본 계획의 결과 한 줄 (계획·결과마다 여러 가지) */
const PLAN_LINES: Record<number, [string[], string[]]> = {
  0: [['학원 셔틀에서 저녁을 먹는 한 해였다. 그래도 문제집이 쌓였다.', '학원 레벨 테스트에서 한 반 올라갔다.'], ['학원만 다섯 군데. 숙제에 치여 졸기 일쑤였다.', '학원 가는 척 PC방에 간 날이 많았다.']],
  1: [['과외 선생님과 합이 잘 맞았다. 약점이 메워졌다.', '일주일 내내 과외와 학원. 성적은 올랐는데 눈빛이 지쳤다.'], ['돈을 쏟아부었는데 성적이 제자리다. 과외 선생님만 세 번 바꿨다.', '과외 시간에 멍하니 창밖만 본다.']],
  2: [['스스로 계획표를 짜서 인강을 끝까지 들었다.', '강의 배속을 1.5배로 올리고 오답 노트를 만들었다.'], ['인강 진도율 12%. 결제한 강의가 쌓여 간다.', '인강을 틀어 놓고 잠들었다.']],
  3: [['운동장에서 살았다. 체력이 좋아지니 수업 집중도 잘 된다.', '대회에 나가 메달을 땄다.'], ['운동하고 오면 곯아떨어진다.', '부상으로 한 달을 쉬었다.']],
  4: [['학원 발표회에서 박수를 받았다.', '선생님이 소질이 있다고 했다.'], ['연습이 지루하다며 몰래 빠졌다.', '재능은 있는데 연습을 안 한다는 말을 들었다.']],
  5: [['봉사 시간이 쌓이고, 동아리 회장이 됐다.', '유기견 보호소 봉사를 꾸준히 다녔다.'], ['봉사 시간 채우기에 급급했다.', '동아리 친구들과 놀기만 했다.']],
  6: [['실컷 놀았다. 얼굴이 환하다.', '친구들과 한강에서 자전거를 탔다. 이런 해도 필요하다.'], ['너무 놀았나. 성적표를 보고 조금 후회했다.', '게임 레벨은 올랐는데 성적은 내려갔다.']],
  7: [['연애하며 서로 공부를 봐 줬다.', '설레는 한 해였다.'], ['연애에 정신이 팔렸다.', '헤어지고 한동안 방황했다.']],
  8: [['알바로 번 돈을 모아 갖고 싶던 걸 샀다.', '사장님이 성실하다며 시급을 올려 줬다.'], ['알바하느라 수업 시간에 졸았다.', '진상 손님 때문에 울면서 퇴근했다.']],
};

export function planLine(s: GameState, i: number, better: boolean): string {
  const pool = PLAN_LINES[i];
  return pool ? pick(s, pool[better ? 0 : 1]) : '';
}
