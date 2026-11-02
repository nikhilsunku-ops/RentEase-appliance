const express = require("express");
const router = express.Router();
const {
  uploadApplianceImages,
  createAppliance,
  updateAppliance,
  archiveAppliance,
  getMyListings,
  getApplianceById,
  searchAppliances,
} = require("../controllers/applianceController");
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/role");
const { uploadImagesMiddleware } = require("../middleware/upload");

// Public
router.get("/", searchAppliances); // REQ-13, REQ-14, REQ-15

// Private - Owner
router.get("/my-listings", protect, authorize("owner", "admin"), getMyListings); // REQ-12
router.post("/images", protect, authorize("owner"), uploadImagesMiddleware, uploadApplianceImages); // REQ-9 (Cloudinary)
router.post("/", protect, authorize("owner"), createAppliance); // REQ-8, REQ-9, REQ-11
router.put("/:id", protect, authorize("owner", "admin"), updateAppliance); // REQ-10
router.delete("/:id", protect, authorize("owner", "admin"), archiveAppliance); // REQ-10

// Public - keep after /my-listings so it doesn't shadow it
router.get("/:id", getApplianceById);

module.exports = router;
