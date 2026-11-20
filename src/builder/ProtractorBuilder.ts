import * as THREE from 'three';
import { ProtractorObject } from '../types/cadiy4';

export class ProtractorBuilder {
  /**
   * protractor (分度器・角度注釈) オブジェクトからThree.jsのGroupを生成する
   */
  public build(obj: ProtractorObject): THREE.Group {
    const group = new THREE.Group();
    group.name = `protractor-${obj.id}`;

    const color = obj.color
      ? new THREE.Color(obj.color.r, obj.color.g, obj.color.b)
      : new THREE.Color(0.2, 0.2, 0.2);
    const lineMaterial = new THREE.LineBasicMaterial({ color });

    const angleDeg = obj.angle || 0;
    const angleRad = (angleDeg * Math.PI) / 180;
    const radius = Math.max(obj.size?.x || 0.15, 0.05);

    // 1. 2本の挟み線 (始端・終端の辺: (0,0,0) -> 始線, (0,0,0) -> 終線)
    const leg1Points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(radius, 0, 0)];
    const leg2Points = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(radius * Math.cos(angleRad), 0, radius * Math.sin(angleRad)),
    ];
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(leg1Points), lineMaterial));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(leg2Points), lineMaterial));

    // 2. 角度円弧 (Arc)
    const arcSegments = 24;
    const arcRadius = radius * 0.7; // 挟み線の少し内側に円弧を描く
    const arcPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= arcSegments; i++) {
      const theta = (i / arcSegments) * angleRad;
      arcPoints.push(new THREE.Vector3(arcRadius * Math.cos(theta), 0, arcRadius * Math.sin(theta)));
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPoints), lineMaterial));

    // 3. 角度ラベル (例: "60°")
    if (obj.textVisible !== false) {
      const labelText = `${Math.round(angleDeg * 10) / 10}°`;
      const labelMesh = this.createLabelMesh(labelText, color, obj.fontSize);
      if (labelMesh) {
        const midTheta = angleRad / 2;
        const labelRadius = arcRadius + 0.04;
        labelMesh.position.set(
          labelRadius * Math.cos(midTheta),
          0.005,
          labelRadius * Math.sin(midTheta)
        );
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
      partName: obj.partName,
      angle: obj.angle,
    };

    // 注釈ラインおよびラベルは3Dレイキャスト交差判定の対象外とする
    group.traverse((child) => {
      child.raycast = () => {};
    });

    return group;
  }

  private createLabelMesh(text: string, color: THREE.Color, fontSize?: number): THREE.Mesh {
    const scale = fontSize ? Math.max(fontSize / 24, 0.6) : 1.0;
    const width = 0.16 * scale;
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
