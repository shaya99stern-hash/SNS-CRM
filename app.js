const STORAGE_KEY = "sns-crm-clients";
const BAD_IMPORT_ID = "sns-imported-building-prospects-2026-05-04";

const IMPORTED_CONTACTS = [
  {
    id: "client-adam-muller-high-point-re",
    company: "High Point RE",
    contact: "Adam Muller",
    email: "adam@highpointcre.com",
    phone: "(310) 691-2090",
    status: "Meeting scheduled",
    meeting_date: "2026-05-12",
    meeting_owner: "Dan",
    next_step: "",
    follow_up: "",
    close_status: "",
    notes: "Imported from client spreadsheet screenshot.",
    buildings: [],
    updated_at: "2026-05-04T23:56:00.000Z",
  },
  {
    id: "client-yitzi-parnes-jmf-capital",
    company: "JMF Capital",
    contact: "Yitzi Parnes",
    email: "Yitzy@jmfcap.com",
    phone: "(516) 712-4254",
    status: "Prospective",
    meeting_date: "",
    meeting_owner: "Jack",
    next_step: "",
    follow_up: "",
    close_status: "",
    notes: "Imported from client spreadsheet screenshot.",
    buildings: [],
    updated_at: "2026-05-04T23:56:00.000Z",
  },
  {
    id: "client-moshe-schwebel-jmf-capital",
    company: "JMF Capital",
    contact: "Moshe Schwebel",
    email: "Moshe@jmfcap.com",
    phone: "(917) 880-06095",
    status: "Prospective",
    meeting_date: "",
    meeting_owner: "Jack",
    next_step: "",
    follow_up: "",
    close_status: "",
    notes: "Imported from client spreadsheet screenshot. Phone number should be reviewed because screenshot shows 11 digits after area code formatting.",
    buildings: [],
    updated_at: "2026-05-04T23:56:00.000Z",
  },
  {
    id: "client-sol-greenstein-atlantis",
    company: "Atlantis",
    contact: "Sol Greenstein",
    email: "sol@atlantisseniorliving.com",
    phone: "",
    status: "Meeting scheduled",
    meeting_date: "2026-05-05",
    meeting_owner: "Dan",
    next_step: "",
    follow_up: "",
    close_status: "",
    notes: "Imported from client spreadsheet screenshot.",
    buildings: [],
    updated_at: "2026-05-04T23:56:00.000Z",
  },
];

const state = {
  clients: [],
  search: "",
  view: "clients",
};

