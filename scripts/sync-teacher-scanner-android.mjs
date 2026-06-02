import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const mainConfigPath = resolve(root, 'capacitor.config.ts');
const scannerConfigPath = resolve(root, 'capacitor.teacher-scanner.config.ts');

const originalConfig = readFileSync(mainConfigPath, 'utf8');
const scannerConfig = readFileSync(scannerConfigPath, 'utf8');

try {
  writeFileSync(mainConfigPath, scannerConfig);
  execFileSync('npx', ['cap', 'sync', 'android'], { stdio: 'inherit' });
} finally {
  writeFileSync(mainConfigPath, originalConfig);
}
