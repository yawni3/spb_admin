const jwt = require("jsonwebtoken");

module.exports = function verifyAdmin(event) {
  try {
    const auth = event.headers.authorization || event.headers.Authorization;

    if (!auth) {
      return { valid: false };
    }

    if (!auth.startsWith('Bearer ')) {
      return { valid: false };
    }

    const token = auth.split(" ")[1];

    if (!token) {
      return { valid: false };
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET env değişkeni eksik!"); 
      return { valid: false };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
 

    return { valid: true, admin: decoded };
  } catch (error) {
    return { valid: false };
  }
};