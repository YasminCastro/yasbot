import { Message } from "whatsapp-web.js";
import { CommonService } from "../../services/CommonService";

/**
 * Command to respond to "gente" message
 */
export class GenteCommand {
  constructor(private commonService: CommonService) {}

  public async execute(message: Message): Promise<boolean> {
    await this.commonService.gente(message);
    return true;
  }
}
