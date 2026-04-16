
# CargoLink

CargoLink is a web platform that connects customers who need goods transportation with transporters (truck owners/drivers). Customers post shipment details, transporters place bids, and the platform helps manage logistics efficiently.

---

## Project Structure

```

CargoLink/
│
├── backend/    # Node.js + Express + MongoDB (API)
└── frontend/   # React + Vite (UI)

````

---

## Prerequisites

- Node.js (v18 or newer)
- npm
- MongoDB (running locally or via Docker)

---

## Start Backend

```bash
cd backend
npm install
````

```bash
# Development (nodemon)
npm run dev

# Production
npm start
```

* Backend runs on: [http://localhost:3000](http://localhost:3000)

---

## Run Redis in Docker (Team Standard)

Run these commands from the `backend` folder:

Prerequisite: ensure Docker Desktop is running and `docker info` shows a Server section.

```bash
cd backend
npm run redis:up
```

Validate Redis is healthy:

```bash
npm run redis:logs
```

Stop Redis container:

```bash
npm run redis:down
```

Reset Redis data volume (only when needed):

```bash
npm run redis:reset
```

Backend should point to:

```env
REDIS_URL=redis://127.0.0.1:6379
```

The app remains fallback-safe if Redis is unavailable, but keeping Docker Redis running gives consistent benchmark and demo behavior across all team machines.

---

## Run Solr in Docker (Search Phase 1)

Run these commands from the `backend` folder:

Prerequisite: ensure Docker Desktop is running and `docker info` shows a Server section.

```bash
cd backend
npm run solr:up
```

Check Solr health from backend config:

```bash
npm run search:health
```

Rebuild Solr index from MongoDB:

```bash
npm run search:reindex
```

Follow logs:

```bash
npm run solr:logs
```

Stop Solr container:

```bash
npm run solr:down
```

Reset Solr data volume (only when needed):

```bash
npm run solr:reset
```

Backend feature flags:

```env
SEARCH_PROVIDER=mongo
SOLR_URL=http://127.0.0.1:8983/solr
SOLR_CORE=cargolink
SOLR_TIMEOUT_MS=2500
```

Phase 1 behavior:

- Solr is used only for admin search on orders and users when `SEARCH_PROVIDER=solr`.
- If Solr is unavailable or returns errors, backend falls back to Mongo search automatically.
- Other modules continue using existing logic unchanged.

---

## Start Frontend

```bash
cd frontend
npm install
```

```bash
# Development (Vite)
npm run dev
```

* Frontend runs on: [http://localhost:5173](http://localhost:5173)
* Backend must be running before starting frontend

---

## Important Notes

* Start **backend first**, then **frontend**
* `npm run dev`

  * Backend: nodemon
  * Frontend: Vite dev server
* `npm start`

  * Used for backend production mode

---

```
```
