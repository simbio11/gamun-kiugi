"""초상화 부품 시트(원본 이미지)를 칸별로 잘라 배경을 투명하게 만든 PNG로 저장한다.

  python3 scripts/slice-portrait-parts.py <시트 폴더>
  시트 폴더: heads.webp, hair-f.webp, eyes.webp, eyes-makeup.webp
  결과:     public/portrait/<종류>/NNN.png  + public/portrait/parts.json

격자선(옅은 갈색 줄)을 자동으로 찾아 칸을 나누고,
칸 가장자리에서 배경(크림색)과 비슷한 색을 flood fill 해서 지운다.
"""
import json, sys, os
from collections import deque
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'portrait')
GUTTER = np.array([238, 229, 194])


def runs(mask, n):
    """True 구간 → 격자선 [(시작, 끝)]. 가까운 조각은 합치고, 그림 가장자리는 선으로 친다."""
    out, s = [], None
    for i, v in enumerate(list(mask) + [False]):
        if v and s is None: s = i
        if not v and s is not None: out.append([s, i - 1]); s = None
    merged = []
    for r in out:
        if merged and r[0] - merged[-1][1] < 16: merged[-1][1] = r[1]
        else: merged.append(r)
    if not merged or merged[0][0] > 4: merged.insert(0, [0, 0])
    if merged[-1][1] < n - 5: merged.append([n - 1, n - 1])
    return merged


def grid(a, top):
    g = (np.abs(a - GUTTER) < [9, 9, 12]).all(2)
    cols = runs(g[top:].mean(0) > 0.5, a.shape[1])
    rows = [r for r in runs(g.mean(1) > 0.5, a.shape[0]) if r[1] >= top - 20]
    return cols, rows


def cut(a, x0, y0, x1, y1, tol):
    c = a[y0:y1, x0:x1].copy()
    h, w, _ = c.shape
    edge = np.concatenate([c[0], c[-1], c[:, 0], c[:, -1]])
    bg = np.median(edge, 0)
    near = np.sqrt(((c - bg) ** 2).sum(2)) < tol
    alpha = np.full((h, w), 255, np.uint8)
    q = deque()
    seen = np.zeros((h, w), bool)
    for x in range(w):
        q.append((0, x)); q.append((h - 1, x))
    for y in range(h):
        q.append((y, 0)); q.append((y, w - 1))
    while q:
        y, x = q.popleft()
        if y < 0 or x < 0 or y >= h or x >= w or seen[y, x] or not near[y, x]: continue
        seen[y, x] = True
        alpha[y, x] = 0
        q.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
    # 가장자리 한 줄(격자선 잔여)은 무조건 투명
    alpha[:1] = alpha[-1:] = 0; alpha[:, :1] = alpha[:, -1:] = 0
    rgba = np.dstack([c.clip(0, 255).astype(np.uint8), alpha])
    ys, xs = np.nonzero(alpha)
    bbox = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1] if len(xs) else None
    return rgba, bbox


