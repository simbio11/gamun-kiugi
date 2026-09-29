import {
  ACHIEVEMENTS,
  ART_TIERS,
  ASSET_ICONS,
  BUDGET_NAMES,
  EXAMS,
  JOB_IDS,
  REAL_ESTATE,
  TRADE_UNITS,
  TRAITS,
  ASSET_NAMES,
  FOCUS_NAMES,
  JOBS,
  LIFESTYLE_NAMES,
  LIVING_NAMES,
  STAT_KEYS,
  STAT_NAMES,
  TAG_NAMES,
  TALENTS,
  WILL_NAMES,
} from '../core/data';
import { advisorFee, assessedValue, assetsOf, familyWorth, formatMoney, jobTitle, personWorth } from '../core/economy';
import { estateTax, previewAssetGiftTax, previewGiftTax } from '../core/estate';
import { spendable } from '../core/events';
import { age, alive, childrenOf, fullName, head, householder, isDescendantOf, isMainline, livingMainlineMinors, parentsOf, relationLabel, siblingsOf, spouseOf } from '../core/people';
import { MISSIONS } from '../core/missions';
import { pendingAffairs } from '../core/fate';
import { writeWill } from '../core/family';
import {
  BUY_TAX,
  aptitudeTest,
  artPrice,
  buyAsset,
  canBuy,
  canRetire,
  giftAsset,
  migrate,
  setTaxAdvisor,
  currentEvent,
  designateHeir,
  familyTotal,
  gift,
  newGame,
  resolveChoice,
  retire,
  sellAsset,
  simulateYear,
} from '../core/sim';
import type { Asset, AssetKind, Focus, GameState, Lifestyle, Living, Person, Sex, WillMode } from '../core/types';
import { portraitURL } from '../render/portrait';

type Tab = 'tree' | 'policy' | 'assets' | 'log' | 'achv';
type Zoom = 'big' | 'mid' | 'small';

interface UIState {
  game: GameState | null;
  tab: Tab;
  view: 'tree' | 'list';
  zoom: Zoom;
  showDead: boolean;
  sheet?: string;
  report?: { title: string; lines: string[] };
  outcome?: { title: string; text: string };
  toast?: string;
  giftTo?: string;
  setup: { surname: string; sex: Sex; origin: GameState['origin'] | 'random' };
}

const SAVE_KEY = 'gamun-kiugi-save-v1';
const PREF_KEY = 'gamun-kiugi-prefs';

const prefs = loadPrefs();
const ui: UIState = {
  game: load(),
  tab: 'tree',
  view: prefs.view ?? 'tree',
  zoom: prefs.zoom ?? 'mid',
  showDead: false,
  setup: { surname: '김', sex: 'M', origin: 'random' },
};

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? migrate(JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
  }
}
function loadPrefs(): { view?: 'tree' | 'list'; zoom?: Zoom } {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}');
  } catch {
    return {};
  }
}
function savePrefs() {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify({ view: ui.view, zoom: ui.zoom }));
  } catch {
    /* noop */
  }
}
function save() {
  try {
    if (ui.game) localStorage.setItem(SAVE_KEY, JSON.stringify(ui.game));
  } catch {
    /* 저장 불가 환경 */
  }
}
function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* noop */
  }
}

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const nl = (t: string) => esc(t).replace(/\n/g, '<br>');

let root: HTMLElement;
let hasSave = false;

export function mount(el: HTMLElement) {
  root = el;
  hasSave = !!ui.game;
  ui.game = null;
  root.addEventListener('click', onClick);
  root.addEventListener('input', onInput);
  render();
}

// ─────────────────────────── 렌더 ───────────────────────────

function render() {
  const g = ui.game;
  if (!g) {
    root.innerHTML = titleScreen();
    return;
  }
  let modal = '';
  if (g.gameOver) modal = gameOverModal(g);
  else if (ui.report) modal = reportModal(ui.report);
  else if (ui.outcome) modal = outcomeModal(ui.outcome);
  else if (g.events.length) modal = eventModal(g);
  else if (ui.sheet) modal = personSheet(g, g.people[ui.sheet]);

  const body = { tree: treeScreen, policy: policyScreen, assets: assetsScreen, log: logScreen, achv: achvScreen }[ui.tab](g);
  root.innerHTML = `
    ${header(g)}
    <main class="screen">${body}</main>
    ${ui.tab === 'tree' ? `<button class="next-year" data-action="next">${g.events.length ? `이벤트 ${g.events.length}개 ▶` : `${g.year + 1}년으로 ▶`}</button>` : ''}
    ${nav()}
    ${modal}
    ${ui.toast ? `<div class="toast">${esc(ui.toast)}</div>` : ''}
  `;
  if (ui.toast) {
    const t = ui.toast;
    setTimeout(() => {
      if (ui.toast === t) {
        ui.toast = undefined;
        root.querySelector('.toast')?.remove();
      }
    }, 2200);
  }
}

