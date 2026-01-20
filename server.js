const express = require("express");
const cors = require("cors");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const FILE_PATH =
    "/Users/biggie/Desktop/nylene-conumption-data/consumption-sheet.xlsx";
const SHEET_NAME = "Sheet1";
const HEADERS = [
    "Box Number",
    "Product",
    "Operator Name",
    "Chip Destination",
    "Date",
    "Time",
];

app.use(cors());
app.use(express.json({ limit: "1mb" }));

function getTrimmedString(value) {
    return typeof value === "string" ? value.trim() : "";
}

function validatePayload(body) {
    const boxNumber = getTrimmedString(body?.boxNumber);
    const product = getTrimmedString(body?.product);
    const operatorName = getTrimmedString(body?.operatorName);
    const destination = getTrimmedString(body?.destination);

    const missing = [];
    if (!boxNumber) {
        missing.push("boxNumber");
    }
    if (!product) {
        missing.push("product");
    }
    if (!operatorName) {
        missing.push("operatorName");
    }
    if (!destination) {
        missing.push("destination");
    }

    return { boxNumber, product, operatorName, destination, missing };
}

function ensureDirectoryExists(filePath) {
    const directory = path.dirname(filePath);
    fs.mkdirSync(directory, { recursive: true });
}

function loadWorkbook(filePath) {
    if (fs.existsSync(filePath)) {
        return XLSX.readFile(filePath);
    }
    return XLSX.utils.book_new();
}

function getOrCreateWorksheet(workbook) {
    let worksheet = workbook.Sheets[SHEET_NAME];
    if (!worksheet) {
        worksheet = XLSX.utils.aoa_to_sheet([HEADERS]);
        XLSX.utils.book_append_sheet(workbook, worksheet, SHEET_NAME);
        return worksheet;
    }

    if (!worksheet["!ref"]) {
        XLSX.utils.sheet_add_aoa(worksheet, [HEADERS], { origin: "A1" });
    }

    return worksheet;
}

app.post("/save", (req, res) => {
    const { boxNumber, product, operatorName, destination, missing } =
        validatePayload(req.body);

    if (missing.length > 0) {
        return res.status(400).json({
            error: "Missing required fields.",
            fields: missing,
        });
    }

    const now = new Date();
    const date = now.toLocaleDateString("en-US");
    const time = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
    });

    const row = [
        boxNumber,
        product,
        operatorName,
        destination,
        date,
        time,
    ];

    try {
        ensureDirectoryExists(FILE_PATH);
        const workbook = loadWorkbook(FILE_PATH);
        const worksheet = getOrCreateWorksheet(workbook);

        XLSX.utils.sheet_add_aoa(worksheet, [row], { origin: -1 });
        XLSX.writeFile(workbook, FILE_PATH);

        return res.json({ success: true });
    } catch (error) {
        console.error("Failed to save data to Excel file.", error);
        return res.status(500).json({ error: "Unable to save data." });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
