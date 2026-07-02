import { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, Clock, Loader, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchIngestTaskHistory, retryIngestTask } from '../services/api';
import './IngestTaskHistory.css';

interface Task {
  task_id: string;
  institution_slug: string;
  upload_batch_id: string;
  files_count: number;
  created_at: string;
  celery_status: string;
  ready: boolean;
}

interface IngestTaskHistoryProps {
  apiKey: string;
}

export function IngestTaskHistory({ apiKey }: IngestTaskHistoryProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null);

  useEffect(() => {
    loadTaskHistory();
    // Refresh every 5 seconds
    const interval = setInterval(loadTaskHistory, 5000);
    return () => clearInterval(interval);
  }, [apiKey]);

  const loadTaskHistory = async () => {
    try {
      setLoading(true);
      const result = await fetchIngestTaskHistory(apiKey, 50);
      setTasks(result.tasks || []);
      setError('');
    } catch (err: any) {
      console.error('Failed to load task history:', err);
      setError(err.message || 'Failed to load task history');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (taskId: string) => {
    try {
      setRetryingTaskId(taskId);
      const result = await retryIngestTask(taskId, apiKey);
      console.log('Retry initiated:', result);
      // Reload task history
      await loadTaskHistory();
      setRetryingTaskId(null);
    } catch (err: any) {
      console.error('Retry failed:', err);
      setError(err.message);
      setRetryingTaskId(null);
    }
  };

  const getStatusIcon = (status: string, ready: boolean) => {
    if (!ready) {
      return <Loader className="task-icon pending" size={18} />;
    }
    
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle className="task-icon success" size={18} />;
      case 'FAILURE':
      case 'RETRY':
        return <AlertTriangle className="task-icon failure" size={18} />;
      case 'PENDING':
      case 'STARTED':
        return <Clock className="task-icon pending" size={18} />;
      default:
        return <Clock className="task-icon pending" size={18} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return '#10b981';
      case 'FAILURE':
      case 'RETRY':
        return '#ef4444';
      case 'PENDING':
      case 'STARTED':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="task-history-container">
        <div className="loading-state">
          <Loader className="spinner" size={32} />
          <p>Loading task history...</p>
        </div>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="task-history-container">
        <div className="empty-state">
          <Clock size={40} />
          <p>No ingestion tasks found</p>
          <p className="empty-desc">Tasks will appear here as you ingest documents</p>
        </div>
      </div>
    );
  }

  return (
    <div className="task-history-container">
      <div className="task-history-header">
        <h3>📋 Ingestion Task History</h3>
        <button 
          className="refresh-btn" 
          onClick={loadTaskHistory}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="tasks-list">
        {tasks.map((task) => (
          <div key={task.task_id} className="task-card">
            <div 
              className="task-header"
              onClick={() => setExpandedTaskId(
                expandedTaskId === task.task_id ? null : task.task_id
              )}
            >
              <div className="task-main-info">
                {getStatusIcon(task.celery_status, task.ready)}
                
                <div className="task-title">
                  <div className="task-institution">{task.institution_slug.toUpperCase()}</div>
                  <div className="task-id">ID: {task.task_id.substring(0, 12)}...</div>
                </div>

                <div className="task-status">
                  <span 
                    className="status-badge"
                    style={{ 
                      borderColor: getStatusColor(task.celery_status),
                      color: getStatusColor(task.celery_status),
                    }}
                  >
                    {task.celery_status}
                  </span>
                </div>

                <div className="task-time">
                  {formatDate(task.created_at)}
                </div>
              </div>

              <div className="task-expand">
                {expandedTaskId === task.task_id ? (
                  <ChevronUp size={18} />
                ) : (
                  <ChevronDown size={18} />
                )}
              </div>
            </div>

            {expandedTaskId === task.task_id && (
              <div className="task-details">
                <div className="detail-row">
                  <span className="detail-label">Full Task ID:</span>
                  <code className="detail-value">{task.task_id}</code>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Batch ID:</span>
                  <code className="detail-value">{task.upload_batch_id}</code>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Files Processed:</span>
                  <span className="detail-value">{task.files_count}</span>
                </div>

                <div className="detail-row">
                  <span className="detail-label">Created At:</span>
                  <span className="detail-value">{formatDate(task.created_at)}</span>
                </div>

                {task.celery_status === 'FAILURE' && (
                  <div className="task-actions">
                    <button 
                      className="retry-btn"
                      onClick={() => handleRetry(task.task_id)}
                      disabled={retryingTaskId === task.task_id}
                    >
                      {retryingTaskId === task.task_id ? (
                        <>
                          <Loader size={14} className="spinning" />
                          Retrying...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={14} />
                          Retry Task
                        </>
                      )}
                    </button>
                  </div>
                )}

                {task.celery_status === 'SUCCESS' && (
                  <div className="success-message">
                    ✅ Task completed successfully
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
