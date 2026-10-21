const EmbeddedPostgres = require('embedded-postgres').default;
const path = require('path');
const { Client } = require('pg');

const PORT = parseInt(process.env.DB_PORT || '5433', 10);
const DB_NAME = 'mezon_sprint_os';
const DB_USER = 'postgres';
const DB_PASSWORD = 'password';
const DB_DIR = path.resolve(__dirname, '..', '.pgdata');

const pg = new EmbeddedPostgres({
  port: PORT,
  databaseDir: DB_DIR,
  user: DB_USER,
  password: DB_PASSWORD,
  persistent: true,
});

async function ensureDatabaseExists() {
  const client = new Client({
    user: DB_USER,
    password: DB_PASSWORD,
    host: '127.0.0.1',
    port: PORT,
    database: 'postgres',
  });

  try {
    await client.connect();
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [DB_NAME]);
    if (res.rowCount === 0) {
      console.log(`Creating database ${DB_NAME}...`);
      await client.query(`CREATE DATABASE "${DB_NAME}"`);
      console.log(`Database ${DB_NAME} created successfully.`);
    } else {
      console.log(`Database ${DB_NAME} already exists.`);
    }
  } catch (err) {
    console.error('Error ensuring database exists:', err);
  } finally {
    await client.end();
  }
}

async function start() {
  console.log(`Starting Embedded PostgreSQL on port ${PORT}...`);
  try {
    await pg.initialise();
  } catch {
    // Already initialized
  }
  await pg.start();
  console.log(`PostgreSQL is running on port ${PORT}.`);
  await ensureDatabaseExists();

  const connectionString = `postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${PORT}/${DB_NAME}?schema=public`;
  console.log(`DATABASE_URL=${connectionString}`);
  return connectionString;
}

if (require.main === module) {
  start()
    .then(() => {
      console.log('PostgreSQL ready. Press Ctrl+C to stop.');
      process.on('SIGINT', async () => {
        console.log('Stopping PostgreSQL...');
        await pg.stop();
        process.exit(0);
      });
      process.on('SIGTERM', async () => {
        await pg.stop();
        process.exit(0);
      });
    })
    .catch((err) => {
      console.error('Failed to start PostgreSQL:', err);
      process.exit(1);
    });
}

module.exports = { pg, start, PORT, DB_NAME, DB_USER, DB_PASSWORD };
