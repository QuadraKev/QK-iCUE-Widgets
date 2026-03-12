// Usage: node screenshot.js <widget-html-path> [slot-size]
// slot-size: S, M, L, XL (default: M)
const puppeteer = require('puppeteer');
const path = require('path');

const SLOTS = {
    // Horizontal
    S:  { width: 840, height: 344 },
    M:  { width: 840, height: 696 },
    L:  { width: 1688, height: 696 },
    XL: { width: 2536, height: 696 },
    // Vertical
    VS: { width: 696, height: 416 },
    VM: { width: 696, height: 840 },
    VL: { width: 696, height: 1688 },
    VXL: { width: 696, height: 2536 },
    // Pump
    PUMP: { width: 480, height: 480 }
};

async function main() {
    const htmlPath = process.argv[2];
    const slotName = (process.argv[3] || 'M').toUpperCase();

    if (!htmlPath) {
        console.error('Usage: node screenshot.js <path-to-widget.html> [S|M|L|XL|PUMP]');
        process.exit(1);
    }

    const slot = SLOTS[slotName];
    if (!slot) {
        console.error('Unknown slot:', slotName, '-- use S, M, L, XL, VS, VM, VL, VXL, or PUMP');
        process.exit(1);
    }

    const absPath = path.resolve(htmlPath);
    const outName = path.basename(htmlPath, '.html') + '_' + slotName + '.png';
    const outPath = path.join(path.dirname(absPath), outName);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: slot.width, height: slot.height });
    await page.goto('file://' + absPath, { waitUntil: 'networkidle0', timeout: 10000 });

    // Wait a moment for any animations/transitions to settle
    await new Promise(r => setTimeout(r, 500));

    await page.screenshot({ path: outPath, fullPage: false });
    console.log('Saved:', outPath);

    await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
