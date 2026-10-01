const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "admin-web");

function write(rel, body) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, body, { encoding: "utf8" });
  console.log("  ✓ " + rel);
}

// ============ package.json ============
write("package.json", JSON.stringify({
  name: "@event-agency/admin-web",
  version: "0.0.1",
  private: true,
  type: "module",
  scripts: {
    dev: "vite",
    build: "tsc -b && vite build",
    preview: "vite preview",
    typecheck: "tsc --noEmit",
  },
  dependencies: {
    "@event-agency/shared": "*",
    "@tanstack/react-query": "^5.59.0",
    "axios": "^1.7.7",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
  },
  devDependencies: {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.4.0",
    "vite": "^5.4.10",
  },
}, null, 2) + "\n");

// ============ vite.config.ts ============
write("vite.config.ts", [
  'import { defineConfig } from "vite";',
  'import react from "@vitejs/plugin-react";',
  'import path from "node:path";',
  '',
  'export default defineConfig({',
  '  plugins: [react()],',
  '  resolve: {',
  '    alias: {',
  '      "@": path.resolve(__dirname, "src"),',
  '    },',
  '  },',
  '  server: {',
  '    port: 5173,',
  '    host: true,',
  '    proxy: {',
  '      "/api": {',
  '        target: "http://localhost:3100",',
  '        changeOrigin: true,',
  '      },',
  '    },',
  '  },',
  '});',
  '',
].join("\n"));

// ============ tsconfig.json ============
write("tsconfig.json", JSON.stringify({
  compilerOptions: {
    target: "ES2022",
    lib: ["ES2023", "DOM", "DOM.Iterable"],
    module: "ESNext",
    moduleResolution: "bundler",
    jsx: "react-jsx",
    strict: true,
    noUnusedLocals: true,
    noUnusedParameters: true,
    noFallthroughCasesInSwitch: true,
    skipLibCheck: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    resolveJsonModule: true,
    isolatedModules: true,
    noEmit: true,
    baseUrl: ".",
    paths: {
      "@/*": ["./src/*"],
    },
  },
  include: ["src"],
  references: [{ path: "./tsconfig.node.json" }],
}, null, 2) + "\n");

write("tsconfig.node.json", JSON.stringify({
  compilerOptions: {
    composite: true,
    skipLibCheck: true,
    module: "ESNext",
    moduleResolution: "bundler",
    allowSyntheticDefaultImports: true,
    strict: true,
    noEmit: true,
    types: ["node"],
  },
  include: ["vite.config.ts"],
}, null, 2) + "\n");

// ============ tailwind.config.js ============
write("tailwind.config.js", [
  '/** @type {import("tailwindcss").Config} */',
  'export default {',
  '  content: ["./index.html", "./src/**/*.{ts,tsx}"],',
  '  theme: {',
  '    extend: {',
  '      colors: {',
  '        primary: "#667eea",',
  '        primaryDark: "#5a67d8",',
  '        accent: "#0F766E",',
  '        danger: "#dc2626",',
  '        success: "#10b981",',
  '        warning: "#f59e0b",',
  '        alert: "#ef4444",',
  '      },',
  '    },',
  '  },',
  '  plugins: [],',
  '};',
  '',
].join("\n"));

// ============ postcss.config.js ============
write("postcss.config.js", [
  'export default {',
  '  plugins: {',
  '    tailwindcss: {},',
  '    autoprefixer: {},',
  '  },',
  '};',
  '',
].join("\n"));

// ============ index.html ============
write("index.html", [
  '<!doctype html>',
  '<html lang="ru">',
  '  <head>',
  '    <meta charset="UTF-8" />',
  '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
  '    <title>Event Agency Admin</title>',
  '  </head>',
  '  <body>',
  '    <div id="root"></div>',
  '    <script type="module" src="/src/main.tsx"></script>',
  '  </body>',
  '</html>',
  '',
].join("\n"));

// ============ src/index.css ============
write("src/index.css", [
  '@tailwind base;',
  '@tailwind components;',
  '@tailwind utilities;',
  '',
  'html, body, #root {',
  '  height: 100%;',
  '  margin: 0;',
  '}',
  '',
  'body {',
  '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
  '  background: #f5f6fa;',
  '  color: #1f2937;',
  '}',
  '',
].join("\n"));

// ============ src/vite-env.d.ts ============
write("src/vite-env.d.ts", '/// <reference types="vite/client" />\n');

// ============ src/main.tsx ============
write("src/main.tsx", [
  'import React from "react";',
  'import ReactDOM from "react-dom/client";',
  'import { QueryClient, QueryClientProvider } from "@tanstack/react-query";',
  'import { BrowserRouter } from "react-router-dom";',
  'import App from "./App";',
  'import "./index.css";',
  '',
  'const queryClient = new QueryClient({',
  '  defaultOptions: {',
  '    queries: {',
  '      retry: 1,',
  '      refetchOnWindowFocus: false,',
  '      staleTime: 30_000,',
  '    },',
  '  },',
  '});',
  '',
  'ReactDOM.createRoot(document.getElementById("root")!).render(',
  '  <React.StrictMode>',
  '    <QueryClientProvider client={queryClient}>',
  '      <BrowserRouter>',
  '        <App />',
  '      </BrowserRouter>',
  '    </QueryClientProvider>',
  '  </React.StrictMode>,',
  ');',
  '',
].join("\n"));

// ============ src/App.tsx ============
write("src/App.tsx", [
  'import { useState } from "react";',
  'import axios from "axios";',
  '',
  'export default function App() {',
  '  const [health, setHealth] = useState<string | null>(null);',
  '  const [loading, setLoading] = useState(false);',
  '',
  '  const checkApi = async () => {',
  '    setLoading(true);',
  '    try {',
  '      const { data } = await axios.get("/api/health");',
  '      setHealth(JSON.stringify(data));',
  '    } catch (e: any) {',
  '      setHealth("ERROR: " + (e?.message ?? "unknown"));',
  '    } finally {',
  '      setLoading(false);',
  '    }',
  '  };',
  '',
  '  return (',
  '    <div className="min-h-screen flex items-center justify-center p-8">',
  '      <div className="bg-white rounded-2xl shadow-md p-10 max-w-lg w-full text-center">',
  '        <div className="text-3xl font-extrabold text-primary mb-2">Event Agency</div>',
  '        <div className="text-lg text-gray-500 mb-6">Admin Panel</div>',
  '        <div className="text-sm text-gray-600 mb-6">',
  '          \u0424\u0430\u0437\u0430 1 \u2014 \u043a\u0430\u0440\u043a\u0430\u0441 \u0440\u0430\u0431\u043e\u0442\u0430\u0435\u0442',
  '        </div>',
  '        <button',
  '          onClick={checkApi}',
  '          disabled={loading}',
  '          className="bg-primary hover:bg-primaryDark disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-lg transition"',
  '        >',
  '          {loading ? "\u041f\u0440\u043e\u0432\u0435\u0440\u044f\u044e\u2026" : "\u041f\u0440\u043e\u0432\u0435\u0440\u0438\u0442\u044c API"}',
  '        </button>',
  '        {health ? (',
  '          <div className="mt-5 text-left bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono text-gray-700 break-all">',
  '            {health}',
  '          </div>',
  '        ) : null}',
  '      </div>',
  '    </div>',
  '  );',
  '}',
  '',
].join("\n"));

console.log("\nOK: admin-web scaffolded");