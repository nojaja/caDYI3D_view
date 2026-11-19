import * as THREE from 'three';
import { CadiyObject, LumberObject, BoardObject, CylinderObject, DimensionObject, TextBoardObject, PictureObject, PictureImageItem, TubeObject, CommentObject, PolygonObject, PolygonMeshItem, PolygonMesh } from '../types/cadiy4';
import { MaterialFactory } from './MaterialFactory';
import { TextBoardBuilder } from './TextBoardBuilder';
import { DimensionBuilder } from './DimensionBuilder';
import { PictureBuilder } from './PictureBuilder';
import { CommentBuilder } from './CommentBuilder';
import { PolygonBuilder } from './PolygonBuilder';

export class ModelBuilder {
  private materialFactory: MaterialFactory;
  private textBoardBuilder: TextBoardBuilder;
  private dimensionBuilder: DimensionBuilder;
  private pictureBuilder: PictureBuilder;
  private commentBuilder: CommentBuilder;
  private polygonBuilder: PolygonBuilder;

  constructor(materialFactory?: MaterialFactory) {
    this.materialFactory = materialFactory || new MaterialFactory();
    this.textBoardBuilder = new TextBoardBuilder();
    this.dimensionBuilder = new DimensionBuilder();
    this.pictureBuilder = new PictureBuilder();
    this.commentBuilder = new CommentBuilder();
    this.polygonBuilder = new PolygonBuilder();
  }

  /**
   * 画像テーブルをセットする
   */
  public setPictureImageTable(table?: PictureImageItem[]): void {
    this.pictureBuilder.setImageTable(table);
  }

  /**
   * ポリゴンメッシュテーブルをセットする
   */
  public setPolygonMeshTable(table?: PolygonMeshItem[] | Record<string, PolygonMesh>): void {
    this.polygonBuilder.setPolygonMeshTable(table);
  }

  /**
   * オブジェクトリストからThree.jsのGroupを生成する
   */
  public build(
    objects: CadiyObject[],
    isObjectVisible?: (objectId: string) => boolean,
    pictureImageTable?: PictureImageItem[],
    polygonMeshTable?: PolygonMeshItem[] | Record<string, PolygonMesh>
  ): THREE.Group {
    if (pictureImageTable) {
      this.setPictureImageTable(pictureImageTable);
    }
    if (polygonMeshTable) {
      this.setPolygonMeshTable(polygonMeshTable);
    }

    const rootGroup = new THREE.Group();
    rootGroup.name = 'cadiy-model-root';

    for (const obj of objects) {
      const visible = isObjectVisible ? isObjectVisible(obj.id) : obj.visible !== false;
      const mesh = this.createObjectMesh(obj, visible);
      if (mesh) {
        rootGroup.add(mesh);
      }
    }

    return rootGroup;
  }

  /**
   * 単一オブジェクトからMeshまたはObject3Dを生成
   */
  public createObjectMesh(obj: CadiyObject, isVisible?: boolean): THREE.Object3D | null {
    const finalVisible = isVisible !== undefined ? isVisible : obj.visible !== false;

    if (obj.type === 'textBoard') {
      const textMesh = this.textBoardBuilder.build(obj as TextBoardObject);
      if (textMesh) {
        textMesh.visible = finalVisible;
      }
      return textMesh;
    }

    if (obj.type === 'dimension') {
      const dimMesh = this.dimensionBuilder.build(obj as DimensionObject);
      if (dimMesh) {
        dimMesh.visible = finalVisible;
      }
      return dimMesh;
    }

    if (obj.type === 'picture') {
      const picMesh = this.pictureBuilder.build(obj as PictureObject);
      if (picMesh) {
        picMesh.visible = finalVisible;
      }
      return picMesh;
    }

    if (obj.type === 'comment') {
      const commentMesh = this.commentBuilder.build(obj as CommentObject);
      if (commentMesh) {
        commentMesh.visible = finalVisible;
      }
      return commentMesh;
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
      case 'tube':
        geometry = this.createTubeGeometry(obj as TubeObject);
        break;
      case 'polygon':
        geometry = this.polygonBuilder.buildGeometry(obj as PolygonObject);
        if (!geometry) {
          geometry = new THREE.BoxGeometry(obj.size.x, obj.size.y, obj.size.z);
        }
        break;
      default:
        geometry = new THREE.BoxGeometry(obj.size.x, obj.size.y, obj.size.z);
        break;
    }

    if (!geometry) return null;

    const material = obj.dummy
      ? this.materialFactory.getWireframeMaterial(obj.color)
      : this.materialFactory.getWoodMaterial(obj.color);
    const mesh = new THREE.Mesh(geometry, material);

    mesh.name = obj.partName || obj.name;
    mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
    mesh.quaternion.set(obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w);
    mesh.visible = finalVisible;
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

    // 通常部材のエッジ線（dummyのワイヤフレーム部材には追加しない）
    if (!obj.dummy) {
      const edges = new THREE.EdgesGeometry(geometry, 25);
      const line = new THREE.LineSegments(edges, this.materialFactory.getEdgeMaterial());
      mesh.add(line);
    }

    return mesh;
  }

