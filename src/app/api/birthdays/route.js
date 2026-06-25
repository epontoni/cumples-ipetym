import { NextResponse } from "next/server";

// URL of the Google Sheet CSV
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSGNOgBIjxzXFxDuxIzAz5sr64HsyamkQuPebC324dSlDdpq-Q-KudhGMkXWgt65Dg1TRpIn2VjMmQb/pub?output=csv";

export const dynamic = "force-dynamic"; // Ensure we fetch fresh data

export async function GET() {
  try {
    // Fetch the published CSV with a 60-second revalidation cache
    const response = await fetch(SHEET_CSV_URL, {
      next: { revalidate: 60 },
      headers: {
        "content-type": "text/csv;charset=UTF-8",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch spreadsheet data: ${response.statusText}`);
    }

    const csvText = await response.text();

    // Simple CSV parser
    const lines = csvText.split(/\r?\n/);
    if (lines.length <= 1) {
      return NextResponse.json([]);
    }

    // Expecting columns: Nombre, Día, Mes, Curso/División
    const birthdays = [];

    // Skip header line (index 0)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle simple CSV splitting (accounts for basic values)
      // Since names or courses might contain commas, standard CSV split is ideal.
      // For this spreadsheet, fields don't seem to contain quoted commas.
      // Let's use a regex that matches commas not inside quotes, or a standard split.
      const columns = [];
      let currentVal = "";
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          columns.push(currentVal.trim());
          currentVal = "";
        } else {
          currentVal += char;
        }
      }
      columns.push(currentVal.trim());

      // We expect at least Nombre, Día, Mes (3 columns)
      if (columns.length >= 3) {
        const nombre = columns[0].replace(/^"|"$/g, "").trim();
        const diaStr = columns[1].replace(/^"|"$/g, "").trim();
        const mesStr = columns[2].replace(/^"|"$/g, "").trim();
        const curso = columns[3] ? columns[3].replace(/^"|"$/g, "").trim() : "";

        const dia = parseInt(diaStr, 10);
        const mes = parseInt(mesStr, 10);

        // Validate values
        if (!isNaN(dia) && !isNaN(mes) && nombre) {
          birthdays.push({
            nombre,
            dia,
            mes,
            curso,
          });
        }
      }
    }

    return NextResponse.json(birthdays);
  } catch (error) {
    console.error("Error fetching or parsing CSV:", error);
    return NextResponse.json(
      { error: "Error al obtener los datos de cumpleaños" },
      { status: 500 }
    );
  }
}
