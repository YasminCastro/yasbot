import { Message, GroupChat, Client } from "whatsapp-web.js";

/**
 * Service for handling group mentions
 */
export class MentionService {
  private lastMentionTime: Map<string, number> = new Map();

  constructor(private client: Client) {}

  /**
   * Mentions all participants in a group chat (excluding the bot itself)
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

    // Get bot's own number to exclude it from mentions
    const botInfo = this.client.info;
    const botWid = botInfo?.wid?._serialized;

    // Filter out the bot from participants
    let jids = group.participants.map((p) => p.id._serialized);

    // Remove bot from mentions if bot info is available
    if (botWid) {
      jids = jids.filter((jid) => jid !== botWid);
    }

    if (jids.length === 0) {
      await message.reply("❌ Não há outros participantes para mencionar.");
      return;
    }

    const mentionsText = jids.map((jid) => `@${jid.split("@")[0]}`).join(" ");
    const body = mentionsText;

    await group.sendMessage(body, { mentions: jids });
  }
}
