const express = require("express");
const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

const app = express();
const PORT = Number.parseInt(process.env.PORT, 10) || 3000;
const DEFAULT_EXCEL_PATH =
    "/Users/biggie/Desktop/nylene-conumption-data/consumption-sheet.xlsx";
const EXCEL_PATH = process.env.EXCEL_PATH || DEFAULT_EXCEL_PATH;
const SHEET_NAME = process.env.EXCEL_SHEET || "Consumption Data";
const HEADER_ROW = [
    "Box Number",
    "Product",
    "Destination",
    "Operator Name",
    "Saved At",
];

app.use(express.json({ limit: "200kb" }));
app.use(express.static(path.join(__dirname)));

function normalizeField(value) {
    return typeof value === "string" ? value.trim() : "";
}

function parseRecord(payload) {
    const record = {
        boxNumber: normalizeField(payload?.boxNumber),
        product: normalizeField(payload?.product),
        destination: normalizeField(payload?.destination),
        operatorName: normalizeField(payload?.operatorName),
        savedAt: normalizeField(payload?.savedAt),
    };

    const missing = Object.entries(record)
        .filter(([, value]) => !value)
        .map(([key]) => key);

    if (missing.length > 0) {
        return {
            error: `Missing required fields: ${missing.join(", ")}.`,
        };
    }

    return { record };
}

function ensureDirectoryExists(filePath) {
    const directory = path.dirname(filePath);
    fs.mkdirSync(directory, { recursive: true });
}

function readWorkbook(filePath) {
    if (fs.existsSync(filePath)) {
        return xlsx.readFile(filePath, { cellDates: true });
    }
    return xlsx.utils.book_new();
}

function getWorksheet(workbook) {
    if (workbook.SheetNames.length === 0) {
        workbook.SheetNames.push(SHEET_NAME);
        workbook.Sheets[SHEET_NAME] = xlsx.utils.aoa_to_sheet([]);
    }

    const sheetName = workbook.SheetNames.includes(SHEET_NAME)
        ? SHEET_NAME
        : workbook.SheetNames[0];

    return { sheetName, worksheet: workbook.Sheets[sheetName] };
}

function appendRecord(workbook, record) {
    const { sheetName, worksheet } = getWorksheet(workbook);
    const row = [
        record.boxNumber,
        record.product,
        record.destination,
        record.operatorName,
        record.savedAt,
    ];

    if (!worksheet || !worksheet["!ref"]) {
        workbook.Sheets[sheetName] = xlsx.utils.aoa_to_sheet([
            HEADER_ROW,
            row,
        ]);
        return;
    }

    xlsx.utils.sheet_add_aoa(worksheet, [row], { origin: -1 });
}

app.post("/api/save", (req, res) => {
    const { record, error } = parseRecord(req.body);
    if (error) {
        return res.status(400).json({ message: error });
    }

    try {
        ensureDirectoryExists(EXCEL_PATH);
        const workbook = readWorkbook(EXCEL_PATH);
        appendRecord(workbook, record);
        xlsx.writeFile(workbook, EXCEL_PATH);
        return res.json({ ok: true });
    } catch (saveError) {
        console.error("Failed to save record:", saveError);
        return res
            .status(500)
            .json({ message: "Unable to save to the Excel file." });
    }
});

app.listen(PORT, () => {
    console.log(`Local tracker running at http://localhost:${PORT}`);
    console.log(`Saving to Excel: ${EXCEL_PATH}`);
});