const els = {
  totalCount: document.querySelector("#totalCount"),
  pageTitle: document.querySelector("#pageTitle"),
  clientMetric: document.querySelector("#clientMetric"),
  buildingMetric: document.querySelector("#buildingMetric"),
  statusMetric: document.querySelector("#statusMetric"),
  search: document.querySelector("#searchInput"),
  addClientBtn: document.querySelector("#addClientBtn"),
  addBuildingBtn: document.querySelector("#addBuildingBtn"),
  clientsView: document.querySelector("#clientsView"),
  buildingsView: document.querySelector("#buildingsView"),
  clientList: document.querySelector("#clientList"),
  buildingList: document.querySelector("#buildingList"),
  clientEmpty: document.querySelector("#clientEmptyState"),
  buildingEmpty: document.querySelector("#buildingEmptyState"),
  clientDialog: document.querySelector("#clientDialog"),
  clientForm: document.querySelector("#clientForm"),
  clientDialogTitle: document.querySelector("#clientDialogTitle"),
  deleteClientBtn: document.querySelector("#deleteClientBtn"),
  clientId: document.querySelector("#clientId"),
  company: document.querySelector("#companyInput"),
  contact: document.querySelector("#contactInput"),
  phone: document.querySelector("#phoneInput"),
  email: document.querySelector("#emailInput"),
  status: document.querySelector("#statusInput"),
  meetingDate: document.querySelector("#meetingDateInput"),
  meetingOwner: document.querySelector("#meetingOwnerInput"),
  nextStep: document.querySelector("#nextStepInput"),
  followUp: document.querySelector("#followUpInput"),
  closeStatus: document.querySelector("#closeStatusInput"),
  notes: document.querySelector("#notesInput"),
  buildingDialog: document.querySelector("#buildingDialog"),
  buildingForm: document.querySelector("#buildingForm"),
  buildingDialogTitle: document.querySelector("#buildingDialogTitle"),
  deleteBuildingBtn: document.querySelector("#deleteBuildingBtn"),
  buildingId: document.querySelector("#buildingId"),
  buildingClient: document.querySelector("#buildingClientInput"),
  buildingName: document.querySelector("#buildingNameInput"),
  buildingAddress: document.querySelector("#buildingAddressInput"),
  buildingStatus: document.querySelector("#buildingStatusInput"),
  buildingDescription: document.querySelector("#buildingDescriptionInput"),
  buildingNotes: document.querySelector("#buildingNotesInput"),
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
  els.addClientBtn.addEventListener("click", () => openClientDialog());
  els.addBuildingBtn.addEventListener("click", () => openBuildingDialog());

  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      render();
    });
  });

  els.search.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    render();
  });

  els.clientForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveClient();
  });

  els.buildingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveBuilding();
  });

  document.querySelectorAll(".close-dialog").forEach((button) => {
    button.addEventListener("click", () => button.closest("dialog")?.close());
  });

  els.deleteClientBtn.addEventListener("click", async () => {
    if (!els.clientId.value) return;
    await deleteClient(els.clientId.value);
    els.clientDialog.close();
  });

  els.deleteBuildingBtn.addEventListener("click", async () => {
    if (!els.buildingId.value) return;
    await deleteBuilding(els.buildingId.value);
    els.buildingDialog.close();
  });
}

async function loadClients() {
  const existing = readLocalClients()
    .filter((client) => client.id !== BAD_IMPORT_ID && client.company !== "SNS Building Prospects")
    .map(normalizeClient);
  state.clients = mergeImportedContacts(existing);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.clients));
}

function readLocalClients() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergeImportedContacts(existingClients) {
  const byId = new Map(existingClients.map((client) => [client.id, client]));
  IMPORTED_CONTACTS.forEach((client) => {
    const existing = byId.get(client.id);
    byId.set(client.id, normalizeClient({ ...client, ...(existing ?? {}), ...client }));
  });
  return Array.from(byId.values()).map(normalizeClient);
}

function render() {
  renderShell();
  renderMetrics();
  renderClients();
  renderBuildings();
}

function renderShell() {
  const isBuildings = state.view === "buildings";
  els.pageTitle.textContent = isBuildings ? "Buildings" : "Clients";
  els.addClientBtn.hidden = isBuildings;
  els.addBuildingBtn.hidden = !isBuildings;
  els.clientsView.classList.toggle("is-visible", !isBuildings);
  els.buildingsView.classList.toggle("is-visible", isBuildings);
  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.view);
  });
}

function renderMetrics() {
  const buildings = allBuildings();
  const openClients = state.clients.filter((client) => !["Closed", "No close"].includes(client.status)).length;
  const openBuildings = buildings.filter((item) => !["Installation done", "Dead / not a fit"].includes(item.building.status)).length;
  els.totalCount.textContent = state.clients.length;
  els.clientMetric.textContent = state.clients.length;
  els.buildingMetric.textContent = buildings.length;
  els.statusMetric.textContent = openClients + openBuildings;
}

