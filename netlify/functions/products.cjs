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

  // ⭐ BAĞLAN - BAŞARISIZ OLURSA HATA DÖN
  try {
    await connectDB();
    console.log("✅ Products - İşlem hazır");
  } catch (err) {
    console.error("❌ Products - Bağlantı hatası:", err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: "Veritabanı bağlantısı başarısız",
        details: err.message,
        hint: "MongoDB URI ve network ayarlarını kontrol et"
      })
    };
  }

  const method = event.httpMethod;

  try {
    if (method === "GET") {
      const id = event.queryStringParameters?.id;

      if (id) {
        const product = await Product.findById(id);
        if (!product) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: "Ürün bulunamadı" })
          };
        }
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

    if (method === "POST") {
      const auth = verifyAdmin(event);
      if (!auth.valid) return unauthorized(headers);

      const data = JSON.parse(event.body);
      
      if (!data.slug) {
        const baseSlug = data.name
          ? data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
          : `product-${Date.now()}`;
        data.slug = baseSlug;
      }

      try {
        const product = await Product.create(data);
        console.log("✅ Ürün oluşturuldu:", product.name);
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(product)
        };
      } catch (createError) {
        if (createError.code === 11000) {
          const baseSlug = data.name
            ? data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
            : 'product';
          data.slug = `${baseSlug}-${Date.now()}`;
          const product = await Product.create(data);
          return {
            statusCode: 201,
            headers,
            body: JSON.stringify(product)
          };
        }
        throw createError;
      }
    }

    if (method === "PUT") {
      const auth = verifyAdmin(event);
      if (!auth.valid) return unauthorized(headers);

      const { id, ...data } = JSON.parse(event.body);

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "ID gerekli" })
        };
      }

      const updated = await Product.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true
      });

      if (!updated) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Ürün bulunamadı" })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updated)
      };
    }

    if (method === "DELETE") {
      const auth = verifyAdmin(event);
      if (!auth.valid) return unauthorized(headers);

      const id = event.queryStringParameters?.id;

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "ID gerekli" })
        };
      }

      const deleted = await Product.findByIdAndDelete(id);
      if (!deleted) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Ürün bulunamadı" })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Ürün başarıyla silindi" })
      };
    }

    return methodNotAllowed(headers);
  } catch (err) {
    console.error("❌ Products hatası:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: err.message,
        stack: err.stack
      })
    };
  }
};

function unauthorized(headers) {
  return {
    statusCode: 401,
    headers,
    body: JSON.stringify({ error: "Yetkisiz erişim" })
  };
}

function methodNotAllowed(headers) {
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: "Method not allowed" })
  };
}