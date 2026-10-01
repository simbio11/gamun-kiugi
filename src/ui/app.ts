import { standingLabel } from '../core/school';
import { sideJobOf, sideTrackOf, TRACK_NAMES, trackOf } from '../core/tracks';
import { HOME_TYPE, buyCurrentHome, homeBuyQuote, moveInQuote, moveInto, moveIntoOwned, moveQuote, moveTo, ownedHomes, residence, tierOf, tiers } from '../core/housing';
import { creditGrade, debtRate, inRehab, walletNet } from '../core/debt';
import { fixJosa, iga } from '../core/ev-util';
import { LOAN_RATE, liab, acqTax, buyListing, buyQuote, gainsTax, homesOf, isHouse, isPrimary, isRealty, rentable, repayLoan, yieldOf } from '../core/realty';
import { buzz, floatDelta, rollNumber, setSound, setVibe, sfx, soundOn, vibeOn, type Sfx } from './fx';
import { buildingURL, TIER_SPRITE, type BuildingKind } from '../render/building';
import { wageIndex } from '../core/pay';
import { buyPower, MAINTAIN, MARGIN_RATE, stockQuote } from '../core/leverage';
import { fitCats, interestSummary, temperamentLine } from '../core/interests';
import { JOB_CATS } from '../core/jobs';
import { buyTreasure, goldIndex, treasureOf, treasurePrice, treasureSellValue, TREASURE_BY_ID, TREASURES } from '../core/treasure';
import { buyVehicle, canDrive, modelOf, myVehicles, vehicleAP, vehiclePrice, vehicleTax, VEHICLES } from '../core/vehicle';
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
import { advisorFee, assessedValue, assetsOf, forecast, formatMoney, jobTitle, levelYears, personWorth, setMoneyYear, setNominal } from '../core/economy';
import { estateTax, previewAssetGiftTax, previewGiftTax } from '../core/estate';
import { spendable } from '../core/events';
import { age, alive, childrenOf, fullName, head, householder, isDescendantOf, isMainline, livingMainlineMinors, parentsOf, relationLabel, siblingsOf, spouseOf } from '../core/people';
import { MISSIONS } from '../core/missions';
import { rivalLine, rivalMood } from '../core/rival';
import { FOCUS_LABEL, focusOf } from '../core/spouse';
import { govOf } from '../core/history';
import { epochOf, newsMedium, newsStyle, type AlertMedia } from '../core/timeline';
import { warChip } from '../core/war';
import { anachronistic, periodize, setHistCur } from '../core/histpack';
import { jeonseRatio, LEASE_NAME, leaseOf, setLease, type Lease } from '../core/tenant';
import { WOES, woesOf } from '../core/woes';
import { chooseSuccessor } from '../core/estate';
import { HONOR_JOBS, scandalLabel } from '../core/scandal';
import { willLine, willOf } from '../core/autonomy';
import { buyPerk, HONORS, PERKS, perkCost, perkLv, RANKS, RARITY_NAME, rankOf, type Reward } from '../core/rewards';
import { fameNeed } from '../core/career';
import { activeSynergies, CARD, CARD_THEME, CARDS, cardNo, cardTitle, effText, SYN_THEME, SYNERGIES, tierOf as cardTier, type CardDef } from '../core/cards';
import { applyTheme, type Theme as HeadTheme } from './theme';
import { BIG_BY_ID } from '../core/big-events';

const EVENT_BANNERS = import.meta.glob<string>('../assets/events/*.webp', { eager: true, import: 'default' });

export function eventBannerURL(key: string): string | undefined {
  const entry = Object.entries(EVENT_BANNERS).find(([p]) => p.endsWith(`/${key}.webp`));
  return entry ? entry[1] : undefined;
}

const BIG_BANNER_MAP: Record<string, string> = {
  race: 'race',
  suneung: 'suneung',
  auction: 'auction',
  audition: 'audition',
  quiz: 'quiz',
  cook: 'cooking',
  stocks: 'stock_battle',
  baduk: 'chess',
  debate: 'election',
  flight: 'hospital',
  fishing: 'yacht',
  marathon: 'golf',
  everest: 'yacht',
  fire: 'hospital',
};

const SUMMIT_BANNER_MAP: Record<string, string> = {
  summit_best_actor: 'best_actor',
  summit_architect: 'architect',
  summit_media_mogul: 'media_mogul',
  summit_space_founder: 'space_founder',
  summit_president: 'president',
  summit_nobel: 'nobel',
  summit_famed_doctor: 'hospital',
  summit_turing: 'start_pitch',
  summit_mayor: 'election',
  summit_constitutional: 'trial',
  summit_ent_chair: 'audition',
  summit_national_mc: 'audition',
  summit_national_singer: 'audition',
  summit_bigtech: 'start_pitch',
  summit_hedge_fund: 'stock_battle',
  summit_astronaut: 'space_founder',
};
import { CAPTION, newsPhotoKey, newsPhotoURL, realPhoto } from '../render/newsphoto';
import { NEWS_CREDITS } from '../render/news-credits';
import { hiddenCardHTML, hiddenArt, initHiddenVideos } from './hidden-card';
import { KIN_NAME, kinGap, kinOf } from '../core/inlaws';
import { photoURL } from '../render/photo';
import { minYears, rankWord } from '../core/rank';
import { PHOTO_NAME } from '../core/photos';
import { HIDDEN_BY_ID, isSuperHidden } from '../core/hidden-data';
import { cardBackURL, cardFrontURL, crestURL, customFrames, medalURL, type Theme } from '../render/cardart';
import { familyScore, lifeGrade, lifeParts } from '../core/score';
import { pendingAffairs } from '../core/fate';
import { ACTIONS, STAGE_NAMES, apLeft, apMax, doAction, forHead, stageOf, type ActionCat } from '../core/actions';
import { spendable as canSpend } from '../core/ev-util';
import { writeWill } from '../core/family';
import {
  aptitudeTest,
  testCost,
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
import { sceneArtURL, sceneFor } from '../render/scene';
import { bustURL } from '../render/bust';
import { kitPortraitURL, onKitReady } from '../render/kit';
import { commEvent, pcOf, phoneOf, type CommKind } from '../core/devices';

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
  /** 큰 거래(차·집·건물·땅·그림·현물) 전에 한 번 더 묻는다 */
  trade?: { a: string; id: string; v?: string; amt?: string; icon: string; title: string; lines: string[]; sell: boolean };
  /** 거래가 끝난 순간의 도장 연출 */
  stamp?: { sell: boolean; icon: string; text: string; n: number };
  toast?: string;
  giftTo?: string;
  settings?: boolean;
  /** 저장 슬롯·코드 안내 한 줄 */
  saveMsg?: string;
  actCat?: string;
  /** 행동 탭: 겸직 탭을 보는 중 */
  actSide?: boolean;
  assetSub?: string;
  /** 크게 보고 있는 명예의 전당 카드 */
  cardView?: string;
  /** 크게 보고 있는 카드의 성별 토글 */
  viewerSex?: 'M' | 'F';
  /** 훈장 보기: g.honors 인덱스 */
  honorView?: number;
  /** 업적 탭에서 펼친 목록 (카드 도감·시너지) */
  open?: Record<string, boolean>;
  confirmReset?: boolean;
  /** 가문이 끝난 뒤 연대기를 보는 중 (결과 창을 잠시 내린다) */
  overLog?: boolean;
  /** 행동력 남았을 때 턴 넘김 경고 모달 */
  apWarnModal?: { ap: number };
  setup: { surname: string; sex: Sex; origin: Difficulty | 'random'; era?: 'modern' | 'history' };
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
  /** 가주 테마 (나이·희귀 직업에 따라 화면 분위기) — 기본 켜짐 */
  theme?: boolean;
  text?: TextSize;
  money?: 'nominal' | 'real';
}
const prefs: Prefs = loadPrefs();
setNominal(prefs.money !== 'real');
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

