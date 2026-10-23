// Auth helpers for the mock.
//
// We issue a *real* (HS256-signed) JWT so the frontend can treat it exactly like
// the token the real gateway will return later. Because the token is signed
// with a fixed secret, it keeps working even after you restart the mock
// (as long as the user still exists in the seed data).

import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { unauthenticated } from './errors.js';

const SECRET = process.env.JWT_SECRET || 'mock-dev-secret-do-not-use-in-prod';
const EXPIRES_IN = '24h';

export function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, SECRET, { expiresIn: EXPIRES_IN });
}

// Paths (relative to /api/v1) that do NOT need a token — matches `security: []` in the spec.
const PUBLIC_PATHS = new Set(['/auth/register', '/auth/login']);

// Middleware: checks "Authorization: Bearer <token>" and puts the user on req.user.
export function requireAuth(req, res, next) {
  if (req.method === 'OPTIONS' || PUBLIC_PATHS.has(req.path)) return next();

  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return next(unauthenticated('missing Bearer token'));
  }

  try {
    const payload = jwt.verify(token, SECRET);
    const user = db.users.find((u) => u.id === payload.sub);
    if (!user) return next(unauthenticated('user for this token no longer exists'));
    req.user = user;
    next();
  } catch {
    next(unauthenticated());
  }
}
