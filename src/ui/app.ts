import { standingLabel } from '../core/school';
import { TRACK_NAMES, trackOf } from '../core/tracks';
import { HOME_TYPE, buyCurrentHome, homeBuyQuote, moveInto, moveQuote, moveTo, residence, tierOf, tiers } from '../core/housing';
import { creditGrade, debtRate, inRehab, walletNet } from '../core/debt';
import { fixJosa, iga } from '../core/ev-util';
import { LOAN_RATE, liab, acqTax, buyListing, buyQuote, gainsTax, homesOf, isHouse, isPrimary, isRealty, rentable, repayLoan, yieldOf } from '../core/realty';
import { buzz, floatDelta, rollNumber, setSound, setVibe, sfx, soundOn, vibeOn, type Sfx } from './fx';
import { buildingURL, TIER_SPRITE, type BuildingKind } from '../render/building';
import { wageIndex } from '../core/pay';
import { buyPower, MAINTAIN, MARGIN_RATE, stockQuote } from '../core/leverage';
import { buyVehicle, canDrive, modelOf, myVehicles, vehicleAP, vehiclePrice, VEHICLES } from '../core/vehicle';
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
import { advisorFee, assessedValue, assetsOf, forecast, formatMoney, jobTitle, personWorth } from '../core/economy';
import { estateTax, previewAssetGiftTax, previewGiftTax } from '../core/estate';
import { spendable } from '../core/events';
import { age, alive, childrenOf, fullName, head, householder, isDescendantOf, isMainline, livingMainlineMinors, parentsOf, relationLabel, siblingsOf, spouseOf } from '../core/people';
import { MISSIONS } from '../core/missions';
import { pendingAffairs } from '../core/fate';
import { ACTIONS, STAGE_NAMES, apLeft, apMax, doAction, forHead, stageOf, type ActionCat } from '../core/actions';
import { spendable as canSpend } from '../core/ev-util';
import { writeWill } from '../core/family';
import {
  aptitudeTest,
  artPrice,
  buyAsset,
  canBuy,
  canRetire,
  giftAsset,
  migrate,
  setTaxAdvisor,
  currentEvent,
  DIFFICULTY,
  designateHeir,
  familyTotal,
  gift,
  newGame,
  resolveChoice,
  retire,
  sellAsset,
  simulateYear,
} from '../core/sim';
import type { Difficulty } from '../core/sim';
import type { Asset, AssetKind, Focus, GameState, Home, Lifestyle, Living, MarketKey, Person, Sex, WillMode } from '../core/types';
import { portraitURL } from '../render/portrait';

type Tab = 'tree' | 'act' | 'policy' | 'assets' | 'log' | 'achv';
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
  settings?: boolean;
  actCat?: string;
  confirmReset?: boolean;
  setup: { surname: string; sex: Sex; origin: Difficulty | 'random' };
}

const SAVE_KEY = 'gamun-kiugi-save-v1';
const PREF_KEY = 'gamun-kiugi-prefs';

type TextSize = 's' | 'm' | 'l';
interface Prefs {
  view?: 'tree' | 'list';
  zoom?: Zoom;
  sound?: boolean;
  vibe?: boolean;
  calm?: boolean;
  text?: TextSize;
}
const prefs: Prefs = loadPrefs();
setSound(prefs.sound ?? true);
setVibe(prefs.vibe ?? true);
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
function loadPrefs(): Prefs {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}');
  } catch {
    return {};
  }
}
function savePrefs() {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify({ ...prefs, view: ui.view, zoom: ui.zoom, sound: soundOn(), vibe: vibeOn() }));
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

