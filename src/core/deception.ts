// 진짜일까 가짜일까: 수상한 연락과 지인의 제안.
// 이벤트가 만들어질 때 진짜/가짜가 정해지고, 문장은 일부러 비슷하게 쓴다. 단서가 없을 때도 많다.
// · 가짜를 믿으면 돈을 잃는다. 하지만 진짜를 무시해도 손해다 (응급실·법원·카드사).
// · "직접 확인"은 안전하지만 느리다: 급한 진짜 상황에선 조금 늦는다.
import type { Choice, Ctx } from './ev-util';
import type { LifeDef } from './life';
import type { GameState, Person } from './types';
import { chance, int, pick } from './rng';
import { formatMoney, pay } from './economy';
import { wageIndex } from './pay';
import { addFlag, age, alive, check, clamp, fullName, mark, spouseOf } from './people';
import { FEMALE_NAMES, MALE_NAMES, SURNAMES } from './data';
import { buyPower } from './leverage';

const W = (s: GameState, v: number) => Math.round(v * wageIndex(s.year));
const hap = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));
const lose = (x: Ctx, v: number) => {
  pay(x.s, x.p, v);
  return formatMoney(v);
};
const kidOf = (s: GameState, p: Person) => p.childIds.map((id) => s.people[id]).find((k) => k && alive(k) && age(s, k) >= 15);

// ───────────────────────── 수상한 연락 ─────────────────────────

interface Outcome {
  real: (x: Ctx) => string;
  scam: (x: Ctx) => string;
}
interface CallTpl {
  id: string;
  title: string;
  age: [number, number];
  /** 진짜일 확률 */
  pReal: number;
  w?: number;
  cond?: (s: GameState, p: Person) => boolean;
  /** 진짜일 때 문장들 / 가짜일 때 문장들 (비슷하게) */
  real: ((c: Ctx) => string)[];
  scam: ((c: Ctx) => string)[];
  labels: [string, string, string];
  comply: Outcome;
  verify: Outcome;
  ignore: Outcome;
}

