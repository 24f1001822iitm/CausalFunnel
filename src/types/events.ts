import type { ObjectId } from "mongodb";
import type { EventType } from "@/lib/types";

export interface EventDoc {
  _id?: ObjectId;
  sessionId: string;
  type: EventType;
  url: string;
  rawUrl: string;
  timestamp: Date;
  receivedAt: Date;
  x?: number;
  y?: number;
  pageWidth?: number;
  pageHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  target?: string;
  userAgent?: string;
}
