import type { Socket } from "socket.io";

export interface User {
  socket: Socket;
  name: string;
  joinedAt?: number;
  meta?: {
    language?: string;
    industry?: string;
    skillBucket?: string;
    ip?: string | null;
    ua?: string | null;
    [key: string]: unknown;
  };
}