const esc = (t: string) => fixJosa(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const nl = (t: string) => esc(t).replace(/\n/g, '<br>');

let root: HTMLElement;
let hasSave = false;

/**
 * 안드로이드 뒤로 가기 (앱 WebView가 부른다): 열린 창을 닫고, 다른 탭이면 가계도로. 처리했으면 true.
 * 이벤트(선택이 필요한 창)와 게임 오버 창은 닫지 않는다.
 */
function back(): boolean {
  const g = ui.game;
  if (!g) return false;
  if (ui.settings || ui.sheet) return (ui.settings = ui.confirmReset = false), (ui.sheet = undefined), render(), true;
  if (ui.outcome) return (ui.outcome = undefined), (fx.modalKey = ''), render(), true;
  if (ui.report) return (ui.report = undefined), (fx.modalKey = ''), render(), true;
  if (g.events.length || g.gameOver) return true;
  if (ui.tab !== 'tree') return (ui.tab = 'tree'), render(), true;
  return false;
}

export function mount(el: HTMLElement) {
  root = el;
  (window as unknown as { __back: () => boolean }).__back = () => {
    const r = back();
    save();
    return r;
  };
  hasSave = !!ui.game;
  ui.game = null;
  root.addEventListener('click', onClick);
  root.addEventListener('touchstart', () => {}, { passive: true }); // iOS에서 :active 눌림 효과 켜기
  root.addEventListener('input', onInput);
  render();
}

// ─────────────────────────── 렌더 ───────────────────────────

function render() {
  const g = ui.game;
  root.classList.toggle('calm', !!prefs.calm);
  root.classList.toggle('text-s', prefs.text === 's');
  root.classList.toggle('text-l', prefs.text === 'l');
  if (!g) {
    root.innerHTML = titleScreen();
    return;
  }
  let modal = '';
  let modalKey = '';
  if (g.gameOver) (modal = gameOverModal(g)), (modalKey = 'over');
  else if (ui.report) (modal = reportModal(ui.report)), (modalKey = 'rep' + ui.report.title);
  else if (ui.outcome) (modal = outcomeModal(ui.outcome)), (modalKey = 'out' + ui.outcome.title + ui.outcome.text);
  else if (g.events.length) {
    modal = eventModal(g);
    const ev = g.events[0];
    modalKey = `ev${ev.uid}:${JSON.stringify(ev.data ?? '')}`;
  } else if (ui.sheet) (modal = personSheet(g, g.people[ui.sheet])), (modalKey = 'sheet' + ui.sheet);
  else if (ui.settings) (modal = settingsModal(g)), (modalKey = 'settings');

  const body = { tree: treeScreen, act: actionsScreen, policy: policyScreen, assets: assetsScreen, log: logScreen, achv: achvScreen }[ui.tab](g);
  root.innerHTML = `
    ${header(g)}
    <main class="screen">${body}</main>
    ${ui.tab === 'tree' || ui.tab === 'act' ? `<button class="next-year" data-action="next">${g.events.length ? `이벤트 ${g.events.length}개 ▶` : `${g.year + 1}년으로 ▶${apLeft(g) ? `<small>행동력 ${apLeft(g)} 남음</small>` : ''}`}</button>` : ''}
    ${nav()}
    ${modal}
    ${ui.toast ? `<div class="toast">${esc(ui.toast)}</div>` : ''}
  `;
  // 새로 뜬 것만 움직인다: 같은 창이 다시 그려질 땐 가만히
  const m = root.querySelector('.modal');
  if (m && modalKey !== fx.modalKey) m.classList.add(fx.modalKey ? 'swap' : 'enter');
  fx.modalKey = modalKey;
  const tabChanged = ui.tab !== fx.tab;
  if (tabChanged) root.querySelector('.screen')?.classList.add('enter');
  fx.tab = ui.tab;
  centerTree(g, tabChanged);
  // 지갑 숫자는 굴러가며 바뀌고, 증감이 떠오른다
  const amt = root.querySelector('.money .amt');
  const w = wallet(g).amount;
  if (amt && fx.wallet !== undefined && fx.wallet !== w && fx.walletLabel === wallet(g).label) {
    rollNumber(amt, fx.wallet, w, formatMoney);
    floatDelta(amt, `${w > fx.wallet ? '+' : '−'}${formatMoney(Math.abs(w - fx.wallet))}`, w > fx.wallet);
    amt.parentElement?.classList.add(w > fx.wallet ? 'bump-up' : 'bump-down');
  }
  fx.wallet = w;
  fx.walletLabel = wallet(g).label;
  if (ui.toast) {
    const t = ui.toast;
    setTimeout(() => {
      if (ui.toast !== t) return;
      root.querySelector('.toast')?.classList.add('out');
      setTimeout(() => {
        if (ui.toast !== t) return;
        ui.toast = undefined;
        root.querySelector('.toast')?.remove();
      }, 260);
    }, 2200);
  }
}

/**
 * 가계도: 가주가 첫째·막내라 한쪽 끝에 있어도 화면 가운데에 오도록 모자란 쪽에 여백을 주고 가운데로 스크롤한다.
 * 해·탭·확대가 바뀔 때만 다시 맞추고, 그 사이 직접 옆으로 넘겨 본 위치는 지켜 준다.
 */
function centerTree(g: GameState, force: boolean) {
  const sc = root.querySelector<HTMLElement>('.ft-scroll');
  const inner = root.querySelector<HTMLElement>('.ft-inner');
  const me = root.querySelector<HTMLElement>('.main-br > .br > .br-couple .pc.head') ?? root.querySelector<HTMLElement>('.main-br');
  if (!sc || !inner || !me) return;
  const key = `${g.year}:${ui.zoom}:${g.headId}`;
  inner.style.paddingLeft = inner.style.paddingRight = '0px';
  const ir = inner.getBoundingClientRect();
  const mr = me.getBoundingClientRect();
  const center = mr.left + mr.width / 2 - ir.left;
  const half = sc.clientWidth / 2;
  const padL = Math.max(0, half - center);
  const padR = Math.max(0, half - (ir.width - center));
  inner.style.paddingLeft = padL + 'px';
  inner.style.paddingRight = padR + 'px';
  if (force || fx.treeKey !== key || fx.treeScroll === undefined) sc.scrollLeft = center + padL - half;
  else sc.scrollLeft = fx.treeScroll;
  fx.treeKey = key;
  sc.onscroll = () => (fx.treeScroll = sc.scrollLeft);
  fx.treeScroll = sc.scrollLeft;
}

/** 플레이 통계 (GoatCounter 이벤트). 통계 스크립트가 없는 곳(미리보기·오프라인)에선 아무 일도 안 한다 */
function track(name: string, title = name) {
  try {
    (window as unknown as { goatcounter?: { count: (o: { path: string; title: string; event: boolean }) => void } }).goatcounter?.count({ path: name, title, event: true });
  } catch {
    /* noop */
  }
}

/** 직전 화면 상태 (애니메이션을 새로 생긴 것에만 주려고) */
const fx: { modalKey: string; tab?: Tab; wallet?: number; walletLabel?: string; treeKey?: string; treeScroll?: number } = { modalKey: '' };

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
      <div class="field">난이도 (태어날 집안과 유전자) ${seg('setup-origin', o.origin, [['random', '🎲 운명에 맡긴다'], ['easy', '쉬움'], ['normal', '보통'], ['hard', '어려움']])}</div>
      <p class="fine">${o.origin === 'random' ? '집안 형편(서민 30%·중산층 52%·부유층 18%), 부모 직업·재산, 타고난 능력치와 재능 모두 운에 맡긴다.' : `<b>${DIFFICULTY[o.origin].name}</b> — ${DIFFICULTY[o.origin].desc}`}<br>다섯 살부터 시작한다. 형제자매는 태어나 봐야 안다.</p>
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

/** 지금 이벤트·행동 비용을 누가 내는지: 어릴 땐 부모님 지갑이다 */
function wallet(g: GameState): { label: string; amount: number } {
  const payer = householder(g);
  if (payer.id === head(g).id) {
    const net = walletNet(g, payer);
    if (net < 0) return { label: `💳 빚 (연 ${(debtRate(payer) * 100).toFixed(1)}%)`, amount: net };
    return { label: '💵 쓸 수 있는 돈', amount: spendable(g) };
  }
  return { label: `🏠 부모님 지갑`, amount: spendable(g) };
}

/** 한 사람이 가진 것: 현금(빚)·집 보증금·자산을 줄줄이 */
function holdingRows(g: GameState, p: Person, sellable: boolean): string {
  const rows: string[] = [];
  rows.push(
    p.cash < 0
      ? `<div class="arow"><span>💳 생활비 대출</span><span class="neg">${formatMoney(p.cash)} <small>연 ${(debtRate(p) * 100).toFixed(1)}%</small></span></div>`
      : `<div class="arow"><span>💵 현금·예금</span><span>${formatMoney(p.cash)}</span></div>`,
  );
  const h = p.home;
  if (h && (h.type === 'jeonse' || h.type === 'wolse'))
    rows.push(`<div class="arow"><span>🔑 ${HOME_TYPE[h.type]} 보증금 <small>${esc(h.name)}</small></span><span>${formatMoney(h.deposit)}${h.loan ? ` <small class="neg">(전세대출 ${formatMoney(h.loan)})</small>` : ''}</span></div>`);
  for (const a of assetsOf(g, p.id)) {
    const live = h?.type === 'own' && h.assetId === a.id;
    rows.push(assetRow(a, sellable, live));
  }
  return rows.join('');
}

/** 사는 집 한 줄 요약 */
function homeLine(g: GameState, h: Home | undefined): string {
  if (!h) return '집 정보 없음';
  if (h.type === 'own') {
    const a = g.assets.find((x) => x.id === h.assetId);
    return `${esc(h.name)} · 자가${a ? ` · 시세 ${formatMoney(a.value)}${a.loan ? ` (대출 ${formatMoney(a.loan)})` : ''}` : ''}`;
  }
  if (h.type === 'jeonse') return `${esc(h.name)} · 전세 ${formatMoney(h.deposit)}${h.loan ? ` (전세대출 ${formatMoney(h.loan)})` : ''}`;
  if (h.type === 'wolse') return `${esc(h.name)} · 월세 연 ${formatMoney(h.rent)} (보증금 ${formatMoney(h.deposit)})`;
  return esc(h.name);
}

/** 🏡 우리 집: 지금 사는 곳 + 이사·매수 */
function homeCard(g: GameState): string {
  const me = head(g);
  const r = residence(g);
  if (r.withParents) {
    return `<section class="card">
      <h2>🏡 지금 사는 곳 <small class="muted">부모님 댁 (독립 전)</small></h2>
      <p>${homeLine(g, r.home)}</p>
      <p class="fine">독립하면 형편에 맞는 집을 구한다. 부모님 형편이 좋으면 집이나 전세금을 보태 주실 수도.</p>
    </section>`;
  }
  const h = r.home;
  const cur = h ? tierOf(g, h.tier) : undefined;
  const buy = homeBuyQuote(g, me);
  const cash = walletNet(g, me);
  const rows = tiers(g)
    .map((t) => {
      const j = moveQuote(g, me, t, 'jeonse');
      const w = moveQuote(g, me, t, 'wolse');
      const here = cur?.id === t.id && h?.type !== 'own';
      return `<div class="mv ${here ? 'here' : ''}">
        <div class="mv-h"><span>${esc(t.name)}${here ? ' <b class="tag home">지금</b>' : ''}</span><small>시세 ${formatMoney(t.price)}</small></div>
        <div class="mv-b">
          <button class="mini" data-action="move" data-id="${t.id}" data-v="jeonse" ${j.ok && !(here && h?.type === 'jeonse') ? '' : 'disabled'}>전세 ${formatMoney(j.deposit)}</button>
          <button class="mini" data-action="move" data-id="${t.id}" data-v="wolse" ${w.ok && !(here && h?.type === 'wolse') ? '' : 'disabled'}>월세 연 ${formatMoney(w.rent)}</button>
        </div>
      </div>`;
    })
    .join('');
  return `<section class="card">
    <h2>🏡 우리 집</h2>
    <p class="home-now"><b>${h ? HOME_TYPE[h.type] : '—'}</b> ${homeLine(g, h)}</p>
    ${buy ? `<div class="arow"><span>이 집을 산다 <small>(보증금 돌려받아 보태고, 대출 ${formatMoney(buy.loan)})</small></span><span>${formatMoney(buy.price)} <button class="mini" data-action="buy-home" ${cash >= buy.need ? '' : 'disabled'}>매수</button></span></div>` : ''}
    <details class="moves"><summary>이사 가기 (전세·월세)</summary>
      ${rows}
      <p class="fine">전세: 5년마다 재계약(그사이 오른 시세만큼 보증금 조정). 보증금의 최대 80%(2억·연 소득 4배 한도)까지 전세대출(연 4%). 월세: 보증금 조금 + 해마다 월세.<br>집을 사려면 부동산 매물에서 산다. 첫 집을 사면 그 집으로 이사하고, 지금 보증금은 돌려받는다.<br>자가에서 전세·월세로 옮기면 살던 집은 세를 놓는다. 집을 팔면 한 단계 작은 집 월세로 옮긴다.</p>
    </details>
  </section>`;
}

/** 🙋 내 소유 */
function mineCard(g: GameState): string {
  const me = head(g);
  const c = me.credit ?? 750;
  return `<section class="card mine">
    <h2>🙋 내 소유 <small class="muted">${esc(fullName(me))} 명의</small></h2>
    <div class="mine-top"><span>순자산</span><b>${formatMoney(personWorth(g, me))}</b></div>
    ${holdingRows(g, me, true)}
    <div class="arow"><span>📊 신용점수</span><span>${c} <small>(${creditGrade(c)})</small>${inRehab(me) ? ' <b class="tag warn">개인회생 중</b>' : ''}${me.flags.some((f) => f.startsWith('bankrupt_until:')) ? ' <b class="tag hot">파산 면책 중</b>' : ''}</span></div>
  </section>`;
}

/** 👪 부모님 소유 */
function parentsCard(g: GameState): string {
  const me = head(g);
  const pars = parentsOf(g, me).filter(alive);
  if (!pars.length) return '';
  const home = pars.map((p) => p.home).find(Boolean);
  return `<section class="card">
    <h2>👪 부모님 소유 <small class="muted">합계 ${formatMoney(pars.reduce((t, p) => t + personWorth(g, p), 0))}</small></h2>
    ${home ? `<p class="fine">부모님 댁: ${homeLine(g, home)}</p>` : ''}
    ${pars
      .map(
        (p) => `<details class="pw" open>
        <summary><img class="px sm" src="${portraitURL(p, age(g, p))}"> <span>${esc(fullName(p))} <small>${esc(relationLabel(g, p))} · ${age(g, p)}세</small></span><b>${formatMoney(personWorth(g, p))}</b></summary>
        ${holdingRows(g, p, false)}
      </details>`,
      )
      .join('')}
  </section>`;
}

function header(g: GameState): string {
  const h = head(g);
  const w = wallet(g);
  const f = forecast(g);
  const inc = f.income.reduce((t, [, v]) => t + v, 0);
  const exp = f.expense.reduce((t, [, v]) => t + v, 0);
  return `
  <header class="top">
    <div class="top-l">
      <div class="year">${g.year}년 <button class="gear" data-action="settings" title="설정" aria-label="설정">⚙</button></div>
      <div class="fam">${esc(g.familyName)}씨 ${g.generation}대 · ${esc(fullName(h))} ${age(g, h)}세</div>
      <div class="fam">명성 ${Math.round(g.fame)}</div>
    </div>
    <button class="top-r" data-action="tab" data-v="assets" title="자산 탭에서 내년 가계부 보기">
      <div class="money">${w.label} <span class="amt">${formatMoney(fx.wallet !== undefined && fx.walletLabel === w.label ? fx.wallet : w.amount)}</span></div>
      <div class="flow">내년 <b class="${f.net < 0 ? 'neg' : 'pos'}">${f.net < 0 ? '' : '+'}${formatMoney(f.net)}</b> <small>(수입 ${formatMoney(inc)} · 지출 ${formatMoney(exp)})</small></div>
      ${w.label.includes('부모님') && (h.cash || f.mine) ? `<div class="fame">내 통장 ${formatMoney(h.cash)}${f.mine ? ` (+${formatMoney(f.mine)}/년)` : ''}</div>` : ''}
    </button>
  </header>`;
}

/** 부동산: 내 집·투자 부동산 + 올해 매물 */
function realtyCard(g: GameState): string {
  const h = head(g);
  const mine = g.assets.filter((a) => isRealty(a) && (a.ownerId === h.id || a.ownerId === h.spouseId));
  const adult = age(g, h) >= 20;
  const homes = homesOf(g, h).length;
  const owned = mine
    .map((a) => {
      const prim = isPrimary(g, a);
      const gt = gainsTax(g, a);
      const gain = a.value - (a.cost ?? a.value);
      const role = prim ? '<b class="tag home">🏠 실거주</b>' : isHouse(a) ? '<b class="tag inv">💼 투자 주택</b>' : '<b class="tag inv">💼 투자</b>';
      const extra = [
        a.deposit ? `<b class="tag">전세 보증금 ${formatMoney(a.deposit)} · ${a.depositEnd}년 만기</b>` : '',
        a.loan ? `<b class="tag warn">대출 ${formatMoney(a.loan)} (연 ${formatMoney(a.loan * LOAN_RATE)})</b>` : '',
        rentable(g, a) ? `<b class="tag">월세 수익률 ${(yieldOf(a) * 100).toFixed(1)}%</b>` : '',
        ...(a.tags ?? []).filter((t) => t !== '주택').map((t) => `<b class="tag">${esc(t)}</b>`),
      ].join('');
      return `<div class="re">
        <div class="re-h"><span>${ASSET_ICONS[a.kind]} ${esc(a.name)}</span><b>${formatMoney(a.value)}</b></div>
        <div class="re-t">${role}${extra}</div>
        <div class="re-f"><small>${a.cost ? `산 값 ${formatMoney(a.cost)} (${gain >= 0 ? '+' : ''}${formatMoney(gain)}) · ` : ''}팔면 양도세 ${formatMoney(gt.tax)}${gt.note ? ` (${esc(gt.note)})` : ''}</small>
          <span>${a.loan ? `<button class="mini" data-action="repay" data-id="${a.id}" ${h.cash > 0 ? '' : 'disabled'}>대출 갚기</button>` : ''}${a.ownerId === h.id ? `<button class="mini" data-action="sell" data-id="${a.id}">매도</button>` : ''}</span></div>
      </div>`;
    })
    .join('');
  const listings = (g.listings ?? [])
    .map((l) => {
      const q = buyQuote(g, h, l);
      const ok = adult && q.cash >= q.need;
      const tx = acqTax(g, h, l);
      return `<div class="re listing">
        <div class="re-h"><span>${ASSET_ICONS[l.kind]} ${esc(l.name)}</span><b>${formatMoney(l.price)}</b></div>
        <div class="re-t">${l.tags.filter((t) => t !== '주택').map((t) => `<b class="tag ${t === '급매' ? 'hot' : t === '호가 높음' ? 'warn' : ''}">${esc(t)}</b>`).join('')}${l.yield > 0 && !l.deposit ? `<b class="tag">월세 ${(l.yield * 100).toFixed(1)}%</b>` : ''}${l.house ? (l.kind === 'building' ? '<b class="tag">주택 수 포함</b>' : '') : '<b class="tag">주택 수 제외</b>'}</div>
        <div class="re-f"><small>${l.deposit ? `보증금 ${formatMoney(l.deposit)} 끼고 · ` : ''}취득세 ${formatMoney(q.tax)} (${tx.note}) · 대출 최대 ${formatMoney(q.limit)}${q.ltv ? ` (LTV ${Math.round(q.ltv * 100)}%)` : ''}<br>필요 현금 <b>${formatMoney(Math.max(0, q.need))}</b></small>
          <button class="mini" data-action="buy-l" data-id="${l.id}" ${ok ? '' : 'disabled'}>매수</button></div>
      </div>`;
    })
    .join('');
  return `<section class="card">
    <h2>🏠 부동산 <small class="muted">우리 부부 명의 · 주택 ${homes}채</small></h2>
    ${owned || '<p class="hint">아직 내 집이 없다.</p>'}
    <h4 class="sub">📋 ${g.year}년 매물 <small class="muted">해마다 바뀐다 · 행동 탭 '임장'으로 급매를 더 찾을 수 있다</small></h4>
    ${adult ? '' : '<p class="fine">스무 살이 되면 살 수 있다.</p>'}
    ${listings || '<p class="hint">올해는 매물이 다 나갔다.</p>'}
    <p class="fine">첫 집(실거주)은 월세가 없는 대신 재산세가 싸고, 2년 넘게 살면 12억까지 양도세 비과세.<br>두 번째 집부터는 투자: 취득세 8%(3채 이상 12%), 대출 LTV 30%(3채부터 0%), 공시가 9억 넘으면 종부세, 팔 때 양도세 중과. 월세는 공실이면 0원.<br>전세 낀 매물은 적은 돈으로 살 수 있지만(갭투자), 만기에 세입자가 나가면 보증금을 돌려줘야 한다.</p>
  </section>`;
}

/** 가문 자산을 누구 몫인지 나눠 보여준다 */
function familyBreakdown(g: GameState): string {
  const h = head(g);
  const sp = spouseOf(g, h);
  const mine = personWorth(g, h) + (sp && alive(sp) ? personWorth(g, sp) : 0);
  const below = familyTotal(g) - mine;
  return `우리 부부 ${formatMoney(mine)}${below ? ` · 자녀·손주 가족 ${formatMoney(below)}` : ''}`;
}

/** 자산 탭: 내년 가계부 */
function budgetCard(g: GameState): string {
  const f = forecast(g);
  const w = wallet(g);
  const row = (label: string, v: number, sign: '+' | '−') => `<div class="arow"><span>${esc(label)}</span><span class="${sign === '+' ? 'pos' : 'neg'}">${sign}${formatMoney(v)}</span></div>`;
  return `<section class="card">
    <h2>📒 내년 가계부 <small>(${w.label.replace(/^\S+ /, '')} 기준 · 예상)</small></h2>
    ${f.income.map(([l, v]) => row(l, v, '+')).join('') || '<div class="arow"><span>수입 없음</span><span></span></div>'}
    ${f.expense.map(([l, v]) => row(l, v, '−')).join('')}
    <div class="arow total"><span>한 해 남는 돈</span><b class="${f.net < 0 ? 'neg' : 'pos'}">${f.net < 0 ? '' : '+'}${formatMoney(f.net)}</b></div>
    ${f.mine ? `<p class="fine">독립 전이라 내 수입(${formatMoney(f.mine)})은 살림에 안 보태고 내 통장에 모인다.</p>` : ''}
    <p class="fine">월급은 세전 금액, 소득세·4대보험은 따로 빠진다 (연봉 3천 약 12%, 5천 16%, 1억 21%). 사업·크리에이터 수입과 시세는 해마다 출렁인다. 학년·진학 이벤트에서 고르는 사교육비는 따로 나간다.</p>
  </section>`;
}

function nav(): string {
  const tabs: [Tab, string][] = [
    ['tree', '가계도'],
    ['act', '행동'],
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
  if (ui.view === 'list') return toolbar + rosterScreen(g) + propertyStrip(g);

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
  </div>
  ${propertyStrip(g)}`;
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
    rows.push(`<div class="sh-row"><span>성적</span><span>${standingLabel(p)} · 사교육비 누적 ${formatMoney(p.eduSpent ?? 0)}</span></div>`);
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
      ${p.home ? `<div class="sh-row"><span>사는 집</span><span>${homeLine(g, p.home)}</span></div>` : ''}
      ${assetsOf(g, p.id).length ? `<div class="sh-row"><span>소유</span><span>${assetsOf(g, p.id).map((a) => `${ASSET_ICONS[a.kind]} ${esc(a.name)} ${formatMoney(a.value)}`).join('<br>')}</span></div>` : ''}
      ${p.cash < 0 ? `<div class="sh-row warn"><span>빚</span><span>${formatMoney(-p.cash)} (연 ${(debtRate(p) * 100).toFixed(1)}%)</span></div>` : ''}
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
      ${cur.choices.some((c) => c.cost) ? `<div class="ev-wallet">${wallet(g).label} <b>${formatMoney(wallet(g).amount)}</b></div>` : ''}
      <div class="choices">
        ${cur.choices
          .map(
            (c, i) => `<button class="choice" style="animation-delay:${140 + i * 55}ms" data-action="choose" data-i="${i}" ${c.disabled ? 'disabled' : ''}>
              <span class="cl">${esc(c.label)}</span>
              ${c.cost || c.req?.length ? `<span class="badges">${c.cost ? `<b class="cost">💰${formatMoney(c.cost)}</b>` : ''}${c.disabled && c.cost && c.cost > wallet(g).amount ? '<b class="why">돈 부족</b>' : ''}${(c.req ?? []).map((r) => `<b>${esc(r)}</b>`).join('')}</span>` : ''}
            </button>`,
          )
          .join('')}
      </div>
    </div>
  </div>`;
}

/** 결과 문장 끝의 "(매력 +2 · 행복 +6)"를 색깔 칩으로 */
function richText(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const m = line.match(/^(.*?) \(((?:[^()]|\([^()]*\))*(?:[+\-−]\d|변화 없음|등급)(?:[^()]|\([^()]*\))*)\)$/);
      if (!m) return esc(line);
      const chips = m[2]
        .split(' · ')
        .map((c, i) => `<span class="dchip ${/[\-−]\d|▼/.test(c) ? 'neg' : /\+\d|▲/.test(c) ? 'pos' : ''}" style="animation-delay:${180 + i * 90}ms">${esc(c)}</span>`)
        .join('');
      return `${esc(m[1])}<span class="dchips">${chips}</span>`;
    })
    .join('<br>');
}

