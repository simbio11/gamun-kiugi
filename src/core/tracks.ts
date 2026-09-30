// 길(트랙)별 행동: 어떤 전공을 다니는지, 무슨 시험을 준비하는지, 무슨 일을 하는지에 따라
// 할 수 있는 일이 다르고, 확률·보상·부작용도 다르다.
//  u:전공 그룹 (대학생) · x:시험 그룹 (수험생·취준생) · w:직업 그룹 (일하는 사람)
import type { GameState, Person, StatKey } from './types';
import type { ActionDef } from './actions';
import { JOBS } from './data';
import { chance, int } from './rng';
import { age, alive, clamp, head, mark, markOf, spouseOf } from './people';
import { fmt, getFatigue, grow, jitter, rollTier, say, stat, TIER_MARK, type Delta, type Pool, type Tier } from './practice';
import { jobTitle } from './economy';

// ───────────────────────── 트랙 판정 ─────────────────────────

const MAJOR_GROUP: Record<string, string> = {
  med: 'med', dent: 'med', vet: 'med', pharm: 'med', kmd: 'kmd',
  nurse: 'health', pt: 'health', radio: 'health', clinical: 'health', emt: 'health',
  law: 'law', admin: 'admin', welfare: 'admin',
  edu: 'edu', edu_elem: 'edu', kinder: 'edu',
  cs: 'eng', ee: 'eng', mech: 'eng', auto: 'eng', bio: 'eng', arch: 'eng', itc: 'eng', air: 'eng', agri: 'eng',
  biz: 'biz', econ: 'biz', lang: 'hum', media: 'hum',
  art: 'art', design: 'art', music: 'perf', acting: 'perf',
  sport: 'sport', police: 'police', army: 'army', marine: 'sea', flight: 'sea', cook: 'craft', beauty: 'craft', rail: 'sea', heritage: 'hum', film: 'perf', anim: 'art', fashion: 'art', game: 'eng', hotel: 'craft',
};
const EXAM_GROUP: Record<string, string> = {
  civil: 'civil', civil5: 'civil', tax_civil: 'civil', corrections: 'civil', postal: 'civil', diplomat: 'civil',
  police: 'uniform', coast_guard: 'uniform', firefighter: 'uniform',
  bar: 'law', judge: 'law', prosecutor: 'law',
  accountant: 'license', tax_accountant: 'license', patent: 'license', scrivener: 'license', appraiser: 'license', labor: 'license', customs: 'license', realtor: 'license',
  teacher: 'teacher', professor: 'academia',
  corp: 'job', public_corp: 'job', banker: 'job', analyst: 'job', developer: 'job', attendant: 'job', pilot: 'job', electric: 'job',
  journalist: 'press', pd: 'press', announcer: 'press',
  nurse: 'medlic', pharmacist: 'medlic', dentist: 'medlic', kmd: 'medlic', vet: 'medlic', pt: 'medlic', radiographer: 'medlic', clinical: 'medlic', emt: 'medlic',
};
const WORK_GROUP: Record<string, string> = {
  corp: 'office', office: 'office', marketer: 'office', hr: 'office', secretary: 'office', trader: 'office', public_corp: 'office',
  banker: 'finance', analyst: 'finance', insurance: 'sales', sales: 'sales',
  civil: 'public', tax_officer: 'public', mail_carrier: 'public', diplomat: 'public', social_worker: 'public',
  police: 'uniform', coast_guard: 'uniform', firefighter: 'uniform', prison_guard: 'uniform', officer: 'uniform',
  lawyer: 'legal', judge: 'legal', prosecutor: 'legal', accountant: 'legal', tax_accountant: 'legal', patent_attorney: 'legal', scrivener: 'legal', appraiser: 'legal', labor_attorney: 'legal', customs_broker: 'legal',
  doctor: 'med', dentist: 'med', kmd: 'med', vet: 'med', pharmacist: 'med',
  nurse: 'care', pt: 'care', radiographer: 'care', clinical: 'care', emt: 'care', nurse_aide: 'care', caregiver: 'care',
  teacher: 'edu', professor: 'edu', kinder_teacher: 'edu', tutor: 'edu', librarian: 'edu',
  chef: 'service', barista: 'service', hairdresser: 'service', nail_artist: 'service', hotelier: 'service', flight_attendant: 'service', tour_guide: 'service', wedding_planner: 'service', pet_groomer: 'service',
  pilot: 'transport', courier: 'transport', delivery_rider: 'transport', taxi: 'transport', bus_driver: 'transport', trucker: 'transport', train_driver: 'transport', navigator: 'transport',
  athlete: 'sport', trainer: 'sport', coach: 'sport', gamer: 'sport',
  founder: 'owner', shopkeeper: 'owner', cafe_owner: 'owner', cvs_owner: 'owner', online_shop: 'owner', restaurant: 'owner', realtor: 'owner', landlord: 'owner',
  big_factory: 'trade',
  farmer: 'farm', smart_farmer: 'farm', fisher: 'farm', rancher: 'farm',
  journalist: 'press', pd: 'press', announcer: 'press', designer: 'press', voice_actor: 'press',
  youtuber: 'creator', hj_av: 'creator', entertainer: 'creator', actor: 'creator', model: 'creator', writer: 'creator', novelist: 'creator', musician: 'creator', painter: 'creator', photographer: 'creator',
  fashion_designer: 'press', interior_designer: 'press', curator: 'press', sme_worker: 'office', startup_emp: 'tech', consultant: 'finance', fund_manager: 'finance', actuary: 'finance', logistics: 'office',
  nco: 'uniform', court_officer: 'public', forest_ranger: 'public', aide: 'public', dental_hygienist: 'care', psychologist: 'care', nutritionist: 'care', optician: 'care', speech_therapist: 'care', pharma_sales: 'sales',
  ai_engineer: 'tech', ux_designer: 'tech', cloud_eng: 'tech', battery_eng: 'tech', civil_eng: 'tech', bio_researcher: 'tech', daycare_teacher: 'edu', sports_instructor: 'sport',
  sommelier: 'service', bartender: 'service', makeup_artist: 'service', baker: 'service', funeral_director: 'service', security_guard: 'service', heavy_equipment: 'trade', tile_worker: 'trade', ship_captain: 'transport', air_controller: 'transport',
  film_director: 'creator', film_actor: 'creator', singer: 'creator', dancer: 'creator', comedian: 'creator', illustrator: 'creator', streamer: 'creator', translator: 'creator', star_lecturer: 'edu',
  sme_ceo: 'owner', developer_re: 'owner', franchise_ceo: 'owner', florist: 'owner', beekeeper: 'farm',
  clergy: 'clergy', politician: 'politics', minister: 'politics', president: 'politics', mayor: 'politics',
};

export const TRACK_NAMES: Record<string, string> = {
  'u:med': '의약계열', 'u:kmd': '한의대', 'u:health': '보건계열', 'u:law': '법학', 'u:admin': '행정·복지', 'u:edu': '교육계열', 'u:eng': '공학·자연',
  'u:biz': '경영·경제', 'u:hum': '인문·미디어', 'u:art': '미술·디자인', 'u:perf': '음악·연기', 'u:sport': '체육', 'u:police': '경찰대', 'u:army': '사관학교', 'u:sea': '항해·항공', 'u:craft': '조리·뷰티', 'u:gen': '대학생',
  'x:suneung': 'N수생', 'x:civil': '공시생', 'x:uniform': '경찰·소방 준비생', 'x:law': '변시·임용 준비', 'x:license': '전문자격 수험생', 'x:teacher': '임용고시생', 'x:academia': '교수 임용 준비',
  'x:job': '취준생', 'x:press': '언론고시생', 'x:medlic': '국가고시 준비', 'x:idle': '백수',
  'w:office': '회사원', 'w:finance': '금융권', 'w:sales': '영업', 'w:public': '공무원', 'w:uniform': '제복 공무원', 'w:legal': '법조·전문직', 'w:med': '의료인', 'w:care': '간호·보건',
  'w:edu': '교육자', 'w:service': '서비스업', 'w:trade': '기술·생산', 'w:transport': '운송', 'w:sport': '스포츠', 'w:owner': '사장님', 'w:farm': '농어업', 'w:press': '언론·방송', 'w:creator': '창작자', 'w:tech': '개발·연구', 'w:politics': '정치인', 'w:clergy': '성직자',
};

export const examOf = (p: Person) => p.flags.find((f) => f.startsWith('prep:'))?.slice(5);

/** 겸직: 본업 말고 창작 활동 (작가·화가·음악가·유튜버·사진가) */
export const SIDE_JOBS = ['writer', 'painter', 'musician', 'youtuber', 'photographer'] as const;
export const sideJobOf = (p: Person) => p.flags.find((f) => f.startsWith('side:'))?.slice(5);
export const sideTrackOf = (p: Person) => {
  const j = sideJobOf(p);
  return j ? 'w:' + (WORK_GROUP[j] ?? 'creator') : undefined;
};

export function trackOf(s: GameState, p: Person): string | undefined {
  const a = age(s, p);
  if (a < 19) return undefined;
  if (p.flags.some((f) => f.startsWith('serving:'))) return 'serving';
  if (p.flags.includes('student')) {
    const m = p.flags.find((f) => f.startsWith('major:'))?.slice(6);
    return 'u:' + (MAJOR_GROUP[m ?? ''] ?? 'gen');
  }
  if (p.flags.includes('retaking')) return 'x:suneung';
  const ex = examOf(p);
  if (ex) return 'x:' + (EXAM_GROUP[ex] ?? 'job');
  if (p.job === 'none' || p.job === 'parttime') return a < 40 ? 'x:job' : 'x:idle';
  if (p.job === 'pension') return undefined;
  const j = JOBS[p.job];
  return 'w:' + (WORK_GROUP[p.job] ?? (j?.cat === 'tech' ? 'tech' : j?.cat === 'trade' ? 'trade' : 'office'));
}

