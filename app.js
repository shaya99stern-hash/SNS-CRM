const STORAGE_KEY = "sns-crm-clients";
const IMPORTED_SCREENSHOT_CLIENT_ID = "sns-imported-building-prospects-2026-05-04";

const IMPORTED_CLIENTS = [
  {
    id: IMPORTED_SCREENSHOT_CLIENT_ID,
    company: "SNS Building Prospects",
    contact: "",
    phone: "",
    email: "",
    status: "Prospective",
    buildings: [
      { name: "Arlington Senior Living", address: "684 Arlington Pl, Macon, GA 31201, USA", status: "Prospective", description: "83-Room Property" },
      { name: "Autumnwood Care Center 22919 sewer", address: "670 OH-18, Tiffin, OH 44883, USA", status: "Prospective", description: "83-Room Property" },
      { name: "Avondale Health and Rehabilitation Center", address: "2031 Avondale St, Humboldt, TN 38343, USA", status: "Prospective", description: "62-Room Property" },
      { name: "Bethesda Care Center", address: "600 N Brush St, Fremont, OH 43420, USA", status: "Prospective", description: "79-Room Property" },
      { name: "Eastbrook Healthcare Center - sewer", address: "17322 Euclid Ave, Cleveland, OH 44112, USA", status: "Prospective", description: "109-Room Property" },
      { name: "Edward", address: "1744 Oak Ave, Evanston, IL 60201, USA", status: "Prospective", description: "50-Room Property" },
      { name: "Hudson Springs Nursing & Rehab - Providing Onsite Ventilator Care", address: "5000 Sowul Blvd, Stow, OH 44224, USA", status: "Prospective", description: "40-Room Property" },
      { name: "HYDE PARK APT LLC", address: "2741 Jester Ln, Columbus, OH 43231, USA", status: "Prospective", description: "100-Room Property" },
      { name: "Lyonsview", address: "5837 Lyons View Pike, Knoxville, TN 37919, USA", status: "Prospective", description: "104-Room Property" },
      { name: "Marion Rehabilitation", address: "175 Community Dr, Marion, OH 43302, USA", status: "Prospective", description: "99-Room Property" },
      { name: "Newark Rehabilitation", address: "75 McMillen Dr, Newark, OH 43055, USA", status: "Prospective", description: "145-Room Property" },
      { name: "Okeena Health and Rehabilitation Center", address: "1900 Parr Ave, Dyersburg, TN 38024, USA", status: "Prospective", description: "130-Room Property" },
      { name: "Patriot", address: "800 Volunteer Dr, Paris, TN 38242, USA", status: "Prospective", description: "120-Room Property" },
      { name: "Valley Forge Medical Center & Hospital", address: "1033 W Germantown Pike, Norristown, PA 19403, USA", status: "Prospective", description: "70-Unit Property" },
      { name: "Warren Nursing & Rehab - Providing Onsite Dialysis & Ventilator", address: "2473 North Rd NE, Warren, OH 44483, USA", status: "Prospective", description: "107-Room Property" },
    ],
    notes: "Imported from SNS screenshot. Review truncated names/addresses where needed.",
    updated_at: "2026-05-04T22:00:00.000Z",
  },
];

const state = {
  clients: [],
  search: "",
};

const els = {
  totalCount: document.querySelector("#totalCount"),
  clientMetric: document.querySelector("#clientMetric"),
  buildingMetric: document.querySelector("#buildingMetric"),
  statusMetric: document.querySelector("#statusMetric"),
  rows: document.querySelector("#clientRows"),
  empty: document.querySelector("#emptyState"),
  template: document.querySelector("#rowTemplate"),
  dialog: document.querySelector("#clientDialog"),
  form: document.querySelector("#clientForm"),
  dialogTitle: document.querySelector("#dialogTitle"),
  deleteBtn: document.querySelector("#deleteClientBtn"),
  clientId: document.querySelector("#clientId"),
  company: document.querySelector("#companyInput"),
  contact: document.querySelector("#contactInput"),
  phone: document.querySelector("#phoneInput"),
  email: document.querySelector("#emailInput"),
  status: document.querySelector("#statusInput"),
  buildings: document.querySelector("#buildingsInput"),
  notes: document.querySelector("#notesInput"),
  search: document.querySelector("#searchInput"),
};

