
const API_BASE = "/api";

async function checkZohoConnection() {
  const statusElement = document.getElementById("connection-status");

  try {
    const response = await fetch(`${API_BASE}/health`);
    const health = await response.json();

    if (!response.ok) {
      throw new Error("Health check failed");
    }

    statusElement.textContent = health.zohoConfigured
      ? "Zoho credentials configured"
      : "Zoho API not connected";

    statusElement.title = health.zohoConfigured
      ? "Credentials are configured; live API access still needs verification."
      : "Waiting for authorized Zoho API credentials.";
  } catch (error) {
    statusElement.textContent = "Backend unavailable";
    statusElement.title = "Unable to reach the backend.";
  }
}

async function getZohoData(endpoint) {
  const response = await fetch(`${API_BASE}${endpoint}`);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Unable to retrieve data");
  }

  return result;
}

function formatINR(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function showConnectionStatus(message) {
  const status = document.getElementById("connection-status");

  if (status) {
    status.textContent = message;
  }
}

function showEmptyStates(message) {
  document.getElementById("total-budget").textContent = "—";
  document.getElementById("total-revenue").textContent = "—";
  document.getElementById("total-cost").textContent = "—";
  document.getElementById("total-profit").textContent = "—";
  document.getElementById("overall-margin").textContent = message;

  document.getElementById("projects-table-body").innerHTML =
    `<tr><td colspan="8">${message}</td></tr>`;

  document.getElementById("employees-table-body").innerHTML =
    `<tr><td colspan="5">${message}</td></tr>`;

  document.getElementById("time-logs-table-body").innerHTML =
    `<tr><td colspan="7">${message}</td></tr>`;
}

async function loadDashboard() {
  showConnectionStatus("Connecting to backend...");

  try {
    // These endpoints will connect to Zoho through our backend.
    const [summary, projects, employees, timeLogs] =
      await Promise.all([
        getZohoData("/summary"),
        getZohoData("/projects"),
        getZohoData("/employees"),
        getZohoData("/time-logs")
      ]);

    // Render real API responses after the integration is configured.
    renderSummary(summary);
    renderProjects(projects);
    renderEmployees(employees);
    renderTimeLogs(timeLogs);

    showConnectionStatus("Connected");
  } catch (error) {
    showEmptyStates(
      "Zoho People data is not available. Configure API access to continue."
    );

    showConnectionStatus("Zoho API not connected");
    console.info("Data integration:", error.message);
  }
}

// Display the summary returned by the backend.
function renderSummary(summary) {
  document.getElementById("total-budget").textContent =
    formatINR(summary.totalBudget);

  document.getElementById("total-revenue").textContent =
    formatINR(summary.totalRevenue);

  document.getElementById("total-cost").textContent =
    formatINR(summary.totalCost);

  document.getElementById("total-profit").textContent =
    formatINR(summary.totalProfit);

  document.getElementById("overall-margin").textContent =
    `Profit margin: ${Number(summary.profitMargin || 0).toFixed(2)}%`;

  document.getElementById("project-count").textContent =
    `${summary.projectCount || 0} projects`;
}

// These rendering functions will be completed against the
// actual Zoho response fields once the required API access is known.
function renderProjects(data) {
  document.getElementById("projects-table-body").innerHTML =
    data.length
      ? `<tr><td colspan="8">Project data received. Field mapping is pending.</td></tr>`
      : `<tr><td colspan="8">No project records returned.</td></tr>`;
}

function renderEmployees(data) {
  document.getElementById("employees-table-body").innerHTML =
    data.length
      ? `<tr><td colspan="5">Employee data received. Field mapping is pending.</td></tr>`
      : `<tr><td colspan="5">No employee records returned.</td></tr>`;
}

function renderTimeLogs(data) {
  document.getElementById("time-logs-table-body").innerHTML =
    data.length
      ? `<tr><td colspan="7">Time-log data received. Field mapping is pending.</td></tr>`
      : `<tr><td colspan="7">No time logs returned.</td></tr>`;
}

document.getElementById("refresh-btn").addEventListener(
  "click",
  loadDashboard
);

checkZohoConnection();
loadDashboard();
