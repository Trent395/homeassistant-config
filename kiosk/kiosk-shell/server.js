const fs = require('fs');
const path = require('path');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const shellPort = parseInt(process.env.KIOSK_SHELL_PORT || '8081', 10);
const appBasePort = parseInt(process.env.KIOSK_APP_BASE_PORT || '8082', 10);
const rootDir = __dirname;
const appsPath = path.join(rootDir, 'apps.json');
const publicDir = path.join(rootDir, 'public');

function loadApps() {
    const raw = fs.readFileSync(appsPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.apps) ? parsed.apps : [];
}

function sanitizeApp(appConfig, index) {
    const id = String(appConfig.id || `app-${index + 1}`).trim();
    return {
        id,
        name: String(appConfig.name || id),
        description: String(appConfig.description || ''),
        target: String(appConfig.target || '').trim(),
        port: appBasePort + index,
    };
}

function makeProxyMiddleware(appConfig) {
    const targetUrl = new URL(appConfig.target);
    const localOrigin = `http://127.0.0.1:${appConfig.port}`;
    const rewriteProxyHeaders = (proxyRes) => {
        delete proxyRes.headers['x-frame-options'];
        delete proxyRes.headers['content-security-policy'];
        delete proxyRes.headers['content-security-policy-report-only'];
        proxyRes.headers['cache-control'] = 'no-store';
        if (proxyRes.headers.location) {
            const location = String(proxyRes.headers.location).trim();
            try {
                const parsedLocation = new URL(location, appConfig.target);
                const isTargetHost = parsedLocation.host === targetUrl.host;
                const isJetsonHost = /^jetson-orin-nano(?:[.:]|$)/i.test(parsedLocation.hostname);
                if (isTargetHost || isJetsonHost) {
                    parsedLocation.protocol = 'http:';
                    parsedLocation.host = `127.0.0.1:${appConfig.port}`;
                    proxyRes.headers.location = parsedLocation.toString();
                }
            } catch (_) {
                if (location.startsWith(`${targetUrl.protocol}//${targetUrl.host}`)) {
                    proxyRes.headers.location = location.replace(`${targetUrl.protocol}//${targetUrl.host}`, localOrigin);
                }
            }
        }
    };

    return createProxyMiddleware({
        target: appConfig.target,
        changeOrigin: true,
        ws: true,
        xfwd: false,
        secure: false,
        hostRewrite: `127.0.0.1:${appConfig.port}`,
        autoRewrite: true,
        protocolRewrite: 'http',
        cookieDomainRewrite: '',
        on: {
            proxyRes: (proxyRes) => rewriteProxyHeaders(proxyRes)
        }
    });
}

const apps = loadApps().map(sanitizeApp).filter((app) => app.target);

apps.forEach((appConfig) => {
    const proxyApp = express();
    proxyApp.use('/', makeProxyMiddleware(appConfig));
    proxyApp.listen(appConfig.port, '127.0.0.1', () => {
        console.log(`${appConfig.name} proxy listening on http://127.0.0.1:${appConfig.port}`);
    });
});

const shellApp = express();
shellApp.locals.apps = apps.map((app) => ({
    id: app.id,
    name: app.name,
    description: app.description,
    entryUrl: `http://127.0.0.1:${app.port}/`
}));

shellApp.get('/api/apps', (_req, res) => {
    res.json({ apps: shellApp.locals.apps || [] });
});

shellApp.use(express.static(publicDir, {
    extensions: ['html'],
    cacheControl: false,
    etag: false,
    lastModified: false
}));

shellApp.listen(shellPort, '127.0.0.1', () => {
    console.log(`Kiosk shell listening on http://127.0.0.1:${shellPort}`);
});
