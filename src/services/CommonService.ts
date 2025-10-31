// src/actions/BotActions.ts
import { Message, GroupChat, Client, MessageMedia } from "whatsapp-web.js";
import { MongoService } from "../services/MongoService";
import {
  startOfYesterday,
  endOfYesterday,
  format,
  getHours,
  getDay,
  startOfDay,
  parse,
  endOfDay,
  isWithinInterval,
} from "date-fns";
import { LoggedMessage } from "../interfaces";
import { FERNANDO_NUMBER, GLAUCIA_NUMBER, OLD_PEOPLE_NUMBERS } from "../config";

/**
 * Class responsible for handling common actions
 */
export class CommonService {
  private lastMentionTime: Map<string, number> = new Map();
  private helloSpamMap: Map<string, { count: number; lastTime: number }> =
    new Map();

  private genteSpamMap: Map<string, { lastTime: number }> = new Map();

  private rainSpamMap = new Map<string, { count: number; first: number }>();

  private WEATHER_TTL_MS = 30 * 60 * 1000;
  private weatherCache = new Map<
    string,
    {
      at: number;
      data: {
        current: { temp: number; code: number; isDay: boolean };
        daily: {
          probRain: number;
          tMax: number;
          tMin: number;
          rhMin?: number | null;
        };
      };
    }
  >();

  private weatherInFlight = new Map<
    string,
    Promise<{
      current: { temp: number; code: number; isDay: boolean };
      daily: {
        probRain: number;
        tMax: number;
        tMin: number;
        rhMin?: number | null;
      };
    } | null>
  >();

  private LAT = -16.67;
  private LONG = -49.25;

  private oldSlangs = [
    "cacura 👵",
    "velha 👵",
    "geriátrica 👵",
    "jurrássica 💀",
    "inimiga do INSS 👵",
    "assessor da sharmila 💖",
  ];

  private weatherResponses = [
    "Tá achando que sou a garota do tempo do jornal nacional? Eu ein",
    "Bota o braço pra fora e vê se tá chovendo 😡",
  ];

  private genteResponses = [
    "Oh lá o capeta atentando...",
    "Lá vem...",
    "Vixe, lá vem...",
  ];

  private trip = [
    {
      city: "São Paulo",
      startDate: "30/11/2025",
      endDate: "16/11/2025",
      hello: "Olá",
      goodMorning: "bom dia",
      goodEvening: "boa tarde",
      goodNight: "boa noite",
      coordinates: { lat: -23.56, long: -46.68 },
    },
    {
      city: "Paris",
      startDate: "17/11/2025",
      endDate: "20/11/2025",
      hello: "Salut",
      goodMorning: "bonjour",
      goodEvening: "bon après-midi",
      goodNight: "bonne nuit",
      coordinates: { lat: 48.85, long: 2.29 },
    },
    {
      city: "Paris",
      startDate: "31/10/2025",
      endDate: "20/11/2025",
      hello: "Salut",
      goodMorning: "bonjour",
      goodEvening: "bon après-midi",
      goodNight: "bonne nuit",
      coordinates: { lat: 48.85, long: 2.29 },
    },
    {
      city: "Bruxelas",
      startDate: "21/11/2025",
      endDate: "23/11/2025",
      hello: "Salut",
      goodMorning: "bonjour",
      goodEvening: "bon après-midi",
      goodNight: "bonne nuit",
      coordinates: { lat: 50.84, long: 4.35 },
    },
    {
      city: "Amsterdã",
      startDate: "24/11/2025",
      endDate: "26/11/2025",
      hello: "Hallo",
      goodMorning: "goedemorgen",
      goodEvening: "goedemiddag",
      goodNight: "goedenacht",
      coordinates: { lat: 52.36, long: 4.89 },
    },
    {
      city: "Milão",
      startDate: "27/11/2025",
      endDate: "29/11/2025",
      hello: "Ciao",
      goodMorning: "buongiorno",
      goodEvening: "buon pomeriggio",
      goodNight: "buona notte",
      coordinates: { lat: 45.47, long: 9.18 },
    },
    {
      city: "Barcelona",
      startDate: "30/11/2025",
      endDate: "02/12/2025",
      hello: "Hola",
      goodMorning: "buenos días",
      goodEvening: "buenas tardes",
      goodNight: "buenas noches",
      coordinates: { lat: 41.39, long: 2.17 },
    },
    {
      city: "São Paulo",
      startDate: "03/12/2025",
      endDate: "03/12/2025",
      hello: "Olá",
      goodMorning: "bom dia",
      goodEvening: "boa tarde",
      goodNight: "boa noite",
      coordinates: { lat: -23.56, long: -46.68 },
    },
    {
      city: "Goiânia",
      startDate: "04/12/2025",
      endDate: "04/12/2025",
      hello: "Olá",
      goodMorning: "bom dia",
      goodEvening: "boa tarde",
      goodNight: "boa noite",
      coordinates: { lat: -16.67, long: -49.25 },
    },
  ];

