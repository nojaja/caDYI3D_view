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
    const labelMesh = this.createLabelMesh(`${mmValue}`, color);
    if (labelMesh) {
      labelMesh.position.set(0, 0.015, 0); // 寸法線の少し上
      group.add(labelMesh);
    }

    group.position.set(obj.position.x, obj.position.y, obj.position.z);
    group.quaternion.set(obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w);
    group.visible = obj.visible !== false;

    group.userData = { cadiyObject: obj };
    return group;
  }

  private createLabelMesh(text: string, color: THREE.Color): THREE.Mesh | null {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
    });
    const geometry = new THREE.PlaneGeometry(0.06, 0.03);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotateX(-Math.PI / 2); // 水平に見やすくする
    return mesh;
  }
}
