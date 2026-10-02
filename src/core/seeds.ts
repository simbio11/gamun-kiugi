// 떡밥 회수: 작은 선택들이 남긴 흔적(marks)이 쌓이면, 몇 년 ~ 수십 년 뒤 사건으로 돌아온다.
//
// 흔적 종류
//   warmth   어린 시절 부모에게 받은 따뜻함      → 커서 효도·용돈
//   hurt     어린 시절 서운함·상처              → 커서 원망·절연
//   study    공부 습관                         → 공부 효율↑, 수능↑, 책을 쓰자는 제안
//   sport    몸 쓰는 경험                       → 스카우트, 노화 완화
//   art      예술 경험                         → 작품·오디션 제안
//   kind     선행                              → 은인의 보답
//   honest   정직                              → 신뢰받아 발탁
//   cheat    거짓·요령                          → 과거가 들통
//   risk     한탕 기질                          → 사채 독촉 or 한탕 기회
//   health_x 건강 무시                          → 쓰러짐, 병 위험↑
//   exercise 운동                              → 사망 위험↓
//   network  인맥 관리                          → 인맥 찬스, 매력↑
//   thrift   절약                              → 종잣돈
//   spend    과소비                            → 카드 돌려막기
//   scar     연애의 상처                        → 연애 어려움, 다시 사랑할 수 있을까
//   family   가족과 보낸 시간                    → 금슬 유지, 가족 앨범
//   filial   부모님을 챙긴 마음                  → 유산 나눌 때 기여분 인정

import { chance, int, pick } from './rng';
import { JOBS } from './data';
import { addHolding, formatMoney, jobTitle } from './economy';
import { eul, eun, gate, iga, who, type Ctx } from './ev-util';
import { addFlag, age, alive, clamp, fullName, hasFlag, head, isMainline, mark, markOf, parentsOf, spouseOf } from './people';
import type { GameState, Person } from './types';
import type { LifeDef } from './life';
import { tryPromote } from './rank';

/** 이 사람의 '윗사람'을 부르는 말 */
const selfBossWord = (job: string) => (['judge', 'prosecutor'].includes(job) ? '법원장' : ['officer', 'nco'].includes(job) ? '사단장' : ['teacher', 'kinder_teacher'].includes(job) ? '교장' : JOBS[job]?.cat === 'medical' ? '병원장' : '사장');

// ───────────────────────── 회수 이벤트 ─────────────────────────

const mood = (p: Person, d: number) => (p.happiness = clamp(p.happiness + d, 0, 100));
/** 한 번만, 흔적이 기준을 넘으면 */
function seed(id: string, key: string, need: number, w: number, extra: (s: GameState, p: Person) => boolean = () => true) {
  return (s: GameState, p: Person) => (!hasFlag(p, 'seed:' + id) && markOf(p, key) >= need && extra(s, p) ? w : 0);
}
const fire = (x: Ctx, id: string) => addFlag(x.p, 'seed:' + id);
const adult = (s: GameState, p: Person) => age(s, p) >= 22;

const kindReturn: LifeDef = {
  id: 'seed_kind',
  weight: seed('kind', 'kind', 3, 0.15, adult),
  title: () => '은인',
  text: (c) => `낯선 사람이 ${eul(who(c))} 찾아왔다.\n"기억 못 하시겠죠. 오래전 제가 제일 힘들 때 도와주셨잖아요. 그 은혜 갚으러 왔습니다."`,
  choices: (c) => {
    const p = c.p;
    const out = [];
    if (['none', 'parttime'].includes(p.job))
      out.push({
        label: '일자리를 부탁한다',
        run: (x: Ctx) => {
          fire(x, 'kind');
          x.p.job = 'corp';
          x.p.jobLevel = 1;
          x.p.jobYears = 0;
          return '그가 대표로 있는 회사에 자리를 마련해 줬다. 뿌린 대로 거둔다.';
        },
      });
    if (p.cash < 0)
      out.push({ label: '빚 이야기를 꺼낸다', run: (x: Ctx) => (fire(x, 'kind'), (x.p.cash = Math.max(0, x.p.cash)), '말없이 빚을 갚아주고 갔다.') });
    out.push({ label: '마음만 받겠다', run: (x: Ctx) => (fire(x, 'kind'), (x.s.fame += 4), mood(x.p, 10), '그 이야기가 지역 신문에 실렸다. (명성 +4)') });
    out.push({ label: '선물을 받는다', run: (x: Ctx) => (fire(x, 'kind'), (x.p.cash += 3000), '"부디 받아주세요." 봉투에 3천만원이 들어 있었다.') });
    return out;
  },
};

