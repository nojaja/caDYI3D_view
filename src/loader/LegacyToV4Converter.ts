import {
  Cadiy4Data,
  CadiyObject,
  BoardObject,
  DimensionObject,
  PolygonObject,
  ScrewObject,
  CylinderObject,
  PictureObject,
  Vector3,
  Quaternion,
  ColorRGB,
  LayerData,
  CutLayoutItem,
  CutListData,
} from '../types/cadiy4';
import {
  LegacyCadiyProject,
  Legacy2xModel,
  LegacyLayerItem,
  LegacyCutListPartsBase,
  LegacyCutPartItem,
  LegacyBooleanMeshInfo,
} from '../types/cadiy-legacy';

/**
 * caDIY3D レガシー形式 (.cadiy / XML) から V4 形式 (Cadiy4Data) への移行コンバーター
 * 変換失敗時にも全体の中断を防ぎ、console.log に詳細を出力して処理を継続する (フォールトトレラント)
 */
export class LegacyToV4Converter {
  /**
   * LegacyCadiyProject を Cadiy4Data へ変換する
   */
  public convert(project: LegacyCadiyProject, projectName: string = 'モデル'): Cadiy4Data {
    const model: Legacy2xModel = project._2xModel;

    // 1. カメラの変換 (失敗時はデフォルト視点)
    const camera = this.convertCamera(model.Camera);

    // 2. レイヤーの変換
    const layers = this.convertLayers(model._2xLayer?._2xLayerInfoItem, projectName);

    // 3. メッシュテーブルの変換
    const polygonMeshTable = this.convertMeshTable(model._2xBooleanMeshInfo?._2xBooleanMeshInfo);

    // 4. オブジェクトの変換 (失敗した部材はスキップ・フォールバックし、console.log に出力)
    const objects = this.convertObjects(model._2xObject);

    // 5. 木取り図 (CutList) の変換
    const cutList = this.convertCutList(model.CutList?.CutListPartsBase);

    // 6. 画像情報のマップ
    this.mapPictureImages(objects, model._2xPictureImageInfos?._2xPictureImageInfo);

    const v4Data: Cadiy4Data = {
      version: 1,
      thumbnail: model.Thumbnail ? `data:image/png;base64,${model.Thumbnail}` : '',
      camera,
      objects,
      layers,
      snaps: [],
    };

    if (cutList && cutList.layouts.length > 0) {
      v4Data.cutList = cutList;
    }

    if (polygonMeshTable && polygonMeshTable.length > 0) {
      v4Data.polygonMeshTable = polygonMeshTable;
    }

    return v4Data;
  }

  /**
   * カメラの変換
   */
  private convertCamera(legacyCamera?: any): { position: Vector3; target: Vector3 } {
    const defaultCamera = {
      position: { x: 1.0, y: 1.0, z: 1.5 },
      target: { x: 0, y: 0.1, z: 0 },
    };

    if (!legacyCamera) return defaultCamera;

    try {
      const pos = this.parseVector3(legacyCamera.Position, defaultCamera.position);
      const target = this.parseVector3(legacyCamera.Center, defaultCamera.target);
      return { position: pos, target };
    } catch (err: any) {
      console.log(`[LegacyConverter] 変換失敗: [Camera] カメラ座標のパースに失敗しました: ${err.message}`, {
        target: 'Camera',
        error: err,
      });
      return defaultCamera;
    }
  }

  /**
   * レイヤー一覧の変換 (ルートレイヤーをID 0として自動生成し、旧レイヤーIDを +1 シフト)
   */
  private convertLayers(legacyLayers: any, projectName: string): LayerData[] {
    const rootLayer: LayerData = {
      id: 0,
      name: projectName,
      visible: true,
      locked: false,
      color: { r: 0.31, g: 0.5, b: 1.0 },
      colorMode: false,
      parentId: null,
    };

    const result: LayerData[] = [rootLayer];
    if (!legacyLayers) return result;

    const layerItems: LegacyLayerItem[] = Array.isArray(legacyLayers) ? legacyLayers : [legacyLayers];

    for (const item of layerItems) {
      try {
        const id = parseInt(item.LayerID || '0', 10) + 1;
        const color = this.parseHexColor(item.LayerColor, { r: 0.5, g: 0.5, b: 0.5 });
        result.push({
          id,
          name: item.LayerName || `レイヤー ${id}`,
          visible: item.LayerVisible !== 'false',
          locked: item.LayerLocked === 'true',
          color,
          colorMode: item.LayerColorMode === 'true',
          parentId: 0,
        });
      } catch (err: any) {
        console.log(`[LegacyConverter] 変換失敗: [Layer(ID=${item?.LayerID})] レイヤー変換エラー: ${err.message}`, {
          target: `Layer(ID=${item?.LayerID})`,
          error: err,
        });
      }
    }

    return result;
  }

