// src/actions/BotActions.ts
import { Client, Message, MessageMedia, Location } from "whatsapp-web.js";
import { MongoService } from "./MongoService";
import { logger } from "../utils/logger";
import { Guest } from "../interfaces";
import { ADMIN_NUMBERS } from "../config";

/**
 * Class responsible for handling all bot actions
 */
export class PartyInviteService {
  constructor(private mongo: MongoService, private client: Client) {}

  /**
   * Add guests to the birthday list, with optional sendInvitation flag
   */
  public async addGuest(message: Message, command: string): Promise<void> {
    const text = this.getTextAndRemoveCommand(message, command);
    const parts = text.split(/\s+/).filter(Boolean);

    if (parts.length < 2) {
      await message.reply(
        "❌ Uso: @add-guest <Nome> <Número> [Enviar Convite? Sim/Não]\n" +
          "Exemplos válidos:\n" +
          " • @add-guest Maria 11999888777\n" +
          " • @add-guest João +55 11 98765-4321 Não"
      );
      return;
    }

    const firstNumIdx = parts.findIndex((p) => /^\+?[\d\-\(\)]+$/.test(p));
    if (firstNumIdx <= 0) {
      await message.reply(
        "❌ Não encontrei um número válido no comando.\n" +
          "Use: @add-guest <Nome> <Número> [Enviar Convite? Sim/Não]"
      );
      return;
    }

    const person = parts.slice(0, firstNumIdx).join(" ");

    const numberTokens = parts
      .slice(firstNumIdx)
      .filter((p) => /^\+?[\d\-\(\)]+$/.test(p));

    const inviteIdx = firstNumIdx + numberTokens.length;

    let sendInvitation = true;
    if (inviteIdx < parts.length) {
      const flag = parts[inviteIdx].toLowerCase();
      if (flag === "não" || flag === "nao") {
        sendInvitation = false;
      }
    }

    const numberRaw = numberTokens.join(" ");
    let normalizedNumber = numberRaw.replace(/\D+/g, "");

    if (
      normalizedNumber.startsWith("55") &&
      (normalizedNumber.length === 12 || normalizedNumber.length === 13)
    ) {
      normalizedNumber = normalizedNumber.slice(2);
    }

    if (![10, 11].includes(normalizedNumber.length)) {
      await message.reply(
        "❌ Número inválido. Deve conter DDD + 8 ou 9 dígitos.\n" +
          "Ex.: @add-guest Nome +55 62 98765-4321 Sim"
      );
      return;
    }

    const wasGuestAdded = await this.mongo.addGuest(
      person,
      normalizedNumber,
      sendInvitation
    );

    if (wasGuestAdded) {
      const conviteMsg = sendInvitation
        ? "✅ Convite será enviado."
        : "ℹ️ Convite não será enviado.";
      await message.reply(
        `${person} foi adicionado com sucesso à lista de convidados! 🎉\n${conviteMsg}`
      );
    } else {
      await message.reply(
        `❌ Não foi possível adicionar ${person}. Tente novamente mais tarde.`
      );
    }
  }

  /**
   * Remove guests from the birthday list, by número ou nome
   */
  public async removeGuest(message: Message, command: string): Promise<void> {
    const text = this.getTextAndRemoveCommand(message, command).trim();
    const parts = text.split(/\s+/).filter(Boolean);

    if (parts.length < 1) {
      await message.reply(
        "❌ Uso: @remove-guest <Número OU Nome>\n" +
          "Exemplos válidos:\n" +
          " • @remove-guest 62912345678\n" +
          " • @remove-guest +55 62 91234-5678\n" +
          " • @remove-guest Maria Silva"
      );
      return;
    }

    const input = parts.join(" ");

    // Tenta interpretar como telefone
    let normalized = input.replace(/\D+/g, "");
    if (
      normalized.startsWith("55") &&
      (normalized.length === 12 || normalized.length === 13)
    ) {
      normalized = normalized.slice(2);
    }

    const isPhone = [10, 11].includes(normalized.length);

    let query: any = {};

    if (isPhone) {
      query.number = normalized;
    } else {
      query.name = { $regex: new RegExp(input, "i") };
    }

    let wasRemoved = await this.mongo.removeGuest(query);

    const who = isPhone ? normalized : input;
    if (wasRemoved) {
      await message.reply(
        `${who} foi removido com sucesso da lista de convidados!`
      );
    } else {
      await message.reply(
        `Não foi possível remover ${who} da lista de convidados. Tente novamente mais tarde.`
      );
    }
  }

