import * as THREE from 'three';
import { CadiyObject } from '../types/cadiy4';

export interface FormattedObjectProperties {
  name: string;
  standardName: string;
  price: number | null;
  weightKg: number | null;
  positionMm: { x: number; y: number; z: number };
  sizeMm: { x: number; y: number; z: number };
  rotationDeg: { x: number; y: number; z: number };
  processingInfo: string;
}

/**
 * CadiyObjectからUI詳細表示用のプロパティを計算・フォーマットする
 */
export function formatObjectProperties(object: CadiyObject): FormattedObjectProperties {
  const name = object.partName || object.name;
  const anyObj = object as any;
  const standardName = anyObj.standardRef?.name || object.name;
  const price = typeof anyObj.unitPrice === 'number' ? anyObj.unitPrice : null;

  // 体積 (m^3) と 比重から重量 (kg) を計算
  // 1 m^3 の水 = 1000 kg。比重 0.4 なら 400 kg/m^3
  const volumeM3 = Math.abs(object.size.x * object.size.y * object.size.z);
  const specificGravity = typeof anyObj.specificGravity === 'number' ? anyObj.specificGravity : 0.45;
  const weightKg = volumeM3 > 0 ? volumeM3 * specificGravity * 1000 : null;

  // 位置 (m -> mm)
  const positionMm = {
    x: object.position.x * 1000,
    y: object.position.y * 1000,
    z: object.position.z * 1000,
  };

  // サイズ (m -> mm)
  const sizeMm = {
    x: object.size.x * 1000,
    y: object.size.y * 1000,
    z: object.size.z * 1000,
  };

  // クォータニオンからオイラー角 (degree: -180 ~ 180) に変換
  const q = new THREE.Quaternion(
    object.quaternion.x,
    object.quaternion.y,
    object.quaternion.z,
    object.quaternion.w
  );
  const euler = new THREE.Euler().setFromQuaternion(q, 'XYZ');
  const radToDeg = 180 / Math.PI;
  const rotationDeg = {
    x: Math.round(euler.x * radToDeg * 10) / 10,
    y: Math.round(euler.y * radToDeg * 10) / 10,
    z: Math.round(euler.z * radToDeg * 10) / 10,
  };

  // 形状加工情報 (cutAngles 等)
  let processingInfo = 'なし';
  if (Array.isArray(anyObj.cutAngles) && anyObj.cutAngles.some((a: number) => a !== 0)) {
    const activeAngles = anyObj.cutAngles.filter((a: number) => a !== 0);
    processingInfo = `斜めカット (${activeAngles.map((a: number) => `${a}°`).join(', ')})`;
  }

  return {
    name,
    standardName,
    price,
    weightKg,
    positionMm,
    sizeMm,
    rotationDeg,
    processingInfo,
  };
}
