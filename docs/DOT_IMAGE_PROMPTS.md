# 🎨 도트 이미지 AI 생성 프롬프트 가이드 (Pixel Art Prompts)

> 이 문서는 **가문 키우기 (Gamun Kiugi)**의 규격과 화풍(16-bit 레트로 픽셀 아트)에 맞추어,  
> **슈퍼 히든 직업 테마 배경(11종)** 및 **대형 이벤트 전용 배너(16종)**를 생성할 수 있도록 작성된 공식 프롬프트 가이드입니다.

---

## 📌 공통 제작 및 변환 규격

1. **화풍 스타일**:
   - 16-bit 레트로 픽셀 아트 (PC-98 / DOS RPG 스타일)
   - 인위적인 블러나 스무딩 없는 선명한 픽셀 경계 (Crisp pixel edges)
   - 세피아, 앤틱 골드, 인디고, 버건디 등 `DESIGN.md` 장면 팔레트에 부합하는 고풍스러운 레트로 색감
2. **저장 포맷**: `.webp` (손실/무손실 webp)
3. **배치 디렉토리**:
   - 슈퍼 히든 테마 배경: `src/assets/themes/<파일명>.webp`
   - 대형 이벤트 상단 배너: `src/assets/events/<파일명>.webp`
   *(지정된 파일명으로 넣으면 Vite의 `import.meta.glob`을 통해 코드가 자동으로 인식하여 즉시 게임에 반영됩니다.)*

---

# 🌌 [파트 1] 슈퍼 히든 직업 테마 배경 (11종)

- **권장 해상도**: **`512 × 1024`** 또는 **`512 × 919`** (모바일 세로형 비율, `--ar 9:16` 또는 `--ar 1:2`)
- **역할**: 가주가 해당 슈퍼 히든 직업을 달성했을 때 화면 전체에 배경으로 깔리는 "일터/인테리어 룸 전경"

---

### 1. `themes/hj_drifter.webp` — 드리프트 퀸 (고갯길 튜닝 게러지)
- **컨셉**: 심야 산악 고갯길의 개조 튜닝 정비소. 리프트 위의 광폭 와이드바디 스포츠카, 쌓여 있는 레이싱 타이어, 벽면 툴박스, 셔터 너머로 보이는 가드레일과 헤드라이트 궤적.
- **색감**: 아스팔트 차콜, 네온 레드, 형광 옐로우
```text
16-bit pixel art, vertical mobile background, a gritty underground racing drift garage at midnight. A tuned Japanese sports car on a hydraulic lift with custom widebody fenders, stacks of racing slick tires, toolboxes, oil stains on the concrete floor, neon red and amber garage lighting, an open bay door in the back revealing a winding mountain pass with guardrails and headlights drifting in the dark, detailed pixel art interior, retro game aesthetic --ar 9:16 --style raw
```

---

### 2. `themes/hj_vampire.webp` — 핏빛 후작부인 (고딕 뱀파이어 성채 서재)
- **컨셉**: 붉은 보름달이 비치는 유럽 고성의 고딕풍 집무실. 높은 아치형 창문, 붉은 벨벳 커튼, 은제 촛대와 와인잔, 가문 초상화와 마도서 서가.
- **색감**: 딥 버건디, 앤틱 골드, 차가운 달빛 블루
```text
16-bit pixel art, vertical mobile background, an aristocratic gothic vampire castle study at midnight. Tall arched stained-glass windows overlooking a blood-red full moon, heavy dark red velvet curtains, antique mahogany bookshelf filled with ancient grimoires, silver candelabra with flickering purple candles, a crystal goblet on an ornate desk, cold pale moonlight contrasting with warm candle embers, elegant dark fantasy retro pixel aesthetic --ar 9:16 --style raw
```

---

### 3. `themes/hj_art_investigator.webp` — 예술품 도난 수사관 (비밀 수장고 아카이브)
- **컨셉**: 미술관 지하 비밀 수장고. 붉은 벽돌 벽면에 걸린 명화 프레임들, 이젤 위의 돋보기와 UV 라이트 조사기, 조각상과 봉인된 원목 운반 궤짝.
- **색감**: 세피아 브라운, 앤틱 브론즈, 형광 UV 보라
```text
16-bit pixel art, vertical mobile background, a secret museum archive vault for an art crime investigator. Exposed brick walls hung with framed classical masterpiece oil paintings, a wooden easel holding a restored canvas under a desk lamp, UV inspection light equipment, magnifiers, wooden shipping crates stenciled with fragile marks, antique classical marble busts, scholarly investigation room, retro pixel art --ar 9:16 --style raw
```

---

