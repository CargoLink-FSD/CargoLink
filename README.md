
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
    