import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import TaskForm from '../components/TaskForm';
import { taskService } from '../services/taskService';
import { useToast } from '../context/ToastContext';

const AppLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { showSuccess, showError } = useToast();

  const handleCreateTask = async (taskData) => {
    try {
      setIsSubmitting(true);
      const res = await taskService.createTask(taskData);
      showSuccess(res.message || 'Assignment created successfully!');
      setIsNewTaskOpen(false);
      // Trigger a global custom event so active pages refresh their data instantly
      window.dispatchEvent(new Event('taskflow-data-changed'));
    } catch (err) {
      showError(err.message || 'Failed to create assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      {/* Sidebar (desktop collapsible & mobile drawer) */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onOpenNewTaskModal={() => setIsNewTaskOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet context={{ onOpenNewTaskModal: () => setIsNewTaskOpen(true) }} />
        </main>
      </div>

      {/* Global Quick Add Task Modal */}
      <TaskForm
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        onSubmit={handleCreateTask}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

export default AppLayout;