  /**
   * 全オブジェクトの変換
   */
  private convertObjects(container?: any): CadiyObject[] {
    if (!container || typeof container !== 'object') return [];

    const objects: CadiyObject[] = [];

    // _2xObject 配下の各タグを走査
    for (const [tag, items] of Object.entries(container)) {
      if (!items) continue;
      const list: any[] = Array.isArray(items) ? items : [items];

      for (const item of list) {
        try {
          const converted = this.convertSingleObject(tag, item);
          if (converted) {
            objects.push(converted);
          }
        } catch (err: any) {
          const uid = item?.UniqueID || 'unknown';
          console.log(
            `[LegacyConverter] 変換失敗: [Object(tag=${tag}, UniqueID=${uid})] 部材変換をスキップします: ${err.message}`,
            {
              target: `Object(tag=${tag}, UniqueID=${uid})`,
              raw: item,
              error: err,
            }
          );
        }
      }
    }

    return objects;
  }

  /**
   * 単一オブジェクトの変換
   */
  private convertSingleObject(tag: string, item: any): CadiyObject | null {
    const base = this.extractBaseProperties(item, tag);

    switch (tag) {
      case '_2xBoard': {
        const board: BoardObject = {
          ...base,
          type: 'board',
          cutAngles: this.parseCutAngles(item.CutValue),
        };
        if (item.StandardSize) {
          board.legacyStandardSize = this.parseVector3(item.StandardSize);
        }
        if (item.UnitPrice) {
          const price = parseFloat(item.UnitPrice);
          if (!isNaN(price)) board.unitPrice = price;
        }
        if (item.SpecificGravity) {
          const sg = parseFloat(item.SpecificGravity);
          if (!isNaN(sg)) board.specificGravity = sg;
        }
        if (item.Remarks) {
          board.remarks = String(item.Remarks);
        }
        return board;
      }

      case '_2xCylinder': {
        const cyl: CylinderObject = {
          ...base,
          type: 'cylinder',
        };
        return cyl;
      }

      case '_2xDimension': {
        const dim: DimensionObject = {
          ...base,
          type: 'dimension',
          linePattern: parseInt(item.LinePattern1 || '0', 10),
          auxLinePattern: parseInt(item.LinePattern2 || '0', 10),
          lineWidth: parseFloat(item.LineWidth || '1') || 1,
          arrowType: item.LineEndType === 'eEndArrowOutside' ? 'outside' : 'inside',
          textVisible: item.TextVisibled !== 'false',
          valuePosition: item.PosDimensionValue === 'Bottom' ? 'bottom' : 'top',
          symbol: item.DimensionSymbol || '',
          fontSize: 24,
          billboard: false,
        };
        return dim;
      }

      case '_2xScrew': {
        const screw: ScrewObject = {
          ...base,
          type: 'screw',
          screwLength: parseFloat(item.ScrewLength || '0') || 0,
          diameterIndex: 0,
          layout: item.ScrewLayout === 'eScrewLayout2' ? 'layout2' : 'layout1',
          screwColor: '#d1d5db',
          lineColor: '#9ca3af',
          showDimension: item.DispDimension === 'true',
          screwPosition: parseFloat(item.ScrewPosition || '0') || 0,
        };
        return screw;
      }

      case '_2xPolygon':
      case '_2xBoolean': {
        const poly: PolygonObject = {
          ...base,
          type: 'polygon',
          modelName: item.ModelName ? String(item.ModelName).replace(/\\/g, '/') : '',
          meshRef: item.CommentText || item.ModelName || 'polygon',
        };
        return poly;
      }

      case '_2xDiyMaterial': {
        return {
          ...base,
          type: 'steelProfile',
          shape: 'flatBar',
          material: 'steel',
          thickness: parseFloat(item.Thickness || '0.003') || 0.003,
        } as any;
      }

      case '_2xPicture': {
        const pic: PictureObject = {
          ...base,
          type: 'picture',
          imageBase64: item.ImageBase64ID ? undefined : undefined,
          imageMimeType: 'image/png',
          aspectRatio: parseFloat(item.AspectRatio || '1') || 1,
          aspectRatioFixed: item.AspectRatioFixed !== 'false',
        };
        return pic;
      }

      default: {
        // 未知のタグの場合、polygon としてフォールバック
        console.log(
          `[LegacyConverter] 変換警告: [Object(tag=${tag})] 未知のオブジェクトタグです。polygon としてフォールバックします。`,
          { tag, raw: item }
        );
        return {
          ...base,
          type: 'polygon',
          modelName: '',
          meshRef: base.name,
        } as PolygonObject;
      }
    }
  }

