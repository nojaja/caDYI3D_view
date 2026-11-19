/**
 * validate-schema.js
 * .cadiy4 ファイルが docs/spec/cadiy4format/cadiy4.schema.json に適合しているか検証します。
 */

import fs from 'node:fs';
import path from 'node:path';

const SCHEMA_PATH = path.resolve('docs/spec/cadiy4format/cadiy4.schema.json');
const TARGET_FILE = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve('testdata/001.cadiy4');

function main() {
  if (!fs.existsSync(SCHEMA_PATH)) {
    console.error(`Schema not found: ${SCHEMA_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(TARGET_FILE)) {
    console.error(`Target file not found: ${TARGET_FILE}`);
    process.exit(1);
  }

  console.log(`Validating: ${TARGET_FILE}`);
  console.log(`Against schema: ${SCHEMA_PATH}\n`);

  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const file = JSON.parse(fs.readFileSync(TARGET_FILE, 'utf8'));

  let errors = 0;

  // 1. Top-level required
  const missingTop = schema.required.filter((k) => file[k] === undefined);
  if (missingTop.length > 0) {
    console.error(`Missing top-level required properties: ${missingTop.join(', ')}`);
    errors++;
  } else {
    console.log('Top-level required properties: OK');
  }

  // 2. Objects required
  const objRequired = schema.definitions.SceneObject.required;
  const allowedTypes = new Set(schema.definitions.SceneObject.properties.type.enum);

  (file.objects || []).forEach((obj, idx) => {
    const missing = objRequired.filter((k) => obj[k] === undefined);
    if (missing.length > 0) {
      console.error(`Object [${idx}] (${obj.name || obj.id}) missing required fields: ${missing.join(', ')}`);
      errors++;
    }
    if (!allowedTypes.has(obj.type)) {
      console.error(`Object [${idx}] has unknown type: '${obj.type}'`);
      errors++;
    }
  });

  // 3. CutList validation (if present)
  if (file.cutList) {
    const cutListRequired = schema.definitions.CutList?.required || ['cutWidthMm', 'packingMode', 'layouts'];
    const missingCutList = cutListRequired.filter((k) => file.cutList[k] === undefined);
    if (missingCutList.length > 0) {
      console.error(`CutList missing required properties: ${missingCutList.join(', ')}`);
      errors++;
    } else {
      console.log(`CutList structure: OK (cutWidthMm: ${file.cutList.cutWidthMm}, packingMode: ${file.cutList.packingMode})`);
    }

    if (Array.isArray(file.cutList.layouts)) {
      const layoutRequired = schema.definitions.CutLayoutItem?.required || ['baseId', 'partsId', 'x', 'z'];
      const objectIdSet = new Set((file.objects || []).map((o) => o.id));

      file.cutList.layouts.forEach((item, idx) => {
        const missingLayout = layoutRequired.filter((k) => item[k] === undefined);
        if (missingLayout.length > 0) {
          console.error(`CutList layout [${idx}] missing required fields: ${missingLayout.join(', ')}`);
          errors++;
        }
        if (item.partsId && !objectIdSet.has(item.partsId)) {
          console.warn(`CutList layout [${idx}] partsId '${item.partsId}' not found in objects list`);
        }
      });
      console.log(`CutList layouts: OK (${file.cutList.layouts.length} items validated)`);
    }
  }

  // 4. PolygonMeshTable validation (if present)
  if (file.polygonMeshTable) {
    const meshItems = Array.isArray(file.polygonMeshTable) ? file.polygonMeshTable : Object.values(file.polygonMeshTable);
    let meshErrors = 0;
    meshItems.forEach((m, idx) => {
      if (!m.meshId) {
        console.error(`PolygonMeshItem [${idx}] missing 'meshId'`);
        meshErrors++;
      }
      if (!Array.isArray(m.vertices)) {
        console.error(`PolygonMeshItem [${idx}] (${m.meshId}) 'vertices' is not an array`);
        meshErrors++;
      }
      if (!Array.isArray(m.faces)) {
        console.error(`PolygonMeshItem [${idx}] (${m.meshId}) 'faces' is not an array`);
        meshErrors++;
      }
    });
    if (meshErrors > 0) {
      errors += meshErrors;
    } else {
      console.log(`PolygonMeshTable: OK (${meshItems.length} mesh definitions validated)`);
    }
  }

  if (errors === 0) {
    console.log(`\nValidation PASSED! (${file.objects?.length || 0} objects checked, 0 errors)`);
  } else {
    console.error(`\nValidation FAILED with ${errors} error(s).`);
    process.exit(1);
  }
}

main();
