import type { AssetKind, CareerTag, StatKey, TalentId } from './types';

export const STAT_KEYS: StatKey[] = ['str', 'int', 'cha', 'mor', 'hp'];
export const STAT_NAMES: Record<StatKey, string> = {
  str: '근력',
  int: '지능',
  cha: '매력',
  mor: '성품',
  hp: '건강',
};

export interface TalentDef {
  id: TalentId;
  name: string;
  desc: string;
  stat?: StatKey;
  mult: number;
  tag: CareerTag;
  /** 이 재능이 빛나는 직업군: 그 일을 하면 승진·성장이 빠르다 */
  cats?: string[];
}

export const TALENTS: Record<TalentId, TalentDef> = {
  genius: { id: 'genius', name: '수재', desc: '공부가 쏙쏙 들어온다. 지능 성장 ×1.8', stat: 'int', mult: 1.8, tag: 'study', cats: ['tech', 'legal', 'medical'] },
  athlete: { id: 'athlete', name: '운동신경', desc: '몸 쓰는 일은 타고났다. 근력 성장 ×1.8', stat: 'str', mult: 1.8, tag: 'sport', cats: ['sport'] },
  star: { id: 'star', name: '스타성', desc: '눈길을 끄는 무언가가 있다. 매력 성장 ×1.5', stat: 'cha', mult: 1.5, tag: 'stage', cats: ['media'] },
  merchant: { id: 'merchant', name: '장사꾼', desc: '돈 냄새를 잘 맡는다. 창업·투자 판정 유리', mult: 1, tag: 'business', cats: ['biz'] },
  artist: { id: 'artist', name: '예술혼', desc: '손끝에서 무언가가 태어난다. 매력 성장 ×1.2, 화가로 걸작 확률↑', stat: 'cha', mult: 1.2, tag: 'stage', cats: ['media'] },
  orator: { id: 'orator', name: '달변가', desc: '말 한마디로 판을 뒤집는다. 매력 성장 ×1.3 · 법조·정치·영업에서 빨리 큰다', stat: 'cha', mult: 1.3, tag: 'public', cats: ['legal', 'office', 'etc'] },
  healer: { id: 'healer', name: '약손', desc: '손만 대도 아픈 데가 낫는 것 같다. 성품 성장 ×1.2 · 의료직에서 빨리 크고 큰 치료에 강하다', stat: 'mor', mult: 1.2, tag: 'study', cats: ['medical'] },
  craft: { id: 'craft', name: '손재주', desc: '뭐든 고치고 만든다. 근력 성장 ×1.3 · 기술직·공학에서 빨리 큰다', stat: 'str', mult: 1.3, tag: 'free', cats: ['trade', 'tech'] },
  linguist: { id: 'linguist', name: '언어 천재', desc: '외국어가 귀에 쏙쏙. 지능 성장 ×1.3 · 외교·번역·유학에 유리', stat: 'int', mult: 1.3, tag: 'study', cats: ['public', 'media'] },
  iron: { id: 'iron', name: '강철 체력', desc: '지치지 않는 몸. 건강 성장 ×1.6 · 몸 쓰는 일과 야근에 강하다', stat: 'hp', mult: 1.6, tag: 'sport', cats: ['sport', 'transport'] },
  empath: { id: 'empath', name: '공감 능력', desc: '남의 아픔을 내 것처럼 느낀다. 성품 성장 ×1.5 · 교육·돌봄에서 빛난다', stat: 'mor', mult: 1.5, tag: 'public', cats: ['edu', 'medical'] },
  strategist: { id: 'strategist', name: '승부사', desc: '수 싸움에 강하다. 지능 성장 ×1.2 · 금융·사업·체스에서 빨리 큰다', stat: 'int', mult: 1.2, tag: 'business', cats: ['office', 'biz'] },
  pitch: { id: 'pitch', name: '절대음감', desc: '한 번 들은 음은 잊지 않는다. 매력 성장 ×1.3 · 가수·음악가로 크게 된다', stat: 'cha', mult: 1.3, tag: 'stage', cats: ['media'] },
  palate: { id: 'palate', name: '절대미각', desc: '한 숟갈이면 재료와 비율이 보인다 · 요리·서비스업에서 빨리 큰다', stat: 'hp', mult: 1.1, tag: 'business', cats: ['service', 'farm'] },
};
export const TALENT_IDS = Object.keys(TALENTS) as TalentId[];

