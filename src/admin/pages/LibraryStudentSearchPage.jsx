import React, { useState } from "react";
import { Search, UserRoundSearch } from "lucide-react";
import { searchLibraryStudents } from "@/api/admin";

export default function LibraryStudentSearchPage() {
  const [term, setTerm] = useState("");
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const search = async (event) => {
    event.preventDefault();
    if (term.trim().length < 2) {
      setError("Enter at least two characters to search.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await searchLibraryStudents({ search: term.trim() });
      setStudents(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Student search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="space-y-5 p-4 sm:p-6">
      <header>
        <div className="flex items-center gap-2 text-[#2C2DE0]">
          <UserRoundSearch size={20} />
          <h1 className="text-xl font-black text-slate-900 dark:text-white">Student Search</h1>
        </div>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Read-only identity details from the University Student Registry.
        </p>
      </header>
      <form onSubmit={search} className="flex gap-2">
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          aria-label="Search by student name or University ID"
          placeholder="Student name or University ID"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm dark:border-white/10 dark:bg-slate-900 dark:text-white"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-[#2C2DE0] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          <Search size={16} /> {loading ? "Searching…" : "Search"}
        </button>
      </form>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {!error && students.length === 0 && !loading && (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 dark:border-white/10">
          Search the registry to view a student's name, University ID, department, semester, and status.
        </p>
      )}
      {students.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">University ID</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Semester</th>
                <th className="px-4 py-3">Registry status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student._id} className="border-t border-slate-100 dark:border-white/10">
                  <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{student.fullName}</td>
                  <td className="px-4 py-3 font-mono">{student.universityId}</td>
                  <td className="px-4 py-3">{student.department}</td>
                  <td className="px-4 py-3">{student.semester ?? "—"}</td>
                  <td className="px-4 py-3 capitalize">{student.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
