import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outFile = path.join(rootDir, 'dist', 'server.js');
const dbClient = (process.env.DB_CLIENT || 'postgres').toLowerCase();
const entryFileName = dbClient === 'sqlite' ? 'server.ts' : 'server-postgres.ts';
const entryFile = path.join(rootDir, entryFileName);

await mkdir(path.dirname(outFile), { recursive: true });

await build({
  entryPoints: [entryFile],
  outfile: outFile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: ['node20'],
  packages: 'external',
  sourcemap: true,
  logLevel: 'info'
});

console.log(`Server bundle (${entryFileName}) created at ${outFile}`);
