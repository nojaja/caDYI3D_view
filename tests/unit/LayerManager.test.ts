import { describe, it, expect } from 'vitest';
import { LayerManager } from '../../src/core/LayerManager';
import { LayerData, CadiyObject } from '../../src/types/cadiy4';
import * as fs from 'fs';
import * as path from 'path';

describe('LayerManager - レイヤー一覧・階層ツリー・表示制御', () => {
  const dummyLayers: LayerData[] = [
    { id: 0, name: '基本フレーム', visible: true, locked: false, parentId: null },
    { id: 1, name: 'サブフレーム', visible: true, locked: false, parentId: 0 },
    { id: 2, name: '孫フォルダ', visible: true, locked: false, parentId: 1 },
    { id: 3, name: '非表示親', visible: false, locked: false, parentId: null },
    { id: 4, name: '非表示親の子', visible: true, locked: false, parentId: 3 },
  ];

  const dummyObjects: CadiyObject[] = [
    {
      id: 'obj-root',
      name: '柱ルート',
      type: 'lumber',
      layerId: 0,
      visible: true,
      position: { x: 0, y: 0, z: 0 },
      size: { x: 0.1, y: 0.1, z: 1.0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      color: { r: 1, g: 1, b: 1 },
    },
    {
      id: 'obj-sub',
      name: '梁サブ',
      type: 'lumber',
      layerId: 1,
      visible: true,
      position: { x: 0.5, y: 0, z: 0 },
      size: { x: 0.1, y: 0.1, z: 1.0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      color: { r: 1, g: 1, b: 1 },
    },
    {
      id: 'obj-grandchild',
      name: '孫パーツ',
      type: 'board',
      layerId: 2,
      visible: true,
      position: { x: 0.25, y: 0.5, z: 0 },
      size: { x: 0.4, y: 0.02, z: 0.3 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      color: { r: 1, g: 1, b: 1 },
    },
    {
      id: 'obj-under-hidden-parent',
      name: '非表示親配下のパーツ',
      type: 'board',
      layerId: 4,
      visible: true,
      position: { x: 0, y: 1, z: 0 },
      size: { x: 0.1, y: 0.1, z: 0.1 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      color: { r: 1, g: 0, b: 0 },
    },
    {
      id: 'obj-self-hidden',
      name: '個別非表示パーツ',
      type: 'board',
      layerId: 0,
      visible: false,
      position: { x: 0, y: 0, z: 0 },
      size: { x: 0.1, y: 0.1, z: 0.1 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      color: { r: 1, g: 1, b: 1 },
    },
  ];

  it('サブフォルダを含むn段の階層ツリー構造（children, depth）を生成できること', () => {
    const manager = new LayerManager();
    manager.init(dummyLayers, dummyObjects);

    const tree = manager.getTree();
    // ルートレベルのレイヤーは id: 0 と id: 3 の2つ
    expect(tree).toHaveLength(2);

    // ルートレイヤー0
    const root0 = tree[0];
    expect(root0.layer.id).toBe(0);
    expect(root0.depth).toBe(0);
    expect(root0.objects).toHaveLength(2); // obj-root, obj-self-hidden
    expect(root0.children).toHaveLength(1);

    // 子レイヤー1
    const child1 = root0.children[0];
    expect(child1.layer.id).toBe(1);
    expect(child1.depth).toBe(1);
    expect(child1.objects).toHaveLength(1); // obj-sub
    expect(child1.children).toHaveLength(1);

    // 孫レイヤー2
    const grandChild2 = child1.children[0];
    expect(grandChild2.layer.id).toBe(2);
    expect(grandChild2.depth).toBe(2);
    expect(grandChild2.objects).toHaveLength(1); // obj-grandchild
    expect(grandChild2.children).toHaveLength(0);

    // ルートレイヤー3（非表示親）
    const root3 = tree[1];
    expect(root3.layer.id).toBe(3);
    expect(root3.depth).toBe(0);
    expect(root3.children).toHaveLength(1);
    expect(root3.children[0].layer.id).toBe(4);
    expect(root3.children[0].depth).toBe(1);
  });

  it('初期表示時はレイヤーツリーがすべて閉じていること (isExpanded: false)', () => {
    const manager = new LayerManager();
    manager.init(dummyLayers, dummyObjects);

    // 初期状態はすべてのレイヤーが折りたたまれている（false）
    expect(manager.isLayerExpanded(0)).toBe(false);
    expect(manager.isLayerExpanded(1)).toBe(false);
    expect(manager.isLayerExpanded(2)).toBe(false);
    expect(manager.isLayerExpanded(3)).toBe(false);
    expect(manager.isLayerExpanded(4)).toBe(false);

    const tree = manager.getTree();
    expect(tree[0].isExpanded).toBe(false);
    expect(tree[0].children[0].isExpanded).toBe(false);
  });

  it('レイヤー開閉のトグル操作ができること', () => {
    const manager = new LayerManager();
    manager.init(dummyLayers, dummyObjects);

    expect(manager.isLayerExpanded(0)).toBe(false);
    manager.toggleLayerExpanded(0);
    expect(manager.isLayerExpanded(0)).toBe(true);
    manager.toggleLayerExpanded(0);
    expect(manager.isLayerExpanded(0)).toBe(false);
  });

  it('親レイヤーが非表示の場合、配下の子レイヤー所属オブジェクトも非表示と判定されること（カスケード可視性）', () => {
    const manager = new LayerManager();
    manager.init(dummyLayers, dummyObjects);

    // レイヤー3は初期 visible: false
    expect(manager.isLayerVisible(3)).toBe(false);
    // レイヤー4自体は visible: true だが親(3)が非表示なので実効可視性は false
    expect(manager.isLayerEffectivelyVisible(4)).toBe(false);
    expect(manager.isObjectVisible('obj-under-hidden-parent')).toBe(false);

    // オブジェクト自身が visible: false の場合も非表示
    expect(manager.isObjectVisible('obj-self-hidden')).toBe(false);

    // 表示レイヤーのオブジェクトは表示
    expect(manager.isObjectVisible('obj-root')).toBe(true);
    expect(manager.isObjectVisible('obj-sub')).toBe(true);
    expect(manager.isObjectVisible('obj-grandchild')).toBe(true);

    // 親レイヤー0を非表示にすると、子レイヤー1, 孫レイヤー2のオブジェクトも非表示になる
    manager.setLayerVisibility(0, false);
    expect(manager.isLayerEffectivelyVisible(0)).toBe(false);
    expect(manager.isLayerEffectivelyVisible(1)).toBe(false);
    expect(manager.isLayerEffectivelyVisible(2)).toBe(false);
    expect(manager.isObjectVisible('obj-root')).toBe(false);
    expect(manager.isObjectVisible('obj-sub')).toBe(false);
    expect(manager.isObjectVisible('obj-grandchild')).toBe(false);
  });

  it('深い階層のオブジェクトを選択した際、祖先レイヤーがすべて自動展開されること', () => {
    const manager = new LayerManager();
    manager.init(dummyLayers, dummyObjects);

    // 初期状態はすべて閉じている
    expect(manager.isLayerExpanded(0)).toBe(false);
    expect(manager.isLayerExpanded(1)).toBe(false);
    expect(manager.isLayerExpanded(2)).toBe(false);

    // 孫レイヤー(2)に属する obj-grandchild を選択
    manager.selectObject('obj-grandchild');
    expect(manager.getSelectedObjectId()).toBe('obj-grandchild');

    // 祖先レイヤー(0, 1)および当該レイヤー(2)がすべて自動展開されること
    expect(manager.isLayerExpanded(0)).toBe(true);
    expect(manager.isLayerExpanded(1)).toBe(true);
    expect(manager.isLayerExpanded(2)).toBe(true);
  });

  it('実例から切り出した nested_layers_test.cadiy4 を読み込み、階層構造と初期可視性が正しく反映されること', () => {
    const testDataPath = path.resolve(__dirname, '../data/nested_layers_test.cadiy4');
    const rawData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));

    const manager = new LayerManager();
    manager.init(rawData.layers, rawData.objects);

    const tree = manager.getTree();
    // トップレベルは 建物ルート(0) と 独立ルートフォルダ(99)
    expect(tree).toHaveLength(2);
    expect(tree[0].layer.name).toBe('建物ルート');
    expect(tree[1].layer.name).toBe('独立ルートフォルダ');

    // 初期状態は全閉
    expect(tree[0].isExpanded).toBe(false);
    expect(tree[1].isExpanded).toBe(false);

    // 子レイヤー（基礎柱&根太: 1, 内壁-天井: 6）
    expect(tree[0].children).toHaveLength(2);
    const l1 = tree[0].children.find((c) => c.layer.id === 1)!;
    const l6 = tree[0].children.find((c) => c.layer.id === 6)!;
    expect(l1).toBeDefined();
    expect(l6).toBeDefined();

    // 孫レイヤー
    expect(l1.children).toHaveLength(1);
    expect(l1.children[0].layer.id).toBe(10); // 基礎金具
    expect(l6.children).toHaveLength(1);
    expect(l6.children[0].layer.id).toBe(60); // 天井下地

    // 可視性チェック
    // 基礎柱&根太 (1): 表示
    expect(manager.isObjectVisible('legacy-1102')).toBe(true);
    expect(manager.isObjectVisible('obj-grandchild-visible')).toBe(true);

    // 内壁-天井 (6): 初期非表示
    expect(manager.isLayerVisible(6)).toBe(false);
    expect(manager.isObjectVisible('legacy-1498')).toBe(false);

    // 天井下地 (60): 親が非表示なので不可視
    expect(manager.isLayerEffectivelyVisible(60)).toBe(false);
    expect(manager.isObjectVisible('obj-grandchild-cascade-hidden')).toBe(false);

    // 個別非表示オブジェクト
    expect(manager.isObjectVisible('obj-direct-hidden')).toBe(false);
  });
});