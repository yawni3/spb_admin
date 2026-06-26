const mongoose = require('mongoose');

// Global cache
let isConnected = false;

async function connectDB() {
  // Zaten bağlıysa
  if (isConnected) {
    console.log("✅ MongoDB zaten bağlı");
    return;
  }

  const MONGODB_URI = process.env.MONGODB_URI;
  
  if (!MONGODB_URI) {
    throw new Error('❌ MONGODB_URI env değişkeni tanımlı değil!');
  }

  console.log("🔄 MongoDB bağlanıyor...");

  try {
    // ⭐ Eğer zaten bağlı bir connection varsa kullan
    if (mongoose.connection.readyState === 1) {
      console.log("✅ MongoDB zaten bağlı (mevcut connection)");
      isConnected = true;
      return;
    }

    // ⭐ YENİ BAĞLANTI
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      family: 4,
      maxPoolSize: 10,
      minPoolSize: 1,
      retryWrites: true,
      retryReads: true,
    });

    isConnected = true;
    console.log("✅ MongoDB bağlantısı başarılı!");
    
    // ⭐ databaseName'i güvenli oku
    if (mongoose.connection && mongoose.connection.db) {
      console.log("📊 Database:", mongoose.connection.db.databaseName || 'unknown');
    }
    
    return;
  } catch (error) {
    console.error("❌ MongoDB bağlantı hatası:", error.message);
    isConnected = false;
    throw error;
  }
}

module.exports = connectDB;