export * from './jobs';

/** 성격. 짝(opp)끼리는 함께 가질 수 없다 */
export interface TraitDef {
  name: string;
  desc: string;
  opp?: string;
  good: boolean;
}
export const TRAITS: Record<string, TraitDef> = {
  diligent: { name: '성실', desc: '승진·시험에 유리', opp: 'lazy', good: true },
  lazy: { name: '게으름', desc: '승진·시험에 불리', opp: 'diligent', good: false },
  cheerful: { name: '낙천적', desc: '행복도가 잘 안 떨어진다', opp: 'anxious', good: true },
  anxious: { name: '예민함', desc: '행복도가 쉽게 떨어진다. 우울증 주의', opp: 'cheerful', good: false },
  social: { name: '사교적', desc: '연애·영업·선거에 유리', opp: 'shy', good: true },
  shy: { name: '내성적', desc: '연애가 어렵다. 연구엔 집중력', opp: 'social', good: false },
  filial: { name: '효심', desc: '부모와의 관계도가 잘 오른다', opp: 'rebel', good: true },
  rebel: { name: '반항적', desc: '사춘기가 거세다', opp: 'filial', good: false },
  frugal: { name: '짠돌이', desc: '생활비를 아낀다', opp: 'spender', good: true },
  spender: { name: '낭비벽', desc: '돈이 줄줄 샌다', opp: 'frugal', good: false },
  gambler: { name: '한탕주의', desc: '도박·투기에 끌린다', good: false },
  flirt: { name: '바람기', desc: '이성에게 인기지만 가정이 위태롭다', opp: 'devoted', good: false },
  devoted: { name: '일편단심', desc: '부부 금슬이 좋다', opp: 'flirt', good: true },
  leader: { name: '리더십', desc: '선거·조직에서 두각', good: true },
  tough: { name: '강골', desc: '늙어도 건강하다. 병에 강함', opp: 'frail', good: true },
  frail: { name: '병약함', desc: '잔병치레가 잦다', opp: 'tough', good: false },
  ambitious: { name: '야심가', desc: '출세욕이 강하다. 명성 획득↑', good: true },
  speed_demon: { name: '질주본능', desc: '초감각적 운전 재능 (선천 희귀 특성 · 슈퍼 히든 드리프트 퀸 열쇠)', good: true },
  hypnotic_eye: { name: '맑은 눈', desc: '사람의 마음을 읽는 또렷한 눈빛 (선천 희귀 특성)', good: true },
  blood_thirst: { name: '흡혈 적성', desc: '햇빛이 버겁고, 붉은 것에 끌린다 (선천 1% · 슈퍼 히든 핏빛 후작부인의 쉬운 길)', good: true },
  dark_artist: { name: '예술의 손', desc: '남다른 미적 감각 (선천 희귀 특성)', good: true },
  chess_prodigy: { name: '체스 신동', desc: '64칸 판 위에서 수십 수를 내다보는 천재적인 두뇌 (적성검사 4% 발현 · 슈퍼 히든 체스 그랜드마스터 열쇠)', good: true },
};
export const SUPER_RARE_TRAIT_IDS = ['speed_demon', 'hypnotic_eye', 'dark_artist'] as const;
export const TRAIT_IDS = Object.keys(TRAITS).filter((k) => !SUPER_RARE_TRAIT_IDS.includes(k as any) && k !== 'blood_thirst' && k !== 'chess_prodigy');

export const TAG_NAMES: Record<CareerTag, string> = {
  study: '공부로 성공',
  sport: '운동선수',
  stage: '스타 (연예인·크리에이터)',
  business: '사업가',
  public: '나라를 위한 일 (공무원·군인·정치)',
  free: '자유로운 삶',
};

