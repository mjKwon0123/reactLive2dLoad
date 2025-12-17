/**
 * Live2D 모델 매니저 클래스
 */
import { CubismMatrix44 } from '@framework/math/cubismmatrix44';
import { CubismViewMatrix } from '@framework/math/cubismviewmatrix';
import { CubismFramework, Option } from '@framework/live2dcubismframework';
import { csmVector } from '@framework/type/csmvector';

import * as LAppDefine from './LAppDefine';
import { LAppModel } from './LAppModel';
import { LAppPal } from './LAppPal';
import { LAppGlManager } from './LAppGlManager';
import { LAppTextureManager } from './LAppTextureManager';
import { TouchManager } from './TouchManager';

export class LAppLive2DManager {
  private _canvas: HTMLCanvasElement | null = null;
  private _glManager: LAppGlManager;
  private _textureManager: LAppTextureManager;
  private _viewMatrix: CubismViewMatrix;
  private _deviceToScreen: CubismMatrix44;
  private _models: csmVector<LAppModel>;
  private _sceneIndex = 0;
  private _frameBuffer: WebGLFramebuffer | null = null;
  private _touchManager: TouchManager;
  private _captured = false;
  private _animationId: number | null = null;

  public constructor() {
    this._glManager = new LAppGlManager();
    this._textureManager = new LAppTextureManager();
    this._viewMatrix = new CubismViewMatrix();
    this._deviceToScreen = new CubismMatrix44();
    this._models = new csmVector<LAppModel>();
    this._touchManager = new TouchManager();
  }

  /**
   * 초기화
   */
  public initialize(canvas: HTMLCanvasElement): boolean {
    this._canvas = canvas;

    // WebGL 초기화
    if (!this._glManager.initialize(canvas)) {
      return false;
    }

    // 캔버스 크기 설정
    if (LAppDefine.CanvasSize === 'auto') {
      this.resizeCanvas();
    } else {
      canvas.width = LAppDefine.CanvasSize.width;
      canvas.height = LAppDefine.CanvasSize.height;
    }

    this._textureManager.setGlManager(this._glManager);

    const gl = this._glManager.getGl();

    if (!this._frameBuffer) {
      this._frameBuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    }

    // 투명 설정
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Cubism SDK 초기화
    this.initializeCubism();

    // 뷰 초기화
    this.initializeView();

    // 모델 로드
    this.changeScene(this._sceneIndex);

    return true;
  }

  private initializeCubism(): void {
    LAppPal.updateTime();

    const cubismOption = new Option();
    cubismOption.logFunction = LAppPal.printMessage;
    cubismOption.loggingLevel = LAppDefine.CubismLoggingLevel;
    CubismFramework.startUp(cubismOption);
    CubismFramework.initialize();
  }

  private initializeView(): void {
    const { width, height } = this._canvas!;

    const ratio = width / height;
    const left = -ratio;
    const right = ratio;
    const bottom = LAppDefine.ViewLogicalLeft;
    const top = LAppDefine.ViewLogicalRight;

    this._viewMatrix.setScreenRect(left, right, bottom, top);
    this._viewMatrix.scale(LAppDefine.ViewScale, LAppDefine.ViewScale);

    this._deviceToScreen.loadIdentity();
    if (width > height) {
      const screenW = Math.abs(right - left);
      this._deviceToScreen.scaleRelative(screenW / width, -screenW / width);
    } else {
      const screenH = Math.abs(top - bottom);
      this._deviceToScreen.scaleRelative(screenH / height, -screenH / height);
    }
    this._deviceToScreen.translateRelative(-width * 0.5, -height * 0.5);

    this._viewMatrix.setMaxScale(LAppDefine.ViewMaxScale);
    this._viewMatrix.setMinScale(LAppDefine.ViewMinScale);

    this._viewMatrix.setMaxScreenRect(
      LAppDefine.ViewLogicalMaxLeft,
      LAppDefine.ViewLogicalMaxRight,
      LAppDefine.ViewLogicalMaxBottom,
      LAppDefine.ViewLogicalMaxTop
    );
  }

  private resizeCanvas(): void {
    this._canvas!.width = this._canvas!.clientWidth * window.devicePixelRatio;
    this._canvas!.height = this._canvas!.clientHeight * window.devicePixelRatio;

    const gl = this._glManager.getGl();
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }

  /**
   * 씬 변경
   */
  public changeScene(index: number): void {
    this._sceneIndex = index;

    if (LAppDefine.DebugLogEnable) {
      LAppPal.printMessage(`[APP]model index: ${this._sceneIndex}`);
    }

    const model = LAppDefine.ModelDir[index];
    const modelPath = LAppDefine.ResourcesPath + model + '/';
    let modelJsonName = LAppDefine.ModelDir[index];
    modelJsonName += '.model3.json';

    this.releaseAllModel();
    const instance = new LAppModel();
    instance.setManager(this);
    instance.loadAssets(modelPath, modelJsonName);
    this._models.pushBack(instance);
  }

