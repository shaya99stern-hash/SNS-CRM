const STATUSES = [
  "Meet",
  "Follow up",
  "Contract sent",
  "Negotiations",
  "Order received",
  "Installation done",
];

const STORAGE_KEY = "sns-crm-clients";
const CONFIG_KEY = "sns-crm-supabase";

const state = {
  clients: [],
  filter: "all",
  search: "",
  config: readConfig(),
};

const els = {
  syncState: document.querySelector("#syncState"),
  totalCount: document.querySelector("#totalCount"),
  meetCount: document.querySelector("#meetCount"),
  followUpCount: document.querySelector("#followUpCount"),
  orderCount: document.querySelector("#orderCount"),
  installCount: document.querySelector("#installCount"),
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
  propertyType: document.querySelector("#propertyTypeInput"),
  siteSize: document.querySelector("#siteSizeInput"),
  interest: document.querySelector("#interestInput"),
  phone: document.querySelector("#phoneInput"),
  email: document.querySelector("#emailInput"),
  status: document.querySelector("#statusInput"),
  order: document.querySelector("#orderInput"),
  notes: document.querySelector("#notesInput"),
  search: document.querySelector("#searchInput"),
  settingsForm: document.querySelector("#settingsForm"),
  supabaseUrl: document.querySelector("#supabaseUrl"),
  supabaseKey: document.querySelector("#supabaseKey"),
  clearSettings: document.querySelector("#clearSettingsBtn"),
};

init();

async function init() {
  bindEvents();
  hydrateSettingsForm();
  await loadClients();
  render();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}

function bindEvents() {
  document.querySelector("#addClientBtn").addEventListener("click", () => openClientDialog());

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      document.querySelectorAll(".segment").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
      render();
    });
  });

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

  els.settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    state.config = {
      url: els.supabaseUrl.value.trim().replace(/\/$/, ""),
      key: els.supabaseKey.value.trim(),
    };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(state.config));
    await loadClients();
    render();
    switchView("pipeline");
  });

  els.clearSettings.addEventListener("click", async () => {
    localStorage.removeItem(CONFIG_KEY);
    state.config = {};
    hydrateSettingsForm();
    await loadClients();
    render();
    switchView("pipeline");
  });
}

function switchView(view) {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
  document.querySelectorAll(".view").forEach((section) => section.classList.remove("is-visible"));
  document.querySelector(`#${view}View`).classList.add("is-visible");
}

async function loadClients() {
  if (hasSupabaseConfig()) {
    try {
      state.clients = await supabaseRequest("/clients?select=*&order=updated_at.desc");
      return;
    } catch (error) {
      console.warn("Supabase load failed, falling back to local storage.", error);
    }
  }

  state.clients = readLocalClients();
}

function readLocalClients() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? seedClients();
  } catch {
    return seedClients();
  }
}

function seedClients() {
  const sample = [
    {
      id: crypto.randomUUID(),
      company: "Example Medical Center",
      contact: "SNS demo contact",
      property_type: "Multifamily",
      site_size: "120 units",
      interest: "Water consulting",
      phone: "",
      email: "",
      status: "Meet",
      order_received: false,
      notes: "Replace this with a real SNS client.",
      updated_at: new Date().toISOString(),
    },
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sample));
  return sample;
}

function render() {
  const clients = filteredClients();
  els.rows.innerHTML = "";

  clients.forEach((client) => {
    const row = els.template.content.firstElementChild.cloneNode(true);
    row.querySelector(".company-name").textContent = client.company;
    row.querySelector(".company-meta").textContent = client.interest || "No product interest";
    row.querySelector(".property-type").textContent = client.property_type || "Multifamily";
    row.querySelector(".site-size").textContent = client.site_size || "Size not set";
    row.querySelector(".contact-cell").textContent = client.contact || "-";

    const status = row.querySelector(".status-pill");
    status.textContent = client.status;
    status.classList.add(`status-${className(client.status)}`);

    const order = row.querySelector(".order-pill");
    order.textContent = client.order_received ? "Received" : "Pending";
    order.classList.add(client.order_received ? "order-yes" : "order-no");

    row.querySelector(".notes-cell").textContent = client.notes || "-";
    row.querySelector(".updated-cell").textContent = formatDate(client.updated_at);
    row.querySelector(".edit-btn").addEventListener("click", () => openClientDialog(client));
    els.rows.append(row);
  });

  els.empty.hidden = clients.length > 0;
  const total = state.clients.length;
  els.totalCount.textContent = total;
  els.meetCount.textContent = countByStatus("Meet");
  els.followUpCount.textContent = countByStatus("Follow up");
  els.orderCount.textContent = state.clients.filter((client) => client.order_received || client.status === "Order received").length;
  els.installCount.textContent = countByStatus("Installation done");
  els.syncState.textContent = hasSupabaseConfig() ? "Shared" : "Local";
}

