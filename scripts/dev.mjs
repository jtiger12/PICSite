// Dev entry: regenerate the c/ module aliases, load .env, then run the LWR dev
// server in-process (no shell, no npm bin lookup) so it behaves the same from a
// terminal and from the desktop app's preview runner. Running it in-process
// lets scripts/mock-backend.mjs add the harness's /api routes in front of LWR.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createServer } from 'lwr';
import { mountMockBackend } from './mock-backend.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

await import('./sync-lwr-modules.mjs');

const envFile = join(root, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

// Same as `lwr dev --port <port>`: dev mode, so hot reload stays on. The port
// comes from --port, then PORT, then 3000.
const portFlag = process.argv.indexOf('--port');
const port = Number(portFlag > -1 ? process.argv[portFlag + 1] : process.env.PORT) || 3000;
const app = createServer({ port, serverMode: 'dev', rootDir: root });
const backend = mountMockBackend(app.getInternalServer(), process.env);
console.log(backend.configured ? `mock backend: sign in as "${backend.username}" (from .env)` : 'mock backend: no mock account, copy .env.example to .env to enable sign-in');

try {
    await app.listen();
    console.log(`Application is available at: http://localhost:${port}`);
} catch (error) {
    console.error(error.message || error);
    process.exit(1);
}
