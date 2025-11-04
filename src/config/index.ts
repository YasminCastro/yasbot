// src/config/index.ts
import * as dotenv from "dotenv";
import { logger } from "../utils/logger";

dotenv.config();

/**
 * Lê uma variável de ambiente obrigatória e encerra o processo se não existir
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    logger.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

// Variáveis obrigatórias
export const MONGO_URI = requireEnv("MONGO_URI");
export const DB_NAME = requireEnv("DB_NAME");

const adminNumbers = requireEnv("ADMIN_NUMBERS");
export const ADMIN_NUMBERS = adminNumbers.split(",");

const oldPeopleNumbers = process.env["OLD_PEOPLE_NUMBERS"];
export const OLD_PEOPLE_NUMBERS = oldPeopleNumbers
  ? oldPeopleNumbers.split(",")
  : [];

const nodeEnv = process.env["NODE_ENV"];
export const NODE_ENV = nodeEnv ? nodeEnv : "production";

const adminGroup = process.env["ADMIN_GROUP"];
export const ADMIN_GROUP = adminGroup ? adminGroup.split(",") : [];

const glauciaNumber = process.env["GLAUCIA_NUMBER"];
export const GLAUCIA_NUMBER = glauciaNumber;

const fernandoNumber = process.env["FERNANDO_NUMBER"];
export const FERNANDO_NUMBER = fernandoNumber;

export const PING_URL = requireEnv("PING_URL");
export const PING_SECRET = requireEnv("PING_SECRET");
