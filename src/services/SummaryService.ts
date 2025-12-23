import { Client, GroupChat } from "whatsapp-web.js";
import { Database } from "../repositories/Database";
import { LoggedMessage, User } from "../models";
import { startOfYesterday, endOfYesterday, format } from "date-fns";
import { logger } from "../utils/logger";

/**
 * Service for handling daily summaries
 */
export class SummaryService {
  private birthdayMessages = [
    "Parabéns! 🎂✨\n\nQue seu dia seja repleto de alegria e felicidade! 🎈🎁",
    "Feliz aniversário! 🎉🎊\n\nQue este novo ano de vida seja cheio de conquistas e momentos especiais! 🌟",
    "Parabéns pelo seu dia! 🎂🎈\n\nQue todos os seus sonhos se realizem e que você seja muito feliz! ✨💫",
    "Feliz aniversário! 🎁🎂\n\nQue este dia seja especial e que você receba todo o carinho que merece! 💖🎉",
    "Parabéns! 🎊🎈\n\nQue seu novo ciclo seja repleto de saúde, amor e muitas alegrias! 🌈✨",
  ];

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

    // Check for birthdays and send congratulations
    await this.checkAndSendBirthdayWishes(groupId);
  }

  /**
   * Checks if there are users with birthdays today and sends congratulations
   */
  public async checkAndSendBirthdayWishes(groupId: string): Promise<void> {
    try {
      const today = new Date();
      const todayMonth = today.getMonth() + 1;
      const todayDay = today.getDate();

      const allUsers = await this.database.users.getUsers();

      const birthdayUsers = allUsers.filter((user) => {
        if (!user.birthday) return false;
        const birthdayMonth = user.birthday.getMonth() + 1;
        const birthdayDay = user.birthday.getDate();
        return birthdayMonth === todayMonth && birthdayDay === todayDay;
      });

      if (birthdayUsers.length === 0) {
        return;
      }

      const chat = await this.client.getChatById(groupId);
      if (!chat.isGroup) {
        return;
      }

      const group = chat as GroupChat;
      const participants = group.participants.map((p) => p.id._serialized);

      const birthdayUsersInGroup: Array<{ user: User; jid: string }> = [];

      for (const user of birthdayUsers) {
        const phoneNumber = user.phoneNumber.replace(/\D/g, "");

        let userJid: string | null = null;

        try {
          const wid = await this.client
            .getNumberId(phoneNumber)
            .catch(() => null);
          if (wid?._serialized && participants.includes(wid._serialized)) {
            userJid = wid._serialized;
          }
        } catch (err) {}

        if (!userJid) {
          for (const participantJid of participants) {
            const participantPhone = participantJid
              .split("@")[0]
              .replace(/\D/g, "");
            if (
              participantPhone === phoneNumber ||
              participantPhone.endsWith(phoneNumber) ||
              phoneNumber.endsWith(participantPhone)
            ) {
              userJid = participantJid;
              break;
            }
          }
        }

        if (userJid) {
          birthdayUsersInGroup.push({ user, jid: userJid });
        }
      }

      if (birthdayUsersInGroup.length > 0) {
        const mentionJids: string[] = [];
        const mentionsText: string[] = [];

        for (const { user, jid } of birthdayUsersInGroup) {
          mentionJids.push(jid);
          const phoneNumber = jid.split("@")[0];
          mentionsText.push(`@${phoneNumber}`);
        }

        const randomMessage =
          this.birthdayMessages[
            Math.floor(Math.random() * this.birthdayMessages.length)
          ];

        let birthdayMessage = "🎉 *Feliz Aniversário!* 🎉\n\n";

        if (birthdayUsersInGroup.length === 1) {
          birthdayMessage += `${mentionsText[0]} ${randomMessage}`;
        } else {
          birthdayMessage += `${mentionsText.join(" ")} ${randomMessage}`;
        }

        await group.sendMessage(birthdayMessage, { mentions: mentionJids });
        logger.info(
          `🎂 Sent birthday wishes to ${birthdayUsersInGroup.length} user(s) in group ${groupId}`
        );
      }
    } catch (err) {
      logger.warn("❌ Error checking birthdays:", err);
    }
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
