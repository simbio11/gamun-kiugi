// 슈퍼 히든 직업 9종: 3단계 연작 미션 체인.
// 단순 운빨 가챠가 아니라, 자격을 갖춘 자에게 확정적으로 퀘스트가 열리고,
// 빌드업을 완료한 유저는 80~95% 높은 확률로 격파해 나가는 치밀한 육성형 히든 시스템.

import { HIDDEN_BY_ID } from './hidden-data';
import { gate, type EventDef } from './ev-util';
import { addFlag, age, alive, clamp, fullName, isMainline } from './people';
import { chance } from './rng';
import { myVehicles } from './vehicle';
import { formatMoney } from './economy';
import type { GameState, Person } from './types';

interface SuperRoute {
  id: string;
  name: string;
  icon: string;
  /** 1단계 트리거 자격 조건 */
  ready: (s: GameState, p: Person) => boolean;
  step1: {
    title: string;
    text: string;
    check: (p: Person) => boolean;
    rate: number;
    succText: string;
    succMoney: number;
    failText: string;
  };
  step2: {
    title: string;
    text: string;
    check: (p: Person) => boolean;
    rate: number;
    succText: string;
    succMoney: number;
    failText: string;
  };
  step3: {
    title: string;
    text: string;
    check: (p: Person) => boolean;
    rate: number;
    succText: string;
    succMoney: number;
    failText: string;
  };
}

const A = (s: GameState, p: Person) => age(s, p);
const ST = (p: Person) => p.actual;
const hasCar = (s: GameState, p: Person) => s.assets.some((a) => a.kind === 'vehicle' && a.ownerId === p.id) || myVehicles(s).length > 0;
const hasPC = (s: GameState) => !!s.gear?.pc;

