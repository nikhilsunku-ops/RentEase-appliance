const { cloudinary, isCloudinaryConfigured, UPLOAD_FOLDER } = require("../config/cloudinary");

const ensureConfigured = () => {
  if (!isCloudinaryConfigured()) {
    const err = new Error("Image uploads are not configured on this server (missing Cloudinary credentials)");
    err.statusCode = 503;
    throw err;
  }
};

// REQ-9: push one in-memory file buffer to Cloudinary, return { url, publicId }
const uploadBuffer = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: UPLOAD_FOLDER,
        resource_type: "image",
        // keep stored originals reasonable; delivery transforms are applied via URL
        transformation: [{ width: 1600, height: 1600, crop: "limit", quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => (error ? reject(error) : resolve({ url: result.secure_url, publicId: result.public_id }))
    );
    stream.end(buffer);
  });

const uploadImages = async (files) => {
  ensureConfigured();
  return Promise.all(files.map((f) => uploadBuffer(f.buffer)));
};

// Best-effort delete; a failed cleanup must never fail the user's request.
const deleteImages = async (publicIds = []) => {
  if (!isCloudinaryConfigured() || publicIds.length === 0) return;
  await Promise.allSettled(publicIds.map((id) => cloudinary.uploader.destroy(id, { invalidate: true })));
};

// Never trust {url, publicId} pairs sent by the client: they must point at our own
// Cloudinary folder, otherwise an owner could attach arbitrary hotlinked URLs
// or publicIds belonging to someone else's assets.
const sanitizeImages = (images) => {
  if (!Array.isArray(images)) return [];
  return images
    .filter(
      (img) =>
        img &&
        typeof img.url === "string" &&
        typeof img.publicId === "string" &&
        img.publicId.startsWith(`${UPLOAD_FOLDER}/`) &&
        /^https:\/\/res\.cloudinary\.com\//.test(img.url)
    )
    .map((img) => ({ url: img.url, publicId: img.publicId }));
};

module.exports = { uploadImages, deleteImages, sanitizeImages };
