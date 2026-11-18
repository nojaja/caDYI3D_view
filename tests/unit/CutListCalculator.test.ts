import { describe, it, expect } from 'vitest';
import { CutListCalculator, CutPlanSheet } from '../../src/core/CutListCalculator';
import { CutListData, CadiyObject } from '../../src/types/cadiy4';

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
});
