import { Message } from "whatsapp-web.js";
import { GreetingService } from "../../services/GreetingService";

/**
 * Command to respond to "gente" message
 */
export class GenteCommand {
  constructor(private greetingService: GreetingService) {}

  public async execute(message: Message): Promise<boolean> {
    await this.greetingService.gente(message);
    return true;
  }
}
