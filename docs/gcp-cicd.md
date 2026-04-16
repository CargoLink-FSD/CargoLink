# GCP CI/CD for CargoLink (Cloud Build + App Engine)

This repository now includes a production-oriented CI/CD pipeline in `cloudbuild.yaml` that:

- installs backend and frontend dependencies
- builds frontend assets
- deploys backend (`default`) and frontend (`frontend`) as separate App Engine services
- deploys `dispatch.yaml` routing rules
- performs smoke tests on the new versions
- promotes traffic only after smoke tests pass (rollback-safe)

## 1. Enable Required Services

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  appengine.googleapis.com \
  secretmanager.googleapis.com
```

Set active project and initialize App Engine once (skip if already created):

```bash
gcloud config set project "YOUR_PROJECT_ID"
gcloud app create --region=YOUR_APP_ENGINE_REGION
```

## 2. Create/Assign Least-Privilege IAM

Set variables:

```bash
PROJECT_ID="YOUR_PROJECT_ID"
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
BUILD_SA_NAME="cargolink-cicd"
BUILD_SA="${BUILD_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
```

Create a dedicated Cloud Build service account:

```bash
gcloud iam service-accounts create "${BUILD_SA_NAME}" \
  --display-name="CargoLink Cloud Build Deployer"
```

Grant required deployment roles:

```bash
for ROLE in \
  roles/appengine.deployer \
  roles/appengine.serviceAdmin \
  roles/storage.admin \
  roles/secretmanager.secretAccessor \
  roles/iam.serviceAccountUser \
  roles/logging.logWriter; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${BUILD_SA}" \
    --role="${ROLE}"
done
```

Grant runtime secret access to the App Engine runtime service account:

```bash
RUNTIME_SA="${PROJECT_ID}@appspot.gserviceaccount.com"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

## 3. Create Runtime Secret in Secret Manager

Create the MongoDB URI secret (first time):

```bash
printf '%s' 'YOUR_MONGODB_URI' | gcloud secrets create MONGO_URI \
  --replication-policy="automatic" \
  --data-file=-
```

Update existing secret (subsequent rotations):

```bash
printf '%s' 'YOUR_NEW_MONGODB_URI' | gcloud secrets versions add MONGO_URI --data-file=-
```

## 4. Create Build Trigger on main

### GitHub trigger

```bash
gcloud builds triggers create github \
  --name="cargolink-main" \
  --repo-owner="YOUR_GITHUB_ORG_OR_USER" \
  --repo-name="YOUR_REPO" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --service-account="projects/${PROJECT_ID}/serviceAccounts/${BUILD_SA}"
```

### Cloud Source Repositories trigger

```bash
gcloud builds triggers create cloud-source-repositories \
  --name="cargolink-main" \
  --repo="YOUR_CSR_REPO" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --service-account="projects/${PROJECT_ID}/serviceAccounts/${BUILD_SA}"
```

## 5. One-Time Validation Build

```bash
gcloud builds submit --config cloudbuild.yaml .
```

## 6. Routing and Service Layout

- backend service: `default` (`backend/app.yaml`)
- frontend service: `frontend` (`frontend/app.yaml`)
- routing: `dispatch.yaml`
  - `*/api/*` -> `default`
  - `*/uploads/*` -> `default`
  - `*/` -> `frontend`

## 7. Rollback Strategy

The pipeline deploys with `--no-promote`, smoke-tests the new version, then promotes traffic.

Manual rollback:

```bash
gcloud app versions list --service=default
gcloud app versions list --service=frontend

gcloud app services set-traffic default --splits PREVIOUS_BACKEND_VERSION=1
gcloud app services set-traffic frontend --splits PREVIOUS_FRONTEND_VERSION=1
```

## 8. Logs and Debugging

```bash
gcloud app logs tail -s default
gcloud app logs tail -s frontend
```

Common fixes:

- `503`: verify app listens on `process.env.PORT` (already implemented)
- Mongo connect errors: ensure secret exists and Atlas network allows GCP egress
- static file errors: verify frontend build generated `frontend/dist`

## 9. Live URL and Build Logs

Live URL (after successful promotion):

```bash
echo "https://$(gcloud app describe --format='value(defaultHostname)')"
```

Cloud Build logs:

```bash
gcloud builds list --limit=10
gcloud builds log --stream BUILD_ID
```
