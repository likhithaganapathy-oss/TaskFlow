import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  Send,
  FileText,
  Lightbulb,
  Calendar,
  Layers,
  Copy,
  Check,
  RotateCcw,
  Bot,
  User as UserIcon,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { aiService } from '../services/aiService';
import { taskService } from '../services/taskService';
import { useToast } from '../context/ToastContext';

export default function AIAssistantPage() {
  const { showToast } = useToast();

  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [customSubject, setCustomSubject] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [customDescription, setCustomDescription] = useState('');

  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "👋 Hi! I'm TaskFlow AI, your dedicated academic study companion. Select an assignment or enter any topic, and I'll help you summarize deliverables, explain complex concepts, or generate structured study schedules!",
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Load student assignments
  useEffect(() => {
    async function loadTasks() {
      try {
        const res = await taskService.getTasks();
        const list = res.data?.tasks || res.tasks || (Array.isArray(res) ? res : []);
        setTasks(list);
        if (list.length > 0) {
          setSelectedTask(list[0]);
        }
      } catch (err) {
        console.error('Failed to load assignments:', err);
      }
    }
    loadTasks();
  }, []);

  const handleSelectTask = (e) => {
    const id = e.target.value;
    if (id === 'custom') {
      setSelectedTask(null);
    } else {
      const found = tasks.find((t) => t._id === id);
      setSelectedTask(found || null);
    }
  };

  const handleQuickAction = async (action) => {
    const title = selectedTask ? selectedTask.title : customTitle || 'Academic Assignment';
    const subject = selectedTask ? selectedTask.subject : customSubject || 'General Studies';
    const description = selectedTask ? selectedTask.description : customDescription || '';

    // Append user query message
    const actionPrompts = {
      summarize: `📝 Summarize deliverables and checklist for "${title}"`,
      guidance: `🎯 Personalized tips & strategy for top grade on "${title}"`,
      explain: `💡 Explain core academic concepts for "${title}"`,
      schedule: `⏱️ Build a 4-day Pomodoro study schedule for "${title}"`,
      breakdown: `🎯 Break down "${title}" into 4 clear milestones`,
    };

    const userMessage = { sender: 'user', text: actionPrompts[action] || `Assistance with ${title}` };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await aiService.getAssistance({
        action,
        title,
        subject,
        description,
        query: actionPrompts[action],
      });

      const replyText = res.data?.response || res.response || "Here's what I recommend for your study plan.";
      setMessages((prev) => [...prev, { sender: 'ai', text: replyText, action }]);
    } catch (err) {
      console.error('AI assistant error:', err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: '⚠️ I encountered an error connecting to the academic engine. Please try again or rephrase your question.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputQuery.trim() || loading) return;

    const query = inputQuery.trim();
    setInputQuery('');
    setMessages((prev) => [...prev, { sender: 'user', text: query }]);
    setLoading(true);

    const title = selectedTask ? selectedTask.title : customTitle || 'Academic Assignment';
    const subject = selectedTask ? selectedTask.subject : customSubject || 'General Studies';
    const description = selectedTask ? selectedTask.description : customDescription || '';

    try {
      const res = await aiService.getAssistance({
        action: 'chat',
        title,
        subject,
        description,
        query,
      });

      const replyText = res.data?.response || res.response || "I've reviewed your request.";
      setMessages((prev) => [...prev, { sender: 'ai', text: replyText }]);
    } catch (err) {
      console.error('AI assistant chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: '⚠️ I had trouble processing your question. Please try again in a moment.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    showToast('Copied study notes to clipboard!', 'success');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
              Feature 11
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Gemini-Powered / Academic Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2.5">
            AI Study Assistant
            <Sparkles className="w-6 h-6 text-purple-500 fill-purple-500/20" />
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Generate assignment summaries, step-by-step milestone breakdowns, and tailored Pomodoro study plans.
          </p>
        </div>

        <Link
          to="/pomodoro"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
        >
          <span>Open Pomodoro Timer</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Context / Assignment Selector */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
              <BookOpen className="w-4 h-4 text-purple-500" />
              <span>Study Context & Assignment</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Choose Assignment:
              </label>
              <select
                value={selectedTask ? selectedTask._id : 'custom'}
                onChange={handleSelectTask}
                className="w-full text-xs sm:text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
              >
                {tasks.map((t) => (
                  <option key={t._id} value={t._id}>
                    [{t.subject || 'Course'}] {t.title}
                  </option>
                ))}
                <option value="custom">✏️ Custom Topic / Freeform Question</option>
              </select>
            </div>

            {selectedTask ? (
              <div className="p-3.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 text-xs space-y-2">
                <div className="font-bold text-purple-900 dark:text-purple-300 text-sm">
                  {selectedTask.title}
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Subject:</span>{' '}
                  {selectedTask.subject}
                </div>
                <div className="text-slate-600 dark:text-slate-400 line-clamp-3">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Instructions:</span>{' '}
                  {selectedTask.description || 'No detailed instructions provided.'}
                </div>
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Subject / Course</label>
                  <input
                    type="text"
                    placeholder="e.g. Data Structures, Machine Learning"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Topic / Task Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Binary Search Trees, Essay on Ethics"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Notes / Details</label>
                  <textarea
                    rows="3"
                    placeholder="Paste assignment description or instructions here..."
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Quick-Action Cards */}
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 p-5 shadow-sm space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              One-Click Study Actions
            </span>

            <div className="grid grid-cols-1 gap-2.5 pt-1">
              <button
                onClick={() => handleQuickAction('summarize')}
                disabled={loading}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-left transition-all group disabled:opacity-50"
              >
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Summarize Deliverables
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Key objectives & checklist
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleQuickAction('guidance')}
                disabled={loading}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 text-left transition-all group disabled:opacity-50"
              >
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Personalized Guidance
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Strategy & tips for top marks
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleQuickAction('explain')}
                disabled={loading}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 text-left transition-all group disabled:opacity-50"
              >
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Explain Concepts
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Simplified intuition & terms
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleQuickAction('schedule')}
                disabled={loading}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 text-left transition-all group disabled:opacity-50"
              >
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    4-Day Study Plan
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    With Pomodoro time estimates
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleQuickAction('breakdown')}
                disabled={loading}
                className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-left transition-all group disabled:opacity-50"
              >
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    4-Milestone Breakdown
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Bite-sized sequential tasks
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Chat & Guidance Stream */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col h-[650px] overflow-hidden">
          {/* Thread Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  TaskFlow AI Academic Advisor
                </div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Ready to assist
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                setMessages([
                  {
                    sender: 'ai',
                    text: "Conversation reset! How can I help you tackle your coursework today?",
                  },
                ])
              }
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50"
              title="Clear Conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((m, idx) => {
              const isAi = m.sender === 'ai';
              return (
                <div
                  key={idx}
                  className={`flex gap-3 ${isAi ? 'items-start' : 'items-start flex-row-reverse'}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-xs ${
                      isAi ? 'bg-purple-600' : 'bg-blue-600'
                    }`}
                  >
                    {isAi ? <Bot className="w-3.5 h-3.5" /> : <UserIcon className="w-3.5 h-3.5" />}
                  </div>

                  <div
                    className={`relative max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-sm ${
                      isAi
                        ? 'bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-200'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {/* Copy Button for AI Responses */}
                    {isAi && (
                      <button
                        onClick={() => handleCopy(m.text, idx)}
                        className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800"
                        title="Copy to clipboard"
                      >
                        {copiedIndex === idx ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    <div className="whitespace-pre-wrap font-sans">{m.text}</div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl px-4 py-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                  <span>TaskFlow AI is analyzing assignment structure...</span>
                </div>
              </div>
            )}
          </div>

          {/* Prompt Input Form */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 flex items-center gap-3"
          >
            <input
              type="text"
              placeholder="Ask TaskFlow AI a question or request guidance..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              disabled={loading}
              className="flex-1 text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !inputQuery.trim()}
              className="px-4 py-2.5 bg-purple-600 text-white rounded-xl font-medium text-xs sm:text-sm hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1.5 transition-colors shadow-md shadow-purple-500/20"
            >
              <span>Ask</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