  constructor(private mongo: MongoService, private client: Client) {}

  /**
   * Mentions all participants in a group chat
   */
  public async mentionAll(message: Message): Promise<void> {
    const chat = await message.getChat();
    if (!chat.isGroup) {
      await message.reply("❌ Esse comando só pode ser usado em grupos.");
      return;
    }
    const group = chat as GroupChat;
    const groupId = group.id._serialized;
    const now = Date.now();

    const lastTime = this.lastMentionTime.get(groupId) || 0;
    const tenMinutes = 10 * 60 * 1000; // 10 minutes in ms

    if (now - lastTime < tenMinutes) {
      const secondsLeft = Math.ceil((tenMinutes - (now - lastTime)) / 1000);
      const minutesLeft = Math.floor(secondsLeft / 60);
      await message.reply(
        `⏳ Aguarde ${minutesLeft}m antes de usar este comando novamente.`
      );
      return;
    }

    this.lastMentionTime.set(groupId, now);

    const jids = group.participants.map((p) => p.id._serialized);
    const mentionsText = jids.map((jid) => `@${jid.split("@")[0]}`).join(" ");
    const body = mentionsText;

    await group.sendMessage(body, { mentions: jids });
  }

  /**
   * Send a help message with available commands
   */
  public async help(message: Message): Promise<void> {
    const helpText =
      "🤖 Olá! Eu sou a YasBot. Para me usar basta me adicionar a um grupo do WhatsApp ou me enviar uma mensagem privada que eu já estarei ativo!\n\n" +
      "*Comandos disponíveis:*\n" +
      "- `!todos` ou `!all`: menciona *todos* os participantes do grupo.\n" +
      "- `!ajuda` ou `!help`: exibe esta mensagem de ajuda.\n\n" +
      "🚀 Qualquer dúvida, é só chamar!";
    await message.reply(helpText);
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

  /**
   * Send a hello message
   */
  public async hello(message: Message): Promise<void> {
    const chat = await message.getChat();

    await this.sendTodaysWeather(chat.id._serialized);
    const contact = await message.getContact();
    const senderNumber = contact.number;
    const chatId = message.from;

    const isAnOldPerson = OLD_PEOPLE_NUMBERS.includes(senderNumber);
    if (isAnOldPerson) {
      const slang =
        this.oldSlangs[Math.floor(Math.random() * this.oldSlangs.length)];
      await message.reply(`Oi, ${slang}`);
      return;
    }

    // 🔎 Busca saudação da cidade conforme a data atual
    const tripGreeting = this.getTripGreetingForDate(new Date());

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
      // 👉 Se tiver viagem vigente, usa as saudações da cidade; senão mantém padrão
      await this.replyHello(message, tripGreeting ?? undefined);
    } else if (entry.count === 2) {
      await message.reply("Oie, eu já te dei oi 😑.");
    } else if (entry.count === 3) {
      await message.reply("Oie, não vou te falar mais oi 😡.");
    } else {
      return;
    }
  }

  /**
   * Registers the current message for daily summaries.
   */
  public async addMessage(message: Message, groupId: string): Promise<void> {
    const isRegistered = await this.mongo.getGroups({ groupId });
    if (isRegistered.length === 0) return;

    const text = message.body ? message.body.trim() : message.type;

    const contact = await message.getContact();

    const senderWid = contact.id._serialized;

    const senderPhone = (contact.number || contact.id.user || "").replace(
      /\D/g,
      ""
    );

    if (!senderPhone) return;

    await this.mongo.addMessage(groupId, text, senderPhone, senderWid);
  }