// ───────────────────────── 행동 만들기 ─────────────────────────

type T4 = [number, number, number, number]; // 대박·보람·제자리·역효과
const IDX: Record<Tier, number> = { great: 0, good: 1, meh: 2, bad: 3 };

interface Spec {
  id: string;
  tracks: string[];
  icon: string;
  name: string;
  desc: string;
  ap?: number;
  cost?: number;
  cat?: ActionDef['cat'];
  roll: { stat?: StatKey; talent?: string; bonus?: (p: Person) => number };
  /** 능력치 성장 [능력치, 배율] */
  grow?: [StatKey, number][];
  /** 좋게 끝나면 남는 흔적 */
  marks?: Record<string, number>;
  /** 학점(대학생) */
  gpa?: boolean;
  /** 시험 준비도 (합격률) */
  prep?: boolean;
  /** 수능 공부 */
  study?: T4;
  cash?: T4;
  hap?: T4;
  hp?: T4;
  bond?: T4;
  /** 대박이면 승진 확률 */
  promo?: number;
  fame?: T4;
  lines: Pool;
  extra?: (s: GameState, p: Person, t: Tier) => string;
  blocked?: (s: GameState) => string | undefined;
  /** 직급: 이 이상(고참·임원)이거나 이 이하(신참)일 때만 보인다 */
  minLevel?: number;
  maxLevel?: number;
}

const hd = (s: GameState) => head(s);
/** 정치인 지지율 변화 */
function polBump(p: Person, d: number): string {
  const pl = (p.pol ??= { approval: 45, fund: 0, slush: 0, heat: 0 });
  pl.approval = Math.max(5, Math.min(90, pl.approval + d));
  return d ? ` · 지지율 ${d > 0 ? '+' : ''}${d}% → ${pl.approval}%` : '';
}

function build(sp: Spec): ActionDef {
  return {
    id: sp.id,
    cat: sp.cat ?? '진로·자기계발',
    icon: sp.icon,
    name: sp.name,
    desc: sp.desc,
    ap: sp.ap ?? 1,
    cost: sp.cost,
    stages: ['univ', 'prep', 'adult', 'senior'],
    tracks: sp.tracks,
    blocked: sp.blocked,
    show: sp.minLevel !== undefined || sp.maxLevel !== undefined ? (s) => hd(s).jobLevel >= (sp.minLevel ?? 0) && hd(s).jobLevel <= (sp.maxLevel ?? 99) : undefined,
    run: (s) => {
      const p = hd(s);
      const t = rollTier(s, p, { stat: sp.roll.stat, talent: sp.roll.talent, bonus: sp.roll.bonus?.(p) ?? 0 });
      const i = IDX[t];
      const f = getFatigue();
      const out: Delta[] = [];
      for (const [k, sc] of sp.grow ?? []) {
        const d = t === 'bad' ? 0 : grow(s, p, k, t, sc);
        out.push(stat(k, d));
      }
      if (sp.marks && (t === 'great' || t === 'good')) for (const [k, n] of Object.entries(sp.marks)) mark(p, k, n * (t === 'great' ? 2 : 1));
      if (sp.gpa) {
        mark(p, 'gpa', [2, 1, 0, -1][i]);
        out.push(`학점 ${(clamp(3.0 + markOf(p, 'gpa') * 0.15, 1.5, 4.5)).toFixed(2)}`);
      }
      if (sp.prep) {
        const g = Math.round([3, 2, 1, -1][i] * (i < 3 ? f : 1));
        mark(p, 'prep', g);
        out.push(`시험 준비 ${Math.max(0, markOf(p, 'prep'))}`);
      }
      if (sp.study) {
        const g = sp.study[i] * (sp.study[i] > 0 ? f : 1);
        p.study = clamp((p.study ?? 40) + g, 0, 100);
        out.push(['성적', g]);
      }
      if (sp.cash) {
        const c = Math.round(jitter(s, Math.abs(sp.cash[i]), 0.3) * Math.sign(sp.cash[i]) * (sp.cash[i] > 0 ? f : 1));
        p.cash += c;
        out.push(['돈(만)', c]);
      }
      if (sp.hap) {
        const h = Math.round(jitter(s, Math.abs(sp.hap[i]), 0.3) * Math.sign(sp.hap[i]));
        p.happiness = clamp(p.happiness + h, 0, 100);
        out.push(['행복', h]);
      }
      if (sp.hp) {
        const h = sp.hp[i];
        p.actual.hp = clamp(p.actual.hp + h, 0, 100);
        out.push(stat('hp', h));
      }
      if (sp.bond) {
        const q = spouseOf(s, p);
        if (q && alive(q)) {
          p.bond = q.bond = clamp((p.bond ?? 60) + sp.bond[i], 0, 100);
          out.push(['금슬', sp.bond[i]]);
        }
      }
      if (sp.fame) {
        s.fame = Math.max(0, s.fame + sp.fame[i]);
        out.push(['명성', sp.fame[i]]);
      }
      let tail = '';
      if (sp.promo && t === 'great') {
        const j = JOBS[p.job];
        if (j && p.jobLevel < j.maxLevel && chance(s, sp.promo)) {
          p.jobLevel++;
          tail += `\n→ ${jobTitle(p)}(으)로 승진!`;
        }
      }
      if (sp.extra) tail += sp.extra(s, p, t);
      return TIER_MARK[t] + say(s, p, sp.lines, t) + fmt(out) + tail;
    },
  };
}

const L = (great: string[], good: string[], meh: string[], bad: string[]): Pool => ({ great, good, meh, bad });

// ───────────────────────── 대학생 (전공별) ─────────────────────────

