import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CutListCalculator } from '../../src/core/CutListCalculator';
import { Cadiy4Parser } from '../../src/loader/Cadiy4Parser';
import { ViewerUI } from '../../src/ui/ViewerUI';

describe('ViewerUI - 材料取り図(木取り図) SVG描画ロジック', () => {
  it('007.cadiy4 の材料 #1（針葉樹合板）で長さが異なる2パーツ(1820mmと1721mm)の木取り線が貫通せず、各パーツの領域に正しく描画されること', () => {
    const filePath = path.resolve(__dirname, '../data/007.cadiy4');
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
    const filePath = path.resolve(__dirname, '../data/007.cadiy4');
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

  it('007.cadiy4 の材料 #9(斜めカット01)および材料 #10(斜めカット02)で、Edge 4の斜めカット木取り線・端材ポリゴンが正しく描画されること', () => {
    const filePath = path.resolve(__dirname, '../data/007.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    const calculator = new CutListCalculator();
    const sheets = calculator.calculate(data.cutList, data.objects);

    // 材料 #9 (baseId 8: 針葉樹合板, 斜めカット01)
    const sheet9 = sheets.find(s => s.baseId === 8 && (s.lumberName || '').includes('針葉樹'))!;
    expect(sheet9).toBeDefined();
    const svg9 = ViewerUI.render2DSheetSvg(sheet9);

    // 斜めカット01: 斜め木取り線 (実線、赤い指示線、有効桁数: 小数点第2位)
    expect(svg9).toContain('✂ 斜めカット: 809.00 × 171.96');
    expect(svg9).not.toContain('✂ 斜めカット: 809.00 × 171.96mm');
    // 斜めカットが斜め線と同じ角度で回転(transform="rotate(...)")して描画されていること
    expect(svg9).toContain('class="cutplan-diag-cut-label"');
    expect(svg9).toMatch(/transform="rotate\([\d.-]+,\s*[\d.-]+,\s*[\d.-]+\)"/);
    // 「✂ 木取り線」テキストが存在しないこと
    expect(svg9).not.toContain('✂ 木取り線');
    expect(svg9).not.toContain('cutplan-kerf-label');
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

    // 斜めカット02: 斜め木取り線 (有効桁数: 小数点第2位)
    expect(svg10).toContain('✂ 斜めカット: 612.33 × 130.15');
    expect(svg10).not.toContain('✂ 斜めカット: 612.33 × 130.15mm');
    expect(svg10).toContain('class="cutplan-diag-cut-label"');
    expect(svg10).toMatch(/transform="rotate\([\d.-]+,\s*[\d.-]+,\s*[\d.-]+\)"/);
    expect(svg10).not.toContain('✂ 木取り線');
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

  it('2D合板シートのSVGで角丸(border-radius)が廃止され、rx="0"で直角描画されていること', () => {
    const filePath = path.resolve(__dirname, '../data/007.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    const calculator = new CutListCalculator();
    const sheets = calculator.calculate(data.cutList, data.objects);
    const sheet1 = sheets.find(s => s.layout === '2d')!;

    const svg = ViewerUI.render2DSheetSvg(sheet1);
    expect(svg).toContain('rx="0"');
    expect(svg).not.toContain('rx="4"');
  });

  it('getPartLabelInfo でパーツラベルとサイズの取得処理が共通化され、サイズのみ表記(単位mmなし、「寸法:」プレフィックスなし)となり、有効桁数は小数点第2位までとなること', () => {
    const dummyItem: any = {
      object: { name: 'テスト部材', partName: '側板' },
      widthMm: 120,
      lengthMm: 900,
    };

    // 1D用
    const label1D = ViewerUI.getPartLabelInfo(dummyItem, false);
    expect(label1D.partName).toBe('側板');
    expect(label1D.sizeText).toBe('900.00');
    expect(label1D.sizeText).not.toContain('mm');
    expect(label1D.sizeText).not.toContain('寸法:');

    // 2D用
    const label2D = ViewerUI.getPartLabelInfo(dummyItem, true);
    expect(label2D.partName).toBe('側板');
    expect(label2D.sizeText).toBe('120.00 × 900.00');
    expect(label2D.sizeText).not.toContain('mm');
    expect(label2D.sizeText).not.toContain('寸法:');

    // 小数部を持つ部材 (端数あり) の四捨五入およびフォーマット検証
    const fractionalItem: any = {
      object: { name: '斜め部材', partName: '筋交い' },
      widthMm: 89.126,
      lengthMm: 1720.904,
    };
    const labelFractional1D = ViewerUI.getPartLabelInfo(fractionalItem, false);
    expect(labelFractional1D.sizeText).toBe('1720.90');

    const labelFractional2D = ViewerUI.getPartLabelInfo(fractionalItem, true);
    expect(labelFractional2D.sizeText).toBe('89.13 × 1720.90');
  });

  it('2D合板シートのSVGで cutplan-part-size に「寸法:」および「mm」が含まれず、サイズ数値のみ表記されること', () => {
    const filePath = path.resolve(__dirname, '../data/007.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    const calculator = new CutListCalculator();
    const sheets = calculator.calculate(data.cutList, data.objects);
    const sheet1 = sheets.find(s => s.layout === '2d')!;

    const svg = ViewerUI.render2DSheetSvg(sheet1);
    expect(svg).toContain('class="cutplan-part-size"');
    expect(svg).not.toContain('寸法:');
    // cutplan-part-size 内に mm が含まれないこと
    const partSizeMatches = Array.from(svg.matchAll(/class="cutplan-part-size"[^>]*>([^<]+)<\/text>/g));
    expect(partSizeMatches.length).toBeGreaterThan(0);
    for (const m of partSizeMatches) {
      expect(m[1]).not.toContain('mm');
    }
  });

  it('1D角材シートの木取り図が render1DSheetSvg でSVGとして生成され、SVG内に縦横外寸(cutplan-dim-x, cutplan-dim-y)が単位mmなしで含まれること', () => {
    const dummySheet: any = {
      baseId: 0,
      layout: '1d',
      cutWidthMm: 3,
      sheetLengthMm: 1820,
      sheetWidthMm: 89,
      usedLengthMm: 1500,
      remainingLengthMm: 317,
      yieldRatePercent: 82.4,
      items: [
        {
          object: { name: '支柱', partName: '支柱A' },
          lengthMm: 900,
          widthMm: 89,
          positionMm: { x: 0, z: 0 },
        },
        {
          object: { name: '支柱', partName: '支柱B' },
          lengthMm: 600,
          widthMm: 89,
          positionMm: { x: 0, z: 903 },
        },
      ],
    };

    const svg = (ViewerUI as any).render1DSheetSvg(dummySheet);
    expect(svg).toContain('class="cutplan-svg-canvas"');
    expect(svg).toContain('class="cutplan-dim-x"');
    expect(svg).toContain('class="cutplan-dim-y"');
    expect(svg).toContain('>1820</text>');
    expect(svg).toContain('>89</text>');
    expect(svg).not.toContain('>1820mm</text>');
    expect(svg).not.toContain('>89mm</text>');
    expect(svg).toContain('class="cutplan-part-label"');
    expect(svg).toContain('class="cutplan-part-size"');
  });

  it('2D合板シートのSVG内にも縦横外寸(cutplan-dim-x, cutplan-dim-y)が単位mmなしで描画されること', () => {
    const filePath = path.resolve(__dirname, '../data/007.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    const calculator = new CutListCalculator();
    const sheets = calculator.calculate(data.cutList, data.objects);
    const sheet1 = sheets.find(s => s.layout === '2d')!;

    const svg = ViewerUI.render2DSheetSvg(sheet1);
    expect(svg).toContain('class="cutplan-dim-x"');
    expect(svg).toContain('class="cutplan-dim-y"');
    expect(svg).toContain(`>${sheet1.sheetLengthMm}</text>`);
    expect(svg).toContain(`>${sheet1.sheetWidthMm}</text>`);
    expect(svg).not.toContain(`>${sheet1.sheetLengthMm}mm</text>`);
    expect(svg).not.toContain(`>${sheet1.sheetWidthMm}mm</text>`);
  });

  it('viewBoxの幅に応じたフォントサイズ調整: 長さ1820mmと短い板(350mm)でSVGフォントサイズがスケールに比例して調整されること', () => {
    // 1820mm材（scale ≈ 1.0）
    const sheet1820: any = {
      baseId: 0,
      layout: '1d',
      cutWidthMm: 3,
      sheetLengthMm: 1820,
      sheetWidthMm: 89,
      usedLengthMm: 1500,
      remainingLengthMm: 317,
      yieldRatePercent: 82.4,
      items: [
        {
          object: { name: '支柱', partName: '支柱A' },
          lengthMm: 900,
          widthMm: 89,
          positionMm: { x: 0, z: 0 },
        },
      ],
    };
    const svg1820 = (ViewerUI as any).render1DSheetSvg(sheet1820);
    // 1820mm材では基準フォントサイズ 28
    expect(svg1820).toMatch(/class="cutplan-part-size"[^>]*font-size="28"/);

    // 350mm材（scale ≈ 350 / 1820 ≈ 0.192, 28 * 0.192 ≈ 5）
    const sheet350: any = {
      baseId: 1,
      layout: '2d',
      cutWidthMm: 3,
      sheetLengthMm: 350,
      sheetWidthMm: 120,
      usedLengthMm: 350,
      remainingLengthMm: 0,
      yieldRatePercent: 100,
      items: [
        {
          object: { name: '天板', partName: '天板A' },
          lengthMm: 350,
          widthMm: 120,
          positionMm: { x: 0, z: 0 },
        },
      ],
    };
    const svg350 = ViewerUI.render2DSheetSvg(sheet350);
    // 350mm材ではスケールに比例して小さなフォントサイズ（5〜6）に調整されること（28のままではない）
    const match = svg350.match(/class="cutplan-part-size"[^>]*font-size="(\d+)"/);
    expect(match).not.toBeNull();
    const fontSize = parseInt(match![1], 10);
    expect(fontSize).toBeLessThanOrEqual(8);
    expect(fontSize).toBeGreaterThanOrEqual(4);

    // 外寸のフォントサイズも part-size と同じスケールで調整されること
    const dimMatch = svg350.match(/class="cutplan-dim-x"[^>]*font-size="(\d+)"/);
    expect(dimMatch).not.toBeNull();
    const dimFontSize = parseInt(dimMatch![1], 10);
    expect(dimFontSize).toBe(fontSize);
  });

  it('class="cutplan-part-size" と class="cutplan-dim-y" のフォントサイズが ViewerUI.calculateCutPlanFontSize の共通処理で決定されること', () => {
    // 共通計算メソッドが存在すること
    expect(typeof (ViewerUI as any).calculateCutPlanFontSize).toBe('function');
    expect(typeof (ViewerUI as any).calculateCutPlanScale).toBe('function');

    // さまざまな長さにおけるスケールとフォントサイズの算出検証
    const scale1820 = (ViewerUI as any).calculateCutPlanScale(1820);
    expect(scale1820).toBe(1.0);
    expect((ViewerUI as any).calculateCutPlanFontSize(scale1820)).toBe(28);

    const scale910 = (ViewerUI as any).calculateCutPlanScale(910);
    expect(scale910).toBe(0.5);
    expect((ViewerUI as any).calculateCutPlanFontSize(scale910)).toBe(14);

    const scale350 = (ViewerUI as any).calculateCutPlanScale(350);
    const expectedFs350 = (ViewerUI as any).calculateCutPlanFontSize(scale350);

    // render2DSheetSvg の cutplan-part-size が calculateCutPlanFontSize(scale) の戻り値と一致すること
    const sheet350: any = {
      baseId: 0,
      layout: '2d',
      cutWidthMm: 3,
      sheetLengthMm: 350,
      sheetWidthMm: 120,
      usedLengthMm: 350,
      remainingLengthMm: 0,
      yieldRatePercent: 100,
      items: [
        {
          object: { name: '天板', partName: '天板A' },
          lengthMm: 350,
          widthMm: 120,
          positionMm: { x: 0, z: 0 },
        },
      ],
    };
    const svg2d = ViewerUI.render2DSheetSvg(sheet350);
    expect(svg2d).toContain(`class="cutplan-part-size" font-size="${expectedFs350}"`);

    // render1DSheetSvg の cutplan-part-size も同じ処理で決定され一致すること
    const sheet1d: any = {
      baseId: 0,
      layout: '1d',
      cutWidthMm: 3,
      sheetLengthMm: 350,
      sheetWidthMm: 89,
      usedLengthMm: 350,
      remainingLengthMm: 0,
      yieldRatePercent: 100,
      items: [
        {
          object: { name: '角材', partName: '角材A' },
          lengthMm: 350,
          widthMm: 89,
          positionMm: { x: 0, z: 0 },
        },
      ],
    };
    const svg1d = (ViewerUI as any).render1DSheetSvg(sheet1d);
    expect(svg1d).toContain(`class="cutplan-part-size" font-size="${expectedFs350}"`);
    expect(svg1d).toContain(`class="cutplan-dim-y"`);
    expect(svg1d).toContain(`font-size="${expectedFs350}"`);
  });

  it('木取り図内のすべてのテキスト(端材, 斜めカット, 木取り線等)のフォントサイズが同じロジックで決定され、スマホ時は現在のフォントサイズ-2相当になること', () => {
    // 1. スマホ表示時(isMobile: true)のフォントサイズは PC時(28)から -2相当(11/13倍 ≈ 24)になること
    const scale1820 = (ViewerUI as any).calculateCutPlanScale(1820);
    const fsPc = (ViewerUI as any).calculateCutPlanFontSize(scale1820, false);
    const fsMobile = (ViewerUI as any).calculateCutPlanFontSize(scale1820, true);
    expect(fsPc).toBe(28);
    expect(fsMobile).toBe(24);

    // 2. 007.cadiy4 の斜めカット・端材・木取り線を含むシートで、すべての text 要素の font-size が同一であること
    const filePath = path.resolve(__dirname, '../data/007.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);
    const calculator = new CutListCalculator();
    const sheets = calculator.calculate(data.cutList, data.objects);

    // 斜めカットを含む合板シート (材料 #9)
    const sheet9 = sheets.find(s => s.baseId === 8)!;
    expect(sheet9).toBeDefined();

    const svg = ViewerUI.render2DSheetSvg(sheet9);
    // すべての <text ... font-size="X"> の font-size 値を抽出
    const textMatches = Array.from(svg.matchAll(/<text[^>]*font-size="([^"]+)"/g));
    expect(textMatches.length).toBeGreaterThan(0);

    const fontSizes = textMatches.map(m => m[1]);
    const firstFs = fontSizes[0];
    // 端材・斜めカット・木取り線・部材サイズなどすべてのテキストのフォントサイズが一致していること
    for (const fs of fontSizes) {
      expect(fs).toBe(firstFs);
    }
  });

  it('材料取り図で「端材領域」テキストが表示されず、「端材 (〇〇)」のみが表示されること', () => {
    const filePath = path.resolve(__dirname, '../data/007.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);
    const calculator = new CutListCalculator();
    const sheets = calculator.calculate(data.cutList, data.objects);

    for (const sheet of sheets) {
      const svg = sheet.layout === '2d'
        ? ViewerUI.render2DSheetSvg(sheet)
        : (ViewerUI as any).render1DSheetSvg(sheet);

      // 「端材領域」は一切含まれないこと
      expect(svg).not.toContain('端材領域');

      // 端材がある場合は「端材 (」形式のみであること
      if (svg.includes('端材')) {
        expect(svg).toContain('端材 (');
      }
    }
  });
});
