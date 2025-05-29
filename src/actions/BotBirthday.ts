// src/actions/BotActions.ts
import { Client, Message, GroupChat } from "whatsapp-web.js";
import { MongoService } from "../services/MongoService";

/**
 * Class responsible for handling all bot actions
 */
export class BotBirthday {
  constructor(private mongo: MongoService) {}

  /**
   * Add guests to the birthday list
   */
  public async addGuest(message: Message, command: string): Promise<void> {
    const text = this.getTextAndRemoveCommand(message, command);

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
   * Remove guests from the birthday list
   */
  public async removeGuest(message: Message, command: string): Promise<void> {
    const number = this.getTextAndRemoveCommand(message, command);

    const wasGuestRemoved = await this.mongo.removeGuest(number);

    if (wasGuestRemoved) {
      await message.reply(
        `${number} foi removido com sucesso a lista de convidados!`
      );
    } else {
      await message.reply(
        `Não foi possível adicionar ${number} à lista de convidados. Tente novamente mais tarde.`
      );
    }
  }

  /**
   * Get birthday list
   */
  public async getGuests(message: Message): Promise<void> {
    const guests = await this.mongo.getGuests();

    if (guests.length === 0) {
      await message.reply("📋 A lista de convidados está vazia.");
      return;
    }

    const lines = guests.map((g, index) => {
      const status = g.confirmed
        ? "✅ confirmado"
        : "⏳ aguardando confirmação";
      return `${index + 1} - ${g.name} (${g.number}) – ${status}`;
    });

    const reply = ["📋 *Lista atual de convidados*", ...lines].join("\n");

    await message.reply(reply);
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
