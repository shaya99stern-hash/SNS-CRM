import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STORAGE_KEY = "sns-crm-clients";
const BAD_IMPORT_ID = "sns-imported-building-prospects-2026-05-04";
const SUPABASE_URL = "https://ximyxslvdcbqexiopgpm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_kLYPu63cO2j-4ocFZEFuLg_jE3Ge2Pe";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let realtimeRefreshTimer = null;
let isSaving = false;
let isRefreshing = false;

const EMPTY_COPY = {
  clients: {
    initialTitle: "No clients yet",
    initialBody: "Add the parent company/client first. Then add buildings under that client.",
    filteredTitle: "No matching clients found",
    filteredBody: "Try a different client, contact, building, phone, email, status, or note.",
  },
  buildings: {
    initialTitle: "No buildings yet",
    initialBody: "Open a client and add buildings/properties under that parent client.",
    filteredTitle: "No matching buildings found",
    filteredBody: "Try a different building, client, address, status, or note.",
  },
};

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

const state = { clients: [], search: "", statusFilter: "", view: "clients", syncStatus: "local" };
const expandedClientIds = new Set();
const $ = (selector) => document.querySelector(selector);

const els = {
  totalCount: $("#totalCount"),
  pageTitle: $("#pageTitle"),
  clientMetric: $("#clientMetric"),
  buildingMetric: $("#buildingMetric"),
  search: $("#searchInput"),
  refreshBtn: $("#refreshBtn"),
  statusFilter: $("#statusFilter"),
  addClientBtn: $("#addClientBtn"),
  addBuildingBtn: $("#addBuildingBtn"),
  clientsView: $("#clientsView"),
  buildingsView: $("#buildingsView"),
  clientList: $("#clientList"),
  buildingList: $("#buildingList"),
  clientEmpty: $("#clientEmptyState"),
  buildingEmpty: $("#buildingEmptyState"),
  clientDialog: $("#clientDialog"),
  clientForm: $("#clientForm"),
  clientDialogTitle: $("#clientDialogTitle"),
  deleteClientBtn: $("#deleteClientBtn"),
  clientId: $("#clientId"),
  company: $("#companyInput"),
  contact: $("#contactInput"),
  phone: $("#phoneInput"),
  email: $("#emailInput"),
  status: $("#statusInput"),
  meetingDate: $("#meetingDateInput"),
  meetingOwner: $("#meetingOwnerInput"),
  nextStep: $("#nextStepInput"),
  followUp: $("#followUpInput"),
  closeStatus: $("#closeStatusInput"),
  notes: $("#notesInput"),
  buildingDialog: $("#buildingDialog"),
  buildingForm: $("#buildingForm"),
  buildingDialogTitle: $("#buildingDialogTitle"),
  deleteBuildingBtn: $("#deleteBuildingBtn"),
  buildingId: $("#buildingId"),
  buildingClient: $("#buildingClientInput"),
  buildingName: $("#buildingNameInput"),
  buildingAddress: $("#buildingAddressInput"),
  buildingStatus: $("#buildingStatusInput"),
  buildingDescription: $("#buildingDescriptionInput"),
  buildingNotes: $("#buildingNotesInput"),
};

init();

async function init() {
  bindEvents();
  await loadClients();
  subscribeToRealtime();
  render();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
}

