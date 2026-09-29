import {
  ACHIEVEMENTS,
  BUDGET_NAMES,
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
import { assetsOf, familyWorth, formatMoney, personWorth } from '../core/economy';
import { previewGiftTax } from '../core/estate';
import { spendable } from '../core/events';
import { age, alive, childrenOf, fullName, head, isDescendantOf, isMainline, livingMainlineMinors, parentsOf, relationLabel, siblingsOf, spouseOf } from '../core/people';
import {
  BUY_TAX,
  aptitudeTest,
  buyAsset,
  canRetire,
  currentEvent,
  designateHeir,
  familyTotal,
  gift,
  newGame,
  resolveChoice,
  retire,
  sellAsset,
  setWill,
  simulateYear,
} from '../core/sim';
import type { AssetKind, Focus, GameState, Lifestyle, Living, Person, Sex, WillMode } from '../core/types';
import { portraitURL } from '../render/portrait';

type Tab = 'tree' | 'policy' | 'assets' | 'log' | 'achv';

interface UIState {
  game: GameState | null;
  tab: Tab;
  sheet?: string;
  report?: { title: string; lines: string[] };
  outcome?: { title: string; text: string };
  toast?: string;
  giftTo?: string;
  setup: { surname: string; sex: Sex; origin: GameState['origin'] };
}

const SAVE_KEY = 'gamun-kiugi-save-v1';

const ui: UIState = {
  game: load(),
  tab: 'tree',
  setup: { surname: '김', sex: 'M', origin: 'middle' },
};

function load(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? (JSON.parse(raw) as GameState) : null;
  } catch {
    return null;
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
      <div class="field">첫 가주의 성별 ${seg('setup-sex', o.sex, [['M', '남'], ['F', '여']])}</div>
      <div class="field">집안 형편 ${seg('setup-origin', o.origin, [['poor', '서민'], ['middle', '중산층'], ['rich', '부유층']])}</div>
      <div class="field">시대 <div class="seg"><button class="on">현대 한국</button><button disabled>근현대사 (준비 중)</button></div></div>
      <button class="btn big primary" data-action="start">가문 시작</button>
    </section>
    <p class="fine">v0.1 · 한 세대를 끝까지 돌려보자</p>
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
  return `<button class="pc ${dead ? 'dead' : ''} ${isHead ? 'head' : ''} ${extra}" data-action="person" data-id="${p.id}">
    ${isHead ? '<span class="crown">👑</span>' : heir ? '<span class="crown">★</span>' : ''}
    ${pending ? '<span class="bang">!</span>' : ''}
    <img class="px" src="${portraitURL(p, a)}" alt="">
    <span class="nm">${esc(p.name)}</span>
    <span class="ag">${dead ? '†' + a : a + '세'}</span>
    <span class="rl">${esc(relationLabel(g, p))}</span>
  </button>`;
}

function row(label: string, inner: string): string {
  return inner ? `<div class="gen"><div class="gen-l">${label}</div><div class="gen-row">${inner}</div></div>` : '';
}

function treeScreen(g: GameState): string {
  const h = head(g);
  const parents = parentsOf(g, h);
  const grand = parents.flatMap((p) => parentsOf(g, p)).filter(alive);
  const sibs = siblingsOf(g, h);
  const older = sibs.filter((x) => x.birthYear <= h.birthYear);
  const younger = sibs.filter((x) => x.birthYear > h.birthYear);
  const sp = spouseOf(g, h);

  const couple = (p: Person) => {
    const s2 = spouseOf(g, p);
    return `<div class="couple">${card(g, p)}${s2 ? `<span class="ring">♥</span>${card(g, s2)}` : ''}</div>`;
  };

  let gens = [h];
  const lower: string[] = [];
  const labels = ['자녀', '손주', '증손', '고손'];
  for (let i = 0; i < 4; i++) {
    const kids = gens.flatMap((p) => childrenOf(g, p));
    if (!kids.length) break;
    lower.push(row(labels[i], kids.map(couple).join('')));
    gens = kids;
  }

  return `
  <div class="tree">
    ${row('조부모', grand.map((p) => card(g, p)).join(''))}
    ${row('부모', parents.map((p) => card(g, p)).join(''))}
    ${row(
      '본인',
      `${older.map((p) => card(g, p, 'sib')).join('')}
       <div class="couple me">${card(g, h)}${sp ? `<span class="ring">♥</span>${card(g, sp)}` : ''}</div>
       ${younger.map((p) => card(g, p, 'sib')).join('')}`,
    )}
    ${lower.join('')}
    ${!lower.length && !sp ? `<p class="hint">아직 혼자다. 25세가 되면 인연이 찾아온다.</p>` : ''}
  </div>`;
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
};

function personSheet(g: GameState, p: Person): string {
  const dead = !alive(p);
  const a = dead ? p.deathYear! - p.birthYear : age(g, p);
  const h = head(g);
  const edu = p.flags.filter((f) => EDU_LABELS[f]).map((f) => EDU_LABELS[f]);
  const talents = p.talents.filter((t) => t.discovered);
  const job = JOBS[p.job];
  const jobTxt = a < 20 && p.job === 'none' ? '학생' : p.flags.includes('student') ? '대학생' : job.name + (job.maxLevel ? ` Lv.${p.jobLevel}` : '');
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
      ${p.flags.includes('grievance') ? `<div class="sh-row warn"><span>⚠</span><span>상속에 불만을 품고 있다</span></div>` : ''}
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
  return `
  <section class="card">
    <h2>가주의 한 해</h2>
    <div class="field">생활 방식 ${seg('lifestyle', pol.lifestyle, Object.entries(LIFESTYLE_NAMES) as [string, string][])}</div>
    <p class="fine">일 중심: 승진↑ 건강↓ · 자기계발: 능력치↑ · 요양: 건강 회복</p>
    <div class="field">생활 수준 ${seg('living', pol.living, Object.entries(LIVING_NAMES) as [string, string][])}</div>
    <div class="field">가족계획 (자녀 수 목표) ${seg('plan', pol.familyPlan, [0, 1, 2, 3, 4].map((n) => [n, n + '명']))}</div>
  </section>
  <section class="card">
    <h2>자녀 교육</h2>
    ${
      minors.length
        ? minors
            .map((c) => {
              const cp = pol.children[c.id] ?? { budget: 1, focus: 'free' };
              return `<div class="kid">
                <div class="kid-h"><img class="px sm" src="${portraitURL(c, age(g, c))}"> ${esc(fullName(c))} · ${age(g, c)}세</div>
                <div class="field">교육비 ${seg('budget', cp.budget, BUDGET_NAMES.map((n, i) => [i, n]), c.id)}</div>
                <div class="field">집중 분야 ${seg('focus', cp.focus, Object.entries(FOCUS_NAMES) as [string, string][], c.id)}</div>
              </div>`;
            })
            .join('')
        : '<p class="hint">키울 아이가 없다.</p>'
    }
    <p class="fine">교육비: 기본 300만 · 사교육 1,200만 · 올인 3,000만 /년.<br>숨은 재능과 맞는 분야에 집중하면 성장이 훨씬 빠르다.</p>
  </section>`;
}

function assetsScreen(g: GameState): string {
  const h = head(g);
  const members = Object.values(g.people)
    .filter((p) => alive(p) && (isMainline(g, p) || personWorth(g, p) !== 0))
    .sort((a, b) => personWorth(g, b) - personWorth(g, a));
  const fam = assetsOf(g, 'family');
  const recipients = Object.values(g.people).filter((p) => alive(p) && isDescendantOf(g, p, h));
  const to = ui.giftTo && g.people[ui.giftTo] && alive(g.people[ui.giftTo]) ? g.people[ui.giftTo] : recipients[0];
  const canBuy = (k: AssetKind) => spendable(g) >= g.market[k] * 0.4;

  const assetRow = (a: { id: string; name: string; value: number; ownerId: string }, sellable: boolean) =>
    `<div class="arow"><span>🏠 ${esc(a.name)}</span><span>${formatMoney(a.value)} ${sellable ? `<button class="mini" data-action="sell" data-id="${a.id}">매도</button>` : ''}</span></div>`;

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
    <h2>부동산 시장</h2>
    ${(['apt_seoul', 'apt_local', 'land'] as AssetKind[])
      .map(
        (k) => `<div class="arow"><span>${{ apt_seoul: '강남 아파트', apt_local: '지방 아파트', land: '토지' }[k]}</span>
        <span>${formatMoney(g.market[k])} <button class="mini" data-action="buy" data-v="${k}" ${canBuy(k) ? '' : 'disabled'}>매수</button></span></div>`,
      )
      .join('')}
    <p class="fine">취득세 ${BUY_TAX * 100}% · 가격의 40% 이상 있으면 나머지는 대출(연 7%). 임대수익 연 2.5%.<br>상속세는 부동산을 시가의 70%로 평가한다 → 절세 수단.</p>
  </section>

  <section class="card">
    <h2>생전 증여</h2>
    ${
      recipients.length
        ? `<div class="field">받는 사람
            <select id="gift-to">${recipients.map((p) => `<option value="${p.id}" ${p.id === to.id ? 'selected' : ''}>${esc(fullName(p))} (${age(g, p)}세)</option>`).join('')}</select>
          </div>
          <div class="gift-btns">${[5000, 10000, 50000, 100000]
            .map(
              (amt) =>
                `<button class="btn" data-action="gift" data-v="${amt}" ${h.cash < amt ? 'disabled' : ''}>${formatMoney(amt)}<small>증여세 ${formatMoney(previewGiftTax(g, to, amt))}</small></button>`,
            )
            .join('')}</div>
          <p class="fine">성인 자녀 10년간 5천만 비과세(미성년 2천만). 사망 전 10년 내 증여는 상속재산에 합산되니 일찍 줄수록 유리.</p>`
        : '<p class="hint">증여할 자손이 없다.</p>'
    }
  </section>

  <section class="card">
    <h2>승계 · 유언장</h2>
    <div class="sh-row"><span>후계자</span><span>${g.heirId && alive(g.people[g.heirId]) ? esc(fullName(g.people[g.heirId])) : '미지정 (첫째가 자동 승계)'}</span></div>
    <div class="will">${(Object.entries(WILL_NAMES) as [WillMode, string][])
      .map(([k, l]) => `<button class="${g.will === k ? 'on' : ''}" data-action="will" data-v="${k}">${l}</button>`)
      .join('')}</div>
    <p class="fine">후계자에게 몰아주면 부동산을 지키기 쉽지만, 몫을 못 받은 형제는 불만을 품는다.</p>
  </section>`;
}

function logScreen(g: GameState): string {
  const items = g.log.slice(-400).reverse();
  return `<section class="card log">${items
    .map((l) => (l.text.startsWith('──') ? `<h4>${esc(l.text.replace(/─/g, '').trim())}</h4>` : `<div class="lg ${l.kind ?? ''}">${esc(l.text)}</div>`))
    .join('')}</section>`;
}

function achvScreen(g: GameState): string {
  return `
  <section class="card">
    <h2>업적</h2>
    ${Object.entries(ACHIEVEMENTS)
      .map(([id, a]) => `<div class="achv ${g.achievements.includes(id) ? 'done' : ''}"><b>${g.achievements.includes(id) ? '🏆' : '🔒'} ${a.name}</b><span>${a.desc}</span></div>`)
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
      ui.setup.origin = v as GameState['origin'];
      break;
    case 'continue':
      ui.game = load();
      break;
    case 'start': {
      const sn = (ui.setup.surname || '김').slice(0, 2);
      ui.game = newGame({ familyName: sn, sex: ui.setup.sex, origin: ui.setup.origin });
      ui.tab = 'tree';
      break;
    }
    case 'restart':
      clearSave();
      hasSave = false;
      ui.game = null;
      ui.report = ui.outcome = ui.sheet = undefined;
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
      ui.toast = buyAsset(g!, v as AssetKind);
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
      setWill(g!, v as WillMode);
      break;
  }
  save();
  render();
}
