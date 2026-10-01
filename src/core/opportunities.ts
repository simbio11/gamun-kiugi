// 올해의 기회: 해마다 다른 5개가 열리는 한정 행동. 인생 단계·길·형편에 맞는 것 중에서 해마다 돌아가며 뜬다.
import type { ActionDef, Stage } from './actions';
import type { GameState, Person, StatKey } from './types';
import { chance, int, pick } from './rng';
import { fmt, grow, rollTier, stat, TIER_MARK, type Delta, type Tier } from './practice';
import { addFlag, age, alive, clamp, hasFlag, head, mark, parentsOf, spouseOf } from './people';
import { JOBS } from './data';
import { schedule } from './ev-util';
import { addBargains } from './realty';
import { formatMoney } from './economy';

const h = head;
const mood = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));
const working = (s: GameState) => !['none', 'parttime', 'pension'].includes(h(s).job) && !h(s).flags.includes('student');
const ADULT: Stage[] = ['univ', 'prep', 'adult', 'senior'];

interface Opp {
  id: string;
  icon: string;
  name: string;
  desc: string;
  ap?: number;
  cost?: number;
  stages: Stage[];
  when?: (s: GameState) => boolean;
  stat: StatKey;
  lines: Record<Tier, string[]>;
  eff: (s: GameState, p: Person, t: Tier) => Delta[];
  /** 키우는 관심 분야 (적성에 맞으면 💡) */
  fit?: string;
}

const L = (great: string[], good: string[], meh: string[], bad: string[]): Record<Tier, string[]> => ({ great, good, meh, bad });
const ok = (t: Tier) => t === 'great' || t === 'good';

