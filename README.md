# CausalFunnel Analytics

A small, self-hosted web analytics tool. You add one `<script>` tag to a website; it records page views and clicks and sends them to a Node backend (Next.js API routes) that stores them in MongoDB. A React dashboard then shows:

- **Sessions** - every visitor session with its ordered event timeline (the user journey).
- **Heatmap** - where users clicked on a given page.

## Architecture

```
 Tracked website                      Next.js app (this repo)                    MongoDB
+-----------------+   POST text/plain  +---------------------------+  insertMany  +-----------+
| public/tracker.js| ----------------> | POST /api/events          | -----------> |  events   |
| (page_view,click)|   {"events":[..]} |  (zod validation, CORS *) |              | collection|
+-----------------+                    +---------------------------+              |           |
                                       | GET /api/sessions         | <----------- |           |
 Dashboard (React)   fetch JSON        | GET /api/sessions/:id/events|  aggregate  |           |
+-----------------+ <----------------> | GET /api/pages            |    / find    |           |
| /sessions        |                   | GET /api/heatmap?url=     |              +-----------+
| /heatmap         |                   +---------------------------+
+-----------------+
```

## Tech stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Node runtime route handlers (no separate server)
- MongoDB (official `mongodb` driver 6.x), `zod` for payload validation
- Tracker: dependency-free vanilla ES5 JavaScript
- CSS modules, no UI/chart library

## Prerequisites

- Node.js 18.18+ (developed on Node 24)
- A MongoDB database: a free MongoDB Atlas cluster, or a local `mongod`

## Setup

```bash
npm install
cp .env.local.example .env.local     # Windows: copy .env.local.example .env.local
# edit .env.local and set:
#   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
#   MONGODB_DB=causalfunnel
npm run dev
```

Open http://localhost:3000. `MONGODB_URI` is required; `MONGODB_DB` defaults to `causalfunnel`. For local Mongo use e.g. `mongodb://127.0.0.1:27017/`.

MongoDB Atlas quick start: create a free (M0) cluster, add a database user, under Network Access add your IP (use `0.0.0.0/0` for Vercel), then copy the connection string from "Connect > Drivers". Collection and indexes are created automatically on first request.

Other scripts: `npm run lint`, `npm run typecheck`, `npm run build`, `npm start`.

## Embedding the tracker

```html
<script src="https://HOST/tracker.js" data-endpoint="https://HOST/api/events"></script>
```

- `data-endpoint` is optional; it defaults to `/api/events` on the same host as the script.
- `data-debug` logs each event to the browser console.
- Tracks: a `page_view` on load and on SPA navigation (`pushState`/`replaceState`/`popstate`), and every trusted `click` with page coordinates.
- Session id: a UUID kept in `localStorage` (`cf_sid`), renewed after 30 minutes of inactivity; falls back to a cookie, then to memory if storage is blocked.
- Events are batched (flush after 2 s, at 10 events, on tab hide/pagehide) and sent with `sendBeacon`, falling back to `fetch(keepalive)`. Content type is `text/plain` so cross-origin posts need no CORS preflight. The tracker never throws into the host page.

## Using the demo and dashboard

- `/demo` and `/demo/pricing` are sample pages with the tracker already installed. Click around, and use the "Pricing" link (SPA navigation) and "Pricing (full reload)" link.
- `/sessions` lists sessions (newest first); select one to see its ordered timeline (event type, path, time, offset, click coordinates).
- `/heatmap` has a page dropdown (pages sorted by click count); clicks are drawn as translucent dots, so overlapping clicks look hotter.
- `/` redirects to `/sessions`. Use the Refresh buttons to reload data.

## API reference

All endpoints send `Access-Control-Allow-Origin: *`. Errors are `{"error": "..."}` (validation errors also include `issues`).

### POST /api/events
Body (JSON, `Content-Type: text/plain` or `application/json`, max 10 KB, up to 50 events). A single bare event object is also accepted.

```json
{"events":[
  {"session_id":"cba7508d-a564-4d2c-8eb4-987c83b3f9c0","type":"page_view","url":"https://site.com/demo?x=1","timestamp":1760279430003,"vw":1000,"vh":700,"pw":1000,"ph":2000},
  {"session_id":"cba7508d-a564-4d2c-8eb4-987c83b3f9c0","type":"click","url":"https://site.com/demo","timestamp":1760279433900,"x":440,"y":380,"vw":1000,"vh":700,"pw":1000,"ph":2000,"target":"button#a.btn"}
]}
```
Response `201`: `{"ok":true,"inserted":2}`. Invalid input returns `400` (`413` if too large).

### GET /api/sessions
Query: `limit` (default 50, max 200), `page` (default 1) or `skip`.
```json
{"sessions":[{"sessionId":"sess-aaaaaaaa","eventCount":3,"pageViews":2,"clicks":1,
  "firstEvent":"2026-10-12T14:30:14.000Z","lastEvent":"2026-10-12T14:30:16.000Z","durationMs":2000,"pageCount":2}]}
```

