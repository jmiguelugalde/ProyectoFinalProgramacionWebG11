import api from "../api";

export async function getUsers() {
  const res = await api.get("/users");
  return res.data;
}