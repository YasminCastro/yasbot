import { Message } from "whatsapp-web.js";
import { Database } from "../repositories/Database";

/**
 * Service for handling message logging
 */
export class MessageService {
  constructor(private database: Database) {}

  /**
   * Registers the current message for daily summaries.
   */
  public async addMessage(message: Message, groupId: string): Promise<void> {
    const isRegistered = await this.database.groups.getGroups({ groupId });
    if (isRegistered.length === 0) return;

    const text = message.body ? message.body.trim() : message.type;

    const fromId = message.from;
    const numberMatch = fromId.match(/^(\d+)@/);
    const number = numberMatch ? numberMatch[1] : fromId.replace(/@.*$/, "");

    const senderWid = fromId;

    const senderPhone = number.replace(/\D/g, "");

    if (!senderPhone) return;

    await this.database.messages.addMessage(
      groupId,
      text,
      senderPhone,
      senderWid
    );
  }
}
