import fs from 'fs';
import { LegacyCadiyParser } from '../src/loader/LegacyCadiyParser';

const legacyPath = 'testdata/トイレ小屋2730×1820.cadiy';
const v4Path = 'testdata/トイレ小屋2730×1820.cadiy4';

const legacyXml = fs.readFileSync(legacyPath, 'utf8');
const v4Json = JSON.parse(fs.readFileSync(v4Path, 'utf8'));

const parser = new LegacyCadiyParser();
const parsedLegacy = parser.parse(legacyXml);
const legacyLayers = parsedLegacy._2xModel._2xLayer._2xLayerInfoItem;

console.log('Legacy layers count:', legacyLayers.length);
console.log('V4 layers count:', v4Json.layers.length);

console.log('\nFirst 5 Legacy Layers:');
for (let i = 0; i < 5; i++) {
  console.log(`[${i}] LayerID: ${legacyLayers[i].LayerID}, LayerName: "${legacyLayers[i].LayerName}"`);
}

console.log('\nFirst 5 V4 Layers:');
for (let i = 0; i < 5; i++) {
  console.log(`[${i}] id: ${v4Json.layers[i].id}, name: "${v4Json.layers[i].name}", parentId: ${v4Json.layers[i].parentId}`);
}

// 部材 legacy-1024 のレイヤー比較
const diy1024 = parsedLegacy._2xModel._2xObject._2xDiyMaterial.find((d: any) => d.UniqueID === '1024');
const v4_1024 = v4Json.objects.find((o: any) => o.id === 'legacy-1024');

console.log('\n--- Object legacy-1024 ---');
console.log('Legacy Layer string in XML:', diy1024.Layer);
console.log('V4 layerId:', v4_1024.layerId);
console.log('Legacy layer corresponding to LayerID="' + diy1024.Layer + '":', legacyLayers.find((l: any) => l.LayerID === diy1024.Layer)?.LayerName);
console.log('V4 layer corresponding to id=' + v4_1024.layerId + ':', v4Json.layers.find((l: any) => l.id === v4_1024.layerId)?.name);
