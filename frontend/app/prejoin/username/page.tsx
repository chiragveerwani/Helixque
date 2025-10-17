"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PrejoinUsernamePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleContinue = () => {
    if (username.trim().length === 0) {
      setError("Please enter a valid username");
      return;
    }
    setError("");
    // Navigate to device check page with username as query param
    router.push(`/prejoin/devicecheck?username=${encodeURIComponent(username.trim())}`);
  };

  return (
<div className="flex flex-col items-center justify-center min-h-screen px-4 bg-background text-foreground">
  <div className="w-full max-w-md bg-card text-card-foreground rounded-2xl border border-border shadow-xl p-8">
    <h1 className="text-3xl font-semibold mb-6">Enter your username</h1>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="w-full max-w-md p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
        autoFocus
      />
      {error && <p className="mt-2 text-red-600">{error}</p>}
      <button
        onClick={handleContinue}
        className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300"
        disabled={username.trim().length === 0}
      >
        Continue
      </button>
    </div>
    </div>
  );
}