function bindEvents() {
  els.refreshBtn?.addEventListener("click", manualRefresh);
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
  els.statusFilter?.addEventListener("change", (event) => {
    state.statusFilter = event.target.value;
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

async function manualRefresh() {
  if (isRefreshing || isSaving) return;
  isRefreshing = true;
  const originalText = els.refreshBtn?.textContent || "↻ Refresh";
  if (els.refreshBtn) {
    els.refreshBtn.disabled = true;
    els.refreshBtn.textContent = "Refreshing...";
  }
  try {
    await refreshFromRemote(true);
    if (els.refreshBtn) els.refreshBtn.textContent = "✓ Updated";
  } finally {
    setTimeout(() => {
      if (els.refreshBtn) {
        els.refreshBtn.textContent = originalText.includes("Refresh") ? originalText : "↻ Refresh";
        els.refreshBtn.disabled = false;
      }
      isRefreshing = false;
    }, 900);
  }
}

async function loadClients() {
  const localClients = readLocalClients()
    .filter((client) => client.id !== BAD_IMPORT_ID && client.company !== "SNS Building Prospects")
    .map(normalizeClient);

  try {
    const remoteClients = await fetchRemoteClients();
    if (remoteClients.length) {
      state.clients = sortClients(remoteClients);
      state.syncStatus = "live";
      cacheLocal();
      return;
    }

    const seedClients = mergeImportedContacts(localClients);
    await seedRemoteIfEmpty(seedClients);
    state.clients = sortClients(await fetchRemoteClients());
    if (!state.clients.length) state.clients = sortClients(seedClients);
    state.syncStatus = "live";
    cacheLocal();
  } catch (error) {
    console.warn("Supabase unavailable; using local fallback", error);
    state.clients = sortClients(mergeImportedContacts(localClients));
    state.syncStatus = "local";
    cacheLocal();
  }
}

async function refreshFromRemote(showAlert = false) {
  if (isSaving) return;
  try {
    const remoteClients = await fetchRemoteClients();
    state.clients = sortClients(remoteClients);
    state.syncStatus = "live";
    cacheLocal();
    render();
  } catch (error) {
    console.warn("Realtime refresh failed", error);
    if (showAlert) alert("Refresh failed. Check connection and try again.");
  }
}

function subscribeToRealtime() {
  supabase
    .channel("sns-leads-shared-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, scheduleRealtimeRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "buildings" }, scheduleRealtimeRefresh)
    .subscribe((status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") console.warn("Realtime connection issue:", status);
    });
}

function scheduleRealtimeRefresh() {
  clearTimeout(realtimeRefreshTimer);
  realtimeRefreshTimer = setTimeout(refreshFromRemote, 350);
}

async function fetchRemoteClients() {
  const { data: clientRows, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .order("updated_at", { ascending: false });
  if (clientError) throw clientError;

  const { data: buildingRows, error: buildingError } = await supabase
    .from("buildings")
    .select("*")
    .order("updated_at", { ascending: false });
  if (buildingError) throw buildingError;

  const buildingsByClient = new Map();
  (buildingRows ?? []).forEach((row) => {
    const building = normalizeBuilding(fromBuildingRow(row));
    const list = buildingsByClient.get(row.client_id) ?? [];
    list.push(building);
    buildingsByClient.set(row.client_id, list);
  });

  return (clientRows ?? []).map((row) => normalizeClient({
    ...fromClientRow(row),
    buildings: sortBuildings(buildingsByClient.get(row.id) ?? []),
  }));
}

async function seedRemoteIfEmpty(seedClients) {
  const { count, error } = await supabase.from("clients").select("id", { count: "exact", head: true });
  if (error) throw error;
  if (count && count > 0) return;

  const clientRows = seedClients.map(toClientRow);
  const buildingRows = seedClients.flatMap((client) => (client.buildings ?? []).map((building) => toBuildingRow(client.id, building)));
  if (clientRows.length) {
    const { error: clientError } = await supabase.from("clients").upsert(clientRows, { onConflict: "id" });
    if (clientError) throw clientError;
  }
  if (buildingRows.length) {
    const { error: buildingError } = await supabase.from("buildings").upsert(buildingRows, { onConflict: "id" });
    if (buildingError) throw buildingError;
  }
}

function readLocalClients() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cacheLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.clients));
}

function mergeImportedContacts(existingClients) {
  const byId = new Map(existingClients.map((client) => [client.id, client]));
  IMPORTED_CONTACTS.forEach((client) => {
    if (!byId.has(client.id)) byId.set(client.id, normalizeClient(client));
  });
  return sortClients(Array.from(byId.values()).map(normalizeClient));
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
  els.totalCount.textContent = state.clients.length;
  els.clientMetric.textContent = state.clients.length;
  els.buildingMetric.textContent = buildings.length;
}

function renderClients() {
  const clients = filteredClients();
  els.clientList.innerHTML = "";
  els.clientList.classList.remove("slide-list");

  if (clients.length) {
    const table = createSheetTable([
      "Company / Client",
      "Contact",
      "Phone",
      "Email",
      "Client Status",
      "Meeting Date",
      "Meeting Owner",
      "Next Step",
      "Follow Up / Comment",
      "Close / No Close",
      "Notes",
      "Buildings Count",
      "Last Updated",
      "Actions",
    ], "clients-sheet");

    const tbody = table.querySelector("tbody");
    clients.forEach((client) => {
      const row = document.createElement("tr");
      row.className = "sheet-row client-row";
      row.addEventListener("click", () => openClientDialog(client));

      const companyCell = document.createElement("td");
      companyCell.className = "company-cell sticky-cell";
      const companyWrap = document.createElement("div");
      companyWrap.className = "company-cell-inner";
      const expand = document.createElement("button");
      expand.className = "sheet-icon-btn";
      expand.type = "button";
      expand.textContent = expandedClientIds.has(client.id) ? "-" : "+";
      expand.setAttribute("aria-label", `${expandedClientIds.has(client.id) ? "Hide" : "Show"} buildings for ${client.company}`);
      expand.addEventListener("click", (event) => {
        event.stopPropagation();
        if (expandedClientIds.has(client.id)) expandedClientIds.delete(client.id);
        else expandedClientIds.add(client.id);
        renderClients();
      });
      const companyName = document.createElement("button");
      companyName.className = "sheet-link";
      companyName.type = "button";
      companyName.textContent = emptyText(client.company);
      companyName.addEventListener("click", (event) => {
        event.stopPropagation();
        openClientDialog(client);
      });
      companyWrap.append(expand, companyName);
      companyCell.append(companyWrap);

      row.append(
        companyCell,
        textCell(client.contact),
        linkCell(client.phone, client.phone ? `tel:${digitsOnly(client.phone)}` : ""),
        linkCell(client.email, client.email ? `mailto:${client.email}` : ""),
        pillCell(client.status || "Prospective"),
        textCell(displayDate(client.meeting_date)),
        textCell(client.meeting_owner),
        textCell(client.next_step, "clip-cell"),
        textCell(client.follow_up, "clip-cell"),
        textCell(client.close_status, "clip-cell"),
        textCell(client.notes, "clip-cell notes-cell"),
        textCell(String((client.buildings ?? []).length), "count-cell"),
        textCell(displayDateTime(client.updated_at)),
        actionsCell([
          ["+ Building", () => openBuildingDialog(client)],
          ["Edit", () => openClientDialog(client)],
        ]),
      );
      tbody.append(row);

      if (expandedClientIds.has(client.id)) {
        tbody.append(clientBuildingsRow(client));
      }
    });
    els.clientList.append(table);
  }

  setEmptyState(els.clientEmpty, EMPTY_COPY.clients, state.clients.length === 0, clients.length === 0);
}

function renderBuildings() {
  const buildings = filteredBuildings();
  els.buildingList.innerHTML = "";
  els.buildingList.classList.remove("slide-list");

  if (buildings.length) {
    const table = createSheetTable([
      "Client",
      "Building / Property Name",
      "Address",
      "Building Status",
      "Description",
      "Building Notes",
      "Actions",
    ], "buildings-sheet");
    const tbody = table.querySelector("tbody");
    buildings.forEach(({ client, building }) => {
      const row = document.createElement("tr");
      row.className = "sheet-row building-row";
      row.addEventListener("click", () => openBuildingDialog(client, building));
      row.append(
        textCell(client.company, "sticky-cell"),
        textCell(building.name),
        textCell(building.address, "clip-cell"),
        pillCell(building.status || "Prospective"),
        textCell(building.description, "clip-cell"),
        textCell(building.notes, "clip-cell notes-cell"),
        actionsCell([["Edit", () => openBuildingDialog(client, building)]]),
      );
      tbody.append(row);
    });
    els.buildingList.append(table);
  }

  const totalBuildings = allBuildings().length;
  setEmptyState(els.buildingEmpty, EMPTY_COPY.buildings, totalBuildings === 0, buildings.length === 0);
}

function addIfPresent(parent, label, value, wide = false) {
  if (!value) return;
  parent.append(field(label, value, wide));
}

function addLinkedIfPresent(parent, label, value, href) {
  if (!value) return;
  parent.append(linkedField(label, value, href));
}

function createSheetTable(headers, classNameValue) {
  const table = document.createElement("table");
  table.className = `sheet-table ${classNameValue}`;
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = header;
    headerRow.append(th);
  });
  thead.append(headerRow);
  table.append(thead, document.createElement("tbody"));
  return table;
}

