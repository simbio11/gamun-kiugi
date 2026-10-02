// 슈퍼 히든 직업: 3단계 연작 미션 체인.
// 단순 운빨 가챠가 아니라, 자격을 갖춘 자에게 확정적으로 퀘스트가 열리고,
// 빌드업을 완료한 유저는 80~95% 높은 확률로 격파해 나가는 치밀한 육성형 히든 시스템.

import { HIDDEN_BY_ID, isHoH, isSuperHidden } from './hidden-data';
import { gate, type EventDef } from './ev-util';
import { addFlag, age, alive, clamp, fullName, isMainline, markOf } from './people';
import { chance, next } from './rng';
import { myVehicles } from './vehicle';
import { formatMoney } from './economy';
import type { GameState, Person } from './types';
import { GATE_ONLY, GATE_RATE, GATE_READY } from './super-gates';
import { doorOpens, stepPasses } from './super-doors';
import { hiddenMastery, novelty } from './hidden-mastery';

/** 입구(ready)가 열린 사람에게 해마다 첫 장면이 올 기본 확률 (루트마다 GATE_RATE 로 따로) */
const STAT_RATE = 0.45;
import { awardCard } from './cards';

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
  /** 이 단계 장면이 오는 조건 (없으면 앞 단계 다음 해에 바로) — 고문서 복원가는 지능 78·80 */
  when?: (p: Person) => boolean;
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
    ready: (s, p) =>
      p.sex === 'F' &&
      A(s, p) >= 20 &&
      A(s, p) <= 32 &&
      ST(p).cha >= 68 &&
      ST(p).int >= 60 &&
      !p.flags.includes('no_private_jet') &&
      !p.flags.includes('refused:hj_private_jet') &&
      !s.storySeen?.['refused:hj_private_jet:' + p.id],
    step1: {
      title: '🍸 VVIP 전담 면접',
      text: '전 세계 0.001% 부호만을 태우는 프라이빗 제트 선발 면접. 단 한 번의 눈빛과 매너로 고객의 취향을 읽어야 한다.',
      check: (p) => ST(p).cha >= 68,
      rate: 0.88,
      succText: '{n}의 완벽한 샴페인 서빙과 침묵의 미소에 면접관이 고개를 끄덕였다. 전용기 탑승 자격을 얻었다.',
      succMoney: 4000,
      failText: '기내 돌발 상황 대처에서 아쉬운 평가를 받았다.',
      noLabel: '전속 승무원 제의를 정중히 사양한다',
      onNo: (x) => {
        addFlag(x.p, 'no_private_jet');
        addFlag(x.p, 'refused:hj_private_jet');
        (x.s.storySeen ??= {})['refused:hj_private_jet:' + x.p.id] = 1;
        return '전속 승무원 제의를 정중히 사양했다. 다시는 제안이 오지 않을 것이다.';
      },
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
      // 아무 남자에게나 오던 권유 → 승부 기질이 있는 사람에게만 (한탕 성향·노름 버릇·타짜·가문 내 노름꾼)
      const knack = markOf(p, 'risk') >= 3 || markOf(p, 'cheat') >= 1 || p.flags.includes('gambler') || p.traits?.includes('gambler') || p.job === 'hj_gambler';
      if (!knack || !chance(s, 0.12)) return false;
      const last = s.storySeen?.['casino_refused:' + p.id];
      if (last != null && s.year - Number(last) < 10) return false;
      return true;
    },
    step1: {
      title: '🂡 VIP 룸의 초대 (세 번째 승리 뒤)',
      text: '세 번째로 칩을 쓸어 담은 밤, 검은 정장의 사내가 명함 한 장을 내밀었다. 앞면엔 아무것도 없고 뒷면엔 주소 하나. "당신 손은 이기는 법을 압니다. 진짜 테이블은 지하에 있지요. 오늘은 구경만 하셔도 됩니다."',
      yesLabel: '명함의 주소로 내려가 본다',
      noLabel: '명함을 찢고 다시는 카지노에 가지 않는다',
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
      title: '🃏 지하 테이블의 밤',
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
      title: '👑 도박의 왕',
      text: '지하 테이블을 드나든 지 일 년. 이제는 손님으로 만족할 수 없는 지경에 이르렀다. 카지노의 총지배인이 {n}의 비범한 재능과 서늘한 눈빛을 보고 VIP 테이블을 총괄하는 전설의 딜러 자리를 제안한다. "베팅은 자유입니다. 다만 지면, 제게 하나만 약속하십시오."',
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

  // ♟️ 체스 그랜드마스터: [체스 신동] → 13세 대회 통과로 체스 선수 → 30세까지 유지 (super-gates.ts)
  {
    id: 'hj_chess_master',
    name: '체스 그랜드마스터',
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
      title: '🏛 전설의 체스 그랜드마스터',
      text: '국제 체스 연맹 역사상 가장 완벽한 경기력. 전 세계 체스인들의 기립 박수 속에서 그랜드마스터의 왕관을 받는다.',
      check: (p) => ST(p).int >= 80,
      rate: 0.95,
      succText: '인류 지성의 정점! 체스 그랜드마스터의 위업을 달성했다.',
      succMoney: 35000,
      failText: '아쉽게 타이틀 방어에 실패했다.',
    },
  },

  // 🖼️ 예술품 도난 수사관: 사라진 명화의 단서 → 위작 유통망 잠입 → 인터폴 합동 명화 환수
  {
    id: 'hj_art_investigator',
    name: '예술품 도난 수사관',
    icon: '🖼️',
    ready: (s, p) => A(s, p) >= 25 && A(s, p) <= 55 && ST(p).int >= 65 && (['police', 'detective', 'painter', 'researcher'].includes(p.job) || ST(p).cha >= 60),
    step1: {
      title: '🖼️ 사라진 명화의 단서',
      text: '국제 경매장에서 30년 전 도난당한 인상파 명화의 거래 정황이 포착되었다. 도난 예술품 전담팀에서 {n}의 안목을 보고 비밀 수사 합류를 요청했다.',
      check: (p) => ST(p).int >= 65,
      rate: 0.88,
      succText: '캔버스의 붓터치와 안료 분석으로 은닉된 수장고의 위치를 특정했다. 국제 공조 수사가 시작된다.',
      succMoney: 5000,
      failText: '위작 브로커의 꼬리를 놓치고 말았다.',
    },
    step2: {
      title: '🔍 지하 암시장 비밀 잠입',
      text: '스위스 자유무역지대 수장고에서 열리는 불법 경매. 가짜 미술품 수집가로 위장 잠입해 주동자를 특정해야 한다.',
      check: (p) => ST(p).int >= 68 && ST(p).cha >= 62,
      rate: 0.85,
      succText: '완벽한 위장과 미술사 지식으로 밀매 조직 수뇌부의 신뢰를 얻어 결정적 거래 장부를 확보했다.',
      succMoney: 15000,
      failText: '신분 노출 위기를 겪고 가까스로 탈출했다.',
    },
    step3: {
      title: '🏛️ 사라진 세기의 걸작 환수',
      text: '인터폴과 합동 급습 작전. 도주하려는 밀매 총책을 포위하고 국가적 보물인 명화를 무사히 회수해야 한다.',
      check: (p) => ST(p).int >= 70,
      rate: 0.92,
      succText: '단 한 점의 손상도 없이 명화를 조국의 품으로 환수했다! 전 세계 미술계를 뒤흔든 예술품 도난 수사관으로 등극했다.',
      succMoney: 30000,
      failText: '명화는 건졌으나 총책을 놓쳐 수사가 장기화되었다.',
    },
  },

  // 🍽️ 미슐랭 비밀 평가원: 가명의 레스토랑 예약 → 블라인드 시식 평가 → 미슐랭 레드 가이드 발간
  {
    id: 'hj_michelin_inspector',
    name: '미슐랭 비밀 평가원',
    icon: '🍽️',
    ready: (s, p) => A(s, p) >= 26 && A(s, p) <= 60 && (['chef', 'hotelier'].includes(p.job) || ST(p).cha >= 65),
    step1: {
      title: '🍽️ 가명의 비밀 예약',
      text: '전 세계 0.001%의 식당만을 엄선하는 미슐랭 가이드 본사에서 비밀 평가원 제의가 왔다. 철저한 신분 은폐와 객관적 미각이 요구된다.',
      check: (p) => ST(p).cha >= 60,
      rate: 0.9,
      succText: '가명으로 예약하고 식사비를 직접 결제했다. 누구도 {n}이 평가원임을 눈치채지 못했다.',
      succMoney: 4000,
      failText: '지배인에게 신분이 노출될 뻔하여 심사를 중단했다.',
    },
    step2: {
      title: '⭐ 별의 운명을 가르는 미각',
      text: '3스타 후보 파인다이닝에서의 시식. 식재료의 원산지, 온도, 서비스와 페어링까지 완벽한 블라인드 심사 보고서를 작성해야 한다.',
      check: (p) => ST(p).int >= 65,
      rate: 0.88,
      succText: '단 한 방울의 소스 속 미세한 불협화음까지 정확히 짚어냈다. 파리 본사에서 만장일치 찬사를 보냈다.',
      succMoney: 12000,
      failText: '셰프의 명성에 휘둘려 객관성을 잃었다는 지적을 받았다.',
    },
    step3: {
      title: '📖 미슐랭 레드 가이드 발간',
      text: '올해의 레드 가이드 발표 전날 밤. 세계 최고 셰프들의 운명이 {n}의 평가서 한 장에 걸려 있다. 끝까지 얼굴 없는 심판자로 남아야 한다.',
      check: (p) => ST(p).cha >= 68,
      rate: 0.95,
      succText: '{n}이 별을 부여한 레스토랑들이 세계적 명소로 떠올랐다. 영원히 정체를 숨긴 채 식문화를 지배하는 미슐랭 비밀 평가원으로 등극했다.',
      succMoney: 28000,
      failText: '인쇄 직전 평가 오류가 발견되어 명단에서 제외되었다.',
    },
  },

  // 📜 고문서 복원가: 천년 파피루스 발견 → 고대 잉크 화학 복원 → 국립문서보존원 수석 복원관
  {
    id: 'hj_conservator',
    name: '고문서 복원가',
    icon: '📜',
    ready: (s, p) => A(s, p) >= 28 && A(s, p) <= 65 && ST(p).int >= 72 && ST(p).mor >= 55,
    step1: {
      title: '📜 2천년 전 파피루스 사본',
      text: '사막의 동굴에서 바스러지기 직전의 고대 파피루스 사본이 발견되었다. 숨결 하나만 잘못 닿아도 영원히 사라질 위기. 정밀한 해체 작업이 필요하다.',
      check: (p) => ST(p).int >= 68,
      rate: 0.88,
      succText: '초미세 붓과 온습도 제어로 단 한 글자의 훼손도 없이 사본 조각들을 분리해냈다.',
      succMoney: 5000,
      failText: '양피지 가장자리가 바스러져 작업을 중단했다.',
    },
    step2: {
      title: '🧪 고대 천연 잉크의 화학 복원',
      text: '수백 년 동안 빛에 바래 지워진 고문서의 문양. 재료 화학과 분광 분석을 결합해 사라진 글자를 되살려내야 한다.',
      check: (p) => ST(p).int >= 72,
      rate: 0.85,
      succText: '자외선 형광 분광 기술로 800년 전 숨겨진 비밀 문장을 완벽히 복원하는 데 성공했다!',
      succMoney: 15000,
      failText: '잉크 산화로 인해 글자가 번져 판독에 실패했다.',
    },
    step3: {
      title: '🏛️ 국립문서보존원 수석 복원관',
      text: '국가 지정 국보 고문서 복원 총책임자 임명 제의. 국가의 역사를 1,000년 뒤 미래로 건네는 최후의 작업이 시작된다.',
      check: (p) => ST(p).int >= 75,
      rate: 0.92,
      succText: '완벽한 복원으로 역사 교과서를 다시 쓰게 만들었다! 세계가 인정하는 최고의 고문서 복원가로 등극했다.',
      succMoney: 30000,
      failText: '보존 처리 과정에서 미세 결함이 발견되어 재심사에 들어갔다.',
    },
  },

  // 🛡️ VIP 전속 경호원: 철통 의전 심사 → 암살 테러 사전 차단 → 재벌 총수 전속 경호실장
  {
    id: 'hj_bodyguard',
    name: 'VIP 전속 경호원',
    icon: '🛡️',
    ready: (s, p) => A(s, p) >= 22 && A(s, p) <= 50 && ST(p).str >= 70,
    step1: {
      title: '🛡️ 0.1초의 동선 의전 심사',
      text: '국제 정상회담과 글로벌 재벌 총수만을 전담하는 비밀 경호팀 선발 시험. 사격, 격투, 그리고 위협을 사전에 감지하는 눈이 필요하다.',
      check: (p) => ST(p).str >= 70,
      rate: 0.9,
      succText: '사격 만점과 전술 방어에서 압도적인 평가를 받았다. VVIP 근접 경호 자격을 획득했다.',
      succMoney: 6000,
      failText: '위기 반응 속도 테스트에서 0.2초 늦었다.',
    },
    step2: {
      title: '⚡ 군중 속 암살 위협 차단',
      text: '해외 국빈 방문 현장. 수만 명의 군중 속에서 수상한 섬광과 궤적을 포착했다. 몸을 던져 의전 대상을 보호해야 한다.',
      check: (p) => ST(p).str >= 72 && ST(p).int >= 60,
      rate: 0.88,
      succText: '총성이 울리기 전 의심 인물을 단숨에 제압하고 VIP를 안전가옥으로 완벽 피신시켰다!',
      succMoney: 18000,
      failText: '경호 대형이 흐트러져 의전 대상이 부상을 입을 뻔했다.',
    },
    step3: {
      title: '👑 그림자 경호의 정점',
      text: '세계 최대 금융 가문의 총수가 백지 계약서와 가문의 안전을 내맡겼다. "위험이 아예 일어나지 않게 만드는 것, 그게 당신의 실력이오."',
      check: (p) => ST(p).str >= 75,
      rate: 0.95,
      succText: '존재감을 완전히 지운 채 세계를 움직이는 권력자들의 그림자가 되었다. 전설의 VIP 전속 경호원으로 등극했다.',
      succMoney: 35000,
      failText: '계약 조건 협의에서 합의점을 찾지 못했다.',
    },
  },

  // 🕵️ 사립탐정: 미제 실종 사건 수임 → 거대 상속 비리 추적 → 어둠을 걷어내는 사립탐정
  {
    id: 'hj_detective',
    name: '사립탐정',
    icon: '🕵️',
    ready: (s, p) => A(s, p) >= 25 && A(s, p) <= 65 && ST(p).int >= 60 && ST(p).cha >= 55,
    step1: {
      title: '🕵️ 경찰이 포기한 미제 사건',
      text: '비 내리는 밤, 낡은 사무소 문을 두드린 의뢰인. "경찰은 단순 가출이라고 하지만 제 딸은 살아있습니다." 현장 재조사에 착수한다.',
      check: (p) => ST(p).int >= 60,
      rate: 0.88,
      succText: '경찰이 놓친 영수증 조각과 차량 블랙박스 사각지대에서 결정적 도주로를 찾아냈다.',
      succMoney: 4000,
      failText: '현장 증거가 이미 오염되어 단서를 놓쳤다.',
    },
    step2: {
      title: '🗂️ 재벌가 은닉 상속 추적',
      text: '수천억 원대 상속 재산 은닉과 이중장부를 밝혀내 달라는 극비 의뢰. 상대는 거대 로펌과 사설 경호대를 거느리고 있다.',
      check: (p) => ST(p).int >= 65 && ST(p).cha >= 60,
      rate: 0.85,
      succText: '페이퍼 컴퍼니와 차명 금고의 실체를 낱낱이 파헤쳐 법정에 결정타를 날렸다.',
      succMoney: 16000,
      failText: '상대의 미행을 알아채지 못해 자료를 빼앗겼다.',
    },
    step3: {
      title: '🏙️ 도시의 어둠을 걷어내는 자',
      text: '정·재계가 얽힌 거대 게이트의 마지막 열쇠가 {n}의 손에 들어왔다. 거액의 회유를 뿌리치고 진실을 세상에 밝힐 시간이다.',
      check: (p) => ST(p).int >= 70,
      rate: 0.95,
      succText: '진실을 밝혀내며 법의 사각지대에서 약자들을 지키는 도시의 수호자, 전설의 사립탐정으로 등극했다.',
      succMoney: 30000,
      failText: '외압에 부딪혀 수사 파일을 봉인해야 했다.',
    },
  },

  // 🥃 조향사 (코): 천 가지 향 구분 → 전설의 향료 복원 → 파리 명문 하우스 수석 조향사
  {
    id: 'hj_perfumer',
    name: '조향사 (코)',
    icon: '🥃',
    ready: (s, p) => A(s, p) >= 22 && A(s, p) <= 60 && ST(p).cha >= 65 && ST(p).int >= 60,
    step1: {
      title: '👃 천 개의 향 블라인드 테스트',
      text: '프랑스 그라스 조향 학교의 입학 시험. 수천 가지 향료를 눈을 가린 채 오직 코 하나로 성분과 배합비를 맞혀야 한다.',
      check: (p) => ST(p).int >= 60,
      rate: 0.9,
      succText: '0.01%의 미세한 머스크 차이까지 단숨에 맞혀내며 심사위원 전원의 기립 박수를 받았다.',
      succMoney: 5000,
      failText: '후각 피로도로 인해 마지막 샘플을 놓쳤다.',
    },
    step2: {
      title: '🌸 멸종된 고대 장미향 복원',
      text: '기록으로만 남아있는 18세기 왕실 장미 정원의 향. 합성 향료와 천연 에센셜 오일의 황금 비율을 찾아내야 한다.',
      check: (p) => ST(p).cha >= 68 && ST(p).int >= 65,
      rate: 0.88,
      succText: '완벽한 조합으로 300년 전의 향기를 병 속에 되살려냈다! 글로벌 하우스들이 앞다투어 러브콜을 보냈다.',
      succMoney: 18000,
      failText: '잔향의 지속력이 부족해 출시가 보류되었다.',
    },
    step3: {
      title: '✨ 시대를 지배하는 단 한 방울',
      text: '세계에서 단 몇백 명뿐인 최정상 마스터 퍼퓨머(코). 한 사람의 기억과 사랑을 설계하는 시그니처 향수를 론칭한다.',
      check: (p) => ST(p).cha >= 72,
      rate: 0.95,
      succText: '출시 1분 만에 전 세계 품절. 한 방울로 사람의 감정을 지배하는 전설의 조향사로 등극했다.',
      succMoney: 38000,
      failText: '트렌드와 맞지 않아 아쉽게 다음 시즌을 기약했다.',
    },
  },

  // 🔮 별을 읽는 점술사: 심야 골목 점술관 → 엇갈린 운명의 개입 → 별빛의 예언자
  {
    id: 'hj_stargazer',
    name: '별을 읽는 점술사',
    icon: '🔮',
    ready: (s, p) => A(s, p) >= 22 && A(s, p) <= 65 && ST(p).cha >= 68,
    step1: {
      title: '🔮 새벽에만 문을 여는 점술관',
      text: '달이 기우는 새벽 2시, 골목 안쪽 작은 점술관에 첫 손님이 찾아왔다. 타로도 구슬도 없이, 오직 상대의 눈빛에서 별의 궤적을 읽는다.',
      check: (p) => ST(p).cha >= 68,
      rate: 0.9,
      succText: '"당신의 미래 한가운데에 제가 서 있군요." 첫 예언이 소름 끼치도록 정확히 들어맞았다.',
      succMoney: 4000,
      failText: '마음의 동요로 상대의 운명을 읽어내지 못했다.',
    },
    step2: {
      title: '🌌 별자리의 엇갈림과 경고',
      text: '도시의 거물이 은밀히 찾아와 명운을 물었다. 궤도에 붉은 흉조가 드리워져 있다. 진실을 말하면 위험해질 수 있다.',
      check: (p) => ST(p).cha >= 70 && ST(p).int >= 60,
      rate: 0.88,
      succText: '냉철하고 신비로운 예언으로 거물의 파멸을 막아냈다. 정·재계 VIP들의 비밀 상담자로 떠올랐다.',
      succMoney: 16000,
      failText: '거물이 예언을 믿지 않고 문을 박차고 나갔다.',
    },
    step3: {
      title: '👑 운명을 꿰뚫는 별빛의 예언자',
      text: '천 년에 한 번 오는 행성 직렬의 밤. 세상의 거대한 변혁을 예고하는 마지막 별빛의 계시가 {n}의 눈동자에 맺힌다.',
      check: (p) => ST(p).cha >= 75,
      rate: 0.95,
      succText: '예언한 대로 세상이 움직였다. 운명의 비밀을 쥐고 시대를 인도하는 별을 읽는 점술사로 등극했다.',
      succMoney: 35000,
      failText: '별빛이 구름에 가려 계시를 완성하지 못했다.',
    },
  },

  // 👑 교황: 성좌의 부름 (추기경 서임) → 시스티나 성당 콘클라베 → 하얀 연기 (전 세계 1명)
  {
    id: 'hj_pope',
    name: '교황',
    icon: '👑',
    ready: (s, p) => A(s, p) >= 60 && ST(p).mor >= 80 && (['clergy', 'social_worker', 'teacher'].includes(p.job) || p.flags.includes('card:who_hero')),
    step1: {
      title: '🕊️ 바티칸 추기경단 서임',
      text: '평생을 가난한 이웃과 영적 사목에 헌신한 {n}. 로마 교황청으로부터 주님의 포도밭을 돌볼 추기경 서임 칙서가 도착했다.',
      check: (p) => ST(p).mor >= 80,
      rate: 0.92,
      succText: '붉은 비레타를 수여받고 전 세계 교회의 기둥으로 우뚝 섰다. 성좌의 중심에 섰다.',
      succMoney: 8000,
      failText: '교황청 파벌의 견제로 서임이 보류되었다.',
    },
    step2: {
      title: '🇻🇦 시스티나 성당의 콘클라베',
      text: '교황의 선종. 굳게 닫힌 시스티나 성당 안, 전 세계 추기경들이 모여 비밀 투표(콘클라베)에 돌입했다. 3분의 2 이상의 지지가 필요하다.',
      check: (p) => ST(p).mor >= 85 && ST(p).cha >= 65,
      rate: 0.88,
      succText: '투표함이 열릴 때마다 {n}의 이름이 울려 퍼졌다. 마지막 표가 집계되며 지지율을 돌파했다!',
      succMoney: 20000,
      failText: '검은 연기가 굴뚝으로 피어올랐다. 합의에 실패했다.',
    },
    step3: {
      title: '👑 하얀 연기, 전 세계 14억의 목자',
      text: '바티칸 성 베드로 대성전 굴뚝에서 하얀 연기가 피어오른다. "하베무스 파팜(우리에겐 교황이 있습니다)!" 발코니의 붉은 커튼이 젖혀진다.',
      check: (p) => ST(p).mor >= 88,
      rate: 0.98,
      succText: '"평화가 여러분과 함께!" 전 세계 14억 신도의 영적 지도자이자 인류의 등불, 교황으로 등극했다.',
      succMoney: 50000,
      failText: '선출 수락 직전 건강 악화로 양보해야 했다.',
    },
  },

  // 🛰️ 위성 충돌 회피 분석가: 우주 쓰레기 충돌 경보 → 궤도 긴급 계산 → 지구 궤도 수호자
  {
    id: 'hj_space_analyst',
    name: '위성 충돌 회피 분석가',
    icon: '🛰️',
    ready: (s, p) => s.year >= 2010 && A(s, p) >= 24 && A(s, p) <= 60 && ST(p).int >= 72,
    step1: {
      title: '🛰️ 고궤도 충돌 위기 경보',
      text: '지구 저궤도(LEO)에서 수만 개 우주 쓰레기가 우주정거장을 향해 초속 8km로 접근 중이다. 긴급 궤도 분석가 선발에 투입되었다.',
      check: (p) => ST(p).int >= 72,
      rate: 0.9,
      succText: '복잡한 섭동 방정식을 실시간으로 풀어내 충돌 확률을 0.001%로 낮추는 우회 궤도를 도출했다.',
      succMoney: 6000,
      failText: '슈퍼컴퓨터 계산 오차로 결론을 내리지 못했다.',
    },
    step2: {
      title: '🚀 국가 위성군 긴급 회피 기동',
      text: '폭파된 위성 파편 떼가 통신위성 군단을 덮친다. 10분 안에 추진체 분사 각도와 시간을 계산하지 못하면 수조 원대 위성이 전멸한다.',
      check: (p) => ST(p).int >= 76,
      rate: 0.88,
      succText: '단 1초의 지체 없이 최적의 회피 기동을 성공시켜 전 세계 통신망을 지켜냈다!',
      succMoney: 20000,
      failText: '연료 소모가 과다하여 위성 수명이 단축되었다.',
    },
    step3: {
      title: '🌍 지구 궤도 수호자',
      text: '국제 우주교통관제(STM) 사령탑 수석 분석관 임명. 인류의 우주 개척 인프라 전체를 관장하는 최고 책임자의 자리에 선다.',
      check: (p) => ST(p).int >= 80,
      rate: 0.95,
      succText: '지구 궤도의 모든 인공위성과 우주선이 {n}의 계산에 따라 안전하게 유영한다. 우주 교통 관제의 정점에 등극했다!',
      succMoney: 40000,
      failText: '행정 규제에 부딪혀 프로젝트가 지연되었다.',
    },
  },

  // ───── 심층 슈퍼 히든: 슈퍼 히든을 배출한 가문에만 열리는 문 ─────
  H('hj_vampire', '핏빛 후작부인', '🩸', (s, p) => p.sex === 'F' && A(s, p) >= 30 && ST(p).cha >= 70 && ST(p).hp >= 60,
    ['🩸 붉은 초대장', '밀랍으로 봉한 붉은 초대장. "자정, 고성의 무도회에 오십시오."', (p) => ST(p).cha >= 70, 0.85, '무도회의 주인공이 됐다. 창백한 귀족들이 {n}에게 고개를 숙인다.', 5000, '자정 전에 발길을 돌렸다.'],
    ['🌒 영원의 계약', '늙은 뱀파이어 후작이 붉은 잔을 내민다. "마시면 영원히 늙지 않는다. 대신 햇빛과는 작별이지."', (p) => ST(p).hp >= 60 && ST(p).cha >= 72, 0.82, '잔을 비웠다. 송곳니가 돋고, 거울 속 얼굴이 멈췄다. 영원이 시작됐다.', 10000, '잔을 내려놓았다.'],
    ['🏰 고성의 안주인', '후작이 긴 잠에 들며 성의 열쇠를 {n}에게 넘긴다. "이제 밤은 당신의 것이오."', (p) => ST(p).cha >= 74, 0.9, '핏빛 후작부인. 천 년의 고성과 밤의 왕관을 물려받았다.', 22000, '열쇠를 받지 못했다.']),
];

