/**
 * MEZON SPRINT OS - DESIGN DRIFT RATCHET CHECKER (Node.js)
 * Inspired by Edward Tufte and Refactoring UI standards.
 * 
 * Exit code 0: Clean design system, zero drift.
 * Exit code 1: Design drift detected.
 */

const fs = require('fs');
const path = require('path');

const APPROVED_HEX = new Set([
  // Brand
  '#a04a84', '#873b6d', '#00859e', '#57a7b3', '#009bb8', '#fcd5a6', '#8f93c0', '#6b70a3', '#a2d9f7',
  // Brand Tints & Backgrounds (Mezon Landing Tokens)
  '#e3f1f4', '#fff3e0', '#eceef7',
  // Neutrals & Dark
  '#121212', '#222222', '#0a0a0a', '#181818', '#1c1c1c', '#282828',
  '#f0f0f0', '#f6f6f6', '#f8f8f8', '#f9f9f9', '#fafafa', '#ffffff', '#fff',
  // Text & Lines
  '#5f5f5f', '#8a8a8a', '#c8c8c8', '#dcdcdc', '#e0e0e0', '#e8e8e8', '#e9e9e9', '#d8d8d8', '#d0d0d0', '#eee',
  '#666', '#555', '#555555', '#333', '#333333', '#222', '#888', '#999', '#9a9a9a', '#838383',
  '#aaa', '#bbb', '#ccc', '#ddd',
  // Semantic Alerts (Red / Amber / Green)
  '#c0392b', '#e74c3c', '#ff7675', '#fdeeed', '#f9d5d3', '#fab1a0', '#fff8f7',
  '#27ae60', '#2ecc71', '#e8f8f5', '#b87a1c', '#e0a24a'
]);

const DIRECTORIES_TO_SCAN = [
  path.join(__dirname, '..', 'src', 'components'),
  path.join(__dirname, '..', 'src', 'app'),
];

let totalFilesChecked = 0;
let driftViolations = [];

function scanFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.css') && !filePath.endsWith('.ts')) {
    return;
  }

  // Skip auto-generated files and historical archive
  if (filePath.includes('.next') || filePath.includes('node_modules') || filePath.includes('archive')) {
    return;
  }

  totalFilesChecked++;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, lineIndex) => {
    const hexMatches = line.match(/#[0-9a-fA-F]{3,8}\b/g);
    if (hexMatches) {
      hexMatches.forEach((hex) => {
        if (!APPROVED_HEX.has(hex.toLowerCase())) {
          driftViolations.push({
            file: path.relative(process.cwd(), filePath),
            line: lineIndex + 1,
            issue: `Unauthorized off-palette hex color "${hex}". Use Mezon tokens (magenta, teal, peach, dark, lav).`,
          });
        }
      });
    }
  });
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else {
      scanFile(fullPath);
    }
  }
}

console.log('========================================================');
console.log('  MEZON SPRINT OS - DESIGN DRIFT & TOKEN RATCHET AUDIT  ');
console.log('========================================================');

DIRECTORIES_TO_SCAN.forEach(walkDir);

console.log(`Scanned ${totalFilesChecked} active component and stylesheet files.`);

if (driftViolations.length === 0) {
  console.log('✓ ZERO DESIGN DRIFT DETECTED. 100% adherence to Mezon Design System palette.');
  process.exit(0);
} else {
  console.error(`! Found ${driftViolations.length} design drift occurrences:`);
  driftViolations.slice(0, 10).forEach((v) => {
    console.error(`  - ${v.file}:${v.line} -> ${v.issue}`);
  });
  process.exit(1);
}
