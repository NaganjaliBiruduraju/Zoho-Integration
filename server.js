
require("dotenv").config();

const express = require("express");
const path = require("path");
const {
  isZohoConfigured,
  zohoRequest
} = require("./services/zohoService");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Check backend and Zoho configuration status
app.get("/api/health", (req, res) => {
  res.json({
    application: "Zoho People P&L Portal",
    backend: "running",
    zohoConfigured: isZohoConfigured()
  });
});

// Shared helper for future Zoho API endpoints
async function getZohoResource(req, res, envKey) {
  if (!isZohoConfigured()) {
    return res.status(503).json({
      error: "ZOHO_NOT_CONFIGURED",
      message: "Configure authorized Zoho OAuth credentials first."
    });
  }

  const endpoint = process.env[envKey];

  if (!endpoint) {
    return res.status(503).json({
      error: "ENDPOINT_NOT_CONFIGURED",
      message: `The Zoho endpoint configuration ${envKey} is missing.`
    });
  }

  try {
    const data = await zohoRequest(endpoint);

    return res.json(data);
  } catch (error) {
    console.error(`${envKey} request failed:`, error.message);

    return res.status(502).json({
      error: "ZOHO_REQUEST_FAILED",
      message: "Unable to retrieve data from Zoho People."
    });
  }
}

// Zoho-backed resource routes
app.get("/api/projects", (req, res) =>
  getZohoResource(req, res, "ZOHO_PROJECTS_ENDPOINT")
);

app.get("/api/employees", (req, res) =>
  getZohoResource(req, res, "ZOHO_EMPLOYEES_ENDPOINT")
);

app.get("/api/time-logs", (req, res) =>
  getZohoResource(req, res, "ZOHO_TIME_LOGS_ENDPOINT")
);

app.get("/api/other-costs", (req, res) =>
  getZohoResource(req, res, "ZOHO_OTHER_COSTS_ENDPOINT")
);

// Financial summary requires verified field mapping and business rules.
app.get("/api/summary", (req, res) => {
  res.status(503).json({
    error: "FINANCIAL_MAPPING_PENDING",
    message:
      "Configure the real data sources and confirm financial field mappings before calculating the summary."
  });
});

// Unknown API route
app.use("/api", (req, res) => {
  res.status(404).json({
    error: "API_ENDPOINT_NOT_FOUND"
  });
});

app.listen(PORT, () => {
  console.log(`P&L Portal running at http://localhost:${PORT}`);
});