// 단계 판정을 새 입구에 맞춘다: 입구 조건에서 한두 걸음씩만 더. w = 그 단계 장면이 오는 조건 (능력치가 오를 때까지 기다린다)
type Chk = (p: Person) => boolean;
const TUNE: Record<string, { c: [Chk, Chk, Chk]; w?: [Chk, Chk] }> = {
  hj_vtuber: { c: [(p) => ST(p).cha >= 60, (p) => ST(p).cha >= 63 && ST(p).int >= 50, (p) => ST(p).cha >= 66], w: [(p) => ST(p).cha >= 63, (p) => ST(p).cha >= 66] },
  hj_private_jet: { c: [(p) => ST(p).cha >= 55, (p) => ST(p).cha >= 58 && ST(p).int >= 52, (p) => ST(p).cha >= 60] },
  hj_conservator: { c: [(p) => ST(p).int >= 75, (p) => ST(p).int >= 78, (p) => ST(p).int >= 80], w: [(p) => ST(p).int >= 78, (p) => ST(p).int >= 80] },
  hj_space_analyst: { c: [(p) => ST(p).int >= 72, (p) => ST(p).int >= 75, (p) => ST(p).int >= 78], w: [(p) => ST(p).int >= 75, (p) => ST(p).int >= 78] },
  hj_detective: { c: [(p) => ST(p).int >= 62, (p) => ST(p).int >= 64 && ST(p).cha >= 56, (p) => ST(p).int >= 66 && ST(p).hp >= 50] },
  hj_perfumer: { c: [(p) => ST(p).hp >= 60 && ST(p).cha >= 65, (p) => ST(p).cha >= 66, (p) => ST(p).cha >= 68] },
  hj_pope: { c: [(p) => ST(p).mor >= 80, (p) => ST(p).mor >= 82 && ST(p).cha >= 55, (p) => ST(p).mor >= 84] },
  hj_bodyguard: { c: [(p) => ST(p).str >= 70, (p) => ST(p).str >= 72 && ST(p).hp >= 65, (p) => ST(p).str >= 74] },
  hj_art_investigator: { c: [(p) => ST(p).int >= 65, (p) => ST(p).int >= 67 && ST(p).cha >= 55, (p) => ST(p).int >= 69] },
  hj_michelin_inspector: { c: [(p) => ST(p).int >= 55, (p) => ST(p).int >= 60, (p) => ST(p).cha >= 60] },
  hj_stargazer: { c: [(p) => ST(p).cha >= 65, (p) => ST(p).cha >= 67 && ST(p).int >= 55, (p) => ST(p).cha >= 70] },
};
for (const [id, tu] of Object.entries(TUNE)) {
  const r = SUPER_ROUTES.find((x) => x.id === id)!;
  [r.step1.check, r.step2.check, r.step3.check] = tu.c;
  if (tu.w) [r.step2.when, r.step3.when] = tu.w;
}

