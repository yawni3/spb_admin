const connectDB = require("./db.cjs");
const Order = require("./models/Order.cjs");
const Product = require("./models/Product.cjs");
const verifyAdmin = require("./_verifyAdmin.cjs");

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  await connectDB();

  try {
    const method = event.httpMethod;

    // ================= GET (admin only) =================
    if (method === "GET") {
      const auth = verifyAdmin(event);
      if (!auth.valid) return unauthorized(headers);

      const orders = await Order.find().sort({ createdAt: -1 });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(orders)
      };
    }

    // ================= CREATE (public checkout) =================
    if (method === "POST") {
      const { customerEmail, productIds } = JSON.parse(event.body);

      const products = await Product.find({
        _id: { $in: productIds }
      });

      const snapshot = products.map(p => ({
        productId: p._id,
        name: p.name,
        price: p.price,
        fileUrl: p.fileUrl
      }));

      const totalPrice = products.reduce((s, p) => s + (p.price || 0), 0);

      const order = await Order.create({
        customerEmail,
        products: snapshot,
        totalPrice
      });

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(order)
      };
    }

    return methodNotAllowed(headers);
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};

function unauthorized(headers) {
  return {
    statusCode: 401,
    headers,
    body: JSON.stringify({ error: "Unauthorized" })
  };
}

function methodNotAllowed(headers) {
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: "Method not allowed" })
  };
}