const hurtReturn: LifeDef = {
  id: 'seed_hurt',
  weight: seed('hurt', 'hurt', 3, 0.3, (s, p) => adult(s, p) && parentsOf(s, p).some((par) => par.id === s.headId)),
  title: () => '오래된 상처',
  portraits: (c) => [c.p, head(c.s)],
  text: (c) => `술에 취한 ${iga(who(c))} 전화를 걸어왔다.\n"어릴 때 나 한 번도 제대로 안 봐줬잖아. 성적, 성적… 나는 그게 너무 서운했어."`,
  choices: () => [
    {
      label: '진심으로 사과한다',
      run: (x) => {
        fire(x, 'hurt');
        x.p.marks!.hurt = 0;
        mark(x.p, 'warmth', 2);
        x.p.affinity = clamp(x.p.affinity + 25, -100, 100);
        return '"미안하다. 아빠(엄마)가 서툴렀다." 수화기 너머로 흐느끼는 소리가 들렸다.';
      },
    },
    {
      label: '다 너 잘되라고 그런 거다',
      run: (x) => {
        fire(x, 'hurt');
        x.p.affinity = clamp(x.p.affinity - 30, -100, 100);
        addFlag(x.p, 'estranged');
        return '전화가 끊겼다. 그 뒤로 명절에도 오지 않는다.';
      },
    },
  ],
};

const warmthReturn: LifeDef = {
  id: 'seed_warmth',
  weight: seed('warmth', 'warmth', 4, 0.25, (s, p) => age(s, p) >= 28 && parentsOf(s, p).some((par) => par.id === s.headId) && age(s, head(s)) >= 55),
  title: () => '효도',
  portraits: (c) => [c.p, head(c.s)],
  text: (c) => `${iga(who(c))} 봉투를 내민다.\n"어릴 때 늘 곁에 있어 줘서 고마웠어요. 이제 제가 매달 용돈 보내 드릴게요."`,
  choices: () => [
    {
      label: '고맙게 받는다',
      run: (x) => {
        fire(x, 'warmth');
        addFlag(x.p, 'sends_allowance');
        mood(head(x.s), 15);
        return '매달 용돈이 들어온다. 액수보다 마음이 고맙다. (해마다 용돈)';
      },
    },
    { label: '너나 잘 살아라', run: (x) => (fire(x, 'warmth'), (x.p.affinity = clamp(x.p.affinity + 10, -100, 100)), '"그래도 받아요." 몰래 통장에 넣어뒀다.') },
  ],
};

const studyReturn: LifeDef = {
  id: 'seed_study',
  weight: seed('study', 'study', 5, 0.12, (s, p) => age(s, p) >= 30),
  title: () => '출간 제안',
  text: (c) => `평생 책을 끼고 산 ${who(c)}의 블로그 글을 본 출판사에서 연락이 왔다. 책을 내보자고 한다.`,
  choices: () => [
    {
      label: '책을 쓴다',
      run: (x) => {
        fire(x, 'study');
        if (chance(x.s, 0.3)) {
          x.p.cash += 5000;
          x.s.fame += 8;
          return '📚 베스트셀러! 강연 요청이 쏟아진다.';
        }
        x.s.fame += 2;
        return '초판 2천 부. 서점 구석에 꽂혔지만 뿌듯하다.';
      },
    },
    { label: '아직 부족하다', run: (x) => (fire(x, 'study'), '겸손하게 사양했다.') },
  ],
};

const sportReturn: LifeDef = {
  id: 'seed_sport',
  weight: seed('sport', 'sport', 3, 0.3, (s, p) => age(s, p) >= 14 && age(s, p) <= 22 && p.job !== 'athlete'),
  title: () => '스카우트',
  text: (c) => `${who(c)}의 경기를 지켜보던 사람이 명함을 건넨다. 프로 구단 스카우터다.\n"어릴 때부터 몸을 제대로 쓴 티가 나네요."`,
  choices: (c) => [
    {
      label: age(c.s, c.p) < 19 ? '체육고 진학을 준비한다' : '입단 테스트를 본다',
      run: (x) => {
        fire(x, 'sport');
        if (age(x.s, x.p) < 19) {
          addFlag(x.p, 'sports_team');
          addFlag(x.p, 'high_sport');
          return '운동부 특기생이 되었다. 프로의 길이 열렸다.';
        }
        x.p.job = 'athlete';
        x.p.jobLevel = 0;
        x.p.jobYears = 0;
        return '입단 테스트 합격! 늦깎이 프로 선수가 됐다.';
      },
    },
    { label: '취미로 남긴다', run: (x) => (fire(x, 'sport'), '운동은 평생 친구로 남기로 했다.') },
  ],
};

