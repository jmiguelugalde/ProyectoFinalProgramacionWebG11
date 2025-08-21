import { useEffect } from "react";
import api from "./api";
import ImportarMediciones from "./ImportarMediciones";
import { getMeasurements } from "./services/measurements";
import * as XLSX from "xlsx";


function App() {
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await api.get("/users");
        console.log("Usuarios desde backend:", res.data);
      } catch (err) {
        console.error("Error obteniendo usuarios:", err);
      }
    }
    fetchUsers();
  }, []);

  const handleExport = async () => {
    console.log("Exportando...");
  try {
    const data = await getMeasurements();
    console.log("Datos recibidos:", data);
    if (!data.length) {
      alert("No hay datos para exportar");
      return;
    }

      // Generar hoja Excel
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Mediciones");
      XLSX.writeFile(wb, "mediciones.xlsx", { compression: true });
    } catch (err) {
      console.error("Error exportando datos:", err);
      alert("Error exportando datos");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.reload();
  };

  return (
    <div>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "10px",
          background: "#f9f9f9",
        }}
      >
        <h2>Dashboard OSA (On Shelf Availability)</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            id="btnExport"
            onClick={handleExport}
          >
            Exportar Datos
          </button>
          <button
            id="btnLogout"
            onClick={handleLogout}
          >
            Salir
          </button>
        </div>
      </header>

      <main>
        <p>Frontend conectado con FastAPI ✅</p>
        <ImportarMediciones />
      </main>
    </div>
  );
}

export default App;
