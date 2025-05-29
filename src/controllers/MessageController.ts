// src/controllers/MessageController.ts
import { Message } from "whatsapp-web.js";
import { BotActions } from "../actions/BotActions";

/**
 * Controller responsible for handling incoming messages and dispatching the appropriate bot actions
 */
export class MessageController {
  constructor(private actions: BotActions) {}

  /**
   * Processes a new message and invokes the corresponding action
   */
  public async handle(message: Message): Promise<void> {
    // Ignore messages sent by the bot itself
    if (message.fromMe) return;

    const text = message.body.trim().toLowerCase();

    // Trigger the mass mention action
    if (text === "@all") {
      await this.actions.mentionAll(message);
      return;
    }

    // Trigger the presence confirmation action
    if (text === "sim") {
      await this.actions.confirmPresence(message);
      return;
    }
  }
}
