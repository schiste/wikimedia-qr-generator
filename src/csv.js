export class CsvParseError extends Error {
  constructor(issues) {
    super(formatCsvIssues(issues));
    this.name = "CsvParseError";
    this.issues = issues;
  }
}

export function parseCsv(text) {
  const source = String(text || "");
  const issues = [];
  const rawRows = tokenizeCsv(source, issues).filter((row) => !isEmptyRow(row.fields));

  if (!source.trim()) {
    issues.push(issue(1, null, "CSV is empty. Add a header row and at least one data row."));
  }
  if (rawRows.length === 0) {
    throwIfIssues(issues);
    issues.push(issue(1, null, "CSV is empty. Add a header row and at least one data row."));
  }
  if (rawRows.length === 1) {
    issues.push(issue(rawRows[0]?.lineNumber || 1, null, "CSV has headers but no data rows."));
  }

  const headerRow = rawRows[0] || { fields: [], lineNumber: 1 };
  const headers = headerRow.fields.map((header) => header.trim());
  const seenHeaders = new Map();

  headers.forEach((header, index) => {
    if (!header) {
      issues.push(issue(headerRow.lineNumber, columnName(index), "Header is empty."));
      return;
    }

    const normalized = header.toLowerCase();
    if (seenHeaders.has(normalized)) {
      issues.push(issue(headerRow.lineNumber, header, `Duplicate header "${header}".`));
      return;
    }
    seenHeaders.set(normalized, header);
  });

  const rows = [];
  for (let index = 1; index < rawRows.length; index += 1) {
    const row = rawRows[index];
    if (row.fields.length !== headers.length) {
      issues.push(issue(
        row.lineNumber,
        null,
        `Expected ${headers.length} column${headers.length === 1 ? "" : "s"}, found ${row.fields.length}.`
      ));
      continue;
    }

    const values = {};
    headers.forEach((header, fieldIndex) => {
      values[header] = row.fields[fieldIndex] ?? "";
    });
    rows.push({ index: index - 1, lineNumber: row.lineNumber, values });
  }

  throwIfIssues(issues);
  return { headers, rows };
}

export function formatCsvIssues(issues, { limit = 8 } = {}) {
  const list = Array.isArray(issues) ? issues : [];
  if (list.length === 0) {
    return "CSV is valid.";
  }

  const visible = list.slice(0, limit).map(formatCsvIssue);
  if (list.length > limit) {
    visible.push(`...and ${list.length - limit} more issue${list.length - limit === 1 ? "" : "s"}.`);
  }
  return visible.join("\n");
}

function tokenizeCsv(source, issues) {
  const rows = [];
  let field = "";
  let fields = [];
  let line = 1;
  let rowLine = 1;
  let fieldLine = 1;
  let inQuotes = false;
  let afterQuote = false;
  let fieldQuoted = false;

  function startNextField() {
    field = "";
    fieldLine = line;
    fieldQuoted = false;
    afterQuote = false;
  }

  function pushField() {
    fields.push(field);
    startNextField();
  }

  function pushRow() {
    pushField();
    rows.push({ fields, lineNumber: rowLine });
    fields = [];
    rowLine = line;
  }

  function consumeNewline(char, index) {
    if (char === "\r" && source[index + 1] === "\n") {
      line += 1;
      return 1;
    }
    line += 1;
    return 0;
  }

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (inQuotes) {
      if (char === "\"") {
        if (source[index + 1] === "\"") {
          field += "\"";
          index += 1;
        } else {
          inQuotes = false;
          afterQuote = true;
        }
      } else if (char === "\r" || char === "\n") {
        field += "\n";
        index += consumeNewline(char, index);
      } else {
        field += char;
      }
      continue;
    }

    if (afterQuote) {
      if (char === ",") {
        pushField();
      } else if (char === "\r" || char === "\n") {
        index += consumeNewline(char, index);
        pushRow();
        rowLine = line;
      } else if (char === " " || char === "\t") {
        // Ignore whitespace between a closing quote and the delimiter.
      } else {
        issues.push(issue(fieldLine, null, "Unexpected character after closing quote."));
        field += char;
        afterQuote = false;
      }
      continue;
    }

    if (char === "\"") {
      if (field.length === 0 && !fieldQuoted) {
        inQuotes = true;
        fieldQuoted = true;
      } else {
        issues.push(issue(fieldLine, null, "Quote found inside an unquoted field. Wrap the whole field in quotes or escape it as \"\"."));
        field += char;
      }
    } else if (char === ",") {
      pushField();
    } else if (char === "\r" || char === "\n") {
      index += consumeNewline(char, index);
      pushRow();
      rowLine = line;
    } else {
      field += char;
    }
  }

  if (inQuotes) {
    issues.push(issue(fieldLine, null, "Quoted field is not closed."));
  }

  if (field.length > 0 || fields.length > 0 || afterQuote || fieldQuoted) {
    pushRow();
  }

  return rows;
}

function issue(line, column, message) {
  return { line, column, message };
}

function formatCsvIssue(entry) {
  const location = [
    `Line ${entry.line || 1}`,
    entry.column ? `column "${entry.column}"` : ""
  ].filter(Boolean).join(", ");
  return `${location}: ${entry.message}`;
}

function columnName(index) {
  return `column ${index + 1}`;
}

function isEmptyRow(fields) {
  return fields.every((field) => !String(field || "").trim());
}

function throwIfIssues(issues) {
  if (issues.length > 0) {
    throw new CsvParseError(issues);
  }
}
