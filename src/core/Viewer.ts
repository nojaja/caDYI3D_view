import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Cadiy4Data, CadiyObject } from '../types/cadiy4';
import { ModelBuilder } from '../builder/ModelBuilder';
import { OrthographicViewManager } from './OrthographicViewManager';
import { ViewMode } from './ViewModeManager';

export interface ViewerOptions {
  container: HTMLElement;
  onObjectSelected?: (object: CadiyObject | null) => void;
}

export class Viewer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private modelBuilder: ModelBuilder;
  private orthoViewManager = new OrthographicViewManager();
  private viewMode: ViewMode = '3d';
  private currentModelGroup: THREE.Group | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private onObjectSelected?: (object: CadiyObject | null) => void;
  private animationFrameId: number | null = null;

  constructor(options: ViewerOptions) {
    this.container = options.container;
    this.onObjectSelected = options.onObjectSelected;

    // 1. シーン初期化
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf4f6f8);

    // 2. カメラ初期化
    const aspect = this.container.clientWidth / this.container.clientHeight || 1;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.01, 100);
    this.camera.position.set(1.5, 1.2, 1.5);

    // 3. レンダラー初期化
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true, // スクリーンショット/テスト用
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // スマホ向けDPR上限
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = this.renderer.domElement;
    canvas.className = 'webgl-canvas';
    canvas.style.touchAction = 'none'; // iOS Safari の画面スクロール防止
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    this.container.appendChild(canvas);

    // 4. OrbitControls初期化 (PC + スマホタッチ操作)
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = true;
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    // 5. モデルビルダー
    this.modelBuilder = new ModelBuilder();

    // 6. ライティングと環境
    this.setupLighting();
    this.setupEnvironment();

    // 7. イベントリスナー登録
    this.bindEvents();

    // 8. アニメーションループ開始
    this.animate = this.animate.bind(this);
    this.animate();
  }

  private setupLighting(): void {
    // 環境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    // メインの太陽光（斜め上方から）
    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.0);
    dirLight.position.set(3, 5, 4);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 15;
    dirLight.shadow.camera.left = -2;
    dirLight.shadow.camera.right = 2;
    dirLight.shadow.camera.top = 2;
    dirLight.shadow.camera.bottom = -2;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    // 補助バックライト
    const fillLight = new THREE.DirectionalLight(0xddeeff, 0.4);
    fillLight.position.set(-3, 2, -3);
    this.scene.add(fillLight);
  }

  private setupEnvironment(): void {
    // 床面グリッド (1m四方、10cm刻み)
    const grid = new THREE.GridHelper(2.0, 20, 0x999999, 0xdddddd);
    grid.position.y = -0.001; // Z-fighting防止
    this.scene.add(grid);
  }

  /**
   * cadiy4 データをロードしてシーンに配置する
   */
  public loadModel(data: Cadiy4Data, isObjectVisible?: (objectId: string) => boolean): void {
    // 既存モデルの破棄
    if (this.currentModelGroup) {
      this.scene.remove(this.currentModelGroup);
      this.modelBuilder.dispose();
      this.currentModelGroup = null;
    }

    // 新モデルの構築
    this.currentModelGroup = this.modelBuilder.build(
      data.objects,
      isObjectVisible,
      data.pictureImageTable,
      data.polygonMeshTable
    );
    this.scene.add(this.currentModelGroup);

    // カメラ同期
    if (data.camera && data.camera.position && data.camera.target) {
      this.camera.position.set(
        data.camera.position.x,
        data.camera.position.y,
        data.camera.position.z
      );
      this.controls.target.set(
        data.camera.target.x,
        data.camera.target.y,
        data.camera.target.z
      );
    } else {
      this.fitToModel();
    }

    this.controls.update();

    // 三面図 (Orthographic) 用カメラの初期化
    const box = new THREE.Box3().setFromObject(this.currentModelGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const frustum = this.orthoViewManager.calculateFrustum(box, 1.0);
    this.orthoViewManager.createCameras(center, 1.5, frustum);

    // グローバル完了フラグ・参照（E2E自動テスト判定用）
    (window as any).__VIEWER_READY__ = true;
    (window as any).__VIEWER__ = this;
    (window as any).__MODEL_GROUP__ = this.currentModelGroup;
  }

  /**
   * 表示モード(3Dview / 材料取り図 / 三面図)の切り替え
   */
  public setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
    if (mode === '3d') {
      this.renderer.setScissorTest(false);
      this.renderer.setViewport(0, 0, this.container.clientWidth, this.container.clientHeight);
    }
  }

  /**
   * 三面図のズーム倍率を変更
   */
  public zoomThreeView(deltaFactor: number): void {
    const current = this.orthoViewManager.getZoom();
    const newZoom = Math.max(0.2, Math.min(10.0, current * deltaFactor));
    this.orthoViewManager.setZoom(newZoom);
  }

  /**
   * 全オブジェクトの可視性を判定関数に基づいて一括同期する
   */
  public syncVisibility(isObjectVisible: (objectId: string) => boolean): void {
    if (!this.currentModelGroup) return;

    this.currentModelGroup.traverse((child) => {
      const obj = child.userData?.cadiyObject as CadiyObject | undefined;
      if (obj) {
        child.visible = isObjectVisible(obj.id);
      }
    });
  }

  /**
   * レイヤー単位の表示/非表示を3Dシーンに適用する
   */
  public setLayerVisibility(layerId: number, visible: boolean): void {
    if (!this.currentModelGroup) return;

    this.currentModelGroup.traverse((child) => {
      const obj = child.userData?.cadiyObject as CadiyObject | undefined;
      if (obj) {
        const objLayerId = obj.layerId !== undefined ? obj.layerId : 0;
        if (objLayerId === layerId) {
          child.visible = visible;
        }
      }
    });
  }

  /**
   * オブジェクトIDからCadiyObjectを検索する
   */
  public getObjectById(id: string): CadiyObject | null {
    if (!this.currentModelGroup) return null;

    let found: CadiyObject | null = null;
    this.currentModelGroup.traverse((child) => {
      const obj = child.userData?.cadiyObject as CadiyObject | undefined;
      if (obj && obj.id === id) {
        found = obj;
      }
    });
    return found;
  }

  /**
   * 外部(UI等)からオブジェクトを選択状態にする
   */
  public selectObjectById(id: string | null): void {
    if (!id) {
      if (this.onObjectSelected) this.onObjectSelected(null);
      return;
    }
    const obj = this.getObjectById(id);
    if (this.onObjectSelected) {
      this.onObjectSelected(obj);
    }
  }

  /**
   * モデル全体が収まるようにカメラ視点を自動調整する
   */
  public fitToModel(): void {
    if (!this.currentModelGroup) return;

    const box = new THREE.Box3().setFromObject(this.currentModelGroup);
    if (box.isEmpty()) return;

    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.8; // 余白係数

    const direction = new THREE.Vector3(1, 0.8, 1.2).normalize();
    this.camera.position.copy(center).add(direction.multiplyScalar(cameraZ));
    this.controls.target.copy(center);
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  /**
   * プリセット視点切替 (top, front, side, isometric)
   */
  public setViewPreset(view: 'top' | 'front' | 'side' | 'isometric'): void {
    const target = this.controls.target.clone();
    const distance = this.camera.position.distanceTo(target) || 1.5;

    switch (view) {
      case 'top':
        this.camera.position.set(target.x, target.y + distance, target.z + 0.0001);
        break;
      case 'front':
        this.camera.position.set(target.x, target.y, target.z + distance);
        break;
      case 'side':
        this.camera.position.set(target.x + distance, target.y, target.z);
        break;
      case 'isometric':
        const iso = distance / Math.sqrt(3);
        this.camera.position.set(target.x + iso, target.y + iso, target.z + iso);
        break;
    }
    this.controls.update();
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));

    const canvas = this.renderer.domElement;
    canvas.addEventListener('click', this.onCanvasClick.bind(this));
    canvas.addEventListener('touchend', this.onCanvasTouchEnd.bind(this), { passive: true });
  }

  private onWindowResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private onCanvasClick(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.pickObject();
  }

  private onCanvasTouchEnd(e: TouchEvent): void {
    if (e.changedTouches.length !== 1) return;
    const touch = e.changedTouches[0];
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
    this.pickObject();
  }

  private pickObject(): void {
    if (!this.currentModelGroup) {
      if (this.onObjectSelected) this.onObjectSelected(null);
      return;
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.currentModelGroup.children, true);

    if (intersects.length > 0) {
      // 一番手前の交差オブジェクトから userData を探す
      let curr: THREE.Object3D | null = intersects[0].object;
      while (curr && !curr.userData?.cadiyObject) {
        curr = curr.parent;
      }
      if (curr && curr.userData?.cadiyObject) {
        if (this.onObjectSelected) this.onObjectSelected(curr.userData.cadiyObject);
        return;
      }
    }

    if (this.onObjectSelected) this.onObjectSelected(null);
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (this.viewMode === 'threeView') {
      this.renderThreeView();
    } else {
      this.renderer.setScissorTest(false);
      this.renderer.setViewport(0, 0, this.container.clientWidth, this.container.clientHeight);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }
  }

  /**
   * 三面図 (Orthographic 3-View) のマルチビューポートレンダリング
   */
  private renderThreeView(): void {
    const topEl = document.getElementById('threeview-top');
    const frontEl = document.getElementById('threeview-front');
    const sideEl = document.getElementById('threeview-side');

    if (!topEl || !frontEl || !sideEl) return;

    const cameras = this.orthoViewManager.getCameras();
    if (!cameras) return;

    const containerRect = this.container.getBoundingClientRect();

    this.renderer.setScissorTest(true);

    // 全体背景を一旦クリア
    this.renderer.setClearColor(0xf4f6f8, 1.0);
    this.renderer.setViewport(0, 0, this.container.clientWidth, this.container.clientHeight);
    this.renderer.setScissor(0, 0, this.container.clientWidth, this.container.clientHeight);
    this.renderer.clear();

    // 1. 平面図 (Top)
    this.renderSubViewport(topEl, containerRect, cameras.top);

    // 2. 正面図 (Front)
    this.renderSubViewport(frontEl, containerRect, cameras.front);

    // 3. 側面図 (Side)
    this.renderSubViewport(sideEl, containerRect, cameras.side);
  }

  private renderSubViewport(
    el: HTMLElement,
    containerRect: DOMRect,
    camera: THREE.OrthographicCamera
  ): void {
    const rect = el.getBoundingClientRect();

    // WebGL座標系 (下から上)
    const left = rect.left - containerRect.left;
    const bottom = containerRect.bottom - rect.bottom;
    const width = rect.width;
    const height = rect.height;

    if (width <= 0 || height <= 0) return;

    this.renderer.setViewport(left, bottom, width, height);
    this.renderer.setScissor(left, bottom, width, height);

    // ビューポート背景をクリア
    this.renderer.setClearColor(0xffffff, 1.0);
    this.renderer.clear();

    // アスペクト比を更新
    this.orthoViewManager.updateCameraAspect(camera, width / height);

    this.renderer.render(this.scene, camera);
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    this.controls.dispose();
    this.renderer.dispose();
    this.modelBuilder.dispose();
  }
}
