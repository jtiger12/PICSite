// Dev entry: regenerate the c/ module aliases, then start `lwr dev` in-process
// (no shell, no npm bin lookup) so it behaves the same from a terminal and from
// the desktop app's preview runner.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

await import('./sync-lwr-modules.mjs');

// lwr's package "exports" hides package.json, so point at the bin directly.
const lwrBin = join(root, 'node_modules', 'lwr', 'bin', 'lwr.js');

const port = process.env.PORT || '3000';
const child = spawn(process.execPath, [lwrBin, 'dev', '--port', port], { cwd: root, stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
