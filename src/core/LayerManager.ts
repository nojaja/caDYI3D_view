import { LayerData, CadiyObject } from '../types/cadiy4';

export interface LayerTreeNode {
  layer: LayerData;
  isExpanded: boolean;
  depth: number;
  objects: CadiyObject[];
  children: LayerTreeNode[];
}

export type LayerVisibilityChangeListener = (layerId: number, visible: boolean) => void;
export type ObjectSelectListener = (objectId: string | null) => void;

export class LayerManager {
  private layers: Map<number, LayerData> = new Map();
  private expandedMap: Map<number, boolean> = new Map();
  private objectsByLayer: Map<number, CadiyObject[]> = new Map();
  private objectMap: Map<string, CadiyObject> = new Map();
  private selectedObjectId: string | null = null;
  private onVisibilityChangeCallbacks: LayerVisibilityChangeListener[] = [];
  private onSelectCallbacks: ObjectSelectListener[] = [];

  /**
   * レイヤー情報とオブジェクト一覧で初期化
   */
  public init(layers: LayerData[] = [], objects: CadiyObject[] = []): void {
    this.layers.clear();
    this.expandedMap.clear();
    this.objectsByLayer.clear();
    this.objectMap.clear();
    this.selectedObjectId = null;

    // レイヤーの登録
    if (layers.length > 0) {
      for (const layer of layers) {
        this.layers.set(layer.id, { ...layer });
        this.expandedMap.set(layer.id, false); // 初期表示時は全閉(collapsed)
        this.objectsByLayer.set(layer.id, []);
      }
    } else {
      // レイヤー未定義時のデフォルトレイヤー
      const defaultLayer: LayerData = {
        id: 0,
        name: 'デフォルトレイヤー',
        visible: true,
        locked: false,
        parentId: null,
      };
      this.layers.set(0, defaultLayer);
      this.expandedMap.set(0, false);
      this.objectsByLayer.set(0, []);
    }

    // オブジェクトの振り分け
    for (const obj of objects) {
      this.objectMap.set(obj.id, obj);
      const layerId = obj.layerId !== undefined && this.layers.has(obj.layerId) ? obj.layerId : 0;
      if (!this.objectsByLayer.has(layerId)) {
        this.objectsByLayer.set(layerId, []);
      }
      this.objectsByLayer.get(layerId)!.push(obj);
    }
  }

  /**
   * サブフォルダを含むn段の階層ツリー構造の取得
   */
  public getTree(): LayerTreeNode[] {
    const nodeMap = new Map<number, LayerTreeNode>();

    // 1. 全レイヤーのノードを作成
    for (const [id, layer] of this.layers.entries()) {
      nodeMap.set(id, {
        layer,
        isExpanded: this.expandedMap.get(id) ?? false,
        depth: 0,
        objects: this.objectsByLayer.get(id) ?? [],
        children: [],
      });
    }

    // 2. parentId に基づいて親子階層を構築
    const rootNodes: LayerTreeNode[] = [];

    for (const [id, layer] of this.layers.entries()) {
      const node = nodeMap.get(id)!;
      const parentId = layer.parentId;

      if (parentId !== null && parentId !== undefined && nodeMap.has(parentId)) {
        // 親が存在する場合、親の children に追加
        const parentNode = nodeMap.get(parentId)!;
        parentNode.children.push(node);
      } else {
        // ルートノード
        rootNodes.push(node);
      }
    }

    // 3. 深さ(depth)を再帰的に設定
    const assignDepth = (nodes: LayerTreeNode[], currentDepth: number) => {
      for (const n of nodes) {
        n.depth = currentDepth;
        if (n.children.length > 0) {
          assignDepth(n.children, currentDepth + 1);
        }
      }
    };
    assignDepth(rootNodes, 0);

    return rootNodes;
  }

  /**
   * レイヤー自体の表示設定を取得
   */
  public isLayerVisible(layerId: number): boolean {
    return this.layers.get(layerId)?.visible ?? true;
  }

  /**
   * 親・先祖レイヤーを含めた実効的な可視性を取得（親が非表示なら子も非表示）
   */
  public isLayerEffectivelyVisible(layerId: number): boolean {
    const layer = this.layers.get(layerId);
    if (!layer) return false;
    if (layer.visible === false) return false;

    // 先祖レイヤーをチェック
    let currentParentId = layer.parentId;
    while (currentParentId !== null && currentParentId !== undefined) {
      const parent = this.layers.get(currentParentId);
      if (!parent) break;
      if (parent.visible === false) return false;
      currentParentId = parent.parentId;
    }

    return true;
  }

  /**
   * レイヤー単位の表示/非表示を設定
   */
  public setLayerVisibility(layerId: number, visible: boolean): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    layer.visible = visible;
    for (const cb of this.onVisibilityChangeCallbacks) {
      cb(layerId, visible);
    }
  }

  /**
   * オブジェクトが表示状態か（所属レイヤーの実効可視性 & オブジェクト自身の可視性）
   */
  public isObjectVisible(objectId: string): boolean {
    const obj = this.objectMap.get(objectId);
    if (!obj) return false;
    if (obj.visible === false) return false;

    const layerId = obj.layerId !== undefined && this.layers.has(obj.layerId) ? obj.layerId : 0;
    return this.isLayerEffectivelyVisible(layerId);
  }

  /**
   * レイヤーの開閉状態を取得
   */
  public isLayerExpanded(layerId: number): boolean {
    return this.expandedMap.get(layerId) ?? false;
  }

  /**
   * レイヤーの開閉状態を設定
   */
  public setLayerExpanded(layerId: number, expanded: boolean): void {
    this.expandedMap.set(layerId, expanded);
  }

  /**
   * レイヤーの開閉トグル
   */
  public toggleLayerExpanded(layerId: number): void {
    const current = this.isLayerExpanded(layerId);
    this.setLayerExpanded(layerId, !current);
  }

  /**
   * オブジェクトの選択
   */
  public selectObject(objectId: string | null): void {
    this.selectedObjectId = objectId;
    if (objectId) {
      const obj = this.objectMap.get(objectId);
      if (obj && obj.layerId !== undefined) {
        // 選択されたオブジェクトが属するレイヤーおよびその祖先レイヤーをすべて自動展開
        let currentLayerId: number | null | undefined = obj.layerId;
        while (currentLayerId !== null && currentLayerId !== undefined) {
          this.setLayerExpanded(currentLayerId, true);
          const currentLayer = this.layers.get(currentLayerId);
          currentLayerId = currentLayer?.parentId;
        }
      }
    }
    for (const cb of this.onSelectCallbacks) {
      cb(objectId);
    }
  }

  public getSelectedObjectId(): string | null {
    return this.selectedObjectId;
  }

  public onVisibilityChange(listener: LayerVisibilityChangeListener): void {
    this.onVisibilityChangeCallbacks.push(listener);
  }

  public onSelect(listener: ObjectSelectListener): void {
    this.onSelectCallbacks.push(listener);
  }

  /**
   * 全オブジェクトIDの一覧を取得
   */
  public getAllObjectIds(): string[] {
    return Array.from(this.objectMap.keys());
  }

  /**
   * 全レイヤーIDの一覧を取得
   */
  public getAllLayerIds(): number[] {
    return Array.from(this.layers.keys());
  }
}