function outcomeModal(o: { title: string; text: string }): string {
  const tier = o.text.startsWith('🌟') ? 'great' : o.text.startsWith('💦') ? 'bad' : '';
  return `
  <div class="modal" data-action="ok-outcome">
    <div class="event ${tier}" data-stop>
      <h3>${esc(o.title)}</h3>
      <p class="ev-text">${richText(o.text)}</p>
      <button class="btn primary" data-action="ok-outcome">계속</button>
    </div>
  </div>`;
}

function reportModal(r: { title: string; lines: string[] }): string {
  return `
  <div class="modal" data-action="ok-report">
    <div class="event report" data-stop>
      <h3>${esc(r.title)}</h3>
      <ul>${r.lines.map((l, i) => `<li style="animation-delay:${120 + Math.min(i, 12) * 45}ms">${esc(l)}</li>`).join('') || '<li class="muted">조용한 한 해였다.</li>'}</ul>
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
      ? `<section class="card"><h2>지금은 부모님 슬하</h2><p class="fine">${esc(relationLabel(g, hh))} ${esc(iga(fullName(hh)))} 살림을 꾸린다. 학비·학원비도 부모님 지갑에서 나간다. 독립하면(취업·결혼) 직접 가계를 맡는다.</p></section>`
      : ''
  }
  <section class="card">
    <h2>가주의 한 해</h2>
    <div class="field">생활 방식 ${seg('lifestyle', pol.lifestyle, Object.entries(LIFESTYLE_NAMES) as [string, string][])}</div>
    <p class="fine">일 중심: 승진↑ 건강↓ 금슬↓ · 가정 중심: 금슬↑ · 자기계발: 능력치↑ · 요양: 건강 회복${age(g, h) < 20 ? ' (성인이 되면 적용)' : ''}</p>
    <div class="field">생활 수준 ${seg('living', pol.living, Object.entries(LIVING_NAMES) as [string, string][])}</div>
    <p class="fine">검소: 생활비 ×0.7 · 행동력 2 · 성장 ×0.9 · 아이들이 아끼는 법을 배운다 · 벼룩시장·짠테크 이야기<br>보통: 생활비 ×1 · 행동력 3<br>호화: 생활비 ×1.8 · 행동력 4 · 성장 ×1.12 · 아이들 행복↑ 대신 씀씀이가 커진다 · VIP 파티·골프 회원권·투자 권유(사기 주의) 이야기<br>(행동력은 다음 해부터 바뀐다)</p>
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
                  : `<p class="fine">올해: ${sy >= 0 ? PLAN_NAMES[sy] : '—'} · 성적 ${standingLabel(c)} · 사교육비 누적 ${formatMoney(c.eduSpent ?? 0)}<br>학년이 바뀔 때마다 어떻게 보낼지 정한다.</p>`;
              return `<div class="kid">
                <div class="kid-h"><img class="px sm" src="${portraitURL(c, a)}"> ${esc(fullName(c))} · ${a}세 · ${esc(jobShort(g, c))}</div>
                ${body}
              </div>`;
            })
            .join('')
        : '<p class="hint">키울 아이가 없다.</p>'
    }
    <p class="fine">미취학: 기본 300만 · 사교육 1,200만 · 올인 3,000만 /년. 학령기부터는 해마다 학년 이벤트로 고른다.<br>사교육비가 쌓일수록 수능에 유리하지만, 아이의 행복은 줄어든다.</p>
  </section>
  <p class="fine" style="text-align:center">효과음·진동·글자 크기는 위쪽 ⚙ 설정에서.</p>`;
}

