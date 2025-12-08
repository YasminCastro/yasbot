import { Message } from "whatsapp-web.js";
import { MentionService } from "../../services/MentionService";

/**
 * Command to mention all participants in a group
 */
export class AllCommand {
  constructor(private mentionService: MentionService) {}

  public async execute(message: Message): Promise<boolean> {
    await this.mentionService.mentionAll(message);
    return true;
  }
}
