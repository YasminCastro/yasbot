import { Message, GroupChat, Client } from "whatsapp-web.js";
import { Database } from "../repositories/Database";

/**
 * Class responsible for handling admin actions
 */
export class AdminService {
  constructor(private database: Database, private client: Client) {}

  /**
   * Registers the current group for daily summaries.
   * Only group admins can run this.
   * Usage: @add-group
   */
  public async addGroup(message: Message): Promise<void> {
    const chat = await message.getChat();
    if (!chat.isGroup) {
      await message.reply("❌ Esse comando só pode ser usado em grupos.");
      return;
    }
    const group = chat as GroupChat;

    const groupId = group.id._serialized;
    const added = await this.database.groups.addGroup(groupId);
    await message.reply(added.message);
  }

  /**
   * Remove the current group for daily summaries.
   * Only group admins can run this.
   * Usage: @remove-group
   */
  public async removeGroup(message: Message): Promise<void> {
    const chat = await message.getChat();
    if (!chat.isGroup) {
      await message.reply("❌ Esse comando só pode ser usado em grupos.");
      return;
    }
    const group = chat as GroupChat;

    const groupId = group.id._serialized;
    const added = await this.database.groups.removeGroup(groupId);
    await message.reply(added.message);
  }

  /**
   * Adds a new user to the users collection
   * Usage: @usuario +55 62 8332-1120 Glaucia 16/12
   */
  public async addUser(message: Message): Promise<void> {
    const text = message.body.trim();

    const commandText = text.replace(/^@usuario\s+/i, "").trim();

    if (!commandText) {
      await message.reply(
        "❌ Uso: @usuario <número> <nome> <data_aniversário>\n" +
          "Exemplo: @usuario +55 62 8332-1120 Glaucia 16/12"
      );
      return;
    }

    const parts = commandText.split(/\s+/);

    const phoneStartIdx = parts.findIndex((p) => /^\+?[\d\-\(\)]+/.test(p));

    if (phoneStartIdx === -1) {
      await message.reply(
        "❌ Não encontrei um número de telefone válido.\n" +
          "Uso: @usuario <número> <nome> <data_aniversário>\n" +
          "Exemplo: @usuario +55 62 8332-1120 Glaucia 16/12"
      );
      return;
    }

    const phoneParts: string[] = [];
    let i = phoneStartIdx;
    while (i < parts.length && /^\+?[\d\-\(\)]+/.test(parts[i])) {
      phoneParts.push(parts[i]);
      i++;
    }

    const dateIdx = parts.findIndex(
      (p, idx) => idx >= i && /^\d{1,2}\/\d{1,2}$/.test(p)
    );

    if (dateIdx === -1) {
      await message.reply(
        "❌ Não encontrei uma data de aniversário válida (formato: DD/MM).\n" +
          "Uso: @usuario <número> <nome> <data_aniversário>\n" +
          "Exemplo: @usuario +55 62 8332-1120 Glaucia 16/12"
      );
      return;
    }

    if (i >= dateIdx) {
      await message.reply(
        "❌ Não encontrei um nome válido.\n" +
          "Uso: @usuario <número> <nome> <data_aniversário>\n" +
          "Exemplo: @usuario +55 62 8332-1120 Glaucia 16/12"
      );
      return;
    }

    const name = parts.slice(i, dateIdx).join(" ");
    const dateStr = parts[dateIdx];

    const phoneRaw = phoneParts.join(" ");
    let normalizedPhone = phoneRaw.replace(/\D+/g, "");

    if (
      normalizedPhone.startsWith("55") &&
      (normalizedPhone.length === 12 || normalizedPhone.length === 13)
    ) {
      normalizedPhone = normalizedPhone.slice(2);
    }

    if (![10, 11].includes(normalizedPhone.length)) {
      await message.reply(
        "❌ Número inválido. Deve conter DDD + 8 ou 9 dígitos.\n" +
          "Exemplo: @usuario +55 62 8332-1120 Glaucia 16/12"
      );
      return;
    }

    const [day, month] = dateStr.split("/").map(Number);

    if (!day || !month || day < 1 || day > 31 || month < 1 || month > 12) {
      await message.reply(
        "❌ Data de aniversário inválida. Use o formato DD/MM.\n" +
          "Exemplo: @usuario +55 62 8332-1120 Glaucia 16/12"
      );
      return;
    }

    const currentYear = new Date().getFullYear();
    const birthday = new Date(currentYear, month - 1, day);

    const existingUser = await this.database.users.getUserByPhoneNumber(
      normalizedPhone
    );
    if (existingUser) {
      await message.reply(
        `❌ Usuário com o número ${normalizedPhone} já existe.`
      );
      return;
    }

    const wasAdded = await this.database.users.addUser(
      name,
      normalizedPhone,
      birthday
    );

    if (wasAdded) {
      await message.reply(
        `✅ Usuário "${name}" adicionado com sucesso!\n` +
          `📱 Número: ${normalizedPhone}\n` +
          `🎂 Aniversário: ${day.toString().padStart(2, "0")}/${month
            .toString()
            .padStart(2, "0")}`
      );
    } else {
      await message.reply(`❌ Erro ao adicionar usuário. Tente novamente.`);
    }
  }

