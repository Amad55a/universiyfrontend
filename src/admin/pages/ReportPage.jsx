import { createElement, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CalendarDays,
  Download,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  downloadReportCenter,
  fetchReportCenter,
  fetchReportCenterRecords,
} from "@/api/reportApi";

const TABS = [
  ["overview", "Overview"],
  ["academics", "Academics"],
  ["examinations", "Examinations"],
  ["library", "Library"],
  ["reservations", "Reservations"],
  ["eLibrary", "E-library"],
  ["collaboration", "Collaboration"],
  ["administration", "Administration"],
  ["systemHealth", "System health"],
];

const PERIODS = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["last7d", "Last 7 days"],
  ["last30d", "Last 30 days"],
  ["last90d", "Last 90 days"],
  ["thisMonth", "This month"],
  ["previousMonth", "Previous month"],
  ["custom", "Custom range"],
];

const formatNumber = (value) =>
  value == null ? "—" : new Intl.NumberFormat().format(value);

const formatPercent = (value) =>
  value == null ? "Not available" : `${value}%`;

const Card = ({ title, children, className = "" }) => (
  <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950 ${className}`}>
    {title && <h2 className="mb-4 text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h2>}
    {children}
  </section>
);

const StatCard = ({ title, metric, icon }) => (
  <Card className="min-w-0">
    <div className="mb-3 flex items-center justify-between gap-3">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{title}</p>
      {createElement(icon, { "aria-hidden": true, size: 17, className: "shrink-0 text-indigo-600" })}
    </div>
    <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{formatNumber(metric?.value)}</p>
    {metric?.changePercent != null && (
      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
        {metric.changePercent > 0 ? "+" : ""}{metric.changePercent}% vs previous period
      </p>
    )}
  </Card>
);

const getCellValue = (row, key) => key.split(".").reduce((value, part) => value?.[part], row);

const DataTable = ({ columns, rows, emptyMessage = "No records for this period.", onRowClick }) => (
  rows?.length ? (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500 dark:border-white/10 dark:text-slate-400">
            {columns.map(([key, label]) => <th key={key} className="px-3 py-2 font-semibold">{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.id ?? row.date ?? row.name ?? row.type ?? row.status ?? index}-${index}`} className="border-b border-slate-100 last:border-0 dark:border-white/5">
              {columns.map(([key], columnIndex) => (
                <td key={key} className="px-3 py-2.5 text-slate-700 dark:text-slate-200">
                  {onRowClick && columnIndex === 0 ? (
                    <button
                      type="button"
                      onClick={() => onRowClick(row)}
                      aria-label={`View records for ${formatNumberOrText(getCellValue(row, key))}`}
                      className="text-left font-semibold text-indigo-600 hover:underline"
                    >
                      {formatNumberOrText(getCellValue(row, key))}
                    </button>
                  ) : formatNumberOrText(getCellValue(row, key))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : <p className="text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
);

const formatNumberOrText = (value) => {
  if (value == null || value === "") return "—";
  return typeof value === "number" ? formatNumber(value) : String(value);
};

const StatusList = ({ data, category, onDrilldown }) => {
  const rows = Object.entries(data || {}).map(([status, count]) => ({ status, count }));
  return (
    <DataTable
      columns={[["status", "Status"], ["count", "Records"]]}
      rows={rows}
      onRowClick={onDrilldown ? (row) => onDrilldown(category, row.status) : undefined}
    />
  );
};

const TrendBars = ({ title, rows }) => {
  const max = Math.max(1, ...(rows || []).map((row) => row.count || 0));
  return (
    <Card title={title}>
      {rows?.length ? (
        <div className="flex h-40 items-end gap-1 overflow-x-auto">
          {rows.map((row) => (
            <div key={row.date} className="flex h-full min-w-5 flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[9px] text-slate-500">{row.count}</span>
              <div
                className="w-full min-w-2 rounded-t bg-indigo-600"
                style={{ height: `${Math.max(3, ((row.count || 0) / max) * 70)}%` }}
                title={`${row.date}: ${row.count}`}
              />
              <span className="text-[9px] text-slate-400">{row.date?.slice(5)}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-sm text-slate-500">No activity recorded for this period.</p>}
    </Card>
  );
};

const Unavailable = ({ reason }) => (
  <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
    <AlertTriangle size={15} className="mt-0.5 shrink-0" />
    <span>{reason || "This metric is not currently supported by recorded data."}</span>
  </div>
);

const SectionTabs = ({ active, onChange }) => (
  <nav aria-label="Reporting sections" className="flex gap-2 overflow-x-auto pb-2">
    {TABS.map(([id, title]) => (
      <button
        key={id}
        type="button"
        aria-current={active === id ? "page" : undefined}
        onClick={() => onChange(id)}
        className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition ${
          active === id
            ? "bg-indigo-600 text-white"
            : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
        }`}
      >
        {title}
      </button>
    ))}
  </nav>
);

const Overview = ({ report }) => {
  const data = report.overview || {};
  const cards = [
    ["Students", data.students, Users],
    ["Teachers", data.teachers, GraduationCap],
    ["Administrators", data.administrators, ShieldCheck],
    ["Departments", data.departments, BookOpen],
    ["Courses", data.courses, BookOpen],
    ["New registrations", data.newRegistrations, Users],
    ["Exams", data.exams, CalendarDays],
    ["Reservations", data.reservations, CalendarDays],
    ["Physical books", data.physicalBooks, BookOpen],
    ["Digital resources", data.digitalResources, BookOpen],
    ["Meetings", data.meetings, Users],
    ["Groups", data.groups, Users],
    ["Active accounts", data.activeAccounts, Activity],
    ["Inactive accounts", data.inactiveAccounts, Activity],
    ["Pending accounts", data.pendingAccounts, Activity],
    ["Verified students", data.verifiedStudents, ShieldCheck],
    ["Email-verified students", data.emailVerifiedStudents, ShieldCheck],
    ["Pending email verification", data.pendingEmailVerifications, ShieldCheck],
    ["Pending verifications", data.pendingStudentVerifications, ShieldCheck],
    ["Platform activity", data.platformActivity, Activity],
  ];
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([title, metric, icon]) => <StatCard key={title} title={title} metric={metric} icon={icon} />)}
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card title="Activity in selected period">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {formatNumber(data.platformActivity?.value)} recorded events, compared with {formatNumber(data.platformActivity?.previousValue)} in the previous period.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            This total combines saved activity, audit, reservation, and community-post records.
          </p>
        </Card>
        <Card title="Data freshness">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            Last updated: {report.generatedAt ? new Date(report.generatedAt).toLocaleString("en-GB", { timeZone: report.timezone }) : "—"}
          </p>
          <p className="mt-2 text-xs text-slate-500">Reporting dates use {report.timezone}.</p>
        </Card>
      </div>
    </>
  );
};

const SectionContent = ({ id, report, onDrilldown }) => {
  const data = report.sections?.[id] || {};
  if (id === "overview") return <Overview report={report} />;
  if (id === "academics") return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Student registry by department">
        <DataTable columns={[["department", "Department"], ["students", "Registry records"]]} rows={data.studentRegistryByDepartment} />
      </Card>
      <Card title="Teacher distribution by department">
        <DataTable columns={[["department", "Department"], ["teachers", "Teacher records"]]} rows={data.teachersByDepartment} />
      </Card>
      <Card title="Enrollment by course">
        <DataTable columns={[
          ["courseCode", "Course code"],
          ["title", "Course"],
          ["department", "Department"],
          ["classes", "Classes"],
          ["enrolledStudents", "Class enrollments"],
        ]} rows={data.enrollmentByCourse} />
      </Card>
      <TrendBars title="Student registrations" rows={data.studentRegistrationTrend} />
      <Card title="Course and class totals">
        <DataTable columns={[["name", "Metric"], ["count", "Count"]]} rows={[
          { name: "Courses", count: data.courses },
          { name: "Departments", count: data.departments },
          { name: "Teacher records", count: data.teacherRecords },
          { name: "Registered student accounts", count: data.registeredStudentAccounts },
        ]} />
      </Card>
      <Card title="Classes by semester and academic year">
        <DataTable columns={[
          ["academicYear", "Academic year"],
          ["semester", "Semester"],
          ["status", "Status"],
          ["classCount", "Classes"],
          ["enrolledStudents", "Class enrollments"],
        ]} rows={data.classes} />
      </Card>
      <Card title="Academic roadmap progress">
        <DataTable columns={[["name", "Metric"], ["count", "Value"]]} rows={[
          { name: "Student progress records", count: data.roadmapProgress?.studentProgressRecords },
          { name: "Topic completion", count: formatPercent(data.roadmapProgress?.completionPercent) },
        ]} />
      </Card>
      <Unavailable reason={data.completionStatistics?.reason} />
    </div>
  );
  if (id === "examinations") return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Exams by lifecycle status">
        <DataTable
          columns={[["status", "Status"], ["count", "Exams"]]}
          rows={data.byStatus}
          onRowClick={(row) => onDrilldown("examinations", row.status)}
        />
      </Card>
      <Card title="Student participation and results">
        <DataTable columns={[["name", "Metric"], ["count", "Value"]]} rows={[
          { name: "Submission records", count: data.submissions?.total },
          { name: "Average published score", count: formatPercent(data.submissions?.averagePublishedScorePercent) },
        ]} />
        <div className="mt-4">
          <DataTable
            columns={[["status", "Submission status"], ["count", "Records"]]}
            rows={data.submissions?.byStatus}
            onRowClick={(row) => onDrilldown("submissions", row.status)}
          />
        </div>
      </Card>
      <Card title="Exam browser mode usage">
        <DataTable columns={[["mode", "Mode"], ["launches", "Launch records"], ["connected", "Connected"]]} rows={data.secureBrowserLaunches} />
      </Card>
      <Card title="Exams by course and department">
        <DataTable columns={[
          ["courseCode", "Course code"],
          ["course", "Course"],
          ["department", "Department"],
          ["exams", "Exams"],
        ]} rows={data.byCourseAndDepartment} />
      </Card>
      <Card title="Exams by teacher">
        <DataTable columns={[["teacher", "Teacher"], ["exams", "Exams"]]} rows={data.byTeacher} />
      </Card>
      <Card title="Published score distribution">
        <DataTable columns={[["range", "Score range"], ["submissions", "Published submissions"]]} rows={data.submissions?.scoreDistribution} />
      </Card>
      <Unavailable reason={data.submissions?.passRate?.reason} />
      <Unavailable reason={data.verificationFailures?.reason} />
      <Unavailable reason={data.cancelledExams?.reason} />
    </div>
  );
  if (id === "library") return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Physical collection">
        <DataTable columns={[["name", "Metric"], ["count", "Copies / titles"]]} rows={[
          { name: "Book titles", count: data.physicalInventory?.titles },
          { name: "Total copies", count: data.physicalInventory?.totalCopies },
          { name: "Available copies", count: data.physicalInventory?.availableCopies },
          { name: "Borrowed copies", count: data.borrowing?.active },
          { name: "Overdue copies", count: data.borrowing?.overdue },
          { name: "Returned borrows", count: data.borrowing?.returned },
          { name: "Lost copies", count: data.borrowing?.lost },
        ]} />
      </Card>
      <Card title="Inventory by category">
        <DataTable columns={[
          ["category", "Category"],
          ["titles", "Titles"],
          ["totalCopies", "Copies"],
          ["availableCopies", "Available"],
        ]} rows={data.physicalInventoryByCategory} />
      </Card>
      <Card title="Borrowing status"><StatusList data={data.borrowing} category="borrowing" onDrilldown={onDrilldown} /></Card>
      <Unavailable reason={data.damagedBooks?.reason} />
      <TrendBars title="Borrowing trend" rows={data.borrowingTrend} />
      <Card title="Most borrowed books">
        <DataTable columns={[["title", "Book"], ["author", "Author"], ["borrowCount", "Borrows"]]} rows={data.mostBorrowedBooks} />
      </Card>
      <Card title="Most viewed digital resources">
        <DataTable columns={[["title", "Resource"], ["category", "Category"], ["views", "Recorded views"], ["activeReaders", "Readers"]]} rows={data.mostViewedResources} />
      </Card>
      <Card title="Reading progress">
        <DataTable columns={[["name", "Metric"], ["count", "Value"]]} rows={[
          { name: "Active readers", count: data.readingProgress?.activeReaders },
          { name: "Average recorded progress", count: formatPercent(data.readingProgress?.averagePercent) },
          { name: "Completed records", count: data.readingProgress?.completed },
          { name: "Recorded reading time (seconds)", count: data.readingProgress?.timeSpentSeconds },
        ]} />
      </Card>
    </div>
  );
  if (id === "reservations") return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Reservation status"><StatusList data={data.statuses} category="reservations" onDrilldown={onDrilldown} /></Card>
      <Card title="Current seat utilization">
        <DataTable columns={[["name", "Metric"], ["count", "Value"]]} rows={[
          { name: "Currently active reservations", count: data.activeReservations },
          { name: "Pending reservations", count: data.pendingReservations },
          { name: "Currently occupied seats", count: data.currentlyOccupiedSeats },
          { name: "Active seats", count: data.activeSeats },
          { name: "Utilization", count: formatPercent(data.seatUtilizationPercent) },
        ]} />
      </Card>
      <TrendBars title="Reservation trend" rows={data.reservationsOverTime} />
      <Card title="Most frequently used seats">
        <DataTable columns={[["seatNumber", "Seat"], ["reservations", "Reservations"]]} rows={data.mostUsedSeats} />
      </Card>
      <Card title="Peak reservation hours">
        <DataTable columns={[["hour", "Hour (Mogadishu)"], ["reservations", "Reservations"]]} rows={data.peakHours} />
      </Card>
      <Unavailable reason={data.expiredReservations?.reason} />
    </div>
  );
  if (id === "eLibrary") return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Digital collection">
        <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{formatNumber(data.digitalBooks)}</p>
        <p className="mt-1 text-xs text-slate-500">Active books with a stored digital resource.</p>
      </Card>
      <Card title="Most viewed digital resources">
        <DataTable columns={[["title", "Resource"], ["category", "Category"], ["views", "Recorded views"], ["activeReaders", "Readers"]]} rows={data.mostViewedResources} />
      </Card>
      <Card title="Digital resources by category">
        <DataTable columns={[["category", "Category"], ["resources", "Resources"]]} rows={data.digitalBooksByCategory} />
      </Card>
      <TrendBars title="Recorded resource accesses" rows={data.resourceAccessTrend} />
      <Unavailable reason={data.resourceDepartmentUsage?.reason} />
      <Card title="Recorded reading progress">
        <DataTable columns={[["name", "Metric"], ["count", "Value"]]} rows={[
          { name: "Active readers", count: data.readingProgress?.activeReaders },
          { name: "Average progress", count: formatPercent(data.readingProgress?.averagePercent) },
          { name: "Completed records", count: data.readingProgress?.completed },
          { name: "Recorded reading time (seconds)", count: data.readingProgress?.timeSpentSeconds },
        ]} />
      </Card>
      <Unavailable reason="Search activity and AI assistant usage are not recorded as reportable metrics." />
    </div>
  );
  if (id === "collaboration") return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Online meetings">
        <DataTable columns={[["name", "Metric"], ["count", "Value"]]} rows={[
          { name: "Total meetings", count: data.meetings?.total },
          { name: "Active meetings", count: data.meetings?.active },
          { name: "Completed meetings", count: data.meetings?.completed },
          { name: "Created this period", count: data.meetings?.createdInPeriod },
          { name: "Attendance records", count: data.meetings?.attendanceRecords },
          { name: "Recorded participant duration (seconds)", count: data.meetings?.recordedParticipantDurationSeconds },
        ]} />
      </Card>
      <Card title="Groups and community">
        <DataTable columns={[["name", "Metric"], ["count", "Value"]]} rows={[
          { name: "Groups", count: data.groups?.total },
          { name: "Membership records", count: data.groups?.membershipRecords },
          { name: "Group posts this period", count: data.community?.groupPostsCreated },
          { name: "Community posts this period", count: data.community?.postsCreated },
          { name: "Comments this period", count: data.community?.comments },
          { name: "Replies this period", count: data.community?.replies },
          { name: "Group-post comments this period", count: data.community?.groupPostComments },
        ]} />
        <div className="mt-4"><Unavailable reason={data.groups?.activeGroups?.reason} /></div>
        <div className="mt-4">
          <DataTable
            columns={[["type", "Group type"], ["groups", "Groups"], ["members", "Members"]]}
            rows={data.groups?.byType}
            onRowClick={(row) => onDrilldown("groups", row.type)}
          />
        </div>
      </Card>
      <Card title="Private chat activity (aggregate only)">
        <DataTable columns={[["name", "Metric"], ["count", "Value"]]} rows={[
          { name: "Private conversations", count: data.privateChat?.conversations },
          { name: "Active conversations this period", count: data.privateChat?.activeConversationsInPeriod },
          { name: "Private messages this period", count: data.privateChat?.messagesInPeriod },
        ]} />
        <p className="mt-3 text-xs text-slate-500">Message contents and participants are not exposed.</p>
      </Card>
      <Unavailable reason={data.technicalFailures?.reason} />
    </div>
  );
  if (id === "administration") return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Users by role">
        <DataTable
          columns={[["role", "Role"], ["count", "Accounts"]]}
          rows={data.registrationsByRole}
          onRowClick={(row) => onDrilldown("registrations", row.role)}
        />
      </Card>
      <Card title="Student verification">
        <p className="text-3xl font-extrabold text-slate-900 dark:text-white">{formatNumber(data.pendingStudentVerifications)}</p>
        <p className="mt-1 text-xs text-slate-500">Student accounts without university verification.</p>
      </Card>
      <Card title="Recorded administrative actions">
        <DataTable columns={[["action", "Recorded action"], ["count", "Events"]]} rows={data.auditEvents} />
      </Card>
    </div>
  );
  if (id === "systemHealth") return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card title="Current database connectivity">
        <p className={`text-lg font-extrabold ${data.currentHealth?.database === "connected" ? "text-emerald-600" : "text-red-600"}`}>
          {data.currentHealth?.database || "Unavailable"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Point-in-time check at {data.currentHealth?.checkedAt ? new Date(data.currentHealth.checkedAt).toLocaleString("en-GB", { timeZone: report.timezone }) : "—"}.
        </p>
      </Card>
      {Object.entries(data).filter(([key]) => key !== "currentHealth").map(([key, item]) => (
        <Card key={key} title={key.replace(/([A-Z])/g, " $1")}>
          <Unavailable reason={item?.reason || "Historical metrics are not available."} />
        </Card>
      ))}
    </div>
  );
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {Object.entries(data).map(([key, item]) => (
        <Card key={key} title={key.replace(/([A-Z])/g, " $1")}>
          <Unavailable reason={item?.reason || "Historical metrics are not available."} />
        </Card>
      ))}
    </div>
  );
};

const RECORD_COLUMNS = {
  reservations: [
    ["student.name", "Student"],
    ["student.universityId", "University ID"],
    ["seat.seatNumber", "Seat"],
    ["status", "Status"],
    ["startTime", "Start"],
    ["endTime", "End"],
  ],
  borrowing: [
    ["borrower.name", "Borrower"],
    ["borrower.universityId", "University ID"],
    ["book.title", "Book"],
    ["status", "Status"],
    ["dueDate", "Due date"],
    ["returnedAt", "Returned"],
  ],
  examinations: [
    ["title", "Exam"],
    ["status", "Status"],
    ["class.classCode", "Class"],
    ["class.course.title", "Course"],
    ["availableFrom", "Available from"],
    ["availableUntil", "Available until"],
  ],
  submissions: [
    ["student.name", "Student"],
    ["student.universityId", "University ID"],
    ["exam.title", "Exam"],
    ["status", "Status"],
    ["score.total", "Published score"],
    ["score.maximum", "Maximum score"],
    ["submittedAt", "Submitted"],
  ],
  meetings: [
    ["title", "Meeting"],
    ["course", "Course"],
    ["isActive", "Active"],
    ["attendanceCount", "Attendance records"],
    ["participantDurationSeconds", "Participant seconds"],
  ],
  registrations: [
    ["name", "Name"],
    ["role", "Role"],
    ["department", "Department"],
    ["accountStatus", "Account status"],
    ["universityVerified", "University verified"],
  ],
  groups: [
    ["name", "Group"],
    ["type", "Type"],
    ["memberCount", "Members"],
  ],
};

const RecordsPanel = ({ selection, filters, onClose }) => {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sortDir, setSortDir] = useState("desc");
  const params = useMemo(() => ({
    ...filters,
    category: selection.category,
    page,
    limit: 25,
    sortBy: "createdAt",
    sortDir,
    ...(selection.status ? { status: selection.status } : {}),
    ...(search ? { search } : {}),
  }), [filters, selection, page, search, sortDir]);
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["university-report-records", params],
    queryFn: () => fetchReportCenterRecords(params),
    staleTime: 30_000,
  });

  return (
    <Card title={`Records · ${selection.category}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">{selection.status ? `Filter: ${selection.status}` : data?.range?.label}</p>
        <button type="button" onClick={onClose} className="text-xs font-bold text-indigo-600 hover:underline">Close details</button>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }} className="mb-4 flex flex-wrap gap-2">
        <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} aria-label="Search report records" placeholder="Search records" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-slate-900" />
        <select value={sortDir} onChange={(event) => { setSortDir(event.target.value); setPage(1); }} aria-label="Sort records" className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs dark:border-white/10 dark:bg-slate-900">
          <option value="desc">Newest first</option>
          <option value="asc">Oldest first</option>
        </select>
        <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white">Search</button>
      </form>
      {isPending && <p className="text-sm text-slate-500">Loading records…</p>}
      {isError && <p role="alert" className="text-sm text-red-600">{error?.response?.data?.message || error?.message || "Records could not be loaded."}</p>}
      {!isPending && !isError && <DataTable columns={RECORD_COLUMNS[selection.category]} rows={data?.data || []} />}
      {data?.pagination && (
        <div className="mt-4 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
          <span>{formatNumber(data.pagination.total)} records · Page {data.pagination.page} of {Math.max(1, data.pagination.totalPages)}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 dark:border-white/10">Previous</button>
            <button type="button" onClick={() => setPage((value) => value + 1)} disabled={page >= data.pagination.totalPages} className="rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40 dark:border-white/10">Next</button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default function ReportsPage() {
  const [tab, setTab] = useState("overview");
  const [period, setPeriod] = useState("last30d");
  const [department, setDepartment] = useState("");
  const [course, setCourse] = useState("");
  const [semester, setSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exporting, setExporting] = useState("");
  const [recordSelection, setRecordSelection] = useState(null);

  const params = useMemo(() => ({
    period,
    ...(period === "custom" ? { startDate, endDate } : {}),
    ...(department ? { department } : {}),
    ...(course ? { course } : {}),
    ...(semester ? { semester } : {}),
    ...(academicYear ? { academicYear } : {}),
  }), [period, startDate, endDate, department, course, semester, academicYear]);

  const { data: report, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["university-report-center", params],
    queryFn: () => fetchReportCenter(params),
    staleTime: 30_000,
    enabled: period !== "custom" || Boolean(startDate && endDate),
  });
  const waitingForCustomRange = period === "custom" && (!startDate || !endDate);

  const resetFilters = () => {
    setPeriod("last30d");
    setDepartment("");
    setCourse("");
    setSemester("");
    setAcademicYear("");
    setStartDate("");
    setEndDate("");
  };

  const handleExport = async (format) => {
    setExporting(format);
    try {
      await downloadReportCenter(format, params);
    } catch (exportError) {
      toast.error(exportError?.response?.data?.message || exportError?.message || "Report export failed.");
    } finally {
      setExporting("");
    }
  };

  return (
    <main className="mx-auto max-w-[1600px] space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            University System Reports &amp; Analytics Center
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            A unified view of academic, library, collaboration, and administrative activity.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => refetch()} disabled={isFetching} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} /> Refresh
          </button>
          <button type="button" onClick={() => handleExport("csv")} disabled={!report || Boolean(exporting)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
            <Download size={14} /> {exporting === "csv" ? "Preparing…" : "CSV"}
          </button>
          <button type="button" onClick={() => handleExport("excel")} disabled={!report || Boolean(exporting)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
            <FileSpreadsheet size={14} /> {exporting === "excel" ? "Preparing…" : "Excel"}
          </button>
          <button type="button" onClick={() => handleExport("pdf")} disabled={!report || Boolean(exporting)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
            <FileText size={14} /> {exporting === "pdf" ? "Preparing…" : "PDF"}
          </button>
        </div>
      </header>

      <Card title="Reporting period and filters">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Period
            <select value={period} onChange={(event) => setPeriod(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm dark:border-white/10 dark:bg-slate-900">
              {PERIODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          {period === "custom" && <>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm dark:border-white/10 dark:bg-slate-900" /></label>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">End date<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm dark:border-white/10 dark:bg-slate-900" /></label>
          </>}
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Department
            <select value={department} onChange={(event) => { setDepartment(event.target.value); setCourse(""); }} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm dark:border-white/10 dark:bg-slate-900">
              <option value="">All departments</option>
              {(report?.filterOptions?.departments || []).map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Course
            <select value={course} onChange={(event) => setCourse(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm dark:border-white/10 dark:bg-slate-900">
              <option value="">All courses</option>
              {(report?.filterOptions?.courses || []).map((item) => <option key={item.id} value={item.id}>{item.courseCode} — {item.title}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Semester
            <select value={semester} onChange={(event) => setSemester(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm dark:border-white/10 dark:bg-slate-900">
              <option value="">All semesters</option>
              {(report?.filterOptions?.semesters || []).map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Academic year
            <select value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm dark:border-white/10 dark:bg-slate-900">
              <option value="">All years</option>
              {(report?.filterOptions?.academicYears || []).map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            {report?.range?.label || "Choose a complete custom date range to load reports."}
            {report?.timezone ? ` · ${report.timezone}` : ""}
          </p>
          <button type="button" onClick={resetFilters} className="text-xs font-bold text-indigo-600 hover:underline">Reset filters</button>
        </div>
        {report?.filterOptions?.coursesTruncated && <p className="mt-2 text-xs text-amber-700">Course options show the first 200 courses; use other filters to narrow the list.</p>}
      </Card>

      <SectionTabs active={tab} onChange={setTab} />

      {waitingForCustomRange && (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300">
          Select both dates to load a custom report. The maximum range is 367 days.
        </p>
      )}
      {isPending && !waitingForCustomRange && (
        <div aria-label="Loading reports" className="grid animate-pulse gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => <div key={index} className="h-28 rounded-2xl bg-slate-200 dark:bg-white/5" />)}
        </div>
      )}
      {isError && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div className="flex-1"><p className="font-bold">Reports could not be loaded.</p><p className="mt-1">{error?.response?.data?.message || error?.message || "Please try again."}</p></div>
          <button type="button" onClick={() => refetch()} className="font-bold underline">Retry</button>
        </div>
      )}
      {!isPending && !isError && report && (
        <SectionContent
          id={tab}
          report={report}
          onDrilldown={(category, status) => setRecordSelection({ category, status })}
        />
      )}
      {recordSelection && <RecordsPanel selection={recordSelection} filters={params} onClose={() => setRecordSelection(null)} />}

      {report?.limitations?.length > 0 && (
        <details className="rounded-2xl border border-slate-200 bg-white p-4 text-xs dark:border-white/10 dark:bg-slate-950">
          <summary className="cursor-pointer font-bold text-slate-700 dark:text-slate-200">Data coverage and unavailable metrics</summary>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-500 dark:text-slate-400">
            {report.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
          </ul>
        </details>
      )}
    </main>
  );
}
