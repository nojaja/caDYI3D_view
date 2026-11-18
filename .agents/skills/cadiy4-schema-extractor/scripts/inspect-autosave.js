/**
 * inspect-autosave.js
 * caDIY3Dの自動保存領域（autosave）から最新の.cadiy4ファイルを取得し、
 * 構造解析および docs/spec/cadiy4format/cadiy4.schema.json との差分を検出します。
 */

import fs from 'node:fs';
import path from 'node:path';
import { homedir } from 'node:os';

const AUTOSAVE_DIR =
  process.platform === 'win32'
    ? path.join(process.env.APPDATA || path.join(homedir(), 'AppData', 'Roaming'), 'com.jpms.cadiy3d.desktop', 'autosave')
    : path.join(homedir(), '.local', 'share', 'com.jpms.cadiy3d.desktop', 'autosave');

const SCHEMA_PATH = path.resolve('docs/spec/cadiy4format/cadiy4.schema.json');

function getLatestAutosave() {
  if (!fs.existsSync(AUTOSAVE_DIR)) {
    console.error(`Autosave directory not found: ${AUTOSAVE_DIR}`);
    return null;
  }

  const files = fs
    .readdirSync(AUTOSAVE_DIR)
    .filter((f) => f.endsWith('.cadiy4'))
    .map((f) => {
      const fullPath = path.join(AUTOSAVE_DIR, f);
      const stat = fs.statSync(fullPath);
      return { file: f, path: fullPath, mtime: stat.mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  return files.length > 0 ? files[0] : null;
}

function main() {
  const target = process.argv[2] ? { path: path.resolve(process.argv[2]), file: path.basename(process.argv[2]) } : getLatestAutosave();

  if (!target) {
    console.log('No .cadiy4 autosave file found.');
    return;
  }

  console.log(`Analyzing: ${target.path}`);
  const content = fs.readFileSync(target.path, 'utf8');
  let data;
  try {
    data = JSON.parse(content);
  } catch (e) {
    console.error(`Failed to parse JSON: ${e.message}`);
    return;
  }

  console.log('\n--- Top-level Properties ---');
  console.log(Object.keys(data));

  let schema = null;
  if (fs.existsSync(SCHEMA_PATH)) {
    schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  }

  const schemaObjProps = new Set(Object.keys(schema?.definitions?.SceneObject?.properties || {}));

  console.log('\n--- Object Types and Properties ---');
  const typeMap = new Map();
  for (const obj of data.objects || []) {
    if (!typeMap.has(obj.type)) {
      typeMap.set(obj.type, { count: 0, props: new Set(), newProps: new Set() });
    }
    const entry = typeMap.get(obj.type);
    entry.count++;
    for (const key of Object.keys(obj)) {
      entry.props.add(key);
      if (schema && !schemaObjProps.has(key)) {
        entry.newProps.add(key);
      }
    }
  }

  for (const [type, info] of typeMap.entries()) {
    console.log(`\n[Type: ${type}] (Count: ${info.count})`);
    console.log(`  All Properties: ${Array.from(info.props).join(', ')}`);
    if (info.newProps.size > 0) {
      console.log(`  * NEW / UNDEFINED in schema: ${Array.from(info.newProps).join(', ')}`);
    } else {
      console.log(`  * Schema status: All properties matched`);
    }
  }

  console.log('\n--- Layers ---');
  console.log(`Total layers: ${data.layers?.length || 0}`);

  console.log('\n--- CutList ---');
  if (data.cutList) {
    console.log(`cutWidthMm: ${data.cutList.cutWidthMm}, packingMode: ${data.cutList.packingMode}, layouts: ${data.cutList.layouts?.length || 0}`);
  } else {
    console.log('No cutList defined');
  }
}

main();