const U: Spec[] = [
  { id: 'u_kmd_herb', tracks: ['u:kmd'], icon: '🌿', name: '본초학·방제학 암기', desc: '약재 수백 가지 · 학점↑ 국시 대비', roll: { stat: 'int' }, gpa: true, grow: [['int', 0.6]], hap: [2, 0, -3, -5],
    lines: L(['약재 300개를 향만 맡고 맞혔다. 동기들이 경악했다.'], ['감초·당귀·황기… 입에서 약재 이름이 줄줄 나온다.'], ['외워도 다음 날이면 절반은 잊는다.'], ['방제 시험에서 처방을 통째로 헷갈렸다.']) },
  { id: 'u_health_practice', tracks: ['u:health'], icon: '🏥', name: '병원 임상실습', desc: '현장 경험 · 국시·취업에 유리 · 체력 소모', roll: { stat: 'mor' }, gpa: true, marks: { intern: 1 }, hp: [0, -1, -1, -3], hap: [6, 2, -2, -8],
    lines: L(['실습 병동 수간호사가 "졸업하면 우리 병원 와"라고 했다.'], ['바이탈 재는 손이 이제 떨리지 않는다.'], ['하루 종일 서 있기만 했다.'], ['실습 중 실수로 크게 혼났다. 화장실에서 울었다.']) },
  { id: 'u_law_moot', tracks: ['u:law', 'u:admin'], icon: '⚖️', name: '판례 스터디·모의재판', desc: '법리 실력↑ · 로스쿨·고시 대비', roll: { stat: 'int' }, gpa: true, grow: [['int', 0.7], ['cha', 0.4]], marks: { prep: 1 }, hap: [6, 0, -2, -5],
    lines: L(['모의재판 최우수 변론상! 교수님이 로스쿨 추천서를 써 주겠단다.'], ['대법원 판례 스무 개를 정리했다.'], ['조문만 읽다 하루가 갔다.'], ['반대 신문에서 말문이 막혔다.']) },
  { id: 'u_law_leet', tracks: ['u:law', 'u:admin', 'u:hum', 'u:biz'], icon: '📝', name: 'LEET·PSAT 준비', desc: '로스쿨(LEET)·5급 공채(PSAT) 적성시험 · 합격 준비↑', cost: 150, roll: { stat: 'int', talent: 'genius' }, prep: true, hap: [4, -1, -3, -6],
    lines: L(['모의고사 상위 3%! 로스쿨 원서를 써 볼 만하다.'], ['추리논증 풀이 속도가 붙었다.'], ['언어이해 지문이 눈에 안 들어온다.'], ['점수가 오히려 떨어졌다. 적성이 아닌가 싶다.']) },
  { id: 'u_edu_teach', tracks: ['u:edu'], icon: '🍎', name: '교육봉사·과외', desc: '가르치는 경험 · 임용 대비 · 용돈', roll: { stat: 'cha' }, gpa: true, grow: [['cha', 0.5], ['mor', 0.5]], cash: [500, 300, 150, 50], marks: { kind: 1 },
    lines: L(['과외 학생이 성적이 확 올라 어머님이 선물을 보내셨다.'], ['지역아동센터 아이들이 "선생님" 하며 달려온다.'], ['아이들 집중시키기가 생각보다 어렵다.'], ['학생이 문제집을 안 풀어 온다. 속이 탄다.']) },
  { id: 'u_eng_project', tracks: ['u:eng'], icon: '🔧', name: '연구실 프로젝트·캡스톤', desc: '실력·스펙↑ · 대학원·연구소 길이 열린다', roll: { stat: 'int', talent: 'genius' }, gpa: true, grow: [['int', 0.8]], marks: { intern: 1 }, hp: [0, 0, -1, -2], hap: [8, 2, -2, -6],
    lines: L(['캡스톤 디자인 대상! 기업에서 특허 이야기가 나왔다.', '학부생인데 논문 공저자에 이름이 올랐다.'], ['연구실 선배들한테 코딩과 실험을 배웠다.'], ['실험이 계속 실패한다. 데이터가 안 나온다.'], ['밤샘 코딩했는데 파일이 날아갔다. 백업은 없다.']) },
  { id: 'u_eng_contest', tracks: ['u:eng'], icon: '🤖', name: '공모전·해커톤', desc: '대박이면 상금·스카우트 · 실패해도 배운다', cost: 20, roll: { stat: 'int' }, grow: [['int', 0.6]], cash: [800, 100, 0, 0], fame: [1, 0, 0, 0], marks: { network: 1 }, hap: [12, 4, -2, -5],
    lines: L(['대상! 상금 800만 원과 입사 제안을 받았다.'], ['본선 진출. 팀원들과 전우애가 생겼다.'], ['예선 탈락. 그래도 포트폴리오 한 줄.'], ['팀원이 잠수를 탔다. 혼자 다 했는데 떨어졌다.']) },
  { id: 'u_biz_case', tracks: ['u:biz'], icon: '📊', name: '경영 공모전·학회', desc: '기업 케이스 스터디 · 대기업 취업에 유리', roll: { stat: 'int' }, grow: [['int', 0.5], ['cha', 0.5]], marks: { network: 1, intern: 1 }, hap: [10, 3, -2, -6],
    lines: L(['대기업 마케팅 공모전 대상! 서류 면제 혜택을 받았다.'], ['재무 학회에서 밤새 기업 분석을 했다.'], ['PPT만 예쁘고 내용이 없다는 평을 들었다.'], ['발표 전날 팀이 싸우고 흩어졌다.']) },
  { id: 'u_biz_invest', tracks: ['u:biz'], icon: '💹', name: '주식 투자 공부', desc: '용돈으로 실전 투자 · 대박도 쪽박도', roll: { stat: 'int', bonus: (p) => -markOf(p, 'risk') * 0.02 }, grow: [['int', 0.4]], cash: [600, 150, -50, -300], marks: { risk: 1 },
    lines: L(['산 종목이 상한가를 쳤다. 과 동기들 사이에서 워런 버핏 소리를 듣는다.'], ['재무제표 읽는 법을 배웠다. 작게나마 수익.'], ['샀다 팔았다 수수료만 나갔다.'], ['테마주에 물렸다. 반토막.']) },
  { id: 'u_hum_lang', tracks: ['u:hum'], icon: '🗣', name: '어학·통번역 연습', desc: '외국어 실력 · 외국계·언론·외교 쪽에 유리', roll: { stat: 'int' }, gpa: true, grow: [['int', 0.5], ['cha', 0.5]], marks: { cert: 1 },
    lines: L(['통역 봉사로 국제 행사에 섰다. 외교관의 꿈이 생겼다.'], ['원서 한 권을 사전 없이 읽었다.'], ['단어장만 넘기다 끝났다.'], ['발음 때문에 원어민 교수에게 지적을 받았다.']) },
  { id: 'u_hum_press', tracks: ['u:hum'], icon: '📰', name: '학보사·방송국 활동', desc: '기사·영상 제작 · 언론고시·PD에 유리', roll: { stat: 'cha' }, grow: [['cha', 0.6], ['int', 0.4]], marks: { network: 1, intern: 1 }, hap: [8, 3, -1, -5],
    lines: L(['쓴 기사가 전국 뉴스에 인용됐다!'], ['학내 방송 PD를 맡았다. 편집 실력이 늘었다.'], ['마감에 쫓겨 대충 냈다.'], ['기사 때문에 학생회와 크게 싸웠다.']) },
  { id: 'u_art_work', tracks: ['u:art'], icon: '🖌', name: '작업실에서 작업', desc: '작품이 쌓인다 · 공모전·전시 기회', cost: 50, roll: { stat: 'cha', talent: 'artist' }, grow: [['cha', 0.9]], marks: { art: 1 }, gpa: true, hp: [0, 0, -1, -2],
    lines: L(['공모전 입선! 작품이 갤러리에 걸렸다.'], ['작업실에서 밤을 새우며 연작을 완성했다.'], ['캔버스 앞에서 한참을 멍하니 있었다.'], ['교수님 크리틱에서 "이건 작품이 아니다"라는 말을 들었다.']) },
  { id: 'u_perf_stage', tracks: ['u:perf'], icon: '🎭', name: '무대·연습실', desc: '실력↑ · 오디션·공연 기회', roll: { stat: 'cha', talent: 'star' }, grow: [['cha', 1]], marks: { art: 1 }, hap: [12, 4, -2, -8], hp: [0, 0, -1, -2],
    lines: L(['졸업 공연 주인공! 기획사 명함을 받았다.'], ['하루 여덟 시간 연습. 몸이 기억하기 시작했다.'], ['합주가 계속 어긋난다.'], ['목이 쉬어 공연을 망쳤다.']) },
  { id: 'u_sport_train', tracks: ['u:sport'], icon: '🏋️', name: '전지훈련', desc: '근력·체력↑ · 프로·실업팀 스카우트', roll: { stat: 'str', talent: 'athlete' }, grow: [['str', 1], ['hp', 0.5]], marks: { sport: 1 }, hp: [0, 0, 0, -5], hap: [8, 2, -2, -8],
    lines: L(['전국체전 금메달! 실업팀에서 연락이 왔다.'], ['기록이 0.2초 줄었다.'], ['몸이 무겁다. 슬럼프인가.'], ['훈련 중 인대를 다쳤다.']) },
  { id: 'u_police_drill', tracks: ['u:police', 'u:army'], icon: '🎖', name: '생도 훈련', desc: '체력·성품↑ · 임관 성적', roll: { stat: 'str' }, grow: [['str', 0.8], ['mor', 0.6]], gpa: true, marks: { network: 1 }, hp: [1, 0, -1, -3],
    lines: L(['훈련 최우수 생도로 표창을 받았다.'], ['구보 10km를 거뜬히 뛰었다.'], ['얼차려를 받았다. 동기들과 함께라 버틸 만했다.'], ['야간 훈련 중 발목을 접질렸다.']) },
  { id: 'u_sea_train', tracks: ['u:sea'], icon: '⚓', name: '실습선·비행 훈련', desc: '면허 비행·승선 시간 · 체력 소모', roll: { stat: 'hp' }, grow: [['hp', 0.5], ['int', 0.5]], gpa: true, marks: { intern: 1 }, hp: [0, 0, -1, -3],
    lines: L(['첫 단독 비행(솔로)에 성공했다! 하늘이 내 것 같았다.'], ['실습선을 타고 태평양을 건넜다.'], ['뱃멀미에 사흘을 누워 있었다.'], ['기상 악화로 훈련이 취소됐다. 일정이 밀린다.']) },
  { id: 'u_craft_skill', tracks: ['u:craft'], icon: '🔪', name: '실습·자격증 따기', desc: '조리·미용 기능사 · 취업 바로 연결', cost: 30, roll: { stat: 'cha' }, grow: [['cha', 0.6], ['str', 0.3]], marks: { cert: 1 }, cash: [0, 0, 0, -30],
    lines: L(['기능사 실기 한 번에 합격! 호텔 주방에서 연락이 왔다.'], ['칼질 속도가 빨라졌다.'], ['실기에서 시간이 모자랐다.'], ['손을 베었다. 붕대를 감고 실습했다.']) },
];

// ───────────────────────── 수험생·취준생 (시험별) ─────────────────────────

