import api from "../api";

export interface ImportResponse {
  inserted: number;
  skipped: number;
  total_rows: number;
}

export async function importarExcel(file: File): Promise<ImportResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post<ImportResponse>("/api/import/excel", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}