"use client";
import { useRouter } from "next/navigation";

export default function PrejoinHome() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
      <h1 className="text-5xl font-extrabold mb-6 drop-shadow-lg">Welcome to Helixque</h1>
      <p className="mb-8 max-w-md text-center text-lg drop-shadow-md">
        Your professional networking video platform. Connect, chat, and build meaningful relationships.
      </p>
      <button
        onClick={() => router.push("/prejoin/username")}
        className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-lg shadow-lg hover:bg-blue-50 transition"
      >
        Get Started
      </button>
    </div>
  );
}
