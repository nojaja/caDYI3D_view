import * as THREE from 'three';
import { TextBoardObject } from '../types/cadiy4';

export class TextBoardBuilder {
  /**
   * textBoardオブジェクトからThree.jsのMeshを生成する
   */
  public build(obj: TextBoardObject): THREE.Mesh {
    const width = Math.max(obj.size.x, 0.01);
    const height = Math.max(obj.size.z, 0.01);

    let material: THREE.Material;

    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const canvas = document.createElement('canvas');
      const aspect = width / height;
      const baseRes = 512;
      let cw: number;
      let ch: number;

      if (width >= height) {
        cw = baseRes;
        ch = Math.max(Math.round(baseRes / aspect), 32);
      } else {
        ch = baseRes;
        cw = Math.max(Math.round(baseRes * aspect), 32);
      }

      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        ctx.clearRect(0, 0, cw, ch);

        const bg = obj.backgroundColor || { r: 0.95, g: 0.95, b: 0.95, a: 1 };
        const alpha = bg.a !== undefined ? bg.a : 1;
        if (alpha > 0) {
          ctx.fillStyle = `rgba(${Math.round(bg.r * 255)}, ${Math.round(bg.g * 255)}, ${Math.round(bg.b * 255)}, ${alpha})`;
          ctx.fillRect(0, 0, cw, ch);
        }

        if (obj.frameVisible !== false) {
          ctx.strokeStyle = '#666666';
          ctx.lineWidth = Math.max(2, Math.round(Math.min(cw, ch) * 0.03));
          const halfLine = ctx.lineWidth / 2;
          ctx.strokeRect(halfLine, halfLine, cw - ctx.lineWidth, ch - ctx.lineWidth);
        }

        // テキスト描画: contentRotation の適用 (caDIY3D の右手系・反時計回り角度指定に対応)
        const rotDeg = obj.contentRotation || 0;
        const rad = -THREE.MathUtils.degToRad(rotDeg);

        ctx.save();
        ctx.translate(cw / 2, ch / 2);
        if (rad !== 0) {
          ctx.rotate(rad);
        }

        // テキスト描画時の有効幅・高さ (回転に応じて入れ替わる)
        const isRotated90or270 = Math.abs(rotDeg % 180) === 90;
        const textAvailableWidth = isRotated90or270 ? ch : cw;
        const textAvailableHeight = isRotated90or270 ? cw : ch;

        const textColor = obj.color || { r: 0.1, g: 0.1, b: 0.1 };
        ctx.fillStyle = `rgb(${Math.round(textColor.r * 255)}, ${Math.round(textColor.g * 255)}, ${Math.round(textColor.b * 255)})`;

        // フォントサイズの決定
        let fontSize = obj.fontSize ? obj.fontSize * (baseRes / 256) : Math.round(textAvailableHeight * 0.45);
        fontSize = Math.min(fontSize, textAvailableHeight * 0.7);

        const fontFamily = obj.fontFamily || 'sans-serif';
        const fontStyle = `${obj.bold ? 'bold ' : ''}${obj.italic ? 'italic ' : ''}${Math.round(fontSize)}px ${fontFamily}`;
        ctx.font = fontStyle;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 文字列がはみ出す場合は縮小
        const text = obj.text || obj.name || '';
        const textWidth = ctx.measureText(text).width;
        if (textWidth > textAvailableWidth * 0.9 && textWidth > 0) {
          const scale = (textAvailableWidth * 0.9) / textWidth;
          fontSize = Math.max(Math.round(fontSize * scale), 10);
          ctx.font = `${obj.bold ? 'bold ' : ''}${obj.italic ? 'italic ' : ''}${fontSize}px ${fontFamily}`;
        }

        ctx.fillText(text, 0, 0);
        ctx.restore();
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
        transparent: true,
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
