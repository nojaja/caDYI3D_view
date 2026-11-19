import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CutListCalculator } from '../../src/core/CutListCalculator';
import { Cadiy4Parser } from '../../src/loader/Cadiy4Parser';
import { ViewerUI } from '../../src/ui/ViewerUI';

describe('ViewerUI - 材料取り図(木取り図) SVG描画ロジック', () => {
  it('testdata/007.cadiy4 の材料 #1（針葉樹合板）で長さが異なる2パーツ(1820mmと1721mm)の木取り線が貫通せず、各パーツの領域に正しく描画されること', () => {
    const filePath = path.resolve(__dirname, '../../testdata/007.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    const calculator = new CutListCalculator();
    const sheets = calculator.calculate(data.cutList, data.objects);
    const sheet1 = sheets.find(s => s.baseId === 0 && (s.lumberName || '').includes('針葉樹'))!;
    expect(sheet1).toBeDefined();

    // 2DシートのSVG生成
    const svg = ViewerUI.render2DSheetSvg(sheet1);
    expect(svg).toBeDefined();

    // 1. 全体を貫通する縦の木取り線 (y1="0" y2="910") が存在しないこと
    // 以前のバグではパーツ2(1721mm)の線がパーツ1(1820mm, y:0〜556)の領域まで突き抜けていた
    expect(svg).not.toContain('y1="0" y2="910"');
    expect(svg).not.toContain('y1="0" y2="910.0"');

    // 2. 原板右端(x=1820)に不要な切断線が引かれないこと (切断不要な原板端であるため)
    expect(svg).not.toMatch(/<line[^>]*x1="1820(?:\.0)?"[^>]*x2="1820(?:\.0)?"/);

    // 3. パーツ2(長さ1721mm, y約559〜848mm)の切断線が、パーツ2の高さ範囲に限定されて描画されていること
    // x ≈ 1720.9 付近の切断線は y1 >= 550, y2 <= 850 付近であること
    const lineMatches = Array.from(svg.matchAll(/<line\s+([^>]+)>/g));
    const cut2Line = lineMatches.find(m => {
      const attrs = m[1];
      return (attrs.includes('x1="1720.9') || attrs.includes('x1="1721')) && attrs.includes('cutplan-kerf-line');
    });
    expect(cut2Line).toBeDefined();

    const cut2Attrs = cut2Line![1];
    const y1Match = cut2Attrs.match(/y1="([\d.]+)"/);
    const y2Match = cut2Attrs.match(/y2="([\d.]+)"/);
    expect(y1Match).toBeDefined();
    expect(y2Match).toBeDefined();

    const y1 = parseFloat(y1Match![1]);
    const y2 = parseFloat(y2Match![1]);

    // y1 はパーツ1(0〜556mm)を侵さず、パーツ2の開始位置(約559mm)以降であること
    expect(y1).toBeGreaterThanOrEqual(550);
    // y2 はパーツ2の終了位置(約848mm)付近であること
    expect(y2).toBeLessThanOrEqual(860);
  });

  it('2D合板シート(材料 #1, #2, #3等)のパーツ要素にHTML用のcutplan-part-blockクラスが付与されず、SVG専用のcutplan-svg-partが付与されること', () => {
    const filePath = path.resolve(__dirname, '../../testdata/007.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    const calculator = new CutListCalculator();
    const sheets = calculator.calculate(data.cutList, data.objects);

    // 材料 #1, #2, #3, #8 (斜めカット含む) を検証
    const testSheets = sheets.filter(s => s.layout === '2d' && [0, 1, 2, 7].includes(s.baseId));
    expect(testSheets.length).toBeGreaterThanOrEqual(3);

    for (const sheet of testSheets) {
      const svg = ViewerUI.render2DSheetSvg(sheet);

      // HTMLブロック用のスタイル(height: 100%等)を持つ cutplan-part-block がSVGタグ内に混入していないこと
      expect(svg).not.toContain('class="cutplan-part-block"');

      // 代わりにSVG専用のパーツクラス cutplan-svg-part が付与されていること
      expect(svg).toContain('class="cutplan-svg-part"');
    }
  });

  it('testdata/007.cadiy4 の材料 #9(斜めカット01)および材料 #10(斜めカット02)で、Edge 4の斜めカット木取り線・端材ポリゴンが正しく描画されること', () => {
    const filePath = path.resolve(__dirname, '../../testdata/007.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    const calculator = new CutListCalculator();
    const sheets = calculator.calculate(data.cutList, data.objects);

    // 材料 #9 (baseId 8: 針葉樹合板, 斜めカット01)
    const sheet9 = sheets.find(s => s.baseId === 8 && (s.lumberName || '').includes('針葉樹'))!;
    expect(sheet9).toBeDefined();
    const svg9 = ViewerUI.render2DSheetSvg(sheet9);

    // 斜めカット01: 斜め木取り線 (実線、赤い指示線)
    expect(svg9).toContain('✂ 斜めカット: 809.0 × 172.0mm');
    // 端材切り落としポリゴン (薄ピンク) と 残存パーツ本体ポリゴン
    expect(svg9).toMatch(/<polygon[^>]*fill="#fee2e2"/);
    expect(svg9).toMatch(/<polygon[^>]*class="cutplan-svg-part"/);

    // 斜めカット01の斜め切断線が、パーツの右端(x ≈ 1456)ではなく左端(px ≈ 780 〜 780+172=952)に引かれていること
    const lineMatches9 = Array.from(svg9.matchAll(/<line\s+([^>]+)>/g));
    const obliqueLine9 = lineMatches9.find(m => {
      const attrs = m[1];
      return attrs.includes('cutplan-kerf-line') && !attrs.includes('stroke-dasharray');
    });
    expect(obliqueLine9).toBeDefined();
    const x1Match9 = parseFloat(obliqueLine9![1].match(/x1="([\d.]+)"/)![1]);
    const x2Match9 = parseFloat(obliqueLine9![1].match(/x2="([\d.]+)"/)![1]);
    // 左端付近(780mm〜955mm)に切断線が存在し、右端(1400mm以上)ではないこと
    expect(Math.min(x1Match9, x2Match9)).toBeCloseTo(780, 0);
    expect(Math.max(x1Match9, x2Match9)).toBeCloseTo(952, 0);

    // 材料 #10 (baseId 9: 針葉樹合板, 斜めカット02)
    const sheet10 = sheets.find(s => s.baseId === 9 && (s.lumberName || '').includes('針葉樹'))!;
    expect(sheet10).toBeDefined();
    const svg10 = ViewerUI.render2DSheetSvg(sheet10);

    // 斜めカット02: 斜め木取り線
    expect(svg10).toContain('✂ 斜めカット: 612.3 × 130.2mm');
    expect(svg10).toMatch(/<polygon[^>]*fill="#fee2e2"/);
    expect(svg10).toMatch(/<polygon[^>]*class="cutplan-svg-part"/);

    // 斜めカット02の斜め切断線が、パーツの右端(x ≈ 504)ではなく左端(px = 0 〜 130.2)に引かれていること
    const lineMatches10 = Array.from(svg10.matchAll(/<line\s+([^>]+)>/g));
    const obliqueLine10 = lineMatches10.find(m => {
      const attrs = m[1];
      return attrs.includes('cutplan-kerf-line') && !attrs.includes('stroke-dasharray');
    });
    expect(obliqueLine10).toBeDefined();
    const x1Match10 = parseFloat(obliqueLine10![1].match(/x1="([\d.]+)"/)![1]);
    const x2Match10 = parseFloat(obliqueLine10![1].match(/x2="([\d.]+)"/)![1]);
    // 左端(0mm〜131mm)に切断線が存在し、右端(500mm付近)ではないこと
    expect(Math.min(x1Match10, x2Match10)).toBeCloseTo(0, 0);
    expect(Math.max(x1Match10, x2Match10)).toBeCloseTo(130.2, 0);
  });
});
