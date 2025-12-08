import { Message } from "whatsapp-web.js";
import { AdminService } from "../../services/AdminService";

/**
 * Command to remove a group from daily summaries
 */
export class RemoveGroupCommand {
  constructor(private adminService: AdminService) {}

  public async execute(message: Message): Promise<boolean> {
    await this.adminService.removeGroup(message);
    return true;
  }
}
