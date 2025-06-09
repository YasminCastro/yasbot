// src/utils/logger.ts
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import fs from "fs";

// Cria pasta ./logs se não existir
const logDir = path.resolve(__dirname, "../../logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Transporte de arquivo rotativo (mantém 3 dias de logs em arquivos .txt)
const rotatingFileTransport = new DailyRotateFile({
  filename: path.join(logDir, "yasbot-%DATE%.txt"),
  datePattern: "YYYY-MM-DD",
  maxFiles: "3d",
  level: "info",
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
  level: "debug",
  format: winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: "HH:mm:ss" }),
    winston.format.printf(
      ({ timestamp, level, message }) => `[${timestamp}] ${level}: ${message}`
    )
  ),
});

// Cria o logger combinando ambos os transportes
export const logger = winston.createLogger({
  level: "info",
  transports: [rotatingFileTransport, consoleTransport],
  exitOnError: false,
});
