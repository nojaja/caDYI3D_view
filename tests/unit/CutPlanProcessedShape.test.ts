import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CutListCalculator } from '../../src/core/CutListCalculator';
import { Cadiy4Parser } from '../../src/loader/Cadiy4Parser';
import { ViewerUI } from '../../src/ui/ViewerUI';

describe('CutPlanProcessedShape - ルーバー受け 右 のエッジ加工（面取り・斜めカット）材料取り図反映検証', () => {
  const modelPath = path.resolve(__dirname, '../data/cut_plan_processed_shape.cadiy4');

  it('事象再現モデルが正しくロードされ、ブーリアン部材と形状加工前母材が存在すること', () => {
    const raw = fs.readFileSync(modelPath, 'utf-8');
    const project = new Cadiy4Parser().parse(raw);

    expect(project).toBeDefined();
    expect(project.objects).toHaveLength(2);

    const booleanPart = project.objects.find((o) => o.id === 'test-boolean-louver-right');
    const basePart = project.objects.find((o) => o.id === 'test-chamfer-louver-base');

    expect(booleanPart).toBeDefined();
    expect(booleanPart?.type).toBe('boolean');
    // ブーリアン部材自身には edgeCuts が未定義（実モデル再現）
    expect((booleanPart as any)?.edgeCuts).toBeUndefined();

    expect(basePart).toBeDefined();
    expect(basePart?.noAggregated).toBe(true);
    expect(basePart?.edgeCuts).toBeDefined();
    expect(basePart?.edgeCuts).toHaveLength(2);
    expect(basePart?.edgeCuts?.[0]?.mode).toBe('chamfer45');
    expect(basePart?.edgeCuts?.[1]?.mode).toBe('chamfer45');
  });

  it('CutListCalculator がブーリアン部材に対して母材のエッジ加工(edgeCuts)を継承・解決すること', () => {
    const raw = fs.readFileSync(modelPath, 'utf-8');
    const project = new Cadiy4Parser().parse(raw);
    const calculator = new CutListCalculator();

    const sheets = calculator.calculate(project.cutList, project.objects);
    expect(sheets).toBeDefined();
    expect(sheets.length).toBeGreaterThan(0);

    const sheet0 = sheets[0];
    expect(sheet0.items).toHaveLength(1);

    const item0 = sheet0.items[0];
    expect(item0.object.id).toBe('test-boolean-louver-right');
    // 母材から継承された edgeCuts が CutPlanItem に設定されていること
    expect(item0.edgeCuts).toBeDefined();
    expect(item0.edgeCuts).toHaveLength(2);
    expect(item0.edgeCuts?.map((ec) => ec.edgeIndex)).toEqual([4, 5]);
  });

  it('ViewerUI.render1DSheetSvg で両端の面取り加工(edge 4 & 5)がSVG上に多角形・切断線・面取りラベルとして描画されること', () => {
    const raw = fs.readFileSync(modelPath, 'utf-8');
    const project = new Cadiy4Parser().parse(raw);
    const calculator = new CutListCalculator();
    const sheets = calculator.calculate(project.cutList, project.objects);
    const sheet0 = sheets[0];

    const svg = ViewerUI.render1DSheetSvg(sheet0);
    expect(svg).toBeDefined();

    // 1. 部材が多角形ポリゴンとして描画されていること
    expect(svg).toContain('<polygon points="');
    expect(svg).toContain('class="cutplan-svg-part"');

    // 2. 切り落としスクラップ領域が描画されていること
    expect(svg).toContain('fill="#fee2e2"');

    // 3. 切断線 (kerf line) が描画されていること
    expect(svg).toContain('class="cutplan-kerf-line"');

    // 4. 面取りラベル (✂ 面取り: 10 × 10) が両端分描画されていること
    expect(svg).toContain('✂ 面取り: 10 × 10');
    const chamferMatchCount = (svg.match(/✂ 面取り: 10 × 10/g) || []).length;
    expect(chamferMatchCount).toBe(2); // edge 4 と edge 5 の2箇所

    // 5. 部材名と加工ラベルが表示されていること
    expect(svg).toContain('ルーバー受け 右');
    expect(svg).toContain('✂[加工あり]');
  });

  it.runIf(fs.existsSync(path.resolve(__dirname, '../../testdata/風を斜め上に飛ばすエアコン室外機カバー.cadiy4')))(
    '【実モデル検証】風を斜め上に飛ばすエアコン室外機カバー の「ルーバー受け 右」が材料取り図で面取り加工として描画されること',
    () => {
      const prodPath = path.resolve(__dirname, '../../testdata/風を斜め上に飛ばすエアコン室外機カバー.cadiy4');
      const raw = fs.readFileSync(prodPath, 'utf-8');
      const project = new Cadiy4Parser().parse(raw);
      const calculator = new CutListCalculator();

      const sheets = calculator.calculate(project.cutList, project.objects);
      const targetObjId = 'bc012e2a-0564-4b08-9ffb-5de1b693b612';

      let foundSheet = null;
      let foundItem = null;
      for (const s of sheets) {
        const it = s.items.find((i) => i.object.id === targetObjId);
        if (it) {
          foundSheet = s;
          foundItem = it;
          break;
        }
      }

      expect(foundSheet).toBeDefined();
      expect(foundItem).toBeDefined();
      // 母材 (legacy-115) から edgeCuts が継承されていること
      expect(foundItem?.edgeCuts).toBeDefined();
      expect(foundItem?.edgeCuts).toHaveLength(2);
      expect(foundItem?.edgeCuts?.[0]?.mode).toBe('chamfer45');

      // SVG レンダリングで面取り加工が描画されること
      const svg = ViewerUI.render1DSheetSvg(foundSheet!);
      expect(svg).toContain('✂ 面取り: 10 × 10');
      expect(svg).toContain('class="cutplan-kerf-line"');
      expect(svg).toContain('<polygon points="');

      // 780mm ルーバー受けパーツのスロット溝が表側視点に合わせて正しく配置されていることの検証
      const slotObjId = '3072b5e6-1f0f-4ef5-a2c8-e7fcaa7cdf86';
      const slotObj = project.objects.find((o) => o.id === slotObjId);
      expect(slotObj).toBeDefined();
      const lines = ViewerUI.extractProcessedShapeLines(slotObj!, 0, 780, 89);
      expect(lines.length).toBeGreaterThan(0);
      let slashCount = 0;
      let backslashCount = 0;
      for (const l of lines) {
        const dx = l.x2 - l.x1;
        const dy = l.y2 - l.y1;
        if (Math.abs(dx) > 10 && Math.abs(dy) > 10) {
          if ((dx > 0 && dy < 0) || (dx < 0 && dy > 0)) slashCount++;
          else backslashCount++;
        }
      }
      // caDYI3D画面と同じく slash(/) の傾きになっていること
      expect(slashCount).toBeGreaterThan(0);
      expect(backslashCount).toBe(0);
      const minLineX = Math.min(...lines.map((l) => Math.min(l.x1, l.x2)));
      // スロット溝が部材の左端側 (x < 100mm) から始まっていること
      expect(minLineX).toBeLessThan(100);

      // 合板シートがシナベニヤではなく部材命名の「タイスイベニヤ」になっていること
      const boardSheet = sheets.find((s) => s.layout === '2d');
      expect(boardSheet).toBeDefined();
      expect(boardSheet?.lumberName).toBe('タイスイベニヤ');
    }
  );
});
