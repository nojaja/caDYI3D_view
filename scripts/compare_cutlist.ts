import fs from 'fs';
import { LegacyCadiyParser } from '../src/loader/LegacyCadiyParser';

const legacyXml = fs.readFileSync('testdata/001_tana.cadiy', 'utf8');
const v4Json = JSON.parse(fs.readFileSync('testdata/001_tana.cadiy4', 'utf8'));

const legacyParser = new LegacyCadiyParser();
const parsedLegacy = legacyParser.parse(legacyXml);
const legacyCutList = parsedLegacy._2xModel.CutList;

console.log('=== CutListPartsSeparator ===');
console.log(JSON.stringify(legacyCutList.CutListPartsSeparator, null, 2));

console.log('\n=== CutListPartsBase ===');
console.log(JSON.stringify(legacyCutList.CutListPartsBase, null, 2));

console.log('\n=== V4 cutList ===');
console.log(JSON.stringify(v4Json.cutList, null, 2));
