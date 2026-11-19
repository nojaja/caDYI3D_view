import { CutListData, CadiyObject, EdgeCut } from '../types/cadiy4';

export interface CutPlanItem {
  object: CadiyObject;
  positionMm: { x: number; z: number };
  lengthMm: number;
  widthMm: number;
  isBoard?: boolean;
  edgeCuts?: EdgeCut[];
}

export interface CutPlanSheet {
  baseId: number;
  cutWidthMm: number;
  lumberName?: string;
  layout: '1d' | '2d';
  sheetWidthMm: number;
  sheetLengthMm: number;
  items: CutPlanItem[];
  usedLengthMm: number;
  remainingLengthMm: number;
  yieldRatePercent: number;
}

export interface CutListCalculatorOptions {
  defaultLumberLengthMm?: number;
  defaultBoardWidthMm?: number;
  defaultBoardLengthMm?: number;
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

    // 材料規格と baseId を組み合わせたキーでグループ化
    // 各材料規格ごとに baseId (0, 1, 2...) の独立した原木/原板シートを管理
    interface GroupEntry {
      materialKey: string;
      baseId: number;
      representativeObj: CadiyObject;
      items: CutPlanItem[];
    }
    const groupMap = new Map<string, GroupEntry>();

    for (const layout of cutList.layouts) {
      const obj = objectMap.get(layout.partsId);
      if (!obj) continue;

      const matKey = this.getMaterialKey(obj);
      const groupKey = `${matKey}___base_${layout.baseId}`;

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          materialKey: matKey,
          baseId: layout.baseId,
          representativeObj: obj,
          items: [],
        });
      }

      // 部材の長さ（長辺）と幅
      let lengthMm: number;
      let widthMm: number;

      if (obj.type === 'board') {
        const dimX = obj.size.x * 1000;
        const dimZ = obj.size.z * 1000;
        const stdDim = this.parseStandardDimensions(obj, defaultLengthMm);
        if (stdDim.widthMm > 0 && stdDim.lengthMm > 0) {
          if (dimX <= stdDim.widthMm && dimZ <= stdDim.lengthMm) {
            // 回転なしで原板幅・長さに収まる場合
            widthMm = dimX;
            lengthMm = dimZ;
          } else if (dimZ <= stdDim.widthMm && dimX <= stdDim.lengthMm) {
            // 90度回転して原板幅・長さに収まる場合
            widthMm = dimZ;
            lengthMm = dimX;
          } else {
            // はみ出る場合は長辺を長さ、短辺を幅
            lengthMm = Math.max(dimX, dimZ);
            widthMm = Math.min(dimX, dimZ);
          }
        } else {
          // 規格指定がない場合は長辺を長さ、短辺を幅
          lengthMm = Math.max(dimX, dimZ);
          widthMm = Math.min(dimX, dimZ);
        }
      } else {
        lengthMm = Math.max(obj.size.x, obj.size.y, obj.size.z) * 1000;
        widthMm = (obj.size.x === lengthMm / 1000 ? obj.size.y : obj.size.x) * 1000;
      }

      const item: CutPlanItem = {
        object: obj,
        positionMm: {
          x: layout.x * 1000,
          z: layout.z * 1000,
        },
        lengthMm,
        widthMm,
        isBoard: obj.type === 'board',
        edgeCuts: (obj as any).edgeCuts,
      };

      groupMap.get(groupKey)!.items.push(item);
    }

    const resultSheets: CutPlanSheet[] = [];

    for (const entry of groupMap.values()) {
      const items = entry.items;
      // z 昇順にソート
      items.sort((a, b) => a.positionMm.z - b.positionMm.z);

      const isBoardSheet = items.some((it) => it.object.type === 'board');
      const layoutType: '1d' | '2d' = isBoardSheet ? '2d' : '1d';

      let usedLengthMm = 0;
      let netPartsLengthMm = 0;
      const refObj = entry.representativeObj;
      let lumberName = refObj.standardRef?.name || refObj.name || (isBoardSheet ? '板材' : '角材');

      if (items.length > 0) {
        const lastItem = items[items.length - 1];
        usedLengthMm = lastItem.positionMm.z + lastItem.lengthMm;
        netPartsLengthMm = items.reduce((acc, it) => acc + it.lengthMm, 0);
      }

      // 規格から原板・原木寸法を取得
      const stdDim = this.parseStandardDimensions(refObj, defaultLengthMm);

      const maxPartWidth = Math.max(...items.map((it) => it.widthMm));
      const sheetWidthMm = isBoardSheet
        ? Math.max(stdDim.widthMm, maxPartWidth)
        : stdDim.widthMm;
      const sheetLengthMm = Math.max(stdDim.lengthMm, usedLengthMm);

      const remainingLengthMm = Math.max(0, sheetLengthMm - usedLengthMm);

      let yieldRatePercent = 0;
      if (isBoardSheet) {
        const totalSheetArea = sheetWidthMm * sheetLengthMm;
        const netPartsArea = items.reduce((acc, it) => acc + it.widthMm * it.lengthMm, 0);
        yieldRatePercent = totalSheetArea > 0 ? (netPartsArea / totalSheetArea) * 100 : 0;
      } else {
        yieldRatePercent = sheetLengthMm > 0 ? (netPartsLengthMm / sheetLengthMm) * 100 : 0;
      }

      resultSheets.push({
        baseId: entry.baseId,
        cutWidthMm,
        lumberName,
        layout: layoutType,
        sheetWidthMm,
        sheetLengthMm,
        items,
        usedLengthMm,
        remainingLengthMm,
        yieldRatePercent,
      });
    }

    // layout に配置されていない木工素材 (円柱アジャスターや単独部材など) を独立シートとして追加
    const placedPartsIds = new Set(cutList.layouts.map((l) => l.partsId));
    const unplacedObjects = objects.filter((obj) => {
      if (placedPartsIds.has(obj.id)) return false;
      if (obj.noAggregated === true) return false;
      const type = obj.type;
      if (type !== 'lumber' && type !== 'board' && type !== 'cylinder' && type !== 'roundBoard') {
        return false;
      }
      const pName = (obj.partName || '').toLowerCase();
      if (pName.includes('[参考]') || pName.includes('[ダミー]') || pName.includes('placeholder')) {
        return false;
      }
      return true;
    });

    for (let i = 0; i < unplacedObjects.length; i++) {
      const obj = unplacedObjects[i];
      const dimX = obj.size.x * 1000;
      const dimY = obj.size.y * 1000;
      const dimZ = obj.size.z * 1000;

      const isBoard = obj.type === 'board';
      let lengthMm: number;
      let widthMm: number;

      if (isBoard) {
        const std = this.parseStandardDimensions(obj, defaultLengthMm);
        if (std.widthMm > 0 && std.lengthMm > 0) {
          if (dimX <= std.widthMm && dimZ <= std.lengthMm) {
            widthMm = dimX;
            lengthMm = dimZ;
          } else if (dimZ <= std.widthMm && dimX <= std.lengthMm) {
            widthMm = dimZ;
            lengthMm = dimX;
          } else {
            lengthMm = Math.max(dimX, dimZ);
            widthMm = Math.min(dimX, dimZ);
          }
        } else {
          lengthMm = Math.max(dimX, dimZ);
          widthMm = Math.min(dimX, dimZ);
        }
      } else {
        lengthMm = Math.max(dimX, dimY, dimZ);
        widthMm = Math.min(dimX, dimY);
      }

      const stdDim = this.parseStandardDimensions(obj, lengthMm);
      const sheetLengthMm = Math.max(stdDim.lengthMm, lengthMm);
      const sheetWidthMm = Math.max(stdDim.widthMm, widthMm);

      const item: CutPlanItem = {
        object: obj,
        positionMm: { x: 0, z: 0 },
        lengthMm,
        widthMm,
        isBoard,
        edgeCuts: (obj as any).edgeCuts,
      };

      const remainingLengthMm = Math.max(0, sheetLengthMm - lengthMm);
      const yieldRatePercent = sheetLengthMm > 0 ? (lengthMm / sheetLengthMm) * 100 : 100;

      resultSheets.push({
        baseId: i,
        cutWidthMm,
        lumberName: obj.name || (isBoard ? '板材' : '角材'),
        layout: isBoard ? '2d' : '1d',
        sheetWidthMm,
        sheetLengthMm,
        items: [item],
        usedLengthMm: lengthMm,
        remainingLengthMm,
        yieldRatePercent,
      });
    }

    return resultSheets;
  }

  /**
   * オブジェクトの材料規格識別キーを取得
   */
  private getMaterialKey(obj: CadiyObject): string {
    if (obj.standardRef?.standardId) {
      return String(obj.standardRef.standardId);
    }
    if (obj.standardRef?.name) {
      return `${obj.type}_${obj.standardRef.name}`;
    }
    if (obj.type === 'board') {
      return `board_${obj.name}_${Math.round(obj.size.y * 1000)}mm`;
    }
    const cs1 = Math.round(Math.min(obj.size.x, obj.size.y) * 1000);
    const cs2 = Math.round(Math.max(obj.size.x, obj.size.y) * 1000);
    return `${obj.type}_${obj.name}_${cs1}x${cs2}`;
  }

  /**
   * 規格情報または部材サイズから原木・原板寸法 (width, length) を算出
   */
  private parseStandardDimensions(
    obj: CadiyObject,
    defaultLumberLength = 1820
  ): { widthMm: number; lengthMm: number } {
    const stdId = String(obj.standardRef?.standardId || '');
    const stdName = String(obj.standardRef?.name || obj.name || '');
    const text = `${stdId} ${stdName}`;

    // 1. 2D 板材の寸法表記 (3桁以上の数字: 例: 600x1820, 910x1820, 910x9x1820)
    const match3D = text.match(/(\d+)[x×](\d+)[x×](\d+)/i);
    if (match3D) {
      const nums = [parseInt(match3D[1]), parseInt(match3D[2]), parseInt(match3D[3])].sort((a, b) => a - b);
      return { widthMm: nums[1], lengthMm: nums[2] };
    }

    const match2D = text.match(/(\d{3,})[x×](\d{3,})/i);
    if (match2D) {
      const w = parseInt(match2D[1]);
      const l = parseInt(match2D[2]);
      return { widthMm: Math.min(w, l), lengthMm: Math.max(w, l) };
    }

    // 2. フィート表記 (6f, 6F -> 1820, 8f, 8F -> 2440 など)
    let lengthMm = defaultLumberLength;
    const matchFeet = text.match(/(\d+)[fF]/);
    if (matchFeet) {
      const feet = parseInt(matchFeet[1]);
      if (feet === 6) lengthMm = 1820;
      else if (feet === 8) lengthMm = 2440;
      else if (feet === 10) lengthMm = 3050;
      else if (feet === 12) lengthMm = 3660;
      else lengthMm = Math.round(feet * 304.8);
    }

    // 3. 断面幅 (2x4 -> 89, 2x2 -> 38, 1x3 -> 64, 1x4 -> 89 など)
    let widthMm = Math.max(obj.size.x, obj.size.y) * 1000;
    if (text.includes('2x4') || text.includes('2×4') || text.includes('1x4') || text.includes('1×4')) {
      widthMm = 89;
    } else if (text.includes('2x2') || text.includes('2×2')) {
      widthMm = 38;
    } else if (text.includes('1x3') || text.includes('1×3')) {
      widthMm = 64;
    } else if (obj.type === 'board') {
      const dimX = obj.size.x * 1000;
      const dimZ = obj.size.z * 1000;
      widthMm = Math.min(dimX, dimZ);
      lengthMm = Math.max(dimX, dimZ);
    }

    return { widthMm: Math.round(widthMm), lengthMm: Math.round(lengthMm) };
  }
}