### 4. `themes/hj_michelin_inspector.webp` — 미슐랭 비밀 평가원 (심야 파인다이닝 코너)
- **컨셉**: 최고급 미슐랭 3스타 프라이빗 다이닝 룸. 하얀 리넨 테이블보 위의 은식기 세팅과 크리스탈 와인잔, 은은한 조명, 아치형 창 너머로 반짝이는 도시 야경.
- **색감**: 샴페인 골드, 따뜻한 앰버, 크리스탈 화이트
```text
16-bit pixel art, vertical mobile background, an ultra-luxury private dining room of a three-star Michelin restaurant at night. A corner table with crisp white linen tablecloth, polished silver cutlery, wine glasses, an anonymous leather tasting notebook and fountain pen, large arched glass window showing city skyline bokeh lights, warm ambient luxury lighting, retro point-and-click pixel art --ar 9:16 --style raw
```

---

### 5. `themes/hj_conservator.webp` — 고문서 복원가 (국립 보존 연구실)
- **컨셉**: 고문서 보존 연구실. 유리 작업대 아래 은은한 하부 조명, 펼쳐진 고대 양피지와 파피루스, 정밀 핀셋과 미세 붓, 건조대와 고서적 서가.
- **색감**: 파피루스 베이지, 낡은 가죽 브라운, 은은한 형광 화이트
```text
16-bit pixel art, vertical mobile background, an ancient manuscript conservation laboratory. A backlit glass drafting desk illuminating delicate papyrus scrolls and parchment fragments, fine tweezers, camel-hair brushes, glass jars of pigment and binding glue, floor-to-ceiling wooden archive shelves with leather-bound codices, scientific and historical archive atmosphere, detailed retro pixel art --ar 9:16 --style raw
```

---

### 6. `themes/hj_bodyguard.webp` — VIP 전속 경호원 (방탄 의전 라운지 & 리무진 도크)
- **컨셉**: 국빈급 VIP 전용 지하 보안 도크. 검은색 방탄 리무진의 유광 차체, 다중 CCTV 모니터링 콘솔, 벽면의 금속 사물함과 슈트 케이스, 보안 게이트.
- **색감**: 흑요석 블랙, 네이비 블루, 경고등 호박색
```text
16-bit pixel art, vertical mobile background, a subterranean high-security executive protection bay. A sleek armored black VIP limousine parked under overhead industrial strip lights, a tactical security console with multiple glowing surveillance monitors, metal lockers with earpieces and tactical briefcases, clean polished concrete floor, clandestine bodyguard headquarters, retro cyberpunk-noir pixel aesthetic --ar 9:16 --style raw
```

---

### 7. `themes/hj_detective.webp` — 사립탐정 (비 내리는 탐정 사무소)
- **컨셉**: 1970~80년대 필름 누아르 풍 사립탐정 사무소. 비 내리는 창문의 블라인드 틈으로 새어드는 가로등 불빛, 붉은 실로 연결된 사건 용의자 사진들, 낡은 타자기와 스탠드.
- **색감**: 누아르 세피아, 담배 연기 블루, 가로등 앰버
```text
16-bit pixel art, vertical mobile background, a classic hardboiled detective office on a rainy night. Venetian window blinds casting sharp horizontal light slats, rain streaks on window pane, cork pinboard covered in black-and-white photos connected with red string, wooden desk with an old manual typewriter, rotary phone, green banker's lamp, noir retro pixel mystery game style --ar 9:16 --style raw
```

---

### 8. `themes/hj_perfumer.webp` — 조향사 (향수 아틀리에 '오르간')
- **컨셉**: 프랑스 그라스 스타일의 최고급 향수 아틀리에. 반원형으로 3단 계단식 배치된 수백 개의 시약병(향수 오르간), 에센셜 오일 증류기, 유리 스포이트와 시향지.
- **색감**: 로즈골드, 앰버 글래스, 올리브 그린
```text
16-bit pixel art, vertical mobile background, a master perfumer's atelier with a traditional perfume organ. Stepped curved wooden shelves holding hundreds of small amber glass tincture bottles, delicate glass droppers, paper scent strips (mouillettes) in a brass holder, vintage brass distillation alembic in the corner, soft morning sunlight through sheer curtains, refined artisanal workshop, 16-bit pixel art --ar 9:16 --style raw
```

---

### 9. `themes/hj_stargazer.webp` — 별을 읽는 점술사 (새벽의 천문 점성관)
- **컨셉**: 밤하늘 돔 천장이 열린 신비로운 점성술 탑. 거대한 황동 천구의(Armillary sphere), 별자리 성도(Sky map)가 펼쳐진 원형 테이블, 크리스탈 오브와 자수정.
- **색감**: 코스믹 퍼플, 미드나잇 인디고, 별빛 골드
```text
16-bit pixel art, vertical mobile background, a mystical midnight celestial observatory tower. A circular vaulted domed room with an open skylight showing constellations, a large antique brass armillary sphere, star charts and astrolabes unrolled on a dark velvet round table, glowing violet crystal clusters, flickering starlight, magical astronomical divination atmosphere, retro pixel art --ar 9:16 --style raw
```