const artReturn: LifeDef = {
  id: 'seed_art',
  weight: seed('art', 'art', 3, 0.25, (s, p) => age(s, p) >= 15),
  title: () => '눈에 띈 재능',
  text: (c) => `${iga(who(c))} 취미로 올린 작품이 화제가 됐다. ${pick({ rng: c.s.year }, ['갤러리', '기획사', '웹툰 플랫폼', '레이블'])}에서 연락이 왔다.`,
  choices: () => [
    {
      label: '해보겠다',
      run: (x) => {
        fire(x, 'art');
        if (age(x.s, x.p) < 20) {
          addFlag(x.p, 'trainee');
          return '연습생 계약을 했다.';
        }
        x.p.job = pick(x.s, ['painter', 'musician', 'writer', 'entertainer']);
        x.p.jobLevel = 1;
        x.p.jobYears = 0;
        return `${JOBS[x.p.job].name}(으)로 데뷔했다! 이미 작은 팬층이 있다.`;
      },
    },
    { label: '지금 일이 좋다', run: (x) => (fire(x, 'art'), (x.s.fame += 1), '작품은 취미로만.') },
  ],
};

const riskReturn: LifeDef = {
  id: 'seed_risk',
  weight: seed('risk', 'risk', 3, 0.2, adult),
  title: (c) => (c.ev.data?.good ? '한탕의 기회' : '사채 독촉'),
  text: (c) => {
    c.ev.data ??= { good: chance(c.s, 0.35) };
    return c.ev.data.good
      ? `${who(c)}의 도박판 친구가 확실한 정보가 있다며 "이번 한 번만" 크게 걸자고 한다.`
      : `여기저기 쌓아둔 ${who(c)}의 한탕 빚이 불어났다. 험상궂은 사람들이 집 앞에 찾아왔다.`;
  },
  choices: (c) =>
    c.ev.data.good
      ? [
          {
            label: '전 재산을 건다',
            run: (x) => {
              fire(x, 'risk');
              const bet = Math.max(1000, Math.round(x.p.cash * 0.8));
              if (chance(x.s, 0.4)) {
                x.p.cash += bet * 2;
                return `대박! ${formatMoney(bet * 2)}을 땄다. 이 맛에 끊을 수가 없다.`;
              }
              x.p.cash -= bet;
              return `전부 잃었다. ${formatMoney(bet)}.`;
            },
          },
          { label: '손을 씻는다', run: (x) => (fire(x, 'risk'), (x.p.marks!.risk = 0), (x.p.actual.mor = clamp(x.p.actual.mor + 5, 0, 100)), '도박 치료 모임에 나가기 시작했다.') },
        ]
      : gate(c.s, [
          { label: '가족이 대신 갚는다 (5천만)', cost: 5000, run: (x) => (fire(x, 'risk'), (x.p.marks!.risk = 0), '가족의 신뢰를 잃었다.') },
          { label: '개인회생', run: (x) => (fire(x, 'risk'), (x.p.cash -= 5000), addFlag(x.p, 'rehab'), '법원 문을 두드렸다.') },
        ]),
};

const healthReturn: LifeDef = {
  id: 'seed_health',
  weight: seed('health', 'health_x', 3, 0.35, (s, p) => age(s, p) >= 40),
  title: () => '쓰러짐',
  text: (c) => `그동안 몸을 돌보지 않은 ${iga(who(c))} 회의 중에 쓰러졌다. 뇌졸중 전조라고 한다.`,
  choices: (c) =>
    gate(c.s, [
      {
        label: '입원해서 제대로 치료',
        cost: 1500,
        run: (x) => (fire(x, 'health'), (x.p.marks!.health_x = 0), (x.p.actual.hp = clamp(x.p.actual.hp - 5, 0, 100)), mark(x.p, 'exercise', 1), '생활을 완전히 바꾸기로 했다.'),
      },
      { label: '약 먹고 복귀', run: (x) => (fire(x, 'health'), (x.p.actual.hp = clamp(x.p.actual.hp - 15, 0, 100)), '몸이 예전 같지 않다.') },
    ]),
};

