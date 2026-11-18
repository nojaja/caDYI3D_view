import * as THREE from 'three';
import { CadiyObject, LumberObject, BoardObject, CylinderObject, DimensionObject, TextBoardObject } from '../types/cadiy4';
import { MaterialFactory } from './MaterialFactory';
import { TextBoardBuilder } from './TextBoardBuilder';
import { DimensionBuilder } from './DimensionBuilder';

export class ModelBuilder {
  private materialFactory: MaterialFactory;
  private textBoardBuilder: TextBoardBuilder;
  private dimensionBuilder: DimensionBuilder;

  constructor(materialFactory?: MaterialFactory) {
    this.materialFactory = materialFactory || new MaterialFactory();
    this.textBoardBuilder = new TextBoardBuilder();
    this.dimensionBuilder = new DimensionBuilder();
  }

  /**
   * オブジェクトリストからThree.jsのGroupを生成する
   */
  public build(objects: CadiyObject[]): THREE.Group {
    const rootGroup = new THREE.Group();
    rootGroup.name = 'cadiy-model-root';

    for (const obj of objects) {
      const mesh = this.createObjectMesh(obj);
      if (mesh) {
        rootGroup.add(mesh);
      }
    }

    return rootGroup;
  }

  /**
   * 単一オブジェクトからMeshまたはObject3Dを生成
   */
  public createObjectMesh(obj: CadiyObject): THREE.Object3D | null {
    if (obj.type === 'textBoard') {
      return this.textBoardBuilder.build(obj as TextBoardObject);
    }

    if (obj.type === 'dimension') {
      return this.dimensionBuilder.build(obj as DimensionObject);
    }

    let geometry: THREE.BufferGeometry | null = null;

    switch (obj.type) {
      case 'lumber':
      case 'board':
        geometry = this.createBoxGeometry(obj as LumberObject | BoardObject);
        break;
      case 'cylinder':
      case 'roundBoard':
        geometry = this.createCylinderGeometry(obj as CylinderObject);
        break;
      default:
        geometry = new THREE.BoxGeometry(obj.size.x, obj.size.y, obj.size.z);
        break;
    }

    if (!geometry) return null;

    const material = this.materialFactory.getWoodMaterial(obj.color);
    const mesh = new THREE.Mesh(geometry, material);

    mesh.name = obj.partName || obj.name;
    mesh.position.set(obj.position.x, obj.position.y, obj.position.z);
    mesh.quaternion.set(obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w);
    mesh.visible = obj.visible !== false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    mesh.userData = {
      cadiyObject: obj,
      id: obj.id,
      name: obj.name,
      partName: obj.partName,
      size: obj.size,
      remarks: obj.remarks,
    };

    // 木材のエッジ線
    const edges = new THREE.EdgesGeometry(geometry, 25);
    const line = new THREE.LineSegments(edges, this.materialFactory.getEdgeMaterial());
    mesh.add(line);

    return mesh;
  }

  private createBoxGeometry(obj: LumberObject | BoardObject): THREE.BoxGeometry {
    return new THREE.BoxGeometry(obj.size.x, obj.size.y, obj.size.z);
  }

  private createCylinderGeometry(obj: CylinderObject): THREE.CylinderGeometry {
    const radiusTop = obj.size.x / 2;
    const radiusBottom = obj.size.x / 2;
    const height = obj.size.z;
    const radialSegments = 32;

    const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments);
    geometry.rotateX(Math.PI / 2);
    return geometry;
  }

  public dispose(): void {
    this.materialFactory.dispose();
  }
}