  /**
   * Update a guest by name, parsing multiple “key? value” segments.
   * Usage in chat:
   *   @update-guest Maria - é para enviar convite? sim - recebeu convite? sim - vai? sim
   */
  public async updateGuest(message: Message, command: string): Promise<void> {
    const raw = message.body.slice(command.length).trim();
    const segments = raw
      .split("-")
      .map((s) => s.trim())
      .filter(Boolean);

    const name = segments.shift();
    if (!name) {
      await message.reply(
        "❌ Uso: @update-guest <Nome> - vai? não - recebeu convite? sim - é para enviar convite? sim \n" +
          "Exemplo:\n" +
          "  @update-guest Maria Silva - vai? sim - recebeu convite? não"
      );
      return;
    }

    const filter = { name: { $regex: new RegExp(`^${name}$`, "i") } };
    const updateFields: Partial<Guest> = {};

    for (const seg of segments) {
      const [question, answerRaw] = seg.split("?").map((p) => p.trim());
      if (!answerRaw) continue;
      const ans = answerRaw.toLowerCase();
      const yes = ans.startsWith("s") || ans === "yes" || ans === "true";

      if (question.includes("enviar convite")) {
        updateFields.sendInvitation = yes;
      } else if (question.includes("recebeu convite")) {
        updateFields.receivedInvitation = yes;
      } else if (question.includes("vai")) {
        updateFields.confirmed = yes;
        if (yes) updateFields.confirmedAt = new Date();
      } else {
        logger.warn(`Unknown update field: "${question}"`);
      }
    }

    // 4️⃣ Perform the update
    if (Object.keys(updateFields).length === 0) {
      await message.reply(
        "❌ Não encontrei nenhum campo válido para atualizar."
      );
      return;
    }

    const ok = await this.mongo.updateGuest(filter, updateFields);
    if (ok) {
      await message.reply(
        `✅ ${name} atualizado com sucesso:\n` +
          Object.entries(updateFields)
            .map(([k, v]) => `• ${k}: ${v}`)
            .join("\n")
      );
    } else {
      await message.reply(
        `❌ Não consegui encontrar ou atualizar ${name}. Verifique o nome e tente novamente.`
      );
    }
  }

  /**
   * Get birthday list
   */
  public async getGuests(message: Message): Promise<void> {
    const guests = await this.mongo.getGuests();

    if (guests.length === 0) {
      await message.reply("📋 A lista de convidados está vazia.");
      return;
    }

    const sorted = guests
      .slice()
      .sort((a, b) =>
        a.name.localeCompare(b.name, "pt", { sensitivity: "base" })
      );

    let totalWaitingResponse = 0; // ⏳
    let totalConfirmed = 0; // ✅
    let totalCanceled = 0; // ❌

    const lines = sorted.map((g, idx) => {
      let status: string;

      if (!g.sendInvitation) {
        status = "🗣️";
      } else if (!g.receivedInvitation) {
        status = "📩";
      } else if (g.confirmed === true) {
        status = "✅";
        totalConfirmed++;
      } else if (g.confirmed === false) {
        status = "❌";
        totalCanceled++;
      } else {
        status = "⏳";
        totalWaitingResponse++;
      }

      return `${idx + 1} - ${g.name} (${g.number}) – ${status}`;
    });

    const header = [
      "📋 *Lista atual de convidados*",
      `Total de convidados: ${sorted.length}`,
      `⏳ Aguardando resposta: ${totalWaitingResponse}`,
      `✅ Confirmados: ${totalConfirmed}`,
      `❌ Cancelados: ${totalCanceled} \n`,
    ].join("\n");
    await message.reply([header, ...lines].join("\n"));
  }

