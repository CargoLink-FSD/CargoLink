# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

# CargoLink — Frontend (React + Vite)

This folder contains the React frontend for CargoLink, bootstrapped with Vite. The section below documents the intended purpose and recommended contents for each top-level folder and key files so contributors know where to add new code.

Quick start

1. Install deps: npm install
2. Start dev server: npm run dev
3. Build: npm run build

Environment

- Use a Vite env variable for the API base URL: VITE_API_BASE_URL (e.g. http://localhost:3000)
- Put local example values into `.env.example` (do not commit secrets)

Folder guide — what to put where

- `src/`
	- `api/` — Central HTTP client and small API wrappers.
		- `http.js`: single fetch wrapper (base URL, common headers, error handling)
		- `auth.js`: auth-related API calls (login, signup, logout, getCurrentUser)
		- Keep only thin adapters here; business logic stays in hooks or context.

	- `assets/` — Static images, vendor fonts, and small non-CSS assets used by components.

	- `components/` — Pure, reusable UI components (buttons, inputs, form controls, modals, lists).
		- Keep components presentational and prop-driven.
		- Add a `forms/` subfolder for small building-block inputs used across signup forms.

	- `context/` — React Context providers for application-wide state.
		- `AuthContext.jsx`: auth state, login/signup/logout wrappers calling `api/auth`.
		- `NotificationContext.jsx`: toast/alert API used by components and hooks.

	- `hooks/` — Custom hooks that compose logic and call `api/` or `context/`.
		- `auth/` group: `useCustomerSignup.js`, `useTransporterSignup.js`, `useAuthSignup.js` — hold form state, validation rules and submit handlers.
		- `useStepForm.js`: stepper logic for multi-step forms.

	- `pages/` — Route-level components (Signup, Login, Dashboard, Orders). These compose `components/` and use hooks/contexts.

	- `routes/` — Client-side route definitions (React Router configuration). Keep route guards here.

	- `styles/` — Global CSS / CSS modules / utility classes and design tokens.
		- Prefer small, component-scoped styles; keep global layout and theme tokens here.

	- `utils/` — Small utilities used across the app.
		- `validation/`: centralized validation helpers (regex, validators) used by hooks/components.
		- `redirectUser.js`, `formatters.js` etc.

	- `main.jsx` / `App.jsx` — App entry and top-level composition (Providers, Router). Keep them thin: providers + routes + layout.

- `public/` — Static public files served by Vite (favicon, index.html assets). No source code here.

Best-practices and guidelines

- Centralize network requests in `src/api` and call them from hooks or context — don't call fetch directly from components.
- Keep components small and presentational; move state and side effects to hooks or context.
- Store secrets and environment-specific values in env variables (VITE_ prefixed for frontend).
- Avoid coupling frontend to server view templates (EJS). The React frontend should consume JSON APIs only.

Suggested next steps (low-risk improvements)

- Add `frontend/.env.example` with `VITE_API_BASE_URL`.
- Add `README` notes about running both backend and frontend locally (ports and credentials).
- Add `scripts` to run frontend + backend concurrently during development (optional).

If you want, I can update this file with your exact folder names/short examples for each file (e.g. paste a small template for `src/api/http.js` and `src/context/AuthContext.jsx`).
