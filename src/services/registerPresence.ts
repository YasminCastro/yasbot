import { google } from "googleapis";
import "dotenv/config";

const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

export default async function registerPresence(nome: string, numero: string) {
  const spreadsheetId = process.env.SPREADSHEET_ID!;
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Página1!A:B", // ajuste se seu nome de aba for outro
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[new Date().toLocaleString(), nome, numero]],
    },
  });
}