/** 아이가 장래희망을 말할 때 (분야마다 여러 가지, 나이에 맞는 말투) */
export const DREAM_QUOTES: Record<CareerTag, string[]> = {
  study: ['나는 커서 박사님이 될 거야!', '공부 열심히 해서 엄마 아빠 호강시켜 줄 거야!', '나중에 의사 선생님이 되고 싶어!', '과학자가 돼서 로봇을 만들 거야!', '판사가 돼서 나쁜 사람을 혼내 줄 거야!'],
  sport: ['나는 국가대표가 될 거야!', '손흥민 같은 축구 선수가 되고 싶어!', '올림픽에서 금메달 딸 거야!', '프로야구 선수가 돼서 홈런 칠 거야!', '태권도 사범님이 될 거야!'],
  stage: ['나는 커서 아이돌이 될 거야!', 'TV에 나오는 배우가 되고 싶어!', '유튜버가 돼서 구독자 백만 명 모을 거야!', '가수가 돼서 큰 무대에서 노래할 거야!', '웹툰 작가가 되고 싶어!'],
  business: ['나는 사장님이 될 거야!', '회사를 차려서 부자가 될 거야!', '빵집 사장님이 되고 싶어!', '게임 회사를 만들 거야!', '건물주가 될 거야!'],
  public: ['나는 경찰관이 되고 싶어!', '소방관이 돼서 사람들을 구할 거야!', '대통령이 될 거야!', '선생님이 되고 싶어!', '군인이 돼서 나라를 지킬 거야!'],
  free: ['나는 그냥 하고 싶은 거 하면서 살래!', '세계 여행하면서 살 거야!', '회사 안 다니고 자유롭게 살 거야!', '고양이 키우면서 시골에서 살래!', '아직 모르겠어. 천천히 찾아볼래!'],
};

