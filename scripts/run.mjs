// Production-style local run: install dependencies and rebuild site/ only when
// something changed since the last run, then serve the built site with
// `lwr start`. `npm run dev` is still the edit loop (watch mode, no build).
//
//   npm start                 build if needed, then serve on PORT (default 3000)
//   npm start -- --rebuild    clean rebuild first, even if nothing changed
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const at = (...parts) => join(root, ...parts);
const rebuild = process.argv.includes('--rebuild');

// Markers live in node_modules/.cache, so `npm ci` (which wipes node_modules)
// also clears the build stamp and forces a rebuild against the new packages.
const cacheDir = at('node_modules', '.cache', 'picsite');
const installMarker = join(cacheDir, 'installed-lock');
const buildStamp = join(cacheDir, 'last-build');
function mark(file, content) {
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(file, `${content}\n`);
}

// Newest mtime anywhere under a path (0 if it does not exist). Directory mtimes
// count too, so deleting or renaming a file also marks the tree as changed.
function newest(path) {
    if (!existsSync(path)) return 0;
    const stat = statSync(path);
    if (!stat.isDirectory()) return stat.mtimeMs;
    return readdirSync(path).reduce((max, name) => Math.max(max, newest(join(path, name))), stat.mtimeMs);
}

function step(label, command, args, options = {}) {
    console.log(`[run] ${label}`);
    const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', ...options });
    if (result.status !== 0) {
        console.error(`[run] ${label} failed${result.error ? `: ${result.error.message}` : ''}`);
        process.exit(result.status ?? 1);
    }
}

// 1. Dependencies: reinstall whenever package-lock.json differs from the one
// last installed here. Compared by content, not mtime: npm itself rewrites
// node_modules/.package-lock.json (e.g. on --package-lock-only) without
// changing what is actually installed.
const lockHash = createHash('sha256').update(readFileSync(at('package-lock.json'))).digest('hex');
if (!existsSync(installMarker) || readFileSync(installMarker, 'utf8').trim() !== lockHash) {
    // npm is npm.cmd on Windows, which Node only spawns through a shell.
    step('Installing dependencies (npm ci)', 'npm', ['ci', '--no-audit', '--no-fund'], { shell: process.platform === 'win32' });
    mark(installMarker, lockHash);
}

// lwr's package "exports" hides package.json, so point at the bin directly.
const lwrBin = at('node_modules', 'lwr', 'bin', 'lwr.js');

// 2. Build when any source is newer than the last successful build. Regenerate
// the c/ aliases first: the script only rewrites lwr.config.json when a
// component was added or removed, which then counts as a change below.
await import('./sync-lwr-modules.mjs');

const inputs = ['src', 'force-app/main/default/lwc', 'lwr.config.json'];
const lastBuild = newest(buildStamp);
const changed = inputs.filter((input) => newest(at(input)) > lastBuild);

if (rebuild || !existsSync(at('site', 'index.html')) || changed.length) {
    const reason = rebuild ? '--rebuild' : lastBuild ? `changed: ${changed.join(', ')}` : 'no previous build';
    // --clean so removed routes and assets don't linger in site/; __lwr_cache__
    // still keeps rebuilds fast.
    step(`Building site/ (${reason})`, process.execPath, [lwrBin, 'build', '--clean', 'true']);
    mark(buildStamp, new Date().toISOString());
} else {
    console.log('[run] site/ is up to date, skipping build');
}

// 3. Serve the built site.
const port = process.env.PORT || '3000';
console.log(`[run] Starting on http://localhost:${port}`);
const child = spawn(process.execPath, [lwrBin, 'start', '--port', port], { cwd: root, stdio: 'inherit' });
child.on('exit', (code) => process.exit(code ?? 0));