function renderClients() {
  const clients = filteredClients();
  els.clientList.innerHTML = "";

  clients.forEach((client) => {
    const card = document.createElement("article");
    card.className = "crm-card client-card";

    const header = document.createElement("div");
    header.className = "card-header";

    const title = document.createElement("button");
    title.className = "card-title-link";
    title.type = "button";
    title.textContent = client.company;
    title.addEventListener("click", () => openClientDialog(client));

    const status = pill(client.status || "Prospective", "status-pill");
    header.append(title, status);

    const meta = document.createElement("div");
    meta.className = "card-grid";
    meta.append(
      field("Contact", client.contact || "-"),
      linkedField("Phone", client.phone, `tel:${digitsOnly(client.phone)}`),
      linkedField("Email", client.email, `mailto:${client.email}`),
      field("Meeting date", displayDate(client.meeting_date) || "-"),
      field("Meeting owner", client.meeting_owner || "-"),
      field("Next step", client.next_step || "-", true),
      field("Follow up / comment", client.follow_up || "-", true),
      field("Close / no close", client.close_status || "-", true),
      field("Buildings", String((client.buildings ?? []).length)),
      field("Updated", formatDate(client.updated_at)),
    );

    if (client.notes) meta.append(field("Notes", client.notes, true));

    const buildingPreview = document.createElement("div");
    buildingPreview.className = "inline-building-list";
    (client.buildings ?? []).slice(0, 4).forEach((building) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "inline-building";
      button.textContent = building.name;
      button.addEventListener("click", () => openBuildingDialog(client, building));
      buildingPreview.append(button);
    });

    const actions = document.createElement("div");
    actions.className = "card-actions";
    const addBuilding = document.createElement("button");
    addBuilding.className = "secondary-btn";
    addBuilding.type = "button";
    addBuilding.textContent = "+ Add building";
    addBuilding.addEventListener("click", () => openBuildingDialog(client));
    const edit = document.createElement("button");
    edit.className = "secondary-btn";
    edit.type = "button";
    edit.textContent = "Edit client";
    edit.addEventListener("click", () => openClientDialog(client));
    actions.append(addBuilding, edit);

    card.append(header, meta);
    if (buildingPreview.children.length) card.append(buildingPreview);
    card.append(actions);
    els.clientList.append(card);
  });

  setEmptyState(els.clientEmpty, state.clients.length === 0, clients.length === 0, "No matching clients found", "Try a different client, contact, building, phone, email, status, or note.");
}

function renderBuildings() {
  const buildings = filteredBuildings();
  els.buildingList.innerHTML = "";

  buildings.forEach(({ client, building }) => {
    const card = document.createElement("article");
    card.className = "crm-card building-card";
    card.addEventListener("click", () => openBuildingDialog(client, building));

    const header = document.createElement("div");
    header.className = "card-header";
    const title = document.createElement("button");
    title.className = "card-title-link";
    title.type = "button";
    title.textContent = building.name;
    title.addEventListener("click", (event) => {
      event.stopPropagation();
      openBuildingDialog(client, building);
    });
    header.append(title, pill(building.status || "Prospective", "status-pill"));

    const meta = document.createElement("div");
    meta.className = "card-grid";
    meta.append(
      field("Client", client.company),
      field("Address", building.address || "-", true),
      field("Description", building.description || "-"),
      field("Notes", building.notes || "-", true),
    );

    const actions = document.createElement("div");
    actions.className = "card-actions";
    const edit = document.createElement("button");
    edit.className = "secondary-btn";
    edit.type = "button";
    edit.textContent = "Open / edit building";
    edit.addEventListener("click", (event) => {
      event.stopPropagation();
      openBuildingDialog(client, building);
    });
    actions.append(edit);

    card.append(header, meta, actions);
    els.buildingList.append(card);
  });

  const totalBuildings = allBuildings().length;
  setEmptyState(els.buildingEmpty, totalBuildings === 0, buildings.length === 0, "No matching buildings found", "Try a different building, client, address, status, or note.");
}

function setEmptyState(element, noneAtAll, noneFiltered, filteredTitle, filteredBody) {
  if (noneAtAll) {
    element.hidden = false;
    return;
  }
  if (noneFiltered) {
    element.hidden = false;
    element.querySelector("strong").textContent = filteredTitle;
    element.querySelector("span").textContent = filteredBody;
    return;
  }
  element.hidden = true;
}

function filteredClients() {
  return state.clients.filter((client) => searchTextForClient(client).includes(state.search));
}

function filteredBuildings() {
  return allBuildings().filter(({ client, building }) => searchTextForBuilding(client, building).includes(state.search));
}

