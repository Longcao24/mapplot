/**
 * Task API Service
 * Handles all task-related operations with Supabase
 */

import { supabase } from './supabase';

/**
 * Get all tasks for the current user
 * @returns {Promise<Array>} Array of task objects
 */
export async function apiGetTasks() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        customer:customers(id, name, company)
      `)
      .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('priority', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
}

/**
 * Get a single task by ID
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} Task object
 */
export async function apiGetTask(taskId) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        customer:customers(id, name, company, email, phone)
      `)
      .eq('id', taskId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching task:', error);
    throw error;
  }
}

/**
 * Create a new task
 * @param {Object} taskData - Task data
 * @returns {Promise<Object>} Created task
 */
export async function apiCreateTask(taskData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...taskData,
        created_by: user.id,
        assigned_to: taskData.assigned_to || user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
}

/**
 * Update an existing task
 * @param {string} taskId - Task ID
 * @param {Object} updates - Task updates
 * @returns {Promise<Object>} Updated task
 */
export async function apiUpdateTask(taskId, updates) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
}

/**
 * Delete a task
 * @param {string} taskId - Task ID
 * @returns {Promise<void>}
 */
export async function apiDeleteTask(taskId) {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}

/**
 * Mark task as completed
 * @param {string} taskId - Task ID
 * @returns {Promise<Object>} Updated task
 */
export async function apiCompleteTask(taskId) {
  return apiUpdateTask(taskId, {
    status: 'done',
    completed_at: new Date().toISOString(),
  });
}

/**
 * Get tasks by status
 * @param {string} status - Task status (todo, in_progress, done)
 * @returns {Promise<Array>} Array of tasks
 */
export async function apiGetTasksByStatus(status) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        customer:customers(id, name, company)
      `)
      .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
      .eq('status', status)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching tasks by status:', error);
    throw error;
  }
}

/**
 * Get overdue tasks
 * @returns {Promise<Array>} Array of overdue tasks
 */
export async function apiGetOverdueTasks() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        customer:customers(id, name, company)
      `)
      .or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`)
      .neq('status', 'done')
      .lt('due_date', today)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching overdue tasks:', error);
    throw error;
  }
}

