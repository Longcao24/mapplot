/**
 * TasksPage Component
 * Main page for task management with list and form
 */

import React, { useState } from 'react';
import { useTaskManager } from '../hooks/useTaskManager';
import './TasksPage.css';

export default function TasksPage() {
  const {
    tasks,
    error,
    filterStatus,
    filterPriority,
    filterType,
    setFilterStatus,
    setFilterPriority,
    setFilterType,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    getTaskStats,
    getOverdueTasks,
  } = useTaskManager();

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    task_type: 'todo',
    priority: 'none',
    due_date: '',
    note: '',
  });

  const stats = getTaskStats();
  const overdueTasks = getOverdueTasks();

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await updateTask(editingTask.id, formData);
      } else {
        await createTask(formData);
      }
      resetForm();
    } catch (err) {
      alert('Error saving task: ' + err.message);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: '',
      task_type: 'todo',
      priority: 'none',
      due_date: '',
      note: '',
    });
    setEditingTask(null);
    setShowForm(false);
  };

  // Handle edit
  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      task_type: task.task_type || 'todo',
      priority: task.priority || 'none',
      due_date: task.due_date || '',
      note: task.note || '',
    });
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(taskId);
      } catch (err) {
        alert('Error deleting task: ' + err.message);
      }
    }
  };

  // Handle complete toggle
  const handleCompleteToggle = async (task) => {
    try {
      if (task.status === 'done') {
        await updateTask(task.id, { status: 'todo', completed_at: null });
      } else {
        await completeTask(task.id);
      }
    } catch (err) {
      alert('Error updating task: ' + err.message);
    }
  };

  // Get priority badge class
  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'urgent': return 'priority-urgent';
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-none';
    }
  };

  // Get task type icon
  const getTaskTypeIcon = (type) => {
    switch (type) {
      case 'call':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case 'email':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="22,6 12,13 2,6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 11l3 3L22 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Check if task is overdue
  const isOverdue = (task) => {
    if (task.status === 'done') return false;
    if (!task.due_date) return false;
    return new Date(task.due_date) < new Date();
  };

  return (
    <div className="tasks-page-content">
      {/* Page Header */}
      <div className="tasks-header">
          <div>
            <h1>Tasks</h1>
            <p className="tasks-subtitle">Manage your follow-ups and activities</p>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="12" y1="5" x2="12" y2="19" strokeWidth="2" strokeLinecap="round"/>
              <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            New Task
          </button>
        </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="tasks-stats">
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card stat-todo">
          <div className="stat-label">To Do</div>
          <div className="stat-value">{stats.todo}</div>
        </div>
        <div className="stat-card stat-progress">
          <div className="stat-label">In Progress</div>
          <div className="stat-value">{stats.inProgress}</div>
        </div>
        <div className="stat-card stat-done">
          <div className="stat-label">Done</div>
          <div className="stat-value">{stats.done}</div>
        </div>
        {stats.overdue > 0 && (
          <div className="stat-card stat-overdue">
            <div className="stat-label">Overdue</div>
            <div className="stat-value">{stats.overdue}</div>
          </div>
        )}
        {stats.highPriority > 0 && (
          <div className="stat-card stat-urgent">
            <div className="stat-label">High Priority</div>
            <div className="stat-value">{stats.highPriority}</div>
          </div>
        )}
      </div>

      <div className="tasks-content">
        {/* Sidebar Filters */}
        <div className="tasks-sidebar">
          <div className="filter-section">
            <h3>Status</h3>
            <button
              className={filterStatus === 'all' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('all')}
            >
              All ({stats.total})
            </button>
            <button
              className={filterStatus === 'todo' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('todo')}
            >
              To Do ({stats.todo})
            </button>
            <button
              className={filterStatus === 'in_progress' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('in_progress')}
            >
              In Progress ({stats.inProgress})
            </button>
            <button
              className={filterStatus === 'done' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterStatus('done')}
            >
              Done ({stats.done})
            </button>
          </div>

          <div className="filter-section">
            <h3>Type</h3>
            <button
              className={filterType === 'all' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterType('all')}
            >
              All
            </button>
            <button
              className={filterType === 'todo' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterType('todo')}
            >
              To Do
            </button>
            <button
              className={filterType === 'call' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterType('call')}
            >
              Call
            </button>
            <button
              className={filterType === 'email' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterType('email')}
            >
              Email
            </button>
          </div>

          <div className="filter-section">
            <h3>Priority</h3>
            <button
              className={filterPriority === 'all' ? 'filter-btn active' : 'filter-btn'}
              onClick={() => setFilterPriority('all')}
            >
              All
            </button>
            <button
              className={filterPriority === 'urgent' ? 'filter-btn active priority-urgent' : 'filter-btn'}
              onClick={() => setFilterPriority('urgent')}
            >
              Urgent
            </button>
            <button
              className={filterPriority === 'high' ? 'filter-btn active priority-high' : 'filter-btn'}
              onClick={() => setFilterPriority('high')}
            >
              High
            </button>
            <button
              className={filterPriority === 'medium' ? 'filter-btn active priority-medium' : 'filter-btn'}
              onClick={() => setFilterPriority('medium')}
            >
              Medium
            </button>
            <button
              className={filterPriority === 'low' ? 'filter-btn active priority-low' : 'filter-btn'}
              onClick={() => setFilterPriority('low')}
            >
              Low
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="tasks-main">
          {/* Task Form Modal */}
          {showForm && (
            <div className="modal-overlay" onClick={resetForm}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>{editingTask ? 'Edit Task' : 'New Task'}</h2>
                  <button className="close-btn" onClick={resetForm}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="task-form">
                  <div className="form-group">
                    <label>Title *</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Enter task title"
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Type</label>
                      <select
                        name="task_type"
                        value={formData.task_type}
                        onChange={handleInputChange}
                      >
                        <option value="todo">To Do</option>
                        <option value="call">Call</option>
                        <option value="email">Email</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Priority</label>
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                      >
                        <option value="none">None</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Due Date</label>
                    <input
                      type="date"
                      name="due_date"
                      value={formData.due_date}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Note</label>
                    <textarea
                      name="note"
                      value={formData.note}
                      onChange={handleInputChange}
                      placeholder="Add notes or details..."
                      rows="4"
                    />
                  </div>

                  <div className="form-actions">
                    <button type="button" className="btn-secondary" onClick={resetForm}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-primary">
                      {editingTask ? 'Update Task' : 'Create Task'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Task List */}
          <div className="tasks-list">
            {tasks.length === 0 ? (
              <div className="no-tasks">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 11l3 3L22 4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <p>No tasks found</p>
                <button className="btn-primary" onClick={() => setShowForm(true)}>
                  Create Your First Task
                </button>
              </div>
            ) : (
              tasks.map(task => (
                <div
                  key={task.id}
                  className={`task-item ${task.status === 'done' ? 'task-done' : ''} ${isOverdue(task) ? 'task-overdue' : ''}`}
                >
                  <div className="task-checkbox">
                    <input
                      type="checkbox"
                      checked={task.status === 'done'}
                      onChange={() => handleCompleteToggle(task)}
                    />
                  </div>
                  <div className="task-content">
                    <div className="task-title-row">
                      <h3 className="task-title">{task.title}</h3>
                      <div className="task-badges">
                        <span className="task-type-badge">
                          {getTaskTypeIcon(task.task_type)}
                          {task.task_type}
                        </span>
                        {task.priority !== 'none' && (
                          <span className={`priority-badge ${getPriorityClass(task.priority)}`}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                    </div>
                    {task.note && <p className="task-note">{task.note}</p>}
                    <div className="task-meta">
                      {task.due_date && (
                        <span className={`task-due ${isOverdue(task) ? 'overdue' : ''}`}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2"/>
                            <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2"/>
                          </svg>
                          {formatDate(task.due_date)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="task-actions">
                    <button
                      className="task-action-btn"
                      onClick={() => handleEdit(task)}
                      title="Edit"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <button
                      className="task-action-btn delete-btn"
                      onClick={() => handleDelete(task.id)}
                      title="Delete"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <polyline points="3 6 5 6 21 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