const OPPS: Opp[] = [
  // ── 어른 ──
  {
    id: 'o_conference', icon: '🎤', name: '업계 컨퍼런스 참가', desc: '인맥↑ 지능↑ · 운 좋으면 좋은 자리 제안', cost: 50, stages: ['adult'], when: working, stat: 'cha',
    lines: L(['쉬는 시간에 말을 건 사람이 업계 거물이었다. 명함을 주고받았다.'], ['세션 두 개가 딱 필요한 내용이었다. 노트가 빼곡하다.'], ['점심 도시락이 제일 기억에 남는다.'], ['자리를 잘못 앉아 하루 종일 영업 전화만 받았다.']),
    eff: (s, p, t) => (ok(t) && mark(p, 'network', t === 'great' ? 2 : 1), [stat('int', grow(s, p, 'int', t)), stat('cha', t === 'great' ? grow(s, p, 'cha', 'good') : 0)]),
  },
  {
    id: 'o_contest', icon: '🏆', name: '사내 아이디어 공모전', desc: '입상하면 상금과 윗선 눈도장', stages: ['adult'], when: working, stat: 'int',
    lines: L(['대상! 사장님이 직접 상을 줬다.'], ['장려상. 팀장이 어깨를 두드렸다.'], ['예선 통과까지만.'], ['발표 날 노트북이 꺼졌다.']),
    eff: (s, p, t) => {
      const prize = t === 'great' ? 500 : t === 'good' ? 100 : 0;
      p.cash += prize;
      if (t === 'great') s.fame += 1;
      return [...(prize ? [`상금 ${formatMoney(prize)}`] : []), stat('int', grow(s, p, 'int', t))];
    },
  },
  {
    id: 'o_cert', icon: '📜', name: '자격증 단기 도전 (공인중개사·전산세무 등)', desc: '합격하면 이력서 한 줄 · 이직·부업에 유리', cost: 60, stages: ADULT, stat: 'int',
    lines: L(['한 번에 합격! 합격 문자를 캡처해 뒀다.'], ['턱걸이 합격.'], ['1차만 붙었다. 2차는 내년에.'], ['시험장에서 졸았다.']),
    eff: (s, p, t) => (ok(t) && (mark(p, 'cert', 1), addFlag(p, 'cert')), [stat('int', grow(s, p, 'int', t))]),
  },
  {
    id: 'o_headhunt', icon: '💼', name: '헤드헌터 연락: 이직 면접', desc: '붙으면 직급 한 단계↑ · 경력 2년 이상, 최근 3년 안에 옮기지 않았을 때', stages: ['adult'],
    when: (s) => working(s) && age(s, h(s)) >= 28 && age(s, h(s)) <= 55 && h(s).jobYears >= 2 && s.year - Number(h(s).flags.find((f) => f.startsWith('hop:'))?.slice(4) ?? -99) >= 3, stat: 'cha',
    lines: L(['연봉 협상까지 완벽했다. 한 직급 높여 옮겼다.'], ['최종 합격했는데 지금 회사가 연봉을 올려 주며 붙잡았다.'], ['최종 면접에서 떨어졌다. 그래도 몸값은 확인했다.'], ['면접 전날 과음. 기억이 없다.']),
    eff: (s, p, t) => {
      p.flags = p.flags.filter((f) => !f.startsWith('hop:'));
      p.flags.push('hop:' + s.year);
      if (t === 'great') {
        p.jobLevel = Math.min(JOBS[p.job].maxLevel, p.jobLevel + 1);
        p.jobYears = 0;
        return ['직급 +1'];
      }
      if (t === 'good') {
        const bonus = Math.round(JOBS[p.job].perLevel * 0.4);
        p.cash += bonus;
        return [`카운터 오퍼 ${formatMoney(bonus)}`];
      }
      mood(p, -4);
      return [['행복', -4]];
    },
  },
  {
    id: 'o_subscription', icon: '🎟', name: '아파트 특별공급 청약', desc: '당첨되면 시세보다 싼 분양 매물이 뜬다 (무주택 · 확률 낮음)', stages: ['adult'], when: (s) => h(s).home?.type !== 'own', stat: 'int',
    lines: L(['당첨!!! 떨리는 손으로 계약서를 받았다.'], ['예비 번호 3번… 기다려 보자.'], ['낙첨.'], ['서류 하나를 빠뜨려 부적격 처리됐다.']),
    eff: (s) => {
      const win = chance(s, 0.12);
      if (win) {
        const [l] = addBargains(s, 1);
        l.price = Math.round(l.price * 0.8);
        return [`→ 자산 탭 매물에 분양가 ${formatMoney(l.price)} 매물 추가`];
      }
      return ['낙첨'];
    },
  },
  {
    id: 'o_culture', icon: '🎨', name: '문화센터 강좌 (그림·기타·도예)', desc: '매력↑ 행복↑', cost: 20, stages: ADULT, stat: 'cha',
    lines: L(['작품이 수강생 전시회에 걸렸다.'], ['주말이 기다려진다.'], ['생각보다 어렵다.'], ['첫날 도자기를 깨뜨렸다.']),
    eff: (s, p, t) => (mark(p, 'art', 1), mood(p, t === 'bad' ? 1 : 5), [stat('cha', grow(s, p, 'cha', t)), ['행복', t === 'bad' ? 1 : 5]]),
  },
  {
    id: 'o_money_class', icon: '📈', name: '재테크 강의 (연금·ETF·절세)', desc: '지능↑ · 알뜰한 습관', cost: 10, stages: ADULT, stat: 'int',
    lines: L(['연금저축과 IRP를 정리했더니 세액공제가 늘었다.'], ['ETF가 뭔지 이제 안다.'], ['강사가 결국 상품을 팔았다.'], ['유료 리딩방 가입 권유만 받았다.']),
    eff: (s, p, t) => (ok(t) && mark(p, 'thrift', 1), [stat('int', grow(s, p, 'int', t))]),
  },
  {
    id: 'o_parents_trip', icon: '🧳', name: '부모님 모시고 효도 여행', desc: '부모님 관계↑ · 효심', cost: 300, stages: ['adult'], when: (s) => parentsOf(s, h(s)).some(alive), stat: 'cha',
    lines: L(['엄마가 "이런 데 처음 와 본다"며 사진을 백 장 찍었다.'], ['온천에서 아빠와 오랜만에 긴 얘기를 했다.'], ['부모님 무릎이 아파 많이 못 걸었다.'], ['비행기가 결항돼 공항에서 하루를 보냈다.']),
    eff: (s, p, t) => {
      for (const q of parentsOf(s, p).filter(alive)) q.affinity = clamp(q.affinity + (t === 'bad' ? 3 : 8), -100, 100);
      mark(p, 'filial', 1);
      mood(p, 4);
      return [['부모님 관계', t === 'bad' ? 3 : 8], ['행복', 4]];
    },
  },
  {
    id: 'o_cooking', icon: '🍳', name: '부부 요리 교실', desc: '부부 금슬↑', cost: 20, stages: ['adult', 'senior'], when: (s) => !!spouseOf(s, h(s)) && alive(spouseOf(s, h(s))!), stat: 'cha',
    lines: L(['둘이 만든 파스타가 레스토랑 수준이었다.'], ['앞치마 입은 서로를 보고 한참 웃었다.'], ['소금과 설탕을 헷갈렸다.'], ['누가 칼질을 못한다고 다퉜다.']),
    eff: (s, p, t) => {
      const q = spouseOf(s, p)!;
      const d = t === 'bad' ? -2 : t === 'meh' ? 3 : 7;
      p.bond = q.bond = clamp((p.bond ?? 60) + d, 0, 100);
      return [['금슬', d]];
    },
  },
  {
    id: 'o_adopt', icon: '🐕', name: '유기견 입양 박람회', desc: '가족 행복↑ · 대신 양육비 월 16만 (반려견이 없을 때)', stages: ['adult', 'senior'], when: (s) => !hasFlag(h(s), 'pet') && h(s).home?.type !== undefined, stat: 'cha',
    lines: L(['눈이 마주친 순간 알았다. 우리 식구다.'], ['조용한 믹스견을 데려왔다.'], ['첫날 밤새 낑낑거렸다.'], ['첫날 소파를 물어뜯었다. 그래도 가족이다.']),
    eff: (s, p) => {
      addFlag(p, 'pet');
      schedule(s, int(s, 12, 16), 'pet_farewell', p.id);
      mood(p, 6);
      return ['반려견 입양', ['행복', 6]];
    },
  },
  {
    id: 'o_book', icon: '📚', name: '책 출간 제안', desc: '인세와 명성 (명성이 쌓였거나 똑똑하면)', stages: ['adult', 'senior'], when: (s) => s.fame >= 25 || h(s).actual.int >= 70, stat: 'int',
    lines: L(['베스트셀러 매대에 올랐다! 사인회가 잡혔다.'], ['2쇄를 찍었다.'], ['초판이 조용히 팔렸다.'], ['원고 마감을 세 번 미뤘다. 출판사가 연락을 끊었다.']),
    eff: (s, p, t) => {
      const royalty = { great: 2000, good: 500, meh: 100, bad: 0 }[t];
      p.cash += royalty;
      if (ok(t)) s.fame += t === 'great' ? 3 : 1;
      return [...(royalty ? [`인세 ${formatMoney(royalty)}`] : []), stat('int', grow(s, p, 'int', t))];
    },
  },
  {
    id: 'o_local', icon: '🗳', name: '주민자치회 활동', desc: '명성↑ 인맥↑', stages: ['adult', 'senior'], stat: 'cha',
    lines: L(['동네 공원 리모델링 안건을 통과시켰다. 이웃들이 알아본다.'], ['회의록 정리를 도맡았다.'], ['회의가 너무 길다.'], ['주차 문제로 이웃과 언성이 높아졌다.']),
    eff: (s, p, t) => (ok(t) && ((s.fame += 1), mark(p, 'network', 1)), [['명성', ok(t) ? 1 : 0], stat('cha', grow(s, p, 'cha', t))]),
  },
  // ── 학생 ──
  {
    id: 'o_science_camp', icon: '🔭', name: '과학관 캠프', desc: '지능↑ · 과학에 흥미', cost: 20, stages: ['elem'], stat: 'int',
    lines: L(['망원경으로 토성 고리를 봤다! 꿈이 천문학자로 바뀌었다.'], ['로켓을 만들어 쐈다.'], ['버스에서 멀미를 했다.'], ['캠프 첫날 열이 났다.']),
    eff: (s, p, t) => (ok(t) && mark(p, 'study', 1), [stat('int', grow(s, p, 'int', t))]),
  },
  {
    id: 'o_recital', icon: '🎹', name: '교내 음악회 무대', desc: '매력↑ · 무대 경험', stages: ['elem', 'teen'], stat: 'cha',
    lines: L(['앵콜이 나왔다!'], ['틀리지 않고 끝까지 쳤다.'], ['긴장해서 한 소절을 건너뛰었다.'], ['무대 공포증으로 울면서 내려왔다.']),
    eff: (s, p, t) => (mark(p, 'art', 1), [stat('cha', grow(s, p, 'cha', t))]),
  },
  {
    id: 'o_essay', icon: '📝', name: '글짓기 대회', desc: '지능↑ · 입상하면 생기부', stages: ['elem', 'teen'], stat: 'int',
    lines: L(['교육감상! 교장 선생님이 조회 시간에 이름을 불렀다.'], ['학교 대표로 뽑혔다.'], ['참가상.'], ['원고지를 두고 왔다.']),
    eff: (s, p, t) => (ok(t) && (mark(p, 'study', 1), addFlag(p, 'club')), [stat('int', grow(s, p, 'int', t))]),
  },
  {
    id: 'o_scout', icon: '🏕', name: '국토대장정·청소년 캠프', desc: '체력↑ 도덕성↑', cost: 30, stages: ['teen', 'univ'], stat: 'str',
    lines: L(['물집 잡힌 발로 끝까지 걸었다. 표정이 달라졌다.'], ['평생 친구를 만났다.'], ['다리가 너무 아팠다.'], ['일사병으로 중간에 돌아왔다.']),
    eff: (s, p, t) => [stat('str', grow(s, p, 'str', t)), stat('mor', grow(s, p, 'mor', t === 'bad' ? 'meh' : t))],
  },
  {
    id: 'o_exchange', icon: '✈', name: '교환학생 지원', desc: '매력↑ 인맥↑ · 스펙 (대학생)', cost: 800, stages: ['univ'], when: (s) => !hasFlag(h(s), 'exchange'), stat: 'int',
    lines: L(['선발! 한 학기를 유럽에서 보냈다. 세계가 넓어졌다.'], ['합격. 기숙사 룸메이트가 평생 친구가 됐다.'], ['어학 점수가 모자라 떨어졌다.'], ['서류 마감을 놓쳤다.']),
    eff: (s, p, t) => {
      if (ok(t)) {
        addFlag(p, 'exchange');
        mark(p, 'network', 1);
        return ['교환학생 이력', stat('cha', grow(s, p, 'cha', t))];
      }
      p.cash += 700; // 떨어지면 준비 비용 대부분은 안 든다
      return ['비용 대부분 환불'];
    },
  },
  {
    id: 'o_coding', icon: '💻', name: '어린이 코딩 대회', desc: '지능↑ · 입상하면 생기부', cost: 10, stages: ['elem', 'teen'], stat: 'int',
    lines: L(['만든 게임이 대상을 받았다! 친구들이 줄 서서 해 본다.'], ['본선 진출.'], ['버그를 못 잡았다.'], ['제출 버튼을 안 눌렀다.']),
    eff: (s, p, t) => (ok(t) && (mark(p, 'study', 1), addFlag(p, 'club')), [stat('int', grow(s, p, 'int', t))]),
  },
  {
    id: 'o_garden', icon: '🌱', name: '학교 텃밭 가꾸기', desc: '도덕성↑ 행복↑', stages: ['little', 'elem'], stat: 'mor',
    lines: L(['방울토마토를 수확해 반 친구들과 나눠 먹었다.'], ['상추가 쑥쑥 자랐다.'], ['물 주는 걸 자꾸 잊었다.'], ['주말 사이 새가 다 먹었다.']),
    eff: (s, p, t) => (mood(p, 4), mark(p, 'kind', 1), [stat('mor', grow(s, p, 'mor', t)), ['행복', 4]]),
  },
  {
    id: 'o_orchestra', icon: '🎻', name: '청소년 오케스트라 오디션', desc: '매력↑ · 합격하면 정기 공연', cost: 30, stages: ['elem', 'teen'], stat: 'cha',
    lines: L(['합격! 첫 정기 공연에서 바이올린 2열에 앉았다.'], ['예비 단원이 됐다.'], ['떨어졌다. 내년에 다시.'], ['오디션 곡을 잘못 준비해 갔다.']),
    eff: (s, p, t) => (ok(t) && (mark(p, 'art', 2), addFlag(p, 'club')), [stat('cha', grow(s, p, 'cha', t))]),
  },
  {
    id: 'o_mun', icon: '🌐', name: '모의 UN·토론 캠프', desc: '매력↑ 지능↑ · 인맥', cost: 40, stages: ['teen'], stat: 'cha',
    lines: L(['최우수 대표상! 영어로 결의안을 발표했다.'], ['다른 학교 친구들과 밤새 토론했다.'], ['발언 기회를 한 번밖에 못 얻었다.'], ['영어가 안 나와 얼어붙었다.']),
    eff: (s, p, t) => (ok(t) && mark(p, 'network', 1), [stat('cha', grow(s, p, 'cha', t)), stat('int', grow(s, p, 'int', t === 'great' ? 'good' : 'meh'))]),
  },
  {
    id: 'o_econ_camp', icon: '🪙', name: '어린이 경제 캠프', desc: '지능↑ · 용돈 관리 습관', cost: 10, stages: ['elem'], stat: 'int',
    lines: L(['모의 장터에서 1등 매출! 사장님 소리를 들었다.'], ['용돈 기입장을 쓰기 시작했다.'], ['물건값을 너무 싸게 불렀다.'], ['장터 돈을 잃어버렸다.']),
    eff: (s, p, t) => (ok(t) && mark(p, 'thrift', 1), [stat('int', grow(s, p, 'int', t))]),
  },
  {
    id: 'o_volunteer_abroad', icon: '🌍', name: '해외 봉사단 (2주)', desc: '도덕성↑ 매력↑ · 인맥', cost: 150, stages: ['univ', 'adult'], stat: 'mor',
    lines: L(['캄보디아 학교 짓기. 아이들이 이름을 불러 줬다.'], ['우물을 팠다. 손바닥에 물집이 잡혔다.'], ['덥고 힘들었다.'], ['배탈이 나서 절반을 누워 있었다.']),
    eff: (s, p, t) => (ok(t) && mark(p, 'kind', 2), [stat('mor', grow(s, p, 'mor', t)), stat('cha', grow(s, p, 'cha', t === 'great' ? 'good' : 'meh'))]),
  },
  {
    id: 'o_language', icon: '🗣', name: '외국어 집중 과정 (3개월)', desc: '지능↑ 매력↑ · 해외 기회', cost: 200, stages: ['univ', 'prep', 'adult'], stat: 'int',
    lines: L(['토익 950! 해외 지사 파견 후보에 올랐다.'], ['원어민과 대화가 편해졌다.'], ['단어는 늘었는데 입이 안 떨어진다.'], ['첫 달만 다니고 흐지부지.']),
    eff: (s, p, t) => [stat('int', grow(s, p, 'int', t)), stat('cha', grow(s, p, 'cha', t === 'bad' ? 'meh' : t))],
  },
  {
    id: 'o_stock_seminar', icon: '🏦', name: '증권사 초청 VIP 세미나', desc: '투자 감각 · 운 좋으면 좋은 정보', stages: ['adult', 'senior'], when: (s) => h(s).cash >= 10000, stat: 'int',
    lines: L(['리서치센터장의 전망이 딱 맞았다. 포트폴리오를 조정해 수익을 냈다.'], ['분산 투자의 중요성을 다시 새겼다.'], ['어려운 말만 잔뜩.'], ['상품 가입 권유만 받았다.']),
    eff: (_s, p, t) => {
      const g = t === 'great' ? 800 : t === 'good' ? 200 : 0;
      p.cash += g;
      return g ? [`수익 ${formatMoney(g)}`] : ['별 소득 없음'];
    },
  },
  {
    id: 'o_mentor', icon: '🧑‍🏫', name: '선배 멘토링', desc: '업계 선배에게 조언 · 승진·이직에 도움', stages: ['adult'], when: working, stat: 'cha',
    lines: L(['선배가 자기 팀에 자리를 만들어 줬다!'], ['커리어 로드맵을 같이 그렸다.'], ['좋은 말씀 감사합니다…'], ['선배가 자기 자랑만 두 시간.']),
    eff: (s, p, t) => {
      if (t === 'great' && p.jobLevel < JOBS[p.job].maxLevel && chance(s, 0.5)) {
        p.jobLevel++;
        return ['직급 +1'];
      }
      if (ok(t)) mark(p, 'network', 1);
      return [stat('cha', grow(s, p, 'cha', t))];
    },
  },
  {
    id: 'o_family_photo', icon: '📸', name: '가족사진 촬영', desc: '가족 모두 행복↑', cost: 50, stages: ['adult', 'senior'], when: (s) => !!spouseOf(s, h(s)) || h(s).childIds.length > 0, stat: 'cha',
    lines: L(['3대가 한 프레임에. 거실 벽 한가운데 걸었다.'], ['아이가 웃는 순간을 잘 잡았다.'], ['다들 눈을 감았다. 재촬영.'], ['사진 찍다 부부 싸움이 났다.']),
    eff: (s, p, t) => {
      const d = t === 'bad' ? 0 : 4;
      for (const id of [p.id, p.spouseId, ...p.childIds]) {
        const q = id ? s.people[id] : undefined;
        if (q && alive(q)) mood(q, d);
      }
      return [['가족 행복', d]];
    },
  },
  {
    id: 'o_blood', icon: '🩸', name: '헌혈의 집 들르기', desc: '도덕성↑ · 건강 체크', stages: ['univ', 'adult'], stat: 'mor',
    lines: L(['50회 헌혈 은장을 받았다!'], ['헌혈증을 기부함에 넣었다.'], ['피 뽑고 조금 어지러웠다.'], ['빈혈 수치가 낮아 못 했다. 병원에 가 봐야겠다.']),
    eff: (s, p, t) => (mark(p, 'kind', 1), [stat('mor', grow(s, p, 'mor', t))]),
  },
  {
    id: 'o_startup_weekend', icon: '💡', name: '창업 경진대회', desc: '지능↑ · 우승하면 상금·투자 기회', cost: 20, stages: ['univ', 'adult'], stat: 'int',
    lines: L(['우승! 상금 1,000만 원과 투자 미팅이 잡혔다.'], ['본선 진출. 팀원들과 친해졌다.'], ['아이디어가 평범하다는 평.'], ['발표 중 머리가 하얘졌다.']),
    eff: (s, p, t) => {
      const prize = t === 'great' ? 1000 : 0;
      p.cash += prize;
      mark(p, 'i:biz', 1);
      if (t === 'great') s.fame += 1;
      return [...(prize ? [`상금 ${formatMoney(prize)}`] : []), stat('int', grow(s, p, 'int', t))];
    },
  },
  {
    id: 'o_kid_camp', icon: '⛺', name: '방학 영어·과학 캠프', desc: '지능↑ 매력↑', cost: 60, stages: ['elem', 'teen'], stat: 'int',
    lines: L(['캠프 최우수상! 친구들과 연락처를 잔뜩 주고받았다.'], ['텐트에서 밤새 별을 봤다.'], ['집에 가고 싶다는 전화가 왔다.'], ['첫날 넘어져 무릎이 까졌다.']),
    eff: (s, p, t) => [stat('int', grow(s, p, 'int', t)), stat('cha', grow(s, p, 'cha', t === 'bad' ? 'meh' : t))],
  },
  // ── 노년 ──
  {
    id: 'o_senior_college', icon: '🎓', name: '노인대학 입학', desc: '행복↑ 지능↑ · 새 친구', stages: ['senior'], stat: 'int',
    lines: L(['반장이 됐다! 수업 끝나면 다 같이 칼국수.'], ['스마트폰 반에서 사진 편집을 배웠다.'], ['출석만 열심히 했다.'], ['첫날 버스를 잘못 탔다.']),
    eff: (s, p, t) => (mood(p, 6), [stat('int', grow(s, p, 'int', t)), ['행복', 6]]),
  },
  {
    id: 'o_farm_stay', icon: '🌾', name: '귀농 체험 한 달', desc: '건강↑ 행복↑', cost: 100, stages: ['adult', 'senior'], when: (s) => age(s, h(s)) >= 50, stat: 'str',
    lines: L(['흙냄새가 이렇게 좋은 줄 몰랐다. 혈압이 내려갔다.'], ['마을 어르신들과 막걸리를 나눴다.'], ['허리가 아프다.'], ['벌레에 물려 고생했다.']),
    eff: (_s, p, t) => {
      const hp = t === 'bad' ? 0 : 3;
      p.actual.hp = clamp(p.actual.hp + hp, 0, 100);
      mood(p, 5);
      return [stat('hp', hp), ['행복', 5]];
    },
  },
];

