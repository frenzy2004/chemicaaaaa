import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import App from "./App";
import LandingPage from "./LandingPage";

const convexUrl = import.meta.env.VITE_CONVEX_URL || "";
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

const root = ReactDOM.createRoot(rootElement);

const app = (
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/play" element={<App />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

root.render(convex ? <ConvexProvider client={convex}>{app}</ConvexProvider> : app);