---

### 10. `themes/hj_pope.webp` — 교황 (바티칸 사도궁 집무실)
- **컨셉**: 바티칸 교황청 높은 층의 사도궁 서재 창가. 대리석 기둥과 금빛 프레스코 천장화, 십자가와 가죽 장정 성경, 아치형 테라스 창 너머로 성 베드로 광장이 내려다보이는 뷰.
- **색감**: 교황청 화이트, 교황의 골드, 대리석 크림
```text
16-bit pixel art, vertical mobile background, the Papal apartment private study in the Vatican. Ornate white marble pillars with gilded baroque fresco ceiling, mahogany desk with a papal golden crucifix and vellum bible, tall arched French doors opening to a balcony overlooking St. Peter's Square illuminated below, sacred, serene, imperial majesty, detailed 16-bit pixel art --ar 9:16 --style raw
```

---

### 11. `themes/hj_space_analyst.webp` — 위성 궤도 분석가 (우주 궤도 교통 관제 센터)
- **컨셉**: 우주항공 궤도 관제 센터. 대형 스크린에 띄워진 지구 와이어프레임과 수천 개의 위성 궤도선, 빨간색 충돌 경보 플래그, 듀얼 모니터 관제석과 궤도 계산 터미널.
- **색감**: 딥 스페이스 블랙, 사이버 시안, 경보 네온 레드
```text
16-bit pixel art, vertical mobile background, a satellite orbital collision avoidance control room. A massive holographic wall display showing planet Earth surrounded by glowing orbital paths and trajectory vectors, warning alert markers, futuristic multi-screen flight dynamics consoles, telemetry data streams, clean sci-fi aerospace mission operations center, crisp 16-bit pixel art --ar 9:16 --style raw
```

---

# 🎪 [파트 2] 대형 이벤트 상단 배너 (16종)

- **권장 해상도**: **`1024 × 286`** (가로형 파노라마, `--ar 7:2` 또는 `--ar 16:4.5`)
- **역할**: 미니게임 및 대형 이벤트 팝업 상단 가로 배너

---

### A. 전용 배너가 없던 신규 이벤트 (12종)

#### 1. `events/fire.webp` — 🚒 불길 속으로 (화재 진압 현장)
```text
16-bit pixel art, horizontal banner, intense firefighter rescue scene. Blazing apartment building engulfed in orange-red flames and thick black smoke, fire truck with flashing red-blue emergency lights pumping powerful high-pressure water hoses into the blaze, silhouetted firefighter in reflective gear rushing in, dramatic action scene, retro pixel art --ar 7:2 --style raw
```

#### 2. `events/inflight.webp` — 🚑 기내 응급환자 ("선생님 계십니까?")
```text
16-bit pixel art, horizontal banner, emergency medical crisis inside an airplane cabin. Narrow passenger aisle with overhead luggage bins, emergency medical bag open on seat, doctor in shirt sleeves performing urgent CPR on a passenger, anxious flight attendant holding an oxygen bottle, dramatic cinematic lighting, retro pixel art --ar 7:2 --style raw
```

#### 3. `events/fishing.webp` — 🎣 대물 낚시 대회 (새벽 물안개 호수)
```text
16-bit pixel art, horizontal banner, intense competitive fishing championship. Misty lake at sunrise, a wooden fishing platform, a carbon fishing rod bent in a dramatic arc, a giant monster bass leaping out of water with shimmering spray, morning orange sun reflected on ripples, atmospheric retro pixel art --ar 7:2 --style raw
```

#### 4. `events/marathon.webp` — 🏃 마라톤 풀코스 (도심 결승선 스퍼트)
```text
16-bit pixel art, horizontal banner, city marathon finish line sprint. Runners racing on a wide asphalt city boulevard lined with cheering crowds, lead runner with race bib bursting through the red finish line ribbon, digital timer clock ticking, confetti falling in the air, bright sunny day, energetic sports pixel art --ar 7:2 --style raw
```

#### 5. `events/everest.webp` — 🏔 8천 미터의 꿈 (히말라야 데스존 등반)
```text
16-bit pixel art, horizontal banner, extreme mountaineering summit push in Himalayas. Ice-capped jagged peaks of Mount Everest under a blizzard, climbers in yellow and orange down suits tethered by rope crossing a knife-edge snow ridge, ice axes digging into blue glacial ice, epic, perilous scale, retro pixel art --ar 7:2 --style raw
```

