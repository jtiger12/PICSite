#!/usr/bin/env node
// Demo-only wording. The Dockerfile runs this over the image's own copy of
// the sources, before `npm run build`, so the public demo (on a non-.mil
// domain) does not present itself as the Army's: every whole-word "Army" in
// templates, page compositions and mock data becomes "GSD", after the demo's
// German Shepherd mascot. The checkout, the local harness and the Experience
// Cloud components keep the real wording. Lower-case "army" inside URLs and
// email addresses (army.mil) is left alone on purpose.
//
// It rewrites files in place, so it takes the directories explicitly and is
// meant for a throwaway copy such as the Docker build stage, never a checkout:
//
//   node scripts/demo-rename.mjs src force-app/main/default/lwc
//
// Renaming the built site/ instead would not work: LWR addresses bundles by a
// hash of their content, and its server refuses a bundle whose bytes no longer
// match its path.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const RENAMES = [[/\bArmy\b/g, 'GSD']];
const TEXT = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg']);

const dirs = process.argv.slice(2);
if (!dirs.length) {
    console.error('usage: node scripts/demo-rename.mjs <dir> [<dir> ...]   (rewrites files in place)');
    process.exit(2);
}
let files = 0;
let hits = 0;

function walk(path) {
    for (const name of readdirSync(path)) {
        const full = join(path, name);
        if (statSync(full).isDirectory()) {
            if (name !== 'node_modules') walk(full);
            continue;
        }
        if (!TEXT.has(extname(name))) continue;
        const before = readFileSync(full, 'utf8');
        let after = before;
        let n = 0;
        for (const [pattern, replacement] of RENAMES) {
            after = after.replace(pattern, () => {
                n += 1;
                return replacement;
            });
        }
        if (n) {
            writeFileSync(full, after);
            files += 1;
            hits += n;
        }
    }
}

for (const dir of dirs) walk(dir);
console.log(`demo-rename: ${hits} replacement(s) in ${files} file(s) under ${dirs.join(', ')}`);
