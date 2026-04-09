#!/usr/bin/env node
// tools/generate-manifests.js
// Generates manifest.json for each QK widget for Marketplace submission.
// Run from repo root: node tools/generate-manifests.js

const fs = require('fs');
const path = require('path');

const AUTHOR = 'QuadraKev';
const MIN_FRAMEWORK_VERSION = '1.0.0';
const VERSION = '1.0.0';
const OS = [{ platform: 'windows' }, { platform: 'mac' }];

const widgets = [
  {
    folder: 'QK2048',
    id: 'com.quadrakev.game2048', // "2048" starts with a digit; reverse-domain notation conventionally disallows digit-starting segments
    name: '2048',
    description: 'Classic 2048 sliding puzzle game for the Xeneon Edge touchscreen.',
    devices: [{ type: 'dashboard_lcd' }],
    interactive: true,
  },
  {
    folder: 'QKCalculator',
    id: 'com.quadrakev.calculator',
    name: 'Calculator',
    description: 'Full-featured touchscreen calculator for the Xeneon Edge.',
    devices: [{ type: 'dashboard_lcd' }],
    interactive: true,
  },
  {
    folder: 'QKDiceRoller',
    id: 'com.quadrakev.diceroller',
    name: 'Dice Roller',
    description: 'Polyhedral dice roller with 3D wireframe backdrop and roll history.',
    devices: [{ type: 'dashboard_lcd' }],
    interactive: true,
  },
  {
    folder: 'QKFidgetSpinner',
    id: 'com.quadrakev.fidgetspinner',
    name: 'Fidget Spinner',
    description: 'Swipe-to-spin fidget spinner with real-time RPM display.',
    devices: [{ type: 'dashboard_lcd' }],
    interactive: true,
  },
  {
    folder: 'QKMagic8Ball',
    id: 'com.quadrakev.magic8ball',
    name: 'Magic 8 Ball',
    description: 'Tap to shake the magic 8 ball and reveal your fortune.',
    devices: [{ type: 'dashboard_lcd' }],
    interactive: true,
  },
  {
    folder: 'QKPaint',
    id: 'com.quadrakev.paint',
    name: 'Paint',
    description: 'Freehand drawing canvas for the Xeneon Edge touchscreen.',
    devices: [{ type: 'dashboard_lcd', features: ['sensor-screen'] }],
    interactive: true,
  },
  {
    folder: 'QKSimon',
    id: 'com.quadrakev.simon',
    name: 'Simon',
    description: 'Simon Says memory game — watch, remember, repeat.',
    devices: [{ type: 'dashboard_lcd' }],
    interactive: true,
  },
  {
    folder: 'QKTallyCounter',
    id: 'com.quadrakev.tallycounter',
    name: 'Tally Counter',
    description: 'Simple tap counter for tracking anything on the fly.',
    devices: [{ type: 'dashboard_lcd' }],
    interactive: true,
  },
  {
    folder: 'QKWorldClocks',
    id: 'com.quadrakev.worldclocks',
    name: 'World Clocks',
    description: 'Live analog and digital clocks across multiple time zones.',
    devices: [{ type: 'dashboard_lcd' }],
    interactive: false,
  },
  {
    folder: 'QKXEVisualizer',
    id: 'com.quadrakev.xevisualizer',
    name: 'XE Visualizer',
    description: 'Audio visualizer with customizable bar display for the Xeneon Edge.',
    devices: [{ type: 'dashboard_lcd' }],
    interactive: false,
  },
  {
    folder: 'QKBinaryClock',
    id: 'com.quadrakev.binaryclock',
    name: 'Binary Clock',
    description: 'Current time displayed in binary — for those who think in bits.',
    devices: [{ type: 'pump_lcd' }, { type: 'dashboard_lcd' }, { type: 'keyboard_lcd' }],
    interactive: false,
  },
  {
    folder: 'QKDayProgress',
    id: 'com.quadrakev.dayprogress',
    name: 'Day Progress',
    description: 'Visual day completion percentage bar — see how much of your day is left.',
    devices: [{ type: 'pump_lcd' }, { type: 'dashboard_lcd' }, { type: 'keyboard_lcd' }],
    interactive: false,
  },
  {
    folder: 'QKGameOfLife',
    id: 'com.quadrakev.gameoflife',
    name: 'Game of Life',
    description: "Conway's Game of Life cellular automaton, continuously evolving.",
    devices: [{ type: 'pump_lcd' }, { type: 'dashboard_lcd' }],
    interactive: false,
  },
  {
    folder: 'QKMatrixRain',
    id: 'com.quadrakev.matrixrain',
    name: 'Matrix Rain',
    description: 'Animated Matrix-style digital rain effect with customizable colors.',
    devices: [{ type: 'pump_lcd' }, { type: 'dashboard_lcd' }],
    interactive: false,
  },
  {
    folder: 'QKMoonPhase',
    id: 'com.quadrakev.moonphase',
    name: 'Moon Phase',
    description: 'Current moon phase with illumination percentage and phase name.',
    devices: [{ type: 'pump_lcd' }, { type: 'dashboard_lcd' }, { type: 'keyboard_lcd' }],
    interactive: false,
  },
  {
    folder: 'QKStarfield',
    id: 'com.quadrakev.starfield',
    name: 'Starfield',
    description: 'Animated starfield fly-through with optional warp speed effect.',
    devices: [{ type: 'pump_lcd' }, { type: 'dashboard_lcd' }],
    interactive: false,
  },
  {
    folder: 'QKWeather',
    id: 'com.quadrakev.weather',
    name: 'Weather',
    description: 'Live weather conditions and forecast with customizable location.',
    devices: [{ type: 'pump_lcd' }, { type: 'dashboard_lcd' }, { type: 'keyboard_lcd' }],
    interactive: false,
  },
];

const widgetsDir = path.join(__dirname, '..', 'widgets');

for (const w of widgets) {
  const manifest = {
    author: AUTHOR,
    id: w.id,
    name: w.name,
    description: w.description,
    version: VERSION,
    preview_icon: 'icon.png',
    min_framework_version: MIN_FRAMEWORK_VERSION,
    os: OS,
    supported_devices: w.devices.map(d => {
      const entry = { type: d.type };
      if (d.features) entry.features = d.features;
      return entry;
    }),
  };
  if (w.interactive) manifest.interactive = true;

  const outPath = path.join(widgetsDir, w.folder, 'manifest.json');
  try {
    fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`Written: ${outPath}`);
  } catch (err) {
    console.error(`ERROR: could not write ${outPath}: ${err.message}`);
    process.exitCode = 1;
  }
}
console.log(`\nDone. ${widgets.length} manifest.json files created.`);

// After the main loop, check for uncovered widget folders
const INTENTIONALLY_OMITTED = new Set(['QKPumpVisualizer']); // pump-only, not going to Marketplace
const actualFolders = fs.readdirSync(widgetsDir).filter(f =>
  fs.statSync(path.join(widgetsDir, f)).isDirectory() && f.startsWith('QK')
);
const coveredFolders = new Set(widgets.map(w => w.folder));
const skipped = actualFolders.filter(f => !coveredFolders.has(f) && !INTENTIONALLY_OMITTED.has(f));
if (skipped.length > 0) {
  console.warn(`\nWARNING: ${skipped.length} widget folder(s) have no manifest entry and were skipped:`);
  skipped.forEach(f => console.warn(`  - ${f}`));
}