const CALLS: CallTpl[] = [
  {
    id: 'call_kid_accident', title: '📞 모르는 번호', age: [40, 80], pReal: 0.35, cond: (s, p) => !!kidOf(s, p),
    real: [
      (c) => `"○○대학교병원 응급실입니다. ${fullName(kidOf(c.s, c.p)!)} 님 보호자 되시죠? 교통사고로 이송됐습니다. 지금 오셔야 합니다."`,
      (c) => `"${fullName(kidOf(c.s, c.p)!)} 학생 담임입니다. 체육 시간에 다쳐서 병원으로 옮겼어요. 어머님(아버님) 빨리 와 주세요."`,
    ],
    scam: [
      (c) => `"엄마(아빠)… 나 ${kidOf(c.s, c.p)!.name}인데 사고 났어… 흑흑" 울음소리 뒤로 낯선 남자가 받는다. "합의금 500 보내면 조용히 끝냅니다."`,
      (c) => `"○○병원 응급실입니다. ${fullName(kidOf(c.s, c.p)!)} 님이 다쳤는데 수술 동의 전에 보증금 300만 원을 먼저 입금하셔야 합니다."`,
    ],
    labels: ['시키는 대로 한다 (당장 달려가거나 입금)', '끊고 아이에게 직접 전화한다', '장난 전화겠지, 무시한다'],
    comply: {
      real: (x) => (hap(x.p, 2), '병원으로 달려갔다. 다행히 골절만. 아이가 엄마(아빠) 얼굴을 보고 울음을 터뜨렸다.'),
      scam: (x) => (hap(x.p, -15), `${lose(x, W(x.s, 500))}을 보냈다. 몇 분 뒤 아이에게서 "왜?" 하고 문자가 왔다. 보이스피싱이었다.`),
    },
    verify: {
      real: (x) => (hap(x.p, -2), '아이 전화기가 꺼져 있었다. 병원 대표번호로 다시 확인하고 달려갔다. 30분 늦었지만 무사했다.'),
      scam: () => '아이는 학교(회사)에서 멀쩡히 전화를 받았다. 등골이 서늘하다. 112에 신고했다.',
    },
    ignore: {
      real: (x) => {
        const k = kidOf(x.s, x.p);
        if (k) k.affinity = clamp(k.affinity - 15, -100, 100);
        hap(x.p, -10);
        return '진짜였다. 아이는 보호자 없이 수술 대기실에서 몇 시간을 혼자 있었다. "왜 안 왔어?"라는 말이 가슴에 박혔다.';
      },
      scam: () => '끊었다. 잠시 뒤 같은 번호로 부재중 전화가 열 통. 역시 사기였다.',
    },
  },
  {
    id: 'call_prosecutor', title: '📞 서울중앙지검입니다', age: [25, 90], pReal: 0.2,
    real: [
      () => '등기우편이 왔다. "서울중앙지방검찰청 출석요구서. 참고인 조사를 위해 ○월 ○일 출석 바랍니다." 담당 수사관 이름과 대표번호가 적혀 있다.',
      () => '"서울중앙지검 수사관 김○○입니다. 선생님 명의 계좌가 사건 증거에 나와서 참고인으로 한번 나와 주셔야겠습니다. 소환장은 우편으로 갑니다."',
    ],
    scam: [
      () => '"서울중앙지검 수사관 김○○입니다. 선생님 명의로 대포통장이 개설됐습니다. 자산 보호를 위해 지금 안내하는 안전계좌로 옮기셔야 합니다."',
      () => '"검찰청입니다. 선생님 계좌가 범죄에 연루됐어요. 수사 중이니 가족에게도 절대 말하지 마시고, 이 앱을 설치해 주세요."',
    ],
    labels: ['안내대로 따른다', '검찰청 대표번호(1301)로 직접 확인', '무시한다'],
    comply: {
      real: (x) => (hap(x.p, -2), '출석해 참고인 진술을 했다. 명의가 도용됐던 거라 오히려 피해 구제를 받았다.'),
      scam: (x) => (hap(x.p, -20), `안전계좌로 옮기라는 말에 ${lose(x, W(x.s, 2000))}을 보냈다. 검찰은 전화로 돈을 옮기라고 하지 않는다.`),
    },
    verify: {
      real: () => '1301에 확인하니 실제 사건이었다. 날짜에 맞춰 출석해 짧게 진술하고 끝났다.',
      scam: () => '1301에 물으니 "그런 수사관 없습니다." 신고했다.',
    },
    ignore: {
      real: (x) => (hap(x.p, -6), (x.p.cash -= W(x.s, 100)), '진짜 소환장이었다. 두 번 불응했더니 과태료가 나오고, 결국 출석해야 했다.'),
      scam: () => '끊고 번호를 차단했다. 잘했다.',
    },
  },
  {
    id: 'call_parcel', title: '📱 택배 문자', age: [20, 90], pReal: 0.45, w: 0.025,
    real: [
      () => '[CJ대한통운] 고객님의 상품이 주소 불명으로 보관 중입니다. 앱에서 주소를 확인해 주세요.',
      () => '[우체국] 등기우편물 배달 예정. 부재 시 재배달 신청: 우체국 앱',
    ],
    scam: [
      () => '[CJ대한통운] 고객님의 상품이 주소 불명으로 보관 중입니다. 주소 확인: han.gl/xK3p',
      () => '[국제발신] 우체국 택배 반송 예정. 주소 수정 바랍니다 → bit.ly/2Qp9',
    ],
    labels: ['링크를 눌러 주소를 고친다', '택배사 앱을 직접 열어 확인', '무시한다'],
    comply: {
      real: () => '주소가 한 글자 틀려 있었다. 고치니 다음 날 도착했다.',
      scam: (x) => (hap(x.p, -10), `링크를 누르자 앱이 깔렸다. 며칠 뒤 모르는 소액결제가 줄줄이… ${lose(x, W(x.s, 150))} 피해. 휴대폰을 초기화했다.`),
    },
    verify: {
      real: () => '앱에서 주소를 고쳤다. 다음 날 도착.',
      scam: () => '앱에는 배송 중인 택배가 없었다. 스미싱이었다.',
    },
    ignore: {
      real: (x) => (hap(x.p, -3), '진짜였다. 택배가 반송돼 다시 주문하느라 일주일이 늦었다.'),
      scam: () => '신경 쓰지 않았다. 아무 일 없었다.',
    },
  },
  {
    id: 'call_bank_fds', title: '📞 카드사 이상거래 확인', age: [22, 90], pReal: 0.5,
    real: [
      () => '"○○카드 이상거래탐지팀입니다. 방금 해외에서 198만 원 결제 시도가 있어 보류했습니다. 본인 사용이 맞으신가요?" 카드 뒷면 번호와 같은 번호다.',
      () => '[○○카드] 해외 결제 1,980,000원 승인 보류. 본인 사용 아니면 카드 뒷면 고객센터로 연락 바랍니다.',
    ],
    scam: [
      () => '"○○카드 이상거래탐지팀입니다. 해외 결제 시도가 있었습니다. 피해를 막으려면 보안 앱을 설치하시고 카드 번호와 비밀번호를 확인해 주세요."',
      () => '[국제발신] 해외 결제 1,980,000원 승인 완료. 본인 아니면 즉시 문의 02-3xx-xxxx',
    ],
    labels: ['안내대로 한다', '카드 뒷면 번호로 직접 전화', '무시한다'],
    comply: {
      real: () => '"본인 아닙니다." 카드가 정지되고 새 카드가 나왔다. 피해 0원.',
      scam: (x) => (hap(x.p, -15), `보안 앱이라더니 원격 조종 앱이었다. 통장에서 ${lose(x, W(x.s, 1200))}이 빠져나갔다.`),
    },
    verify: {
      real: () => '카드사에 직접 전화해 정지했다. 피해 0원.',
      scam: () => '카드사에 물으니 그런 결제는 없단다. 문자 속 번호가 사기였다.',
    },
    ignore: {
      real: (x) => (hap(x.p, -8), `진짜 도용이었다. 보류가 풀리며 ${lose(x, W(x.s, 200))}이 결제됐다. 이의 신청 중이다.`),
      scam: () => '신경 쓰지 않았다. 역시 사기 문자였다.',
    },
  },
  {
    id: 'call_refinance', title: '📱 저금리 대환대출 안내', age: [25, 70], pReal: 0.3, cond: (_s, p) => p.cash < 0 || p.flags.includes('living_loan'),
    real: [
      () => '[○○은행] 고객님, 대환대출 인프라로 연 4%대 갈아타기가 가능합니다. 은행 앱 > 대출 갈아타기에서 확인하세요.',
      () => '[금융위] 정책서민금융 햇살론 대상입니다. 서민금융진흥원(1397) 또는 은행 창구에서 신청하세요.',
    ],
    scam: [
      () => '[○○은행] 고객님, 연 3%대 갈아타기 가능! 기존 대출 상환 확인을 위해 먼저 300만 원을 지정 계좌로 입금해 주세요.',
      () => '[정부지원] 서민 저금리 대출 승인! 신용 등급 상향 수수료 200만 원 입금 시 즉시 실행.',
    ],
    labels: ['안내대로 신청한다', '은행 앱·창구에서 직접 확인', '무시한다'],
    comply: {
      real: (x) => ((x.p.credit = clamp((x.p.credit ?? 700) + 30, 300, 950)), '갈아탔다. 이자가 절반으로 줄었다. 신용점수도 올랐다.'),
      scam: (x) => (hap(x.p, -15), `${lose(x, W(x.s, 300))}을 보냈더니 연락이 끊겼다. 은행은 대출 전에 돈을 먼저 받지 않는다.`),
    },
    verify: {
      real: (x) => ((x.p.credit = clamp((x.p.credit ?? 700) + 30, 300, 950)), '창구에서 확인하니 진짜 대상이었다. 금리를 크게 낮췄다.'),
      scam: () => '은행에 물으니 그런 상품은 없단다.',
    },
    ignore: {
      real: () => '진짜 기회였는데 놓쳤다. 비싼 이자가 그대로 나간다.',
      scam: () => '무시했다. 잘한 일이다.',
    },
  },
  {
    id: 'call_refund', title: '📱 환급금 안내', age: [30, 95], pReal: 0.5,
    real: [
      () => '[국민건강보험] 본인부담상한액 초과 환급금 38만 원이 있습니다. 공단 앱 또는 1577-1000으로 신청하세요.',
      () => '[국세청] 종합소득세 환급금이 있습니다. 홈택스에서 확인하세요.',
    ],
    scam: [
      () => '[국민건강보험] 본인부담상한액 초과 환급금 38만 원 발생. 신청: ko.gl/nhis-refund',
      () => '[국세청] 미수령 환급금 있음. 본인 인증 후 즉시 지급 → tax-refund.kr',
    ],
    labels: ['문자 링크로 신청한다', '공단·홈택스 앱에서 직접 확인', '무시한다'],
    comply: {
      real: (x) => ((x.p.cash += 38), '환급금 38만 원이 들어왔다. 공돈 같다.'),
      scam: (x) => (hap(x.p, -10), `본인 인증을 했더니 계좌 정보가 털렸다. ${lose(x, W(x.s, 250))} 피해.`),
    },
    verify: {
      real: (x) => ((x.p.cash += 38), '앱에서 확인하니 진짜였다. 38만 원 환급!'),
      scam: () => '앱에는 환급금이 없었다. 가짜 링크였다.',
    },
    ignore: {
      real: () => '진짜였는데 몰랐다. 환급금은 3년 지나면 사라진다.',
      scam: () => '무시했다. 아무 일 없었다.',
    },
  },
  {
    id: 'call_obituary', title: '📱 부고 문자', age: [35, 95], pReal: 0.5,
    real: [
      () => '[부고] 고등학교 동창 박○○ 님 부친상. 빈소: ○○병원 장례식장 3호실. 발인 모레.',
      () => '[부고] 전 직장 동료 이○○ 님 모친 별세. 삼가 고인의 명복을 빕니다. 빈소: ○○장례식장',
    ],
    scam: [
      () => '[부고] 고등학교 동창 박○○ 님 부친상. 빈소 안내 및 조의금 → han.gl/bugo',
      () => '[부고] 지인 별세 소식입니다. 장례식장 확인: bit.ly/3xq',
    ],
    labels: ['링크를 눌러 빈소를 확인한다', '동창에게 직접 물어본다', '그냥 넘긴다'],
    comply: {
      real: (x) => (mark(x.p, 'network', 1), '빈소에 다녀왔다. 친구가 손을 꼭 잡았다.'),
      scam: (x) => (hap(x.p, -8), `링크를 누르자 악성 앱이 깔렸다. 지인 전체에게 같은 문자가 퍼졌다. ${lose(x, W(x.s, 100))} 피해.`),
    },
    verify: {
      real: (x) => (mark(x.p, 'network', 1), '친구에게 물으니 맞았다. 조문을 다녀왔다.'),
      scam: () => '동창은 멀쩡했다. "나도 그 문자 받았어." 스미싱이었다.',
    },
    ignore: {
      real: (x) => (mark(x.p, 'network', -1), hap(x.p, -3), '진짜였다. 나중에 알게 돼 얼굴 보기가 민망하다.'),
      scam: () => '넘겼다. 사기였다.',
    },
  },
  {
    id: 'call_family_phone', title: '📱 "엄마 나 폰 고장났어"', age: [45, 95], pReal: 0.15, cond: (s, p) => !!kidOf(s, p),
    real: [(c) => `"엄마(아빠) 나 ${kidOf(c.s, c.p)!.name}! 폰 액정 깨져서 친구 폰으로 연락해. 저녁에 집에 갈게, 걱정 마."`],
    scam: [
      (c) => `"엄마(아빠) 나 ${kidOf(c.s, c.p)!.name}. 폰 액정 깨져서 수리 맡겼어. 급하게 온라인 결제할 게 있는데 신분증 사진이랑 카드 번호 좀 보내 줘."`,
      () => '"엄마 나야. 폰 고장 나서 임시 번호야. 문화상품권 50만 원어치만 사서 핀번호 보내 줄 수 있어? 급해!"',
    ],
    labels: ['부탁대로 해 준다', '원래 번호로 전화해 본다', '답장하지 않는다'],
    comply: {
      real: () => '"응, 알았어." 저녁에 아이가 멀쩡히 들어왔다.',
      scam: (x) => (hap(x.p, -12), `신분증과 카드 번호를 보냈다. 명의로 폰이 개통되고 ${lose(x, W(x.s, 600))}이 빠져나갔다.`),
    },
    verify: {
      real: () => '원래 번호는 꺼져 있었다. 저녁에 들어온 아이가 "진짜 깨졌다니까" 하고 웃었다.',
      scam: () => '원래 번호로 거니 아이가 받았다. "나 폰 멀쩡한데?" 사기였다.',
    },
    ignore: {
      real: (x) => {
        const k = kidOf(x.s, x.p);
        if (k) k.affinity = clamp(k.affinity - 3, -100, 100);
        return '"왜 답장 안 해?" 아이가 조금 서운해했다.';
      },
      scam: () => '답장하지 않았다. 잘한 일이다.',
    },
  },
  {
    id: 'call_used_trade', title: '📱 중고거래 안전결제', age: [18, 70], pReal: 0.5,
    real: [() => '중고거래 앱에서 180만 원짜리 노트북을 샀다. 판매자가 "앱 안의 안전결제로 하시죠"라고 한다.'],
    scam: [() => '중고거래 앱에서 180만 원짜리 노트북을 샀다. 판매자가 "이 안전결제 링크로 하시죠"라며 카톡으로 주소를 보냈다.'],
    labels: ['판매자 말대로 결제한다', '앱 안에서만 거래하자고 한다', '거래를 취소한다'],
    comply: {
      real: () => '며칠 뒤 노트북이 도착했다. 상태도 좋다.',
      scam: (x) => (hap(x.p, -10), `가짜 결제 페이지였다. ${lose(x, W(x.s, 180))}이 사라지고 판매자는 탈퇴했다.`),
    },
    verify: {
      real: () => '앱 안에서 결제했다. 무사히 받았다.',
      scam: () => '"앱 결제는 안 돼요." 판매자가 잠수를 탔다. 역시.',
    },
    ignore: {
      real: () => '괜히 의심했나. 다른 사람이 사 갔다.',
      scam: () => '취소했다. 나중에 사기꾼으로 신고된 계정이었다.',
    },
  },
  {
    id: 'call_romance', title: '💌 해외에서 온 메시지', age: [30, 80], pReal: 0.05, cond: (s, p) => !(spouseOf(s, p) && alive(spouseOf(s, p)!)),
    real: [() => 'SNS로 알게 된 외국인과 반년째 대화 중이다. "한국 여행을 가려는데 항공권이 비싸네. 만나면 커피는 내가 살게."'],
    scam: [
      () => 'SNS로 알게 된 시리아 파견 미군 의사와 반년째 대화 중이다. "당신을 만나러 가고 싶은데 휴가 승인비 800만 원이 필요해요. 도착하면 바로 갚을게요."',
      () => 'SNS로 알게 된 해외 사업가가 "내 짐이 세관에 묶였어. 통관비 500만 원만 보내 주면 금괴를 나눠 줄게"라고 한다.',
    ],
    labels: ['부탁을 들어준다', '영상통화를 하자고 한다', '대화를 끊는다'],
    comply: {
      real: (x) => (hap(x.p, 6), '정말 한국에 왔다! 광화문에서 커피를 마셨다. 좋은 친구가 생겼다.'),
      scam: (x) => (hap(x.p, -20), `${lose(x, W(x.s, 800))}을 보냈다. 그 뒤로 프로필이 사라졌다. 로맨스 스캠이었다.`),
    },
    verify: {
      real: () => '영상통화가 연결됐다. 수줍게 웃는 진짜 사람이었다.',
      scam: () => '"카메라가 고장 났어요." 끝까지 얼굴을 보여 주지 않는다. 차단했다.',
    },
    ignore: {
      real: () => '끊었다. 가끔 그 사람이 궁금하다.',
      scam: () => '끊었다. 뉴스에 같은 수법이 나왔다.',
    },
  },
];

