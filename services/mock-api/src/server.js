// Tracking Board — mock API server.
//
// Serves /api/v1/* exactly as described in api/openapi.yaml, with in-memory
// data (src/seed.js). Everything resets when the process restarts, or when
// you call POST /__mock/reset.
//
// Request flow:
//   CORS → JSON body parser → auth (Bearer token) → OpenAPI validator → trim → routes → errorHandler

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import * as OpenApiValidator from 'express-openapi-validator';

import { requireAuth } from './auth.js';
import { loadSpec } from './openapi.js';
import { resetDb } from './db.js';
import { errorHandler } from './errors.js';
import { authRoutes } from './routes/auth.js';
import { trackerRoutes } from './routes/tracker.js';
import { docsRoutes } from './routes/docs.js';
import { searchRoutes } from './routes/search.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 4010);
// Default: the spec in the repo (services/mock-api/src → ../../../api/openapi.yaml).
// In Docker we mount it somewhere else and set OPENAPI_PATH.
const OPENAPI_PATH = process.env.OPENAPI_PATH || path.resolve(__dirname, '../../../api/openapi.yaml');
// Optional fake network delay, handy for testing loading spinners: MOCK_DELAY_MS=500
const DELAY_MS = Number(process.env.MOCK_DELAY_MS || 0);
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:6006,http://localhost:8081').split(',');

const app = express();

app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());
if (DELAY_MS > 0) app.use((req, res, next) => setTimeout(next, DELAY_MS));

// Tiny request log: "POST /api/v1/auth/login 200 3ms"
app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`));
  next();
});

// ---------- mock-only helpers (NOT part of the API contract) ----------
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.post('/__mock/reset', (req, res) => {
  resetDb();
  res.status(204).end();
});

// ---------- the real API ----------
const api = express.Router();

// 1) Auth first, so a request without a token gets 401 (not 400) even if the body is wrong.
api.use(requireAuth);

// 2) Validate the request against openapi.yaml (path, query, body, formats like uuid/email).
//    Invalid request → error with status 400 → errorHandler → { error: { code: VALIDATION_FAILED } }
//    Responses are validated too, but only *logged* (so a mock bug never breaks the demo).
api.use(
  OpenApiValidator.middleware({
    apiSpec: loadSpec(OPENAPI_PATH),
    validateRequests: { allowUnknownQueryParameters: false, coerceTypes: true },
    validateResponses: {
      onError: (err, body, req) => {
        // We only care about successful responses; error bodies always follow the Error schema
        // even when a status code (e.g. 401) isn't listed for that endpoint in the spec.
        if (/no schema defined for status code '[45]\d\d'/.test(err.message)) return;
        console.warn(`[contract] response for ${req.method} ${req.originalUrl} does not match spec: ${err.message}`);
      },
    },
    validateSecurity: false, // done by requireAuth above
    // The spec's servers are http://localhost:4010/api/v1 — the validator uses "/api/v1" as base path.
  }),
);

// 3) Trim required text fields. The validator already rejected blank ones (pattern '\S'),
//    so "  Fix login  " is stored as "Fix login".
const TRIMMED_FIELDS = ['title', 'name', 'displayName', 'body'];
api.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const field of TRIMMED_FIELDS) {
      if (typeof req.body[field] === 'string') req.body[field] = req.body[field].trim();
    }
  }
  next();
});

// 4) Route handlers
api.use(authRoutes, trackerRoutes, docsRoutes, searchRoutes);

app.use('/api/v1', api);

// Anything else
app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: `no route ${req.method} ${req.path}` } }));

// 5) Turn every thrown error into the spec's error format
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Mock API  → http://localhost:${PORT}/api/v1`);
  console.log(`Spec      → ${OPENAPI_PATH}`);
  console.log(`CORS for  → ${ALLOWED_ORIGINS.join(', ')}`);
  console.log('Login     → duck@example.com / password123');
});
