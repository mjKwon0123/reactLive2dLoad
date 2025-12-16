/**
 * Vite asset import를 사용한 모델 로더
 * src/assets에서 모델 파일을 로드하여 public 폴더 노출 없이 사용
 */

// 모든 모델 관련 파일들을 eager import
const modelFiles = import.meta.glob('/src/assets/**/*', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const rawFiles = import.meta.glob('/src/assets/**/*.{json,moc3}', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

/**
 * assets 경로를 실제 URL로 변환
 */
export function getAssetUrl(path: string): string {
  // /Haru/xxx 형태를 /src/assets/Haru/xxx 형태로 변환
  const assetPath = `/src/assets${path}`;
  
  if (modelFiles[assetPath]) {
    return modelFiles[assetPath];
  }
  
  console.warn(`Asset not found: ${path}`);
  return path;
}

/**
 * JSON 또는 바이너리 파일의 raw 데이터 가져오기
 */
export function getAssetRaw(path: string): string | null {
  const assetPath = `/src/assets${path}`;
  
  if (rawFiles[assetPath]) {
    return rawFiles[assetPath];
  }
  
  return null;
}

/**
 * 모델 디렉토리의 모든 파일 URL 맵 가져오기
 */
export function getModelFileMap(modelDir: string): Record<string, string> {
  const prefix = `/src/assets/${modelDir}/`;
  const fileMap: Record<string, string> = {};
  
  for (const [path, url] of Object.entries(modelFiles)) {
    if (path.startsWith(prefix)) {
      // /src/assets/Haru/xxx -> xxx
      const relativePath = path.substring(prefix.length);
      fileMap[relativePath] = url;
    }
  }
  
  return fileMap;
}

/**
 * ArrayBuffer로 파일 로드 (fetch 대체)
 */
export async function loadFileAsArrayBuffer(path: string): Promise<ArrayBuffer> {
  const url = getAssetUrl(path);
  const response = await fetch(url);
  return response.arrayBuffer();
}

