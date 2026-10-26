#!/usr/bin/env node
/**
 * MEZON SPRINT OS - TEST RUNNER (Node.js)
 */

const { spawnSync } = require('child_process');
const path = require('path');

const pyRunner = path.join(__dirname, 'run_tests.py');
const res = spawnSync('python3', [pyRunner], { stdio: 'inherit' });
process.exit(res.status || 0);
