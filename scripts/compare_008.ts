import fs from 'fs';
import { LegacyCadiyParser } from '../src/loader/LegacyCadiyParser';
import { LegacyToV4Converter } from '../src/loader/LegacyToV4Converter';

const legacyXml = fs.readFileSync('testdata/008.cadiy', 'utf8');
const v4Json = JSON.parse(fs.readFileSync('testdata/008.cadiy4', 'utf8'));

const parser = new LegacyCadiyParser();
const converter = new LegacyToV4Converter();
const parsedLegacy = parser.parse(legacyXml);
const convertedV4 = converter.convert(parsedLegacy);

console.log('=== 008.cadiy PARSED ROOT KEYS ===');
console.log(Object.keys(parsedLegacy._2xModel));

console.log('\n=== OBJECTS COMPARISON ===');
console.log('Converted objects count:', convertedV4.objects.length);
console.log('Actual V4 objects count:', v4Json.objects.length);

console.log('\n--- Actual V4 Objects ---');
console.log(JSON.stringify(v4Json.objects, null, 2));

console.log('\n--- Converted V4 Objects ---');
console.log(JSON.stringify(convertedV4.objects, null, 2));

console.log('\n--- Camera Comparison ---');
console.log('Legacy Camera:', parsedLegacy._2xModel.Camera);
console.log('Converted Camera:', convertedV4.camera);
console.log('Actual V4 Camera:', v4Json.camera);

console.log('\n--- Layers Comparison ---');
console.log('Legacy Layers:', parsedLegacy._2xModel._2xLayer);
console.log('Converted Layers:', convertedV4.layers);
console.log('Actual V4 Layers:', v4Json.layers);

console.log('\n--- CutList Comparison ---');
console.log('Legacy CutList:', JSON.stringify(parsedLegacy._2xModel.CutList, null, 2));
console.log('Converted CutList:', JSON.stringify(convertedV4.cutList, null, 2));
console.log('Actual V4 CutList:', JSON.stringify(v4Json.cutList, null, 2));
