import { Message } from "whatsapp-web.js";
import { ADMIN_GROUP, ADMIN_NUMBERS } from "../config";
import { extractPhoneNumber } from "./auth.middleware";

/**
 * Checks if message should be processed in development mode
 */
export function shouldProcessInDev(message: Message, chat: any): boolean {
  if (
    (!ADMIN_NUMBERS || ADMIN_NUMBERS.length === 0) &&
    (!ADMIN_GROUP || ADMIN_GROUP.length === 0)
  ) {
    return false;
  }

  if (chat.isGroup) {
    return ADMIN_GROUP.includes(chat.id._serialized);
  } else {
    const senderNumber = extractPhoneNumber(message.author || message.from);
    return ADMIN_NUMBERS.includes(senderNumber);
  }
}
