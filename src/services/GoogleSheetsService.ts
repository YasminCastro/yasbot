// src/services/GoogleSheetsService.ts
import { google, sheets_v4 } from "googleapis";

export interface GoogleSheetsOptions {
  spreadsheetId: string;
  credentialsPath: string;
  sheetName?: string; // opcional: nome da aba (padrão: "Página1")
  dateLocale?: string; // opcional: locale para Date.toLocaleString()
}

export class GoogleSheetsService {
  private sheets: sheets_v4.Sheets;
  private spreadsheetId: string;
  private sheetName: string;
  private dateLocale: string;

  constructor(options: GoogleSheetsOptions) {
    this.spreadsheetId = options.spreadsheetId;
    this.sheetName = options.sheetName ?? "Página1";
    this.dateLocale = options.dateLocale ?? "pt-BR";

    const auth = new google.auth.GoogleAuth({
      keyFile: options.credentialsPath,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    this.sheets = google.sheets({ version: "v4", auth });
  }

  /**
   * Adiciona linhas a um intervalo qualquer da planilha.
   * @param values Array de arrays, onde cada sub-array é uma linha.
   * @param range intervalo no formato "A:C" ou "Página1!A:C"
   */
  public async appendRows(
    values: any[][],
    range: string = `${this.sheetName}!A:C`
  ): Promise<sheets_v4.Schema$AppendValuesResponse> {
    const response = await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values },
    });
    return response.data;
  }

  /**
   * Método de conveniência para registrar presença:
   * adiciona data/hora, nome e número em colunas A, B, C.
   */
  public async registerPresence(
    name: string,
    number: string
  ): Promise<sheets_v4.Schema$AppendValuesResponse> {
    const timestamp = new Date().toLocaleString(this.dateLocale);
    return this.appendRows([[timestamp, name, number]]);
  }
}
