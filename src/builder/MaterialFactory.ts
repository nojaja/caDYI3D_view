import * as THREE from 'three';
import { ColorRGB } from '../types/cadiy4';

export class MaterialFactory {
  private materialCache = new Map<string, THREE.MeshStandardMaterial>();

  /**
   * 指定色から木材マテリアルを生成またはキャッシュから取得
   */
  public getWoodMaterial(color: ColorRGB, opacity: number = 1.0): THREE.MeshStandardMaterial {
    const key = `${color.r.toFixed(3)}_${color.g.toFixed(3)}_${color.b.toFixed(3)}_${opacity}`;
    const cached = this.materialCache.get(key);
    if (cached) return cached;

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color.r, color.g, color.b),
      roughness: 0.7,
      metalness: 0.05,
      transparent: opacity < 1.0,
      opacity: opacity,
    });

    this.materialCache.set(key, material);
    return material;
  }

  /**
   * エッジ線用マテリアル
   */
  public getEdgeMaterial(): THREE.LineBasicMaterial {
    return new THREE.LineBasicMaterial({
      color: 0x444444,
      transparent: true,
      opacity: 0.4,
    });
  }

  /**
   * キャッシュされたマテリアルの解放
   */
  public dispose(): void {
    for (const mat of this.materialCache.values()) {
      mat.dispose();
    }
    this.materialCache.clear();
  }
}
