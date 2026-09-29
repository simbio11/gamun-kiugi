// 올해의 기회: 해마다 다른 2~3개가 열리는 한정 행동. 인생 단계·길·형편에 맞는 것 중에서 해마다 돌아가며 뜬다.
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
    id: 'o_marathon', icon: '🏃', name: '마라톤 대회 출전 (10km)', desc: '체력↑ 건강↑ · 완주 메달', cost: 5, stages: ADULT, stat: 'str',
    lines: L(['개인 최고 기록! 결승선에서 두 팔을 들었다.'], ['완주 메달을 목에 걸었다.'], ['걷다 뛰다 겨우 들어왔다.'], ['5km에서 쥐가 났다.']),
    eff: (s, p, t) => {
      const hp = t === 'bad' ? -1 : t === 'meh' ? 1 : 2;
      p.actual.hp = clamp(p.actual.hp + hp, 0, 100);
      mark(p, 'exercise', 1);
      return [stat('str', grow(s, p, 'str', t)), stat('hp', hp)];
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
export function openOpps(s: GameState, stage: Stage): Set<string> {
  const ok = OPPS.filter((o) => o.stages.includes(stage) && (!o.when || o.when(s)));
  return new Set(ok.sort((a, b) => hnum(s.year + a.id) - hnum(s.year + b.id)).slice(0, 3).map((o) => o.id));
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
