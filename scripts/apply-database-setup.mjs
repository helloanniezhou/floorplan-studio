#!/usr/bin/env node
/**
 * Applies supabase/setup.sql to the linked remote project via Supabase Management API.
 *
 * Requires: SUPABASE_ACCESS_TOKEN (Personal Access Token from https://supabase.com/dashboard/account/tokens)
 * Optional: SUPABASE_PROJECT_REF (defaults to zqktwmikwmaicooawquc)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const projectRef = process.env.SUPABASE_PROJECT_REF ?? 'zqktwmikwmaicooawquc';
const token = process.env.SUPABASE_ACCESS_TOKEN;

if (!token) {
  console.error(
    'Missing SUPABASE_ACCESS_TOKEN.\n' +
      'Create one at https://supabase.com/dashboard/account/tokens then run:\n' +
      '  SUPABASE_ACCESS_TOKEN=your_token npm run db:setup',
  );
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sql = readFileSync(join(root, 'supabase/setup.sql'), 'utf8');

const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
});

const body = await res.text();
if (!res.ok) {
  console.error(`Setup failed (${res.status}):`, body);
  process.exit(1);
}

console.log('Database setup applied successfully.');
if (body.trim()) console.log(body);
