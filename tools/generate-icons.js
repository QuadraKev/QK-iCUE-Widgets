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

// Explicit allow-list matching generate-manifests.js — avoids accidentally
// processing QKPumpVisualizer or QKWeather which are out of scope for this batch.
const folders = [
  'QK2048', 'QKCalculator', 'QKDiceRoller', 'QKFidgetSpinner', 'QKMagic8Ball',
  'QKPaint', 'QKSimon', 'QKTallyCounter', 'QKWorldClocks', 'QKXEVisualizer',
  'QKBinaryClock', 'QKDayProgress', 'QKGameOfLife', 'QKMatrixRain', 'QKMoonPhase',
  'QKStarfield',
];

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

    for (const { size, filename } of SIZES) {
      const page = await browser.newPage();
      await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });

      // Embed SVG in an HTML page: icon centered on black background with padding
      const html = `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${size}px;
    height: ${size}px;
    background: #000;
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
  ${svgContent}
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
