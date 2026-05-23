const { ensureSchema, getSql, json, readBody, seed } = require("./_db");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const payload = await readBody(req);
    if (!payload.name || !payload.email || !payload.segment) {
      json(res, 400, { error: "Missing required fields" });
      return;
    }
    const sql = getSql();
    await ensureSchema(sql);
    await seed(sql);
    const [client] = await sql`
      INSERT INTO clients (name, email, segment)
      VALUES (${payload.name}, ${payload.email}, ${payload.segment})
      RETURNING *
    `;
    json(res, 201, { client });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
};
