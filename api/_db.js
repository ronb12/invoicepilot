const { neon } = require("@neondatabase/serverless");

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }
  return neon(process.env.DATABASE_URL);
}

async function ensureSchema(sql) {
  await sql`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`;
  await sql`
    CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      segment TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
      invoice_code TEXT NOT NULL,
      project_name TEXT NOT NULL,
      amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
      due_date DATE NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS followups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
      channel TEXT NOT NULL,
      status TEXT NOT NULL,
      scheduled_for DATE NOT NULL,
      note TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function seed(sql) {
  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM clients`;
  if (count > 0) {
    return;
  }

  const clients = await sql`
    INSERT INTO clients (name, email, segment)
    VALUES
      ('Bradley Studio', 'billing@bradleystudio.example', 'Creative'),
      ('Amara Spa', 'owner@amaraspa.example', 'Beauty')
    RETURNING id, name
  `;

  const invoices = await sql`
    INSERT INTO invoices (client_id, invoice_code, project_name, amount, due_date, status)
    VALUES
      (${clients[0].id}, 'INV-2048', 'Website Refresh', 2450, CURRENT_DATE + 4, 'Pending'),
      (${clients[1].id}, 'INV-2054', 'Deposit Invoice', 820, CURRENT_DATE + 7, 'Sent')
    RETURNING id
  `;

  await sql`
    INSERT INTO followups (invoice_id, channel, status, scheduled_for, note)
    VALUES
      (${invoices[0].id}, 'Email', 'Queued', CURRENT_DATE + 1, 'Send first reminder with payment link.'),
      (${invoices[1].id}, 'SMS', 'Prepared', CURRENT_DATE + 2, 'Confirm expected payment date.')
  `;
}

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

module.exports = { ensureSchema, getSql, json, readBody, seed };
