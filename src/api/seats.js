import api from "@/api/client";

export const getSeats = async () => {
  const res = await api.get("/seats");
  return Array.isArray(res.data) ? res.data : res.data.seats;
};