export const SUPER_ROUTES: SuperRoute[] = [
  // 1. 텐프로 에이스 / VVIP 마담
  {
    id: 'hj_madam',
    name: '텐프로 에이스',
    icon: '🍾',
    ready: (s, p) => p.sex === 'F' && A(s, p) >= 21 && A(s, p) <= 32 && ST(p).cha >= 68 && ST(p).mor <= 50,
    step1: {
      title: '🍾 강남의 은밀한 초대',
      text: '강남 최고급 텐프로 클럽의 총괄 실장에게서 은밀한 제안이 왔다. "외모와 화술이 남다르시네요. 상위 0.1%만 모시는 방입니다. 한 달만 나와 보시겠어요?"',
      check: (p) => ST(p).cha >= 68,
      rate: 0.88,
      succText: '단번에 에이스로 주목받았다. 명품 드레스와 함께 거액의 계약금이 손에 쥐어졌다.',
      succMoney: 3000,
      failText: '분위기에 압도되어 발길을 돌렸다.',
    },
    step2: {
      title: '🥂 VVIP 룸의 비밀',
      text: '정·재계 거물들만 입장하는 최고 등급 밀실 전담 제의가 들어왔다. 그들의 말 한마디에 주가가 움직이고 인사가 결정된다.',
      check: (p) => ST(p).cha >= 70 && ST(p).int >= 55,
      rate: 0.85,
      succText: '거물들의 마음을 완벽히 사로잡았다. 비밀 장부와 함께 억대 팁이 쏟아졌다.',
      succMoney: 7000,
      failText: '손님의 무리한 요구를 거절하며 한 발 물러섰다.',
    },
    step3: {
      title: '👑 밤의 여왕 등극',
      text: '은퇴하는 대마담이 {n}에게 클럽 지분과 열쇠를 넘기려 한다. "이 바닥의 밤을 지배할 사람은 너뿐이야."',
      check: (p) => ST(p).cha >= 72,
      rate: 0.92,
      succText: '강남 지하 사교계의 정점에 올랐다. 모든 거물들이 {n} 마담의 눈치를 본다.',
      succMoney: 15000,
      failText: '마지막 순간 고비를 넘기지 못했다.',
    },
  },

  // 2. 온리팬스 글로벌 탑티어 (사이버 사이렌)
  {
    id: 'hj_onlyfans',
    name: '사이버 사이렌',
    icon: '🍑',
    ready: (s, p) => p.sex === 'F' && A(s, p) >= 20 && A(s, p) <= 29 && ST(p).cha >= 65,
    step1: {
      title: '🍑 비밀 플랫폼 채널 개설',
      text: '글로벌 유료 구독 플랫폼에서 해외 크리에이터들이 억대 수입을 올린다는 소식을 접했다. 방문을 잠그고 핑크빛 조명을 켰다.',
      check: (p) => ST(p).cha >= 65,
      rate: 0.88,
      succText: '첫 달 만에 유료 구독자 1만 명 돌파! 달러가 쏟아져 들어온다.',
      succMoney: 2000,
      failText: '카메라 앞이 어색해 첫 방송을 접었다.',
    },
    step2: {
      title: '💸 오일머니 왕족의 슈퍼 도네이션',
      text: '중동의 오일머니 부호가 1:1 전용 프라이빗 라이브를 요청하며 거액의 계약금을 제시했다.',
      check: (p) => ST(p).cha >= 68 && ST(p).int >= 55,
      rate: 0.85,
      succText: '왕족을 완전히 매료시켰다. 다이아몬드와 함께 거액의 송금이 찍혔다.',
      succMoney: 10000,
      failText: '무리한 요구를 거절하고 선을 지켰다.',
    },
    step3: {
      title: '🌍 글로벌 랭킹 1위의 대관식',
      text: '전 세계 구독 플랫폼에서 아시아 최초 글로벌 랭킹 1위 자리를 눈앞에 두고 있다. 역사적인 24시간 피날레 방송!',
      check: (p) => ST(p).cha >= 70,
      rate: 0.94,
      succText: '전 세계 1위 등극! 인생을 바꾼 사이버 사이렌이 되었다.',
      succMoney: 20000,
      failText: '서버 다운으로 아쉽게 2위에 머물렀다.',
    },
  },

  // 3. 블랙 위도우 (상속 팜므파탈)
  {
    id: 'hj_widow',
    name: '블랙 위도우',
    icon: '🕷️',
    ready: (s, p) => p.sex === 'F' && A(s, p) >= 24 && A(s, p) <= 36 && ST(p).cha >= 70 && ST(p).int >= 64 && ST(p).mor <= 35,
    step1: {
      title: '🥂 자선 경매장의 샴페인',
      text: 'VVIP 자선 경매장, 80대 금융그룹 명예회장이 홀로 샴페인을 들고 있다. 천사 같은 미소로 다가갈 완벽한 타이밍.',
      check: (p) => ST(p).cha >= 70,
      rate: 0.86,
      succText: '회장의 마음을 완전히 훔쳤다. 성대한 결혼식과 함께 사교계의 여주인공이 됐다.',
      succMoney: 5000,
      failText: '경호원들의 제지로 자연스러운 접근에 실패했다.',
    },
    step2: {
      title: '🖋️ 서재의 비밀 유언장',
      text: '본처 자식들의 견제를 뚫고, 노쇠한 회장에게서 전 재산 단독 상속 공증을 받아낼 결정적 밤이 왔다.',
      check: (p) => ST(p).int >= 65,
      rate: 0.82,
      succText: '변호사 입회 하에 유언장 공증 완료! 도장이 찍혔다.',
      succMoney: 10000,
      failText: '자식들의 갑작스러운 방문으로 공증이 연기됐다.',
    },
    step3: {
      title: '⚖️ 세기의 상속 재판 승소',
      text: '회장 타계 후 분노한 상속인들이 소송과 폭로전을 걸어왔다. 법정과 언론을 장악할 마지막 결전!',
      check: (p) => ST(p).int >= 68 && ST(p).cha >= 72,
      rate: 0.92,
      succText: '완벽한 승소! 수백억 원의 상속금이 가문 금고로 쏟아져 들어왔다.',
      succMoney: 50000,
      failText: '합의금만 받고 물러서야 했다.',
    },
  },

  // 4. 카지노 퀸 (언더그라운드 바니 딜러)
  {
    id: 'hj_bunny',
    name: '카지노 퀸',
    icon: '🐰',
    ready: (s, p) => p.sex === 'F' && A(s, p) >= 20 && A(s, p) <= 30 && ST(p).cha >= 65 && ST(p).int >= 55,
    step1: {
      title: '🐰 지하 3층의 바니 딜러',
      text: '비밀 엘리베이터로만 통하는 하이롤러 카지노에서 메인 딜러를 구한다. 매혹적인 바니 슈트와 빠른 손놀림이 필수.',
      check: (p) => ST(p).cha >= 65,
      rate: 0.88,
      succText: '첫날부터 테이블을 압도했다. 큰손들의 시선이 {n}에게 고정됐다.',
      succMoney: 2000,
      failText: '긴장해서 칩을 떨어뜨렸다.',
    },
    step2: {
      title: '💰 50억 판돈의 테이블',
      text: '아시아 거물들의 50억 판돈 바카라 테이블. 눈빛 하나, 카드 넘기는 각도 하나로 판세를 쥐락펴락해야 한다.',
      check: (p) => ST(p).cha >= 68 && ST(p).int >= 58,
      rate: 0.85,
      succText: '거물들이 이길 때마다 칩 더미를 팁으로 안겨주었다.',
      succMoney: 5000,
      failText: '손님의 거친 항의로 잠시 자리를 비켜야 했다.',
    },
    step3: {
      title: '🏆 언더그라운드 카지노의 여왕',
      text: '하우스 사장이 VIP 룸 전체의 총괄 매니저이자 전설의 헤드 딜러 자리를 제안한다.',
      check: (p) => ST(p).cha >= 70,
      rate: 0.93,
      succText: '카지노 퀸 등극! 판돈의 일부가 고정 수수료로 들어온다.',
      succMoney: 10000,
      failText: '경찰 단속으로 하우스가 일시 폐쇄됐다.',
    },
  },

  // 5. 허니트랩 요원 (미인계 블랙요원)
  {
    id: 'hj_honeytrap',
    name: '허니트랩 요원',
    icon: '💄',
    ready: (s, p) => p.sex === 'F' && A(s, p) >= 22 && A(s, p) <= 34 && ST(p).cha >= 67 && ST(p).int >= 65 && ST(p).str >= 55,
    step1: {
      title: '🕶️ 블랙 옵스 리크루팅',
      text: '국가 최고 특수공작팀에서 은밀히 접촉해왔다. "미모와 지능, 담력을 모두 갖춘 블랙 요원이 필요합니다."',
      check: (p) => ST(p).cha >= 67 && ST(p).int >= 65,
      rate: 0.87,
      succText: '비밀 훈련을 완벽히 수료하고 암호명을 부여받았다.',
      succMoney: 3000,
      failText: '위험을 감지하고 발을 뺐다.',
    },
    step2: {
      title: '🍸 스위트룸의 기밀 파일',
      text: '국제 무기상의 호텔 스위트룸. 샴페인에 취한 무기상이 잠든 사이 금고의 암호를 해독해야 한다.',
      check: (p) => ST(p).int >= 68 && ST(p).cha >= 68,
      rate: 0.84,
      succText: '기밀 파일 복사 성공! 스위스 비밀 계좌로 거액의 공작금이 입금됐다.',
      succMoney: 8000,
      failText: '경호원이 노크해 황급히 빠져나왔다.',
    },
    step3: {
      title: '🎯 국제 첩보전의 흑막',
      text: '동아시아 정세를 뒤흔들 국가급 비밀 작전의 총지휘. 치명적인 매력으로 표적을 완벽히 포섭하라.',
      check: (p) => ST(p).int >= 70 && ST(p).cha >= 70,
      rate: 0.94,
      succText: '작전 대성공! 그림자 속에서 국가의 운명을 조종하는 허니트랩 퀸이 되었다.',
      succMoney: 15000,
      failText: '타깃이 눈치를 채고 국외로 도주했다.',
    },
  },

  // 6. 버튜버 여제 (빨간약의 지배자)
  {
    id: 'hj_vtuber',
    name: '버튜버 여제',
    icon: '💊',
    ready: (s, p) => p.sex === 'F' && A(s, p) >= 20 && A(s, p) <= 27 && ST(p).cha >= 68 && ST(p).int >= 60 && hasPC(s),
    step1: {
      title: '🌙 밤의 비밀 프라이빗 룸',
      text: '낮에는 청순한 버튜버, 밤에는 고액 유료 팬들을 위한 프라이빗 방송을 시작할 제안이 들어왔다.',
      check: (p) => ST(p).cha >= 68,
      rate: 0.88,
      succText: '가면 뒤의 치명적인 목소리와 실루엣으로 수천 명이 열광했다.',
      succMoney: 3000,
      failText: '가족에게 들킬까 봐 컴퓨터를 껐다.',
    },
    step2: {
      title: '💎 회장님의 10억 의뢰',
      text: '랭킹 1위 회장님이 단둘만의 오프라인 만남을 요구한다. 화면 너머로만 완벽히 조련할 승부수를 띄워야 한다.',
      check: (p) => ST(p).int >= 60 && ST(p).cha >= 70,
      rate: 0.85,
      succText: '화면 너머로 거물을 완전히 길들였다! 1억 원 일시불 후원 폭발.',
      succMoney: 10000,
      failText: '회장님이 후원을 끊고 떠났다.',
    },
    step3: {
      title: '🚨 30만 생방송 빨간약 유출',
      text: '동시 시청자 30만 명 앞에서 웹캠 필터가 오프라인으로 꺼졌다! 실물이 전국에 노출되는 절체절명의 순간.',
      check: (p) => ST(p).cha >= 72,
      rate: 0.95,
      succText: '"인형보다 더 예쁘다!" 전 세계 실시간 트렌드 1위 폭발! 버튜버 여제로 등극했다.',
      succMoney: 20000,
      failText: '황급히 전원을 뽑았지만 충격이 컸다.',
    },
  },

  // 7. 마성의 최면술사 (멘탈 팜므파탈)
  {
    id: 'hj_hypnotist',
    name: '마성의 최면술사',
    icon: '🌀',
    ready: (s, p) => p.sex === 'F' && A(s, p) >= 24 && A(s, p) <= 35 && ST(p).int >= 70 && ST(p).cha >= 66,
    step1: {
      title: '🕰️ 심야의 최면 상담실',
      text: '심각한 불면증에 시달리는 재벌 총수가 극비리에 최면 상담을 요청했다. 몽환적인 목소리로 무의식을 열 차례.',
      check: (p) => ST(p).int >= 70 && ST(p).cha >= 66,
      rate: 0.87,
      succText: '5분 만에 깊은 트랜스 상태로 유도했다. 총수가 눈물을 흘리며 사례금을 건넸다.',
      succMoney: 3000,
      failText: '내담자의 저항이 너무 강해 최면이 풀렸다.',
    },
    step2: {
      title: '🗝️ 비밀 금고의 암호',
      text: '정계 거물이 무의식 중에 은닉 비자금의 위치와 비밀번호를 털어놓기 시작했다.',
      check: (p) => ST(p).int >= 72,
      rate: 0.84,
      succText: '거물의 치부와 함께 막대한 비자금을 가문 자산으로 돌려놓았다.',
      succMoney: 8000,
      failText: '거물이 최면에서 깨어나 말을 얼버무렸다.',
    },
    step3: {
      title: '👁️ 영혼을 지배하는 여제',
      text: '대한민국 권력자들의 멘탈 주치의로 등극했다. 밀실에서 모든 이의 영혼을 쥐락펴락하는 정점!',
      check: (p) => ST(p).int >= 74 && ST(p).cha >= 68,
      rate: 0.93,
      succText: '마성의 멘탈 룰러 등극! 아무도 {n}의 뜻을 거역하지 못한다.',
      succMoney: 15000,
      failText: '의심을 품은 VIP 손님이 발길을 끊었다.',
    },
  },

  // 8. 잉크의 마녀 (어둠의 타투이스트)
  {
    id: 'hj_tattooist',
    name: '잉크의 마녀',
    icon: '🖤',
    ready: (s, p) => p.sex === 'F' && A(s, p) >= 20 && A(s, p) <= 32 && ST(p).cha >= 65 && ST(p).mor <= 50,
    step1: {
      title: '💉 심야의 비밀 타투 스튜디오',
      text: '어두운 골목 지하 스튜디오. 뒷세계 사내들이 오직 {n}의 손길로만 몸에 예술을 새기기 위해 찾아온다.',
      check: (p) => ST(p).cha >= 65,
      rate: 0.88,
      succText: '피부 위에 피어난 장미 문신. 사내들이 고통 속에서 황홀경을 느꼈다.',
      succMoney: 2000,
      failText: '손님이 통증을 참지 못하고 시술을 중단했다.',
    },
    step2: {
      title: '🐉 마피아 보스의 전신 문신',
      text: '조직의 보스가 등 전체에 용 문신을 의뢰했다. 통증을 견디며 {n}의 카리스마에 압도되기 시작한다.',
      check: (p) => ST(p).cha >= 68 && ST(p).str >= 50,
      rate: 0.85,
      succText: '시술 완료 후 보스가 무릎을 꿇고 충성을 맹세했다. 거액의 상납금 지급.',
      succMoney: 6000,
      failText: '바늘이 빗나가 보스가 불쾌해했다.',
    },
    step3: {
      title: '🌹 살갗에 새긴 전설',
      text: '세계 언더그라운드 예술계에서 살아있는 전설로 칭송받는다. 오직 선택받은 자만이 {n}의 바늘을 맞을 수 있다.',
      check: (p) => ST(p).cha >= 70,
      rate: 0.94,
      succText: '잉크의 마녀 등극! 작업 한 건에 수천만 원이 오간다.',
      succMoney: 10000,
      failText: '경찰의 불법 시술 단속으로 스튜디오를 옮겨야 했다.',
    },
  },

  // 9. 드리프트 퀸 (심야의 폭주 여제)
  {
    id: 'hj_drifter',
    name: '드리프트 퀸',
    icon: '🏎️',
    ready: (s, p) => p.sex === 'F' && A(s, p) >= 19 && A(s, p) <= 28 && ST(p).str >= 60 && ST(p).cha >= 65 && ST(p).hp >= 60 && hasCar(s, p),
    step1: {
      title: '🌙 새벽 2시의 수도권 와인딩',
      text: '새벽 고갯길 와인딩 코스. 유명 레이싱 크루 리더가 "여자가 탈 차가 아니다"라며 비웃는다. 코너에서 꺾어줄 시간.',
      check: (p) => ST(p).str >= 60,
      rate: 0.88,
      succText: '완벽한 다운힐 드리프트로 백미러에서 지워버렸다! 판돈 획득.',
      succMoney: 2000,
      failText: '타이어 그립을 잃고 스핀했다.',
    },
    step2: {
      title: '🔑 핑크 슬립 (페라리 차 키 쟁탈전)',
      text: '재벌가 도련님이 5억짜리 슈퍼카 키를 보닛에 올리며 차를 걸고 단두대 매치를 신청했다.',
      check: (p) => ST(p).str >= 64 && ST(p).cha >= 66,
      rate: 0.85,
      succText: '헤어핀 코너링으로 압승! 5억짜리 슈퍼카 키를 손에 넣었다.',
      succMoney: 5000,
      failText: '직선 주로에서 마력 차이로 밀렸다.',
    },
    step3: {
      title: '🚨 전설의 다운힐 & 경찰 헬기 돌파',
      text: '한일 프로 드라이버 초청전 우승 직후, 경찰 헬기와 순찰차가 톨게이트를 봉쇄했다! 3cm 차이로 스치며 뚫고 사라져라.',
      check: (p) => ST(p).str >= 68 && ST(p).hp >= 65,
      rate: 0.95,
      succText: '바리케이드를 드리프트로 통과해 밤안개 속으로 사라졌다! 전설의 드리프트 퀸 등극.',
      succMoney: 10000,
      failText: '막다른 길에 몰려 벌금을 물었다.',
    },
  },
];

