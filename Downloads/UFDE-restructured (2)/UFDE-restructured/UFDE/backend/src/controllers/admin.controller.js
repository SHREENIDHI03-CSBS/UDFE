const User = require('../models/User');
const audit = require('../utils/audit');
const { ok } = require('../utils/response');

function listUsers(req, res) {
  return ok(res, User.list());
}

function listAuditLog(req, res) {
  const limit = req.query.limit ? Number(req.query.limit) : 200;
  return ok(res, audit.list({ limit }));
}

module.exports = { listUsers, listAuditLog };
