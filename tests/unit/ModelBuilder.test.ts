import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ModelBuilder } from '../../src/builder/ModelBuilder';
import { Cadiy4Parser } from '../../src/loader/Cadiy4Parser';
import { ModelLoader } from '../../src/loader/ModelLoader';
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

  it('002.cadiy4 の形状加工(edgeCuts)付き合板を正確な形状ジオメトリとして構築できること', () => {
    const filePath = path.resolve(__dirname, '../data/002.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    const builder = new ModelBuilder();
    const group = builder.build(data.objects);

    expect(group.children).toHaveLength(2);
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
    expect(bb.max.z - bb.min.z).toBeCloseTo(1.356, 2);

    // 3D空間において「上部左側(Xマイナス側)」がカットされ、「右上」が高く残っていることの検証
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
    expect(bottomMaxX).toBeCloseTo(0.455, 2);

    // 上部(Y > 1.2m): 右側(X > 0.3)は最高点 1.42m に達し、左側(X = -0.455)はカットされて約 1.22m であること
    const topVertices = worldVertices.filter(v => v.y > 1.2);
    const rightTopY = Math.max(...topVertices.filter(v => v.x > 0.3).map(v => v.y));
    const leftTopY = Math.max(...topVertices.filter(v => v.x < -0.4).map(v => v.y));
    expect(rightTopY).toBeCloseTo(1.42, 2);
    expect(leftTopY).toBeCloseTo(1.22, 2);
  });

  it('007.cadiy4 の斜めカット01・斜めカット02(edgeIndex: 4)のカット方向が正しく天板01の傾斜と整合すること', () => {
    const filePath = path.resolve(__dirname, '../data/007.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    const cut01Obj = data.objects.find(o => o.partName === '斜めカット01')!;
    const cut02Obj = data.objects.find(o => o.partName === '斜めカット02')!;
    const top01Obj = data.objects.find(o => o.partName === '天板01')!;

    expect(cut01Obj).toBeDefined();
    expect(cut02Obj).toBeDefined();
    expect(top01Obj).toBeDefined();

    const builder = new ModelBuilder();
    const group = builder.build([cut01Obj, cut02Obj, top01Obj]);

    const cut01Mesh = group.children[0] as THREE.Mesh;
    cut01Mesh.updateMatrixWorld();

    const posAttr = cut01Mesh.geometry.attributes.position;
    const worldVertices: THREE.Vector3[] = [];
    for (let i = 0; i < posAttr.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
      v.applyMatrix4(cut01Mesh.matrixWorld);
      worldVertices.push(v);
    }

    // 斜めカット01 (X: 約0.928m 〜 1.737m):
    // 本来は左(X小)が高く(Y約3.146m)、右(X大)が低くカット(Y約2.974m)され、天板01(左高3.15m〜右低2.98m)の下に乗る
    const leftVertices = worldVertices.filter(v => v.x < 1.0);
    const rightVertices = worldVertices.filter(v => v.x > 1.7);

    const leftMaxY = Math.max(...leftVertices.map(v => v.y));
    const rightMaxY = Math.max(...rightVertices.map(v => v.y));

    // 左側は高い(約 3.146m)
    expect(leftMaxY).toBeCloseTo(3.146, 2);
    // 右側は斜めカットにより低くなっていること(約 2.974m)。以前の左右逆バグでは右側が3.146mだった
    expect(rightMaxY).toBeCloseTo(2.974, 2);

    // 斜めカット02 (X: 約1.737m 〜 2.350m):
    // 斜めカット01の右隣。同様に左(X小)が高く、右(X大)が低くカットされて天板01の下に乗ること
    const cut02Mesh = group.children[1] as THREE.Mesh;
    cut02Mesh.updateMatrixWorld();
    const posAttr02 = cut02Mesh.geometry.attributes.position;
    const worldVertices02: THREE.Vector3[] = [];
    for (let i = 0; i < posAttr02.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(posAttr02, i);
      v.applyMatrix4(cut02Mesh.matrixWorld);
      worldVertices02.push(v);
    }
    const left02 = worldVertices02.filter(v => v.x < 1.8);
    const right02 = worldVertices02.filter(v => v.x > 2.3);
    const left02MaxY = Math.max(...left02.map(v => v.y));
    const right02MaxY = Math.max(...right02.map(v => v.y));
    expect(left02MaxY).toBeCloseTo(2.974, 2);
    expect(right02MaxY).toBeCloseTo(2.844, 2);
  });

  it('塩ビパイプなどの tube オブジェクトから中空パイプジオメトリを生成すること', () => {
    const builder = new ModelBuilder();
    const tubeObj = {
      id: 'tube-1',
      name: '塩ビパイプ Φ97mm 9mm厚',
      partName: 'パイプ1',
      type: 'tube' as const,
      size: { x: 0.097, y: 0.097, z: 0.177 },
      thickness: 0.009,
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      color: { r: 0.4, g: 0.4, b: 0.5 },
      visible: true
    };

    const group = builder.build([tubeObj]);
    expect(group.children).toHaveLength(1);

    const mesh = group.children[0] as THREE.Mesh;
    expect(mesh).toBeInstanceOf(THREE.Mesh);

    const geometry = mesh.geometry;
    geometry.computeBoundingBox();
    const bb = geometry.boundingBox!;

    // 外形寸法の検証
    expect(bb.max.x - bb.min.x).toBeCloseTo(0.097, 3);
    expect(bb.max.y - bb.min.y).toBeCloseTo(0.097, 3);
    expect(bb.max.z - bb.min.z).toBeCloseTo(0.177, 3);

    // BoxGeometry の単純な 8 頂点/36 インデックスではなく、円筒管ジオメトリであること
    expect(geometry.attributes.position.count).toBeGreaterThan(100);

    // 中空断面の検証: 中心(0, 0, z)近傍には頂点が存在せず、内径(半径約 0.0395m)以上の距離にあること
    const posAttr = geometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const radialDist = Math.sqrt(vx * vx + vy * vy);
      // 内径内側 (0.03m 以下) に頂点が存在しないこと (中空であること)
      expect(radialDist).toBeGreaterThanOrEqual(0.038);
    }
  });

  it('007.cadiy4 の全オブジェクトを構築し、塩ビパイプがすべてtubeとして生成されること', () => {
    const filePath = path.resolve(__dirname, '../data/007.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    const builder = new ModelBuilder();
    const group = builder.build(data.objects);
    expect(group.children.length).toBe(data.objects.length);

    // 007.cadiy4 内の全 tube オブジェクトのメッシュ検証
    const tubeObjects = data.objects.filter(o => o.type === 'tube');
    expect(tubeObjects.length).toBe(21);

    for (const tubeObj of tubeObjects) {
      const mesh = group.children.find(c => c.name === (tubeObj.partName || tubeObj.name)) as THREE.Mesh;
      expect(mesh).toBeDefined();
      // 直方体(24頂点)ではなく、中空円筒ジオメトリであること
      expect(mesh.geometry.attributes.position.count).toBeGreaterThan(100);
    }
  });

  it('type: comment オブジェクトが3D空間に吹き出し・引き出し線として描画されること', () => {
    const builder = new ModelBuilder();
    const commentObj = {
      id: 'comment-1',
      name: '注記テスト',
      type: 'comment' as const,
      text: '下水接続口',
      position: { x: 0.84, y: 0.13, z: 1.92 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      size: { x: 0, y: 0, z: 0 },
      color: { r: 0, g: 0, b: 0 },
      arrowPoint: { x: 1.07, y: 0.03, z: 1.98 },
      fontSize: 28,
      backgroundColor: { r: 1, g: 1, b: 0.8, a: 1 },
      visible: true
    };

    const group = builder.build([commentObj]);
    expect(group.children).toHaveLength(1);

    const commentGroup = group.children[0] as THREE.Group;
    expect(commentGroup).toBeInstanceOf(THREE.Group);
    expect(commentGroup.name).toBe('comment-comment-1');

    // テキストラベルと引き出し線(矢印)が含まれていること
    expect(commentGroup.children.length).toBeGreaterThanOrEqual(2);

    // テキストラベルメッシュの検証
    const labelMesh = commentGroup.children.find(c => c instanceof THREE.Mesh) as THREE.Mesh;
    expect(labelMesh).toBeDefined();
    expect(labelMesh.geometry).toBeInstanceOf(THREE.PlaneGeometry);

    // 引出線(Line)の検証
    const line = commentGroup.children.find(c => c instanceof THREE.Line) as THREE.Line;
    expect(line).toBeDefined();

    // 007.cadiy4 の下水接続口コメントが正しく構築されること
    const filePath = path.resolve(__dirname, '../data/007.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);
    const comment007 = data.objects.find(o => o.type === 'comment')!;
    expect(comment007).toBeDefined();

    const group007 = builder.build([comment007]);
    expect(group007.children).toHaveLength(1);
    expect(group007.children[0].name).toBe(`comment-${comment007.id}`);
  });

  it('type: dimension のフォントサイズ・ラベルが大きく視認しやすく表示されること', () => {
    const builder = new ModelBuilder();
    const dimObj = {
      id: 'dim-1',
      name: '寸法1200',
      type: 'dimension' as const,
      size: { x: 0.24, y: 0, z: 1.2 },
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      color: { r: 0.2, g: 0.2, b: 0.2 },
      fontSize: 24,
      visible: true
    };

    const group = builder.build([dimObj]);
    const dimGroup = group.children[0] as THREE.Group;

    // 寸法値ラベルメッシュを探す
    const labelMesh = dimGroup.children.find(c => c instanceof THREE.Mesh) as THREE.Mesh;
    expect(labelMesh).toBeDefined();

    labelMesh.geometry.computeBoundingBox();
    const bb = labelMesh.geometry.boundingBox!;
    const labelWidth = bb.max.x - bb.min.x;
    const labelHeight = bb.max.y - bb.min.y;

    // 以前の 0.06 x 0.03 より十分大きく(幅0.15m以上、高さ0.06m以上)生成されること
    expect(labelWidth).toBeGreaterThanOrEqual(0.15);
    expect(labelHeight).toBeGreaterThanOrEqual(0.06);
  });

  it('dummy: true のオブジェクトはワイヤフレームマテリアルで描画されること', () => {
    const builder = new ModelBuilder();
    const dummyLumber = {
      id: 'dummy-lumber',
      name: '参考角材',
      type: 'lumber' as const,
      dummy: true,
      size: { x: 0.05, y: 0.05, z: 0.5 },
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      color: { r: 0.5, g: 0.5, b: 0.5 },
      visible: true
    };

    const normalLumber = {
      id: 'normal-lumber',
      name: '通常角材',
      type: 'lumber' as const,
      dummy: false,
      size: { x: 0.05, y: 0.05, z: 0.5 },
      position: { x: 0.1, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      color: { r: 0.8, g: 0.6, b: 0.4 },
      visible: true
    };

    const group = builder.build([dummyLumber, normalLumber]);
    const dummyMesh = group.children.find(c => c.name === '参考角材') as THREE.Mesh;
    const normalMesh = group.children.find(c => c.name === '通常角材') as THREE.Mesh;

    expect(dummyMesh).toBeDefined();
    expect(normalMesh).toBeDefined();

    const dummyMat = dummyMesh.material as THREE.Material;
    const normalMat = normalMesh.material as THREE.Material;

    // dummy: true は wireframe: true であること
    expect((dummyMat as any).wireframe).toBe(true);
    // 通常部材はワイヤフレームではないこと
    expect((normalMat as any).wireframe).toBeFalsy();

    // 003.cadiy4 の dummy パーツ検証
    const filePath = path.resolve(__dirname, '../data/003.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    const dummyObjs003 = data.objects.filter(o => (o as any).dummy === true);
    expect(dummyObjs003.length).toBeGreaterThan(0);

    const group003 = builder.build(dummyObjs003);
    for (const dObj of dummyObjs003) {
      const mesh = group003.children.find(c => (c.userData.cadiyObject as any)?.id === dObj.id) as THREE.Mesh;
      expect(mesh).toBeDefined();
      expect((mesh.material as any).wireframe).toBe(true);
    }
  });

  it('合板のコーナーR加工 (edgeCuts mode: "round") で円弧状のフィレット頂点群が生成されること', () => {
    const builder = new ModelBuilder();
    const boardWithRound = {
      id: 'round-board-1',
      name: 'R加工天板',
      type: 'board' as const,
      size: { x: 0.4, y: 0.02, z: 0.6 },
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      color: { r: 0.9, g: 0.8, b: 0.6 },
      visible: true,
      edgeCuts: [
        {
          edgeIndex: 4, // 手前右 (X+, Z+)
          mode: 'round' as const,
          faceADist: 0.05,
          faceBDist: 0.05,
          radius: 0.05
        }
      ]
    };

    const group = builder.build([boardWithRound]);
    const mesh = group.children[0] as THREE.Mesh;
    expect(mesh).toBeDefined();

    const geometry = mesh.geometry;
    const posAttr = geometry.attributes.position;

    // 単なる2頂点の直線カット (頂点数 5 * 2 = 10) ではなく、
    // 円弧分割によって上面・下面それぞれ 5 頂点より多くの頂点が生成されていること
    const vertexCount = posAttr.count;
    expect(vertexCount).toBeGreaterThan(12);

    // 生成された頂点が、コーナーの中心 (0.15, 0.25) から半径 0.05 の円弧上にあること
    // X+ = 0.2, Z+ = 0.3 なので、中心は (0.15, 0.25)
    const arcCenter = { x: 0.2 - 0.05, z: 0.3 - 0.05 };
    const topVertices: { x: number; z: number }[] = [];
    for (let i = 0; i < posAttr.count; i++) {
      if (posAttr.getY(i) > 0) {
        topVertices.push({ x: posAttr.getX(i), z: posAttr.getZ(i) });
      }
    }

    // 手前右コーナー付近の頂点群を取り出し、中心からの距離が radius (0.05) に近いことを検証
    const cornerVertices = topVertices.filter(v => v.x >= arcCenter.x - 0.001 && v.z >= arcCenter.z - 0.001);
    expect(cornerVertices.length).toBeGreaterThanOrEqual(3);
    for (const v of cornerVertices) {
      const dist = Math.hypot(v.x - arcCenter.x, v.z - arcCenter.z);
      expect(dist).toBeCloseTo(0.05, 3);
    }
  });

  it('角材の角度カット (cutAngles) で傾斜端面を持つジオメトリが生成されること', () => {
    const builder = new ModelBuilder();

    // 垂木: 始端(-Z) 45度ベベルカット, 終端(+Z) -45度ベベルカット
    const rafterObj = {
      id: 'rafter-1',
      name: 'SPF 2x4 垂木',
      type: 'lumber' as const,
      size: { x: 0.089, y: 0.038, z: 1.0 },
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      color: { r: 0.8, g: 0.6, b: 0.4 },
      visible: true,
      cutAngles: [0, 45, 0, -45, 0, 0, 0, 0]
    };

    const group = builder.build([rafterObj]);
    const mesh = group.children[0] as THREE.Mesh;
    expect(mesh).toBeDefined();

    const geometry = mesh.geometry;
    const posAttr = geometry.attributes.position;

    // 単なる直角平行六面体 (全頂点の Z が ±0.5) ではなく、
    // Y (厚み) 方向によって Z 座標が傾斜していること
    const zValues: number[] = [];
    for (let i = 0; i < posAttr.count; i++) {
      zValues.push(posAttr.getZ(i));
    }

    // 始端 (-Z側): Yによって Z 座標が変化していること
    const minZ = Math.min(...zValues);
    const maxZ = Math.max(...zValues);

    // 45度カットにより、厚み 0.038m に対する Z 方向のズレは約 0.038m 存在する
    expect(maxZ - minZ).toBeGreaterThan(1.0);
  });

  it('001_tana.cadiy4 の側板 (edgeIndex: 6) が上部で斜めカットされ、底板 (edgeIndex: 6, 7) の手前側が角丸になること', () => {
    const filePath = path.resolve(__dirname, '../data/001_tana.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    const builder = new ModelBuilder();
    const group = builder.build(data.objects);

    // 1. 側板(左) の検証 (partName: 側板 (左))
    const sideLObj = data.objects.find(o => o.partName?.includes('側板 (左)'))!;
    expect(sideLObj).toBeDefined();
    const sideLMesh = group.children.find(c => (c.userData.cadiyObject as any)?.id === sideLObj.id) as THREE.Mesh;
    expect(sideLMesh).toBeDefined();

    sideLMesh.updateMatrixWorld();
    const posAttr = sideLMesh.geometry.attributes.position;
    const worldVerts: THREE.Vector3[] = [];
    for (let i = 0; i < posAttr.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(posAttr, i);
      v.applyMatrix4(sideLMesh.matrixWorld);
      worldVerts.push(v);
    }

    // 側板の上端 (Y > 0.4m):
    // 奥側 (Z < 0) は高く (約 0.468m)、手前側 (Z > -0.01) は斜めカットにより低くなっている (約 0.444m)
    const topVerts = worldVerts.filter(v => v.y > 0.4);
    const topMaxY = Math.max(...topVerts.map(v => v.y));
    const topMinY = Math.min(...topVerts.map(v => v.y));
    expect(topMaxY).toBeCloseTo(0.468, 2);
    expect(topMinY).toBeCloseTo(0.444, 2);

    // 側板の下端 (Y < 0.05m): 床側は平ら（直角）であり、すべての頂点 Y が 0.018m 付近であること
    const bottomVerts = worldVerts.filter(v => v.y < 0.05);
    const bottomMaxY = Math.max(...bottomVerts.map(v => v.y));
    const bottomMinY = Math.min(...bottomVerts.map(v => v.y));
    expect(bottomMaxY - bottomMinY).toBeCloseTo(0, 3);

    // 2. 底板 (パイン集成材 18mm, edgeIndex: 6, 7) の検証
    const bottomObj = data.objects.find(o => o.name === 'パイン集成材 18mm' && o.partName === undefined)!;
    expect(bottomObj).toBeDefined();
    const bottomMesh = group.children.find(c => (c.userData.cadiyObject as any)?.id === bottomObj.id) as THREE.Mesh;
    expect(bottomMesh).toBeDefined();

    bottomMesh.updateMatrixWorld();
    const bottomPos = bottomMesh.geometry.attributes.position;
    const bWorldVerts: THREE.Vector3[] = [];
    for (let i = 0; i < bottomPos.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(bottomPos, i);
      v.applyMatrix4(bottomMesh.matrixWorld);
      bWorldVerts.push(v);
    }

    // 底板の手前側 (最手前 Z ≈ 0.06m) の左右の端が角丸により切り落とされ、手前の最先端幅が中央部 (0.4m) より狭まっていること
    const frontVerts = bWorldVerts.filter(v => v.z > 0.0599);
    const frontWidth = Math.max(...frontVerts.map(v => v.x)) - Math.min(...frontVerts.map(v => v.x));
    // R20mm加工により、最手前 (Z = 0.06m) の幅は 0.36m (0.4m - 2*0.02m)
    expect(frontWidth).toBeCloseTo(0.36, 2);

    // 奥側 (Z < -0.059m) は直角のままで全幅 0.4m であること
    const backVerts = bWorldVerts.filter(v => v.z < -0.059);
    const backWidth = Math.max(...backVerts.map(v => v.x)) - Math.min(...backVerts.map(v => v.x));
    expect(backWidth).toBeCloseTo(0.40, 2);
  });

  it('009.cadiy4 の polygon オブジェクトが polygonMeshTable を参照して正しくメッシュ生成されること', () => {
    const filePath = path.resolve(__dirname, '../data/009.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    const builder = new ModelBuilder();
    const group = builder.build(data.objects, undefined, data.pictureImageTable, data.polygonMeshTable);

    const polyObjects = data.objects.filter(o => o.type === 'polygon');
    expect(polyObjects.length).toBe(59);

    // 59個すべてのポリゴンオブジェクトについて検証
    for (const polyObj of polyObjects) {
      const mesh = group.children.find(c => c.userData.id === polyObj.id) as THREE.Mesh;
      expect(mesh).toBeDefined();
      expect(mesh).toBeInstanceOf(THREE.Mesh);

      // 単なる BoxGeometry (8頂点) ではなく、実際のポリゴンデータから生成されていること
      const posAttr = mesh.geometry.attributes.position;
      expect(posAttr).toBeDefined();
      expect(posAttr.count).toBeGreaterThan(8);

      // position / quaternion が反映されていること
      expect(mesh.position.x).toBeCloseTo(polyObj.position.x);
      expect(mesh.position.y).toBeCloseTo(polyObj.position.y);
      expect(mesh.position.z).toBeCloseTo(polyObj.position.z);

      // エッジ線 (LineSegments) が追加されていること
      const lineSegments = mesh.children.find(c => c instanceof THREE.LineSegments);
      expect(lineSegments).toBeDefined();
    }
  });

  it('旧形式 009.cadiy の polygon オブジェクト (_2xBoolean) が変換後の polygonMeshTable を参照して正しくメッシュ生成されること', () => {
    const filePath = path.resolve(__dirname, '../data/009.cadiy');
    const content = fs.readFileSync(filePath, 'utf-8');
    const loader = new ModelLoader();
    const data = loader.load(content, '009');

    const builder = new ModelBuilder();
    const group = builder.build(data.objects, undefined, data.pictureImageTable, data.polygonMeshTable);

    // _2xBoolean 由来の polygon オブジェクト (51個)
    const booleanPolyObjects = data.objects.filter(o => o.type === 'polygon' && (o as any).meshRef !== '羽子板付 沓石 240');
    expect(booleanPolyObjects.length).toBe(51);

    for (const polyObj of booleanPolyObjects) {
      const mesh = group.children.find(c => c.userData.id === polyObj.id) as THREE.Mesh;
      expect(mesh).toBeDefined();
      expect(mesh).toBeInstanceOf(THREE.Mesh);

      // 実際のポリゴンデータ (頂点数 > 8)
      const posAttr = mesh.geometry.attributes.position;
      expect(posAttr).toBeDefined();
      expect(posAttr.count).toBeGreaterThan(8);

      // バウンディングボックスがパーツサイズ (例: クランプ 84.4mm x 53mm x 66.5mm) に近いこと
      mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox!;
      expect(bb.max.x - bb.min.x).toBeCloseTo(polyObj.size.x, 2);
      expect(bb.max.y - bb.min.y).toBeCloseTo(polyObj.size.y, 2);
      expect(bb.max.z - bb.min.z).toBeCloseTo(polyObj.size.z, 2);

      // エッジ線 (LineSegments) が追加されていること
      const lineSegments = mesh.children.find(c => c instanceof THREE.LineSegments);
      expect(lineSegments).toBeDefined();
    }

    // 沓石 (8個) は標準プリセットメッシュにより、009.cadiy4 と全く同様に精密な沓石形状 (dx ≈ 0.23m, dy ≈ 0.325m, dz ≈ 0.23m) として生成されること
    const katsuishiObjects = data.objects.filter(o => o.type === 'polygon' && o.name === '羽子板付 沓石 240');
    expect(katsuishiObjects.length).toBe(8);
    for (const katsu of katsuishiObjects) {
      const mesh = group.children.find(c => c.userData.id === katsu.id) as THREE.Mesh;
      expect(mesh).toBeDefined();

      // 単なる BoxGeometry (36頂点以下) ではなく、実際の沓石メッシュ (76面 * 3 = 228頂点) であること
      const posAttr = mesh.geometry.attributes.position;
      expect(posAttr.count).toBeGreaterThan(36);

      mesh.geometry.computeBoundingBox();
      const bb = mesh.geometry.boundingBox!;
      expect(bb.max.x - bb.min.x).toBeCloseTo(0.23, 2);
      expect(bb.max.z - bb.min.z).toBeCloseTo(0.23, 2);
      expect(bb.max.y - bb.min.y).toBeCloseTo(0.325, 2); // 金具含む全高
    }
  });

  it('defaultPaintId が指定された部材は、paint 内の塗料 color プロパティがレンダリングに反映されること', () => {
    const builder = new ModelBuilder();
    const paintObj = {
      id: 'legacy-paint-1',
      name: 'ブルー',
      color: { r: 0.2, g: 0.4, b: 0.9 },
      finish: 'wood'
    };

    const cylinderObj = {
      id: 'cyl-1',
      name: '丸棒',
      partName: '補強バー',
      type: 'cylinder' as const,
      size: { x: 0.02, y: 0.02, z: 0.4 },
      position: { x: 0, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      color: { r: 1, g: 1, b: 0.8 }, // デフォルトの木材地色
      defaultPaintId: 'legacy-paint-1',
      visible: true
    };

    const normalObj = {
      id: 'lumber-normal',
      name: '角材',
      type: 'lumber' as const,
      size: { x: 0.038, y: 0.089, z: 0.5 },
      position: { x: 0.1, y: 0, z: 0 },
      quaternion: { x: 0, y: 0, z: 0, w: 1 },
      color: { r: 0.9, g: 0.8, b: 0.6 },
      visible: true
    };

    const group = builder.build(
      [cylinderObj, normalObj],
      undefined,
      undefined,
      undefined,
      { snapshot: { id: 'snapshot', name: 'snapshot', isPreset: false, paints: [paintObj], createdAt: '', updatedAt: '' } }
    );

    const cylMesh = group.children.find(c => c.userData.id === 'cyl-1') as THREE.Mesh;
    const normalMesh = group.children.find(c => c.userData.id === 'lumber-normal') as THREE.Mesh;

    expect(cylMesh).toBeDefined();
    expect(normalMesh).toBeDefined();

    // 補強バーは塗料のカラー (r: 0.2, g: 0.4, b: 0.9) が反映されていること
    const cylMat = cylMesh.material as THREE.MeshStandardMaterial;
    expect(cylMat.color.r).toBeCloseTo(0.2);
    expect(cylMat.color.g).toBeCloseTo(0.4);
    expect(cylMat.color.b).toBeCloseTo(0.9);

    // 未塗装部材はオブジェクト自身のカラー (r: 0.9, g: 0.8, b: 0.6) であること
    const normalMat = normalMesh.material as THREE.MeshStandardMaterial;
    expect(normalMat.color.r).toBeCloseTo(0.9);
    expect(normalMat.color.g).toBeCloseTo(0.8);
    expect(normalMat.color.b).toBeCloseTo(0.6);
  });

  it('001_tana.cadiy4 の補強バーに塗料 (ブルー) の color プロパティがレンダリングに反映されること', () => {
    const filePath = path.resolve(__dirname, '../data/001_tana.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    const builder = new ModelBuilder();
    const group = builder.build(
      data.objects,
      undefined,
      data.pictureImageTable,
      data.polygonMeshTable,
      data.paint
    );

    const barObj = data.objects.find(o => o.partName === '補強バー')!;
    expect(barObj).toBeDefined();

    const barMesh = group.children.find(c => c.userData.id === barObj.id) as THREE.Mesh;
    expect(barMesh).toBeDefined();

    // 補強バーのマテリアル色がブルー塗料の色 (r: 0.3098..., g: 0.3098..., b: 1) であること
    const expectedColor = data.paint?.snapshot?.paints?.find(p => p.id === barObj.defaultPaintId)?.color!;
    expect(expectedColor).toBeDefined();

    const barMat = barMesh.material as THREE.MeshStandardMaterial;
    expect(barMat.color.r).toBeCloseTo(expectedColor.r);
    expect(barMat.color.g).toBeCloseTo(expectedColor.g);
    expect(barMat.color.b).toBeCloseTo(expectedColor.b);
  });

  it('merged-boolean-sample.cadiy4 の merged オブジェクト (union / difference) が BufferGeometry として正しくメッシュ生成されること', () => {
    const filePath = path.resolve(__dirname, '../data/merged-boolean-sample.cadiy4');
    const content = fs.readFileSync(filePath, 'utf-8');
    const parser = new Cadiy4Parser();
    const data = parser.parse(content);

    const builder = new ModelBuilder();
    const group = builder.build(data.objects);

    expect(group.children.length).toBe(data.objects.length);

    // 1. union (テスト結合材（結合）) の検証
    const unionObj = data.objects.find(o => o.id === 'merged-union-test-1')!;
    expect(unionObj).toBeDefined();
    expect(unionObj.type).toBe('merged');

    const unionMesh = group.children.find(c => c.userData.id === unionObj.id) as THREE.Mesh;
    expect(unionMesh).toBeDefined();
    expect(unionMesh.geometry).toBeInstanceOf(THREE.BufferGeometry);
    // BoxGeometry の頂点数(24 or 36)ではなく、マージされた合成ジオメトリの頂点数(72)であること
    expect(unionMesh.geometry.getAttribute('position').count).toBe(72);
    expect(unionMesh.position.x).toBeCloseTo(unionObj.position.x);
    expect(unionMesh.position.y).toBeCloseTo(unionObj.position.y);
    expect(unionMesh.position.z).toBeCloseTo(unionObj.position.z);

    // 2. difference (テスト木材（切り欠き）) の検証
    const diffObj = data.objects.find(o => o.id === 'merged-diff-test-2')!;
    expect(diffObj).toBeDefined();
    expect(diffObj.type).toBe('merged');

    const diffMesh = group.children.find(c => c.userData.id === diffObj.id) as THREE.Mesh;
    expect(diffMesh).toBeDefined();
    expect(diffMesh.geometry).toBeInstanceOf(THREE.BufferGeometry);
    expect(diffMesh.geometry.getAttribute('position').count).toBeGreaterThan(0);
    expect(diffMesh.position.x).toBeCloseTo(diffObj.position.x);

    // 3. cylinder (テスト丸棒（面取り）) の検証
    const cylObj = data.objects.find(o => o.id === 'test-cylinder-chamfered')!;
    expect(cylObj).toBeDefined();
    const cylMesh = group.children.find(c => c.userData.id === cylObj.id) as THREE.Mesh;
    expect(cylMesh).toBeDefined();
    expect(cylMesh.geometry).toBeInstanceOf(THREE.BufferGeometry);
  });
});
