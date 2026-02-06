import path from 'path';
import nodemailer from 'nodemailer';
import { createStream } from 'rotating-file-stream';
import util from 'util';
import { fileURLToPath } from 'url';



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const accessLogStream = createStream('access.log', {
    interval: '30s',
    path: path.join(path.dirname(''), 'logs'),
    teeToStdout: true,
})



export class AppError extends Error {
  constructor(statusCode, name, message, errorCode, cause = null) {
    super(message);
    this.name = name;
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.errors = cause || []; // For validation details
  }
}


export class ErrorHandler {

  // Main method to handle all errors
  handleError(error, context = {}) {

    const { request, source = 'unknown' } = context;

    // Default error properties
    let message = error.statusCode? error.message : 'Internal Server Error';
    let errorCode = error.errorCode || 'ERR_UNKNOWN';
    let errors = error.errors
    let statusCode = error.statusCode || 500;

    // Map specific error types (e.g., Mongoose errors)
    if (error.name === 'ValidationError') {
      statusCode = 400;
      message = 'Input Validation failed';
      errorCode = 'ERR_VALIDATION';
      errors = errors
    } else if ((error.name === 'MongoServerError' && error.code === 11000) || error.name === 'DuplicateKey'){
      statusCode = 409;
      message = 'Key already exists';
      errorCode = 'ERR_DUPLICATE_KEY';
      errors = errors? errors: [{ field: Object.keys(error.keyValue)[0], message: 'Already exists' }];
    } else if (error.name === 'MongoNetworkError' || error.name === 'MongooseServerSelectionError') {
      statusCode = 503;
      message = 'Database connection error';
      errorCode = 'ERR_DB_CONNECTION';
    } if (error.name === 'NotFoundError'){
      statusCode = 404;
      message = 'Resource Not Found';
      errorCode = 'ERR_NOT_FOUND';
    }

    // Structured logging
    if (statusCode === 500){
      logger.error(`${error.errorCode}: ${error.message}`, {
        errors: error.errors,
        stack: error.stack,
      });
    } else {
      logger.warn(`${errorCode}: ${message}`, {
        errors,
        stack: error.stack,
      });
    }

    // Return formatted error for HTTP responses
    return {
      success: false,
      message,
      errorCode,
      statusCode,
      ...(errors && { errors }),
    };
  }
}

export const errorHandler = new ErrorHandler();


class Logger {
// Simple log formatter
  log(message, level = "DEBUG", meta = null) {
    const timestamp = new Date().toISOString();
    const logLevelColors = {
      DEBUG: '\x1b[90m',  // Grey
      INFO: '\x1b[34m',   // Blue
      WARN: '\x1b[33m',   // Yellow
      ERROR: '\x1b[31m',  // Red
    };

    const location = this.getLine(4)
    // Determine the color based on the log level
    const color = logLevelColors[level] || '\x1b[0m'; // Default (no color)

    // Format the log message
    const formattedMessage = `${color}${('['+level.toUpperCase()+']').padEnd(8, ' ')}\x1b[0m ${message.padEnd(80, ' ')}  ${timestamp}\t${location} \n`;

    // Output to the rotating file stream
    accessLogStream.write(util.format(formattedMessage));
    if(meta !== null)
      // console.log(meta);
      accessLogStream.write(util.format(meta)+ '\n');
  }

  // Log methods
  error(message, meta=null) {
    this.log(message, "ERROR", meta);
  }

  warn(message, meta=null) { 
    this.log(message, "WARN", meta);
  }

  info(message, meta=null) {
    this.log(message, "INFO", meta);
  }

  debug(message, meta=null) {    
    this.log(`${message}`, "DEBUG", meta);
  }

  getLine(num = 2) {
      const e = new Error();
      const regex = /(.*):(\d+):(\d+)/
      const match = regex.exec(e.stack.split("\n")[num]);
      const filepath = match[1];      
      const fileName = path.basename(filepath);
      const line = match[2];
      return `${fileName}:${line}`;
  }
}

export const logger = new Logger();

// Email configuration
const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "cargolink.logistcs@gmail.com",
    pass: "zrpt aldt sylq qdty"
  }
});

export async function sendMail(to, subject, text) {
  try {
    const info = await mailer.sendMail({
      from: '"CargoLink" <cargolink.logistcs@gmail.com>',
      to: to,
      subject: subject,
      text: text,
    });

    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error("Error sending email:", err);
    throw err;
  }
}

export function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}
