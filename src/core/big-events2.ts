// 대형 이벤트 ② — 직업·시대에 맞는 새 승부들. 형식은 big-events.ts 와 같다 (라운드마다 전략 → 점수 → 결과).
// 미래(2040~)의 승부는 그 시대가 와야 열린다.
import { reward, type BigDef } from './big-events';
import { age, hasTalent, hasTrait } from './people';
import { fullName } from './people';
import type { GameState, Person } from './types';

const A = (s: GameState, p: Person) => age(s, p);
const working = (p: Person, jobs: string[]) => jobs.includes(p.job);

export const BIGS2: BigDef[] = [
  {
    id: 'trial', title: '⚖ 세기의 재판', icon: '⚖', meter: '배심원의 마음', goal: 4, again: 8,
    ok: (s, p) => A(s, p) >= 28 && A(s, p) <= 72 && working(p, ['lawyer', 'prosecutor']),
    bonus: (_s, p) => (hasTalent(p, 'orator') ? 10 : 0) + (hasTalent(p, 'justice') ? 8 : 0) + p.jobLevel * 2,
    rounds: [
      { title: '모두 진술', text: '전 국민이 지켜보는 국민참여재판. {n}이(가) 일어섰다. 배심원 아홉 명의 눈이 쏠린다.', opts: [
        { label: '사실관계를 차분히 쌓는다', stat: 'int', need: 58, win: 2, lose: 0, wt: '배심원들이 메모를 시작했다.', lt: '조금 지루했다.' },
        { label: '감정에 호소한다', stat: 'cha', need: 62, win: 3, lose: -1, wt: '배심원 한 명이 눈가를 훔쳤다.', lt: '"감정 몰이"라는 이의가 받아들여졌다.' },
      ] },
      { title: '증인 신문', text: '핵심 증인이 증언대에 섰다. 진술이 어딘가 어긋난다.', opts: [
        { label: '모순을 파고든다', stat: 'int', need: 62, win: 3, lose: -2, wt: '증인이 말을 바꿨다! 법정이 술렁였다.', lt: '오히려 증인이 더 단단해졌다.' },
        { label: '부드럽게 신뢰를 얻는다', stat: 'cha', need: 56, win: 2, lose: 0, wt: '증인이 숨겨 둔 사실을 털어놨다.', lt: '별 소득이 없었다.' },
      ] },
      { title: '최후 변론', text: '마지막 30분. 이 사건의 무게가 {n}의 어깨에 있다.', opts: [
        { label: '정의를 말한다', stat: 'mor', need: 58, win: 2, lose: 0, wt: '방청석에서 박수가 터졌다. 판사가 법봉을 두드렸다.', lt: '공허하게 들렸다.' },
        { label: '결정적 증거를 마지막에 꺼낸다', stat: 'luck', need: 50, win: 3, lose: -2, wt: '증거 하나가 판을 뒤집었다!', lt: '증거 채택이 거부됐다.' },
      ] },
    ],
    end: (x, sc) => {
      if (sc >= 4) return '🏆 승소! "세기의 재판"으로 교과서에 실릴 판결이 나왔다.' + reward(x, { cash: 3000, fame: 5, hap: 15, stats: { int: 2, cha: 2 }, promo: true, title: `세기의 재판 승소: ${fullName(x.p)}`, icon: '⚖', rarity: 'epic' });
      if (sc >= 2) return '일부 승소. 절반의 승리지만 이름이 알려졌다.' + reward(x, { fame: 2, hap: 5, stats: { int: 1 } });
      return '패소. 판결문을 몇 번이고 다시 읽었다.' + reward(x, { hap: -8, stats: { mor: 1 } });
    },
  },
  {
    id: 'surgery', title: '🩺 열두 시간의 수술', icon: '🩺', meter: '환자 바이탈', goal: 4, again: 8,
    ok: (s, p) => A(s, p) >= 30 && A(s, p) <= 68 && working(p, ['doctor', 'bci_surgeon', 'longevity_doc', 'vet', 'dentist']) && p.jobLevel >= 2,
    bonus: (_s, p) => (hasTalent(p, 'healer') ? 12 : 0) + (hasTrait(p, 'diligent') ? 4 : 0),
    rounds: [
      { title: '개복', text: '다른 병원 세 곳이 포기한 환자. 보호자가 {n}의 손을 붙잡았다. "선생님만 믿습니다."', opts: [
        { label: '교과서대로 신중하게', stat: 'int', need: 56, win: 2, lose: 0, wt: '예상대로 진행된다.', lt: '예상보다 유착이 심하다.' },
        { label: '새 술식을 시도한다', stat: 'int', need: 64, win: 3, lose: -2, wt: '수술 시간이 절반으로 줄었다!', lt: '출혈이 시작됐다.' },
      ] },
      { title: '위기', text: '수술 7시간째. 혈압이 떨어진다. 마취과에서 소리친다.', opts: [
        { label: '침착하게 지혈한다', stat: 'hp', need: 58, win: 2, lose: -2, wt: '손이 떨리지 않았다. 혈압이 돌아온다.', lt: '체력이 바닥났다.' },
        { label: '팀을 다독이며 지휘한다', stat: 'cha', need: 56, win: 2, lose: -1, wt: '수술실이 한 몸처럼 움직였다.', lt: '혼선이 생겼다.' },
      ] },
      { title: '봉합', text: '마지막 고비. 12시간째, 손끝 감각만 남았다.', opts: [
        { label: '끝까지 집중한다', stat: 'mor', need: 55, win: 2, lose: 0, wt: '마지막 한 땀. "수고하셨습니다."', lt: '봉합이 조금 거칠었다.' },
      ] },
    ],
    end: (x, sc) => {
      if (sc >= 4) return '🏆 환자가 깨어났다! 이 수술은 학회에서 발표됐다. 전국에서 환자가 몰려든다.' + reward(x, { cash: 2000, fame: 4, hap: 18, stats: { int: 3, mor: 2 }, promo: true, title: `기적의 수술: ${fullName(x.p)}`, icon: '🩺', rarity: 'epic' });
      if (sc >= 2) return '수술은 성공했다. 긴 회복이 남았다.' + reward(x, { fame: 1, hap: 8, stats: { int: 1 } });
      return '환자는 끝내… 수술복을 벗지 못하고 한참 앉아 있었다.' + reward(x, { hap: -12, stats: { mor: 1 } });
    },
  },
  {
    id: 'cannes', title: '🎬 칸 영화제', icon: '🎬', meter: '평단 반응', goal: 4,
    ok: (s, p) => A(s, p) >= 25 && A(s, p) <= 75 && working(p, ['film_director', 'film_actor', 'entertainer', 'actor']) && p.jobLevel >= 2,
    bonus: (_s, p) => (hasTalent(p, 'star') ? 10 : 0) + (hasTalent(p, 'artist') ? 6 : 0),
    rounds: [
      { title: '레드카펫', text: '플래시가 쏟아진다. 세계 기자들이 {n}의 이름을 부른다.', opts: [
        { label: '당당하게 걷는다', stat: 'cha', need: 58, win: 2, lose: 0, wt: '외신 1면에 사진이 실렸다.', lt: '긴장해서 표정이 굳었다.' },
        { label: '한복을 입고 나선다', stat: 'cha', need: 62, win: 3, lose: -1, wt: '"올해의 레드카펫 룩" 1위!', lt: '"무리수"라는 평.' },
      ] },
      { title: '공식 상영', text: '상영이 끝났다. 객석이 조용하다. 박수가 터질까?', opts: [
        { label: '작품을 믿는다', stat: 'luck', need: 55, win: 3, lose: -1, wt: '9분간의 기립박수!', lt: '박수가 금방 멎었다.' },
      ] },
      { title: '폐막식', text: '수상작 발표 직전. 심사위원장이 봉투를 연다.', opts: [
        { label: '수상 소감을 준비한다', stat: 'mor', need: 55, win: 2, lose: 0, wt: '"이 상을 고향의 어머니께…"', lt: '이름이 불리지 않았다.' },
      ] },
    ],
    end: (x, sc) => {
      if (sc >= 4) return '🏆 황금종려상! 귀국 공항이 인파로 마비됐다.' + reward(x, { cash: 5000, fame: 8, hap: 22, stats: { cha: 4 }, promo: true, title: `칸 황금종려상: ${fullName(x.p)}`, icon: '🎬', rarity: 'legend' });
      if (sc >= 2) return '🥈 감독상(남·여우주연상). 세계가 이름을 기억했다.' + reward(x, { cash: 1500, fame: 4, hap: 12, stats: { cha: 2 }, title: `칸 수상: ${fullName(x.p)}`, icon: '🎬', rarity: 'epic' });
      return '수상은 못 했다. 그래도 칸의 바다를 봤다.' + reward(x, { hap: 3 });
    },
  },
  {
    id: 'hearing', title: '🏛 인사청문회', icon: '🏛', meter: '여론', goal: 4,
    ok: (s, p) => A(s, p) >= 45 && A(s, p) <= 75 && ((working(p, ['judge', 'prosecutor', 'agent']) && p.jobLevel >= 3) || (working(p, ['professor', 'civil', 'diplomat']) && p.jobLevel >= 4)),
    bonus: (_s, p) => (hasTalent(p, 'justice') ? 8 : 0) + (hasTalent(p, 'orator') ? 6 : 0),
    rounds: [
      { title: '재산 검증', text: '야당 의원이 {n}의 30년 전 부동산 거래 서류를 흔든다.', opts: [
        { label: '서류로 소명한다', stat: 'int', need: 58, win: 2, lose: -1, wt: '"불법은 없었습니다." 깔끔했다.', lt: '자료가 부족했다.' },
        { label: '사과하고 넘어간다', stat: 'mor', need: 55, win: 1, lose: 0, wt: '솔직함이 통했다.', lt: '"사과로 끝날 일이 아니다."' },
      ] },
      { title: '가족 의혹', text: '자녀 진학·병역 의혹이 나왔다. 방송이 생중계 중이다.', opts: [
        { label: '정면으로 반박한다', stat: 'cha', need: 60, win: 2, lose: -2, wt: '의혹 제기 의원이 머쓱해졌다.', lt: '말이 꼬였다.' },
        { label: '침묵하며 자료를 낸다', stat: 'int', need: 56, win: 2, lose: -1, wt: '다음 날 팩트체크에서 무혐의로 나왔다.', lt: '"답변 회피" 비판.' },
      ] },
      { title: '소신 질의', text: '마지막 질문. "후보자의 소신을 말씀해 주십시오."', opts: [
        { label: '흔들림 없이 답한다', stat: 'mor', need: 58, win: 2, lose: 0, wt: '여야 모두 고개를 끄덕였다.', lt: '모범 답안 같았다.' },
      ] },
    ],
    end: (x, sc) => {
      if (sc >= 4) return '🏆 청문 보고서 여야 합의 채택! "역대급 무난한 후보"라는 평.' + reward(x, { fame: 5, hap: 12, stats: { mor: 2, cha: 2 }, promo: true, title: `청문회 통과: ${fullName(x.p)}`, icon: '🏛', rarity: 'epic' });
      if (sc >= 1) return '보고서는 채택 안 됐지만 임명은 됐다. 흠집이 남았다.' + reward(x, { fame: 1, hap: -2 });
      return '😓 낙마. 지명이 철회됐다.' + reward(x, { fame: -3, hap: -12 });
    },
  },
  {
    id: 'hackathon', title: '💻 AI 해커톤', icon: '💻', meter: '데모 점수', goal: 4, again: 6,
    ok: (s, p) => s.year >= 2024 && A(s, p) >= 18 && A(s, p) <= 50 && (working(p, ['developer', 'ai_engineer', 'data_scientist', 'game_dev', 'security', 'startup_emp', 'ai_trainer', 'cloud_eng']) || hasTalent(p, 'genius')),
    bonus: (_s, p) => (hasTalent(p, 'genius') ? 10 : 0) + (hasTrait(p, 'diligent') ? 4 : 0),
    rounds: [
      { title: '아이디어', text: '48시간 무박 해커톤. 주제가 공개됐다: "AI로 고독사를 막아라."', opts: [
        { label: '현장 인터뷰부터', stat: 'cha', need: 54, win: 2, lose: 0, wt: '사회복지사의 한마디에서 아이디어가 나왔다.', lt: '시간만 썼다.' },
        { label: '바로 코드를 짠다', stat: 'int', need: 58, win: 2, lose: -1, wt: '밤 12시에 프로토타입이 돌았다.', lt: '방향을 잘못 잡았다.' },
      ] },
      { title: '새벽 4시', text: '서버가 터졌다. 팀원 하나는 졸고 있다.', opts: [
        { label: '혼자 밤새 고친다', stat: 'hp', need: 58, win: 2, lose: -1, wt: '해 뜰 무렵 다시 살아났다.', lt: '눈이 감겼다.' },
        { label: '구조를 갈아엎는다', stat: 'int', need: 64, win: 3, lose: -2, wt: '더 단단한 시스템이 됐다!', lt: '시간이 모자랐다.' },
      ] },
      { title: '데모 3분', text: '심사위원 앞, 3분 데모.', opts: [
        { label: '사람 이야기로 시작한다', stat: 'cha', need: 58, win: 2, lose: 0, wt: '심사위원 한 명이 고개를 끄덕였다.', lt: '시간이 모자랐다.' },
        { label: '라이브 시연', stat: 'luck', need: 50, win: 3, lose: -2, wt: '완벽하게 돌았다! 박수!', lt: '하필 그때 에러가…' },
      ] },
    ],
    end: (x, sc) => {
      if (sc >= 4) return '🏆 대상! 투자사 세 곳이 명함을 내밀었다.' + reward(x, { cash: 2000, fame: 2, hap: 15, stats: { int: 3 }, mark: 'risk', promo: true, title: `해커톤 대상: ${fullName(x.p)}`, icon: '💻', rarity: 'rare' });
      if (sc >= 2) return '입상. 포트폴리오에 한 줄이 늘었다.' + reward(x, { cash: 300, hap: 6, stats: { int: 1 } });
      return '본선 탈락. 그래도 48시간을 버텼다.' + reward(x, { hap: -2, stats: { int: 1 } });
    },
  },
  {
    id: 'tsunami', title: '🌊 해안 도시 대피 작전', icon: '🌊', meter: '대피 인원', goal: 4, again: 12,
    ok: (s, p) => s.year >= 2050 && A(s, p) >= 22 && A(s, p) <= 65 && (working(p, ['firefighter', 'police', 'coast_guard', 'officer', 'civil', 'climate_eng', 'emt', 'drone_control']) || hasTalent(p, 'commander')),
    bonus: (_s, p) => (hasTalent(p, 'commander') ? 10 : 0) + (hasTalent(p, 'navigator') ? 5 : 0),
    rounds: [
      { title: '경보', text: '해수면 상승으로 높아진 폭풍해일이 몰려온다. 해안 저지대 주민 3천 명. {n}에게 현장 지휘가 맡겨졌다.', opts: [
        { label: '드론으로 구역을 나눈다', stat: 'int', need: 58, win: 2, lose: 0, wt: '대피 동선이 한눈에 그려졌다.', lt: '통신이 끊긴 구역이 있다.' },
        { label: '직접 확성기를 든다', stat: 'cha', need: 56, win: 2, lose: 0, wt: '주민들이 그 목소리를 따라 움직였다.', lt: '목이 쉬었다.' },
      ] },
      { title: '요양원', text: '거동이 불편한 어르신 40명이 있는 요양원이 남았다. 물이 차오른다.', opts: [
        { label: '구조대를 이끌고 들어간다', stat: 'str', need: 60, win: 3, lose: -2, wt: '마지막 한 분까지 업어 냈다.', lt: '물살에 밀렸다.' },
        { label: '수륙양용 로봇을 투입한다', stat: 'int', need: 60, win: 2, lose: -1, wt: '로봇들이 침대째 옮겼다.', lt: '로봇 두 대가 멈췄다.' },
      ] },
      { title: '정점', text: '해일 정점. 방조제가 버틸까?', opts: [
        { label: '마지막까지 남는다', stat: 'mor', need: 56, win: 2, lose: -1, wt: '방조제는 버텼다. 새벽에 모두의 생존이 확인됐다.', lt: '몇 명이 연락이 안 된다.' },
      ] },
    ],
    end: (x, sc) => {
      if (sc >= 4) return '🏆 단 한 명의 희생자도 없었다! "기적의 대피" 영상이 전 세계로 퍼졌다.' + reward(x, { cash: 1000, fame: 6, hap: 18, stats: { mor: 3, cha: 2 }, promo: true, title: `기적의 대피: ${fullName(x.p)}`, icon: '🌊', rarity: 'epic' });
      if (sc >= 2) return '대부분 대피했다. 몇 집이 물에 잠겼지만 사람은 무사했다.' + reward(x, { fame: 2, hap: 6, stats: { mor: 2 } });
      return '피해가 컸다. 책임을 통감했다.' + reward(x, { hap: -12, stats: { mor: 1 } });
    },
  },
  {
    id: 'station_repair', title: '🛰 우주정거장 선외 수리', icon: '🛰', meter: '수리 진행', goal: 4, again: 10,
    ok: (s, p) => s.year >= 2060 && A(s, p) >= 24 && A(s, p) <= 60 && (working(p, ['space_tech', 'aero_engineer', 'asteroid_miner', 'orbital_architect', 'star_navigator', 'pilot', 'terraformer']) || p.flags.includes('space_trip')),
    bonus: (_s, p) => (hasTalent(p, 'navigator') ? 10 : 0) + (hasTalent(p, 'iron') ? 6 : 0),
    rounds: [
      { title: '경보', text: '미세 운석이 정거장 외벽을 뚫었다. 공기가 샌다. {n}이(가) 우주복을 입는다.', opts: [
        { label: '체크리스트를 한 줄씩', stat: 'int', need: 56, win: 2, lose: 0, wt: '실수 없이 에어록을 나섰다.', lt: '절차에 시간이 걸렸다.' },
        { label: '절차를 줄이고 바로 나간다', stat: 'str', need: 60, win: 3, lose: -2, wt: '귀중한 10분을 벌었다!', lt: '안전줄이 엉켰다.' },
      ] },
      { title: '선외 작업', text: '지구가 발밑에서 돈다. 공구 하나 놓치면 끝이다.', opts: [
        { label: '패치를 붙인다', stat: 'int', need: 60, win: 2, lose: -1, wt: '구멍이 막혔다!', lt: '패치가 들떴다.' },
        { label: '동료와 호흡을 맞춘다', stat: 'cha', need: 55, win: 2, lose: 0, wt: '무전 너머 동료의 숨소리가 안심이 됐다.', lt: '신호가 엇갈렸다.' },
      ] },
      { title: '귀환', text: '산소 잔량 12%. 에어록까지 30미터.', opts: [
        { label: '천천히, 정확하게', stat: 'hp', need: 56, win: 2, lose: -1, wt: '에어록 문이 닫혔다. 관제센터에서 함성이 들렸다.', lt: '숨이 가빠졌다.' },
      ] },
    ],
    end: (x, sc) => {
      if (sc >= 4) return '🏆 정거장을 구했다! 정거장 모듈 하나에 {n}의 이름이 붙었다.'.replace('{n}', fullName(x.p)) + reward(x, { cash: 3000, fame: 6, hap: 20, stats: { int: 2, str: 2 }, promo: true, title: `궤도의 영웅: ${fullName(x.p)}`, icon: '🛰', rarity: 'epic' });
      if (sc >= 2) return '수리는 됐다. 지구로 돌아와 한참 땅을 밟고 서 있었다.' + reward(x, { fame: 2, hap: 8, stats: { str: 1 } });
      return '임시 조치만 하고 철수했다. 모두 살아 돌아온 게 다행이다.' + reward(x, { hap: -6 });
    },
  },
  {
    id: 'ssireum', title: '🐂 명절 씨름 대회', icon: '🐂', meter: '판', goal: 3, again: 8,
    ok: (s, p) => A(s, p) >= 18 && A(s, p) <= 45 && p.sex === 'M' && p.actual.str >= 55,
    bonus: (_s, p) => (hasTalent(p, 'athlete') ? 10 : 0) + (hasTalent(p, 'iron') ? 6 : 0),
    rounds: [
      { title: '8강', text: '추석 장사 씨름 대회. 모래판 위에 황소 한 마리가 상품으로 걸렸다.', opts: [
        { label: '들배지기', stat: 'str', need: 55, win: 1, lose: -1, wt: '상대가 모래판에 등을 댔다!', lt: '되치기를 당했다.' },
        { label: '안다리 걸기', stat: 'int', need: 52, win: 1, lose: 0, wt: '기술로 넘겼다.', lt: '상대가 버텼다.' },
      ] },
      { title: '4강', text: '상대는 작년 우승자. 덩치가 두 배다.', opts: [
        { label: '정면 승부', stat: 'str', need: 62, win: 1, lose: -1, wt: '거구가 넘어갔다! 관중이 일어섰다.', lt: '힘에서 밀렸다.' },
        { label: '빈틈을 노린다', stat: 'luck', need: 50, win: 1, lose: -1, wt: '상대가 중심을 잃었다!', lt: '헛손질이었다.' },
      ] },
      { title: '결승', text: '마지막 판. 동네 사람들이 이름을 연호한다.', opts: [
        { label: '전력을 다한다', stat: 'hp', need: 58, win: 1, lose: -1, wt: '황소가 우리 것이다!', lt: '마지막 힘이 모자랐다.' },
      ] },
    ],
    end: (x, sc) => {
      if (sc >= 3) return '🏆 천하장사! 꽃가마에 황소 한 마리. 마을 잔치가 열렸다.' + reward(x, { cash: 800, fame: 2, hap: 18, stats: { str: 3 }, title: `씨름 장사: ${fullName(x.p)}`, icon: '🐂', rarity: 'rare' });
      if (sc >= 1) return '준결승까지 갔다. 동네에서 "장사"로 불린다.' + reward(x, { hap: 6, stats: { str: 1 } });
      return '첫 판에 넘어갔다. 모래 맛을 봤다.' + reward(x, { hap: -2 });
    },
  },
];