  /**
   * 全部材共通プロパティの抽出
   */
  private extractBaseProperties(item: any, tag: string): {
    id: string;
    displayId?: number;
    name: string;
    partName?: string;
    position: Vector3;
    quaternion: Quaternion;
    size: Vector3;
    visible: boolean;
    locked: boolean;
    groupId: number;
    layerId: number;
    color: ColorRGB;
    textureId?: number;
    noAggregated?: boolean;
  } {
    const uid = item.UniqueID !== undefined ? String(item.UniqueID) : Math.random().toString(36).slice(2, 9);
    const id = tag === '_2xBoard' ? `legacy-${uid}` : (uid.startsWith('legacy-') ? uid : `legacy-${uid}`);
    const displayId = parseInt(uid, 10);

    const position = this.parseVector3(item.Location);
    const quaternion = this.parseQuaternion(item.Quaternion);
    const size = this.parseVector3(item.Size);

    const color = this.parseColor(item.Diffuse, { r: 0.8, g: 0.8, b: 0.8 });
    const name = item.CommentText ? String(item.CommentText) : (tag.replace(/^_2x/, '') || '部材');
    const partName = item.SubPartsName ? String(item.SubPartsName) : (item.LinkedCutPartsText ? String(item.LinkedCutPartsText) : undefined);

    const layerId = parseInt(item.Layer || '0', 10) + 1;
    const groupId = parseInt(item.GroupID || '0', 10) || 0;
    const visible = item.Hide !== 'true';
    const textureId = item.Texture ? parseInt(item.Texture, 10) : undefined;
    const noAggregated = item.NoAggregated === 'true';

    return {
      id,
      displayId: isNaN(displayId) ? undefined : displayId,
      name,
      partName,
      position,
      quaternion,
      size,
      visible,
      locked: false,
      groupId,
      layerId,
      color,
      textureId,
      noAggregated,
    };
  }

  /**
   * 木取り図 (CutList) の変換
   */
  private convertCutList(partsBases?: any): CutListData | null {
    if (!partsBases) return null;

    const baseList: LegacyCutListPartsBase[] = Array.isArray(partsBases) ? partsBases : [partsBases];
    const layouts: CutLayoutItem[] = [];

    for (let baseId = 0; baseId < baseList.length; baseId++) {
      const pBase = baseList[baseId];
      const cutPartsContainer = pBase.Parts?.CutParts;
      if (!cutPartsContainer) continue;

      const cutParts: LegacyCutPartItem[] = Array.isArray(cutPartsContainer) ? cutPartsContainer : [cutPartsContainer];

      for (const cp of cutParts) {
        try {
          if (!cp.CutID) continue;
          const loc = this.parseCutLocation(cp.Location);
          layouts.push({
            baseId,
            partsId: `legacy-${cp.CutID}`,
            x: loc.x,
            z: loc.z,
          });
        } catch (err: any) {
          console.log(`[LegacyConverter] 変換失敗: [CutList(CutID=${cp?.CutID})] 木取りパーツ変換エラー: ${err.message}`, {
            cutPart: cp,
            error: err,
          });
        }
      }
    }

    return {
      cutWidthMm: 3,
      packingMode: 'adjacent',
      layouts,
    };
  }

