import * as THREE from 'three';
import { CadiyObject, LumberObject, BoardObject, CylinderObject, DimensionObject, TextBoardObject } from '../types/cadiy4';
import { MaterialFactory } from './MaterialFactory';
import { TextBoardBuilder } from './TextBoardBuilder';
import { DimensionBuilder } from './DimensionBuilder';

export class ModelBuilder {
  private materialFactory: MaterialFactory;
  private textBoardBuilder: TextBoardBuilder;
  private dimensionBuilder: DimensionBuilder;

  constructor(materialFactory?: MaterialFactory) {
    this.materialFactory = materialFactory || new MaterialFactory();
    this.textBoardBuilder = new TextBoardBuilder();
    this.dimensionBuilder = new DimensionBuilder();
  }

  /**
   * オブジェクトリストからThree.jsのGroupを生成する
   */
  public build(objects: CadiyObject[]): THREE.Group {
    const rootGroup = new THREE.Group();
    rootGroup.name = 'cadiy-model-root';

    for (const obj of objects) {
      const mesh = this.createObjectMesh(obj);
      if (mesh) {
        rootGroup.add(mesh);
      }
    }

    return rootGroup;
  }

  /**
   * 単一オブジェクトからMeshまたはObject3Dを生成
   */
  public createObjectMesh(obj: CadiyObject): THREE.Object3D | null {
    if (obj.type === 'textBoard') {
      return this.textBoardBuilder.build(obj as TextBoardObject);
    }

    if (obj.type === 'dimension') {
      return this.dimensionBuilder.build(obj as DimensionObject);
    }

    let geometry: THREE.BufferGeometry | null = null;

    switch (obj.type) {
      case 'lumber':
      case 'board':
        geometry = this.createBoxGeometry(obj as LumberObject | BoardObject);
        break;
      case 'cylinder':
      case 'roundBoard':
        geometry = this.createCylinderGeometry(obj as CylinderObject);
        break;
      default:
        geometry = new THREE.BoxGeometry(obj.size.x, obj.size.y, obj.size.z);
        break;
    }

    if (!geometry) return null;

    const material = this.materialFactory.getWoodMaterial(obj.color);
    const mesh = new THREE.Mesh(geometry, material);

    mesh.name = obj.partName || obj.name;
    mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
    mesh.quaternion.set(obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w);
    mesh.visible = obj.visible !== false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.userData = {
      cadiyObject: obj,
      id: obj.id,
      name: obj.name,
      partName: obj.partName,
      size: obj.size,
      remarks: obj.remarks,
    };

    // 木材のエッジ線
    const edges = new THREE.EdgesGeometry(geometry, 25);
    const line = new THREE.LineSegments(edges, this.materialFactory.getEdgeMaterial());
    mesh.add(line);

    return mesh;
  }

  private createBoxGeometry(obj: LumberObject | BoardObject): THREE.BufferGeometry {
    if (obj.edgeCuts && obj.edgeCuts.length > 0) {
      return this.createCutBoxGeometry(obj);
    }
    return new THREE.BoxGeometry(obj.size.x, obj.size.y, obj.size.z);
  }

  /**
   * 形状加工 (edgeCuts) が施された直方体/板材の BufferGeometry を生成
   */
  private createCutBoxGeometry(obj: LumberObject | BoardObject): THREE.BufferGeometry {
    const sx = obj.size.x;
    const sy = obj.size.y;
    const sz = obj.size.z;
    const hx = sx / 2;
    const hy = sy / 2;
    const hz = sz / 2;

    const cuts = obj.edgeCuts || [];

    // 縦エッジ (4, 5, 6, 7) のカットを検索
    const cutMap = new Map<number, typeof cuts[0]>();
    for (const c of cuts) {
      cutMap.set(c.edgeIndex, c);
    }

    // X-Z 平面における2D輪郭頂点列 (反時計回り: 左下 -> 右下 -> 右上 -> 左上)
    // 注意: caDIY3Dの立ち姿勢ではローカル -Z が上部(天面)、+Z が下部(床面)に対応する
    const polygon2D: { x: number; z: number }[] = [];

    // 1. 左下 (X-, Z+): Edge 4
    if (cutMap.has(4)) {
      const c = cutMap.get(4)!;
      polygon2D.push({ x: -hx, z: hz - c.faceBDist });
      polygon2D.push({ x: -hx + c.faceADist, z: hz });
    } else {
      polygon2D.push({ x: -hx, z: hz });
    }

    // 2. 右下 (X+, Z+): Edge 5
    if (cutMap.has(5)) {
      const c = cutMap.get(5)!;
      polygon2D.push({ x: hx - c.faceADist, z: hz });
      polygon2D.push({ x: hx, z: hz - c.faceBDist });
    } else {
      polygon2D.push({ x: hx, z: hz });
    }

    // 3. 右上 (X+, Z-): Edge 7 (上部右側コーナー)
    if (cutMap.has(7)) {
      const c = cutMap.get(7)!;
      polygon2D.push({ x: hx, z: -hz + c.faceBDist });
      polygon2D.push({ x: hx - c.faceADist, z: -hz });
    } else {
      polygon2D.push({ x: hx, z: -hz });
    }

    // 4. 左上 (X-, Z-): Edge 6 (上部左側コーナー)
    if (cutMap.has(6)) {
      const c = cutMap.get(6)!;
      polygon2D.push({ x: -hx + c.faceADist, z: -hz });
      polygon2D.push({ x: -hx, z: -hz + c.faceBDist });
    } else {
      polygon2D.push({ x: -hx, z: -hz });
    }

    const N = polygon2D.length;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // 下面頂点 (Y = -hy): インデックス 0 .. N-1
    for (const p of polygon2D) {
      positions.push(p.x, -hy, p.z);
      uvs.push((p.x + hx) / sx, (p.z + hz) / sz);
    }

    // 上面頂点 (Y = +hy): インデックス N .. 2N-1
    for (const p of polygon2D) {
      positions.push(p.x, hy, p.z);
      uvs.push((p.x + hx) / sx, (p.z + hz) / sz);
    }

    // 下面インデックス (Y- 向き, 外側から見て反時計回り)
    for (let i = 1; i < N - 1; i++) {
      indices.push(0, i + 1, i);
    }

    // 上面インデックス (Y+ 向き, 反時計回り)
    for (let i = 1; i < N - 1; i++) {
      indices.push(N, N + i, N + i + 1);
    }

    // 側面インデックス
    for (let i = 0; i < N; i++) {
      const next = (i + 1) % N;
      const b0 = i;
      const b1 = next;
      const t0 = N + i;
      const t1 = N + next;

      indices.push(b0, b1, t1);
      indices.push(b0, t1, t0);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    return geometry;
  }

  private createCylinderGeometry(obj: CylinderObject): THREE.CylinderGeometry {
    const radiusTop = obj.size.x / 2;
    const radiusBottom = obj.size.x / 2;
    const height = obj.size.z;
    const radialSegments = 32;

    const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);
    geometry.rotateX(Math.PI / 2);
    return geometry;
  }

  public dispose(): void {
    this.materialFactory.dispose();
  }
}
