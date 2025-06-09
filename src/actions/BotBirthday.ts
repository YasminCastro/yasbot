// src/actions/BotActions.ts
import { Client, Message, MessageMedia, Location } from "whatsapp-web.js";
import { Guest, MongoService } from "../services/MongoService";

/**
 * Class responsible for handling all bot actions
 */
export class BotBirthday {
  constructor(private mongo: MongoService, private client: Client) {}

  /**
   * Add guests to the birthday list
   */
  public async addGuest(message: Message, command: string): Promise<void> {
    const text = this.getTextAndRemoveCommand(message, command);
    const parts = text.split(/\s+/).filter(Boolean);

    // mínimo: um nome + ao menos um pedaço do número
    if (parts.length < 2) {
      await message.reply(
        "❌ Uso: @add-guest <Nome> <Número>\n" +
          "Exemplos válidos:\n" +
          " • @add-guest Maria 11999888777\n" +
          " • @add-guest João +55 11 98765-4321\n"
      );
      return;
    }

    // encontra onde começa a parte numérica (pode ser +, dígitos, -, parênteses)
    const firstNumIdx = parts.findIndex((p) => /^\+?[\d\-\(\)]+$/.test(p));
    if (firstNumIdx <= 0) {
      await message.reply(
        "❌ Não encontrei um número válido no comando.\n" +
          "Use: @add-guest <Nome> <Número>\n" +
          "Ex.: @add-guest Thays +55 11 99350-0484"
      );
      return;
    }

    // separa nome e número
    const person = parts.slice(0, firstNumIdx).join(" ");
    const numberRaw = parts.slice(firstNumIdx).join(" ");

    // 1) tira tudo que não é dígito
    let normalized = numberRaw.replace(/\D+/g, "");

    // 2) remove o "55" do início se for código do Brasil
    if (
      normalized.startsWith("55") &&
      (normalized.length === 12 || normalized.length === 13)
    ) {
      normalized = normalized.slice(2);
    }

    // 3) valida DDD (2 dígitos) + telefone (8 ou 9 dígitos)
    if (![10, 11].includes(normalized.length)) {
      await message.reply(
        "❌ Número inválido. Deve conter DDD + 8 ou 9 dígitos.\n" +
          "Exemplos:\n" +
          " • 11999888777\n" +
          " • +55 62 9181-9229\n" +
          " • +55 (11) 99350-0484"
      );
      return;
    }

    // grava no banco com o número normalizado
    const wasGuestAdded = await this.mongo.addGuest(person, normalized);

    if (wasGuestAdded) {
      await message.reply(
        `${person} foi adicionado com sucesso à lista de convidados! 🎉`
      );
    } else {
      await message.reply(
        `Não foi possível adicionar ${person} à lista de convidados. Tente novamente mais tarde.`
      );
    }
  }

  /**
   * Remove guests from the birthday list
   */
  public async removeGuest(message: Message, command: string): Promise<void> {
    const number = this.getTextAndRemoveCommand(message, command);

    const wasGuestRemoved = await this.mongo.removeGuest(number);

    if (wasGuestRemoved) {
      await message.reply(
        `${number} foi removido com sucesso a lista de convidados!`
      );
    } else {
      await message.reply(
        `Não foi possível adicionar ${number} à lista de convidados. Tente novamente mais tarde.`
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

    const lines = guests.map((g, index) => {
      const status = g.confirmed
        ? "✅ confirmado"
        : "⏳ aguardando confirmação";
      return `${index + 1} - ${g.name} (${g.number}) – ${status}`;
    });

    const reply = ["📋 *Lista atual de convidados*", ...lines].join("\n");

    await message.reply(reply);
  }

  /**
   * send birthday invitations to guests who haven't received them yet
   */
  public async sendInvites(message: Message): Promise<void> {
    const guests = await this.mongo.getGuests({ receivedInvitation: false });

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
        console.error(`❌ Failed to send to ${guest.number}:`, err);
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
  public async sendReminder(message: Message): Promise<void> {
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
        "Você ainda não confirmou sua presença na minha festa de *25 anos* e colação de grau, " +
        "que acontece em *19/07 às 19h* na minha casa. \n\n" +
        "• Responda com `!confirmar` para confirmar que você vai. \n" +
        "• Responda com `!convite` para receber o convite novamente. \n\n" +
        "Aguardo sua resposta! 🎉";

      try {
        await this.client.sendMessage(chatId, text);
      } catch (err) {
        console.error(`❌ Failed to send to ${guest.number}:`, err);
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

    if (!guest.confirmed) {
      await message.reply("❌ Sua presença já foi cancelada.");
      return;
    }

    await this.mongo.changeGuestConfirmStatus(senderNumber, false);
    await message.reply("❌ Sua presença foi cancelada!");
  }

  /**
   * Sends useful information and quick-reply commands
   */
  public async getInformation(message: Message): Promise<void> {
    const informationText =
      "🤔 *Informações úteis*: \n" +
      "\n" +
      "• Se tiver qualquer dificuldade, chame a Yasmin no WhatsApp: *62 98169-5581* \n" +
      "• Para receber a localização da festa, envie: `!localização` \n" +
      `• Para confirmar presença, envie: \`!confirmar\` \n` +
      `• Para cancelar presença, envie: \`!cancelar\` \n` +
      `• Para ver o convite novamente, envie: \`!convite\` \n` +
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
   * Sends admin commands and information
   */
  public async admin(message: Message): Promise<void> {
    const informationText =
      "🤔 *Comandos*: \n" +
      "\n" +
      "• @add-guest <nome> <numero> \n" +
      "• @remove-guest <numero> \n" +
      `• @get-guests \n` +
      `• @send-invitation \n` +
      `• @send-reminder`;

    await message.reply(informationText);
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
    return MessageMedia.fromFilePath("./assets/yasbot.png");
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
    const text =
      `🎉 Olá ${guest.name}!  \n` +
      `Você está convidado(a) para a minha festa de *25 anos* e comemoração da *colação de grau* 🎓. \n ` +
      `🗓 *19/07 às 19:00* \n` +
      `📍 *Minha Casa* \n` +
      `Traga apenas o que for beber e sua caixa térmica.  \n` +
      `📝 *Confirmações:* \n` +
      `• Responda com \`!confirmar\` para confirmar presença  \n` +
      `• Responda com \`!cancelar\` se não puder comparecer  \n` +
      `• Responda com \`!aniversário\` para mais informações  \n` +
      `Você pode confirmar até *16/07* a qualquer momento.`;
    try {
      await this.client.sendMessage(chatId, media, { caption: text });
      await this.client.sendMessage(chatId, partyLocation);
    } catch (err) {
      console.error(`❌ Failed to send to ${guest.number}:`, err);
    }
    return;
  }
}
