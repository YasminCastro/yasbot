import { Message } from "whatsapp-web.js";
import { ADMIN_GROUP, ADMIN_NUMBERS } from "../config";

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
    return ADMIN_NUMBERS.includes(message.from);
  }
}