#### 6. `events/propose.webp` — 💍 프러포즈 대작전 (한강 야경 프러포즈)
```text
16-bit pixel art, horizontal banner, romantic candlelit marriage proposal. Panoramic glass terrace overlooking Han River and illuminated bridges at night, walkway paved with red rose petals and glowing glass candles, velvet jewelry box opened showing a sparkling diamond ring, romantic bokeh city lights, retro pixel art --ar 7:2 --style raw
```

#### 7. `events/soccer.webp` — ⚽ 조기축구 결승 (일요일 아침 결승골)
```text
16-bit pixel art, horizontal banner, amateur weekend soccer tournament final match. Green artificial turf pitch with white boundary lines, striker in yellow jersey executing a mid-air bicycle kick, ball flying toward top corner netting, goalkeeper diving, autumn morning mist, energetic retro pixel art --ar 7:2 --style raw
```

#### 8. `events/ssireum.webp` — 🐂 명절 씨름 대회 (모래판 천하장사)
```text
16-bit pixel art, horizontal banner, traditional Korean Ssireum wrestling tournament. Circular red-and-blue sand ring, two muscular wrestlers in red and blue satba belts locked in a dynamic lift throw, sand spraying up, festive crowd with traditional Korean banners, gold bull trophy on display, dynamic retro pixel art --ar 7:2 --style raw
```

#### 9. `events/concours.webp` — 🎻 국제 음악 콩쿠르 (오케스트라 협연)
```text
16-bit pixel art, horizontal banner, prestigious international classical music concours. Grand acoustic concert hall illuminated by crystal chandeliers, soloist standing in front of a full symphony orchestra playing violin with fierce passion, warm gilded wood concert hall, refined classical performance, retro pixel art --ar 7:2 --style raw
```

#### 10. `events/goldenbell.webp` — 🔔 도전! 골든벨 (최후의 1인)
```text
16-bit pixel art, horizontal banner, Korean high school quiz showdown (Golden Bell). High school gymnasium floor filled with checkered mats, students with hats holding up small whiteboards, one final student under a spotlight facing the giant hanging brass golden bell on the stage, retro game pixel art --ar 7:2 --style raw
```

#### 11. `events/tsunami.webp` — 🌊 해안 대피 작전 (항구 도시 쓰나미 경보)
```text
16-bit pixel art, horizontal banner, urgent coastal tsunami evacuation. Coastal port city under ominous storm clouds, a towering tidal wave wall rising on the oceanic horizon, ocean spray crashing over seawall, flashing red evacuation sirens, convoy of vehicles speeding toward inland hill roads, thrilling disaster pixel art --ar 7:2 --style raw
```

#### 12. `events/station_repair.webp` — 🛰 우주정거장 선외 수리 (궤도 유영)
```text
16-bit pixel art, horizontal banner, spacewalk repair on an orbital space station. Astronaut in white pressurized spacesuit tethered to mechanical solar panel truss, repair torch glowing, blue curved horizon of Earth and black void of space with twinkling stars in background, grand hard sci-fi pixel art --ar 7:2 --style raw
```

---

### B. 다른 배너를 빌려 쓰던 이벤트 전용 배너화 (4종)

#### 13. `events/baduk.webp` — ⚫ 바둑 명인전 결승 (기존 체스 배너 대체)
```text
16-bit pixel art, horizontal banner, Korean professional Baduk (Go) championship final. Close-up isometric view of a thick Kaya wood Go board covered in black and white polished stone stones, digital countdown game clock, traditional Korean wooden sliding door background, intense zen battle of intellect, retro pixel art --ar 7:2 --style raw
```

#### 14. `events/hackathon.webp` — 💻 AI 해커톤 (기존 창업 피칭 배너 대체)
```text
16-bit pixel art, horizontal banner, 48-hour overnight AI tech hackathon. Open warehouse venue crammed with long tables, programmers hunched over glowing multi-monitor laptops showing code lines, empty energy drink cans and pizza boxes, large digital countdown timer on wall, cyberpunk startup hackathon, retro pixel art --ar 7:2 --style raw
```

#### 15. `events/hearing.webp` — 🏛 국회 인사청문회 (기존 법정 배너 대체)
```text
16-bit pixel art, horizontal banner, National Assembly parliamentary confirmation hearing. Imposing semicircular committee room with wooden desks and Korean nameplates, witness testifying at solitary center microphone desk, intense camera flashes flashing from press pit, solemn political power drama, retro pixel art --ar 7:2 --style raw
```

#### 16. `events/cannes.webp` — 🎬 칸 영화제 레드카펫 (기존 여우주연상 배너 대체)
```text
16-bit pixel art, horizontal banner, Cannes Film Festival red carpet staircase at Palais des Festivals. Wide red carpet steps leading up under giant spotlights, crowds of tuxedo-clad paparazzi flashing camera strobes on both sides, palm trees against dark blue French Riviera night sky, cinematic glamour, retro pixel art --ar 7:2 --style raw
```
