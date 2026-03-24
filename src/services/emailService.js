const nodemailer = require("nodemailer");

const logger = require("../utils/logger");

let cachedTransporter = null;

const getTransporter = () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  if (
    process.env.EMAIL_JSON_TRANSPORT === "true" ||
    process.env.NODE_ENV === "test" ||
    !process.env.SMTP_HOST
  ) {
    cachedTransporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          }
        : undefined,
  });

  return cachedTransporter;
};

const getMailFromAddress = () => {
  return process.env.EMAIL_FROM || "GreenHarvest <no-reply@greenharvest.local>";
};

const getPublicAppUrl = () => {
  return (
    process.env.AUTH_PUBLIC_BASE_URL ||
    process.env.FRONTEND_URL ||
    process.env.APP_URL ||
    "http://localhost:3000"
  );
};

const buildActionLink = (path, token) => {
  const url = new URL(path, getPublicAppUrl());
  url.searchParams.set("token", token);
  return url.toString();
};

const sendMail = async ({ to, subject, text, html }) => {
  const info = await getTransporter().sendMail({
    from: getMailFromAddress(),
    to,
    subject,
    text,
    html,
  });

  logger.info("Auth email sent", {
    to,
    subject,
    messageId: info.messageId || null,
  });

  return info;
};

const sendVerificationEmail = async ({ email, name, token }) => {
  const verificationLink = buildActionLink("/verify-email", token);
  const safeName = name || "there";

  return sendMail({
    to: email,
    subject: "Verify your GreenHarvest account",
    text: `Hello ${safeName}, verify your account using this link: ${verificationLink}`,
    html: `<p>Hello ${safeName},</p><p>Verify your GreenHarvest account by clicking <a href="${verificationLink}">this link</a>.</p>`,
  });
};

const sendPasswordResetEmail = async ({ email, name, token }) => {
  const resetLink = buildActionLink("/reset-password", token);
  const safeName = name || "there";

  return sendMail({
    to: email,
    subject: "Reset your GreenHarvest password",
    text: `Hello ${safeName}, reset your password using this link: ${resetLink}`,
    html: `<p>Hello ${safeName},</p><p>Reset your password by clicking <a href="${resetLink}">this link</a>. The link expires soon.</p>`,
  });
};

const sendMfaOtpEmail = async ({ email, name, otp }) => {
  const safeName = name || "there";

  return sendMail({
    to: email,
    subject: "Your GreenHarvest login verification code",
    text: `Hello ${safeName}, your GreenHarvest verification code is ${otp}. It expires in 5 minutes.`,
    html: `<p>Hello ${safeName},</p><p>Your GreenHarvest verification code is <strong>${otp}</strong>.</p><p>It expires in 5 minutes.</p>`,
  });
};

module.exports = {
  sendMail,
  sendMfaOtpEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
};