  /**
   * Removes a user from the users collection by phone number
   * Usage: @remover-usuario <número>
   */
  public async removeUser(message: Message): Promise<void> {
    const text = message.body.trim();

    const commandText = text.replace(/^@remover-usuario\s+/i, "").trim();

    if (!commandText) {
      await message.reply(
        "❌ Uso: @remover-usuario <número>\n" +
          "Exemplo: @remover-usuario 6283321120"
      );
      return;
    }

    let normalizedPhone = commandText.replace(/\D+/g, "");

    if (
      normalizedPhone.startsWith("55") &&
      (normalizedPhone.length === 12 || normalizedPhone.length === 13)
    ) {
      normalizedPhone = normalizedPhone.slice(2);
    }

    if (![10, 11].includes(normalizedPhone.length)) {
      await message.reply(
        "❌ Número inválido. Deve conter DDD + 8 ou 9 dígitos.\n" +
          "Exemplo: @remover-usuario 6283321120"
      );
      return;
    }

    const user = await this.database.users.getUserByPhoneNumber(
      normalizedPhone
    );
    if (!user) {
      await message.reply(
        `❌ Usuário com o número ${normalizedPhone} não encontrado.`
      );
      return;
    }

    const wasRemoved = await this.database.users.removeUser({
      phoneNumber: normalizedPhone,
    });

    if (wasRemoved) {
      await message.reply(
        `✅ Usuário "${user.name}" (${normalizedPhone}) removido com sucesso!`
      );
    } else {
      await message.reply(`❌ Erro ao remover usuário. Tente novamente.`);
    }
  }

  /**
   * Lists all users in the users collection
   * Usage: @usuarios
   */
  public async listUsers(message: Message): Promise<void> {
    try {
      const users = await this.database.users.getUsers();

      if (users.length === 0) {
        await message.reply("📋 Nenhum usuário cadastrado.");
        return;
      }

      const sortedUsers = [...users].sort((a, b) => {
        if (a.birthday && b.birthday) {
          const aMonth = a.birthday.getMonth() + 1;
          const aDay = a.birthday.getDate();
          const bMonth = b.birthday.getMonth() + 1;
          const bDay = b.birthday.getDate();

          if (aMonth !== bMonth) {
            return aMonth - bMonth;
          }
          return aDay - bDay;
        }

        if (a.birthday && !b.birthday) {
          return -1;
        }
        if (!a.birthday && b.birthday) {
          return 1;
        }

        return 0;
      });

      let usersList = `📋 *Usuários cadastrados* (${sortedUsers.length}):\n\n`;

      for (let i = 0; i < sortedUsers.length; i++) {
        const user = sortedUsers[i];
        const birthdayStr = user.birthday
          ? `${user.birthday.getDate().toString().padStart(2, "0")}/${(
              user.birthday.getMonth() + 1
            )
              .toString()
              .padStart(2, "0")}`
          : "Não informado";

        usersList += `${i + 1}. *${user.name}*\n`;
        usersList += `   📱 ${user.phoneNumber}\n`;
        usersList += `   🎂 ${birthdayStr}\n\n`;
      }

      if (usersList.length > 4000) {
        const chunks = usersList.match(/.{1,4000}/g) || [];
        for (const chunk of chunks) {
          await message.reply(chunk);
        }
      } else {
        await message.reply(usersList);
      }
    } catch (err) {
      await message.reply("❌ Erro ao listar usuários. Tente novamente.");
    }
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
      "• @update-guest <nome> - vai? não - recebeu convite? sim - é para enviar convite? sim \n" +
      `• @get-guests \n` +
      `• @send-invitation \n` +
      `• @usuario <número> <nome> <data_aniversário> \n` +
      `• @remover-usuario <número> \n` +
      `• @usuarios \n`;

    await message.reply(informationText);
    return;
  }
}
