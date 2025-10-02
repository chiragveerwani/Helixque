import { useState } from "react";
import { IconScreenShare, IconScreenShareOff, IconLoader2 } from "@tabler/icons-react";

interface ScreenShareButtonProps {
  isSharing: boolean;
  isLoading: boolean;
  onClick: () => void;
  disabled?: boolean;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "compact";
}

/**
 * Enhanced Screen Share Button Component
 * Provides visual feedback and accessibility features
 */
export const ScreenShareButton: React.FC<ScreenShareButtonProps> = ({
  isSharing,
  isLoading,
  onClick,
  disabled = false,
  showLabel = false,
  size = "md",
  variant = "default"
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const sizeClasses = {
    sm: "h-8 w-8 p-1.5",
    md: "h-11 w-11 p-2.5",
    lg: "h-12 w-12 p-3"
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5", 
    lg: "h-6 w-6"
  };

  const getButtonClasses = () => {
    const baseClasses = "relative rounded-full flex items-center justify-center transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black";
    const sizeClass = variant === "compact" ? sizeClasses.sm : sizeClasses[size];
    
    if (disabled) {
      return `${baseClasses} ${sizeClass} bg-gray-700 text-gray-500 cursor-not-allowed`;
    }
    
    if (isSharing) {
      return `${baseClasses} ${sizeClass} bg-blue-600 hover:bg-blue-700 text-white shadow-lg ${isHovered ? 'scale-105' : ''}`;
    }
    
    return `${baseClasses} ${sizeClass} bg-white/10 hover:bg-white/20 text-white ${isHovered ? 'scale-105' : ''}`;
  };

  const getIcon = () => {
    const iconClass = iconSizes[size];
    
    if (isLoading) {
      return <IconLoader2 className={`${iconClass} animate-spin`} />;
    }
    
    if (isSharing) {
      return <IconScreenShareOff className={iconClass} />;
    }
    
    return <IconScreenShare className={iconClass} />;
  };

  const getTooltipText = () => {
    if (disabled) return "Screen sharing not available";
    if (isLoading) return "Processing...";
    if (isSharing) return "Stop screen share";
    return "Start screen share";
  };

  const getAriaLabel = () => {
    if (isLoading) return "Screen share loading";
    if (isSharing) return "Stop screen sharing";
    return "Start screen sharing";
  };

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || isLoading}
        className={getButtonClasses()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={getAriaLabel()}
        title={getTooltipText()}
      >
        {getIcon()}
        
        {/* Active indicator */}
        {isSharing && (
          <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-black">
            <div className="h-full w-full rounded-full bg-green-400 animate-pulse"></div>
          </div>
        )}
        
        {/* Label */}
        {showLabel && (
          <span className="ml-2 text-sm font-medium">
            {isSharing ? "Stop Share" : "Share Screen"}
          </span>
        )}
      </button>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
        {getTooltipText()}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
};