const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Read DATABASE_URL from .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const dbUrlMatch = envContent.match(/DATABASE_URL="(.+)"/);

if (!dbUrlMatch) {
  console.error("❌ DATABASE_URL not found in .env");
  process.exit(1);
}

const uri = dbUrlMatch[1];
console.log("Using DATABASE_URL from .env (password hidden)");

async function testConnection() {
  const client = new MongoClient(uri);
  
  try {
    console.log("Connecting to MongoDB...");
    await client.connect();
    console.log("✅ Connected successfully!");
    
    // Test ping
    const result = await client.db("admin").command({ ping: 1 });
    console.log("✅ Ping successful:", result);
    
    // List databases
    const admin = client.db().admin();
    const databases = await admin.listDatabases();
    console.log("✅ Databases:", databases.databases.map(db => db.name));
    
    // Check if we can access the target database
    const db = client.db("stockly");
    const collections = await db.listCollections().toArray();
    console.log("✅ Collections in stockly db:", collections.map(c => c.name));
    
    await client.close();
    console.log("✅ Connection closed");
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.codeName) {
      console.error("   Code:", error.codeName);
    }
    process.exit(1);
  }
}

testConnection();