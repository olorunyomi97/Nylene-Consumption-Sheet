const STORAGE_KEY = "productTrackingForm";

const pageInitializers = {
    form: initFormPage,
    destination: initDestinationPage,
    summary: initSummaryPage,
};

document.addEventListener("DOMContentLoaded", () => {
    const page = document.body?.dataset?.page;
    const init = pageInitializers[page];
    if (init) {
        init();
    }
});

function getStoredData() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (error) {
        return {};
    }
}

function setStoredData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function normalizeText(value) {
    return value ? value.trim() : "";
}

function setMessage(element, message) {
    if (element) {
        element.textContent = message;
    }
}

function formatDateTime(date) {
    return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function initFormPage() {
    const form = document.getElementById("box-form");
    const errorElement = document.getElementById("form-error");
    const boxInput = document.getElementById("box-number");
    const productSelect = document.getElementById("product");
    const operatorInput = document.getElementById("operator-name");

    if (!form || !boxInput || !productSelect || !operatorInput) {
        return;
    }

    const stored = getStoredData();
    if (stored.boxNumber) {
        boxInput.value = stored.boxNumber;
    }
    if (stored.product) {
        productSelect.value = stored.product;
    }
    if (stored.operatorName) {
        operatorInput.value = stored.operatorName;
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        setMessage(errorElement, "");

        const boxNumber = normalizeText(boxInput.value);
        const product = productSelect.value;
        const operatorName = normalizeText(operatorInput.value);
        const operatorParts = operatorName.split(/\s+/).filter(Boolean);

        if (!boxNumber) {
            setMessage(errorElement, "Please enter a box number.");
            boxInput.focus();
            return;
        }
        if (!/^[a-z0-9]+$/i.test(boxNumber)) {
            setMessage(errorElement, "Box number must be alphanumeric only.");
            boxInput.focus();
            return;
        }
        if (!product) {
            setMessage(errorElement, "Please select a product.");
            productSelect.focus();
            return;
        }
        if (operatorParts.length < 2) {
            setMessage(errorElement, "Please enter first and last name.");
            operatorInput.focus();
            return;
        }

        setStoredData({
            ...stored,
            boxNumber,
            product,
            operatorName,
        });

        window.location.href = "destination.html";
    });
}

function initDestinationPage() {
    const form = document.getElementById("destination-form");
    const errorElement = document.getElementById("destination-error");
    const checkboxes = Array.from(
        document.querySelectorAll('input[name="destination"]')
    );

    const stored = getStoredData();
    if (!stored.boxNumber || !stored.product || !stored.operatorName) {
        window.location.href = "index.html";
        return;
    }

    if (!form || checkboxes.length === 0) {
        return;
    }

    if (stored.destination) {
        const saved = checkboxes.find((box) => box.value === stored.destination);
        if (saved) {
            saved.checked = true;
        }
    }

    checkboxes.forEach((box) => {
        box.addEventListener("change", () => {
            if (!box.checked) {
                return;
            }
            checkboxes.forEach((other) => {
                if (other !== box) {
                    other.checked = false;
                }
            });
        });
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        setMessage(errorElement, "");

        const selected = checkboxes.find((box) => box.checked);
        if (!selected) {
            setMessage(errorElement, "Please select a chip destination.");
            return;
        }

        setStoredData({
            ...stored,
            destination: selected.value,
        });

        window.location.href = "summary.html";
    });
}

function initSummaryPage() {
    const stored = getStoredData();
    if (!stored.boxNumber || !stored.product || !stored.operatorName) {
        window.location.href = "index.html";
        return;
    }
    if (!stored.destination) {
        window.location.href = "destination.html";
        return;
    }

    const boxNumber = document.getElementById("summary-box");
    const product = document.getElementById("summary-product");
    const destination = document.getElementById("summary-destination");
    const operatorName = document.getElementById("summary-operator");
    const dateTime = document.getElementById("summary-datetime");
    const saveButton = document.getElementById("final-save");
    const backButton = document.getElementById("go-back");
    const message = document.getElementById("save-message");

    if (boxNumber) {
        boxNumber.textContent = stored.boxNumber;
    }
    if (product) {
        product.textContent = stored.product;
    }
    if (destination) {
        destination.textContent = stored.destination;
    }
    if (operatorName) {
        operatorName.textContent = stored.operatorName;
    }

    const initialTimestamp = stored.savedAt
        ? new Date(stored.savedAt)
        : new Date();
    if (dateTime) {
        dateTime.textContent = formatDateTime(initialTimestamp);
    }

    if (saveButton) {
        saveButton.addEventListener("click", () => {
            const savedAt = new Date();
            setStoredData({
                ...stored,
                savedAt: savedAt.toISOString(),
            });
            if (dateTime) {
                dateTime.textContent = formatDateTime(savedAt);
            }
            setMessage(message, `Saved at ${formatDateTime(savedAt)}.`);
        });
    }

    if (backButton) {
        backButton.addEventListener("click", () => {
            window.location.href = "destination.html";
        });
    }
}