const cheatReturn: LifeDef = {
  id: 'seed_cheat',
  weight: seed('cheat', 'cheat', 3, 0.2, adult),
  title: () => '들통',
  text: (c) => `${iga(who(c))} 예전에 적당히 넘겼던 일들이 하나둘 드러나기 시작했다. ${JOBS[c.p.job].kind === 'salary' ? '회사 감사팀이 부른다.' : '주변 사람들의 눈빛이 달라졌다.'}`,
  choices: () => [
    {
      label: '모두 인정한다',
      run: (x) => {
        fire(x, 'cheat');
        x.p.marks!.cheat = 0;
        mark(x.p, 'honest', 2);
        x.p.jobLevel = Math.max(0, x.p.jobLevel - 1);
        x.s.fame = Math.max(0, x.s.fame - 3);
        return '징계를 받았지만 마음은 가볍다.';
      },
    },
    {
      label: '끝까지 부인한다',
      run: (x) => {
        fire(x, 'cheat');
        if (chance(x.s, 0.5)) {
          x.s.fame = Math.max(0, x.s.fame - 10);
          if (JOBS[x.p.job].kind === 'salary') x.p.job = 'none';
          return '증거가 나왔다. 해고당했다. (명성 -10)';
        }
        return '이번에도 넘어갔다. …이번에도.';
      },
    },
  ],
};

const honestReturn: LifeDef = {
  id: 'seed_honest',
  weight: seed('honest', 'honest', 4, 0.2, (s, p) => adult(s, p) && JOBS[p.job].kind === 'salary' && p.jobLevel < JOBS[p.job].maxLevel),
  title: () => '발탁',
  text: (c) => `${JOBS[c.p.job].cat === 'public' ? '기관장' : selfBossWord(c.p.job)}이(가) ${eul(who(c))} 따로 불렀다. "자네는 거짓말을 안 한다는 평판이 있더군. 중요한 자리를 맡기고 싶네."`,
  choices: () => [{ label: '맡겠습니다', run: (x) => {
    fire(x, 'honest');
    if (tryPromote(x.s.year, x.p, 2)) return `${jobTitle(x.p)}(으)로 발탁 승진했다!`;
    x.p.cash += Math.round(JOBS[x.p.job].perLevel * 0.5);
    return `직급은 그대로지만 핵심 보직을 맡았다. 다음 승진 심사 때 1순위다. (성과급 ${Math.round(JOBS[x.p.job].perLevel * 0.5)}만)`;
  } }],
};

const networkReturn: LifeDef = {
  id: 'seed_network',
  weight: seed('network', 'network', 4, 0.2, adult),
  title: () => '인맥 찬스',
  text: (c) => `꾸준히 사람을 챙겨온 ${who(c)}에게 오랜 지인이 사업 제안을 들고 왔다.`,
  choices: (c) => [
    {
      label: '지분 투자로 참여 (5천만)',
      disabled: c.p.cash < 5000,
      run: (x) => {
        fire(x, 'network');
        x.p.cash -= 5000;
        const v = chance(x.s, 0.6) ? int(x.s, 8000, 30000) : int(x.s, 0, 3000);
        addHolding(x.s, 'stock', x.p.id, v);
        return v > 5000 ? `사업이 잘 됐다. 지분 가치 ${formatMoney(v)}.` : '생각보다 안 풀렸다.';
      },
    },
    {
      label: '자녀 취업을 부탁한다',
      disabled: !c.p.childIds.some((id) => alive(c.s.people[id]) && age(c.s, c.s.people[id]) >= 22 && ['none', 'parttime'].includes(c.s.people[id].job)),
      run: (x) => {
        fire(x, 'network');
        const k = x.p.childIds.map((id) => x.s.people[id]).find((k) => alive(k) && age(x.s, k) >= 22 && ['none', 'parttime'].includes(k.job))!;
        k.job = 'corp';
        k.jobLevel = 0;
        k.jobYears = 0;
        return `${iga(fullName(k))} 지인 회사에 들어갔다.`;
      },
    },
    { label: '관계만 이어간다', run: (x) => (fire(x, 'network'), (x.p.actual.cha = clamp(x.p.actual.cha + 2, 0, 100)), '좋은 사람이 곁에 있다.') },
  ],
};