const ROUTE_MAP = Object.fromEntries(SUPER_ROUTES.map((r) => [r.id, r]));
const fill = (t: string, p: Person) => t.replaceAll('{n}', fullName(p));

/** 매년 시뮬레이션에서 슈퍼 히든 퀘스트 체인 검사 및 이벤트 큐 삽입 */
export function superHiddenYear(s: GameState): string[] {
  const msgs: string[] = [];
  const people = Object.values(s.people).filter((p) => alive(p) && isMainline(s, p));

  for (const p of people) {
    // 이미 히든 직업이면 스킵
    if (p.job.startsWith('hj_')) continue;

    for (const r of SUPER_ROUTES) {
      const f1 = `sh:${r.id}:1`;
      const f2 = `sh:${r.id}:2`;

      // 3단계 미션 체크
      if (p.flags.includes(f2)) {
        if (!s.events.some((e) => e.defId === 'sh_step3' && e.personId === p.id && e.data?.id === r.id)) {
          s.events.push({ uid: s.eventSeq++, defId: 'sh_step3', personId: p.id, data: { id: r.id } });
        }
        continue;
      }

      // 2단계 미션 체크
      if (p.flags.includes(f1)) {
        if (!s.events.some((e) => e.defId === 'sh_step2' && e.personId === p.id && e.data?.id === r.id)) {
          s.events.push({ uid: s.eventSeq++, defId: 'sh_step2', personId: p.id, data: { id: r.id } });
        }
        continue;
      }

      // 1단계 미션 체크 (조건 만족 시 75% 확률로 팝업)
      if (r.ready(s, p)) {
        if (chance(s, 0.75) && !s.events.some((e) => e.defId === 'sh_step1' && e.personId === p.id)) {
          s.events.push({ uid: s.eventSeq++, defId: 'sh_step1', personId: p.id, data: { id: r.id } });
          msgs.push(`✨ ${fullName(p)}에게 특별한 제안이 찾아왔다 (${r.icon} ${r.name})`);
          break;
        }
      }
    }
  }

  return msgs;
}

