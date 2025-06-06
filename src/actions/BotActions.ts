// src/actions/BotActions.ts
import { Message, GroupChat, Client } from "whatsapp-web.js";
import { LoggedMessage, MongoService } from "../services/MongoService";

/**
 * Class responsible for handling all bot actions
 */
export class BotActions {
  private lastMentionTime: Map<string, number> = new Map();

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
    const groupId = group.id._serialized;
    const now = Date.now();

    const lastTime = this.lastMentionTime.get(groupId) || 0;
    const tenMinutes = 10 * 60 * 1000; // 10 minutes in ms

    if (now - lastTime < tenMinutes) {
      const secondsLeft = Math.ceil((tenMinutes - (now - lastTime)) / 1000);
      const minutesLeft = Math.floor(secondsLeft / 60);
      await message.reply(
        `⏳ Aguarde ${minutesLeft}m antes de usar este comando novamente.`
      );
      return;
    }

    this.lastMentionTime.set(groupId, now);

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

    if (message.hasMedia) return;

    const isRegistered = await this.mongo.getGroups({ groupId });

    if (isRegistered.length === 0) return;

    const text = message.body.trim();
    const authorId = message.author ?? message.from;
    const senderNumber = authorId.split("@")[0];

    //save message
    await this.mongo.addMessage(groupId, text, senderNumber);
  }

  /**
   *  Sends a chat summary to the group.
   */
  public async sendChatSummary(groupId: string): Promise<void> {
    // check if groups is registered

    const isRegistered = await this.mongo.getGroups({ groupId });
    if (isRegistered.length === 0) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    //get messages
    const messagesToday = await this.mongo.getMessages({
      groupId,
      timestamp: { $gte: todayStart },
    });

    // summary text
    if (messagesToday.length === 0) {
      const chat = await this.client.getChatById(groupId);
      await chat.sendMessage("📋 Nenhuma mensagem registrada para hoje.");
      return;
    }

    const total = messagesToday.length;

    const { top3Lines, mentionJids } = await this.getTopSenders(messagesToday);
    const summaryText =
      "📊 *Resumo do dia* 📊\n" +
      `Total de mensagens: *${total}*\n\n` +
      "Top 3 participantes:\n" +
      top3Lines.join("\n");

    const chat = await this.client.getChatById(groupId);
    await chat.sendMessage(summaryText, { mentions: mentionJids });
  }

  private async getTopSenders(messagesToday: LoggedMessage[]) {
    const counts: Record<string, number> = {};
    for (const msg of messagesToday) {
      counts[msg.sender] = (counts[msg.sender] || 0) + 1;
    }

    const sortedSenders = Object.entries(counts).sort(
      ([, countA], [, countB]) => countB - countA
    );

    const top3 = sortedSenders.slice(0, 3);

    const mentionJids: string[] = [];
    const top3Lines: string[] = [];

    for (let i = 0; i < top3.length; i++) {
      const [sender, count] = top3[i];
      const jid = `${sender}@c.us`;
      mentionJids.push(jid);

      // @<phone> fará o WhatsApp renderizar a menção
      const phoneOnly = sender;
      top3Lines.push(`${i + 1}. @${phoneOnly} – ${count} mensagem(s)`);
    }

    return { top3Lines, mentionJids };
  }
}