const thriftReturn: LifeDef = {
  id: 'seed_thrift',
  weight: seed('thrift', 'thrift', 4, 0.2, adult),
  title: () => '종잣돈',
  text: (c) => `꼬박꼬박 아껴 모은 ${who(c)}의 적금이 만기가 됐다. 생각보다 큰돈이다.`,
  choices: () => [
    { label: '집 살 때 보탠다', run: (x) => (fire(x, 'thrift'), (x.p.cash += 5000), '통장에 5천만원이 찍혔다.') },
    { label: '부모님께 효도한다', run: (x) => (fire(x, 'thrift'), (x.p.cash += 3000), mark(x.p, 'filial', 2), '부모님께 여행을 보내드렸다.') },
  ],
};

const spendReturn: LifeDef = {
  id: 'seed_spend',
  weight: seed('spend', 'spend', 4, 0.25, adult),
  title: () => '카드 돌려막기',
  text: (c) => `${who(c)}의 카드 명세서가 감당이 안 된다. 리볼빙에 현금서비스까지 돌려막고 있었다.`,
  choices: (c) =>
    gate(c.s, [
      { label: '가족에게 털어놓는다 (3천만 상환)', cost: 3000, run: (x) => (fire(x, 'spend'), (x.p.marks!.spend = 0), mark(x.p, 'thrift', 1), '가위로 카드를 잘랐다.') },
      { label: '혼자 해결한다', run: (x) => (fire(x, 'spend'), (x.p.cash -= 4000), (x.p.happiness = clamp(x.p.happiness - 10, 0, 100)), '빚이 4천만원이다.') },
    ]),
};

const scarReturn: LifeDef = {
  id: 'seed_scar',
  weight: seed('scar', 'scar', 3, 0.3, (s, p) => age(s, p) >= 28 && !p.partnerId && !(p.spouseId && alive(s.people[p.spouseId]))),
  title: () => '다시 사랑할 수 있을까',
  text: (c) => `몇 번의 이별 끝에 ${eun(who(c))} 마음의 문을 닫았다. 친구가 조심스럽게 말한다. "너 요즘 너무 혼자야."`,
  choices: () => [
    { label: '상담을 받아본다', run: (x) => (fire(x, 'scar'), (x.p.marks!.scar = 0), mood(x.p, 10), '지난 연애를 천천히 정리했다. 다시 누군가를 만날 수 있을 것 같다.') },
    { label: '혼자가 편하다', run: (x) => (fire(x, 'scar'), addFlag(x.p, 'single_life'), '혼자만의 삶을 택했다.') },
  ],
};

const familyReturn: LifeDef = {
  id: 'seed_family',
  weight: seed('family', 'family', 5, 0.25, (s, p) => p.id === s.headId),
  title: () => '가족 앨범',
  text: (c) => `아이가 만든 선물: 그동안 함께한 가족 여행 사진을 모은 앨범.\n${who(c)}의 눈시울이 붉어졌다.`,
  choices: () => [
    {
      label: '가족들을 꼭 안아준다',
      run: (x) => {
        fire(x, 'family');
        const sp = spouseOf(x.s, x.p);
        if (sp && alive(sp)) x.p.bond = sp.bond = clamp((x.p.bond ?? 60) + 12, 0, 100);
        for (const k of x.p.childIds.map((id) => x.s.people[id]).filter(alive)) mark(k, 'warmth', 1);
        mood(x.p, 15);
        return '이 순간을 위해 살아왔다.';
      },
    },
  ],
};

export const SEED_EVENTS: LifeDef[] = [kindReturn, hurtReturn, warmthReturn, studyReturn, sportReturn, artReturn, riskReturn, healthReturn, cheatReturn, honestReturn, networkReturn, thriftReturn, spendReturn, scarReturn, familyReturn];

/** 해마다 흔적이 만드는 조용한 변화 */
export function seedYear(s: GameState) {
  for (const p of Object.values(s.people)) {
    if (!alive(p)) continue;
    // 자식이 보내는 용돈
    if (hasFlag(p, 'sends_allowance') && !hasFlag(p, 'estranged')) {
      const par = parentsOf(s, p).find((x) => alive(x) && x.id === s.headId) ?? parentsOf(s, p).find(alive);
      if (par && p.cash > 0) {
        p.cash -= 600;
        par.cash += 600;
      }
    }
    // 절연한 자식은 부모와 멀어진다
    if (hasFlag(p, 'estranged')) p.affinity = Math.min(p.affinity, -20);
    // 부모님을 챙긴 마음이 쌓이면 기여분을 인정받는다
    if (markOf(p, 'filial') >= 3 && isMainline(s, p)) addFlag(p, 'cared_parent');
  }
}

