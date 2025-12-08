import { Message } from "whatsapp-web.js";
import { PartyInviteService } from "../../services/PartyInviteService";

/**
 * Commands for party invite management
 */
export class PartyInviteCommands {
  constructor(private partyInviteService: PartyInviteService) {}

  public async handleCommand(message: Message, text: string): Promise<boolean> {
    const chat = await message.getChat();
    if (chat.isGroup) {
      // Party invite commands are only for private chats
      return false;
    }

    // Admin commands
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

    // User commands
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
}
