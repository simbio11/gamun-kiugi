---
version: alpha
name: 가문 키우기 (Gamun Kiugi)
description: >-
  세피아 밤하늘 위에 양피지 패널을 올리고, 금박으로 행동을 이끄는 픽셀 족보 시뮬레이션.
  모든 글자는 Galmuri 픽셀 폰트, 모든 테두리는 3px 도트 선.
colors:
  # ── 브랜드 ──
  primary: "#e8b64c"            # 금박 (--gold) — 주 행동·선택됨·강조 숫자
  on-primary: "#2a1f1a"
  primary-soft: "#fff1c2"       # 가주 카드 (--head)
  # ── 밤 배경 ──
  background: "#2a1f1a"         # 세피아 밤 (--bg)
  background-raised: "#3a2b23"  # 탭·칩 (--bg2)
  on-background: "#f3e6c8"      # 배경 위 본문 (--panel 과 같은 값)
  on-background-muted: "#cdb892" # 배경 위 보조 글자 (--sand)
  on-background-dim: "#9c8667"  # 배경 위 아주 작은 메모 (--dim)
  on-background-highlight: "#fff3cf" # 돈 숫자 (--cream)
  positive-on-dark: "#9fd89a"   # 배경 위 수입 (--pos-dark)
  negative-on-dark: "#f19a8a"   # 배경 위 지출 (--neg-dark)
  # ── 양피지 패널 ──
  surface: "#f3e6c8"            # 카드·모달 (--panel)
  surface-variant: "#e6d3a8"    # 보조 버튼·뱃지 (--panel2)
  surface-input: "#fff8e6"      # 입력칸·선택지 (--paper)
  surface-inlaw: "#e9dcc0"      # 사돈·배우자 카드 (--inlaw)
  surface-dead: "#b9ab93"       # 고인 카드 (--dead)
  surface-track: "#d9c69d"      # 능력치 막대 바탕 (--track)
  surface-cost: "#f2d38a"       # 비용 뱃지 (--cost)
  on-surface: "#2a1f1a"         # 패널 위 본문 (--ink)
  on-surface-muted: "#6f5d49"   # 패널 위 보조 글자 (--muted)
  # ── 선 ──
  outline: "#1d1620"            # 3px 도트 테두리 (--line)
  divider: "#cbb58c"            # 목록 사이 점선 (--rule)
  branch: "#7a6348"             # 가계도 가지 (--branch)
  # ── 의미 색 ──
  error: "#b33a2e"              # 경고·손실·사망 (--red)
  on-error: "#fff3cf"
  success: "#3f7d4a"            # 능력치 막대·성공 (--green)
  positive: "#336b31"           # 패널 위 이익 글자 (--pos)
  info: "#3f6fb5"               # 은행·정보 (--blue)
  on-info: "#ffffff"
typography:
  display:
    fontFamily: Galmuri14
    fontSize: 40px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: 2px
  headline-lg:
    fontFamily: Galmuri14
    fontSize: 30px
    fontWeight: 400
    lineHeight: 1.2
  headline-md:
    fontFamily: Galmuri14
    fontSize: 20px
    fontWeight: 400
    lineHeight: 1.3
  title-md:
    fontFamily: Galmuri14
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.3
  title-sm:
    fontFamily: Galmuri11
    fontSize: 15px
    fontWeight: 700
    lineHeight: 1.4
  body-lg:
    fontFamily: Galmuri11
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
  body-md:
    fontFamily: Galmuri11
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Galmuri11
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  label-md:
    fontFamily: Galmuri11
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  label-sm:
    fontFamily: Galmuri11
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.4
  caption:
    fontFamily: Galmuri11
    fontSize: 10px
    fontWeight: 400
    lineHeight: 1.3
rounded:
  none: 0px
  pill: 9px
spacing:
  px: 3px
  xs: 4px
  sm: 8px
  md: 12px
  card: 14px
  gutter: 16px
  lg: 24px
  max-width: 480px
