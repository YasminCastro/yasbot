import { Message, GroupChat, Client } from "whatsapp-web.js";
import { Database } from "../repositories/Database";
import { User } from "../models";
import { logger } from "../utils/logger";

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

  /**
   * Gets the next birthday from users in the group
   */
  public async getNextBirthday(message: Message): Promise<void> {
    try {
      const chat = await message.getChat();
      if (!chat.isGroup) {
        await message.reply("❌ Esse comando só pode ser usado em grupos.");
        return;
      }

      const group = chat as GroupChat;
      const participants = group.participants.map((p) => p.id._serialized);

      const allUsers = await this.database.users.getUsers();

      const usersInGroup: Array<{
        user: User;
        jid: string;
        nextBirthday: Date;
      }> = [];

      for (const user of allUsers) {
        if (!user.birthday) continue;

        const phoneNumber = user.phoneNumber.replace(/\D/g, "");

        let userJid: string | null = null;

        try {
          const wid = await this.client
            .getNumberId(phoneNumber)
            .catch(() => null);
          if (wid?._serialized && participants.includes(wid._serialized)) {
            userJid = wid._serialized;
          }
        } catch (err) {}

        if (!userJid) {
          for (const participantJid of participants) {
            const participantPhone = participantJid
              .split("@")[0]
              .replace(/\D/g, "");
            if (
              participantPhone === phoneNumber ||
              participantPhone.endsWith(phoneNumber) ||
              phoneNumber.endsWith(participantPhone)
            ) {
              userJid = participantJid;
              break;
            }
          }
        }

        if (userJid) {
          const today = new Date();
          const currentYear = today.getFullYear();
          const birthdayMonth = user.birthday.getMonth();
          const birthdayDay = user.birthday.getDate();

          let nextBirthday = new Date(currentYear, birthdayMonth, birthdayDay);

          if (nextBirthday < today) {
            nextBirthday = new Date(
              currentYear + 1,
              birthdayMonth,
              birthdayDay
            );
          }

          usersInGroup.push({ user, jid: userJid, nextBirthday });
        }
      }

      if (usersInGroup.length === 0) {
        await message.reply(
          "❌ Não há usuários cadastrados com aniversário neste grupo."
        );
        return;
      }

      usersInGroup.sort(
        (a, b) => a.nextBirthday.getTime() - b.nextBirthday.getTime()
      );

      const nextUser = usersInGroup[0];
      const today = new Date();
      const daysUntilBirthday = Math.ceil(
        (nextUser.nextBirthday.getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24)
      );

      const birthdayStr = `${nextUser.nextBirthday
        .getDate()
        .toString()
        .padStart(2, "0")}/${(nextUser.nextBirthday.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;

      let response = "🎂 *Próximo Aniversário*\n\n";
      response += `${nextUser.user.name}\n`;
      response += `📅 Data: ${birthdayStr}\n`;

      if (daysUntilBirthday === 0) {
        response += `🎉 É hoje!`;
      } else if (daysUntilBirthday === 1) {
        response += `⏰ Faltam ${daysUntilBirthday} dia!`;
      } else {
        response += `⏰ Faltam ${daysUntilBirthday} dias`;
      }

      await group.sendMessage(response);
    } catch (err) {
      logger.warn("❌ Error getting next birthday:", err);
      await message.reply(
        "❌ Erro ao buscar próximo aniversário. Tente novamente."
      );
    }
  }

  /**
   * Lists all birthdays from users in the group
   */
  public async listGroupBirthdays(message: Message): Promise<void> {
    try {
      const chat = await message.getChat();
      if (!chat.isGroup) {
        await message.reply("❌ Esse comando só pode ser usado em grupos.");
        return;
      }

      const group = chat as GroupChat;
      const participants = group.participants;

      const allUsers = await this.database.users.getUsers();

      const userMap = new Map<string, User>();
      for (const user of allUsers) {
        const normalizedPhone = user.phoneNumber.replace(/\D/g, "");
        userMap.set(normalizedPhone, user);
      }

      const birthdayList: Array<{
        name: string;
        jid: string;
        birthday?: Date;
        phoneNumber: string;
      }> = [];

      for (const participant of participants) {
        const jid = participant.id._serialized;
        const participantPhone = jid.split("@")[0].replace(/\D/g, "");

        let foundUser: User | undefined;

        if (userMap.has(participantPhone)) {
          foundUser = userMap.get(participantPhone);
        } else {
          for (const [phone, user] of userMap.entries()) {
            if (
              phone === participantPhone ||
              phone.endsWith(participantPhone) ||
              participantPhone.endsWith(phone)
            ) {
              foundUser = user;
              break;
            }
          }
        }

        let participantName = participantPhone;
        try {
          const contact = await this.client.getContactById(jid);
          participantName =
            contact.pushname || contact.name || participantPhone;
        } catch (err) {}

        birthdayList.push({
          name: participantName,
          jid: jid,
          birthday: foundUser?.birthday,
          phoneNumber: participantPhone,
        });
      }

      if (birthdayList.length === 0) {
        await message.reply("❌ Não há participantes no grupo.");
        return;
      }

      birthdayList.sort((a, b) => {
        if (!a.birthday && !b.birthday) return 0;
        if (!a.birthday) return 1;
        if (!b.birthday) return -1;

        const today = new Date();
        const currentYear = today.getFullYear();

        const aMonth = a.birthday!.getMonth();
        const aDay = a.birthday!.getDate();
        const bMonth = b.birthday!.getMonth();
        const bDay = b.birthday!.getDate();

        if (aMonth !== bMonth) {
          return aMonth - bMonth;
        }
        return aDay - bDay;
      });

      let response = "🎂 *Lista de Aniversários do Grupo*\n\n";

      for (let i = 0; i < birthdayList.length; i++) {
        const item = birthdayList[i];
        const phoneNumber = item.jid.split("@")[0];
        const mentionText = `@${phoneNumber}`;

        if (item.birthday) {
          const birthdayStr = `${item.birthday
            .getDate()
            .toString()
            .padStart(2, "0")}/${(item.birthday.getMonth() + 1)
            .toString()
            .padStart(2, "0")}`;
          response += `${i + 1}. ${mentionText} ${
            item.name
          } - ${birthdayStr}\n`;
        } else {
          response += `${i + 1}. ${mentionText} ${
            item.name
          } - aniversario não cadastrado\n`;
        }
      }

      if (response.length > 4000) {
        const chunks = response.match(/.{1,4000}/g) || [];
        for (const chunk of chunks) {
          await group.sendMessage(chunk);
        }
      } else {
        const mentionJids = birthdayList.map((item) => item.jid);
        await group.sendMessage(response, { mentions: mentionJids });
      }
    } catch (err) {
      logger.warn("❌ Error listing group birthdays:", err);
      await message.reply(
        "❌ Erro ao listar aniversários do grupo. Tente novamente."
      );
    }
  }

  /**
   * Gets the birthday of a specific person by name
   */
  public async getPersonBirthday(message: Message): Promise<void> {
    try {
      const chat = await message.getChat();
      if (!chat.isGroup) {
        await message.reply("❌ Esse comando só pode ser usado em grupos.");
        return;
      }

      const text = message.body.trim();

      // Extract name from question: "quando é o aniversario <nome>?" or "quando é o aniversario da/do <nome>?"
      const patterns = [
        /quando\s+é\s+o\s+aniversario\s+(?:da|do|de)?\s*(.+?)\s*\??$/i,
        /quando\s+e\s+o\s+aniversario\s+(?:da|do|de)?\s*(.+?)\s*\??$/i,
        /quando\s+é\s+o\s+aniversário\s+(?:da|do|de)?\s*(.+?)\s*\??$/i,
        /quando\s+e\s+o\s+aniversário\s+(?:da|do|de)?\s*(.+?)\s*\??$/i,
      ];

      let personName: string | null = null;
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          personName = match[1].trim();
          personName = personName.replace(/^(da|do|de)\s+/i, "").trim();
          personName = personName.replace(/\?+$/, "").trim();
          break;
        }
      }

      if (!personName) {
        await message.reply(
          "❌ Não encontrei o nome da pessoa.\n" +
            "Uso: @bot quando é o aniversario <nome>"
        );
        return;
      }

      const allUsers = await this.database.users.getUsers();

      const foundUser = allUsers.find((user) =>
        user.name.toLowerCase().includes(personName!.toLowerCase())
      );

      if (!foundUser) {
        await message.reply(
          `❌ Não encontrei nenhum usuário cadastrado com o nome "${personName}".`
        );
        return;
      }

      if (!foundUser.birthday) {
        await message.reply(
          `❌ O usuário "${foundUser.name}" não tem data de aniversário cadastrada.`
        );
        return;
      }

      const today = new Date();
      const currentYear = today.getFullYear();
      const birthdayMonth = foundUser.birthday.getMonth();
      const birthdayDay = foundUser.birthday.getDate();

      let nextBirthday = new Date(currentYear, birthdayMonth, birthdayDay);

      if (nextBirthday < today) {
        nextBirthday = new Date(currentYear + 1, birthdayMonth, birthdayDay);
      }

      const daysUntilBirthday = Math.ceil(
        (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      const birthdayStr = `${foundUser.birthday
        .getDate()
        .toString()
        .padStart(2, "0")}/${(foundUser.birthday.getMonth() + 1)
        .toString()
        .padStart(2, "0")}`;

      let response = `🎂 *Aniversário de ${foundUser.name}*\n\n`;
      response += `📅 ${birthdayStr}\n`;

      if (daysUntilBirthday === 0) {
        response += `🎉 É hoje!`;
      } else if (daysUntilBirthday === 1) {
        response += `⏰ Faltam ${daysUntilBirthday} dia!`;
      } else {
        response += `⏰ Faltam ${daysUntilBirthday} dias`;
      }

      await message.reply(response);
    } catch (err) {
      logger.warn("❌ Error getting person birthday:", err);
      await message.reply("❌ Erro ao buscar aniversário. Tente novamente.");
    }
  }
}
