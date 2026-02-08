#!/usr/bin/env node
/**
 * Pack compendium items from JSON to LevelDB
 */

import { ClassicLevel } from 'classic-level';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const packs = [
  { name: 'aether-fuel', src: path.join(rootDir, 'src/packs/aether-fuel'), dest: path.join(rootDir, 'packs/aether-fuel') },
  { name: 'elysium-items', src: path.join(rootDir, 'src/packs/elysium-items'), dest: path.join(rootDir, 'packs/elysium-items') },
  { name: 'ammunition', src: path.join(rootDir, 'src/packs/ammunition'), dest: path.join(rootDir, 'packs/ammunition') }
];

async function packCompendium(packInfo) {
  console.log(`\n📦 Packing ${packInfo.name}...`);
  console.log(`   Source: ${packInfo.src}`);
  console.log(`   Dest: ${packInfo.dest}`);

  // Check if source exists
  if (!fs.existsSync(packInfo.src)) {
    console.error(`  ❌ Source directory doesn't exist!`);
    return;
  }

  // Create destination directory if needed
  if (!fs.existsSync(packInfo.dest)) {
    fs.mkdirSync(packInfo.dest, { recursive: true });
  }

  // Open LevelDB (creates if doesn't exist)
  const db = new ClassicLevel(packInfo.dest, {
    valueEncoding: 'json',
    createIfMissing: true,
    errorIfExists: false
  });

  let count = 0;

  try {
    // Wait for database to be ready
    await db.open();
    console.log('   Packing items...');

    // Read all JSON files from source (handles both flat and nested structure)
    const entries = fs.readdirSync(packInfo.src);
    const items = [];

    for (const entry of entries) {
      const entryPath = path.join(packInfo.src, entry);
      const stat = fs.statSync(entryPath);

      if (stat.isDirectory()) {
        // New nested structure: look for item.json inside directory
        const itemJsonPath = path.join(entryPath, 'item.json');
        if (fs.existsSync(itemJsonPath)) {
          items.push({ file: entry, path: itemJsonPath });
        }
      } else if (entry.endsWith('.json')) {
        // Old flat structure: JSON file directly in source
        items.push({ file: entry, path: entryPath });
      }
    }

    console.log(`   Found ${items.length} items`);

    for (const item of items) {
      const content = fs.readFileSync(item.path, 'utf-8');
      const data = JSON.parse(content);

      // Use the document's _id as the key
      const key = `!items!${data._id}`;

      await db.put(key, data);

      console.log(`  ✅ ${data.name} ← ${item.file}`);
      count++;
    }

    console.log(`  ✓ Packed ${count} items`);

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
  console.log('🚀 Elysium Compendium Packer\n');

  for (const pack of packs) {
    await packCompendium(pack);
  }

  console.log('\n✨ All done!');
}

main().catch(console.error);
