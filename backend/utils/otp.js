const nodemailer = require("nodemailer");

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
};

const sendOtpEmail = async (to, name, otp, expiryMinutes = 10) => {
  const transporter = getTransporter();
  const subject = "Your RentEase verification code";
  const text = `Hi ${name},\n\nYour RentEase email verification OTP is: ${otp}\n\nThis code expires in ${expiryMinutes} minutes. If you did not create a RentEase account, ignore this email.`;

  if (!transporter) {
    if (process.env.NODE_ENV === "development" && process.env.ALLOW_DEV_OTP_LOG === "true") {
      console.log(`[DEV OTP] ${to} -> ${otp} (expires in ${expiryMinutes} minutes)`);
      return;
    }
    throw new Error("SMTP is not configured");
  }

  await transporter.sendMail({
    from: process.env.MAIL_FROM || "RentEase <no-reply@rentease.test>",
    to,
    subject: `[RentEase] ${subject}`,
    text,
  });
};

module.exports = { sendOtpEmail };
