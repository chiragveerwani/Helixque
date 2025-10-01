import { useCallback, useRef, useState, useEffect } from "react";
import { Socket } from "socket.io-client";
import { toast } from "sonner";

// Types for the screen sharing hook
interface ScreenShareConstraints {
  video: {
    cursor?: "always" | "motion" | "never";
    frameRate?: { ideal?: number; max?: number };
    width?: { ideal?: number; max?: number };
    height?: { ideal?: number; max?: number };
  };
  audio?: boolean | {
    noiseSuppression?: boolean;
    echoCancellation?: boolean;
  };
}

interface ScreenShareState {
  isSharing: boolean;
  isLoading: boolean;
  error: string | null;
  stream: MediaStream | null;
  constraints: ScreenShareConstraints | null;
}

interface UseScreenShareProps {
  socket: Socket | null;
  roomId: string | null;
  videoSenderRef: React.MutableRefObject<RTCRtpSender | null>;
  onScreenShareStart?: (stream: MediaStream) => void;
  onScreenShareStop?: () => void;
  onError?: (error: string) => void;
}

/**
 * Custom hook for managing screen sharing functionality
 * Follows React best practices and provides clean separation of concerns
 */
export const useScreenShare = ({
  socket,
  roomId,
  videoSenderRef,
  onScreenShareStart,
  onScreenShareStop,
  onError
}: UseScreenShareProps) => {
  const [state, setState] = useState<ScreenShareState>({
    isSharing: false,
    isLoading: false,
    error: null,
    stream: null,
    constraints: null
  });

  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  /**
   * Start screen sharing with optimal constraints
   */
  const startScreenShare = useCallback(async (customConstraints?: Partial<ScreenShareConstraints>) => {
    if (!socket || !roomId) {
      const error = "Socket or room ID not available";
      setState(prev => ({ ...prev, error }));
      onError?.(error);
      return false;
    }

    if (state.isSharing) {
      toast.warning("Screen sharing is already active");
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Check browser support
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error("Screen sharing is not supported in this browser");
      }

      // Default high-quality constraints
      const defaultConstraints: ScreenShareConstraints = {
        video: {
          cursor: "always",
          frameRate: { ideal: 30, max: 60 },
          width: { ideal: 1920, max: 3840 },
          height: { ideal: 1080, max: 2160 }
        },
        audio: {
          noiseSuppression: true,
          echoCancellation: false
        }
      };

      const constraints = {
        ...defaultConstraints,
        ...customConstraints,
        video: { ...defaultConstraints.video, ...customConstraints?.video }
      };

      console.log("🎬 Starting screen capture with constraints:", constraints);

      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      const videoTrack = stream.getVideoTracks()[0];

      if (!videoTrack) {
        throw new Error("No video track available from screen capture");
      }

      // Store references
      streamRef.current = stream;
      trackRef.current = videoTrack;

      // Replace video track if sender exists
      if (videoSenderRef.current) {
        await videoSenderRef.current.replaceTrack(videoTrack);
        console.log("✅ Successfully replaced video track with screen share");
      }

      // Handle track ending (user stops sharing via browser UI)
      videoTrack.onended = () => {
        console.log("🛑 Screen share track ended via browser");
        stopScreenShare();
      };

      // Update state
      setState(prev => ({
        ...prev,
        isSharing: true,
        isLoading: false,
        stream,
        constraints,
        error: null
      }));

      // Notify socket
      socket.emit("screenshare:start", { roomId, constraints });

      // Call callbacks
      onScreenShareStart?.(stream);
      
      toast.success("Screen Share Started", {
        description: "You are now sharing your screen"
      });

      return true;
    } catch (error: any) {
      console.error("Error starting screen share:", error);
      
      let errorMessage = "Failed to start screen sharing";
      
      // Handle specific error types
      if (error.name === "NotAllowedError") {
        errorMessage = "Screen sharing permission was denied";
      } else if (error.name === "NotSupportedError") {
        errorMessage = "Screen sharing is not supported in this browser";
      } else if (error.name === "NotFoundError") {
        errorMessage = "No screen capture source available";
      } else if (error.name === "AbortError") {
        errorMessage = "Screen sharing was cancelled";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));

      onError?.(errorMessage);
      toast.error("Screen Share Error", { description: errorMessage });
      
      return false;
    }
  }, [socket, roomId, state.isSharing, videoSenderRef, onScreenShareStart, onError]);

  /**
   * Stop screen sharing
   */
  const stopScreenShare = useCallback(async () => {
    if (!state.isSharing) {
      return false;
    }

    try {
      console.log("🛑 Stopping screen share");

      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
      }

      // Clear track from sender (restore camera or set to null)
      if (videoSenderRef.current) {
        await videoSenderRef.current.replaceTrack(null);
      }

      // Clear references
      streamRef.current = null;
      trackRef.current = null;

      // Update state
      setState(prev => ({
        ...prev,
        isSharing: false,
        stream: null,
        constraints: null,
        error: null
      }));

      // Notify socket
      if (socket && roomId) {
        socket.emit("screenshare:stop", { roomId });
      }

      // Call callback
      onScreenShareStop?.();
      
      toast.success("Screen Share Stopped", {
        description: "You have stopped sharing your screen"
      });

      return true;
    } catch (error: any) {
      console.error("Error stopping screen share:", error);
      
      const errorMessage = error?.message || "Failed to stop screen sharing";
      setState(prev => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
      toast.error("Screen Share Error", { description: errorMessage });
      
      return false;
    }
  }, [state.isSharing, socket, roomId, videoSenderRef, onScreenShareStop, onError]);

  /**
   * Toggle screen sharing
   */
  const toggleScreenShare = useCallback(async (constraints?: Partial<ScreenShareConstraints>) => {
    if (state.isSharing) {
      return await stopScreenShare();
    } else {
      return await startScreenShare(constraints);
    }
  }, [state.isSharing, startScreenShare, stopScreenShare]);

  /**
   * Get current screen share metrics
   */
  const getMetrics = useCallback(() => {
    if (!trackRef.current) return null;

    const settings = trackRef.current.getSettings();
    return {
      resolution: {
        width: settings.width || 0,
        height: settings.height || 0
      },
      frameRate: settings.frameRate || 0,
      displaySurface: (settings as any).displaySurface,
      cursor: (settings as any).cursor
    };
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (state.isSharing) {
        stopScreenShare();
      }
    };
  }, []);

  return {
    // State
    isSharing: state.isSharing,
    isLoading: state.isLoading,
    error: state.error,
    stream: state.stream,
    constraints: state.constraints,
    
    // Actions
    startScreenShare,
    stopScreenShare,
    toggleScreenShare,
    
    // Utils
    getMetrics,
    
    // Direct access to refs if needed
    streamRef: streamRef.current,
    trackRef: trackRef.current
  };
};