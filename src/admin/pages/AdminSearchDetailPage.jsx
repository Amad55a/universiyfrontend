import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import api from "@/api/client";
import { useLanguage } from "@/hooks/useLanguage";

export default function AdminSearchDetailPage() {
  const { type, id } = useParams();
  const { t } = useLanguage();
  const copy = t.adminPanel.searchDetail;
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-search-detail", type, id],
    queryFn: async () => (await api.get(`/admin/search/${type}/${id}`)).data,
    enabled: Boolean(type && id),
  });
  const category = copy.categories[type] || data?.category || copy.record;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <Link to="/admin/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#2C2DE0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C2DE0] dark:text-gray-300">
        <ArrowLeft size={16} /> {copy.back}
      </Link>
      {isLoading ? (
        <div role="status" className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-white/10 dark:bg-gray-950">
          <LoaderCircle size={17} className="animate-spin" /> {copy.loading}
        </div>
      ) : isError ? (
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error?.response?.data?.message || copy.error}
        </p>
      ) : (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-7 dark:border-white/10 dark:bg-gray-950">
          <p className="text-xs font-bold uppercase tracking-wider text-[#2C2DE0]">{category}</p>
          <h1 className="mt-2 break-words text-2xl font-black text-gray-900 dark:text-white">{data.title || copy.record}</h1>
          <dl className="mt-6 divide-y divide-gray-100 dark:divide-white/10">
            {data.fields.map((field) => (
              <div key={field.label} className="grid gap-1 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
                <dt className="text-sm font-semibold text-gray-500">{field.label}</dt>
                <dd className="min-w-0 break-words text-sm text-gray-900 dark:text-gray-100">{field.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
