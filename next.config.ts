import type { NextConfig } from "next";
import path from "path";
import fs from "fs";

/* ── pdfkit font workaround ── */
// pdfkit reads its .afm font files via __dirname-relative paths.
// webpack bundles pdfkit into vendor-chunks/ changing __dirname.
// We hook into afterCompile to copy fonts to the right place.

const FONT_SRC = path.join(process.cwd(), "node_modules", "pdfkit", "js", "data");

/* Fallback — copy to known Next.js paths at module load time */
try {
  if (fs.existsSync(FONT_SRC)) {
    for (const dir of [
      path.join(process.cwd(), ".next", "dev", "server", "vendor-chunks", "data"),
      path.join(process.cwd(), ".next", "server", "vendor-chunks", "data"),
    ]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        fs.cpSync(FONT_SRC, dir, { recursive: true });
      }
    }
  }
} catch { /* non-blocking */ }

class PdfFontCopyPlugin {
  apply(compiler: any) {
    compiler.hooks.beforeCompile.tap("PdfFontCopy", (_params: any) => {
      const outPath = compiler.outputPath;
      if (!outPath) return;
      const out = path.join(outPath, "vendor-chunks", "data");
      if (fs.existsSync(out) || !fs.existsSync(FONT_SRC)) return;
      fs.mkdirSync(out, { recursive: true });
      fs.cpSync(FONT_SRC, out, { recursive: true });
    });
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "10.168.66.12"],

  // Production optimizations
  productionBrowserSourceMaps: false,
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  webpack: (config) => {
    config.plugins ??= [];
    config.plugins.push(new PdfFontCopyPlugin());
    return config;
  },

  // Headers for caching
  async headers() {
    return [
      {
        source: "/(.*).(js|css|woff2)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/robots.txt",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400" },
        ],
      },
    ];
  },
};

export default nextConfig;