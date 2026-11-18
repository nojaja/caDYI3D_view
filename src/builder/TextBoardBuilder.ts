import * as THREE from 'three';
import { TextBoardObject } from '../types/cadiy4';

export class TextBoardBuilder {
  /**
   * textBoardオブジェクトからThree.jsのMeshを生成する
   */
  public build(obj: TextBoardObject): THREE.Mesh {
    const width = Math.max(obj.size.x, 0.05);
    const height = Math.max(obj.size.z, 0.02);

    let material: THREE.Material;

    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        const bg = obj.backgroundColor || { r: 0.95, g: 0.95, b: 0.95, a: 1 };
        ctx.fillStyle = `rgba(${Math.round(bg.r * 255)}, ${Math.round(bg.g * 255)}, ${Math.round(bg.b * 255)}, ${bg.a ?? 1})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (obj.frameVisible !== false) {
          ctx.strokeStyle = '#666666';
          ctx.lineWidth = 4;
          ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
        }

        const textColor = obj.color || { r: 0.1, g: 0.1, b: 0.1 };
        ctx.fillStyle = `rgb(${Math.round(textColor.r * 255)}, ${Math.round(textColor.g * 255)}, ${Math.round(textColor.b * 255)})`;
        const fontStyle = `${obj.bold ? 'bold ' : ''}${obj.italic ? 'italic ' : ''}48px sans-serif`;
        ctx.font = fontStyle;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(obj.text || obj.name, canvas.width / 2, canvas.height / 2);
      }

      const texture = new THREE.CanvasTexture(canvas);
      material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
      });
    } else {
      material = new THREE.MeshBasicMaterial({
        color: 0xeeeeee,
        side: THREE.DoubleSide,
      });
    }

    const geometry = new THREE.PlaneGeometry(width, height);
    // cadiy4 では初期姿勢が XZ 平面（法線 +Y）のため、PlaneGeometry を XZ 平面に合わせてからクォータニオンを適用
    geometry.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = obj.text || obj.name;
    mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
    mesh.quaternion.set(obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w);
    mesh.visible = obj.visible !== false;

    mesh.userData = { cadiyObject: obj };
    return mesh;
  }
}
