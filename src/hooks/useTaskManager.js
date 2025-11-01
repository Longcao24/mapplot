/**
 * useTaskManager Hook
 * Manages task data and operations
 */

import { useState, useEffect, useCallback } from 'react';
import {
  apiGetTasks,
  apiCreateTask,
  apiUpdateTask,
  apiDeleteTask,
  apiCompleteTask,
  apiGetOverdueTasks,
} from '../lib/taskApi';

export function useTaskManager() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // all, todo, in_progress, done
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGetTasks();
      setTasks(data);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create task
  const createTask = useCallback(async (taskData) => {
    try {
      const newTask = await apiCreateTask(taskData);
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (err) {
      console.error('Error creating task:', err);
      throw err;
    }
  }, []);

  // Update task
  const updateTask = useCallback(async (taskId, updates) => {
    try {
      const updatedTask = await apiUpdateTask(taskId, updates);
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
      return updatedTask;
    } catch (err) {
      console.error('Error updating task:', err);
      throw err;
    }
  }, []);

  // Delete task
  const deleteTask = useCallback(async (taskId) => {
    try {
      await apiDeleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Error deleting task:', err);
      throw err;
    }
  }, []);

  // Complete task
  const completeTask = useCallback(async (taskId) => {
    try {
      const updatedTask = await apiCompleteTask(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
      return updatedTask;
    } catch (err) {
      console.error('Error completing task:', err);
      throw err;
    }
  }, []);

  // Filter tasks
  const filteredTasks = useCallback(() => {
    let filtered = [...tasks];

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => t.status === filterStatus);
    }

    // Filter by priority
    if (filterPriority !== 'all') {
      filtered = filtered.filter(t => t.priority === filterPriority);
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.task_type === filterType);
    }

    return filtered;
  }, [tasks, filterStatus, filterPriority, filterType]);

  // Get task statistics
  const getTaskStats = useCallback(() => {
    const stats = {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      done: tasks.filter(t => t.status === 'done').length,
      overdue: tasks.filter(t => {
        if (t.status === 'done') return false;
        if (!t.due_date) return false;
        return new Date(t.due_date) < new Date();
      }).length,
      highPriority: tasks.filter(t => 
        t.priority === 'urgent' || t.priority === 'high'
      ).length,
    };
    return stats;
  }, [tasks]);

  // Get overdue tasks
  const getOverdueTasks = useCallback(() => {
    return tasks.filter(t => {
      if (t.status === 'done') return false;
      if (!t.due_date) return false;
      return new Date(t.due_date) < new Date();
    });
  }, [tasks]);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks: filteredTasks(),
    allTasks: tasks,
    loading,
    error,
    filterStatus,
    filterPriority,
    filterType,
    setFilterStatus,
    setFilterPriority,
    setFilterType,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    completeTask,
    getTaskStats,
    getOverdueTasks,
  };
}

