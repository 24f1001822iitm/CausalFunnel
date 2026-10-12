export type EventType = "page_view" | "click";
export interface EventDTO { id: string; type: EventType; url: string; timestamp: string; x?: number; y?: number; pageWidth?: number; pageHeight?: number; viewportWidth?: number; viewportHeight?: number; target?: string; }
export interface SessionSummary { sessionId: string; eventCount: number; pageViews: number; clicks: number; firstEvent: string; lastEvent: string; durationMs: number; pageCount: number; }
export interface SessionsResponse { sessions: SessionSummary[]; }
export interface SessionEventsResponse { sessionId: string; events: EventDTO[]; }
export interface HeatmapPoint { x: number; y: number; pageWidth: number; pageHeight: number; }
export interface HeatmapResponse { url: string; total: number; points: HeatmapPoint[]; }
export interface PageSummary { url: string; views: number; clicks: number; lastSeen: string; }
export interface PagesResponse { pages: PageSummary[]; }