// ── 1단계 이벤트 정의 ──
const step1Event: EventDef = {
  id: 'sh_step1',
  title: (c) => ROUTE_MAP[c.ev.data.id]?.step1.title ?? '특별한 제의',
  valid: (c) => alive(c.p) && !c.p.job.startsWith('hj_'),
  text: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return `${fill(r.step1.text, c.p)}\n\n✨ [1단계 도전] ${r.icon} ${r.name}의 길`;
  },
  choices: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return gate(c.s, [
      {
        label: `도전한다 (자격 확인)`,
        run: (x) => {
          const ok = r.step1.check(x.p) && chance(x.s, r.step1.rate);
          if (ok) {
            addFlag(x.p, `sh:${r.id}:1`);
            x.p.cash += r.step1.succMoney;
            x.p.happiness = clamp(x.p.happiness + 10, 0, 100);
            return `🎉 성공! ${fill(r.step1.succText, x.p)} (+${formatMoney(r.step1.succMoney)})`;
          }
          return `❌ 실패. ${fill(r.step1.failText, x.p)}`;
        },
      },
      {
        label: '거절하고 평범하게 산다',
        run: (x) => `도전을 고사했다. ${fullName(x.p)}의 일상은 평화롭게 흘러간다.`,
      },
    ]);
  },
};