// 이름: 태어난 시대마다 유행이 다르다 (대법원 출생신고 인기 이름 통계의 흐름을 따른 목록)
const W = (s: string) => s.split(' ');
export const ERA_NAMES: { until: number; M: string[]; F: string[] }[] = [
  { until: 1969,
    M: W('영수 영호 영철 영식 상철 정수 성수 광수 병철 종호 용수 재호 명수 춘식 만수 정호 성호 동수 기철 순철 창수 정남 덕수 학수 봉수 경호 인호 문수 진호 대식 태식 옥규 남수 길수 희수 형석 한수 무열 주석 종철'),
    F: W('영숙 정숙 영희 순자 명숙 경숙 미숙 정희 영자 옥순 춘자 말순 순희 경자 혜숙 정자 미자 금순 은숙 영순 숙자 복순 점순 옥자 명자 순옥 정옥 향숙 봉순 귀순 연희 금자 선희 화자 정순 애자 인숙 경애 순례 양순') },
  { until: 1984,
    M: W('성호 정훈 성진 상현 준호 성훈 동훈 재훈 상민 정민 경민 지훈 태호 진호 병준 영진 현철 대현 창민 승호 세훈 기훈 종민 용준 형준 철민 민호 상욱 재석 대성 원석 윤석 동욱 성욱 기현 현석 경수 민규 주형 광호'),
    F: W('미영 은정 지영 수진 은영 현정 미경 정은 은주 혜진 선영 지혜 미정 현주 수경 경희 윤정 은희 혜정 소영 미진 선희 은경 주희 희정 연주 경아 미라 은미 정아 수정 지은 혜영 성희 미선 유경 선미 인영 해진 명진') },
  { until: 1999,
    M: W('지훈 현우 성민 동현 민수 준영 승현 도현 민재 상우 준혁 진우 태현 우현 재민 성현 영민 현수 정훈 민석 지환 태훈 준기 상훈 동민 경훈 재혁 석진 한별 종현 기범 민혁 태윤 용호 정우 진혁 승준 대호 은석 형우'),
    F: W('지혜 지은 수빈 유진 민지 혜진 은지 지현 수정 예지 다혜 보람 슬기 아름 소연 나영 지연 하나 유리 은비 혜원 가영 효진 새롬 다솜 현지 수현 미나 보영 윤희 주연 예슬 은별 한나 세영 희진 가람 소라 초롱 진주') },
  { until: 2014,
    M: W('민준 현우 지훈 준서 동현 도현 건우 민성 승민 우진 준혁 성민 태민 예준 정민 시우 지성 재윤 준우 민재 지호 유찬 지후 현준 승우 은찬 서진 태양 준수 주원 윤호 시현 지원 동건 상윤 한결 민규 세찬 태준 하준'),
    F: W('서연 민서 지민 수빈 서현 예은 지원 유진 채원 윤서 수민 하은 다은 예린 지아 소연 은서 가은 서영 채윤 수아 서윤 예서 하린 지유 나연 채은 소윤 연서 예원 다인 유나 하윤 수연 채린 아린 지윤 혜린 서희 규리') },
  { until: 2039,
    M: W('민준 서준 도윤 예준 시우 주원 하준 지호 준서 건우 현우 우진 선우 연우 유준 정우 승우 은우 이안 이준 로운 도하 은호 하람 시안 유안 도준 서진 라온 태오 이든 지한 율 온유 하온 시온 우주 해온 이도 로건'),
    F: W('서연 서윤 지우 서현 하은 하윤 윤서 지유 채원 수아 소율 예린 지아 시은 유나 아린 하린 나은 서아 이서 하율 이현 서하 로아 아윤 지안 채아 시아 라엘 소이 유주 아라 다온 봄 새봄 여름 이솔 아인 리아 설아') },
  // 2040년대~: 짧고 부르기 쉬운 이름, 외국어로도 통하는 이름이 늘어난다 (게임 속 상상)
  { until: 2069,
    M: W('이안 로운 하온 시온 도하 이든 온 율 라온 해온 테오 리온 노아 하루 유안 도율 재이 선율 하람 이로 우빈 은결 서온 제이 루이 도경 하진 온새 윤 결'),
    F: W('아윤 로아 이서 라엘 소이 하엘 리아 설 이솔 아린 루아 나린 온유 새봄 제나 유리 에나 하나 레아 시아 채이 여울 다엘 보리 윤슬 채온 서아 미르 단아 은솔') },
  // 2070년대~: 한 글자·순우리말이 다시 유행하고, 우주·바다 같은 이름도 (게임 속 상상)
  { until: 2129,
    M: W('솔 온 결 휘 윤 한 별 해 담 율 누리 우주 한울 가온 마루 하랑 바다 은하 새길 푸름 늘 빛 단 이음 너울 한결 미리 새벽 도담 슬'),
    F: W('솔 온 별 담 봄 윤 설 해 이음 누리 은하 가람 하랑 여울 달 새벽 아리 나래 미리내 빛 단비 늘봄 이슬 소담 새나 라온 온새 초록 해솔 다솜') },
  // 2130년대~: 태양계에 흩어져 사는 시대. 별·행성·빛 이름, 어느 행성 말로도 부르기 쉬운 이름 (게임 속 상상)
  { until: 9999,
    M: W('이오 타이 한별 새터 로엔 가온 누빈 별찬 은결 해랑 세온 루카 아론 미르 한빛 다온 시우 별하 온결 휘온 도담 라엘 테온 하늘 우람 빛솔 새론 이한 무진 솔찬'),
    F: W('루나 별이 이오 세라 한별 새봄 미리내 은하 온새 달래 하랑 여울 나린 아스트라 별빛 해나 리아 노을 소담 이솔 새아 누리 채별 가을 하리 솔비 은별 다인 서리 윤슬') },
];
/** 순우리말 이름 (드물게) */
export const NATIVE_NAMES = { M: W('한결 하늘 가람 바다 한별 한솔 누리 다솜 새힘 슬찬 빛찬 튼튼 우람 힘찬 늘봄'), F: W('하늘 보람 슬기 한솔 이슬 나래 다솜 누리 새롬 한별 가을 은솔 빛나 햇살 초롱') };
export const MALE_NAMES = [...new Set(ERA_NAMES.flatMap((e) => e.M))];
export const FEMALE_NAMES = [...new Set(ERA_NAMES.flatMap((e) => e.F))];
/** 성씨: 실제 인구 비율대로 뽑히게 가중 (통계청 인구주택총조사 성씨 분포 참고) */
const SURNAME_W: [string, number][] = [
  ['김', 21], ['이', 15], ['박', 8], ['최', 5], ['정', 4], ['강', 2.4], ['조', 2.1], ['윤', 2.1], ['장', 2], ['임', 1.7], ['한', 1.5], ['오', 1.5], ['서', 1.4], ['신', 1.4], ['권', 1.4], ['황', 1.4], ['안', 1.3], ['송', 1.3], ['전', 1.1], ['홍', 1.1],
  ['유', 1.1], ['고', 0.9], ['문', 0.9], ['양', 0.9], ['손', 0.9], ['배', 0.8], ['백', 0.8], ['허', 0.6], ['남', 0.6], ['심', 0.5], ['노', 0.5], ['하', 0.5], ['곽', 0.4], ['성', 0.4], ['차', 0.4], ['주', 0.4], ['우', 0.4], ['구', 0.4], ['민', 0.4], ['진', 0.3],
  ['나', 0.3], ['지', 0.3], ['엄', 0.3], ['채', 0.3], ['원', 0.25], ['천', 0.25], ['방', 0.2], ['공', 0.2], ['현', 0.2], ['함', 0.2], ['변', 0.2], ['염', 0.15], ['여', 0.15], ['추', 0.15], ['도', 0.15], ['소', 0.15], ['석', 0.15], ['선', 0.1], ['설', 0.1], ['마', 0.1],
  ['길', 0.1], ['연', 0.1], ['위', 0.08], ['표', 0.08], ['명', 0.08], ['기', 0.08], ['반', 0.06], ['왕', 0.05], ['금', 0.05], ['옥', 0.05], ['육', 0.05], ['인', 0.05], ['맹', 0.05], ['제', 0.04], ['모', 0.04], ['탁', 0.04], ['국', 0.04], ['어', 0.03], ['은', 0.03], ['봉', 0.03],
  ['남궁', 0.05], ['황보', 0.03], ['제갈', 0.02], ['선우', 0.02], ['독고', 0.01],
];
/** 무작위로 뽑으면 실제 비율이 되도록 반복된 목록 (0.01 = 1칸) */
export const SURNAMES: string[] = SURNAME_W.flatMap(([n, w]) => Array(Math.max(1, Math.round(w * 20))).fill(n));
/** 고를 때 보여 줄 성씨 목록 (중복 없이) */
export const SURNAME_LIST = SURNAME_W.map(([n]) => n);

