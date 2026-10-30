import React, { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, RefreshCw, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import {
  createAdminLibrarian,
  fetchAdminLibrarians,
  resetAdminLibrarianPassword,
  updateAdminLibrarian,
  updateAdminLibrarianStatus,
} from "@/api/admin";

const EMPTY_FORM = {
  librarianId: "",
  fullName: "",
  email: "",
  phone: "",
  username: "",
  password: "",
};

const getError = (error) => error?.response?.data?.message || "The librarian account operation failed.";

export default function LibrariansTab() {
  const [accounts, setAccounts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  const setSearchTerm = (value) => {
    setPagination((current) => ({ ...current, page: 1 }));
    setSearch(value);
  };
  const setStatusFilter = (value) => {
    setPagination((current) => ({ ...current, page: 1 }));
    setStatus(value);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchAdminLibrarians({ page: pagination.page, limit: 50, search, status });
      setAccounts(Array.isArray(response.data?.data) ? response.data.data : []);
      setPagination(response.data?.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (error) {
      toast.error(getError(error));
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search, status]);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setCreating(true);
  };

  const openEdit = (account) => {
    setEditing(account);
    setCreating(false);
    setForm({
      librarianId: account.librarianId,
      fullName: account.fullName,
      email: account.email,
      phone: account.phone || "",
      username: account.username,
      password: "",
    });
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { password, ...details } = form;
      if (editing) {
        await updateAdminLibrarian(editing.id, details);
        toast.success("Librarian information updated.");
      } else {
        await createAdminLibrarian({ ...details, password });
        toast.success("Independent librarian account created.");
      }
      setEditing(null);
      setForm(EMPTY_FORM);
      setCreating(false);
      await load();
    } catch (error) {
      toast.error(getError(error));
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (account) => {
    const next = account.status === "active" ? "inactive" : "active";
    try {
      await updateAdminLibrarianStatus(account.id, next);
      toast.success(`Librarian account ${next}.`);
      await load();
    } catch (error) {
      toast.error(getError(error));
    }
  };

  const resetPassword = async (event) => {
    event.preventDefault();
    if (!resetTarget) return;
    setSaving(true);
    try {
      await resetAdminLibrarianPassword(resetTarget.id, newPassword);
      toast.success("Librarian password reset. The user must sign in with the new password.");
      setResetTarget(null);
      setNewPassword("");
    } catch (error) {
      toast.error(getError(error));
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#2C2DE0] dark:border-white/10 dark:bg-slate-900 dark:text-white";

  return (
    <section className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Independent Librarian Accounts</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            These accounts are separate from student and teacher registry accounts.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void load()} className="rounded-xl border border-slate-200 p-2 text-slate-600 dark:border-white/10 dark:text-slate-300" aria-label="Refresh librarians">
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          </button>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-[#2C2DE0] px-4 py-2 text-sm font-bold text-white">
            <Plus size={16} /> Create librarian
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search by librarian ID, name, or username"
          aria-label="Search librarian accounts"
          className={`${inputClass} min-w-[240px] flex-1`}
        />
        <select value={status} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass} aria-label="Filter librarian status">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="px-4 py-3">Librarian</th>
              <th className="px-4 py-3">University Librarian ID</th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Created by</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id} className="border-t border-slate-100 dark:border-white/10">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900 dark:text-white">{account.fullName}</p>
                  <p className="text-xs text-slate-500">{account.email}</p>
                </td>
                <td className="px-4 py-3 font-mono">{account.librarianId}</td>
                <td className="px-4 py-3">{account.username}</td>
                <td className="px-4 py-3">
                  <span className={account.status === "active" ? "font-semibold text-green-700" : "font-semibold text-amber-700"}>
                    {account.status}
                  </span>
                </td>
                <td className="px-4 py-3">{account.createdAt ? new Date(account.createdAt).toLocaleDateString() : "—"}</td>
                <td className="px-4 py-3">{account.createdBy?.name || "Development seed"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => openEdit(account)} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold dark:bg-white/10">
                      <Pencil size={13} /> Edit
                    </button>
                    <button type="button" onClick={() => { setResetTarget(account); setNewPassword(""); }} className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold dark:bg-white/10">
                      <RotateCcw size={13} /> Reset password
                    </button>
                    <button type="button" onClick={() => void changeStatus(account)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold dark:border-white/10">
                      {account.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && accounts.length === 0 && (
              <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">No librarian accounts found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">Showing {accounts.length} of {pagination.total} accounts.</p>

      {(editing || creating) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={save} className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{editing ? "Edit librarian" : "Create librarian"}</h3>
              <button type="button" onClick={() => { setEditing(null); setCreating(false); setForm(EMPTY_FORM); }} aria-label="Close dialog"><X size={18} /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["librarianId", "University Librarian ID"],
                ["fullName", "Full name"],
                ["email", "Email address"],
                ["phone", "Phone number"],
                ["username", "Username"],
              ].map(([key, label]) => (
                <label key={key} className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {label}
                  <input
                    required={key !== "phone"}
                    type={key === "email" ? "email" : "text"}
                    value={form[key]}
                    onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                    className={inputClass}
                  />
                </label>
              ))}
              {!editing && (
                <label className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Initial password
                  <input required type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} className={inputClass} />
                  <span className="block font-normal">Use uppercase, lowercase, a number, and a special character.</span>
                </label>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setEditing(null); setCreating(false); setForm(EMPTY_FORM); }} className="rounded-xl px-4 py-2 text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-xl bg-[#2C2DE0] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                {saving ? "Saving…" : editing ? "Save changes" : "Create account"}
              </button>
            </div>
          </form>
        </div>
      )}

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={resetPassword} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Reset password for {resetTarget.fullName}</h3>
              <button type="button" onClick={() => setResetTarget(null)} aria-label="Close dialog"><X size={18} /></button>
            </div>
            <label className="block space-y-1 text-xs font-semibold">
              New temporary password
              <input required minLength={8} type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className={inputClass} />
              <span className="block font-normal text-slate-500">Must include uppercase, lowercase, a number, and a special character.</span>
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setResetTarget(null)} className="rounded-xl px-4 py-2 text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-xl bg-[#2C2DE0] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Reset password"}</button>
            </div>
          </form>
        </div>
      )}
      {!loading && accounts.length > 0 && pagination.page < pagination.totalPages && (
        <button type="button" onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold dark:border-white/10">
          Next page
        </button>
      )}
      {pagination.page > 1 && (
        <button type="button" onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold dark:border-white/10">
          Previous page
        </button>
      )}
    </section>
  );
}
