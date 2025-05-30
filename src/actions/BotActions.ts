// src/actions/BotActions.ts
import { Message, GroupChat, Client } from "whatsapp-web.js";
import { MongoService } from "../services/MongoService";

/**
 * Class responsible for handling all bot actions
 */
export class BotActions {
  constructor(private mongo: MongoService, private client: Client) {}

  /**
   * Mentions all participants in a group chat
   */
  public async mentionAll(message: Message): Promise<void> {
    const chat = await message.getChat();
    if (!chat.isGroup) {
      await message.reply("❌ Esse comando só pode ser usado em grupos.");
      return;
    }
    const group = chat as GroupChat;

    const jids = group.participants.map((p) => p.id._serialized);
    const mentionsText = jids.map((jid) => `@${jid.split("@")[0]}`).join(" ");
    const body = mentionsText;

    await group.sendMessage(body, { mentions: jids });
  }

  /**
   * Send a help message with available commands
   */
  public async help(message: Message): Promise<void> {
    const helpText =
      "🤖 Olá! Eu sou a YasBot. Para me usar basta me adicionar a um grupo do WhatsApp ou me enviar uma mensagem privada que eu já estarei ativo!\n\n" +
      "*Comandos disponíveis:*\n" +
      "- `!todos` ou `!all`: menciona *todos* os participantes do grupo.\n" +
      "- `!ajuda` ou `!help`: exibe esta mensagem de ajuda.\n\n" +
      "🚀 Qualquer dúvida, é só chamar!";
    await message.reply(helpText);
  }

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
   * Registers the current message for daily summaries.
   */
  public async addMessage(message: Message, groupId: string): Promise<void> {
    // check if groups is registered

    const isRegistered = await this.mongo.getGroups({ groupId });

    if (isRegistered.length === 0) {
      return;
    }

    const text = message.body.trim();
    const authorId = message.author ?? message.from;
    const senderNumber = authorId.split("@")[0].replace("55", "");

    //save message
    await this.mongo.addMessage(groupId, text, senderNumber);
  }
}
