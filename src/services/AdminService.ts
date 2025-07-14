// src/actions/BotActions.ts
import { Message, GroupChat, Client } from "whatsapp-web.js";
import { MongoService } from "../services/MongoService";

/**
 * Class responsible for handling admin actions
 */
export class AdminService {
  constructor(private mongo: MongoService, private client: Client) {}

  /**
   * Registers the current group for daily summaries.
   * Only group admins can run this.
   * Usage: @add-group
   */
  public async addGroup(message: Message): Promise<void> {
    const chat = await message.getChat();
    if (!chat.isGroup) {
      await message.reply("❌ Esse comando só pode ser usado em grupos.");
      return;
    }
    const group = chat as GroupChat;

    const groupId = group.id._serialized;
    const added = await this.mongo.addGroup(groupId);
    await message.reply(added.message);
  }

  /**
   * Remove the current group for daily summaries.
   * Only group admins can run this.
   * Usage: @remove-group
   */
  public async removeGroup(message: Message): Promise<void> {
    const chat = await message.getChat();
    if (!chat.isGroup) {
      await message.reply("❌ Esse comando só pode ser usado em grupos.");
      return;
    }
    const group = chat as GroupChat;

    const groupId = group.id._serialized;
    const added = await this.mongo.removeGroup(groupId);
    await message.reply(added.message);
  }

  /**
   * Sends admin commands and information
   */
  public async admin(message: Message): Promise<void> {
    const informationText =
      "🤔 *Comandos*: \n" +
      "\n" +
      "• @add-guest <nome> <numero> \n" +
      "• @remove-guest <numero> \n" +
      "• @update-guest <nome> - vai? não - recebeu convite? sim - é para enviar convite? sim \n" +
      `• @get-guests \n` +
      `• @send-invitation \n`;

    await message.reply(informationText);
    return;
  }
}
