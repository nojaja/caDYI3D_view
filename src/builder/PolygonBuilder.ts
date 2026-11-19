import * as THREE from 'three';
import { PolygonObject, PolygonMeshItem, PolygonMesh, Vector3 } from '../types/cadiy4';
import { STANDARD_PRESET_MESHES } from '../data/standardPresetMeshes';

export class PolygonBuilder {
  private meshMap: Map<string, { vertices: any[]; faces: any[] }> = new Map();
  private presetMap: Map<string, { vertices: any[]; faces: any[] }> = new Map();
  private geometryCache: Map<string, THREE.BufferGeometry> = new Map();

  constructor() {
    this.initPresetMeshes();
  }

  /**
   * caDYI3D の標準既製金物パーツ (沓石・蝶番・ブロック等) のプリセットメッシュを登録
   */
  private initPresetMeshes(): void {
    if (!STANDARD_PRESET_MESHES || !Array.isArray(STANDARD_PRESET_MESHES)) return;
    for (const item of STANDARD_PRESET_MESHES) {
      if (!item || !item.meshId) continue;
      const data = { vertices: item.vertices, faces: item.faces };

      // 1. フル meshId ("羽子板付 沓石 240|230 x 240 x 230|Concrete/Base-Stone With Paddle 240.dmesh")
      this.presetMap.set(item.meshId, data);

      // 2. パイプ区切り要素の抽出 (パーツ名、モデルパス)
      const parts = item.meshId.split('|');
      if (parts.length >= 1 && parts[0].trim()) {
        const nameKey = parts[0].trim();
        this.presetMap.set(nameKey, data);
      }
      if (parts.length >= 3 && parts[2].trim()) {
        const modelPath = parts[2].trim().replace(/\\/g, '/');
        this.presetMap.set(modelPath, data);
        // パス名のみ (例: "Base-Stone With Paddle 240.dmesh")
        const fileName = modelPath.split('/').pop();
        if (fileName) {
          this.presetMap.set(fileName, data);
        }
      }
    }
  }

  /**
   * caDYI3D のポリゴン頂点データは cm 単位。
   * Three.js のワールド座標系（m 単位）に合わせて 0.01 を乗算する。
   */
  private static readonly SCALE = 0.01;

  /**
   * プロジェクト内のポリゴンメッシュテーブルをセットする
   */
  public setPolygonMeshTable(table?: PolygonMeshItem[] | Record<string, PolygonMesh>): void {
    this.meshMap.clear();
    this.geometryCache.clear();

    if (!table) return;

    if (Array.isArray(table)) {
      for (const item of table) {
        if (item && item.meshId) {
          this.meshMap.set(item.meshId, {
            vertices: item.vertices,
            faces: item.faces,
          });
        }
      }
    } else if (typeof table === 'object') {
      for (const [key, value] of Object.entries(table)) {
        if (value && (value.vertices || value.faces)) {
          this.meshMap.set(key, {
            vertices: value.vertices || [],
            faces: value.faces || [],
          });
        }
      }
    }
  }

  /**
   * PolygonObject から Three.js の BufferGeometry を構築する
   */
  public buildGeometry(obj: PolygonObject): THREE.BufferGeometry | null {
    // 1. プロジェクトローカルのメッシュテーブルから検索
    let res = this.findMesh(this.meshMap, obj);

    // 2. 見つからない場合、既製パーツ標準プリセットから検索
    if (!res) {
      res = this.findMesh(this.presetMap, obj);
    }

    let meshData = res?.meshData;
    let resolvedKey = res?.resolvedKey;

    // 3. オブジェクト自身に頂点と面データがある場合のフォールバック
    if (!meshData && (obj.vertices || obj.faces)) {
      meshData = {
        vertices: (obj.vertices as any[]) || [],
        faces: (obj.faces as any[]) || [],
      };
      resolvedKey = obj.id;
    }

    if (!meshData || !meshData.vertices || !meshData.faces) {
      return null;
    }

    // キャッシュ確認（同一メッシュ定義ならジオメトリを共有）
    const cacheKey = resolvedKey || obj.meshRef || obj.name || JSON.stringify(meshData.vertices.length);
    if (this.geometryCache.has(cacheKey)) {
      return this.geometryCache.get(cacheKey)!;
    }

    const geometry = this.createBufferGeometry(meshData.vertices, meshData.faces);
    if (geometry) {
      this.geometryCache.set(cacheKey, geometry);
    }
    return geometry;
  }

