import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { Viewer } from '../../src/core/Viewer';
import { Cadiy4Parser } from '../../src/loader/Cadiy4Parser';
import { CadiyObject } from '../../src/types/cadiy4';
import * as fs from 'fs';
import * as path from 'path';

describe('Viewer camera synchronization', () => {
  it('cadiy4 の camera 情報を正確に抽出できること', () => {
    const filePath = path.resolve(__dirname, '../data/test_rack.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    expect(data.camera.position.x).toBeCloseTo(0.8);
    expect(data.camera.position.y).toBeCloseTo(0.7);
    expect(data.camera.position.z).toBeCloseTo(0.9);
    expect(data.camera.target.x).toBeCloseTo(0);
    expect(data.camera.target.y).toBeCloseTo(0.25);
    expect(data.camera.target.z).toBeCloseTo(0);
  });
});

describe('Viewer - 非表示オブジェクトの3Dviewクリック除外判定', () => {
  it('isObjectVisibleInScene: オブジェクト自身または先祖が visible: false の場合、非表示と判定されること', () => {
    // Viewer インスタンスを作らずにメソッドをバインドしてテスト
    const isVisible = Viewer.prototype.isObjectVisibleInScene;

    const group = new THREE.Group();
    const subGroup = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());

    group.add(subGroup);
    subGroup.add(mesh);

    // 全て visible: true
    expect(isVisible.call({ currentModelGroup: group, scene: null } as any, mesh)).toBe(true);

    // mesh 自身が visible: false
    mesh.visible = false;
    expect(isVisible.call({ currentModelGroup: group, scene: null } as any, mesh)).toBe(false);

    // mesh は true だが subGroup が visible: false
    mesh.visible = true;
    subGroup.visible = false;
    expect(isVisible.call({ currentModelGroup: group, scene: null } as any, mesh)).toBe(false);

    // subGroup は true だが 最上位 group が visible: false
    subGroup.visible = true;
    group.visible = false;
    expect(isVisible.call({ currentModelGroup: group, scene: null } as any, mesh)).toBe(false);
  });

  it('getIntersectedObject: 手前のオブジェクトが非表示の場合、奥の表示オブジェクトが選択されること', () => {
    const frontObj: CadiyObject = {
      id: 'front-obj',
      name: '手前の木材',
      type: 'lumber',
      size: { x: 1, y: 1, z: 0.1 },
      position: { x: 0, y: 0, z: 1 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      visible: false,
    };

    const backObj: CadiyObject = {
      id: 'back-obj',
      name: '奥の木材',
      type: 'lumber',
      size: { x: 1, y: 1, z: 0.1 },
      position: { x: 0, y: 0, z: -1 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      visible: true,
    };

    const frontMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.1), new THREE.MeshBasicMaterial());
    frontMesh.position.set(0, 0, 1);
    frontMesh.visible = false;
    frontMesh.userData = { cadiyObject: frontObj };

    const backMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.1), new THREE.MeshBasicMaterial());
    backMesh.position.set(0, 0, -1);
    backMesh.visible = true;
    backMesh.userData = { cadiyObject: backObj };

    const modelGroup = new THREE.Group();
    modelGroup.add(frontMesh);
    modelGroup.add(backMesh);
    modelGroup.updateMatrixWorld(true);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(0, 0); // 中心

    const mockViewer = {
      currentModelGroup: modelGroup,
      camera,
      raycaster,
      mouse,
      isObjectVisibleInScene: Viewer.prototype.isObjectVisibleInScene,
      isObjectVisibleChecker: undefined,
    };

    // getIntersectedObject を実行
    const selected = Viewer.prototype.getIntersectedObject.call(mockViewer as any);

    // 手前の front-obj は非表示のため無視され、奥の back-obj が選択されること
    expect(selected).not.toBeNull();
    expect(selected?.id).toBe('back-obj');
  });

  it('getIntersectedObject: 全オブジェクトが非表示の場合、null が返ること', () => {
    const obj: CadiyObject = {
      id: 'hidden-obj',
      name: '非表示木材',
      type: 'lumber',
      size: { x: 1, y: 1, z: 1 },
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      visible: false,
    };

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    mesh.position.set(0, 0, 0);
    mesh.visible = false;
    mesh.userData = { cadiyObject: obj };

    const modelGroup = new THREE.Group();
    modelGroup.add(mesh);
    modelGroup.updateMatrixWorld(true);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(0, 0);

    const mockViewer = {
      currentModelGroup: modelGroup,
      camera,
      raycaster,
      mouse,
      isObjectVisibleInScene: Viewer.prototype.isObjectVisibleInScene,
      isObjectVisibleChecker: undefined,
    };

    const selected = Viewer.prototype.getIntersectedObject.call(mockViewer as any);
    expect(selected).toBeNull();
  });

  it('getIntersectedObject: isObjectVisibleChecker により非表示判定されたオブジェクトが除外されること', () => {
    const obj: CadiyObject = {
      id: 'layer-hidden-obj',
      name: 'レイヤー非表示木材',
      type: 'lumber',
      size: { x: 1, y: 1, z: 1 },
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      visible: true, // オブジェクト自体は visible: true だがチェッカーで false
    };

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
    mesh.position.set(0, 0, 0);
    mesh.visible = true;
    mesh.userData = { cadiyObject: obj };

    const modelGroup = new THREE.Group();
    modelGroup.add(mesh);
    modelGroup.updateMatrixWorld(true);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(0, 0);

    const mockViewer = {
      currentModelGroup: modelGroup,
      camera,
      raycaster,
      mouse,
      isObjectVisibleInScene: Viewer.prototype.isObjectVisibleInScene,
      isObjectVisibleChecker: (id: string) => id !== 'layer-hidden-obj',
    };

    const selected = Viewer.prototype.getIntersectedObject.call(mockViewer as any);
    expect(selected).toBeNull();
  });
});
