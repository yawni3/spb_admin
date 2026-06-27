import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import "./Products.css";
import { useToast } from '../components/ToastProvider';

const emptyForm = {
  name: "",
  shortDescription: "",
  description: "",
  price: "",
  isFree: false,
  category: "",
  tags: "",
  bannerUrl: "",
  thumbnailUrl: "",
  previewImages: ["", "", ""],
  whatsIncluded: ["", "", ""],
  fileUrl: "",
  version: "",
  license: {
    personalUse: true,
    commercialUse: true,
    resaleAllowed: false
  }
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const token = localStorage.getItem("spb-admin-token");
  const headers = { Authorization: `Bearer ${token}` };

  const showToast = useToast();

  // ⭐ OneSignal Push Notification
  const sendPushNotification = async (productName, productSlug) => {
    try {
      // Environment değişkenlerini kontrol et
      const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
      const apiKey = import.meta.env.VITE_ONESIGNAL_REST_API_KEY;
      
      if (!appId || !apiKey) {
        return;
      }

      const response = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${apiKey}`
        },
        body: JSON.stringify({
          app_id: appId,
          included_segments: ['All'],
          headings: { 
            tr: ' Yeni Ürün!',
            en: ' New Product!'
          },
          contents: { 
            tr: `${productName} şimdi Sleepy Pie Bakery'de! 🧁`,
            en: `${productName} is now available at Sleepy Pie Bakery! 🧁`
          },
          url: `https://sleepypiebakery.art/product/${productSlug}`,
          data: { productSlug: productSlug },
          chrome_web_icon: 'https://sleepypiebakery.art/icon-192.png',
          ios_attachments: { 
            id: 'https://sleepypiebakery.art/icon-512.png' 
          }
        })
      });
      
      const result = await response.json();
      
      if (result.errors) {
        console.warn('⚠️ Push notification uyarısı:', result.errors);
        return;
      }
      return result;
    } catch (err) {
      console.error('❌ Push notification hatası:', err);
      // Bildirim hatası ana akışı bozmasın
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/products`);
      console.log("API RESPONSE:", res.data);
      setProducts(res.data);
    } catch (err) {
      console.error("Ürünler çekilemedi:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleEdit = (product) => {
    setEditingId(product._id);
    setForm({
      name: product.name || "",
      shortDescription: product.shortDescription || "",
      description: product.description || "",
      price: product.isFree ? "" : product.price || "",
      isFree: product.isFree || false,
      category: product.category || "",
      tags: product.tags ? product.tags.join(", ") : "",
      bannerUrl: product.bannerUrl || "",
      thumbnailUrl: product.thumbnailUrl || "",
      previewImages: product.previewImages?.length ? 
        [...product.previewImages, "", "", ""].slice(0, 3) : 
        ["", "", ""],
      whatsIncluded: product.whatsIncluded?.length ?
        [...product.whatsIncluded, "", "", ""].slice(0, 3) :
        ["", "", ""],
      fileUrl: product.fileUrl || "",
      version: product.version || "",
      license: product.license || {
        personalUse: true,
        commercialUse: true,
        resaleAllowed: false
      }
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        shortDescription: form.shortDescription,
        description: form.description,
        price: form.isFree ? 0 : Number(form.price) || 0,
        isFree: form.isFree,
        category: form.category,
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        bannerUrl: form.bannerUrl,
        thumbnailUrl: form.thumbnailUrl,
        previewImages: form.previewImages.filter(Boolean),
        whatsIncluded: form.whatsIncluded.filter(Boolean),
        fileUrl: form.fileUrl,
        version: form.version,
        license: form.license
      };

      let productSlug = '';

      if (editingId) {
        await axios.put(
          `${import.meta.env.VITE_API_URL}/products`,
          { id: editingId, ...payload },
          { headers }
        );
        showToast('✅ Ürün başarıyla güncellendi!', 'success');
      } else {
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/products`,
          payload,
          { headers }
        );
        productSlug = response.data.slug;
        showToast('🎉 Yeni ürün başarıyla eklendi!', 'success');
        
        // ⭐ YENİ ÜRÜN BİLDİRİMİ GÖNDER
        if (productSlug) {
          await sendPushNotification(payload.name, productSlug);
          showToast('📱 Kullanıcılara bildirim gönderildi!', 'success');
        }
      }

      setForm(emptyForm);
      setShowForm(false);
      setEditingId(null);
      fetchProducts();
    } catch (err) {
      showToast(`❌ ${err.response?.data?.error || 'Kaydetme hatası!'}`, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Bu ürünü silmek istediğinden emin misin?")) return;
    try {
      await axios.delete(
        `${import.meta.env.VITE_API_URL}/products?id=${id}`,
        { headers }
      );
      showToast('🗑️ Ürün başarıyla silindi!', 'success');
      fetchProducts();
    } catch (err) {
      showToast(`❌ ${err.response?.data?.error || 'Silme hatası!'}`, 'error');
      if (err.response?.status === 400) {
        alert("Ürün ID'si eksik!");
      } else if (err.response?.status === 401) {
        alert("Yetkisiz erişim! Tekrar giriş yapın.");
      } else {
        alert("Ürün silinirken bir hata oluştu!");
      }
    }
  };

  const handleCancel = () => {
    setForm(emptyForm);
    setShowForm(false);
    setEditingId(null);
  };

  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-main">
        <div className="admin-header">
          <div className="header-row">
            <h1>Ürünler 🛍️</h1>
            <button className="btn-add" onClick={() => setShowForm(!showForm)}>
              {showForm ? "✕ İptal" : "+ Ürün Ekle"}
            </button>
          </div>
        </div>

        {showForm && (
          <form className="product-form" onSubmit={handleSubmit}>
            <h2>{editingId ? "✏️ Ürün Düzenle" : "➕ Yeni Ürün"}</h2>

            {/* 🥐 BASIC INFO */}
            <div className="form-section">
              <h3>🥐 Basic Info</h3>
              <input
                placeholder="Ürün adı *"
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                required
              />
              <input
                placeholder="Kısa açıklama"
                value={form.shortDescription}
                onChange={e => setForm({...form, shortDescription: e.target.value})}
              />
              <textarea
                placeholder="Açıklama"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                rows={4}
              />
            </div>

            {/* 🍓 MARKET */}
            <div className="form-section">
              <h3>🍓 Market</h3>
              <select
                value={form.category}
                onChange={e => setForm({...form, category: e.target.value})}
              >
                <option value="">Kategori</option>
                <option value="asset-pack">Asset Pack</option>
                <option value="wallpaper">İllüstrasyon</option>
                <option value="app-game">App & Game</option>
                <option value="other">Diğer</option>
              </select>
              <input
                placeholder="Tags (pixel, cute, ui...)"
                value={form.tags}
                onChange={e => setForm({...form, tags: e.target.value})}
              />
              {form.category === "app-game" && (
                <input
                  placeholder="Version (v1.0.0)"
                  value={form.version}
                  onChange={e => setForm({...form, version: e.target.value})}
                />
              )}
              <div className="toggle-group">
                <label>Ücretsiz mi?</label>
                <div
                  className={`toggle ${form.isFree ? "on" : ""}`}
                  onClick={() => setForm({...form, isFree: !form.isFree})}
                >
                  {form.isFree ? "Ücretsiz" : "Ücretli"}
                </div>
              </div>
              {!form.isFree && (
                <input
                  type="number"
                  placeholder="Fiyat"
                  value={form.price}
                  onChange={e => setForm({...form, price: e.target.value})}
                />
              )}
            </div>

            {/* 🍰 MEDIA */}
            <div className="form-section">
              <h3>🍰 Media</h3>
              <input
                placeholder="Banner URL"
                value={form.bannerUrl}
                onChange={e => setForm({...form, bannerUrl: e.target.value})}
              />
              <input
                placeholder="Thumbnail URL"
                value={form.thumbnailUrl}
                onChange={e => setForm({...form, thumbnailUrl: e.target.value})}
              />
              {form.previewImages.map((url, i) => (
                <input
                  key={i}
                  placeholder={`Preview ${i + 1}`}
                  value={url}
                  onChange={e => {
                    const arr = [...form.previewImages];
                    arr[i] = e.target.value;
                    setForm({...form, previewImages: arr});
                  }}
                />
              ))}
            </div>

            {/* 🧁 COMMERCE */}
            <div className="form-section">
              <h3>🧁 Commerce</h3>
              <input
                placeholder="File URL"
                value={form.fileUrl}
                onChange={e => setForm({...form, fileUrl: e.target.value})}
              />
              {form.whatsIncluded.map((item, i) => (
                <input
                  key={i}
                  placeholder={`What's included ${i + 1}`}
                  value={item}
                  onChange={e => {
                    const arr = [...form.whatsIncluded];
                    arr[i] = e.target.value;
                    setForm({...form, whatsIncluded: arr});
                  }}
                />
              ))}
            </div>

            {/* ⭐ LICENSE */}
            <div className="form-section">
              <h3>📜 Lisans</h3>
              <div className="license-group">
                <label>
                  <input
                    type="checkbox"
                    checked={form.license.personalUse}
                    onChange={e => setForm({
                      ...form,
                      license: {...form.license, personalUse: e.target.checked}
                    })}
                  />
                  Kişisel Kullanım
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={form.license.commercialUse}
                    onChange={e => setForm({
                      ...form,
                      license: {...form.license, commercialUse: e.target.checked}
                    })}
                  />
                  Ticari Kullanım
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={form.license.resaleAllowed}
                    onChange={e => setForm({
                      ...form,
                      license: {...form.license, resaleAllowed: e.target.checked}
                    })}
                  />
                  Yeniden Satışa İzin Ver
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={handleCancel}>
                İptal
              </button>
              <button type="submit" className="btn-save">
                {editingId ? "💾 Güncelle" : "Kaydet 🍰"}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="loading">Yükleniyor... 🍰</p>
        ) : products.length === 0 ? (
          <p className="empty">Henüz ürün yok. İlk ürününü ekle! 🥧</p>
        ) : (
          <div className="products-grid">
            {products.map(p => (
              <div className="product-card" key={p._id}>
                {p.bannerUrl && <img src={p.bannerUrl} alt={p.name} className="card-banner" />}
                <div className="card-body">
                  {p.thumbnailUrl && <img src={p.thumbnailUrl} alt={p.name} className="card-thumb" />}
                  <div className="product-info">
                    <h3>{p.name}</h3>
                    <p className="product-cat">{p.category}</p>
                    <p className="product-price">
                      {p.isFree ? "🆓 Ücretsiz" : `${p.price}₺`}
                    </p>
                    <p className="product-slug">🔗 /{p.slug}</p>
                  </div>
                </div>
                <div className="card-actions">
                  <button className="btn-edit" onClick={() => handleEdit(p)}>
                    ✏️ Düzenle
                  </button>
                  <button className="btn-delete" onClick={() => handleDelete(p._id)}>
                    🗑️ Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Products;