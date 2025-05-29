// src/actions/BotActions.ts
import { Client, Message, GroupChat } from "whatsapp-web.js";
import { GoogleSheetsService } from "../services/GoogleSheetsService";

/**
 * Class responsible for handling all bot actions
 */
export class BotActions {
  constructor(private sheetsService: GoogleSheetsService) {}

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
   * Records the presence of users who reply "sim" in the spreadsheet and sends a confirmation
   */
  public async confirmPresence(message: Message): Promise<void> {
    // Get the contact information of the user
    const contact = await message.getContact();
    const name = contact.pushname || contact.number;
    const number = contact.number;

    // Register the user's presence in Google Sheets
    await this.sheetsService.registerPresence(name, number);

    // Reply to the user confirming registration
    await message.reply(
      `Thank you, ${name}! Your attendance has been confirmed 🎉`
    );
  }
}
