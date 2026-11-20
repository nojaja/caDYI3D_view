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

export interface BoundingBox3D {
  min: Vector3;
  max: Vector3;
}

export interface CameraData {
  position: Vector3;
  target: Vector3;
  fov?: number;
  isOrthographic?: boolean;
  partsLabelDisplayMode?: string;
  showShadow?: boolean;
  showFloor?: boolean;
  drawMode?: string;
  presetView?: string;
  legacyDrawMode?: string | number;
  legacyLayerColorMode?: boolean;
  legacyViewingMode?: string;
}

export interface SceneSnapshot {
  id: number;
  name: string;
  camera: CameraData;
  visibleLayerIds: number[];
}

export interface StandardRef {
  setId: string | number;
  standardId: string | number;
  name?: string;
  snapshotAt?: string;
}

export interface DimensionMeasure {
  start: Vector3;
  end: Vector3;
  side?: Vector3;
  offset?: number;
  valueMm: number;
}

export interface SourceMaterial {
  type: string;
  standardSize?: Vector3;
  color?: ColorRGB;
  commentText?: string;
  specificGravity?: number;
  textureId?: number;
}

export interface EdgeCut {
  edgeIndex: number;
  mode: 'cut' | 'round' | string;
  faceADist: number;
  faceBDist: number;
  radius?: number;
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
  | 'waveBoard'
  | 'tube'
  | 'polygon'
  | 'picture'
  | 'boolean'
  | 'screw'
  | 'steelProfile'
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
  defaultPaintId?: string;
  displayId?: number;
  type: ObjectType;
  dummy?: boolean;
  remarks?: string;
  rotationDeg?: Vector3;
  worldBounds?: BoundingBox3D;
  noAggregated?: boolean;
  standardRef?: StandardRef;
  edgeCuts?: EdgeCut[];
}

export interface LumberObject extends CadiyObjectBase {
  type: 'lumber';
  cutAngles?: number[];
  edgeCuts?: EdgeCut[];
  standardRef?: StandardRef;
  unitPrice?: number;
  specificGravity?: number;
  legacyStandardSize?: Vector3;
}

export interface BoardObject extends CadiyObjectBase {
  type: 'board';
  cutAngles?: number[];
  edgeCuts?: EdgeCut[];
  standardRef?: StandardRef;
  unitPrice?: number;
  specificGravity?: number;
  legacyStandardSize?: Vector3;
}

export interface CylinderObject extends CadiyObjectBase {
  type: 'cylinder' | 'roundBoard';
  unitPrice?: number;
  specificGravity?: number;
  legacyStandardSize?: Vector3;
  roundEdgeCuts?: EdgeCut[];
}

export interface DimensionObject extends CadiyObjectBase {
  type: 'dimension';
  linePattern?: number;
  auxLinePattern?: number;
  lineWidth?: number;
  arrowType?: 'inside' | 'outside' | string;
  textVisible?: boolean;
  valuePosition?: string;
  symbol?: string;
  fontSize?: number;
  billboard?: boolean;
  measure?: DimensionMeasure;
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
  contentRotation?: number;
}

export interface CommentObject extends CadiyObjectBase {
  type: 'comment';
  text?: string;
  arrowPoint?: Vector3;
  fontSize?: number;
  backgroundColor?: ColorRGBA;
  billboard?: boolean;
}

export interface ProtractorObject extends CadiyObjectBase {
  type: 'protractor';
  angle?: number;
  linePattern?: number;
  auxLinePattern?: number;
  lineWidth?: number;
  arrowType?: string;
  textVisible?: boolean;
  fontSize?: number;
  billboard?: boolean;
}

export interface WaveBoardObject extends CadiyObjectBase {
  type: 'waveBoard';
  thickness?: number;
  subType?: string;
}

export interface TubeObject extends CadiyObjectBase {
  type: 'tube';
  thickness?: number;
  subType?: string;
}