const X: Spec[] = [
  { id: 'x_suneung_mock', tracks: ['x:suneung'], icon: '📝', name: '재종반 모의고사', desc: '실전 감각 · 성적↑ · 불안↑', cost: 50, roll: { stat: 'int' }, study: [5, 3, 1, -1], hap: [6, 0, -4, -8],
    lines: L(['전국 모의고사 백분위가 확 올랐다. 올해는 된다!'], ['오답을 전부 다시 풀었다.'], ['점수가 제자리. 불안하다.'], ['시간이 모자라 마지막 페이지를 못 풀었다.']) },
  { id: 'x_civil_nory', tracks: ['x:civil'], icon: '🏫', name: '노량진 학원·스터디', desc: '공시 합격 준비↑ · 돈·행복 소모', cost: 80, roll: { stat: 'int', bonus: (p) => markOf(p, 'prep') * 0.01 }, prep: true, hap: [4, -2, -4, -8], hp: [0, 0, -1, -2],
    lines: L(['모의고사 합격권 점수! 컵밥이 유난히 맛있다.'], ['한국사 기출 3회독을 끝냈다.'], ['행정법이 머리에 안 들어온다.'], ['옆자리 수험생이 합격했다. 나만 제자리다.']) },
  { id: 'x_uniform_fit', tracks: ['x:uniform'], icon: '🏃', name: '체력시험 훈련', desc: '악력·윗몸일으키기·왕복달리기 · 근력↑ 준비↑', roll: { stat: 'str' }, prep: true, grow: [['str', 1], ['hp', 0.5]], hp: [1, 0, 0, -3],
    lines: L(['체력시험 만점 기준을 넘었다!'], ['왕복오래달리기 기록이 늘었다.'], ['팔굽혀펴기가 제자리다.'], ['무리하다 어깨를 다쳤다. 한동안 쉬어야 한다.']) },
  { id: 'x_uniform_law', tracks: ['x:uniform'], icon: '📘', name: '형법·헌법 필기', desc: '필기 점수 · 준비↑', roll: { stat: 'int' }, prep: true, hap: [4, -1, -3, -6],
    lines: L(['형사법 모의고사 만점!'], ['헌법 판례를 정리했다.'], ['조문 번호가 뒤죽박죽이다.'], ['공부한 범위가 시험에 하나도 안 나왔다.']) },
  { id: 'x_law_cases', tracks: ['x:law'], icon: '⚖️', name: '사례형 답안 쓰기', desc: '변호사시험·임용 대비 · 손목 혹사', roll: { stat: 'int', talent: 'genius' }, prep: true, hp: [0, 0, -1, -2], hap: [5, -1, -4, -8],
    lines: L(['기록형 모의시험 1등! 교수님이 답안을 복사해 돌렸다.'], ['하루 답안 네 개. 손목에 파스를 붙였다.'], ['쟁점을 놓쳤다. 다시.'], ['"5탈"이라는 단어가 머리에서 떠나지 않는다.']) },
  { id: 'x_license_drill', tracks: ['x:license'], icon: '🧮', name: '2차 주관식 반복', desc: 'CPA·세무사·노무사 등 · 준비↑ 행복↓', cost: 100, roll: { stat: 'int', talent: 'genius' }, prep: true, hap: [5, -2, -4, -8], hp: [0, 0, -1, -2],
    lines: L(['과락 걱정이 사라졌다. 이번엔 붙는다!'], ['회계 문제 50개를 시간 안에 풀었다.'], ['세법 개정 사항이 또 바뀌었다.'], ['1차 유예가 끝나 간다. 초조하다.']) },
  { id: 'x_teacher_demo', tracks: ['x:teacher'], icon: '🧑‍🏫', name: '수업 시연·면접 연습', desc: '임용 2차 대비 · 매력·준비↑', roll: { stat: 'cha' }, prep: true, grow: [['cha', 0.6]], hap: [6, 0, -3, -6],
    lines: L(['스터디원들이 "이건 합격 수업이다"라고 했다.'], ['판서가 깔끔해졌다.'], ['시연 중 말이 꼬였다.'], ['면접 질문에 머리가 하얘졌다.']) },
  { id: 'x_academia_paper', tracks: ['x:academia'], icon: '📄', name: '논문 투고', desc: '연구 실적 · 교수 임용 준비↑', roll: { stat: 'int', talent: 'genius' }, prep: true, fame: [2, 0, 0, 0], hap: [12, 2, -3, -8],
    lines: L(['국제 저명 학술지 게재 승인! 지도교수가 샴페인을 땄다.'], ['리비전 요청이 왔다. 가능성은 있다.'], ['심사가 반년째 감감무소식.'], ['리젝. 심사평이 가혹하다.']) },
  { id: 'x_job_interview', tracks: ['x:job', 'x:press'], icon: '👔', name: '자소서·면접 준비', desc: '취업 합격률↑ · 준비할수록 지친다', roll: { stat: 'cha' }, prep: true, marks: { network: 1 }, hap: [8, 0, -4, -8],
    lines: L(['최종 면접까지 갔다! 이번엔 느낌이 좋다.'], ['자소서를 열 번 고쳤다. 문장이 단단해졌다.'], ['"1분 자기소개"가 아직도 어색하다.'], ['압박 면접에서 울 뻔했다.']) },
  { id: 'x_job_portfolio', tracks: ['x:job'], icon: '💼', name: '포트폴리오·코딩테스트', desc: 'IT·디자인·기술직 · 실력으로 증명', roll: { stat: 'int' }, prep: true, grow: [['int', 0.5]], marks: { cert: 1 },
    lines: L(['코딩테스트 만점! 서류 합격 문자가 쏟아졌다.'], ['깃허브에 프로젝트를 하나 올렸다.'], ['알고리즘 문제에서 막혔다.'], ['제출 5분 전에 오류가 났다.']) },
  { id: 'x_press_write', tracks: ['x:press'], icon: '✍️', name: '논술·작문 스터디', desc: '언론고시 · 글 실력↑', roll: { stat: 'int' }, prep: true, grow: [['int', 0.4], ['cha', 0.4]],
    lines: L(['스터디에서 "당장 칼럼 써도 되겠다"는 말을 들었다.'], ['시사 이슈 스크랩이 두꺼워졌다.'], ['첫 문장만 한 시간째.'], ['합평에서 혹평을 들었다.']) },
  { id: 'x_medlic_cram', tracks: ['x:medlic'], icon: '📚', name: '국가고시 문제은행', desc: '합격률 높은 시험 · 방심은 금물', roll: { stat: 'int' }, prep: true, hap: [4, 0, -2, -5],
    lines: L(['모의고사 합격선을 여유 있게 넘었다.'], ['기출 5년 치를 두 번 돌렸다.'], ['헷갈리는 문제가 여전히 많다.'], ['공부 안 한 파트에서 문제가 쏟아졌다.']) },
  { id: 'x_idle_gig', tracks: ['x:job', 'x:idle', 'x:civil', 'x:uniform', 'x:license', 'x:suneung'], icon: '📦', name: '단기 알바', desc: '물류센터·배달·서빙 · 생활비↑ 준비 시간↓', cat: '재산', roll: { stat: 'hp' }, cash: [700, 450, 250, 100], hp: [0, -1, -1, -3], hap: [2, 0, -2, -5],
    extra: (_s, p) => {
      mark(p, 'prep', -1);
      return '';
    },
    lines: L(['일당이 쏠쏠한 현장을 찾았다. 사장님이 계속 나와 달란다.'], ['물류센터 야간 알바. 생활비는 마련했다.'], ['몸만 고되고 남는 건 별로 없다.'], ['상자에 발등을 찍혔다.']) },
];

// ───────────────────────── 일하는 사람 (직업별) ─────────────────────────

