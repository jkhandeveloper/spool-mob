// Generates the iOS/Android icons, splash and in-app mark from the Spool logo.
// Needs sharp: `npm install --no-save sharp`. See README "Brand assets".
// Builds Spool's brand assets from the supplied logo JPEG.
// usage: node make-icons.cjs <logo.jpg> <out-dir> <preview-dir>
const sharp = require('sharp');
const path = require('path');

const [, , SRC, OUT, PREVIEW] = process.argv;

async function main() {
  const { data, info } = await sharp(SRC).greyscale().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const lum = (x, y) => data[y * W + x];

  // The logo is white line art inside a black rounded square on a white page.
  // Inside = between the leftmost and rightmost black pixel of each row.
  const rowL = new Int32Array(H).fill(-1), rowR = new Int32Array(H).fill(-1);
  let top = H, bottom = -1, left = W, right = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) if (lum(x, y) < 60) { rowL[y] = x; break; }
    for (let x = W - 1; x >= 0; x--) if (lum(x, y) < 60) { rowR[y] = x; break; }
    if (rowL[y] >= 0 && rowR[y] - rowL[y] > W * 0.3) {
      top = Math.min(top, y); bottom = Math.max(bottom, y);
      left = Math.min(left, rowL[y]); right = Math.max(right, rowR[y]);
    }
  }
  const size = Math.max(right - left, bottom - top) + 1;
  const cx = Math.round((left + right) / 2), cy = Math.round((top + bottom) / 2);
  const x0 = cx - Math.floor(size / 2), y0 = cy - Math.floor(size / 2);
  console.log({ W, H, left, right, top, bottom, size });

  // Alpha mask of the white strokes, in the square's own coordinates.
  const inset = 4; // ignore the anti-aliased edge of the black square
  const mask = Buffer.alloc(size * size);
  for (let j = 0; j < size; j++) {
    const y = y0 + j;
    if (y < 0 || y >= H || rowL[y] < 0) continue;
    for (let i = 0; i < size; i++) {
      const x = x0 + i;
      if (x < rowL[y] + inset || x > rowR[y] - inset) continue;
      const v = lum(x, y);
      mask[j * size + i] = Math.max(0, Math.min(255, Math.round(((v - 35) / (215 - 35)) * 255)));
    }
  }
  const N = 1024;
  const maskImg = await sharp(mask, { raw: { width: size, height: size, channels: 1 } })
    .resize(N, N, { kernel: 'lanczos3' }).extractChannel(0).raw().toBuffer();

  // RGBA image of the strokes in `rgb`, scaled by `scale` and centred on an N canvas.
  async function strokes(rgb, scale = 1) {
    const s = Math.round(N * scale);
    const m = scale === 1 ? maskImg : await sharp(maskImg, { raw: { width: N, height: N, channels: 1 } }).resize(s, s).extractChannel(0).raw().toBuffer();
    const px = Buffer.alloc(s * s * 4);
    for (let k = 0; k < s * s; k++) { px[k * 4] = rgb[0]; px[k * 4 + 1] = rgb[1]; px[k * 4 + 2] = rgb[2]; px[k * 4 + 3] = m[k]; }
    const pad = Math.floor((N - s) / 2);
    return sharp(px, { raw: { width: s, height: s, channels: 4 } })
      .extend({ top: pad, bottom: N - s - pad, left: pad, right: N - s - pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toBuffer();
  }
  const solid = (hex, alpha = 1) => sharp({ create: { width: N, height: N, channels: 4, background: hex + (alpha === 1 ? '' : '') } });
  const roundMask = Buffer.from(`<svg width="${N}" height="${N}"><rect width="${N}" height="${N}" rx="${N * 0.225}" fill="#fff"/></svg>`);

  const white = [255, 255, 255];
  const whiteStrokes = await strokes(white);
  const whiteStrokesSafe = await strokes(white, 0.8);

  // Full-bleed square: the OS applies its own corner mask (iOS + legacy Android).
  const fullBleed = await solid('#000000').composite([{ input: whiteStrokes }]).flatten({ background: '#000000' }).png().toBuffer();
  // Rounded tile with transparent corners (splash, favicon, previews).
  const tile = await sharp(fullBleed).composite([{ input: roundMask, blend: 'dest-in' }]).png().toBuffer();

  const out = (f) => path.join(OUT, f);
  await sharp(fullBleed).toFile(out('icon.png'));
  await sharp(fullBleed).toFile(out('ios-light.png'));
  await sharp(fullBleed).toFile(out('ios-dark.png'));
  // Tinted: iOS turns the luminance into the tint; white strokes on black work as-is.
  await sharp(fullBleed).greyscale().toFile(out('ios-tinted.png'));
  await sharp(whiteStrokesSafe).toFile(out('android-icon-foreground.png'));
  await sharp(whiteStrokesSafe).toFile(out('android-icon-monochrome.png'));
  await solid('#000000').png().toFile(out('android-icon-background.png'));
  await sharp(tile).toFile(out('splash-icon.png'));
  await sharp(whiteStrokes).toFile(out('splash-icon-dark.png'));
  await sharp(whiteStrokes).toFile(out('spool-mark.png')); // tintable in-app mark
  await sharp(tile).resize(48, 48).toFile(out('favicon.png'));

  // Previews: how the icons look on device masks, light & dark.
  const circle = Buffer.from(`<svg width="${N}" height="${N}"><circle cx="${N / 2}" cy="${N / 2}" r="${N / 2}" fill="#fff"/></svg>`);
  const adaptiveFull = await solid('#000000').composite([{ input: whiteStrokesSafe }]).flatten({ background: '#000' }).png().toBuffer();
  const adaptive = await sharp(await sharp(adaptiveFull).extract({ left: 171, top: 171, width: 682, height: 682 }).resize(N, N)
    .png().toBuffer()).composite([{ input: circle, blend: 'dest-in' }]).png().toBuffer();
  const monoFull = await sharp({ create: { width: N, height: N, channels: 4, background: '#3b4a3f' } })
    .composite([{ input: await sharp(whiteStrokesSafe).tint({ r: 200, g: 230, b: 205 }).toBuffer() }]).png().toBuffer();
  const mono = await sharp(await sharp(monoFull).extract({ left: 171, top: 171, width: 682, height: 682 }).resize(N, N)
    .png().toBuffer()).composite([{ input: circle, blend: 'dest-in' }]).png().toBuffer();
  const cell = 300, gap = 40;
  const items = [tile, adaptive, mono, await sharp(whiteStrokes).png().toBuffer()];
  const sheet = async (bg) => sharp({ create: { width: gap + items.length * (cell + gap), height: cell + 2 * gap, channels: 4, background: bg } })
    .composite(await Promise.all(items.map(async (b, i) => ({ input: await sharp(b).resize(cell, cell).toBuffer(), left: gap + i * (cell + gap), top: gap }))));
  await (await sheet('#ffffff')).png().toFile(path.join(PREVIEW, 'icons-light.png'));
  await (await sheet('#0B0B0C')).png().toFile(path.join(PREVIEW, 'icons-dark.png'));
}
main().catch((e) => { console.error(e); process.exit(1); });
