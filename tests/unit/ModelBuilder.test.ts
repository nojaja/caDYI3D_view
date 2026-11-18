import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ModelBuilder } from '../../src/builder/ModelBuilder';
import { Cadiy4Parser } from '../../src/loader/Cadiy4Parser';
import * as fs from 'fs';
import * as path from 'path';

describe('ModelBuilder', () => {
  it('角材 (lumber) オブジェクトから正確なメッシュを生成すること', () => {
    const builder = new ModelBuilder();
    const lumberObj = {
      id: 'lumber-1',
      name: 'SPF 2x4',
      partName: '脚',
      type: 'lumber' as const,
      size: { x: 0.038, y: 0.089, z: 0.5 },
      position: { x: 0.1, y: 0.25, z: -0.3 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      color: { r: 0.9, g: 0.8, b: 0.6 },
      visible: true
    };

    const group = builder.build([lumberObj]);
    expect(group.children).toHaveLength(1);

    const mesh = group.children[0] as THREE.Mesh;
    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.position.x).toBeCloseTo(0.1);
    expect(mesh.position.y).toBeCloseTo(0.25);
    expect(mesh.position.z).toBeCloseTo(-0.3);

    // バウンディングボックスの検証
    mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox!;
    expect(bb.max.x - bb.min.x).toBeCloseTo(0.038);
    expect(bb.max.y - bb.min.y).toBeCloseTo(0.089);
    expect(bb.max.z - bb.min.z).toBeCloseTo(0.5);

    // マテリアル色の検証
    const material = mesh.material as THREE.MeshStandardMaterial;
    expect(material.color.r).toBeCloseTo(0.9);
    expect(material.color.g).toBeCloseTo(0.8);
    expect(material.color.b).toBeCloseTo(0.6);
  });

  it('test_rack.cadiy4 の全オブジェクトをグループとして構築できること', () => {
    const filePath = path.resolve(__dirname, '../data/test_rack.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    const builder = new ModelBuilder();
    const group = builder.build(data.objects);

    // test_rack の object 数と生成メッシュ数が一致すること
    expect(group.children.length).toBe(data.objects.length);
  });

  it('visible: false のパーツは非表示設定になること', () => {
    const builder = new ModelBuilder();
    const hiddenObj = {
      id: 'hidden-1',
      name: '隠し板',
      type: 'board' as const,
      size: { x: 0.2, y: 0.015, z: 0.4 },
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      color: { r: 1, g: 1, b: 1 },
      visible: false
    };

    const group = builder.build([hiddenObj]);
    const mesh = group.children[0] as THREE.Mesh;
    expect(mesh.visible).toBe(false);
  });
});
