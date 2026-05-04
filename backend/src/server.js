'use strict';
const { openDatabase } = require('./db/database');
const { createApp } = require('./app');
const config = require('./config');

const db = openDatabase(config.dbPath);
const app = createApp(db);
const port = process.env.PORT || 4000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Codegraph backend listening on http://localhost:${port}`);
});