function clientBuildingsRow(client) {
  const row = document.createElement("tr");
  row.className = "building-detail-row";
  const cell = document.createElement("td");
  cell.colSpan = 14;
  const panel = document.createElement("div");
  panel.className = "building-detail-panel";

  if (!(client.buildings ?? []).length) {
    const empty = document.createElement("div");
    empty.className = "inline-empty";
    empty.textContent = "No buildings for this client yet.";
    const add = smallActionButton("+ Building", () => openBuildingDialog(client));
    panel.append(empty, add);
  } else {
    const table = createSheetTable([
      "Building / Property Name",
      "Address",
      "Building Status",
      "Description",
      "Building Notes",
      "Actions",
    ], "nested-buildings-sheet");
    const tbody = table.querySelector("tbody");
    (client.buildings ?? []).forEach((building) => {
      const buildingRow = document.createElement("tr");
      buildingRow.className = "sheet-row building-row";
      buildingRow.addEventListener("click", () => openBuildingDialog(client, building));
      buildingRow.append(
        textCell(building.name),
        textCell(building.address, "clip-cell"),
        pillCell(building.status || "Prospective"),
        textCell(building.description, "clip-cell"),
        textCell(building.notes, "clip-cell notes-cell"),
        actionsCell([["Edit", () => openBuildingDialog(client, building)]]),
      );
      tbody.append(buildingRow);
    });
    panel.append(table);
  }

  cell.append(panel);
  row.append(cell);
  return row;
}