function callDef(t: CallTpl): LifeDef {
  return {
    id: t.id,
    weight: (s, p) => {
      const a = age(s, p);
      if (p.id !== s.headId || a < t.age[0] || a > t.age[1]) return 0;
      if (t.cond && !t.cond(s, p)) return 0;
      return t.w ?? 0.015;
    },
    title: () => t.title,
    text: (c) => {
      c.ev.data ??= { real: chance(c.s, t.pReal), v: int(c.s, 0, 9) };
      const pool = c.ev.data.real ? t.real : t.scam;
      return pool[c.ev.data.v % pool.length](c) + '\n\n진짜일까, 가짜일까?';
    },
    choices: (c) => {
      const real = !!c.ev.data?.real;
      const done = (o: Outcome) => (x: Ctx) => (real ? o.real(x) : o.scam(x)) + `\n${real ? '(✅ 진짜였다)' : '(🚨 사기였다)'}`;
      return [
        { label: t.labels[0], run: done(t.comply) },
        { label: t.labels[1], run: done(t.verify) },
        { label: t.labels[2], run: done(t.ignore) },
      ];
    },
  };
}

// ───────────────────────── 지인의 제안 ─────────────────────────

interface PitchTpl {
  id: string;
  title: string;
  age: [number, number];
  /** 진짜 좋은 기회일 확률 */
  pLegit: number;
  w?: number;
  cond?: (s: GameState, p: Person) => boolean;
  /** 누가 무엇을 권하는지 (friend = 이름) */
  pitch: (f: string, c: Ctx) => string;
  /** 캐물으면 드러나는 단서 [사기일 때, 진짜일 때] */
  clue: [string, string];
  /** 투자 금액 [조금, 크게] (만원, 물가 반영) */
  amounts: [number, number];
  /** 진짜일 때 수익 배수, 가짜일 때 돌려받는 비율 */
  win: number;
  loss: number;
  lines: { win: string; lose: string; declineLegit: string; declineScam: string };
  /** 투자 대신 다른 행동 (보증·명의 대여) */
  kind?: 'invest' | 'name' | 'loan';
}

