#!/usr/bin/env node
// tools/generate-icons.js
// Generates icon.png (256x256) and icon@2x.png (512x512) for each QK widget.
// Run from repo root: node tools/generate-icons.js
// Requires: puppeteer (already installed)

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const WIDGETS_DIR = path.join(__dirname, '..', 'widgets');
const SIZES = [
  { size: 256, filename: 'icon.png' },
  { size: 512, filename: 'icon@2x.png' },
];

// Brand palette for PNG listing icons.
// SVG picker icons stay monochromatic white per Marketplace rules.
const BG_COLOR    = '#4f5458';
const PRIMARY     = '#f84bff'; // magenta
const SECONDARY   = '#009bff'; // blue
const TERTIARY    = '#ffae30'; // amber

// Per-widget color — PRIMARY for all by default.
// Widgets with multi-color treatment are handled in colorize().
const ICON_COLOR = PRIMARY;

const folders = [
  'QK2048', 'QKCalculator', 'QKClock', 'QKDiceRoller', 'QKFidgetSpinner', 'QKMagic8Ball',
  'QKPaint', 'QKSimon', 'QKTallyCounter', 'QKWorldClocks', 'QKXEVisualizer',
  'QKBinaryClock', 'QKDayProgress', 'QKGameOfLife', 'QKMatrixRain', 'QKMoonPhase',
  'QKStarfield',
];

// Colorize SVG for PNG rendering. Most widgets get a flat primary color.
// Special widgets get multi-color treatment.
function colorize(folder, svg) {
  if (folder === 'QKSimon') {
    // Classic Simon Says colors for each quadrant (identified by opacity)
    return svg
      .replace(/fill="#FFFFFF" opacity="0.9"/, 'fill="#2ECC71"')   // top-left: green
      .replace(/fill="#FFFFFF" opacity="0.4"/, 'fill="#E74C3C"')   // top-right: red
      .replace(/fill="#FFFFFF" opacity="0.6"/, 'fill="#3498DB"')   // bottom-right: blue
      .replace(/fill="#FFFFFF" opacity="0.25"/, 'fill="#F1C40F"')  // bottom-left: yellow
      .replace(/stroke="#FFFFFF"/, `stroke="${PRIMARY}"`);          // center ring
  }

  if (folder === 'QKXEVisualizer') {
    // Split the single path into 5 individually colored bars (frequency spectrum)
    return svg.replace(
      /<path d="M1,8 v7 h2 v-7z M4,3 v12 h2 v-12z M7,1 v14 h2 v-14z M10,5 v10 h2 v-10z M13,9 v6 h2 v-6z" fill="#FFFFFF"\/>/,
      `<path d="M1,8 v7 h2 v-7z" fill="#009bff"/>
       <path d="M4,3 v12 h2 v-12z" fill="#a03dff"/>
       <path d="M7,1 v14 h2 v-14z" fill="#f84bff"/>
       <path d="M10,5 v10 h2 v-10z" fill="#fc7c98"/>
       <path d="M13,9 v6 h2 v-6z" fill="#ffae30"/>`
    );
  }

  // Default: flat primary color
  return svg
    .replace(/fill="#FFFFFF"/gi, `fill="${ICON_COLOR}"`)
    .replace(/fill="#FFF"/gi, `fill="${ICON_COLOR}"`)
    .replace(/stroke="#FFFFFF"/gi, `stroke="${ICON_COLOR}"`)
    .replace(/stroke="#FFF"/gi, `stroke="${ICON_COLOR}"`);
}

async function generateIcons() {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });

  for (const folder of folders) {
    const widgetDir = path.join(WIDGETS_DIR, folder);
    const resourcesDir = path.join(widgetDir, 'resources');

    if (!fs.existsSync(resourcesDir)) {
      console.warn(`  No resources/ in ${folder}, skipping`);
      continue;
    }

    const svgFile = fs.readdirSync(resourcesDir).sort().find(f => f.endsWith('.svg')); // expects exactly one SVG per resources/
    if (!svgFile) {
      console.warn(`  No SVG in ${folder}/resources/, skipping`);
      continue;
    }

    const svgPath = path.join(resourcesDir, svgFile);
    let svgContent = fs.readFileSync(svgPath, 'utf8');

    // Ensure SVG scales properly: add viewBox from width/height if missing,
    // then strip width/height so CSS controls dimensions
    const wMatch = svgContent.match(/\bwidth="(\d+(?:\.\d+)?)"/);
    const hMatch = svgContent.match(/\bheight="(\d+(?:\.\d+)?)"/);
    if (!/viewBox/.test(svgContent) && wMatch && hMatch) {
      svgContent = svgContent.replace(/<svg/, `<svg viewBox="0 0 ${wMatch[1]} ${hMatch[1]}"`);
    }
    svgContent = svgContent.replace(/(<svg[^>]*?)\s*width="[^"]*"/, '$1');
    svgContent = svgContent.replace(/(<svg[^>]*?)\s*height="[^"]*"/, '$1');

    let colorizedSvg = colorize(folder, svgContent);

    for (const { size, filename } of SIZES) {
      const page = await browser.newPage();
      await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });

      // Embed colorized SVG on brand background with padding
      const html = `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${size}px;
    height: ${size}px;
    background: ${BG_COLOR};
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  svg {
    width: 70%;
    height: 70%;
  }
</style>
</head>
<body>
  ${colorizedSvg}
</body>
</html>`;

      await page.setContent(html, { waitUntil: 'networkidle0' });

      const outPath = path.join(widgetDir, filename);
      await page.screenshot({ path: outPath, type: 'png' });
      await page.close();

      console.log(`  ${folder}/${filename}`);
    }

    console.log(`✓ ${folder}`);
  }

  await browser.close();
  console.log('\nDone.');
}

generateIcons().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