const W: Spec[] = [
  { id: 'w_office_report', tracks: ['w:office', 'w:finance', 'w:public'], maxLevel: 3, icon: '📑', name: '보고서 공들이기', desc: '윗선 눈도장 · 승진 기회 · 야근', roll: { stat: 'int' }, promo: 0.35, grow: [['int', 0.4]], hp: [0, -1, -1, -2], hap: [6, 0, -2, -5], bond: [0, -1, -1, -2],
    lines: L(['사장님 보고에서 "이거 누가 썼어?" 칭찬을 받았다.'], ['팀장님이 보고서를 그대로 올렸다.'], ['수정만 열두 번. 결국 처음 안으로.'], ['숫자 하나 틀려 회의실이 얼어붙었다.']) },
  { id: 'w_office_politics', tracks: ['w:office', 'w:finance'], icon: '🍻', name: '사내 인맥 관리', desc: '줄 서기·회식 · 승진 기회 · 돈·건강 소모', cost: 50, roll: { stat: 'cha', bonus: (p) => markOf(p, 'network') * 0.01 }, promo: 0.3, marks: { network: 1 }, hp: [0, 0, -1, -2], hap: [5, 2, -2, -5],
    lines: L(['전무님과 골프를 쳤다. 다음 인사에서 이름이 오르내린다.'], ['타 부서 동기들과 끈끈해졌다.'], ['회식에서 분위기만 맞추다 왔다.'], ['술자리에서 줄을 잘못 섰다는 소문이 돌았다.']) },
  { id: 'w_finance_deal', tracks: ['w:finance'], icon: '💰', name: '큰 딜 따내기', desc: '실적 = 성과급 · 대박이면 승진', roll: { stat: 'int', talent: 'merchant' }, promo: 0.35, cash: [2500, 700, 0, -200], hap: [10, 3, -2, -8],
    lines: L(['대형 딜을 성사시켰다. 특별 성과급!'], ['목표 실적을 달성했다.'], ['딜이 막판에 엎어졌다.'], ['손실이 났다. 경위서를 썼다.']) },
  { id: 'w_sales_field', tracks: ['w:sales'], icon: '🤝', name: '발로 뛰는 영업', desc: '실적만큼 번다 · 체력 소모', roll: { stat: 'cha', talent: 'merchant' }, promo: 0.3, cash: [3000, 900, 100, -100], hp: [0, -1, -1, -2], hap: [10, 3, -3, -8],
    lines: L(['연간 최고 실적! 시상식 무대에 올랐다.'], ['신규 고객 다섯 곳을 뚫었다.'], ['문전박대만 당했다.'], ['고객 클레임으로 계약이 취소됐다.']) },
  { id: 'w_public_dept', tracks: ['w:public'], icon: '🏛', name: '핵심 부서 지원', desc: '기획·예산 부서 · 승진 빨라지지만 격무', roll: { stat: 'int' }, promo: 0.4, hp: [0, -1, -2, -3], hap: [6, -1, -3, -6], bond: [0, -1, -2, -3],
    lines: L(['예산 편성을 무사히 끝냈다. 국장님이 직접 이름을 불렀다.'], ['국정감사 자료를 밤새 만들었다.'], ['민원 전화에 하루가 다 갔다.'], ['감사에서 지적을 받았다.']) },
  { id: 'w_uniform_duty', tracks: ['w:uniform'], icon: '🚨', name: '위험한 현장 자원', desc: '공로·명성↑ 승진 기회 · 다칠 수 있다', roll: { stat: 'str' }, promo: 0.4, fame: [3, 1, 0, 0], hp: [0, -1, -2, -8], hap: [10, 3, -2, -10], marks: { kind: 1 },
    lines: L(['공로 표창을 받았다. 뉴스에 이름이 나왔다.'], ['무사히 임무를 마쳤다.'], ['긴 대기 끝에 철수했다.'], ['현장에서 크게 다쳤다. 병상에 누워 가족 얼굴만 떠올렸다.']) },
  { id: 'w_uniform_exam', tracks: ['w:uniform', 'w:public'], maxLevel: 3, icon: '📗', name: '승진 시험 공부', desc: '계급·직급 승진 시험 · 퇴근 후 공부', roll: { stat: 'int' }, promo: 0.6, grow: [['int', 0.4]], hap: [8, -1, -2, -5], bond: [0, -1, -1, -2],
    lines: L(['승진 시험 합격! 계급장이 바뀐다.'], ['퇴근 후 두 시간씩 꾸준히.'], ['야간 근무 때문에 공부가 끊긴다.'], ['시험 날 비상 소집이 걸렸다.']) },
  { id: 'w_legal_case', tracks: ['w:legal'], icon: '📂', name: '큰 사건 수임', desc: '성공하면 보수·명성 · 지면 평판↓', roll: { stat: 'int', talent: 'genius' }, promo: 0.35, cash: [4000, 1200, 200, -300], fame: [2, 0, 0, -1], hp: [0, -1, -1, -2], hap: [10, 3, -2, -8],
    lines: L(['세간이 주목한 사건을 이겼다. 의뢰가 밀려든다.'], ['합의로 잘 마무리했다.'], ['재판이 해를 넘긴다.'], ['패소. 의뢰인이 등을 돌렸다.']) },
  { id: 'w_legal_pro_bono', tracks: ['w:legal'], icon: '🕊', name: '공익 사건 무료 변론', desc: '성품·명성↑ · 돈은 안 된다', roll: { stat: 'mor' }, grow: [['mor', 0.8]], fame: [3, 1, 0, 0], marks: { kind: 1, honest: 1 }, hap: [10, 5, 0, -4],
    lines: L(['억울한 노동자의 산재를 인정받았다. 기사가 났다.'], ['어르신 전세 사기 사건을 도왔다.'], ['상대가 너무 강하다. 진행이 더디다.'], ['졌다. 의뢰인에게 고개를 숙였다.']) },
  { id: 'w_med_conference', tracks: ['w:med'], icon: '🎤', name: '학회 발표·논문', desc: '실력·명성↑ · 대학병원 승진에 유리', roll: { stat: 'int', talent: 'genius' }, promo: 0.3, fame: [2, 1, 0, 0], grow: [['int', 0.5]], hap: [8, 2, -2, -5],
    lines: L(['국제 학회에서 발표상을 받았다.'], ['증례 보고가 학술지에 실렸다.'], ['초록이 떨어졌다.'], ['발표 중 질문 공세에 쩔쩔맸다.']) },
  { id: 'w_med_extra', tracks: ['w:med', 'w:care'], icon: '🌙', name: '당직·야간 진료 추가', desc: '수입↑ · 건강·가정 희생', roll: { stat: 'hp' }, cash: [2000, 1200, 800, 500], hp: [-1, -2, -2, -4], hap: [0, -2, -3, -6], bond: [0, -1, -2, -3],
    lines: L(['힘들었지만 응급 환자를 여럿 살렸다.'], ['야간 당직비가 두둑하다.'], ['밤새 잠 한숨 못 잤다.'], ['피로가 쌓여 실수할 뻔했다. 오싹했다.']) },
  { id: 'w_care_cert', tracks: ['w:care'], icon: '🎓', name: '전문 자격 과정', desc: '전문간호사·전문치료사 등 · 승진·연봉↑', cost: 300, roll: { stat: 'int' }, promo: 0.5, grow: [['int', 0.5]], hap: [6, 0, -2, -4],
    lines: L(['전문 자격을 땄다. 병원에서 새 자리를 맡겼다.'], ['야간 대학원 수업을 따라가고 있다.'], ['근무와 병행하기 벅차다.'], ['시험에 떨어졌다.']) },
  { id: 'w_edu_class', tracks: ['w:edu'], icon: '📐', name: '수업 연구·담임 업무', desc: '아이들·학부모 신뢰 · 승진(부장·교감) 기회', roll: { stat: 'cha' }, promo: 0.3, grow: [['cha', 0.4], ['mor', 0.4]], marks: { kind: 1 }, hap: [10, 4, -2, -8],
    lines: L(['공개수업이 교육청 우수 사례로 뽑혔다.'], ['반 아이들이 롤링페이퍼를 써 줬다.'], ['수업 준비에 주말이 다 갔다.'], ['학부모 민원에 시달렸다.']) },
  { id: 'w_edu_side', tracks: ['w:edu'], icon: '📚', name: '교재 집필·강연', desc: '부수입·명성', roll: { stat: 'int' }, cash: [2500, 600, 100, 0], fame: [2, 0, 0, 0], hap: [8, 3, 0, -3],
    lines: L(['쓴 참고서가 베스트셀러가 됐다!'], ['외부 강연에 초대받았다.'], ['원고가 출판사에서 반려됐다.'], ['겸직 신고 문제로 한소리 들었다.']) },
  { id: 'w_service_regulars', tracks: ['w:service'], icon: '😊', name: '단골 관리·서비스 연구', desc: '매력↑ · 팁·지명·승진', roll: { stat: 'cha' }, promo: 0.3, grow: [['cha', 0.6]], cash: [800, 300, 0, 0], hap: [8, 3, -2, -8],
    lines: L(['지명 손님이 늘어 실장 자리를 제안받았다.'], ['단골이 친구들을 데려왔다.'], ['손님이 뜸한 하루.'], ['진상 손님에게 한 시간 시달렸다.']) },
  { id: 'w_trade_skill', tracks: ['w:trade'], icon: '🛠', name: '기술 자격·숙련', desc: '기능장·기사 자격 · 단가·승진↑ · 사고 위험', cost: 50, roll: { stat: 'int' }, promo: 0.45, grow: [['str', 0.4], ['int', 0.4]], hp: [0, 0, -1, -5], marks: { cert: 1 },
    lines: L(['기능장 합격! 현장에서 "명장" 소리를 듣는다.'], ['어려운 공정을 혼자 해냈다.'], ['자격시험 실기에서 떨어졌다.'], ['현장에서 부상을 당했다. 안전모가 살렸다.']) },
  { id: 'w_trade_overtime', tracks: ['w:trade', 'w:transport'], icon: '⏱', name: '특근·잔업', desc: '수당↑ · 건강·가정 희생', roll: { stat: 'hp' }, cash: [1500, 900, 500, 200], hp: [-1, -1, -2, -4], bond: [0, -1, -1, -3], hap: [0, -1, -2, -5],
    lines: L(['주말 특근비가 두둑하다. 아이들 학원비가 해결됐다.'], ['잔업 수당으로 한 달 생활비를 벌었다.'], ['몸이 천근만근이다.'], ['졸음을 참다 아찔한 순간이 있었다.']) },
  { id: 'w_transport_route', tracks: ['w:transport'], icon: '🗺', name: '좋은 노선·물량 잡기', desc: '수입↑ · 운도 따라야', roll: { stat: 'cha' }, cash: [2000, 700, 0, -300], promo: 0.25, hap: [6, 2, -2, -5],
    lines: L(['알짜 노선을 배정받았다.'], ['단골 화주가 생겼다.'], ['콜이 뜸했다.'], ['접촉 사고가 났다. 수리비가 나갔다.']) },
  { id: 'w_sport_extra', tracks: ['w:sport'], icon: '💪', name: '특훈', desc: '실력↑ · 부상 위험', roll: { stat: 'str', talent: 'athlete' }, grow: [['str', 1]], promo: 0.3, hp: [0, 0, -1, -6], hap: [8, 2, -3, -10],
    lines: L(['기록 경신! 감독이 주전 자리를 약속했다.'], ['몸이 가벼워졌다.'], ['제자리걸음이다.'], ['무리하다 햄스트링이 올라왔다.']) },
  { id: 'w_owner_marketing', tracks: ['w:owner'], icon: '📣', name: '홍보·마케팅', desc: 'SNS·배달앱·전단 · 매출↑ 가능', cost: 300, roll: { stat: 'cha', talent: 'merchant' }, cash: [5000, 1500, 0, -200], promo: 0.25, hap: [10, 3, -2, -6],
    lines: L(['인플루언서가 다녀가고 줄이 섰다!'], ['리뷰 이벤트로 단골이 늘었다.'], ['광고비만 나갔다.'], ['악성 리뷰 폭탄을 맞았다.']) },
  { id: 'w_owner_expand', tracks: ['w:owner'], icon: '🏪', name: '확장·신메뉴 개발', desc: '성공하면 사업 규모↑ · 실패하면 손해', cost: 2000, roll: { stat: 'int', talent: 'merchant' }, promo: 0.6, cash: [3000, 800, -500, -2500], hap: [12, 4, -3, -10],
    lines: L(['신메뉴가 대박! 2호점 이야기가 나온다.'], ['인테리어를 바꾸고 손님이 늘었다.'], ['반응이 미지근하다.'], ['확장 비용만 날렸다.']) },
  { id: 'w_farm_crop', tracks: ['w:farm'], icon: '🌱', name: '새 작물·스마트팜 설비', desc: '고소득 작물 도전 · 날씨가 변수', cost: 500, roll: { stat: 'int' }, cash: [4000, 1200, 0, -800], promo: 0.3, hp: [0, -1, -1, -2], hap: [10, 4, -2, -8],
    lines: L(['샤인머스캣 대풍! 경매가가 최고가를 찍었다.'], ['수확이 괜찮았다.'], ['병해충이 돌았다.'], ['태풍에 비닐하우스가 날아갔다.']) },
  { id: 'w_press_scoop', tracks: ['w:press'], icon: '📡', name: '특종·기획 취재', desc: '명성·승진 · 소송 위험', roll: { stat: 'int' }, promo: 0.35, fame: [4, 1, 0, -1], hap: [10, 3, -2, -8],
    lines: L(['단독 보도가 전국을 흔들었다. 기자상을 받았다.'], ['기획 기사가 호평을 받았다.'], ['데스크에서 기사가 킬됐다.'], ['명예훼손 소송을 당했다.']) },
  { id: 'w_creator_content', tracks: ['w:creator'], icon: '🎬', name: '신작·콘텐츠 올인', desc: '떡상하면 인기 급상승 · 번아웃 위험', roll: { stat: 'cha', talent: 'star' }, promo: 0.35, fame: [3, 1, 0, 0], cash: [2000, 300, 0, 0], hp: [0, 0, -1, -2], hap: [12, 4, -3, -10],
    lines: L(['떡상! 알고리즘의 선택을 받았다.'], ['팬들이 조금씩 늘고 있다.'], ['조회수가 바닥이다.'], ['악플 세례에 멘탈이 무너졌다.']) },
  { id: 'w_creator_collab', tracks: ['w:creator', 'w:press'], icon: '🤝', name: '협업·광고 섭외', desc: '돈이 된다 · 이미지 관리', roll: { stat: 'cha' }, cash: [3000, 1000, 200, -300], fame: [1, 0, 0, -2], hap: [6, 3, 0, -6],
    lines: L(['대형 브랜드 광고를 따냈다!'], ['동료와의 합작이 반응이 좋다.'], ['섭외가 무산됐다.'], ['뒷광고 논란에 휘말렸다.']) },
  { id: 'w_tech_side', tracks: ['w:tech'], icon: '💻', name: '사이드 프로젝트·논문', desc: '실력·이직 가치↑ · 대박이면 창업 제안', roll: { stat: 'int', talent: 'genius' }, promo: 0.3, grow: [['int', 0.6]], cash: [1500, 0, 0, 0], hap: [10, 4, -1, -5],
    lines: L(['만든 앱이 앱스토어 1위를 찍었다!'], ['오픈소스에 기여해 이름이 알려졌다.'], ['주말마다 붙잡고 있지만 진척이 없다.'], ['회사 겸업 규정 위반 경고를 받았다.']) },
  // ── 고참·임원이 되면 하는 일이 달라진다 ──
  { id: 'w_exec_strategy', tracks: ['w:office', 'w:finance', 'w:sales', 'w:tech'], minLevel: 4, icon: '♟', name: '임원 전략 회의 주재', desc: '회사의 방향을 정한다 · 성과면 사장 후보 (지능)', roll: { stat: 'int' }, promo: 0.3, fame: [2, 1, 0, -1], cash: [3000, 800, 0, 0], hap: [8, 3, -2, -6],
    lines: L(['신사업이 대박! 이사회가 주목한다.'], ['분기 목표를 무난히 맞췄다.'], ['회의만 길었다.'], ['밀어붙인 사업이 적자를 냈다. 문책성 인사 소문.']) },
  { id: 'w_exec_mentor', tracks: ['w:office', 'w:finance', 'w:public', 'w:tech', 'w:legal', 'w:med', 'w:edu'], minLevel: 3, icon: '🧑‍🏫', name: '후배 키우기', desc: '성품·인맥↑ · 내 사람이 생긴다', roll: { stat: 'mor' }, grow: [['mor', 0.4], ['cha', 0.3]], marks: { network: 1, kind: 1 }, hap: [8, 5, 1, -2],
    lines: L(['키운 후배가 사내 최연소 팀장이 됐다. "다 선배님 덕분입니다."'], ['후배들과 점심을 먹으며 고민을 들었다.'], ['잔소리로 들렸나 보다.'], ['아끼던 후배가 경쟁사로 떠났다.']) },
  { id: 'w_public_policy', tracks: ['w:public'], minLevel: 4, icon: '🏛', name: '정책 총괄', desc: '국·실장급 · 정책이 신문 1면에 (지능)', roll: { stat: 'int' }, promo: 0.25, fame: [3, 1, 0, -1], hap: [8, 3, -2, -6],
    lines: L(['총괄한 정책이 국무회의를 통과했다.'], ['국회 답변을 무사히 마쳤다.'], ['부처 간 협의가 막혔다.'], ['정책이 여론의 뭇매를 맞았다.']) },
  { id: 'w_uniform_command', tracks: ['w:uniform'], minLevel: 4, icon: '🎖', name: '현장 지휘', desc: '지휘관 · 대형 사건을 맡는다 (지능)', roll: { stat: 'int' }, promo: 0.3, fame: [4, 1, 0, -2], hap: [10, 3, -2, -8],
    lines: L(['대형 작전을 무사고로 지휘했다. 훈장 추천이 올라갔다.'], ['부하들이 믿고 따른다.'], ['상부와 현장 사이에서 애를 먹었다.'], ['지휘 책임을 지고 경위서를 썼다.']) },
  { id: 'w_med_manage', tracks: ['w:med'], minLevel: 4, icon: '🏥', name: '병원 경영', desc: '원장·과장급 · 돈과 평판 (매력)', roll: { stat: 'cha' }, cash: [5000, 2000, 0, -1500], fame: [2, 1, 0, -1], hap: [6, 2, -3, -6],
    lines: L(['새 센터를 열었다. 환자가 몰린다.'], ['적자 과를 살려 냈다.'], ['노조와 협상이 길어진다.'], ['의료 분쟁이 터졌다.']) },
  { id: 'w_legal_partner', tracks: ['w:legal'], minLevel: 3, icon: '🤝', name: '대형 고객 영업', desc: '파트너급 · 수임료가 크다 (매력)', roll: { stat: 'cha' }, cash: [6000, 2500, 500, 0], marks: { network: 1 }, hap: [8, 3, -1, -4],
    lines: L(['대기업 자문 계약을 따냈다.'], ['오랜 고객이 새 사건을 맡겼다.'], ['골프만 치고 왔다.'], ['경쟁 로펌에 고객을 뺏겼다.']) },
  { id: 'w_edu_admin', tracks: ['w:edu'], minLevel: 3, icon: '📋', name: '학교·학과 운영', desc: '교감·교장·학과장 · 학교를 바꾼다 (성품)', roll: { stat: 'mor' }, fame: [2, 1, 0, 0], hap: [8, 3, -2, -5],
    lines: L(['학교 폭력 제로 학교로 뽑혔다.'], ['교사들의 행정 업무를 줄였다.'], ['학부모 민원에 하루가 갔다.'], ['감사에서 지적을 받았다.']) },
  // ── 정치인(의원·시장·장관·대통령): 승진 대신 지지율·명성, 그리고 비리의 유혹 ──
  { id: 'w_pol_bill', tracks: ['w:politics'], icon: '📜', name: '법안·조례 발의', desc: '의정 성과 · 지지율·명성↑ (지능)', roll: { stat: 'int' }, fame: [3, 1, 0, 0], grow: [['int', 0.3]], hap: [8, 3, -1, -4],
    extra: (_s, p, t) => polBump(p, [6, 3, 0, -2][IDX[t]]),
    lines: L(['본회의 통과! "일하는 정치인" 기사가 났다.'], ['상임위에서 좋은 평가를 받았다.'], ['계류 중. 다음 회기를 기약한다.'], ['졸속 입법이라는 비판을 받았다.']) },
  { id: 'w_pol_tv', tracks: ['w:politics'], icon: '📺', name: '시사 토론 출연', desc: '말 한마디로 지지율이 출렁인다 (매력)', roll: { stat: 'cha' }, fame: [4, 2, 0, -1], grow: [['cha', 0.4]], hap: [8, 3, -1, -6],
    extra: (_s, p, t) => polBump(p, [8, 3, 0, -7][IDX[t]]),
    lines: L(['토론 완승! 클립 조회수가 폭발했다.'], ['차분한 논리로 호평을 받았다.'], ['평범했다. 기억하는 사람이 없다.'], ['말실수가 짤로 돌았다.']) },
  { id: 'w_pol_local', tracks: ['w:politics'], icon: '🚧', name: '지역 숙원 사업 예산 따오기', desc: '지역 민심↑ · 격무 (매력)', roll: { stat: 'cha' }, hp: [0, -1, -1, -2], hap: [8, 3, -2, -5],
    extra: (_s, p, t) => polBump(p, [10, 5, 1, -3][IDX[t]]),
    lines: L(['숙원이던 다리 예산을 따냈다. 현수막이 동네를 덮었다.'], ['주민 설명회가 잘 끝났다.'], ['예산 심사에서 절반이 잘렸다.'], ['다른 지역에 밀렸다. "힘없는 정치인" 소리를 들었다.']) },
  { id: 'w_pol_party', tracks: ['w:politics'], icon: '🤝', name: '당내 세력 다지기', desc: '공천·당직에 유리 · 계파 싸움 (매력)', roll: { stat: 'cha' }, fame: [2, 1, 0, 0], marks: { network: 1 }, hap: [6, 2, -2, -4],
    extra: (_s, p, t) => polBump(p, [3, 1, 0, -3][IDX[t]]),
    lines: L(['지도부 핵심으로 떠올랐다. 당직 제의가 왔다.'], ['동료 의원들과 저녁을 먹으며 결속을 다졌다.'], ['계파 모임에서 겉돌았다.'], ['줄을 잘못 섰다. 반대파의 표적이 됐다.']) },
  { id: 'w_pol_sponsor', tracks: ['w:politics'], icon: '💼', name: '기업 후원 "관리"', desc: '돈이 된다 · 비자금·수사 위험이 쌓인다 (비리)', roll: { stat: 'cha' }, cash: [3000, 1800, 900, 0], marks: { cheat: 1 },
    extra: (_s, p, t) => {
      const pl = (p.pol ??= { approval: 45, fund: 0, slush: 0, heat: 0 });
      pl.slush += [4000, 2500, 1200, 0][IDX[t]];
      pl.heat += [10, 12, 15, 30][IDX[t]];
      p.actual.mor = Math.max(0, p.actual.mor - 2);
      return ` · 비자금↑ 수사 위험 ${pl.heat}${t === 'bad' ? ' (첩보가 검찰에 들어갔다)' : ''}`;
    },
    lines: L(['조용히 큰돈이 들어왔다. 아무도 모른다… 아직은.'], ['후원 기업 행사에 얼굴을 비췄다.'], ['기업들이 몸을 사린다.'], ['돈 전달 현장이 CCTV에 찍혔다는 소문.']) },
  { id: 'w_pol_clean', tracks: ['w:politics'], icon: '🧾', name: '정치자금 투명 공개', desc: '수사 위험↓ 성품↑ · 뒷돈은 끊긴다', roll: { stat: 'mor' }, grow: [['mor', 0.6]], fame: [2, 1, 0, 0], marks: { honest: 1 },
    extra: (_s, p, t) => {
      const pl = (p.pol ??= { approval: 45, fund: 0, slush: 0, heat: 0 });
      pl.heat = Math.max(0, pl.heat - [20, 12, 6, 2][IDX[t]]);
      return polBump(p, [4, 2, 0, 0][IDX[t]]) + ` · 수사 위험 ${pl.heat}`;
    },
    lines: L(['"한 푼도 숨기지 않았다." 청렴 정치인 1위에 뽑혔다.'], ['회계 장부를 모두 공개했다.'], ['아무도 관심이 없다.'], ['공개한 장부에서 실수가 발견됐다.']) },
  // ── 성직자 ──
  { id: 'w_clergy_sermon', tracks: ['w:clergy'], icon: '🕯', name: '강론·설교 준비', desc: '성품·매력↑ · 신도가 는다', roll: { stat: 'mor' }, grow: [['mor', 0.5], ['cha', 0.3]], fame: [2, 1, 0, 0], hap: [8, 4, 0, -3], promo: 0.2,
    lines: L(['강론이 입소문을 탔다. 새 신도가 몰려왔다.'], ['신도들이 고개를 끄덕였다.'], ['졸고 있는 사람이 보였다.'], ['말이 꼬여 실언을 했다.']) },
  { id: 'w_clergy_relief', tracks: ['w:clergy'], icon: '🍚', name: '무료 급식·구호', desc: '성품·명성↑ · 몸은 고되다', roll: { stat: 'mor' }, grow: [['mor', 0.8]], fame: [3, 1, 0, 0], hp: [0, -1, -1, -2], hap: [10, 6, 2, -2], marks: { kind: 1 },
    lines: L(['쪽방촌 어르신들이 "고맙다"며 손을 잡았다. 뉴스에도 나왔다.'], ['300인분 밥을 지었다.'], ['봉사자가 모자라 힘들었다.'], ['감기 몸살로 앓아누웠다.']) },
  { id: 'w_clergy_counsel', tracks: ['w:clergy'], icon: '🙏', name: '신도 상담', desc: '매력↑ · 마음을 나눈다', roll: { stat: 'cha' }, grow: [['cha', 0.5]], hap: [6, 4, 0, -3],
    lines: L(['삶을 포기하려던 청년을 붙잡았다.'], ['부부 싸움을 중재했다.'], ['말없이 들어 주기만 했다.'], ['상담 내용이 새어 나가 곤란해졌다.']) },
];