  /**
   * send birthday invitations to guests who haven't received them yet
   */
  public async sendInvites(message: Message): Promise<void> {
    const guests = await this.mongo.getGuests({
      receivedInvitation: false,
      sendInvitation: true,
    });

    if (guests.length === 0) {
      await message.reply("📋 Todos os convidados já receberam o convite.");
      return;
    }

    await message.reply("📩 Enviando convite para os convidados...");

    const media = this.birthdayImage();
    const partyLocation = this.birthdayPartyLoc();

    for (const guest of guests) {
      try {
        await this.mountInviteAndSend(guest, media, partyLocation);
        await this.mongo.markInvited(guest.number);
      } catch (err) {
        logger.error(`❌ Failed to send to ${guest.number}:`, err);
      }
      await new Promise((res) => setTimeout(res, 500));
    }

    await message.reply(
      `✅ Convite enviado para todos os ${guests.length} convidados!`
    );
  }

  /**
   * sends a reminder to guests who haven't confirm the invitation yet
   */
  public async sendConfirmationReminder(message: Message): Promise<void> {
    const guests = await this.mongo.getGuests({
      confirmed: { $exists: false },
    });

    if (guests.length === 0) {
      await message.reply("📋 Todos os convidados já confirmaram o convite.");
      return;
    }

    await message.reply("📩 Enviando convite para os convidados...");

    for (const guest of guests) {
      const chatId = `55${guest.number}@c.us`;
      const text =
        "🔔 Olá " +
        guest.name +
        "! \n" +
        "Você ainda não confirmou sua presença na festa da Yas, " +
        "que acontecerá dia *19/07 às 19h* na Rua Jacarandá - Goiânia 2. \n\n" +
        "• Responda com `confirmar` para confirmar que você vai. \n" +
        `• Responda com \`cancelar\` se não puder comparecer  \n` +
        "• Responda com `convite` para receber o convite novamente. \n" +
        "• Responda com `localização` para receber a loc da festa. \n\n" +
        "Aguardo sua resposta! 🎉";

      try {
        await this.client.sendMessage(chatId, text);
      } catch (err) {
        logger.error(`❌ Failed to send to ${guest.number}:`, err);
      }
      await new Promise((res) => setTimeout(res, 500));
    }

    await message.reply(
      `✅ Convite enviado para todos os ${guests.length} convidados!`
    );
  }

  /**
   * send birthday invitations to guests who haven't received them yet
   */
  public async sendInvite(message: Message): Promise<void> {
    const senderNumber = message.from.split("@")[0].replace("55", "");

    const guests = await this.mongo.getGuests({ number: senderNumber });
    const guest = guests[0];

    if (!guest) {
      await message.reply("❌ Você não está na lista de convidados. ");
      return;
    }

    const media = this.birthdayImage();
    const partyLocation = this.birthdayPartyLoc();

    await this.mountInviteAndSend(guest, media, partyLocation);
  }

  /**
   * Confirms the presence of a guest
   */
  public async confirmPresence(message: Message): Promise<void> {
    const senderNumber = message.from.split("@")[0].replace("55", "");

    const guests = await this.mongo.getGuests({ number: senderNumber });
    const guest = guests[0];

    if (!guest) {
      await message.reply("❌ Você não está na lista de convidados. ");
      return;
    }

    if (guest.confirmed) {
      await message.reply("✅ Sua presença já está confirmada.");
      return;
    }

    await this.mongo.changeGuestConfirmStatus(senderNumber, true);
    await message.reply("✅ Sua presença foi confirmada com sucesso!");

    await this.notifyAdmin(guest, true);
  }

