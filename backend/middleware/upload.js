const multer = require("multer");

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB each (Cloudinary free tier friendly)

// Files are held in memory and streamed straight to Cloudinary; nothing touches disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) return cb(null, true);
    const err = new Error("Only JPEG, PNG, WebP or GIF images are allowed");
    err.statusCode = 400;
    cb(err);
  },
});

module.exports = { uploadImagesMiddleware: upload.array("images", MAX_FILES), MAX_FILES, MAX_FILE_SIZE };
