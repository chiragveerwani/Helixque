import { Socket } from "socket.io";
import { ScreenShareState, ScreenShareEvent, ScreenShareError } from "../types/screenShare";

/**
 * Screen Share Manager - Handles all screen sharing related functionality
 * Following the Single Responsibility Principle and Dependency Injection patterns
 */
export class ScreenShareManager {
  private activeScreenShares = new Map<string, ScreenShareState>();
  private screenShareHistory = new Map<string, ScreenShareEvent[]>();

  /**
   * Initialize screen sharing for a user
   * @param userId - User socket ID
   * @param roomId - Room ID
   * @param constraints - Screen share constraints
   */
  public startScreenShare(
    userId: string, 
    roomId: string, 
    constraints: any
  ): ScreenShareEvent {
    const event: ScreenShareEvent = {
      type: "start",
      data: { constraints },
      timestamp: Date.now(),
      userId,
      roomId
    };

    // Store active screen share state
    this.activeScreenShares.set(userId, {
      isScreenSharing: true,
      micOn: true, // Assume mic stays on during screen share
      camOn: false, // Camera typically replaced by screen share
      quality: this.determineQuality(constraints),
      displaySurface: constraints?.video?.displaySurface || "unknown"
    });

    // Add to history
    this.addToHistory(userId, event);

    console.log(`[ScreenShare] User ${userId} started screen sharing in room ${roomId}`);
    return event;
  }

  /**
   * Stop screen sharing for a user
   * @param userId - User socket ID
   * @param roomId - Room ID
   */
  public stopScreenShare(userId: string, roomId: string): ScreenShareEvent {
    const event: ScreenShareEvent = {
      type: "stop",
      timestamp: Date.now(),
      userId,
      roomId
    };

    // Update state
    const currentState = this.activeScreenShares.get(userId);
    if (currentState) {
      this.activeScreenShares.set(userId, {
        ...currentState,
        isScreenSharing: false,
        camOn: true // Restore camera when screen share stops
      });
    }

    // Add to history
    this.addToHistory(userId, event);

    console.log(`[ScreenShare] User ${userId} stopped screen sharing in room ${roomId}`);
    return event;
  }

  /**
   * Handle screen sharing errors
   * @param userId - User socket ID
   * @param roomId - Room ID
   * @param error - Screen share error
   */
  public handleScreenShareError(
    userId: string, 
    roomId: string, 
    error: ScreenShareError
  ): ScreenShareEvent {
    const event: ScreenShareEvent = {
      type: "error",
      data: { error },
      timestamp: Date.now(),
      userId,
      roomId
    };

    // Clean up state on error
    this.activeScreenShares.delete(userId);
    this.addToHistory(userId, event);

    console.error(`[ScreenShare] Error for user ${userId} in room ${roomId}:`, error);
    return event;
  }

  /**
   * Get current screen share state for a user
   * @param userId - User socket ID
   */
  public getScreenShareState(userId: string): ScreenShareState | null {
    return this.activeScreenShares.get(userId) || null;
  }

  /**
   * Get all active screen shares in a room
   * @param roomId - Room ID
   */
  public getActiveScreenSharesInRoom(roomId: string): Map<string, ScreenShareState> {
    const roomScreenShares = new Map<string, ScreenShareState>();
    
    // This would require room membership tracking - simplified for now
    this.activeScreenShares.forEach((state, userId) => {
      if (state.isScreenSharing) {
        roomScreenShares.set(userId, state);
      }
    });

    return roomScreenShares;
  }

  /**
   * Clean up resources when user disconnects
   * @param userId - User socket ID
   */
  public cleanup(userId: string): void {
    this.activeScreenShares.delete(userId);
    // Keep history for analytics but could be cleaned up periodically
    console.log(`[ScreenShare] Cleaned up resources for user ${userId}`);
  }

  /**
   * Get screen sharing analytics/metrics
   * @param userId - User socket ID
   */
  public getMetrics(userId: string): ScreenShareEvent[] {
    return this.screenShareHistory.get(userId) || [];
  }

  /**
   * Private helper to determine quality from constraints
   * @param constraints - Screen share constraints
   */
  private determineQuality(constraints: any): "low" | "medium" | "high" | "ultra" {
    const width = constraints?.video?.width?.ideal || 1920;
    const height = constraints?.video?.height?.ideal || 1080;
    const frameRate = constraints?.video?.frameRate?.ideal || 30;

    if (width >= 3840 && height >= 2160) return "ultra"; // 4K
    if (width >= 2560 && height >= 1440) return "high";  // 1440p
    if (width >= 1920 && height >= 1080) return "medium"; // 1080p
    return "low"; // Below 1080p
  }

  /**
   * Private helper to add events to history
   * @param userId - User socket ID
   * @param event - Screen share event
   */
  private addToHistory(userId: string, event: ScreenShareEvent): void {
    const history = this.screenShareHistory.get(userId) || [];
    history.push(event);
    
    // Keep only last 50 events to prevent memory issues
    if (history.length > 50) {
      history.shift();
    }
    
    this.screenShareHistory.set(userId, history);
  }
}