import { Message } from "whatsapp-web.js";
import { GreetingService } from "../../services/GreetingService";

/**
 * Command to greet users
 */
export class HelloCommand {
  constructor(private greetingService: GreetingService) {}

  public async execute(message: Message): Promise<boolean> {
    await this.greetingService.hello(message);
    return true;
  }
}
