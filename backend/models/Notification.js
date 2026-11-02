const mongoose = require("mongoose");

// ER diagram: NOTIFICATION(notificationId, userId, message, notificationType, status, notificationDate)
const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    notificationType: { type: String, default: "booking" },
    status: { type: String, enum: ["sent", "logged", "failed"], default: "sent" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
