import api from "../api";

export interface Measurement {
  id: number;
  fecha: string;
  pv: string;
  codigo_barra: string;
  descripcion_sku: string;
  estado: string;
  tipo_resultado: string;
  provincia: string;
  osa_flag: number;
  oos_flag: number;
}

export async function getMeasurements(): Promise<Measurement[]> {
  const res = await api.get<{ items: Measurement[] }>("/api/measurements");
  return res.data.items;
}