  private createBoxGeometry(obj: LumberObject | BoardObject): THREE.BufferGeometry {
    let geometry: THREE.BufferGeometry;
    if (obj.edgeCuts && obj.edgeCuts.length > 0) {
      geometry = this.createCutBoxGeometry(obj);
    } else {
      geometry = new THREE.BoxGeometry(obj.size.x, obj.size.y, obj.size.z);
    }

    if (obj.cutAngles && obj.cutAngles.some((a) => a !== 0)) {
      this.applyCutAngles(geometry, obj);
    }

    return geometry;
  }

  /**
   * 木材の端面角度カット (cutAngles: マイター/ベベルカット) をジオメトリに適用
   */
  private applyCutAngles(geometry: THREE.BufferGeometry, obj: LumberObject | BoardObject): void {
    const cuts = obj.cutAngles;
    if (!cuts || !cuts.some((a) => a !== 0)) return;

    // [0]: 始端(-Z)マイター(Y軸周り), [1]: 始端(-Z)ベベル(X軸周り)
    // [2]: 終端(+Z)マイター(Y軸周り), [3]: 終端(+Z)ベベル(X軸周り)
    const tanM1 = Math.tan(((cuts[0] || 0) * Math.PI) / 180);
    const tanB1 = Math.tan(((cuts[1] || 0) * Math.PI) / 180);
    const tanM2 = Math.tan(((cuts[2] || 0) * Math.PI) / 180);
    const tanB2 = Math.tan(((cuts[3] || 0) * Math.PI) / 180);

    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      if (z < -1e-5) {
        // 始端面 (-Z側)
        const offsetZ = x * tanM1 + y * tanB1;
        pos.setZ(i, z + offsetZ);
      } else if (z > 1e-5) {
        // 終端面 (+Z側)
        const offsetZ = x * tanM2 + y * tanB2;
        pos.setZ(i, z + offsetZ);
      }
    }
    pos.needsUpdate = true;
    geometry.computeVertexNormals();
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
    const cutMap = new Map<number, (typeof cuts)[0]>();
    for (const c of cuts) {
      cutMap.set(c.edgeIndex, c);
    }

    // X-Z 平面における2D輪郭頂点列 (反時計回り: 左下 -> 右下 -> 右上 -> 左上)
    // エッジ番号の幾何配置:
    //   Edge 6: (X-, Z+) [左下]
    //   Edge 4: (X+, Z+) [右下]
    //   Edge 5: (X+, Z-) [右上]
    //   Edge 7: (X-, Z-) [左上]
    const rawPolygon2D: { x: number; z: number }[] = [];

    // 1. 左下 (X-, Z+): Edge 6
    if (cutMap.has(6)) {
      const c = cutMap.get(6)!;
      if (c.mode === 'round') {
        const rA = c.faceADist > 0 ? c.faceADist : c.radius || 0.01;
        const rB = c.faceBDist > 0 ? c.faceBDist : c.radius || 0.01;
        const cx = -hx + rA;
        const cz = hz - rB;
        const segs = 6;
        for (let s = 0; s <= segs; s++) {
          const theta = Math.PI - (s / segs) * (Math.PI / 2);
          rawPolygon2D.push({ x: cx + rA * Math.cos(theta), z: cz + rB * Math.sin(theta) });
        }
      } else {
        rawPolygon2D.push({ x: -hx, z: hz - c.faceBDist });
        rawPolygon2D.push({ x: -hx + c.faceADist, z: hz });
      }
    } else {
      rawPolygon2D.push({ x: -hx, z: hz });
    }

