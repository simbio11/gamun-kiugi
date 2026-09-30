// 근현대사 모드: 1960년, 4·19 혁명의 해에 다섯 살 아이로 시작한다 (1955년생).
// 해마다 실제 신문·방송 뉴스가 오고, 역사의 큰 사건은 호외(1960~80년대)·TV 속보(1990~2000년대)·
// 휴대폰 속보(2010년대~)로 들이닥쳐 가족의 삶을 흔든다. 2026년부터는 현대 모드처럼 미래로 이어진다.
//
// 연대·수치는 널리 알려진 기록(정부 발표·주요 언론·국가기록원·통계청)을 따랐고, 게임에 맞게 줄였다.
// 사건의 비극은 가볍게 다루지 않도록 선택지를 '가족이 겪은 일'로만 두었다.

import { chance, pick } from './rng';
import { gate, type Choice, type Ctx, type EventDef } from './ev-util';
import { addAsset, addHolding, expectedIncome, formatMoney } from './economy';
import { wageIndex } from './pay';
import { addFlag, age, alive, clamp, fullName, hasFlag, head, householder, isMainline, mark, parentsOf } from './people';
import type { GameState, Person } from './types';

export const HIST_START = 1960;
export const isHist = (s: GameState) => s.era === 'history';
/** 그해 모드가 역사 구간인가 (2025년까지) */
export const inHist = (s: GameState) => isHist(s) && s.year <= 2025;

// ───────────────────────── 시대 이름 ─────────────────────────

const GOVS: [number, string][] = [
  [1960, '제2공화국 · 허정→장면'],
  [1961, '국가재건최고회의 (군정)'],
  [1963, '제3공화국 · 박정희 정부'],
  [1972, '유신 · 박정희 정부'],
  [1979, '유신 말기 · 박정희 → 최규하'],
  [1980, '제5공화국 · 전두환 정부'],
  [1988, '제6공화국 · 노태우 정부'],
  [1993, '문민정부 · 김영삼'],
  [1998, '국민의 정부 · 김대중'],
  [2003, '참여정부 · 노무현'],
  [2008, '이명박 정부'],
  [2013, '박근혜 정부'],
  [2017, '문재인 정부'],
  [2022, '윤석열 정부'],
  [2025, '이재명 정부'],
];
export function govOf(y: number): string {
  let g = GOVS[0][1];
  for (const [yy, n] of GOVS) if (y >= yy) g = n;
  return g;
}
/** 소식이 오는 매체: 호외 → TV 속보 → 휴대폰 알림 */
export const mediaOf = (y: number): 'extra' | 'tv' | 'push' => (y < 1990 ? 'extra' : y < 2010 ? 'tv' : 'push');

// ───────────────────────── 해마다 뉴스 ─────────────────────────

