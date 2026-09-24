import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const services = [
  { name: 'sinora', path: 'mocks/sinora/server.js' },
  { name: 'doocot', path: 'mocks/doocot/server.js' },
  { name: 'letopis', path: 'mocks/letopis/server.js' },
];

const procs = services.map(({ name, path }) => {
  const proc = spawn('node', [join(root, path)], { stdio: 'inherit' });
  console.log(`[start] ${name} started (pid=${proc.pid})`);
  return proc;
});

const shutdown = () => {
  console.log('\n[stop] shutting down mocks...');
  procs.forEach((p) => p.kill());
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);