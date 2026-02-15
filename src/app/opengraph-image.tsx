import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Supply Pulse - AI-Powered Supply Chain Risk Monitoring";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #3b82f6)",
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "80px",
            height: "80px",
            borderRadius: "20px",
            background: "#3b82f6",
            marginBottom: "32px",
          }}
        >
          <span
            style={{
              color: "white",
              fontSize: "40px",
              fontWeight: "bold",
            }}
          >
            S
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <span
            style={{
              fontSize: "52px",
              fontWeight: "bold",
              color: "white",
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            Supply Pulse
          </span>
          <span
            style={{
              fontSize: "26px",
              color: "#94a3b8",
              textAlign: "center",
              maxWidth: "800px",
              lineHeight: 1.4,
            }}
          >
            AI-Powered Supply Chain Risk Monitoring
          </span>
        </div>

        {/* Features row */}
        <div
          style={{
            display: "flex",
            gap: "32px",
            marginTop: "48px",
          }}
        >
          {["Weekly AI Reports", "Disruption Detection", "Cited Sources", "Free Plan"].map(
            (feature) => (
              <div
                key={feature}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "#cbd5e1",
                  fontSize: "18px",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#3b82f6",
                  }}
                />
                <span>{feature}</span>
              </div>
            )
          )}
        </div>

        {/* URL */}
        <span
          style={{
            position: "absolute",
            bottom: "32px",
            color: "#64748b",
            fontSize: "16px",
          }}
        >
          supplypulse.net
        </span>
      </div>
    ),
    {
      ...size,
    }
  );
}
