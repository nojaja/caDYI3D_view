import * as THREE from 'three';
import { CommentObject } from '../types/cadiy4';

export class CommentBuilder {
  /**
   * commentオブジェクトからThree.jsのGroupを生成する（吹き出し・引き出し線）
   */
  public build(obj: CommentObject): THREE.Group {
    const group = new THREE.Group();
    group.name = `comment-${obj.id}`;

    const color = obj.color ? new THREE.Color(obj.color.r, obj.color.g, obj.color.b) : new THREE.Color(0, 0, 0);

    // 1. テキスト吹き出しラベル
    const text = obj.text || obj.name || '';
    const labelMesh = this.createLabelMesh(text, obj);
    group.add(labelMesh);

    // 2. 引き出し線（矢印線）
    if (obj.arrowPoint) {
      const q = new THREE.Quaternion(obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w);
      const qInv = q.clone().invert();

      // arrowPoint のローカル座標 (position からの相対ベクトル)
      const targetLocal = new THREE.Vector3(
        obj.arrowPoint.x - obj.position.x,
        obj.arrowPoint.y - obj.position.y,
        obj.arrowPoint.z - obj.position.z
      ).applyQuaternion(qInv);

      // 引き出し線 (原点 0,0,0 から targetLocal へ)
      const linePoints = [new THREE.Vector3(0, 0, 0), targetLocal];
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
      const lineMaterial = new THREE.LineBasicMaterial({ color, linewidth: 2 });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      group.add(line);

      // 矢印の先端ヘッド (小さなコーン)
      const arrowDir = targetLocal.clone().normalize();
      const coneLength = 0.04;
      const coneRadius = 0.015;
      const coneGeometry = new THREE.ConeGeometry(coneRadius, coneLength, 12);
      coneGeometry.translate(0, -coneLength / 2, 0); // 頂点を原点に
      coneGeometry.rotateX(Math.PI / 2); // Z軸向きに

      const coneMaterial = new THREE.MeshBasicMaterial({ color });
      const coneMesh = new THREE.Mesh(coneGeometry, coneMaterial);
      coneMesh.position.copy(targetLocal);
      coneMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), arrowDir);
      group.add(coneMesh);
    }

    group.position.set(obj.position.x, obj.position.y, obj.position.z);
    group.quaternion.set(obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w);
    group.visible = obj.visible !== false;

    group.userData = { cadiyObject: obj };
    return group;
  }

  private createLabelMesh(text: string, obj: CommentObject): THREE.Mesh {
    const scale = obj.fontSize ? Math.max(obj.fontSize / 24, 0.6) : 1.0;
    const textLen = Math.max(text.length, 3);
    const width = Math.max(0.15, textLen * 0.035) * scale;
    const height = 0.08 * scale;

    let material: THREE.Material;

    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        // 背景色
        const bg = obj.backgroundColor || { r: 1, g: 1, b: 0.8, a: 1 };
        ctx.fillStyle = `rgba(${Math.round(bg.r * 255)}, ${Math.round(bg.g * 255)}, ${Math.round(bg.b * 255)}, ${bg.a ?? 1})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 外枠線
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);

        // テキスト
        const color = obj.color || { r: 0, g: 0, b: 0 };
        ctx.fillStyle = `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`;
        ctx.font = 'bold 50px sans-serif';
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
        color: 0xfffae0,
        side: THREE.DoubleSide,
      });
    }

    const geometry = new THREE.PlaneGeometry(width, height);
    geometry.rotateX(-Math.PI / 2); // 水平面に向ける
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `comment-label-${obj.id}`;
    return mesh;
  }
}
