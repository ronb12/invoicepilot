(() => {
  const key = "invoicepilot-v1";
  const state = JSON.parse(localStorage.getItem(key) || "null") || {
    invoices: [
      { id: crypto.randomUUID(), client: "Bradley Studio", project: "Website Refresh", amount: 2450, status: "Pending", due: "2026-05-20" },
      { id: crypto.randomUUID(), client: "Amara Spa", project: "Deposit Invoice", amount: 820, status: "Sent", due: "2026-05-25" },
    ],
    currentId: "",
  };
  if (!state.currentId) state.currentId = state.invoices[0].id;
  const save = () => localStorage.setItem(key, JSON.stringify(state));

  const toast = document.querySelector("#toast");
  const card = document.querySelector(".invoice-card");
  const dashboard = document.querySelector(".dashboard");
  const statusEl = document.querySelector("#invoiceStatus");
  const bar = document.querySelector("#progressBar");
  const settings = document.querySelector(".settings-note");

  settings.insertAdjacentHTML("afterend", `
    <section class="settings-note">
      <h2>Create Invoice</h2>
      <form id="invoiceForm" style="display:grid;gap:10px;max-width:520px">
        <input name="client" placeholder="Client" required style="padding:11px 12px;border-radius:12px;border:1px solid #cfd5ec">
        <input name="project" placeholder="Project" required style="padding:11px 12px;border-radius:12px;border:1px solid #cfd5ec">
        <div style="display:grid;gap:10px;grid-template-columns:1fr 1fr">
          <input name="amount" type="number" min="0" placeholder="Amount" required style="padding:11px 12px;border-radius:12px;border:1px solid #cfd5ec">
          <input name="due" type="date" required style="padding:11px 12px;border-radius:12px;border:1px solid #cfd5ec">
        </div>
        <button type="submit" style="padding:11px 12px;border:none;border-radius:12px;background:#1f2f77;color:#fff;font-weight:700">Save Invoice</button>
      </form>
    </section>`);

  function currentInvoice() {
    return state.invoices.find((invoice) => invoice.id === state.currentId) || state.invoices[0];
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 1700);
  }

  function progressWidth(status) {
    return status === "Paid" ? "100%" : status === "Sent" ? "68%" : "24%";
  }

  function render() {
    const current = currentInvoice();
    card.querySelector("span").textContent = current.id.slice(0, 8).toUpperCase();
    card.querySelector("h2").textContent = current.project;
    card.querySelector("p").textContent = `Due ${current.due}`;
    card.querySelector(".total b").textContent = `$${current.amount.toLocaleString()}`;
    statusEl.textContent = current.status;
    bar.style.width = progressWidth(current.status);

    const openTotal = state.invoices.filter((invoice) => invoice.status !== "Paid").reduce((sum, invoice) => sum + invoice.amount, 0);
    const expected = state.invoices.filter((invoice) => invoice.status === "Sent").reduce((sum, invoice) => sum + invoice.amount, 0);
    const followups = state.invoices.filter((invoice) => invoice.status === "Pending").length;
    dashboard.innerHTML = `
      <article><span class="kpi">$${openTotal.toLocaleString()}</span><h2>Open Invoices</h2><p>${state.invoices.length} invoices tracked locally.</p></article>
      <article><span class="kpi">$${expected.toLocaleString()}</span><h2>Expected This Week</h2><p>Forecast based on sent invoices.</p></article>
      <article><span class="kpi">${followups}</span><h2>Follow-ups Due</h2><p>Pending invoices still need a send action.</p></article>
      <article style="grid-column:1/-1"><h2>Invoice Queue</h2>${state.invoices.map((invoice) => `<div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #ebeef7"><div><b>${invoice.client}</b><div>${invoice.project}</div></div><div>$${invoice.amount.toLocaleString()} • ${invoice.status}</div><button data-open="${invoice.id}" style="border:none;border-radius:10px;padding:8px 12px;background:#edf2ff;cursor:pointer">Open</button></div>`).join("")}</article>
    `;

    dashboard.querySelectorAll("[data-open]").forEach((button) => button.addEventListener("click", () => {
      state.currentId = button.dataset.open;
      render();
    }));
    save();
  }

  document.querySelector("#sendInvoice").addEventListener("click", () => {
    currentInvoice().status = "Sent";
    render();
    showToast("Invoice sent and reminder path prepared.");
  });

  document.querySelector("#markPaid").addEventListener("click", () => {
    currentInvoice().status = "Paid";
    render();
    showToast("Invoice marked paid.");
  });

  document.querySelector("#invoiceForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const invoice = {
      id: crypto.randomUUID(),
      client: String(form.get("client")),
      project: String(form.get("project")),
      amount: Number(form.get("amount")),
      due: String(form.get("due")),
      status: "Pending",
    };
    state.invoices.unshift(invoice);
    state.currentId = invoice.id;
    render();
    showToast(`Invoice saved for ${invoice.client}.`);
  });

  render();
})();
