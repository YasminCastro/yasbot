// src/controllers/MessageController.ts
import { Message } from "whatsapp-web.js";
import { BotActions } from "../actions/BotActions";

/**
 * Controller responsável por receber mensagens e disparar as ações apropriadas
 */
export class MessageController {
  constructor(private actions: BotActions) {}

  /**
   * Processa uma nova mensagem e chama a ação correspondente
   */
  public async handle(message: Message): Promise<void> {
    // Ignora mensagens enviadas pelo próprio bot
    if (message.fromMe) return;

    const text = message.body.trim().toLowerCase();

    // Dispara a ação de menção em massa
    if (text === "@all" || text === "@marcartodos") {
      await this.actions.mentionAll(message);
      return;
    }

    // Dispara a ação de confirmação de presença
    if (text === "sim") {
      await this.actions.confirmPresence(message);
      return;
    }

    // Aqui você pode adicionar novos comandos, ex:
    // if (text.startsWith("!help")) {
    //   await this.actions.showHelp(message);
    // }
  }
}
