const connectDB = require("./db.cjs");
const Product = require("./models/Product.cjs");
const Order = require("./models/Order.cjs");
const verifyAdmin = require("./_verifyAdmin.cjs");

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    await connectDB();
  } catch (err) {
    console.error("❌ Stats - Bağlantı hatası:", err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Veritabanı bağlantısı başarısız",
        details: err.message 
      })
    };
  }

  const auth = verifyAdmin(event);
  if (!auth.valid) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Yetkisiz erişim" })
    };
  }

  try {
    const totalProducts = await Product.countDocuments({ active: true });
    const totalOrders = await Order.countDocuments();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalProducts,
        totalOrders,
        totalVisitors: 0
      })
    };
  } catch (err) {
    console.error("❌ Stats hatası:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};