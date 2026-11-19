import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { PolygonBuilder } from '../../src/builder/PolygonBuilder';
import { PolygonObject, PolygonMeshItem } from '../../src/types/cadiy4';
import * as fs from 'fs';
import * as path from 'path';

describe('PolygonBuilder', () => {
  it('単純な三角形メッシュからBufferGeometryを正しく生成し、cmからmへスケール変換すること', () => {
    const builder = new PolygonBuilder();
    const meshItem: PolygonMeshItem = {
      meshId: 'test-triangle',
      vertices: [
        { x: 0, y: 0, z: 0 },
        { x: 100, y: 0, z: 0 }, // 100cm = 1.0m
        { x: 0, y: 100, z: 0 }, // 100cm = 1.0m
      ],
      faces: [
        { indices: [0, 1, 2] },
      ],
    };

    builder.setPolygonMeshTable([meshItem]);

    const polyObj: PolygonObject = {
      id: 'poly-1',
      name: 'Triangle',
      type: 'polygon',
      meshRef: 'test-triangle',
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      size: { x: 1.0, y: 1.0, z: 0.1 },
      color: { r: 0.5, g: 0.5, b: 0.5 },
      visible: true,
    };

    const geometry = builder.buildGeometry(polyObj);
    expect(geometry).not.toBeNull();
    expect(geometry).toBeInstanceOf(THREE.BufferGeometry);

    const positions = geometry!.getAttribute('position');
    expect(positions).toBeDefined();
    expect(positions.count).toBe(3); // 1 face * 3 vertices

    // 頂点座標のスケール検証 (100cm -> 1.0m)
    expect(positions.getX(1)).toBeCloseTo(1.0);
    expect(positions.getY(2)).toBeCloseTo(1.0);

    // バウンディングボックスの検証
    geometry!.computeBoundingBox();
    const bb = geometry!.boundingBox!;
    expect(bb.max.x).toBeCloseTo(1.0);
    expect(bb.max.y).toBeCloseTo(1.0);
    expect(bb.min.x).toBeCloseTo(0.0);
  });

  it('四角形面 (quad) を2つの三角形に分割して描画できること', () => {
    const builder = new PolygonBuilder();
    const meshItem: PolygonMeshItem = {
      meshId: 'test-quad',
      vertices: [
        { x: 0, y: 0, z: 0 },
        { x: 50, y: 0, z: 0 },
        { x: 50, y: 50, z: 0 },
        { x: 0, y: 50, z: 0 },
      ],
      faces: [
        { indices: [0, 1, 2, 3] }, // 4 vertices
      ],
    };

    builder.setPolygonMeshTable([meshItem]);

    const polyObj: PolygonObject = {
      id: 'poly-quad',
      name: 'Quad',
      type: 'polygon',
      meshRef: 'test-quad',
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      size: { x: 0.5, y: 0.5, z: 0 },
      color: { r: 1, g: 1, b: 1 },
      visible: true,
    };

    const geometry = builder.buildGeometry(polyObj);
    expect(geometry).not.toBeNull();

    const positions = geometry!.getAttribute('position');
    expect(positions.count).toBe(6); // 2 triangles * 3 vertices = 6 vertices
  });

  it('vertexNormals が指定されている場合に法線属性が正しく設定されること', () => {
    const builder = new PolygonBuilder();
    const meshItem: PolygonMeshItem = {
      meshId: 'test-normals',
      vertices: [
        { x: 0, y: 0, z: 0 },
        { x: 10, y: 0, z: 0 },
        { x: 0, y: 10, z: 0 },
      ],
      faces: [
        {
          indices: [0, 1, 2],
          vertexNormals: [
            { x: 0, y: 0, z: 1 },
            { x: 0, y: 0, z: 1 },
            { x: 0, y: 0, z: 1 },
          ],
        },
      ],
    };

    builder.setPolygonMeshTable([meshItem]);

    const polyObj: PolygonObject = {
      id: 'poly-norm',
      name: 'Normals',
      type: 'polygon',
      meshRef: 'test-normals',
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      size: { x: 0.1, y: 0.1, z: 0 },
      color: { r: 1, g: 1, b: 1 },
      visible: true,
    };

    const geometry = builder.buildGeometry(polyObj);
    expect(geometry).not.toBeNull();

    const normals = geometry!.getAttribute('normal');
    expect(normals).toBeDefined();
    expect(normals.count).toBe(3);
    expect(normals.getZ(0)).toBeCloseTo(1.0);
    expect(normals.getZ(1)).toBeCloseTo(1.0);
    expect(normals.getZ(2)).toBeCloseTo(1.0);
  });

  it('オブジェクト辞書形式の polygonMeshTable に対応すること', () => {
    const builder = new PolygonBuilder();
    builder.setPolygonMeshTable({
      'mesh-dict-key': {
        vertices: [
          { x: 0, y: 0, z: 0 },
          { x: 20, y: 0, z: 0 },
          { x: 0, y: 20, z: 0 },
        ],
        faces: [{ indices: [0, 1, 2] }],
      },
    });

    const polyObj: PolygonObject = {
      id: 'poly-dict',
      name: 'DictKey',
      type: 'polygon',
      meshRef: 'mesh-dict-key',
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      size: { x: 0.2, y: 0.2, z: 0 },
      color: { r: 1, g: 1, b: 1 },
      visible: true,
    };

    const geometry = builder.buildGeometry(polyObj);
    expect(geometry).not.toBeNull();
    expect(geometry!.getAttribute('position').count).toBe(3);
  });

  it('オブジェクト自身に vertices / faces が存在する場合にもジオメトリを生成できること', () => {
    const builder = new PolygonBuilder();
    const polyObj: PolygonObject = {
      id: 'poly-direct',
      name: 'DirectMesh',
      type: 'polygon',
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      size: { x: 0.3, y: 0.3, z: 0 },
      color: { r: 1, g: 1, b: 1 },
      visible: true,
      vertices: [
        { x: 0, y: 0, z: 0 },
        { x: 30, y: 0, z: 0 },
        { x: 0, y: 30, z: 0 },
      ],
      faces: [{ indices: [0, 1, 2] }],
    };

    const geometry = builder.buildGeometry(polyObj);
    expect(geometry).not.toBeNull();
    expect(geometry!.getAttribute('position').count).toBe(3);
  });

  it('009.cadiy4 の実際の polygonMeshTable から全5種のメッシュが正確に生成されること', () => {
    const filePath = path.resolve(__dirname, '../data/009.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    const builder = new PolygonBuilder();
    builder.setPolygonMeshTable(data.polygonMeshTable);

    const polyObjects = data.objects.filter((o: any) => o.type === 'polygon');
    expect(polyObjects.length).toBe(59);

    // 1. 羽子板付 沓石 240
    const katsuishi = polyObjects.find((o: any) => o.name === '羽子板付 沓石 240');
    expect(katsuishi).toBeDefined();
    const katsuGeo = builder.buildGeometry(katsuishi);
    expect(katsuGeo).not.toBeNull();

    katsuGeo!.computeBoundingBox();
    const katsuBb = katsuGeo!.boundingBox!;
    // dx ≈ 0.23m, dz ≈ 0.23m, dy ≈ 0.325m (金具含む)
    expect(katsuBb.max.x - katsuBb.min.x).toBeCloseTo(0.23, 2);
    expect(katsuBb.max.z - katsuBb.min.z).toBeCloseTo(0.23, 2);
    expect(katsuBb.max.y - katsuBb.min.y).toBeCloseTo(0.325, 2);

    // 2. 単管自在クランプ
    const jizai = polyObjects.find((o: any) => o.name === '単管自在クランプ');
    expect(jizai).toBeDefined();
    const jizaiGeo = builder.buildGeometry(jizai);
    expect(jizaiGeo).not.toBeNull();
    jizaiGeo!.computeBoundingBox();
    const jizaiBb = jizaiGeo!.boundingBox!;
    expect(jizaiBb.max.x - jizaiBb.min.x).toBeCloseTo(0.0844, 2);
    expect(jizaiBb.max.y - jizaiBb.min.y).toBeCloseTo(0.053, 2);
    expect(jizaiBb.max.z - jizaiBb.min.z).toBeCloseTo(0.0665, 2);

    // 3. 全59個の polygon オブジェクトすべてで geometry が正常に生成されること
    for (const obj of polyObjects) {
      const geo = builder.buildGeometry(obj);
      expect(geo).not.toBeNull();
      expect(geo!.getAttribute('position').count).toBeGreaterThan(0);
    }
  });

  it('短いIDキー(例: "2")がパーツ名に含まれる数値(例: "架空パーツ 240")に誤って部分一致しないこと', () => {
    const builder = new PolygonBuilder();
    // メッシュテーブルには ID "2" (単管直交クランプ) のみ登録
    builder.setPolygonMeshTable([
      {
        meshId: '2',
        vertices: [
          { x: 0, y: 0, z: 0 },
          { x: 10, y: 0, z: 0 },
          { x: 0, y: 10, z: 0 },
        ],
        faces: [{ indices: [0, 1, 2] }],
      },
    ]);

    // 架空パーツ 240 は "2" が名前に含まれるが、meshRef は一致せずプリセットにも存在しない
    const dummyObj: PolygonObject = {
      id: 'dummy-1',
      name: '架空パーツ 240',
      type: 'polygon',
      meshRef: '架空パーツ 240',
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      size: { x: 0.23, y: 0.24, z: 0.23 },
      color: { r: 0.5, g: 0.5, b: 0.5 },
      visible: true,
    };

    // "2" に誤マッチせず、null (直方体フォールバック対象) を返すこと
    const geo = builder.buildGeometry(dummyObj);
    expect(geo).toBeNull();
  });

  it('標準プリセットメッシュ (羽子板付 沓石 240) が旧形式オブジェクトから正しく解決されメッシュ生成されること', () => {
    const builder = new PolygonBuilder();
    // プロジェクトのメッシュテーブルが空でも、標準プリセットから解決できること
    builder.setPolygonMeshTable([]);

    const legacyKatsuishi: PolygonObject = {
      id: 'legacy-54',
      name: '羽子板付 沓石 240',
      type: 'polygon',
      meshRef: '羽子板付 沓石 240',
      modelName: 'Concrete/Base-Stone With Paddle 240.dmesh',
      position: { x: 2.56, y: 0.12, z: 1.71 },
      quaternion: { x: 0, y: 1, z: 0, w: 0 },
      size: { x: 0.23, y: 0.24, z: 0.23 },
      color: { r: 0.498, g: 0.498, b: 0.498 },
      visible: true,
    };

    const geo = builder.buildGeometry(legacyKatsuishi);
    expect(geo).not.toBeNull();

    // ジオメトリ寸法の検証 (009.cadiy4 と同じ)
    geo!.computeBoundingBox();
    const bb = geo!.boundingBox!;
    expect(bb.max.x - bb.min.x).toBeCloseTo(0.23, 2);
    expect(bb.max.z - bb.min.z).toBeCloseTo(0.23, 2);
    expect(bb.max.y - bb.min.y).toBeCloseTo(0.325, 2); // 金物含む全高
  });
});
