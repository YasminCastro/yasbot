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
    if (text === "!all" || text === "!todos") {
      await this.actions.mentionAll(message);
      return;
    }

    if (text === "!help" || text === "!ajuda") {
      await message.reply(
        "🤖 Olá! Eu sou a YasBot. Aqui estão os comandos disponíveis:\n\n" +
          "- `!todos`: Menciona todos os participantes do grupo.\n"
      );
      return;
    }

    // // Trigger the presence confirmation action
    // if (text === "sim") {
    //   await this.actions.confirmPresence(message);
    //   return;
    // }
  }
}
