import http from "http";
import express from "express";
import { Server, Socket } from "socket.io";

import { UserManager } from "./managers/UserManger"; // keep your current path
import { ScreenShareManager } from "./managers/ScreenShareManager";
// import { pubClient, subClient } from "./cache/redis";
// import { presenceUp, presenceHeartbeat, presenceDown, countOnline } from "./cache/presence";
// import { createAdapter } from "@socket.io/redis-adapter";

// ⬇️ NEW: import your chat wiring/util
import { wireChat, joinChatRoom } from "./chat/chat";

const app = express();
const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*" } });
// io.adapter(createAdapter(pubClient, subClient));

const userManager = new UserManager();
const screenShareManager = new ScreenShareManager();

// Health endpoint
app.get("/healthz", async (_req, res) => {
  try {
    // const online = await countOnline().catch(() => -1);
    // res.json({ ok: true, online });
    res.json({ ok: true, online: -1 }); // fallback without Redis
  } catch {
    res.json({ ok: true, online: -1 });
  }
});

const HEARTBEAT_MS = Number(process.env.SOCKET_HEARTBEAT_MS || 30_000);
const heartbeats = new Map<string, ReturnType<typeof setInterval>>();

io.on("connection", (socket: Socket) => {
  console.log(`[io] connected ${socket.id}`);

  // Derive meta
  const meta = {
    name: (socket.handshake.auth?.name as string) || "guest",
    ip: (socket.handshake.address as string) || null,
    ua: (socket.handshake.headers["user-agent"] as string) || null,
  };

  // Presence (disabled Redis for now)
  // presenceUp(socket.id, meta).catch((e) => console.warn("[presenceUp]", e.message));
  const hb = setInterval(() => {
    // presenceHeartbeat(socket.id).catch((e) => console.warn("[presenceHeartbeat]", e.message));
  }, HEARTBEAT_MS);
  heartbeats.set(socket.id, hb);

  // Track user
  userManager.addUser(meta.name, socket, meta);

  // ⬇️ Hook up chat listeners (chat:join, chat:message, chat:typing)
  wireChat(io, socket);

  // ⬇️ Auto-join a chat room if the client provided it (no matchmaking).
  //    Supports either `io(..., { auth: { roomId }})` or `?roomId=...`
  const roomFromAuth = (socket.handshake.auth?.roomId as string) || "";
  const roomFromQuery = (socket.handshake.query?.roomId as string) || "";
  const initialRoomId = (roomFromAuth || roomFromQuery || "").toString().trim();

  if (initialRoomId) {
    joinChatRoom(socket, initialRoomId, meta.name);
    userManager.setRoom(socket.id, initialRoomId);
    socket.join(initialRoomId); // <-- so socket.to(roomId) works
  }

  // ⬇️ Keep UserManager in sync when client explicitly joins later
  socket.on("chat:join", ({ roomId }: { roomId: string; name?: string }) => {
    if (roomId) userManager.setRoom(socket.id, roomId);
    if (roomId) socket.join(roomId);
  });

  // ===== SCREEN SHARING MANAGEMENT =====
  
  /**
   * Handle screen share start event
   * Uses proper error handling and state management
   */
  socket.on("screenshare:start", async ({ roomId, constraints }) => {
    try {
      const event = screenShareManager.startScreenShare(socket.id, roomId, constraints);
      
      // Broadcast to room members
      socket.to(roomId).emit("screenshare:peer-started", {
        userId: socket.id,
        state: screenShareManager.getScreenShareState(socket.id),
        timestamp: event.timestamp
      });

      // Acknowledge to sender
      socket.emit("screenshare:start-success", { event });
      
      console.log(`[ScreenShare] Started for ${socket.id} in room ${roomId}`);
    } catch (error: any) {
      const errorEvent = screenShareManager.handleScreenShareError(
        socket.id, 
        roomId, 
        {
          name: error.name || "UnknownError",
          message: error.message || "Failed to start screen sharing",
          type: "unknown"
        }
      );
      
      socket.emit("screenshare:error", { error: errorEvent.data?.error });
      console.error(`[ScreenShare] Start failed for ${socket.id}:`, error);
    }
  });

  /**
   * Handle screen share stop event
   */
  socket.on("screenshare:stop", ({ roomId }) => {
    try {
      const event = screenShareManager.stopScreenShare(socket.id, roomId);
      
      // Broadcast to room members
      socket.to(roomId).emit("screenshare:peer-stopped", {
        userId: socket.id,
        state: screenShareManager.getScreenShareState(socket.id),
        timestamp: event.timestamp
      });

      // Acknowledge to sender
      socket.emit("screenshare:stop-success", { event });
      
      console.log(`[ScreenShare] Stopped for ${socket.id} in room ${roomId}`);
    } catch (error: any) {
      console.error(`[ScreenShare] Stop failed for ${socket.id}:`, error);
      socket.emit("screenshare:error", { 
        error: { message: "Failed to stop screen sharing" }
      });
    }
  });

  /**
   * Handle screen share quality change
   */
  socket.on("screenshare:quality-change", ({ roomId, quality }) => {
    const currentState = screenShareManager.getScreenShareState(socket.id);
    if (currentState && currentState.isScreenSharing) {
      // Update quality in state (extend ScreenShareManager as needed)
      socket.to(roomId).emit("screenshare:peer-quality-changed", {
        userId: socket.id,
        quality,
        timestamp: Date.now()
      });
    }
  });

  /**
   * Get screen share state for a room
   */
  socket.on("screenshare:get-room-state", ({ roomId }, callback) => {
    try {
      const roomSockets = io.sockets.adapter.rooms.get(roomId) ?? new Set<string>();
      const activeScreenShares = Array.from(roomSockets).reduce<
        [string, NonNullable<ReturnType<typeof screenShareManager.getScreenShareState>>][]
      >((acc, socketId) => {
        const state = screenShareManager.getScreenShareState(socketId);
        if (state?.isScreenSharing) {
          acc.push([socketId, state]);
        }
        return acc;
      }, []);

      callback({ success: true, data: activeScreenShares });
    } catch (error) {
      callback({ success: false, error: "Failed to get room state" });
    }
  });
  // ===== LEGACY SCREEN SHARE EVENTS (for backward compatibility) =====
  
  // Legacy screen share state toggle
  socket.on("screen:state", ({ roomId, on }) => {
    console.log(`[Legacy] Screen state change: ${on} for ${socket.id}`);
    socket.to(roomId).emit("screen:state", { on, from: socket.id });
  });

  // WebRTC signaling events for screen sharing
  socket.on("screenshare:offer", ({ roomId, sdp }) => {
    socket.to(roomId).emit("screenshare:offer", { sdp, from: socket.id });
  });

  socket.on("screenshare:answer", ({ roomId, sdp }) => {
    socket.to(roomId).emit("screenshare:answer", { sdp, from: socket.id });
  });

  socket.on("screenshare:ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("screenshare:ice-candidate", { candidate, from: socket.id });
  });

  // Media state change (unified approach)
  socket.on("media-state-change", ({ isScreenSharing, micOn, camOn }) => {
    const roomId = userManager.getUser(socket.id)?.roomId;
    if (roomId) {
      console.log(`[MediaState] ${socket.id} in room ${roomId}:`, { isScreenSharing, micOn, camOn });
      
      // Update screen share state if needed
      if (isScreenSharing !== undefined) {
        const currentState = screenShareManager.getScreenShareState(socket.id);
        if (isScreenSharing && !currentState?.isScreenSharing) {
          // Auto-register screen share start
          screenShareManager.startScreenShare(socket.id, roomId, {});
        } else if (!isScreenSharing && currentState?.isScreenSharing) {
          // Auto-register screen share stop
          screenShareManager.stopScreenShare(socket.id, roomId);
        }
      }
      
      socket.to(roomId).emit("peer-media-state-change", { 
        isScreenSharing, 
        micOn, 
        camOn,
        from: socket.id,
        userId: socket.id
      });
    }
  });

  // --- Media state (aggregated) ---
  socket.on("media:state", ({ roomId, state }: { roomId: string; state: { micOn?: boolean; camOn?: boolean } }) => {
    socket.to(roomId).emit("peer:media-state", { state });
  });

  // Legacy single toggles (optional; still supported)
  socket.on("media:cam", ({ roomId, on }) => {
    socket.to(roomId).emit("media:cam", { on });
  });
  socket.on("media:mic", ({ roomId, on }) => {
    socket.to(roomId).emit("media:mic", { on });
  });

  // (Optional) Back-compat aliases if you ever used these names:
  socket.on("state:update", ({ roomId, micOn, camOn }) => {
    socket.to(roomId).emit("peer:state", { micOn, camOn });
  });

  // Renegotiation passthrough (your existing)
  socket.on("renegotiate-offer", ({ roomId, sdp, role }) => {
    socket.to(roomId).emit("renegotiate-offer", { sdp, role });
  });

  socket.on("renegotiate-answer", ({ roomId, sdp, role }) => {
    socket.to(roomId).emit("renegotiate-answer", { sdp, role });
  });

  socket.on("disconnect", (reason) => {
    console.log(`[io] disconnected ${socket.id} (${reason})`);

    clearInterval(heartbeats.get(socket.id)!);
    heartbeats.delete(socket.id);

    // Clean up screen sharing resources
    screenShareManager.cleanup(socket.id);

    // presence down (disabled Redis)
    // presenceDown(socket.id).catch((e) => console.warn("[presenceDown]", e.message));

    // Optional: announce "left" to current room (mirrors joinChatRoom)
    const u = userManager.getUser(socket.id);
    if (u?.roomId) {
      socket.nsp.in(`chat:${u.roomId}`).emit("chat:system", {
        text: `${u.name} left the chat`,
        ts: Date.now(),
      });
      
      // Notify room about screen share stop if user was sharing
      const screenShareState = screenShareManager.getScreenShareState(socket.id);
      if (screenShareState?.isScreenSharing) {
        socket.nsp.to(u.roomId).emit("screenshare:peer-stopped", {
          userId: socket.id,
          reason: "user-disconnected",
          timestamp: Date.now()
        });
      }
    }

    userManager.removeUser(socket.id);
  });

  socket.on("error", (err) => console.warn(`[io] socket error ${socket.id}:`, err));
});

const PORT = Number(process.env.PORT || 5001);
server.listen(PORT, () => console.log(`listening on *:${PORT}`));
