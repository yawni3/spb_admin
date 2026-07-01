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
  const API_URL = import.meta.env.VITE_API_URL;

  const showToast = useToast();

  // ⭐ Cache temizleme fonksiyonu
  const clearProductCache = () => {
    sessionStorage.removeItem('spb_products');
    console.log('🗑️ Ürün cache\'i temizlendi');
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/products`);
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

      if (editingId) {
        await axios.put(
          `${API_URL}/products`,
          { id: editingId, ...payload },
          { headers }
        );
        showToast('✅ Ürün başarıyla güncellendi!', 'success');
        // ⭐ Güncelleme sonrası cache temizle
        clearProductCache();
      } else {
        const response = await axios.post(
          `${API_URL}/products`,
          payload,
          { headers }
        );
        const productSlug = response.data.slug;
        showToast('🎉 Yeni ürün başarıyla eklendi!', 'success');
        // ⭐ Yeni ürün sonrası cache temizle
        clearProductCache();
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
        `${API_URL}/products?id=${id}`,
        { headers }
      );
      showToast('🗑️ Ürün başarıyla silindi!', 'success');
      // ⭐ Silme sonrası cache temizle
      clearProductCache();
      fetchProducts();
    } catch (err) {
      showToast(`❌ ${err.response?.data?.error || 'Silme hatası!'}`, 'error');
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