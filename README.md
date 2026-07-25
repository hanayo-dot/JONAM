# Kijani MVP - Lake Victoria Hyacinth & Pollution Detector

This repository contains a minimal MVP for the hackathon: a Go backend that proxies Kijanibox STAC requests and forwards image detection jobs to a lightweight Python worker. The frontend is a simple static page served by the API.

Architecture:
- `api` (Go): serves frontend, proxies Kijanibox STAC, exposes `/detect` which forwards to the worker.
- `worker` (Python/Flask): downloads an image URL and returns a green mask overlay PNG (heuristic-based detection).

Quick start (requires Docker):

1. Copy `.env` and configure Kijanispace credentials:

```bash
cp .env.example .env
# edit .env and add either KIJANI_API_KEY or KIJANI_USERNAME and KIJANI_PASSWORD
```

2. Build and run with Docker Compose:

```bash
docker-compose up --build
```

3. Open http://localhost:8080 and use the app to search Kijanispace STAC items, then run detection on a preview image.

### Environment variables

- `KIJANI_API_BASE` - base URL for Kijanispace, defaults to `https://api.kijanispace.eu`
- `KIJANI_API_KEY` - Kijanispace API key
- `KIJANI_ACCESS_TOKEN` - Kijanispace Bearer token (optional)
- `KIJANI_USERNAME` - Kijanispace login email (optional)
- `KIJANI_PASSWORD` - Kijanispace login password (optional)

If an API key is not available, the service can attempt email/password login when both `KIJANI_USERNAME` and `KIJANI_PASSWORD` are set.

> Important: without valid Kijanispace auth, `/api/locations`, `/api/stac-search`, and `/api/water-metrics` return an explicit authorization error.

### Water metrics endpoint

- `GET /api/water-metrics?lat={lat}&lon={lon}`
- Returns precipitation, temperature, windspeed, turbidity, and chlorophyll values for the requested coordinate.
- Defaults to `lat=-1.0&lon=33.0` if omitted.

Notes and next steps:
- Replace the simple RGB heuristic with an index-based approach using Sentinel-2 bands (NDVI, NDWI) or a small segmentation model for higher accuracy.
- Use the Kijanibox STAC proxy (`/proxy/stac?path=/collections/...`) to search and fetch assets programmatically; set `KIJANI_API_KEY` in the API container environment.
- Add change-detection by comparing masks across a configurable lookback window.
# Jonam inc
