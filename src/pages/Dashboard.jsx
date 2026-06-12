import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import axios from "axios";
import "./Dashboard.css";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalVisitors: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("spb-admin-token");
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/stats`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-main">
        <div className="admin-header">
          <h1>Dashboard 📊</h1>
          <p>Hoş geldin! Sleepy Pie Bakery yönetim paneli.</p>
        </div>

        {loading ? (
          <p className="loading">Yükleniyor... 🍰</p>
        ) : (
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-icon">🛍️</span>
              <div>
                <p className="stat-label">Toplam Ürün</p>
                <p className="stat-value">{stats.totalProducts}</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">📦</span>
              <div>
                <p className="stat-label">Toplam Sipariş</p>
                <p className="stat-value">{stats.totalOrders}</p>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon">👀</span>
              <div>
                <p className="stat-label">Toplam Ziyaretçi</p>
                <p className="stat-value">{stats.totalVisitors}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;