  /**
   * Cancels the presence of a guest
   */
  public async cancelPresence(message: Message): Promise<void> {
    const senderNumber = message.from.split("@")[0].replace("55", "");

    const guests = await this.mongo.getGuests({ number: senderNumber });
    const guest = guests[0];

    if (!guest) {
      await message.reply("❌ Você não está na lista de convidados. ");
      return;
    }

    await this.mongo.changeGuestConfirmStatus(senderNumber, false);
    await message.reply("❌ Sua presença foi cancelada!");

    await this.notifyAdmin(guest, false);
  }

  /**
   * Sends useful information and quick-reply commands
   */
  public async getInformation(message: Message): Promise<void> {
    const informationText =
      "🤔 *Informações úteis*: \n" +
      "\n" +
      "• Se tiver qualquer dificuldade, chame a Yasmin no WhatsApp: *62 98169-5581* \n" +
      "• Para receber a localização da festa, envie: `localização` \n" +
      `• Para confirmar presença, envie: \`confirmar\` \n` +
      `• Para cancelar presença, envie: \`cancelar\` \n` +
      `• Para ver o convite novamente, envie: \`convite\` \n` +
      "\n" +
      "🚀 Qualquer outra dúvida, é só chamar!";

    await message.reply(informationText);
    return;
  }

  /**
   * Sends the location of the birthday party
   */
  public async getLocalization(message: Message): Promise<void> {
    await message.reply(this.birthdayPartyLoc());
    return;
  }

  /**
   * Gets the text of the message and removes the command prefix
   */
  private getTextAndRemoveCommand(message: Message, command: string) {
    return message.body.replace(command, "").trim();
  }

  /**
   * Returns the birthday party location
   */
  private birthdayPartyLoc() {
    return new Location(-16.625647, -49.247846);
  }

  /**
   * Returns the birthday image as a MessageMedia object
   */
  private birthdayImage() {
    return MessageMedia.fromFilePath("./assets/convite-aniversario-yas.png");
  }

  /**
   * Mounts the birthday invitation and sends it to the guest
   */
  private async mountInviteAndSend(
    guest: Guest,
    media: MessageMedia,
    partyLocation: Location
  ) {
    const chatId = `55${guest.number}@c.us`;

    const introductionText =
      "🤖 Olá! Eu sou a YasBot, o assistente virtual que a Yasmin criou para te enviar esse convite. \n" +
      "Qualquer dúvida, é só chamar a Yasmin diretamente: 📱 *62 8169-5581*";

    const inviteText =
      `🎉 Olá ${guest.name}!  \n` +
      `Você está convidado(a) para a festa de *25 anos* e comemoração da *colação de grau* da Yas. \n ` +
      `🗓 *19/07 às 19:00* \n` +
      `📍 Rua Jacarandá QD 16, LT 25 - Goiânia 2 \n` +
      `Traga o que for beber e sua caixa térmica.`;

    const informationText =
      `• Responda com \`confirmar\` para confirmar presença  \n` +
      `• Responda com \`cancelar\` se não puder comparecer  \n` +
      `• Responda com \`aniversário\` para mais informações  \n` +
      `Você pode confirmar até *16/07* a qualquer momento.`;
    try {
      await this.client.sendMessage(chatId, introductionText);
      await this.client.sendMessage(chatId, media, { caption: inviteText });
      await this.client.sendMessage(chatId, informationText);
      await this.client.sendMessage(chatId, partyLocation);
    } catch (err) {
      logger.error(`❌ Failed to send to ${guest.number}:`, err);
    }
    return;
  }

  private async notifyAdmin(guest: Guest, confirmed: boolean) {
    const text = confirmed
      ? `✅ O convidado ${guest.name} confirmou presença na festa.`
      : `❗️ O convidado ${guest.name} cancelou a presença na festa.`;

    for (let admin of ADMIN_NUMBERS) {
      const chatId = `${admin}@c.us`;

      try {
        await this.client.sendMessage(chatId, text);
      } catch (err) {
        logger.error(`❌ Falha ao notificar admin ${admin}:`, err);
      }
    }
  }
}