function filteredClients() {
  return state.clients.filter((client) => {
    const matchesFilter = state.filter === "all" || client.status === state.filter;
    const haystack = [
      client.company,
      client.property_type,
      client.site_size,
      client.interest,
      client.contact,
      client.phone,
      client.email,
      client.status,
      client.notes,
    ]
      .join(" ")
      .toLowerCase();
    return matchesFilter && haystack.includes(state.search);
  });
}

function countByStatus(status) {
  return state.clients.filter((client) => client.status === status).length;
}

function openClientDialog(client = null) {
  els.form.reset();
  els.clientId.value = client?.id ?? "";
  els.dialogTitle.textContent = client ? "Edit client" : "Add client";
  els.deleteBtn.hidden = !client;
  els.company.value = client?.company ?? "";
  els.propertyType.value = client?.property_type ?? "Multifamily";
  els.siteSize.value = client?.site_size ?? "";
  els.interest.value = client?.interest ?? "Water consulting";
  els.contact.value = client?.contact ?? "";
  els.phone.value = client?.phone ?? "";
  els.email.value = client?.email ?? "";
  els.status.value = client?.status ?? "Meet";
  els.order.checked = Boolean(client?.order_received);
  els.notes.value = client?.notes ?? "";
  els.dialog.showModal();
  els.company.focus();
}

async function saveClient() {
  const existingId = els.clientId.value;
  const payload = {
    company: els.company.value.trim(),
    property_type: els.propertyType.value,
    site_size: els.siteSize.value.trim(),
    interest: els.interest.value,
    contact: els.contact.value.trim(),
    phone: els.phone.value.trim(),
    email: els.email.value.trim(),
    status: els.status.value,
    order_received: els.order.checked || els.status.value === "Order received",
    notes: els.notes.value.trim(),
    updated_at: new Date().toISOString(),
  };

  if (!payload.company) return;

  if (hasSupabaseConfig()) {
    const endpoint = existingId ? `/clients?id=eq.${existingId}` : "/clients";
    const method = existingId ? "PATCH" : "POST";
    await supabaseRequest(endpoint, {
      method,
      body: JSON.stringify(payload),
      headers: { Prefer: "return=representation" },
    });
    await loadClients();
  } else {
    const clients = [...state.clients];
    if (existingId) {
      const index = clients.findIndex((client) => client.id === existingId);
      clients[index] = { ...clients[index], ...payload };
    } else {
      clients.unshift({ id: crypto.randomUUID(), ...payload });
    }
    state.clients = clients;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  }

  els.dialog.close();
  render();
}

async function deleteClient(id) {
  if (hasSupabaseConfig()) {
    await supabaseRequest(`/clients?id=eq.${id}`, { method: "DELETE" });
    await loadClients();
  } else {
    state.clients = state.clients.filter((client) => client.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.clients));
  }
  render();
}

async function supabaseRequest(path, options = {}) {
  const response = await fetch(`${state.config.url}/rest/v1${path}`, {
    ...options,
    headers: {
      apikey: state.config.key,
      Authorization: `Bearer ${state.config.key}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status}`);
  }

  if (response.status === 204) return [];
  return response.json();
}

function hasSupabaseConfig() {
  return Boolean(state.config.url && state.config.key);
}

function readConfig() {
  try {
    return JSON.parse(localStorage.getItem(CONFIG_KEY)) ?? {};
  } catch {
    return {};
  }
}

function hydrateSettingsForm() {
  els.supabaseUrl.value = state.config.url ?? "";
  els.supabaseKey.value = state.config.key ?? "";
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
