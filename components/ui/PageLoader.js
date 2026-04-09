export default function PageLoader({ text = "Loading…" }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "80px 24px",
      gap: "16px",
    }}>
      {/* Spinning ring */}
      <div style={{
        width: "44px",
        height: "44px",
        borderRadius: "50%",
        border: "4px solid #F3F4F6",
        borderTopColor: "#EF476F",
        animation: "pl-spin 0.75s linear infinite",
      }} />

      <span style={{
        color: "#6B7280",
        fontSize: "13px",
        fontWeight: 500,
        letterSpacing: "0.3px",
      }}>
        {text}
      </span>

      <style>{`
        @keyframes pl-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
