const connectDB = require("./db.cjs");

const Order = require("./models/Order.cjs");
const Product = require("./models/Product.cjs");
const verifyAdmin = require("./_verifyAdmin.cjs");


let emailjs;
try {
  emailjs = require('@emailjs/nodejs');
} catch (e) {
  console.log('⚠️ @emailjs/nodejs yok, @emailjs/browser deneniyor...');
  try {
    emailjs = require('@emailjs/browser');
  } catch (e2) {
    console.error('❌ EmailJS yüklenemedi!');
    emailjs = null;
  }
}

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

const sendOrderEmail = async (order) => {
  try {
    const email = order.customer.email;
    
    if (!email) {
      console.error('❌ Email adresi boş!');
      return false;
    }

    // ⭐ ITEMS'İ HTML STRING OLARAK HAZIRLA
    let itemsHtml = '';
    if (order.items && Array.isArray(order.items) && order.items.length > 0) {
      order.items.forEach(item => {
        itemsHtml += `
          <div class="item">
            <span class="item-icon">🧁</span>
            <span class="item-name">${item.name || 'Ürün'}</span>
            <span class="item-qty">x${item.quantity || 1}</span>
          </div>
        `;
      });
    } else {
      itemsHtml = `
        <div class="item">
          <span class="item-icon">🧁</span>
          <span class="item-name">Ürün</span>
          <span class="item-qty">x1</span>
        </div>
      `;
    }

    // ⭐ DOWNLOAD LINK - Önce fileUrl'den al, yoksa downloadToken kullan
    let downloadLink = '#';
    
    if (order.items && order.items.length > 0) {
      const firstItem = order.items[0];
      if (firstItem.fileUrl && firstItem.fileUrl !== '') {
        downloadLink = firstItem.fileUrl;
        console.log('📦 File URL kullanılacak:', downloadLink);
      } else {
        downloadLink = order.downloadToken 
          ? `${process.env.VITE_SITE_URL || 'https://sleepypiebakery.art'}/download/${order.downloadToken}`
          : '#';
        console.log('📦 Download Token kullanılacak:', downloadLink);
      }
    }

    console.log('📧 Download Link:', downloadLink);

    const templateParams = {
      to_email: email,
      to_name: email.split('@')[0] || 'Misafir',
      order_number: order.orderNumber || 'SPB-XXXX',
      order_date: new Date(order.createdAt || Date.now()).toLocaleDateString('tr-TR'),
      items_html: itemsHtml,
      download_link: downloadLink,  // ⭐ GÜNCELLENDİ
      site_url: process.env.VITE_SITE_URL || 'https://sleepypiebakery.art'
    };

    console.log('📧 Template Params:', JSON.stringify(templateParams, null, 2));

    const response = await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      templateParams,
      {
        publicKey: process.env.EMAILJS_PUBLIC_KEY,
        privateKey: process.env.EMAILJS_PRIVATE_KEY
      }
    );

    console.log('✅ Email gönderildi!');
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