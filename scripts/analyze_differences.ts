import fs from 'fs';
import { LegacyCadiyParser } from '../src/loader/LegacyCadiyParser';

const legacyXml = fs.readFileSync('testdata/001_tana.cadiy', 'utf8');
const v4Json = JSON.parse(fs.readFileSync('testdata/001_tana.cadiy4', 'utf8'));

const legacyParser = new LegacyCadiyParser();
const parsedLegacy = legacyParser.parse(legacyXml);
const legacyModel = parsedLegacy._2xModel;

// 1. 各オブジェクトの突き合わせ
const flatLegacyList: { tag: string; raw: any; index: number }[] = [];
let idx = 0;
for (const [tag, val] of Object.entries(legacyModel._2xObject)) {
  if (Array.isArray(val)) {
    val.forEach(item => flatLegacyList.push({ tag, raw: item, index: idx++ }));
  } else if (val) {
    flatLegacyList.push({ tag, raw: val, index: idx++ });
  }
}

interface MatchResult {
  legacyIndex: number;
  legacyTag: string;
  legacyRaw: any;
  v4Obj: any;
  matchReason: string;
}

const matches: MatchResult[] = [];
const usedV4Ids = new Set<string>();

// マッチングアルゴリズム
// 1) id == 'legacy-' + UniqueID
// 2) 位置の近さ
// 3) 名前/テキスト一致
flatLegacyList.forEach(leg => {
  let matchedV4: any = null;
  let reason = '';

  // 1. id == 'legacy-' + UniqueID
  const byId = v4Json.objects.find((v: any) => v.id === `legacy-${leg.raw.UniqueID}` && !usedV4Ids.has(v.id));
  if (byId) {
    matchedV4 = byId;
    reason = `id == legacy-${leg.raw.UniqueID}`;
  } else {
    // 2. 位置の近さで検索
    const [lx, ly, lz] = leg.raw.Location ? leg.raw.Location.split(',').map(Number) : [NaN, NaN, NaN];
    const byPos = v4Json.objects.find((v: any) => {
      if (usedV4Ids.has(v.id)) return false;
      if (!v.position) return false;
      const dx = Math.abs(v.position.x - lx);
      const dy = Math.abs(v.position.y - ly);
      const dz = Math.abs(v.position.z - lz);
      return dx < 0.001 && dy < 0.001 && dz < 0.001;
    });
    if (byPos) {
      matchedV4 = byPos;
      reason = `Position match (${lx}, ${ly}, ${lz})`;
    } else {
      // 3. 名前 / CommentText / Text match
      const byName = v4Json.objects.find((v: any) => !usedV4Ids.has(v.id) && (
        (leg.raw.CommentText && v.name === leg.raw.CommentText) ||
        (leg.raw.Text && v.name === leg.raw.Text) ||
        (leg.raw.Text && v.text === leg.raw.Text)
      ));
      if (byName) {
        matchedV4 = byName;
        reason = `Name match (${leg.raw.CommentText || leg.raw.Text})`;
      }
    }
  }

  if (matchedV4) {
    usedV4Ids.add(matchedV4.id);
  }

  matches.push({
    legacyIndex: leg.index,
    legacyTag: leg.tag,
    legacyRaw: leg.raw,
    v4Obj: matchedV4,
    matchReason: reason || 'NONE'
  });
});

console.log('=== MATCHING SUMMARY ===');
matches.forEach(m => {
  console.log(`Legacy #${m.legacyIndex} <${m.legacyTag}> ID:${m.legacyRaw.UniqueID} ("${m.legacyRaw.CommentText || m.legacyRaw.Text || ''}")` +
    ` => V4 type:${m.v4Obj?.type} id:${m.v4Obj?.id} displayId:${m.v4Obj?.displayId} ("${m.v4Obj?.name}") [${m.matchReason}]`);
});

// 各ペアの差分詳細を出力
const reportLines: string[] = [];
reportLines.push('# 詳細比較レポート: 001_tana.cadiy vs 001_tana.cadiy4\n');

