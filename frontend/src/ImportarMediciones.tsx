import { useState } from "react";
import { importarExcel, ImportResponse } from "./services/import";

function ImportarMediciones() {
  const [msg, setMsg] = useState("");

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    try {
      const data: ImportResponse = await importarExcel(file);  // 👈 tipado explícito
      setMsg(`Insertados: ${data.inserted}, Omitidos: ${data.skipped}, Total: ${data.total_rows}`);
    } catch (err: any) {
      setMsg("Error al importar: " + (err.response?.data?.detail || err.message));
    }
  };

  return (
    <div>
      <h3>Importar mediciones (.xlsx)</h3>
      <input type="file" accept=".xlsx,.xls" onChange={handleChange} />
      <p>{msg}</p>
    </div>
  );
}

export default ImportarMediciones;
