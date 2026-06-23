const connectDB = require("./db.cjs");
const Product = require("./models/Product.cjs");
const verifyAdmin = require("./_verifyAdmin.cjs");

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  await connectDB();

  const method = event.httpMethod;

  try {
    // ================= GET =================
    if (method === "GET") {
      const id = event.queryStringParameters?.id;

      if (id) {
        const product = await Product.findById(id);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(product)
        };
      }

      const products = await Product.find({ active: true }).sort({ createdAt: -1 });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(products)
      };
    }

    // ================= CREATE =================
    if (method === "POST") {
      const auth = verifyAdmin(event);
      if (!auth.valid) return unauthorized(headers);

      const data = JSON.parse(event.body);

      const product = await Product.create(data);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(product)
      };
    }

    // ================= UPDATE =================
    if (method === "PUT") {
      const auth = verifyAdmin(event);
      if (!auth.valid) return unauthorized(headers);

      const { id, ...data } = JSON.parse(event.body);

      const updated = await Product.findByIdAndUpdate(id, data, {
        new: true
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updated)
      };
    }

    // ================= DELETE =================
    if (method === "DELETE") {
      const auth = verifyAdmin(event);
      if (!auth.valid) return unauthorized(headers);

      const id = event.queryStringParameters?.id;

      await Product.findByIdAndDelete(id);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Deleted" })
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