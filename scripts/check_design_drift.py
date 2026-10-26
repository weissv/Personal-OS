#!/usr/bin/env python3
"""
MEZON SPRINT OS - DESIGN DRIFT & TOKEN RATCHET AUDIT (Python Native)
Scans TSX, CSS, and TS files to ensure zero design drift, token discipline, and accessibility.
"""

import os
import re
import sys

APPROVED_HEX = set([
    # Brand
    '#a04a84', '#873b6d', '#00859e', '#57a7b3', '#009bb8', '#fcd5a6', '#8f93c0', '#6b70a3', '#a2d9f7',
    # Brand Tints & Backgrounds (Mezon Landing Tokens)
    '#e3f1f4', '#fff3e0', '#eceef7',
    # Neutrals & Dark
    '#121212', '#222222', '#0a0a0a', '#181818', '#1c1c1c', '#282828',
    '#f0f0f0', '#f6f6f6', '#f8f8f8', '#f9f9f9', '#fafafa', '#ffffff', '#fff',
    # Text & Lines
    '#5f5f5f', '#8a8a8a', '#c8c8c8', '#dcdcdc', '#e0e0e0', '#e8e8e8', '#e9e9e9', '#d8d8d8', '#d0d0d0', '#eee',
    '#666', '#555', '#555555', '#333', '#333333', '#222', '#888', '#999', '#9a9a9a', '#838383',
    '#aaa', '#bbb', '#ccc', '#ddd',
    # Semantic Alerts (Red / Amber / Green)
    '#c0392b', '#e74c3c', '#ff7675', '#fdeeed', '#f9d5d3', '#fab1a0', '#fff8f7',
    '#27ae60', '#2ecc71', '#e8f8f5', '#b87a1c', '#e0a24a'
])

HEX_REGEX = re.compile(r'#[0-9a-fA-F]{3,8}\b')
IMG_NO_ALT_REGEX = re.compile(r'<img\s+((?!alt=)[^>])*>', re.IGNORECASE)

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCAN_DIRS = [os.path.join(ROOT_DIR, 'src', 'components'), os.path.join(ROOT_DIR, 'src', 'app')]

total_files = 0
violations = []

for s_dir in SCAN_DIRS:
    if not os.path.exists(s_dir):
        continue
    for root, _, files in os.walk(s_dir):
        if '.next' in root or 'node_modules' in root or 'archive' in root:
            continue
        for f in files:
            if not f.endswith(('.tsx', '.ts', '.css')):
                continue
            total_files += 1
            f_path = os.path.join(root, f)
            with open(f_path, 'r', encoding='utf-8', errors='ignore') as fp:
                content = fp.read()
                rel_path = os.path.relpath(f_path, ROOT_DIR)
                
                # Check for off-palette hex codes
                for idx, line in enumerate(content.splitlines(), start=1):
                    matches = HEX_REGEX.findall(line)
                    for m in matches:
                        clean_hex = m.lower()
                        if clean_hex not in APPROVED_HEX:
                            violations.append((rel_path, idx, f'Off-palette hex {m}'))

                # Check for img tags without alt
                if f.endswith('.tsx'):
                    for match in IMG_NO_ALT_REGEX.finditer(content):
                        line_no = content[:match.start()].count('\n') + 1
                        violations.append((rel_path, line_no, 'Image tag missing alt attribute'))

print('========================================================')
print('  MEZON SPRINT OS - DESIGN DRIFT & TOKEN RATCHET AUDIT  ')
print('========================================================')
print(f'Scanned {total_files} active component and stylesheet files.')

if not violations:
    print('✓ ZERO DESIGN DRIFT DETECTED. 100% adherence to Mezon Design System palette and accessibility.')
    sys.exit(0)
else:
    print(f'! Found {len(violations)} design drift occurrences:')
    for v in violations[:10]:
        print(f'  - {v[0]}:{v[1]} -> {v[2]}')
    if len(violations) > 10:
        print(f'  ... and {len(violations) - 10} more.')
    sys.exit(1)
