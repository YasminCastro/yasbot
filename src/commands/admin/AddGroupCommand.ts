import { Message } from "whatsapp-web.js";
import { AdminService } from "../../services/AdminService";

/**
 * Command to add a group for daily summaries
 */
export class AddGroupCommand {
  constructor(private adminService: AdminService) {}

  public async execute(message: Message): Promise<boolean> {
    await this.adminService.addGroup(message);
    return true;
  }
}
