import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';

export function findMtlsCertPaths() {
  const path = require('path') as typeof import('path');
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, 'infra/tls/mtls'))) break;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  const base = path.join(dir, 'infra/tls/mtls');
  return {
    cert: process.env.GATEWAY_TLS_CERT || path.join(base, 'server.crt'),
    key: process.env.GATEWAY_TLS_KEY || path.join(base, 'server.key'),
    ca: process.env.GATEWAY_TLS_CA || path.join(base, 'ca.crt'),
  };
}

function mtlsServerOptions() {
  const { cert, key, ca } = findMtlsCertPaths();
  const clientVerify = process.env.GATEWAY_MTLS_CLIENT_VERIFY === 'true';
  const opts: https.ServerOptions = {
    key: fs.readFileSync(key),
    cert: fs.readFileSync(cert),
  };
  if (clientVerify && fs.existsSync(ca)) {
    opts.ca = fs.readFileSync(ca);
    opts.requestCert = true;
    opts.rejectUnauthorized = true;
  }
  return opts;
}

/** W101 — Sidecar HTTPS health listener on :4445 when GATEWAY_MTLS=true */
export function startMtlsHealthSidecar() {
  if (process.env.GATEWAY_MTLS !== 'true') return null;
  const { cert, key } = findMtlsCertPaths();
  if (!fs.existsSync(cert) || !fs.existsSync(key)) {
    console.warn('[Gateway] GATEWAY_MTLS=true but certs missing — skip :4445');
    return null;
  }
  const port = Number(process.env.GATEWAY_MTLS_PORT || 4445);
  const server = https.createServer(mtlsServerOptions(), (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'mtls-ok', gateway: true, port }));
  });
  server.listen(port, '0.0.0.0', () => {
    console.log(`[Gateway] mTLS health sidecar on https://0.0.0.0:${port}/`);
  });
  return server;
}

/** W105/W109 — Full mTLS reverse proxy with optional client-cert verify on :4446 */
export function startMtlsProxySidecar() {
  const enabled =
    process.env.GATEWAY_MTLS_PROXY === 'true' || process.env.GATEWAY_MTLS_FULL === 'true';
  if (!enabled) return null;

  const { cert, key } = findMtlsCertPaths();
  if (!fs.existsSync(cert) || !fs.existsSync(key)) {
    console.warn('[Gateway] GATEWAY_MTLS_PROXY=true but certs missing — skip :4446');
    return null;
  }

  const port = Number(process.env.GATEWAY_MTLS_PROXY_PORT || 4446);
  const upstream = process.env.GATEWAY_MTLS_UPSTREAM || 'http://127.0.0.1:4005';
  const clientVerify = process.env.GATEWAY_MTLS_CLIENT_VERIFY === 'true';

  const server = https.createServer(mtlsServerOptions(), (req, res) => {
    if (clientVerify && !(req.socket as import('tls').TLSSocket).authorized) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ statusCode: 401, message: 'Client certificate required' }));
      return;
    }
    const target = new URL(req.url || '/', upstream);
    const proxyReq = http.request(
      {
        hostname: target.hostname,
        port: target.port || 80,
        path: target.pathname + target.search,
        method: req.method,
        headers: { ...req.headers, host: target.host },
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        proxyRes.pipe(res);
      },
    );
    proxyReq.on('error', () => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ statusCode: 502, message: 'Gateway upstream unavailable' }));
    });
    req.pipe(proxyReq);
  });

  server.listen(port, '0.0.0.0', () => {
    const mode = clientVerify ? 'client-cert verify' : 'server TLS only';
    console.log(`[Gateway] mTLS proxy (${mode}) https://0.0.0.0:${port}/ → ${upstream}`);
  });
  return server;
}