init();

async function init() {
  bindEvents();
  await loadClients();
  render();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

function bindEvents() {
  document.querySelector("#addClientBtn").addEventListener("click", () => openClientDialog());

  els.search.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    render();
  });

  els.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveClient();
  });

  document.querySelectorAll(".close-dialog").forEach((button) => {
    button.addEventListener("click", () => els.dialog.close());
  });

  els.deleteBtn.addEventListener("click", async () => {
    if (!els.clientId.value) return;
    await deleteClient(els.clientId.value);
    els.dialog.close();
  });
}

async function loadClients() {
  state.clients = mergeImportedClients(readLocalClients().map(normalizeClient));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.clients));
}

function readLocalClients() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? seedClients();
  } catch {
    return seedClients();
  }
}

function seedClients() {
  const sample = [...IMPORTED_CLIENTS];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sample));
  return sample;
}

function mergeImportedClients(existingClients) {
  const clients = [...existingClients];

  IMPORTED_CLIENTS.forEach((importedClient) => {
    const existingIndex = clients.findIndex((client) => client.id === importedClient.id);
    if (existingIndex >= 0) {
      clients[existingIndex] = normalizeClient({ ...clients[existingIndex], ...importedClient });
      return;
    }

    const oldDemoIndex = clients.findIndex((client) => client.company === "Example Medical Center");
    if (oldDemoIndex >= 0 && clients.length === 1) {
      clients.splice(oldDemoIndex, 1, normalizeClient(importedClient));
      return;
    }

    clients.unshift(normalizeClient(importedClient));
  });

  return clients.map(normalizeClient);
}

function render() {
  const clients = filteredClients();
  els.rows.innerHTML = "";

  clients.forEach((client) => {
    const row = els.template.content.firstElementChild.cloneNode(true);
    const open = () => openClientDialog(client);
    row.querySelector(".company-name").textContent = client.company;
    row.querySelector(".company-name").addEventListener("click", open);
    renderBuildings(row.querySelector(".buildings-cell"), client);
    row.querySelector(".contact-cell").textContent = client.contact || "-";
    setLinkedValue(row.querySelector(".phone-cell"), client.phone, `tel:${digitsOnly(client.phone)}`);
    setLinkedValue(row.querySelector(".email-cell"), client.email, `mailto:${client.email}`);

    const status = row.querySelector(".status-pill");
    status.textContent = client.status || "Had initial meeting";
    status.classList.add(`status-${className(client.status || "Had initial meeting")}`);

    row.querySelector(".updated-cell").textContent = formatDate(client.updated_at);
    row.querySelector(".edit-btn").addEventListener("click", open);
    els.rows.append(row);
  });

  renderEmptyState(clients);
  renderMetrics();
}

function renderEmptyState(filtered) {
  if (state.clients.length === 0) {
    els.empty.hidden = false;
    els.empty.querySelector("strong").textContent = "No clients yet";
    els.empty.querySelector("span").textContent = "Add the first SNS opportunity when you are ready.";
    return;
  }

  if (filtered.length === 0) {
    els.empty.hidden = false;
    els.empty.querySelector("strong").textContent = "No matching clients found";
    els.empty.querySelector("span").textContent = "Try a different company, contact, building, phone, email, status, or note.";
    return;
  }

  els.empty.hidden = true;
}

function renderMetrics() {
  const buildings = state.clients.flatMap((client) => client.buildings ?? []);
  const statuses = new Set(
    state.clients
      .map((client) => client.status)
      .filter(Boolean)
  );

  els.totalCount.textContent = state.clients.length;
  els.clientMetric.textContent = state.clients.length;
  els.buildingMetric.textContent = buildings.length;
  els.statusMetric.textContent = statuses.size;
}