function textCell(value, classNameValue = "") {
  const cell = document.createElement("td");
  if (classNameValue) cell.className = classNameValue;
  const text = emptyText(value);
  cell.textContent = text;
  if (text === "-") cell.classList.add("empty-cell");
  return cell;
}

function linkCell(value, href) {
  const cell = document.createElement("td");
  if (!value || !href) {
    cell.textContent = "-";
    cell.className = "empty-cell";
    return cell;
  }
  const link = document.createElement("a");
  link.href = href;
  link.textContent = value;
  link.addEventListener("click", (event) => event.stopPropagation());
  cell.append(link);
  return cell;
}

function pillCell(value) {
  const cell = document.createElement("td");
  cell.append(pill(value, "status-pill"));
  return cell;
}

function actionsCell(actions) {
  const cell = document.createElement("td");
  cell.className = "actions-cell";
  actions.forEach(([label, handler]) => cell.append(smallActionButton(label, handler)));
  return cell;
}

function smallActionButton(label, handler) {
  const button = document.createElement("button");
  button.className = "sheet-action";
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    handler();
  });
  return button;
}

function setEmptyState(element, copy, noneAtAll, noneFiltered) {
  if (noneAtAll || noneFiltered) {
    element.hidden = false;
    element.querySelector("strong").textContent = noneAtAll ? copy.initialTitle : copy.filteredTitle;
    element.querySelector("span").textContent = noneAtAll ? copy.initialBody : copy.filteredBody;
    return;
  }
  element.hidden = true;
}

