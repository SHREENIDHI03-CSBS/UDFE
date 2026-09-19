const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const audit = require('../utils/audit');
const { ok, fail } = require('../utils/response');

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return fail(res, 400, 'VALIDATION_ERROR', 'email and password are required.');

  const user = User.findByEmail(email);
  if (!user) return fail(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password.');

  const matches = await bcrypt.compare(password, user.password_hash);
  if (!matches) return fail(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password.');

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  audit.record('LOGIN', { actor: user.email, details: { role: user.role } });

  return ok(res, {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
}

async function register(req, res) {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return fail(res, 400, 'VALIDATION_ERROR', 'name, email, password, and role are required.');
  }
  if (!['Viewer', 'Analyst', 'Admin'].includes(role)) {
    return fail(res, 400, 'VALIDATION_ERROR', 'role must be one of Viewer, Analyst, Admin.');
  }
  if (User.findByEmail(email)) {
    return fail(res, 409, 'DUPLICATE_EMAIL', 'A user with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = User.create({ name, email, passwordHash, role });
  audit.record('LOGIN', { actor: req.user ? req.user.email : 'system', details: { createdUser: email, role } });

  return ok(res, { id: user.id, name: user.name, email: user.email, role: user.role });
}

function me(req, res) {
  return ok(res, req.user);
}

module.exports = { login, register, me };