components:
  app-shell:
    backgroundColor: "{colors.background}"
    textColor: "{colors.on-background}"
    typography: "{typography.body-md}"
    width: "{spacing.max-width}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.none}"
    padding: "{spacing.card}"
  card-caption:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-muted}"
    typography: "{typography.label-md}"
  hint-on-dark:
    backgroundColor: "{colors.background}"
    textColor: "{colors.on-background-muted}"
    typography: "{typography.label-md}"
  money-on-dark:
    backgroundColor: "{colors.background}"
    textColor: "{colors.on-background-highlight}"
    typography: "{typography.body-lg}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: 10px
  button-secondary:
    backgroundColor: "{colors.surface-variant}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: 10px
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-error}"
    rounded: "{rounded.none}"
  next-year:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.title-sm}"
    padding: "{spacing.card}"
  tab:
    backgroundColor: "{colors.background-raised}"
    textColor: "{colors.on-background-muted}"
    typography: "{typography.body-sm}"
  tab-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
  segment:
    backgroundColor: "{colors.surface-variant}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
  segment-active:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.primary}"
  mini-chip:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.primary}"
    typography: "{typography.label-sm}"
  badge:
    backgroundColor: "{colors.surface-variant}"
    textColor: "{colors.on-surface}"
    typography: "{typography.caption}"
  badge-cost:
    backgroundColor: "{colors.surface-cost}"
    textColor: "{colors.on-surface}"
    typography: "{typography.caption}"
  input:
    backgroundColor: "{colors.surface-input}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.none}"
    padding: 8px
  event-choice:
    backgroundColor: "{colors.surface-input}"
    textColor: "{colors.on-surface}"
    padding: 10px
  person-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    width: 72px
  person-card-head:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.on-surface}"
  person-card-inlaw:
    backgroundColor: "{colors.surface-inlaw}"
    textColor: "{colors.on-surface}"
  person-card-dead:
    backgroundColor: "{colors.surface-dead}"
    textColor: "{colors.on-surface}"
  stat-bar:
    backgroundColor: "{colors.surface-track}"
    height: 10px
  stat-bar-fill:
    backgroundColor: "{colors.success}"
    height: 10px
  flow-income:
    backgroundColor: "{colors.background}"
    textColor: "{colors.positive-on-dark}"
    typography: "{typography.label-sm}"
  flow-expense:
    backgroundColor: "{colors.background}"
    textColor: "{colors.negative-on-dark}"
    typography: "{typography.label-sm}"
  gain-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.positive}"
  loss-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.error}"
  list-divider:
    backgroundColor: "{colors.divider}"
    height: 1px
  tree-branch:
    backgroundColor: "{colors.branch}"
    width: 2px
  bank:
    backgroundColor: "{colors.info}"
    textColor: "{colors.on-info}"
    typography: "{typography.headline-lg}"
    padding: "{spacing.gutter}"
  alert-dot:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-info}"
    size: 18px
---

# 가문 키우기 — DESIGN.md

> 이 파일의 YAML 토큰이 **유일한 기준값**이다. `src/style.css` 의 `:root` 변수는 이 토큰을 그대로 옮긴 것이고,
> 새 UI는 반드시 그 변수(`var(--gold)` 등)만 쓴다. 검사: `npx @google/design.md lint DESIGN.md`

## Overview

**세피아 밤 + 양피지 + 금박, 그리고 도트.**
오래된 족보책을 등잔불 아래에서 펼쳐 보는 느낌이 기본 정서다. 화면 바탕은 짙은 세피아 밤(Background),
그 위에 정보가 담긴 모든 것은 양피지 패널(Surface)로 떠오르고, "지금 눌러야 할 것"은 오직 금박(Primary)이 맡는다.

- 대상: 휴대폰 세로 화면 한 손 플레이 (최대 폭 480px).
- 성격: 따뜻하고 조금 장난스러운 레트로 — 픽셀은 *귀엽게*, 색은 *낡게*.
- 정보 밀도: 높다. 작은 픽셀 글자와 점선 구분선으로 많은 숫자를 정리한다.
- 예외: 시대·테마 연출(근현대사 호외, 포털 뉴스, 먼 미래 화면, 히든 카드, 가주 테마)은 **장면 팔레트**를 따로 갖는다
  (아래 *Scene palettes* 참고). 장면 팔레트는 그 장면 안에서만 쓰고 기본 UI로 새어 나오면 안 된다.

## Colors

기본 UI는 세 층으로만 이루어진다.

