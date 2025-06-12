// src/controllers/MessageController.ts
import { GroupChat, Message } from "whatsapp-web.js";
import { ADMIN_NUMBERS } from "../config";
import { CommonService } from "../services/CommonService";
import { AdminService } from "../services/AdminService";
import { BirthdayService } from "../services/BirthdayService";

/**
 * Controller responsible for handling incoming messages and dispatching the appropriate bot actions
 */
export class MessageController {
  constructor(
    private commomService: CommonService,
    private adminService: AdminService,
    private birthdayService: BirthdayService
  ) {}

  /**
   * Processes a new message and invokes the corresponding action
   */
  public async handle(message: Message): Promise<void> {
    if (message.fromMe) return;

    if (await this.adminServices(message)) return;
    if (await this.commonServices(message)) return;
    if (await this.birthdayServices(message)) return;

    const chat = await message.getChat();
    if (chat.isGroup) {
      const group = chat as GroupChat;
      const groupId = group.id._serialized;

      // if (text === "!resumo") {
      //   await this.commomService.sendChatSummary(groupId);
      //   return;
      // }

      await this.commomService.addMessage(message, groupId);
    }
  }

  private async commonServices(message: Message): Promise<boolean> {
    const text = message.body.trim().toLowerCase();
    if (text === "!all" || text === "!todos") {
      await this.commomService.mentionAll(message);
      return true;
    }

    if (text === "!help" || text === "!ajuda") {
      await this.commomService.help(message);
      return true;
    }

    return false;
  }

  private async birthdayServices(message: Message): Promise<boolean> {
    const text = message.body.trim().toLowerCase();
    if (text === "!confirmar") {
      await this.birthdayService.confirmPresence(message);
      return true;
    }

    if (text === "!cancelar") {
      await this.birthdayService.cancelPresence(message);
      return true;
    }

    if (text === "!aniversário" || text === "!aniversario") {
      await this.birthdayService.getInformation(message);
      return true;
    }

    if (text === "!localização") {
      await this.birthdayService.getLocalization(message);
      return true;
    }

    if (text === "!convite") {
      await this.birthdayService.sendInvite(message);
      return true;
    }

    return false;
  }

  private async adminServices(message: Message): Promise<boolean> {
    const text = message.body.trim().toLowerCase();
    const authorId = message.author ?? message.from;
    const senderNumber = authorId.split("@")[0];

    if (senderNumber && ADMIN_NUMBERS.includes(senderNumber)) {
      if (text.includes("@add-guest")) {
        await this.birthdayService.addGuest(message, "@add-guest");
        return true;
      }

      if (text.includes("@remove-guest")) {
        await this.birthdayService.removeGuest(message, "@remove-guest");
        return true;
      }

      if (text.includes("@get-guests")) {
        await this.birthdayService.getGuests(message);
        return true;
      }

      if (text.includes("@send-invitation")) {
        await this.birthdayService.sendInvites(message);
        return true;
      }

      if (text.includes("@send-reminder")) {
        await this.birthdayService.sendReminder(message);
        return true;
      }

      if (text.includes("@admin")) {
        await this.adminService.admin(message);
        return true;
      }

      if (text.includes("@add-group")) {
        await this.adminService.addGroup(message);
        return true;
      }

      if (text.includes("@remove-group")) {
        await this.adminService.removeGroup(message);
        return true;
      }
    }

    return false;
  }
}