// ───────────────────────── 트랙 보강: 얇던 길마다 한두 개씩 더 ─────────────────────────

const MORE: Spec[] = [
  // 대학생
  { id: 'u_med_anatomy', tracks: ['u:med'], icon: '🦴', name: '해부학 실습·족보 스터디', desc: '의대 본과의 벽 · 학점↑ 국시 대비 · 체력 소모', roll: { stat: 'int', talent: 'genius' }, gpa: true, grow: [['int', 0.7]], hp: [0, -1, -1, -2], hap: [3, -1, -4, -8],
    lines: L(['카데바 앞에서 한 번도 흔들리지 않았다. 실습 조장이 됐다.'], ['동기들과 족보를 나눠 외웠다. 유급은 면했다.'], ['신경 이름이 머릿속에서 엉킨다.'], ['땡시험에서 절반을 날렸다. 유급 경고장이 나왔다.']) },
  { id: 'u_med_volunteer', tracks: ['u:med', 'u:health', 'u:kmd'], icon: '🩺', name: '의료봉사 동아리', desc: '도덕성↑ 매력↑ · 방학 무료 진료 보조', cost: 30, roll: { stat: 'mor' }, grow: [['mor', 0.6], ['cha', 0.4]], marks: { kind: 1 }, hap: [8, 4, 1, -3],
    lines: L(['섬마을 할머니가 손을 꼭 잡고 "의사 선생님 되거든 또 와" 하셨다.'], ['혈압 재는 줄이 끝이 없었다.'], ['약 봉투만 하루 종일 쌌다.'], ['배멀미로 첫날을 날렸다.']) },
  { id: 'u_gen_club', tracks: ['u:gen', 'u:biz', 'u:hum'], icon: '🎪', name: '중앙동아리 운영진', desc: '인맥↑ 매력↑ · 학점은 조금 손해', roll: { stat: 'cha' }, grow: [['cha', 0.6]], marks: { network: 1 }, hap: [8, 4, 0, -4],
    lines: L(['축제 공연을 기획했다. 총장님이 SNS에 올렸다.'], ['후배들이 "선배" 하며 따른다.'], ['회의만 많고 되는 일이 없다.'], ['회비 정산이 안 맞아 운영진끼리 싸웠다.']) },
  { id: 'u_biz_case', tracks: ['u:biz'], icon: '📊', name: '경영 케이스 공모전·금융 동아리', desc: '대기업·금융권 취업 스펙', cost: 20, roll: { stat: 'int' }, grow: [['int', 0.5], ['cha', 0.3]], marks: { intern: 1, network: 1 }, cash: [500, 0, 0, 0], hap: [10, 3, -2, -5],
    lines: L(['대기업 공모전 대상! 서류 전형 면제권이 나왔다.'], ['주식 리서치 보고서를 매주 썼다.'], ['팀원이 잠수를 탔다.'], ['발표 날 PPT가 안 열렸다.']) },
  { id: 'u_sea_training', tracks: ['u:sea'], icon: '⚓', name: '승선 실습·비행 훈련', desc: '체력↑ · 항해사·파일럿 면허에 가깝게', roll: { stat: 'str' }, gpa: true, grow: [['str', 0.5], ['mor', 0.4]], hp: [1, 0, -1, -3], hap: [6, 2, -2, -6],
    lines: L(['첫 단독 조종! 교관이 엄지를 들었다.', '태평양 한가운데서 본 별이 평생 기억날 것 같다.'], ['당직을 무사히 섰다.'], ['뱃멀미가 아직도 심하다.'], ['항법 실수로 교관에게 크게 혼났다.']) },
  { id: 'u_craft_competition', tracks: ['u:craft'], icon: '🏅', name: '요리·미용 경진대회', desc: '매력↑ · 입상하면 취업·창업에 유리', cost: 50, roll: { stat: 'cha' }, grow: [['cha', 0.6]], marks: { art: 1, cert: 1 }, fame: [1, 0, 0, 0], hap: [12, 4, -2, -6],
    lines: L(['국제 요리 대회 금메달! 호텔 셰프에게서 명함을 받았다.', '헤어 대회 대상. 청담동 살롱에서 연락이 왔다.'], ['입상했다.'], ['시간 안에 못 끝냈다.'], ['재료를 떨어뜨렸다. 머리가 하얘졌다.']) },
  { id: 'u_perf_showcase', tracks: ['u:perf', 'u:art'], icon: '🎭', name: '졸업 공연·전시 준비', desc: '매력↑ · 업계 관계자 눈에 들 기회', roll: { stat: 'cha', talent: 'artist' }, grow: [['cha', 0.8]], fame: [2, 0, 0, 0], marks: { art: 2 }, hap: [12, 5, -2, -8],
    lines: L(['공연이 끝나고 기획사 캐스팅 디렉터가 찾아왔다.', '전시 작품이 첫날 팔렸다.'], ['객석이 꽉 찼다.'], ['관객 절반이 가족이었다.'], ['리허설에서 무대 장치가 무너졌다.']) },
  // 수험생
  { id: 'x_academia_paper', tracks: ['x:academia'], icon: '📄', name: '논문 투고 (SCI급)', desc: '교수 임용 실적 · 게재되면 합격 준비↑↑', roll: { stat: 'int', talent: 'genius' }, prep: true, grow: [['int', 0.6]], fame: [1, 0, 0, 0], hap: [10, 2, -4, -8],
    lines: L(['1저자 논문이 해외 저널에 게재 승인! 임용 서류에 한 줄.'], ['리비전 요청이 왔다. 희망이 보인다.'], ['리뷰어 3번이 모든 걸 부정했다.'], ['투고한 저널에서 한 줄 리젝트 메일이 왔다.']) },
  { id: 'x_press_essay', tracks: ['x:press'], icon: '🗞', name: '언론사 논술·작문 스터디', desc: '"언론고시" 필기 대비 · 합격 준비↑', roll: { stat: 'int' }, prep: true, grow: [['int', 0.4], ['cha', 0.4]], hap: [4, 0, -3, -6],
    lines: L(['스터디에서 쓴 칼럼이 실제 신문에 기고문으로 실렸다.'], ['시사 상식 모의고사 1등.'], ['첨삭이 빨간 줄로 가득하다.'], ['마감 시간을 넘겼다. 한 줄도 못 썼다.']) },
  { id: 'x_medlic_mock', tracks: ['x:medlic'], icon: '🩻', name: '국가고시 모의고사', desc: '의료인 국시 대비 · 합격 준비↑', cost: 30, roll: { stat: 'int' }, prep: true, hap: [4, 0, -3, -6],
    lines: L(['전국 모의고사 상위 5%. 합격권이다.'], ['약점 과목이 보인다.'], ['외운 게 시험장에서 생각이 안 난다.'], ['과락 과목이 두 개나 나왔다.']) },
  // 직장인
  { id: 'w_legal_case', tracks: ['w:legal'], icon: '📁', name: '큰 사건·감사 맡기', desc: '성공하면 명성·보수↑ · 야근 지옥', roll: { stat: 'int' }, grow: [['int', 0.5]], cash: [3000, 800, 0, 0], fame: [2, 1, 0, -1], hp: [-1, -1, -2, -3], hap: [10, 3, -3, -8], promo: 0.5,
    lines: L(['대법원에서 원심 파기 환송을 이끌어 냈다. 법조 신문에 이름이 났다.', '대기업 세무조사를 막아 냈다. 성공 보수가 두둑하다.'], ['의뢰인이 감사 인사로 과일 상자를 보냈다.'], ['서면만 쓰다 한 해가 갔다.'], ['패소했다. 의뢰인이 수임료를 돌려달라고 한다.']) },
  { id: 'w_med_surgery', tracks: ['w:med'], icon: '🔪', name: '어려운 수술·진료 맡기', desc: '실력·명성↑ · 의료사고 위험', roll: { stat: 'int', talent: 'genius' }, grow: [['int', 0.5], ['mor', 0.3]], fame: [2, 1, 0, -2], cash: [1000, 300, 0, -2000], hap: [12, 4, -2, -12], promo: 0.4,
    lines: L(['다른 병원이 포기한 환자를 살렸다. 방송국에서 취재를 왔다.'], ['수술이 잘 끝났다. 보호자가 90도로 인사했다.'], ['당직만 서다 한 해가 갔다.'], ['합병증이 생겼다. 환자 가족이 소송을 예고했다.']) },
  { id: 'w_med_conference', tracks: ['w:med', 'w:care'], icon: '🏛', name: '학회 발표·연수', desc: '최신 지식 · 인맥↑', cost: 150, roll: { stat: 'int' }, grow: [['int', 0.5]], marks: { network: 1 }, hap: [6, 3, 0, -3],
    lines: L(['해외 학회 구연 발표! 좌장이 극찬했다.'], ['새 시술법을 배워 왔다.'], ['시차 적응에 실패해 졸았다.'], ['발표 슬라이드가 한글이 다 깨졌다.']) },
  { id: 'w_trade_master', tracks: ['w:trade'], icon: '🛠', name: '기능장·기술사 도전', desc: '현장 최고 자격 · 합격하면 직급↑', cost: 50, roll: { stat: 'int' }, grow: [['int', 0.4], ['str', 0.3]], marks: { cert: 2 }, hap: [10, 3, -2, -5], promo: 0.8,
    lines: L(['기능장 합격! 현장 반장 자리가 약속됐다.'], ['필기는 붙었다. 실기는 내년.'], ['야간 공부가 너무 힘들다.'], ['실기 시험에서 손을 다쳤다.']) },
  { id: 'w_trade_overtime', tracks: ['w:trade', 'w:transport'], icon: '🌙', name: '특근·야간 근무 자원', desc: '돈↑ 건강↓ (주말·야간 수당)', roll: { stat: 'str' }, cash: [900, 600, 400, 200], hp: [0, -1, -2, -3], hap: [2, -1, -3, -6],
    lines: L(['특근 수당으로 아이 학원비를 한 번에 냈다.'], ['야간 수당이 쏠쏠하다.'], ['피곤이 쌓인다.'], ['졸음운전으로 아찔한 순간이 있었다.']) },
  { id: 'w_service_signature', tracks: ['w:service'], icon: '⭐', name: '시그니처 메뉴·스타일 개발', desc: '매력↑ · 단골·팔로워가 는다', cost: 50, roll: { stat: 'cha', talent: 'artist' }, grow: [['cha', 0.6]], cash: [800, 300, 0, -50], fame: [1, 0, 0, 0], hap: [10, 4, -1, -4],
    lines: L(['만든 메뉴가 SNS에서 대박. 웨이팅이 두 시간이다.', '손님 머리 사진이 인스타 인기 게시물에 올랐다.'], ['단골이 늘었다.'], ['반응이 미지근하다.'], ['손님이 컴플레인을 걸었다. 별점 1개 리뷰.']) },
  { id: 'w_service_indie', tracks: ['w:service'], icon: '🏪', name: '내 가게 차릴 준비 (상권 분석)', desc: '독립 창업의 첫걸음 · 지능↑', roll: { stat: 'int', talent: 'merchant' }, grow: [['int', 0.4], ['cha', 0.3]], marks: { network: 1 }, hap: [6, 2, -1, -3],
    lines: L(['목 좋은 자리를 권리금 없이 찾았다! 사장님이 은퇴하신단다.'], ['유동 인구를 세러 사흘을 서 있었다.'], ['임대료가 너무 비싸다.'], ['상가 중개사에게 속을 뻔했다.']) },
  { id: 'w_tech_sideproject', tracks: ['w:tech'], icon: '🧪', name: '사이드 프로젝트·오픈소스', desc: '실력·명성↑ · 대박이면 수익', roll: { stat: 'int', talent: 'genius' }, grow: [['int', 0.6]], cash: [2000, 200, 0, 0], fame: [2, 0, 0, 0], hap: [10, 4, -1, -3],
    lines: L(['만든 앱이 앱스토어 1위를 찍었다!', '오픈소스 프로젝트에 별이 1만 개. 해외에서 이직 제안이 왔다.'], ['GitHub 잔디가 빼곡하다.'], ['주말이 사라졌다.'], ['회사 겸업 금지 조항에 걸려 경고를 받았다.']) },
  { id: 'w_office_mba', tracks: ['w:office', 'w:finance'], icon: '🎓', name: '야간 MBA·사내 교육', desc: '지능↑ · 승진 발판', cost: 800, roll: { stat: 'int' }, grow: [['int', 0.6], ['cha', 0.3]], marks: { network: 1 }, hap: [4, 0, -3, -6], promo: 0.6,
    lines: L(['MBA 동기 중에 임원이 있었다. 팀장 자리 제안이 왔다.'], ['퇴근 후 강의실이 오히려 활력이 된다.'], ['졸면서 들었다.'], ['과제에 치여 가족과 다퉜다.']) },
  { id: 'w_edu_homeroom', tracks: ['w:edu'], icon: '🏫', name: '담임·입시 지도 맡기', desc: '보람·명성↑ · 업무 폭탄', roll: { stat: 'cha' }, grow: [['cha', 0.4], ['mor', 0.4]], fame: [1, 0, 0, -1], hap: [12, 4, -3, -10],
    lines: L(['반 아이들이 스승의 날 깜짝 파티를 열어 줬다. 졸업생이 편지를 보냈다.'], ['진학 상담한 아이가 원하는 대학에 붙었다.'], ['민원 전화가 끊이지 않는다.'], ['학부모가 교육청에 민원을 넣었다. 억울하다.']) },
  { id: 'w_care_night', tracks: ['w:care'], icon: '🌃', name: '3교대 나이트 근무', desc: '수당↑ 건강↓', roll: { stat: 'str' }, cash: [600, 400, 300, 200], hp: [0, -1, -2, -3], hap: [4, 0, -3, -8],
    lines: L(['위급한 환자를 먼저 알아채 살렸다. 교수님이 이름을 기억했다.'], ['조용한 밤이었다.'], ['밤낮이 바뀌어 머리가 멍하다.'], ['태움을 당했다. 화장실에서 한참 울었다.']) },
  { id: 'w_sport_comeback', tracks: ['w:sport'], icon: '🔥', name: '재활·컴백 훈련', desc: '체력↑ · 부상 이겨 내기', cost: 200, roll: { stat: 'str' }, grow: [['str', 0.7]], hp: [2, 1, 0, -2], fame: [1, 0, 0, 0], hap: [10, 4, -2, -8],
    lines: L(['부상 복귀전에서 결승골! 관중이 기립 박수를 쳤다.'], ['예전 폼을 되찾아 간다.'], ['아직 통증이 남아 있다.'], ['재활 중 다시 다쳤다.']) },
  { id: 'w_creator_collab', tracks: ['w:creator', 'w:press'], icon: '🤝', name: '대형 콜라보·특집 기획', desc: '명성↑ · 대박이면 수익', roll: { stat: 'cha', talent: 'artist' }, grow: [['cha', 0.5]], fame: [3, 1, 0, -1], cash: [2000, 500, 0, 0], hap: [12, 4, -1, -6],
    lines: L(['콜라보 영상이 1,000만 뷰! 광고 문의가 쏟아진다.', '특집 기사가 이달의 기자상을 받았다.'], ['반응이 좋았다.'], ['조회수가 평소만큼.'], ['발언 하나가 논란이 됐다. 사과문을 올렸다.']) },
  { id: 'w_farm_smart', tracks: ['w:farm'], icon: '📡', name: '스마트팜 설비·6차 산업', desc: '생산성↑ · 체험농장·가공품으로 수익 다변화', cost: 500, roll: { stat: 'int' }, grow: [['int', 0.4]], cash: [2500, 1000, 200, -200], hap: [8, 4, 0, -5],
    lines: L(['딸기 체험농장 예약이 주말마다 매진이다.'], ['자동 관수 덕에 일이 줄었다.'], ['설비 적응 중이다.'], ['센서 오작동으로 한 동이 다 말랐다.']) },
];

export const TRACK_ACTIONS: ActionDef[] = [...U, ...X, ...W, ...MORE].map(build);

/** 가주 입장: 준비 중인 시험의 준비도(흔적 'prep')가 합격 점수에 더해진다 */
export const prepBonus = (p: Person) => Math.min(10, Math.max(0, markOf(p, 'prep')) * 1.2);

// 쓰이지 않는 import 경고 방지용 (int는 향후 확장)
void int;
