import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import "./Products.css";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  isFree: false,
  category: "",
  bannerUrl: "",
  thumbnailUrl: "",
  previewImages: ["", "", ""],
  fileUrl: "",
  version: ""
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const token = localStorage.getItem("spb-admin-token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/products`);
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        price: form.isFree ? 0 : Number(form.price),
        previewImages: form.previewImages.filter(url => url.trim() !== "")
      };
      await axios.post(`${import.meta.env.VITE_API_URL}/products`, payload, { headers });
      setForm(emptyForm);
      setShowForm(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Bu ürünü silmek istediğinden emin misin?")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/products/${id}`, { headers });
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
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

            {/* BANNER ÖNİZLEME */}
            {form.bannerUrl && (
              <div className="banner-preview">
                <img src={form.bannerUrl} alt="banner" />
              </div>
            )}

            <div className="form-grid">
              {/* SOL — thumbnail */}
              <div className="form-group">
                <label>Thumbnail URL</label>
                <input
                  value={form.thumbnailUrl}
                  onChange={e => setForm({...form, thumbnailUrl: e.target.value})}
                  placeholder="https://imgur.com/..."
                />
                {form.thumbnailUrl && (
                  <img src={form.thumbnailUrl} alt="thumb" className="thumb-preview" />
                )}
              </div>

              {/* SAĞ — isim, kategori, fiyat */}
              <div className="form-group">
                <label>Ürün Adı *</label>
                <input
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
              <label>Kategori</label>
             <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
             <option value="">Seç...</option>
             <option value="asset-pack">Asset Pack</option>
             <option value="wallpaper">İllüstrasyon</option>
             <option value="app-game">App & Game</option>
             <option value="other">Diğer</option>
           </select>
          </div>

       {form.category === "app-game" && (
            <div className="form-group">
          <label>Sürüm</label>
         <input
         value={form.version}
         onChange={e => setForm({...form, version: e.target.value})}
         placeholder="v1.0.0"
         />
       </div>
      )}

              {/* ÜCRETSİZ TOGGLE */}
              <div className="form-group toggle-group">
                <label>Ücretsiz mi?</label>
                <div
                  className={`toggle ${form.isFree ? "on" : ""}`}
                  onClick={() => setForm({...form, isFree: !form.isFree})}
                >
                  <span>{form.isFree ? "Ücretsiz" : "Ücretli"}</span>
                </div>
              </div>

              {!form.isFree && (
                <div className="form-group">
                  <label>Fiyat (₺)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={e => setForm({...form, price: e.target.value})}
                    required={!form.isFree}
                  />
                </div>
              )}

              {/* BANNER */}
              <div className="form-group full">
                <label>Banner URL (geniş görsel)</label>
                <input
                  value={form.bannerUrl}
                  onChange={e => setForm({...form, bannerUrl: e.target.value})}
                  placeholder="https://imgur.com/..."
                />
              </div>

              {/* AÇIKLAMA */}
              <div className="form-group full">
                <label>Açıklama</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  rows={4}
                />
              </div>

              {/* ÖNİZLEME GÖRSELLERİ */}
              <div className="form-group full">
                <label>Önizleme Görselleri (max 3)</label>
                <div className="preview-inputs">
                  {form.previewImages.map((url, i) => (
                    <div key={i} className="preview-input-row">
                      <input
                        value={url}
                        onChange={e => {
                          const arr = [...form.previewImages];
                          arr[i] = e.target.value;
                          setForm({...form, previewImages: arr});
                        }}
                        placeholder={`Görsel ${i + 1} URL`}
                      />
                      {url && <img src={url} alt={`preview ${i}`} className="mini-preview" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* DOSYA */}
              <div className="form-group full">
                <label>Dosya URL (Drive indirme linki)</label>
                <input
                  value={form.fileUrl}
                  onChange={e => setForm({...form, fileUrl: e.target.value})}
                  placeholder="https://drive.google.com/uc?export=download&id=..."
                />
              </div>
            </div>

            <button type="submit" className="btn-save">Kaydet 🍰</button>
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
                  </div>
                </div>
                <button className="btn-delete" onClick={() => handleDelete(p._id)}>
                  🗑️ Sil
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Products;