### GET /api/sessions/{id}/events
Events ordered by timestamp (max 5000).
```json
{"sessionId":"sess-aaaaaaaa","events":[
  {"id":"6acc...","type":"page_view","url":"http://localhost:3111/demo","timestamp":"2026-10-12T14:30:14.000Z"},
  {"id":"6acc...","type":"click","url":"http://localhost:3111/demo","timestamp":"2026-10-12T14:30:15.000Z",
   "x":100,"y":200,"pageWidth":1000,"pageHeight":2000,"viewportWidth":1000,"viewportHeight":700,"target":"button#a.btn"}]}
```

### GET /api/pages
Per-URL totals, sorted by clicks then views (max 200).
```json
{"pages":[{"url":"http://localhost:3111/demo","views":2,"clicks":2,"lastSeen":"2026-10-12T14:30:15.000Z"}]}
```

### GET /api/heatmap?url=...
Clicks for one normalized URL (latest 10,000 points; `total` is the full count).
```json
{"url":"http://localhost:3111/demo","total":2,"points":[{"x":100,"y":200,"pageWidth":1000,"pageHeight":2000}]}
```

Shared TypeScript types for these responses live in `src/lib/types.ts`.

## Event schema

Tracker payload fields (snake_case): `session_id` (8-64 chars `[A-Za-z0-9_-]`), `type` (`page_view` | `click`), `url` (http/https, max 2048), `timestamp` (ms epoch or ISO string, optional), `x`, `y` (required for clicks), `vw`/`vh` (viewport size), `pw`/`ph` (full page size), `target` (short tag/id/class description, no text content). Unknown fields are dropped.

## Database schema

Database `MONGODB_DB`, collection `events`, one document per event:

```
sessionId, type, url (normalized), rawUrl (as sent), timestamp (client time),
receivedAt (server time), x?, y?, pageWidth?, pageHeight?,
viewportWidth?, viewportHeight?, target?, userAgent?
```
Indexes (created on first request): `{sessionId:1,timestamp:1}`, `{url:1,type:1}`, `{timestamp:-1}`.

## Project structure

```
public/tracker.js            embeddable tracker
src/app/api/events           ingest endpoint
src/app/api/sessions         session list, and [id]/events timeline
src/app/api/pages            page list for the heatmap picker
src/app/api/heatmap          click points for a page
src/app/sessions, heatmap    dashboard routes
src/app/demo                 demo site with tracker installed
src/components               dashboard React components
src/lib                      mongodb client, validation (zod), url normalization, shared types
src/types/events.ts          MongoDB document type
```

## Deployment (Vercel + Atlas)

1. Push the repo and import it in Vercel (framework auto-detected).
2. Set environment variables `MONGODB_URI` and `MONGODB_DB`.
3. In Atlas Network Access allow `0.0.0.0/0` (Vercel has no fixed IPs).
4. Embed `https://YOUR-APP.vercel.app/tracker.js` on target sites.

## Assumptions and trade-offs

- No authentication: the dashboard and read APIs are public; ingest is open with `CORS *` so any site can send events. Put auth in front before real use.
- Sessions are derived at read time with a `$group` over the whole collection (full scan). Fine for a demo; at scale, maintain a per-session rollup collection.
- A session ends after 30 minutes of inactivity (client-side). The id is in `localStorage`, so it is shared across tabs of the same browser and origin.
- Heatmap coordinates are page coordinates (`pageX/pageY`) normalized by the page size recorded with each click, so clicks from different screen sizes overlay proportionally. The stage aspect ratio is the median page size.
- The heatmap draws plain DOM dots, capped at 3000 (no canvas). It shows click positions on a grid, not a screenshot of the page.
- No pagination controls or live polling in the UI; use Refresh. The sessions API supports `limit`/`page`, but the UI only loads the first 50.
- Clicks inside iframes are not tracked.
- Client timestamps are untrusted: future timestamps (> 5 min ahead) are replaced with the server time, and `receivedAt` is stored separately.
- URLs are normalized for grouping: query string and hash stripped, trailing slash removed, origin lowercased.
- Request bodies are capped at 10 KB / 50 events; no rate limiting or bot filtering.

## Verification performed

Against a real (in-memory) MongoDB instance, with the app running in dev mode: posted text/plain batches for two sessions across `/demo` and `/demo/pricing`; checked `/api/sessions` counts, ordered `/api/sessions/{id}/events`, `/api/pages` and `/api/heatmap` output; rejected invalid payloads with 400; drove the real tracker in a browser (full-page and SPA navigation, clicks) and confirmed `/sessions` and `/heatmap` rendered the data. There is no automated test suite. The production build was checked with `npm run build`, `npm run lint` and `tsc --noEmit`.

## Possible improvements

Authentication and per-site API keys; per-session rollup collection or time-bounded queries; pagination and live updates in the UI; canvas rendering and a page screenshot/iframe under the heatmap; scroll-depth and rage-click tracking; rate limiting; TTL index for data retention; automated tests.
