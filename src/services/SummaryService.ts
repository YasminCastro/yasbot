import { Client } from "whatsapp-web.js";
import { Database } from "../repositories/Database";
import { LoggedMessage } from "../models";
import { startOfYesterday, endOfYesterday, format } from "date-fns";

/**
 * Service for handling daily summaries
 */
export class SummaryService {
  constructor(private database: Database, private client: Client) {}

  /**
   * Sends a chat summary to the group.
   */
  public async sendChatSummary(groupId: string): Promise<void> {
    const isRegistered = await this.database.groups.getGroups({ groupId });
    if (isRegistered.length === 0) return;

    const chat = await this.client.getChatById(groupId);

    const yesterdayStart = startOfYesterday();
    const yesterdayEnd = endOfYesterday();
    const dateString = format(yesterdayStart, "dd/MM/yyyy");

    const messages = await this.database.messages.getMessages({
      groupId,
      timestamp: { $gte: yesterdayStart, $lte: yesterdayEnd },
    });

    if (!messages || messages.length === 0) {
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
      `Top 3 participantes:\n` +
      top3Lines.join("\n");

    if (mentionJids.length > 0) {
      await chat.sendMessage(summaryText, { mentions: mentionJids });
    } else {
      await chat.sendMessage(summaryText);
    }

    await this.database.groups.saveGroupDailySummary(
      groupId,
      top3Lines,
      total,
      yesterdayStart
    );
  }

  private async getTopSenders(messagesToday: LoggedMessage[]) {
    const counts: Record<string, number> = {};
    const lastWidByPhone: Record<string, string> = {};

    for (const msg of messagesToday) {
      const phone = (msg.senderPhone || "").replace(/\D/g, "");
      if (!phone) continue;
      counts[phone] = (counts[phone] || 0) + 1;

      if (msg.senderWid) lastWidByPhone[phone] = msg.senderWid;
    }

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top3 = sorted.slice(0, 3);

    const mentionJids: string[] = [];
    const top3Lines: string[] = [];

    for (let i = 0; i < top3.length; i++) {
      const [phone, count] = top3[i];

      let serialized = lastWidByPhone[phone];
      if (!serialized) {
        const wid = await this.client.getNumberId(phone).catch(() => null);
        serialized = wid?._serialized || `${phone}@s.whatsapp.net`;
      }

      mentionJids.push(serialized);
      top3Lines.push(`${i + 1}. @${phone} – ${count} mensagem(s)`);
    }

    return { top3Lines, mentionJids };
  }
}
