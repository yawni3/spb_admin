import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import "./Orders.css";
import { useToast } from '../components/ToastProvider';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const token = localStorage.getItem("spb-admin-token");
  const headers = { Authorization: `Bearer ${token}` };
  const API_URL = import.meta.env.VITE_API_URL;

  const showToast = useToast();

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/orders`, { headers });
      setOrders(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Siparişler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const deleteOrder = async (id) => {
    if (!confirm("Bu siparişi silmek istediğinden emin misin?")) return;
    try {
      await axios.delete(`${API_URL}/orders?id=${id}`, { headers });
      showToast('🗑️ Sipariş başarıyla silindi!', 'success');
      fetchOrders();
    } catch (err) {
      showToast(`❌ ${err.response?.data?.error || 'Silme hatası!'}`, 'error');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: "#f39c12",
      processing: "#3498db",
      completed: "#2ecc71",
      cancelled: "#e74c3c"
    };
    return colors[status] || "#95a5a6";
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: "⏳ Beklemede",
      processing: "🔄 İşleniyor",
      completed: "✅ Tamamlandı",
      cancelled: "❌ İptal Edildi"
    };
    return labels[status] || status;
  };

  const filteredOrders = statusFilter === "all" 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === "pending").length;
  const completedOrders = orders.filter(o => o.status === "completed").length;

  if (loading) {
    return (
      <div className="admin-layout">
        <Sidebar />
        <main className="admin-main">
          <div className="loading-container">
            <div className="loading-spinner">📦</div>
            <p>Siparişler yükleniyor...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-main">
        <div className="admin-header">
          <div className="header-row">
            <h1>Siparişler 📦</h1>
            <button className="btn-refresh" onClick={fetchOrders}>
              🔄 Yenile
            </button>
          </div>
        </div>

        <div className="stats-row">
          <div className="stat-box">
            <span className="stat-number">{totalOrders}</span>
            <span className="stat-label">Toplam Sipariş</span>
          </div>
          <div className="stat-box pending">
            <span className="stat-number">{pendingOrders}</span>
            <span className="stat-label">⏳ Bekleyen</span>
          </div>
          <div className="stat-box completed">
            <span className="stat-number">{completedOrders}</span>
            <span className="stat-label">✅ Tamamlanan</span>
          </div>
        </div>

        <div className="filter-row">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Tümü</option>
            <option value="pending">⏳ Beklemede</option>
            <option value="processing">🔄 İşleniyor</option>
            <option value="completed">✅ Tamamlandı</option>
            <option value="cancelled">❌ İptal</option>
          </select>
          <span className="filter-count">{filteredOrders.length} sipariş</span>
        </div>

        {error && (
          <div className="error-message">❌ {error}</div>
        )}

        {filteredOrders.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <p>Henüz sipariş yok</p>
          </div>
        ) : (
          <div className="orders-list">
            {filteredOrders.map((order) => (
              <div key={order._id} className="order-card">
                <div className="order-header">
                  <div className="order-left">
                    <span className="order-number">{order.orderNumber || "SPB-XXXX"}</span>
                    <span 
                      className="order-status"
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <div className="order-right">
                    <span className="order-date">
                      🕐 {new Date(order.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>

                <div className="order-body">
                  <div className="order-customer">
                    <span className="customer-email">📧 {order.customer?.email}</span>
                  </div>
                  <div className="order-items">
                    <span className="items-count">
                      📦 {order.items?.length || 0} ürün
                    </span>
                    <span className="order-total">
                      🆓 Ücretsiz
                    </span>
                  </div>
                </div>

                <div className="order-footer">
                  <div className="order-actions">
                    <button 
                      className="btn-delete-order"
                      onClick={() => deleteOrder(order._id)}
                    >
                      🗑️ Sil
                    </button>
                  </div>
                  <div className="order-mail-status">
                    {order.mailSent ? (
                      <span className="mail-sent">📧 Mail Gönderildi</span>
                    ) : (
                      <span className="mail-pending">📧 Mail Bekliyor</span>
                    )}
                  </div>
                </div>

                {order.items?.length > 0 && (
                  <div className="order-items-detail">
                    <div className="items-header">
                      <span>Ürünler</span>
                    </div>
                    {order.items.map((item, index) => (
                      <div key={index} className="order-item">
                        {item.thumbnailUrl && (
                          <img src={item.thumbnailUrl} alt={item.name} className="order-item-thumb" />
                        )}
                        <span className="order-item-name">{item.name || "Ürün"}</span>
                        <span className="order-item-qty">x{item.quantity || 1}</span>
                        <span className="order-item-price">🆓 Ücretsiz</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Orders;