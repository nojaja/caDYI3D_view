import * as THREE from 'three';
import { PictureObject, PictureImageItem } from '../types/cadiy4';
import { decodeImageData } from '../utils/imageUtils';

export class PictureBuilder {
  private imageMap: Map<number, string> = new Map();
  private objectUrls: string[] = [];

  /**
   * プロジェクト内の画像テーブルをセットする
   */
  public setImageTable(table?: PictureImageItem[]): void {
    this.imageMap.clear();
    if (table && Array.isArray(table)) {
      for (const item of table) {
        this.imageMap.set(item.id, item.imageBase64);
      }
    }
  }

  /**
   * PictureObject から Three.js の Mesh を生成する
   */
  public build(obj: PictureObject): THREE.Mesh {
    const width = Math.max(obj.size.x, 0.01);
    const height = Math.max(obj.size.z, 0.01);

    const geometry = new THREE.PlaneGeometry(width, height);
    // caDIY3D では初期姿勢が XZ 平面（法線 +Y）のため、PlaneGeometry を XZ 平面に合わせてからクォータニオンを適用
    geometry.rotateX(-Math.PI / 2);

    const side = obj.dispPattern === 0 ? THREE.FrontSide : THREE.DoubleSide;

    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: side,
      transparent: true,
      alphaTest: 0.01,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = obj.name || 'picture';
    mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
    mesh.quaternion.set(obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w);
    mesh.visible = obj.visible !== false;

    mesh.userData = {
      cadiyObject: obj,
      id: obj.id,
      name: obj.name,
      size: obj.size,
    };

    // 画像データの取得
    let rawImage = obj.imageBase64;
    if (!rawImage && obj.imageBase64Id !== undefined && this.imageMap.has(obj.imageBase64Id)) {
      rawImage = this.imageMap.get(obj.imageBase64Id);
    }

    if (rawImage) {
      if (typeof document !== 'undefined') {
        const mime = obj.imageMimeType || 'image/jpeg';
        decodeImageData(rawImage, mime)
          .then((src) => {
            if (src.startsWith('blob:')) {
              this.objectUrls.push(src);
            }
            const loader = new THREE.TextureLoader();
            loader.load(
              src,
              (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                // contentRotation の適用 (caDIY3D の時計回り角度指定に対応)
                const rotDeg = obj.contentRotation || 0;
                if (rotDeg !== 0) {
                  texture.center.set(0.5, 0.5);
                  texture.rotation = THREE.MathUtils.degToRad(-rotDeg);
                }
                material.map = texture;
                material.needsUpdate = true;
              },
              undefined,
              (err) => {
                console.warn('Failed to load texture for picture:', err);
              }
            );
          })
          .catch((err) => {
            console.warn('Failed to decode picture data:', err);
          });
      }
    }

    return mesh;
  }

  public dispose(): void {
    for (const url of this.objectUrls) {
      if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(url);
      }
    }
    this.objectUrls = [];
    this.imageMap.clear();
  }
}
