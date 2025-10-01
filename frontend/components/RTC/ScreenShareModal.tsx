import { useState, useEffect } from "react";
import { 
  IconScreenShare, 
  IconX, 
  IconSettings, 
  IconDeviceDesktop, 
  IconInfoCircle,
  IconCheck,
  IconLoader2
} from "@tabler/icons-react";

interface ScreenShareModalProps {
  isOpen: boolean;
  isSharing: boolean;
  isLoading: boolean;
  onClose: () => void;
  onStartShare: (constraints?: any) => Promise<boolean>;
  onStopShare: () => Promise<boolean>;
  metrics?: {
    resolution: { width: number; height: number };
    frameRate: number;
    displaySurface?: string;
  } | null;
}

interface QualityPreset {
  id: string;
  name: string;
  description: string;
  constraints: {
    video: {
      width: { ideal: number; max: number };
      height: { ideal: number; max: number };
      frameRate: { ideal: number; max: number };
    };
  };
}

const qualityPresets: QualityPreset[] = [
  {
    id: "high",
    name: "High Quality",
    description: "1080p @ 30fps - Recommended for presentations",
    constraints: {
      video: {
        width: { ideal: 1920, max: 1920 },
        height: { ideal: 1080, max: 1080 },
        frameRate: { ideal: 30, max: 30 }
      }
    }
  },
  {
    id: "medium",
    name: "Medium Quality", 
    description: "720p @ 30fps - Good balance of quality and performance",
    constraints: {
      video: {
        width: { ideal: 1280, max: 1280 },
        height: { ideal: 720, max: 720 },
        frameRate: { ideal: 30, max: 30 }
      }
    }
  },
  {
    id: "ultra",
    name: "Ultra Quality",
    description: "4K @ 60fps - For high-end displays (requires good connection)",
    constraints: {
      video: {
        width: { ideal: 3840, max: 3840 },
        height: { ideal: 2160, max: 2160 },
        frameRate: { ideal: 60, max: 60 }
      }
    }
  }
];

/**
 * Professional Screen Share Modal Component
 * Follows accessibility guidelines and modern UI/UX patterns
 */
export const ScreenShareModal: React.FC<ScreenShareModalProps> = ({
  isOpen,
  isSharing,
  isLoading,
  onClose,
  onStartShare,
  onStopShare,
  metrics
}) => {
  const [selectedQuality, setSelectedQuality] = useState<string>("high");
  const [includeAudio, setIncludeAudio] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleStartShare = async () => {
    const preset = qualityPresets.find(p => p.id === selectedQuality);
    if (!preset) return;

    const constraints = {
      ...preset.constraints,
      audio: includeAudio ? {
        noiseSuppression: true,
        echoCancellation: false
      } : false
    };

    const success = await onStartShare(constraints);
    if (success) {
      onClose();
    }
  };

  const handleStopShare = async () => {
    try {
      const success = await onStopShare();
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error("[ScreenShareModal] Failed to stop screen share", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="screen-share-title"
    >
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-600/20 p-2">
              <IconScreenShare className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h2 id="screen-share-title" className="text-xl font-semibold text-white">
                {isSharing ? "Screen Sharing Active" : "Screen Share Settings"}
              </h2>
              <p className="text-sm text-gray-400">
                {isSharing ? "Manage your screen sharing session" : "Configure your screen sharing preferences"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
            aria-label="Close modal"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        {/* Current Status */}
        {isSharing && metrics && (
          <div className="mb-6 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <IconCheck className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium text-green-400">Currently Sharing</span>
            </div>
            <div className="text-sm text-gray-300 space-y-1">
              <div>Resolution: {metrics.resolution.width}×{metrics.resolution.height}</div>
              <div>Frame Rate: {metrics.frameRate} fps</div>
              {metrics.displaySurface && (
                <div>Source: {metrics.displaySurface}</div>
              )}
            </div>
          </div>
        )}

        {/* Quality Settings (only when not sharing) */}
        {!isSharing && (
          <div className="mb-6">
            <label className="mb-3 block text-sm font-medium text-white">
              Video Quality
            </label>
            <div className="space-y-2">
              {qualityPresets.map((preset) => (
                <label
                  key={preset.id}
                  className={`block cursor-pointer rounded-lg border p-3 transition-colors ${
                    selectedQuality === preset.id
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="quality"
                    value={preset.id}
                    checked={selectedQuality === preset.id}
                    onChange={(e) => setSelectedQuality(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{preset.name}</div>
                      <div className="text-sm text-gray-400">{preset.description}</div>
                    </div>
                    <div className={`h-4 w-4 rounded-full border-2 ${
                      selectedQuality === preset.id
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-400"
                    }`}>
                      {selectedQuality === preset.id && (
                        <div className="h-full w-full rounded-full bg-white scale-50"></div>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Audio Settings (only when not sharing) */}
        {!isSharing && (
          <div className="mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAudio}
                onChange={(e) => setIncludeAudio(e.target.checked)}
                className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <div className="text-sm font-medium text-white">Include System Audio</div>
                <div className="text-xs text-gray-400">Share computer sounds along with screen</div>
              </div>
            </label>
          </div>
        )}

        {/* Info Banner */}
        <div className="mb-6 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
          <div className="flex gap-2">
            <IconInfoCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-200">
              {isSharing
                ? "You can stop sharing at any time by clicking the stop button or using your browser's screen sharing controls."
                : "Your browser will ask you to select which screen, window, or tab to share. Choose carefully as this will be visible to other participants."
              }
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {isSharing ? (
            <>
              <button
                onClick={handleStopShare}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <IconScreenShare className="h-4 w-4" />
                )}
                Stop Sharing
              </button>
              <button
                onClick={onClose}
                className="px-4 py-3 text-sm font-medium text-gray-300 hover:text-white"
              >
                Close
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-white/10 px-4 py-3 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleStartShare}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <IconLoader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <IconScreenShare className="h-4 w-4" />
                )}
                Start Sharing
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};