export interface PolygonObject extends CadiyObjectBase {
  type: 'polygon';
  modelName?: string;
  meshRef?: string;
  weightG?: number;
  unitPrice?: number;
  snapVertices?: Vector3[];
  vertices?: any[] | string;
  faces?: any[] | string;
}

export interface PictureImageItem {
  id: number;
  imageBase64: string;
}

export interface PictureObject extends CadiyObjectBase {
  type: 'picture';
  imageBase64Id?: number;
  imageBase64?: string;
  imageMimeType?: string;
  aspectRatioFixed?: boolean;
  aspectRatio?: number;
  dispPattern?: number;
  contentRotation?: number;
}

export interface BooleanObject extends CadiyObjectBase {
  type: 'boolean';
  vertices?: any[];
  faces?: any[];
  sourceMaterials?: SourceMaterial[];
}

export interface MergedObject extends CadiyObjectBase {
  type: 'merged';
  operation?: 'union' | 'difference' | 'intersection' | string;
  originalModels?: CadiyObject[];
  baseMaterialIndex?: number;
  mergedGeometry?: {
    meshGeometry?: any;
  };
}

export interface ScrewObject extends CadiyObjectBase {
  type: 'screw';
  diameterIndex?: number;
  screwLength?: number;
  layout?: string;
  orientation?: string;
  screwType?: string;
  showDimension?: boolean;
  screwColor?: string;
  lineColor?: string;
  linePattern1?: number;
  linePattern2?: number;
  lineWidth?: number;
  screwPosition?: number;
}

export interface SteelProfileObject extends CadiyObjectBase {
  type: 'steelProfile';
  shape?: string;
  material?: string;
  thickness?: number;
}

export type CadiyObject =
  | LumberObject
  | BoardObject
  | CylinderObject
  | DimensionObject
  | TextBoardObject
  | CommentObject
  | ProtractorObject
  | WaveBoardObject
  | TubeObject
  | PolygonObject
  | PictureObject
  | BooleanObject
  | MergedObject
  | ScrewObject
  | SteelProfileObject
  | CadiyObjectBase;

export interface LayerData {
  id: number;
  name: string;
  visible: boolean;
  locked: boolean;
  color?: ColorRGB;
  colorMode?: boolean;
  parentId?: number | null;
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

export interface PolygonMeshFace {
  indices: number[];
  vertexNormals?: Vector3[];
}

export interface PolygonMeshItem {
  meshId: string;
  vertices: Vector3[] | number[];
  faces: PolygonMeshFace[] | number[];
}

export interface PolygonMesh {
  vertices?: Vector3[] | number[];
  faces?: PolygonMeshFace[] | number[];
}

export interface PaintItem {
  id: string;
  name: string;
  color: ColorRGB;
  finish?: string;
  specs?: any[];
}

export interface PaintSnapshot {
  id?: string;
  name?: string;
  isPreset?: boolean;
  paints?: PaintItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface MovableGroup {
  id: string;
  name?: string;
  kind: 'rotate' | 'slide' | 'move' | string;
  axisPosition: Vector3;
  axisQuaternion: Quaternion;
  rotateMax?: number;
  rotateCurrent?: number;
  moveMax?: number;
  moveCurrent?: number;
  targetObjectIds?: string[];
  parentGroupId?: string | null;
  order?: number;
  playTrigger?: string;
  playDelaySec?: number;
  playDurationSec?: number;
  playMode?: string;
  playRepeat?: number;
}

export interface Cadiy4Data {
  version: number;
  thumbnail: string;
  revision?: number;
  camera: CameraData;
  objects: CadiyObject[];
  layers: LayerData[];
  activeLayerId?: number;
  selectedIds?: string[];
  snaps?: SceneSnapshot[];
  cutList?: CutListData;
  movableGroups?: MovableGroup[];
  paint?: {
    snapshot?: PaintSnapshot;
  };
  pictureImageTable?: PictureImageItem[];
  polygonMeshTable?: PolygonMeshItem[] | Record<string, PolygonMesh>;
}
