/**
 * Checks that all exported functions in service.ts files have JSDoc comments.
 * Run via: npm run docs:check
 */
const { readdirSync, readFileSync } = require('fs');
const { join } = require('path');

const SERVICE_GLOB = 'packages/api/src/modules';
let missingCount = 0;
let checkedCount = 0;

function findServiceFiles(dir) {
  const files = [];
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...findServiceFiles(fullPath));
      } else if (entry.name === 'service.ts') {
        files.push(fullPath);
      }
    }
  } catch {
    // dir may not exist yet
  }
  return files;
}

const serviceFiles = findServiceFiles(SERVICE_GLOB);

if (serviceFiles.length === 0) {
  console.log('No service.ts files found yet — run scaffold-module skill first (Phase 3).');
  process.exit(0);
}

for (const file of serviceFiles) {
  const content = readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^export (async )?function/.test(line)) {
      checkedCount++;
      // Check that the line immediately before is a JSDoc comment close
      const prevLine = (lines[i - 1] ?? '').trim();
      if (prevLine !== '*/') {
        console.error(`MISSING JSDoc: ${file}:${i + 1} — ${line.trim()}`);
        missingCount++;
      }
    }
  }
}

if (missingCount > 0) {
  console.error(`\n✗ ${missingCount} function(s) missing JSDoc. Use the jsdoc-generator hook (Phase 4).`);
  process.exit(1);
} else {
  console.log(`✓ All ${checkedCount} exported functions have JSDoc.`);
}
