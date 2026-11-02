const { v2: cloudinary } = require("cloudinary");

// SRS 2.5 / 5.3: credentials come from environment variables only.
// Supports either CLOUDINARY_URL (cloudinary://key:secret@cloud) or the three separate vars.
const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
  );

if (isCloudinaryConfigured()) {
  if (!process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
  cloudinary.config({ secure: true });
}

// All RentEase uploads live under one folder so they are easy to find / clean up.
const UPLOAD_FOLDER = process.env.CLOUDINARY_FOLDER || "rentease/appliances";

module.exports = { cloudinary, isCloudinaryConfigured, UPLOAD_FOLDER };
