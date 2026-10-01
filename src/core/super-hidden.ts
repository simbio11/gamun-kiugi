// 슈퍼 히든 직업: 3단계 연작 미션 체인.
// 단순 운빨 가챠가 아니라, 자격을 갖춘 자에게 확정적으로 퀘스트가 열리고,
// 빌드업을 완료한 유저는 80~95% 높은 확률로 격파해 나가는 치밀한 육성형 히든 시스템.

import { HIDDEN_BY_ID, isHoH, isSuperHidden } from './hidden-data';
import { gate, type EventDef } from './ev-util';
import { addFlag, age, alive, clamp, fullName, isMainline, markOf } from './people';
import { chance } from './rng';
import { myVehicles } from './vehicle';
import { formatMoney } from './economy';
import type { GameState, Person } from './types';
import { GATE_ONLY, GATE_READY } from './super-gates';

interface SuperStep {
  title: string;
  text: string;
  check: (p: Person) => boolean;
  rate: number;
  succText: string;
  succMoney: number;
  failText: string;
  yesLabel?: string;
  noLabel?: string;
  onNo?: (x: { s: GameState; p: Person }) => string;
}

interface SuperRoute {
  id: string;
  name: string;
  icon: string;
  /** 1단계 트리거 자격 조건 */
  ready: (s: GameState, p: Person) => boolean;
  step1: SuperStep;
  step2: SuperStep;
  step3: SuperStep;
}

const A = (s: GameState, p: Person) => age(s, p);
const ST = (p: Person) => p.actual;
const hasCar = (s: GameState, p: Person) => s.assets.some((a) => a.kind === 'vehicle' && a.ownerId === p.id) || myVehicles(s).length > 0;
const hasPC = (s: GameState) => !!s.gear?.pc;


type Step = [string, string, (p: Person) => boolean, number, string, number, string];
const stepOf = (x: Step) => ({ title: x[0], text: x[1], check: x[2], rate: x[3], succText: x[4], succMoney: x[5], failText: x[6] });
/** 가문에 슈퍼 히든 카드를 가진 사람이 있었나 (심층 슈퍼 히든의 문) */
export const hasSuperLineage = (s: GameState) => (s.cards ?? []).some((c) => isSuperHidden(c.id) && !isHoH(c.id));
/** 심층 슈퍼 히든: 슈퍼 히든 가문에서만 */
const H = (id: string, name: string, icon: string, ready: (s: GameState, p: Person) => boolean, a: Step, b: Step, c: Step): SuperRoute => ({
  id, name, icon, ready: (s, p) => hasSuperLineage(s) && ready(s, p), step1: stepOf(a), step2: stepOf(b), step3: stepOf(c),
});

