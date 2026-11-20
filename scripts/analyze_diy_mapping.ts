import fs from 'fs';
import { LegacyCadiyParser } from '../src/loader/LegacyCadiyParser';

const legacyPath = 'testdata/トイレ小屋2730×1820.cadiy';
const v4Path = 'testdata/トイレ小屋2730×1820.cadiy4';

const legacyXml = fs.readFileSync(legacyPath, 'utf8');
const v4Json = JSON.parse(fs.readFileSync(v4Path, 'utf8'));

const parser = new LegacyCadiyParser();
const parsedLegacy = parser.parse(legacyXml);
const diyList = parsedLegacy._2xModel._2xObject._2xDiyMaterial;

const mapping: Record<string, any> = {};

diyList.forEach((diy: any) => {
  const v4Obj = v4Json.objects.find((o: any) => o.id === `legacy-${diy.UniqueID}`);
  if (!v4Obj) return;

  const key = diy.DiyMaterialType;
  if (!mapping[key]) {
    mapping[key] = {
      type: v4Obj.type,
      subType: v4Obj.subType,
      shape: v4Obj.shape,
      material: v4Obj.material,
      samples: []
    };
  }
  if (mapping[key].samples.length < 2) {
    mapping[key].samples.push({ name: diy.CommentText, v4Name: v4Obj.name });
  }
});

console.log('=== DIY MATERIAL TYPE TO V4 MAPPING ===');
console.log(JSON.stringify(mapping, null, 2));
