import fs from 'fs';
import { LegacyCadiyParser } from '../src/loader/LegacyCadiyParser';

const legacyXml = fs.readFileSync('testdata/001_tana.cadiy', 'utf8');
const v4Json = JSON.parse(fs.readFileSync('testdata/001_tana.cadiy4', 'utf8'));

const legacyParser = new LegacyCadiyParser();
const parsedLegacy = legacyParser.parse(legacyXml);

console.log('##############################################');
console.log('### 1. Root Level Comparison ###');
console.log('Legacy root keys:', Object.keys(parsedLegacy._2xModel));
console.log('V4 root keys:', Object.keys(v4Json));

console.log('\n--- Camera ---');
console.log('Legacy Camera:', parsedLegacy._2xModel.Camera);
console.log('V4 Camera:', v4Json.camera);

console.log('\n--- Layers ---');
console.log('Legacy Layer:', JSON.stringify(parsedLegacy._2xModel._2xLayer, null, 2));
console.log('V4 Layers:', JSON.stringify(v4Json.layers, null, 2));

console.log('\n--- Paint ---');
console.log('Legacy Paint:', JSON.stringify(parsedLegacy._2xModel._2xPaint, null, 2));
console.log('V4 Paint:', JSON.stringify(v4Json.paint, null, 2));

console.log('\n--- CutList ---');
console.log('Legacy CutList keys:', Object.keys(parsedLegacy._2xModel.CutList || {}));
console.log('Legacy CutListPartsSeparator:', JSON.stringify(parsedLegacy._2xModel.CutList?.CutListPartsSeparator, null, 2));
console.log('Legacy CutListPartsBase count:', parsedLegacy._2xModel.CutList?.CutListPartsBase?.length || (parsedLegacy._2xModel.CutList?.CutListPartsBase ? 1 : 0));
console.log('V4 cutList:', JSON.stringify(v4Json.cutList, null, 2));

console.log('\n--- Other Root Properties ---');
console.log('Legacy ObjectTextSize:', parsedLegacy._2xModel.ObjectTextSize);
console.log('Legacy ObjectTextBillboard:', parsedLegacy._2xModel.ObjectTextBillboard);
console.log('Legacy ObjectTextStyle:', parsedLegacy._2xModel.ObjectTextStyle);
console.log('Legacy ObjectTextFont:', parsedLegacy._2xModel.ObjectTextFont);
console.log('Legacy Perspective:', parsedLegacy._2xModel.Perspective);
console.log('Legacy SceneDrawMode:', parsedLegacy._2xModel.SceneDrawMode);

console.log('\n--- PictureImageInfos ---');
console.log('Legacy PictureImageInfos count:', parsedLegacy._2xModel._2xPictureImageInfos ? Object.keys(parsedLegacy._2xModel._2xPictureImageInfos) : 'none');
if (parsedLegacy._2xModel._2xPictureImageInfos?._2xPictureImageInfo) {
  const info = parsedLegacy._2xModel._2xPictureImageInfos._2xPictureImageInfo;
  console.log('ImageInfo ID:', info.ImageBase64ID);
  console.log('ImageInfo Base64 length:', info.ImageBase64 ? info.ImageBase64.length : 0);
  console.log('ImageInfo Base64 preview:', info.ImageBase64 ? info.ImageBase64.slice(0, 50) : '');
}
