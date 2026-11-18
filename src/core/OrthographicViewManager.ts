import * as THREE from 'three';

export interface OrthographicFrustum {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface ThreeViewCameras {
  top: THREE.OrthographicCamera;
  front: THREE.OrthographicCamera;
  side: THREE.OrthographicCamera;
}

export class OrthographicViewManager {
  private cameras: ThreeViewCameras | null = null;
  private currentZoom: number = 1.0;
  private baseMaxDim: number = 1.0;
  private center: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  /**
   * バウンディングボックスとアスペクト比から最適な平行投影の錐台(Frustum)を計算
   */
  public calculateFrustum(box: THREE.Box3, aspect: number = 1.0): OrthographicFrustum {
    const size = new THREE.Vector3();
    box.getSize(size);

    this.baseMaxDim = Math.max(size.x, size.y, size.z, 0.1);
    box.getCenter(this.center);

    const marginFactor = 1.25; // 25% マージン
    const halfH = (this.baseMaxDim / 2) * marginFactor;
    const halfW = halfH * aspect;

    return {
      left: -halfW,
      right: halfW,
      top: halfH,
      bottom: -halfH,
    };
  }

  /**
   * 三面図（Top: 平面図, Front: 正面図, Side: 右側図）の3台のカメラを生成
   */
  public createCameras(
    center: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    distance: number = 1.5,
    frustum: OrthographicFrustum = { left: -0.5, right: 0.5, top: 0.5, bottom: -0.5 }
  ): ThreeViewCameras {
    this.center.copy(center);
    const near = 0.01;
    const far = 100;

    // 1. 平面図 (Top) カメラ: 上から下 (+Y -> -Y)
    const topCam = new THREE.OrthographicCamera(
      frustum.left,
      frustum.right,
      frustum.top,
      frustum.bottom,
      near,
      far
    );
    topCam.position.set(center.x, center.y + distance, center.z);
    topCam.up.set(0, 0, -1);
    topCam.lookAt(center);

    // 2. 正面図 (Front) カメラ: 手前から奥 (+Z -> -Z)
    const frontCam = new THREE.OrthographicCamera(
      frustum.left,
      frustum.right,
      frustum.top,
      frustum.bottom,
      near,
      far
    );
    frontCam.position.set(center.x, center.y, center.z + distance);
    frontCam.up.set(0, 1, 0);
    frontCam.lookAt(center);

    // 3. 右側図 (Side) カメラ: 右から左 (+X -> -X)
    const sideCam = new THREE.OrthographicCamera(
      frustum.left,
      frustum.right,
      frustum.top,
      frustum.bottom,
      near,
      far
    );
    sideCam.position.set(center.x + distance, center.y, center.z);
    sideCam.up.set(0, 1, 0);
    sideCam.lookAt(center);

    this.cameras = {
      top: topCam,
      front: frontCam,
      side: sideCam,
    };

    this.applyZoom();
    return this.cameras;
  }

  /**
   * ビューポートのアスペクト比に合わせてカメラのFrustumを更新
   */
  public updateCameraAspect(camera: THREE.OrthographicCamera, aspect: number): void {
    const marginFactor = 1.25;
    const halfH = (this.baseMaxDim / 2) * marginFactor;
    const halfW = halfH * aspect;

    camera.left = -halfW;
    camera.right = halfW;
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.updateProjectionMatrix();
  }

  /**
   * 3視点すべてのズーム倍率を同期更新
   */
  public setZoom(zoom: number): void {
    this.currentZoom = zoom;
    this.applyZoom();
  }

  public getZoom(): number {
    return this.currentZoom;
  }

  private applyZoom(): void {
    if (!this.cameras) return;
    this.cameras.top.zoom = this.currentZoom;
    this.cameras.front.zoom = this.currentZoom;
    this.cameras.side.zoom = this.currentZoom;

    this.cameras.top.updateProjectionMatrix();
    this.cameras.front.updateProjectionMatrix();
    this.cameras.side.updateProjectionMatrix();
  }

  public getCameras(): ThreeViewCameras | null {
    return this.cameras;
  }
}
