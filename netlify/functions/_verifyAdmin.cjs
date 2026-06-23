const jwt = require("jsonwebtoken");

module.exports = function verifyAdmin(event) {
  try {
    const auth = event.headers.authorization || event.headers.Authorization;

    if (!auth) {
      console.log("Authorization header yok");
      return { valid: false };
    }

    // "Bearer " prefix'ini kontrol et
    if (!auth.startsWith('Bearer ')) {
      console.log("Authorization header Bearer ile başlamıyor");
      return { valid: false };
    }

    const token = auth.split(" ")[1];

    if (!token) {
      console.log("Token bulunamadı");
      return { valid: false };
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET env değişkeni eksik");
      return { valid: false };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token doğrulandı:", decoded);

    return { valid: true, admin: decoded };
  } catch (error) {
    console.error("Token doğrulama hatası:", error.message);
    return { valid: false };
  }
};