import * as THREE from 'three';
import { DimensionObject } from '../types/cadiy4';

export class DimensionBuilder {
  /**
   * dimensionオブジェクトからThree.jsのGroupを生成する
   */
  public build(obj: DimensionObject): THREE.Group {
    const group = new THREE.Group();
    group.name = `dimension-${obj.id}`;

    const length = obj.size?.z || 0; // 寸法線の長さ (m)
    const color = obj.color
      ? new THREE.Color(obj.color.r, obj.color.g, obj.color.b)
      : new THREE.Color(0.2, 0.2, 0.2);
    const lineMaterial = new THREE.LineBasicMaterial({ color });

    // オブジェクトの辺からのオフセット量 (m)
    // measure.offset があればそれを優先、なければ size.x / 2 を使用
    const offset = obj.measure?.offset ?? (obj.size?.x ? obj.size.x / 2 : 0.075);
    const overhang = 0.01; // 引き出し線が主寸法線を越える長さ (10mm)

    // 1. 両端の引き出し線 (オブジェクトの辺端点から寸法線外側へ伸ばす)
    const ext1Points = [
      new THREE.Vector3(0, 0, -length / 2),
      new THREE.Vector3(offset + overhang, 0, -length / 2),
    ];
    const ext2Points = [
      new THREE.Vector3(0, 0, length / 2),
      new THREE.Vector3(offset + overhang, 0, length / 2),
    ];
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ext1Points), lineMaterial));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ext2Points), lineMaterial));

    // 2. 主寸法線 (offset 位置で辺に平行に Z 方向へ引く)
    const mainLinePoints = [
      new THREE.Vector3(offset, 0, -length / 2),
      new THREE.Vector3(offset, 0, length / 2),
    ];
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(mainLinePoints), lineMaterial));

    // 3. 矢印 (Arrowheads: inside)
    const arrowLen = Math.min(0.012, length * 0.15);
    const arrowWid = arrowLen * 0.4;
    // 始端側矢印
    const arrow1Points = [
      new THREE.Vector3(offset + arrowWid, 0, -length / 2 + arrowLen),
      new THREE.Vector3(offset, 0, -length / 2),
      new THREE.Vector3(offset - arrowWid, 0, -length / 2 + arrowLen),
    ];
    // 終端側矢印
    const arrow2Points = [
      new THREE.Vector3(offset + arrowWid, 0, length / 2 - arrowLen),
      new THREE.Vector3(offset, 0, length / 2),
      new THREE.Vector3(offset - arrowWid, 0, length / 2 - arrowLen),
    ];
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(arrow1Points), lineMaterial));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(arrow2Points), lineMaterial));

    // 4. 寸法値ラベル (主寸法線のさらに外側に配置)
    if (obj.textVisible !== false) {
      const rawVal = obj.measure?.valueMm ?? length * 1000;
      const mmValue = Math.round(rawVal * 10) / 10;
      const scale = obj.fontSize ? Math.max(obj.fontSize / 24, 0.6) : 1.0;
      const labelMesh = this.createLabelMesh(`${mmValue}`, color, obj.fontSize);
      if (labelMesh) {
        // 主寸法線 (offset) の外側 (offset + 0.02) に配置
        labelMesh.position.set(offset + 0.025 * scale, 0.001, 0);
        group.add(labelMesh);
      }
    }

    group.position.set(obj.position.x, obj.position.y, obj.position.z);
    group.quaternion.set(obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w);
    group.visible = obj.visible !== false;

    group.userData = {
      cadiyObject: obj,
      id: obj.id,
      name: obj.name,
      offset,
      length,
    };

    // 寸法線およびラベルは3Dレイキャスト交差判定の対象外とする
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
    // X-Z 平面上で寸法線 (Z軸) と平行に配置
    mesh.rotateX(-Math.PI / 2);
    mesh.rotateZ(-Math.PI / 2);
    return mesh;
  }
}
