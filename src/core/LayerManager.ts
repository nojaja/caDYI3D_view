import { LayerData, CadiyObject } from '../types/cadiy4';

export interface LayerTreeNode {
  layer: LayerData;
  isExpanded: boolean;
  objects: CadiyObject[];
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
        this.expandedMap.set(layer.id, true); // 初期状態は展開
        this.objectsByLayer.set(layer.id, []);
      }
    } else {
      // レイヤー未定義時のデフォルトレイヤー
      const defaultLayer: LayerData = {
        id: 0,
        name: 'デフォルトレイヤー',
        visible: true,
        locked: false,
      };
      this.layers.set(0, defaultLayer);
      this.expandedMap.set(0, true);
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
   * ツリー構造の取得
   */
  public getTree(): LayerTreeNode[] {
    const tree: LayerTreeNode[] = [];
    for (const [id, layer] of this.layers.entries()) {
      tree.push({
        layer,
        isExpanded: this.expandedMap.get(id) ?? true,
        objects: this.objectsByLayer.get(id) ?? [],
      });
    }
    return tree;
  }

  /**
   * レイヤーの表示状態を取得
   */
  public isLayerVisible(layerId: number): boolean {
    return this.layers.get(layerId)?.visible ?? true;
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
   * オブジェクトが表示状態か（所属レイヤーの可視性に依存）
   */
  public isObjectVisible(objectId: string): boolean {
    const obj = this.objectMap.get(objectId);
    if (!obj) return false;
    const layerId = obj.layerId !== undefined ? obj.layerId : 0;
    return this.isLayerVisible(layerId);
  }

  /**
   * レイヤーの開閉状態を取得
   */
  public isLayerExpanded(layerId: number): boolean {
    return this.expandedMap.get(layerId) ?? true;
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
        // 選択されたオブジェクトが属するレイヤーを自動展開
        this.setLayerExpanded(obj.layerId, true);
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
}
