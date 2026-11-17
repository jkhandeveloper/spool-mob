// Generates app icons, the in-app logo and splash assets from the supplied artwork.
// Needs sharp: `npm install --no-save sharp`. See README "Brand assets".
// usage: node make-icons.cjs <logo.jpg> <splash.jpg> <out-dir> [preview-dir]
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const [, , LOGO_SRC, SPLASH_SRC, OUT, PREVIEW] = process.argv;
const N = 1024;

if (!LOGO_SRC || !SPLASH_SRC || !OUT) {
  console.error('usage: node make-icons.cjs <logo.jpg> <splash.jpg> <out-dir> [preview-dir]');
  process.exit(1);
}

function out(filename) {
  return path.join(OUT, filename);
}

async function inkMark(rgb) {
  const markSize = 780;
  const { data, info } = await sharp(LOGO_SRC)
    .rotate()
    .resize(markSize, markSize, { fit: 'contain', background: '#ffffff' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(info.width * info.height * 4);

  for (let index = 0; index < data.length; index += 1) {
    // Keep the black lettering and spool while dropping the white tile and shadow.
    const alpha = Math.max(0, Math.min(255, (120 - data[index]) * 5));
    rgba[index * 4] = rgb[0];
    rgba[index * 4 + 1] = rgb[1];
    rgba[index * 4 + 2] = rgb[2];
    rgba[index * 4 + 3] = alpha;
  }

  const padding = Math.floor((N - markSize) / 2);
  return sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extend({
      top: padding,
      bottom: N - markSize - padding,
      left: padding,
      right: N - markSize - padding,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const logo = await sharp(LOGO_SRC)
    .rotate()
    .resize(N, N, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer();
  const blackInk = await inkMark([0, 0, 0]);
  const whiteInk = await inkMark([255, 255, 255]);
  const whiteBackground = await sharp({
    create: { width: N, height: N, channels: 4, background: '#ffffff' },
  })
    .png()
    .toBuffer();

  await sharp(logo).toFile(out('icon.png'));
  await sharp(logo).toFile(out('ios-light.png'));
  await sharp(logo).toFile(out('ios-dark.png'));
  await sharp(logo).greyscale().toFile(out('ios-tinted.png'));
  await sharp(blackInk).toFile(out('android-icon-foreground.png'));
  await sharp(whiteInk).toFile(out('android-icon-monochrome.png'));
  await sharp(whiteBackground).toFile(out('android-icon-background.png'));
  await sharp(logo).toFile(out('spool-mark.png'));
  await sharp(logo).resize(96, 96).toFile(out('favicon.png'));

  // Remove the phone-screenshot whitespace while preserving the full logo, tagline and flourish.
  const splash = await sharp(SPLASH_SRC)
    .rotate()
    .trim({ background: '#ffffff', threshold: 12 })
    .extend({ top: 72, bottom: 72, left: 56, right: 56, background: '#ffffff' })
    .png()
    .toBuffer();
  await sharp(splash).toFile(out('splash-icon.png'));
  await sharp(splash).toFile(out('splash-icon-dark.png'));

  if (PREVIEW) {
    fs.mkdirSync(PREVIEW, { recursive: true });
    await sharp(logo).resize(420, 420).toFile(path.join(PREVIEW, 'app-logo.png'));
    await sharp(splash).resize({ width: 540 }).toFile(path.join(PREVIEW, 'splash-logo.png'));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
