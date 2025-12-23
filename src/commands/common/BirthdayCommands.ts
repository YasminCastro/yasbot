import { Message } from "whatsapp-web.js";
import { AdminService } from "../../services/AdminService";

/**
 * Commands for birthday management
 */
export class BirthdayCommands {
  constructor(private adminService: AdminService) {}

  /**
   * Handles birthday-related commands
   */
  public async handleCommand(message: Message, text: string): Promise<boolean> {
    if (
      text.includes("próximo aniversário") ||
      text.includes("proximo aniversario") ||
      text.includes("de quem é o próximo aniversário") ||
      text.includes("de quem e o proximo aniversario")
    ) {
      await this.adminService.getNextBirthday(message);
      return true;
    }

    if (
      text.includes("lista de aniversarios") ||
      text.includes("lista de aniversários")
    ) {
      await this.adminService.listGroupBirthdays(message);
      return true;
    }

    if (
      text.includes("quando é o aniversario") ||
      text.includes("quando e o aniversario") ||
      text.includes("quando é o aniversário") ||
      text.includes("quando e o aniversário")
    ) {
      await this.adminService.getPersonBirthday(message);
      return true;
    }

    return false;
  }
}
