// /auth/* and /users — in the real system these are served by auth-service.

import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db, toUser } from '../db.js';
import { signToken } from '../auth.js';
import { conflict, unauthenticated } from '../errors.js';

export const authRoutes = Router();

// POST /auth/register → 201 { accessToken, user }
authRoutes.post('/auth/register', (req, res) => {
  // Body shape (email format, password >= 8 chars...) is already checked by
  // the OpenAPI validator before we get here.
  const { email, password, displayName } = req.body;
  if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw conflict(`email ${email} already registered`);
  }
  const user = { id: randomUUID(), email, password, displayName, avatarUrl: null };
  db.users.push(user);
  res.status(201).json({ accessToken: signToken(user), user: toUser(user) });
});

// POST /auth/login → 200 { accessToken, user } or 401
authRoutes.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.password !== password) {
    // Same message for "no such user" and "wrong password" — don't leak which one.
    throw unauthenticated('invalid email or password');
  }
  res.json({ accessToken: signToken(user), user: toUser(user) });
});

// GET /auth/me → the user from the token (requireAuth put it on req.user)
authRoutes.get('/auth/me', (req, res) => {
  res.json(toUser(req.user));
});

// GET /users → everyone (used for the assignee picker)
authRoutes.get('/users', (req, res) => {
  res.json(db.users.map(toUser));
});
