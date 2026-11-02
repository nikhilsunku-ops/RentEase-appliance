const nodemailer = require("nodemailer");
const Notification = require("../models/Notification");
const User = require("../models/User");

let transporter = null;
const getTransporter = () => {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
};

// REQ-34: email on booking created/confirmed/rejected/paid/cancelled
// REQ-35: if SMTP isn't configured, log a placeholder instead of failing
// Never throws: a notification failure must not break the business action.
const notifyUser = async (userOrId, subject, message, type = "booking") => {
  try {
    const user = userOrId && userOrId.email ? userOrId : await User.findById(userOrId);
    if (!user) return;
    const t = getTransporter();
    let status = "logged";
    if (t) {
      try {
        await t.sendMail({
          from: process.env.MAIL_FROM || "RentEase <no-reply@rentease.test>",
          to: user.email,
          subject: `[RentEase] ${subject}`,
          text: message,
        });
        status = "sent";
      } catch (e) {
        status = "failed";
        console.error("Email send failed:", e.message);
      }
    } else {
      console.log(`[notify:placeholder] to=${user.email} subject="${subject}" :: ${message}`);
    }
    await Notification.create({ user: user._id, message: `${subject}: ${message}`, notificationType: type, status });
  } catch (e) {
    console.error("notifyUser error:", e.message);
  }
};

module.exports = { notifyUser };