function allBuildings() {
  return state.clients.flatMap((client) =>
    (client.buildings ?? []).map((building) => ({ client, building })),
  );
}

function openClientDialog(client = null) {
  els.clientForm.reset();
  els.clientId.value = client?.id ?? "";
  els.clientDialogTitle.textContent = client ? "Edit client" : "Add client";
  els.deleteClientBtn.hidden = !client;
  els.company.value = client?.company ?? "";
  els.contact.value = client?.contact ?? "";
  els.phone.value = client?.phone ?? "";
  els.email.value = client?.email ?? "";
  els.status.value = client?.status ?? "Prospective";
  els.meetingDate.value = client?.meeting_date ?? "";
  els.meetingOwner.value = client?.meeting_owner ?? "";
  els.nextStep.value = client?.next_step ?? "";
  els.followUp.value = client?.follow_up ?? "";
  els.closeStatus.value = client?.close_status ?? "";
  els.notes.value = client?.notes ?? "";
  els.clientDialog.showModal();
  els.company.focus();
}

function openBuildingDialog(client = null, building = null) {
  if (!state.clients.length) {
    openClientDialog();
    return;
  }

  els.buildingForm.reset();
  renderClientOptions(client?.id);
  els.buildingId.value = building?.id ?? "";
  els.buildingDialogTitle.textContent = building ? "Edit building" : "Add building";
  els.deleteBuildingBtn.hidden = !building;
  if (client?.id) els.buildingClient.value = client.id;
  els.buildingName.value = building?.name ?? "";
  els.buildingAddress.value = building?.address ?? "";
  els.buildingStatus.value = building?.status ?? "Prospective";
  els.buildingDescription.value = building?.description ?? "";
  els.buildingNotes.value = building?.notes ?? "";
  els.buildingDialog.showModal();
  els.buildingName.focus();
}

function renderClientOptions(selectedId = "") {
  els.buildingClient.innerHTML = "";
  state.clients.forEach((client) => {
    const option = document.createElement("option");
    option.value = client.id;
    option.textContent = client.company;
    option.selected = client.id === selectedId;
    els.buildingClient.append(option);
  });
}

async function saveClient() {
  const existingId = els.clientId.value;
  const payload = {
    company: els.company.value.trim(),
    contact: els.contact.value.trim(),
    phone: els.phone.value.trim(),
    email: els.email.value.trim(),
    status: els.status.value,
    meeting_date: els.meetingDate.value,
    meeting_owner: els.meetingOwner.value.trim(),
    next_step: els.nextStep.value.trim(),
    follow_up: els.followUp.value.trim(),
    close_status: els.closeStatus.value.trim(),
    notes: els.notes.value.trim(),
    updated_at: new Date().toISOString(),
  };

  if (!payload.company) return;

  const clients = [...state.clients];
  if (existingId) {
    const index = clients.findIndex((client) => client.id === existingId);
    if (index >= 0) clients[index] = normalizeClient({ ...clients[index], ...payload });
  } else {
    clients.unshift(normalizeClient({ id: crypto.randomUUID(), buildings: [], ...payload }));
  }

  state.clients = clients;
  persistAndRender();
  els.clientDialog.close();
}

async function saveBuilding() {
  const selectedClientId = els.buildingClient.value;
  const selectedClient = state.clients.find((client) => client.id === selectedClientId);
  if (!selectedClient || !els.buildingName.value.trim()) return;

  const buildingId = els.buildingId.value || crypto.randomUUID();
  const payload = normalizeBuilding({
    id: buildingId,
    name: els.buildingName.value.trim(),
    address: els.buildingAddress.value.trim(),
    status: els.buildingStatus.value,
    description: els.buildingDescription.value.trim(),
    notes: els.buildingNotes.value.trim(),
    updated_at: new Date().toISOString(),
  }, selectedClient.status);

  state.clients = state.clients.map((client) => {
    const buildings = client.buildings ?? [];
    const withoutBuilding = buildings.filter((building) => building.id !== buildingId);
    if (client.id !== selectedClientId) return normalizeClient({ ...client, buildings: withoutBuilding });

    const existingIndex = buildings.findIndex((building) => building.id === buildingId);
    const nextBuildings = existingIndex >= 0
      ? buildings.map((building) => building.id === buildingId ? payload : building)
      : [payload, ...withoutBuilding];

    return normalizeClient({ ...client, buildings: nextBuildings, updated_at: new Date().toISOString() });
  });

  persistAndRender();
  els.buildingDialog.close();
}

