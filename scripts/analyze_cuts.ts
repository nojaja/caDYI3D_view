import fs from 'fs';
import { LegacyCadiyParser } from '../src/loader/LegacyCadiyParser';

const legacyXml = fs.readFileSync('testdata/001_tana.cadiy', 'utf8');
const v4Json = JSON.parse(fs.readFileSync('testdata/001_tana.cadiy4', 'utf8'));

const legacyParser = new LegacyCadiyParser();
const parsed = legacyParser.parse(legacyXml);

console.log('=== CUT & ROUND VALUES ANALYSIS ===\n');

for (const [tag, items] of Object.entries(parsed._2xModel._2xObject)) {
  const list = Array.isArray(items) ? items : [items];
  for (const item of list) {
    if (item.CutValue !== 'Non' && item.CutValue !== '0,0,0,0,0,0,0,0' || item.RoundValue !== 'Non' && item.RoundValue !== '0,0,0,0') {
      const v4Obj = v4Json.objects.find((v: any) => v.displayId === Number(item.UniqueID) || v.id === `legacy-${item.UniqueID}`);
      console.log(`Object <${tag}> ID:${item.UniqueID} (${item.CommentText})`);
      console.log(`  Size: ${item.Size}`);
      console.log(`  CutValue:   ${item.CutValue}`);
      console.log(`  RoundValue: ${item.RoundValue}`);
      console.log(`  RoundModes: ${item.RoundModes}`);
      if (v4Obj) {
        console.log(`  V4 cutAngles: ${JSON.stringify(v4Obj.cutAngles)}`);
        console.log(`  V4 edgeCuts:  ${JSON.stringify(v4Obj.edgeCuts)}`);
      }
      console.log('--------------------------------------------------');
    }
  }
}
