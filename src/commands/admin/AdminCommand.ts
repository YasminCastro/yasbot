import { Message } from "whatsapp-web.js";
import { AdminService } from "../../services/AdminService";

/**
 * Command to show admin help
 */
export class AdminCommand {
  constructor(private adminService: AdminService) {}

  public async execute(message: Message): Promise<boolean> {
    await this.adminService.admin(message);
    return true;
  }
}