/** 자산 한 줄: 이름·시세·빚, 실거주면 표시 */
function assetRow(a: Asset, sellable: boolean, live = false): string {
  return `<div class="arow"><span>${ASSET_ICONS[a.kind]} ${esc(a.name)}${live ? ' <b class="tag home">실거주</b>' : ''}</span><span>${formatMoney(a.value)}${liab(a) ? ` <small class="neg">(빚 ${formatMoney(liab(a))})</small>` : ''} ${sellable ? `<button class="mini" data-action="sell" data-id="${a.id}">매도</button>` : ''}</span></div>`;
}

const pct = (v?: number) => (v === undefined ? '' : `<small class="${v >= 0 ? 'up' : 'down'}">${v >= 0 ? '▲' : '▼'}${Math.abs(v * 100).toFixed(1)}%</small>`);

function assetsScreen(g: GameState): string {
  const h = head(g);
  const skip = new Set([h.id, ...parentsOf(g, h).map((p) => p.id)]);
  const members = Object.values(g.people)
    .filter((p) => alive(p) && !skip.has(p.id) && (isMainline(g, p) || personWorth(g, p) !== 0))
    .sort((a, b) => personWorth(g, b) - personWorth(g, a));
  const recipients = Object.values(g.people).filter((p) => alive(p) && (isDescendantOf(g, p, h) || p.id === h.spouseId));
  const to = ui.giftTo && g.people[ui.giftTo] && alive(g.people[ui.giftTo]) ? g.people[ui.giftTo] : recipients[0];
  const mine = assetsOf(g, h.id);
  const et = estateTax(g, h);

  const units = TRADE_UNITS.map((u) => [u, formatMoney(u)] as const);
  return `
  ${
    householder(g).id !== h.id
      ? `<section class="bank">
    <div class="bank-l">🏠 우리 집 재산 (독립 전 · 부모님 살림)</div>
    <div class="bank-v">${formatMoney(parentsOf(g, h).filter(alive).reduce((t, p) => t + personWorth(g, p), 0) + familyTotal(g))}</div>
    <div class="bank-s">부모님 ${formatMoney(parentsOf(g, h).filter(alive).reduce((t, p) => t + personWorth(g, p), 0))} · 내 몫 ${formatMoney(personWorth(g, h))}<br>일을 해서 버는 돈은 내 통장에 모이고, 취직하거나 나이가 차면 독립한다.</div>
  </section>`
      : `<section class="bank">
    <div class="bank-l">${esc(g.familyName)}씨 가문 자산 <small>(나와 배우자, 그 아래 가족 모두의 재산 합계)</small></div>
    <div class="bank-v">${formatMoney(familyTotal(g))}</div>
    <div class="bank-s">${familyBreakdown(g)}</div>
  </section>`
  }
  ${mineCard(g)}
  ${homeCard(g)}
  ${vehicleCard(g)}
  ${parentsCard(g)}
  ${budgetCard(g)}

  ${
    members.length
      ? `<section class="card">
    <h2>가족 재산 <small class="muted">배우자·자녀·손주 등</small></h2>
    ${members
      .map(
        (p) => `<details class="pw">
          <summary><img class="px sm" src="${portraitURL(p, age(g, p))}"> <span>${esc(fullName(p))} <small>${esc(relationLabel(g, p))}</small></span><b>${formatMoney(personWorth(g, p))}</b></summary>
          ${holdingRows(g, p, false)}
        </details>`,
      )
      .join('')}
  </section>`
      : ''
  }

  ${realtyCard(g)}

  <section class="card">
    <h2>투자 시장 <small class="muted">가주 명의로 매수</small></h2>
    <div class="mkt">${(REAL_ESTATE as AssetKind[]).map((k) => `<span>${ASSET_ICONS[k]} ${ASSET_NAMES[k].replace('강남 ', '서울 ')} ${pct(g.marketChange[k as MarketKey])}</span>`).join('')}</div>
    ${(['stock', 'coin'] as const)
      .map(
        (k) => `<h4 class="sub">${ASSET_ICONS[k]} ${k === 'stock' ? '주식 (지수 ' + g.market.stock + ')' : '코인 (지수 ' + g.market.coin + ')'} ${pct(g.marketChange[k])}</h4>
        <div class="buy-row">${units
          .map(([u, l]) => {
            const margin = k === 'stock' && stockQuote(g, u, 0.003).loan > 0;
            return `<button class="mini ${margin ? 'margin' : ''}" data-action="buy" data-v="${k}" data-amt="${u}" ${canBuy(g, k, u) ? '' : 'disabled'}>+${l}${margin ? ' 신용' : ''}</button>`;
          })
          .join('')}</div>`,
      )
      .join('')}
    <p class="fine">내 돈으로 살 수 있는 한도 <b>${formatMoney(buyPower(g))}</b> (통장 순액, 빚은 뺀다)<br>주식: 배당 2%, 연 ±17% 출렁임. 돈이 모자라면 <b>신용융자</b>로 살 수 있다 (내 돈 60% 이상 · 연 ${(MARGIN_RATE * 100).toFixed(1)}% · 신용점수 600 이상). 평가액이 융자의 ${MAINTAIN * 100}% 밑으로 떨어지면 증권사가 <b>반대매매</b>로 강제로 판다.<br>코인: 빚내서 못 산다. 배당 없음, 반토막도 열 배도 흔하다 · 둘 다 상속세는 시가 100% 평가</p>
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
          <h4 class="sub">적립식 자동 증여 (해마다)</h4>
          ${seg('autogift', g.policy.autoGifts?.[to.id] ?? 0, AUTO_GIFT_STEPS.map((v) => [v, v ? formatMoney(v) : '안 함']), to.id)}
          <p class="fine">${esc(fullName(to))}에게 해마다 자동으로 보낸다. 10년 공제 한도(성인 5천만)를 나눠 쓰면 세금이 거의 없다.</p>
          ${
            Object.entries(g.policy.autoGifts ?? {}).filter(([, v]) => v).length
              ? `<div class="auto-list">${Object.entries(g.policy.autoGifts ?? {})
                  .filter(([id, v]) => v && g.people[id])
                  .map(([id, v]) => `<div class="arow"><span>🔁 ${esc(fullName(g.people[id]))}</span><span>연 ${formatMoney(v)}</span></div>`)
                  .join('')}</div>`
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

const AUTO_GIFT_STEPS = [0, 300, 500, 1000, 2500, 5000];

/** 행동 탭: 턴을 넘기기 전에 직접 하는 일. 분류 칩으로 한 묶음씩 보여 줘서 스크롤을 줄인다 */
function actionsScreen(g: GameState): string {
  const ap = apLeft(g);
  const list = ACTIONS.filter((a) => forHead(g, a));
  const cats = [...new Set(list.map((a) => a.cat))] as ActionCat[];
  const cat = ui.actCat && cats.includes(ui.actCat as ActionCat) ? (ui.actCat as ActionCat) : cats[0];
  const money = canSpend(g);
  const car = vehicleAP(g);
  const row = (a: (typeof list)[number]) => {
    const targets = a.targets?.(g) ?? [];
    const blocked = a.blocked?.(g, targets[0]);
    const used = g.actUsed?.[a.id] ?? 0;
    const disabled = ap < a.ap || !!blocked || (a.cost ?? 0) > money;
    const why = blocked ?? ((a.cost ?? 0) > money ? '돈 부족' : ap < a.ap ? '행동력 부족' : used ? `올해 ${used}번 · 효과↓` : '');
    return `<div class="act ${disabled ? 'off' : ''}">
      <span class="act-i">${a.icon}</span>
      <div class="act-m">
        <b>${a.name}</b>
        <small>${esc(a.desc)}</small>
        <span class="badges">${a.ap ? `<b>⚡${a.ap}</b>` : '<b>무료</b>'}${a.cost ? `<b class="cost">💰${formatMoney(a.cost)}</b>` : ''}${why ? `<b class="why">${esc(why)}</b>` : ''}</span>
        ${targets.length > 1 ? `<select id="act-t-${a.id}">${targets.map((p) => `<option value="${p.id}">${esc(fullName(p))} (${esc(relationLabel(g, p))}·${age(g, p)})</option>`).join('')}</select>` : targets.length ? `<input type="hidden" id="act-t-${a.id}" value="${targets[0].id}"><small class="to">→ ${esc(fullName(targets[0]))}</small>` : ''}
      </div>
      <button class="mini do" data-action="act" data-id="${a.id}" ${disabled ? 'disabled' : ''}>하기</button>
    </div>`;
  };
  return `
  <section class="ap-bar">
    <div><b>올해 할 일</b> <small>${STAGE_NAMES[stageOf(g, head(g))]}${TRACK_NAMES[trackOf(g, head(g)) ?? ''] ? ` · ${TRACK_NAMES[trackOf(g, head(g))!]}` : ''}</small></div>
    <span class="ap" title="행동력: 생활 수준 검소 2·보통 3·호화 4${car ? ` + 탈것 ${car}` : ''}">${'●'.repeat(ap)}${'○'.repeat(Math.max(0, apMax(g) - ap))}</span>
  </section>
  <div class="cat-chips">${cats
    .map((c) => {
      const n = list.filter((a) => a.cat === c).length;
      return `<button data-action="act-cat" data-v="${c}" class="${c === cat ? 'on' : ''}">${c} <small>${n}</small></button>`;
    })
    .join('')}</div>
  <section class="card acts">${list.filter((a) => a.cat === cat).map(row).join('')}</section>
  <details class="card more-help"><summary>도움말 · 다른 할 일</summary>
    <p class="fine">행동력 ${apMax(g)} = 생활 수준 ${LIVING_NAMES[g.policy.living]} (검소 2 · 보통 3 · 호화 4)${car ? ` + 탈것 ${car}` : ' · 차를 사면 +1, 요트는 +1 더'}. 같은 일을 한 해에 여러 번 하면 효과가 줄고 지친다. 인생 단계가 바뀌면 할 수 있는 일도 바뀐다.</p>
    <p class="fine">부동산·주식·자동차 매매, 증여, 유언장 → <button class="mini" data-action="tab" data-v="assets">자산 탭</button> · 교육 방침·생활 방식 → <button class="mini" data-action="tab" data-v="policy">방침 탭</button> · 후계자·은퇴 → 가계도에서 인물을 눌러서</p>
  </details>`;
}

/** ⚙ 설정 창 */
function settingsModal(g: GameState): string {
  const h = head(g);
  return `
  <div class="modal" data-action="close-sheet">
    <div class="sheet settings" data-stop>
      <h2>⚙ 설정</h2>
      <div class="set-row"><span>효과음</span>${seg('sound', soundOn() ? 1 : 0, [[1, '🔊 켜기'], [0, '🔇 끄기']])}</div>
      <div class="set-row"><span>진동</span>${seg('pref-vibe', vibeOn() ? 1 : 0, [[1, '📳 켜기'], [0, '끄기']])}</div>
      <div class="set-row"><span>움직임</span>${seg('pref-calm', prefs.calm ? 1 : 0, [[0, '보통'], [1, '줄이기']])}</div>
      <div class="set-row"><span>글자 크기</span>${seg('pref-text', prefs.text ?? 'm', [['s', '작게'], ['m', '보통'], ['l', '크게']])}</div>
      <div class="set-row"><span>가계도 보기</span>${seg('zoom', ui.zoom, [['big', '크게'], ['mid', '보통'], ['small', '작게']])}</div>
      <div class="set-info">
        <div class="sh-row"><span>가문</span><span>${esc(g.familyName)}씨 ${g.generation}대 · ${g.year}년</span></div>
        <div class="sh-row"><span>가주</span><span>${esc(fullName(h))} ${age(g, h)}세</span></div>
        <div class="sh-row"><span>저장</span><span>해마다 이 기기(브라우저)에 자동 저장</span></div>
      </div>
      ${
        ui.confirmReset
          ? `<div class="danger"><p>지금 가문을 지우고 처음부터 시작할까? 되돌릴 수 없다.</p>
             <div class="row2"><button class="btn" data-action="reset-cancel">아니, 계속할래</button><button class="btn warn" data-action="restart">지우고 새로 시작</button></div></div>`
          : `<button class="btn ghost wide" data-action="reset-ask">🗑 새 가문 시작…</button>`
      }
      <button class="btn big" data-action="close-sheet">닫기</button>
    </div>
  </div>`;
}

/** 부동산·탈것 → 도트 그림 종류 */
function spriteOf(g: GameState, a: Asset): BuildingKind {
  if (a.kind === 'vehicle') return (modelOf(a)?.sprite ?? 'car') as BuildingKind;
  if (a.kind === 'apt_seoul') return a.value >= g.market.apt_seoul * 1.6 ? 'luxury' : 'tower';
  if (a.kind === 'apt_local') return 'apt';
  if (a.kind === 'land') return 'land';
  if (a.kind === 'building') return a.tags?.includes('상가') ? 'shop' : a.tags?.includes('주택') ? 'officetel' : 'building';
  return 'house';
}

const seedOf = (id: string) => [...id].reduce((t, c) => t + c.charCodeAt(0), 0);

/** 가계도 아래: 사는 집과 가진 부동산·탈것을 도트 그림으로 */
function propertyStrip(g: GameState): string {
  const me = head(g);
  const sp = spouseOf(g, me);
  const r = residence(g);
  const tiles: { img: string; tag: string; cls: string; name: string; val: string }[] = [];
  const home = r.home;
  if (home) {
    const own = home.type === 'own' ? g.assets.find((x) => x.id === home.assetId) : undefined;
    tiles.push({
      img: buildingURL(own ? spriteOf(g, own) : (TIER_SPRITE[home.tier] ?? 'house'), seedOf(home.name)),
      tag: r.withParents ? '🏠 부모님 댁' : `🏠 ${HOME_TYPE[home.type]}`,
      cls: 'live',
      name: home.name,
      val: own ? `시세 ${formatMoney(own.value)}` : home.type === 'jeonse' ? `보증금 ${formatMoney(home.deposit)}` : home.type === 'wolse' ? `월세 연 ${formatMoney(home.rent)}` : '',
    });
  }
  const liveId = home?.type === 'own' ? home.assetId : undefined;
  const ownerIds = [me.id, ...(sp && alive(sp) ? [sp.id] : [])];
  const parIds = r.withParents ? parentsOf(g, me).filter(alive).map((p) => p.id) : [];
  const push = (a: Asset, mine: boolean) => {
    if (a.id === liveId) return;
    const car = a.kind === 'vehicle';
    tiles.push({
      img: buildingURL(spriteOf(g, a), seedOf(a.id)),
      tag: car ? (mine ? `${modelOf(a)?.icon ?? '🚗'} ${modelOf(a)?.yacht ? '요트' : '내 차'}` : '🚗 부모님 차') : mine ? (isHouse(a) ? '💼 임대' : '💼 투자') : '👪 부모님',
      cls: car ? 'car' : mine ? 'inv' : 'par',
      name: a.name,
      val: formatMoney(a.value),
    });
  };
  for (const a of g.assets) if (ownerIds.includes(a.ownerId) && (isRealty(a) || a.kind === 'vehicle')) push(a, true);
  for (const a of g.assets) if (parIds.includes(a.ownerId) && (isRealty(a) || a.kind === 'vehicle')) push(a, false);
  return `<section class="props">
    <h3>🏘 우리 집 · 가진 것 <small>${tiles.length ? '누르면 자산 탭' : ''}</small></h3>
    <div class="prop-row">${
      tiles.length
        ? tiles
            .map(
              (x) => `<button class="prop ${x.cls}" data-action="tab" data-v="assets">
          <img src="${x.img}" alt="">
          <span class="p-tag">${esc(x.tag)}</span>
          <span class="p-nm">${esc(x.name)}</span>
          ${x.val ? `<span class="p-v">${x.val}</span>` : ''}
        </button>`,
            )
            .join('')
        : '<p class="hint">아직 가진 게 없다.</p>'
    }</div>
  </section>`;
}

/** 🚗 탈것: 자동차·요트 */
function vehicleCard(g: GameState): string {
  const me = head(g);
  if (!canDrive(g, me)) return '';
  const mine = myVehicles(g);
  const money = householder(g).id === me.id ? canSpend(g) : Math.max(0, me.cash);
  const ap = vehicleAP(g);
  return `<section class="card">
    <h2>🚗 탈것 <small class="muted">${ap ? `행동력 +${ap} 받는 중` : '차가 있으면 행동력 +1, 요트는 +1 더'}</small></h2>
    ${
      mine.length
        ? mine
            .map((a) => {
              const m = modelOf(a);
              return `<div class="arow veh"><span><img class="vpx" src="${buildingURL(spriteOf(g, a), seedOf(a.id))}" alt=""> ${esc(a.name)}<br><small class="muted">${g.year - (a.bought ?? g.year)}년째 · 유지비 연 ${formatMoney(Math.round((m?.upkeep ?? 0) * wageIndex(g.year)))}</small></span>
              <span>${formatMoney(a.value)} <button class="mini" data-action="sell" data-id="${a.id}">팔기</button></span></div>`;
            })
            .join('')
        : '<p class="fine">차가 없다. 대중교통으로 다닌다.</p>'
    }
    ${me.flags.includes('license') ? '' : `<p class="fine">🚦 운전면허가 없다. <button class="mini" data-action="tab" data-v="act">행동 탭</button>에서 먼저 면허를 따야 차를 살 수 있다 (학원비 약 77만).</p>`}
    <details class="moves"><summary>매장 둘러보기</summary>
      ${VEHICLES.map((m) => {
        const price = vehiclePrice(g, m);
        const tax = Math.round(price * m.tax);
        return `<div class="arow veh"><span><img class="vpx" src="${buildingURL(m.sprite, seedOf(m.id))}" alt=""> ${m.icon} ${esc(m.name)}<br><small class="muted">${esc(m.note)}<br>취득세 ${formatMoney(tax)} · 유지비 연 ${formatMoney(Math.round(m.upkeep * wageIndex(g.year)))} · 감가 연 ${Math.round(m.dep * 100)}%</small></span>
        <span class="buy-c"><b>${formatMoney(price)}</b><button class="mini" data-action="buy-car" data-id="${m.id}" ${money >= price + tax && me.flags.includes('license') ? '' : 'disabled'}>구입</button></span></div>`;
      }).join('')}
      <p class="fine">가격은 2025년 국내 신차가 대략치(트림에 따라 폭이 크다)에 물가를 반영. 취득세: 승용차 7% · 경차 4%(75만 감면) · 선박 3%, 고급선박 중과. 유지비엔 보험·자동차세·연료·정비(요트는 계류비·관리)가 들어 있고, 해마다 가계부에서 빠진다. 차는 15년쯤 타면 폐차.</p>
    </details>
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

const SFX: Record<string, Sfx> = { choose: 'choose', next: 'next', buy: 'coin', 'buy-l': 'coin', repay: 'coin', sell: 'coin', gift: 'coin', 'gift-asset': 'coin', 'ok-outcome': 'close', 'ok-report': 'close', 'close-sheet': 'close', start: 'great', 'buy-car': 'coin' };
let leaving = false;

function onClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  const el = target.closest<HTMLElement>('[data-action]');
  if (!el || leaving) return;
  // 창 바깥(빈 곳)을 누르면 닫히고, 창 안쪽 글자를 누르는 건 무시
  if (el.classList.contains('modal') && target.closest('[data-stop]') && !target.closest('button')) return;
  if ((el as HTMLButtonElement).disabled) return;
  const a = el.dataset.action!;
  if (a !== 'act') sfx(SFX[a] ?? 'tap');
  buzz(a === 'next' || a === 'choose' ? 12 : 6);
  // 창을 닫을 땐 내려가는 모습을 보여 주고 처리
  if (a === 'ok-outcome' || a === 'ok-report' || a === 'close-sheet') {
    const m = root.querySelector('.modal');
    if (m) {
      leaving = true;
      m.classList.add('leaving');
      setTimeout(() => {
        leaving = false;
        fx.modalKey = '';
        handle(el);
      }, 170);
      return;
    }
  }
  handle(el);
}

