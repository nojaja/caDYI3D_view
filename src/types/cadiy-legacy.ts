/**
 * caDIY3D 旧バージョン (.cadiy) XML ファイル形式の TypeScript 型定義
 * 準拠: docs/spec/cadiylegacy/cadiy-legacy.schema.json
 */

export interface LegacyCamera {
  Position: string; // "x,y,z"
  Center: string;   // "x,y,z"
  viewMode?: string;
  fov?: string;
  dist?: string;
  nearZ?: string;
  farZ?: string;
  phai?: string;
  theta?: string;
  ViewingMode?: string;
  RealPrintFrameMode?: string;
  SceneDrawMode?: string;
  ScenePartsNameMode?: string;
  LayerColorMode?: string;
}

export interface LegacyLayerItem {
  LayerID: string;
  LayerName: string;
  LayerVisible: string; // "true" | "false"
  LayerLocked: string;  // "true" | "false"
  LayerColor?: string;  // "#AARRGGBB" | "#RRGGBB"
  LayerColorMode?: string;
  _2xLayerVisibleList?: string;
}

export interface LegacyBooleanMeshInfo {
  BooleanMeshInfoID: string;
  MeshVertex: string; // "x,y,z/x,y,z/..."
  MeshFaceInfo?: { FInfo: string } | Array<{ FInfo: string }>;
}

export interface LegacyPictureImageInfo {
  ImageBase64ID: string;
  ImageBase64: string;
}

export interface LegacyBaseObject {
  Layer?: string;
  ModelType?: string;
  Diffuse?: string;       // "r,g,b,a"
  PaintDiffuse?: string;
  Specular?: string;
  PaintSpecular?: string;
  PaintID?: string;
  Size: string;           // "x,y,z" [m]
  StandardSize?: string;   // "x,y,z" [m]
  SpecificGravity?: string;
  UnitPrice?: string;
  Remarks?: string;
  MakerName?: string;
  BrandName?: string;
  MakerURL?: string;
  NumberPerSet?: string;
  SameSetID?: string;
  SubPartsName?: string;
  IsSubParts?: string;
  HasGuidanceURL?: string;
  LinkedCutPartsText?: string;
  Quaternion: string;     // "x,y,z,w"
  Location: string;       // "x,y,z" [m]
  CutValue?: string;      // "c1,c2,c3,c4,c5,c6,c7,c8"
  RoundValue?: string;    // "r1,r2,r3,r4"
  RoundModes?: string;
  GroupID?: string;
  UniqueID: string;
  Hide?: string;          // "true" | "false"
  ObjectTextureID?: string;
  PlywoodTextureID?: string;
  Texture?: string;
  CommentText?: string;
  NoAggregated?: string;  // "true" | "false"
  Dummy?: string;
  Style?: string;
  GroupCriteria?: string;
}

export interface LegacyPainting {
  PaintID: string;
  PaintName: string;
  PaintColor: string; // "#AARRGGBB"
  PaintSpecular?: string;
  PaintMaker?: string;
  PaintBrand?: string;
  PaintURL?: string;
  PaintImage?: string;
  PaintInfo?: string;
  PaintTextureID?: string;
}

export interface LegacyPaint {
  _2xPaintings?: LegacyPainting | LegacyPainting[];
}

export interface LegacyCommentObject extends LegacyBaseObject {
  LinePattern?: string;
  LineWidth?: string;
  LineColor?: string | { R: string; G: string; B: string; A: string };
  ArrowPoint?: { X: string; Y: string; Z: string } | string;
  SnapVector?: { X: string; Y: string; Z: string } | string;
  LineEndType?: string;
}

export interface LegacyLumberObject extends LegacyBaseObject {
  CutValue?: string;
  RoundValue?: string;
  RoundModes?: string;
}

export interface LegacyBoardObject extends LegacyBaseObject {
  CutValue?: string;
  RoundValue?: string;
  RoundModes?: string;
}

export interface LegacyCylinderObject extends LegacyBaseObject {
  CutValue?: string;
  RoundValue?: string;
  RoundModes?: string;
}

export interface LegacyDimensionObject extends LegacyBaseObject {
  LinePattern1?: string;
  LinePattern2?: string;
  LineWidth?: string;
  LineColor?: string | { R: string; G: string; B: string; A: string };
  LineEndType?: string; // "eEndArrowInside" | "eEndArrowOutside"
  TextVisibled?: string;
  PosDimensionValue?: string;
  DimensionSymbol?: string;
}

