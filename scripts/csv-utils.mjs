import fs from "node:fs";

function convertCsvValue(raw) {
  if (raw === "" || raw === "NULL") return null;
  if (/^-?\d+$/.test(raw)) return Number(raw);
  if (/^-?\d+\.\d+$/.test(raw)) return Number(raw);
  if (raw === "true" || raw === "false") return raw === "true";
  return raw;
}

export function parseCsvDocument(text, source = "CSV") {
  const matrix = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(field);
      if (row.some((cell) => cell.length > 0)) matrix.push(row);
      row = [];
      field = "";
      if (ch === "\r") i++;
    } else if (ch !== "\r") {
      field += ch;
    }
  }

  if (inQuotes) {
    throw new Error(`${source}: unterminated quoted field`);
  }

  if (field.length || row.length) {
    row.push(field);
    if (row.some((cell) => cell.length > 0)) matrix.push(row);
  }

  if (matrix.length === 0) {
    throw new Error(`${source}: CSV is empty`);
  }

  const headers = matrix[0];
  const duplicateHeaders = headers.filter(
    (header, index) => headers.indexOf(header) !== index
  );
  if (duplicateHeaders.length > 0) {
    throw new Error(
      `${source}: duplicate header(s): ${[...new Set(duplicateHeaders)].join(", ")}`
    );
  }

  const rows = matrix.slice(1).map((cells, index) => {
    if (cells.length !== headers.length) {
      throw new Error(
        `${source}: row ${index + 2} has ${cells.length} columns; expected ${headers.length}`
      );
    }

    return Object.fromEntries(
      headers.map((header, columnIndex) => [
        header,
        convertCsvValue(cells[columnIndex]),
      ])
    );
  });

  return { source, headers, rows };
}

export function readCsvDocument(file) {
  return parseCsvDocument(fs.readFileSync(file, "utf8"), file);
}