- **Sepia Night (`background` #2a1f1a / `background-raised` #3a2b23):** 앱 바탕, 상단 바, 하단 탭. 그림자 대신 이 두 단계로 층을 나눈다.
- **Parchment (`surface` #f3e6c8 / `surface-variant` #e6d3a8 / `surface-input` #fff8e6):** 카드·모달·시트. 입력칸과 선택지는 한 톤 더 밝은 종이색.
- **Gilt (`primary` #e8b64c):** 주 버튼, 선택된 탭, 연도·로고 같은 대표 숫자. 한 화면에 금박 *면*은 하나(보통 "다음 해" 버튼)만 둔다.
- **Ink (`on-surface` #2a1f1a, `outline` #1d1620):** 글자와 3px 도트 테두리. 순검정(#000)은 쓰지 않는다.
- **글자 위계:** 배경 위에서는 `on-background` → `on-background-muted`(#cdb892) → `on-background-dim`(#9c8667),
  패널 위에서는 `on-surface` → `on-surface-muted`(#6f5d49).
- **의미 색:** 손실·경고·사망은 `error`(#b33a2e), 이익 글자는 `positive`(#336b31), 능력치 막대는 `success`(#3f7d4a), 은행은 `info`(#3f6fb5).
  어두운 배경 위의 +/− 숫자만 밝은 짝(`positive-on-dark`, `negative-on-dark`)을 쓴다.

모든 글자–바탕 짝은 WCAG AA(4.5:1)를 넘긴다. `on-surface-muted` 는 이 기준을 맞추려고 #7d6a55 → #6f5d49 로 한 단계 진하게 조정했고, `positive` 도 같은 이유로 #3d7a3a → #336b31 로 낮췄다.

## Typography

**Galmuri** 픽셀 폰트 한 가족만 쓴다 (SIL OFL 1.1, `src/fonts.css`).

- **Galmuri14** — 로고(`display` 40px), 은행 잔액(`headline-lg`), 연도(`headline-md`), 이벤트·인물 이름(`title-md`).
- **Galmuri11** — 본문(`body-md` 14px)과 그 아래 모든 크기. 입력칸은 iOS 확대를 막으려고 16px(`body-lg`).
- 10px 이하 캡션(`caption`)도 Galmuri11. (Galmuri9 는 현재 번들에 없으므로 새로 쓰지 않는다.)
- 픽셀 폰트는 크기가 정수배일 때 가장 선명하므로, 위 단계 밖의 임의 크기(예: 13.5px, .82em)를 새로 만들지 않는다.
- 굵기는 400 이 기본이고 `title-sm` 만 700. 강조는 굵기보다 **색(금박/빨강)** 으로 한다.

## Layout

- **단일 세로 열**, `max-width` 480px 가운데 정렬. 아래쪽 130px 은 고정 탭(약 58px)과 "다음 해" 버튼 자리.
- 간격 단위는 `xs` 4 · `sm` 8 · `md` 12 · `card` 14 · `gutter` 16 · `lg` 24px. 카드 바깥 여백은 `card`(위아래) × `gutter`(좌우), 안쪽 여백은 `card`.
- 목록은 표 대신 **한 줄 = 좌측 라벨 / 우측 값** 의 flex 행 + `divider` 1px 점선으로 구분한다.
- 가계도는 가로 스크롤을 허용하는 유일한 영역이다. 나머지 화면은 가로 스크롤이 생기면 안 된다.

## Elevation & Depth

그림자 대신 **도트 테두리와 색 단계**로 깊이를 만든다.

- 떠 있는 모든 요소(카드, 버튼, 선택지, 인물 카드, 모달 시트)는 `--px`(3px) 두께의 `outline` 색 상·하·좌·우 4방향 `box-shadow` 로 픽셀 테두리를 그린다 (흐림 0).
- 모달은 `rgba(20,12,10,.72)` 막으로 배경을 가리고 아래에서 올라오는 시트로 띄운다.
- 제목·로고의 입체감은 `text-shadow: 3px 3px 0 outline` 한 가지뿐이다.
- 버튼·선택지는 **도트 베벨**: 왼쪽 위 안쪽 3px 빛(`surface-input` 55%), 오른쪽 아래 안쪽 3px 그늘(`outline` 22%), 바깥 아래 6px 낙하 그림자(`outline` 55%). 누르면 6px 내려가며 베벨이 뒤집힌다.
- 금박 면은 위(`primary`+`surface-input` 섞은 밝은 금) → 가운데 `primary` → 아래(`primary`+`outline` 살짝)로 이어지는 부드러운 그라데이션. 광택 띠는 쓰지 않는다.
- 카드·모달 안쪽에는 6px 들어간 1px `divider` 괘선(족보 책장 느낌).
- **배경 그림(테마 층 `#theme-bg`)은 한 걸음 뒤로**: blur 2.5px · 밝기 62% · 채도 70% + `background` 비네트. 앞을 날아다니는 테마 입자(`#theme-fx`)는 불투명도 55%. 배경이 글자와 경쟁하면 안 된다.
- 흐린 그림자(blur), 유리 효과(backdrop-filter)는 UI 요소에 쓰지 않는다 (배경 층과 장면 팔레트만 예외).

## Shapes

**각진 픽셀.** 기본 UI의 카드·버튼·입력칸은 모서리 0(`rounded.none`)에 3px 도트 테두리.
작은 상태 뱃지(맞춤 행동 표시 등)만 `rounded.pill`(9px)을 허용한다. 원형(50%)은 아이콘 점·알림 점에만.

## Components

- **Buttons** — `button-primary`(금박)는 화면의 대표 행동 하나에만. 보조는 `button-secondary`(양피지 2단), 되돌릴 수 없는 행동은 `button-danger`. 비활성은 투명도 .45.
- **Next year** — 하단 고정 금박 큰 버튼. 한 화면의 금박 면은 이것 하나.
- **Tabs / Segments** — 탭은 밤색 바탕에 모래색 글자, 선택되면 금박. 세그먼트는 양피지 2단, 선택되면 잉크 바탕 + 금박 글자(반전).
- **Mini chip / Badge** — 잉크 바탕 금박 글자의 작은 칩, 양피지 2단 뱃지, 비용은 `surface-cost`.
- **Input / Event choice** — 밝은 종이색 바탕 + 2px 잉크 테두리.
- **Person card** — 72px 폭 인물 카드. 가주 `primary-soft`, 사돈 `surface-inlaw`, 고인 `surface-dead` + 흑백 초상.
- **Stat bar** — `surface-track` 바탕에 `success` 채움, 잠재력은 3px 줄무늬.
- **Bank** — `info` 파랑 카드, 잔액은 `headline-lg`.

### Motion

움직임은 **부드럽게**: 기본 곡선은 `--ease`(cubic-bezier(0.22, 1, 0.36, 1), 빠르게 시작해 사뿐히 멈춤), 열고 닫는 막은 `--ease-io`.
계단식 `steps()` 는 도트 캐릭터의 걷기·깜박임 같은 *그림 애니메이션*에만 쓰고, 화면·버튼 전환에는 쓰지 않는다.
설정의 "움직임 줄이기"(`#app.calm`)와 `prefers-reduced-motion` 에서는 모두 꺼진다.

- **버튼** — 상태 변화 0.22초 `--ease`, 누를 때만 0.08초로 빠르게. 금박 면은 위→아래 부드러운 금빛 그라데이션이며 광택 띠는 쓰지 않는다. 다음 해 버튼은 행동력을 다 쓰면 3.2초 주기로 은은하게 빛난다.
- **탭 전환** — 가는 방향으로 14px 밀리며 스며드는 크로스페이드(0.34초), 카드는 50ms 간격으로 뒤따른다.
- **창** — 막이 0.28초 페이드, 시트가 40% 아래에서 0.42초에 걸쳐 떠오른다.
- **해 넘김** — 위아래 막이 부드럽게 닫히고, 큰 연도(`display` 64px)가 흐림에서 또렷해졌다가 사라진 뒤 막이 열린다 (1.5초, 화면을 막지 않음).
- **누름** — 금박 버튼·다음 해·선택지를 누르면 금·크림 도트 가루가 퍼지며 사라진다.
- **타이틀** — 등잔불 빛이 6초 주기로 일렁이고, 불티가 떠오르며, 로고가 흐림에서 내려앉는다.

### Scene palettes (장면 팔레트)

아래 영역은 시대·연출 고증을 위해 전용 색을 쓴다. 해당 CSS 블록 안에서만 허용되며, 새 장면을 만들 때는
그 블록 머리 주석에 팔레트를 적고 이 목록에 한 줄 추가한다.

| 장면 | CSS 블록 | 성격 |
|---|---|---|
| 근현대사 호외·신문 | `근현대사 모드` | 갱지 #efe6cd + 먹 #16120c, 명조체 |
| 포털 뉴스 2005–2049 | `시간선: 포털 뉴스` | 각 시대 포털 색 |
| 먼 미래 화면 | `먼 미래의 화면 빛깔` | 홀로그램·네온 |
| 히든 / 슈퍼 히든 / 히든의 히든 카드 | `히든 카드 v2·v3` | 자색·크림슨·흑금 광휘 |
| 가주 테마·희귀 직업·집안 형편 | `theme.ts`, `theme-deco.ts`, `room.ts` | 나이대·직업·재산별 배경 |

## Do's and Don'ts

- **Do** 새 UI의 색·글꼴·간격은 `src/style.css` `:root` 변수(= 이 파일의 토큰)로만 지정한다.
- **Do** 새 색이 꼭 필요하면 먼저 이 파일에 토큰을 추가하고 `npx @google/design.md lint DESIGN.md` 를 통과시킨 뒤 `:root` 에 같은 이름으로 옮긴다.
- **Do** 떠 있는 요소에는 3px 도트 테두리를 쓴다.
- **Do** 금박 면은 한 화면에 하나 — 나머지 강조는 금박 *글자*나 빨강 글자로.
- **Don't** `#fff`, `#000`, 임의 회색, 새 hex 값을 기본 UI에 직접 쓰지 않는다.
- **Don't** Galmuri 외 글꼴을 기본 UI에 쓰지 않는다 (명조체는 호외 장면 전용).
- **Don't** 둥근 모서리·흐린 그림자·그라데이션 버튼을 기본 UI에 쓰지 않는다.
- **Don't** 장면 팔레트 색을 기본 화면(가계도·명부·자산·설정·행동 탭)으로 가져오지 않는다.
