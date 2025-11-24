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
  { name: 'elysium-items', src: path.join(rootDir, 'src/packs/elysium-items'), dest: path.join(rootDir, 'packs/elysium-items') }
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
    console.log('   Packing items...');

    // Read all JSON files from source
    const files = fs.readdirSync(packInfo.src)
      .filter(f => f.endsWith('.json'));

    console.log(`   Found ${files.length} JSON files`);

    for (const file of files) {
      const filepath = path.join(packInfo.src, file);
      const content = fs.readFileSync(filepath, 'utf-8');
      const data = JSON.parse(content);

      // Use the document's _id as the key
      const key = `!items!${data._id}`;

      await db.put(key, data);

      console.log(`  ✅ ${data.name} ← ${file}`);
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
