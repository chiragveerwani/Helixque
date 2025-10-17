"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function RoomPage({ params }: any) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // If params is a promise, unwrap it
    if (typeof params?.then === "function") {
      params.then((resolved: any) => setRoomId(resolved.roomId));
    } else {
      setRoomId(params?.roomId);
    }
  }, [params]);

  useEffect(() => {
    if (!roomId) return;
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get("username") || "";
    const videoDeviceId = urlParams.get("videoDeviceId") || "";
    const audioDeviceId = urlParams.get("audioDeviceId") || "";

    const query = new URLSearchParams();
    query.set("roomId", roomId);
    if (username) query.set("username", username);
    if (videoDeviceId) query.set("videoDeviceId", videoDeviceId);
    if (audioDeviceId) query.set("audioDeviceId", audioDeviceId);

    router.push(`/match?${query.toString()}`);
  }, [roomId, router]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Joining room...</h1>
        <p className="text-gray-400">Redirecting to device setup...</p>
      </div>
    </div>
  );
}

