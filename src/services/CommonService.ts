// src/actions/BotActions.ts
import { Message, GroupChat, Client } from "whatsapp-web.js";
import { MongoService } from "../services/MongoService";
import { startOfYesterday, endOfYesterday, format, getHours } from "date-fns";
import { LoggedMessage } from "../interfaces";
import { OLD_PEOPLE_NUMBERS } from "../config";

/**
 * Class responsible for handling common actions
 */
export class CommonService {
  private lastMentionTime: Map<string, number> = new Map();

  private oldSlangs = [];

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
   * Send a hello message
   */
  public async hello(message: Message): Promise<void> {
    const authorId = message.author ?? message.from;
    const senderNumber = authorId.split("@")[0];

    console.log("senderNumber", senderNumber);
    console.log("OLD_PEOPLE_NUMBERS", OLD_PEOPLE_NUMBERS);

    if (senderNumber in OLD_PEOPLE_NUMBERS) {
      await message.reply("Oi, Cacura");
      return;
    }

    const now = new Date();
    const hour = getHours(now);

    let text = "Oie, ";
    if (hour <= 12) {
      text += "bom dia ⛅";
    } else if (hour < 18) {
      text += "boa tarde ☀️";
    } else {
      text += "boa noite 🌛";
    }

    await message.reply(text);
  }

  /**
   * Registers the current message for daily summaries.
   */
  public async addMessage(message: Message, groupId: string): Promise<void> {
    const isRegistered = await this.mongo.getGroups({ groupId });
    if (isRegistered.length === 0) return;

    const text = message.body ? message.body.trim() : message.type;

    const authorId = message.author ?? message.from;
    const senderNumber = authorId.split("@")[0];

    //save message
    await this.mongo.addMessage(groupId, text, senderNumber);
  }

  /**
   *  Sends a chat summary to the group.
   */
  public async sendChatSummary(groupId: string): Promise<void> {
    const isRegistered = await this.mongo.getGroups({ groupId });
    if (isRegistered.length === 0) return;

    const chat = await this.client.getChatById(groupId);
    const yesterdayStart = startOfYesterday();
    const yesterdayEnd = endOfYesterday();
    const dateString = format(yesterdayStart, "dd/MM/yyyy");

    const messages = await this.mongo.getMessages({
      groupId,
      timestamp: {
        $gte: yesterdayStart,
        $lte: yesterdayEnd,
      },
    });

    if (messages.length === 0) {
      await chat.sendMessage(
        `📋 Nenhuma mensagem registrada para ${dateString}.`
      );
      return;
    }

    const total = messages.length;
    const { top3Lines, mentionJids } = await this.getTopSenders(messages);

    const summaryText =
      `📊 *Resumo do dia ${dateString}* 📊\n` +
      `Total de mensagens: *${total}*\n\n` +
      "Top 3 participantes:\n" +
      top3Lines.join("\n");

    await chat.sendMessage(summaryText, { mentions: mentionJids });

    await this.mongo.saveGroupDailySummary(
      groupId,
      top3Lines,
      total,
      yesterdayStart
    );
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