function hnum(key: string): number {
  let x = 2166136261;
  for (const ch of key) x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
  return Math.abs(x);
}

/** 올해 열린 기회 (자격이 되는 것 중 해마다 다른 3개) */

/** 관심 분야를 키우는 체험형 기회 (아이·학생) */
const I = (p: Person, cat: string, t: Tier): Delta[] => {
  const g = t === 'great' ? 3 : t === 'good' ? 2 : t === 'meh' ? 1 : 0;
  if (g) mark(p, 'i:' + cat, g);
  return g ? [`관심 +${g}`] : [];
};
const KID: Stage[] = ['elem', 'teen'];
const exp = (id: string, icon: string, name: string, desc: string, stages: Stage[], st: StatKey, cat: string, lines: Record<Tier, string[]>, cost?: number, extra?: (s: GameState, p: Person, t: Tier) => Delta[]): Opp => ({
  id, icon, name, desc, stages, stat: st, cost, fit: cat, lines,
  eff: (s, p, t) => [stat(st, t === 'bad' ? 0 : grow(s, p, st, t)), ...I(p, cat, t), ...(extra?.(s, p, t) ?? [])],
});

OPPS.push(
  // ── 아이·청소년 체험 (적성 분야를 키운다) ──
  exp('o_hospital_day', '🩺', '어린이 병원 체험', '의사 가운 입어 보기 · 의료 관심', KID, 'int', 'medical', L(['청진기로 인형 심장 소리를 들었다. "나 의사 될래!"'], ['붕대 감기를 배웠다. 동생 팔에 감아 줬다.'], ['주사기를 보고 조금 무서웠다.'], ['병원 냄새에 울고 나왔다.'])),
  exp('o_court_tour', '⚖️', '법원 견학·모의재판', '판사 봉 두드리기 · 법률 관심', KID, 'cha', 'legal', L(['모의재판 판사 역! 판결문을 멋지게 읽었다.'], ['검사 역을 맡아 날카로운 질문을 던졌다.'], ['법정이 생각보다 조용했다.'], ['졸다가 방청석에서 떨어질 뻔했다.'])),
  exp('o_robot_class', '🤖', '로봇 만들기 교실', '코딩으로 로봇 움직이기 · IT·과학 관심', KID, 'int', 'tech', L(['내 로봇이 미로를 1등으로 탈출했다!'], ['로봇이 앞으로는 간다. 뒤로는 안 간다.'], ['선생님이 거의 다 만들어 줬다.'], ['나사 하나를 삼킬 뻔했다.']), 30),
  exp('o_fire_station', '🚒', '소방서 안전 체험', '소방관 체험 · 공공·안전 관심', KID, 'str', 'public', L(['소방 호스로 불 끄기 성공! 소방관 아저씨가 경례해 줬다.'], ['연기 탈출 훈련을 씩씩하게 해냈다.'], ['소방차 사진만 잔뜩 찍었다.'], ['사이렌 소리에 놀라 귀를 막았다.'])),
  exp('o_broadcast', '📺', '방송국 견학', '뉴스 앵커 체험 · 미디어 관심', KID, 'cha', 'media', L(['앵커석에 앉아 뉴스를 읽었다. PD가 "재능 있네"라고 했다.'], ['날씨 예보 코너를 따라 해 봤다.'], ['카메라 앞에서 얼어붙었다.'], ['생방송 스튜디오에서 재채기를 했다.'])),
  exp('o_bakery', '🥐', '제과제빵 원데이 클래스', '빵 굽기 · 서비스·요식 관심', KID, 'cha', 'service', L(['내가 만든 크루아상을 온 가족이 칭찬했다.'], ['모양은 이상해도 맛은 좋다.'], ['반죽이 부풀지 않았다.'], ['오븐에 너무 오래 뒀다. 숯이 됐다.']), 15),
  exp('o_airport', '✈️', '공항·항공 체험', '조종석 앉아 보기 · 운송 관심', KID, 'int', 'transport', L(['시뮬레이터 착륙 성공! 기장님이 날개 배지를 줬다.'], ['관제탑에서 비행기들을 내려다봤다.'], ['활주로가 생각보다 멀었다.'], ['멀미가 났다.']), 20),
  exp('o_market_day', '🧺', '어린이 벼룩시장 장사', '직접 팔아 보기 · 장사·사업 관심 · 용돈', KID, 'cha', 'biz', L(['준비한 물건 완판! 수익 5만 원.'], ['절반은 팔았다. 흥정을 배웠다.'], ['옆 친구 물건만 팔렸다.'], ['잔돈을 잘못 거슬러 줬다.']), 0, (_s, p, t) => (ok(t) ? ((p.cash += t === 'great' ? 5 : 2), [`용돈 +${t === 'great' ? 5 : 2}만`]) : [])),
  exp('o_bank_kids', '🏦', '어린이 은행 체험', '통장 만들기 · 사무·금융 관심', KID, 'int', 'office', L(['이자 계산을 척척. 은행원 누나가 놀랐다.'], ['첫 통장을 만들었다. 저금하는 재미를 알았다.'], ['도장 찍는 게 제일 재밌었다.'], ['사탕만 먹고 왔다.'])),
  exp('o_teacher_day', '🍎', '일일 선생님 되기', '동생들 가르치기 · 교육 관심', KID, 'cha', 'edu', L(['동생들이 "선생님!" 하고 따랐다. 뿌듯하다.'], ['받아쓰기를 가르쳐 줬다.'], ['동생들이 말을 안 들었다.'], ['목이 쉬었다.'])),
  exp('o_car_factory', '🏭', '자동차 공장 견학', '로봇 팔이 차를 만든다 · 기술·생산 관심', KID, 'str', 'trade', L(['엔진 조립 체험에서 "손재주 있네!" 소리를 들었다.'], ['1분에 한 대씩 나오는 차를 넋 놓고 봤다.'], ['시끄러웠다.'], ['기념품 가게에만 관심이 있었다.'])),
  exp('o_ranch', '🐄', '목장·갯벌 체험', '송아지 우유 주기 · 농림어업 관심', KID, 'mor', 'farm', L(['송아지가 손을 핥았다. 이름까지 지어 줬다.'], ['갯벌에서 조개를 한 바구니 캤다.'], ['냄새가 좀 났다.'], ['갯벌에 장화가 빠졌다.']), 20),
  exp('o_sports_camp', '⚽', '유소년 스포츠 캠프', '프로 코치에게 배우기 · 스포츠 관심', KID, 'str', 'sport', L(['코치가 "선수반 테스트 받아 봐"라고 했다!'], ['슈팅 폼이 좋아졌다.'], ['벤치에 오래 있었다.'], ['발목을 삐끗했다.']), 40),
  exp('o_museum_night', '🦕', '박물관 야간 탐험', '공룡 화석 옆에서 1박 · 교육·과학 관심', ['little', 'elem'], 'int', 'edu', L(['티라노 뼈 이름을 전부 외웠다.'], ['손전등 탐험이 너무 재밌었다.'], ['무서워서 엄마 옆에서 잤다.'], ['밤새 한숨도 못 잤다.']), 15),
  exp('o_webtoon_camp', '✏️', '웹툰 작가 특강', '현역 작가에게 배우기 · 미디어 관심', ['teen'], 'cha', 'media', L(['작가님이 내 컷을 SNS에 올려 줬다!'], ['4컷 만화를 완성했다.'], ['손이 따라 주지 않았다.'], ['펜을 다 부러뜨렸다.']), 20),
  exp('o_hackathon_teen', '💻', '청소년 해커톤', '24시간 앱 만들기 · IT 관심', ['teen', 'univ'], 'int', 'tech', L(['대상! IT 기업 인턴 제안까지 받았다.'], ['팀 앱이 실제로 돌아갔다.'], ['밤새 버그만 잡았다.'], ['노트북이 꺼졌다. 저장을 안 했다.'])),
  exp('o_youth_parliament', '🏛', '청소년 모의국회', '법안 발의해 보기 · 공공·법률 관심', ['teen'], 'cha', 'public', L(['내 법안이 본회의를 통과했다! 기자가 인터뷰를 했다.'], ['토론에서 날카로운 질문을 던졌다.'], ['발언 기회를 못 잡았다.'], ['긴장해서 말을 더듬었다.'])),
  exp('o_barista_teen', '☕', '바리스타 체험', '라떼아트 · 서비스 관심', ['teen', 'univ'], 'cha', 'service', L(['하트 라떼아트 성공!'], ['아메리카노는 완벽하다.'], ['우유 거품이 넘쳤다.'], ['컵을 깼다.']), 10),
  exp('o_lab_visit', '🔬', '대학 연구실 탐방', '진짜 실험실 · IT·과학·의료 관심', ['teen'], 'int', 'tech', L(['교수님이 "대학 오면 우리 연구실 와"라고 했다.'], ['현미경으로 세포를 봤다.'], ['어려운 말뿐이었다.'], ['실험복이 너무 컸다.'])),
  exp('o_startup_teen', '🚀', '청소년 창업 캠프', '사업계획서 써 보기 · 사업 관심', ['teen', 'univ'], 'int', 'biz', L(['투자 심사 1위! 모의 투자금 1억을 받았다.'], ['아이디어가 좋다는 평을 받았다.'], ['팀원끼리 싸웠다.'], ['발표 자료를 못 열었다.']), 20),
  // ── 대학생·취준 ──
  { id: 'o_ambassador', icon: '🎓', name: '대학 홍보대사 선발', desc: '매력↑ · 스펙 한 줄 · 인맥', stages: ['univ'], stat: 'cha',
    lines: L(['최종 합격! 입학식 사회를 봤다.'], ['예비 합격 후 추가 합격.'], ['면접에서 떨어졌다.'], ['지각했다.']),
    eff: (s, p, t) => (ok(t) && (addFlag(p, 'cert'), mark(p, 'network', 1)), [stat('cha', grow(s, p, 'cha', t))]) },
  { id: 'o_supporters', icon: '📣', name: '대기업 대학생 서포터즈', desc: '기업 활동 · 취업 가산', stages: ['univ', 'prep'], stat: 'cha',
    lines: L(['우수 활동자! 서류 면제 혜택을 받았다.'], ['콘텐츠가 공식 계정에 올라갔다.'], ['활동비만 받았다.'], ['마감을 두 번 어겼다.']),
    eff: (s, p, t) => (ok(t) && addFlag(p, 'cert'), [stat('cha', grow(s, p, 'cha', t)), ...I(p, 'office', t)]) },
  { id: 'o_paper_contest', icon: '📑', name: '학술 논문 공모전', desc: '지능↑ · 대학원·연구직에 유리', stages: ['univ'], stat: 'int',
    lines: L(['최우수상! 학회에서 발표했다.'], ['장려상.'], ['심사평만 받았다.'], ['표절 검사에 걸렸다. 인용 표시를 빼먹었다.']),
    eff: (s, p, t) => (ok(t) && addFlag(p, 'cert'), [stat('int', grow(s, p, 'int', t)), ...I(p, 'edu', t)]) },
  { id: 'o_job_fair', icon: '🧾', name: '채용 박람회', desc: '현장 면접 · 운 좋으면 서류 면제', stages: ['univ', 'prep'], stat: 'cha',
    lines: L(['현장 면접에서 인사팀장 명함을 받았다. 서류 면제!'], ['기업 부스 여섯 곳 상담.'], ['기념품만 한 봉지.'], ['사람에 치여 아무것도 못 했다.']),
    eff: (s, p, t) => (ok(t) && addFlag(p, 'cert'), [stat('cha', grow(s, p, 'cha', t))]) },
  { id: 'o_working_holiday', icon: '🦘', name: '워킹홀리데이 (1년)', desc: '호주·캐나다에서 일하며 여행 · 매력·건강↑ 돈은 본전', cost: 300, ap: 2, stages: ['univ', 'prep'], stat: 'cha',
    lines: L(['농장·카페에서 일하며 영어가 트였다. 평생 친구도 생겼다.'], ['1년을 무사히 버텼다. 시야가 넓어졌다.'], ['한국인끼리만 어울렸다.'], ['지갑을 도둑맞았다. 고생만 했다.']),
    eff: (s, p, t) => (mood(p, ok(t) ? 10 : -2), [stat('cha', grow(s, p, 'cha', t)), stat('hp', grow(s, p, 'hp', t)), ['행복', ok(t) ? 10 : -2]]) },
  // ── 어른 ──
  { id: 'o_side_shop', icon: '🛒', name: '스마트스토어 부업', desc: '퇴근 후 온라인 판매 · 대박 나면 월급만큼', cost: 100, stages: ['adult'], when: working, stat: 'cha',
    lines: L(['올린 상품이 대박! 월 매출 1천만 원.'], ['소소하게 용돈벌이.'], ['재고가 방을 채웠다.'], ['반품 폭탄.']),
    eff: (_s, p, t) => { const g = { great: 1500, good: 300, meh: 0, bad: -100 }[t]; p.cash += g; mark(p, 'i:biz', ok(t) ? 1 : 0); return [g ? `부업 ${g > 0 ? '+' : ''}${formatMoney(g)}` : '본전']; } },
  { id: 'o_mba', icon: '🎓', name: '야간 MBA 과정', desc: '지능·매력↑ · 승진에 유리 (2천만)', cost: 2000, stages: ['adult'], when: (s) => working(s) && age(s, h(s)) <= 50, stat: 'int',
    lines: L(['수석 졸업! 동기 네트워크가 든든하다.'], ['주경야독 끝에 학위를 받았다.'], ['과제만 겨우 냈다.'], ['피곤해서 절반은 결석.']),
    eff: (s, p, t) => { if (ok(t)) { mark(p, 'network', 2); if (chance(s, t === 'great' ? 0.5 : 0.2) && p.jobLevel < JOBS[p.job].maxLevel) { p.jobLevel++; return [stat('int', grow(s, p, 'int', t)), '직급 +1']; } } return [stat('int', grow(s, p, 'int', t)), stat('cha', grow(s, p, 'cha', t))]; } },
  { id: 'o_lotto_group', icon: '🎰', name: '직장 동료 로또 공동구매', desc: '만 원씩 모아서 · 거의 안 되지만…', cost: 1, stages: ['adult'], when: working, stat: 'mor',
    lines: L(['4등이 세 장! 회식비가 생겼다.'], ['5등 두 장. 커피 한 잔씩.'], ['꽝.'], ['꽝. 동료가 번호 하나를 잘못 적었다고 한다.']),
    eff: (s, p, t) => { if (chance(s, 0.0008)) { p.cash += 30000; s.fame += 1; return ['🎉 2등 당첨! 내 몫 3억!']; } const g = { great: 15, good: 1, meh: 0, bad: 0 }[t]; p.cash += g; return g ? [`+${g}만`] : []; } },
  { id: 'o_reunion', icon: '🍻', name: '20년 만의 동창회', desc: '옛 친구들 · 인맥↑ 행복↑', stages: ['adult', 'senior'], when: (s) => age(s, h(s)) >= 38, stat: 'cha',
    lines: L(['첫사랑이 반갑게 인사했다. 단짝과 사업 이야기까지 나눴다.'], ['밤새 웃었다. 단톡방이 생겼다.'], ['다들 자랑만 하더라.'], ['2차에서 필름이 끊겼다.']),
    eff: (s, p, t) => (ok(t) && mark(p, 'network', 2), mood(p, ok(t) ? 8 : -2), [stat('cha', grow(s, p, 'cha', t)), ['행복', ok(t) ? 8 : -2]]) },
  { id: 'o_house_repair', icon: '🛠', name: '셀프 인테리어', desc: '집을 고친다 · 잘하면 집값↑ (자가일 때)', cost: 300, stages: ['adult', 'senior'], when: (s) => h(s).home?.type === 'own', stat: 'str',
    lines: L(['유튜브 보고 한 욕실 리모델링이 전문가 뺨친다. 집값이 올랐다.'], ['벽지와 조명만 바꿔도 새집 같다.'], ['페인트가 얼룩졌다.'], ['타일이 전부 들떴다. 업체를 다시 불렀다.']),
    eff: (s, p, t) => { const a = s.assets.find((x) => x.ownerId === p.id && (x.kind === 'apt_seoul' || x.kind === 'apt_local')); const up = a ? Math.round(a.value * { great: 0.04, good: 0.015, meh: 0, bad: -0.005 }[t]) : 0; if (a) a.value += up; mood(p, ok(t) ? 5 : -3); return up ? [`집값 ${up > 0 ? '+' : ''}${formatMoney(up)}`] : []; } },
  { id: 'o_charity_run', icon: '🎗', name: '자선 걷기 대회', desc: '가족과 함께 · 명성↑ 건강↑', stages: ['adult', 'senior'], stat: 'hp',
    lines: L(['가족 티셔츠를 맞춰 입고 완보! 지역 신문에 사진이 났다.'], ['아이들 손잡고 끝까지 걸었다.'], ['중간에 택시를 탔다.'], ['비가 쏟아졌다.']),
    eff: (s, p, t) => (ok(t) && (s.fame += 1), [stat('hp', grow(s, p, 'hp', t))]) },
  { id: 'o_auction_art', icon: '🖼', name: '신진 작가 경매전', desc: '젊은 작가 작품 한 점 (500만) · 뜨면 대박', cost: 500, stages: ['adult', 'senior'], when: (s) => h(s).cash >= 3000, stat: 'int',
    lines: L(['산 작품의 작가가 해외 비엔날레에 초청됐다!'], ['거실에 걸었더니 분위기가 산다.'], ['작가가 절필했다고 한다.'], ['알고 보니 복제품이었다.']),
    eff: (s, p, t) => { const v = { great: 4000, good: 700, meh: 400, bad: 50 }[t]; s.assets.push({ id: 'a' + s.idSeq++, kind: 'art', name: '신진 작가 작품', ownerId: p.id, value: v, cost: 500, bought: s.year }); return [`작품 평가 ${formatMoney(v)}`]; } },
  { id: 'o_council_run', icon: '🗳', name: '구의원 선거 출마', desc: '명성 크게↑ (명성·매력이 받쳐 주면) · 선거비 2천만', cost: 2000, ap: 2, stages: ['adult', 'senior'], when: (s) => s.fame >= 20 && age(s, h(s)) >= 35, stat: 'cha',
    lines: L(['당선! 구의회 첫 등원. 가문에서 첫 선출직이다.'], ['아쉽게 낙선했지만 득표율 42%. 다음이 기대된다.'], ['득표율 12%. 선거비 보전도 못 받았다.'], ['현수막이 태풍에 날아갔다.']),
    eff: (s, _p, t) => { const f = { great: 8, good: 3, meh: 0, bad: -1 }[t]; s.fame = Math.max(0, s.fame + f); if (t === 'good') h(s).cash += 1000; return [`명성 ${f >= 0 ? '+' : ''}${f}`]; } },
  { id: 'o_kids_tv', icon: '📺', name: '가족 예능 섭외', desc: '온 가족 방송 출연 · 명성↑ (자녀가 있을 때)', stages: ['adult'], when: (s) => h(s).childIds.length > 0 && s.fame >= 10, stat: 'cha',
    lines: L(['아이 한마디가 명장면이 됐다. 광고 제의까지!'], ['훈훈한 가족으로 소개됐다.'], ['통편집됐다.'], ['부부싸움 장면이 나갔다.']),
    eff: (s, p, t) => { const f = { great: 5, good: 2, meh: 0, bad: -1 }[t]; s.fame = Math.max(0, s.fame + f); if (t === 'great') p.cash += 1500; return [`명성 ${f >= 0 ? '+' : ''}${f}`, ...(t === 'great' ? ['광고 1,500만'] : [])]; } },
  // ── 노년 ──
  { id: 'o_senior_model', icon: '🕶', name: '시니어 모델 오디션', desc: '매력↑ · 인생 2막', stages: ['senior'], stat: 'cha',
    lines: L(['합격! 패션쇼 런웨이를 걸었다. 손주들이 난리다.'], ['화보 촬영 한 번.'], ['서류에서 떨어졌다.'], ['하이힐에 발목을 삐었다.']),
    eff: (s, p, t) => (ok(t) && (s.fame += 1), mood(p, ok(t) ? 10 : -2), [stat('cha', grow(s, p, 'cha', t)), ['행복', ok(t) ? 10 : -2]]) },
  { id: 'o_memoir', icon: '📖', name: '자서전 쓰기', desc: '가문의 이야기를 남긴다 · 명성·행복↑', cost: 200, stages: ['senior'], stat: 'int',
    lines: L(['출판사가 정식 출간을 제안했다! 제목은 「우리 가문 이야기」.'], ['가족용으로 50부를 찍었다. 손주들이 돌려 읽는다.'], ['쓰다 보니 옛 기억에 눈물만 났다.'], ['원고 파일이 날아갔다.']),
    eff: (s, p, t) => (ok(t) && (s.fame += t === 'great' ? 3 : 1), mood(p, 6), [['행복', 6]]) },
  { id: 'o_smartphone_class', icon: '📱', name: '어르신 스마트폰 교실', desc: '지능↑ · 손주와 영상통화', stages: ['senior'], stat: 'int',
    lines: L(['키오스크 주문도 척척. 손주에게 이모티콘을 보냈다!'], ['영상통화를 할 줄 알게 됐다.'], ['비밀번호를 또 잊었다.'], ['보이스피싱 문자를 눌렀다… 다행히 막았다.']),
    eff: (s, p, t) => (mood(p, ok(t) ? 6 : 0), [stat('int', grow(s, p, 'int', t))]) },
  { id: 'o_senior_job', icon: '🧓', name: '노인 일자리 (학교 지킴이)', desc: '월 29만 · 건강·행복↑', stages: ['senior'], stat: 'mor',
    lines: L(['아이들이 "지킴이 어르신!" 하고 반긴다. 삶의 활력이다.'], ['출근할 곳이 있다는 게 좋다.'], ['조금 지루했다.'], ['무릎이 시렸다.']),
    eff: (_s, p, t) => (p.cash += 348, mood(p, ok(t) ? 8 : 2), ['+348만', ['행복', ok(t) ? 8 : 2]]) },
);

export function openOpps(s: GameState, stage: Stage): Set<string> {
  const ok = OPPS.filter((o) => o.stages.includes(stage) && (!o.when || o.when(s)));
  return new Set(ok.sort((a, b) => hnum(s.year + a.id) - hnum(s.year + b.id)).slice(0, 5).map((o) => o.id));
}

export function oppActions(stageOf: (s: GameState) => Stage): ActionDef[] {
  return OPPS.map((o) => ({
    id: o.id,
    cat: '올해의 기회',
    icon: o.icon,
    name: o.name,
    desc: o.desc + ' · 올해만',
    ap: o.ap ?? 1,
    cost: o.cost,
    stages: o.stages,
    fit: o.fit,
    show: (s: GameState) => openOpps(s, stageOf(s)).has(o.id),
    blocked: (s: GameState) => (s.actUsed?.[o.id] ? '올해 이미 했다' : undefined),
    run: (s: GameState) => {
      const p = h(s);
      const t = rollTier(s, p, { stat: o.stat });
      const ds = o.eff(s, p, t);
      return TIER_MARK[t] + pick(s, o.lines[t]) + fmt(ds);
    },
  }));
}
