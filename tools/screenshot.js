// Usage: node screenshot.js <widget-html-path> [slot-size] [--eval "js code"] [--delay ms]
// slot-size: S, M, L, XL, VS, VM, VL, VXL, PUMP, KB (default: M)
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
    PUMP: { width: 480, height: 480 },
    // Keyboard
    KB: { width: 248, height: 170 },
    // Preview sizes (for testing preview scale detection)
    PS:  { width: 316, height: 130 },
    PM:  { width: 316, height: 262 },
    PL:  { width: 634, height: 262 },
    PXL: { width: 952, height: 262 },
    PVS: { width: 262, height: 157 },
    PVM: { width: 262, height: 316 },
    PVL: { width: 196, height: 475 },
    PVXL: { width: 262, height: 952 },
    PPUMP: { width: 165, height: 165 }
};

function parseArgs(argv) {
    const result = { htmlPath: null, slotName: 'M', evalCode: null, delay: 500 };
    let i = 2;
    while (i < argv.length) {
        if (argv[i] === '--eval' && i + 1 < argv.length) {
            result.evalCode = argv[++i];
        } else if (argv[i] === '--delay' && i + 1 < argv.length) {
            result.delay = parseInt(argv[++i], 10) || 500;
        } else if (!result.htmlPath) {
            result.htmlPath = argv[i];
        } else {
            result.slotName = argv[i].toUpperCase();
        }
        i++;
    }
    return result;
}

async function main() {
    const args = parseArgs(process.argv);

    if (!args.htmlPath) {
        console.error('Usage: node screenshot.js <path-to-widget/index.html> [S|M|L|XL|PUMP] [--eval "js"] [--delay ms]');
        process.exit(1);
    }

    const slot = SLOTS[args.slotName];
    if (!slot) {
        console.error('Unknown slot:', args.slotName, '-- use S, M, L, XL, VS, VM, VL, VXL, or PUMP');
        process.exit(1);
    }

    const absPath = path.resolve(args.htmlPath);
    const widgetName = path.basename(path.dirname(absPath));
    const outName = widgetName + '_' + args.slotName + '.png';
    const outPath = path.join(path.dirname(absPath), outName);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: slot.width, height: slot.height });
    await page.goto('file://' + absPath, { waitUntil: 'networkidle0', timeout: 10000 });

    // Inject JS to modify widget state before screenshot
    if (args.evalCode) {
        await page.evaluate((code) => {
            eval(code);
        }, args.evalCode);
    }

    // Wait for animations/transitions to settle
    await new Promise(r => setTimeout(r, args.delay));

    await page.screenshot({ path: outPath, fullPage: false });
    console.log('Saved:', outPath);

    await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
