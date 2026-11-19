import {
  Cadiy4Data,
  CadiyObject,
  BoardObject,
  LumberObject,
  DimensionObject,
  PolygonObject,
  ScrewObject,
  CylinderObject,
  PictureObject,
  PictureImageItem,
  TextBoardObject,
  CommentObject,
  WaveBoardObject,
  SteelProfileObject,
  TubeObject,
  Vector3,
  Quaternion,
  ColorRGB,
  ColorRGBA,
  LayerData,
  CutLayoutItem,
  CutListData,
  EdgeCut,
  PaintItem,
  PaintSnapshot,
} from '../types/cadiy4';
import {
  LegacyCadiyProject,
  Legacy2xModel,
  LegacyLayerItem,
  LegacyCutListPartsBase,
  LegacyCutPartItem,
  LegacyBooleanMeshInfo,
  LegacyPaint,
  LegacyPainting,
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
    const { layers, layerIdMap } = this.convertLayers(model._2xLayer?._2xLayerInfoItem, projectName);

    // 3. ペイント情報の変換
    const { paintSnapshot, paintMap } = this.convertPaint(model._2xPaint);

    // 4. メッシュテーブルの変換
    const polygonMeshTable = this.convertMeshTable(model._2xBooleanMeshInfo?._2xBooleanMeshInfo);

    // 5. オブジェクトの変換 (失敗した部材はスキップ・フォールバックし、console.log に出力)
    const objects = this.convertObjects(model._2xObject, paintMap, layerIdMap);

    // 6. 木取り図 (CutList) の変換
    const cutList = this.convertCutList(model.CutList?.CutListPartsBase);

    // 7. 画像テーブルの変換
    const pictureImageTable = this.convertPictureImageTable(
      model._2xPictureImageInfos?._2xPictureImageInfo
    );

    const v4Data: Cadiy4Data = {
      version: 1,
      thumbnail: model.Thumbnail ? `data:image/png;base64,${model.Thumbnail}` : '',
      camera,
      objects,
      layers,
      snaps: [],
    };

    if (paintSnapshot && paintSnapshot.paints && paintSnapshot.paints.length > 0) {
      v4Data.paint = { snapshot: paintSnapshot };
    }

    if (cutList && cutList.layouts.length > 0) {
      v4Data.cutList = cutList;
    }

    if (polygonMeshTable && polygonMeshTable.length > 0) {
      v4Data.polygonMeshTable = polygonMeshTable;
    }

    if (pictureImageTable && pictureImageTable.length > 0) {
      v4Data.pictureImageTable = pictureImageTable;
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
   * レイヤー一覧の変換 (ルートレイヤーをID 0として自動生成し、旧レイヤーを順にID 1, 2... にマッピング)
   */
  private convertLayers(
    legacyLayers: any,
    projectName: string
  ): { layers: LayerData[]; layerIdMap: Map<string, number> } {
    const layerIdMap = new Map<string, number>();
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
    if (!legacyLayers) return { layers: result, layerIdMap };

    const layerItems: LegacyLayerItem[] = Array.isArray(legacyLayers) ? legacyLayers : [legacyLayers];

    for (let i = 0; i < layerItems.length; i++) {
      const item = layerItems[i];
      try {
        const id = i + 1;
        if (item.LayerID !== undefined) {
          layerIdMap.set(String(item.LayerID), id);
        }
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

    return { layers: result, layerIdMap };
  }

  /**
   * ペイント情報の変換
   */
  private convertPaint(legacyPaint?: LegacyPaint | string): {
    paintSnapshot: PaintSnapshot | null;
    paintMap: Map<string, string>;
  } {
    const paintMap = new Map<string, string>();
    if (!legacyPaint || typeof legacyPaint !== 'object' || !legacyPaint._2xPaintings) {
      return { paintSnapshot: null, paintMap };
    }

    const paintings: LegacyPainting[] = Array.isArray(legacyPaint._2xPaintings)
      ? legacyPaint._2xPaintings
      : [legacyPaint._2xPaintings];

    const paints: PaintItem[] = [];

    for (const p of paintings) {
      if (!p.PaintID) continue;
      const id = `legacy-${p.PaintID}`;
      const color = this.parseHexColor(p.PaintColor, { r: 0.8, g: 0.8, b: 0.8 });
      paints.push({
        id,
        name: p.PaintName || `塗料 ${p.PaintID}`,
        color,
        finish: 'wood',
        specs: [],
      });
      paintMap.set(String(p.PaintID), id);
    }

    const paintSnapshot: PaintSnapshot = {
      id: 'snapshot',
      name: 'snapshot',
      isPreset: false,
      paints,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return { paintSnapshot, paintMap };
  }

  /**
   * 全オブジェクトの変換
   */
  private convertObjects(
    container?: any,
    paintMap?: Map<string, string>,
    layerIdMap?: Map<string, number>
  ): CadiyObject[] {
    if (!container || typeof container !== 'object') return [];

    const objects: CadiyObject[] = [];

    // _2xObject 配下の各タグを走査
    for (const [tag, items] of Object.entries(container)) {
      if (!items) continue;
      const list: any[] = Array.isArray(items) ? items : [items];

      for (const item of list) {
        try {
          const converted = this.convertSingleObject(tag, item, paintMap, layerIdMap);
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
  private convertSingleObject(
    tag: string,
    item: any,
    paintMap?: Map<string, string>,
    layerIdMap?: Map<string, number>
  ): CadiyObject | null {
    const base = this.extractBaseProperties(item, tag, paintMap, layerIdMap);

    switch (tag) {
      case '_2xBoard': {
        const edgeCuts = this.parseEdgeCuts(item.CutValue, item.RoundValue, item.RoundModes, base.size);
        const cutAngles = edgeCuts && edgeCuts.length > 0 ? [0, 0, 0, 0, 0, 0, 0, 0] : this.parseCutAngles(item.CutValue);
        const board: BoardObject = {
          ...base,
          type: 'board',
          cutAngles,
        };
        if (edgeCuts && edgeCuts.length > 0) {
          board.edgeCuts = edgeCuts;
        }
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

      case '_2xLumber': {
        const edgeCuts = this.parseEdgeCuts(item.CutValue, item.RoundValue, item.RoundModes, base.size);
        const cutAngles = edgeCuts && edgeCuts.length > 0 ? [0, 0, 0, 0, 0, 0, 0, 0] : this.parseCutAngles(item.CutValue);
        const lumber: LumberObject = {
          ...base,
          type: 'lumber',
          cutAngles,
        };
        if (edgeCuts && edgeCuts.length > 0) {
          lumber.edgeCuts = edgeCuts;
        }
        if (item.StandardSize) {
          lumber.legacyStandardSize = this.parseVector3(item.StandardSize);
        }
        if (item.UnitPrice) {
          const price = parseFloat(item.UnitPrice);
          if (!isNaN(price)) lumber.unitPrice = price;
        }
        if (item.SpecificGravity) {
          const sg = parseFloat(item.SpecificGravity);
          if (!isNaN(sg)) lumber.specificGravity = sg;
        }
        if (item.Remarks) {
          lumber.remarks = String(item.Remarks);
        }
        return lumber;
      }

      case '_2xCylinder': {
        const cyl: CylinderObject = {
          ...base,
          type: 'cylinder',
        };
        if (item.StandardSize) {
          cyl.legacyStandardSize = this.parseVector3(item.StandardSize);
        }
        if (item.UnitPrice) {
          const price = parseFloat(item.UnitPrice);
          if (!isNaN(price)) cyl.unitPrice = price;
        }
        if (item.SpecificGravity) {
          const sg = parseFloat(item.SpecificGravity);
          if (!isNaN(sg)) cyl.specificGravity = sg;
        }
        return cyl;
      }

      case '_2xComment': {
        const arrowPoint = item.ArrowPoint
          ? this.parseVector3FromObjOrStr(item.ArrowPoint)
          : undefined;
        const comm: CommentObject = {
          ...base,
          type: 'comment',
          text: item.CommentText ? String(item.CommentText) : '',
          arrowPoint,
          fontSize: 28,
          backgroundColor: item.Diffuse
            ? this.parseColorRGBA(item.Diffuse, { r: 1, g: 1, b: 0.8, a: 1 })
            : { r: 1, g: 1, b: 0.8, a: 1 },
          billboard: false,
          size: { x: 0, y: 0, z: 0 },
        };
        return comm;
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

      case '_2xPicture': {
        // ImageMode が "false" の場合は文字看板 (textBoard)
        if (item.ImageMode === 'false') {
          const textBoard: TextBoardObject = {
            ...base,
            type: 'textBoard',
            text: item.CommentText ? String(item.CommentText) : '',
            fontSize: item.FontSize ? parseFloat(item.FontSize) : 12,
            fontFamily: item.FontFamily || 'Meiryo UI',
            bold: item.FontStyle === 'Bold',
            italic: item.FontStyle === 'Italic',
            frameVisible: item.FrameVisibled !== 'false',
            contentRotation: 90,
            backgroundColor:
              item.BackColorMode === 'true'
                ? { ...this.parseColor(item.BackColor), a: 1 }
                : { r: 1, g: 1, b: 1, a: 0 },
          };
          return textBoard;
        }

        let imageMimeType = 'image/jpeg';
        if (item.ImagePath) {
          const lower = String(item.ImagePath).toLowerCase();
          if (lower.endsWith('.png')) {
            imageMimeType = 'image/png';
          } else if (lower.endsWith('.gif')) {
            imageMimeType = 'image/gif';
          } else if (lower.endsWith('.bmp')) {
            imageMimeType = 'image/bmp';
          }
        }

        const pic: PictureObject = {
          ...base,
          type: 'picture',
          imageBase64Id: item.ImageBase64ID ? parseInt(item.ImageBase64ID, 10) : undefined,
          imageMimeType,
          aspectRatio: parseFloat(item.AspectRatio || '1') || 1,
          aspectRatioFixed: item.AspectRatioFixed !== 'false',
          dispPattern: 1,
          contentRotation: 270,
        };
        return pic;
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
          meshRef: item.MeshInfoID ? String(item.MeshInfoID) : (item.CommentText || item.ModelName || 'polygon'),
        };
        return poly;
      }

      case '_2xDiyMaterial': {
        const diyType = String(item.DiyMaterialType || '');
        const thickness = parseFloat(item.Thickness || '0.003') || 0.003;

        // 1. 波板 (waveBoard)
        if (diyType.startsWith('diyMatTypeWaveBoard')) {
          const waveBoard: WaveBoardObject = {
            ...base,
            type: 'waveBoard',
            thickness,
            subType: diyType === 'diyMatTypeWaveBoard1' ? 'sineSmall' : 'trapezoidal',
          };
          return waveBoard;
        }

        // 2. パイプ・チューブ (tube)
        if (diyType.startsWith('diyTubeMaterial')) {
          let subType = 'pvc';
          if (diyType === 'diyTubeMaterial2') subType = 'steel';
          else if (diyType === 'diyTubeMaterial3') subType = 'coated';
          else if (diyType === 'diyTubeMaterial4') subType = 'plated';

          const tube: TubeObject = {
            ...base,
            type: 'tube',
            thickness,
            subType,
          };
          return tube;
        }

        // 3. 鋼材・アルミ等 (steelProfile)
        let shape = 'flatBar';
        let material = 'steel';
        if (diyType === 'diyMatTypeSteelMaterial1') {
          shape = 'lAngle';
          material = 'steel';
        } else if (diyType === 'diyMatTypeAlumiMaterial1') {
          shape = 'lAngle';
          material = 'alumi';
        } else if (diyType === 'diyMatTypeSteelMaterial2') {
          shape = 'flatBar';
          material = 'steel';
        }

        const profile: SteelProfileObject = {
          ...base,
          type: 'steelProfile',
          shape,
          material,
          thickness,
        };
        return profile;
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
  private extractBaseProperties(
    item: any,
    tag: string,
    paintMap?: Map<string, string>,
    layerIdMap?: Map<string, number>
  ): {
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
    defaultPaintId?: string;
    noAggregated?: boolean;
  } {
    const uid = item.UniqueID !== undefined ? String(item.UniqueID) : Math.random().toString(36).slice(2, 9);
    const id = (tag === '_2xBoard' || tag === '_2xLumber' || tag === '_2xCylinder')
      ? `legacy-${uid}`
      : (uid.startsWith('legacy-') ? uid : `legacy-${uid}`);
    const displayId = parseInt(uid, 10);

    const position = this.parseVector3(item.Location);
    const quaternion = this.parseQuaternion(item.Quaternion);
    const size = this.parseVector3(item.Size);

    // Diffuse または文字色
    const color = (tag === '_2xDimension' || tag === '_2xComment' || (tag === '_2xPicture' && item.ImageMode === 'false'))
      ? { r: 0, g: 0, b: 0 }
      : this.parseColor(item.Diffuse, { r: 0.8, g: 0.8, b: 0.8 });

    const name = item.CommentText ? String(item.CommentText) : (tag.replace(/^_2x/, '') || '部材');
    const partName = item.SubPartsName ? String(item.SubPartsName) : (item.LinkedCutPartsText ? String(item.LinkedCutPartsText) : undefined);

    const rawLayer = item.Layer !== undefined ? String(item.Layer) : '0';
    let layerId = 1;
    if (layerIdMap && layerIdMap.has(rawLayer)) {
      layerId = layerIdMap.get(rawLayer)!;
    } else {
      const parsedNum = parseInt(rawLayer, 10);
      layerId = isNaN(parsedNum) ? 1 : parsedNum + 1;
    }
    const groupId = parseInt(item.GroupID || '0', 10) || 0;
    const visible = item.Hide !== 'true';
    const textureId = item.Texture !== undefined && item.Texture !== '-1' ? parseInt(item.Texture, 10) : undefined;
    const noAggregated = item.NoAggregated === 'true';

    // ペイントマッピング
    let defaultPaintId: string | undefined;
    if (paintMap && item.PaintID && item.PaintID !== '-1') {
      defaultPaintId = paintMap.get(String(item.PaintID));
    }

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
      defaultPaintId,
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
        const meshId = String(info.BooleanMeshInfoID || id);
        if (!info.MeshVertex) continue;

        // "x,y,z/x,y,z/..."
        // 旧XMLの頂点座標はメートル [m] 単位のため、V4内部仕様に合わせて 100倍してセンチメートル [cm] に変換する
        const vertexTokens = info.MeshVertex.split('/');
        const vertices: Vector3[] = [];
        for (const token of vertexTokens) {
          if (!token.trim()) continue;
          const v = this.parseVector3(token);
          vertices.push({
            x: v.x * 100,
            y: v.y * 100,
            z: v.z * 100,
          });
        }

        // 面情報 (MeshFaceInfo / FInfo) のパース
        // 書式: 頂点数#スムーズフラグ#マテリアルID#頂点インデックス#エッジフラグ#頂点法線#面法線
        const faces: any[] = [];
        if (info.MeshFaceInfo) {
          const rawFaceList = Array.isArray(info.MeshFaceInfo) ? info.MeshFaceInfo : [info.MeshFaceInfo];
          for (const item of rawFaceList) {
            const finfoStr = typeof item === 'string' ? item : item?.FInfo;
            if (!finfoStr || typeof finfoStr !== 'string') continue;

            const parts = finfoStr.split('#');
            if (parts.length >= 4) {
              const idxStr = parts[3];
              const indices = idxStr
                .split(',')
                .map((s) => parseInt(s.trim(), 10))
                .filter((n) => !isNaN(n));

              if (indices.length >= 3) {
                let vertexNormals: Vector3[] | undefined;
                if (parts.length >= 6 && parts[5] && parts[5] !== 'null') {
                  const normTokens = parts[5].split('/');
                  const parsedNorms: Vector3[] = [];
                  for (const nt of normTokens) {
                    if (!nt.trim()) continue;
                    try {
                      parsedNorms.push(this.parseVector3(nt));
                    } catch {
                      // 無効な法線はスキップ
                    }
                  }
                  if (parsedNorms.length === indices.length) {
                    vertexNormals = parsedNorms;
                  }
                }

                faces.push({
                  indices,
                  ...(vertexNormals ? { vertexNormals } : {}),
                });
              }
            }
          }
        }

        table.push({
          meshId,
          id,
          vertices,
          faces,
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
  /**
   * 画像情報テーブル (pictureImageTable) の変換
   */
  private convertPictureImageTable(legacyImageInfos?: any): PictureImageItem[] {
    if (!legacyImageInfos) return [];
    const list = Array.isArray(legacyImageInfos) ? legacyImageInfos : [legacyImageInfos];
    const result: PictureImageItem[] = [];

    for (const info of list) {
      if (info && info.ImageBase64ID !== undefined && info.ImageBase64) {
        const id = parseInt(String(info.ImageBase64ID), 10);
        if (!isNaN(id)) {
          result.push({
            id,
            imageBase64: String(info.ImageBase64).trim(),
          });
        }
      }
    }
    return result;
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

  private parseVector3FromObjOrStr(val: any, defaultVal: Vector3 = { x: 0, y: 0, z: 0 }): Vector3 {
    if (!val) return defaultVal;
    if (typeof val === 'string') {
      try {
        return this.parseVector3(val, defaultVal);
      } catch {
        return defaultVal;
      }
    }
    if (typeof val === 'object') {
      const x = parseFloat(val.X ?? val.x ?? '0');
      const y = parseFloat(val.Y ?? val.y ?? '0');
      const z = parseFloat(val.Z ?? val.z ?? '0');
      return {
        x: isNaN(x) ? defaultVal.x : x,
        y: isNaN(y) ? defaultVal.y : y,
        z: isNaN(z) ? defaultVal.z : z,
      };
    }
    return defaultVal;
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

  private parseColorRGBA(str?: string, defaultVal: ColorRGBA = { r: 0.8, g: 0.8, b: 0.8, a: 1 }): ColorRGBA {
    if (!str) return defaultVal;
    const parts = str.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length < 3 || parts.some((n) => isNaN(n))) {
      return defaultVal;
    }
    return {
      r: Math.min(Math.max(parts[0], 0), 1),
      g: Math.min(Math.max(parts[1], 0), 1),
      b: Math.min(Math.max(parts[2], 0), 1),
      a: parts.length >= 4 && !isNaN(parts[3]) ? Math.min(Math.max(parts[3], 0), 1) : 1,
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
    if (!str || str === 'Non') return defaults;
    const parts = str.split(',').map((s) => parseFloat(s.trim()));
    if (parts.length === 8 && parts.every((n) => !isNaN(n))) {
      return parts;
    }
    return defaults;
  }

  /**
   * CutValue (角度) および RoundValue (R面取り) から V4 edgeCuts 配列を生成
   */
  private parseEdgeCuts(
    cutValueStr?: string,
    roundValueStr?: string,
    _roundModesStr?: string,
    size?: Vector3
  ): EdgeCut[] | undefined {
    const edgeCuts: EdgeCut[] = [];

    // 1. 斜め留め切り (CutValue)
    if (cutValueStr && cutValueStr !== 'Non') {
      const cutAngles = cutValueStr.split(',').map((s) => parseFloat(s.trim()));
      if (cutAngles.length >= 8 && size) {
        // 始端側マイター (インデックス0): 正なら edge 4 (手前右)、負なら edge 6 (手前左)
        if (cutAngles[0] !== 0 && !isNaN(cutAngles[0])) {
          const deg = Math.abs(cutAngles[0]);
          const faceADist = size.x;
          const faceBDist = size.x * Math.tan((deg * Math.PI) / 180);
          const edgeIndex = cutAngles[0] > 0 ? 4 : 6;
          edgeCuts.push({
            edgeIndex,
            mode: 'cut',
            faceADist,
            faceBDist,
          });
        }
        // 始端側ベベル (インデックス1): 正なら edge 2 (下面奥)、負なら edge 0 (下面手前)
        if (cutAngles[1] !== 0 && !isNaN(cutAngles[1])) {
          const deg = Math.abs(cutAngles[1]);
          const faceADist = size.y;
          const faceBDist = size.y * Math.tan((deg * Math.PI) / 180);
          if (cutAngles[1] > 0) {
            edgeCuts.push({ edgeIndex: 2, mode: 'cut', faceADist, faceBDist });
          } else {
            edgeCuts.push({ edgeIndex: 0, mode: 'cut', faceADist, faceBDist });
            // 両端ベベル (-Z/-X) の場合
            if (cutAngles[3] < 0) {
              edgeCuts.push({ edgeIndex: 3, mode: 'cut', faceADist, faceBDist });
            }
          }
        }
        // 終端側マイター (インデックス2): 正なら edge 5 (奥右)、負なら edge 7 (奥左)
        if (cutAngles[2] !== 0 && !isNaN(cutAngles[2])) {
          const deg = Math.abs(cutAngles[2]);
          const faceADist = size.x;
          const faceBDist = size.x * Math.tan((deg * Math.PI) / 180);
          const edgeIndex = cutAngles[2] > 0 ? 5 : 7;
          edgeCuts.push({
            edgeIndex,
            mode: 'cut',
            faceADist,
            faceBDist,
          });
        }
        // 長辺傾斜カット (インデックス6): 負なら edge 7 (奥左)、正なら edge 5 (奥右)
        if (cutAngles[6] !== 0 && !isNaN(cutAngles[6])) {
          const deg = Math.abs(cutAngles[6]);
          const faceBDist = size.z;
          const faceADist = size.z * Math.tan((deg * Math.PI) / 180);
          const edgeIndex = cutAngles[6] < 0 ? 7 : 5;
          edgeCuts.push({
            edgeIndex,
            mode: 'cut',
            faceADist,
            faceBDist,
          });
        }
      }
    }

    // 2. R面取り / ラウンド加工 (RoundValue)
    if (roundValueStr && roundValueStr !== 'Non') {
      const rounds = roundValueStr.split(',').map((s) => parseFloat(s.trim()));
      // 4要素: [0 -> edge 4 (手前右), 1 -> edge 6 (手前左), 2 -> edge 7 (奥左), 3 -> edge 5 (奥右)]
      if (rounds.length >= 4) {
        const edgeMap: Record<number, number> = { 0: 4, 1: 6, 2: 7, 3: 5 };
        rounds.forEach((val, idx) => {
          if (!isNaN(val) && val > 0) {
            const edgeIndex = edgeMap[idx] !== undefined ? edgeMap[idx] : idx + 4;
            edgeCuts.push({
              edgeIndex,
              mode: 'round',
              faceADist: val,
              faceBDist: val,
              radius: val,
            });
          }
        });
      }
    }

    return edgeCuts.length > 0 ? edgeCuts : undefined;
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
