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
export const SPREADSHEET_ID = requireEnv("SPREADSHEET_ID");
export const GOOGLE_APPLICATION_CREDENTIALS = requireEnv(
  "GOOGLE_APPLICATION_CREDENTIALS"
);

// Variáveis opcionais com defaults
export const SHEET_NAME = process.env.SHEET_NAME ?? "Página1";
export const DATE_LOCALE = process.env.DATE_LOCALE ?? "pt-BR";
