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

  it('testdata/002.cadiy4 の形状加工(edgeCuts)付き合板を正確な形状ジオメトリとして構築できること', () => {
    const filePath = path.resolve(__dirname, '../../testdata/002.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    const builder = new ModelBuilder();
    const group = builder.build(data.objects);

    expect(group.children).toHaveLength(1);
    const mesh = group.children[0] as THREE.Mesh;
    expect(mesh).toBeInstanceOf(THREE.Mesh);

    const obj = data.objects[0];
    expect(obj.type).toBe('board');
    expect((obj as any).edgeCuts).toHaveLength(1);
    expect((obj as any).edgeCuts[0]).toEqual({
      edgeIndex: 7,
      mode: 'cut',
      faceADist: 0.7925,
      faceBDist: 0.1985,
    });

    // edgeCuts が適用されたジオメトリの検証
    // 単なる 8 頂点の直方体 (BoxGeometry: 6面) ではなく、斜めカット面が加わったジオメトリであること
    const geometry = mesh.geometry;
    expect(geometry).toBeDefined();

    // BoxGeometry のデフォルトの index 数 (36 = 12三角形) ではない、または頂点構造がカットされていること
    // カットにより面数・頂点数が増加している
    const indexCount = geometry.index ? geometry.index.count : geometry.attributes.position.count;
    expect(indexCount).toBeGreaterThan(36);

    // ジオメトリの境界ボックス検証
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox!;
    expect(bb.max.x - bb.min.x).toBeCloseTo(0.91, 2);
    expect(bb.max.y - bb.min.y).toBeCloseTo(0.009, 3);
    expect(bb.max.z - bb.min.z).toBeCloseTo(1.82, 2);

    // 3D空間において「上部(Y最大値側)」がカットされ、「下部(Y最小値側)」が長方形であることの検証
    mesh.updateMatrixWorld();
    const posAttr = geometry.attributes.position;
    const worldVertices: THREE.Vector3[] = [];
    for (let i = 0; i < posAttr.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
      v.applyMatrix4(mesh.matrixWorld);
      worldVertices.push(v);
    }

    // 床面(下部: Y < 0.1m)の頂点群: 全幅 910mm (-0.455 ~ +0.455) が存在すること
    const bottomVertices = worldVertices.filter(v => v.y < 0.1);
    const bottomMinX = Math.min(...bottomVertices.map(v => v.x));
    const bottomMaxX = Math.max(...bottomVertices.map(v => v.x));
    expect(bottomMinX).toBeCloseTo(-0.455, 2);
    expect(bottomMaxX).toBeCloseTo(0.455, 2); // 下部は左右両端まである

    // 天面(上部: Y > 1.8m)の頂点群: 右上角がカットされているため、天面(Y≈1.85m)のX最大値は -0.3375m 付近になる
    const topVertices = worldVertices.filter(v => v.y > 1.84);
    const topMaxX = Math.max(...topVertices.map(v => v.x));
    // 右端(0.455)まで達しておらず、0.7925m切り欠かれていること
    expect(topMaxX).toBeCloseTo(0.455 - 0.7925, 2);
  });
});
