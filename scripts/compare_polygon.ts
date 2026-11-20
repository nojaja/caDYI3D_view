import fs from 'fs';
import { LegacyCadiyParser } from '../src/loader/LegacyCadiyParser';
import { LegacyToV4Converter } from '../src/loader/LegacyToV4Converter';

const legacyPath = 'testdata/トイレ小屋2730×1820.cadiy';
const v4Path = 'testdata/トイレ小屋2730×1820.cadiy4';

const legacyXml = fs.readFileSync(legacyPath, 'utf8');
const v4Json = JSON.parse(fs.readFileSync(v4Path, 'utf8'));

const parser = new LegacyCadiyParser();
const parsedLegacy = parser.parse(legacyXml);
const converter = new LegacyToV4Converter();
const convertedV4 = converter.convert(parsedLegacy);

console.log('=== POLYGON MESH TABLE COMPARISON ===');
console.log('Actual V4 meshTable type:', Array.isArray(v4Json.polygonMeshTable) ? 'Array' : typeof v4Json.polygonMeshTable);
if (Array.isArray(v4Json.polygonMeshTable)) {
  console.log('Actual V4 meshTable count:', v4Json.polygonMeshTable.length);
  if (v4Json.polygonMeshTable.length > 0) {
    console.log('Actual sample [0]:', Object.keys(v4Json.polygonMeshTable[0]));
    console.log(JSON.stringify(v4Json.polygonMeshTable[0], null, 2).slice(0, 300));
  }
} else if (v4Json.polygonMeshTable) {
  console.log('Actual V4 meshTable keys count:', Object.keys(v4Json.polygonMeshTable).length);
  const k0 = Object.keys(v4Json.polygonMeshTable)[0];
  console.log(`Actual sample key "${k0}":`, Object.keys(v4Json.polygonMeshTable[k0]));
}

console.log('Converted V4 meshTable type:', Array.isArray(convertedV4.polygonMeshTable) ? 'Array' : typeof convertedV4.polygonMeshTable);
if (Array.isArray(convertedV4.polygonMeshTable)) {
  console.log('Converted V4 meshTable count:', convertedV4.polygonMeshTable.length);
  if (convertedV4.polygonMeshTable.length > 0) {
    console.log('Converted sample [0]:', Object.keys(convertedV4.polygonMeshTable[0]));
    console.log(JSON.stringify(convertedV4.polygonMeshTable[0], null, 2).slice(0, 300));
  }
}

// Actual V4 polygon objects vs Converted polygon objects
const actPolys = v4Json.objects.filter((o: any) => o.type === 'polygon');
const convPolys = convertedV4.objects.filter((o: any) => o.type === 'polygon');
console.log(`\nPolygon objects count: actual=${actPolys.length}, converted=${convPolys.length}`);
console.log('Actual poly [0]:', JSON.stringify(actPolys[0], null, 2));
console.log('Converted poly [0]:', JSON.stringify(convPolys[0], null, 2));
