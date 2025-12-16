/**
 * 텍스처 관리 클래스
 */
import { csmVector, iterator } from '@framework/type/csmvector';
import type { LAppGlManager } from './LAppGlManager';
import { getAssetUrl } from './ModelLoader';

/**
 * 이미지 정보 구조체
 */
export class TextureInfo {
  img: HTMLImageElement | null = null;
  id: WebGLTexture | null = null;
  width = 0;
  height = 0;
  usePremultply = false;
  fileName = '';
}

export class LAppTextureManager {
  private _textures: csmVector<TextureInfo>;
  private _glManager: LAppGlManager | null = null;

  public constructor() {
    this._textures = new csmVector<TextureInfo>();
  }

  public release(): void {
    for (
      let ite: iterator<TextureInfo> = this._textures.begin();
      ite.notEqual(this._textures.end());
      ite.preIncrement()
    ) {
      this._glManager?.getGl().deleteTexture(ite.ptr().id);
    }
    this._textures.clear();
  }

  /**
   * 이미지 로드
   */
  public createTextureFromPngFile(
    fileName: string,
    usePremultiply: boolean,
    callback: (textureInfo: TextureInfo) => void
  ): void {
    // assets 경로를 실제 URL로 변환
    const imageUrl = getAssetUrl(fileName);

    // 이미 로드된 텍스처 검색
    for (
      let ite: iterator<TextureInfo> = this._textures.begin();
      ite.notEqual(this._textures.end());
      ite.preIncrement()
    ) {
      if (
        ite.ptr().fileName === fileName &&
        ite.ptr().usePremultply === usePremultiply
      ) {
        ite.ptr().img = new Image();
        ite
          .ptr()
          .img!.addEventListener('load', (): void => callback(ite.ptr()), {
            passive: true,
          });
        ite.ptr().img!.src = imageUrl;
        return;
      }
    }

    const img = new Image();
    img.addEventListener(
      'load',
      (): void => {
        const gl = this._glManager!.getGl();
        const tex: WebGLTexture | null = gl.createTexture();

        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        if (usePremultiply) {
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
        }

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);

        const textureInfo = new TextureInfo();
        textureInfo.fileName = fileName;
        textureInfo.width = img.width;
        textureInfo.height = img.height;
        textureInfo.id = tex;
        textureInfo.img = img;
        textureInfo.usePremultply = usePremultiply;
        this._textures.pushBack(textureInfo);

        callback(textureInfo);
      },
      { passive: true }
    );
    img.src = imageUrl;
  }

  public releaseTextures(): void {
    for (let i = 0; i < this._textures.getSize(); i++) {
      this._glManager?.getGl().deleteTexture(this._textures.at(i).id);
    }
    this._textures.clear();
  }

  public setGlManager(glManager: LAppGlManager): void {
    this._glManager = glManager;
  }
}
