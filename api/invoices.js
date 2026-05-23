const { ensureSchema, getSql, json, readBody, seed } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const payload = await readBody(req);
    if (!payload.clientId || !payload.invoiceCode || !payload.projectName || !payload.dueDate || payload.amount == null || !payload.status) {
      json(res, 400, { error: "Missing required fields" });
      return;
    }
    const sql = getSql();
    await ensureSchema(sql);
    await seed(sql);
    const [invoice] = await sql`
      INSERT INTO invoices (client_id, invoice_code, project_name, amount, due_date, status)
      VALUES (
        ${payload.clientId},
        ${payload.invoiceCode},
        ${payload.projectName},
        ${Number(payload.amount)},
        ${payload.dueDate},
        ${payload.status}
      )
      RETURNING *
    `;
    json(res, 201, { invoice });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
};
