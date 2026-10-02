// 🗞 인생 신문 1면 카드: 도트 초상화 + 헤드라인 + 묘비명을 한 장의 이미지로 (저장·공유)
import { obituary } from '../core/obituary';
import { portraitURL } from '../render/portrait';
import { fullName } from '../core/people';
import type { GameState, Person } from '../core/types';

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxW && line) {
      out.push(line);
      line = ch === ' ' ? '' : ch;
    } else line += ch;
  }
  if (line) out.push(line);
  return out;
}

/** 신문 1면 이미지를 만든다 (PNG Blob) */
export async function obituaryImage(g: GameState, p: Person): Promise<Blob | null> {
  const o = obituary(g, p);
  const W = 720;
  const H = 960;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  if (!x) return null;
  // 누런 신문지
  x.fillStyle = '#efe6cf';
  x.fillRect(0, 0, W, H);
  x.fillStyle = '#1e1a14';
  x.font = 'bold 54px Galmuri14, serif';
  x.textAlign = 'center';
  x.fillText(`${g.familyName}씨 가문 일보`, W / 2, 80);
  x.font = '18px Galmuri11, serif';
  x.fillText(`${p.deathYear ?? g.year}년 · ${o.section} · 제${g.generation}대`, W / 2, 112);
  x.fillRect(40, 126, W - 80, 4);
  x.fillRect(40, 134, W - 80, 1);
  // 도트 초상화 (흑백 사진처럼)
  const img = new Image();
  img.src = portraitURL(p, Math.max(20, (p.deathYear ?? g.year) - p.birthYear));
  await new Promise((r) => ((img.onload = r), (img.onerror = r)));
  x.imageSmoothingEnabled = false;
  x.filter = 'grayscale(1) contrast(1.1)';
  x.drawImage(img, W / 2 - 110, 160, 220, 220);
  x.filter = 'none';
  x.strokeStyle = '#1e1a14';
  x.lineWidth = 4;
  x.strokeRect(W / 2 - 110, 160, 220, 220);
  x.font = '20px Galmuri11, serif';
  x.fillText(`故 ${fullName(p)} (${p.birthYear}~${p.deathYear ?? g.year})`, W / 2, 412);
  // 헤드라인
  x.textAlign = 'left';
  x.font = 'bold 32px Galmuri14, serif';
  let y = 470;
  for (const l of wrap(x, o.headline, W - 100)) (x.fillText(l, 50, y), (y += 44));
  x.font = '20px Galmuri11, serif';
  y += 8;
  x.fillText(o.sub, 50, y);
  y += 50;
  x.textAlign = 'center';
  x.font = 'italic 26px Galmuri11, serif';
  x.fillText(o.epitaph, W / 2, y);
  x.font = '16px Galmuri11, serif';
  x.fillText('가문 키우기 · gamun-kiugi.pages.dev', W / 2, H - 30);
  return new Promise((r) => c.toBlob((b) => r(b), 'image/png'));
}

/** 공유 시트(모바일) 또는 파일 저장 */
export async function shareObituary(g: GameState, p: Person): Promise<string> {
  const blob = await obituaryImage(g, p);
  if (!blob) return '이미지를 만들지 못했다.';
  const file = new File([blob], `부고_${fullName(p)}.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: `${fullName(p)} 인생 신문`, text: obituary(g, p).headline });
      return '공유했다.';
    } catch {
      /* 취소 → 저장으로 */
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return '🗞 인생 신문을 이미지로 저장했다.';
}
