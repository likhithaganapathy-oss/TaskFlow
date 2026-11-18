import React, { useState } from 'react';
import {
  User,
  Settings,
  Moon,
  Sun,
  Clock,
  Target,
  Sparkles,
  Save,
  Check,
  Shield,
  Mail,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';

const AVATAR_OPTIONS = [
  '🎓', '📚', '⚡', '💻', '🚀', '🧠', '🔬', '🌟', '🎨', '🔥', '🏆', '🦉'
];

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme, setTheme, isDark } = useTheme();
  const { showToast } = useToast();

  const [name, setName] = useState(user?.name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || '🎓');
  const [focusMinutes, setFocusMinutes] = useState(user?.preferences?.pomodoroFocusMinutes || 25);
  const [breakMinutes, setBreakMinutes] = useState(user?.preferences?.pomodoroBreakMinutes || 5);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(user?.preferences?.dailyStudyGoalMinutes || 120);

  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/auth/profile', {
        name,
        avatar: selectedAvatar,
        preferences: {
          theme,
          pomodoroFocusMinutes: Number(focusMinutes),
          pomodoroBreakMinutes: Number(breakMinutes),
          dailyStudyGoalMinutes: Number(dailyGoalMinutes),
        },
      });

      if (res.data?.user) {
        updateUser(res.data.user);
      }
      showToast('Profile & study preferences updated successfully!', 'success');
    } catch (err) {
      console.error('Failed to update profile:', err);
      showToast('Failed to save profile changes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            Feature 12
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">Personalization & Settings</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2.5">
          Profile & Preferences
          <Settings className="w-6 h-6 text-slate-600 dark:text-slate-300" />
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Customize your study avatar, light/dark appearance, and Pomodoro focus targets.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* User Card */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-4xl shadow-lg shadow-blue-500/20 shrink-0">
              {selectedAvatar}
            </div>

            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {name || user?.name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" />
                  <span className="capitalize">{user?.role || 'Student'}</span>
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                <span>{user?.email}</span>
              </div>
            </div>
          </div>

          {/* Avatar Selector */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700/80 space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Your Student Avatar
            </label>
            <div className="flex flex-wrap gap-2.5">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  type="button"
                  key={emoji}
                  onClick={() => setSelectedAvatar(emoji)}
                  className={`w-11 h-11 text-xl rounded-xl flex items-center justify-center transition-all ${
                    selectedAvatar === emoji
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800 scale-110'
                      : 'bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {isDark ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
                <span>Theme & Appearance Mode</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Toggle between light and dark visual themes for low-light night study sessions.
              </p>
            </div>

            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  !isDark
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isDark
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-purple-400" />
                <span>Dark</span>
              </button>
            </div>
          </div>
        </div>

        {/* Study Planner & Pomodoro Customization */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-sm space-y-5">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span>Study Planner & Focus Targets</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Customize your default Pomodoro focus duration and daily study hours.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Focus Duration (minutes)
              </label>
              <input
                type="number"
                min="5"
                max="60"
                value={focusMinutes}
                onChange={(e) => setFocusMinutes(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Break Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Daily Study Target (minutes)
              </label>
              <input
                type="number"
                min="30"
                max="600"
                step="30"
                value={dailyGoalMinutes}
                onChange={(e) => setDailyGoalMinutes(e.target.value)}
                className="w-full text-xs sm:text-sm px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            {saving ? (
              <span>Saving...</span>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Preferences</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