const PITCHES: PitchTpl[] = [
  {
    id: 'pitch_mlm', title: '💊 부업 설명회', age: [25, 70], pLegit: 0.05,
    pitch: (f) => `오랜만에 연락 온 ${f}. "요즘 건강식품 유통 부업으로 월 500 벌어. 너만 특별히 소개하는 거야. 처음에 제품 300만 원어치만 사면 직급이 올라가고, 밑에 두 명만 데려오면 원금은 금방 뽑아."`,
    clue: ['자세히 물으니 "수익"의 대부분이 밑에 사람을 데려와서 나오는 구조다. 제품 가격은 시중의 세 배.', '회사가 공정위에 정식 등록된 직접판매업체이고, 제품 반품도 된다. 무리한 영입 강요는 없다.'],
    amounts: [300, 1500], win: 1.4, loss: 0.1,
    lines: { win: '진짜 좋은 제품이었다. 주변에 조금 팔아 부수입이 생겼다.', lose: '창고에 제품 박스만 쌓였다. 친구 관계도 몇 개 잃었다.', declineLegit: '그 친구는 소소하게 부업을 이어 간다.', declineScam: '석 달 뒤 그 업체가 불법 다단계로 적발됐다는 뉴스가 떴다.' },
  },
  {
    id: 'pitch_coin_room', title: '📈 리딩방 초대', age: [22, 70], pLegit: 0.08,
    pitch: (f) => `${f}이(가) 수익 인증 캡처를 보여 준다. "VIP 리딩방인데 전문가가 코인 찍어 줘. 나 한 달에 40% 벌었어. 가입비 200에 시드는 최소 1,000."`,
    clue: ['방장이 "원금 보장"을 말한다. 출금하려던 사람은 "세금 먼저 내라"며 막혔다는 글이 보인다.', '방장이 금융투자업 등록이 된 유사투자자문업자이고, 손실 경고도 분명히 한다.'],
    amounts: [1000, 5000], win: 1.5, loss: 0.05,
    lines: { win: '운 좋게 수익을 내고 빠져나왔다. 다시는 안 하겠다고 다짐했다.', lose: '출금 버튼을 누르자 "수수료 30%를 먼저 입금하라"고 한다. 사이트가 닫혔다.', declineLegit: '친구는 조금 벌었다고 자랑한다. 배가 아프다.', declineScam: '반년 뒤 리딩방 사기 일당이 검거됐다는 뉴스. 친구도 피해자였다.' },
  },
  {
    id: 'pitch_unlisted', title: '📄 비상장 주식', age: [28, 75], pLegit: 0.18,
    pitch: (f) => `증권사 다니는 ${f}의 귓속말. "바이오 회사인데 내년 코스닥 상장 확정이야. 지금 장외에서 주당 2만 원이면 상장하면 10만 원은 간다."`,
    clue: ['회사 이름을 검색하니 상장 예비심사 신청 기록이 없다. 파는 곳은 이름 모를 투자 컨설팅 회사.', '금감원 공시에 상장 예비심사 청구서가 올라가 있다. 기관 투자자도 들어가 있다.'],
    amounts: [1000, 5000], win: 3.5, loss: 0.1,
    lines: { win: '진짜 상장했다! 첫날 상한가. 주식이 몇 배가 됐다.', lose: '상장은 무슨. 회사는 휴업 상태였다. 주식은 휴지 조각.', declineLegit: '그 회사가 진짜 상장했다. 친구가 한턱 쐈다.', declineScam: '투자 사기로 수백 명이 피해를 봤다는 기사가 났다.' },
  },
  {
    id: 'pitch_hotel', title: '🏨 분양형 호텔', age: [35, 80], pLegit: 0.25, cond: (_s, p) => p.cash > 5000,
    pitch: (f) => `분양 상담사가 된 ${f}. "제주 바닷가 분양형 호텔 객실 하나 사 둬. 운영사가 10년 동안 연 8% 확정 수익을 보장해. 등기도 네 이름으로 나와."`,
    clue: ['계약서를 보니 "확정 수익"은 운영사 사정에 따라 바뀔 수 있다는 조항이 깨알같이 있다. 같은 운영사의 다른 호텔은 소송 중.', '운영사가 대형 호텔 체인이고, 확정 수익은 은행 지급보증이 붙어 있다.'],
    amounts: [3000, 15000], win: 1.35, loss: 0.4,
    lines: { win: '매년 꼬박꼬박 수익이 들어온다. 여름엔 가족이 무료로 묵는다.', lose: '2년째부터 수익금이 끊겼다. 객실은 팔리지도 않는다.', declineLegit: '친구는 매달 들어오는 수익을 자랑한다.', declineScam: '운영사가 파산했다. 수분양자 수백 명이 소송 중이다.' },
  },
  {
    id: 'pitch_restaurant', title: '🍗 동업 제안', age: [28, 65], pLegit: 0.45,
    pitch: (f) => `요리 잘하는 ${f}이(가) 사업계획서를 내민다. "상권 분석 다 했어. 역 앞 치킨집 자리가 났는데 권리금이 좀 있어. 네가 반 대 주면 수익 반반 하자."`,
    clue: ['계획서의 매출 예상이 주변 가게 평균의 세 배다. 친구는 가게를 해 본 적이 없다.', '친구는 10년 동안 남의 가게 주방장을 했다. 단골들이 벌써 오픈을 기다린다.'],
    amounts: [2000, 6000], win: 2.2, loss: 0.3,
    lines: { win: '가게가 대박! 줄 서는 집이 됐다. 배당이 쏠쏠하다.', lose: '1년 만에 폐업. 인테리어 비용만 날렸다. 친구와도 서먹해졌다.', declineLegit: '친구 가게가 맛집이 됐다. 갈 때마다 서비스를 준다.', declineScam: '친구 혼자 시작했다가 반년 만에 문을 닫았다.' },
  },
  {
    id: 'pitch_futures', title: '🤖 자동매매 프로그램', age: [25, 70], pLegit: 0.04,
    pitch: (f) => `${f}이(가) 휴대폰 화면을 보여 준다. "해외선물 AI 자동매매야. 켜 놓기만 하면 하루 1%씩 불어나. 프로그램 사용료 500에 시드 1,000이면 돼."`,
    clue: ['수익 화면은 모의투자 계좌였다. 프로그램 회사 주소는 공유 오피스.', '금융위에 등록된 투자일임업체고, 수익률도 연 10% 안팎으로 과장이 없다.'],
    amounts: [1500, 5000], win: 1.2, loss: 0.02,
    lines: { win: '조금 벌었다. 과장 광고보다는 훨씬 적지만.', lose: '"서버 점검 중"이라는 공지 뒤로 사이트가 사라졌다.', declineLegit: '친구는 소소하게 벌고 있다.', declineScam: '불법 선물 사이트 운영자들이 구속됐다.' },
  },
  {
    id: 'pitch_land', title: '🗺 개발 예정지 토지', age: [35, 80], pLegit: 0.08,
    pitch: (f) => `부동산 컨설팅 회사에 다니는 ${f}. "GTX 역 예정지 바로 옆 땅이야. 필지를 쪼개서 지분으로 파는 거라 3,000만 원이면 들어와. 역 발표 나면 다섯 배."`,
    clue: ['토지이용계획을 떼 보니 개발제한구역 임야다. 지분 공유자가 200명이 넘는다.', '실제 역세권 개발 고시가 난 지역이고, 단독 필지로 등기가 나온다.'],
    amounts: [3000, 10000], win: 2.5, loss: 0.15,
    lines: { win: '역 확정 발표! 땅값이 크게 뛰었다.', lose: '그린벨트 임야였다. 팔려고 해도 사겠다는 사람이 없다. 기획부동산이었다.', declineLegit: '그 땅이 진짜 올랐다는 소식. 아깝다.', declineScam: '기획부동산 일당이 검거됐다.' },
  },
  {
    id: 'pitch_p2p', title: '💰 월 3% 이자', age: [30, 85], pLegit: 0.05,
    pitch: (f) => `교회(동호회)에서 만난 ${f}의 권유. "우리 회사는 원금 보장에 월 3% 이자를 줘. 벌써 1년째 한 번도 안 밀렸어. 나도 5,000 넣었어."`,
    clue: ['연 36%를 "원금 보장"한다는 곳은 은행도 증권사도 아니다. 이자는 새로 들어온 사람 돈에서 나간다.', '알고 보니 이자는 월 0.3%였다. 친구가 잘못 말한 것. 정식 저축은행 특판 상품이다.'],
    amounts: [1000, 5000], win: 1.08, loss: 0.2,
    lines: { win: '저축은행 특판이었다. 소소하게 이자를 받았다.', lose: '석 달은 이자가 들어왔다. 그다음 달, 대표가 해외로 도주했다. 폰지 사기였다.', declineLegit: '괜히 의심했나 보다. 그래도 후회는 없다.', declineScam: '1년 뒤 수천억 원대 유사수신 사기가 터졌다. 친구는 전 재산을 잃었다.' },
  },
  {
    id: 'pitch_name', title: '🪪 명의 좀 빌려줘', age: [22, 70], pLegit: 0.15, kind: 'name',
    pitch: (f) => `${f}이(가) 곤란한 얼굴이다. "신용 문제로 내 이름으로는 사업자 등록이 안 돼. 네 명의로 잠깐만 해 주면 매달 50만 원 줄게."`,
    clue: ['사업자 통장은 친구가 관리하고, 무슨 사업인지 말을 흐린다. 대포통장 수법과 똑같다.', '친구 가게의 영업 허가 문제일 뿐, 장부와 통장을 매달 같이 확인하자고 먼저 말한다.'],
    amounts: [0, 0], win: 1, loss: 1,
    lines: { win: '매달 50만 원이 들어왔다. 1년 뒤 친구가 제 명의로 옮겼다.', lose: '내 명의로 세금 체납 3,000만 원과 사기 사건 고소장이 날아왔다. 명의 대여도 처벌 대상이다.', declineLegit: '친구는 다른 방법을 찾았다.', declineScam: '친구가 다른 사람 명의로 대포통장을 만들다 붙잡혔다.' },
  },
  {
    id: 'pitch_loan', title: '💸 급전 부탁', age: [25, 80], pLegit: 0.55, kind: 'loan',
    pitch: (f, c) => `${f}에게서 전화가 왔다. "진짜 미안한데 ${pick(c.s, ['아버지 수술비가', '월세가 석 달 밀려서', '카드값이 터져서', '전세금 돌려받는 날짜가 밀려서'])} 급해. 다음 달 월급 받으면 바로 갚을게."`,
    clue: ['알고 보니 다른 친구들에게도 같은 이유로 돈을 빌렸다. 갚았다는 사람이 없다.', '친구는 차용증을 먼저 쓰자고 하고, 매달 조금씩이라도 갚겠다고 계좌 자동이체까지 보여 준다.'],
    amounts: [300, 1000], win: 1.05, loss: 0.1,
    lines: { win: '약속대로 갚았다. 커피 쿠폰까지 얹어서.', lose: '"조금만 더 기다려 줘"가 3년째. 연락이 뜸해졌다.', declineLegit: '친구는 다른 데서 구했다. 조금 서먹하다.', declineScam: '나중에 그 친구가 여기저기 돈을 빌리고 잠적했다는 소문을 들었다.' },
  },
  {
    id: 'pitch_startup', title: '🚀 엔젤 투자', age: [30, 75], pLegit: 0.3, cond: (_s, p) => p.cash > 3000,
    pitch: (f) => `스타트업을 하는 ${f}. "시드 투자 라운드 중인데 지인 몫으로 조금 남겼어. 기업가치 30억에 들어오는 거야. 잘되면 백 배도 가능해."`,
    clue: ['제품이 아직 없고, 공동창업자가 모두 떠났다. 투자 계약서도 없이 계좌 이체만 하란다.', '정부 팁스(TIPS)에 선정됐고, 이름 있는 벤처캐피털이 리드 투자자다. 계약서도 정식이다.'],
    amounts: [1000, 5000], win: 6, loss: 0,
    lines: { win: '시리즈 B까지 갔다! 지분 가치가 여섯 배가 됐다.', lose: '2년 만에 문을 닫았다. 스타트업 열에 아홉은 이렇다.', declineLegit: '그 회사가 유니콘이 됐다. 뉴스를 볼 때마다 속이 쓰리다.', declineScam: '회사는 1년 만에 사라졌다.' },
  },
  {
    id: 'pitch_gap', title: '🏚 무자본 갭투자', age: [28, 70], pLegit: 0.1,
    pitch: (f) => `부동산 모임에서 만난 ${f}. "빌라는 전세가가 매매가랑 같아서 내 돈 0원으로 한 채씩 살 수 있어. 명의만 빌려주면 한 채당 200 줄게."`,
    clue: ['전세가가 매매가보다 높다. 집값이 조금만 떨어져도 세입자 보증금을 못 돌려준다. 전세 사기의 전형이다.', '실제로 전세가율 70%대 매물만 고르고, 보증보험 가입이 되는 집들이다.'],
    amounts: [0, 0], win: 1, loss: 1, kind: 'name',
    lines: { win: '소개비만 받고 끝났다. 다행히 문제는 없었다.', lose: '세입자들이 보증금을 돌려달라며 찾아왔다. 명의자인 내가 소송을 당했다. 전세 사기에 이름을 빌려준 셈이 됐다.', declineLegit: '괜한 걱정이었을 수도 있다.', declineScam: '그 모임이 전세 사기 조직으로 드러났다.' },
  },
  {
    id: 'pitch_gold_gye', title: '🪙 금 계모임', age: [40, 85], pLegit: 0.35,
    pitch: (f) => `동네 언니(형님) ${f}. "금값 오르는 거 알지? 우리 계모임에서 매달 100씩 모아 금을 사. 곗돈 타는 순서는 제비뽑기야."`,
    clue: ['곗주가 금을 실제로 샀다는 증빙이 없다. 먼저 탄 사람들이 연락이 끊겼다.', '금은 한국금거래소에서 사서 공동 명의 보관증을 매달 단톡방에 올린다.'],
    amounts: [600, 1200], win: 1.3, loss: 0.2,
    lines: { win: '금값이 올라 곗돈이 불었다. 반지를 하나 맞췄다.', lose: '곗주가 곗돈을 들고 사라졌다. 계모임 단톡방이 난리다.', declineLegit: '모임 사람들이 금값 올랐다고 좋아한다.', declineScam: '곗주가 잠적했다는 소식이 동네에 돌았다.' },
  },
  {
    id: 'pitch_insurance', title: '📑 보험 리모델링', age: [30, 75], pLegit: 0.4,
    pitch: (f) => `보험설계사가 된 ${f}. "네 보험 분석해 봤는데 보장이 엉망이야. 다 해지하고 내가 짜 준 걸로 갈아타. 매달 30만 원이면 암·뇌·심장 다 돼."`,
    clue: ['기존 보험을 해지하면 해지환급금이 납입액의 절반도 안 된다. 새 보험은 설계사 수당이 큰 상품이다.', '기존 보험에 실제로 보장 공백이 있고, 해지 없이 부족한 부분만 추가하자고 한다.'],
    amounts: [300, 1000], win: 1.1, loss: 0.5,
    lines: { win: '꼭 필요한 보장만 채웠다. 마음이 든든하다.', lose: '기존 보험 해지로 수백만 원 손해. 새 보험료는 부담스럽다.', declineLegit: '친구가 조금 서운해했다.', declineScam: '같은 설계사에게 가입한 지인이 "해지 손해만 봤다"고 한다.' },
  },
  {
    id: 'pitch_franchise', title: '🧋 프랜차이즈 창업', age: [30, 65], pLegit: 0.35, cond: (_s, p) => p.cash > 5000,
    pitch: (f) => `${f}이(가) 설명회에 데려갔다. "요즘 뜨는 탕후루(디저트) 브랜드야. 본사가 월 순수익 800 보장한대. 가맹비 포함 1억 5천."`,
    clue: ['정보공개서를 보니 가맹점 1년 폐업률이 40%. "보장" 문구는 계약서 어디에도 없다.', '정보공개서의 가맹점 평균 매출이 실제로 높고, 폐업률도 업계 평균보다 낮다.'],
    amounts: [5000, 15000], win: 1.6, loss: 0.35,
    lines: { win: '가게가 자리를 잡았다. 순수익이 은행 이자보다 훨씬 낫다.', lose: '유행이 1년 만에 끝났다. 인테리어 비용만 날리고 폐업했다.', declineLegit: '그 브랜드가 오래 살아남았다. 줄 서는 가게를 볼 때마다 생각난다.', declineScam: '반년 만에 거리의 그 가게들이 하나둘 문을 닫았다.' },
  },
  {
    id: 'pitch_piece', title: '🧩 조각투자 앱', age: [22, 70], pLegit: 0.7, w: 0.01,
    pitch: (f) => `${f}이(가) 앱을 보여 준다. "빌딩·음악 저작권을 1만 원 단위로 쪼개서 사는 거야. 월세·저작권료가 배당으로 나와."`,
    clue: ['앱 운영사가 금융당국 인가를 받지 않았다. 출금이 자꾸 지연된다는 후기가 보인다.', '금융위 혁신금융서비스로 지정된 곳이고, 신탁사가 자산을 따로 보관한다.'],
    amounts: [200, 1000], win: 1.12, loss: 0.3,
    lines: { win: '소소하게 배당이 들어온다. 재미있다.', lose: '운영사가 문을 닫았다. 돌려받은 건 일부뿐.', declineLegit: '친구는 소소한 배당을 받는다.', declineScam: '그 앱이 서비스를 종료했다는 소식.' },
  },
];

