import fs from 'fs';
import { LegacyCadiyParser } from '../src/loader/LegacyCadiyParser';

const legacyXml = fs.readFileSync('testdata/001_tana.cadiy', 'utf8');
const v4Json = JSON.parse(fs.readFileSync('testdata/001_tana.cadiy4', 'utf8'));

const legacyParser = new LegacyCadiyParser();
const parsedLegacy = legacyParser.parse(legacyXml);

const legacyObjs = parsedLegacy._2xModel._2xObject;
console.log('Legacy Object Keys:', Object.keys(legacyObjs));

// 全レガシーオブジェクトを平坦化してリスト化
const flatLegacyList: { tag: string; raw: any }[] = [];
for (const [tag, val] of Object.entries(legacyObjs)) {
  if (Array.isArray(val)) {
    val.forEach(item => flatLegacyList.push({ tag, raw: item }));
  } else if (val) {
    flatLegacyList.push({ tag, raw: val });
  }
}

console.log(`Flat Legacy Objects Count: ${flatLegacyList.length}`);
console.log(`V4 Objects Count: ${v4Json.objects.length}`);

// それぞれの対応関係を探る（UniqueIDや名前でマッピング）
flatLegacyList.forEach((leg, idx) => {
  console.log(`\n======================================================`);
  console.log(`[Legacy #${idx}] Tag: <${leg.tag}> UniqueID: ${leg.raw.UniqueID} ModelType: ${leg.raw.ModelType}`);
  console.log('Raw Legacy Object Keys:', Object.keys(leg.raw));
  console.log('Raw Legacy Object Content:');
  console.log(JSON.stringify(leg.raw, null, 2));

  // V4で対応しそうなオブジェクトを検索
  // 1. displayId や UniqueID が一致するか
  // 2. 名前が一致するか
  const v4Match = v4Json.objects.find((v: any) => {
    if (v.displayId === Number(leg.raw.UniqueID)) return true;
    if (v.id === `legacy-${leg.raw.UniqueID}`) return true;
    if (v.name === leg.raw.CommentText) return true;
    if (v.name === leg.raw.Text) return true;
    return false;
  });

  if (v4Match) {
    console.log(`---> Matched V4 Object:`);
    console.log(JSON.stringify(v4Match, null, 2));
  } else {
    console.log(`---> NO DIRECT MATCH FOUND IN V4!`);
  }
});
