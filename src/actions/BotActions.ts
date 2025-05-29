// src/actions/BotActions.ts
import { Client, Message, GroupChat } from "whatsapp-web.js";
import { GoogleSheetsService } from "../services/GoogleSheetsService";

/**
 * Classe responsável por centralizar as ações que o bot pode executar
 */
export class BotActions {
  constructor(
    private client: Client,
    private sheetsService: GoogleSheetsService
  ) {}

  /**
   * Menciona todos os participantes de um grupo
   */
  public async mentionAll(message: Message): Promise<void> {
    // Garantir que seja um chat de grupo
    const chat = await message.getChat();
    if (!chat.isGroup) {
      await message.reply("❌ Este comando só funciona em grupos!");
      return;
    }
    const group = chat as GroupChat;

    // Extrai os JIDs dos participantes
    const jids = group.participants.map((p) => p.id._serialized);
    // Monta o texto com @número para cada participante
    const mentionsText = jids.map((jid) => `@${jid.split("@")[0]}`).join(" ");
    const body = `🔔 Atenção, pessoal!\n${mentionsText}`;

    // Envia a mensagem mencionando todos
    await group.sendMessage(body, { mentions: jids });
  }

  /**
   * Registra presença de quem enviou "sim" na planilha e responde no chat
   */
  public async confirmPresence(message: Message): Promise<void> {
    // Pega informações do contato que enviou a mensagem
    const contact = await message.getContact();
    const name = contact.pushname || contact.number;
    const number = contact.number;

    // Registra no Google Sheets
    await this.sheetsService.registerPresence(name, number);

    // Responde ao usuário
    await message.reply(`Obrigado, ${name}! Sua presença foi confirmada 🎉`);
  }
}

/*
  Exemplo de uso no src/index.ts:

  import { Client, LocalAuth, Message } from "whatsapp-web.js";
  import { GoogleSheetsService } from "../services/GoogleSheetsService";
  import { BotActions } from "./actions/BotActions";

  const client = new Client({ authStrategy: new LocalAuth(), puppeteer: { headless: true } });
  const sheets = new GoogleSheetsService({ spreadsheetId: process.env.SPREADSHEET_ID!, credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS! });
  const actions = new BotActions(client, sheets);

  client.on("message", async (msg: Message) => {
    if (msg.fromMe) return;
    const text = msg.body.trim().toLowerCase();

    if (text === "@all" || text === "@marcartodos") {
      await actions.mentionAll(msg);
    } else if (text === "sim") {
      await actions.confirmPresence(msg);
    }
  });
*/
