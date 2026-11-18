import { CutListData, CadiyObject } from '../types/cadiy4';

export interface CutPlanItem {
  object: CadiyObject;
  positionMm: { x: number; z: number };
  lengthMm: number;
  widthMm: number;
}

export interface CutPlanSheet {
  baseId: number;
  cutWidthMm: number;
  lumberName?: string;
  items: CutPlanItem[];
  usedLengthMm: number;
  remainingLengthMm: number;
  yieldRatePercent: number;
}

export interface CutListCalculatorOptions {
  defaultLumberLengthMm?: number;
}

export class CutListCalculator {
  public calculate(
    cutList?: CutListData,
    objects: CadiyObject[] = [],
    options: CutListCalculatorOptions = {}
  ): CutPlanSheet[] {
    if (!cutList || !Array.isArray(cutList.layouts) || cutList.layouts.length === 0) {
      return [];
    }

    const objectMap = new Map<string, CadiyObject>();
    for (const obj of objects) {
      objectMap.set(obj.id, obj);
    }

    const cutWidthMm = cutList.cutWidthMm || 3;
    const defaultLengthMm = options.defaultLumberLengthMm || 1820;

    // baseId ごとにグループ化
    const sheetMap = new Map<number, CutPlanItem[]>();
    for (const layout of cutList.layouts) {
      const obj = objectMap.get(layout.partsId);
      if (!obj) continue;

      if (!sheetMap.has(layout.baseId)) {
        sheetMap.set(layout.baseId, []);
      }

      // 部材の長さ（z方向または長辺）と幅
      const lengthMm = Math.max(obj.size.x, obj.size.y, obj.size.z) * 1000;
      const widthMm = (obj.size.x === lengthMm / 1000 ? obj.size.y : obj.size.x) * 1000;

      const item: CutPlanItem = {
        object: obj,
        positionMm: {
          x: layout.x * 1000,
          z: layout.z * 1000,
        },
        lengthMm,
        widthMm,
      };

      sheetMap.get(layout.baseId)!.push(item);
    }

    const resultSheets: CutPlanSheet[] = [];

    for (const [baseId, items] of sheetMap.entries()) {
      // z 昇順にソート
      items.sort((a, b) => a.positionMm.z - b.positionMm.z);

      let usedLengthMm = 0;
      let netPartsLengthMm = 0;
      let lumberName = items[0]?.object.name || '角材';

      if (items.length > 0) {
        const lastItem = items[items.length - 1];
        usedLengthMm = lastItem.positionMm.z + lastItem.lengthMm;
        netPartsLengthMm = items.reduce((acc, it) => acc + it.lengthMm, 0);
      }

      const totalLumberLengthMm = Math.max(defaultLengthMm, usedLengthMm);
      const remainingLengthMm = Math.max(0, totalLumberLengthMm - usedLengthMm);
      const yieldRatePercent = totalLumberLengthMm > 0
        ? (netPartsLengthMm / totalLumberLengthMm) * 100
        : 0;

      resultSheets.push({
        baseId,
        cutWidthMm,
        lumberName,
        items,
        usedLengthMm,
        remainingLengthMm,
        yieldRatePercent,
      });
    }

    return resultSheets.sort((a, b) => a.baseId - b.baseId);
  }
}