/** 실제 한국 상속·증여세율 단순화: [과세표준 상한(만원), 세율] */
export const TAX_BRACKETS: [number, number][] = [
  [10000, 0.1],
  [50000, 0.2],
  [100000, 0.3],
  [300000, 0.4],
  [Infinity, 0.5],
];

export const INHERIT_BASIC_DEDUCTION = 50000; // 일괄공제 5억
export const INHERIT_SPOUSE_DEDUCTION = 50000; // 배우자공제 최소 5억
export const GIFT_EXEMPT_ADULT = 5000; // 성인 자녀 10년 5천만
export const GIFT_EXEMPT_MINOR = 2000; // 미성년 자녀 10년 2천만
export const GIFT_EXEMPT_SPOUSE = 60000; // 배우자 10년 6억
/** 손주에게 바로 주면(세대생략) 세액 30% 할증 */
export const GENERATION_SKIP_SURCHARGE = 0.3;
/** 세무사: 공제 항목을 샅샅이 챙겨 과세표준을 줄여줌 */
export const ADVISOR_BASE_CUT = 0.12;

/**
 * 세법상 평가 비율. 부동산은 기준시가(시가의 70%), 예술품은 감정가가 애매해서 더 낮게 잡힌다.
 * 주식·코인은 시가 그대로 → 절세 여지 없음.
 */
export const ASSESS_RATIO: Record<AssetKind, number> = {
  apt_seoul: 0.7,
  apt_local: 0.7,
  land: 0.7,
  building: 0.7,
  stock: 1,
  coin: 1,
  art: 0.5,
  vehicle: 1,
};
export const ASSET_NAMES: Record<AssetKind, string> = {
  apt_seoul: '강남 아파트',
  apt_local: '지방 아파트',
  land: '종가 토지',
  building: '상가 건물',
  stock: '주식',
  coin: '코인',
  art: '예술품',
  vehicle: '자동차',
};
export const ASSET_ICONS: Record<AssetKind, string> = {
  apt_seoul: '🏙',
  apt_local: '🏠',
  land: '🌾',
  building: '🏢',
  stock: '📈',
  coin: '🪙',
  art: '🖼',
  vehicle: '🚗',
};
export const REAL_ESTATE: readonly AssetKind[] = ['apt_seoul', 'apt_local', 'land', 'building'];

/** 예술품 등급: 가격(만원), 위작 확률 */
export const ART_TIERS = [
  { name: '신진 작가 작품', price: 3000, fake: 0.03 },
  { name: '중견 작가 작품', price: 30000, fake: 0.08 },
  { name: '거장의 작품', price: 300000, fake: 0.15 },
] as const;
/** 주식·코인 매수 단위 (만원) */
export const TRADE_UNITS = [1000, 10000, 100000];

