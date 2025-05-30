// src/config/index.ts
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Lê uma variável de ambiente obrigatória e encerra o processo se não existir
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

// Variáveis obrigatórias
export const MONGO_URI = requireEnv("MONGO_URI");
export const DB_NAME = requireEnv("DB_NAME");

const adminNumbers = requireEnv("ADMIN_NUMBERS");
export const ADMIN_NUMBERS = adminNumbers.split(",");

// Variáveis opcionais com defaults
export const SHEET_NAME = process.env.SHEET_NAME ?? "Página1";
export const DATE_LOCALE = process.env.DATE_LOCALE ?? "pt-BR";