export const SUPER_ROUTES: SuperRoute[] = [
  // 버튜버 여제: 노래 방송 → 브랜드 콜라보 → 3D 단독 콘서트
  {
    id: 'hj_vtuber',
    name: '버튜버 여제',
    icon: '🎧',
    ready: (s, p) => p.sex === 'F' && A(s, p) >= 20 && A(s, p) <= 27 && ST(p).cha >= 68 && ST(p).int >= 60 && hasPC(s),
    step1: {
      title: '🎤 첫 노래 방송',
      text: '방 안에서 몰래 부르던 노래를 아바타의 목소리로 처음 방송해 보기로 했다. 떨리는 손으로 방송 시작 버튼을 누른다.',
      check: (p) => ST(p).cha >= 68,
      rate: 0.88,
      succText: '청아한 목소리에 채팅창이 폭발했다. 하룻밤 새 구독자가 수천 명 늘었다.',
      succMoney: 3000,
      failText: '긴장해서 음이 흔들렸다. 다음을 기약했다.',
    },
    step2: {
      title: '🤝 대형 브랜드 콜라보',
      text: '유명 게임사와 음료 브랜드가 동시에 콜라보를 제안했다. 기획서와 대본을 직접 짜서 설득해야 한다.',
      check: (p) => ST(p).int >= 60 && ST(p).cha >= 70,
      rate: 0.85,
      succText: '콜라보 방송이 대성공! 편의점마다 {n}의 아바타가 그려진 음료가 깔렸다.',
      succMoney: 10000,
      failText: '조건이 맞지 않아 계약이 무산됐다.',
    },
    step3: {
      title: '🏟 3D 단독 콘서트',
      text: '드디어 3D 단독 콘서트. 동시 시청자 30만 명 앞에서 모션 캡처 장비가 멈췄다! 목소리 하나로 무대를 지켜야 한다.',
      check: (p) => ST(p).cha >= 72,
      rate: 0.95,
      succText: '장비 없이 부른 아카펠라에 모두가 울었다. 전 세계 실시간 트렌드 1위, 버튜버 여제로 등극했다.',
      succMoney: 20000,
      failText: '공연을 중단해야 했다. 팬들이 따뜻하게 위로했다.',
    },
  },

  // 드리프트 퀸: 아마추어 서킷 → 프로 데뷔 → 국제 챔피언십 (선천 특성 [질주본능] 필요, 2%)
  {
    id: 'hj_drifter',
    name: '드리프트 퀸',
    icon: '🏎️',
    ready: (s, p) => p.sex === 'F' && A(s, p) >= 19 && hasCar(s, p) && (p.traits?.includes('speed_demon') ?? false),
    step1: {
      title: '🏁 아마추어 서킷 대회',
      text: '주말 아마추어 드리프트 대회. 베테랑 참가자가 "초보가 올 데가 아니다"라며 웃는다. 타고난 감각으로 코너를 공략할 시간.',
      check: () => true,
      rate: 0.98,
      succText: '완벽한 각도의 드리프트로 심사위원 만점! 첫 우승 상금을 받았다.',
      succMoney: 4000,
      failText: '타이어 그립을 잃고 스핀했다. 다음 대회를 노린다.',
    },
    step2: {
      title: '📋 프로 팀 입단 테스트',
      text: '자동차 회사 레이싱 팀이 테스트 드라이버를 뽑는다. 최고의 기록을 낸 한 명만 계약서를 받는다.',
      check: () => true,
      rate: 0.98,
      succText: '헤어핀 코너에서 코스 레코드를 깼다! 프로 계약서에 사인했다.',
      succMoney: 10000,
      failText: '직선 구간에서 기록이 밀렸다.',
    },
    step3: {
      title: '🏆 국제 드리프트 챔피언십',
      text: '세계 챔피언십 결승. 비가 내리기 시작한 트랙, 상대는 3연패의 디펜딩 챔피언이다.',
      check: () => true,
      rate: 0.99,
      succText: '빗속에서 그린 완벽한 라인! 관중석이 일어섰다. 전설의 드리프트 퀸 등극.',
      succMoney: 20000,
      failText: '마지막 코너에서 아깝게 밀려 준우승했다.',
    },
  },

  // 밤의 대부: 대부의 부름 → 가문 전쟁 → 도시의 왕 (어두운 판에서 이름을 날린 자에게 열린다)
  {
    id: 'hj_mafia',
    name: '밤의 대부',
    icon: '🥃',
    ready: (s, p) =>
      p.sex === 'M' && A(s, p) >= 28 && A(s, p) <= 70 && ST(p).cha >= 56 &&
      (markOf(p, 'cheat') >= 1 || markOf(p, 'risk') >= 3 ||
        p.flags.includes('hidden:hj_gambler') || p.flags.includes('hidden:hj_smuggler')),
    step1: {
      title: '🥃 대부의 부름',
      text: '시가 연기 자욱한 방. 늙은 대부가 {n}을 부른다. "내 자리를 물려줄 사람은 너뿐이다. 조직은 가족이야." 식탁 위에 반지 하나가 놓여 있다.',
      check: (p) => ST(p).cha >= 56,
      rate: 0.92,
      succText: '반지에 입을 맞췄다. 이제 밤의 거리에서 {n}의 말이 통한다.',
      succMoney: 6000,
      failText: '대부는 반지를 거둬 갔다. "아직 때가 아니다."',
    },
    step2: {
      title: '⚔ 가문 전쟁',
      text: '경쟁 조직이 항구 창고와 구역 셋을 동시에 쳤다. 다섯 가문이 긴 탁자에 모였고, 판을 정리할 사람은 {n}뿐이다.',
      check: (p) => ST(p).cha >= 60 && ST(p).int >= 55,
      rate: 0.9,
      succText: '한 사람도 다치지 않고 판을 정리했다. 다섯 가문이 {n}의 이름을 새겼다.',
      succMoney: 16000,
      failText: '판이 깨졌다. 조직이 흔들리고 옛 원한만 남았다.',
    },
    step3: {
      title: '👑 도시의 왕',
      text: '늙은 대부가 눈을 감았다. 장례 미사에 도시의 절반이 모였다. 관 앞에서 회중시계와 반지를 함께 내미는 손. "이제 밤은 당신 것이오."',
      check: (p) => ST(p).cha >= 64,
      rate: 0.95,
      succText: '도시의 밤이 새 주인을 얻었다. 사람들은 {n}을 대부라 부른다.',
      succMoney: 30000,
      failText: '관 앞에서 발이 떨어지지 않았다. 자리는 다른 손에 갔다.',
    },
  },

  // ✈️ 프라이빗 제트 전속 승무원: VVIP 면접 → 대양 횡단 비행 → 전속 비밀 계약
  {
    id: 'hj_private_jet',
    name: '프라이빗 제트 전속 승무원',
    icon: '✈️',
    ready: (s, p) => p.sex === 'F' && A(s, p) >= 20 && A(s, p) <= 32 && ST(p).cha >= 68 && ST(p).int >= 60,
    step1: {
      title: '🍸 VVIP 전담 면접',
      text: '전 세계 0.001% 부호만을 태우는 프라이빗 제트 선발 면접. 단 한 번의 눈빛과 매너로 고객의 취향을 읽어야 한다.',
      check: (p) => ST(p).cha >= 68,
      rate: 0.88,
      succText: '{n}의 완벽한 샴페인 서빙과 침묵의 미소에 면접관이 고개를 끄덕였다. 전용기 탑승 자격을 얻었다.',
      succMoney: 4000,
      failText: '기내 돌발 상황 대처에서 아쉬운 평가를 받았다.',
    },
    step2: {
      title: '✈️ 대양 횡단 야간 비행',
      text: '태평양 1만 미터 상공의 난기류 속, 까다롭기로 악명 높은 중동 재벌이 긴급 회의를 소집했다. 흔들림 없는 완벽한 의전이 필요하다.',
      check: (p) => ST(p).int >= 62 && ST(p).cha >= 70,
      rate: 0.85,
      succText: '폭풍우 속에서도 잔 하나 흔들리지 않았다. "내 비행기엔 오직 이 사람만 태우겠소." 감탄이 터져 나왔다.',
      succMoney: 12000,
      failText: '기내 서비스가 지연되어 승객의 불만을 샀다.',
    },
    step3: {
      title: '🥂 단 한 명을 위한 전속 계약',
      text: '글로벌 금융 가문의 수장이 백지수표와 전속 계약서를 내밀었다. "목적지도, 일정도 모두 당신에게 맡기겠소."',
      check: (p) => ST(p).cha >= 72,
      rate: 0.92,
      succText: '전 세계 하늘을 누비는 프라이빗 제트 전속 승무원 등극. 그 누구도 그녀의 진짜 이름을 모른다.',
      succMoney: 25000,
      failText: '계약 조건이 맞지 않아 아쉽게 돌아섰다.',
    },
  },

  // 🂡 비밀 카지노의 딜러 (도박의 왕): 카지노 권유 → 3번 방문 중독 전직, 거절 시 10년 쿨다운
  {
    id: 'hj_underground_dealer',
    name: '비밀 카지노의 딜러 (도박의 왕)',
    icon: '🂡',
    ready: (s, p) => {
      if (p.sex !== 'M' || A(s, p) < 20 || A(s, p) > 65) return false;
      const last = s.storySeen?.['casino_refused:' + p.id];
      if (last != null && s.year - Number(last) < 10) return false;
      return true;
    },
    step1: {
      title: '🂡 친구의 권유 (카지노 1차 방문)',
      text: '오랜 친구가 은밀하게 다가와 어깨를 툭 친다. "야, 도심 지하에 기가 막힌 카지노가 있는데 딱 한 번만 가볼래? 가볍게 게임만 하자. 손해 보면 내가 메꿔줄게!"',
      yesLabel: '호기심에 친구를 따라 카지노에 가본다',
      noLabel: '도박은 위험하다며 단호히 거절한다',
      check: (p) => ST(p).cha >= 50 || ST(p).int >= 50,
      rate: 0.92,
      succText: '화려한 조명과 칩 소리에 매료되었다! 첫 배팅에서 승리하며 짜릿한 쾌감이 온몸을 감싼다.',
      succMoney: 5000,
      failText: '첫 판부터 칩을 잃었지만, 테이블의 묘한 긴장감이 머릿속에서 떠나지 않는다.',
      onNo: (x) => {
        x.s.storySeen = x.s.storySeen || {};
        x.s.storySeen['casino_refused:' + x.p.id] = x.s.year;
        return '도박은 패가망신의 지름길이라며 친구의 권유를 단호히 거절했다. (최소 10년간 카지노 권유를 받지 않습니다)';
      },
    },
    step2: {
      title: '🃏 카지노의 밤 (카지노 2차 방문과 중독)',
      text: '지난번 방문 이후 귓가에 칩 소리가 맴돌아 일이 손에 잡히지 않는다. 결국 또다시 홀린 듯 지하 카지노 문 앞까지 왔다. 오늘 밤도 배팅을 시작할까?',
      yesLabel: '짜릿한 손맛을 잊지 못하고 카지노로 들어간다',
      noLabel: '더 깊이 빠지기 전에 충동을 누르고 돌아선다',
      check: (p) => ST(p).int >= 55 || ST(p).cha >= 55,
      rate: 0.9,
      succText: '신들린 직감과 카드 카운팅으로 하이롤러 테이블을 휩쓸었다! 카지노에 완전히 중독되어 딜러의 손기술까지 눈에 들어오기 시작한다.',
      succMoney: 15000,
      failText: '치열한 접전 끝에 아슬아슬하게 본전을 건졌다. 어둠의 열기가 점점 온몸을 잠식해간다.',
      onNo: (x) => {
        x.s.storySeen = x.s.storySeen || {};
        x.s.storySeen['casino_refused:' + x.p.id] = x.s.year;
        return '더 깊이 빠져들기 전에 정신을 차리고 카지노를 박차고 나왔다. (카지노의 유혹에서 벗어났습니다)';
      },
    },
    step3: {
      title: '👑 도박의 왕 (카지노 3차 방문과 전직)',
      text: '어느덧 3번째 카지노 방문. 이제는 손님으로 만족할 수 없는 지경에 이르렀다. 카지노의 총지배인이 {n}의 비범한 재능과 서늘한 눈빛을 보고 VIP 테이블을 총괄하는 전설의 딜러 자리를 제안한다. "베팅은 자유입니다. 다만 지면, 제게 하나만 약속하십시오."',
      yesLabel: '카지노의 왕(비밀 카지노 딜러)이 된다',
      noLabel: '마지막 순간 파멸을 직감하고 손을 뗀다',
      check: (p) => ST(p).int >= 60 || ST(p).cha >= 60,
      rate: 0.95,
      succText: '"베팅은 자유입니다. 지면 제게 하나만 약속하시죠." 테이블의 모든 패를 지배하며, 패배자들에게 평생의 약속을 받아내는 비밀 카지노의 전설(도박의 왕)로 등극했다!',
      succMoney: 30000,
      failText: '마지막 딜링 테스트에서 아깝게 실수를 저질렀다.',
      onNo: (x) => {
        x.s.storySeen = x.s.storySeen || {};
        x.s.storySeen['casino_refused:' + x.p.id] = x.s.year;
        return '마지막 순간 차가운 이성을 되찾고 어둠의 세계를 떠났다. 평온한 일상으로 돌아왔다.';
      },
    },
  },

  // 밤의 대모: 대부의 짝. 총 대신 장부와 사람으로 판을 짠다 (여성 전용)
  {
    id: 'hj_godmother',
    name: '밤의 대모',
    icon: '🖤',
    ready: (s, p) =>
      p.sex === 'F' && A(s, p) >= 28 && A(s, p) <= 70 && ST(p).cha >= 56 &&
      (markOf(p, 'cheat') >= 1 || markOf(p, 'risk') >= 3 ||
        p.flags.includes('hidden:hj_gambler') || p.flags.includes('hidden:hj_smuggler')),
    step1: {
      title: '🖤 대모의 부름',
      text: '대부가 병석에 누운 뒤, 그의 아내가 {n}을 뒷방으로 불렀다. "조직은 총으로만 굴러가지 않아. 장부와 사람, 그게 진짜 힘이야."',
      check: (p) => ST(p).cha >= 56,
      rate: 0.92,
      succText: '장부를 넘겨받았다. 이제 밤의 거리에서 {n}의 말이 조용히 통한다.',
      succMoney: 5500,
      failText: '아직 이르다는 눈빛이었다. 장부는 다시 금고로 들어갔다.',
    },
    step2: {
      title: '⚖ 다섯 가문의 중재',
      text: '전쟁으로 다섯 가문이 흩어졌다. 긴 탁자에 앉은 원로들이 서로를 노려본다. 총 대신 말로 판을 정리할 사람이 필요하다.',
      check: (p) => ST(p).cha >= 60 && ST(p).int >= 55,
      rate: 0.9,
      succText: '한 사람도 다치지 않게 판을 갈랐다. 다섯 가문이 {n}의 이름을 새겼다.',
      succMoney: 15000,
      failText: '탁자가 뒤집혔다. 옛 원한만 깊어졌다.',
    },
    step3: {
      title: '👑 밤의 어머니',
      text: '대부의 회중시계가 멈췄다. 조직의 원로들이 {n}의 방문 앞에 줄을 섰다. "대모, 이제 밤을 맡아 주십시오."',
      check: (p) => ST(p).cha >= 64,
      rate: 0.95,
      succText: '도시의 밤이 {n}의 손에 들어왔다. 총소리 없이, 장부 하나로.',
      succMoney: 30000,
      failText: '원로들은 고개를 저었다. 자리는 아직 비어 있다.',
    },
  },

  // ♟️ 여성 체스 그랜드마스터: 적성검사 [체스 신동] → 체스 선수 고유 루트 → 35세까지 유지
  {
    id: 'hj_chess_master',
    name: '여성 체스 그랜드마스터',
    icon: '♟️',
    ready: (s, p) => p.sex === 'F' && p.job === 'chess_player' && (p.traits?.includes('chess_prodigy') ?? false) && A(s, p) >= 35,
    step1: {
      title: '♟️ 캔디데이트 토너먼트 결승',
      text: '세계 최고 수준의 도전자 결정전. 백을 쥐고 승리를 따내야만 챔피언십 도전권을 얻는다.',
      check: (p) => ST(p).int >= 75,
      rate: 0.9,
      succText: '퀸을 희생하는 파격적인 전술로 상대의 킹을 메이트 직전으로 몰았다! 도전권 획득.',
      succMoney: 8000,
      failText: '상대의 철벽 수비에 막혀 무승부로 끝났다.',
    },
    step2: {
      title: '👑 14번기 챔피언십 사투',
      text: '현역 세계 챔피언과의 14번기 매치. 13국까지 동점, 마지막 14번째 대국이 시작된다.',
      check: (p) => ST(p).int >= 78,
      rate: 0.88,
      succText: '복잡한 엔드게임에서 단 하나의 승리수를 찾아냈다! 세계 챔피언 타이틀 획득.',
      succMoney: 18000,
      failText: '시간 부족으로 마지막 1분을 남기고 실수를 범했다.',
    },
    step3: {
      title: '🏛 전설의 여성 체스 그랜드마스터',
      text: '국제 체스 연맹 역사상 가장 완벽한 경기력. 전 세계 체스인들의 기립 박수 속에서 그랜드마스터의 왕관을 받는다.',
      check: (p) => ST(p).int >= 80,
      rate: 0.95,
      succText: '인류 지성의 정점! 여성 체스 그랜드마스터의 위업을 달성했다.',
      succMoney: 35000,
      failText: '아쉽게 타이틀 방어에 실패했다.',
    },
  },
  // ───── 심층 슈퍼 히든: 슈퍼 히든을 배출한 가문에만 열리는 문 ─────
  H('hj_vampire', '핏빛 후작부인', '🩸', (s, p) => p.sex === 'F' && A(s, p) >= 30 && ST(p).cha >= 70 && ST(p).hp >= 60,
    ['🩸 붉은 초대장', '밀랍으로 봉한 붉은 초대장. "자정, 고성의 무도회에 오십시오."', (p) => ST(p).cha >= 70, 0.85, '무도회의 주인공이 됐다. 창백한 귀족들이 {n}에게 고개를 숙인다.', 5000, '자정 전에 발길을 돌렸다.'],
    ['🌒 영원의 계약', '늙은 뱀파이어 후작이 붉은 잔을 내민다. "마시면 영원히 늙지 않는다. 대신 햇빛과는 작별이지."', (p) => ST(p).hp >= 60 && ST(p).cha >= 72, 0.82, '잔을 비웠다. 송곳니가 돋고, 거울 속 얼굴이 멈췄다. 영원이 시작됐다.', 10000, '잔을 내려놓았다.'],
    ['🏰 고성의 안주인', '후작이 긴 잠에 들며 성의 열쇠를 {n}에게 넘긴다. "이제 밤은 당신의 것이오."', (p) => ST(p).cha >= 74, 0.9, '핏빛 후작부인. 천 년의 고성과 밤의 왕관을 물려받았다.', 22000, '열쇠를 받지 못했다.']),
];

