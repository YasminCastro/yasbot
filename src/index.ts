// src/index.ts
import "dotenv/config";
import { Client, LocalAuth, Message } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import registerPresence from "./services/registerPresence";

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true },
});

client.on("qr", (qr: string) => {
  qrcode.generate(qr, { small: true });
  console.log("📸 Escaneie o QR code acima");
});

client.on("ready", async () => {
  console.log("✔️  WhatsApp pronto!");

  // Aqui você dispara o convite assim que conectar
  // Substitua pelo número do convidado (DDI+DDD+telefone)
  await sendInvitation("556281695581");
});

client.initialize();

client.on("message", async (message: Message) => {
  // 🛑 Ignora mensagens enviadas por este próprio cliente
  console.log(message);
  // if (message.fromMe) return;
  // const text = message.body.trim().toLowerCase();
  // const contact = await message.getContact();
  // const name = contact.pushname || contact.number;
  // if (text === "sim") {
  //   // Confirmação de presença
  //   await registerPresence(name, contact.number);
  //   await message.reply(`Obrigado, ${name}! Sua presença foi confirmada 🎉`);
  // } else {
  //   // Caso a pessoa inicie a conversa
  //   await message.reply(
  //     `🎂 Olá! Você está convidado(a) pro meu aniversário no dia XX/XX!\n` +
  //       `Responda “sim” para confirmar presença.`
  //   );
  // }
});

/**
 * Envia o convite inicial para o número especificado.
 * @param phone Número no formato DDI+DDD+telefone (ex: "5511981695581")
 */
async function sendInvitation(phone: string) {
  const chatId = `${phone}@c.us`;
  const inviteText =
    `🎂 Olá! Você está convidado(a) pro meu aniversário no dia XX/XX!\n` +
    `Responda “sim” para confirmar presença.`;

  try {
    const msg = await client.sendMessage(chatId, inviteText);
    console.log(`✅ Convite enviado para ${phone}:`, msg.id._serialized);
  } catch (err) {
    console.error(`❌ Erro ao enviar convite para ${phone}:`, err);
  }
}
