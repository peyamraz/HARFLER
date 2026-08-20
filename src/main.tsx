import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

/** Uygulama seviyesinde beklenmedik bir hata olursa beyaz ekran yerine bilgi göster. */
class AppBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[Uygulama hatası]", error);
  }
  render() {
    if (this.state.failed) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#e9f6ef",
            fontFamily: "Nunito, sans-serif",
            padding: 24,
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 420 }}>
            <p style={{ fontFamily: "Fredoka, sans-serif", fontSize: 26, fontWeight: 700, color: "#2b3a55" }}>
              Oyun küçük bir şaka yaptı!
            </p>
            <p style={{ color: "#66779a", fontWeight: 600, margin: "12px 0 20px" }}>
              Beklenmedik bir hata oluştu. Sayfayı yenilersen her şey düzelecek.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                fontFamily: "Fredoka, sans-serif",
                fontWeight: 700,
                fontSize: 16,
                background: "#4d96ff",
                color: "#fff",
                border: "3px solid #2b3a55",
                borderRadius: 12,
                padding: "12px 24px",
                cursor: "pointer",
                boxShadow: "0 5px 0 #2b3a55",
              }}
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <AppBoundary>
    <App />
  </AppBoundary>,
);