async function deleteClient(id) {
  state.clients = state.clients.filter((client) => client.id !== id);
  persistAndRender();
}

async function deleteBuilding(id) {
  state.clients = state.clients.map((client) => normalizeClient({
    ...client,
    buildings: (client.buildings ?? []).filter((building) => building.id !== id),
  }));
  persistAndRender();
}

function persistAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.clients));
  render();
}

function normalizeClient(client) {
  return {
    id: client.id || crypto.randomUUID(),
    company: String(client.company ?? "").trim(),
    contact: String(client.contact ?? "").trim(),
    phone: String(client.phone ?? "").trim(),
    email: String(client.email ?? "").trim(),
    status: String(client.status ?? "Prospective").trim(),
    meeting_date: String(client.meeting_date ?? "").trim(),
    meeting_owner: String(client.meeting_owner ?? "").trim(),
    next_step: String(client.next_step ?? "").trim(),
    follow_up: String(client.follow_up ?? "").trim(),
    close_status: String(client.close_status ?? "").trim(),
    notes: String(client.notes ?? "").trim(),
    updated_at: client.updated_at || new Date().toISOString(),
    buildings: Array.isArray(client.buildings)
      ? client.buildings.map((building) => normalizeBuilding(building, client.status)).filter((building) => building.name)
      : [],
  };
}

function normalizeBuilding(building, defaultStatus = "Prospective") {
  return {
    id: building.id || crypto.randomUUID(),
    name: String(building.name ?? "").trim(),
    address: String(building.address ?? "").trim(),
    status: String(building.status ?? defaultStatus ?? "Prospective").trim(),
    description: String(building.description ?? "").trim(),
    notes: String(building.notes ?? "").trim(),
    updated_at: building.updated_at || new Date().toISOString(),
  };
}

function searchTextForClient(client) {
  return [
    client.company,
    client.contact,
    client.phone,
    client.email,
    client.status,
    client.meeting_date,
    client.meeting_owner,
    client.next_step,
    client.follow_up,
    client.close_status,
    client.notes,
    ...(client.buildings ?? []).flatMap((building) => [building.name, building.address, building.status, building.description, building.notes]),
  ].join(" ").toLowerCase();
}

function searchTextForBuilding(client, building) {
  return [client.company, client.contact, building.name, building.address, building.status, building.description, building.notes].join(" ").toLowerCase();
}

function field(label, value, wide = false) {
  const wrapper = document.createElement("div");
  wrapper.className = wide ? "field-row is-wide" : "field-row";
  const labelEl = document.createElement("span");
  labelEl.textContent = label;
  const valueEl = document.createElement("strong");
  valueEl.textContent = value;
  wrapper.append(labelEl, valueEl);
  return wrapper;
}

function linkedField(label, value, href) {
  if (!value) return field(label, "-");
  const wrapper = document.createElement("div");
  wrapper.className = "field-row";
  const labelEl = document.createElement("span");
  labelEl.textContent = label;
  const link = document.createElement("a");
  link.href = href;
  link.textContent = value;
  wrapper.append(labelEl, link);
  return wrapper;
}

function pill(text, classNameValue) {
  const el = document.createElement("span");
  el.className = `${classNameValue} status-${className(text)}`;
  el.textContent = text;
  return el;
}

function digitsOnly(value = "") {
  return value.replace(/[^+\d]/g, "");
}

function displayDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${Number(month)}/${Number(day)}/${year}`;
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
  return String(value).replace(/\s+|\//g, "-");
}
