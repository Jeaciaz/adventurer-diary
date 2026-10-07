import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';

const output = mkdtempSync(join(tmpdir(), 'swade-tests-'));
try {
  const compile = spawnSync(process.execPath, [
    'node_modules/typescript/bin/tsc',
    '--target', 'ES2022', '--module', 'CommonJS', '--moduleResolution', 'node',
    '--esModuleInterop', '--resolveJsonModule', '--skipLibCheck', '--strict',
    '--noUncheckedIndexedAccess', '--rootDir', 'src', '--outDir', output,
    'src/store/promotions.ts', 'src/store/backfill.ts', 'src/storage/persist.ts',
  ], { stdio: 'inherit' });
  if (compile.status !== 0) process.exitCode = compile.status ?? 1;
  else {
    const tests = readdirSync('tests').filter((name) => name.endsWith('.test.cjs')).map((name) => join('tests', name));
    const run = spawnSync(process.execPath, ['--test', ...tests], {
      stdio: 'inherit',
      env: {
        ...process.env,
        SWADE_TEST_BUILD: output,
        NODE_PATH: [resolve('node_modules'), process.env.NODE_PATH].filter(Boolean).join(delimiter),
      },
    });
    process.exitCode = run.status ?? 1;
  }
} finally {
  rmSync(output, { recursive: true, force: true });
}