  /**
   *  Sends a chat summary to the group.
   */
  public async sendChatSummary(groupId: string): Promise<void> {
    const isRegistered = await this.mongo.getGroups({ groupId });
    if (isRegistered.length === 0) return;

    const chat = await this.client.getChatById(groupId);

    const yesterdayStart = startOfYesterday();
    const yesterdayEnd = endOfYesterday();
    const dateString = format(yesterdayStart, "dd/MM/yyyy");

    const messages = await this.mongo.getMessages({
      groupId,
      timestamp: { $gte: yesterdayStart, $lte: yesterdayEnd },
    });

    if (!messages || messages.length === 0) {
      await chat.sendMessage(
        `📋 Nenhuma mensagem registrada para ${dateString}.`
      );
      return;
    }

    const total = messages.length;

    const { top3Lines, mentionJids } = await this.getTopSenders(messages);

    const summaryText =
      `📊 *Resumo do dia ${dateString}* 📊\n` +
      `Total de mensagens: *${total}*\n\n` +
      `Top 3 participantes:\n` +
      top3Lines.join("\n");

    if (mentionJids.length > 0) {
      await chat.sendMessage(summaryText, { mentions: mentionJids });
    } else {
      await chat.sendMessage(summaryText);
    }

    await this.mongo.saveGroupDailySummary(
      groupId,
      top3Lines,
      total,
      yesterdayStart
    );
  }

  /**
   *  Sends a message about the weather
   */
  public async sendTodaysWeather(groupId: string): Promise<void> {
    // const isRegistered = await this.mongo.getGroups({ groupId });
    // if (isRegistered.length === 0) return;

    const chat = await this.client.getChatById(groupId);

    // Base (Goiânia)
    const baseCity = "Goiânia";
    const baseLat = this.LAT;
    const baseLong = this.LONG;

    // Trip do dia (se houver)
    const today = new Date();
    const tripToday = this.getTripForDate(today);

    // Saudações conforme hora do dia
    const baseGM = "Bom dia";

    // Saudação da trip (se houver), escolhendo bom dia/tarde/noite da cidade
    let tripGreetWord: string | null = null;
    if (tripToday) {
      tripGreetWord = "Bom dia";
    }

    // Busca previsão para base e (opcional) trip
    const fetches = [];
    fetches.push(this.getWeatherBundleCached(baseLat, baseLong));

    let tripCityName: string | null = null;
    let tripLat: number | null = null;
    let tripLong: number | null = null;

    if (tripToday?.coordinates) {
      tripCityName = tripToday.city;
      tripLat = tripToday.coordinates.lat;
      tripLong = tripToday.coordinates.long;
      if (!Number.isNaN(tripLat) && !Number.isNaN(tripLong)) {
        fetches.push(this.getWeatherBundleCached(tripLat, tripLong));
      }
    }

    console.log(baseLat, baseLong);
    console.log(tripLat, tripLong);

    const [wxBase, wxTrip] = await Promise.all(fetches);

    if (!wxBase) {
      await chat.sendMessage("Não consegui puxar a previsão de hoje agora 😕");
      return;
    }

    // Cabeçalho com saudações combinadas
    // Ex.: "Bom dia Goiânia, Bonjour Paris - França!"
    const header =
      tripToday && tripGreetWord
        ? `${baseGM} ${baseCity}, ${tripGreetWord} ${tripToday.city}!`
        : `${baseGM} ${baseCity}!`;

    // Bloco 1: Goiânia
    const linesBase: string[] = [];
    linesBase.push(`A previsão do tempo para hoje em ${baseCity} é:`);
    linesBase.push(...this.buildCityWeatherLines(wxBase.daily, baseCity));

    // Bloco 2: Trip (se houver previsão)
    const linesTrip: string[] = [];
    if (tripToday && wxTrip) {
      const showTrip = tripCityName && tripCityName !== `${baseCity}`; // evita duplicar se for a mesma cidade nominalmente
      if (showTrip) {
        linesTrip.push("");
        linesTrip.push(`E para ${tripToday.city} é:`);
        linesTrip.push(
          ...this.buildCityWeatherLines(wxTrip.daily, tripToday.city)
        );
      }
    }

    const finalMsg = [header, "", ...linesBase, ...linesTrip].join("\n");
    await chat.sendMessage(finalMsg);

    // Sticker de chuva (apenas se a base indicar muita chuva, como antes)
    if (wxBase.daily.probRain >= 60) {
      const stickerPath = "./stickers/gosto-de-capa.webp";
      const sticker = MessageMedia.fromFilePath(stickerPath);
      await chat.sendMessage(sticker, { sendMediaAsSticker: true });
    }
  }

