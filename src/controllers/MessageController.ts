// src/controllers/MessageController.ts
import { Message } from "whatsapp-web.js";
import { BotActions } from "../actions/BotActions";
import { BotBirthday } from "../actions/BotBirthday";
import { ADMIN_NUMBERS } from "../config";
import chalk from "chalk";

/**
 * Controller responsible for handling incoming messages and dispatching the appropriate bot actions
 */
export class MessageController {
  constructor(private actions: BotActions, private birthday: BotBirthday) {}

  /**
   * Processes a new message and invokes the corresponding action
   */
  public async handle(message: Message): Promise<void> {
    if (message.fromMe) return;

    const text = message.body.trim().toLowerCase();
    const senderNumber = message.from.split("@")[0];

    if (text === "!all" || text === "!todos") {
      await this.actions.mentionAll(message);
      return;
    }

    if (text === "!help" || text === "!ajuda") {
      await this.actions.help(message);
      return;
    }

    if (senderNumber && ADMIN_NUMBERS.includes(senderNumber)) {
      console.log(chalk.magenta(`Admin command from ${senderNumber}: ${text}`));
      // If the sender is an admin, you can add more commands here
      if (text.includes("@add-guest")) {
        await this.birthday.addGuest(message, "@add-guest");
        return;
      }

      if (text.includes("@remove-guest")) {
        await this.birthday.removeGuest(message, "@remove-guest");
        return;
      }
    }

    // // Trigger the presence confirmation action
    // if (text === "sim") {
    //   await this.actions.confirmPresence(message);
    //   return;
    // }
  }
}
