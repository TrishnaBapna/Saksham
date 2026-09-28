/**
 * SAKSHAM DATABASE MIGRATION & SEED RUNNER
 * Zero-dependency Node.js CLI script for database migrations
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Load environment variables from .env if present
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        const val = v.join('=').replace(/^["']|["']$/g, '').trim();
        process.env[k.trim()] = val;
      }
    });
  }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

console.log('=======================================================');
console.log('🚀 SAKSHAM DATABASE MIGRATION & SETUP UTILITY');
console.log('=======================================================');

const schemaPath = path.join(__dirname, 'schema.sql');
const seedPath = path.join(__dirname, 'seed.sql');

if (!fs.existsSync(schemaPath) || !fs.existsSync(seedPath)) {
  console.error('❌ Schema or seed SQL files missing in db/ directory.');
  process.exit(1);
}

const schemaSql = fs.readFileSync(schemaPath, 'utf8');
const seedSql = fs.readFileSync(seedPath, 'utf8');

console.log(`📄 Found schema.sql (${(schemaSql.length / 1024).toFixed(1)} KB)`);
console.log(`📄 Found seed.sql (${(seedSql.length / 1024).toFixed(1)} KB)`);

console.log('\n--- SETUP INSTRUCTIONS FOR SUPABASE (RECOMMENDED) ---');
console.log('1. Go to https://supabase.com and create or open your project.');
console.log('2. Navigate to SQL Editor (left sidebar).');
console.log('3. Open db/schema.sql, paste into SQL Editor and click "RUN".');
console.log('4. Open db/seed.sql, paste into SQL Editor and click "RUN".');
console.log('5. Copy your Project URL & Anon Public Key from Project Settings > API.');
console.log('6. Add them to .env or click the "Cloud DB" indicator in the Saksham app header!');

if (DATABASE_URL && DATABASE_URL.startsWith('postgres')) {
  console.log('\n--- DIRECT POSTGRESQL (PSQL) EXECUTION ---');
  console.log(`Run this in your terminal to apply migrations:`);
  console.log(`  psql "${DATABASE_URL}" -f "${schemaPath}"`);
  console.log(`  psql "${DATABASE_URL}" -f "${seedPath}"`);
}

console.log('\n✅ Migration files verified and ready.');
