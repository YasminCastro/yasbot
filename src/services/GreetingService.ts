import { Message, MessageMedia, Client } from "whatsapp-web.js";
import { getHours, getDay } from "date-fns";
import { FERNANDO_NUMBER, GLAUCIA_NUMBER, OLD_PEOPLE_NUMBERS } from "../config";
import { WeatherService } from "./WeatherService";

/**
 * Service for handling greetings and responses
 */
export class GreetingService {
  private helloSpamMap: Map<string, { count: number; lastTime: number }> =
    new Map();
  private genteSpamMap: Map<string, { lastTime: number }> = new Map();

  private oldSlangs = [
    "cacura 👵",
    "velha 👵",
    "geriátrica 👵",
    "jurrássica 💀",
    "inimiga do INSS 👵",
    "assessor da sharmila 💖",
  ];

  private genteResponses = [
    "Oh lá o capeta atentando...",
    "Lá vem...",
    "Vixe, lá vem...",
  ];

  constructor(private weatherService: WeatherService) {}

  /**
   * Send a hello message
   */
  public async hello(message: Message): Promise<void> {
    const chatId = message.from;
    const contact = await message.getContact();
    const senderNumber = contact.number;

    const isAnOldPerson = OLD_PEOPLE_NUMBERS.includes(senderNumber);
    if (isAnOldPerson) {
      const slang =
        this.oldSlangs[Math.floor(Math.random() * this.oldSlangs.length)];
      await message.reply(`Oi, ${slang}`);
      return;
    }

    const key = `${chatId}:${senderNumber}`;
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    let entry = this.helloSpamMap.get(key);
    if (!entry || now - entry.lastTime > oneHour) {
      entry = { count: 0, lastTime: now };
    }

    entry.count++;
    entry.lastTime = now;
    this.helloSpamMap.set(key, entry);

    if (entry.count === 1) {
      await this.replyHello(message);
    } else if (entry.count === 2) {
      await message.reply("Oie, eu já te dei oi 😑.");
    } else if (entry.count === 3) {
      await message.reply("Oie, não vou te falar mais oi 😡.");
    } else {
      return;
    }
  }

  /**
   * Reply the "gente" message
   */
  public async gente(message: Message): Promise<void> {
    const contact = await message.getContact();
    const senderNumber = contact.number;

    const chatId = message.from;

    const now = new Date();
    const day = getDay(now); // 0 = domingo, 1 = segunda, ..., 6 = sábado
    const hour = getHours(now);

    // ✅ Só responde de sexta (16h) até domingo (19h)
    const isActivePeriod =
      (day === 5 && hour >= 16) || // sexta depois das 16h
      day === 6 || // sábado inteiro
      (day === 0 && hour < 19); // domingo até 19h

    if (!isActivePeriod) {
      return;
    }

    const key = `${chatId}:${senderNumber}`;
    const dateNow = Date.now();
    const oneHour = 60 * 60 * 1000;

    let entry = this.genteSpamMap.get(key);
    if (entry && dateNow - entry.lastTime < oneHour) {
      return;
    }

    this.genteSpamMap.set(key, { lastTime: dateNow });

    if (senderNumber === GLAUCIA_NUMBER) {
      const stickerPath = "./stickers/glaucia-fica-em-casa.webp";
      const sticker = MessageMedia.fromFilePath(stickerPath);
      await message.reply(sticker, undefined, { sendMediaAsSticker: true });
      return;
    }

    if (senderNumber === FERNANDO_NUMBER) {
      const stickerPath = "./stickers/fernando-fica-em-casa.webp";
      const sticker = MessageMedia.fromFilePath(stickerPath);
      await message.reply(sticker, undefined, { sendMediaAsSticker: true });
      return;
    }

    const response =
      this.genteResponses[
        Math.floor(Math.random() * this.genteResponses.length)
      ];

    await message.reply(response);
  }

  private async replyHello(message: Message) {
    const now = new Date();
    const hour = getHours(now);

    const weather = await this.weatherService.getWeatherBundleCached();
    let tempEmoji = "☀️";
    if (weather) {
      tempEmoji = this.weatherService.weatherCodeToEmoji(
        weather.current.code,
        weather.current.isDay
      );
    }

    let text = "Oie, ";

    if (hour < 12) {
      text += `bom dia ${tempEmoji}`;
    } else if (hour < 18) {
      text += `boa tarde ${tempEmoji}`;
    } else {
      text += `boa noite ${tempEmoji}`;
    }
    await message.reply(text);
  }
}