function filteredClients() {
  return sortClients(state.clients.filter((client) => {
    const matchesSearch = searchTextForClient(client).includes(state.search);
    const matchesStatus = !state.statusFilter || client.status === state.statusFilter;
    return matchesSearch && matchesStatus;
  }));
}

function filteredBuildings() {
  return sortBuildingMatches(allBuildings().filter(({ client, building }) => {
    const matchesSearch = searchTextForBuilding(client, building).includes(state.search);
    const matchesStatus = !state.statusFilter || client.status === state.statusFilter || building.status === state.statusFilter;
    return matchesSearch && matchesStatus;
  }));
}

function allBuildings() {
  return state.clients.flatMap((client) => (client.buildings ?? []).map((building) => ({ client, building })));
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
  sortClients(state.clients).forEach((client) => {
    const option = document.createElement("option");
    option.value = client.id;
    option.textContent = client.company;
    option.selected = client.id === selectedId;
    els.buildingClient.append(option);
  });
}

async function saveClient() {
  const existingId = els.clientId.value;
  const payload = normalizeClient({
    id: existingId || crypto.randomUUID(),
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
    buildings: existingId ? state.clients.find((client) => client.id === existingId)?.buildings ?? [] : [],
  });
  if (!payload.company) return;

  const previousClients = [...state.clients];
  state.clients = sortClients(existingId
    ? state.clients.map((client) => client.id === existingId ? payload : client)
    : [payload, ...state.clients]);
  cacheLocal();
  render();

  try {
    isSaving = true;
    const { error } = await supabase.from("clients").upsert(toClientRow(payload), { onConflict: "id" });
    if (error) throw error;
    state.syncStatus = "live";
  } catch (error) {
    console.error("Client save failed", error);
    state.clients = previousClients;
    cacheLocal();
    render();
    alert("Save failed. Supabase tables may not be created yet.");
  } finally {
    isSaving = false;
  }
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

  const previousClients = [...state.clients];
  state.clients = sortClients(state.clients.map((client) => {
    const withoutBuilding = (client.buildings ?? []).filter((building) => building.id !== buildingId);
    if (client.id !== selectedClientId) return normalizeClient({ ...client, buildings: withoutBuilding });
    return normalizeClient({ ...client, buildings: sortBuildings([payload, ...withoutBuilding]), updated_at: new Date().toISOString() });
  }));
  cacheLocal();
  render();

  try {
    isSaving = true;
    const { error } = await supabase.from("buildings").upsert(toBuildingRow(selectedClientId, payload), { onConflict: "id" });
    if (error) throw error;
    state.syncStatus = "live";
  } catch (error) {
    console.error("Building save failed", error);
    state.clients = previousClients;
    cacheLocal();
    render();
    alert("Building save failed. Supabase tables may not be created yet.");
  } finally {
    isSaving = false;
  }
  els.buildingDialog.close();
}

async function deleteClient(id) {
  const previousClients = [...state.clients];
  state.clients = sortClients(state.clients.filter((client) => client.id !== id));
  cacheLocal();
  render();
  try {
    isSaving = true;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) throw error;
  } catch (error) {
    console.error("Delete client failed", error);
    state.clients = previousClients;
    cacheLocal();
    render();
    alert("Delete failed.");
  } finally {
    isSaving = false;
  }
}

async function deleteBuilding(id) {
  const previousClients = [...state.clients];
  state.clients = sortClients(state.clients.map((client) => normalizeClient({
    ...client,
    buildings: sortBuildings((client.buildings ?? []).filter((building) => building.id !== id)),
  })));
  cacheLocal();
  render();
  try {
    isSaving = true;
    const { error } = await supabase.from("buildings").delete().eq("id", id);
    if (error) throw error;
  } catch (error) {
    console.error("Delete building failed", error);
    state.clients = previousClients;
    cacheLocal();
    render();
    alert("Delete failed.");
  } finally {
    isSaving = false;
  }
}

