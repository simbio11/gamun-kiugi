"""잘라낸 초상화 부품(assets/portrait-parts)을 종류별 아틀라스 한 장으로 묶고, 조립에 쓰는 기준점을 잰다.

  python3 scripts/build-portrait-atlas.py
  결과: public/portrait/<종류>.webp + public/portrait/atlas.json

기준점 (모두 잘라낸 부품 왼쪽 위 기준, 원본 픽셀 단위)
  heads  : cx 얼굴 가운데, top 정수리, chin 턱, bot 목 끝, fw 얼굴 폭(귀 제외), skin 대표 피부색, neck 목 색
  hair-* : face 지운 얼굴 자리 [x0, y0, x1, y1] → 두상의 얼굴 폭·턱에 맞춘다
  outfit : cx 목 가운데, top 목 윗끝, nw 목 폭, skin 목 피부색(두상 피부색으로 바꿔 칠함)
  눈·코·입: skin 부품에 섞인 피부색(두상 피부색으로 바꿔 칠함)
"""
import json, os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'portrait-parts')
OUT = os.path.join(ROOT, 'public', 'portrait')

KINDS = ['heads', 'hair-f', 'hair-m', 'eyes', 'eyes-makeup', 'noses', 'mouths',
         'outfit-f', 'outfit-f-kid', 'outfit-f-uniform', 'outfit-f-special',
         'outfit-m-uniform', 'outfit-m-special', 'outfit-m-age']


