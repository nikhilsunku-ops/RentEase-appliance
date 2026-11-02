const express = require("express");
const router = express.Router();
const t = require("../controllers/technicianController");
const { protect } = require("../middleware/auth");
const { authorize } = require("../middleware/role");

router.get("/", protect, authorize("owner", "admin"), t.listTechnicians);
router.get("/jobs", protect, authorize("technician"), t.myJobs);
router.patch("/jobs/:id/status", protect, authorize("technician", "admin"), t.updateJobStatus); // REQ-28
router.get("/jobs/:id/directions", protect, authorize("technician", "admin"), t.getDirections);

module.exports = router;
