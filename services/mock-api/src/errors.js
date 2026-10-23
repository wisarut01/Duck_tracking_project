// Error helpers.
//
// Every error the API returns must look like this (see api/openapi.yaml → Error):
//   { "error": { "code": "NOT_FOUND", "message": "issue TB-999 not found" } }
//
// In route handlers we simply `throw notFound('...')` and the errorHandler
// at the bottom of server.js turns it into the right HTTP response.

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (msg) => new ApiError(400, 'VALIDATION_FAILED', msg);
export const unauthenticated = (msg = 'invalid or expired token') =>
  new ApiError(401, 'UNAUTHENTICATED', msg);
export const notFound = (msg) => new ApiError(404, 'NOT_FOUND', msg);
export const conflict = (msg) => new ApiError(409, 'ALREADY_EXISTS', msg);

// HTTP status → error code, used for errors that don't come from ApiError
// (e.g. the OpenAPI request validator throws its own error objects).
function codeForStatus(status) {
  switch (status) {
    case 400: return 'VALIDATION_FAILED';
    case 401: return 'UNAUTHENTICATED';
    case 403: return 'PERMISSION_DENIED';
    case 404: return 'NOT_FOUND';
    case 409: return 'ALREADY_EXISTS';
    case 415: return 'VALIDATION_FAILED'; // wrong Content-Type
    default: return 'INTERNAL';
  }
}

// pattern '\S' is the spec's "not blank" rule — say that instead of showing the regex.
const friendly = (msg) => (msg === 'must match pattern "\\S"' ? 'must not be blank' : msg);

// Express error-handling middleware (it has 4 arguments, that's how Express knows).
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // express.json() throws a SyntaxError with status 400 on broken JSON
  let status = err.status || err.statusCode || 500;
  // The validator answers 405 for a method the spec doesn't have on that path.
  // The spec says an unknown path OR method is a plain 404 NOT_FOUND.
  if (status === 405) status = 404;
  const code = err instanceof ApiError ? err.code : codeForStatus(status);

  let message = err.message || 'internal error';
  // The OpenAPI validator puts details in err.errors — make the message helpful,
  // e.g. "request/body must have required property 'title'".
  if (Array.isArray(err.errors) && err.errors.length > 0) {
    message = err.errors.map((e) => `${e.path?.replace(/^[./]/, '') ?? ''} ${friendly(e.message)}`.trim()).join('; ');
  }

  if (status >= 500) console.error(err);
  res.status(status).json({ error: { code, message } });
}
