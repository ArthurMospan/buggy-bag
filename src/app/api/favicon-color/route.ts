import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain');
  if (!domain) return NextResponse.json({ color: null });

  try {
    // Беремо фавіконку через наш власний проксі
    const base = req.nextUrl.origin;
    const res = await fetch(`${base}/api/favicon?domain=${domain}`);
    if (!res.ok) return NextResponse.json({ color: null });

    const buffer = await res.arrayBuffer();

    const sharp = (await import('sharp')).default;
    const { data, info } = await sharp(Buffer.from(buffer))
      .resize(16, 16)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const colorCounts: Record<string, number> = {};
    let maxCount = 0;
    let dominantColor: string | null = null;

    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const a = info.channels === 4 ? data[i + 3] : 255;
      if (a < 128) continue;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      if (max === 0 || (max - min) / max < 0.2) continue; // skip grays
      if (max < 40) continue; // skip near-black

      const key = `${Math.round(r/32)*32},${Math.round(g/32)*32},${Math.round(b/32)*32}`;
      colorCounts[key] = (colorCounts[key] || 0) + 1;
      if (colorCounts[key] > maxCount) {
        maxCount = colorCounts[key];
        dominantColor = `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
      }
    }

    return NextResponse.json(
      { color: dominantColor },
      { headers: { 'Cache-Control': 'public, max-age=86400' } }
    );
  } catch {
    return NextResponse.json({ color: null });
  }
}
