import { Message } from "whatsapp-web.js";
import { CommonService } from "../../services/CommonService";

/**
 * Command to greet users
 */
export class HelloCommand {
  constructor(private commonService: CommonService) {}

  public async execute(message: Message): Promise<boolean> {
    await this.commonService.hello(message);
    return true;
  }
}
