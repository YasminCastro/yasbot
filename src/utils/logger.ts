// src/utils/logger.ts
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import fs from "fs";

// Pega o nível de log de uma env var, ou defaulta em "info"
const LOG_LEVEL = process.env.LOG_LEVEL || "info";

const validLevels = [
  "error",
  "warn",
  "info",
  "http",
  "verbose",
  "debug",
  "silly",
];
if (!validLevels.includes(LOG_LEVEL)) {
  throw new Error(`LOG_LEVEL inválido: ${LOG_LEVEL}`);
}

// Cria pasta ./logs se não existir
const logDir = path.resolve(__dirname, "../../logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Transporte de arquivo rotativo
const rotatingFileTransport = new DailyRotateFile({
  filename: path.join(logDir, "yasbot-%DATE%.txt"),
  datePattern: "YYYY-MM-DD",
  maxFiles: "3d",
  level: LOG_LEVEL, // usa o mesmo nível aqui
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(
      ({ timestamp, level, message }) =>
        `[${timestamp}] [${level.toUpperCase()}]: ${message}`
    )
  ),
});

// Transporte de console colorido
const consoleTransport = new winston.transports.Console({
  level: LOG_LEVEL, // idem
  format: winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: "HH:mm:ss" }),
    winston.format.printf(
      ({ timestamp, level, message }) => `[${timestamp}] ${level}: ${message}`
    )
  ),
});

// Cria o logger
export const logger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [rotatingFileTransport, consoleTransport],
  exitOnError: false,
});
