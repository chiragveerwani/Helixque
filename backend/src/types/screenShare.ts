// Screen sharing types and interfaces for type safety

export interface ScreenShareConstraints {
  video: {
    cursor?: "always" | "motion" | "never";
    displaySurface?: "application" | "browser" | "monitor" | "window";
    frameRate?: { ideal?: number; max?: number };
    width?: { ideal?: number; max?: number };
    height?: { ideal?: number; max?: number };
  };
  audio?: boolean | {
    noiseSuppression?: boolean;
    echoCancellation?: boolean;
    autoGainControl?: boolean;
  };
}

export interface ScreenShareState {
  isScreenSharing: boolean;
  micOn: boolean;
  camOn: boolean;
  quality?: "low" | "medium" | "high" | "ultra";
  displaySurface?: string;
}

export interface ScreenShareEvent {
  type: "start" | "stop" | "error" | "quality-change";
  data?: any;
  timestamp: number;
  userId: string;
  roomId: string;
}

export interface ScreenShareError {
  name: string;
  message: string;
  code?: string;
  type: "permission" | "not-supported" | "not-found" | "aborted" | "connection" | "unknown";
}

export interface ScreenShareMetrics {
  resolution: { width: number; height: number };
  frameRate: number;
  bitrate?: number;
  startTime: number;
  endTime?: number;
  duration?: number;
}