function renderBuildings(cell, client) {
  cell.textContent = "";
  const buildings = client.buildings ?? [];

  if (buildings.length === 0) {
    const empty = document.createElement("span");
    empty.className = "muted-text";
    empty.textContent = "No buildings listed";
    cell.append(empty);
    return;
  }

  const list = document.createElement("div");
  list.className = "building-list";

  buildings.forEach((building) => {
    const item = document.createElement("div");
    item.className = "building-item";

    const name = document.createElement("strong");
    name.textContent = building.name;

    const meta = document.createElement("span");
    meta.className = "building-meta";
    meta.textContent = [building.address, building.description].filter(Boolean).join(" | ");

    const status = document.createElement("span");
    status.className = `building-status status-${className(building.status || client.status || "Had initial meeting")}`;
    status.textContent = building.status || client.status || "Had initial meeting";

    item.append(name);
    if (meta.textContent) item.append(meta);
    item.append(status);
    list.append(item);
  });

  cell.append(list);
}

function filteredClients() {
  return state.clients.filter((client) => {
    const buildingText = (client.buildings ?? [])
      .map((building) => `${building.name} ${building.address ?? ""} ${building.description ?? ""} ${building.status}`)
      .join(" ");
    const haystack = [
      client.company,
      client.contact,
      client.phone,
      client.email,
      client.status,
      buildingText,
      client.notes,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(state.search);
  });
}

function openClientDialog(client = null) {
  els.form.reset();
  els.clientId.value = client?.id ?? "";
  els.dialogTitle.textContent = client ? "Edit client" : "Add client";
  els.deleteBtn.hidden = !client;
  els.company.value = client?.company ?? "";
  els.contact.value = client?.contact ?? "";
  els.phone.value = client?.phone ?? "";
  els.email.value = client?.email ?? "";
  els.status.value = client?.status ?? "Had initial meeting";
  els.buildings.value = serializeBuildings(client?.buildings ?? []);
  els.notes.value = client?.notes ?? "";
  els.dialog.showModal();
  els.company.focus();
}

async function saveClient() {
  const existingId = els.clientId.value;
  const payload = {
    company: els.company.value.trim(),
    contact: els.contact.value.trim(),
    phone: els.phone.value.trim(),
    email: els.email.value.trim(),
    status: els.status.value,
    buildings: parseBuildings(els.buildings.value, els.status.value),
    notes: els.notes.value.trim(),
    updated_at: new Date().toISOString(),
  };

  if (!payload.company) return;

  const clients = [...state.clients];
  if (existingId) {
    const index = clients.findIndex((client) => client.id === existingId);
    if (index >= 0) {
      clients[index] = normalizeClient({ ...clients[index], ...payload });
    }
  } else {
    clients.unshift(normalizeClient({ id: crypto.randomUUID(), ...payload }));
  }
  state.clients = clients;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));

  els.dialog.close();
  render();
}

async function deleteClient(id) {
  state.clients = state.clients.filter((client) => client.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.clients));
  render();
}

function normalizeClient(client) {
  return {
    ...client,
    buildings: Array.isArray(client.buildings)
      ? client.buildings.map((building) => ({
          name: String(building.name ?? "").trim(),
          address: String(building.address ?? "").trim(),
          status: String(building.status ?? client.status ?? "Had initial meeting").trim(),
          description: String(building.description ?? "").trim(),
        })).filter((building) => building.name)
      : [],
  };
}

function parseBuildings(value, defaultStatus) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+\|\s+|\s+-\s+/).map((part) => part.trim()).filter(Boolean);
      return {
        name: parts[0] ?? "",
        address: parts[1] ?? "",
        status: parts[2] ?? defaultStatus ?? "Had initial meeting",
        description: parts[3] ?? "",
      };
    })
    .filter((building) => building.name);
}

function serializeBuildings(buildings) {
  return buildings
    .map((building) => [building.name, building.address, building.status, building.description].filter(Boolean).join(" | "))
    .join("\n");
}

function setLinkedValue(cell, value, href) {
  cell.textContent = "";
  if (!value) {
    cell.textContent = "-";
    return;
  }

  const link = document.createElement("a");
  link.href = href;
  link.textContent = value;
  cell.append(link);
}

function digitsOnly(value = "") {
  return value.replace(/[^+\d]/g, "");
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function className(value) {
  return value.replace(/\s+/g, "-");
}