// 입구는 super-gates.ts 의 루트별 사연으로 연다. 단계 성공률은 조금 낮춰 실패도 있게
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

    // 해마다 순서를 섞는다: 늘 앞쪽 직업만 먼저 걸리지 않게
    const order = [...SUPER_ROUTES];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(next(s) * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (const r of order) {
      const f1 = `sh:${r.id}:1`;
      const f2 = `sh:${r.id}:2`;

      // 3단계 미션 체크
      if (p.flags.includes(f2)) {
        if (r.step3.when && !r.step3.when(p)) continue;
        if (!s.events.some((e) => e.defId === 'sh_step3' && e.personId === p.id && e.data?.id === r.id)) {
          s.events.push({ uid: s.eventSeq++, defId: 'sh_step3', personId: p.id, data: { id: r.id } });
        }
        continue;
      }

      // 2단계 미션 체크
      if (p.flags.includes(f1)) {
        if (r.step2.when && !r.step2.when(p)) continue;
        if (!s.events.some((e) => e.defId === 'sh_step2' && e.personId === p.id && e.data?.id === r.id)) {
          s.events.push({ uid: s.eventSeq++, defId: 'sh_step2', personId: p.id, data: { id: r.id } });
        }
        continue;
      }

      // 1단계 미션 체크 (이미 거절한 라우트는 제외, 희귀 선천 특성 보유 시 100% 즉시 발동, 일반 슈퍼히든 75%)
      if (s.storySeen?.['refused:' + r.id + ':' + p.id] || p.flags.includes('refused:' + r.id)) continue;
      // 능력치 문(ready) 또는 다른 문(super-doors: 관련 직업·재능·성격·지나온 길, 아주 드물게 운)
      const byStats = r.ready(s, p);
      if (byStats || doorOpens(s, p, r.id, (pct) => chance(s, pct))) {
        const hasRare = p.traits?.some((t) => ['speed_demon', 'hypnotic_eye', 'dark_artist'].includes(t));
        if ((hasRare || !byStats || chance(s, (GATE_RATE[r.id] ?? STAT_RATE) * hiddenMastery(s).sup * novelty(s, r.id))) && !s.events.some((e) => e.defId === 'sh_step1' && e.personId === p.id)) {
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
        run: (x) => {
          const ok = stepPasses(x.s, x.p, r.id, r.step1.check(x.p), (pct) => chance(x.s, pct)) && chance(x.s, r.step1.rate);
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
          (x.s.storySeen ??= {})['refused:' + r.id + ':' + x.p.id] = 1;
          addFlag(x.p, 'refused:' + r.id);
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
        run: (x) => {
          const ok = stepPasses(x.s, x.p, r.id, r.step2.check(x.p), (pct) => chance(x.s, pct)) && chance(x.s, r.step2.rate);
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
        run: (x) => {
          const ok = stepPasses(x.s, x.p, r.id, r.step3.check(x.p), (pct) => chance(x.s, pct)) && chance(x.s, r.step3.rate);
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
            awardCard(x.s, x.p, id, `${HIDDEN_BY_ID[id]?.name ?? id} 등극`);
            return `👑 ${fill(r.step3.succText, x.p)}\n\n✨ [슈퍼 히든 해금] ${HIDDEN_BY_ID[id].icon} ${HIDDEN_BY_ID[id].name} 전직 완료! (+${formatMoney(r.step3.succMoney)})\n🎴 명예의 전당 카드를 획득했습니다!`;
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