/** 연도별 신문 머리기사와 생활 풍경 (월은 대략) */
const NEWS: Record<number, string[]> = {
  1960: ['3·15 정·부통령 선거, 공개투표·투표함 바꿔치기 등 부정선거 논란', '마산 앞바다에서 김주열 군 시신 발견 (4월 11일), 전국이 들끓다', '이승만 대통령 하야 성명 (4월 26일), 허정 과도정부', '제2공화국 출범: 윤보선 대통령·장면 국무총리 내각책임제', '생활: 쌀밥 한 그릇이 귀한 보릿고개, 미국 원조 밀가루로 끼니를 잇는 집이 많다'],
  1961: ['5월 16일 새벽, 박정희 소장 등 군부가 한강을 건너 정권을 장악 (5·16 군사정변)', '국가재건최고회의 발족, 중앙정보부 창설', '부정축재자 처리법: 대기업 총수들 줄줄이 연행', '생활: 거리마다 "혁명공약" 벽보, 깡패 소탕·밀수 단속'],
  1962: ['제1차 경제개발 5개년 계획 시작 (1962~1966)', '6월 10일 화폐개혁: 10환 → 1원, 예금 일부 동결', '울산 공업센터 기공식', '생활: 라디오 한 대가 온 동네의 뉴스 창구'],
  1963: ['박정희, 제5대 대통령 선거에서 윤보선을 15만 표 차로 누르고 당선', '서독 파견 광부 1진 출국 (12월): "지하 1,000m 막장"', '제3공화국 출범', '생활: 쌀값 폭등, 혼분식 장려 운동'],
  1964: ['한일회담 반대 6·3 시위, 서울 일원 비상계엄', '월남(베트남)에 의료·태권도 교관단 파견 시작', '수출 1억 달러 돌파 (11월 30일, 훗날 "무역의 날")', '생활: 연탄 아궁이 가스 중독 사고가 겨울마다 끊이지 않는다'],
  1965: ['한일기본조약 조인 (6월 22일), 국교 정상화', '월남에 청룡·맹호부대 등 전투부대 파병', '금리 현실화: 예금 금리 연 26.4%로 인상', '생활: 흑백 TV는 부잣집에나 있다. 만화방·극장 앞은 늘 북적'],
  1966: ['서독 간호사 파견 본격화', '한미 주둔군지위협정(SOFA) 체결', '생활: 구로 수출공업단지(구로공단) 조성, 봉제·가발 공장에 10대 여공들이 몰려든다'],
  1967: ['박정희 재선, 6·8 국회의원 선거 부정 시비', '동백림 간첩단 사건 발표', '생활: 가발·섬유가 수출 1위 품목'],
  1968: ['1월 21일 북한 124군부대 청와대 기습 시도 (김신조 사건)', '향토예비군 창설, 병역 복무기간 연장, 고교·대학 교련 도입', '경부고속도로 착공, 주민등록증 발급 시작', '국민교육헌장 선포 (12월)', '울진·삼척 무장공비 침투 (11월)'],
  1969: ['3선 개헌 국민투표 통과 (10월)', '아폴로 11호 달 착륙 (7월 20일), 온 국민이 TV 앞에 모이다', '생활: 중학교 무시험 진학 시작 (서울부터)'],
  1970: ['경부고속도로 개통 (7월 7일), 서울–부산 5시간', '새마을운동 제창 (4월)', '서울 와우아파트 붕괴 (4월 8일)', '청계천 평화시장 재단사 전태일 분신 (11월 13일): "근로기준법을 지켜라!"', '생활: 서울 인구 500만 돌파, 판자촌 철거와 광주대단지 이주'],
  1971: ['박정희 3선 (김대중 후보와 94만 표 차)', '광주대단지 사건 (8월): 철거민 수만 명 봉기', '대연각호텔 화재 (12월 25일)', '생활: 경제성장률 두 자릿수, "잘살아 보세" 노래가 울려 퍼진다'],
  1972: ['7·4 남북공동성명 발표', '8·3 사채 동결 긴급명령', '10월 17일 비상계엄 선포, 유신헌법 (통일주체국민회의 간선제)', '생활: 새마을운동으로 초가지붕이 슬레이트로 바뀐다'],
  1973: ['포항제철 1기 준공 (6월)', '김대중 도쿄 납치 사건 (8월)', '중동전쟁으로 제1차 석유파동 (10월~): 물가 급등, 네온사인 소등', '중화학공업화 선언'],
  1974: ['서울 지하철 1호선 개통 (8월 15일, 기본요금 30원)', '광복절 기념식장에서 육영수 여사 피격 서거', '긴급조치 1·4호, 민청학련 사건', '생활: 중동 건설 붐이 시작된다'],
  1975: ['인민혁명당 재건위 사건 8명 사형 집행 (4월 9일)', '사이공 함락, 베트남 전쟁 종결 (4월 30일)', '긴급조치 9호: 유신 비판 금지', '생활: 장발·미니스커트 단속, 통기타 가요 금지곡 줄줄이'],
  1976: ['판문점 도끼 만행 사건 (8월 18일)', '현대자동차 첫 고유 모델 포니 출시', '생활: 강남 영동지구 개발로 논밭이 아파트 부지로'],
  1977: ['수출 100억 달러 달성 (12월)', '500인 이상 사업장 직장의료보험 시작', '부가가치세 도입, 이리역 화약 열차 폭발 사고 (11월)', '생활: 복부인·아파트 청약 광풍의 서막'],
  1978: ['8·8 부동산 투기 억제 대책: 강남 아파트 투기 광풍', '고리 원자력발전소 1호기 상업운전', '동일방직 똥물 사건, 노동운동 탄압', '생활: 압구정 현대아파트 특혜 분양 사건'],
  1979: ['이란 혁명으로 제2차 석유파동', 'YH무역 여공 신민당사 농성 (8월)', '부마민주항쟁 (10월 16일~)', '10월 26일 궁정동 안가, 박정희 대통령 피격 서거', '12·12 군사반란: 전두환·노태우 등 신군부가 군권 장악'],
  1980: ['"서울의 봄": 계엄 해제·민주화 요구 시위', '5·17 비상계엄 전국 확대, 김대중 등 연행', '5·18 광주민주화운동 (5월 18~27일)', '전두환, 통일주체국민회의에서 대통령 선출', '7·30 교육개혁: 과외 전면 금지·본고사 폐지·졸업정원제', '언론 통폐합, 12월 컬러 TV 방송 시작', '경제성장률 마이너스 (1953년 이래 처음)'],
  1981: ['제5공화국 출범', '1988 올림픽 서울 유치 확정 (9월 30일, 바덴바덴 "쎄울!")', '생활: 해외 유학·여행은 아직 허가제'],
  1982: ['야간 통행금지 해제 (1월 5일, 37년 만)', '프로야구 출범 (3월 27일, 6개 구단)', '이철희·장영자 어음 사기 사건', '생활: 첫 학력고사, 중·고교 교복 자율화 발표'],
  1983: ['KBS 이산가족 찾기 생방송 (6월 30일~, 138일 동안 1만여 가족 상봉)', '대한항공 007편 소련 전투기에 격추 (9월 1일)', '아웅산 묘소 폭탄 테러 (10월 9일)'],
  1984: ['서울 지하철 2호선 순환선 완공', '88올림픽고속도로 개통', '생활: 컬러TV·냉장고·전화가 집집마다 들어온다'],
  1985: ['제12대 총선, 신민당 돌풍', '남북 이산가족 고향방문단 첫 상봉 (9월)', '생활: 3저 호황(저유가·저금리·저달러)의 시작'],
  1986: ['서울 아시안게임 (9~10월), 한국 금메달 93개', '부천서 성고문 사건', '생활: 무역수지 첫 흑자, 3저 호황으로 주가 급등'],
  1987: ['서울대생 박종철 고문치사 (1월): "탁 치니 억 하고"', '6월 민주항쟁: 넥타이부대까지 거리로', '6·29 선언: 대통령 직선제 수용', '7~8월 노동자 대투쟁', '대한항공 858기 폭파 (11월)', '노태우, 13대 대통령 당선 (12월, 야권 분열)'],
  1988: ['국민연금 시행, 최저임금제 시행 (1월)', '서울 올림픽 (9월 17일~10월 2일), 종합 4위', '5공 비리·광주 청문회 TV 생중계', '생활: 마이카 시대, 아파트 청약 열기'],
  1989: ['해외여행 전면 자유화 (1월)', '코스피 1,000 돌파 (3월)', '분당·일산 신도시 건설 발표 (4월), 주택 200만 호 건설', '전 국민 의료보험 (7월)', '전교조 결성'],
  1990: ['3당 합당 (민정·민주·공화 → 민주자유당)', '한소 수교 (9월)', '생활: 집값 폭등, 전셋값 급등으로 세입자 자살 잇따라', '범죄와의 전쟁 선포'],
  1991: ['남북한 유엔 동시 가입 (9월)', '낙동강 페놀 유출 사건', '생활: 분당 입주 시작, 삐삐(무선호출기) 유행'],
  1992: ['한중 수교 (8월)', '서태지와 아이들 데뷔 "난 알아요"', '김영삼, 14대 대통령 당선 (12월)', '생활: PC통신 하이텔·천리안 인기'],
  1993: ['문민정부 출범, 하나회 숙청', '8월 12일 금융실명제 긴급명령', '대전 엑스포', '생활: 첫 대학수학능력시험 (8월·11월 두 번)'],
  1994: ['김일성 사망 (7월 8일)', '성수대교 붕괴 (10월 21일)', '생활: 이른바 "X세대", 삐삐와 PC방 이전의 오락실'],
  1995: ['삼풍백화점 붕괴 (6월 29일), 502명 사망', '첫 전국동시지방선거', '노태우 비자금·전두환·노태우 구속 (11~12월)', '생활: 인터넷 상용 서비스 시작'],
  1996: ['OECD 가입 (12월)', '연세대 한총련 사태', '생활: 1인당 국민소득 1만 달러 돌파, 해외여행 붐'],
  1997: ['한보그룹 부도 (1월), 기아 부도 (7월)', '11월 21일 IMF 구제금융 신청', '환율 달러당 2,000원 육박, 기업 연쇄 부도', '김대중, 15대 대통령 당선 (12월)'],
  1998: ['금 모으기 운동 (1월~): 351만 명이 금 227톤', '실업자 150만 명, 정리해고·명예퇴직 바람', '박세리 US여자오픈 우승 (7월): 맨발 투혼', '금강산 관광 시작 (11월)'],
  1999: ['대우그룹 해체', '코스닥 벤처 열풍', '생활: 초고속 인터넷·PC방 급증, 스타크래프트'],
  2000: ['6·15 남북정상회담 (평양)', '닷컴 버블 붕괴, 코스닥 폭락', '의약분업 시행·의사 파업', '국민기초생활보장제 시행 (10월)', '김대중 대통령 노벨평화상 (12월)'],
  2001: ['인천국제공항 개항 (3월)', 'IMF 차입금 조기 상환 (8월)', '미국 9·11 테러'],
  2002: ['한일 월드컵, 한국 4강 신화 (6월), 거리 응원 700만', '효순·미선 사건 촛불 추모', '노무현, 16대 대통령 당선 (12월)', '생활: 싸이월드 미니홈피 열풍, 카드 돌려막기'],
  2003: ['대구 지하철 화재 참사 (2월 18일)', '카드 대란: 신용불량자 370만 명', '생활: 로또 광풍'],
  2004: ['KTX 개통 (4월)', '대통령 탄핵소추 → 헌재 기각', '주 5일 근무제 도입 (7월)'],
  2005: ['황우석 줄기세포 논문 조작 사건', '청계천 복원', '생활: 판교 신도시 청약 광풍'],
  2006: ['부동산 폭등, "버블 세븐"', '종합부동산세 강화', '반기문, 유엔 사무총장 선출 (10월)'],
  2007: ['코스피 2,000 첫 돌파 (7월)', '태안 기름 유출 사고 (12월)', '이명박, 17대 대통령 당선 (12월)'],
  2008: ['숭례문 화재 (2월)', '미국산 쇠고기 수입 반대 촛불집회', '리먼 브러더스 파산, 글로벌 금융위기 (9월), 코스피 900선', '생활: 펀드 반토막'],
  2009: ['노무현 전 대통령 서거 (5월), 김대중 전 대통령 서거 (8월)', '신종플루 유행', '아이폰 국내 출시 (11월): 스마트폰 시대'],
  2010: ['천안함 피격 (3월 26일)', '연평도 포격 (11월 23일)', '김연아 밴쿠버 올림픽 금메달', '생활: 카카오톡 등장'],
  2011: ['저축은행 영업정지 사태', '김정일 사망 (12월)', '생활: 반값 등록금 촛불, 무상급식 논쟁'],
  2012: ['싸이 "강남스타일" 유튜브 10억 뷰', '박근혜, 18대 대통령 당선 (12월)'],
  2013: ['생활: 전셋값 폭등, "하우스푸어"', '기초연금 도입 논의'],
  2014: ['세월호 참사 (4월 16일): 304명 희생', '생활: 단통법, 담뱃값 인상 예고'],
  2015: ['메르스 유행', '생활: "헬조선", "N포 세대"'],
  2016: ['알파고 vs 이세돌 (3월)', '최순실 국정농단, 광화문 촛불집회 (10월~)'],
  2017: ['박근혜 대통령 파면 (3월 10일)', '문재인, 19대 대통령 당선 (5월)', '비트코인 광풍 (12월)'],
  2018: ['평창 동계올림픽 (2월)', '판문점 남북정상회담 (4월 27일), 싱가포르 북미정상회담', '생활: 최저임금 16.4% 인상'],
  2019: ['봉준호 "기생충" 칸 황금종려상', '일본 수출규제·불매운동'],
  2020: ['코로나19 팬데믹, 사회적 거리두기', '"기생충" 아카데미 4관왕 (2월)', '긴급재난지원금 (5월), "동학개미" 주식 열풍', '임대차 3법 시행 (7월)'],
  2021: ['부동산·코인 광풍, "영끌"', '"오징어 게임" 넷플릭스 세계 1위', '코스피 3,000 돌파 (1월)'],
  2022: ['윤석열, 20대 대통령 당선 (3월)', '금리 급등, 집값 하락', '이태원 참사 (10월 29일)'],
  2023: ['잼버리 파행', '생활: 역전세·전세사기 공포'],
  2024: ['의대 증원 갈등, 전공의 집단 사직', '한강, 노벨문학상 (10월)', '12월 3일 비상계엄 선포 → 국회 해제 의결 (6시간 만)'],
  2025: ['대통령 파면 (4월 4일)', '이재명, 21대 대통령 당선 (6월)', '생활: 인공지능이 일상으로'],
};

