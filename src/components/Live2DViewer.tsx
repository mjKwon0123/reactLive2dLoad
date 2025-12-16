import { useEffect, useRef, useCallback } from 'react';
import { LAppLive2DManager } from '../lib/live2d';

interface Live2DViewerProps {
  width?: number | string;
  height?: number | string;
  className?: string;
}

export function Live2DViewer({
  width = '100%',
  height = '100%',
  className = '',
}: Live2DViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const managerRef = useRef<LAppLive2DManager | null>(null);

  const handlePointerDown = useCallback((e: PointerEvent) => {
    managerRef.current?.onPointBegan(e.pageX, e.pageY);
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    managerRef.current?.onPointMoved(e.pageX, e.pageY);
  }, []);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    managerRef.current?.onPointEnded(e.pageX, e.pageY);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Live2D 매니저 초기화
    const manager = new LAppLive2DManager();
    managerRef.current = manager;

    if (manager.initialize(canvas)) {
      manager.run();
    }

    // 이벤트 리스너 등록
    document.addEventListener('pointerdown', handlePointerDown, { passive: true });
    document.addEventListener('pointermove', handlePointerMove, { passive: true });
    document.addEventListener('pointerup', handlePointerUp, { passive: true });

    // 클린업
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      manager.release();
      managerRef.current = null;
    };
  }, [handlePointerDown, handlePointerMove, handlePointerUp]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width,
        height,
        display: 'block',
      }}
    />
  );
}

