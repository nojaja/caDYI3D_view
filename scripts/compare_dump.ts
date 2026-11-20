import fs from 'fs';
import { LegacyCadiyParser } from '../src/loader/LegacyCadiyParser';
import { LegacyToV4Converter } from '../src/loader/LegacyToV4Converter';

// ファイル読み込み
const legacyXml = fs.readFileSync('testdata/001_tana.cadiy', 'utf8');
const v4Json = JSON.parse(fs.readFileSync('testdata/001_tana.cadiy4', 'utf8'));

// 旧バージョンパース & 変換
const legacyParser = new LegacyCadiyParser();
const parsedLegacy = legacyParser.parse(legacyXml);
const converter = new LegacyToV4Converter();
const convertedV4 = converter.convert(parsedLegacy);

console.log('=== Parsed Legacy Keys ===');
console.log(Object.keys(parsedLegacy._2xModel));

console.log('\n=== Converted V4 vs Actual V4 ===');
console.log('Converted objects count:', convertedV4.objects.length);
console.log('Actual V4 objects count:', v4Json.objects.length);

console.log('\nConverted object types:');
const convTypes = {};
convertedV4.objects.forEach(o => convTypes[o.type] = (convTypes[o.type] || 0) + 1);
console.log(convTypes);

console.log('\nActual V4 object types:');
const v4Types = {};
v4Json.objects.forEach(o => v4Types[o.type] = (v4Types[o.type] || 0) + 1);
console.log(v4Types);

console.log('\n=== Legacy _2xObject Children in parsedLegacy ===');
console.log(Object.keys(parsedLegacy._2xModel._2xObject));
for (const key of Object.keys(parsedLegacy._2xModel._2xObject)) {
  const val = parsedLegacy._2xModel._2xObject[key];
  console.log(`  ${key}:`, Array.isArray(val) ? `Array(${val.length})` : typeof val);
}

// 実際の各オブジェクトの比較サマリー
console.log('\n=== Actual V4 Objects ===');
v4Json.objects.forEach((obj, idx) => {
  console.log(`[${idx}] type=${obj.type}, name="${obj.name}", id=${obj.id}, displayId=${obj.displayId}`);
});

console.log('\n=== Converted Objects ===');
convertedV4.objects.forEach((obj, idx) => {
  console.log(`[${idx}] type=${obj.type}, name="${obj.name}", id=${obj.id}, displayId=${obj.displayId}`);
});
