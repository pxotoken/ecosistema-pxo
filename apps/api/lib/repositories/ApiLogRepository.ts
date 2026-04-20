/**
 * API Log Repository
 * Handles CRUD operations for api_logs table
 */

import { supabase } from '../supabase.js';
import type { ApiLog, CreateApiLogData } from '@pxo/shared/types';

/**
 * Insert a new API log
 * @param logData - Log data to insert
 * @returns Created log record
 */
export async function createLog(logData: CreateApiLogData): Promise<ApiLog> {
  const { data, error } = await supabase
    .from('api_logs')
    .insert({
      provider: logData.provider,
      method: logData.method,
      endpoint: logData.endpoint,
      status: logData.status,
      response: logData.response,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create API log: ${error.message}`);
  }

  return data;
}

/**
 * Get API log by ID
 * @param id - Log UUID
 * @returns Log record
 */
export async function findById(id: string): Promise<ApiLog> {
  const { data, error } = await supabase
    .from('api_logs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Failed to find API log: ${error.message}`);
  }

  return data;
}

/**
 * Get logs by provider
 * @param provider - Provider name
 * @param limit - Number of records to return (default: 100)
 * @returns Array of log records
 */
export async function findByProvider(provider: string, limit: number = 100): Promise<ApiLog[]> {
  const { data, error } = await supabase
    .from('api_logs')
    .select('*')
    .eq('provider', provider)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to find logs by provider: ${error.message}`);
  }

  return data || [];
}

/**
 * Get logs by status
 * @param status - Log status (SUCCESS or FAILED)
 * @param limit - Number of records to return (default: 100)
 * @returns Array of log records
 */
export async function findByStatus(status: number, limit: number = 100): Promise<ApiLog[]> {
  const { data, error } = await supabase
    .from('api_logs')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to find logs by status: ${error.message}`);
  }

  return data || [];
}

/**
 * Get logs within a date range
 * @param startDate - Start date
 * @param endDate - End date
 * @param limit - Number of records to return (default: 100)
 * @returns Array of log records
 */
export async function findByDateRange(
  startDate: Date,
  endDate: Date,
  limit: number = 100
): Promise<ApiLog[]> {
  const { data, error } = await supabase
    .from('api_logs')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to find logs by date range: ${error.message}`);
  }

  return data || [];
}

/**
 * Get failed API calls (status >= 400)
 * @param limit - Number of records to return (default: 100)
 * @returns Array of failed log records
 */
export async function findFailedCalls(limit: number = 100): Promise<ApiLog[]> {
  const { data, error } = await supabase
    .from('api_logs')
    .select('*')
    .gte('status', 400)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to find failed API calls: ${error.message}`);
  }

  return data || [];
}

/**
 * Update log (rarely used, but available if needed)
 * @param id - Log UUID
 * @param updateData - Data to update
 * @returns Updated log record
 */
export async function updateLog(id: string, updateData: Partial<CreateApiLogData>): Promise<ApiLog> {
  const { data, error } = await supabase
    .from('api_logs')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update API log: ${error.message}`);
  }

  return data;
}

/**
 * Delete old logs (cleanup)
 * @param daysOld - Delete logs older than X days
 * @returns Number of deleted records
 */
export async function deleteOldLogs(daysOld: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const { data, error } = await supabase
    .from('api_logs')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .select();

  if (error) {
    throw new Error(`Failed to delete old logs: ${error.message}`);
  }

  return data?.length || 0;
}

/**
 * Perform keep-alive check on database
 * Executes a lightweight count query to maintain database activity
 * @returns Record count and query duration
 */
export async function performKeepAlive(): Promise<{
  recordCount: number | null;
  duration: number;
}> {
  const startTime = Date.now();

  const { count, error } = await supabase
    .from('api_logs')
    .select('id', { count: 'exact', head: true })
    .limit(1);

  const duration = Date.now() - startTime;

  if (error) {
    throw new Error(`Keep-alive query failed: ${error.message}`);
  }

  return {
    recordCount: count,
    duration,
  };
}

export default {
  createLog,
  findById,
  findByProvider,
  findByStatus,
  findByDateRange,
  findFailedCalls,
  updateLog,
  deleteOldLogs,
  performKeepAlive,
};
