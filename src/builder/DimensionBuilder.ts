import * as THREE from 'three';
import { DimensionObject } from '../types/cadiy4';

export class DimensionBuilder {
  /**
   * dimensionオブジェクトからThree.jsのGroupを生成する
   */
  public build(obj: DimensionObject): THREE.Group {
    const group = new THREE.Group();
    group.name = `dimension-${obj.id}`;

    const length = obj.size.z; // 寸法線の長さ (m)
    const color = new THREE.Color(obj.color.r, obj.color.g, obj.color.b);
    const lineMaterial = new THREE.LineBasicMaterial({ color });

    // 主寸法線（Z軸に沿って -length/2 から +length/2）
    const linePoints = [
      new THREE.Vector3(0, 0, -length / 2),
      new THREE.Vector3(0, 0, length / 2),
    ];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    const mainLine = new THREE.Line(lineGeometry, lineMaterial);
    group.add(mainLine);

    // 両端の引き出し線 (補助線: X方向に少し伸ばす)
    const extLen = 0.02; // 20mm
    const ext1Points = [
      new THREE.Vector3(-extLen, 0, -length / 2),
      new THREE.Vector3(extLen, 0, -length / 2),
    ];
    const ext2Points = [
      new THREE.Vector3(-extLen, 0, length / 2),
      new THREE.Vector3(extLen, 0, length / 2),
    ];
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ext1Points), lineMaterial));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ext2Points), lineMaterial));

    // 寸法値ラベル (mm表示: 0.35m -> 350)
    const mmValue = Math.round(length * 1000);
    const labelMesh = this.createLabelMesh(`${mmValue}`, color, obj.fontSize);
    if (labelMesh) {
      const scale = obj.fontSize ? Math.max(obj.fontSize / 24, 0.6) : 1.0;
      labelMesh.position.set(0, 0.04 * scale, 0); // 寸法線の上部に配置
      group.add(labelMesh);
    }

    group.position.set(obj.position.x, obj.position.y, obj.position.z);
    group.quaternion.set(obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w);
    group.visible = obj.visible !== false;

    group.userData = { cadiyObject: obj };

    // 寸法線およびラベルは3Dレイキャスト交差判定の対象外とする（部材クリックの邪魔にならないようにする）
    group.traverse((child) => {
      child.raycast = () => {};
    });

    return group;
  }

  private createLabelMesh(text: string, color: THREE.Color, fontSize?: number): THREE.Mesh {
    const scale = fontSize ? Math.max(fontSize / 24, 0.6) : 1.0;
    const width = 0.20 * scale;
    const height = 0.08 * scale;

    let material: THREE.Material;

    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.fillStyle = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
        ctx.font = 'bold 56px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
      }

      const texture = new THREE.CanvasTexture(canvas);
      material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
      });
    } else {
      material = new THREE.MeshBasicMaterial({
        color: 0x333333,
        side: THREE.DoubleSide,
      });
    }

    const geometry = new THREE.PlaneGeometry(width, height);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotateX(-Math.PI / 2); // 水平に見やすくする
    return mesh;
  }
}
