/**
 * caDIY3D V4 (.cadiy4) ファイル形式の TypeScript 型定義
 * 準拠: docs/spec/cadiy4format/cadiy4.schema.json
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

export interface ColorRGBA extends ColorRGB {
  a?: number;
}

export interface CameraData {
  position: Vector3;
  target: Vector3;
}

export interface StandardRef {
  setId: number;
  standardId: number;
  name?: string;
  snapshotAt?: string;
}

export type ObjectType =
  | 'lumber'
  | 'board'
  | 'cylinder'
  | 'roundBoard'
  | 'dimension'
  | 'comment'
  | 'textBoard'
  | 'protractor'
  | 'polygonMesh'
  | string;

export interface CadiyObjectBase {
  id: string;
  name: string;
  partName?: string;
  position: Vector3;
  quaternion: Quaternion;
  size: Vector3;
  visible: boolean;
  locked?: boolean;
  groupId?: number;
  layerId?: number;
  color: ColorRGB;
  textureId?: number;
  displayId?: number;
  type: ObjectType;
  remarks?: string;
}

export interface LumberObject extends CadiyObjectBase {
  type: 'lumber';
  cutAngles?: number[];
  standardRef?: StandardRef;
  unitPrice?: number;
  specificGravity?: number;
}

export interface BoardObject extends CadiyObjectBase {
  type: 'board';
  cutAngles?: number[];
  standardRef?: StandardRef;
  unitPrice?: number;
  specificGravity?: number;
}

export interface CylinderObject extends CadiyObjectBase {
  type: 'cylinder' | 'roundBoard';
  specificGravity?: number;
}

export interface DimensionObject extends CadiyObjectBase {
  type: 'dimension';
  linePattern?: number;
  auxLinePattern?: number;
  lineWidth?: number;
  arrowType?: 'inside' | 'outside' | string;
  textVisible?: boolean;
}

export interface TextBoardObject extends CadiyObjectBase {
  type: 'textBoard';
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  backgroundColor?: ColorRGBA;
  frameVisible?: boolean;
}

export type CadiyObject =
  | LumberObject
  | BoardObject
  | CylinderObject
  | DimensionObject
  | TextBoardObject
  | CadiyObjectBase;

export interface LayerData {
  id: number;
  name: string;
  visible: boolean;
  locked: boolean;
  color?: ColorRGB;
}

export interface CutLayoutItem {
  baseId: number;
  partsId: string;
  x: number;
  z: number;
}

export interface CutListData {
  cutWidthMm: number;
  packingMode: string;
  layouts: CutLayoutItem[];
}

export interface Cadiy4Data {
  version: number;
  thumbnail: string;
  camera: CameraData;
  objects: CadiyObject[];
  layers?: LayerData[];
  snaps?: any[];
  cutList?: CutListData;
  polygonMeshTable?: Record<string, any>;
}
