// src/controllers/MessageController.ts
import { GroupChat, Message } from "whatsapp-web.js";
import { ADMIN_NUMBERS } from "../config";
import { CommonService } from "../services/CommonService";
import { AdminService } from "../services/AdminService";
import { PartyInviteService } from "../services/PartyInviteService";

/**
 * Controller responsible for handling incoming messages and dispatching the appropriate bot actions
 */
export class MessageController {
  constructor(
    private commomService: CommonService,
    private adminService: AdminService,
    private partyInviteService: PartyInviteService
  ) {}

  /**
   * Processes a new message and invokes the corresponding action
   */
  public async handle(message: Message): Promise<void> {
    if (message.fromMe) return;

    if (await this.adminServices(message)) return;
    if (await this.commonServices(message)) return;
    // if (await this.partyInviteServices(message)) return;

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

    if (text === "oi" || text === "olá" || text === "oie") {
      await this.commomService.hello(message);
      return true;
    }

    return false;
  }

  private async partyInviteServices(message: Message): Promise<boolean> {
    const chat = await message.getChat();
    if (chat.isGroup) return false;

    const text = message.body.trim().toLowerCase();
    if (text === "confirmar") {
      await this.partyInviteService.confirmPresence(message);
      return true;
    }

    if (text === "cancelar") {
      await this.partyInviteService.cancelPresence(message);
      return true;
    }

    if (text === "aniversário" || text === "aniversario") {
      await this.partyInviteService.getInformation(message);
      return true;
    }

    if (text === "localização" || text === "localizacao") {
      await this.partyInviteService.getLocalization(message);
      return true;
    }

    if (text === "convite") {
      await this.partyInviteService.sendInvite(message);
      return true;
    }

    return false;
  }

  private async adminServices(message: Message): Promise<boolean> {
    const text = message.body.trim().toLowerCase();
    const authorId = message.author ?? message.from;
    const senderNumber = authorId.split("@")[0];

    if (!ADMIN_NUMBERS.includes(senderNumber)) return false;

    if (text.includes("@add-guest")) {
      await this.partyInviteService.addGuest(message, "@add-guest");
      return true;
    }

    if (text.includes("@remove-guest")) {
      await this.partyInviteService.removeGuest(message, "@remove-guest");
      return true;
    }

    if (text.includes("@update-guest")) {
      await this.partyInviteService.updateGuest(message, "@update-guest");
      return true;
    }

    if (text.includes("@get-guests")) {
      await this.partyInviteService.getGuests(message);
      return true;
    }

    if (text.includes("@send-invitation")) {
      await this.partyInviteService.sendInvites(message);
      return true;
    }

    if (text.includes("@send-confirmation-reminder")) {
      await this.partyInviteService.sendConfirmationReminder(message);
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

    return false;
  }
}