function pitchDef(t: PitchTpl): LifeDef {
  const invest = (x: Ctx, amt: number) => {
    const legit = !!x.ev.data.legit;
    if (t.kind === 'name') {
      addFlag(x.p, 'lent_name');
      if (legit) return (x.p.cash += W(x.s, 600)), t.lines.win;
      pay(x.s, x.p, W(x.s, 3000));
      x.p.credit = clamp((x.p.credit ?? 700) - 120, 300, 950);
      hap(x.p, -20);
      x.s.fame = Math.max(0, x.s.fame - 3);
      return t.lines.lose + ` (${formatMoney(W(x.s, 3000))} 손해, 신용점수 급락)`;
    }
    pay(x.s, x.p, amt);
    if (legit) {
      const back = Math.round(amt * t.win);
      x.p.cash += back;
      hap(x.p, 6);
      return `${t.lines.win} (${formatMoney(amt)} → ${formatMoney(back)})`;
    }
    const back = Math.round(amt * t.loss);
    x.p.cash += back;
    hap(x.p, -12);
    mark(x.p, 'scar', 1);
    return `${t.lines.lose} (${formatMoney(amt)} 중 ${formatMoney(back)}만 건졌다)`;
  };
  const decline = (x: Ctx) => {
    const legit = !!x.ev.data.legit;
    if (legit && t.kind !== 'loan') hap(x.p, -3);
    return legit ? t.lines.declineLegit : t.lines.declineScam;
  };
  return {
    id: t.id,
    weight: (s, p) => {
      const a = age(s, p);
      if (p.id !== s.headId || a < t.age[0] || a > t.age[1] || p.cash < 0) return 0;
      if (t.cond && !t.cond(s, p)) return 0;
      return t.w ?? 0.012;
    },
    title: () => t.title,
    portraits: () => [],
    text: (c) => {
      c.ev.data ??= { legit: chance(c.s, t.pLegit), friend: pick(c.s, SURNAMES) + pick(c.s, chance(c.s, 0.5) ? MALE_NAMES : FEMALE_NAMES), probed: false };
      const d = c.ev.data;
      return t.pitch(d.friend, c) + (d.probed ? `\n\n🔍 ${d.clue}` : '\n\n솔깃하다. 믿어도 될까?');
    },
    choices: (c) => {
      const d = c.ev.data;
      const [small, big] = t.amounts.map((v) => W(c.s, v));
      const out: Choice[] = [];
      if (t.kind === 'name') out.push({ label: '명의를 빌려준다', run: (x) => invest(x, 0) });
      else {
        out.push({ label: `${t.kind === 'loan' ? '빌려준다' : '크게 들어간다'} (${formatMoney(big)})`, disabled: buyPower(c.s) < big, run: (x) => invest(x, big) });
        out.push({ label: `${t.kind === 'loan' ? '일부만 빌려준다' : '조금만 넣어 본다'} (${formatMoney(small)})`, disabled: buyPower(c.s) < small, run: (x) => invest(x, small) });
      }
      if (!d.probed)
        out.push({
          label: '꼬치꼬치 캐물어 본다 (서류·등록 확인)',
          run: (x) => {
            // 똑똑하고 신중할수록 진짜 단서를 찾는다. 못 찾으면 그럴듯한 말만 듣는다
            const found = check(x.s, x.p.actual.int * 0.7 + x.p.actual.mor * 0.3, 45, 10);
            x.ev.data.probed = true;
            x.ev.data.found = found;
            x.ev.data.clue = found ? (x.ev.data.legit ? t.clue[1] : t.clue[0]) : pick(x.s, ['물어봐도 "나만 믿어"라는 말뿐이다. 판단이 안 선다.', '서류를 보긴 했는데 무슨 말인지 잘 모르겠다.', '친구가 "의심하는 거야?"라며 서운해한다. 더 묻기 어렵다.']);
            return { text: '', keep: true };
          },
        });
      if (d.probed && d.found && !d.legit)
        out.push({
          label: '🚨 신고한다',
          run: (x) => {
            x.s.fame += 1;
            mark(x.p, 'honest', 1);
            return `경찰과 금감원에 신고했다. 몇 달 뒤 일당이 검거됐다. ${x.ev.data.friend}도 피해자였다며 고맙다고 했다.`;
          },
        });
      out.push({ label: '정중히 거절한다', run: decline });
      return out;
    },
  };
}

export const DECEPTION_EVENTS: LifeDef[] = [...CALLS.map(callDef), ...PITCHES.map(pitchDef)];