  /**
   * 指定マップからオブジェクトにマッチするメッシュデータを検索
   */
  private findMesh(
    map: Map<string, { vertices: any[]; faces: any[] }>,
    obj: PolygonObject
  ): { meshData: { vertices: any[]; faces: any[] }; resolvedKey: string } | null {
    if (map.size === 0) return null;

    // 1. meshRef による完全一致
    if (obj.meshRef && map.has(obj.meshRef)) {
      return { meshData: map.get(obj.meshRef)!, resolvedKey: obj.meshRef };
    }

    // 2. modelName による完全一致 (スラッシュ正規化)
    const normModelName = obj.modelName ? obj.modelName.replace(/\\/g, '/') : undefined;
    if (normModelName && map.has(normModelName)) {
      return { meshData: map.get(normModelName)!, resolvedKey: normModelName };
    }

    // 3. name による完全一致
    if (obj.name && map.has(obj.name)) {
      return { meshData: map.get(obj.name)!, resolvedKey: obj.name };
    }

    // 4. 部分一致検索
    // 登録キー (key) がパーツ名やモデルパス (candidate) を含む場合のみ解決する
    const candidates = [obj.meshRef, normModelName, obj.name].filter(
      (s): s is string => typeof s === 'string' && s.trim().length >= 2
    );
    for (const candidate of candidates) {
      for (const [key, val] of map.entries()) {
        if (key.includes(candidate)) {
          return { meshData: val, resolvedKey: key };
        }
      }
    }

    return null;
  }

  /**
   * 頂点配列と面配列から Three.js BufferGeometry を構築
   */
  private createBufferGeometry(rawVertices: any, rawFaces: any): THREE.BufferGeometry | null {
    const parsedVertices = this.parseVertices(rawVertices);
    if (parsedVertices.length === 0) return null;

    const positions: number[] = [];
    const normals: number[] = [];
    let hasValidNormals = true;

    const scale = PolygonBuilder.SCALE;

    // 面の処理
    if (Array.isArray(rawFaces)) {
      for (const face of rawFaces) {
        if (!face) continue;

        let indices: number[] = [];
        let vertexNormals: Vector3[] | undefined;

        if (Array.isArray(face.indices)) {
          indices = face.indices;
          vertexNormals = face.vertexNormals;
        } else if (typeof face.a === 'number' && typeof face.b === 'number' && typeof face.c === 'number') {
          // レガシー形式 { a, b, c }
          indices = [face.a, face.b, face.c];
        } else if (typeof face === 'number') {
          // 面配列自体がフラットな数値インデックス列の場合
          indices = [face];
        }

        if (indices.length < 3) continue;

        // 多角形（3頂点、4頂点、n-gon）を三角形ファンに分割
        const triCount = indices.length - 2;
        for (let t = 0; t < triCount; t++) {
          const triIndices = [indices[0], indices[t + 1], indices[t + 2]];

          for (let vi = 0; vi < 3; vi++) {
            const vIdx = triIndices[vi];
            const vertex = parsedVertices[vIdx];
            if (!vertex) continue;

            positions.push(vertex.x * scale, vertex.y * scale, vertex.z * scale);

            // 法線ベクトルの取得
            if (vertexNormals && vertexNormals.length === indices.length) {
              const originalFaceIdx = vi === 0 ? 0 : t + vi;
              const vn = vertexNormals[originalFaceIdx];
              if (vn && typeof vn.x === 'number') {
                const len = Math.sqrt(vn.x * vn.x + vn.y * vn.y + vn.z * vn.z) || 1.0;
                normals.push(vn.x / len, vn.y / len, vn.z / len);
              } else {
                hasValidNormals = false;
              }
            } else {
              hasValidNormals = false;
            }
          }
        }
      }
    }

    if (positions.length === 0) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    if (hasValidNormals && normals.length === positions.length) {
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    } else {
      geometry.computeVertexNormals();
    }

    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    return geometry;
  }

  /**
   * 多様な形式の頂点データを Vector3[] に統一パース
   */
  private parseVertices(raw: any): Vector3[] {
    if (!raw) return [];

    // すでに Vector3[] の場合
    if (Array.isArray(raw)) {
      if (raw.length === 0) return [];

      if (typeof raw[0] === 'object' && raw[0] !== null && 'x' in raw[0]) {
        return raw as Vector3[];
      }

      // フラットな数値配列 [x, y, z, x, y, z, ...] の場合
      if (typeof raw[0] === 'number') {
        const result: Vector3[] = [];
        for (let i = 0; i < raw.length; i += 3) {
          result.push({
            x: raw[i] || 0,
            y: raw[i + 1] || 0,
            z: raw[i + 2] || 0,
          });
        }
        return result;
      }
    }

    // 文字列 "x,y,z/x,y,z/..." の場合
    if (typeof raw === 'string') {
      const tokens = raw.split('/');
      const result: Vector3[] = [];
      for (const t of tokens) {
        if (!t.trim()) continue;
        const parts = t.split(',').map((s) => parseFloat(s.trim()));
        if (parts.length >= 3 && !parts.some((n) => isNaN(n))) {
          result.push({ x: parts[0], y: parts[1], z: parts[2] });
        }
      }
      return result;
    }

    return [];
  }

  /**
   * リソース解放
   */
  public dispose(): void {
    for (const geo of this.geometryCache.values()) {
      geo.dispose();
    }
    this.geometryCache.clear();
    this.meshMap.clear();
  }
}
