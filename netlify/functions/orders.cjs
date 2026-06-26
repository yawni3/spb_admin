const connectDB = require("./db.cjs");
const Order = require("./models/Order.cjs");
const Product = require("./models/Product.cjs");
const verifyAdmin = require("./_verifyAdmin.cjs");

const emailjs = require('@emailjs/nodejs');

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

// ⭐ Mail gönderme fonksiyonu
const sendOrderEmail = async (order) => {
  try {
    // Ürün listesini hazırla
    const itemsList = order.items.map(item => 
      `${item.name} x${item.quantity}`
    ).join('\n');

    const templateParams = {
      to_email: order.customer.email,
      to_name: order.customer.email.split('@')[0],
      order_number: order.orderNumber,
      order_date: new Date(order.createdAt).toLocaleDateString('tr-TR'),
      items: itemsList,
      download_link: `${process.env.VITE_SITE_URL || 'https://sleepypiebakery.art'}/download/${order.downloadToken}`,
      site_url: process.env.VITE_SITE_URL || 'https://sleepypiebakery.art'
    };

    const response = await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      templateParams,
      {
        publicKey: process.env.EMAILJS_PUBLIC_KEY,
        privateKey: process.env.EMAILJS_PRIVATE_KEY
      }
    );

    console.log('✅ Email gönderildi:', response.status);
    return true;
  } catch (error) {
    console.error('❌ Email hatası:', error);
    return false;
  }
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    await connectDB();
  } catch (err) {
    console.error("❌ Bağlantı hatası:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Veritabanı bağlantısı başarısız" })
    };
  }

  const method = event.httpMethod;

  try {
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

    // ================= POST =================
    if (method === "POST") {
      try {
        const data = JSON.parse(event.body);
        console.log("📦 Gelen sipariş:", JSON.stringify(data, null, 2));

        // ⭐ Zorunlu alanları kontrol et
        if (!data.customer?.email) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Email adresi zorunludur" })
          };
        }

        if (!data.termsAccepted) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Kullanıcı sözleşmesini kabul etmelisiniz" })
          };
        }

        if (!data.kvkkAccepted) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "KVKK aydınlatma metnini kabul etmelisiniz" })
          };
        }

        if (!data.items?.length) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Sepet boş" })
          };
        }

        // ⭐ Ürünleri doğrula
        const validatedItems = [];

        for (const item of data.items) {
          const product = await Product.findById(item.productId);
          if (!product) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({ error: `Ürün bulunamadı: ${item.productId}` })
            };
          }

          if (!product.isFree) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ 
                error: `Ürün ücretli: ${product.name}. Şu anda sadece ücretsiz ürünler alınabilir.` 
              })
            };
          }

          if (!product.active) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: `Ürün aktif değil: ${product.name}` })
            };
          }

          const quantity = item.quantity || 1;

          validatedItems.push({
            productId: product._id,
            name: product.name,
            price: 0,
            quantity: quantity,
            thumbnailUrl: product.thumbnailUrl || '',
            fileUrl: product.fileUrl || ''
          });
        }

        // ⭐ Order Number oluştur (manuel)
        const generateOrderNumber = () => {
          const date = new Date();
          const year = date.getFullYear().toString().slice(-2);
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
          return `SPB-${year}${month}${day}-${random}`;
        };

        // ⭐ Download Token oluştur (manuel)
        const generateDownloadToken = (orderNumber) => {
          const crypto = require('crypto');
          return crypto
            .createHash('sha256')
            .update(`${orderNumber}-${Date.now()}-${Math.random()}`)
            .digest('hex')
            .substring(0, 32);
        };

        const orderNumber = generateOrderNumber();
        const downloadToken = generateDownloadToken(orderNumber);
        const downloadExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // ⭐ Siparişi oluştur
        const orderData = {
          customer: {
            email: data.customer.email.trim().toLowerCase()
          },
          items: validatedItems,
          total: 0,
          status: 'pending',
          paymentMethod: 'free',
          paymentStatus: 'pending',
          termsAccepted: data.termsAccepted,
          kvkkAccepted: data.kvkkAccepted,
          notes: data.notes || '',
          orderNumber: orderNumber, 
          downloadToken: downloadToken, 
          downloadExpiresAt: downloadExpiresAt 
        };

        console.log("📝 Sipariş verisi:", JSON.stringify(orderData, null, 2));

        const order = await Order.create(orderData);
        console.log("✅ Sipariş oluşturuldu:", order.orderNumber);

        // ⭐⭐⭐ MAİL GÖNDER ⭐⭐⭐
        const emailSent = await sendOrderEmail(order);
        
        if (emailSent) {
          order.mailSent = true;
          order.mailSentAt = new Date();
          order.status = 'completed';
          order.paymentStatus = 'paid';
          await order.save();
          console.log("✅ Mail gönderildi:", order.orderNumber);
        } else {
          order.mailError = 'Email gönderilemedi';
          await order.save();
          console.log("❌ Mail gönderilemedi:", order.orderNumber);
        }

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({
            order: order,
            message: emailSent 
              ? "Siparişiniz alındı! İndirme linkleri e-posta adresinize gönderildi. 📧"
              : "Siparişiniz alındı! Ancak mail gönderiminde sorun oluştu. Lütfen bizimle iletişime geçin.",
            mailSent: emailSent
          })
        };
      } catch (error) {
        console.error("❌ Sipariş oluşturma hatası:", error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: "Sipariş oluşturulamadı",
            details: error.message 
          })
        };
      }
    }

    // ================= DELETE =================
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

      const deleted = await Order.findByIdAndDelete(id);
      if (!deleted) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Sipariş bulunamadı" })
        };
      }

      console.log("✅ Sipariş silindi:", deleted.orderNumber);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: "Sipariş başarıyla silindi" })
      };
    }

    return methodNotAllowed(headers);
  } catch (err) {
    console.error("❌ Orders hatası:", err);
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