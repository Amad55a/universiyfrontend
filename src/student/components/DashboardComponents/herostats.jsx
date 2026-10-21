// HeroStats.jsx
// Layer-3 interactive card: real streak + goal data, no placeholders.
// Pure presentational component — all numbers come from props (sourced
// from real user/session state upstream in HeroWelcome).

import { Flame } from "lucide-react";

const HeroStats = ({ user, resolvedClassLabel, streak, dailyGoal, completedToday, fallbackName, t }) => {
  const goalPct = Math.min(100, Math.round((completedToday / Math.max(dailyGoal, 1)) * 100));
  const initials = (user?.name || fallbackName || "S")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex-shrink-0 self-start lg:self-center bg-white dark:bg-[#14171a] rounded-2xl p-5 w-full lg:w-[200px] shadow-xl shadow-black/20 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#7FE83A] to-[#2C2DE0] flex items-center justify-center text-black font-black text-sm flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-gray-900 dark:text-white truncate">{user?.name || fallbackName || "Student"}</p>
          <p className="text-[11px] text-gray-400 truncate">UniCORE Student</p>
        </div>
      </div>

      <div className="h-px bg-gray-100 dark:bg-gray-800" />

      <div className="flex items-center gap-2.5">
        <Flame size={20} className="text-[#F5A623] flex-shrink-0" />
        <div>
          <p className="text-xl font-black text-gray-900 dark:text-white leading-none">{streak}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">{t?.hero?.dayStreak || "Day streak"}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-[10px] font-semibold text-gray-400 mb-1">
          <span>{t?.hero?.todaysGoal || "Today's goal"}</span>
          <span>{completedToday}/{dailyGoal}</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-[#7FE83A] to-[#2C2DE0]"
            style={{ width: `${goalPct}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default HeroStats;