  /**
   *  Sends if is going to rain today
   */
  public async handleRainQuestion(message: Message): Promise<void> {
    const contact = await message.getContact();
    const senderNumber = contact.number;
    const chatId = message.from;
    const key = `${chatId}:${senderNumber}`;

    const { action } = this.checkAndStamp(
      this.rainSpamMap,
      key,
      3 * 60 * 60 * 1000
    );

    if (action === "BLOCK") {
      return;
    }

    const wx = await this.getWeatherBundleCached(this.LAT, this.LONG);
    if (!wx) {
      await message.reply("Não consegui ver a previsão agora 😕");
      return;
    }

    if (action === "SASS") {
      const response =
        this.weatherResponses[
          Math.floor(Math.random() * this.weatherResponses.length)
        ];
      await message.reply(response);
      return;
    }

    const reply = this.formatRainAnswer(wx.daily.probRain);
    await message.reply(reply);
  }

  // region Helpers

  private buildCityWeatherLines(
    input: {
      probRain: number;
      tMax: number;
      tMin: number;
      rhMin?: number | null;
    },
    cityName: string
  ): string[] {
    const lines: string[] = [];

    // Linha de temperaturas
    lines.push(`🌡️ Mínima é de ${input.tMin}° e a máxima de ${input.tMax}°.`);

    // Estado térmico / umidade / fallback
    let tempStatus: "frio" | "calor" | "agradavel" | null = null;

    if (input.tMin <= 16) {
      lines.push("🧥🥶 Vai ta frio.");
      tempStatus = "frio";
    } else if (input.tMax >= 33) {
      lines.push("🔥🫠 Vai ta quente.");
      tempStatus = "calor";
    } else {
      tempStatus = "agradavel";
    }

    if (input.probRain >= 60) {
      lines.push(`☔ A probabilidade de chuva é ${input.probRain}%.`);
    } else if (input.rhMin != null && input.rhMin <= 25) {
      lines.push(`💧👎 Umidade Baixa ${input.rhMin}%.`);
    } else if (tempStatus === "agradavel") {
      lines.push(`😄 Previsão tranquila para hoje em ${cityName}.`);
    }

    return lines;
  }

  private async getTopSenders(messagesToday: LoggedMessage[]) {
    const counts: Record<string, number> = {};
    const lastWidByPhone: Record<string, string> = {};

    for (const msg of messagesToday) {
      const phone = (msg.senderPhone || "").replace(/\D/g, "");
      if (!phone) continue;
      counts[phone] = (counts[phone] || 0) + 1;

      if (msg.senderWid) lastWidByPhone[phone] = msg.senderWid;
    }

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const top3 = sorted.slice(0, 3);

    const mentionJids: string[] = [];
    const top3Lines: string[] = [];

    for (let i = 0; i < top3.length; i++) {
      const [phone, count] = top3[i];

      let serialized = lastWidByPhone[phone];
      if (!serialized) {
        const wid = await this.client.getNumberId(phone).catch(() => null);
        serialized = wid?._serialized || `${phone}@s.whatsapp.net`;
      }

      mentionJids.push(serialized);
      top3Lines.push(`${i + 1}. @${phone} – ${count} mensagem(s)`);
    }

    return { top3Lines, mentionJids };
  }

  private async replyHello(
    message: Message,
    override?: {
      hello: string;
      goodMorning: string;
      goodEvening: string;
      goodNight: string;
    }
  ) {
    const now = new Date();
    const hour = getHours(now);

    const weather = await this.getWeatherBundleCached(this.LAT, this.LONG);
    let tempEmoji = "☀️";
    if (weather) {
      tempEmoji = this.weatherCodeToEmoji(
        weather.current.code,
        weather.current.isDay
      );
    }

    // Se houver override, usa as strings da cidade; senão usa o padrão PT-BR
    const gm = override?.goodMorning ?? "bom dia";
    const ge = override?.goodEvening ?? "boa tarde";
    const gn = override?.goodNight ?? "boa noite";

    let text = override?.hello ? `${override.hello}, ` : "Oie, ";

    if (hour < 12) {
      text += `${gm} ${tempEmoji}`;
    } else if (hour < 18) {
      text += `${ge} ${tempEmoji}`;
    } else {
      text += `${gn} ${tempEmoji}`;
    }

    await message.reply(text);
  }