// 직업마다의 새 사연(super-gates.ts)으로 문을 연다. 단계 성공률은 조금 낮춰 실패도 있게
for (const r of SUPER_ROUTES) {
  const gateReady = GATE_READY[r.id];
  const old = r.ready;
  if (gateReady) r.ready = GATE_ONLY.has(r.id) ? gateReady : (s, p) => gateReady(s, p) || old(s, p);
  for (const st of [r.step1, r.step2, r.step3]) st.rate = Math.max(0.6, st.rate - 0.1);
}

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

      // 1단계 미션 체크 (희귀 선천 특성 보유 시 100% 즉시 발동, 일반 슈퍼히든 75%)
      if (r.ready(s, p)) {
        const hasRare = p.traits?.some((t) => ['speed_demon', 'hypnotic_eye', 'dark_artist'].includes(t));
        if ((hasRare || chance(s, 0.75)) && !s.events.some((e) => e.defId === 'sh_step1' && e.personId === p.id)) {
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
  valid: (c) => !!ROUTE_MAP[c.ev.data.id] && alive(c.p) && !c.p.job.startsWith('hj_'),
  text: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return `${fill(r.step1.text, c.p)}\n\n✨ [1단계 도전] ${r.icon} ${r.name}의 길`;
  },
  choices: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return gate(c.s, [
      {
        label: r.step1.yesLabel ?? `도전한다 (자격 확인)`,
        odds: r.step1.check(c.p) ? r.step1.rate : 0,
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
        label: r.step1.noLabel ?? '거절하고 평범하게 산다',
        run: (x) => {
          if (r.step1.onNo) return r.step1.onNo(x);
          return `도전을 고사했다. ${fullName(x.p)}의 일상은 평화롭게 흘러간다.`;
        },
      },
    ]);
  },
};

