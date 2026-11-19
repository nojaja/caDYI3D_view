import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ModelBuilder } from '../../src/builder/ModelBuilder';
import { LayerManager } from '../../src/core/LayerManager';
import { Cadiy4Data } from '../../src/types/cadiy4';
import * as fs from 'fs';
import * as path from 'path';

describe('ModelBuilder & LayerManager - 初期可視性と描画制御', () => {
  it('初期非表示レイヤー・親非表示レイヤー・個別非表示のオブジェクトが初期構築時点で visible: false となること', () => {
    const testDataPath = path.resolve(__dirname, '../data/nested_layers_test.cadiy4');
    const testModelData: Cadiy4Data = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));

    const layerManager = new LayerManager();
    layerManager.init(testModelData.layers, testModelData.objects);

    const builder = new ModelBuilder();
    // 可視性判定関数を渡して構築できること
    const group = builder.build(testModelData.objects, (objId) => layerManager.isObjectVisible(objId));

    let objVisibleMesh: THREE.Object3D | null = null;
    let objGrandchildVisibleMesh: THREE.Object3D | null = null;
    let objL6HiddenMesh: THREE.Object3D | null = null;
    let objGrandchildCascadeHiddenMesh: THREE.Object3D | null = null;
    let objDirectHiddenMesh: THREE.Object3D | null = null;

    group.traverse((child) => {
      const obj = child.userData?.cadiyObject;
      if (obj) {
        if (obj.id === 'legacy-1102') objVisibleMesh = child;
        if (obj.id === 'obj-grandchild-visible') objGrandchildVisibleMesh = child;
        if (obj.id === 'legacy-1498') objL6HiddenMesh = child;
        if (obj.id === 'obj-grandchild-cascade-hidden') objGrandchildCascadeHiddenMesh = child;
        if (obj.id === 'obj-direct-hidden') objDirectHiddenMesh = child;
      }
    });

    expect(objVisibleMesh).not.toBeNull();
    expect(objGrandchildVisibleMesh).not.toBeNull();
    expect(objL6HiddenMesh).not.toBeNull();
    expect(objGrandchildCascadeHiddenMesh).not.toBeNull();
    expect(objDirectHiddenMesh).not.toBeNull();

    // 表示レイヤーのオブジェクトは visible: true
    expect(objVisibleMesh!.visible).toBe(true);
    expect(objGrandchildVisibleMesh!.visible).toBe(true);

    // 初期非表示レイヤー(6)のオブジェクトは visible: false
    expect(objL6HiddenMesh!.visible).toBe(false);

    // 親レイヤー(6)が非表示のカスケード非表示孫オブジェクトは visible: false
    expect(objGrandchildCascadeHiddenMesh!.visible).toBe(false);

    // オブジェクト自身が非表示のものは visible: false
    expect(objDirectHiddenMesh!.visible).toBe(false);
  });
});