# 가문 키우기 — 작업 규칙

## 🚀 배포 (가장 중요)

**Cloudflare Pages가 `main` 브랜치를 감시한다. `main`에 푸시하면 약 1분 뒤 자동 배포된다.**

- 라이브: https://gamun-kiugi.pages.dev (미러: https://simbio11.github.io/gamun-kiugi)
- ✅ **작업이 끝나면 반드시 `main` 브랜치에 직접 커밋·푸시할 것.**
- ❌ `claude/*` 같은 작업 브랜치에만 올리면 **푸시는 성공해도 사이트에는 배포되지 않는다**
  (2026-09-29·09-30 두 번 발생 — 야간 작업이 사이트에 안 뜬 원인)

### 작업 순서

```bash
git checkout main
git pull --rebase origin main     # 최신 main을 먼저 받는다 (안 하면 푸시 거부될 수 있음)
# ... 작업 ...
npm run build && npm test         # 테스트 48개 통과 필수 — 실패하면 푸시하지 말고 원인을 보고
npm run build:pages               # docs/ 미러 갱신 (GitHub Pages용 산출물)
git add -A && git commit -m "한국어 한 줄 요약"
git push origin main
```

- `docs/` 는 GitHub Pages 미러용 빌드 산출물이다. 코드를 고쳤으면 `npm run build:pages` 로 함께 갱신해 커밋한다.
- 커밋 메시지는 **한국어 한 줄 요약** (+ 필요하면 본문).

## 프로젝트 규칙

- `src/core/` 는 UI를 모른다. 시뮬레이션은 **시드 기반 RNG** 로 재현 가능해야 한다 (`tests/sim.test.ts`).
- 확률·통계 수치는 실제 통계를 참고하고, **출처를 주석으로 남긴다**.
- 새 이벤트·직업·이야기를 추가하면 `registry.ts` 에 등록하고 테스트를 갱신한다.
- 기존 세이브(로컬 저장)와의 호환을 깨는 변경은 버전을 올리고 마이그레이션을 넣는다.

## 참고

- 기획서: `docs/GDD.md`
- 폰트: Galmuri (SIL OFL 1.1) — 라이선스 표기 유지
