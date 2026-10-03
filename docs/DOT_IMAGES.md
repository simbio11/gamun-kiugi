# 🎨 도트 이미지 점검 결과 · 추가할 목록

## 1. 점검 결과 (2026-10-02)

| 묶음 | 폴더 | 파일 | 코드 참조 | 상태 |
|---|---|---|---|---|
| 대형 이벤트 배너 | `src/assets/events` | 21 | `BIG_BANNER_MAP`·`SUMMIT_BANNER_MAP`·`eventBannerURL` | ✅ 참조하는 파일 모두 있음 |
| 일상 장면 | `src/assets/scenes` | 20 | `pickCustomScene`·`customSceneURL` | ✅ 참조하는 파일 모두 있음 |
| 히든 카드 (남/녀 + 실루엣 + 대체 그림 + 영상) | `src/assets/hidden` | 128 + alt + video | `hidden-card.ts` | ✅ 히든 39종 모두 카드 그림 있음 |
| 전설 카드 그림 | `src/assets/legend(-inline)` | 31종 | `LEGEND_ART` | ⚠ 전설 카드 6종은 절차 생성 그림 |
| 가주 테마 배경 | `src/assets/themes` | 15 | `theme.ts` | ⚠ 히든 29종은 재산 단계 배경으로 대신 |
| 신문 사진 | `src/assets/news` | 3 | `newsphoto.ts` | ⚠ 4·19·5·16·10·26만 사진, 나머지는 절차 생성 |

**이번에 고친 것:** 새 대형 이벤트 14종 가운데 8종은 이미 있는 배너에 연결했다 (바둑→체스, 창업대회·해커톤→피칭, e스포츠, 세기의 재판·청문회→법정, 수술→병원, 칸→여우주연). 나머지 6종은 도트 장면에 연결했다 (조기축구·씨름·콩쿠르·골든벨·해일 대피·우주정거장).

## 2. 추가하면 좋은 도트 이미지 (우선순위순)

### A. 새로 넣은 콘텐츠용 (지금은 절차 생성 장면으로 대신)
| 키 (파일명) | 쓰일 곳 | 장면 묘사 |
|---|---|---|
| `scenes/mil_barracks.webp` | 군 복무 이야기 (훈련소·내무반·혹한기) | 2층 침상 내무반, 관물대, 군화 줄 |
| `scenes/germany_mine.webp` | 서독 광부 | 지하 1,000m 막장, 헤드램프 |
| `scenes/germany_ward.webp` | 서독 간호사 | 새벽 병동, 한국 간호사 뒷모습 |
| `scenes/mideast_site.webp` | 중동 건설 | 사막 공사장, 크레인, 모래바람 |
| `scenes/courtroom.webp` | 법조 이야기·재판 | 법대 위 판사석, 법봉 |
| `scenes/namsan_basement.webp` | 정보기관 조사실 | 백열등 하나, 철제 책상 (어둡게, 폭력 묘사 없이) |
| `events/coup_dawn.webp` | 🌑 거사 미니게임 | 새벽 한강 다리 위 탱크 실루엣 |
| `events/gym_election.webp` | 🏟 체육관 선거 | 장충체육관, 빽빽한 대의원석 |
| `events/assembly.webp` | 국회·청문회·유정회 | 국회 본회의장 돔 |
| `events/un_hall.webp` | 유엔 사무총장 | 유엔 총회장 연단 |
| `events/everest.webp` · `marathon.webp` · `fishing.webp` · `fire.webp` · `inflight.webp` · `propose.webp` | 기존 대형 이벤트 | 지금은 장면 그림으로 대신 |
| `scenes/handover.webp` | 가주 승계식 | 족보와 인장을 건네는 손 |
| `scenes/nursing_home.webp` | 요양원·효도 이야기 | 창가 휠체어, 면회 |

### B. 메타·계정
| 키 | 쓰일 곳 |
|---|---|
| `ui/legacy_jar.webp` | 🏺 유산 상점 머리 그림 (항아리·족보) |
| `ui/login_gate.webp` | 첫 화면 로그인 카드 (대문·문패) |
| `ui/obituary_frame.webp` | 인생 신문 1면·영수증 카드 틀 (공유 이미지) |

### C. 전설 카드 그림 (절차 생성 → 손그림)
`chaebol`(그룹 총수) · `god_medicine`(의술의 신) · `god_acupuncture`(침술의 신) · `un_sg`(UN 사무총장) · `mayor`(시장) · `founder_myth`(1세대 창업 신화) — 각 `.webp` + `.fig.webp`(실루엣)

### D. 히든 직업 테마 배경 (29종, 지금은 재산 단계 배경)
타짜·스파이·해적·용병·괴도·퇴마사·방랑자·지하 격투왕·명화 위조범·드리프트 퀸·핏빛 후작부인·교황·밤의 대모·사립탐정 등 — `themes/hj_<id>.webp`. 장면 하나에 그 직업의 "일터"가 보이면 된다 (카지노 뒷방, 항구, 경매장, 교황청 …).

### E. 근현대사 신문 사진 (지금은 절차 생성)
`news/hist_h518.webp`(5·18 — 도청 앞 광장, 인물 없이) · `hist_h610.webp`(6월 항쟁 넥타이 부대) · `hist_h88.webp`(올림픽 굴렁쇠) · `hist_himf.webp`(금 모으기 줄) · `hist_hworldcup.webp`(거리 응원) · `hist_hcandle.webp`(광화문 촛불)

## 3. 규칙
- 크기·형식: 기존과 같게 webp, 도트 원본은 정수 배 확대. 파일명은 위 키와 같게 넣으면 코드가 자동으로 찾는다 (`import.meta.glob`).
- 색: DESIGN.md 의 *Scene palettes* 범위 안에서.
- 실존 인물 얼굴은 그리지 않는다. 비극적 사건은 장소·상징만 (사람의 고통을 직접 그리지 않는다).
