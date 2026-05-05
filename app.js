import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STORAGE_KEY = "sns-crm-clients";
const BAD_IMPORT_ID = "sns-imported-building-prospects-2026-05-04";
const SUPABASE_URL = "https://ximyxslvdcbqexiopgpm.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_kLYPu63cO2j-4ocFZEFuLg_jE3Ge2Pe";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let realtimeRefreshTimer = null;
let isSaving = false;

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

const state = { clients: [], search: "", view: "clients", syncStatus: "local" };
const $ = (selector) => document.querySelector(selector);

const els = {
  totalCount: $("#totalCount"),
  pageTitle: $("#pageTitle"),
  clientMetric: $("#clientMetric"),
  buildingMetric: $("#buildingMetric"),
  search: $("#searchInput"),
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
  const localClients = readLocalClients()
    .filter((client) => client.id !== BAD_IMPORT_ID && client.company !== "SNS Building Prospects")
    .map(normalizeClient);

  try {
    const remoteClients = await fetchRemoteClients();
    if (remoteClients.length) {
      state.clients = remoteClients;
      state.syncStatus = "live";
      cacheLocal();
      return;
    }

    const seedClients = mergeImportedContacts(localClients);
    await seedRemoteIfEmpty(seedClients);
    state.clients = await fetchRemoteClients();
    if (!state.clients.length) state.clients = seedClients;
    state.syncStatus = "live";
    cacheLocal();
  } catch (error) {
    console.warn("Supabase unavailable; using local fallback", error);
    state.clients = mergeImportedContacts(localClients);
    state.syncStatus = "local";
    cacheLocal();
  }
}

async function refreshFromRemote() {
  if (isSaving) return;
  try {
    const remoteClients = await fetchRemoteClients();
    state.clients = remoteClients;
    state.syncStatus = "live";
    cacheLocal();
    render();
  } catch (error) {
    console.warn("Realtime refresh failed", error);
  }
}

function subscribeToRealtime() {
  supabase
    .channel("sns-leads-shared-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, scheduleRealtimeRefresh)
    .on("postgres_changes", { event: "*", schema: "public", table: "buildings" }, scheduleRealtimeRefresh)
    .subscribe();
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
    buildings: buildingsByClient.get(row.id) ?? [],
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
  els.totalCount.textContent = state.clients.length;
  els.clientMetric.textContent = state.clients.length;
  els.buildingMetric.textContent = buildings.length;
}

function renderClients() {
  const clients = filteredClients();
  els.clientList.innerHTML = "";
  els.clientList.classList.add("slide-list");

  clients.forEach((client) => {
    const card = document.createElement("article");
    card.className = "crm-card client-card compact-card";

    const header = document.createElement("div");
    header.className = "card-header";
    const title = document.createElement("button");
    title.className = "card-title-link";
    title.type = "button";
    title.textContent = client.company;
    title.addEventListener("click", () => openClientDialog(client));
    header.append(title, pill(client.status || "Prospective", "status-pill"));

    const meta = document.createElement("div");
    meta.className = "card-grid compact-grid";
    addIfPresent(meta, "Contact", client.contact);
    addLinkedIfPresent(meta, "Phone", client.phone, `tel:${digitsOnly(client.phone)}`);
    addLinkedIfPresent(meta, "Email", client.email, `mailto:${client.email}`);
    addIfPresent(meta, "Meeting", displayDate(client.meeting_date));
    addIfPresent(meta, "Owner", client.meeting_owner);
    addIfPresent(meta, "Next", client.next_step, true);
    addIfPresent(meta, "Follow up", client.follow_up, true);
    addIfPresent(meta, "Close", client.close_status, true);
    addIfPresent(meta, "Notes", client.notes, true);
    meta.append(field("Buildings", String((client.buildings ?? []).length)));

    const actions = document.createElement("div");
    actions.className = "card-actions compact-actions";
    const addBuilding = document.createElement("button");
    addBuilding.className = "secondary-btn";
    addBuilding.type = "button";
    addBuilding.textContent = "+ Building";
    addBuilding.addEventListener("click", () => openBuildingDialog(client));
    const edit = document.createElement("button");
    edit.className = "secondary-btn";
    edit.type = "button";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => openClientDialog(client));
    actions.append(addBuilding, edit);

    card.append(header, meta, actions);
    els.clientList.append(card);
  });

  setEmptyState(els.clientEmpty, state.clients.length === 0, clients.length === 0, "No matching clients found", "Try a different client, contact, building, phone, email, status, or note.");
}

function renderBuildings() {
  const buildings = filteredBuildings();
  els.buildingList.innerHTML = "";
  els.buildingList.classList.add("slide-list");

  buildings.forEach(({ client, building }) => {
    const card = document.createElement("article");
    card.className = "crm-card building-card compact-card";
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
    meta.className = "card-grid compact-grid";
    addIfPresent(meta, "Client", client.company);
    addIfPresent(meta, "Address", building.address, true);
    addIfPresent(meta, "Description", building.description);
    addIfPresent(meta, "Notes", building.notes, true);

    const actions = document.createElement("div");
    actions.className = "card-actions compact-actions";
    const edit = document.createElement("button");
    edit.className = "secondary-btn";
    edit.type = "button";
    edit.textContent = "Edit";
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

function addIfPresent(parent, label, value, wide = false) {
  if (!value) return;
  parent.append(field(label, value, wide));
}

function addLinkedIfPresent(parent, label, value, href) {
  if (!value) return;
  parent.append(linkedField(label, value, href));
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
  state.clients = existingId
    ? state.clients.map((client) => client.id === existingId ? payload : client)
    : [payload, ...state.clients];
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
  state.clients = state.clients.map((client) => {
    const withoutBuilding = (client.buildings ?? []).filter((building) => building.id !== buildingId);
    if (client.id !== selectedClientId) return normalizeClient({ ...client, buildings: withoutBuilding });
    return normalizeClient({ ...client, buildings: [payload, ...withoutBuilding], updated_at: new Date().toISOString() });
  });
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
  state.clients = state.clients.filter((client) => client.id !== id);
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
  state.clients = state.clients.map((client) => normalizeClient({
    ...client,
    buildings: (client.buildings ?? []).filter((building) => building.id !== id),
  }));
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
      ? client.buildings.map((building) => normalizeBuilding(building, client.status)).filter((building) => building.name)
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

function digitsOnly(value = "") { return value.replace(/[^+\d]/g, ""); }
function displayDate(value) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${Number(month)}/${Number(day)}/${year}`;
}
function className(value) { return String(value).replace(/\s+|\//g, "-"); }