def skin_ref(a, region=None):
    """가장 흔한 피부색(주황 계열) — 없으면 None"""
    c = a[..., :3].astype(int)
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    ok = (a[..., 3] > 0) & (r > g) & (g > b) & (r - b > 25) & (r > 70) & (r - g < 90)
    if region is not None: ok &= region
    if ok.sum() < 6: return None
    q = c[ok] // 12
    keys, cnt = np.unique(q[:, 0] * 10000 + q[:, 1] * 100 + q[:, 2], return_counts=True)
    k = int(keys[cnt.argmax()])
    return [min(255, k // 10000 * 12 + 6), min(255, k // 100 % 100 * 12 + 6), min(255, k % 100 * 12 + 6)]


def head_info(a):
    m = a[..., 3] > 0
    w = m.sum(1)
    ys = np.nonzero(w)[0]
    top, bot = int(ys[0]), int(ys[-1])
    band = m[top + 9:top + 15]
    fw = int(np.median(w[top + 9:top + 15]))
    xs = np.nonzero(band.any(0))[0]
    cx = (xs[0] + xs[-1] + 1) / 2
    widest = int(np.argmax(w))
    neck_w = int(w[bot - 3])
    chin = bot
    for y in range(widest, bot + 1):
        if w[y] <= neck_w + 4:
            chin = y
            break
    if bot - chin > 3:
        a[bot - 1:, :, 3] = 0  # 목 끝 테두리 줄: 옷의 목과 이어 보이게 지운다
        bot -= 2
    skin = skin_ref(a)
    nk = a[max(top, bot - 3), int(cx), :3].tolist() if bot - chin > 3 else skin
    return {'cx': cx, 'top': top, 'chin': chin, 'bot': bot, 'fw': fw, 'skin': skin, 'neck': [int(v) for v in nk]}


def dilate(m, n):
    for _ in range(n):
        g = m.copy()
        g[1:] |= m[:-1]; g[:-1] |= m[1:]; g[:, 1:] |= m[:, :-1]; g[:, :-1] |= m[:, 1:]
        m = g
    return m


def hair_clean(a, f):
    """헤어 시트의 민얼굴을 지운 자리에 남은 얼굴 윤곽선(턱선·볼선)과 살색·흰 테두리를 지운다.
    그대로 두면 머리색으로 다시 칠할 때 턱수염처럼 보인다."""
    c = a[..., :3].astype(int)
    r, g, b = c[..., 0], c[..., 1], c[..., 2]
    h, w = a.shape[:2]
    box = np.zeros((h, w), bool)
    box[f[1]:f[3], f[0]:f[2]] = True
    hole = box & (a[..., 3] == 0)
    fh = f[3] - f[1]
    # 볼·턱 높이(얼굴 위 30% 아래)는 구멍에서 3픽셀 안쪽을 모두 — 윤곽선
    ring = dilate(hole, 3) & (a[..., 3] > 0)
    ring[:f[1] + int(fh * 0.3)] = False
    a[ring, 3] = 0
    # 이마 쪽은 2픽셀 안의 살색·밝은 무채색만 (앞머리 끝은 남긴다)
    near = dilate(hole, 2) & (a[..., 3] > 0)
    skinlike = (r > g) & (g > b) & (r - b > 30) & (r > 150)
    pale = (c.min(2) > 180) & (np.ptp(c, 2) < 60)
    a[near & (skinlike | pale), 3] = 0
    # 턱 아래 가운데(헤어 시트 얼굴의 목)는 지운다 — 다시 칠하면 목에 머리색 띠가 생긴다
    a[f[3] - 1:, f[0] + 2:f[2] - 2, 3] = 0
    # 크림색 배경 찌꺼기: 투명한 곳에 맞닿은 밝은 무채색을 두 겹 벗긴다 (다시 칠하면 새하얗게 튄다)
    cream = np.abs(c - [252, 244, 220]).max(2) < 30  # 시트 바탕색 (머리의 윤기 점은 색이 있어 안 걸린다)
    for _ in range(2):
        edge = dilate(a[..., 3] == 0, 1) & (a[..., 3] > 0)
        a[edge & cream, 3] = 0


def drop_specks(a, keep=30):
    """격자선·민머리 잔여 같은 작은 조각(4방향으로 이어진 픽셀 30개 미만)을 지운다"""
    m = a[..., 3] > 0
    seen = np.zeros(m.shape, bool)
    h, w = m.shape
    for sy, sx in zip(*np.nonzero(m)):
        if seen[sy, sx]: continue
        comp, st = [], [(sy, sx)]
        seen[sy, sx] = True
        while st:
            y, x = st.pop()
            comp.append((y, x))
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < h and 0 <= xx < w and m[yy, xx] and not seen[yy, xx]:
                    seen[yy, xx] = True
                    st.append((yy, xx))
        ys_ = [y for y, _ in comp]
        if len(comp) < keep or max(ys_) - min(ys_) <= 3:  # 작은 조각, 또는 가로로 긴 격자선 잔여
            for y, x in comp: a[y, x, 3] = 0


def fill_ratio(a):
    """옷 아래쪽 45%에서 줄마다 좌우 끝 사이가 차 있는 비율 (구멍 난 옷 거르기)"""
    m = a[int(a.shape[0] * 0.55):, :, 3] > 0
    fr = []
    for row in m:
        xs = np.nonzero(row)[0]
        if len(xs) > 4: fr.append(row[xs[0]:xs[-1] + 1].mean())
    return float(np.mean(fr)) if fr else 0.0


NECK = [230, 180, 140]  # 옷의 목 피부를 맞춰 두는 표준 피부색


def outfit_info(a):
    """목: 옷 맨 위 가운데가 목 피부 → 그 색에서 이어진 영역(목·V넥 가슴)을 두상 피부색으로 바꿔 칠할 곳으로"""
    m = a[..., 3] > 0
    w = m.sum(1)
    top = next(y for y in range(len(w)) if w[y] >= 6)
    xs = np.nonzero(m[top:top + 4].any(0))[0]
    cx = (xs[0] + xs[-1] + 1) / 2
    nw = int(np.median(w[top:top + 5]))
    c = a[..., :3].astype(int)
    ic = int(cx)
    sample = c[top + 1:top + 5, ic - 2:ic + 3].reshape(-1, 3)
    ref = np.median(sample, 0)
    near = m & (np.abs(c - ref).max(2) < 40)
    seen = np.zeros(m.shape, bool)
    st = [(y, x) for y in range(top + 1, top + 5) for x in range(ic - 2, ic + 3) if near[y, x]]
    for y, x in st: seen[y, x] = True
    while st:
        y, x = st.pop()
        for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= yy < m.shape[0] and 0 <= xx < m.shape[1] and near[yy, xx] and not seen[yy, xx]:
                seen[yy, xx] = True
                st.append((yy, xx))
    ys = np.nonzero(seen.any(1))[0]
    skin_y = int(ys[-1]) + 2 if len(ys) else top + 4
    # 목 피부를 표준 피부색(명암 유지)으로 바꿔 둔다 → 조립할 때 이 색만 두상 피부색으로 옮기면 된다
    lum = lambda v: v[..., 0] * 0.3 + v[..., 1] * 0.59 + v[..., 2] * 0.11
    k = np.clip(lum(c[seen]) / max(1.0, lum(ref)), 0.55, 1.25)[:, None]
    a[..., :3][seen] = np.clip(np.array(NECK) * k, 0, 255).astype(np.uint8)
    return {'cx': cx, 'top': top, 'nw': nw, 'skin': NECK, 'skinY': min(skin_y, top + 30)}


def main():
    parts = json.load(open(os.path.join(SRC, 'parts.json')))
    atlas = {}
    os.makedirs(OUT, exist_ok=True)
    for kind in KINDS:
        items = []
        for p in parts[kind]:
            if not p['bbox'] or p.get('hasHead'): continue
            a = np.asarray(Image.open(os.path.join(SRC, p['file']))).copy()
            info = {'r': p['row'], 'c': p['col']}
            if kind.startswith('hair'):
                f = p.get('face')
                if not f or not 22 <= f[2] - f[0] <= 34: continue  # 얼굴 자리를 못 찾은 칸
                hair_clean(a, f)
            if kind == 'heads':
                info.update(head_info(a))
            if kind.startswith('outfit'):
                drop_specks(a)
                if kind in ('outfit-f', 'outfit-f-kid'):
                    # 목 둘레에 남은 회색 민머리 테두리
                    m = a[..., 3] > 0
                    ys = np.nonzero(m.any(1))[0]
                    cc = a[..., :3].astype(int)
                    gray = (np.ptp(cc, 2) < 16) & (cc.mean(2) > 110) & m
                    gray[ys[0] + 18:] = False
                    a[gray, 3] = 0
                    drop_specks(a)
            ys, xs = np.nonzero(a[..., 3])
            x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
            a = a[y0:y1, x0:x1]
            if kind == 'heads':
                info['cx'] -= x0
                for k in ('top', 'chin', 'bot'): info[k] -= y0
            elif kind.startswith('hair'):
                f = p['face']
                info['face'] = [f[0] - x0, f[1] - y0, f[2] - x0, f[3] - y0]
            elif kind.startswith('outfit'):
                if fill_ratio(a) < 0.8: continue  # 배경을 지우다 옷까지 뚫린 칸 (회색 옷이 회색 바탕에 묻힘)
                info.update(outfit_info(a))
                # 모자·헬멧·방호복 두건: 두상과 겹친다 (나이·직업 복장표는 민머리 테두리가 남아 목이 넓게 재져서 제외)
                if info['nw'] > 24 and kind not in ('outfit-f', 'outfit-f-kid'): continue
            else:
                info['skin'] = skin_ref(a)
            if 'age' in p: info['age'] = p['age']
            if 'job' in p: info['job'] = p['job']
            items.append((a, info))
        # 선반 쌓기: 한 줄 폭 1024 안에서 왼쪽→오른쪽
        W = 1024
        x = y = rowh = 0
        for a, info in items:
            h, w = a.shape[:2]
            if x + w > W: x, y, rowh = 0, y + rowh + 1, 0
            info.update({'x': x, 'y': y, 'w': w, 'h': h})
            x += w + 1
            rowh = max(rowh, h)
        sheet = np.zeros((y + rowh, W, 4), np.uint8)
        for a, info in items:
            sheet[info['y']:info['y'] + info['h'], info['x']:info['x'] + info['w']] = a
        Image.fromarray(sheet, 'RGBA').save(os.path.join(OUT, f'{kind}.webp'), lossless=True, method=6)  # 무손실 webp: png보다 30%쯤 작다
        for _, info in items:
            for k, v in list(info.items()):
                if isinstance(v, float): info[k] = round(v, 1)
        atlas[kind] = [info for _, info in items]
        print(kind, len(items), sheet.shape[:2])
    with open(os.path.join(OUT, 'atlas.json'), 'w') as f:
        json.dump(atlas, f, ensure_ascii=False, separators=(',', ':'), default=lambda v: v.item())


if __name__ == '__main__':
    main()
