const connectDB = require("./db.cjs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("./models/Admin.cjs");

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    await connectDB();
    console.log("MongoDB bağlantısı başarılı");

    const { email, password } = JSON.parse(event.body || "{}");

    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Email ve şifre gerekli" })
      };
    }

    const admin = await Admin.findOne({ email });
    console.log("Admin bulundu:", admin ? "Evet" : "Hayır");

    if (!admin) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Hatalı email veya şifre" })
      };
    }

    const isValid = await bcrypt.compare(password, admin.password);
    console.log("Şifre doğrulandı:", isValid);

    if (!isValid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Hatalı email veya şifre" })
      };
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET env değişkeni eksik!");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Sunucu yapılandırma hatası" })
      };
    }

    const token = jwt.sign(
      {
        adminId: admin._id,
        email: admin.email
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        token,
        admin: {
          id: admin._id,
          email: admin.email
        }
      })
    };
  } catch (err) {
    console.error("Admin login hatası:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};