
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