function titleScreen(): string {
  const o = ui.setup;
  const seg = (action: string, cur: string, opts: [string, string][]) =>
    `<div class="seg">${opts.map(([v, l]) => `<button data-action="${action}" data-v="${v}" class="${cur === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  return `
  <div class="title">
    <div class="logo">
      <div class="logo-sub">도트 가문 육성 시뮬레이션</div>
      <h1>가문 키우기</h1>
      <div class="logo-tree">
        ${['M', 'F'].map((sx, i) => `<img class="px" src="${portraitURL(demoPerson(sx as Sex, i), 40)}">`).join('')}
        <img class="px" src="${portraitURL(demoPerson('M', 3), 8)}">
      </div>
    </div>
    ${hasSave ? `<button class="btn big" data-action="continue">이어하기</button>` : ''}
    <section class="card">
      <h2>새 가문 세우기</h2>
      <label class="field">가문의 성씨
        <input id="surname" maxlength="2" value="${esc(o.surname)}" autocomplete="off">
      </label>
      <div class="field">나의 성별 ${seg('setup-sex', o.sex, [['M', '남'], ['F', '여']])}</div>
      <div class="field">태어날 집안 ${seg('setup-origin', o.origin, [['random', '🎲 운명에 맡긴다'], ['poor', '서민'], ['middle', '중산층'], ['rich', '부유층']])}</div>
      <p class="fine">다섯 살부터 시작한다. 부모님의 직업·재산, 형제자매는 태어나 봐야 안다.</p>
      <div class="field">시대 <div class="seg"><button class="on">현대 한국</button><button disabled>근현대사 (준비 중)</button></div></div>
      <button class="btn big primary" data-action="start">가문 시작</button>
    </section>
    <p class="fine">v0.3 · 다섯 살부터 · 직업 119종 · 수능과 입시 · 인생사 · 업적 70+</p>
  </div>`;
}

function demoPerson(sex: Sex, i: number): Person {
  return {
    genes: { hairStyle: i + 1, hairColor: i % 3, skin: i % 4, eyes: i % 3 },
    sex,
    job: i === 0 ? 'office' : i === 1 ? 'doctor' : 'none',
  } as Person;
}

function header(g: GameState): string {
  const h = head(g);
  return `
  <header class="top">
    <div class="top-l">
      <div class="year">${g.year}년</div>
      <div class="fam">${esc(g.familyName)}씨 가문 · ${g.generation}대 · ${esc(fullName(h))} ${age(g, h)}세</div>
    </div>
    <div class="top-r">
      <div class="money">${formatMoney(familyTotal(g))}</div>
      <div class="fame">명성 ${Math.round(g.fame)}</div>
    </div>
  </header>`;
}

function nav(): string {
  const tabs: [Tab, string][] = [
    ['tree', '가계도'],
    ['policy', '방침'],
    ['assets', '자산'],
    ['log', '연대기'],
    ['achv', '업적'],
  ];
  return `<nav class="tabs">${tabs.map(([t, l]) => `<button data-action="tab" data-v="${t}" class="${ui.tab === t ? 'on' : ''}">${l}</button>`).join('')}</nav>`;
}

function card(g: GameState, p: Person, extra = ''): string {
  const dead = !alive(p);
  const a = dead ? p.deathYear! - p.birthYear : age(g, p);
  const isHead = p.id === g.headId;
  const heir = p.id === g.heirId;
  const pending = g.events.some((e) => e.personId === p.id);
  const small = ui.zoom === 'small';
  return `<button class="pc ${dead ? 'dead' : ''} ${isHead ? 'head' : ''} ${p.inLaw ? 'inlaw' : ''} ${extra}" data-action="person" data-id="${p.id}">
    ${isHead ? '<span class="crown">👑</span>' : heir ? '<span class="crown">★</span>' : ''}
    ${pending ? '<span class="bang">!</span>' : ''}
    <img class="px" src="${portraitURL(p, a)}" alt="">
    <span class="nm">${esc(p.name)}</span>
    <span class="ag">${dead ? '†' + a : a + (small ? '' : '세')}</span>
    ${small ? '' : `<span class="rl">${esc(jobShort(g, p))}</span>`}
  </button>`;
}

/** 카드 아래 한 줄: 학생/수험생/직업 */
function jobShort(g: GameState, p: Person): string {
  if (!alive(p)) return relationLabel(g, p);
  const a = age(g, p);
  if (p.flags.some((f) => f.startsWith('serving:'))) return '군 복무';
  if (a < 8) return '아이';
  if (a < 14 && p.job === 'none') return '초등학생';
  if (a < 17 && p.job === 'none') return '중학생';
  if (a < 20 && p.job === 'none' && !p.flags.includes('retaking')) return '고등학생';
  if (p.flags.includes('retaking')) return '재수생';
  if (p.flags.includes('student')) return '대학생';
  if (p.flags.some((f) => f.startsWith('prep:'))) return '수험생';
  return JOBS[p.job].name;
}

/** 부부 + 그 아래 자녀 가지 (재귀). 작게 보기에서는 자손 없는 고인은 숨김 */
function branch(g: GameState, p: Person, depth: number, extra = ''): string {
  const sp = spouseOf(g, p);
  const kids = childrenOf(g, p)
    .filter((k) => alive(k) || ui.zoom !== 'small' || hasLivingDescendant(g, k))
    .sort((x, y) => x.birthYear - y.birthYear);
  const couple = `<div class="br-couple ${extra}">${card(g, p)}${sp ? `<span class="ring">♥</span>${card(g, sp)}` : ''}</div>`;
  const inner = depth < 6 && kids.length ? `<div class="br-kids">${kids.map((k) => branch(g, k, depth + 1)).join('')}</div>` : '';
  return `<div class="br">${couple}${inner}</div>`;
}

function hasLivingDescendant(g: GameState, p: Person): boolean {
  return childrenOf(g, p).some((k) => alive(k) || hasLivingDescendant(g, k));
}

function familyStats(g: GameState) {
  const living = Object.values(g.people).filter(alive);
  const h = head(g);
  const main = living.filter((p) => isMainline(g, p));
  return {
    living: living.length,
    main: main.length,
    minors: main.filter((p) => age(g, p) < 20).length,
    single: main.filter((p) => !p.inLaw && age(g, p) >= 26 && !p.spouseId).length,
    exam: main.filter((p) => p.flags.some((f) => f.startsWith('prep:'))).length,
    desc: living.filter((p) => isDescendantOf(g, p, h)).length,
  };
}

function treeScreen(g: GameState): string {
  const h = head(g);
  const st = familyStats(g);
  const heir = g.heirId && alive(g.people[g.heirId]) ? g.people[g.heirId] : undefined;
  const toolbar = `
    <div class="tree-bar">
      ${seg('view', ui.view, [['tree', '🌳 가계도'], ['list', '📋 명부']])}
      ${ui.view === 'tree' ? seg('zoom', ui.zoom, [['big', '크게'], ['mid', '보통'], ['small', '작게']]) : seg('dead', ui.showDead ? 1 : 0, [[0, '생존자만'], [1, '고인 포함']])}
    </div>
    <div class="fam-stats">
      <span>👥 ${st.living}명</span><span>직계 ${st.main}</span><span>자손 ${st.desc}</span>
      ${st.minors ? `<span>🧒 ${st.minors}</span>` : ''}${st.single ? `<span>💌 미혼 ${st.single}</span>` : ''}${st.exam ? `<span>📖 수험생 ${st.exam}</span>` : ''}
      <span>★ ${heir ? esc(heir.name) : '후계자 미정'}</span>
    </div>`;
  if (ui.view === 'list') return toolbar + rosterScreen(g);

  const parents = parentsOf(g, h);
  const grand = parents.flatMap((p) => parentsOf(g, p)).filter((p) => alive(p) || ui.zoom !== 'small');
  const sibs = siblingsOf(g, h).filter((p) => alive(p) || ui.zoom !== 'small' || hasLivingDescendant(g, p));
  const older = sibs.filter((x) => x.birthYear <= h.birthYear);
  const younger = sibs.filter((x) => x.birthYear > h.birthYear);
  const sp = spouseOf(g, h);

  return `${toolbar}
  <div class="ft z-${ui.zoom}">
    ${grand.length ? `<div class="ft-up"><span class="ft-l">조부모</span>${grand.map((p) => card(g, p)).join('')}</div>` : ''}
    ${parents.length ? `<div class="ft-up"><span class="ft-l">부모</span>${parents.map((p) => card(g, p)).join('')}</div>` : ''}
    <div class="ft-scroll"><div class="ft-inner">
      ${older.map((p) => `<div class="side">${branch(g, p, 1)}</div>`).join('')}
      <div class="main-br">${branch(g, h, 0, 'me')}</div>
      ${younger.map((p) => `<div class="side">${branch(g, p, 1)}</div>`).join('')}
    </div></div>
    ${!sp && !h.childIds.length ? `<p class="hint">아직 혼자다. 26세 무렵부터 소개팅이 들어온다.</p>` : ''}
  </div>`;
}

/** 명부: 세대별로 한 줄씩. 큰 가문을 한눈에 */
function rosterScreen(g: GameState): string {
  const h = head(g);
  const people = Object.values(g.people).filter((p) => (ui.showDead || alive(p)) && !(p.inLaw && !p.spouseId));
  const groups = new Map<string, Person[]>();
  const add = (k: string, p: Person) => groups.set(k, [...(groups.get(k) ?? []), p]);
  const depthOf = (p: Person): number => {
    let d = 0;
    let cur: Person | undefined = p;
    while (cur && cur.id !== h.id && d < 10) {
      cur = parentsOf(g, cur).find((x) => x.id === h.id || isDescendantOf(g, x, h));
      d++;
    }
    return cur ? d : -1;
  };
  const GEN = ['본인 세대', '자녀', '손주', '증손', '고손', '5대손', '6대손'];
  for (const p of people) {
    if (p.id === h.id || p.id === h.spouseId) add(GEN[0], p);
    else if (isDescendantOf(g, p, h)) add(GEN[depthOf(p)] ?? '후손', p);
    else if (p.spouseId && isDescendantOf(g, g.people[p.spouseId], h)) add(GEN[depthOf(g.people[p.spouseId])] ?? '후손', p);
    else if (isDescendantOf(g, h, p)) add('윗대', p);
    else add('방계 (형제·친척)', p);
  }
  const order = ['윗대', ...GEN, '후손', '방계 (형제·친척)'];
  return order
    .filter((k) => groups.has(k))
    .map((k) => {
      const list = groups.get(k)!.sort((a, b) => a.birthYear - b.birthYear);
      return `<section class="roster">
        <h3>${k} <small>${list.length}명</small></h3>
        ${list.map((p) => rosterRow(g, p)).join('')}
      </section>`;
    })
    .join('');
}

function rosterRow(g: GameState, p: Person): string {
  const dead = !alive(p);
  const a = dead ? p.deathYear! - p.birthYear : age(g, p);
  const badges = [
    p.id === g.headId ? '👑' : '',
    p.id === g.heirId ? '★' : '',
    g.events.some((e) => e.personId === p.id) ? '❗' : '',
    p.spouseId && alive(g.people[p.spouseId]) ? '💍' : p.partnerId ? '💕' : '',
    p.flags.includes('grievance') ? '💢' : '',
  ].join('');
  return `<button class="rrow ${dead ? 'dead' : ''}" data-action="person" data-id="${p.id}">
    <img class="px" src="${portraitURL(p, a)}" alt="">
    <span class="r-nm">${esc(fullName(p))}<small>${esc(relationLabel(g, p))}</small></span>
    <span class="r-ag">${dead ? '†' : ''}${a}</span>
    <span class="r-job">${esc(dead ? '' : jobShort(g, p) === JOBS[p.job].name ? jobTitle(p) : jobShort(g, p))}</span>
    <span class="r-w">${dead ? '' : formatMoney(personWorth(g, p))}</span>
    <span class="r-b">${badges}</span>
  </button>`;
}

function statBars(p: Person): string {
  return STAT_KEYS.map((k) => {
    const v = Math.round(p.actual[k]);
    const pot = p.potential[k];
    return `<div class="stat">
      <span class="sk">${STAT_NAMES[k]}</span>
      <span class="bar">
        ${p.potentialKnown ? `<i class="pot" style="width:${pot}%"></i>` : ''}
        <i class="act" style="width:${v}%"></i>
      </span>
      <span class="sv">${v}${p.potentialKnown ? `<small>/${pot}</small>` : ''}</span>
    </div>`;
  }).join('');
}

const EDU_LABELS: Record<string, string> = {
  kinder_eng: '영어유치원',
  elem_private: '사립초',
  elem_intl: '국제학교',
  elem_alt: '대안학교',
  gifted: '영재원',
  sports_team: '운동부',
  trainee: '연습생',
  mid_intl: '국제중',
  mid_sport: '체육중',
  mid_art: '예술중',
  high_elite: '특목고',
  high_sport: '체육고',
  high_art: '예고',
  high_voc: '특성화고',
  dropout: '검정고시',
  univ_top: '명문대',
  univ_local: '대학',
  med_school: '의대',
  pharm_school: '약대',
  nurse_school: '간호학과',
  edu_school: '교대',
  police_univ: '경찰대',
  academy: '사관학교',
  art_school: '미대',
  music_school: '음대',
  law_school: '로스쿨',
  grad_school: '대학원',
  bootcamp: '부트캠프',
  flight_school: '비행교육원',
};

/** 인물 상세의 인생 정보: 성격·학업·병역·건강·금슬 */
function lifeRows(g: GameState, p: Person): string {
  const rows: string[] = [];
  const traits = (p.traits ?? []).map((id) => `<b class="chip ${TRAITS[id].good ? '' : 'bad'}" title="${esc(TRAITS[id].desc)}">${TRAITS[id].name}</b>`);
  if (traits.length && (age(g, p) >= 8 || !alive(p))) rows.push(`<div class="sh-row"><span>성격</span><span>${traits.join(' ')}</span></div>`);
  const school = p.flags.filter((f) => f.startsWith('school:')).pop()?.slice(7);
  if (school) rows.push(`<div class="sh-row"><span>학교</span><span>${esc(school)}</span></div>`);
  const a = age(g, p);
  if (alive(p) && a >= 8 && a < 25 && (p.study !== undefined || p.eduSpent)) {
    const st = Math.round(p.study ?? 0);
    rows.push(`<div class="sh-row"><span>성적</span><span>${st}점 ${st >= 90 ? '(전교권)' : st >= 75 ? '(상위권)' : st >= 55 ? '(중상위권)' : st >= 35 ? '(중위권)' : '(하위권)'} · 사교육비 누적 ${formatMoney(p.eduSpent ?? 0)}</span></div>`);
  }
  const retake = Number(p.flags.find((f) => f.startsWith('retake:'))?.slice(7) ?? 0);
  if (retake) rows.push(`<div class="sh-row"><span>입시</span><span>${retake + 1}수${p.flags.includes('retaking') ? ' 중' : ''}</span></div>`);
  if (p.sex === 'M' && !p.inLaw && a >= 19) {
    const mil = p.flags.some((f) => f.startsWith('serving:'))
      ? '복무 중'
      : p.flags.includes('draft_dodger')
        ? '⚠ 병역 기피'
        : p.flags.includes('exempt_medal')
          ? '병역특례'
          : p.flags.includes('marine')
            ? '해병대 만기 전역'
            : p.flags.includes('officer_served')
              ? '장교 전역'
              : p.flags.includes('served')
                ? '만기 전역'
                : p.flags.includes('exempt')
                  ? '면제'
                  : '미필';
    rows.push(`<div class="sh-row"><span>병역</span><span>${mil}</span></div>`);
  }
  const cancer = p.flags.find((f) => f.startsWith('cancer:'));
  if (cancer && alive(p)) rows.push(`<div class="sh-row warn"><span>🎗</span><span>암 투병 중 (${g.year - Number(cancer.split(':')[2])}년째)</span></div>`);
  if (p.flags.includes('cancer_survivor')) rows.push(`<div class="sh-row"><span>🎗</span><span>암 완치</span></div>`);
  if (p.spouseId && alive(p) && alive(g.people[p.spouseId]) && p.bond !== undefined) {
    const b = p.bond;
    rows.push(`<div class="sh-row"><span>금슬</span><span>${b >= 75 ? '💞 잉꼬부부' : b >= 50 ? '❤ 화목' : b >= 30 ? '😶 데면데면' : '💢 위기'} (${b})</span></div>`);
  }
  const tries = Number(p.flags.find((f) => f.startsWith('tries:'))?.slice(6) ?? 0);
  if (tries >= 2) rows.push(`<div class="sh-row"><span>수험</span><span>${tries}번 낙방</span></div>`);
  const partner = p.partnerId ? g.people[p.partnerId] : undefined;
  if (partner && alive(p)) {
    const since = Number(p.flags.find((f) => f.startsWith('dating_since:'))?.slice(13) ?? g.year);
    const l = p.bond ?? 50;
    rows.push(`<div class="sh-row"><span>연애</span><span>💕 ${esc(fullName(partner))} (${g.year - since + 1}년째 · ${l >= 75 ? '뜨거움' : l >= 50 ? '좋음' : l >= 30 ? '미지근' : '위태'} ${l})${p.flags.includes('cohabit') ? ' · 동거' : ''}</span></div>`);
  }
  const exes = Number(p.flags.find((f) => f.startsWith('exes:'))?.slice(5) ?? 0);
  if (exes && alive(p)) rows.push(`<div class="sh-row"><span>지난 연애</span><span>${exes}번의 이별</span></div>`);
  const affairs = alive(p) ? pendingAffairs(g, p) : [];
  if (affairs.length) rows.push(`<div class="sh-row"><span>진행 중</span><span class="affairs">${affairs.map((a) => esc(a)).join('<br>')}</span></div>`);
  if (p.flags.includes('dui')) rows.push(`<div class="sh-row warn"><span>⚠</span><span>음주운전 전과</span></div>`);
  return rows.join('');
}

function personSheet(g: GameState, p: Person): string {
  const dead = !alive(p);
  const a = dead ? p.deathYear! - p.birthYear : age(g, p);
  const h = head(g);
  const edu = p.flags.filter((f) => EDU_LABELS[f]).map((f) => EDU_LABELS[f]);
  const talents = p.talents.filter((t) => t.discovered);
  const job = JOBS[p.job];
  const prep = p.flags.find((f) => f.startsWith('prep:'))?.slice(5);
  const tries = Number(p.flags.find((f) => f.startsWith('tries:'))?.slice(6) ?? 0);
  const jobTxt =
    a < 20 && p.job === 'none'
      ? '학생'
      : p.flags.includes('student')
        ? '대학생'
        : prep
          ? `${EXAMS[prep].name} 준비생${tries ? ` (${tries + 1}수째)` : ''}`
          : job.titles
            ? `${job.name} · ${jobTitle(p)}`
            : job.name;
  const marital = p.spouseId
    ? (alive(g.people[p.spouseId]) ? `💍 ${fullName(g.people[p.spouseId])}` : '사별') + (p.flags.includes('remarried') ? ' (재혼)' : '')
    : p.flags.includes('divorced')
      ? '이혼'
      : p.flags.includes('single_life')
        ? '독신'
        : a >= 26
          ? '미혼'
          : '';
  const isDesc = isDescendantOf(g, p, h);
  const happy = p.happiness >= 70 ? '😊' : p.happiness >= 40 ? '🙂' : p.happiness >= 20 ? '😐' : '😣';
  const retireOk = canRetire(g);

  const actions: string[] = [];
  if (!dead && isDesc) {
    actions.push(
      p.id === g.heirId
        ? `<button class="btn" disabled>★ 후계자로 지명됨</button>`
        : `<button class="btn" data-action="heir" data-id="${p.id}">★ 후계자로 지명</button>`,
    );
  }
  if (!dead && isMainline(g, p) && !p.potentialKnown && a < 20) {
    actions.push(`<button class="btn" data-action="test" data-id="${p.id}" ${spendable(g) < 300 ? 'disabled' : ''}>정밀 적성검사 (300만)</button>`);
  }
  if (p.id === h.id) {
    actions.push(`<button class="btn" data-action="retire" ${retireOk !== true ? 'disabled' : ''}>은퇴 · 생전 승계</button>`);
    if (retireOk !== true) actions.push(`<p class="fine">${esc(retireOk)}</p>`);
  }

  return `
  <div class="modal" data-action="close-sheet">
    <div class="sheet" data-stop>
      <div class="sheet-head">
        <img class="px big ${dead ? 'dead' : ''}" src="${portraitURL(p, a)}">
        <div>
          <div class="sh-name">${esc(fullName(p))} ${p.id === g.headId ? '👑' : ''}</div>
          <div class="sh-sub">${esc(relationLabel(g, p))} · ${dead ? `${p.birthYear}–${p.deathYear} (향년 ${a}세)` : `${a}세 (${p.birthYear}년생)`}</div>
          <div class="sh-sub">${esc(jobTxt)}${edu.length ? ' · ' + esc(edu.join('→')) : ''}</div>
        </div>
      </div>
      ${statBars(p)}
      <div class="sh-row"><span>재능</span><span>${
        talents.length
          ? talents.map((t) => `<b class="chip" title="${esc(TALENTS[t.id].desc)}">${TALENTS[t.id].name}</b>`).join(' ')
          : p.potentialKnown
            ? '없음'
            : '<span class="muted">??? (아직 발견되지 않음)</span>'
      }</span></div>
      ${!dead && p.id !== h.id ? `<div class="sh-row"><span>마음</span><span>${happy} 행복 · ${p.affinity >= 0 ? '♥' : '💢'} 관계 ${Math.round(p.affinity)}</span></div>` : ''}
      ${p.desire && p.desireKnown ? `<div class="sh-row"><span>꿈</span><span>${TAG_NAMES[p.desire]}</span></div>` : ''}
      <div class="sh-row"><span>재산</span><span>${formatMoney(personWorth(g, p))}</span></div>
      ${lifeRows(g, p)}
      ${p.flags.includes('grievance') ? `<div class="sh-row warn"><span>⚠</span><span>상속에 불만을 품고 있다</span></div>` : ''}
      ${marital && !dead ? `<div class="sh-row"><span>혼인</span><span>${esc(marital)}</span></div>` : ''}
      ${p.flags.includes('bankrupt') ? `<div class="sh-row warn"><span>⚠</span><span>파산 이력이 있다</span></div>` : ''}
      <div class="sh-actions">${actions.join('')}</div>
      <button class="btn ghost" data-action="close-sheet">닫기</button>
    </div>
  </div>`;
}

function eventModal(g: GameState): string {
  const cur = currentEvent(g)!;
  const ports = cur.portraits
    .filter(Boolean)
    .slice(0, 3)
    .map((p) => `<img class="px mid" src="${portraitURL(p, g.year - p.birthYear)}">`)
    .join('');
  return `
  <div class="modal">
    <div class="event">
      <div class="ev-count">${g.year}년 · 남은 이벤트 ${g.events.length}</div>
      <h3>${esc(cur.title)}</h3>
      <div class="ev-ports">${ports}</div>
      <p class="ev-text">${nl(cur.text)}</p>
      <div class="choices">
        ${cur.choices
          .map(
            (c, i) => `<button class="choice" data-action="choose" data-i="${i}" ${c.disabled ? 'disabled' : ''}>
              <span class="cl">${esc(c.label)}</span>
              ${c.cost || c.req?.length ? `<span class="badges">${c.cost ? `<b class="cost">💰${formatMoney(c.cost)}</b>` : ''}${(c.req ?? []).map((r) => `<b>${esc(r)}</b>`).join('')}</span>` : ''}
            </button>`,
          )
          .join('')}
      </div>
    </div>
  </div>`;
}

function outcomeModal(o: { title: string; text: string }): string {
  return `
  <div class="modal">
    <div class="event">
      <h3>${esc(o.title)}</h3>
      <p class="ev-text">${nl(o.text)}</p>
      <button class="btn primary" data-action="ok-outcome">계속</button>
    </div>
  </div>`;
}

function reportModal(r: { title: string; lines: string[] }): string {
  return `
  <div class="modal">
    <div class="event report">
      <h3>${esc(r.title)}</h3>
      <ul>${r.lines.map((l) => `<li>${esc(l)}</li>`).join('') || '<li class="muted">조용한 한 해였다.</li>'}</ul>
      <button class="btn primary" data-action="ok-report">확인</button>
    </div>
  </div>`;
}

function gameOverModal(g: GameState): string {
  return `
  <div class="modal">
    <div class="event">
      <h3>가문 단절</h3>
      <p class="ev-text">${nl(g.gameOver!.reason)}</p>
      <div class="score">
        <div>${g.startYear}–${g.year}년 · ${g.generation}대</div>
        <div>업적 ${g.achievements.length}개 · 명성 ${Math.round(g.fame)}</div>
        <div class="big-num">${g.gameOver!.score.toLocaleString('ko-KR')}점</div>
      </div>
      <button class="btn" data-action="tab" data-v="log">연대기 보기</button>
      <button class="btn primary" data-action="restart">새 가문 세우기</button>
    </div>
  </div>`;
}

function seg(action: string, cur: string | number, opts: [string | number, string][], id = ''): string {
  return `<div class="seg">${opts
    .map(([v, l]) => `<button data-action="${action}" data-v="${v}" ${id ? `data-id="${id}"` : ''} class="${String(cur) === String(v) ? 'on' : ''}">${l}</button>`)
    .join('')}</div>`;
}

function policyScreen(g: GameState): string {
  const pol = g.policy;
  const minors = livingMainlineMinors(g);
  const h = head(g);
  const hh = householder(g);
  const PLAN_NAMES = ['학원 뺑뺑이', '과외 + 학원 올인', '인강·자기주도', '운동부', '예체능 학원', '봉사·동아리', '놀기', '연애', '알바'];
  return `
  ${
    hh !== h
      ? `<section class="card"><h2>지금은 부모님 슬하</h2><p class="fine">${esc(fullName(hh))}(${esc(relationLabel(g, hh))})이(가) 살림을 꾸린다. 학비·학원비도 부모님 지갑에서 나간다. 독립하면(취업·결혼) 직접 가계를 맡는다.</p></section>`
      : ''
  }
  <section class="card">
    <h2>가주의 한 해</h2>
    <div class="field">생활 방식 ${seg('lifestyle', pol.lifestyle, Object.entries(LIFESTYLE_NAMES) as [string, string][])}</div>
    <p class="fine">일 중심: 승진↑ 건강↓ 금슬↓ · 가정 중심: 금슬↑ · 자기계발: 능력치↑ · 요양: 건강 회복${age(g, h) < 20 ? ' (성인이 되면 적용)' : ''}</p>
    <div class="field">생활 수준 ${seg('living', pol.living, Object.entries(LIVING_NAMES) as [string, string][])}</div>
    <div class="field">가족계획 (자녀 수 목표) ${seg('plan', pol.familyPlan, [0, 1, 2, 3, 4, 5].map((n) => [n, n + '명']))}</div>
  </section>
  <section class="card">
    <h2>자녀 교육</h2>
    ${
      minors.length
        ? minors
            .map((c) => {
              const cp = pol.children[c.id] ?? { budget: 1, focus: 'free' };
              const a = age(g, c);
              const sy = Number(c.flags.find((f) => f.startsWith('sy:'))?.slice(3) ?? -1);
              const body =
                a < 8
                  ? `<div class="field">교육비 ${seg('budget', cp.budget, BUDGET_NAMES.map((n, i) => [i, n]), c.id)}</div>
                     <div class="field">집중 분야 ${seg('focus', cp.focus, Object.entries(FOCUS_NAMES) as [string, string][], c.id)}</div>`
                  : `<p class="fine">올해: ${sy >= 0 ? PLAN_NAMES[sy] : '—'} · 성적 ${Math.round(c.study ?? 0)} · 사교육비 누적 ${formatMoney(c.eduSpent ?? 0)}<br>학년이 바뀔 때마다 어떻게 보낼지 정한다.</p>`;
              return `<div class="kid">
                <div class="kid-h"><img class="px sm" src="${portraitURL(c, a)}"> ${esc(fullName(c))} · ${a}세 · ${esc(jobShort(g, c))}</div>
                ${body}
              </div>`;
            })
            .join('')
        : '<p class="hint">키울 아이가 없다.</p>'
    }
    <p class="fine">미취학: 기본 300만 · 사교육 1,200만 · 올인 3,000만 /년. 학령기부터는 해마다 학년 이벤트로 고른다.<br>사교육비가 쌓일수록 수능에 유리하지만, 아이의 행복은 줄어든다.</p>
  </section>`;
}

const pct = (v?: number) => (v === undefined ? '' : `<small class="${v >= 0 ? 'up' : 'down'}">${v >= 0 ? '▲' : '▼'}${Math.abs(v * 100).toFixed(1)}%</small>`);

function assetsScreen(g: GameState): string {
  const h = head(g);
  const members = Object.values(g.people)
    .filter((p) => alive(p) && (isMainline(g, p) || personWorth(g, p) !== 0))
    .sort((a, b) => personWorth(g, b) - personWorth(g, a));
  const fam = assetsOf(g, 'family');
  const recipients = Object.values(g.people).filter((p) => alive(p) && (isDescendantOf(g, p, h) || p.id === h.spouseId));
  const to = ui.giftTo && g.people[ui.giftTo] && alive(g.people[ui.giftTo]) ? g.people[ui.giftTo] : recipients[0];
  const mine = assetsOf(g, h.id);
  const et = estateTax(g, h);

  const assetRow = (a: Asset, sellable: boolean) =>
    `<div class="arow"><span>${ASSET_ICONS[a.kind]} ${esc(a.name)}</span><span>${formatMoney(a.value)} ${sellable ? `<button class="mini" data-action="sell" data-id="${a.id}">매도</button>` : ''}</span></div>`;

  const units = TRADE_UNITS.map((u) => [u, formatMoney(u)] as const);
  return `
  <section class="bank">
    <div class="bank-l">${esc(g.familyName)}씨 가문 총자산</div>
    <div class="bank-v">${formatMoney(familyTotal(g))}</div>
    <div class="bank-s">가문 재산 ${formatMoney(familyWorth(g))} · 직계 개인 재산 ${formatMoney(familyTotal(g) - familyWorth(g))}</div>
  </section>

  <section class="card">
    <h2>가문 재산 (공동)</h2>
    <div class="arow"><span>💰 가문 금고</span><span>${formatMoney(g.familyCash)}</span></div>
    ${fam.map((a) => assetRow(a, true)).join('')}
    <p class="fine">가문 재산은 가주가 관리하며 상속세 없이 다음 가주에게 넘어간다.</p>
  </section>

  <section class="card">
    <h2>개인 재산</h2>
    ${members
      .map((p) => {
        const as = assetsOf(g, p.id);
        return `<details class="pw" ${p.id === h.id ? 'open' : ''}>
          <summary><img class="px sm" src="${portraitURL(p, age(g, p))}"> <span>${esc(fullName(p))} <small>${esc(relationLabel(g, p))}</small></span><b>${formatMoney(personWorth(g, p))}</b></summary>
          <div class="arow"><span>💵 현금·예금</span><span class="${p.cash < 0 ? 'neg' : ''}">${formatMoney(p.cash)}${p.cash < 0 ? ' (대출)' : ''}</span></div>
          ${as.map((a) => assetRow(a, p.id === h.id)).join('')}
        </details>`;
      })
      .join('')}
  </section>

  <section class="card">
    <h2>투자 시장 <small class="muted">가주 명의로 매수</small></h2>
    <h4 class="sub">부동산 (한 채)</h4>
    ${(REAL_ESTATE as AssetKind[])
      .map(
        (k) => `<div class="arow"><span>${ASSET_ICONS[k]} ${ASSET_NAMES[k]} ${pct(g.marketChange[k])}</span>
        <span>${formatMoney(g.market[k])} <button class="mini" data-action="buy" data-v="${k}" ${canBuy(g, k) ? '' : 'disabled'}>매수</button></span></div>`,
      )
      .join('')}
    <p class="fine">취득세 ${BUY_TAX * 100}% · 가격의 40%만 있으면 나머지는 대출(연 7%) · 임대수익 연 2.5% · 상속세 평가 70%</p>
    ${(['stock', 'coin'] as const)
      .map(
        (k) => `<h4 class="sub">${ASSET_ICONS[k]} ${k === 'stock' ? '주식 (지수 ' + g.market.stock + ')' : '코인 (지수 ' + g.market.coin + ')'} ${pct(g.marketChange[k])}</h4>
        <div class="buy-row">${units.map(([u, l]) => `<button class="mini" data-action="buy" data-v="${k}" data-amt="${u}" ${canBuy(g, k, u) ? '' : 'disabled'}>+${l}</button>`).join('')}</div>`,
      )
      .join('')}
    <p class="fine">주식: 배당 2%, 연 ±17% 출렁임 · 코인: 배당 없음, 반토막도 열 배도 흔하다 · 둘 다 상속세는 시가 100% 평가</p>
    <h4 class="sub">🖼 예술품 (미술 지수 ${g.market.art}) ${pct(g.marketChange.art)}</h4>
    ${ART_TIERS.map(
      (tier, i) => `<div class="arow"><span>${tier.name}</span><span>${formatMoney(artPrice(g, i))} <button class="mini" data-action="buy" data-v="art" data-amt="${i}" ${canBuy(g, 'art', artPrice(g, i)) ? '' : 'disabled'}>구입</button></span></div>`,
    ).join('')}
    <p class="fine">상속세 평가는 감정가의 50% → 절세 수단. 대신 위작일 수 있다 (비쌀수록 위험). 감정이나 매각 때 드러난다.</p>
  </section>

  <section class="card">
    <h2>절세 · 상속 대비</h2>
    <div class="sh-row"><span>지금 사망 시</span><span>상속세 <b>${formatMoney(et.tax)}</b>${et.gross > 0 ? ` (실효 ${((et.tax / et.gross) * 100).toFixed(1)}%)` : ''}</span></div>
    <div class="sh-row"><span>세법상 평가액</span><span>${formatMoney(et.assessed)} / 시가 ${formatMoney(et.gross)}</span></div>
    ${et.priorGifts ? `<div class="sh-row"><span>10년 내 증여 합산</span><span>${formatMoney(et.priorGifts)}</span></div>` : ''}
    <div class="sh-row"><span>세무사</span><span>${
      g.policy.taxAdvisor
        ? `선임 중 · 연 ${formatMoney(advisorFee(g))} <button class="mini" data-action="advisor" data-v="0">해지</button>`
        : `없음 <button class="mini" data-action="advisor" data-v="1">선임 (연 ${formatMoney(advisorFee(g))})</button>`
    }</span></div>
    <p class="fine">세무사: 상속세 과세표준 12%·증여세 6% 절감. 부동산·예술품은 싸게 평가되니 현물로 물려주는 게 유리하다.</p>
  </section>

  <section class="card">
    <h2>생전 증여</h2>
    ${
      recipients.length
        ? `<div class="field">받는 사람
            <select id="gift-to">${recipients.map((p) => `<option value="${p.id}" ${p.id === to.id ? 'selected' : ''}>${esc(fullName(p))} · ${esc(relationLabel(g, p))} (${age(g, p)}세)</option>`).join('')}</select>
          </div>
          <h4 class="sub">현금</h4>
          <div class="gift-btns">${[5000, 10000, 50000, 100000]
            .map(
              (amt) =>
                `<button class="btn" data-action="gift" data-v="${amt}" ${h.cash < amt ? 'disabled' : ''}>${formatMoney(amt)}<small>증여세 ${formatMoney(previewGiftTax(g, h, to, amt))}</small></button>`,
            )
            .join('')}</div>
          ${
            mine.length
              ? `<h4 class="sub">현물 (평가액으로 과세)</h4>${mine
                  .map(
                    (a) => `<div class="arow"><span>${ASSET_ICONS[a.kind]} ${esc(a.name)}<br><small class="muted">시가 ${formatMoney(a.value)} → 평가 ${formatMoney(assessedValue(a))}</small></span>
                    <span><button class="mini" data-action="gift-asset" data-id="${a.id}">증여 · 세금 ${formatMoney(previewAssetGiftTax(g, h, to, a.id))}</button></span></div>`,
                  )
                  .join('')}`
              : ''
          }
          <p class="fine">10년 합산 공제: 배우자 6억 · 성인 자녀 5천만 · 미성년 2천만. 손주에게 바로 주면 세금 30% 할증(세대생략). 사망 전 10년 내 증여는 상속재산에 다시 합산되니 일찍 줄수록 유리.</p>`
        : '<p class="hint">증여할 가족이 없다.</p>'
    }
  </section>

  <section class="card">
    <h2>승계 · 유언장</h2>
    <div class="sh-row"><span>후계자</span><span>${g.heirId && alive(g.people[g.heirId]) ? esc(fullName(g.people[g.heirId])) : '미지정 (첫째가 자동 승계)'}</span></div>
    <div class="will">${(Object.entries(WILL_NAMES) as [WillMode, string][])
      .map(([k, l]) => `<button class="${g.will === k ? 'on' : ''}" data-action="will" data-v="${k}">${l}</button>`)
      .join('')}</div>
    <div class="sh-row"><span>유언장</span><span>${g.willWritten ? '✍ 작성함' : '없음 — 떠나면 자식들이 다툴 수 있다'}</span></div>
    <p class="fine">유언장을 쓰면 재산이 뜻대로 가지만 기력이 쇠해 수명이 조금 줄어든다. 안 쓰면 오래 버티지만, 떠난 뒤 부동산이 급매되고 자식들이 다툰다.<br>후계자에게 몰아주면 재산을 지키기 쉽지만, 몫을 못 받은 형제는 불만을 품는다.</p>
  </section>`;
}

function logScreen(g: GameState): string {
  const items = g.log.slice(-400).reverse();
  return `<section class="card log">${items
    .map((l) => (l.text.startsWith('──') ? `<h4>${esc(l.text.replace(/─/g, '').trim())}</h4>` : `<div class="lg ${l.kind ?? ''}">${esc(l.text)}</div>`))
    .join('')}</section>`;
}

function achvScreen(g: GameState): string {
  const cur = (g.missions ?? []).filter((m) => m.gen === g.generation);
  const past = (g.missions ?? []).filter((m) => m.gen !== g.generation);
  const cats = [...new Set(Object.values(ACHIEVEMENTS).map((a) => a.cat))];
  const got = g.achievements.length;
  const total = Object.keys(ACHIEVEMENTS).length;
  return `
  <section class="card">
    <h2>🎯 ${g.generation}대 세대 미션</h2>
    ${cur
      .map((m) => {
        const d = MISSIONS[m.id];
        return `<div class="achv ${m.state === 'done' ? 'done' : ''}"><b>${m.state === 'done' ? '✅' : '⬜'} ${d.name}</b><span>${d.desc} · 보상 ${[d.fame ? `명성 +${d.fame}` : '', d.cash ? formatMoney(d.cash) : ''].filter(Boolean).join(', ')}</span></div>`;
      })
      .join('')}
    <p class="fine">가주가 바뀌면 새 미션이 주어진다. 지난 세대: 달성 ${past.filter((m) => m.state === 'done').length} · 실패 ${past.filter((m) => m.state === 'failed').length}</p>
  </section>
  <section class="card">
    <h2>📖 직업 도감 <small class="muted">${g.jobsSeen?.length ?? 0} / ${JOB_IDS.length - 3}</small></h2>
    <div class="dex">${(g.jobsSeen ?? []).map((id) => `<b class="chip">${JOBS[id].name}</b>`).join(' ') || '<span class="muted">아직 아무도 일하지 않았다</span>'}</div>
  </section>
  <section class="card">
    <h2>🏆 업적 <small class="muted">${got} / ${total}</small></h2>
    ${cats
      .map((cat) => {
        const list = Object.entries(ACHIEVEMENTS).filter(([, a]) => a.cat === cat);
        const n = list.filter(([id]) => g.achievements.includes(id)).length;
        return `<details class="achv-cat" ${n ? 'open' : ''}><summary>${cat} <small>${n}/${list.length}</small></summary>
          ${list.map(([id, a]) => `<div class="achv ${g.achievements.includes(id) ? 'done' : ''}"><b>${g.achievements.includes(id) ? '🏆' : '🔒'} ${a.name}</b><span>${a.desc}</span></div>`).join('')}
        </details>`;
      })
      .join('')}
  </section>
  <section class="card">
    <h2>게임</h2>
    <p class="fine">시드 ${g.seed} · 시작 ${g.startYear}년 · 자동 저장됨</p>
    <button class="btn" data-action="restart">새 가문 세우기 (현재 진행 삭제)</button>
  </section>`;
}

// ─────────────────────────── 입력 ───────────────────────────

function onInput(e: Event) {
  const t = e.target as HTMLInputElement;
  if (t.id === 'surname') ui.setup.surname = t.value.trim();
  if (t.id === 'gift-to') {
    ui.giftTo = t.value;
    render();
  }
}

function onClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  const el = target.closest<HTMLElement>('[data-action]');
  if (!el) return;
  if (el.dataset.action === 'close-sheet' && target.closest('[data-stop]') && !target.closest('button')) return;
  const a = el.dataset.action!;
  const v = el.dataset.v!;
  const id = el.dataset.id!;
  const g = ui.game;

  switch (a) {
    case 'setup-sex':
      ui.setup.sex = v as Sex;
      break;
    case 'setup-origin':
      ui.setup.origin = v as GameState['origin'] | 'random';
      break;
    case 'continue':
      ui.game = load();
      break;
    case 'start': {
      const sn = (ui.setup.surname || '김').slice(0, 2);
      ui.game = newGame({ familyName: sn, sex: ui.setup.sex, origin: ui.setup.origin === 'random' ? undefined : ui.setup.origin });
      ui.tab = 'tree';
      break;
    }
    case 'restart':
      clearSave();
      hasSave = false;
      ui.game = null;
      ui.report = ui.outcome = ui.sheet = undefined;
      break;
    case 'view':
      ui.view = v as 'tree' | 'list';
      savePrefs();
      break;
    case 'zoom':
      ui.zoom = v as Zoom;
      savePrefs();
      break;
    case 'dead':
      ui.showDead = v === '1';
      break;
    case 'tab':
      ui.tab = v as Tab;
      ui.sheet = undefined;
      break;
    case 'person':
      ui.sheet = id;
      break;
    case 'close-sheet':
      ui.sheet = undefined;
      break;
    case 'next':
      if (!g) break;
      if (!g.events.length) {
        const start = g.log.length;
        simulateYear(g);
        const lines = g.log.slice(start).filter((l) => !l.text.startsWith('──')).map((l) => l.text);
        ui.report = { title: `📜 ${g.year}년`, lines };
      }
      break;
    case 'ok-report':
      ui.report = undefined;
      break;
    case 'choose': {
      if (!g) break;
      const cur = currentEvent(g);
      const title = cur?.title ?? '';
      const text = resolveChoice(g, Number(el.dataset.i));
      if (text) ui.outcome = { title, text };
      break;
    }
    case 'ok-outcome':
      ui.outcome = undefined;
      break;
    case 'lifestyle':
      g!.policy.lifestyle = v as Lifestyle;
      break;
    case 'living':
      g!.policy.living = v as Living;
      break;
    case 'plan':
      g!.policy.familyPlan = Number(v);
      break;
    case 'budget':
      g!.policy.children[id] = { ...(g!.policy.children[id] ?? { budget: 1, focus: 'free' }), budget: Number(v) as 0 | 1 | 2 | 3 };
      break;
    case 'focus':
      g!.policy.children[id] = { ...(g!.policy.children[id] ?? { budget: 1, focus: 'free' }), focus: v as Focus };
      break;
    case 'heir':
      designateHeir(g!, id);
      ui.toast = '후계자를 지명했다';
      break;
    case 'test':
      ui.outcome = { title: '정밀 적성검사', text: aptitudeTest(g!, id) };
      break;
    case 'retire':
      ui.sheet = undefined;
      ui.outcome = { title: '은퇴', text: retire(g!) };
      break;
    case 'buy':
      ui.toast = buyAsset(g!, v as AssetKind, Number(el.dataset.amt ?? 0));
      break;
    case 'gift-asset': {
      const to = (root.querySelector('#gift-to') as HTMLSelectElement | null)?.value;
      if (to) ui.toast = giftAsset(g!, to, id);
      break;
    }
    case 'advisor':
      setTaxAdvisor(g!, v === '1');
      ui.toast = v === '1' ? '세무사를 선임했다' : '세무사 계약을 해지했다';
      break;
    case 'sell':
      ui.toast = sellAsset(g!, id);
      break;
    case 'gift': {
      const to = (root.querySelector('#gift-to') as HTMLSelectElement | null)?.value;
      if (to) ui.toast = gift(g!, to, Number(v));
      break;
    }
    case 'will':
      writeWill(g!, v as WillMode, g!.heirId);
      ui.toast = '유언장을 썼다. 마음이 놓인다… (수명이 조금 줄어든다)';
      break;
  }
  save();
  render();
}
