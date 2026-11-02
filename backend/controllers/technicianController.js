const Booking = require("../models/Booking");
const User = require("../models/User");
const { notifyUser } = require("../utils/notify");

// Allowed forward-only transitions for the job
const NEXT = { assigned: ["on_the_way"], on_the_way: ["arrived"], arrived: ["done"] };

// @route GET /api/technicians   @access Owner, Admin — pick someone to assign
const listTechnicians = async (req, res, next) => {
  try {
    const techs = await User.find({ role: "technician", isApproved: true, isActive: true }).select("name phone address");
    res.json({ success: true, count: techs.length, data: techs });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/technician/jobs   @access Technician
// REQ-29: the delivery address/coordinates are returned only for jobs assigned to this technician.
const myJobs = async (req, res, next) => {
  try {
    const jobs = await Booking.find({ technician: req.user._id, bookingStatus: { $nin: ["cancelled", "rejected"] } })
      .populate("appliance", "title location")
      .populate("consumer", "name phone")
      .populate("owner", "name phone address")
      .sort({ startDate: 1 });
    res.json({ success: true, count: jobs.length, data: jobs });
  } catch (err) {
    next(err);
  }
};

const loadJob = async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate("appliance", "title location");
  if (!booking) return res.status(404).json({ success: false, message: "Job not found" }), null;
  const assigned = booking.technician && booking.technician.toString() === req.user._id.toString();
  if (!assigned && req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "You are not assigned to this job" }), null;
  }
  return booking;
};

// @route PATCH /api/technician/jobs/:id/status   @access assigned Technician, Admin
// REQ-28
const updateJobStatus = async (req, res, next) => {
  try {
    const booking = await loadJob(req, res);
    if (!booking) return;
    const { status } = req.body;
    const allowed = NEXT[booking.technicianStatus] || [];
    if (!allowed.includes(status)) {
      return res.status(409).json({
        success: false,
        message: `Cannot go from '${booking.technicianStatus}' to '${status}'. Allowed: ${allowed.join(", ") || "none"}`,
      });
    }
    booking.technicianStatus = status;
    booking.statusHistory.push({ status: booking.bookingStatus, by: req.user._id, note: `Technician: ${status}` });
    await booking.save();
    const msg = `Technician status for "${booking.appliance?.title}": ${status.replace("_", " ")}.`;
    await notifyUser(booking.consumer, "Delivery update", msg, "job");
    await notifyUser(booking.owner, "Delivery update", msg, "job");
    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/technician/jobs/:id/directions   @access assigned Technician, Admin
// Builds a Google Maps Directions deep link (works without an API key). Uses coordinates
// when present, otherwise the address text. Before pickup (not yet "arrived") the destination
// is the owner's pickup location; afterwards it's the consumer's address.
const getDirections = async (req, res, next) => {
  try {
    const booking = await loadJob(req, res);
    if (!booking) return;
    const toConsumer = booking.technicianStatus !== "assigned";
    const c = booking.deliveryCoordinates;
    let destination;
    if (toConsumer) {
      destination = c && c.lat != null ? `${c.lat},${c.lng}` : booking.deliveryAddress;
    } else {
      const ac = booking.appliance?.location?.coordinates;
      destination = ac && ac.lat != null ? `${ac.lat},${ac.lng}` : booking.appliance?.location?.address || booking.appliance?.location?.city;
    }
    if (!destination) return res.status(404).json({ success: false, message: "No destination available for this job" });
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
    res.json({ success: true, data: { destination, leg: toConsumer ? "to_consumer" : "to_pickup", url } });
  } catch (err) {
    next(err);
  }
};

module.exports = { listTechnicians, myJobs, updateJobStatus, getDirections };