def drop_face(rgba, tol=26):
    """헤어 시트의 칸에는 민얼굴이 같이 그려져 있다 → 가운데 세로줄에서 넓고 고른 피부색 구간을 찾아
    그 색과 이어진 영역을 지워 머리카락만 남긴다."""
    h, w, _ = rgba.shape
    c = rgba[..., :3].astype(int)
    a = rgba[..., 3]
    cx = w // 2

    def flood(y0, x0, col, box=None):
        near = (np.sqrt(((c - col) ** 2).sum(2)) < tol) & (a > 0)
        if box is not None:
            lim = np.zeros((h, w), bool)
            lim[max(0, box[0]):box[1], max(0, box[2]):box[3]] = True
            near &= lim
        q = deque([(y0, x0)])
        seen = np.zeros((h, w), bool)
        while q:
            y, x = q.popleft()
            if y < 0 or x < 0 or y >= h or x >= w or seen[y, x] or not near[y, x]: continue
            seen[y, x] = True
            q.extend(((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)))
        return seen

    # 가운데 줄의 고른 피부색 후보마다 이어진 넓이를 재서 가장 넓은 것 = 얼굴 (짧은 머리 윗부분도 고른 색이라)
    best, col = None, None
    for y in range(0, h - 8, 3):
        win = c[y:y + 8, cx - 3:cx + 4].reshape(-1, 3)
        if a[y:y + 8, cx - 3:cx + 4].min() == 0: continue
        m = win.mean(0)
        r, g, b = m
        if win.std(0).max() < 6 and r > g > b and r - b > 30:
            if best is not None and best[y + 4, cx]: continue
            if not (12 < r - g < 75 and 12 < g - b < 72): continue  # 피부색 범위(금발·주황머리 제외)
            seen = flood(y + 4, cx, m)
            ys, xs = np.nonzero(seen)
            if np.ptp(ys) > 62 or np.ptp(xs) > 40: continue  # 얼굴+목(약 32×55)보다 크면 뒷머리
            if best is None or seen.sum() > best.sum(): best, col = seen, m
    if best is None: return rgba, None
    seen = best
    # 얼굴 가장자리의 안티에일리어싱 한 픽셀도 함께
    grow = seen.copy()
    grow[1:] |= seen[:-1]; grow[:-1] |= seen[1:]; grow[:, 1:] |= seen[:, :-1]; grow[:, :-1] |= seen[:, 1:]
    soft = grow & ~seen & (np.sqrt(((c - col) ** 2).sum(2)) < tol * 2.2)
    out = rgba.copy()
    out[seen | soft, 3] = 0
    return out, [int(v) for v in col]


def ear_score(a, x0, y0, x1, y1):
    """주황빛 피부색 비율 — 눈 시트에서 귀 칸 가려내기"""
    c = a[y0:y1, x0:x1]
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    skin = (r > 170) & (g > 110) & (g < 200) & (b < 150) & (r - b > 70)
    return skin.mean()


def main(src):
    sheets = {
        'heads': ('heads.webp', 44),
        'hair-f': ('hair-f.webp', 58),
        'eyes': ('eyes.webp', 44),
        'eyes-makeup': ('eyes-makeup.webp', 44),
    }
    manifest = {}
    plain_eyes = None
    ear_cells = None
    for kind, (fn, top) in sheets.items():
        a = np.asarray(Image.open(os.path.join(src, fn)).convert('RGB')).astype(int)
        cols, rows = grid(a, top)
        print(kind, cols, rows)
        cells = []
        for r in range(len(rows) - 1):
            for c in range(len(cols) - 1):
                cells.append((r, c, cols[c][1] + 1, rows[r][1] + 1, cols[c + 1][0], rows[r + 1][0]))
        if kind == 'eyes':
            ear_cells = {(r, c) for r, c, *box in cells if ear_score(a, *box) > 0.05}
        groups = {}
        for r, c, *box in cells:
            k = kind
            if kind in ('eyes', 'eyes-makeup') and (r, c) in ear_cells:
                k = 'ears' if kind == 'eyes' else 'ears-2'
            rgba, bbox = cut(a, *box, tol=34)
            if kind == 'hair-f':
                rgba, _ = drop_face(rgba)
                ys, xs = np.nonzero(rgba[..., 3])
                bbox = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1] if len(xs) else None
            groups.setdefault(k, []).append((r, c, rgba, bbox))
        for k, items in groups.items():
            d = os.path.join(OUT, k)
            os.makedirs(d, exist_ok=True)
            for f in os.listdir(d): os.remove(os.path.join(d, f))
            meta = []
            for i, (r, c, rgba, bbox) in enumerate(items):
                name = f'{i:03d}.png'
                Image.fromarray(rgba, 'RGBA').save(os.path.join(d, name), optimize=True)
                meta.append({'file': f'{k}/{name}', 'row': r, 'col': c, 'w': rgba.shape[1], 'h': rgba.shape[0], 'bbox': bbox})
            manifest[k] = meta
            print(k, len(items))
    with open(os.path.join(OUT, 'parts.json'), 'w') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(sys.argv[1])
