/**
 * 플랫폼 의존 기능을 추상화하는 Cubism Platform Abstraction Layer
 */
export class LAppPal {
  /**
   * 파일을 바이트 데이터로 읽어옴
   */
  public static loadFileAsBytes(
    filePath: string,
    callback: (arrayBuffer: ArrayBuffer, size: number) => void
  ): void {
    fetch(filePath)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => callback(arrayBuffer, arrayBuffer.byteLength));
  }

  /**
   * 델타 시간 (이전 프레임과의 차이) 반환
   */
  public static getDeltaTime(): number {
    return this.deltaTime;
  }

  public static updateTime(): void {
    this.currentFrame = Date.now();
    this.deltaTime = (this.currentFrame - this.lastFrame) / 1000;
    this.lastFrame = this.currentFrame;
  }

  /**
   * 메시지 출력
   */
  public static printMessage(message: string): void {
    console.log(message);
  }

  static lastUpdate = Date.now();
  static currentFrame = 0.0;
  static lastFrame = 0.0;
  static deltaTime = 0.0;
}

