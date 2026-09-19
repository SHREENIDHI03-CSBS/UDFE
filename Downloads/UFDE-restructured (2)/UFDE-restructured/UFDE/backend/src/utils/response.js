function ok(res, data, meta = {}) {
  return res.status(200).json({ success: true, data, ...meta });
}

function created(res, data, meta = {}) {
  return res.status(201).json({ success: true, data, ...meta });
}

function fail(res, statusCode, code, message, details) {
  return res.status(statusCode).json({
    success: false,
    error: { code, message, details: details || undefined },
  });
}

module.exports = { ok, created, fail };
