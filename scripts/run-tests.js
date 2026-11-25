#!/usr/bin/env node
/**
 * MEZON SPRINT OS - TEST RUNNER (Node.js)
 */

const { spawnSync } = require('child_process');
const path = require('path');

const pyRunner = path.join(__dirname, 'run_tests.py');
const res = spawnSync('python3', [pyRunner], { stdio: 'inherit' });
if (res.error) {
  console.error(`✗ Не удалось запустить python3: ${res.error.message}`);
  process.exit(1);
}
// status === null означает, что процесс убит сигналом — это тоже провал
process.exit(res.status ?? 1);