function normalizeClient(client) {
  return {
    id: String(client.id || crypto.randomUUID()),
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
      ? sortBuildings(client.buildings.map((building) => normalizeBuilding(building, client.status)).filter((building) => building.name))
      : [],
  };
}

function normalizeBuilding(building, defaultStatus = "Prospective") {
  return {
    id: String(building.id || crypto.randomUUID()),
    name: String(building.name ?? "").trim(),
    address: String(building.address ?? "").trim(),
    status: String(building.status ?? defaultStatus ?? "Prospective").trim(),
    description: String(building.description ?? "").trim(),
    notes: String(building.notes ?? "").trim(),
    updated_at: building.updated_at || new Date().toISOString(),
  };
}

function toClientRow(client) {
  return {
    id: client.id,
    company: client.company,
    contact: client.contact,
    phone: client.phone,
    email: client.email,
    status: client.status,
    meeting_date: client.meeting_date || null,
    meeting_owner: client.meeting_owner,
    next_step: client.next_step,
    follow_up: client.follow_up,
    close_status: client.close_status,
    notes: client.notes,
    updated_at: client.updated_at || new Date().toISOString(),
  };
}

function toBuildingRow(clientId, building) {
  return {
    id: building.id,
    client_id: clientId,
    name: building.name,
    address: building.address,
    status: building.status,
    description: building.description,
    notes: building.notes,
    updated_at: building.updated_at || new Date().toISOString(),
  };
}

function fromClientRow(row) {
  return {
    id: row.id,
    company: row.company,
    contact: row.contact,
    phone: row.phone,
    email: row.email,
    status: row.status,
    meeting_date: row.meeting_date ?? "",
    meeting_owner: row.meeting_owner,
    next_step: row.next_step,
    follow_up: row.follow_up,
    close_status: row.close_status,
    notes: row.notes,
    updated_at: row.updated_at,
    buildings: [],
  };
}

function fromBuildingRow(row) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    status: row.status,
    description: row.description,
    notes: row.notes,
    updated_at: row.updated_at,
  };
}

function searchTextForClient(client) {
  return [client.company, client.contact, client.phone, client.email, client.status, client.meeting_date, client.meeting_owner, client.next_step, client.follow_up, client.close_status, client.notes, ...(client.buildings ?? []).flatMap((building) => [building.name, building.address, building.status, building.description, building.notes])].join(" ").toLowerCase();
}

function searchTextForBuilding(client, building) {
  return [client.company, client.contact, building.name, building.address, building.status, building.description, building.notes].join(" ").toLowerCase();
}

function sortClients(clients) {
  return [...clients].sort((a, b) => (a.company || "").localeCompare(b.company || "", undefined, { sensitivity: "base" }));
}

function sortBuildings(buildings) {
  return [...buildings].sort((a, b) => (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base" }));
}

function sortBuildingMatches(matches) {
  return [...matches].sort((a, b) => {
    const clientCompare = (a.client.company || "").localeCompare(b.client.company || "", undefined, { sensitivity: "base" });
    if (clientCompare) return clientCompare;
    return (a.building.name || "").localeCompare(b.building.name || "", undefined, { sensitivity: "base" });
  });
}

function field(label, value, wide = false) {
  const wrapper = document.createElement("div");
  wrapper.className = wide ? "field-row is-wide" : "field-row";
  if (label.toLowerCase().includes("notes")) wrapper.classList.add("notes-field");
  const labelEl = document.createElement("span");
  labelEl.textContent = label;
  const valueEl = document.createElement("strong");
  valueEl.textContent = value;
  wrapper.append(labelEl, valueEl);
  return wrapper;
}

function linkedField(label, value, href) {
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

function emptyText(value) { return String(value ?? "").trim() || "-"; }
function digitsOnly(value = "") { return value.replace(/[^+\d]/g, ""); }
function displayDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${Number(month)}/${Number(day)}/${year}`;
}
function displayDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "numeric", day: "numeric", year: "2-digit" });
}
function className(value) { return String(value).replace(/\s+|\//g, "-"); }