// ── 2단계 이벤트 정의 ──
const step2Event: EventDef = {
  id: 'sh_step2',
  title: (c) => ROUTE_MAP[c.ev.data.id]?.step2.title ?? '위기와 시련',
  valid: (c) => !!ROUTE_MAP[c.ev.data.id] && alive(c.p) && c.p.flags.includes(`sh:${c.ev.data.id}:1`) && !c.p.job.startsWith('hj_'),
  text: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return `${fill(r.step2.text, c.p)}\n\n🔥 [2단계 도전] 더 큰 무대, 더 큰 기회`;
  },
  choices: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return gate(c.s, [
      {
        label: r.step2.yesLabel ?? `한 단계 더 나아간다 (2단계 돌파)`,
        odds: r.step2.check(c.p) ? r.step2.rate : 0,
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
        label: r.step2.noLabel ?? '여기서 멈추고 손을 뗀다',
        run: (x) => {
          x.p.flags = x.p.flags.filter((f) => !f.startsWith(`sh:${r.id}`));
          if (r.step2.onNo) return r.step2.onNo(x);
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
  valid: (c) => !!ROUTE_MAP[c.ev.data.id] && alive(c.p) && c.p.flags.includes(`sh:${c.ev.data.id}:2`) && !c.p.job.startsWith('hj_'),
  text: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return `${fill(r.step3.text, c.p)}\n\n👑 [최종 각성] ${r.icon} ${r.name} 등극의 순간!`;
  },
  choices: (c) => {
    const r = ROUTE_MAP[c.ev.data.id];
    return gate(c.s, [
      {
        label: r.step3.yesLabel ?? `모든 것을 걸고 정점에 선다 (최종 전직)`,
        odds: r.step3.check(c.p) ? r.step3.rate : 0,
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
        label: r.step3.noLabel ?? '마지막 순간 평범한 삶을 택한다',
        run: (x) => {
          x.p.flags = x.p.flags.filter((f) => !f.startsWith(`sh:${r.id}`));
          if (r.step3.onNo) return r.step3.onNo(x);
          return `모든 욕망을 내려놓고 평온한 일상으로 돌아왔다.`;
        },
      },
    ]);
  },
};

export const SUPER_HIDDEN_EVENTS: EventDef[] = [step1Event, step2Event, step3Event];
