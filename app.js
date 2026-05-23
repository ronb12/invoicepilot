(() => {
  const app = document.querySelector("#app");
  const state = { clients: [], invoices: [], followups: [], stats: {} };
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  function formatDate(value) {
    return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  async function post(url, payload) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Request failed" }));
      throw new Error(error.error || "Request failed");
    }
    return response.json();
  }

  function renderCollection(items, mapper, emptyText) {
    return items.length ? items.map(mapper).join("") : `<div class="settings-note">${emptyText}</div>`;
  }

  function bindForms() {
    document.querySelector("#clientForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      await post("/api/clients", {
        name: String(form.get("name")),
        email: String(form.get("email")),
        segment: String(form.get("segment")),
      });
      event.currentTarget.reset();
      await load();
    });

    document.querySelector("#invoiceForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      await post("/api/invoices", {
        clientId: String(form.get("clientId")),
        invoiceCode: String(form.get("invoiceCode")),
        projectName: String(form.get("projectName")),
        amount: Number(form.get("amount")),
        dueDate: String(form.get("dueDate")),
        status: String(form.get("status")),
      });
      event.currentTarget.reset();
      await load();
    });

    document.querySelector("#followupForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      await post("/api/followups", {
        invoiceId: String(form.get("invoiceId")),
        channel: String(form.get("channel")),
        status: String(form.get("status")),
        scheduledFor: String(form.get("scheduledFor")),
        note: String(form.get("note")),
      });
      event.currentTarget.reset();
      await load();
    });
  }

  function render() {
    app.innerHTML = `
      <section class="dashboard">
        <article>
          <span class="kpi">${money.format(state.stats.openAmount || 0)}</span>
          <h2>Open Invoices</h2>
          <p>Total value not yet marked paid.</p>
        </article>
        <article>
          <span class="kpi">${money.format(state.stats.expectedThisWeek || 0)}</span>
          <h2>Expected This Week</h2>
          <p>Currently based on sent invoices.</p>
        </article>
        <article>
          <span class="kpi">${state.stats.pendingInvoices || 0}</span>
          <h2>Pending Invoices</h2>
          <p>Invoices still waiting to be sent or chased.</p>
        </article>
        <article>
          <span class="kpi">${state.stats.queuedFollowups || 0}</span>
          <h2>Queued Follow-ups</h2>
          <p>Reminder tasks still in motion.</p>
        </article>
      </section>
      <section class="settings-note">
        <h2>Clients</h2>
        <form id="clientForm" style="display:grid;gap:10px">
          <div style="display:grid;gap:10px;grid-template-columns:1fr 1fr">
            <input name="name" placeholder="Client name" required>
            <input name="email" placeholder="Billing email" required>
          </div>
          <input name="segment" placeholder="Segment" required>
          <button type="submit">Add client</button>
        </form>
        ${renderCollection(
          state.clients,
          (client) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #ebeef7"><div><b>${client.name}</b><div>${client.email}</div></div><div>${client.segment}</div></div>`,
          "No clients yet."
        )}
      </section>
      <section class="settings-note">
        <h2>Invoices</h2>
        <form id="invoiceForm" style="display:grid;gap:10px">
          <select name="clientId">${state.clients.map((client) => `<option value="${client.id}">${client.name}</option>`).join("")}</select>
          <div style="display:grid;gap:10px;grid-template-columns:1fr 1fr">
            <input name="invoiceCode" placeholder="Invoice code" required>
            <input name="projectName" placeholder="Project name" required>
          </div>
          <div style="display:grid;gap:10px;grid-template-columns:1fr 1fr 1fr">
            <input name="amount" type="number" min="0" placeholder="Amount" required>
            <input name="dueDate" type="date" required>
            <select name="status"><option>Pending</option><option>Sent</option><option>Paid</option></select>
          </div>
          <button type="submit">Create invoice</button>
        </form>
        ${renderCollection(
          state.invoices,
          (invoice) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #ebeef7"><div><b>${invoice.invoice_code}</b><div>${invoice.client_name} • ${invoice.project_name}</div></div><div>${money.format(invoice.amount)} • ${invoice.status} • due ${formatDate(invoice.due_date)}</div></div>`,
          "No invoices yet."
        )}
      </section>
      <section class="settings-note">
        <h2>Follow-ups</h2>
        <form id="followupForm" style="display:grid;gap:10px">
          <select name="invoiceId">${state.invoices.map((invoice) => `<option value="${invoice.id}">${invoice.invoice_code}</option>`).join("")}</select>
          <div style="display:grid;gap:10px;grid-template-columns:1fr 1fr 1fr">
            <select name="channel"><option>Email</option><option>SMS</option><option>Call</option></select>
            <select name="status"><option>Queued</option><option>Prepared</option><option>Done</option></select>
            <input name="scheduledFor" type="date" required>
          </div>
          <input name="note" placeholder="Reminder note" required>
          <button type="submit">Log follow-up</button>
        </form>
        ${renderCollection(
          state.followups,
          (item) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #ebeef7"><div><b>${item.invoice_code}</b><div>${item.note}</div></div><div>${item.channel} • ${item.status} • ${formatDate(item.scheduled_for)}</div></div>`,
          "No follow-ups yet."
        )}
      </section>
    `;
    bindForms();
  }

  async function load() {
    app.innerHTML = '<div class="settings-note">Refreshing billing workspace...</div>';
    const response = await fetch("/api/bootstrap");
    if (!response.ok) {
      throw new Error("Failed to load InvoicePilot");
    }
    const payload = await response.json();
    state.clients = payload.clients;
    state.invoices = payload.invoices;
    state.followups = payload.followups;
    state.stats = payload.stats;
    render();
  }

  load().catch((error) => {
    app.innerHTML = `<div class="settings-note">InvoicePilot could not load: ${error.message}</div>`;
  });
})();
