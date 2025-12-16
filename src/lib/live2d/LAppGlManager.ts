/**
 * WebGL 관리 클래스
 */
export class LAppGlManager {
  private _gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;

  public constructor() {
    this._gl = null;
  }

  public initialize(canvas: HTMLCanvasElement): boolean {
    // WebGL 컨텍스트 초기화
    this._gl = canvas.getContext('webgl2');

    if (!this._gl) {
      // WebGL2 실패 시 WebGL1 시도
      this._gl = canvas.getContext('webgl');
    }

    if (!this._gl) {
      console.error('WebGL을 초기화할 수 없습니다. 이 브라우저는 WebGL을 지원하지 않습니다.');
      return false;
    }
    return true;
  }

  public release(): void {
    this._gl = null;
  }

  public getGl(): WebGLRenderingContext | WebGL2RenderingContext {
    return this._gl!;
  }
}

