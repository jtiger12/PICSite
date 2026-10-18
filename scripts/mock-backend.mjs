// Harness-only mock backend, mounted in front of the LWR dev server by
// scripts/dev.mjs. Sign-in is checked against the mock account in .env (see
// .env.example) and the session lives in an httpOnly cookie, so the password
// never reaches the browser. In the org, Experience Cloud's own login page and
// session do this; the static build (npm start, Docker) has no backend at all.
//
//   POST /api/login    { username, password } -> 200 { account } | 400 | 401 | 503
//   POST /api/logout                          -> 204
//   GET  /api/session                         -> 200 { account | null }
//
// `account` is the public part only: { username, company, cageCode }. Being
// signed out is not an error, so /api/session answers 200 with null rather
// than a 401 the browser would log on every page.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const COOKIE = 'picsite_session';
const MAX_BODY_BYTES = 4096;

export function mockAccountFromEnv(env) {
    const username = (env.PICSITE_MOCK_USERNAME || '').trim();
    const password = env.PICSITE_MOCK_PASSWORD || '';
    if (!username || !password) return null;
    return {
        username,
        password,
        company: (env.PICSITE_MOCK_COMPANY || '').trim(),
        cageCode: (env.PICSITE_MOCK_CAGE_CODE || '').trim()
    };
}

// Compare digests so the check takes the same time whatever the input length.
const digest = (value) => createHash('sha256').update(String(value)).digest();
const same = (a, b) => timingSafeEqual(digest(a), digest(b));

function send(res, status, body) {
    res.statusCode = status;
    res.setHeader('Cache-Control', 'no-store');
    if (body === undefined) return res.end();
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(body));
}

function readJson(req) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        req.on('data', (chunk) => {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) {
                reject(new Error('Request body too large'));
                req.destroy();
            } else {
                chunks.push(chunk);
            }
        });
        req.on('end', () => {
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
}

function sessionToken(req) {
    const header = req.headers.cookie || '';
    const pair = header.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`));
    return pair ? decodeURIComponent(pair.slice(COOKIE.length + 1)) : '';
}

const cookie = (value, maxAge) => `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict${maxAge === undefined ? '' : `; Max-Age=${maxAge}`}`;

// `server` is the LWR app's internal express server; routes added here run
// before LWR's own middleware, which is attached when the app starts listening.
export function mountMockBackend(server, env) {
    const account = mockAccountFromEnv(env);
    const profile = account && { username: account.username, company: account.company, cageCode: account.cageCode };
    // token -> profile; in memory, so restarting the dev server signs everyone out.
    const sessions = new Map();

    server.post('/api/login', async (req, res) => {
        if (!account) return send(res, 503, { error: 'No mock account is configured. Copy .env.example to .env and restart npm run dev.' });
        let body;
        try {
            body = await readJson(req);
        } catch (e) {
            return send(res, 400, { error: 'Send { "username", "password" } as JSON.' });
        }
        const username = typeof body.username === 'string' ? body.username.trim() : '';
        const password = typeof body.password === 'string' ? body.password : '';
        // Evaluate both so a wrong username and a wrong password take the same path.
        const userOk = same(username.toLowerCase(), account.username.toLowerCase());
        const passwordOk = same(password, account.password);
        if (!(userOk && passwordOk)) return send(res, 401, { error: 'That username and password do not match the mock account.' });
        const token = randomBytes(24).toString('base64url');
        sessions.set(token, profile);
        res.setHeader('Set-Cookie', cookie(token));
        return send(res, 200, { account: profile });
    });

    server.post('/api/logout', (req, res) => {
        sessions.delete(sessionToken(req));
        res.setHeader('Set-Cookie', cookie('', 0));
        return send(res, 204);
    });

    server.get('/api/session', (req, res) => {
        return send(res, 200, { account: sessions.get(sessionToken(req)) || null });
    });

    return { configured: Boolean(account), username: account ? account.username : null };
}
