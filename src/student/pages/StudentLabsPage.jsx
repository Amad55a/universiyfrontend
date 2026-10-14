import React from "react";
import { Link } from "react-router-dom";
import { Code2, Palette, Terminal, Network, Monitor, ArrowRight } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { StudentCodingLab as CodingLab } from "@/teacher/components/CodingLab";
import DesignLab from "@/teacher/components/DesignLab";
import LinuxLab from "@/teacher/components/LinuxLab";
import NetworkingLab from "@/teacher/components/NetworkingLab";
import WindowsLab from "@/teacher/components/WindowsLab";
import { LINUX_TERMINAL_ENABLED } from "@/config/features";

const PRIMARY_BTN =
  "bg-[#2C2DE0] text-white text-sm font-bold shadow-[0_4px_0_#1E1FAA] " +
  "hover:translate-y-0.5 hover:shadow-[0_2px_0_#1E1FAA] " +
  "active:translate-y-1 active:shadow-none transition-all duration-150";

const LABS = [
  {
    id: "coding",
    label: "Coding Lab",
    icon: Code2,
    component: CodingLab,
    props: {
      question: {
        allowedLanguages: ["javascript"],
        starterCode: "console.log('Hello Lab');",
      },
      value: "",
      onChange: () => {},
      output: "",
      onOutput: () => {},
    },
  },
  {
    id: "design",
    label: "Design Lab",
    icon: Palette,
    component: DesignLab,
    props: { question: { question: "Create a poster design" } },
  },
  {
    id: "linux",
    label: "Linux Terminal",
    icon: Terminal,
    component: LinuxLab,
    props: { examId: "practice" },
  },
  {
    id: "network",
    label: "Cisco Network",
    icon: Network,
    component: NetworkingLab,
    props: { question: { question: "Build a LAN topology" } },
  },
  {
    id: "windows",
    label: "Windows Lab",
    icon: Monitor,
    component: WindowsLab,
    props: { question: { question: "Organize files in the file system" } },
  },
];

export default function StudentLabsPage() {
  const { t } = useLanguage();
  const [active, setActive] = React.useState("coding");
  const availableLabs = LABS.filter(lab => lab.id !== "linux" || LINUX_TERMINAL_ENABLED);
  const lab = availableLabs.find(l => l.id === active);
  const ActiveComponent = lab?.component;

  const translatedLabels = {
    coding:  t("labs.coding")  || "Coding Lab",
    design:  t("labs.design")  || "Design Lab",
    linux:   t("labs.linux")   || "Linux Terminal",
    network: t("labs.network") || "Cisco Network",
    windows: t("labs.windows") || "Windows Lab",
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#2C2DE0] flex items-center justify-center text-sm font-bold text-white">
              L
            </div>
            <div>
              <h1 className="font-semibold text-sm">
                {t("labs.title") || "Engineering Labs"}
              </h1>
              <p className="text-[10px] text-neutral-500">
                {t("labs.subtitle") || "Simulation environment"}
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-4 text-xs">
            <Link to="/dashboard" className="text-neutral-400 hover:text-[#2C2DE0]">
              {t("labs.dashboard") || "Dashboard"}
            </Link>
            <Link
              to="/exam-portal"
              className="text-neutral-400 hover:text-[#2C2DE0] flex items-center gap-1"
            >
              {t("labs.exams") || "Exams"} <ArrowRight className="w-3 h-3" />
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 flex gap-6">
        <aside className="w-56 shrink-0 space-y-1">
          {availableLabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActive(item.id)}
              className={`group w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm ${
                active === item.id
                  ? `${PRIMARY_BTN} justify-start`
                  : "text-neutral-400 font-medium hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
              }`}
            >
              {React.createElement(item.icon, { className: "w-4 h-4" })}
              {translatedLabels[item.id]}
            </button>
          ))}
        </aside>

        <main className="flex-1 min-w-0 rounded-2xl border border-neutral-800 bg-neutral-900 overflow-hidden">
          {ActiveComponent && <ActiveComponent {...lab.props} />}
        </main>
      </div>
    </div>
  );
}