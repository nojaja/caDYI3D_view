import fs from 'fs';
import { LegacyCadiyParser } from '../src/loader/LegacyCadiyParser';
import { LegacyToV4Converter } from '../src/loader/LegacyToV4Converter';

const legacyPath = 'testdata/トイレ小屋2730×1820.cadiy';
const v4Path = 'testdata/トイレ小屋2730×1820.cadiy4';

console.log('Reading files...');
const legacyXml = fs.readFileSync(legacyPath, 'utf8');
const v4Json = JSON.parse(fs.readFileSync(v4Path, 'utf8'));

console.log('Legacy XML length:', legacyXml.length);
console.log('Actual V4 objects count:', v4Json.objects?.length);

const parser = new LegacyCadiyParser();
console.log('Parsing legacy XML...');
const parsedLegacy = parser.parse(legacyXml);
console.log('Parsed legacy keys:', Object.keys(parsedLegacy._2xModel));
console.log('Parsed legacy _2xObject keys:', Object.keys(parsedLegacy._2xModel._2xObject));

for (const k of Object.keys(parsedLegacy._2xModel._2xObject)) {
  const v = parsedLegacy._2xModel._2xObject[k];
  console.log(`  <${k}>:`, Array.isArray(v) ? `Array(${v.length})` : typeof v);
}

const converter = new LegacyToV4Converter();
console.log('\nConverting legacy to V4...');
const convertedV4 = converter.convert(parsedLegacy);
console.log('Converted V4 objects count:', convertedV4.objects.length);

const actTypes: Record<string, number> = {};
v4Json.objects.forEach((o: any) => { actTypes[o.type] = (actTypes[o.type] || 0) + 1; });
console.log('\nActual V4 types:', actTypes);

const convTypes: Record<string, number> = {};
convertedV4.objects.forEach((o: any) => { convTypes[o.type] = (convTypes[o.type] || 0) + 1; });
console.log('Converted V4 types:', convTypes);

// Camera
console.log('\nActual Camera:', v4Json.camera);
console.log('Converted Camera:', convertedV4.camera);

// Layers
console.log('\nActual Layers count:', v4Json.layers?.length);
console.log('Converted Layers count:', convertedV4.layers?.length);