// ── 2단계 이벤트 정의 ──
const step2Event: EventDef = {
  id: 'sh_step2',
  title: (c) => ROUTE_MAP[c.ev.data.id]?.step2.title ?? '위기와 시련',
  valid: (c) => alive(c.p) && c.p.flags.includes(`sh:${c.ev.data.id}:1`) && !c.p.job.startsWith('hj_'),
  text: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return `${fill(r.step2.text, c.p)}\n\n🔥 [2단계 도전] 더 깊은 어둠과 거대한 판돈`;
  },
  choices: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return gate(c.s, [
      {
        label: `판을 키운다 (2단계 돌파)`,
        run: (x) => {
          const ok = r.step2.check(x.p) && chance(x.s, r.step2.rate);
          if (ok) {
            addFlag(x.p, `sh:${r.id}:2`);
            x.p.cash += r.step2.succMoney;
            x.p.happiness = clamp(x.p.happiness + 15, 0, 100);
            return `🎉 대성공! ${fill(r.step2.succText, x.p)} (+${formatMoney(r.step2.succMoney)})`;
          }
          return `⚠️ 고비를 넘기지 못했다. ${fill(r.step2.failText, x.p)}`;
        },
      },
      {
        label: '여기서 멈추고 손을 뗀다',
        run: (x) => {
          x.p.flags = x.p.flags.filter((f) => !f.startsWith(`sh:${r.id}`));
          return `위험한 판에서 조용히 빠져나왔다. 번 돈은 지켰다.`;
        },
      },
    ]);
  },
};

