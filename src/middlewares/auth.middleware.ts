import { Message } from "whatsapp-web.js";
import { ADMIN_NUMBERS } from "../config";

/**
 * Extracts phone number from WhatsApp message from field
 */
export function extractPhoneNumber(from: string): string {
  const numberMatch = from.match(/^(\d+)@/);
  return numberMatch ? numberMatch[1] : from.replace(/@.*$/, "");
}

/**
 * Checks if the sender is an admin
 */
export function isAdmin(message: Message): boolean {
  const senderNumber = extractPhoneNumber(message.author || message.from);
  return ADMIN_NUMBERS.includes(senderNumber);
}

/**
 * Middleware to check if user is admin
 */
export function requireAdmin(message: Message): boolean {
  if (!isAdmin(message)) {
    return false;
  }
  return true;
}
