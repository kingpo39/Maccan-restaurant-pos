import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const port = Number(process.env.SMOKE_PORT || 4173);
const baseUrl = `http://127.0.0.1:${port}`;
const routes = [
  '/', '/login', '/menu-print', '/ingredients', '/recipes', '/inventory',
  '/tables', '/kds', '/nutrition', '/analytics', '/suppliers', '/unknown-route',
];
const frontendDir = dirname(fileURLToPath(import.meta.url));
const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port)];
const server = process.platform === 'win32'
  ? spawn(`${command} ${args.join(' ')}`, { cwd: frontendDir, shell: true, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
  : spawn(command, args, { cwd: frontendDir, stdio: ['ignore', 'pipe', 'pipe'] });

let output = '';
server.stdout.on('data', (chunk) => { output += chunk.toString(); });
server.stderr.on('data', (chunk) => { output += chunk.toString(); });

try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.ok) { ready = true; break; }
    } catch { /* Server is still starting. */ }
    await delay(250);
  }
  if (!ready) throw new Error(`Preview server did not start.\n${output}`);

  const failures = [];
  for (const route of routes) {
    const response = await fetch(`${baseUrl}${route}`);
    const body = await response.text();
    if (!response.ok || !body.includes('<div id="root"></div>')) failures.push(`${route}: HTTP ${response.status}`);
  }
  if (failures.length) throw new Error(`Route smoke test failed:\n${failures.join('\n')}`);
  console.log(`✓ ${routes.length} frontend routes returned the app shell`);
} finally {
  server.kill();
  if (output && process.env.SMOKE_VERBOSE) console.log(output);
}