  private async fetchWeatherBundle(
    lat: number,
    lon: number
  ): Promise<{
    current: { temp: number; code: number; isDay: boolean };
    daily: {
      probRain: number;
      tMax: number;
      tMin: number;
      rhMin?: number | null;
    };
  } | null> {
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,weather_code,is_day` +
        `&daily=precipitation_probability_max,temperature_2m_max,temperature_2m_min,relative_humidity_2m_min` +
        `&forecast_days=1` +
        `&timezone=auto`; // <<<<<< aqui muda para auto

      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();

      // (resto igual ao seu)
      const t = data?.current?.temperature_2m;
      const c = data?.current?.weather_code;
      const d = data?.current?.is_day;
      if (t == null || c == null || d == null) return null;

      const pr = data?.daily?.precipitation_probability_max;
      const tmax = data?.daily?.temperature_2m_max;
      const tmin = data?.daily?.temperature_2m_min;
      const rhmin = data?.daily?.relative_humidity_2m_min;

      if (!Array.isArray(pr) || !Array.isArray(tmax) || !Array.isArray(tmin))
        return null;

      const probRain =
        pr[0] != null
          ? Math.max(0, Math.min(100, Math.round(Number(pr[0]))))
          : null;
      const tMax = tmax[0] != null ? Math.round(Number(tmax[0])) : null;
      const tMin = tmin[0] != null ? Math.round(Number(tmin[0])) : null;
      const rhMin =
        Array.isArray(rhmin) && rhmin[0] != null
          ? Math.max(0, Math.min(100, Math.round(Number(rhmin[0]))))
          : null;

      if (probRain == null || tMax == null || tMin == null) return null;

      return {
        current: {
          temp: Math.round(Number(t)),
          code: Number(c),
          isDay: d === 1,
        },
        daily: { probRain, tMax, tMin, rhMin },
      };
    } catch {
      return null;
    }
  }

  private async getWeatherBundleCached(
    lat: number,
    lon: number
  ): Promise<{
    current: { temp: number; code: number; isDay: boolean };
    daily: {
      probRain: number;
      tMax: number;
      tMin: number;
      rhMin?: number | null;
    };
  } | null> {
    const now = Date.now();

    // chave do cache por coordenadas (arredonde para evitar floats quase iguais)
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;

    // 1) cache quente
    const cached = this.weatherCache.get(key);
    if (cached && now - cached.at < this.WEATHER_TTL_MS) {
      return cached.data;
    }

    // 2) requisição em andamento para a mesma key
    const inflight = this.weatherInFlight.get(key);
    if (inflight) {
      try {
        const data = await inflight;
        return data ?? this.weatherCache.get(key)?.data ?? null;
      } catch {
        return this.weatherCache.get(key)?.data ?? null;
      }
    }

    // 3) iniciar nova requisição e registrá-la no mapa
    const p = this.fetchWeatherBundle(lat, lon)
      .then((data) => {
        if (data) this.weatherCache.set(key, { at: Date.now(), data });
        return data;
      })
      .finally(() => {
        this.weatherInFlight.delete(key);
      });

    this.weatherInFlight.set(key, p);

    try {
      const fresh = await p;
      return fresh ?? this.weatherCache.get(key)?.data ?? null;
    } catch {
      return this.weatherCache.get(key)?.data ?? null;
    }
  }

  private weatherCodeToEmoji(code: number, isDay: boolean): string {
    const sun = "☀️";
    const moon = "🌙";
    const cloudDay = "⛅";
    const cloudNight = "☁️🌙";
    const cloud = "☁️";
    const fog = "🌫️";
    const rain = "🌧️";
    const showerDay = "🌦️";
    const showerNight = "🌧️🌙";
    const thunder = "⛈️";
    const snow = "❄️";

    if (code === 0) return isDay ? sun : moon; // limpo
    if (code === 1 || code === 2) return isDay ? cloudDay : cloudNight; // poucas nuvens / parcialmente nublado
    if (code === 3) return cloud; // nublado
    if (code === 45 || code === 48) return fog; // neblina

    // ordem importa: primeiro os específicos
    if (code >= 61 && code <= 65) return rain; // chuva (contínua)
    if ((code >= 51 && code <= 57) || (code >= 66 && code <= 67)) {
      return isDay ? showerDay : showerNight; // garoa / chuva congelante leve
    }
    if (code >= 71 && code <= 77) return snow; // neve
    if (code >= 80 && code <= 82) return isDay ? showerDay : showerNight; // pancadas
    if (code >= 95 && code <= 99) return thunder; // trovoadas

    return isDay ? sun : moon; // fallback
  }

  private sample<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private CITY = "Goiânia";

  private formatRainAnswer(prob: number, useEmoji = true): string {
    const p = Math.max(0, Math.min(100, Math.round(prob)));
    const city = this.CITY;

    const E = {
      high: useEmoji ? " ☔" : "",
      likely: useEmoji ? " 🌧️" : "",
      maybe: useEmoji ? " 🌦️" : "",
      low: useEmoji ? " ☁️" : "",
      dry: useEmoji ? " ☀️" : "",
    };

    const buckets = {
      veryHigh: [
        `Vai chover sim: ${p}% de chance em ${city}.`,
        `Quase certo de chuva: ${p}% em ${city}. Fecha a janela!${E.high}`,
      ],
      high: [
        `Tudo indica chuva: ${p}% em ${city}. Melhor prevenir${E.likely}`,
        `Boas chances de pingos: ${p}% em ${city}. Leva capa!${E.likely}`,
      ],
      mid: [
        `Pode chover: ${p}% em ${city}. Meio a meio…${E.maybe}`,
        `Tem chance, mas não é certeza: ${p}% em ${city}.${E.maybe}`,
      ],
      low: [
        `Pouca chance de chuva: ${p}% em ${city}. Talvez só um sereno.${E.low}`,
      ],
      veryLow: [
        `De acordo com fontes "vozes da minha cabeça" não vai chover em ${city}, a previsão é de ${p}% de chuva.`,
        `Sem chuva por aqui: ${p}% em ${city}.`,
      ],
    };

    if (p >= 81) return this.sample(buckets.veryHigh);
    if (p >= 61) return this.sample(buckets.high);
    if (p >= 36) return this.sample(buckets.mid);
    if (p >= 11) return this.sample(buckets.low);
    return this.sample(buckets.veryLow);
  }

  private checkAndStamp(
    map: Map<string, { count: number; first: number }>,
    key: string,
    windowMs: number
  ): { action: "NORMAL" | "SASS" | "BLOCK"; waitMs: number } {
    const now = Date.now();
    const entry = map.get(key);

    if (!entry || now - entry.first >= windowMs) {
      map.set(key, { count: 1, first: now });
      return { action: "NORMAL", waitMs: 0 };
    }

    if (entry.count === 1) {
      entry.count = 2;
      map.set(key, entry);
      return { action: "SASS", waitMs: windowMs - (now - entry.first) };
    }

    return { action: "BLOCK", waitMs: windowMs - (now - entry.first) };
  }

  private getTripGreetingForDate(date: Date): {
    hello: string;
    goodMorning: string;
    goodEvening: string;
    goodNight: string;
  } | null {
    for (const t of this.trip) {
      const start = startOfDay(parse(t.startDate, "dd/MM/yyyy", new Date()));
      const end = endOfDay(parse(t.endDate, "dd/MM/yyyy", new Date()));

      if (isWithinInterval(date, { start, end })) {
        return {
          hello: t.hello,
          goodMorning: t.goodMorning,
          goodEvening: t.goodEvening,
          goodNight: t.goodNight,
        };
      }
    }
    return null;
  }

  private getTripForDate(date: Date): null | {
    city: string;
    startDate: string;
    endDate: string;
    hello: string;
    goodMorning: string;
    goodEvening: string;
    goodNight: string;
    coordinates?: { lat: number; long: number };
  } {
    for (const t of this.trip) {
      const start = startOfDay(parse(t.startDate, "dd/MM/yyyy", new Date()));
      const end = endOfDay(parse(t.endDate, "dd/MM/yyyy", new Date()));
      if (isWithinInterval(date, { start, end })) return t as any;
    }
    return null;
  }

  // #endregion
}
