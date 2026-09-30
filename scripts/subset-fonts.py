# 갈무리 폰트를 게임에 쓰이는 글자만 남겨 줄인다 (배포 페이지 용량 때문).
# 남기는 글자: 소스에 나오는 모든 글자 + KS X 1001 한글 2,350자 + 아스키·기호. 없는 글자는 기본 글꼴로 보인다.
# 쓰는 법: pip install fonttools brotli && python3 scripts/subset-fonts.py
import glob, os
from fontTools import subset

chars = set()
for f in glob.glob('src/**/*.*', recursive=True):
    if f.endswith(('.ts', '.css', '.html')):
        chars |= set(open(f, encoding='utf-8').read())
for c in range(0xAC00, 0xD7A4):
    try:
        chr(c).encode('euc-kr')
        chars.add(chr(c))
    except UnicodeEncodeError:
        pass
chars |= {chr(c) for c in range(0x20, 0x7F)}
text = ''.join(sorted(chars))
for name in ['Galmuri11', 'Galmuri14']:
    src = f'node_modules/galmuri/dist/{name}.woff2'
    out = f'src/assets/fonts/{name}.woff2'
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    font = subset.load_font(src, opts)
    s = subset.Subsetter(opts)
    s.populate(text=text)
    s.subset(font)
    subset.save_font(font, out, opts)
    print(name, os.path.getsize(src), '->', os.path.getsize(out))
