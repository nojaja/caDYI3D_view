import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CutListCalculator, CutPlanSheet } from '../../src/core/CutListCalculator';
import { CutListData, CadiyObject } from '../../src/types/cadiy4';
import { Cadiy4Parser } from '../../src/loader/Cadiy4Parser';

describe('CutListCalculator - 材料取り図(木取り図)の計算ロジック', () => {
  const dummyCutList: CutListData = {
    cutWidthMm: 3,
    packingMode: 'adjacent',
    layouts: [
      {
        baseId: 0,
        partsId: 'part-left',
        x: 0,
        z: 0,
      },
      {
        baseId: 0,
        partsId: 'part-right',
        x: 0,
        z: 0.435, // 0.432m + 0.003m (切り代)
      },
      {
        baseId: 1,
        partsId: 'part-shelf',
        x: 0,
        z: 0,
      },
    ],
  };

  const dummyObjects: CadiyObject[] = [
    {
      id: 'part-left',
      name: 'SPF 1x4材',
      partName: '側板 (左)',
      type: 'lumber',
      position: { x: 0, y: 0, z: 0 },
      size: { x: 0.089, y: 0.019, z: 0.432 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      color: { r: 1, g: 1, b: 1 },
      visible: true,
      standardRef: { setId: 1, standardId: 101, name: 'SPF 1x4材 6F (1820mm)' },
    },
    {
      id: 'part-right',
      name: 'SPF 1x4材',
      partName: '側板 (右)',
      type: 'lumber',
      position: { x: 0, y: 0, z: 0 },
      size: { x: 0.089, y: 0.019, z: 0.432 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      color: { r: 1, g: 1, b: 1 },
      visible: true,
      standardRef: { setId: 1, standardId: 101, name: 'SPF 1x4材 6F (1820mm)' },
    },
    {
      id: 'part-shelf',
      name: 'パイン集成材',
      partName: '棚板',
      type: 'board',
      position: { x: 0, y: 0, z: 0 },
      size: { x: 0.35, y: 0.018, z: 0.6 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      color: { r: 1, g: 1, b: 1 },
      visible: true,
    },
  ];

  it('母材(baseId)ごとにグループ化されたシート情報(CutPlanSheet)を生成できること', () => {
    const calculator = new CutListCalculator();
    const sheets: CutPlanSheet[] = calculator.calculate(dummyCutList, dummyObjects);

    // baseId: 0 と baseId: 1 の2枚のシートが生成されること
    expect(sheets).toHaveLength(2);
    expect(sheets[0].baseId).toBe(0);
    expect(sheets[1].baseId).toBe(1);

    // シート0には2パーツ (側板 左、側板 右) が配置されていること
    expect(sheets[0].items).toHaveLength(2);
    expect(sheets[0].items[0].object.partName).toBe('側板 (左)');
    expect(sheets[0].items[1].object.partName).toBe('側板 (右)');

    // シート1には1パーツ (棚板) が配置されていること
    expect(sheets[1].items).toHaveLength(1);
    expect(sheets[1].items[0].object.partName).toBe('棚板');
  });

  it('各部材の切断位置(mm)と鋸刃切り代幅(mm)を正確に反映できること', () => {
    const calculator = new CutListCalculator();
    const sheets = calculator.calculate(dummyCutList, dummyObjects);

    const sheet0 = sheets[0];
    expect(sheet0.cutWidthMm).toBe(3);

    // 1パーツ目: x=0, z=0, 長さ=432mm
    expect(sheet0.items[0].positionMm.z).toBe(0);
    expect(sheet0.items[0].lengthMm).toBeCloseTo(432, 1);

    // 2パーツ目: z=435mm (432mm + 3mmの切り代後), 長さ=432mm
    expect(sheet0.items[1].positionMm.z).toBeCloseTo(435, 1);
    expect(sheet0.items[1].lengthMm).toBeCloseTo(432, 1);
  });

  it('歩留まり（使用長・残余端材長さ）を算出できること', () => {
    const calculator = new CutListCalculator();
    // 母材長 1820mm (SPF 6F) を指定した場合
    const sheets = calculator.calculate(dummyCutList, dummyObjects, {
      defaultLumberLengthMm: 1820,
    });

    const sheet0 = sheets[0];
    // 使用合計長: 432 + 3(切り代) + 432 = 867mm
    expect(sheet0.usedLengthMm).toBeCloseTo(867, 1);

    // 残り端材: 1820 - 867 = 953mm
    expect(sheet0.remainingLengthMm).toBeCloseTo(953, 1);

    // 歩留まり率: 864(正味) / 1820 = 約 47.5%
    expect(sheet0.yieldRatePercent).toBeCloseTo(47.5, 1);
  });

  it('cutListが空または未定義の場合は空のシート配列を返し、エラーにならないこと', () => {
    const calculator = new CutListCalculator();
    const sheetsNull = calculator.calculate(undefined, dummyObjects);
    expect(sheetsNull).toEqual([]);

    const sheetsEmpty = calculator.calculate({ cutWidthMm: 3, packingMode: 'adjacent', layouts: [] }, dummyObjects);
    expect(sheetsEmpty).toEqual([]);
  });

  it('testdata/002.cadiy4 の合板(2D材料)および形状加工(edgeCuts)を材料取り図に正しく反映できること', () => {
    const filePath = path.resolve(__dirname, '../../testdata/002.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    const calculator = new CutListCalculator();
    const sheets = calculator.calculate(data.cutList, data.objects);

    expect(sheets).toHaveLength(1);
    const sheet = sheets[0];
    expect(sheet.baseId).toBe(0);
    expect(sheet.lumberName).toBe('OSB合板');
    expect(sheet.layout).toBe('2d');
    expect(sheet.sheetWidthMm).toBeCloseTo(910, 1);
    expect(sheet.sheetLengthMm).toBeCloseTo(1820, 1);
    expect(sheet.items).toHaveLength(1);

    const item = sheet.items[0];
    expect(item.object.name).toBe('OSB合板');
    // 長さ 1820mm, 幅 910mm
    expect(item.lengthMm).toBeCloseTo(1820, 1);
    expect(item.widthMm).toBeCloseTo(910, 1);
    expect(item.isBoard).toBe(true);

    // 形状加工情報 (edgeCuts) が保持されていること
    expect((item.object as any).edgeCuts).toBeDefined();
    expect((item.object as any).edgeCuts[0].edgeIndex).toBe(7);
    expect((item.object as any).edgeCuts[0].faceADist).toBe(0.7925);
    expect((item.object as any).edgeCuts[0].faceBDist).toBe(0.1985);
  });

  it('testdata/001.cadiy4 の材料取り図で各材料規格ごとに独立した素材シートが生成され、サイズ感が合っていること', () => {
    const filePath = path.resolve(__dirname, '../../testdata/001.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    const calculator = new CutListCalculator();
    const sheets = calculator.calculate(data.cutList, data.objects);

    // 001.cadiy4 には SPF 2x2材, SPF 1x3材, 板材(天板), 円柱, 丸棒 の5種類の素材が存在する
    expect(sheets).toHaveLength(5);

    // 角材シートの検証 (SPF 2x2材)
    const spf2x2Sheet = sheets.find(s => (s.lumberName || '').includes('2x2'));
    expect(spf2x2Sheet).toBeDefined();
    expect(spf2x2Sheet!.layout).toBe('1d');
    expect(spf2x2Sheet!.items).toHaveLength(4); // 脚4本
    expect(spf2x2Sheet!.sheetLengthMm).toBe(1820); // 6F規格
    expect(spf2x2Sheet!.sheetWidthMm).toBe(38); // 断面幅 38mm

    // 角材シートの検証 (SPF 1x3材)
    const spf1x3Sheet = sheets.find(s => (s.lumberName || '').includes('1x3'));
    expect(spf1x3Sheet).toBeDefined();
    expect(spf1x3Sheet!.layout).toBe('1d');
    expect(spf1x3Sheet!.items).toHaveLength(4); // 幕板4本
    expect(spf1x3Sheet!.sheetLengthMm).toBe(1820); // 6F規格
    expect(spf1x3Sheet!.sheetWidthMm).toBe(64); // 断面幅 64mm

    // 板材シートの検証 (天板)
    const boardSheet = sheets.find(s => (s.lumberName || '').includes('板材') || s.items.some(i => i.object.name === '板材'));
    expect(boardSheet).toBeDefined();
    expect(boardSheet!.layout).toBe('2d');
    expect(boardSheet!.items).toHaveLength(1);
    expect(boardSheet!.items[0].lengthMm).toBe(600);
    expect(boardSheet!.items[0].widthMm).toBe(400);
    expect(boardSheet!.sheetLengthMm).toBe(600);
    expect(boardSheet!.sheetWidthMm).toBe(400);
  });

  it('testdata/003.cadiy4 の材料取り図で全部で20個の素材シートが生成され、各原木・原板のサイズが合っていること', () => {
    const filePath = path.resolve(__dirname, '../../testdata/003.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    const calculator = new CutListCalculator();
    const sheets = calculator.calculate(data.cutList, data.objects);

    // 全部で20個の素材が表示されること
    expect(sheets).toHaveLength(20);

    // 内訳検証:
    // SPF 2x2材: 5本 (1820mm, 38mm)
    const spf2x2Sheets = sheets.filter(s => (s.lumberName || '').includes('2x2'));
    expect(spf2x2Sheets).toHaveLength(5);
    for (const s of spf2x2Sheets) {
      expect(s.layout).toBe('1d');
      expect(s.sheetLengthMm).toBe(1820);
      expect(s.sheetWidthMm).toBe(38);
    }

    // SPF 2x4材: 5本 (1820mm, 89mm)
    const spf2x4Sheets = sheets.filter(s => (s.lumberName || '').includes('2x4'));
    expect(spf2x4Sheets).toHaveLength(5);
    for (const s of spf2x4Sheets) {
      expect(s.layout).toBe('1d');
      expect(s.sheetLengthMm).toBe(1820);
      expect(s.sheetWidthMm).toBe(89);
    }

    // パイン集成材 (600x1820): 1枚
    const pineSheets = sheets.filter(s => (s.lumberName || '').includes('パイン集成材'));
    expect(pineSheets).toHaveLength(1);
    expect(pineSheets[0].layout).toBe('2d');
    expect(pineSheets[0].sheetWidthMm).toBe(600);
    expect(pineSheets[0].sheetLengthMm).toBe(1820);

    // 針葉樹構造用合板 (910x1820): 3枚
    const plywoodSheets = sheets.filter(s => (s.lumberName || '').includes('構造用合板') || (s.lumberName || '').includes('針葉樹'));
    expect(plywoodSheets).toHaveLength(3);
    for (const s of plywoodSheets) {
      expect(s.layout).toBe('2d');
      expect(s.sheetWidthMm).toBe(910);
      expect(s.sheetLengthMm).toBe(1820);
    }

    // アジャスター (円柱): 6個
    const adjusterSheets = sheets.filter(s => (s.lumberName || '').includes('円柱') || s.items.some(i => (i.object.partName || '').includes('アジャスター')));
    expect(adjusterSheets).toHaveLength(6);
  });
});
