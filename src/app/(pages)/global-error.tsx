"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
            background: "#fdf8f0",
            color: "#2c2420",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <div style={{ maxWidth: "360px", textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>😵</div>
            <h1 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>
              Critical error
            </h1>
            <p style={{ fontSize: "14px", color: "#6b5f57", marginBottom: "16px" }}>
              {error.message || "The application failed to load."}
            </p>
            <button
              onClick={() => reset()}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 500,
                color: "white",
                border: "none",
                cursor: "pointer",
                background: "#0d7377",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
