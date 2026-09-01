// MACCAN RMS - SQLite Adapter
// Wraps sql.js to provide better-sqlite3 compatible API

class SqlJsAdapter {
  constructor(database) {
    this.db = database;
  }

  prepare(sql) {
    const db = this.db;
    return {
      get(...params) {
        try {
          const stmt = db.prepare(sql);
          if (params.length > 0) stmt.bind(params);
          if (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            stmt.free();
            const row = {};
            cols.forEach((col, i) => row[col] = vals[i]);
            return row;
          }
          stmt.free();
          return undefined;
        } catch (e) {
          console.error('SQL Error (get):', sql, e.message);
          throw e;
        }
      },
      all(...params) {
        try {
          const results = [];
          const stmt = db.prepare(sql);
          if (params.length > 0) stmt.bind(params);
          while (stmt.step()) {
            const cols = stmt.getColumnNames();
            const vals = stmt.get();
            const row = {};
            cols.forEach((col, i) => row[col] = vals[i]);
            results.push(row);
          }
          stmt.free();
          return results;
        } catch (e) {
          console.error('SQL Error (all):', sql, e.message);
          throw e;
        }
      },
      run(...params) {
        try {
          db.run(sql, params);
          const changes = db.getRowsModified();
          const lastId = db.exec("SELECT last_insert_rowid() as id");
          const lastInsertRowid = lastId.length > 0 ? lastId[0].values[0][0] : 0;
          return { changes, lastInsertRowid };
        } catch (e) {
          console.error('SQL Error (run):', sql, e.message);
          throw e;
        }
      }
    };
  }

  exec(sql) {
    try {
      this.db.exec(sql);
    } catch (e) {
      console.error('SQL Error (exec):', e.message);
      throw e;
    }
  }

  run(sql, params = []) {
    try {
      this.db.run(sql, params);
      const changes = this.db.getRowsModified();
      const lastId = this.db.exec("SELECT last_insert_rowid() as id");
      const lastInsertRowid = lastId.length > 0 ? lastId[0].values[0][0] : 0;
      return { changes, lastInsertRowid };
    } catch (e) {
      console.error('SQL Error (run):', sql, e.message);
      throw e;
    }
  }

  save() {
    const data = this.db.export();
    return Buffer.from(data);
  }
}

module.exports = SqlJsAdapter;