  private releaseAllModel(): void {
    this._models.clear();
  }

  /**
   * 렌더링 루프 시작
   */
  public run(): void {
    const loop = (): void => {
      LAppPal.updateTime();

      const gl = this._glManager.getGl();

      // 화면 초기화
      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.clearDepth(1.0);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      // 모델 업데이트 및 렌더링
      this.onUpdate();

      this._animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  private onUpdate(): void {
    const { width, height } = this._canvas!;

    const projection = new CubismMatrix44();
    const model = this._models.at(0);

    if (model && model.getModel()) {
      if (model.getModel().getCanvasWidth() > 1.0 && width < height) {
        model.getModelMatrix().setWidth(2.0);
        projection.scale(1.0, width / height);
      } else {
        projection.scale(height / width, 1.0);
      }

      projection.multiplyByMatrix(this._viewMatrix);
    }

    if (model) {
      model.update();
      model.draw(projection);
    }
  }

  /**
   * 드래그
   */
  public onDrag(x: number, y: number): void {
    const model = this._models.at(0);
    if (model) {
      model.setDragging(x, y);
    }
  }

  /**
   * 탭
   */
  public onTap(x: number, y: number): void {
    if (LAppDefine.DebugLogEnable) {
      LAppPal.printMessage(`[APP]tap point: {x: ${x.toFixed(2)} y: ${y.toFixed(2)}}`);
    }

    const model = this._models.at(0);

    if (model && model.hitTest(LAppDefine.HitAreaNameHead, x, y)) {
      if (LAppDefine.DebugLogEnable) {
        LAppPal.printMessage(`[APP]hit area: [${LAppDefine.HitAreaNameHead}]`);
      }
      model.setRandomExpression();
    } else if (model && model.hitTest(LAppDefine.HitAreaNameBody, x, y)) {
      if (LAppDefine.DebugLogEnable) {
        LAppPal.printMessage(`[APP]hit area: [${LAppDefine.HitAreaNameBody}]`);
      }
      model.startRandomMotion(
        LAppDefine.MotionGroupTapBody,
        LAppDefine.PriorityNormal
      );
    }
  }

  /**
   * 마우스 다운
   */
  public onPointBegan(pageX: number, pageY: number): void {
    this._captured = true;

    const localX = pageX - this._canvas!.offsetLeft;
    const localY = pageY - this._canvas!.offsetTop;

    this._touchManager.touchesBegan(
      localX * window.devicePixelRatio,
      localY * window.devicePixelRatio
    );
  }

  /**
   * 마우스 이동
   */
  public onPointMoved(pageX: number, pageY: number): void {
    if (!this._captured) {
      return;
    }

    const localX = pageX - this._canvas!.offsetLeft;
    const localY = pageY - this._canvas!.offsetTop;
    const posX = localX * window.devicePixelRatio;
    const posY = localY * window.devicePixelRatio;

    const viewX = this.transformViewX(this._touchManager.getX());
    const viewY = this.transformViewY(this._touchManager.getY());

    this._touchManager.touchesMoved(posX, posY);

    this.onDrag(viewX, viewY);
  }

  /**
   * 마우스 업
   */
  public onPointEnded(pageX: number, pageY: number): void {
    this._captured = false;

    const localX = pageX - this._canvas!.offsetLeft;
    const localY = pageY - this._canvas!.offsetTop;
    const posX = localX * window.devicePixelRatio;
    const posY = localY * window.devicePixelRatio;

    this.onDrag(0.0, 0.0);

    const x = this.transformViewX(posX);
    const y = this.transformViewY(posY);

    if (LAppDefine.DebugTouchLogEnable) {
      LAppPal.printMessage(`[APP]touchesEnded x: ${x} y: ${y}`);
    }
    this.onTap(x, y);
  }

  private transformViewX(deviceX: number): number {
    const screenX = this._deviceToScreen.transformX(deviceX);
    return this._viewMatrix.invertTransformX(screenX);
  }

  private transformViewY(deviceY: number): number {
    const screenY = this._deviceToScreen.transformY(deviceY);
    return this._viewMatrix.invertTransformY(screenY);
  }

  public nextScene(): void {
    const no = (this._sceneIndex + 1) % LAppDefine.ModelDirSize;
    this.changeScene(no);
  }

  /**
   * 리소스 해제
   */
  public release(): void {
    if (this._animationId !== null) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }

    this._textureManager.release();
    this._glManager.release();
    this.releaseAllModel();

    CubismFramework.dispose();
  }

  public getGl(): WebGLRenderingContext | WebGL2RenderingContext {
    return this._glManager.getGl();
  }

  public getTextureManager(): LAppTextureManager {
    return this._textureManager;
  }

  public getCanvas(): HTMLCanvasElement {
    return this._canvas!;
  }

  public getFrameBuffer(): WebGLFramebuffer | null {
    return this._frameBuffer;
  }

  public getSceneIndex(): number {
    return this._sceneIndex;
  }
}

