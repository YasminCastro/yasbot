// src/actions/BotActions.ts
import { Client, Message, GroupChat } from "whatsapp-web.js";
import { MongoService } from "../services/MongoService";

/**
 * Class responsible for handling all bot actions
 */
export class BotBirthday {
  constructor(private mongo: MongoService) {}

  /**
   * Mentions all participants in a group chat
   */
  public async addPerson(message: Message): Promise<void> {
    const text = this.getTextAndRemoveCommand(message, "@add-person");

    const textParts = text.split(" ");
    const person = textParts[0];
    const number = textParts[1];

    const wasGuestAdded = await this.mongo.addGuest(person, number);

    if (wasGuestAdded) {
      await message.reply(
        `${person} foi adicionado com sucesso a lista de convidados! 🎉`
      );
    } else {
      await message.reply(
        `Não foi possível adicionar ${person} à lista de convidados. Tente novamente mais tarde.`
      );
    }
  }

  /**
   * Records the presence of users who reply "sim" in the spreadsheet and sends a confirmation
   */
  public async confirmPresence(message: Message): Promise<void> {}

  /**
   * Gets the text of the message and removes the command prefix
   */
  private getTextAndRemoveCommand(message: Message, command: string) {
    return message.body.replace(command, "").trim();
  }
}