// ───────────────────────── 역사의 큰 사건 (선택이 있는 것) ─────────────────────────

interface Major {
  id: string;
  y: number;
  /** 해가 범위일 때 (기회형 사건): 이 범위 안에서 조건이 맞는 첫해 */
  to?: number;
  head: string;
  sub: string;
  cond?: (s: GameState) => boolean;
  /** 이 사건을 누구에게 띄우나 (기본: 가주) */
  who?: (s: GameState) => Person | undefined;
  body: (c: Ctx) => string;
  choices: (c: Ctx) => Choice[];
}

const hap = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));
const wi = (s: GameState) => wageIndex(s.year);
const mains = (s: GameState) => Object.values(s.people).filter((p) => alive(p) && isMainline(s, p));
const kin = (s: GameState) => {
  const h = head(s);
  return [h, ...parentsOf(s, h), ...Object.values(s.people).filter((p) => alive(p) && p.id !== h.id && parentsOf(s, h).some((q) => q.childIds.includes(p.id)))].filter((p) => p && alive(p));
};
const SALARY_JOBS = new Set(['office', 'corp', 'banker', 'analyst', 'marketer', 'sales', 'hr', 'secretary', 'trader', 'big_factory', 'factory', 'insurance', 'developer', 'mech_engineer', 'chip_engineer', 'researcher', 'architect']);
const BIZ_JOBS = new Set(['shopkeeper', 'cafe_owner', 'cvs_owner', 'restaurant', 'online_shop', 'hairdresser', 'nail_artist', 'tour_guide', 'founder', 'barista', 'chef']);
const ok = (label: string, text: string, fx?: (x: Ctx) => void): Choice => ({ label, run: (x) => (fx?.(x), text) });

