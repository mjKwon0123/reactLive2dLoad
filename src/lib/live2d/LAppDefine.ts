/**
 * Live2D 모델 관련 설정
 */

import { LogLevel } from '@framework/live2dcubismframework';

// 캔버스 크기 설정
export const CanvasSize: { width: number; height: number } | 'auto' = 'auto';

// 뷰 관련 설정
export const ViewScale = 1.0;
export const ViewMaxScale = 2.0;
export const ViewMinScale = 0.8;

export const ViewLogicalLeft = -1.0;
export const ViewLogicalRight = 1.0;
export const ViewLogicalBottom = -1.0;
export const ViewLogicalTop = 1.0;

export const ViewLogicalMaxLeft = -2.0;
export const ViewLogicalMaxRight = 2.0;
export const ViewLogicalMaxBottom = -2.0;
export const ViewLogicalMaxTop = 2.0;

// 리소스 경로 (public 폴더 기준)
export const ResourcesPath = '/';

// 모델 정의
export const ModelDir: string[] = ['Haru', 'Mao', 'Hiyori'];
export const ModelDirSize: number = ModelDir.length;

// 모션 그룹
export const MotionGroupIdle = 'Idle';
export const MotionGroupTapBody = 'TapBody';

// 히트 영역 이름
export const HitAreaNameHead = 'Head';
export const HitAreaNameBody = 'Body';

// 모션 우선순위
export const PriorityNone = 0;
export const PriorityIdle = 1;
export const PriorityNormal = 2;
export const PriorityForce = 3;

// MOC3 정합성 검증 옵션
export const MOCConsistencyValidationEnable = true;
export const MotionConsistencyValidationEnable = true;

// 디버그 로그 옵션
export const DebugLogEnable = true;
export const DebugTouchLogEnable = false;

// Cubism SDK 로그 레벨
export const CubismLoggingLevel: LogLevel = LogLevel.LogLevel_Verbose;

// 렌더 타깃 크기
export const RenderTargetWidth = 1900;
export const RenderTargetHeight = 1000;

