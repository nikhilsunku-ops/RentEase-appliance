const mongoose = require("mongoose");

const applianceSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    brand: { type: String },
    model: { type: String },
    // REQ-8 (adapted): price per month and security deposit
    rentPricePerMonth: { type: Number, required: true, min: 0 },
    securityDeposit: { type: Number, required: true, min: 0 },
    condition: { type: String, default: "good" },
    location: {
      city: { type: String, required: true, trim: true },
      address: { type: String },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    // REQ-9: images uploaded via Cloudinary, store URL + public ID
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],
    // REQ-11: new listings start pending_review
    availabilityStatus: {
      type: String,
      enum: ["pending_review", "available", "archived", "suspended"],
      default: "pending_review",
    },
    ratingAvg: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// REQ-13: keyword search across title, description, brand
applianceSchema.index({ title: "text", description: "text", brand: "text" });
// REQ-14: filter by category, city, price range
applianceSchema.index({ category: 1 });
applianceSchema.index({ "location.city": 1 });
applianceSchema.index({ rentPricePerMonth: 1 });

module.exports = mongoose.model("Appliance", applianceSchema);
