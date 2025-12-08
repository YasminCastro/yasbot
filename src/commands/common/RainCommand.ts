import { Message } from "whatsapp-web.js";
import { CommonService } from "../../services/CommonService";

/**
 * Command to check if it's going to rain
 */
export class RainCommand {
  constructor(private commonService: CommonService) {}

  public async execute(message: Message): Promise<boolean> {
    const text = message.body.trim().toLowerCase();

    // Special case for "vai chover?" with certain words
    if (
      text.includes("vai chover?") &&
      (text.includes("pica") || text.includes("cu") || text.includes("varal"))
    ) {
      await message.reply("vai sim careca, corre e tira o seu do varal");
      return true;
    }

    if (text.includes("vai chover?")) {
      await this.commonService.handleRainQuestion(message);
      return true;
    }

    return false;
  }
}
