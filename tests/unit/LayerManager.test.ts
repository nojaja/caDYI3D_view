import { describe, it, expect } from 'vitest';
import { LayerManager } from '../../src/core/LayerManager';
import { LayerData, CadiyObject } from '../../src/types/cadiy4';

describe('LayerManager - レイヤー一覧・階層ツリー・表示制御', () => {
  const dummyLayers: LayerData[] = [
    { id: 0, name: '基本フレーム', visible: true, locked: false },
    { id: 1, name: '棚板', visible: true, locked: false },
  ];

  const dummyObjects: CadiyObject[] = [
    {
      id: 'obj-1',
      name: '柱1',
      type: 'lumber',
      layerId: 0,
      visible: true,
      position: { x: 0, y: 0, z: 0 },
      size: { x: 0.1, y: 0.1, z: 1.0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      color: { r: 1, g: 1, b: 1 },
    },
    {
      id: 'obj-2',
      name: '柱2',
      type: 'lumber',
      layerId: 0,
      visible: true,
      position: { x: 0.5, y: 0, z: 0 },
      size: { x: 0.1, y: 0.1, z: 1.0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      color: { r: 1, g: 1, b: 1 },
    },
    {
      id: 'obj-3',
      name: '可動棚',
      type: 'board',
      layerId: 1,
      visible: true,
      position: { x: 0.25, y: 0.5, z: 0 },
      size: { x: 0.4, y: 0.02, z: 0.3 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      color: { r: 1, g: 1, b: 1 },
    },
  ];

  it('レイヤーとオブジェクトを関連付けたツリー構造を生成できること', () => {
    const manager = new LayerManager();
    manager.init(dummyLayers, dummyObjects);

    const tree = manager.getTree();
    expect(tree).toHaveLength(2);

    expect(tree[0].layer.id).toBe(0);
    expect(tree[0].layer.name).toBe('基本フレーム');
    expect(tree[0].objects).toHaveLength(2);
    expect(tree[0].objects[0].id).toBe('obj-1');
    expect(tree[0].objects[1].id).toBe('obj-2');

    expect(tree[1].layer.id).toBe(1);
    expect(tree[1].layer.name).toBe('棚板');
    expect(tree[1].objects).toHaveLength(1);
    expect(tree[1].objects[0].id).toBe('obj-3');
  });

  it('レイヤー単位で表示ON/OFFを切り替えると、所属するオブジェクトの可視性が更新されること', () => {
    const manager = new LayerManager();
    manager.init(dummyLayers, dummyObjects);

    // レイヤー0を非表示にする
    manager.setLayerVisibility(0, false);
    expect(manager.isLayerVisible(0)).toBe(false);
    expect(manager.isObjectVisible('obj-1')).toBe(false);
    expect(manager.isObjectVisible('obj-2')).toBe(false);

    // レイヤー1のオブジェクトは表示されたままであること
    expect(manager.isLayerVisible(1)).toBe(true);
    expect(manager.isObjectVisible('obj-3')).toBe(true);

    // 再度表示ONにする
    manager.setLayerVisibility(0, true);
    expect(manager.isLayerVisible(0)).toBe(true);
    expect(manager.isObjectVisible('obj-1')).toBe(true);
    expect(manager.isObjectVisible('obj-2')).toBe(true);
  });

  it('レイヤーフォルダの開閉(展開/折りたたみ)状態を切り替えられること', () => {
    const manager = new LayerManager();
    manager.init(dummyLayers, dummyObjects);

    // 初期状態は開いている (true)
    expect(manager.isLayerExpanded(0)).toBe(true);

    // 折りたたむ
    manager.toggleLayerExpanded(0);
    expect(manager.isLayerExpanded(0)).toBe(false);

    // 再度展開する
    manager.toggleLayerExpanded(0);
    expect(manager.isLayerExpanded(0)).toBe(true);
  });

  it('オブジェクトの選択状態を管理し、選択時に該当レイヤーが自動展開されること', () => {
    const manager = new LayerManager();
    manager.init(dummyLayers, dummyObjects);

    // レイヤー1を一旦折りたたむ
    manager.setLayerExpanded(1, false);
    expect(manager.isLayerExpanded(1)).toBe(false);

    // レイヤー1所属の obj-3 を選択
    manager.selectObject('obj-3');
    expect(manager.getSelectedObjectId()).toBe('obj-3');

    // 選択されたオブジェクトの所属レイヤーが自動展開されること
    expect(manager.isLayerExpanded(1)).toBe(true);

    // 選択解除
    manager.selectObject(null);
    expect(manager.getSelectedObjectId()).toBeNull();
  });
});
