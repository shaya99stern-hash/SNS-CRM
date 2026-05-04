const STORAGE_KEY = "sns-crm-clients";

const state = {
  clients: [],
  search: "",
};

const els = {
  totalCount: document.querySelector("#totalCount"),
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
      phone: "",
      email: "",
      status: "Had initial meeting",
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
    const open = () => openClientDialog(client);
    row.querySelector(".company-name").textContent = client.company;
    row.querySelector(".company-name").addEventListener("click", open);
    row.querySelector(".notes-cell").textContent = client.notes || "-";
    row.querySelector(".contact-cell").textContent = client.contact || "-";
    row.querySelector(".phone-cell").textContent = client.phone || "-";
    row.querySelector(".email-cell").textContent = client.email || "-";

    const status = row.querySelector(".status-pill");
    status.textContent = client.status || "Had initial meeting";
    status.classList.add(`status-${className(client.status || "Had initial meeting")}`);

    row.querySelector(".updated-cell").textContent = formatDate(client.updated_at);
    row.querySelector(".edit-btn").addEventListener("click", open);
    els.rows.append(row);
  });

  els.empty.hidden = clients.length > 0;
  els.totalCount.textContent = state.clients.length;
}

function filteredClients() {
  return state.clients.filter((client) => {
    const haystack = [
      client.company,
      client.contact,
      client.phone,
      client.email,
      client.status,
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
    notes: els.notes.value.trim(),
    updated_at: new Date().toISOString(),
  };

  if (!payload.company) return;

  const clients = [...state.clients];
  if (existingId) {
    const index = clients.findIndex((client) => client.id === existingId);
    clients[index] = { ...clients[index], ...payload };
  } else {
    clients.unshift({ id: crypto.randomUUID(), ...payload });
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