    // 2. 右下 (X+, Z+): Edge 4
    if (cutMap.has(4)) {
      const c = cutMap.get(4)!;
      if (c.mode === 'round') {
        const rA = c.faceADist > 0 ? c.faceADist : c.radius || 0.01;
        const rB = c.faceBDist > 0 ? c.faceBDist : c.radius || 0.01;
        const cx = hx - rA;
        const cz = hz - rB;
        const segs = 6;
        for (let s = 0; s <= segs; s++) {
          const theta = Math.PI / 2 - (s / segs) * (Math.PI / 2);
          rawPolygon2D.push({ x: cx + rA * Math.cos(theta), z: cz + rB * Math.sin(theta) });
        }
      } else {
        rawPolygon2D.push({ x: hx - c.faceADist, z: hz });
        rawPolygon2D.push({ x: hx, z: hz - c.faceBDist });
      }
    } else {
      rawPolygon2D.push({ x: hx, z: hz });
    }

    // 3. 右上 (X+, Z-): Edge 5
    if (cutMap.has(5)) {
      const c = cutMap.get(5)!;
      if (c.mode === 'round') {
        const rA = c.faceADist > 0 ? c.faceADist : c.radius || 0.01;
        const rB = c.faceBDist > 0 ? c.faceBDist : c.radius || 0.01;
        const cx = hx - rA;
        const cz = -hz + rB;
        const segs = 6;
        for (let s = 0; s <= segs; s++) {
          const theta = 0 - (s / segs) * (Math.PI / 2);
          rawPolygon2D.push({ x: cx + rA * Math.cos(theta), z: cz + rB * Math.sin(theta) });
        }
      } else {
        rawPolygon2D.push({ x: hx, z: -hz + c.faceBDist });
        rawPolygon2D.push({ x: hx - c.faceADist, z: -hz });
      }
    } else {
      rawPolygon2D.push({ x: hx, z: -hz });
    }

    // 4. 左上 (X-, Z-): Edge 7
    if (cutMap.has(7)) {
      const c = cutMap.get(7)!;
      if (c.mode === 'round') {
        const rA = c.faceADist > 0 ? c.faceADist : c.radius || 0.01;
        const rB = c.faceBDist > 0 ? c.faceBDist : c.radius || 0.01;
        const cx = -hx + rA;
        const cz = -hz + rB;
        const segs = 6;
        for (let s = 0; s <= segs; s++) {
          const theta = 1.5 * Math.PI - (s / segs) * (Math.PI / 2);
          rawPolygon2D.push({ x: cx + rA * Math.cos(theta), z: cz + rB * Math.sin(theta) });
        }
      } else {
        rawPolygon2D.push({ x: -hx + c.faceADist, z: -hz });
        rawPolygon2D.push({ x: -hx, z: -hz + c.faceBDist });
      }
    } else {
      rawPolygon2D.push({ x: -hx, z: -hz });
    }

    // 重複頂点の除去（全幅カットや全周カット時の退化ポリゴン防止）
    const polygon2D: { x: number; z: number }[] = [];
    for (let i = 0; i < rawPolygon2D.length; i++) {
      const p = rawPolygon2D[i];
      const prev = polygon2D[polygon2D.length - 1];
      if (!prev || Math.hypot(p.x - prev.x, p.z - prev.z) > 1e-5) {
        polygon2D.push(p);
      }
    }
    if (polygon2D.length > 2) {
      const first = polygon2D[0];
      const last = polygon2D[polygon2D.length - 1];
      if (Math.hypot(first.x - last.x, first.z - last.z) < 1e-5) {
        polygon2D.pop();
      }
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

  /**
   * パイプ (tube) の中空円筒ジオメトリを生成
   */
  private createTubeGeometry(obj: TubeObject): THREE.BufferGeometry {
    const outerRadius = (obj.size.x || obj.size.y) / 2;
    const height = obj.size.z;
    const thickness = obj.thickness || 0;
    const innerRadius = outerRadius - thickness;

    // 肉厚が未指定または外径以上の場合は通常の円柱を生成
    if (thickness <= 0 || innerRadius <= 0) {
      const geometry = new THREE.CylinderGeometry(outerRadius, outerRadius, height, 32);
      geometry.rotateX(Math.PI / 2);
      return geometry;
    }

    const shape = new THREE.Shape();
    shape.absarc(0, 0, outerRadius, 0, Math.PI * 2, false);

    const holePath = new THREE.Path();
    holePath.absarc(0, 0, innerRadius, 0, Math.PI * 2, true);
    shape.holes.push(holePath);

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: height,
      bevelEnabled: false,
      curveSegments: 32,
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.translate(0, 0, -height / 2);
    geometry.computeVertexNormals();

    return geometry;
  }

  public dispose(): void {
    this.materialFactory.dispose();
    this.pictureBuilder.dispose();
    this.polygonBuilder.dispose();
  }
}
