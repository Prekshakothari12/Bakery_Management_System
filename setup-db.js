const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  let pool;
  try {
    console.log('Reading SQL script...');
    const sqlScript = fs.readFileSync(path.join(__dirname, 'bakery_db_setup.sql'), 'utf-8');
    
    // Try multiple connection configurations
    const configs = [
      { host: 'localhost', user: 'root', password: '1234', database: undefined },
      { host: '127.0.0.1', user: 'root', password: '1234', database: undefined },
      { host: 'localhost', user: 'root', password: '', database: undefined },
      { host: '127.0.0.1', user: 'root', password: '', database: undefined }
    ];
    
    let conn;
    for (const config of configs) {
      try {
        console.log(`Trying connection: ${config.host} / ${config.user}`);
        pool = mysql.createPool({
          ...config,
          waitForConnections: true,
          connectionLimit: 1,
        });
        const db = pool.promise();
        conn = await db.getConnection();
        console.log('✅ Connected to MySQL');
        break;
      } catch (err) {
        console.log(`❌ Failed: ${err.message}`);
        if (pool) pool.end();
      }
    }
    
    if (!conn) {
      throw new Error('Could not connect with any configuration. Is MySQL running?');
    }
    console.log('Connected to MySQL');
    
    // Split by semicolon but preserve them for execution
    const statements = sqlScript
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    
    
    console.log(`Found ${statements.length} statements to execute`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      try {
        if (i % 10 === 0) console.log(`[${i + 1}/${statements.length}]`);
        await conn.query(statement + ';');
        process.stdout.write('.');
      } catch (err) {
        // Some errors are expected (like DROP IF EXISTS or multiple view creation)
        if (!err.message.includes('already exists') && !err.message.includes('Duplicate')) {
          console.error(`\n⚠️  Error on statement ${i + 1}: ${err.message.slice(0, 100)}`);
        }
      }
    }
    
    console.log('\n✅ Database setup completed!');
    conn.release();
    pool.end();
    process.exit(0);
  } catch (err) {
    console.error('Setup failed:', err.message);
    if (pool) pool.end();
    process.exit(1);
  }
}

setupDatabase();
