const bcrypt = require('bcrypt');
const nodemailer = require("nodemailer");

const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};


const errorHandler = (err) => {
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return {
      status: 400,
      message: 'Validation failed',
      errors,
    };
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return {
      status: 400,
      message: `Duplicate value for field: ${field}`,
    };
  }

  // Default fallback for unexpected errors
  return {
    status: 500,
    message: 'Internal Server Error',
  };
};


const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "cargolink.logistcs@gmail.com",
    pass: "zrpt aldt sylq qdty"
  }
});

async function sendMail(to, subject, text) {
  try {
    const info = await mailer.sendMail({
      from: '"CargoLink " <cargolink.logistcs@gmail.com>',
      to: to,
      subject: subject,
      text: text,
    });

    console.log("Email sent:", info.messageId);
  } catch (err) {
    console.error("Error sending email:", err);
  }
}

function generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}


module.exports = {
    asyncHandler, 
    errorHandler,
    sendMail,
    generatePassword
};