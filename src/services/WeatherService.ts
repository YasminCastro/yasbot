import { Message, MessageMedia, Client } from "whatsapp-web.js";
import { Database } from "../repositories/Database";

/**
 * Service for handling weather-related functionality
 */
export class WeatherService {
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
  private CITY = "Goiânia";

  private weatherResponses = [
    "Tá achando que sou a garota do tempo do jornal nacional? Eu ein",
    "Bota o braço pra fora e vê se tá chovendo 😡",
  ];

  constructor(private database: Database, private client: Client) {}

  /**
   * Sends a message about the weather
   */
  public async sendTodaysWeather(groupId: string): Promise<void> {
    const isRegistered = await this.database.groups.getGroups({ groupId });
    if (isRegistered.length === 0) return;

    const chat = await this.client.getChatById(groupId);

    const wx = await this.getWeatherBundleCached();

    if (!wx) {
      await chat.sendMessage("Não consegui puxar a previsão de hoje agora 😕");
      return;
    }

    const header = `Bom dia ${this.CITY}!`;

    const lines: string[] = [];
    lines.push(`A previsão do tempo para hoje em ${this.CITY} é:`);
    lines.push(...this.buildCityWeatherLines(wx.daily, this.CITY));

    const finalMsg = [header, "", ...lines].join("\n");
    await chat.sendMessage(finalMsg);

    // Sticker de chuva (apenas se indicar muita chuva)
    if (wx.daily.probRain >= 60) {
      const stickerPath = "./stickers/gosto-de-capa.webp";
      const sticker = MessageMedia.fromFilePath(stickerPath);
      await chat.sendMessage(sticker, { sendMediaAsSticker: true });
    }
  }

  /**
   * Sends if is going to rain today
   */
  public async handleRainQuestion(message: Message): Promise<void> {
    const fromId = message.from;
    const numberMatch = fromId.match(/^(\d+)@/);
    const number = numberMatch ? numberMatch[1] : fromId.replace(/@.*$/, "");

    const senderNumber = number;
    const chatId = message.from;
    const key = `${chatId}:${senderNumber}`;

    const { action } = this.checkAndStamp(key, 3 * 60 * 60 * 1000);

    if (action === "BLOCK") {
      return;
    }

    const wx = await this.getWeatherBundleCached();
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

  /**
   * Gets cached weather bundle for Goiânia
   */
  public async getWeatherBundleCached(): Promise<{
    current: { temp: number; code: number; isDay: boolean };
    daily: {
      probRain: number;
      tMax: number;
      tMin: number;
      rhMin?: number | null;
    };
  } | null> {
    return this.getWeatherBundleCachedForLocation(this.LAT, this.LONG);
  }

  /**
   * Gets cached weather bundle for specific location
   */
  private async getWeatherBundleCachedForLocation(
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

  /**
   * Converts weather code to emoji
   */
  public weatherCodeToEmoji(code: number, isDay: boolean): string {
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
        `&timezone=auto`;

      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();

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
    key: string,
    windowMs: number
  ): { action: "NORMAL" | "SASS" | "BLOCK"; waitMs: number } {
    const now = Date.now();
    const entry = this.rainSpamMap.get(key);

    if (!entry || now - entry.first >= windowMs) {
      this.rainSpamMap.set(key, { count: 1, first: now });
      return { action: "NORMAL", waitMs: 0 };
    }

    if (entry.count === 1) {
      entry.count = 2;
      this.rainSpamMap.set(key, entry);
      return { action: "SASS", waitMs: windowMs - (now - entry.first) };
    }

    return { action: "BLOCK", waitMs: windowMs - (now - entry.first) };
  }

  private sample<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }
}
