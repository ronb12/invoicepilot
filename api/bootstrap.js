const { ensureSchema, getSql, json, seed } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const sql = getSql();
    await ensureSchema(sql);
    await seed(sql);

    const [clients, invoices, followups] = await Promise.all([
      sql`SELECT * FROM clients ORDER BY created_at DESC`,
      sql`
        SELECT invoices.*, clients.name AS client_name
        FROM invoices
        LEFT JOIN clients ON clients.id = invoices.client_id
        ORDER BY due_date ASC, invoices.created_at DESC
      `,
      sql`
        SELECT followups.*, invoices.invoice_code
        FROM followups
        LEFT JOIN invoices ON invoices.id = followups.invoice_id
        ORDER BY scheduled_for ASC, followups.created_at DESC
      `,
    ]);

    const openAmount = invoices
      .filter((invoice) => invoice.status !== "Paid")
      .reduce((sum, invoice) => sum + Number(invoice.amount), 0);
    const expectedThisWeek = invoices
      .filter((invoice) => invoice.status === "Sent")
      .reduce((sum, invoice) => sum + Number(invoice.amount), 0);

    json(res, 200, {
      clients,
      invoices,
      followups,
      stats: {
        openAmount,
        expectedThisWeek,
        pendingInvoices: invoices.filter((invoice) => invoice.status === "Pending").length,
        queuedFollowups: followups.filter((entry) => entry.status !== "Done").length,
      },
    });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
};