const MAJORS: Major[] = [
  {
    id: 'h419',
    y: 1960,
    head: '학생들이 경무대로!',
    sub: '1960년 4월 19일 · 부정선거 규탄 시위',
    body: () =>
      '3·15 부정선거에 항의하던 마산 시위에서 실종된 김주열 군이 눈에 최루탄이 박힌 채 바다에서 떠올랐다.\n4월 19일, 서울의 대학생·고등학생 수만 명이 경무대로 향했고 경찰이 발포했다. 전국에서 186명이 숨졌다.\n4월 25일 대학 교수단까지 거리로 나섰고, 26일 이승만 대통령이 하야를 발표했다.\n\n다섯 살 아이는 영문도 모른 채 어른들의 굳은 얼굴을 본다.',
    choices: (c) => {
      const f = parentsOf(c.s, c.p).find((p) => p.sex === 'M' && alive(p));
      return [
        ok('아버지가 시민들과 함께 거리로 나선다', '돌아온 아버지의 셔츠에 최루탄 냄새가 뱄다. "이 나라가 바뀔 거다."', (x) => {
          if (f) (f.actual.mor = clamp(f.actual.mor + 3, 0, 100)), mark(f, 'honest');
          x.s.fame += 1;
          if (f && chance(x.s, 0.15)) f.actual.hp = clamp(f.actual.hp - 8, 0, 100);
        }),
        ok('가게 문을 닫고 라디오에 귀를 기울인다', '온 가족이 라디오 앞에 모였다. 하야 발표가 나오자 골목에서 만세 소리가 터졌다.'),
      ];
    },
  },
  {
    id: 'h516',
    y: 1961,
    head: '군사혁명위원회, 전권 장악',
    sub: '1961년 5월 16일 새벽 · 5·16 군사정변',
    body: (c) => {
      const rich = c.s.origin === 'rich';
      return `새벽 5시, 라디오에서 낯선 목소리가 "혁명공약"을 읽는다. 박정희 소장이 이끄는 군인들이 한강 인도교를 건너 방송국과 정부 청사를 장악했다.\n장면 총리는 수녀원에 숨었고, 사흘 뒤 내각이 총사퇴했다. 국회는 해산됐다.${rich ? '\n\n⚠ "부정축재자 처리": 재산가들이 줄줄이 연행된다. 우리 집에도 조사관이 찾아왔다.' : ''}`;
    },
    choices: (c) => {
      if (c.s.origin !== 'rich') return [ok('라디오를 끄고 조용히 지낸다', '거리에 군용 트럭이 오갔다. 어른들은 말을 아꼈다.')];
      const f = householder(c.s);
      const fine = Math.round(Math.max(0, f.cash) * 0.2);
      return [
        ok(`재산 일부를 "헌납"한다 (${formatMoney(fine)})`, '국가재건 명목으로 재산 일부를 내놓았다. 대신 사업은 지켰다.', () => (f.cash -= fine)),
        {
          label: '버틴다',
          run: (x: Ctx) => {
            if (!chance(x.s, 0.5)) return '조사관이 다녀간 뒤 조용해졌다. 운이 좋았다.';
            f.cash -= fine * 2;
            f.actual.hp = clamp(f.actual.hp - 6, 0, 100);
            return `연행돼 한 달을 조사받았다. ${formatMoney(fine * 2)}을 환수당했다.`;
          },
        },
      ];
    },
  },
  {
    id: 'hmoney',
    y: 1962,
    head: '오늘부터 10환은 1원',
    sub: '1962년 6월 10일 · 긴급통화조치',
    body: () => '정부가 밤사이 화폐개혁을 발표했다. 옛 환 화폐는 1주일 안에 새 원 화폐로 바꿔야 하고, 예금은 일부가 묶인다.\n"장롱 속 돈을 끌어내 산업 자금으로 쓰겠다"는 뜻이었지만, 시장이 얼어붙어 한 달 만에 동결이 풀렸다.',
    choices: (c) => [
      ok('은행에 줄을 서서 새 돈으로 바꾼다', '은행 앞에 끝없는 줄. 새 지폐를 처음 만져 봤다.'),
      ...(c.s.origin !== 'poor'
        ? [
            {
              label: '장롱 속 돈을 몰래 금붙이로 바꿔 둔다',
              run: (x: Ctx) => {
                if (chance(x.s, 0.8)) return '금은방에서 금반지로 바꿨다. 물가가 뛰는 동안 금값도 따라 올랐다.';
                householder(x.s).cash -= Math.round(200 * wi(x.s));
                return '금은방 사기에 걸려 적잖이 손해를 봤다.';
              },
            } as Choice,
          ]
        : []),
    ],
  },
  {
    id: 'hgermany',
    y: 1974,
    to: 1977,
    head: '서독 파견 광부·간호사 모집',
    sub: '해외개발공사 · 3년 계약',
    cond: (s) => {
      const h = head(s);
      return age(s, h) >= 20 && age(s, h) <= 30 && !h.spouseId;
    },
    body: (c) =>
      `신문 광고: "서독 탄광 광부 모집 — 월 600마르크 이상." 국내 월급의 여덟 배.\n1963년부터 광부 약 8천 명, 간호사 약 1만 명이 서독으로 떠났다. 지하 1,000미터 막장, 낯선 병원의 궂은일. 대신 번 돈은 고스란히 고향으로 보낸다.\n${fullName(c.p)} ${age(c.s, c.p)}세.`,
    choices: (c) => {
      const earn = Math.round(3 * 3000 * wi(c.s));
      return [
        {
          label: c.p.sex === 'M' ? '광부로 간다 (3년)' : '간호조무 교육을 받고 간호사로 간다 (3년)',
          run: (x) => {
            x.p.cash += earn;
            x.p.actual.hp = clamp(x.p.actual.hp - (x.p.sex === 'M' ? 10 : 5), 0, 100);
            x.p.actual.mor = clamp(x.p.actual.mor + 3, 0, 100);
            addFlag(x.p, 'germany');
            addFlag(x.p, 'abroad');
            mark(x.p, 'selfmade', 2);
            for (const q of parentsOf(x.s, x.p)) q.affinity = clamp(q.affinity + 15, -100, 100);
            return `3년 뒤 돌아왔다. 통장에 ${formatMoney(earn)}. 부모님께 논 몇 마지기를 사 드리고도 남았다. 대신 ${x.p.sex === 'M' ? '폐가 예전 같지 않다' : '밤마다 향수병에 울었다'}.`;
          },
        },
        ok('한국에 남는다', '"여기서도 할 수 있다." 광고를 접었다.'),
      ];
    },
  },
  {
    id: 'hvietnam',
    y: 1965,
    to: 1972,
    head: '월남 파병 장병 모집',
    sub: '맹호·청룡·백마부대 · 파월 장병 수당',
    who: (s) => kin(s).find((p) => p.sex === 'M' && age(s, p) >= 20 && age(s, p) <= 27 && !hasFlag(p, 'vietnam')),
    body: (c) =>
      `${fullName(c.p)} ${age(c.s, c.p)}세. 군에서 월남 파병 지원자를 받는다.\n전투수당은 달러로 나와 집에 송금된다. 1964~1973년 연인원 32만 명이 파병됐고 5천여 명이 전사했다. 돌아온 이들 중 상당수는 훗날 고엽제 후유증에 시달렸다.`,
    choices: () => [
      {
        label: '지원한다',
        run: (x) => {
          const send = Math.round(2 * 1800 * wi(x.s));
          householder(x.s).cash += send;
          addFlag(x.p, 'vietnam');
          x.s.fame += 1;
          if (chance(x.s, 0.016)) {
            x.p.deathYear = x.s.year;
            return `…전사 통지서가 왔다. 태극기에 덮인 관이 돌아왔다. 송금된 돈 ${formatMoney(send)}은 차마 쓸 수가 없었다.`;
          }
          if (chance(x.s, 0.25)) addFlag(x.p, 'agent_orange');
          x.p.actual.hp = clamp(x.p.actual.hp - 5, 0, 100);
          return `정글에서 1년 반. 무사히 돌아왔다. 집에는 송금한 ${formatMoney(send)}으로 새 지붕이 올라갔다.`;
        },
      },
      ok('지원하지 않는다', '다른 부대로 배치됐다. 동기 몇은 월남에서 돌아오지 못했다.'),
    ],
  },
  {
    id: 'h121',
    y: 1968,
    head: '무장공비, 청와대 코앞까지',
    sub: '1968년 1월 21일 · 김신조 사건',
    body: () => '북한 124군부대 31명이 청와대를 습격하려다 세검정 고개에서 저지됐다. 김신조 한 명만 생포됐다.\n정부는 향토예비군을 창설하고 고등학교·대학교에 교련을 들여왔다. 병사 복무기간도 36개월로 늘어난다.',
    choices: () => [ok('뉴스를 듣는다', '밤마다 등화관제 훈련. 동네 어른들이 예비군복을 입었다.')],
  },
  {
    id: 'hsaemaul',
    y: 1971,
    head: '새마을운동',
    sub: '"새벽종이 울렸네, 새아침이 밝았네"',
    body: (c) => `정부가 전국 3만여 마을에 시멘트 335포대씩을 나눠 줬다. 초가지붕을 슬레이트로 바꾸고, 마을 길을 넓히고, 다리를 놓는다.\n${c.s.origin === 'poor' ? '우리 동네도 새마을 사업 대상이다.' : '동네 반상회에서 새마을 성금을 걷는다.'}`,
    choices: (c) => [
      ok('부모님이 새마을 지도자로 앞장선다', '새벽마다 마을 방송이 울렸다. 우리 마을이 우수마을로 뽑혀 표창을 받았다.', (x) => {
        x.s.fame += 1;
        for (const q of parentsOf(x.s, x.p)) (q.actual.hp = clamp(q.actual.hp - 2, 0, 100)), mark(q, 'network');
      }),
      ok('성금만 낸다', '성금 봉투를 냈다.', (x) => (householder(x.s).cash -= Math.round(30 * wi(x.s)))),
      ...(c.s.origin === 'poor' ? [ok('이 참에 서울로 올라간다 (이촌향도)', '보따리 몇 개를 싸 들고 서울 변두리 셋방으로 올라왔다. 공장 일자리는 많았다.', (x) => addFlag(householder(x.s), 'to_seoul'))] : []),
    ],
  },
  {
    id: 'hgangnam',
    y: 1970,
    to: 1977,
    head: '"말죽거리 땅, 사 두면 오른다"',
    sub: '영동(강남) 개발 계획',
    cond: (s) => householder(s).cash > 1500 * wageIndex(s.year),
    body: () =>
      '제3한강교(한남대교)가 놓이고 영동지구 개발이 시작됐다. 배밭과 논이던 말죽거리 땅값이 1963년부터 10여 년 사이 수백 배로 뛰었다는 말이 돈다.\n복덕방 영감: "지금도 늦지 않았어요. 곧 아파트가 들어선다니까."',
    choices: (c) => {
      const cash = householder(c.s).cash;
      const amt = Math.round(Math.max(0, cash) * 0.5);
      return gate(c.s, [
        {
          label: `강남 땅을 산다 (${formatMoney(amt)})`,
          cost: amt,
          run: (x) => {
            const a = addAsset(x.s, 'land', householder(x.s).id, amt, '영동 말죽거리 논밭');
            a.beta = 1.9;
            a.tags = ['강남 개발'];
            a.cost = amt;
            a.bought = x.s.year;
            return '등기부에 우리 이름이 올라갔다. 온통 진흙탕 논밭이지만 저 너머로 아파트 공사장이 보인다.';
          },
        },
        ok('"땅 투기는 도박"이라며 거절한다', '복덕방 영감이 혀를 찼다.'),
      ]);
    },
  },
  {
    id: 'hoil',
    y: 1973,
    head: '석유파동! 기름값 4배',
    sub: '1973년 10월 · 제1차 석유파동',
    body: () => '중동전쟁 뒤 아랍 산유국들이 석유 수출을 줄였다. 유가가 네 배로 뛰고 물가가 20% 넘게 오른다.\n정부는 네온사인 소등, 승용차 10부제, 방송 시간 단축을 명령했다.',
    choices: () => [
      ok('연탄을 넉넉히 들여놓는다', '광에 연탄을 가득 쌓았다. 겨울은 무사히 넘길 것이다.', (x) => (householder(x.s).cash -= Math.round(40 * wi(x.s)))),
      ok('허리띠를 졸라맨다', '반찬 가짓수가 줄었다.', (x) => mains(x.s).forEach((p) => hap(p, -2))),
    ],
  },
  {
    id: 'hmideast',
    y: 1975,
    to: 1983,
    head: '사우디 건설 현장 인력 모집',
    sub: '중동 건설 붐 · 2년 계약',
    who: (s) => kin(s).find((p) => p.sex === 'M' && age(s, p) >= 22 && age(s, p) <= 45 && !hasFlag(p, 'mideast') && !['doctor', 'lawyer', 'judge', 'professor', 'politician'].includes(p.job)),
    body: (c) => `현대건설이 사우디 주베일 항만 공사를 따냈다 (1976, 9억 달러). 중동 건설 현장에서 일하면 국내의 서너 배를 번다.\n섭씨 50도의 모래바람, 하루 12시간 노동, 2년 동안 가족과 떨어져 지내야 한다.\n${fullName(c.p)} ${age(c.s, c.p)}세.`,
    choices: () => [
      {
        label: '간다 (2년)',
        run: (x) => {
          const earn = Math.round(2 * 2600 * wi(x.s));
          householder(x.s).cash += earn;
          x.p.actual.hp = clamp(x.p.actual.hp - 6, 0, 100);
          addFlag(x.p, 'mideast');
          if (x.p.spouseId) x.p.bond = clamp((x.p.bond ?? 60) - 8, 0, 100);
          return `까맣게 타서 돌아왔다. 송금한 돈 ${formatMoney(earn)}. 이 돈으로 셋방을 벗어날 수 있다.`;
        },
      },
      ok('가족 곁에 남는다', '"돈보다 가족이지." 아내가 조용히 손을 잡았다.'),
    ],
  },
  {
    id: 'h1026',
    y: 1979,
    head: '박 대통령 서거',
    sub: '1979년 10월 26일 · 궁정동',
    body: () => '10월 26일 밤, 궁정동 안가 만찬 자리에서 김재규 중앙정보부장이 쏜 총에 박정희 대통령이 숨졌다. 18년 통치가 끝났다.\n다음 날 아침, 전국에 비상계엄이 선포됐다. 12월 12일에는 전두환 보안사령관이 이끄는 신군부가 군권을 장악했다.',
    choices: () => [ok('TV 앞에서 할 말을 잃는다', '분향소 앞에 긴 줄이 늘어섰다. 사람들은 "이제 어떻게 되는 거냐"고 수군댔다.')],
  },
  {
    id: 'h518',
    y: 1980,
    head: '계엄사 "광주 사태 진압"',
    sub: '1980년 5월 · 광주민주화운동',
    body: (c) =>
      `신문은 "폭도들의 난동"이라고만 쓴다. 하지만 광주에 사는 친척에게서 들려온 이야기는 전혀 다르다.\n5월 18일부터 열흘 동안 계엄군이 비상계엄 해제를 요구하던 학생과 시민을 총칼로 진압했다. 공식 집계로만 민간인 사망 165명, 행방불명 수십 명, 부상자 수천 명.\n진실은 1988년 청문회에서야 TV로 알려진다.\n\n${fullName(c.p)} ${age(c.s, c.p)}세${hasFlag(c.p, 'student') ? ', 대학생이다.' : '.'}`,
    choices: () => [
      {
        label: '광주의 진실을 알리는 유인물을 돌린다',
        run: (x) => {
          x.p.actual.mor = clamp(x.p.actual.mor + 4, 0, 100);
          mark(x.p, 'honest', 2);
          if (chance(x.s, 0.35)) {
            addFlag(x.p, 'arrested80');
            x.p.actual.hp = clamp(x.p.actual.hp - 10, 0, 100);
            hap(x.p, -15);
            return '사흘 만에 끌려갔다. 한 달 뒤 풀려났지만 몸에 멍이 남았고 학적부에 기록이 남았다. 훗날 민주화운동 관련자로 인정받는다.';
          }
          return '밤마다 등사기를 돌렸다. 다행히 잡히지 않았다.';
        },
      },
      ok('입을 다문다', '라디오를 껐다. 그 봄의 일은 오랫동안 집 안에서도 입에 올리지 않았다.', (x) => hap(x.p, -4)),
    ],
  },
  {
    id: 'h730',
    y: 1980,
    head: '과외 전면 금지',
    sub: '1980년 7월 30일 · 교육 정상화 방안',
    cond: (s) => mains(s).some((p) => age(s, p) >= 7 && age(s, p) <= 18),
    body: () => '국가보위비상대책위원회가 모든 과외를 금지했다. 대학 본고사도 폐지하고 졸업정원제를 도입한다.\n적발되면 학부모는 공직에서 쫓겨나고 학생은 학교에서 징계를 받는다. (2000년 헌법재판소가 위헌 결정을 내릴 때까지 이어진다)',
    choices: (c) => [
      ok('학교 공부만 시킨다', '학교 수업과 참고서로 버틴다. 가난한 집 아이에게는 오히려 공평해졌다.'),
      ...(c.s.origin !== 'poor'
        ? [
            {
              label: '몰래 "비밀 과외"를 시킨다',
              cost: Math.round(300 * wi(c.s)),
              run: (x: Ctx) => {
                if (chance(x.s, 0.15)) {
                  x.s.fame = Math.max(0, x.s.fame - 3);
                  return '적발됐다. 신문에 이름이 났다. (명성 −3)';
                }
                for (const k of mains(x.s)) if (age(x.s, k) >= 10 && age(x.s, k) <= 18 && typeof k.study === 'number') k.study = clamp(k.study + 3, 0, 100);
                return '밤 10시, 커튼을 친 방에서 대학생 과외 선생님을 만났다. 성적이 올랐다.';
              },
            } as Choice,
          ]
        : []),
    ],
  },
  {
    id: 'hfamily83',
    y: 1983,
    head: '"누가 이 사람을 모르시나요"',
    sub: '1983년 6월 30일~ · KBS 이산가족 찾기',
    who: (s) => kin(s).find((p) => hasFlag(p, 'silhyang')),
    body: (c) => `6·25 때 헤어진 가족을 찾는 생방송이 138일 동안 이어졌다. 여의도 KBS 앞은 사연을 적은 벽보로 뒤덮였다.\n${fullName(c.p)}은(는) 1·4 후퇴 때 헤어진 동생을 30년 넘게 찾고 있다.`,
    choices: () => [
      {
        label: '여의도에 가서 방송에 나간다',
        run: (x) => {
          if (chance(x.s, 0.35)) {
            hap(x.p, 30);
            x.p.actual.hp = clamp(x.p.actual.hp + 3, 0, 100);
            x.p.flags = x.p.flags.filter((f) => f !== 'silhyang');
            return '"혹시… 형님?" 생방송 도중 연결된 전화. 33년 만에 동생을 찾았다. 온 가족이 부둥켜안고 울었다.';
          }
          hap(x.p, -5);
          return '석 달을 여의도에 나갔지만 끝내 찾지 못했다.';
        },
      },
      ok('TV로만 지켜본다', '남의 상봉 장면을 보며 밤새 울었다.'),
    ],
  },
  {
    id: 'h610',
    y: 1987,
    head: '호헌 철폐! 독재 타도!',
    sub: '1987년 6월 · 6월 민주항쟁',
    body: () => '1월 박종철 고문치사, 6월 9일 연세대 이한열 최루탄 피격. 6월 10일부터 전국에서 수백만 명이 거리로 나섰다. 점심시간 넥타이 부대까지 합류했다.\n결국 6월 29일, 노태우 민정당 대표가 대통령 직선제를 받아들이겠다고 선언했다.',
    choices: () => [
      ok('넥타이를 맨 채 시위대에 합류한다', '명동성당 앞에서 태극기를 흔들었다. 최루탄에 눈물 콧물이 범벅이 됐지만 가슴이 벅찼다.', (x) => {
        x.p.actual.mor = clamp(x.p.actual.mor + 3, 0, 100);
        x.s.fame += 1;
        hap(x.p, 8);
      }),
      ok('창문 너머로 지켜본다', '사무실 창밖으로 휴지가 날렸다. 동료들이 박수를 쳤다.'),
    ],
  },
  {
    id: 'h88',
    y: 1988,
    head: '"손에 손 잡고" 서울 올림픽 개막',
    sub: '1988년 9월 17일',
    body: () => '160개국이 참가한 서울 올림픽. 한국은 금 12개로 종합 4위. 온 국민이 굴렁쇠 소년을 보며 숨을 죽였다.\n경제는 3저 호황으로 3년 연속 10% 넘게 성장했다.',
    choices: (c) => [
      ok('온 가족이 컬러 TV 앞에 모인다', '개막식을 보며 엄마가 울었다. "우리가 이렇게 됐구나."', (x) => mains(x.s).forEach((p) => hap(p, 6))),
      ...(mains(c.s).some((p) => BIZ_JOBS.has(p.job)) ? [ok('올림픽 특수를 노려 장사를 늘린다', '관광객이 몰려 매출이 두 배가 됐다.', (x) => (householder(x.s).cash += Math.round(600 * wi(x.s))))] : []),
    ],
  },
  {
    id: 'hnewtown',
    y: 1989,
    to: 1990,
    head: '분당·일산 신도시 아파트 분양',
    sub: '주택 200만 호 건설 · 채권 입찰제',
    cond: (s) => !s.assets.some((a) => (a.kind === 'apt_seoul' || a.kind === 'apt_local') && [s.headId, head(s).spouseId].includes(a.ownerId)) && age(s, head(s)) >= 25,
    body: (c) => {
      const price = Math.round((c.s.market.apt_seoul * 0.6) / 100) * 100;
      c.ev.data.price ??= price;
      return `집값이 한 해 20~30% 뛰자 정부가 수도권 신도시 다섯 곳을 발표했다. 분당 시범단지 청약에 수십만 명이 몰렸다.\n분양가 ${formatMoney(c.ev.data.price)} (주변 시세의 60%). 계약금 20%, 나머지는 중도금·잔금 대출.`;
    },
    choices: (c) =>
      gate(c.s, [
        {
          label: `청약한다 (계약금 ${formatMoney(Math.round(c.ev.data.price * 0.2))})`,
          cost: Math.round(c.ev.data.price * 0.2),
          run: (x) => {
            if (!chance(x.s, 0.35)) return '경쟁률 수십 대 1. 떨어졌다. 계약금은 돌려받았다.';
            householder(x.s).cash += 0;
            const a = addAsset(x.s, 'apt_seoul', head(x.s).id, x.s.market.apt_seoul, '분당 신도시 아파트');
            a.cost = x.ev.data.price;
            a.bought = x.s.year;
            a.loan = Math.round(x.ev.data.price * 0.8);
            a.tags = ['신축'];
            return '당첨! 논밭 위로 올라가는 아파트를 보며 가슴이 뛰었다.';
          },
        },
        ok('집값은 곧 떨어진다며 기다린다', '기다렸다. 집값은 몇 년 뒤 잠시 주춤했다.'),
      ]),
  },
  {
    id: 'hrealname',
    y: 1993,
    head: '금융실명제 전격 실시',
    sub: '1993년 8월 12일 저녁 · 대통령 긴급명령',
    body: (c) => `김영삼 대통령이 저녁 7시 45분 특별담화를 발표했다. 오늘 밤 8시부터 모든 금융거래는 실명으로만.\n차명·가명 계좌는 두 달 안에 실명으로 바꿔야 하고, 뭉칫돈의 출처를 조사받는다.${(c.s.scandal ?? 0) >= 20 ? '\n⚠ 우리 집 차명 계좌가 문제다.' : ''}`,
    choices: (c) =>
      (c.s.scandal ?? 0) >= 20
        ? [
            ok('자진 신고하고 세금을 낸다', '세금을 물었다. 대신 뒤탈은 없다.', (x) => ((householder(x.s).cash -= Math.round(Math.max(0, householder(x.s).cash) * 0.15)), (x.s.scandal = 0))),
            {
              label: '버틴다',
              run: (x: Ctx) => {
                if (!chance(x.s, 0.5)) return '용케 넘어갔다.';
                x.s.fame = Math.max(0, x.s.fame - 8);
                householder(x.s).cash -= Math.round(Math.max(0, householder(x.s).cash) * 0.3);
                return '국세청 세무조사. 차명 재산이 드러났다. (명성 −8)';
              },
            },
          ]
        : [ok('은행에 가서 통장을 확인한다', '우리 집은 원래 다 내 이름이다. 마음 편하다.')],
  },
  {
    id: 'himf',
    y: 1997,
    head: '국가 부도 위기, IMF 구제금융 신청',
    sub: '1997년 11월 21일',
    body: (c) => {
      const d = (c.ev.data ??= {});
      if (!d.done) {
        d.done = true;
        const lost: string[] = [];
        for (const p of mains(c.s)) if (SALARY_JOBS.has(p.job) && chance(c.s, 0.3)) (p.job = 'none'), (p.jobLevel = 0), hap(p, -20), lost.push(fullName(p));
        for (const p of mains(c.s)) if (BIZ_JOBS.has(p.job) && chance(c.s, 0.25)) (p.job = 'none'), (p.jobLevel = 0), hap(p, -20), lost.push(fullName(p) + '(부도)');
        d.lost = lost;
      }
      return `임창열 경제부총리가 IMF에 200억 달러 구제금융을 요청했다. 환율은 달러당 2,000원 가까이 치솟고, 금리는 연 30%까지 올랐다.\n한보·기아·한라·대우… 대기업이 줄줄이 쓰러지고 "명퇴", "정리해고"가 일상이 됐다.${d.lost.length ? `\n\n💥 우리 가족: ${d.lost.join(', ')} 일자리를 잃었다.` : ''}`;
    },
    choices: (c) => {
      const cash = Math.max(0, householder(c.s).cash);
      return gate(c.s, [
        ok('금 모으기 운동에 돌반지·결혼반지를 낸다', '장롱 속 금붙이를 모두 들고 은행 앞 줄에 섰다. 온 국민이 227톤을 모았다.', (x) => {
          householder(x.s).cash -= Math.round(150 * wi(x.s));
          x.s.fame += 2;
          for (const p of mains(x.s)) p.actual.mor = clamp(p.actual.mor + 1, 0, 100);
        }),
        {
          label: `폭락한 우량주를 줍는다 (${formatMoney(Math.round(cash * 0.3))})`,
          cost: Math.round(cash * 0.3),
          disabled: cash < 300,
          run: (x) => (addHolding(x.s, 'stock', householder(x.s).id, Math.round(cash * 0.3)), '코스피 300선. 모두가 던질 때 샀다. 손이 떨렸다.'),
        },
        ok('연 20% 고금리 예금에 넣는다', '은행 이자가 연 20%. 현금이 있는 사람에겐 기회였다.', (x) => {
          const h = householder(x.s);
          if (h.cash > 0) h.cash = Math.round(h.cash * 1.12);
        }),
      ]);
    },
  },
  {
    id: 'hdotcom',
    y: 2000,
    head: '코스닥 폭락, 벤처 거품 붕괴',
    sub: '2000년 · 닷컴 버블',
    body: () => '1999년 "인터넷"만 붙으면 주가가 수십 배 뛰었다. 새롬기술은 1년 새 150배. 2000년 3월 코스닥이 정점을 찍고 연말까지 80% 넘게 폭락했다.',
    choices: (c) => [
      ok('다행히 손대지 않았다', '옆집 아저씨는 퇴직금을 날렸다고 한다.'),
      ...(mains(c.s).some((p) => age(c.s, p) >= 25 && p.cash > 500)
        ? [
            {
              label: '사실… 모아 둔 돈 일부를 벤처주에 넣었다',
              run: (x: Ctx) => {
                const h = householder(x.s);
                const lost = Math.round(Math.max(0, h.cash) * 0.15);
                h.cash -= lost;
                return `계좌가 5분의 1이 됐다. ${formatMoney(lost)}이 사라졌다.`;
              },
            } as Choice,
          ]
        : []),
    ],
  },
  {
    id: 'hworldcup',
    y: 2002,
    head: '대~한민국! 월드컵 4강',
    sub: '2002년 6월 · 한일 월드컵',
    body: () => '폴란드·포르투갈·이탈리아·스페인을 차례로 꺾었다. 광화문과 시청 앞에 붉은 악마 수백만 명이 모였다. 히딩크 감독은 명예시민이 됐다.',
    choices: () => [ok('붉은 티셔츠를 입고 시청 앞으로!', '모르는 사람과 얼싸안았다. 평생 잊지 못할 여름.', (x) => mains(x.s).forEach((p) => hap(p, 10))), ok('집에서 치킨을 시켜 본다', '치킨집 전화가 불통이었다.', (x) => mains(x.s).forEach((p) => hap(p, 5)))],
  },
  {
    id: 'hcard',
    y: 2003,
    head: '카드 대란, 신용불량자 372만 명',
    sub: '2003년 · LG카드 유동성 위기',
    cond: (s) => mains(s).some((p) => p.cash < 0 || p.traits?.includes('spender')),
    body: () => '길거리에서 소득 확인도 없이 신용카드를 만들어 주던 시절이 끝났다. 현금서비스 돌려막기가 한꺼번에 무너졌다.\n우리 가족 중에도 카드 빚에 허덕이는 사람이 있다.',
    choices: () => [
      ok('가족이 빚을 대신 갚아 준다', '가족 회의 끝에 빚을 막아 줬다. 카드는 가위로 잘랐다.', (x) => {
        for (const p of mains(x.s)) if (p.cash < 0) (householder(x.s).cash += p.cash), (p.cash = 0);
      }),
      ok('신용회복위원회에 채무조정을 신청하게 한다', '8년 동안 나눠 갚기로 했다. 신용등급은 바닥이다.'),
    ],
  },
  {
    id: 'hlehman',
    y: 2008,
    head: '리먼 파산, 코스피 1,000 붕괴',
    sub: '2008년 9월 · 글로벌 금융위기',
    body: () => '미국 4위 투자은행 리먼 브러더스가 파산했다. 코스피는 두 달 만에 반 토막(938), 환율은 1,500원을 넘었다. 적립식 펀드 "반토막" 계좌가 속출한다.',
    choices: (c) => {
      const cash = Math.max(0, householder(c.s).cash);
      return gate(c.s, [
        { label: `폭락장에서 주식을 산다 (${formatMoney(Math.round(cash * 0.3))})`, cost: Math.round(cash * 0.3), disabled: cash < 300, run: (x) => (addHolding(x.s, 'stock', householder(x.s).id, Math.round(cash * 0.3)), '공포에 샀다. 1년 뒤 코스피는 1,700을 회복했다.') },
        ok('펀드를 환매하고 현금을 쥔다', '더 떨어질까 무서워 팔았다. 바닥에서 판 셈이었다.', (x) => {
          const st = x.s.assets.find((a) => a.kind === 'stock' && a.ownerId === householder(x.s).id);
          if (st) (householder(x.s).cash += st.value), (x.s.assets = x.s.assets.filter((a) => a !== st));
        }),
        ok('그냥 버틴다', '계좌를 안 보기로 했다.'),
      ]);
    },
  },
  {
    id: 'hsewol',
    y: 2014,
    head: '진도 앞바다 여객선 침몰',
    sub: '2014년 4월 16일',
    body: () => '인천에서 제주로 가던 세월호가 진도 앞바다에서 침몰했다. 수학여행을 가던 단원고 학생 250명을 포함해 304명이 희생됐다. "가만히 있으라"는 방송만 되풀이됐다.\n온 나라가 노란 리본을 달았다.',
    choices: () => [ok('노란 리본을 단다', '아이들을 한 번 더 안아 주었다.', (x) => mains(x.s).forEach((p) => (p.affinity = clamp(p.affinity + 3, -100, 100))))],
  },
  {
    id: 'hcandle',
    y: 2016,
    head: '광화문 촛불 100만',
    sub: '2016년 11월 · 국정농단 규탄',
    body: () => '최순실 국정농단 태블릿 PC 보도 이후 주말마다 광화문에 촛불이 켜졌다. 연인원 1,600만 명. 2017년 3월 10일 헌법재판소가 대통령 파면을 선고한다.',
    choices: () => [ok('가족과 촛불을 들고 광화문에 간다', '추운 밤이었지만 따뜻했다. 아이가 촛불을 오래 들고 있었다.', (x) => (x.s.fame += 0.5)), ok('뉴스로 지켜본다', '매주 토요일 밤, 생중계를 켜 두었다.')],
  },
  {
    id: 'hcovid',
    y: 2020,
    head: '코로나19, 사회적 거리두기',
    sub: '2020년 · 팬데믹',
    body: (c) => {
      const d = (c.ev.data ??= {});
      if (!d.done) {
        d.done = true;
        const hit: string[] = [];
        for (const p of mains(c.s))
          if (BIZ_JOBS.has(p.job) || ['tour_guide', 'flight_attendant', 'hotelier', 'wedding_planner'].includes(p.job)) {
            const loss = Math.round(Math.max(0, expectedIncome(c.s, p)) * 0.4);
            p.cash -= loss;
            hit.push(`${fullName(p)} −${formatMoney(loss)}`);
          }
        householder(c.s).cash += Math.round(100 * wi(c.s));
        d.hit = hit;
      }
      return `마스크를 사려고 약국 앞에 줄을 선다. 학교는 온라인 개학, 식당은 밤 9시 영업 제한.\n긴급재난지원금이 나왔다 (4인 가구 100만 원).${d.hit.length ? `\n\n💥 장사하는 가족: ${d.hit.join(', ')}` : ''}\n주가는 3월 1,450까지 폭락했다가 "동학개미"가 몰려들며 반등하고 있다.`;
    },
    choices: (c) => {
      const cash = Math.max(0, householder(c.s).cash);
      return gate(c.s, [
        { label: `동학개미로 참전한다 (${formatMoney(Math.round(cash * 0.25))})`, cost: Math.round(cash * 0.25), disabled: cash < 300, run: (x) => (addHolding(x.s, 'stock', householder(x.s).id, Math.round(cash * 0.25)), '삼성전자를 샀다. 이듬해 코스피 3,000.') },
        ok('집에서 버틴다', '온 가족이 집에 갇힌 한 해. 오랜만에 저녁을 함께 먹었다.', (x) => mains(x.s).forEach((p) => (p.affinity = clamp(p.affinity + 4, -100, 100)))),
      ]);
    },
  },
  {
    id: 'hyoungkkeul',
    y: 2021,
    head: '"지금 안 사면 영원히 못 산다"',
    sub: '2021년 · 영끌 열풍',
    cond: (s) => !s.assets.some((a) => (a.kind === 'apt_seoul' || a.kind === 'apt_local') && [s.headId, head(s).spouseId].includes(a.ownerId)),
    body: () => '서울 아파트값이 4년 새 두 배가 됐다. 20·30대가 신용대출·주담대를 "영혼까지 끌어모아" 집을 산다. 이듬해 금리가 연 1%대에서 5%대로 뛰리라는 걸 아직 아무도 모른다.',
    choices: (c) =>
      gate(c.s, [
        {
          label: `영끌해서 산다 (${formatMoney(Math.round(c.s.market.apt_seoul * 0.3))} + 대출)`,
          cost: Math.round(c.s.market.apt_seoul * 0.3),
          run: (x) => {
            const a = addAsset(x.s, 'apt_seoul', head(x.s).id, x.s.market.apt_seoul, '영끌 아파트');
            a.cost = x.s.market.apt_seoul;
            a.bought = x.s.year;
            a.loan = Math.round(x.s.market.apt_seoul * 0.7);
            return '도장을 찍었다. 대출 이자가 월급의 절반이다.';
          },
        },
        ok('기다린다', '"거품이야." 이듬해 금리가 치솟자 집값이 떨어졌다.'),
      ]),
  },
  {
    id: 'h1203',
    y: 2024,
    head: '비상계엄 선포… 국회, 2시간 반 만에 해제 의결',
    sub: '2024년 12월 3일 밤',
    body: () => '밤 10시 23분, 대통령이 긴급 담화로 비상계엄을 선포했다. 계엄군 헬기가 국회에 내렸고, 시민들이 국회 앞으로 몰려가 장갑차를 막아섰다.\n새벽 1시, 국회가 재석 190명 전원 찬성으로 해제를 의결했다. 이듬해 4월 헌법재판소가 대통령을 파면한다.',
    choices: () => [ok('국회 앞으로 달려간다', '영하의 밤, 모르는 사람들과 스크럼을 짰다.', (x) => ((x.s.fame += 0.5), (head(x.s).actual.mor = clamp(head(x.s).actual.mor + 2, 0, 100)))), ok('밤새 생중계를 본다', '잠을 이루지 못했다.')],
  },
];
const MAJOR = Object.fromEntries(MAJORS.map((m) => [m.id, m]));