matches.forEach((m, i) => {
  reportLines.push(`\n## [${i + 1}] Legacy <${m.legacyTag}> (ID: ${m.legacyRaw.UniqueID}) <--> V4 type: "${m.v4Obj?.type}" (ID: ${m.v4Obj?.id})`);
  reportLines.push(`**Match Reason**: ${m.matchReason}`);
  
  if (!m.v4Obj) {
    reportLines.push('**V4 Object NOT FOUND**');
    return;
  }

  reportLines.push('\n### Legacy Raw Properties:');
  reportLines.push('```json');
  reportLines.push(JSON.stringify(m.legacyRaw, null, 2));
  reportLines.push('```');

  reportLines.push('\n### V4 Properties:');
  reportLines.push('```json');
  reportLines.push(JSON.stringify(m.v4Obj, null, 2));
  reportLines.push('```');

  // プロパティごとの比較
  reportLines.push('\n### フィールド対応関係と相違点:');
  const leg = m.legacyRaw;
  const v4 = m.v4Obj;

  // tag vs type
  reportLines.push(`- **Tag / Type**: Legacy \`<${m.legacyTag}>\` (ModelType: \`${leg.ModelType}\`) -> V4 \`type: "${v4.type}"\``);
  // Name
  reportLines.push(`- **Name**: Legacy CommentText=\`"${leg.CommentText}"\`, Text=\`"${leg.Text}"\` -> V4 name=\`"${v4.name}"\``);
  // Position
  reportLines.push(`- **Position**: Legacy Location=\`${leg.Location}\` -> V4 position=\`${JSON.stringify(v4.position)}\``);
  // Size
  reportLines.push(`- **Size**: Legacy Size=\`${leg.Size}\` (StandardSize=\`${leg.StandardSize}\`) -> V4 size=\`${JSON.stringify(v4.size)}\``);
  // Quaternion
  reportLines.push(`- **Quaternion**: Legacy Quaternion=\`${leg.Quaternion}\` -> V4 quaternion=\`${JSON.stringify(v4.quaternion)}\``);
  // Color / Paint
  reportLines.push(`- **Color / Paint**: Legacy Diffuse=\`${leg.Diffuse}\`, PaintID=\`${leg.PaintID}\`, PaintDiffuse=\`${leg.PaintDiffuse}\` -> V4 color=\`${JSON.stringify(v4.color)}\`, paintId=\`${v4.paintId}\``);
  // Texture
  reportLines.push(`- **Texture**: Legacy Texture=\`${leg.Texture}\`, ObjectTextureID=\`${leg.ObjectTextureID}\`, PlywoodTextureID=\`${leg.PlywoodTextureID}\` -> V4 textureId=\`${v4.textureId}\``);
  // Cuts
  reportLines.push(`- **Cuts**: Legacy CutValue=\`${leg.CutValue}\`, RoundValue=\`${leg.RoundValue}\`, RoundModes=\`${leg.RoundModes}\` -> V4 cuts=\`${JSON.stringify(v4.cuts)}\``);
  // Layer
  reportLines.push(`- **Layer**: Legacy Layer=\`${leg.Layer}\` -> V4 layerId=\`${v4.layerId}\``);
  // Unique fields for this type
  const specialFields = Object.keys(leg).filter(k => ![
    'Layer', 'ModelType', 'Diffuse', 'PaintDiffuse', 'Specular', 'PaintSpecular', 'PaintID',
    'Size', 'StandardSize', 'SpecificGravity', 'UnitPrice', 'NumberPerSet', 'SameSetID',
    'IsSubParts', 'HasGuidanceURL', 'Quaternion', 'Location', 'CutValue', 'RoundValue',
    'RoundModes', 'GroupID', 'UniqueID', 'Hide', 'ObjectTextureID', 'PlywoodTextureID',
    'Texture', 'CommentText', 'NoAggregated', 'Dummy', 'Style', 'GroupCriteria'
  ].includes(k));
  if (specialFields.length > 0) {
    reportLines.push(`- **固有フィールド (Legacy)**: ${specialFields.map(f => `\`${f}=${JSON.stringify(leg[f])}\``).join(', ')}`);
  }
  const v4SpecialFields = Object.keys(v4).filter(k => ![
    'id', 'name', 'position', 'quaternion', 'size', 'visible', 'locked', 'groupId', 'layerId',
    'color', 'textureId', 'displayId', 'type', 'paintId', 'cuts'
  ].includes(k));
  if (v4SpecialFields.length > 0) {
    reportLines.push(`- **固有フィールド (V4)**: ${v4SpecialFields.map(f => `\`${f}=${JSON.stringify(v4[f])}\``).join(', ')}`);
  }
});

fs.writeFileSync('scripts/detailed_comparison_report.md', reportLines.join('\n'), 'utf8');
console.log('Report saved to scripts/detailed_comparison_report.md');
