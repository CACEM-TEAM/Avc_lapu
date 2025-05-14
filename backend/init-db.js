const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function initializeDatabase() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'app_user',
    password: process.env.DB_PASS || 'app_password',
    database: process.env.DB_NAME || 'acv_demande',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    // Lire le fichier schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');

    // Exécuter le schéma
    await connection.query(schema);
    console.log('Base de données initialisée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

initializeDatabase().catch(console.error); 