const majorEv = (m: Major): EventDef => ({
  id: 'hist_' + m.id,
  title: () => m.head,
  text: (c) => `${m.sub}\n\n${m.body(c)}`,
  choices: (c) => m.choices(c),
  portraits: (c) => [c.p],
  valid: (c) => isHist(c.s),
});
export const HIST_EVENTS: EventDef[] = MAJORS.map(majorEv);

/** 해마다: 뉴스를 싣고, 큰 사건을 띄운다 */
export function histYear(s: GameState): string[] {
  if (!inHist(s)) return [];
  const msgs: string[] = [];
  for (const t of NEWS[s.year] ?? []) msgs.push(`📰 ${t}`);
  const seen = (s.storySeen ??= {});
  for (const m of MAJORS) {
    if (seen['hist:' + m.id] !== undefined) continue;
    if (s.year < m.y || s.year > (m.to ?? m.y)) continue;
    if (m.cond && !m.cond(s)) continue;
    const who = m.who ? m.who(s) : head(s);
    if (!who) continue;
    seen['hist:' + m.id] = s.year;
    s.events.push({ uid: s.eventSeq++, defId: 'hist_' + m.id, personId: who.id, data: {} });
  }
  // 1988년: 광주 청문회로 진실이 알려진다
  if (s.year === 1988 && Object.values(s.people).some((p) => hasFlag(p, 'arrested80'))) msgs.push('📰 광주 청문회 생중계. 그해 봄 끌려갔던 가족이 민주화운동 관련자로 인정받았다.');
  return msgs;
}

