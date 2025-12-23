import { Message } from "whatsapp-web.js";
import { AdminService } from "../../services/AdminService";

/**
 * Commands for user management
 */
export class UsersCommand {
  constructor(private adminService: AdminService) {}

  /**
   * Handles user-related commands
   */
  public async handleCommand(message: Message, text: string): Promise<boolean> {
    if (text.includes("@remover-usuario")) {
      await this.adminService.removeUser(message);
      return true;
    }

    if (text.includes("@usuarios")) {
      await this.adminService.listUsers(message);
      return true;
    }

    if (
      text.startsWith("@usuario") ||
      (text.includes("@usuario") &&
        !text.includes("@remover-usuario") &&
        !text.includes("@usuarios"))
    ) {
      await this.adminService.addUser(message);
      return true;
    }

    return false;
  }
}
