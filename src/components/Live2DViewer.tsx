import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { LAppLive2DManager } from '../lib/live2d';

interface Live2DViewerProps {
  width?: number | string;
  height?: number | string;
  className?: string;
  onModelChange?: (index: number) => void;
}

export interface Live2DViewerHandle {
  changeModel: (index: number) => void;
  nextModel: () => void;
  getCurrentModelIndex: () => number;
}

export const Live2DViewer = forwardRef<Live2DViewerHandle, Live2DViewerProps>(
  function Live2DViewer(
    { width = '100%', height = '100%', className = '', onModelChange },
    ref
  ) {
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

    // 외부에서 호출할 수 있는 메서드 노출
    useImperativeHandle(ref, () => ({
      changeModel: (index: number) => {
        managerRef.current?.changeScene(index);
        onModelChange?.(index);
      },
      nextModel: () => {
        managerRef.current?.nextScene();
        const newIndex = managerRef.current?.getSceneIndex() ?? 0;
        onModelChange?.(newIndex);
      },
      getCurrentModelIndex: () => {
        return managerRef.current?.getSceneIndex() ?? 0;
      },
    }), [onModelChange]);

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
);