export const EDU_COST = [0, 300, 1200, 3000];
export const BUDGET_NAMES = ['없음', '기본', '사교육', '올인'];
export const FOCUS_NAMES = { study: '공부', sport: '운동', art: '예체능', character: '인성', free: '자유' } as const;
export const LIFESTYLE_NAMES = { work: '일 중심', balance: '균형', family: '가정 중심', self: '자기계발', rest: '요양' } as const;
export const LIVING_NAMES = { frugal: '검소', normal: '보통', lux: '호화' } as const;
export const WILL_NAMES = { legal: '법정상속 (배우자 1.5 : 자녀 1)', heir: '후계자에게 몰아주기', equal: '자녀 균등 분배' } as const;

export type AchvCat = '가문' | '결혼·자녀' | '학업' | '출세' | '영광' | '재산' | '인생';
const A = (cat: AchvCat, name: string, desc: string) => ({ cat, name, desc });
export const ACHIEVEMENTS: Record<string, { cat: AchvCat; name: string; desc: string }> = {
  // 가문
  second_gen: A('가문', '대를 잇다', '처음으로 가주가 바뀌었다'),
  gen5: A('가문', '5대 가주', '5대째 가주에 이르다'),
  gen10: A('가문', '10대 명가', '10대째 가주에 이르다'),
  century: A('가문', '100년 가문', '가문 창립 후 100년 경과'),
  bicentury: A('가문', '200년 가문', '가문 창립 후 200년 경과'),
  // 시간선
  hist_to_2030: A('가문', '보릿고개에서 AI까지', '1960년에 시작한 가문이 2030년을 맞았다'),
  paper_to_ai: A('가문', '신문에서 AI 비서까지', '근현대사로 시작해 AI 브리핑의 시대(2080년)까지 이었다'),
  century_22: A('가문', '22세기를 맞은 가문', '2100년, 가문이 새 세기를 맞았다'),
  century_23: A('가문', '23세기를 맞은 가문', '2200년, 가문이 두 번째 새 세기를 맞았다'),
  space_tourist: A('인생', '우주 여행객', '가족이 우주로 여행을 다녀왔다'),
  cyborg: A('인생', '반은 기계, 반은 사람', '한 사람이 미래 의료 치료를 세 가지 넘게 받았다'),
  centenarian_120: A('인생', '120세 인생', '가족 중 한 명이 120세를 넘겼다'),
  three_centuries: A('가문', '세 세기를 잇다', '근현대사로 시작해 20·21·22세기를 모두 지나왔다'),
  orbital_family: A('영광', '하늘 위의 집', '가족이 궤도 도시로 이주했다'),
  uploaded_ancestor: A('가문', '영원한 어른', '가족 중 한 명이 의식 업로드로 남았다'),
  starship_family: A('영광', '별로 떠난 가문', '가족이 성간 탐사선에 올랐다'),
  signal_family: A('영광', '인류를 대표한 문장', '외계 신호에 보낼 인류의 답장에 가문의 문장이 실렸다'),
  witness_150: A('인생', '150년을 산 사람', '가족 중 한 명이 150세를 넘겼다'),
  war_veteran: A('영광', '참전 용사의 가문', '가족이 전쟁에 나가 살아 돌아왔다'),
  war_survived: A('가문', '전쟁을 견딘 가문', '전쟁이 끝날 때까지 가문이 살아남았다'),
  war_rebuild: A('가문', '폐허에서 다시', '전쟁이 끝난 뒤 재건에 앞장섰다'),
  jf_dodged: A('재산', '등기부를 읽는 사람', '전세 사기의 떡밥을 알아채고 피했다'),
  jf_survivor: A('재산', '전세 사기를 이겨내다', '보증금을 떼인 뒤에도 끝까지 싸워 되찾거나 그 집을 샀다'),
  moon_family: A('영광', '달에 간 가문', '가족이 달 기지에서 일했다'),
  mars_family: A('영광', '화성에 뿌리 내리다', '가족이 화성 이주 1세대가 되었다'),
  epoch_five: A('인생', '다섯 시대를 산 사람', '한 사람이 다섯 시대를 건너 살았다'),
  great_grandchild: A('가문', '증손 보기', '가주가 살아서 증손주를 보다'),
  five_gen: A('가문', '5대가 한자리에', '고조부모부터 고손까지 5대가 동시에 살아 있다'),
  centenarian: A('가문', '백세 장수', '가문에서 100세 어른이 나오다'),
  gangnam3: A('가문', '강남 종가', '3대 연속 가주가 강남 아파트 보유'),
  adopted_heir: A('가문', '양자 입적', '대가 끊길 위기에 조카를 양자로 들이다'),
  mission10: A('가문', '대업', '세대 미션 10개 달성'),
  jobs10: A('가문', '직업 도감 10', '가문에서 10가지 직업을 거치다'),
  jobs30: A('가문', '직업 도감 30', '가문에서 30가지 직업을 거치다'),
  jobs60: A('가문', '직업 도감 60', '가문에서 60가지 직업을 거치다'),
  // 결혼·자녀
  sons3: A('결혼·자녀', '아들만 셋', '한 부부가 아들만 셋 이상'),
  daughters3: A('결혼·자녀', '딸 부잣집', '한 부부가 딸만 셋 이상'),
  big_family: A('결혼·자녀', '대가족', '한 부부가 자녀 5명을 두다'),
  twins: A('결혼·자녀', '쌍둥이', '가문에 쌍둥이가 태어나다'),
  ivf: A('결혼·자녀', '기다림 끝에', '시험관 시술로 아이를 얻다'),
  adopted: A('결혼·자녀', '가슴으로 낳은 아이', '아이를 입양하다'),
  golden_wedding: A('결혼·자녀', '금혼식', '결혼 50주년을 함께 맞다'),
  young_marriage: A('결혼·자녀', '일찍 철든', '25세 이전에 결혼'),
  late_marriage: A('결혼·자녀', '늦깎이 신랑신부', '45세 이후에 결혼'),
  remarriage: A('결혼·자녀', '두 번째 봄', '재혼하다'),
  gray_divorce: A('결혼·자녀', '황혼이혼', '결혼 30년 만에 갈라서다'),
  // 학업
  dragon: A('학업', '개천에서 용', '서민 가문에서 의대 진학'),
  top3: A('학업', '명문대 3대', '3대 연속 명문대 입학'),
  olympiad: A('학업', '올림피아드 금상', '수학 올림피아드 금상'),
  retake3: A('학업', '장수생', '삼수 이상 끝에 대학 입학'),
  long_prep: A('학업', '인간 승리', '다섯 번째 도전 끝에 시험 합격'),
  // 출세
  president: A('출세', '대통령 배출', '가문에서 대통령이 나오다'),
  minister: A('출세', '장관 배출', '인사청문회를 통과해 장관이 되다'),
  politics: A('출세', '정치 명문', '가문에서 국회의원 배출'),
  law_family: A('출세', '법조 명문', '판사·검사·변호사를 모두 배출'),
  chief_justice: A('출세', '대법원장', '사법부의 수장이 되다'),
  prosecutor_general: A('출세', '검찰총장', '검찰의 수장이 되다'),
  general: A('출세', '별을 달다', '장군 진급'),
  ceo: A('출세', '월급쟁이의 끝', '대기업 사장까지 오르다'),
  doctor3: A('출세', '3대째 의사', '직계 3세대 연속 의사'),
  sa_family: A('출세', '사(士)자 집안', '의사·변호사·교수가 한 시대에 함께'),
  star_family: A('출세', '스타 가문', '연예인·운동선수·유튜버를 모두 배출'),
  military3: A('출세', '병역 명문가', '3대 연속 병역 이행'),
  // 영광
  nobel: A('영광', '노벨상', '가문에서 노벨상 수상자가 나오다'),
  olympic_gold: A('영광', '올림픽 금메달', '올림픽 시상대 꼭대기에 서다'),
  world_star: A('영광', '월드 스타', '연예인 최고 단계'),
  ten_million: A('영광', '천만 배우', '연예인 4단계 이상'),
  gold_button: A('영광', '골드 버튼', '유튜브 구독자 100만'),
  billboard: A('영광', '빌보드', '음악가 최고 단계'),
  webtoon_ip: A('영광', '글로벌 IP', '웹툰·웹소설이 세계로'),
  michelin: A('영광', '미쉐린 스타', '셰프 최고 단계'),
  gamer_champ: A('영광', '월드 챔피언', '프로게이머 최고 단계'),
  star_tutor: A('영광', '1타 강사', '인강 1타에 오르다'),
  masterpiece: A('영광', '불후의 명작', '가문의 화가가 걸작을 남기다'),
  // 재산
  rich100: A('재산', '백억 가문', '가문 총자산 100억'),
  rich1000: A('재산', '재벌의 탄생', '가문 총자산 1,000억'),
  chaebol: A('재산', '그룹 총수', '창업한 회사가 대기업이 되다'),
  ipo: A('재산', '상장사 창업주', '창업한 회사를 상장시키다'),
  landlord: A('재산', '조물주 위 건물주', '상가 건물 보유'),
  lotto: A('재산', '인생 역전', '로또 1등 당첨'),
  coin_rich: A('재산', '코인 부자', '코인 평가액 10억 돌파'),
  collector: A('재산', '컬렉터', '진품 예술품 5점 보유'),
  forgery: A('재산', '비싼 수업료', '위작을 샀다'),
  taxsaver: A('재산', '절세의 달인', '20억 이상 상속에서 실효세율 10% 이하'),
  comeback: A('재산', '재기', '파산했던 사람이 10억을 모으다'),
  noble_idle: A('재산', '백수 귀족', '백수로 살면서 개인 재산 10억 보유'),
  // 인생
  idle3: A('인생', '백수 3대', '3대 연속 백수로 살아남기'),
  cancer_survivor: A('인생', '암을 이긴 사람', '암 진단 후 5년 생존'),
  marine: A('인생', '귀신 잡는 해병', '해병대 만기 전역'),
  draft_dodger: A('인생', '국적 포기', '병역을 피해 해외로 (불명예)'),
  bankrupt: A('인생', '바닥', '파산을 경험하다'),
  pet: A('인생', '반려견과 함께', '유기견을 입양하다'),
  guarantee_victim: A('인생', '보증은 서지 마라', '친구 보증을 섰다가 빚을 떠안다'),
  angel_jackpot: A('재산', '유니콘 엔젤', '투자한 스타트업이 대박 나다'),
  sub_winner: A('재산', '청약 당첨', '청약으로 새 아파트를 분양받다'),
  first_love: A('결혼·자녀', '돌고 돌아', '첫사랑과 결혼하다'),
  dui: A('인생', '음주운전 전과', '술 마시고 운전대를 잡았다 (불명예)'),
  emigrated: A('인생', '이민 간 자식', '자녀가 해외에 정착하다'),
  ponzi_victim: A('인생', '달콤한 배당', '폰지 사기에 당하다'),
  rival_passed: A('가문', '라이벌 추월', '라이벌 가문의 재산을 넘어서다'),
  rival_allied: A('가문', '원수에서 사돈으로', '라이벌 가문과 화해하다'),
  rival_fallen: A('가문', '최후의 승자', '라이벌 가문이 무너지는 것을 지켜보다'),
  dip_buyer: A('재산', '공포에 사라', '시대의 위기에 자산을 줍고 반등을 맞다'),
  audition_win: A('영광', '슈퍼 루키', '국민 오디션에서 우승하다'),
  patent_win: A('출세', '다윗의 승리', '대기업을 상대로 특허를 지켜내다'),
  saga_shop: A('인생', '할매손 국밥', '국밥집 이야기를 끝까지 겪다'),
  saga_farm: A('인생', '사과밭 이장님', '귀농 이야기를 끝까지 겪다'),
  saga_world: A('인생', '80일간의 세계 일주', '노부부 세계 일주를 마치다'),
  saga_run: A('인생', '42.195', '러너 이야기를 끝까지 겪다'),
  saga_redev: A('인생', '조합장님', '재개발을 끝까지 이끌다'),
  saga_hidden: A('결혼·자녀', '핏줄', '숨겨진 형제와 가족이 되다'),
  // 히든 직업 (job-acts-hidden · stories-work-hidden)
  hid_legend10: A('영광', '그림자의 전설', '히든 직업으로 10년을 버티다'),
  hid_super10: A('영광', '밤을 지배한 10년', '슈퍼 히든 직업으로 10년을 버티다'),
  hid_pair: A('가문', '비밀의 가문', '살아 있는 가족 둘이 동시에 히든 직업'),
  hid_hoh: A('영광', '슈퍼 히든의 정점', '슈퍼 히든 직업에 오르다'),
  hid_jackpot: A('인생', '일생일대', '히든 직업의 「일생일대」 기회에서 대박을 내다'),
  hid_clean: A('인생', '손을 씻다', '히든 직업에서 평범한 삶으로 돌아오다'),
};