function handle(el: HTMLElement) {
  const a = el.dataset.action!;
  const v = el.dataset.v!;
  const id = el.dataset.id!;
  const g = ui.game;

  switch (a) {
    case 'setup-sex':
      ui.setup.sex = v as Sex;
      break;
    case 'setup-origin':
      ui.setup.origin = v as Difficulty | 'random';
      break;
    case 'continue':
      ui.game = load();
      track('continue', '이어하기');
      break;
    case 'start': {
      const sn = (ui.setup.surname || '김').slice(0, 2);
      ui.game = newGame({ familyName: sn, sex: ui.setup.sex, difficulty: ui.setup.origin === 'random' ? undefined : ui.setup.origin });
      ui.tab = 'tree';
      track(`start-${ui.setup.origin}`, `새 가문 (${ui.setup.origin})`);
      break;
    }
    case 'restart':
      clearSave();
      hasSave = false;
      ui.game = null;
      ui.report = ui.outcome = ui.sheet = undefined;
      ui.settings = ui.confirmReset = false;
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
    case 'sound':
      setSound(v === '1');
      savePrefs();
      if (v === '1') sfx('choose');
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
      ui.settings = ui.confirmReset = false;
      break;
    case 'settings':
      ui.settings = true;
      ui.confirmReset = false;
      break;
    case 'reset-ask':
      ui.confirmReset = true;
      break;
    case 'reset-cancel':
      ui.confirmReset = false;
      break;
    case 'pref-vibe':
      setVibe(v === '1');
      savePrefs();
      if (v === '1') buzz(30);
      break;
    case 'pref-calm':
      prefs.calm = v === '1';
      savePrefs();
      break;
    case 'pref-text':
      prefs.text = v as TextSize;
      savePrefs();
      break;
    case 'act-cat':
      ui.actCat = v;
      break;
    case 'buy-car': {
      const r = buyVehicle(g!, id);
      if (r.ok) ui.outcome = { title: '🔑 새 탈것', text: r.text };
      else (ui.toast = r.text), sfx('error');
      break;
    }
    case 'next':
      if (!g) break;
      if (!g.events.length) {
        const start = g.log.length;
        const gen = g.generation;
        simulateYear(g);
        if (g.generation > gen) track(`generation-${g.generation}`, `${g.generation}대 도달`);
        if (g.gameOver) track('gameover', '게임 오버');
        if (g.year % 10 === 0) track(`played-${g.year}`, `${g.year}년 도달`);
        const lines = g.log.slice(start).filter((l) => !l.text.startsWith('──')).map((l) => l.text);
        ui.report = { title: `📜 ${g.year}년`, lines };
        ui.tab = 'tree'; // 새해는 가계도에서 맞는다
        ui.sheet = undefined;
        window.scrollTo(0, 0);
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
    case 'buy-l': {
      const l = g!.listings?.find((x) => x.id === id);
      const me = head(g!);
      const firstHome = !!l && l.house && !l.deposit && homesOf(g!, me).length === 0;
      ui.toast = buyListing(g!, id);
      if (!ui.toast.includes('매수!')) sfx('error');
      else if (firstHome && householder(g!).id === me.id) {
        const a = g!.assets[g!.assets.length - 1];
        ui.outcome = { title: '🏡 내 집 마련', text: ui.toast + '\n' + moveInto(g!, me, a) };
        ui.toast = undefined;
      }
      break;
    }
    case 'move': {
      const r = moveTo(g!, head(g!), id, v as 'jeonse' | 'wolse');
      if (r.startsWith('이사할 수 없다')) (ui.toast = r), sfx('error');
      else ui.outcome = { title: '🚚 이사', text: r };
      break;
    }
    case 'buy-home': {
      const r = buyCurrentHome(g!, head(g!));
      if (r.startsWith('살던 집을 샀다')) ui.outcome = { title: '🏡 내 집 마련', text: r };
      else (ui.toast = r), sfx('error');
      break;
    }
    case 'repay': {
      const a = g!.assets.find((x) => x.id === id);
      if (a) ui.toast = repayLoan(g!, a, head(g!).cash);
      break;
    }
    case 'buy':
      ui.toast = buyAsset(g!, v as AssetKind, Number(el.dataset.amt ?? 0));
      break;
    case 'autogift': {
      const gifts = (g!.policy.autoGifts ??= {});
      if (Number(v)) gifts[id] = Number(v);
      else delete gifts[id];
      ui.toast = Number(v) ? `해마다 ${formatMoney(Number(v))}씩 증여한다` : '자동 증여를 멈췄다';
      break;
    }
    case 'act': {
      const target = (root.querySelector(`#act-t-${id}`) as HTMLSelectElement | null)?.value;
      const r = doAction(g!, id, target);
      sfx(!r.ok ? 'error' : r.text.startsWith('🌟') ? 'great' : r.text.startsWith('💦') ? 'bad' : 'choose');
      if (!r.ok) ui.toast = r.text;
      else ui.outcome = { title: ACTIONS.find((a) => a.id === id)!.name, text: r.text };
      break;
    }
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
