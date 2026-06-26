
// test-order.js
const testOrder = {
  customer: { email: "test@example.com" },
  items: [{ 
    productId: "6a3b044762cf89c4530637f7", // ⭐ BURAYA GERÇEK ÜRÜN ID'Sİ YAZ
    quantity: 1 
  }],
  termsAccepted: true,
  kvkkAccepted: true
};

fetch('http://localhost:8888/.netlify/functions/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testOrder)
})
.then(res => res.json())
.then(data => {
  console.log('✅ Sipariş:', data);
  if (data.order) {
    console.log('📦 Order Number:', data.order.orderNumber);
    console.log('📦 Status:', data.order.status);
  }
})
.catch(err => console.error('❌ Hata:', err));