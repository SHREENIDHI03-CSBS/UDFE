const multer = require('multer');
const path = require('path');
const { PATHS } = require('../config/constants');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, PATHS.UPLOADS),
  filename: (req, file, cb) => {
    const ts = Date.now();
    cb(null, `${ts}-${file.fieldname}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

module.exports = upload;
