const { ensureSchema, getSql, json, readBody, seed } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const payload = await readBody(req);
    if (!payload.invoiceId || !payload.channel || !payload.status || !payload.scheduledFor || !payload.note) {
      json(res, 400, { error: "Missing required fields" });
      return;
    }
    const sql = getSql();
    await ensureSchema(sql);
    await seed(sql);
    const [followup] = await sql`
      INSERT INTO followups (invoice_id, channel, status, scheduled_for, note)
      VALUES (
        ${payload.invoiceId},
        ${payload.channel},
        ${payload.status},
        ${payload.scheduledFor},
        ${payload.note}
      )
      RETURNING *
    `;
    json(res, 201, { followup });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
};
