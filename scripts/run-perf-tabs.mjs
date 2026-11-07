import { spawn } from 'node:child_process';
import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const playwrightCli = require.resolve('@playwright/test/cli');

process.env.FC_PERF = '1';

const userArgs = process.argv.slice(2);
const hasSpec = userArgs.some((a) => a.endsWith('.js') || a.endsWith('.spec.js'));
const targetSpecs = hasSpec
  ? userArgs
  : ['e2e/perf-tab-transitions-ab.spec.js', ...userArgs];

const args = [playwrightCli, 'test', ...targetSpecs];

const child = spawn(process.execPath, args, {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
