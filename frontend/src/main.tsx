import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css"; // aquí van tus estilos globales

const root = document.getElementById("root");
if (!root) throw new Error("No se encontró #root");
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
