import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  CheckCircle2,
  Clock,
  BookOpen,
  Flame,
  Award,
  Volume2,
  VolumeX,
  Sparkles,
} from 'lucide-react';
import { taskService } from '../services/taskService';
import { useToast } from '../context/ToastContext';

export default function PomodoroPage() {
  const { showToast } = useToast();

  // Mode durations in seconds
  const MODES = {
    focus: { label: 'Focus Time', duration: 25 * 60, color: 'text-blue-500', bg: 'bg-blue-600', ring: 'stroke-blue-500' },
    shortBreak: { label: 'Short Break', duration: 5 * 60, color: 'text-emerald-500', bg: 'bg-emerald-600', ring: 'stroke-emerald-500' },
    longBreak: { label: 'Long Break', duration: 15 * 60, color: 'text-purple-500', bg: 'bg-purple-600', ring: 'stroke-purple-500' },
  };

  const [activeMode, setActiveMode] = useState('focus');
  const [timeLeft, setTimeLeft] = useState(MODES.focus.duration);
  const [isRunning, setIsRunning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Assignment linkage
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [loadingTasks, setLoadingTasks] = useState(true);

  // Statistics
  const [completedSessions, setCompletedSessions] = useState(() => {
    return parseInt(localStorage.getItem('taskflow_pomodoro_count') || '0', 10);
  });
  const [totalMinutesToday, setTotalMinutesToday] = useState(() => {
    return parseInt(localStorage.getItem('taskflow_pomodoro_minutes') || '0', 10);
  });

  const timerRef = useRef(null);

  // Fetch student assignments to select for linking
  useEffect(() => {
    async function loadTasks() {
      try {
        const res = await taskService.getTasks();
        const taskList = res.data?.tasks || res.tasks || (Array.isArray(res) ? res : []);
        setTasks(taskList);
        if (taskList.length > 0) {
          setSelectedTaskId(taskList[0]._id);
        }
      } catch (err) {
        console.error('Failed to load assignments:', err);
      } finally {
        setLoadingTasks(false);
      }
    }
    loadTasks();
  }, []);

  // Web Audio chime generator
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch {
      // AudioContext unavailable or blocked
    }
  };

  // Timer Tick
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isRunning, activeMode, selectedTaskId]);

  const handleTimerComplete = async () => {
    setIsRunning(false);
    playChime();

    if (activeMode === 'focus') {
      const newCount = completedSessions + 1;
      const newMinutes = totalMinutesToday + 25;
      setCompletedSessions(newCount);
      setTotalMinutesToday(newMinutes);
      localStorage.setItem('taskflow_pomodoro_count', newCount.toString());
      localStorage.setItem('taskflow_pomodoro_minutes', newMinutes.toString());

      showToast('🎉 Focus session completed! Outstanding work.', 'success');

      // Auto-log to selected task if any
      if (selectedTaskId) {
        try {
          await taskService.logStudyTime(selectedTaskId, {
            minutes: 25,
            isPomodoro: true,
          });
          showToast('25 study minutes recorded to your assignment progress!', 'info');
        } catch (err) {
          console.error('Error logging study time:', err);
        }
      }

      // Next suggest short or long break
      if (newCount % 4 === 0) {
        switchMode('longBreak');
      } else {
        switchMode('shortBreak');
      }
    } else {
      showToast('Break finished! Ready to jump back in?', 'info');
      switchMode('focus');
    }
  };

  const switchMode = (mode) => {
    setActiveMode(mode);
    setTimeLeft(MODES[mode].duration);
    setIsRunning(false);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(MODES[activeMode].duration);
  };

  const skipTimer = () => {
    setIsRunning(false);
    if (activeMode === 'focus') {
      switchMode('shortBreak');
    } else {
      switchMode('focus');
    }
  };

  // Time format MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // SVG Progress circle calculation
  const totalDuration = MODES[activeMode].duration;
  const progressPercent = ((totalDuration - timeLeft) / totalDuration) * 100;
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const selectedTask = tasks.find((t) => t._id === selectedTaskId);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              Feature 10
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Deep Work Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
            Study Planner & Pomodoro Timer
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Boost focus with 25-minute intervals, eliminate fatigue, and track study hours against assignments.
          </p>
        </div>

        {/* Audio Mute / Sound Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all"
            title={soundEnabled ? 'Mute alert chime' : 'Enable alert chime'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            <span>{soundEnabled ? 'Chime Active' : 'Muted'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Timer Console */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-8 shadow-sm flex flex-col items-center">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center p-1.5 bg-slate-100 dark:bg-slate-900/60 rounded-xl mb-8 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => switchMode('focus')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                activeMode === 'focus'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Focus (25m)
            </button>
            <button
              onClick={() => switchMode('shortBreak')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                activeMode === 'shortBreak'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Short Break (5m)
            </button>
            <button
              onClick={() => switchMode('longBreak')}
              className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                activeMode === 'longBreak'
                  ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Long Break (15m)
            </button>
          </div>

          {/* Circular Countdown Gauge */}
          <div className="relative flex items-center justify-center my-4">
            <svg className="w-64 h-64 sm:w-72 sm:h-72 transform -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r={radius}
                className="stroke-slate-100 dark:stroke-slate-700/50 fill-transparent"
                strokeWidth="10"
              />
              <circle
                cx="50%"
                cy="50%"
                r={radius}
                className={`fill-transparent transition-all duration-500 ease-linear ${MODES[activeMode].ring}`}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>

            {/* Inner Clock Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
                {formatTime(timeLeft)}
              </span>
              <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                {MODES[activeMode].label}
              </span>
              {selectedTask && activeMode === 'focus' && (
                <div className="mt-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700/70 text-slate-700 dark:text-slate-300 text-xs font-medium max-w-[180px] truncate">
                  🎯 {selectedTask.title}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 mt-8">
            <button
              onClick={resetTimer}
              className="p-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition-all"
              title="Reset Timer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={toggleTimer}
              className={`flex items-center gap-2.5 px-8 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 ${
                MODES[activeMode].bg
              } hover:opacity-90 shadow-blue-500/20`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Start Focus</span>
                </>
              )}
            </button>

            <button
              onClick={skipTimer}
              className="p-3 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl transition-all"
              title="Skip to next phase"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sidebar: Coursework Linkage & Daily Metrics */}
        <div className="space-y-6">
          {/* Linked Coursework Picker */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-base mb-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              <span>Link to Assignment</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Focus intervals will automatically log 25 study minutes toward this task's analytics.
            </p>

            {loadingTasks ? (
              <div className="text-xs text-slate-400 py-3">Loading coursework list...</div>
            ) : tasks.length === 0 ? (
              <div className="text-xs text-slate-400 py-3">No active assignments found.</div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Select Assignment:
                </label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="">-- No specific assignment --</option>
                  {tasks.map((t) => (
                    <option key={t._id} value={t._id}>
                      [{t.subject || 'Course'}] {t.title}
                    </option>
                  ))}
                </select>

                {selectedTask && (
                  <div className="mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-xs space-y-1">
                    <div className="font-semibold text-blue-800 dark:text-blue-300">
                      {selectedTask.title}
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 flex items-center justify-between">
                      <span>Priority: <strong className="capitalize">{selectedTask.priority}</strong></span>
                      <span>Due: {new Date(selectedTask.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Today's Streak & Goal Progress */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Today's Summary
              </span>
              <Flame className="w-5 h-5 text-amber-500" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Completed</span>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {completedSessions}
                </div>
                <div className="text-[11px] text-slate-400">Sessions</div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-medium">
                  <Clock className="w-3.5 h-3.5 text-purple-500" />
                  <span>Time Focused</span>
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {totalMinutesToday}
                </div>
                <div className="text-[11px] text-slate-400">Minutes</div>
              </div>
            </div>

            {/* Daily Goal Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-600 dark:text-slate-300">Daily 120m Goal</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">
                  {Math.min(100, Math.round((totalMinutesToday / 120) * 100))}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (totalMinutesToday / 120) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