export interface LegacyScrewObject extends LegacyBaseObject {
  LinePattern1?: string;
  LinePattern2?: string;
  LineWidth?: string;
  LineColor?: string | { R: string; G: string; B: string; A: string };
  ScrewColor?: string | { R: string; G: string; B: string; A: string };
  ScrewLayout?: string; // "eScrewLayout1"
  ScrewLength?: string; // [m]
  ScrewPosition?: string;
  DispDimension?: string;
  ScrewType?: string;
  ScrewDiameter?: string;
}

export interface LegacyPolygonObject extends LegacyBaseObject {
  ModelName?: string;
}

export interface LegacyBooleanObject extends LegacyBaseObject {
  OriginalModelType?: string;
  ModelName?: string;
  SnapVertex?: string;
  FaceInfoList?: Array<{ FInfo: string }> | { FInfo: string };
  MeshVertex?: string;
  MeshInfoID?: string;
}

export interface LegacyDiyMaterialObject extends LegacyBaseObject {
  DiyMaterialType?: string;
  OriginalSize?: string;
  Thickness?: string;
  Edited?: string;
}

export interface LegacyPictureObject extends LegacyBaseObject {
  FontSize?: string;
  FontStyle?: string;
  FontFamily?: string;
  FrameVisibled?: string;
  AspectRatioFixed?: string;
  AspectRatio?: string;
  ForeColor?: string;
  BackColor?: string;
  BackColorMode?: string;
  ImageMode?: string;
  ImagePath?: string;
  ImageBase64?: string;
  ImageBase64ID?: string;
}

export interface LegacyCutPartItem {
  CutID: string;
  ArrangeTB?: string;
  ArrangeLR?: string;
  PartsText?: string;
  Location?: string; // "z,x"
}

export interface LegacyCutListPartsBase {
  PartsType?: string;
  Size?: string;
  UnitPrice?: string;
  ModelType?: string;
  PartsName?: string;
  Weight?: string;
  SpecificGravity?: string;
  Parts?: {
    CutParts?: LegacyCutPartItem | LegacyCutPartItem[];
  };
}

export interface LegacyCutListPartsSeparator {
  PartsType?: string;
  Size?: string;
  Title?: string;
  Info?: string;
  ModleType?: string;
}

export interface LegacyCutList {
  CutListPartsSeparator?: LegacyCutListPartsSeparator | LegacyCutListPartsSeparator[];
  CutListPartsBase?: LegacyCutListPartsBase | LegacyCutListPartsBase[];
}

export interface Legacy2xModel {
  Version: string;
  Thumbnail?: string;
  Camera: LegacyCamera;
  ObjectTextSize?: string;
  ObjectTextBillboard?: string;
  ObjectTextStyle?: string;
  ObjectTextFont?: string;
  Perspective?: string;
  SceneDrawMode?: string;
  _2xLayer?: {
    _2xLayerInfoItem?: LegacyLayerItem | LegacyLayerItem[];
  };
  _2xPaint?: LegacyPaint | string;
  _2xBooleanMeshInfo?: {
    _2xBooleanMeshInfo?: LegacyBooleanMeshInfo | LegacyBooleanMeshInfo[];
  };
  _2xPictureImageInfos?: {
    _2xPictureImageInfo?: LegacyPictureImageInfo | LegacyPictureImageInfo[];
  };
  _2xObject: {
    _2xBoard?: LegacyBoardObject | LegacyBoardObject[];
    _2xLumber?: LegacyLumberObject | LegacyLumberObject[];
    _2xCylinder?: LegacyCylinderObject | LegacyCylinderObject[];
    _2xComment?: LegacyCommentObject | LegacyCommentObject[];
    _2xDimension?: LegacyDimensionObject | LegacyDimensionObject[];
    _2xScrew?: LegacyScrewObject | LegacyScrewObject[];
    _2xPolygon?: LegacyPolygonObject | LegacyPolygonObject[];
    _2xBoolean?: LegacyBooleanObject | LegacyBooleanObject[];
    _2xDiyMaterial?: LegacyDiyMaterialObject | LegacyDiyMaterialObject[];
    _2xPicture?: LegacyPictureObject | LegacyPictureObject[];
  };
  CutList?: LegacyCutList;
}

export interface LegacyCadiyProject {
  _2xModel: Legacy2xModel;
}