/** 테스트 모드 여부: 로컬 개발 환경(Vite DEV)이거나 ?test=1 / ?debug=1 파라미터가 있을 때만 활성화 */
export function isTestMode(): boolean {
  if (typeof window === 'undefined') return false;
  if (import.meta.env.DEV) return true;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has('test') || params.has('debug')) return true;
    if (localStorage.getItem('gamun_test_mode') === '1') return true;
  } catch {
    /* noop */
  }
  return false;
}

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const g = raw ? migrate(JSON.parse(raw) as GameState) : null;
    return g;
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
// ───────── 저장 슬롯 (자동 저장과 별개로 3칸) · 저장 코드 (다른 기기로 옮기기) ─────────
const SLOT_KEY = (i: number) => `gamun-kiugi-slot-${i}`;
interface SlotInfo {
  label: string;
  at: number;
}
function slotInfo(i: number): SlotInfo | null {
  try {
    const raw = localStorage.getItem(SLOT_KEY(i) + '-info');
    return raw ? (JSON.parse(raw) as SlotInfo) : null;
  } catch {
    return null;
  }
}
const slotLabel = (g: GameState) => `${g.familyName}씨 ${g.generation}대 · ${g.year}년 · ${fullName(head(g))} ${age(g, head(g))}세`;
function saveSlot(i: number): boolean {
  try {
    if (!ui.game) return false;
    localStorage.setItem(SLOT_KEY(i), JSON.stringify(ui.game));
    localStorage.setItem(SLOT_KEY(i) + '-info', JSON.stringify({ label: slotLabel(ui.game), at: Date.now() }));
    return true;
  } catch {
    return false;
  }
}
function loadSlot(i: number): GameState | null {
  try {
    const raw = localStorage.getItem(SLOT_KEY(i));
    return raw ? migrate(JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
  }
}
function deleteSlot(i: number) {
  try {
    localStorage.removeItem(SLOT_KEY(i));
    localStorage.removeItem(SLOT_KEY(i) + '-info');
  } catch {
    /* noop */
  }
}
/** 저장 코드: 게임 상태 JSON을 base64로 (유니코드 안전) */
const CODE_HEAD = 'GAMUN1:';
function exportCode(g: GameState): string {
  const bytes = new TextEncoder().encode(JSON.stringify(g));
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return CODE_HEAD + btoa(bin);
}
function importCode(code: string): GameState | null {
  try {
    const t = code.trim();
    if (!t.startsWith(CODE_HEAD)) return null;
    const bin = atob(t.slice(CODE_HEAD.length));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const g = JSON.parse(new TextDecoder().decode(bytes)) as GameState;
    return g && g.people && g.headId ? migrate(g) : null;
  } catch {
    return null;
  }
}
const whenLabel = (at: number) => {
  const d = new Date(at);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
/** 슬롯 목록 (설정: 저장·불러오기·삭제 / 첫 화면: 불러오기만) */
function slotRows(inGame: boolean): string {
  return [1, 2, 3]
    .map((i) => {
      const inf = slotInfo(i);
      return `<div class="slot ${inf ? '' : 'empty'}">
        <div class="slot-i"><b>슬롯 ${i}</b><small>${inf ? `${esc(inf.label)}<br>${whenLabel(inf.at)} 저장` : '비어 있음'}</small></div>
        <div class="slot-b">${inGame ? `<button class="mini" data-action="slot-save" data-v="${i}">${inf ? '덮어쓰기' : '저장'}</button>` : ''}${inf ? `<button class="mini" data-action="slot-load" data-v="${i}">불러오기</button>` : ''}${inf && inGame ? `<button class="mini ghost" data-action="slot-del" data-v="${i}">🗑</button>` : ''}</div>
      </div>`;
    })
    .join('');
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
  if (ui.cardView || ui.honorView !== undefined) return (ui.cardView = ui.honorView = undefined), (fx.modalKey = ''), render(), true;
  if (ui.outcome) return (ui.outcome = undefined), (fx.modalKey = ''), render(), true;
  if (ui.game?.rewards?.length) return ui.game.rewards.shift(), (fx.modalKey = ''), render(), true;
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
  root.addEventListener('pointermove', tilt);
  root.addEventListener('pointerdown', spinStart);
  root.addEventListener('pointermove', spinMove);
  root.addEventListener('pointerup', spinEnd);
  root.addEventListener('pointercancel', spinEnd);
  root.addEventListener('pointerleave', tilt, true);
  initHiddenVideos(); // 히든 카드 영상 (한 번만 연결)
  render();
}

// ─────────────────────────── 렌더 ───────────────────────────

/** 그리다 오류가 나면 옛 창(닫히는 중이라 투명한 창)이 화면을 덮어 클릭을 먹는다: 문제 된 창을 치우고 다시 그린다 */
function render() {
  try {
    renderInner();
  } catch (e) {
    console.error(e);
    const g = ui.game;
    if (g?.rewards?.length) g.rewards.shift();
    ui.outcome = ui.report = undefined;
    ui.cardView = ui.honorView = undefined;
    try {
      renderInner();
    } catch (e2) {
      console.error(e2);
      root.querySelectorAll('.modal').forEach((m) => m.remove());
    }
  }
}

function apWarnModalHTML(ap: number): string {
  return `
  <div class="modal" data-action="close-ap-warn">
    <div class="event" data-stop style="max-width:340px;text-align:center;padding:24px 20px;">
      <div style="font-size:36px;margin-bottom:8px;">⚡</div>
      <h3 style="margin:0 0 10px;font-size:18px;">행동력이 남아 있습니다</h3>
      <p class="ev-text" style="font-size:14px;line-height:1.6;color:#e8e0d5;">
        아직 사용하지 않은 행동력이 <b>${ap}</b> 남았습니다.<br>
        올해의 할 일을 더 하지 않고 다음 해로 넘어가시겠습니까?
      </p>
      <div style="margin:16px 0 18px;font-size:12px;color:#aaa;display:flex;align-items:center;justify-content:center;">
        <label style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;user-select:none;">
          <input type="checkbox" id="chk-suppress-ap-warn" style="accent-color:#e04070;width:15px;height:15px;">
          해당 경고를 다시는 표시하지 않음
        </label>
      </div>
      <div class="row2" style="display:flex;gap:10px;">
        <button class="btn ghost" data-action="close-ap-warn" style="flex:1;">행동하러 가기</button>
        <button class="btn primary" data-action="confirm-next-turn" style="flex:1;">턴 넘기기</button>
      </div>
    </div>
  </div>`;
}

function renderInner() {
  const g = ui.game;
  if (g) setMoneyYear(g.year), setHistCur(g); // 성향(MBTI) 표시 같은 시대 판단을 화면에도
  root.classList.toggle('calm', !!prefs.calm);
  // 근현대사 모드: 시대 분위기 (1960~70년대 신문지·1980년대·1990~2000년대)
  const hy = ui.game?.era === 'history' && ui.game.year <= 2025 ? ui.game.year : 0;
  root.classList.toggle('hist', !!hy);
  root.dataset.decade = hy ? (hy < 1980 ? '60' : hy < 1990 ? '80' : '90') : '';
  // 먼 미래: 시대마다 화면 빛깔이 달라진다 (2040년대 로봇 → 2050년대 녹색 → 2060~70년대 우주 → 2080년대 신인류 → 22세기)
  const fy = ui.game && ui.game.year >= 2040 ? ui.game.year : 0;
  root.classList.toggle('fut', !!fy);
  root.dataset.epoch = fy ? epochOf(fy).theme : '';
  root.classList.toggle('wartime', ui.game?.war?.phase === 'war');
  root.classList.toggle('text-s', prefs.text === 's');
  root.classList.toggle('text-l', prefs.text === 'l');
  const theme = applyTheme(root, ui.game ?? undefined, prefs.theme !== false);
  fx.theme = theme;
  if (!g) {
    root.innerHTML = titleScreen();
    return;
  }
  // 일반 보상은 화면을 막지 않고 위에 반짝 떴다 사라진다
  const commons = (g.rewards ?? []).filter((r) => r.rarity === 'common');
  if (commons.length) {
    g.rewards = g.rewards!.filter((r) => r.rarity !== 'common');
    for (const r of commons) fx.chips.push({ id: r.id, text: `${r.icon} ${r.title}`, pts: r.pts });
    sfx('coin');
    for (const r of commons) setTimeout(() => ((fx.chips = fx.chips.filter((c) => c.id !== r.id)), root.querySelector(`.rw-chip[data-id="${r.id}"]`)?.remove()), 3600);
  }
  let modal = '';
  let modalKey = '';
  if (g.gameOver && !ui.overLog) (modal = gameOverModal(g)), (modalKey = 'over');
  else if (ui.apWarnModal) (modal = apWarnModalHTML(ui.apWarnModal.ap)), (modalKey = 'apwarn');
  else if (ui.trade) (modal = tradeModal(ui.trade)), (modalKey = 'trade' + ui.trade.a + ui.trade.id);
  else if (ui.report) (modal = reportModal(ui.report)), (modalKey = 'rep' + ui.report.title);
  else if (ui.outcome) (modal = outcomeModal(ui.outcome)), (modalKey = 'out' + ui.outcome.title + ui.outcome.text);
  else if (g.rewards?.length) {
    const rw = g.rewards[0];
    modal = rewardModal(rw);
    modalKey = 'rw' + rw.id;
    if (fx.rewardShown !== rw.id) {
      fx.rewardShown = rw.id;
      sfx(rw.rarity === 'legend' ? 'legend' : rw.rarity === 'epic' ? 'fanfare' : 'great');
      buzz(rw.rarity === 'legend' ? 180 : rw.rarity === 'epic' ? 90 : 40);
    }
  }
  else if (ui.cardView && CARD[ui.cardView]) (modal = cardViewer(g, ui.cardView)), (modalKey = 'card' + ui.cardView);
  else if (ui.honorView !== undefined && g.honors?.[ui.honorView]) (modal = honorViewer(g, ui.honorView)), (modalKey = 'honor' + ui.honorView);
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
    ${g.gameOver && ui.overLog ? `<button class="next-year" data-action="over-back">🏁 가문 결과로 돌아가기</button>` : ''}
    ${!g.gameOver && (ui.tab === 'tree' || ui.tab === 'act') ? `<button class="next-year" data-action="next">${g.events.length ? `이벤트 ${g.events.length}개 ▶` : `${g.year + 1}년으로 ▶${apLeft(g) ? `<small>행동력 ${apLeft(g)} 남음</small>` : ''}`}</button>` : ''}
    ${nav()}
    ${modal}
    ${ui.toast ? `<div class="toast">${esc(ui.toast)}</div>` : ''}
    ${ui.stamp ? `<div class="trade-stamp ${ui.stamp.sell ? 'sell' : 'buy'}" data-n="${ui.stamp.n}"><div class="ts-burst">${Array.from({ length: 18 }, (_, i) => `<i style="--a:${i * 20}deg"></i>`).join('')}</div><div class="ts-icon">${ui.stamp.icon}</div><div class="ts-seal">${ui.stamp.sell ? '매도 완료' : '계약 완료'}</div><div class="ts-text">${esc(ui.stamp.text)}</div></div>` : ''}
    ${fx.chips.length ? `<div class="rw-chips">${fx.chips.map((c) => `<div class="rw-chip" data-id="${c.id}">${esc(c.text)}${c.pts ? ` <b>+${c.pts}✦</b>` : ''}</div>`).join('')}</div>` : ''}
  `;
  // 새로 뜬 것만 움직인다: 같은 창이 다시 그려질 땐 가만히
  const m = root.querySelector('.modal');
  if (m && modalKey !== fx.modalKey) m.classList.add(fx.modalKey ? 'swap' : 'enter');
  fx.modalKey = modalKey;
  const tabChanged = ui.tab !== fx.tab;
  if (tabChanged) {
    // 오른쪽 탭으로 가면 오른쪽에서, 왼쪽 탭으로 가면 왼쪽에서 밀려 들어온다
    const dir = fx.tab === undefined ? 'enter' : TAB_ORDER.indexOf(ui.tab) > TAB_ORDER.indexOf(fx.tab) ? 'enter-r' : 'enter-l';
    root.querySelector('.screen')?.classList.add(dir);
    const nv = root.querySelector<HTMLElement>('nav.tabs');
    if (nv && fx.tab !== undefined) (nv.style.setProperty('--from', String(TAB_ORDER.indexOf(fx.tab))), nv.classList.add('slide'));
  } else if (ui.tab === 'assets' && fx.assetSub !== ui.assetSub) root.querySelector('.screen')?.classList.add('enter');
  fx.assetSub = ui.assetSub;
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
const fx: { theme?: HeadTheme; modalKey: string; likelyHeir?: string; chips: { id: number; text: string; pts: number }[]; rewardShown?: number; tab?: Tab; wallet?: number; walletLabel?: string; treeKey?: string; treeScroll?: number; assetSub?: string } = { modalKey: '', chips: [] };
const TAB_ORDER: Tab[] = ['tree', 'act', 'policy', 'assets', 'log', 'achv'];

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
    <section class="card">
      <h2>새 가문 세우기</h2>
      <label class="field">가문의 성씨
        <input id="surname" maxlength="2" value="${esc(o.surname)}" autocomplete="off">
      </label>
      <div class="field">나의 성별 ${seg('setup-sex', o.sex, [['M', '남'], ['F', '여']])}</div>
      <div class="field">난이도 (태어날 집안과 유전자) ${seg('setup-origin', o.origin, [['random', '🎲 운명'], ['easy', '쉬움'], ['normal', '보통'], ['hard', '어려움'], ['hell', '🔥지옥']])}</div>
      <p class="fine">${o.origin === 'random' ? '집안 형편(서민 30%·중산층 52%·부유층 18%), 부모 직업·재산, 타고난 능력치와 재능 모두 운에 맡긴다.' : `<b>${DIFFICULTY[o.origin].name}</b> — ${DIFFICULTY[o.origin].desc}`}<br>다섯 살부터 시작한다. 형제자매는 태어나 봐야 안다.</p>
      <div class="field">시대 ${seg('setup-era', o.era ?? 'modern', [['modern', '현대 한국 (2025~)'], ['history', '📜 근현대사 (1960~)']])}</div>
      ${o.era === 'history' ? `<p class="fine hist-note">1960년 봄, 4·19 혁명의 해에 다섯 살 아이로 태어난다 (1955년생). 5·16, 산업화, 유신, 광주, 6월 항쟁, 올림픽, IMF, 월드컵, 촛불까지 — 해마다 실제 신문 기사가 오고, 큰 사건은 호외·TV 속보로 들이닥친다. 그 시절엔 없던 직업·입시 전형·복지는 열리지 않고, 집값·땅값·주가는 실제 역사대로 오르내린다. 2026년부터는 미래로 이어진다.</p>` : ''}
      <button class="btn big primary" data-action="start">가문 시작</button>
    </section>
    ${hasSave ? `<button class="btn big" data-action="continue" style="margin-top:10px;">이어하기</button>` : ''}
    ${[1, 2, 3].some((i) => slotInfo(i)) ? `<section class="card"><h2>💾 저장한 가문</h2>${slotRows(false)}</section>` : ''}
    <details class="card code-box"><summary>📋 저장 코드로 불러오기</summary>
      <p class="fine">다른 기기에서 복사한 저장 코드(GAMUN1:로 시작)를 붙여넣는다.</p>
      <textarea id="save-code" rows="3" placeholder="GAMUN1:..."></textarea>
      <button class="btn wide" data-action="code-load">불러오기</button>
      ${ui.saveMsg ? `<p class="fine">${esc(ui.saveMsg)}</p>` : ''}
    </details>
    <p class="fine">v0.3 · 다섯 살부터 · 직업 128종 · 수능과 입시 · 인생사 · 업적 70+</p>
  </div>`;
}

function demoPerson(sex: Sex, i: number): Person {
  return {
    id: `demo${i}${sex}`,
    birthYear: 1985,
    flags: [],
    genes: { hairStyle: i + 1, hairColor: i % 3, skin: i % 4, eyes: i % 3, face: i % 5, brows: i % 3, mouth: i % 6, mark: 0 },
    sex,
    job: i === 0 ? 'office' : i === 1 ? 'doctor' : 'none',
  } as unknown as Person;
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

/** 🔑 내가 가진 집으로 들어가기 */
function moveInRows(g: GameState, me: Person, dependent: boolean): string {
  const list = ownedHomes(g, me);
  if (!list.length || age(g, me) < 19) return '';
  return `<h4 class="sub">🔑 내 집으로 들어가기</h4>
    ${list
      .map((a) => {
        const q = moveInQuote(g, me, a);
        return `<div class="arow"><span>${ASSET_ICONS[a.kind]} ${esc(a.name)}<br><small class="muted">${q.tenant ? `세입자 보증금 ${formatMoney(q.tenant)} 반환 + ` : '지금 세입자는 월세라 바로 비워 준다 · '}이사비 · 필요 ${formatMoney(q.need)}</small></span>
        <span><button class="mini" data-action="move-in" data-id="${a.id}" ${q.ok ? '' : 'disabled'}>${dependent ? '입주·독립' : '입주'}</button></span></div>`;
      })
      .join('')}
    <p class="fine">들어가면 실거주 1주택이 되어 세금이 가벼워진다 (2년 넘게 살면 ${formatMoney(120000)}까지 양도세 비과세). 원래 살던 자가는 세를 놓는다.</p>`;
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
      ${moveInRows(g, me, true)}
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
    ${moveInRows(g, me, false)}
    ${buy ? `<div class="arow"><span>이 집을 산다 <small>(보증금 돌려받아 보태고, 대출 ${formatMoney(buy.loan)})</small></span><span>${formatMoney(buy.price)} <button class="mini" data-action="buy-home" ${cash >= buy.need ? '' : 'disabled'}>매수</button></span></div>` : ''}
    <details class="moves"><summary>이사 가기 (전세·월세)</summary>
      ${rows}
      <p class="fine">전세: 5년마다 재계약(그사이 오른 시세만큼 보증금 조정). 보증금의 최대 80%(${formatMoney(20000)}·연 소득 4배 한도)까지 전세대출(연 4%). 월세: 보증금 조금 + 해마다 월세.<br>집을 사려면 부동산 매물에서 산다. 첫 집을 사면 그 집으로 이사하고, 지금 보증금은 돌려받는다.<br>자가에서 전세·월세로 옮기면 살던 집은 세를 놓는다. 집을 팔면 한 단계 작은 집 월세로 옮긴다.</p>
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
      ${g.era === 'history' && g.year <= 2025 ? `<div class="fam gov">🏛 ${esc(govOf(g.year))}</div>` : `<div class="fam gov">${epochOf(g.year).icon} ${esc(epochOf(g.year).name)}</div>`}
      ${g.war ? `<div class="fam war-chip ${g.war.phase}">${esc(warChip(g))}</div>` : ''}
      ${fx.theme && fx.theme.id !== 'prime' ? `<div class="fam theme-chip">${esc(fx.theme.label)}</div>` : ''}
      <div class="fam">명성 ${Math.round(g.fame)}${(g.scandal ?? 0) >= 10 ? ` · <span class="scandal-chip" title="가문 스캔들 위험 ${Math.round(g.scandal ?? 0)}">${scandalLabel(g.scandal ?? 0)}</span>` : ''} · <button class="rank-chip" data-action="tab" data-v="achv">${RANKS[rankOf(g)].icon} ${RANKS[rankOf(g)].name} <b>${g.glory ?? 0}✦</b></button></div>
    </div>
    <button class="top-r" data-action="tab" data-v="assets" data-sub="sum" title="자산 탭에서 내년 가계부 보기">
      <div class="money">${w.label} <span class="amt">${formatMoney(fx.wallet !== undefined && fx.walletLabel === w.label ? fx.wallet : w.amount)}</span></div>
      <div class="flow">내년 <b class="${f.net < 0 ? 'neg' : 'pos'}">${f.net < 0 ? '' : '+'}${formatMoney(f.net)}</b> <small>(수입 ${formatMoney(inc)} · 지출 ${formatMoney(exp)})</small></div>
      ${w.label.includes('부모님') && (h.cash || f.mine) ? `<div class="fame">내 통장 ${formatMoney(h.cash)}${f.mine ? ` (${f.mine.net < 0 ? "" : "+"}${formatMoney(f.mine.net)}/년)` : ''}</div>` : ''}
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
        <div class="re-h"><span>${ASSET_ICONS[a.kind]} ${esc(a.name)}</span><b>${formatMoney(a.value)}${chg(a)}</b></div>
        <div class="re-t">${role}${extra}</div>
        <div class="re-f"><small>${a.cost ? `산 값 ${formatMoney(a.cost)} (${gain >= 0 ? '+' : ''}${formatMoney(gain)}) · ` : ''}팔면 양도세 ${formatMoney(gt.tax)}${gt.note ? ` (${esc(gt.note)})` : ''}</small>
          <span>${a.loan ? `<button class="mini" data-action="repay" data-id="${a.id}" ${h.cash > 0 ? '' : 'disabled'}>대출 갚기</button>` : ''}${a.ownerId === h.id ? `<button class="mini" data-action="sell" data-id="${a.id}">매도</button>` : ''}</span></div>
        ${!prim && isHouse(a) ? leaseRow(g, a) : ''}
      </div>`;
    })
    .join('');
  const listings = (g.listings ?? [])
    .map((l) => {
      const q = buyQuote(g, h, l);
      const ok = adult && q.cash >= q.need;
      const tx = acqTax(g, h, l);
      return `<div class="re listing ${l.found ? 'found' : ''}">
        ${l.found ? '<i class="re-found">🔎 임장으로 찾은 매물</i>' : ''}
        <div class="re-h"><span>${ASSET_ICONS[l.kind]} ${esc(l.name)}</span><b>${formatMoney(l.price)}</b></div>
        <div class="re-t">${l.tags.filter((t) => t !== '주택').map((t) => `<b class="tag ${t === '급매' ? 'hot' : t === '호가 높음' ? 'warn' : t === '알짜' || t === '재건축 확정' || t === 'GTX 개통 예정' ? 'good' : ''}">${esc(t)}</b>`).join('')}${l.yield > 0 && !l.deposit ? `<b class="tag">월세 ${(l.yield * 100).toFixed(1)}%</b>` : ''}${l.house ? (l.kind === 'building' ? '<b class="tag">주택 수 포함</b>' : '') : '<b class="tag">주택 수 제외</b>'}</div>
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
    <details class="moves"><summary>부동산 세금·규칙 보기</summary><p class="fine">첫 집(실거주)은 월세가 없는 대신 재산세가 싸고, 2년 넘게 살면 ${formatMoney(120000)}까지 양도세 비과세.<br>두 번째 집부터는 투자: 취득세 8%(3채 이상 12%), 대출 LTV 30%(3채부터 0%), 공시가 ${formatMoney(90000)} 넘으면 종부세, 팔 때 양도세 중과. 월세는 공실이면 0원.<br>전세 낀 매물은 적은 돈으로 살 수 있지만(갭투자), 만기에 세입자가 나가면 보증금을 돌려줘야 한다.</p></details>
  </section>`;
}

/** 비거주 주택: 월세·전세·비워 두기 */
function leaseRow(g: GameState, a: Asset): string {
  const cur = leaseOf(a);
  const o = g.people[a.ownerId];
  const dep = Math.round(a.value * jeonseRatio(a));
  const btn = (to: Lease, label: string, sub: string, dis = false) =>
    `<button class="lease-b ${cur === to ? 'on' : ''}" data-action="lease" data-id="${a.id}" data-v="${to}" ${cur === to || dis ? 'disabled' : ''}><b>${label}</b><small>${sub}</small></button>`;
  const needBack = cur === 'jeonse' && (o?.cash ?? 0) < (a.deposit ?? 0);
  return `<div class="lease">
    <span class="lease-now">🔑 ${LEASE_NAME[cur]}</span>
    <div class="lease-row">
      ${btn('wolse', '월세', `연 ${formatMoney(Math.round(a.value * yieldOf(a)))} (${(yieldOf(a) * 100).toFixed(1)}%)`, needBack)}
      ${btn('jeonse', '전세', `보증금 ~${formatMoney(dep)} 받음`)}
      ${btn('empty', '비워 두기', '월세 0 · 언제든 입주·매도', needBack)}
    </div>
    ${needBack ? `<small class="fine">전세를 빼려면 보증금 ${formatMoney(a.deposit ?? 0)}을 돌려줄 현금이 필요하다</small>` : ''}
  </div>`;
}

/** 작년 대비 시세 등락 */
function chg(a: { value: number; prev?: number }): string {
  if (!a.prev) return '';
  const r = a.value / a.prev - 1;
  if (Math.abs(r) < 0.001) return ' <small class="chg">―</small>';
  return ` <small class="chg ${r > 0 ? 'up' : 'down'}">${r > 0 ? '▲' : '▼'}${Math.abs(r * 100).toFixed(1)}%</small>`;
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
    ${f.mine ? `<p class="fine">독립 전 내 통장: ${[f.mine.allow ? `용돈 ${formatMoney(f.mine.allow)} (월 ${formatMoney(Math.round(f.mine.allow / 12))})` : '', f.mine.income ? `수입 ${formatMoney(f.mine.income)} − 세금 ${formatMoney(f.mine.tax)} − 교통·통신·여가 ${formatMoney(f.mine.own)} − 집에 보태는 생활비 ${formatMoney(f.mine.contrib)}` : ''].filter(Boolean).join(' + ')} = <b>${f.mine.net < 0 ? '' : '+'}${formatMoney(f.mine.net)}</b>/년</p>` : ''}
    <p class="fine">월급은 세전 금액, 소득세·4대보험은 따로 빠진다 (연봉 ${formatMoney(3000)} 약 12%, ${formatMoney(5000)} 16%, ${formatMoney(10000)} 21%). 사업·크리에이터 수입과 시세는 해마다 출렁인다. 학년·진학 이벤트에서 고르는 사교육비는 따로 나간다.</p>
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
  return `<nav class="tabs" style="--i:${TAB_ORDER.indexOf(ui.tab)}">${tabs.map(([t, l]) => `<button data-action="tab" data-v="${t}" class="${ui.tab === t ? 'on' : ''}">${l}</button>`).join('')}</nav>`;
}

function card(g: GameState, p: Person, extra = ''): string {
  const dead = !alive(p);
  const a = dead ? p.deathYear! - p.birthYear : age(g, p);
  const isHead = p.id === g.headId;
  const heir = p.id === g.heirId;
  const pending = g.events.some((e) => e.personId === p.id);
  const small = ui.zoom === 'small';
  const likely = !isHead && !g.heirId && !dead && fx.likelyHeir === p.id;
  const jb = jobBadge(g, p);
  const myCards = (g.cards ?? []).filter((c) => c.personId === p.id).map((c) => CARD[c.id]).filter(Boolean);
  const RANK_R = { common: 0, rare: 1, epic: 2, legend: 3 } as const;
  const best = myCards.sort((a, b) => RANK_R[b.rarity] - RANK_R[a.rarity])[0];
  const nHonors = (g.honors ?? []).filter((h) => h.personId === p.id).length;
  const badges = [jb ? `<i title="${jb[1]}">${jb[0]}</i>` : '', likely ? '<i title="후계자 유력">⚡</i>' : '', best ? `<i class="bd-card ${best.rarity}" title="명예의 전당 ${myCards.map((c) => c.name).join(', ')}">${best.icon}${myCards.length > 1 ? `<sup>${myCards.length}</sup>` : ''}</i>` : ''].join('');
  const aura = best ? `aura-${best.rarity}` : '';
  return `<button class="pc ${dead ? 'dead' : ''} ${isHead ? 'head' : ''} ${p.inLaw ? 'inlaw' : ''} ${aura} ${nHonors ? 'honored' : ''} ${extra}" data-action="person" data-id="${p.id}">
    ${best ? `<span class="aura"></span>${best.rarity === 'legend' ? '<span class="sparkle"><i></i><i></i><i></i><i></i></span>' : ''}` : ''}
    ${nHonors ? `<span class="medal" title="훈장 ${nHonors}개">🎖${nHonors > 1 ? `<sup>${nHonors}</sup>` : ''}</span>` : ''}
    ${badges ? `<span class="pc-badges">${badges}</span>` : ''}
    ${isHead ? '<span class="crown">👑</span>' : heir ? '<span class="crown">★</span>' : ''}
    ${pending ? '<span class="bang">!</span>' : ''}
    <img class="px" src="${portraitURL(p, a)}" alt="">
    <span class="nm">${esc(p.name)}</span>
    <span class="ag">${dead ? '†' + a : a + (small ? '' : '세')}</span>
    ${small ? '' : `<span class="rl">${esc(jobShort(g, p))}</span>`}
  </button>`;
}

/** 직업 분야 뱃지: 클릭하지 않아도 가문의 직업 분포가 보이게 */
const CAT_BADGE: Record<string, [string, string]> = {
  medical: ['🩺', '의료'], legal: ['📑', '전문직'], public: ['🏛', '공직'], office: ['💼', '회사'], tech: ['💻', 'IT·공학'], edu: ['📚', '교육'],
  service: ['🍳', '서비스'], trade: ['🔧', '기술'], transport: ['🚚', '운송'], media: ['🎬', '미디어'], sport: ['⚽', '스포츠'], biz: ['💰', '사업'], farm: ['🌾', '농어업'],
};
const JOB_BADGE: Record<string, [string, string]> = {
  judge: ['⚖️', '법조'], prosecutor: ['⚖️', '법조'], lawyer: ['⚖️', '법조'], police: ['🚓', '경찰'], coast_guard: ['🚓', '경찰'], firefighter: ['🚒', '소방'], officer: ['🎖', '군'],
  professor: ['🎓', '학계'], researcher: ['🔬', '연구'], politician: ['🗳', '정치'], minister: ['🏛', '장관'], president: ['🇰🇷', '대통령'], clergy: ['⛪', '종교'], social_worker: ['🤝', '복지'],
  landlord: ['🏢', '건물주'], founder: ['🚀', '사업가'],
};
function jobBadge(g: GameState, p: Person): [string, string] | undefined {
  if (!alive(p)) return;
  const a = age(g, p);
  if (p.flags.includes('student')) return ['🎓', '대학생'];
  if (p.flags.some((f) => f.startsWith('prep:'))) return ['📖', '수험생'];
  if (a < 20 || ['none', 'parttime'].includes(p.job)) return;
  if (p.job === 'pension') return ['🌿', '은퇴'];
  return JOB_BADGE[p.job] ?? CAT_BADGE[JOBS[p.job]?.cat ?? ''];
}

/** 카드 아래 한 줄: 학생/수험생/직업 */
/** 가계도 카드의 직업·신분 (그 시대 말로: 1970년대 "국민학생", 2060년대 "홀로 크리에이터") */
const jobShort = (g: GameState, p: Person) => (alive(p) ? periodize(g, jobShort0(g, p)) : jobShort0(g, p));
function jobShort0(g: GameState, p: Person): string {
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

/** 가문 직업 분포 한 줄 */
function jobMix(g: GameState): string {
  const count = new Map<string, [string, number]>();
  for (const p of Object.values(g.people)) {
    if (!alive(p) || p.inLaw || !(isMainline(g, p) || isDescendantOf(g, head(g), p))) continue;
    const b = jobBadge(g, p);
    if (!b || ['🎓', '📖', '🌿'].includes(b[0])) continue;
    const c = count.get(b[1]);
    count.set(b[1], [b[0], (c?.[1] ?? 0) + 1]);
  }
  if (!count.size) return '';
  return `<div class="job-mix">${[...count.entries()].sort((a, b) => b[1][1] - a[1][1]).map(([name, [ic, n]]) => `<span title="${name}">${ic} ${name} ${n}</span>`).join('')}</div>`;
}

function treeScreen(g: GameState): string {
  const h = head(g);
  fx.likelyHeir = g.heirId ? undefined : chooseSuccessor(g, h)?.id;
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
      <span>★ ${heir ? esc(heir.name) : fx.likelyHeir && g.people[fx.likelyHeir] ? `⚡ ${esc(g.people[fx.likelyHeir].name)} 유력` : '후계자 미정'}</span>
    </div>
    ${jobMix(g)}`;
  if (ui.view === 'list') return toolbar + rosterScreen(g) + rivalStrip(g) + propertyStrip(g);

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
  ${rivalStrip(g)}
  ${propertyStrip(g)}`;
}

/** 라이벌 가문 한 줄 */
function rivalStrip(g: GameState): string {
  if (!g.rival) return '';
  return `<div class="rival-strip ${g.rival.allied ? 'ally' : g.rival.feud >= 50 ? 'hot' : ''}">⚔️ ${esc(rivalLine(g, familyTotal(g)))}</div>`;
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
    <span class="r-job">${esc(dead ? '' : jobShort(g, p) === periodize(g, JOBS[p.job].name) ? periodize(g, jobTitle(p)) : jobShort(g, p))}</span>
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
  kinder_church: '교회 유치원',
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
    // 사돈댁: 배우자 집안 형편과 우리 집과의 차이
    const inl = p.inLaw ? p : g.people[p.spouseId];
    if (inl && kinOf(inl)) {
      const gap = kinGap(g, inl);
      rows.push(`<div class="sh-row"><span>${p.inLaw ? '친정·본가' : '사돈댁'}</span><span>${KIN_NAME[kinOf(inl)!]}${Math.abs(gap) >= 2 ? ' ⚠ 형편 차이 큼 (금슬이 빨리 식는다)' : gap === 0 ? ' · 형편 비슷' : ''}</span></div>`);
    }
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
  const honors = (g.honors ?? []).filter((x) => x.personId === p.id);
  if (honors.length) rows.push(`<div class="sh-row"><span>훈장</span><span class="sh-medals">${honors.map((x) => `<button class="sh-medal" data-action="honor-view" data-id="${(g.honors ?? []).indexOf(x)}"><img src="${medalURL(x.id, HONORS[x.id].icon, HONORS[x.id].rarity)}" alt="">${HONORS[x.id].name} (${x.year})</button>`).join('')}</span></div>`);
  if (p.papers) rows.push(`<div class="sh-row"><span>논문</span><span>📝 ${p.papers}편${p.flags.includes('phd') ? ' · 박사' : ''}${p.job === 'professor' && p.jobLevel === 0 ? ` · 정년 심사까지 ${Math.max(0, 6 - p.jobYears)}년 (기준 약 12편)` : ''}</span></div>`);
  if (p.pol && ['politician', 'president'].includes(p.job)) {
    const pl = p.pol;
    const need = fameNeed(p);
    rows.push(`<div class="sh-row ${pl.approval < 25 || pl.fund < 0 ? 'warn' : ''}"><span>정치</span><span>지지율 ${pl.approval}% · 정치자금 ${formatMoney(pl.fund)}${pl.slush ? ` · 🕶 비자금 ${formatMoney(pl.slush)}` : ''}${pl.heat >= 30 ? ' · ⚠ 수사 위험' : ''}<br>가문 명성 ${Math.round(g.fame)} / 체면 유지 ${need}${g.fame < need ? ' ⚠ 부족' : ''}</span></div>`);
  }
  if (!p.inLaw && (age(g, p) >= 15 || p.lifeScore !== undefined)) {
    const parts = lifeParts(g, p);
    const v = p.lifeScore ?? parts.reduce((t, x) => t + x.v, 0);
    rows.push(`<div class="sh-row"><span>인생 점수</span><span><b class="lg-${lifeGrade(v).g.toLowerCase()}">${lifeGrade(v).g}</b> ${v}점${p.lifeScore === undefined ? ' (지금까지)' : ''}<br><small>${parts.map((x) => `${x.label} ${x.v > 0 ? '+' : ''}${x.v}`).join(' · ')}</small></span></div>`);
  }
  const myCards = (g.cards ?? []).filter((c) => c.personId === p.id);
  if (myCards.length) rows.push(`<div class="sh-row"><span>카드</span><span>${myCards.map((c) => `${CARD[c.id].icon} ${cardTitle(c.id, c.year)}`).join('<br>')}</span></div>`);
  if (alive(p) && !p.inLaw && p.id !== g.headId && age(g, p) >= 13 && isDescendantOf(g, p, head(g))) {
    const w = willOf(p);
    rows.push(`<div class="sh-row"><span>성향</span><span>${willLine(p)}<br><small>독립심 ${w.indep} · 야망 ${w.ambition} · 충성도 ${w.loyalty} — 충성도가 낮고 독립심이 높으면 가주의 뜻을 거스르고, 야망이 크면 일을 벌인다</small></span></div>`);
  }
  if (alive(p) && p.id === head(g).spouseId && focusOf(p)) rows.push(`<div class="sh-row"><span>요즘</span><span>${FOCUS_LABEL[focusOf(p)!]}<br><small>배우자도 제 뜻대로 움직인다. 관심사에 따라 해마다 가족에 보탬이 되고, 가끔 스스로 일을 벌인다</small></span></div>`);
  const woes = woesOf(p);
  if (alive(p) && woes.length) rows.push(`<div class="sh-row warn"><span>짐</span><span>${woes.map((w) => `${WOES[w].icon} ${WOES[w].name}`).join('<br>')}</span></div>`);
  if (p.flags.includes('disowned')) rows.push(`<div class="sh-row warn"><span>💔</span><span>의절한 자식</span></div>`);
  if (p.flags.includes('noble_inlaw') || p.flags.includes('rich_inlaw')) rows.push(`<div class="sh-row"><span>혼인</span><span>${p.flags.includes('noble_inlaw') ? '🏯 명문가와 정략결혼' : '💎 신흥 부유층과 정략결혼'}</span></div>`);
  if (alive(p) && p.id === g.headId) rows.push(`<div class="sh-row"><span>살림</span><span>${esc(phoneOf(g).label)}${g.year >= 1983 ? `<br>${pcOf(g).model.id === 'none' ? '🖥 컴퓨터 없음' : esc(pcOf(g).label)}` : ''}</span></div>`);
  if (alive(p) && !['none', 'parttime', 'pension'].includes(p.job) && age(g, p) >= 18) rows.push(`<div class="sh-row"><span>직업 성격</span><span>${HONOR_JOBS.has(p.job) ? '🎖 명예형 — 해마다 가문 명성 +0.6, 대신 품위 유지비로 수입의 6%가 나가고 스캔들에 약하다' : JOBS[p.job].fame >= 1 ? '⭐ 인기형 — 이름을 알리는 일' : '💰 실리형 — 돈을 버는 일'}</span></div>`);
  if (p.flags.includes('convicted_politician')) rows.push(`<div class="sh-row warn"><span>⚖</span><span>정치자금법 위반 전과</span></div>`);
  return rows.join('');
}

/** 인물 창 큰 초상화: 그려 온 부품을 조립한 초상화 (부품을 받는 동안은 도트 초상화) */
function bustHTML(p: Person, a: number, year: number, dead: boolean): string {
  const kit = kitPortraitURL(p, a, year);
  const kitBlink = kit && !dead ? kitPortraitURL(p, a, year, true) : null;
  const src = kit ?? bustURL(p, a, year);
  const blink = dead ? null : kit ? kitBlink : bustURL(p, a, year, 'normal', true);
  const data = kit ? '' : ` data-kit="${p.id}" data-age="${a}" data-year="${year}"`;
  return `<span class="bust-wrap anim2 ${dead ? 'dead' : ''}${kit ? ' kit' : ''}"${data}><img class="px big bust" src="${src}">${blink ? `<img class="px big bust blink" src="${blink}">` : ''}</span>`;
}

// 부품이 도착하면 열린 인물 창의 도트 초상화를 조립 초상화로 바꿔 끼운다
onKitReady(() => {
  const g = ui.game;
  if (!g) return;
  root.querySelectorAll<HTMLElement>('.bust-wrap[data-kit]').forEach((el) => {
    const p = g.people[el.dataset.kit!];
    if (!p) return;
    const html = bustHTML(p, Number(el.dataset.age), Number(el.dataset.year), el.classList.contains('dead'));
    el.outerHTML = html;
  });
});

function personSheet(g: GameState, p: Person): string {
  const dead = !alive(p);
  const a = dead ? p.deathYear! - p.birthYear : age(g, p);
  const h = head(g);
  const edu = p.flags.filter((f) => EDU_LABELS[f]).map((f) => periodize(g, EDU_LABELS[f]));
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
  if (!dead && (isDesc || p.id === h.spouseId) && p.id !== h.id) {
    actions.push(`<button class="btn" data-action="gift-to" data-id="${p.id}">🎁 증여하기 (돈·집·차…)</button>`);
  }
  if (!dead && isMainline(g, p) && !p.potentialKnown && a < 20) {
    actions.push(`<button class="btn" data-action="test" data-id="${p.id}" ${spendable(g) < testCost(g) ? 'disabled' : ''}>정밀 적성검사 (${formatMoney(testCost(g))})</button>`);
  }
  if (p.id === h.id) {
    actions.push(`<button class="btn" data-action="retire" ${retireOk !== true ? 'disabled' : ''}>은퇴 · 생전 승계</button>`);
    if (retireOk !== true) actions.push(`<p class="fine">${esc(retireOk)}</p>`);
  }

  return `
  <div class="modal" data-action="close-sheet">
    <div class="sheet" data-stop>
      <div class="sheet-head">
        ${bustHTML(p, a, g.year, dead)}
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
      ${!dead && job.titles && !p.flags.includes('student') ? careerLadder(g, p) : ''}
      ${sideJobOf(p) ? `<div class="sh-row"><span>겸직</span><span>🎨 ${esc(JOBS[sideJobOf(p)!]?.name ?? '')}</span></div>` : ''}
      <div class="sh-row"><span>재산</span><span>${formatMoney(personWorth(g, p))}</span></div>
      ${p.home ? `<div class="sh-row"><span>사는 집</span><span>${homeLine(g, p.home)}</span></div>` : ''}
      ${!dead && a < 30 ? `<div class="sh-row"><span>성향</span><span>${esc(temperamentLine(p).replace('성향: ', ''))}</span></div>` : ''}
      ${interestSummary(p) ? `<div class="sh-row"><span>관심 분야</span><span>${esc(interestSummary(p))}</span></div>` : ''}
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
  if (cur.def.id === 'big_ev') return bigModal(g, cur);
  const media = newsStyle(cur.def.id, g.year);
  if (media) return newsModal(g, cur, media);
  const how = commEvent(cur.def.id, cur.title);
  if (how) return commModal(g, cur, how);
  const who = cur.portraits.filter(Boolean).map((p) => ({ p, age: (p.deathYear ?? g.year) - p.birthYear }));
  const ports = who
    .slice(2, 4)
    .map((x) => `<img class="px mid" src="${portraitURL(x.p, x.age)}">`)
    .join('');
  const sk = sceneFor(cur.title, cur.text);
  const summitBannerKey = SUMMIT_BANNER_MAP[cur.def.id];
  const summitBannerSrc = summitBannerKey ? eventBannerURL(summitBannerKey) : undefined;
  return `
  <div class="modal">
    <div class="event${summitBannerSrc ? ' with-banner' : ''}">
      ${summitBannerSrc ? `<div class="ev-banner-top"><img src="${summitBannerSrc}" alt=""></div>` : ''}
      <div class="ev-count">${g.year}년 · 남은 이벤트 ${g.events.length}</div>
      <h3>${esc(cur.title)}</h3>
      ${!summitBannerSrc ? `<div class="ev-scene anim2"><img class="scene-img" src="${sceneArtURL(sk, g.year, cur.ev.uid, who.slice(0, 2))}" alt=""><img class="scene-img blink" src="${sceneArtURL(sk, g.year, cur.ev.uid, who.slice(0, 2), true)}" alt="">${ports ? `<div class="ev-ports on-scene">${ports}</div>` : ''}</div>` : ''}
      <p class="ev-text">${nl(cur.text)}</p>
      ${cur.choices.some((c) => c.cost) ? `<div class="ev-wallet">${wallet(g).label} <b>${formatMoney(wallet(g).amount)}</b></div>` : ''}
      <div class="choices">
        ${cur.choices
          .map(
            (c, i) => `<button class="choice" style="animation-delay:${140 + i * 55}ms" data-action="choose" data-i="${i}" ${c.disabled ? 'disabled' : ''}>
              <span class="cl">${esc(c.label)}</span>
              ${c.cost || c.req?.length || c.odds !== undefined ? `<span class="badges">${oddsBadge(c.odds)}${c.cost ? `<b class="cost">💰${formatMoney(c.cost)}</b>` : ''}${c.disabled && c.cost && c.cost > wallet(g).amount ? '<b class="why">돈 부족</b>' : ''}${(c.req ?? []).map((r) => `<b>${esc(r)}</b>`).join('')}</span>` : ''}
            </button>`,
          )
          .join('')}
      </div>
    </div>
  </div>`;
}

/** 전화·문자로 오는 사건: 그 집이 쓰는 연락 수단 모양으로 뜬다 (전보 → 다이얼 전화 → 삐삐 → 폴더폰 → 스마트폰 → AR 글래스 → 뉴럴 링크 → 홀로그램) */
function commModal(g: GameState, cur: NonNullable<ReturnType<typeof currentEvent>>, how: 'call' | 'msg'): string {
  const gear = phoneOf(g);
  let kind: CommKind = gear.model.kind;
  const paper = /^(✉)/.test(cur.title) || cur.def.id === 'st_h_telegram' || cur.def.id === 'st_h_lucky_letter';
  if (paper) kind = 'letter';
  else if (how === 'msg' && ['shared', 'landline', 'carphone'].includes(kind)) kind = 'letter';
  else if (how === 'call' && kind === 'letter') kind = 'shared';
  const title = cur.title.replace(/^(📞|☎|📱|💌|📟|✉|📧|💬|💠)\s*/u, '');
  const clock = `${String(7 + ((g.year * 7) % 15)).padStart(2, '0')}:${String((g.year * 13) % 60).padStart(2, '0')}`;
  const top =
    kind === 'letter'
      ? `<div class="cm-top"><span class="cm-stamp">${cur.def.id === 'st_h_telegram' ? '電報' : '郵便'}</span><span>${g.year < 2000 ? '체신부' : '우정사업본부'} · ${g.year}년</span></div>`
      : kind === 'shared' || kind === 'landline' || kind === 'carphone'
        ? `<div class="cm-top"><span class="cm-ringer">☎</span><span>따르릉… 따르릉…</span></div>`
        : kind === 'pager' || kind === 'citi'
          ? `<div class="cm-lcd"><span>${how === 'call' ? '8282' : '1004'}</span><small>${clock} · 음성 1</small></div>`
          : kind === 'cell' || kind === 'feature'
            ? `<div class="cm-top"><span>📶▮▮▮</span><span>${how === 'call' ? '전화 왔어요' : '✉ 새 문자 1'}</span><span>${clock}</span></div>`
            : kind === 'smart'
              ? `<div class="cm-top"><span>${how === 'call' ? '📞 전화 수신 중' : '💬 메시지'}</span><span>지금</span></div>`
              : `<div class="cm-top"><span>${kind === 'neural' ? '🧠 뉴럴 수신' : kind === 'holo' ? '💠 홀로그램 연결' : '👓 시야 알림'}</span><span>${clock}</span></div>`;
  const choices = cur.choices
    .map(
      (c, i) => `<button class="choice" style="animation-delay:${500 + i * 70}ms" data-action="choose" data-i="${i}" ${c.disabled ? 'disabled' : ''}>
        <span class="cl">${esc(c.label)}</span>
        ${c.cost || c.req?.length || c.odds !== undefined ? `<span class="badges">${oddsBadge(c.odds)}${c.cost ? `<b class="cost">💰${formatMoney(c.cost)}</b>` : ''}${c.disabled && c.cost && c.cost > wallet(g).amount ? '<b class="why">돈 부족</b>' : ''}${(c.req ?? []).map((r) => `<b>${esc(r)}</b>`).join('')}</span>` : ''}
      </button>`,
    )
    .join('');
  return `
  <div class="modal cm-modal cm-${kind}">
    <div class="event cm-dev" data-stop>
      <div class="ev-count">${g.year}년 · ${esc(gear.label)}</div>
      <div class="cm-screen">
        ${top}
        <h3>${esc(title)}</h3>
        <p class="ev-text">${nl(cur.text)}</p>
      </div>
      ${cur.choices.some((c) => c.cost) ? `<div class="ev-wallet">${wallet(g).label} <b>${formatMoney(wallet(g).amount)}</b></div>` : ''}
      <div class="choices">${choices}</div>
    </div>
  </div>`;
}

/** 역사의 큰 사건: 1960~80년대 호외, 1990~2000년대 TV 속보, 2010년대~ 휴대폰 알림 */
function newsModal(g: GameState, cur: NonNullable<ReturnType<typeof currentEvent>>, media: AlertMedia): string {
  const [sub, ...rest] = cur.text.split('\n\n');
  const body = rest.join('\n\n');
  const paper = pick2(g.year, ['동아일보', '조선일보', '경향신문', '한국일보', '서울신문']);
  // 보도사진: 큰 사건은 그 장면, 그 밖엔 글의 낱말로 (render/newsphoto.ts)
  const pk = newsPhotoKey(cur.def.id, cur.title, cur.text);
  const real = pk ? realPhoto(pk) : undefined;
  const purl = real ?? (pk ? newsPhotoURL(pk) : '');
  const cap = pk ? CAPTION[pk] ?? '' : '';
  const credit = real && pk ? NEWS_CREDITS[pk] : '';
  const photo = (cls: string) => (purl ? `<figure class="nw-photo ${cls}${real ? ' real' : ''}"><img src="${purl}" alt="">${cap && cls !== 'thumb' ? `<figcaption>${esc(cap)}${credit ? ` <small class="nw-credit">${esc(credit)}</small>` : ''}</figcaption>` : ''}</figure>` : '');
  const choices = cur.choices
    .map(
      (c, i) => `<button class="choice" style="animation-delay:${900 + i * 80}ms" data-action="choose" data-i="${i}" ${c.disabled ? 'disabled' : ''}>
        <span class="cl">${esc(c.label)}</span>
        ${c.cost ? `<span class="badges"><b class="cost">💰${formatMoney(c.cost)}</b></span>` : ''}
      </button>`,
    )
    .join('');
  const head =
    media === 'extra'
      ? `<div class="nw-mast"><span class="nw-hoei">號外</span><span class="nw-paper">${paper}</span><span class="nw-date">${g.year}년 · ${esc(govOf(g.year))}</span></div>
         <h2 class="nw-h">${esc(cur.title)}</h2>${photo('halftone')}<div class="nw-sub">${esc(sub)}</div>`
      : media === 'tv'
        ? `<div class="nw-tv">${photo('tvshot')}<div class="nw-tvbar"><b>속보</b><span>${esc(cur.title)}</span></div><div class="nw-tvsub">${esc(sub)} · ${pick2(g.year, ['KBS 9시 뉴스', 'MBC 뉴스데스크', 'SBS 8뉴스'])}</div></div>`
        : media === 'push'
          ? `<div class="nw-pushcard"><div class="nw-pushapp">🔔 뉴스 속보 · 지금</div><b>${esc(cur.title)}</b><small>${esc(sub)}</small></div>`
          : media === 'holo'
            ? `<div class="nw-holohead"><span class="nw-holo-tag">◉ LIVE 속보</span>${photo('holo')}<b>${esc(cur.title)}</b><small>${esc(sub)}</small></div>`
            : media === 'neural'
              ? `<div class="nw-nrlhead"><span>🧠 뉴럴 속보가 머릿속에 떠오른다</span>${photo('holo')}<b>${esc(cur.title)}</b><small>${esc(sub)}</small></div>`
              : `<div class="nw-aihead"><div class="nw-ai-av">🤖</div><div class="nw-ai-b"><small>AI 비서 · 지금</small><p>"잠깐만요, 가문에 중요한 소식이에요."</p><b>${esc(cur.title)}</b>${photo('ai')}<small>${esc(sub)}</small></div></div>`;
  if (media === 'push') {
    // 속보는 우리 집 휴대폰으로 온다: 폴더폰이면 문자, 스마트폰이면 잠금화면 알림
    const gear = phoneOf(g);
    const kind = gear.model.kind;
    const clock = `${String(7 + ((g.year * 7) % 15)).padStart(2, '0')}:${String((g.year * 13) % 60).padStart(2, '0')}`;
    const top = kind === 'smart' ? `<div class="cm-top"><span>🔔 뉴스 속보</span><span>${clock}</span></div>` : `<div class="cm-top"><span>📶▮▮▮</span><span>✉ [속보] 새 문자</span><span>${clock}</span></div>`;
    return `
  <div class="modal cm-modal cm-${['smart', 'feature', 'cell'].includes(kind) ? kind : 'smart'}">
    <div class="event cm-dev" data-stop>
      <div class="ev-count">${g.year}년 · ${esc(gear.label)}</div>
      <div class="cm-screen">
        ${top}
        <h3>${esc(cur.title)}</h3>
        ${photo(kind === 'smart' ? 'phone' : 'thumb')}
        <p class="ev-text"><b>${esc(sub)}</b>\n${nl(body)}</p>
      </div>
      <div class="choices">${choices}</div>
    </div>
  </div>`;
  }
  return `
  <div class="modal nw-modal nw-${media}">
    <div class="event nw-card" data-stop>
      ${head}
      <p class="ev-text nw-body">${nl(body)}</p>
      <div class="choices">${choices}</div>
    </div>
  </div>`;
}
const pick2 = <T,>(seed: number, arr: T[]) => arr[Math.abs(seed * 7 + 3) % arr.length];

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
      ${(() => {
        const m = o.text.match(/\[\[photo:(\d+)\]\]\n?/);
        const gg = g0();
        const pic = m && gg ? photoHTML(gg, Number(m[1]), true) : '';
        return `${pic}<p class="ev-text">${richText(o.text.replace(/\[\[photo:\d+\]\]\n?/, ''))}</p>`;
      })()}
      <button class="btn primary" data-action="ok-outcome">계속</button>
    </div>
  </div>`;
}

/** 🎁 보상 팝업: 희귀도마다 빛깔과 효과가 다르다 (히든 카드는 그림자 걷힘 연출) */
function rewardModal(r: Reward): string {
  const isHidden = !!(r.card && CARD[r.card]?.hidden);
  const isSuper = isHidden && isSuperHidden(r.card!);
  const sparks = isSuper ? 36 : isHidden ? 24 : r.rarity === 'common' ? 0 : r.rarity === 'rare' ? 8 : r.rarity === 'epic' ? 14 : 22;
  const p = r.personId && g0()?.people[r.personId] ? g0()!.people[r.personId] : undefined;
  const cardSex = p?.sex ?? (g0()?.hiddenCardSex?.[r.card!] || 'F');

  return `
  <div class="modal reward-bg ${r.rarity} ${isHidden ? 'is-hidden-bg' : ''} ${isSuper ? 'is-super-bg' : ''}" data-action="ok-reward">
    <div class="event reward ${r.rarity} ${isHidden ? 'hid-reward-event' : ''} ${isSuper ? 'super-reward-event' : ''}" data-stop>
      <div class="rw-burst">${Array.from({ length: sparks }, (_, i) => `<i style="--a:${Math.round((360 / sparks) * i)}deg;--d:${(i % 5) * 60}ms"></i>`).join('')}</div>
      ${isSuper ? '<div class="super-shockwave"></div><div class="super-shockwave sw2"></div>' : isHidden ? '<div class="hid-shockwave"></div>' : ''}
      <div class="rw-rarity ${isSuper ? 'super-rarity' : ''}">${isSuper ? '👑 SUPER HIDDEN 👑' : isHidden ? '✦ HIDDEN JOB ✦' : RARITY_NAME[r.rarity]}</div>
      ${
        isHidden
          ? `<div class="hcard-reveal-box ${isSuper ? 'super-box' : ''}">
              <div class="hcard hidden-hc ${isSuper ? 'super-hc' : ''}">${cardImg(CARD[r.card!], false, 'hc-art', cardSex)}</div>
              <div class="hid-shadow-veil ${isSuper ? 'veil-super' : ''}">
                <div class="veil-darkness">
                  <div class="veil-silhouette">${isSuper ? '👑' : '?'}</div>
                  <div class="veil-mist"></div>
                </div>
                <div class="veil-blade"></div>
              </div>
            </div>
            <div class="hc-eff">${isSuper ? '👑 슈퍼 히든 직업 달성!' : '🌑 히든 직업 달성!'} ${esc(effText(CARD[r.card!].eff))}</div>`
          : r.card && CARD[r.card]
          ? `<div class="hcard ${r.rarity}">${cardImg(CARD[r.card], false, 'hc-art')}<div class="hc-title">${CARD[r.card].name}</div><div class="hc-name">${r.personId && g0()?.people[r.personId] ? esc(fullName(g0()!.people[r.personId])) : ''}</div><i class="hc-shine"></i></div><div class="hc-eff">${esc(effText(CARD[r.card].eff))}</div>`
          : r.grade
            ? `<div class="grade-stamp g-${r.grade.toLowerCase()}">${r.grade}</div>`
            : `<div class="rw-icon">${r.icon}</div>`
      }
      <h3>${esc(r.title)}</h3>
      <p class="ev-text">${nl(r.text)}</p>
      ${r.pts ? `<div class="rw-pts">+${r.pts} <b>✦</b> 명예</div>` : ''}
      <button class="btn primary rw-take" data-action="ok-reward">${isSuper ? '초월의 영광을 받든다!' : r.rarity === 'legend' ? '영광을 받든다!' : '받기!'}</button>
      ${g0()?.rewards && g0()!.rewards!.length > 1 ? `<button class="btn ghost rw-all" data-action="ok-reward-all">모두 받기 (${g0()!.rewards!.length - 1}개 더)</button>` : ''}
    </div>
  </div>`;
}
const g0 = () => ui.game;
// 전설 직업 카드 그림: legend/는 파일로, legend-inline/은 페이지 안에 (배포 방식 때문)
const LEGEND_FILES = Object.entries({
  ...(import.meta.glob('../assets/legend/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>),
  ...(import.meta.glob('../assets/legend-inline/*.webp', { eager: true, query: '?inline', import: 'default' }) as Record<string, string>),
}).map(([k, v]) => [k.split('/').pop()!.replace('.webp', ''), v] as const);

const LEGEND_ART: Record<string, string> = Object.fromEntries(
  LEGEND_FILES.filter(([k]) => !k.endsWith('.fig'))
);
const LEGEND_FIG: Record<string, string> = Object.fromEntries(
  LEGEND_FILES.filter(([k]) => k.endsWith('.fig')).map(([k, v]) => [k.slice(0, -4), v])
);
const HIDDEN_CARDS = CARDS.filter((d) => d.hidden);
const NORMAL_CARDS = CARDS.filter((d) => !d.hidden);
const cardArt = (d: CardDef, locked = false, frame = 0) => cardFrontURL(d.id, d.icon, (CARD_THEME[d.id] ?? 'power') as Theme, d.rarity, locked, cardTier(d), frame);
/** 움직이는 카드(여러 장)는 겹쳐 놓고 번갈아 보여 준다 */
const cardImg = (d: CardDef, locked: boolean, cls: string, forceSex?: 'M' | 'F') => {
  if (d.hidden) {
    // 히든 카드: 가진 사람의 성별 그림으로, 움직이는 효과와 함께
    const gg = g0();
    let sex: 'M' | 'F' | undefined = forceSex;
    if (!sex && gg) {
      if (gg.hiddenCardSex?.[d.id]) {
        sex = gg.hiddenCardSex[d.id];
      } else {
        const c = [...(gg.cards ?? [])].reverse().find((x) => x.id === d.id);
        const p = c ? gg.people[c.personId] : undefined;
        sex = c?.sex ?? p?.sex;
      }
    }
    const c = gg?.cards?.find((x) => x.id === d.id);
    const p = c ? gg!.people[c.personId] : undefined;
    return hiddenCardHTML(d.id, { sex: sex ?? p?.sex, seed: p ? p.birthYear : 0, locked, cls: `${cls}-h` });
  }
  // 전설 직업 카드: 플레이어가 준 그림을 명예의 전당 카드 틀 안에 (미획득 시 전당 고유 골든/앰버 실루엣)
  const la = LEGEND_ART[d.id];
  if (la) {
    if (locked) {
      const laFig = LEGEND_FIG[d.id] ?? la;
      return `<span class="lg-card ${cls} locked"><img src="${cardArt(d, true)}" alt=""><span class="lg-art lg-sil" style="background-image:url('${laFig}')"></span><span class="lg-q">?</span></span>`;
    }
    return `<span class="lg-card ${cls}"><img src="${cardArt(d, false)}" alt=""><span class="lg-art" style="background-image:url('${la}')"></span><i class="lg-shine"></i></span>`;
  }
  const n = locked ? 1 : customFrames(d.id);
  if (n <= 1) return `<img class="${cls}" src="${cardArt(d, locked)}" alt="">`;
  return `<span class="gif3">${Array.from({ length: n }, (_, i) => `<img class="${cls}${i ? ` gf gf${i}` : ''}" src="${cardArt(d, false, i)}" alt="">`).join('')}</span>`;
};

/** 🃏 카드 뷰어: 실물 카드처럼 크게. 기울이면 홀로그램, 누르면 뒤집힌다 (공략법 제공) */
function cardViewer(g: GameState, id: string): string {
  const d = CARD[id];
  const hs = (g.cards ?? []).filter((c) => c.id === id);
  const got = hs.length > 0;
  const isHidden = !!d.hidden;
  const isSuper = isHidden && isSuperHidden(id);
  const activeSex: 'M' | 'F' = ui.viewerSex ?? g.hiddenCardSex?.[id] ?? hs[hs.length - 1]?.sex ?? 'F';
  const hp = got ? g.people[hs[0].personId] : undefined;
  const hj = HIDDEN_BY_ID[id];
  const hasArtM = !!hiddenArt(id, 'M');
  const hasArtF = !!hiddenArt(id, 'F');
  const hasBothSex = hasArtM && hasArtF;

  return `
  <div class="modal cv-modal" data-action="close-card">
    <div class="cv-wrap">
      <div class="cv-card ${d.rarity} ${got ? '' : 'locked'} ${isSuper ? 'is-super' : ''}" data-stop>
        <div class="cv-face cv-front${d.hidden ? ' cv-hidden' : ''}">
          ${cardImg(d, !got, 'cv-img', isHidden ? activeSex : undefined)}${d.hidden ? '<!--' : ''}
          <div class="cv-no">No.${String(cardNo(id)).padStart(3, '0')} · ${RARITY_NAME[d.rarity]}</div>
          ${hp ? `<img class="cv-portrait" src="${portraitURL(hp, alive(hp) ? age(g, hp) : hp.deathYear! - hp.birthYear)}" alt="">` : ''}
          <div class="cv-bottom">
            <b class="cv-title">${got ? d.name : '???'}</b>
            ${got ? `<b>${hs.map((c) => esc(fullName(g.people[c.personId]))).join(', ')}</b><small>${hs[0].year}년 획득</small>` : `<b>미획득</b><small>${esc(d.how)}</small>`}
            <em>${esc(effText(d.eff))}</em>
          </div>${d.hidden ? '-->' : ''}
          <i class="cv-holo"></i>
        </div>
        <div class="cv-face cv-back">
          <img class="cv-img" src="${cardBackURL(d.rarity)}" alt="">
          <div class="cv-back-top">명예의 전당 · ${isSuper ? '슈퍼 히든' : isHidden ? '히든 직업' : RARITY_NAME[d.rarity]}</div>
          <div class="cv-crest">${esc(g.familyName)}</div>
          <div class="cv-back-bottom">
            <b>${d.hidden && !got ? 'HIDDEN JOB' : d.name}</b>
            ${
              d.hidden
                ? `<div class="cv-guide-box">
                    ${isSuper && !got
                      ? `<div class="cv-guide-title">🌑 수수께끼</div>
                    <div class="cv-guide-body">${esc(hj?.hint ?? '???')}<br><small style="opacity:.7">공략법은 카드를 얻으면 공개된다</small></div>`
                      : `<div class="cv-guide-title">📜 ${got ? d.name : 'HIDDEN JOB'} 공략법</div>
                    <div class="cv-guide-body">${esc(hj?.strategy || d.how)}</div>`}
                    ${got && hs.length ? `<div class="cv-owners-list">달성자: ${hs.map((c) => `${c.sex === 'M' ? '♂' : '♀'} ${esc(fullName(g.people[c.personId]))} (${c.year}년)`).join(' · ')}</div>` : ''}
                  </div>`
                : `<small>${esc(d.how)}</small>`
            }
            ${got || !d.hidden ? `<em class="cv-eff" style="display:block;margin-top:6px;color:#ffe08a;font-weight:bold;font-size:12px;">✨ ${esc(effText(d.eff))}</em>` : ''}
            ${d.honor && HONORS[d.honor] ? `<small>🎖 ${HONORS[d.honor].name}</small>` : ''}
          </div>
        </div>
      </div>
      <div class="cv-ctrl-bar" data-stop>
        ${
          isHidden && hasBothSex
            ? `<button class="cv-ctrl-btn ${activeSex === 'M' ? 'active' : ''}" data-action="toggle-card-sex" data-id="${id}" data-v="M">♂ 남성 카드</button>
               <button class="cv-ctrl-btn ${activeSex === 'F' ? 'active' : ''}" data-action="toggle-card-sex" data-id="${id}" data-v="F">♀ 여성 카드</button>`
            : ''
        }
        <button class="cv-ctrl-btn" data-action="flip-card">🔄 카드 뒤집기 (공략법)</button>
        ${isHidden && got && hiddenArt(id, activeSex)?.vid ? `<button class="cv-ctrl-btn vid-btn" data-hid-replay="viewer">🎬 영상 보기</button>` : ''}
        ${
          isHidden && isTestMode()
            ? `<button class="cv-ctrl-btn" style="background:#551133;color:#ff99bb;border-color:#ff3366;" data-action="preview-reward" data-id="${id}">🎬 획득 연출 보기</button>`
            : ''
        }
      </div>
      <div class="cv-hint">
        ${got ? `<div style="background:rgba(20,15,10,0.9);padding:8px 14px;border-radius:10px;margin-bottom:8px;color:#ffe08a;border:1px solid rgba(255,224,138,0.5);font-size:12px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.6);"><b style="color:#fff;">✨ [가문 지속 효과]</b><br>${esc(effText(d.eff))}</div>` : ''}
        ↔ 카드를 누르거나 뒤집기 버튼으로 공략법을 확인하세요
      </div>
    </div>
  </div>`;
}
/** 🎖 훈장 보기: 벨벳 상자에 담긴 실물 훈장. 끌어 돌리면 뒷면 새김 */
function honorViewer(g: GameState, idx: number): string {
  const x = g.honors![idx];
  const d = HONORS[x.id];
  const who = g.people[x.personId];
  const nth = (g.honors ?? []).filter((h) => h.id === x.id).indexOf(x) + 1;
  return `
  <div class="modal cv-modal hv-modal" data-action="close-card">
    <div class="cv-wrap">
      <div class="hv-case ${d.rarity}">
        <div class="cv-card hv-medal ${d.rarity}" data-stop>
          <div class="cv-face cv-front"><img class="cv-img" src="${medalURL(x.id, d.icon, d.rarity)}" alt=""><i class="hv-shine"></i></div>
          <div class="cv-face cv-back"><img class="cv-img" src="${medalURL(x.id, d.icon, d.rarity, true)}" alt="">
            <div class="hv-engrave"><b>대한민국</b><span>${esc(fullName(who))}</span><small>${x.year}</small></div>
          </div>
        </div>
      </div>
      <div class="hv-cap">
        <b>${d.name}</b>
        <small>${esc(d.desc)}</small>
        <div class="hv-cert">수여 <b>${esc(fullName(who))}</b> · ${x.year}년${nth > 1 ? ` · 가문 ${nth}번째` : ''} · 가문 명성 +${d.fame} · ${RARITY_NAME[d.rarity]}</div>
      </div>
      <div class="cv-hint">↔ 훈장을 옆으로 밀어 뒷면 새김을 보세요 · 바깥을 누르면 닫혀요</div>
    </div>
  </div>`;
}

/** 가문별 최고 총점 (이 기기에만) */
function bestScore(g: GameState, now: number): number {
  const key = `gamun-best-${g.seed}`;
  try {
    const b = Number(localStorage.getItem(key) ?? 0);
    if (now > b) localStorage.setItem(key, String(now));
    return Math.max(b, now);
  } catch {
    return now;
  }
}

/** 연말 뉴스: 종이 신문 → 포털 → AR 피드 → AI 브리핑 */
function newsBlock(year: number, news: string[], trends: string[]): string {
  if (!news.length) return '';
  const items = news.map((l) => l.slice(3));
  const m = newsMedium(year);
  if (m === 'paper')
    return `<div class="paper"><div class="paper-mast">📰 올해의 신문 <small>${year}년</small></div>${items.map((l, i) => `<div class="paper-item ${i === 0 ? 'lead' : ''}">${esc(l)}</div>`).join('')}</div>`;
  if (m === 'portal') {
    const press = ['연합통신', '한빛일보', '누리경제', '새날뉴스', '미래신문', '한결방송'];
    const trend = trends[0] ? trends[0].slice(3).split(' · ') : [];
    return `<div class="portal">
      <div class="pt-bar"><b class="pt-logo">누리</b><div class="pt-search"><span>${year}년 올해의 뉴스</span><i>🔍</i></div></div>
      <div class="pt-tabs"><span class="on">뉴스</span><span>경제</span><span>사회</span><span>IT·과학</span></div>
      ${trend.length ? `<div class="pt-trend"><b>실시간 검색어</b>${trend.map((t, i) => `<span><em>${i + 1}</em>${esc(t)}</span>`).join('')}</div>` : ''}
      ${items.map((l, i) => `<div class="pt-item"><i class="pt-thumb" style="--h:${(year * 37 + i * 71) % 360}"></i><div><b>${esc(l)}</b><small>${press[(year + i) % press.length]} · ${1 + ((year * 7 + i * 5) % 11)}시간 전</small></div></div>`).join('')}
    </div>`;
  }
  if (m === 'shorts') {
    // 세로 숏폼 영상 뉴스: 넘겨 보는 카드, 조회수·좋아요, 자동 자막
    const ch = ['뉴스한입', '1분뉴스', '오늘의이슈', '팩트체크K', '세상요약'];
    return `<div class="shorts"><div class="sh-top">▶ 숏폼 뉴스 <small>${year} · 위로 넘겨 보기</small></div><div class="sh-reel">${items
      .map(
        (l, i) =>
          `<div class="sh-clip" style="--h:${(year * 53 + i * 97) % 360};animation-delay:${i * 120}ms"><div class="sh-cap">${esc(l)}</div><div class="sh-meta"><b>@${ch[(year + i) % ch.length]}</b><span>▶ ${(((year * 7 + i * 13) % 90) + 10) / 10}만 · ♥ ${((year + i * 31) % 50) + 3}천</span></div></div>`,
      )
      .join('')}</div></div>`;
  }
  if (m === 'feed')
    return `<div class="feed"><div class="fd-top">👓 오늘의 피드 <small>${year}</small></div>${items.map((l, i) => `<div class="fd-item" style="animation-delay:${i * 90}ms"><span class="fd-dot"></span>${esc(l)}</div>`).join('')}</div>`;
  if (m === 'neural')
    return `<div class="nrl"><div class="nrl-h">🧠 뉴럴 뉴스 <small>${year} · 생각으로 도착한 소식</small></div>${items.map((l, i) => `<div class="nrl-item" style="animation-delay:${i * 220}ms">${esc(l)}</div>`).join('')}</div>`;
  return `<div class="aib"><div class="aib-h"><span class="aib-av">🤖</span><b>AI 비서</b><small>${year}년 한 해 브리핑</small></div>
    <div class="aib-msg">올해 알아 두실 소식 ${items.length}가지를 정리했어요.</div>
    ${items.map((l, i) => `<div class="aib-msg" style="animation-delay:${200 + i * 160}ms"><em>${i + 1}</em> ${esc(l)}</div>`).join('')}</div>`;
}

function reportModal(r: { title: string; lines: string[] }): string {
  const news = r.lines.filter((l) => l.startsWith('📰 '));
  const trends = r.lines.filter((l) => l.startsWith('🔎 '));
  const rest = r.lines.filter((l) => !l.startsWith('📰 ') && !l.startsWith('🔎 '));
  const year = Number(r.title.match(/\d{4}/)?.[0] ?? 2025);
  return `
  <div class="modal" data-action="ok-report">
    <div class="event report" data-stop>
      <h3>${esc(r.title)}</h3>
      ${newsBlock(year, news, trends)}
      <ul>${rest.map((l, i) => `<li style="animation-delay:${120 + Math.min(i, 12) * 45}ms">${esc(l)}</li>`).join('') || '<li class="muted">조용한 한 해였다.</li>'}</ul>
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
    <p class="fine">미취학: 기본 ${formatMoney(300)} · 사교육 ${formatMoney(1200)} · 올인 ${formatMoney(3000)} /년. 학령기부터는 해마다 학년 이벤트로 고른다.<br>사교육비가 쌓일수록 수능에 유리하지만, 아이의 행복은 줄어든다.</p>
  </section>
  <p class="fine" style="text-align:center">효과음·진동·글자 크기는 위쪽 ⚙ 설정에서.</p>`;
}

/** 자산 한 줄: 이름·시세·빚, 실거주면 표시 */
function assetRow(a: Asset, sellable: boolean, live = false): string {
  return `<div class="arow"><span>${treasureOf(a)?.icon ?? ASSET_ICONS[a.kind]} ${esc(a.name)}${a.kind === "treasure" && a.prev ? ` ${pct(a.value / a.prev - 1)}` : ""}${live ? ' <b class="tag home">실거주</b>' : ''}</span><span>${formatMoney(a.value)}${liab(a) ? ` <small class="neg">(빚 ${formatMoney(liab(a))})</small>` : ''} ${sellable ? `<button class="mini" data-action="sell" data-id="${a.id}">매도</button>` : ''}</span></div>`;
}

const pct = (v?: number) => (v === undefined ? '' : `<small class="${v >= 0 ? 'up' : 'down'}">${v >= 0 ? '▲' : '▼'}${Math.abs(v * 100).toFixed(1)}%</small>`);

const ASSET_SUBS: [string, string][] = [
  ['sum', '📒 요약'],
  ['home', '🏠 집·부동산'],
  ['inv', '📈 투자'],
  ['car', '🚗 차'],
  ['fam', '👪 가족 재산'],
  ['tax', '📜 상속·증여'],
];

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
  const cur = ui.assetSub ?? 'sum';
  const on = (k: string) => cur === k;
  const chips = ASSET_SUBS.filter(([k]) => k !== 'car' || age(g, h) >= 19)
    .map(([k, l]) => `<button data-action="asset-sub" data-v="${k}" class="${cur === k ? 'on' : ''}">${l}</button>`)
    .join('');
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
  <div class="cat-chips sub-chips">${chips}</div>
  ${g.assets.some((a) => /지분 \d+%/.test(a.name)) ? `<p class="fine share-note">🧩 <b>지분 N%</b> = 상속 때 한 채(한 필지)를 여러 상속인이 나눠 가진 몫. 시세의 N%만큼이 그 사람 재산이고, 월세·임대료도 그 비율만큼 받는다. 팔 때도 자기 지분만 판다 (다른 상속인 몫은 그대로).</p>` : ''}
  ${on('sum') ? mineCard(g) + budgetCard(g) : ''}
  ${on('home') ? homeCard(g) + realtyCard(g) : ''}
  ${on('car') ? vehicleCard(g) : ''}
  ${on('fam') ? parentsCard(g) : ''}

  ${
    on('fam') && members.length
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


  ${
    on('inv')
      ? `<section class="card">
    <h2>투자 시장 <small class="muted">가주 명의로 매수</small></h2>
    ${(() => {
      const held = mine.filter((a) => a.kind === 'stock' || a.kind === 'coin' || a.kind === 'art' || a.kind === 'treasure');
      return held.length ? `<h4 class="sub">💼 내 투자</h4>${held.map((a) => assetRow(a, true)).join('')}` : '';
    })()}
    <div class="mkt">${(REAL_ESTATE as AssetKind[]).map((k) => `<span>${ASSET_ICONS[k]} ${ASSET_NAMES[k].replace('강남 ', '서울 ')} ${pct(g.marketChange[k as MarketKey])}</span>`).join('')}</div>
    ${(['stock', 'coin'] as const)
      .filter((k) => k !== 'coin' || g.era !== 'history' || g.year >= 2014)
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
    <h4 class="sub">💰 현물 자산 · 금·은·보석 (금 지수 ${Math.round(goldIndex(g) * 10) / 10}, 2025년=100)</h4>
    ${TREASURES.filter((x) => !x.from || g.year >= x.from).map((x) => {
      const price = treasurePrice(g, x);
      return `<div class="arow"><span>${x.icon} ${esc(x.name)}<br><small class="muted">${esc(x.note)}</small></span><span class="buy-c"><b>${formatMoney(price)}</b><button class="mini" data-action="buy-t" data-id="${x.id}" ${head(g).cash >= price ? '' : 'disabled'}>구입</button></span></div>`;
    }).join('')}
    <p class="fine">금·은은 금값을 따라가고(1980년 오일쇼크·2008년 금융위기·2020년대 금값 랠리처럼), 보석·시계·와인은 물건마다 따로 움직인다. 되팔 땐 매입가 차이만큼 깎인다(골드바 2~4%, 보석 40~50%). 보석·시계는 드물게 도둑맞을 수 있다. 상속세는 시가로 매긴다.</p>
  </section>`
      : ''
  }

  ${
    on('tax')
      ? `<section class="card">
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
          <p class="fine">${esc(fullName(to))}에게 해마다 자동으로 보낸다. 10년 공제 한도(성인 ${formatMoney(5000)})를 나눠 쓰면 세금이 거의 없다.</p>
          ${
            Object.entries(g.policy.autoGifts ?? {}).filter(([, v]) => v).length
              ? `<div class="auto-list">${Object.entries(g.policy.autoGifts ?? {})
                  .filter(([id, v]) => v && g.people[id])
                  .map(([id, v]) => `<div class="arow"><span>🔁 ${esc(fullName(g.people[id]))}</span><span>연 ${formatMoney(v)}</span></div>`)
                  .join('')}</div>`
              : ''
          }
          <p class="fine">10년 합산 공제: 배우자 ${formatMoney(60000)} · 성인 자녀 ${formatMoney(5000)} · 미성년 ${formatMoney(2000)}. 손주에게 바로 주면 세금 30% 할증(세대생략). 사망 전 10년 내 증여는 상속재산에 다시 합산되니 일찍 줄수록 유리.</p>`
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
    ${
      mine.filter((a) => a.kind !== 'stock' && a.kind !== 'coin').length && recipients.length
        ? `<h4 class="sub">📌 이건 이 사람에게 (지정 상속)</h4>
      ${mine
        .filter((a) => a.kind !== 'stock' && a.kind !== 'coin')
        .map(
          (a) => `<div class="arow"><span>${ASSET_ICONS[a.kind]} ${esc(a.name)}<br><small class="muted">${formatMoney(a.value)}</small></span>
          <span><select id="heir-${a.id}" class="heir-sel"><option value="">법대로 나눔</option>${recipients.map((p) => `<option value="${p.id}" ${a.heir === p.id ? 'selected' : ''}>${esc(fullName(p))} (${esc(relationLabel(g, p))})</option>`).join('')}</select></span></div>`,
        )
        .join('')}
      <p class="fine">${g.willWritten ? '유언장에 적어 두었다. 떠나면 이대로 넘어간다.' : '⚠ 유언장을 써야 효력이 있다 (위의 유언 방식 버튼).'} 지정한 자산만큼 그 사람의 몫에서 빠진다. 상속세는 전체 재산에 매긴다.</p>`
        : ''
    }
    <p class="fine">유언장을 쓰면 재산이 뜻대로 가지만 기력이 쇠해 수명이 조금 줄어든다. 안 쓰면 오래 버티지만, 떠난 뒤 부동산이 급매되고 자식들이 다툰다.<br>후계자에게 몰아주면 재산을 지키기 쉽지만, 몫을 못 받은 형제는 불만을 품는다.</p>
  </section>`
      : ''
  }`;
}

const AUTO_GIFT_STEPS = [0, 300, 500, 1000, 2500, 5000];

/** 행동 탭: 턴을 넘기기 전에 직접 하는 일. 분류 칩으로 한 묶음씩 보여 줘서 스크롤을 줄인다 */
function actionsScreen(g: GameState): string {
  const ap = apLeft(g);
  // 근현대사: 그 시절에 없던 행동은 숨기고 (코딩 학원·코인 …), 이름은 시대말로
  const all = ACTIONS.filter((a) => forHead(g, a) && !anachronistic(g, a.name + ' ' + a.desc)).map((a) => (a.label ? { ...a, ...a.label(g) } : a)).map((a) => ({ ...a, name: periodize(g, a.name), desc: periodize(g, a.desc) }));
  // 겸직: 본업 행동과 겸직 행동을 탭으로 나눈다
  const me0 = head(g);
  const sideT = sideTrackOf(me0);
  const mainT = trackOf(g, me0);
  const sj0 = sideJobOf(me0);
  // 겸직 탭: 겸직 트랙 행동 + 겸직 직업 전용 행동
  const sideOnly = (a: (typeof all)[number]) => !!sideT && ((!!a.tracks?.includes(sideT) && !a.tracks.includes(mainT ?? '')) || (!!sj0 && sj0 !== me0.job && a.id.startsWith(`ja_${sj0}_`)));
  const onSide = !!sideT && !!ui.actSide;
  const list = sideT ? all.filter((a) => (onSide ? sideOnly(a) : !sideOnly(a))) : all;
  const sideJ = sideJobOf(me0);
  const jobTabs = sideT ? `<div class="job-tabs"><button data-action="act-side" data-v="0" class="${onSide ? '' : 'on'}">💼 본업 · ${esc(jobShort(g, me0))}</button><button data-action="act-side" data-v="1" class="${onSide ? 'on' : ''}">🎨 겸직 · ${esc(JOBS[sideJ!]?.name ?? '')}</button></div>` : '';
  const cats = [...new Set(list.map((a) => a.cat))] as ActionCat[];
  const cat = ui.actCat && cats.includes(ui.actCat as ActionCat) ? (ui.actCat as ActionCat) : cats[0];
  const money = canSpend(g);
  const car = vehicleAP(g);
  const fits = new Set<string>(fitCats(head(g), 2));
  const isFit = (a: (typeof list)[number]) => !!a.fit && fits.has(a.fit);
  const row = (a: (typeof list)[number]) => {
    const targets = a.targets?.(g) ?? [];
    let blocked = a.blocked?.(g, targets[0]);
    const used = g.actUsed?.[a.id] ?? 0;
    const oppAlreadyDone = a.cat === '올해의 기회' && Object.keys(g.actUsed ?? {}).some((k) => ACTIONS.find((x) => x.id === k)?.cat === '올해의 기회');
    if (!blocked) {
      if (a.cat === '올해의 기회' && oppAlreadyDone) blocked = '올해의 할 일(기회) 완료 (한 해 1개 제한)';
    }
    const disabled = ap < a.ap || !!blocked || (a.cost ?? 0) > money;
    const why = blocked ?? ((a.cost ?? 0) > money ? '돈 부족' : ap < a.ap ? '행동력 부족' : used ? `올해 ${used}번 · 효과↓` : '');
    return `<div class="act ${disabled ? 'off' : ''} ${isFit(a) ? 'fit' : ''}">
      <span class="act-i">${a.icon}</span>
      <div class="act-m">
        <b>${a.name}${isFit(a) ? ' <em class="fit-b">💡 적성</em>' : ''}</b>
        <small>${esc(a.desc)}</small>
        <span class="badges">${a.ap ? `<b>⚡${a.ap}</b>` : '<b>무료</b>'}${a.cost ? `<b class="cost">💰${formatMoney(a.cost)}</b>` : ''}${why ? `<b class="why">${esc(why)}</b>` : ''}</span>
        ${targets.length > 1 ? `<select id="act-t-${a.id}">${targets.map((p) => `<option value="${p.id}">${esc(fullName(p))} (${esc(relationLabel(g, p))}·${age(g, p)})</option>`).join('')}</select>` : targets.length ? `<input type="hidden" id="act-t-${a.id}" value="${targets[0].id}"><small class="to">→ ${esc(fullName(targets[0]))}</small>` : ''}
      </div>
      <button class="mini do" data-action="act" data-id="${a.id}" ${disabled ? 'disabled' : ''}>하기</button>
    </div>`;
  };
  return `
  <section class="ap-bar">
    <div><b>올해의 할 일</b> <small>${STAGE_NAMES[stageOf(g, head(g))]}${!['none', 'parttime', 'pension'].includes(me0.job) ? ` · ${esc(jobShort(g, me0))}` : TRACK_NAMES[mainT ?? ''] ? ` · ${TRACK_NAMES[mainT!]}` : ''}${sideJ ? ` · 겸직 ${esc(JOBS[sideJ]?.name ?? '')}` : ''}</small></div>
    <span class="ap" title="행동력: 생활 수준 검소 2·보통 3·호화 4${car ? ` + 탈것 ${car}` : ''}">${'●'.repeat(ap)}${'○'.repeat(Math.max(0, apMax(g) - ap))}</span>
  </section>
  ${jobTabs}
  <div class="cat-chips">${cats
    .map((c) => {
      const n = list.filter((a) => a.cat === c).length;
      return `<button data-action="act-cat" data-v="${c}" class="${c === cat ? 'on' : ''}">${c} <small>${n}</small></button>`;
    })
    .join('')}</div>
  <section class="card acts">${[...list.filter((a) => a.cat === cat && isFit(a)), ...list.filter((a) => a.cat === cat && !isFit(a))].map(row).join('')}</section>
  ${list.some(isFit) ? `<p class="fine fit-note">💡 = ${esc(fullName(head(g)))}의 성향·적성(${[...fits].map((c) => JOB_CATS[c as keyof typeof JOB_CATS]?.split(' ')[1] ?? c).join('·')})에 잘 맞는 활동. 해 볼수록 그 분야로 진로가 열린다.</p>` : ''}
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
      <div class="set-row"><span>가주 테마</span>${seg('pref-theme', prefs.theme === false ? 0 : 1, [[1, '켜기'], [0, '끄기']])}</div>
      <div class="set-row"><span>돈 표시</span>${seg('pref-money', prefs.money ?? 'nominal', [['nominal', '그해 물가'], ['real', '2025년 돈']])}</div>
      <div class="set-row"><span>글자 크기</span>${seg('pref-text', prefs.text ?? 'm', [['s', '작게'], ['m', '보통'], ['l', '크게']])}</div>
      <div class="set-row"><span>가계도 보기</span>${seg('zoom', ui.zoom, [['big', '크게'], ['mid', '보통'], ['small', '작게']])}</div>
      <div class="set-info">
        <div class="sh-row"><span>가문</span><span>${esc(g.familyName)}씨 ${g.generation}대 · ${g.year}년</span></div>
        <div class="sh-row"><span>가주</span><span>${esc(fullName(h))} ${age(g, h)}세</span></div>
        <div class="sh-row"><span>자동 저장</span><span>해마다 이 기기(브라우저)에</span></div>
      </div>
      <h3 class="set-h">💾 저장 슬롯</h3>
      ${slotRows(true)}
      <details class="code-box"><summary>📋 저장 코드 (다른 기기로 옮기기)</summary>
        <p class="fine">아래 코드를 복사해 두면 다른 기기나 브라우저에서 이어 할 수 있다. 붙여넣고 불러오기를 누르면 그 가문으로 바뀐다.</p>
        <textarea id="save-code" rows="3" placeholder="GAMUN1:..."></textarea>
        <div class="row2"><button class="btn" data-action="code-copy">지금 가문 코드 복사</button><button class="btn" data-action="code-load">붙여넣은 코드 불러오기</button></div>
      </details>
      ${ui.saveMsg ? `<p class="save-msg">${esc(ui.saveMsg)}</p>` : ''}
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
      val: own ? `시세 ${formatMoney(own.value)}${chg(own)}` : home.type === 'jeonse' ? `보증금 ${formatMoney(home.deposit)}` : home.type === 'wolse' ? `월세 연 ${formatMoney(home.rent)}` : '',
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
      val: formatMoney(a.value) + (car ? '' : chg(a)),
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
              (x) => `<button class="prop ${x.cls}" data-action="tab" data-v="assets" data-sub="${x.cls === 'car' ? 'car' : 'home'}">
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
    ${me.flags.includes('license') ? '' : `<p class="fine">🚦 운전면허가 없다. <button class="mini" data-action="tab" data-v="act">행동 탭</button>에서 먼저 면허를 따야 차를 살 수 있다 (학원비 약 ${formatMoney(77)}).</p>`}
    <details class="moves"><summary>매장 둘러보기</summary>
      ${VEHICLES.map((m) => {
        const price = vehiclePrice(g, m);
        const tax = vehicleTax(price, m);
        return `<div class="arow veh"><span><img class="vpx" src="${buildingURL(m.sprite, seedOf(m.id))}" alt=""> ${m.icon} ${esc(m.name)}<br><small class="muted">${esc(m.note)}<br>취득세 ${formatMoney(tax)} · 유지비 연 ${formatMoney(Math.round(m.upkeep * wageIndex(g.year)))} · 감가 연 ${Math.round(m.dep * 100)}%</small></span>
        <span class="buy-c"><b>${formatMoney(price)}</b><button class="mini" data-action="buy-car" data-id="${m.id}" ${money >= price + tax && me.flags.includes('license') ? '' : 'disabled'}>구입</button></span></div>`;
      }).join('')}
      <p class="fine">가격은 2025년 국내 신차가 대략치(트림에 따라 폭이 크다)에 물가를 반영. 취득세: 승용차 7% · 경차 4%(${formatMoney(75)} 감면) · 선박 3%, 고급선박 중과. 유지비엔 보험·자동차세·연료·정비(요트는 계류비·관리)가 들어 있고, 해마다 가계부에서 빠진다. 차는 15년쯤 타면 폐차.</p>
    </details>
  </section>`;
}

/** 직급 사다리: 지나온 자리 · 지금 자리 · 남은 자리, 그리고 다음 단계까지 */
function careerLadder(g: GameState, p: Person): string {
  const j = JOBS[p.job];
  const w = rankWord(p.job);
  const ts = j.titles!;
  const chips = ts.map((t, i) => `<b class="rk ${i < p.jobLevel ? 'done' : i === p.jobLevel ? 'now' : ''}">${esc(t)}</b>`).join('<i class="rk-arr">›</i>');
  const yrs = levelYears(g, p, false);
  const need = minYears(p.jobLevel, j.maxLevel);
  const next = p.jobLevel < j.maxLevel ? ts[p.jobLevel + 1] : undefined;
  const tip = next ? `이 자리 ${yrs}년째 · 다음 ${w.verb} 「${esc(next)}」 ${yrs >= need ? '가능 (능력·성실·실적이 높을수록 잘 된다)' : `까지 최소 ${need - yrs}년 더`}` : `${w.icon} 이 길의 꼭대기에 올랐다`;
  return `<div class="sh-row rk-row"><span>${w.noun}</span><span><span class="rk-ladder">${chips}</span><small class="muted">${tip}</small></span></div>`;
}

/** 능력치 판정 선택지의 성공 확률 뱃지 */
function oddsBadge(o?: number): string {
  if (o === undefined) return '';
  const pct = Math.max(1, Math.min(99, Math.round(o * 100)));
  return `<b class="odds ${pct >= 65 ? 'hi' : pct >= 35 ? 'mid' : 'lo'}" title="성공 확률">🎲 ${pct}%</b>`;
}

/** 큰 거래 확인 창 */
function tradeModal(tr: NonNullable<UIState['trade']>): string {
  return `
  <div class="modal" data-action="trade-cancel">
    <div class="event trade-confirm ${tr.sell ? 'sell' : 'buy'}" data-stop>
      <div class="tc-icon">${tr.icon}</div>
      <h3>${esc(tr.title)}</h3>
      <div class="tc-lines">${tr.lines.map((l) => `<div>${esc(l)}</div>`).join('')}</div>
      <div class="row2" style="display:flex;gap:10px;margin-top:14px">
        <button class="btn ghost" data-action="trade-cancel" style="flex:1">다시 생각해 본다</button>
        <button class="btn primary" data-action="trade-ok" style="flex:1">${tr.sell ? '판다' : '산다'}</button>
      </div>
    </div>
  </div>`;
}

/** 이 클릭이 큰 거래면 확인 창 내용을 만든다 (주식·코인처럼 잦은 거래는 묻지 않는다) */
function tradeAsk(g: GameState, a: string, id: string, v?: string, amt?: string): UIState['trade'] {
  const me = head(g);
  if (a === 'buy-car') {
    const m = VEHICLES.find((x) => x.id === id);
    if (!m) return undefined;
    const price = vehiclePrice(g, m);
    const tax = vehicleTax(price, m);
    return { a, id, icon: m.icon, title: `${m.name}을(를) 살까?`, lines: [`차값 ${formatMoney(price)} + 취득세 ${formatMoney(tax)}`, `합계 ${formatMoney(price + tax)}`, `유지비 해마다 약 ${formatMoney(Math.round(m.upkeep * wageIndex(g.year)))}`], sell: false };
  }
  if (a === 'buy-t') {
    const x = TREASURE_BY_ID[id];
    if (!x) return undefined;
    const price = treasurePrice(g, x);
    return { a, id, icon: x.icon, title: `${x.name}을(를) 살까?`, lines: [`값 ${formatMoney(price)}`, `되팔면 약 ${formatMoney(Math.round(price * (1 - x.spread)))} (매입가 차이 ${Math.round(x.spread * 100)}%)`, x.note], sell: false };
  }
  if (a === 'buy-l') {
    const l = g.listings?.find((x) => x.id === id);
    if (!l) return undefined;
    const q = buyQuote(g, householder(g), l);
    return { a, id, icon: ASSET_ICONS[l.kind], title: `${l.name} 매수`, lines: [`매매가 ${formatMoney(l.price)}`, `취득세 ${formatMoney(q.tax)} · 대출 최대 ${formatMoney(q.limit)}`, `필요 현금 ${formatMoney(q.need)}`], sell: false };
  }
  if (a === 'buy-home') {
    const b = homeBuyQuote(g, me);
    if (!b) return undefined;
    return { a, id, icon: '🏡', title: '살던 집을 산다', lines: [`집값 ${formatMoney(b.price)}`, `대출 ${formatMoney(b.loan)} (보증금은 돌려받아 보탠다)`], sell: false };
  }
  if (a === 'sell') {
    const x = g.assets.find((y) => y.id === id);
    if (!x || x.kind === 'stock' || x.kind === 'coin') return undefined;
    return { a, id, icon: treasureOf(x)?.icon ?? ASSET_ICONS[x.kind] ?? '🏷', title: `${x.name}을(를) 팔까?`, lines: [`지금 시세 ${formatMoney(x.value)}`, ...(x.kind === 'treasure' ? [`손에 쥐는 돈 약 ${formatMoney(treasureSellValue(x))}`] : []), ...(liab(x) ? [`갚아야 할 빚 ${formatMoney(liab(x))}`] : []), isRealty(x) ? '양도세·중개수수료를 떼고 받는다' : '팔면 되돌릴 수 없다'], sell: true };
  }
  void v;
  void amt;
  return undefined;
}

/** 거래 성사 도장 (1.8초) */
function stampTrade(sell: boolean, icon: string, text: string) {
  const n = Date.now();
  ui.stamp = { sell, icon, text, n };
  sfx(sell ? 'coin' : 'great');
  setTimeout(() => {
    if (ui.stamp?.n === n) (ui.stamp = undefined), root.querySelector('.trade-stamp')?.remove();
  }, 1900);
}

/** 대형 이벤트(미니게임) 창: 라운드 점, 점수 막대, 지난 라운드 결과 */
function bigModal(g: GameState, cur: NonNullable<ReturnType<typeof currentEvent>>): string {
  const d = cur.ev.data as { id: string; r: number; sc: number; last?: string; stake?: boolean };
  const b = BIG_BY_ID[d.id];
  const p = g.people[cur.ev.personId];
  const pct = Math.max(0, Math.min(100, (d.sc / b.goal) * 100));
  const dots = b.rounds.map((_, i) => `<i class="${i < d.r ? 'done' : i === d.r ? 'now' : ''}"></i>`).join('');
  const good = d.last?.startsWith('✅');
  const bannerKey = BIG_BANNER_MAP[d.id] ?? d.id;
  const bannerSrc = eventBannerURL(bannerKey);
  return `
  <div class="modal">
    <div class="event big-ev big-${d.id}${bannerSrc ? ' with-banner' : ''}">
      ${bannerSrc ? `<div class="event-banner"><img src="${bannerSrc}" alt="${esc(b.title)}"></div>` : ''}
      <div class="big-top"><span class="big-icon">${b.icon}</span><div><b>${esc(b.title)}</b><small>${esc(p ? fullName(p) : '')} · ${esc(b.rounds[d.r].title)}</small></div></div>
      <div class="big-dots">${dots}</div>
      <div class="big-meter"><span>${esc(b.meter)}</span><div class="bm-bar"><i style="width:${pct}%"></i><em style="left:100%"></em></div><b>${d.sc}${b.id === 'stocks' ? '%' : ''} / ${b.goal}${b.id === 'stocks' ? '%' : ''}</b></div>
      ${d.stake ? '<div class="big-stake">🔑 차 키가 걸린 승부</div>' : ''}
      ${d.last ? `<div class="big-last ${good ? 'ok' : d.last.startsWith('❌') ? 'no' : ''}">${esc(d.last)}</div>` : ''}
      <p class="ev-text">${nl(cur.text)}</p>
      <div class="choices">
        ${cur.choices
          .map(
            (c, i) => `<button class="choice" style="animation-delay:${140 + i * 55}ms" data-action="choose" data-i="${i}" ${c.disabled ? 'disabled' : ''}>
              <span class="cl">${esc(c.label)}</span>${c.odds !== undefined ? `<span class="badges">${oddsBadge(c.odds)}</span>` : ''}
            </button>`,
          )
          .join('')}
      </div>
    </div>
  </div>`;
}

/** 앨범 사진 한 장 (폴라로이드) */
function photoHTML(g: GameState, id: number, big = false): string {
  const ph = (g.photos ?? []).find((x) => x.id === id);
  if (!ph) return '';
  return `<figure class="album-photo${big ? ' big' : ''}" data-action="view-photo" data-id="${ph.id}"><img src="${photoURL(g, ph)}" alt=""><figcaption>${esc(ph.title)}<small>${ph.year}년 · ${PHOTO_NAME[ph.kind]}</small></figcaption></figure>`;
}

function logScreen(g: GameState): string {
  const items = g.log.slice(-400).reverse();
  const photos = [...(g.photos ?? [])].reverse();
  const album = photos.length
    ? `<section class="card album"><h2>📷 가문 앨범 <small class="muted">${photos.length}장</small></h2><div class="album-row">${photos.slice(0, ui.open?.album ? 999 : 8).map((ph) => photoHTML(g, ph.id)).join('')}</div>${photos.length > 8 ? `<button class="more-btn" data-action="more" data-v="album">${ui.open?.album ? '▲ 접기' : `▼ 전체 보기 (${photos.length}장)`}</button>` : ''}</section>`
    : `<section class="card album"><h2>📷 가문 앨범</h2><p class="fine">행동 탭 「가족」에서 가족사진을 찍거나, 돌잔치·결혼식·졸업식·환갑 같은 날 사진을 남기면 여기에 모인다.</p></section>`;
  return album + `<section class="card log">${items
    .map((l) => (l.text.startsWith('──') ? `<h4>${esc(l.text.replace(/─/g, '').trim())}</h4>` : `<div class="lg ${l.kind ?? ''}">${esc(l.text)}</div>`))
    .join('')}</section>`;
}

function achvScreen(g: GameState): string {
  const cur = (g.missions ?? []).filter((m) => m.gen === g.generation);
  const past = (g.missions ?? []).filter((m) => m.gen !== g.generation);
  const cats = [...new Set(Object.values(ACHIEVEMENTS).map((a) => a.cat))];
  const got = g.achievements.length;
  const total = Object.keys(ACHIEVEMENTS).length;
  const rk = rankOf(g);
  const cur0 = RANKS[rk];
  const nxt = RANKS[rk + 1];
  const tot = g.gloryTotal ?? 0;
  const pctR = nxt ? Math.round(((tot - cur0.at) / (nxt.at - cur0.at)) * 100) : 100;
  const honors = g.honors ?? [];
  const fsc = familyScore(g);
  const best = Math.max(fsc.total, bestScore(g, fsc.total));
  const dexGot = new Map<string, string[]>();
  for (const c of g.cards ?? []) dexGot.set(c.id, [...(dexGot.get(c.id) ?? []), fullName(g.people[c.personId])]);
  return `
  <section class="card score-card">
    <div class="sc-l">가문 총점</div>
    <div class="sc-v">${fsc.total.toLocaleString()}<small>점</small></div>
    <div class="sc-best">🏅 최고 기록 ${best.toLocaleString()}점</div>
    <div class="sc-parts">${fsc.parts.map((x) => `<span>${x.label} <b>${x.v.toLocaleString()}</b></span>`).join('')}</div>
    <p class="fine">가족이 세상을 떠날 때 「인생 성적표」를 받고, 그 점수가 가문 총점에 영원히 쌓인다. 가계도에서 사람을 누르면 지금까지의 인생 점수를 볼 수 있다.</p>
  </section>
  <section class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <h2 style="margin:0;">🃏 명예의 전당 카드 <small class="muted">${[...dexGot.keys()].filter((id) => !CARD[id]?.hidden).length}/${NORMAL_CARDS.length}종</small></h2>
      ${isTestMode() ? `<button class="mini do" data-action="unlock-all-cards" style="font-size:11px;padding:3px 10px;cursor:pointer;background:#442255;border-color:#bb66ff;color:#f0c0ff;">🧪 [테스트] 전 카드 해금</button>` : ''}
    </div>
    <div class="cdex">${[...NORMAL_CARDS].sort((a, b) => Number(dexGot.has(b.id)) - Number(dexGot.has(a.id))).slice(0, ui.open?.dex ? 999 : 6).map((d) => {
      const who = dexGot.get(d.id);
      return `<button class="dx ${who ? d.rarity : 'locked'}" data-action="card-view" data-id="${d.id}"><span class="dx-c">${cardImg(d, !who, 'dx-art')}<i class="dx-nm">${who ? d.name : '???'}</i></span><small>${who ? esc(who.join(', ')) : '미획득'}</small></button>`;
    }).join('')}</div>
    <button class="more-btn" data-action="more" data-v="dex">${ui.open?.dex ? '▲ 접기' : `▼ 더보기 (${NORMAL_CARDS.length - 6}종 더)`}</button>
    <p class="fine">★ 난이도 (★★★는 2단계 도전·선행 카드). 카드 주인이 살아 있는 동안 효과가 계속된다. 3·6·10·16·24종을 모으면 세트 보상.</p>
  </section>
  <section class="card">
    <h2>✨ 가문 시너지 <small class="muted">발동 ${activeSynergies(g).length}/${SYNERGIES.length}</small></h2>
    <p class="fine">조건 묶음마다 서로 다른 가족이 카드를 가져야 발동한다 (한 사람이 다 모으면 안 된다).</p>
    <div class="syn">${[...SYNERGIES].sort((a, b) => Number(activeSynergies(g).includes(b)) - Number(activeSynergies(g).includes(a))).slice(0, ui.open?.syn ? 99 : 3).map((sy) => {
      const on = activeSynergies(g).includes(sy);
      return `<div class="sy ${on ? 'on' : ''}"><img class="sy-crest" src="${crestURL(sy.id, [CARD[sy.groups[0][0]].icon, CARD[sy.groups[1][0]].icon], (SYN_THEME[sy.id] ?? 'power') as Theme, on)}" alt=""><div><b>${sy.name}</b> <small>${esc(sy.desc)}</small><em>${sy.groups.map((gr) => '[' + gr.map((id) => (dexGot.has(id) ? `✅${CARD[id].name}` : CARD[id].name)).join(' / ') + ']').join(' + ')}</em><em class="sy-eff">→ ${esc(effText(sy.eff))}</em></div></div>`;
    }).join('')}</div>
    <button class="more-btn" data-action="more" data-v="syn">${ui.open?.syn ? '▲ 접기' : `▼ 더보기 (${SYNERGIES.length - 3}개 더)`}</button>
    <p class="fine">서로 다른 분야의 카드 주인이 같은 시대에 함께 살아 있으면 발동한다.</p>
  </section>
  <section class="card hidden-dex">
    <h2>🌑 히든 카드 <small class="muted">${HIDDEN_CARDS.filter((d) => dexGot.has(d.id)).length}/${HIDDEN_CARDS.length}종</small></h2>
    <div class="cdex">${[...HIDDEN_CARDS].sort((a, b) => Number(dexGot.has(b.id)) - Number(dexGot.has(a.id))).slice(0, ui.open?.hdex ? 999 : 6).map((d) => {
      const who = dexGot.get(d.id);
      return `<button class="dx ${who ? 'hid' : 'locked'}" data-action="card-view" data-id="${d.id}"><span class="dx-c">${cardImg(d, !who, 'dx-art')}</span><small>${who ? esc(who.join(', ')) : '???'}</small></button>`;
    }).join('')}</div>
    <button class="more-btn" data-action="more" data-v="hdex">${ui.open?.hdex ? '▲ 접기' : `▼ 더보기 (${HIDDEN_CARDS.length - 6}종 더)`}</button>
    <p class="fine">어떤 직업인지는 얻어야 알 수 있다. 평범한 길 위의 뜻밖의 사건, 능력과 흔적, 가족의 직업이 숨은 문을 연다. 연대기에 가끔 남는 🌑 수수께끼가 힌트.</p>
  </section>
  <section class="card rank-card">
    <div class="rank-top"><span class="rank-ic">${cur0.icon}</span><div><b>${esc(g.familyName)}씨 가문 · ${cur0.name}</b><small>누적 명예 ${tot}✦${nxt ? ` · 다음 "${nxt.name}"까지 ${nxt.at - tot}✦` : ' · 최고 등급'}</small></div></div>
    <div class="rank-bar"><i style="width:${pctR}%"></i></div>
    <p class="fine">업적·훈장·출세·세대 미션을 이룰 때마다 명예(✦)가 쌓인다. 등급이 오르면 혜택이 붙고, 모은 명예는 아래 상점에서 쓸 수 있다.${RANKS.slice(1, rk + 1).filter((r) => r.perk).length ? `<br>받는 등급 혜택: ${RANKS.slice(1, rk + 1).filter((r) => r.perk).map((r) => r.perk).join(' · ')}` : ''}</p>
  </section>
  <section class="card">
    <h2>✦ 명예 상점 <small class="muted">보유 ${g.glory ?? 0}✦</small></h2>
    <div class="perks">${PERKS.map((pk) => {
      const lv = perkLv(g, pk.id);
      const cost = perkCost(g, pk);
      const max = cost === undefined;
      return `<div class="perk ${max ? 'max' : ''}"><span class="pk-i">${pk.icon}</span><div class="pk-m"><b>${pk.name} <small>${pk.repeat ? (lv ? `${lv}회` : '') : '★'.repeat(lv) + '☆'.repeat(pk.cost.length - lv)}</small></b><small>${pk.desc}</small></div><button class="mini do" data-action="buy-perk" data-id="${pk.id}" ${max || (g.glory ?? 0) < cost! ? 'disabled' : ''}>${max ? '완료' : `${cost}✦`}</button></div>`;
    }).join('')}</div>
  </section>
  <section class="card">
    <h2>🎖 가문의 훈장 <small class="muted">${honors.length}개</small></h2>
    ${honors.length ? `<div class="honors">${honors.map((x) => `<button class="honor ${HONORS[x.id].rarity}" data-action="honor-view" data-id="${(g.honors ?? []).indexOf(x)}"><img class="hn-art" src="${medalURL(x.id, HONORS[x.id].icon, HONORS[x.id].rarity)}" alt=""><b>${HONORS[x.id].name}</b><small>${esc(fullName(g.people[x.personId]))} · ${x.year}</small></button>`).join('')}</div>` : `<p class="fine">아직 없다. 공무원·교원으로 25년 넘게 봉직하고 퇴직하거나, 올림픽 금메달·노벨상·대통령·장관·기업 상장·거액 기부 등으로 받을 수 있다.</p>`}
  </section>
  ${
    g.rival
      ? `<section class="card">
    <h2>⚔️ 라이벌 가문: ${esc(g.rival.name)}씨 가문 <small class="muted">${rivalMood(g.rival)}</small></h2>
    <p>${esc(rivalLine(g, familyTotal(g)))}</p>
    <div class="feud"><i style="width:${Math.round(g.rival.feud)}%"></i></div>
    ${g.rival.move ? `<p class="rv-move">올해 저쪽의 한 수: ${esc(g.rival.move)}</p>` : ''}
    ${(g.rival.lead ?? 0) >= 2 ? `<p class="fine">🔥 ${g.rival.lead}년 연속 우리가 앞서는 중. 저쪽이 독기를 품었다 (성장 가속).</p>` : ''}
    <p class="fine">대표 ${esc(g.rival.boss)} · 명성 ${Math.round(g.rival.fame)} (우리 ${Math.round(g.fame)}) · 원한 ${Math.round(g.rival.feud)}/100. 해마다 저쪽도 한 수를 둔다. 행동 탭 '사회'에서 견제·화해, '재산'에서 지분 매입으로 맞설 수 있다.</p>
  </section>`
      : ''
  }
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
    <h2>🏆 가문의 가보 및 전리품 <small class="muted">${(g.relics ?? []).length}점</small></h2>
    ${(g.relics ?? []).length
      ? `<div class="relics-list" style="display:flex;flex-direction:column;gap:8px;">${(g.relics ?? []).map((r) => {
          const who = g.people[r.obtainedBy];
          const whoNm = who ? fullName(who) : '선대 어르신';
          const effStr = Object.entries(r.eff).map(([k, v]) => `${k === 'cash' ? `연 자산 +${formatMoney(v)}` : k === 'fame' ? `연 명성 +${v}` : `${k.toUpperCase()} +${v}`}`).join(' · ');
          return `<div class="achv done" style="border-left:3px solid #d4af37;padding:8px 10px;background:rgba(212,175,55,0.06);">
            <b>${r.icon} ${esc(r.name)} <small class="muted">(${r.obtainYear}년 · ${esc(whoNm)})</small></b>
            <span>${esc(r.desc)}</span>
            <div class="fine" style="color:#d4af37;margin-top:2px;">✦ 가문 영구 혜택: ${esc(effStr)}</div>
          </div>`;
        }).join('')}</div>`
      : `<p class="fine">아직 없다. 직업 전용 행동에서 대박을 터뜨리거나, 역사적 위업 및 전설적 사연을 통해 가문의 영원한 가보를 획득할 수 있다. 가보는 대를 이어 전해지며 후손에게 새로운 운명의 길을 열어준다.</p>`}
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
  if (t.id.startsWith('heir-')) {
    const a = ui.game?.assets.find((x) => x.id === t.id.slice(5));
    if (a) {
      a.heir = t.value || undefined;
      save();
    }
    return;
  }
  if (t.id === 'gift-to') {
    ui.giftTo = t.value;
    render();
  }
}

const SFX: Record<string, Sfx> = { choose: 'choose', next: 'next', buy: 'coin', 'buy-l': 'coin', repay: 'coin', sell: 'coin', gift: 'coin', 'gift-asset': 'coin', 'ok-outcome': 'close', 'ok-report': 'close', 'close-sheet': 'close', start: 'great', 'buy-car': 'coin' };
let leaving = false;

/** 카드 돌리기: 옆으로 끌면 실제 카드처럼 따라 돌고, 놓으면 앞/뒷면 중 가까운 쪽(빠르게 튕기면 다음 면)으로 붙는다. 톡 누르면 뒤집기 */
let spin: { c: HTMLElement; x0: number; base: number; last: number; t: number; v: number; moved: boolean } | null = null;
const spinOf = (c: HTMLElement) => parseFloat(c.style.getPropertyValue('--spin')) || 0;
function spinStart(e: PointerEvent) {
  const c = (e.target as HTMLElement)?.closest?.<HTMLElement>('.cv-card');
  if (!c) return;
  if (coast) cancelAnimationFrame(coast), (coast = 0); // 돌고 있는 카드를 잡으면 그 자리에서 멈춘다
  spin = { c, x0: e.clientX, base: spinOf(c), last: e.clientX, t: e.timeStamp, v: 0, moved: false };
  c.classList.add('drag');
  c.setPointerCapture?.(e.pointerId);
}
function spinMove(e: PointerEvent) {
  if (!spin) return;
  const dx = e.clientX - spin.x0;
  if (Math.abs(dx) > 6) spin.moved = true;
  const dt = Math.max(1, e.timeStamp - spin.t);
  spin.v = spin.v * 0.6 + ((e.clientX - spin.last) / dt) * 0.4;
  spin.last = e.clientX;
  spin.t = e.timeStamp;
  spin.c.style.setProperty('--spin', `${(spin.base + dx * 0.75).toFixed(1)}deg`);
  spin.c.style.setProperty('--ry', '0deg');
}
/** 세게 튕기면 관성으로 빙글빙글: 마찰로 서서히 느려지다가, 거의 멈추면 가까운 면(앞/뒤)에 살짝 튕기듯 붙는다 */
let coast = 0;
function spinEnd() {
  if (!spin) return;
  const { c, base, moved, v } = spin;
  spin = null;
  const cur = spinOf(c);
  if (!moved) {
    c.classList.remove('drag');
    sfx('choose');
    c.style.setProperty('--spin', `${(Math.round(base / 180) + 1) * 180}deg`);
    return;
  }
  // 손을 뗄 때 속도(px/ms) → 회전 속도(도/ms). 너무 빠르면 상한
  let w = Math.max(-4.5, Math.min(4.5, v * 0.75));
  if (Math.abs(w) < 0.35) {
    // 살살 놓으면 예전처럼: 가까운 면으로 (조금 튕겼으면 다음 면)
    c.classList.remove('drag');
    let k = Math.round(cur / 180);
    if (Math.abs(v) > 0.5 && k === Math.round(base / 180)) k += Math.sign(v);
    if (k !== Math.round(base / 180)) sfx('choose');
    c.style.setProperty('--spin', `${k * 180}deg`);
    return;
  }
  let a = cur;
  let t0 = performance.now();
  const step = (t: number) => {
    const dt = Math.min(40, t - t0);
    t0 = t;
    a += w * dt;
    w *= Math.exp(-0.0022 * dt); // 공기 저항 같은 마찰: 세게 돌릴수록 오래·많이 돈다
    c.style.setProperty('--spin', `${a.toFixed(1)}deg`);
    if (Math.abs(w) > 0.25 && c.isConnected) {
      coast = requestAnimationFrame(step);
      return;
    }
    // 거의 멈췄다: 돌던 방향으로 다음 면에 붙는다 (CSS 전환이 살짝 넘쳤다 돌아오는 느낌을 준다)
    coast = 0;
    c.classList.remove('drag');
    const k = w > 0 ? Math.ceil(a / 180) : Math.floor(a / 180);
    sfx('choose');
    c.style.setProperty('--spin', `${k * 180}deg`);
  };
  coast = requestAnimationFrame(step);
}

/** 카드 기울이기: 손가락·마우스 위치에 따라 3D로 기울고 홀로그램이 흐른다 */
function tilt(e: PointerEvent) {
  if (spin) return;
  const c = (e.target as HTMLElement)?.closest?.<HTMLElement>('.cv-card');
  if (!c) return;
  if (e.type === 'pointerleave') {
    c.style.setProperty('--rx', '0deg');
    c.style.setProperty('--ry', '0deg');
    return;
  }
  const r = c.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width;
  const y = (e.clientY - r.top) / r.height;
  c.style.setProperty('--ry', `${((x - 0.5) * 26).toFixed(1)}deg`);
  c.style.setProperty('--rx', `${((0.5 - y) * 22).toFixed(1)}deg`);
  c.style.setProperty('--mx', `${(x * 100).toFixed(0)}%`);
  c.style.setProperty('--my', `${(y * 100).toFixed(0)}%`);
}

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
        try {
          handle(el);
        } finally {
          if (m.isConnected && m.classList.contains('leaving')) m.remove(); // 다시 그려지지 않았어도 투명한 창이 남아 클릭을 막지 않게
        }
      }, 170);
      return;
    }
  }
  handle(el);
}

function advanceTurn(g: GameState) {
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

function handle(el: HTMLElement) {
  const a = el.dataset.action!;
  const v = el.dataset.v!;
  const id = el.dataset.id!;
  const g = ui.game;

  // 큰 거래는 확인 창을 거친다
  if (g && !el.dataset.ok && ['buy-car', 'buy-l', 'buy-home', 'buy-t', 'sell'].includes(a)) {
    const ask = tradeAsk(g, a, id, v, el.dataset.amt);
    if (ask) {
      ui.trade = ask;
      sfx('choose');
      render();
      return;
    }
  }

  switch (a) {
    case 'trade-cancel':
      ui.trade = undefined;
      break;
    case 'trade-ok': {
      const tr = ui.trade;
      ui.trade = undefined;
      if (!tr) break;
      const fake = document.createElement('button');
      Object.assign(fake.dataset, { action: tr.a, id: tr.id, ok: '1', ...(tr.v ? { v: tr.v } : {}), ...(tr.amt ? { amt: tr.amt } : {}) });
      const before = g ? g.assets.length + g.assets.reduce((n, x) => n + x.value, 0) : 0;
      handle(fake);
      const after = g ? g.assets.length + g.assets.reduce((n, x) => n + x.value, 0) : 0;
      if (before !== after) stampTrade(tr.sell, tr.icon, tr.title.replace(/을\(를\) (살|팔)까\?$/, ''));
      render();
      return;
    }
    case 'setup-sex':
      ui.setup.sex = v as Sex;
      break;
    case 'setup-era':
      ui.setup.era = v as 'modern' | 'history';
      break;
    case 'setup-origin':
      ui.setup.origin = v as Difficulty | 'random';
      break;
    case 'continue':
      ui.game = load();
      track('continue', '이어하기');
      break;
    case 'slot-save':
      ui.saveMsg = saveSlot(Number(v)) ? `슬롯 ${v}에 저장했다.` : '저장하지 못했다 (저장 공간 부족 또는 비공개 창).';
      break;
    case 'slot-load': {
      const g = loadSlot(Number(v));
      if (!g) {
        ui.saveMsg = '불러오지 못했다.';
        break;
      }
      ui.game = g;
      ui.tab = 'tree';
      ui.report = ui.outcome = ui.sheet = undefined;
      ui.settings = ui.confirmReset = false;
      ui.saveMsg = undefined;
      save();
      hasSave = true;
      break;
    }
    case 'slot-del':
      deleteSlot(Number(v));
      ui.saveMsg = `슬롯 ${v}을 비웠다.`;
      break;
    case 'code-copy': {
      if (!ui.game) break;
      const code = exportCode(ui.game);
      const ta = root.querySelector<HTMLTextAreaElement>('#save-code');
      if (ta) ta.value = code;
      navigator.clipboard?.writeText(code).then(
        () => ((ui.saveMsg = '저장 코드를 복사했다. 메모장 등에 붙여 두자.'), render()),
        () => ((ui.saveMsg = '자동 복사가 안 된다. 칸의 코드를 길게 눌러 직접 복사하자.'), render()),
      );
      ta?.select();
      return;
    }
    case 'code-load': {
      const ta = root.querySelector<HTMLTextAreaElement>('#save-code');
      const g = importCode(ta?.value ?? '');
      if (!g) {
        ui.saveMsg = '코드가 올바르지 않다. GAMUN1:로 시작하는 전체 코드를 붙여넣자.';
        break;
      }
      ui.game = g;
      ui.tab = 'tree';
      ui.report = ui.outcome = ui.sheet = undefined;
      ui.settings = ui.confirmReset = false;
      ui.saveMsg = undefined;
      save();
      hasSave = true;
      break;
    }
    case 'start': {
      const sn = (ui.setup.surname || '김').slice(0, 2);
      ui.game = newGame({ familyName: sn, sex: ui.setup.sex, difficulty: ui.setup.origin === 'random' ? undefined : ui.setup.origin, era: ui.setup.era === 'history' ? 'history' : undefined });
      if (typeof window !== 'undefined') {
        const pms = new URLSearchParams(window.location.search);
        if (pms.get('all_cards') === '1' || pms.has('unlock')) {
          const p = head(ui.game);
          ui.game.cards = CARDS.map((c) => ({ id: c.id, personId: p.id, year: ui.game!.year }));
          (ui.open ??= {})['dex'] = true;
          (ui.open ??= {})['hdex'] = true;
          (ui.open ??= {})['syn'] = true;
        }
      }
      ui.tab = 'tree';
      track(`start-${ui.setup.origin}`, `새 가문 (${ui.setup.origin})`);
      break;
    }
    case 'restart':
      clearSave();
      hasSave = false;
      ui.game = null;
      ui.report = ui.outcome = ui.sheet = undefined;
      ui.settings = ui.confirmReset = ui.overLog = false;
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
    case 'over-back':
      ui.overLog = false;
      break;
    case 'tab':
      if (g?.gameOver) ui.overLog = true;
      if (ui.tab !== v) window.scrollTo(0, 0); // 새 탭은 맨 위에서 시작
      ui.tab = v as Tab;
      ui.sheet = undefined;
      if (el.dataset.sub) ui.assetSub = el.dataset.sub;
      break;
    case 'person':
      ui.sheet = id;
      break;
    case 'gift-to':
      ui.giftTo = id;
      ui.sheet = undefined;
      ui.tab = 'assets';
      ui.assetSub = 'tax';
      window.scrollTo(0, 0);
      break;
    case 'close-sheet':
      ui.sheet = undefined;
      ui.settings = ui.confirmReset = false;
      break;
    case 'settings':
      ui.settings = true;
      ui.saveMsg = undefined;
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
    case 'pref-theme':
      prefs.theme = v === '1';
      savePrefs();
      break;
    case 'pref-calm':
      prefs.calm = v === '1';
      savePrefs();
      break;
    case 'pref-money':
      prefs.money = v as 'nominal' | 'real';
      setNominal(v !== 'real');
      savePrefs();
      break;
    case 'pref-text':
      prefs.text = v as TextSize;
      savePrefs();
      break;
    case 'card-view':
      ui.cardView = id;
      ui.viewerSex = undefined;
      break;
    case 'close-card':
      ui.cardView = ui.honorView = undefined;
      ui.viewerSex = undefined;
      break;
    case 'toggle-card-sex':
      ui.viewerSex = v as 'M' | 'F';
      break;
    case 'flip-card': {
      const cardEl = root.querySelector<HTMLElement>('.cv-card');
      if (cardEl) {
        const cur = spinOf(cardEl);
        const next = Math.round(cur / 180) % 2 === 0 ? 180 : 0;
        cardEl.style.setProperty('--spin', `${next}deg`);
      }
      break;
    }
    case 'preview-reward': {
      if (!g) break;
      const p = head(g);
      const isSuper = isSuperHidden(id);
      const tierName = isSuper ? '슈퍼 히든' : '히든';
      (g.rewards ??= []).unshift({
        id: (g.eventSeq = (g.eventSeq ?? 0) + 1),
        icon: CARD[id]?.icon ?? '✨',
        title: `${isSuper ? '👑' : '🌑'} ${tierName} 직업 달성: ${CARD[id]?.name ?? id}`,
        text: `${fullName(p)}이(가) ${isSuper ? '초월의 슈퍼 히든' : '전설의 히든'} 직업에 올랐다!`,
        rarity: isSuper ? 'legend' : 'epic',
        card: id,
        personId: p.id,
        pts: isSuper ? 100 : 50,
      });
      ui.cardView = undefined;
      ui.viewerSex = undefined;
      break;
    }
    case 'lease': {
      const a = g!.assets.find((x) => x.id === id);
      if (a) ui.toast = setLease(g!, a, v as Lease) || undefined;
      break;
    }
    case 'honor-view':
      ui.honorView = Number(id);
      break;
    case 'more':
      (ui.open ??= {})[v] = !ui.open[v];
      break;
    case 'act-cat':
      ui.actCat = v;
      break;
    case 'act-side':
      ui.actSide = v === '1';
      ui.actCat = undefined;
      break;
    case 'asset-sub':
      ui.assetSub = v;
      window.scrollTo(0, 0);
      break;
    case 'unlock-all-cards': {
      if (!g || !isTestMode()) break;
      const p = head(g);
      g.cards = CARDS.map((c) => ({ id: c.id, personId: p.id, year: g.year }));
      (ui.open ??= {})['dex'] = true;
      (ui.open ??= {})['hdex'] = true;
      (ui.open ??= {})['syn'] = true;
      ui.toast = '🃏 [테스트] 모든 명예의 전당 & 히든 카드 해금!';
      sfx('fanfare');
      save();
      break;
    }
    case 'buy-t': {
      const r = buyTreasure(g!, id);
      if (r.ok) ui.outcome = { title: '💰 현물 자산', text: r.text };
      else (ui.toast = r.text), sfx('error');
      break;
    }
    case 'buy-car': {
      const r = buyVehicle(g!, id);
      if (r.ok) ui.outcome = { title: '🔑 새 탈것', text: r.text };
      else (ui.toast = r.text), sfx('error');
      break;
    }
    case 'next': {
      if (!g) break;
      if (!g.events.length) {
        const ap = apLeft(g);
        const suppress = typeof localStorage !== 'undefined' && localStorage.getItem('suppress_ap_warn') === '1';
        if (ap > 0 && !suppress) {
          ui.apWarnModal = { ap };
          break;
        }
        advanceTurn(g);
      }
      break;
    }
    case 'confirm-next-turn': {
      if (!g) break;
      const chk = document.getElementById('chk-suppress-ap-warn') as HTMLInputElement | null;
      if (chk?.checked && typeof localStorage !== 'undefined') {
        localStorage.setItem('suppress_ap_warn', '1');
      }
      ui.apWarnModal = undefined;
      advanceTurn(g);
      break;
    }
    case 'close-ap-warn':
      ui.apWarnModal = undefined;
      break;
    case 'ok-report':
      ui.report = undefined;
      break;
    case 'ok-reward':
      g?.rewards?.shift();
      sfx('coin');
      break;
    case 'ok-reward-all':
      if (g) g.rewards = [];
      sfx('coin');
      break;
    case 'buy-perk': {
      const r = buyPerk(g!, id);
      if (r.ok) (ui.toast = r.text), sfx('fanfare');
      else (ui.toast = r.text), sfx('error');
      break;
    }
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
    case 'view-photo': {
      const ph = g?.photos?.find((x) => x.id === Number(id));
      if (ph && !ui.outcome) ui.outcome = { title: `📷 ${ph.title}`, text: `[[photo:${ph.id}]]\n${ph.year}년 · ${PHOTO_NAME[ph.kind]} · ${ph.ids.length}명` };
      break;
    }
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
    case 'move-in': {
      const r = moveIntoOwned(g!, head(g!), id);
      if (r.ok) ui.outcome = { title: '🏡 내 집으로', text: r.text };
      else (ui.toast = r.text), sfx('error');
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
      else ui.outcome = { title: periodize(g!, ACTIONS.find((a) => a.id === id)!.name), text: periodize(g!, r.text) };
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
