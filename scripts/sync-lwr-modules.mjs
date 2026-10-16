// Regenerates lwr.config.json's module aliases from force-app/main/default/lwc
// so the SFDX components resolve as `c/<name>` inside the local LWR harness.
// SFDX keeps components at lwc/<name>; LWR wants <namespace>/<name>, so each
// component gets an explicit alias instead of a duplicated folder.
//
// Harness-only swaps: any bundle under src/mock/<name>/<name>.js shadows the
// force-app component of the same name. That is how c/portalApi (which
// imports lightning/uiGraphQLApi and lightning/uiRecordApi on the platform)
// and c/fileUploader (lightning-file-upload) run here on mock data.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const lwcDir = join(root, 'force-app', 'main', 'default', 'lwc');
const mockDir = join(root, 'src', 'mock');
const configPath = join(root, 'lwr.config.json');

const mocked = [];
const aliases = readdirSync(lwcDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
        const mock = join(mockDir, d.name, `${d.name}.js`);
        if (existsSync(mock)) {
            mocked.push(d.name);
            return { name: `c/${d.name}`, path: `$rootDir/src/mock/${d.name}/${d.name}.js` };
        }
        const base = join(lwcDir, d.name, d.name);
        const file = ['.js', '.css', '.html'].map((ext) => base + ext).find(existsSync);
        return file ? { name: `c/${d.name}`, path: `$rootDir/force-app/main/default/lwc/${d.name}/${d.name}${file.slice(-4) === '.css' ? '.css' : file.slice(-3)}` } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

const config = JSON.parse(readFileSync(configPath, 'utf8'));
const modules = [{ dir: '$rootDir/src/modules' }, ...aliases];
// Only touch the file when the aliases change: scripts/run.mjs uses its mtime
// to decide whether site/ needs a rebuild.
if (JSON.stringify(config.lwc.modules) !== JSON.stringify(modules)) {
    config.lwc.modules = modules;
    writeFileSync(configPath, JSON.stringify(config, null, 4) + '\n');
}
console.log(`lwr.config.json: ${aliases.length} c/ components aliased${mocked.length ? ` (harness mocks: ${mocked.join(', ')})` : ''}`);