// ── 3단계 클라이맥스 이벤트 정의 ──
const step3Event: EventDef = {
  id: 'sh_step3',
  title: (c) => ROUTE_MAP[c.ev.data.id]?.step3.title ?? '최종 결전',
  valid: (c) => alive(c.p) && c.p.flags.includes(`sh:${c.ev.data.id}:2`) && !c.p.job.startsWith('hj_'),
  text: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return `${fill(r.step3.text, c.p)}\n\n👑 [최종 각성] ${r.icon} ${r.name} 등극의 순간!`;
  },
  choices: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return gate(c.s, [
      {
        label: `모든 것을 걸고 정점에 선다 (최종 전직)`,
        run: (x) => {
          const ok = r.step3.check(x.p) && chance(x.s, r.step3.rate);
          if (ok) {
            const id = r.id;
            x.p.job = id;
            x.p.jobLevel = 0;
            x.p.jobYears = 0;
            x.p.cash += r.step3.succMoney;
            x.p.flags = x.p.flags.filter((f) => !f.startsWith(`sh:${id}`));
            addFlag(x.p, 'hidden:' + id);
            x.p.happiness = clamp(x.p.happiness + 25, 0, 100);
            x.s.fame += 5;
            return `👑 ${fill(r.step3.succText, x.p)}\n\n✨ [슈퍼 히든 해금] ${HIDDEN_BY_ID[id].icon} ${HIDDEN_BY_ID[id].name} 전직 완료! (+${formatMoney(r.step3.succMoney)})`;
          }
          return `아쉽게 정점의 문턱에서 물러났다. ${fill(r.step3.failText, x.p)}`;
        },
      },
      {
        label: '마지막 순간 평범한 삶을 택한다',
        run: (x) => {
          x.p.flags = x.p.flags.filter((f) => !f.startsWith(`sh:${r.id}`));
          return `모든 욕망을 내려놓고 평온한 일상으로 돌아왔다.`;
        },
      },
    ]);
  },
};

export const SUPER_HIDDEN_EVENTS: EventDef[] = [step1Event, step2Event, step3Event];
