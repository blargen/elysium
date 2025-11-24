#!/usr/bin/env node
/**
 * Extract compendium items from LevelDB to JSON
 */

import { ClassicLevel } from 'classic-level';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const packs = [
  { name: 'aether-fuel', src: path.join(rootDir, 'packs/aether-fuel'), dest: path.join(rootDir, 'src/packs/aether-fuel') },
  { name: 'elysium-items', src: path.join(rootDir, 'packs/elysium-items'), dest: path.join(rootDir, 'src/packs/elysium-items') }
];

async function extractPack(packInfo) {
  console.log(`\n📦 Extracting ${packInfo.name}...`);
  console.log(`   Source: ${packInfo.src}`);
  console.log(`   Dest: ${packInfo.dest}`);

  // Create destination directory
  if (!fs.existsSync(packInfo.dest)) {
    fs.mkdirSync(packInfo.dest, { recursive: true });
  }

  // Check if source exists
  if (!fs.existsSync(packInfo.src)) {
    console.error(`  ❌ Source directory doesn't exist!`);
    return;
  }

  // Open LevelDB with explicit options
  const db = new ClassicLevel(packInfo.src, {
    valueEncoding: 'json',
    createIfMissing: false,
    errorIfExists: false
  });

  let count = 0;

  try {
    console.log('   Opening database...');

    // Try to get all entries using iterator
    const iterator = db.iterator();

    try {
      for await (const [key, value] of iterator) {
        console.log(`   Processing key: ${key}`);

        if (!value || !value.name) {
          console.log(`   ⚠️  Skipping entry with no name`);
          continue;
        }

        // Create filename from item name
        const filename = value.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '') + '.json';

        const filepath = path.join(packInfo.dest, filename);

        // Write JSON file
        fs.writeFileSync(filepath, JSON.stringify(value, null, 2));

        console.log(`  ✅ ${value.name} → ${filename}`);
        count++;
      }
    } finally {
      await iterator.close();
    }

    console.log(`  ✓ Extracted ${count} items`);

  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    console.error(`  Stack: ${error.stack}`);
  } finally {
    try {
      await db.close();
    } catch (e) {
      // Ignore close errors
    }
  }
}

async function main() {
  console.log('🚀 Elysium Compendium Extractor\n');

  for (const pack of packs) {
    await extractPack(pack);
  }

  console.log('\n✨ All done!');
}

main().catch(console.error);
