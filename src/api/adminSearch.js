import api from "@/api/client";

export const normalizeAdminSearchResponse = (data) => {
  if (!data || typeof data !== "object" || !Array.isArray(data.categories)) {
    throw new Error("Invalid admin search response: expected a categories array.");
  }

  const categories = data.categories
    .filter((category) => category && typeof category.name === "string")
    .map((category) => ({
      name: category.name,
      items: Array.isArray(category.items)
        ? category.items.filter((item) => item && typeof item.label === "string")
        : [],
    }))
    .filter((category) => category.items.length > 0);

  return { categories };
};

export const searchAdmin = async (query, signal) => {
  const response = await api.get("/admin/search", {
    params: { q: query },
    signal,
  });
  return normalizeAdminSearchResponse(response.data);
};