/** 이 사건 카드의 연출 (호외·TV 속보·휴대폰 알림) */
export function histStyle(defId: string, year: number): 'extra' | 'tv' | 'push' | undefined {
  if (!defId.startsWith('hist_') || !MAJOR[defId.slice(5)]) return undefined;
  return mediaOf(year);
}

// ───────────────────────── 새 게임 ─────────────────────────

/** 1960년 부모 세대 직업 (1920년대생): 농사·장사·공장·공무원·교사·군인 */
export const HIST_PARENT_JOBS: Record<GameState['origin'], string[]> = {
  poor: ['farmer', 'farmer', 'farmer', 'parttime', 'factory', 'fisher', 'carpenter'],
  middle: ['civil', 'teacher', 'officer', 'police', 'shopkeeper', 'banker', 'office', 'farmer', 'mail_carrier'],
  rich: ['founder', 'landlord', 'doctor', 'lawyer', 'founder', 'landlord'],
};

/** 1920년대생 부모가 겪은 일: 일제강점기, 해방, 6·25 */
export function histOrigins(s: GameState, father: Person, mother: Person): string {
  const lines: string[] = [];
  if (chance(s, 0.55)) {
    addFlag(father, 'war_vet');
    lines.push(`아버지는 6·25 때 ${pick(s, ['낙동강 전선', '백마고지', '장진호', '다부동'])}에서 싸웠다.`);
  }
  if (chance(s, 0.25)) {
    const p = chance(s, 0.5) ? father : mother;
    addFlag(p, 'silhyang');
    lines.push(`${p === father ? '아버지' : '어머니'}는 ${pick(s, ['평안도', '함경도', '황해도'])}에서 1·4 후퇴 때 내려온 실향민이다. 북에 두고 온 동생이 있다.`);
  }
  if (s.origin === 'rich') lines.push(pick(s, ['할아버지가 해방 뒤 적산(일본인 재산)을 불하받아 일군 집안이다.', '대대로 땅을 가진 지주 집안. 1950년 농지개혁으로 땅 절반을 잃었다.']));
  if (s.origin === 'poor') lines.push(pick(s, ['보릿고개엔 풀죽으로 끼니를 때운다.', '미국 원조 밀가루로 수제비를 끓인다.', '판자촌 셋방 한 칸에 여섯 식구가 산다.']));
  lines.push(`어머니는 ${mother.birthYear}년생, 일제강점기에 태어나 한글보다 일본어를 먼저 배웠다.`);
  return lines.join('\n');
}

/** 과외 금지 시절(1980~2000): 사교육 효과가 줄어든다 */
export const tutorBan = (s: GameState) => inHist(s) && s.year >= 1980 && s.year < 2000;

export const histMajorIds = () => MAJORS.map((m) => m.id);