  /**
   * メッシュテーブル (BooleanMeshInfo) の変換
   */
  private convertMeshTable(meshInfos?: any): any[] | null {
    if (!meshInfos) return null;

    const list: LegacyBooleanMeshInfo[] = Array.isArray(meshInfos) ? meshInfos : [meshInfos];
    const table: any[] = [];

    for (const info of list) {
      try {
        const id = parseInt(info.BooleanMeshInfoID || '0', 10);
        if (!info.MeshVertex) continue;

        // "x,y,z/x,y,z/..."
        const vertexTokens = info.MeshVertex.split('/');
        const vertices: Vector3[] = [];
        for (const token of vertexTokens) {
          if (!token.trim()) continue;
          vertices.push(this.parseVector3(token));
        }

        table.push({
          id,
          vertices,
          faces: [], // 簡易表示用
        });
      } catch (err: any) {
        console.log(`[LegacyConverter] 変換失敗: [BooleanMeshInfo(ID=${info?.BooleanMeshInfoID})] メッシュ変換エラー: ${err.message}`, {
          meshInfo: info,
          error: err,
        });
      }
    }

    return table;
  }

  /**
   * 画像情報のマッピング
   */
  private mapPictureImages(objects: CadiyObject[], imageInfos?: any): void {
    if (!imageInfos) return;
    const list = Array.isArray(imageInfos) ? imageInfos : [imageInfos];
    const imageMap = new Map<number, string>();

    for (const info of list) {
      if (info.ImageBase64ID && info.ImageBase64) {
        const id = parseInt(info.ImageBase64ID, 10);
        imageMap.set(id, info.ImageBase64);
      }
    }

    for (const obj of objects) {
      if (obj.type === 'picture') {
        const pic = obj as PictureObject;
        if (pic.imageBase64 && imageMap.has(Number(pic.imageBase64))) {
          const b64 = imageMap.get(Number(pic.imageBase64));
          if (b64) {
            pic.imageBase64 = b64.startsWith('data:') ? b64 : `data:image/png;base64,${b64}`;
          }
        }
      }
    }
  }

  // --- ヘルパーメソッド ---

  private parseVector3(str?: string, defaultVal: Vector3 = { x: 0, y: 0, z: 0 }): Vector3 {
    if (!str) return defaultVal;
    const parts = str.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length < 3 || parts.some((n) => isNaN(n))) {
      throw new Error(`無効なVector3文字列です: "${str}"`);
    }
    return { x: parts[0], y: parts[1], z: parts[2] };
  }

  private parseQuaternion(str?: string, defaultVal: Quaternion = { x: 0, y: 0, z: 0, w: 1 }): Quaternion {
    if (!str) return defaultVal;
    const parts = str.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length < 4 || parts.some((n) => isNaN(n))) {
      throw new Error(`無効なQuaternion文字列です: "${str}"`);
    }
    return { x: parts[0], y: parts[1], z: parts[2], w: parts[3] };
  }

  private parseColor(str?: string, defaultVal: ColorRGB = { r: 0.8, g: 0.8, b: 0.8 }): ColorRGB {
    if (!str) return defaultVal;
    const parts = str.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length < 3 || parts.some((n) => isNaN(n))) {
      return defaultVal;
    }
    return {
      r: Math.min(Math.max(parts[0], 0), 1),
      g: Math.min(Math.max(parts[1], 0), 1),
      b: Math.min(Math.max(parts[2], 0), 1),
    };
  }

  private parseHexColor(hex?: string, defaultVal: ColorRGB = { r: 0.5, g: 0.5, b: 0.5 }): ColorRGB {
    if (!hex || !hex.startsWith('#')) return defaultVal;
    const raw = hex.replace('#', '');
    if (raw.length === 8) {
      // #AARRGGBB
      const r = parseInt(raw.slice(2, 4), 16) / 255;
      const g = parseInt(raw.slice(4, 6), 16) / 255;
      const b = parseInt(raw.slice(6, 8), 16) / 255;
      return { r, g, b };
    } else if (raw.length === 6) {
      // #RRGGBB
      const r = parseInt(raw.slice(0, 2), 16) / 255;
      const g = parseInt(raw.slice(2, 4), 16) / 255;
      const b = parseInt(raw.slice(4, 6), 16) / 255;
      return { r, g, b };
    }
    return defaultVal;
  }

  private parseCutAngles(str?: string): number[] {
    const defaults = [0, 0, 0, 0, 0, 0, 0, 0];
    if (!str) return defaults;
    const parts = str.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length === 8 && parts.every((n) => !isNaN(n))) {
      return parts;
    }
    return defaults;
  }

  private parseCutLocation(str?: string): { x: number; z: number } {
    if (!str) return { x: 0, z: 0 };
    // "z,x" 形式
    const parts = str.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { z: parts[0], x: parts[1] };
    }
    return { x: 0, z: 0 };
  }
}
