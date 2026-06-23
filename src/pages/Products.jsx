import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import "./Products.css";

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

  const token = localStorage.getItem("spb-admin-token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchProducts = async () => {
  try {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/products`);
    console.log("API RESPONSE:", res.data);
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

    tags: form.tags
     .split(",")
     .map(t => t.trim())
     .filter(Boolean),

    previewImages: form.previewImages.filter(Boolean)
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

        {/* 🥐 BASIC INFO */}
        <div className="form-section">
          <h3>🥐 Basic Info</h3>

          <input
            placeholder="Ürün adı"
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
              placeholder={`What’s included ${i + 1}`}
              value={item}
              onChange={e => {
                const arr = [...form.whatsIncluded];
                arr[i] = e.target.value;
                setForm({...form, whatsIncluded: arr});
              }}
            />
          ))}
        </div>

        <button type="submit" className="btn-save">
          Kaydet 🍰
        </button>
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