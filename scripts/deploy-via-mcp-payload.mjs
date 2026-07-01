#!/usr/bin/env node
/** Prints deploy payload for one edge function bundle (stdout JSON). */
import fs from 'fs';
import path from 'path';

const name = process.argv[2];
if (!name) {
  console.error('Usage: node deploy-via-mcp-payload.mjs <function-name>');
  process.exit(1);
}

const bundlePath = path.join(process.cwd(), '.edge-bundles', `${name}.json`);
const b = JSON.parse(fs.readFileSync(bundlePath, 'utf8'));
const payload = {
  name: b.name,
  entrypoint_path: b.entrypoint_path,
  verify_jwt: b.verify_jwt,
  files: b.files,
};
process.stdout.write(JSON.stringify(payload));
