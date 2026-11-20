import fs from 'fs';
import { LegacyCadiyParser } from '../src/loader/LegacyCadiyParser';
import { LegacyToV4Converter } from '../src/loader/LegacyToV4Converter';

const legacyXml = fs.readFileSync('testdata/008.cadiy', 'utf8');
const v4Actual = JSON.parse(fs.readFileSync('testdata/008.cadiy4', 'utf8'));

const parser = new LegacyCadiyParser();
const converter = new LegacyToV4Converter();
const converted = converter.convert(parser.parse(legacyXml));

console.log('=== DIFF CHECK FOR 008 ===');

for (let i = 0; i < v4Actual.objects.length; i++) {
  const act = v4Actual.objects[i];
  const conv = converted.objects.find(o => o.id === act.id);
  console.log(`\nObject #${i} ID: ${act.id} (${act.name})`);
  if (!conv) {
    console.log('  NOT FOUND in converted!');
    continue;
  }
  
  const allKeys = Array.from(new Set([...Object.keys(act), ...Object.keys(conv)]));
  for (const k of allKeys) {
    const valAct = JSON.stringify(act[k]);
    const valConv = JSON.stringify(conv[k]);
    if (valAct !== valConv) {
      console.log(`  Difference in "${k}":`);
      console.log(`    Actual V4:    ${valAct}`);
      console.log(`    Converted V4: ${valConv}`);
    }
  }
}
