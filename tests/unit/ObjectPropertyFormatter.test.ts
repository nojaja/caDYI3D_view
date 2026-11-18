import { describe, it, expect } from 'vitest';
import { formatObjectProperties } from '../../src/utils/propertyFormatter';
import { CadiyObject, LumberObject, BoardObject } from '../../src/types/cadiy4';

describe('formatObjectProperties - オブジェクトプロパティ計算・フォーマット', () => {
  it('角材(LumberObject)の規格、重量、価格、名称、位置(mm)、サイズ(mm)、傾き(度)、形状加工を正しく算出できること', () => {
    const lumber: LumberObject = {
      id: 'lumber-1',
      name: 'SPF 1x4材',
      partName: '側板 (左)',
      type: 'lumber',
      position: { x: 0.156, y: 0.216, z: 0.05 },
      size: { x: 0.089, y: 0.019, z: 0.432 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      visible: true,
      color: { r: 1, g: 0.9, b: 0.75 },
      unitPrice: 400,
      specificGravity: 0.4,
      standardRef: {
        setId: 1,
        standardId: 101,
        name: 'SPF 1x4材 (6F)',
      },
      cutAngles: [45, 0, 0, 0, 0, 0, 0, 0],
    };

    const props = formatObjectProperties(lumber);

    // 名称
    expect(props.name).toBe('側板 (左)');
    // 規格
    expect(props.standardName).toBe('SPF 1x4材 (6F)');
    // 価格
    expect(props.price).toBe(400);

    // 重量: 体積(0.089 * 0.019 * 0.432 = 0.000730512 m3) * 比重(0.4) * 1000 = 約 0.292 kg
    expect(props.weightKg).toBeCloseTo(0.292, 2);

    // 位置 (m -> mm)
    expect(props.positionMm.x).toBeCloseTo(156.0, 1);
    expect(props.positionMm.y).toBeCloseTo(216.0, 1);
    expect(props.positionMm.z).toBeCloseTo(50.0, 1);

    // サイズ (m -> mm)
    expect(props.sizeMm.x).toBeCloseTo(89.0, 1);
    expect(props.sizeMm.y).toBeCloseTo(19.0, 1);
    expect(props.sizeMm.z).toBeCloseTo(432.0, 1);

    // 傾き (Quaternion -> Euler degree)
    expect(props.rotationDeg.x).toBeCloseTo(0, 1);
    expect(props.rotationDeg.y).toBeCloseTo(0, 1);
    expect(props.rotationDeg.z).toBeCloseTo(0, 1);

    // 形状加工
    expect(props.processingInfo).toContain('45°');
  });

  it('回転しているオブジェクトのクォータニオンからオイラー角(度数法)への変換が正確であること', () => {
    // Y軸回りに90度回転のクォータニオン (x: 0, y: sin(45°), z: 0, w: cos(45°))
    const rad45 = Math.sin(Math.PI / 4);
    const obj: CadiyObject = {
      id: 'rotated-1',
      name: '丸棒',
      type: 'cylinder',
      position: { x: 0, y: 0, z: 0 },
      size: { x: 0.02, y: 0.02, z: 0.3 },
      quaternion: { x: 0, y: rad45, z: 0, w: rad45 },
      visible: true,
      color: { r: 0.5, g: 0.5, b: 0.5 },
    };

    const props = formatObjectProperties(obj);
    expect(props.rotationDeg.y).toBeCloseTo(90, 0);
  });

  it('比重や価格、カット角が未定義の場合でもフォールバックして正しく動作すること', () => {
    const board: BoardObject = {
      id: 'board-no-meta',
      name: '合板',
      type: 'board',
      position: { x: 0, y: 0, z: 0 },
      size: { x: 0.3, y: 0.012, z: 0.4 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      visible: true,
      color: { r: 0.8, g: 0.8, b: 0.8 },
    };

    const props = formatObjectProperties(board);
    expect(props.name).toBe('合板');
    expect(props.standardName).toBe('合板');
    expect(props.price).toBeNull();
    // デフォルト比重(例: 0.45)で概算重量が計算されること
    expect(props.weightKg).toBeGreaterThan(0);
    expect(props.processingInfo).toBe('なし');
  });
});
