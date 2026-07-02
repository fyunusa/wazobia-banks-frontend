import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, CheckCircle, AlertTriangle, Loader, Eye, EyeOff, History } from 'lucide-react';
import { uploadDocuments, fetchTaskStatus } from '../services/api';
import { IngestTaskHistory } from './IngestTaskHistory';
import type { TaskStatusResponse } from '../services/api';

interface AdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
  bankSlugs: Array<{ slug: string; name: string }>;
}

export function AdminPortal({ isOpen, onClose, bankSlugs }: AdminPortalProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState(bankSlugs[0]?.slug || '');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'polling' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  
  // Results & status references
  const [taskId, setTaskId] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatusResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [pollingAttempts, setPollingAttempts] = useState(0);
  const MAX_POLLING_ATTEMPTS = 300; // 10 minutes at 2 second intervals
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimerRef = useRef<number | null>(null);

  // Clean up polling timer on close or unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const removeFile = (idx: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const startPolling = (tid: string) => {
    setUploadState('polling');
    setTaskId(tid);
    setPollingAttempts(0);
    
    // Poll every 2 seconds (max 10 minutes = 300 attempts)
    pollTimerRef.current = window.setInterval(async () => {
      setPollingAttempts(prev => {
        const newAttempts = prev + 1;
        
        // Timeout after 10 minutes
        if (newAttempts > MAX_POLLING_ATTEMPTS) {
          stopPolling();
          setErrorMessage(`Task timeout after ${MAX_POLLING_ATTEMPTS * 2}s. Task may still be processing - check logs.`);
          setUploadState('error');
          return newAttempts;
        }
        
        return newAttempts;
      });
      
      try {
        const status = await fetchTaskStatus(tid, apiKey);
        setTaskStatus(status);
        
        if (status.ready) {
          stopPolling();
          if (status.status === 'SUCCESS') {
            setUploadState('success');
          } else {
            setErrorMessage(status.result?.error || `Task failed with status: ${status.status}`);
            setUploadState('error');
          }
        }
      } catch (err: any) {
        console.error("Task status polling error:", err);
        // Don't stop polling on error - the task might still be processing
      }
    }, 2000);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      alert("Please provide the administrative X-API-Key to proceed.");
      return;
    }
    if (selectedFiles.length === 0) {
      alert("Please select at least one file to upload.");
      return;
    }

    setUploadState('uploading');
    setErrorMessage('');
    
    try {
      const res = await uploadDocuments(selectedSlug, selectedFiles, apiKey);
      if (res.task_id) {
        startPolling(res.task_id);
      } else {
        setUploadState('success');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'File upload failed.');
      setUploadState('error');
    }
  };

  const resetForm = () => {
    setSelectedFiles([]);
    setUploadState('idle');
    setTaskId('');
    setTaskStatus(null);
    setErrorMessage('');
    setPollingAttempts(0);
    stopPolling();
  };

  if (!isOpen) return null;

  return (
    <div className="admin-modal-overlay">
      <div className="admin-modal glass">
        {/* Modal Header */}
        <div className="modal-header">
          <div className="title-row">
            <Upload className="modal-icon" />
            <h2>ADMIN INGESTION PORTAL</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="modal-tabs">
          <button 
            className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <Upload size={14} />
            <span>Upload Documents</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={14} />
            <span>Task History</span>
          </button>
        </div>

        {/* Upload Tab */}
        {activeTab === 'upload' && (uploadState === 'idle' || uploadState === 'uploading' ? (
          <form onSubmit={handleUploadSubmit} className="modal-body">
            {/* API Key Input */}
            <div className="form-group">
              <label>X-API-Key (Administrative Auth)</label>
              <div className="input-wrapper">
                <input
                  type={showKey ? 'text' : 'password'}
                  placeholder="Enter admin credential..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  className="eye-btn" 
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Target Bank Slug */}
            <div className="form-group">
              <label>Target Bank / Institution</label>
              <select 
                value={selectedSlug} 
                onChange={(e) => setSelectedSlug(e.target.value)}
              >
                {bankSlugs.map(slug => (
                  <option key={slug.slug} value={slug.slug}>
                    {slug.name} ({slug.slug})
                  </option>
                ))}
              </select>
            </div>

            {/* File Drag-Drop Area */}
            <div 
              className="dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={32} className="drop-icon" />
              <p className="drop-prompt">Drag & Drop or Click to browse files</p>
              <span className="drop-details">Supported formats: DOCX, JSON, PDF (Max 50MB per file)</span>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept=".docx,.json,.pdf"
                style={{ display: 'none' }}
              />
            </div>

            {/* Selected files list */}
            {selectedFiles.length > 0 && (
              <div className="files-list-box">
                <label>Files to Ingest ({selectedFiles.length})</label>
                <div className="files-scroll">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="file-item">
                      <div className="file-meta">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                      <button 
                        type="button" 
                        className="file-remove-btn" 
                        onClick={() => removeFile(idx)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              className="submit-btn" 
              disabled={uploadState === 'uploading'}
            >
              {uploadState === 'uploading' ? (
                <>
                  <Loader className="spinner" size={16} />
                  <span>Uploading files to server...</span>
                </>
              ) : (
                <span>Upload and Ingest Knowledgebase</span>
              )}
            </button>
          </form>
        ) : (
          /* Task Polling and Result screen */
          <div className="modal-body status-view">
            {uploadState === 'polling' && (
              <div className="status-box">
                <Loader className="spinner status-icon-large" size={48} />
                <h3>Ingestion Processing</h3>
                <p className="status-label">Celery Task ID: <code>{taskId}</code></p>
                <p className="status-desc">
                  Files uploaded successfully. Server is running RAG pipeline: parsing documents, generating semantic chunks, computing cohere embeddings, and writing to Qdrant.
                </p>
                <div className="polling-tag">
                  <span className="pulse-dot" />
                  <span>Status: {taskStatus?.status || 'PENDING'}</span>
                </div>
                <p className="polling-time">
                  Elapsed: {Math.floor(pollingAttempts * 2 / 60)}m {(pollingAttempts * 2) % 60}s
                  {pollingAttempts > 0 && ` (checking... attempt ${pollingAttempts})`}
                </p>
              </div>
            )}

            {uploadState === 'success' && (
              <div className="status-box">
                <CheckCircle className="status-icon-large success" size={48} />
                <h3>Knowledgebase Ingestion Successful!</h3>
                <p className="status-desc">
                  The documents have been parsed, indexed, and integrated into the Qdrant vector database.
                </p>
                
                {taskStatus?.result && (
                  <div className="result-stats">
                    <div className="stat-card">
                      <span className="stat-val">{taskStatus.result.pages_scraped || 1}</span>
                      <span className="stat-name">Pages Scraped</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-val">{taskStatus.result.chunks_created || 0}</span>
                      <span className="stat-name">Chunks Formed</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-val">{taskStatus.result.points_upserted || 0}</span>
                      <span className="stat-name">Points Indexed</span>
                    </div>
                  </div>
                )}
                
                <button className="reset-btn" onClick={resetForm}>
                  Upload More Files
                </button>
              </div>
            )}

            {uploadState === 'error' && (
              <div className="status-box">
                <AlertTriangle className="status-icon-large failure" size={48} />
                <h3>Ingestion Pipeline Error</h3>
                <div className="error-card">
                  <p>{errorMessage}</p>
                </div>
                <button className="reset-btn" onClick={resetForm}>
                  Try Again
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Task History Tab */}
        {activeTab === 'history' && apiKey && (
          <div className="modal-body">
            <IngestTaskHistory apiKey={apiKey} />
          </div>
        )}

        {activeTab === 'history' && !apiKey && (
          <div className="modal-body">
            <div className="empty-state">
              <AlertTriangle size={32} />
              <p>Please enter your X-API-Key on the Upload tab first</p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .admin-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 500;
          animation: fadeIn 0.25s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .admin-modal {
          width: 500px;
          max-width: 90%;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(13, 17, 34, 0.4);
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-icon {
          color: var(--color-primary);
        }

        .modal-header h2 {
          font-size: 16px;
          color: #fff;
          letter-spacing: 0.05em;
        }

        .modal-tabs {
          display: flex;
          gap: 0;
          border-bottom: 1px solid rgba(99, 102, 241, 0.1);
          padding: 0 24px;
          background: rgba(15, 23, 42, 0.5);
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border-bottom: 2px solid transparent;
          white-space: nowrap;
        }

        .tab-btn:hover {
          color: rgba(255, 255, 255, 0.7);
        }

        .tab-btn.active {
          color: #6366f1;
          border-bottom-color: #6366f1;
        }

        .tab-btn svg {
          opacity: 0.8;
        }

        .modal-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-height: calc(85vh - 70px);
          overflow-y: auto;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-size: 11px;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-wrapper input {
          width: 100%;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #fff;
          padding: 10px 40px 10px 12px;
          border-radius: 8px;
          font-size: 14px;
        }

        .eye-btn {
          position: absolute;
          right: 12px;
          background: transparent;
          color: var(--text-secondary);
        }

        .form-group select {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #fff;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 14px;
          width: 100%;
        }

        .dropzone {
          border: 2px dashed rgba(99, 102, 241, 0.25);
          background: rgba(99, 102, 241, 0.02);
          border-radius: 12px;
          padding: 32px 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .dropzone:hover {
          border-color: var(--color-primary);
          background: rgba(99, 102, 241, 0.05);
        }

        .drop-icon {
          color: var(--color-primary);
          margin-bottom: 12px;
          animation: pulse-ring 2.5s infinite;
        }

        .drop-prompt {
          font-size: 13px;
          font-weight: 500;
          color: #fff;
          margin-bottom: 4px;
        }

        .drop-details {
          font-size: 10px;
          color: var(--text-muted);
        }

        .files-list-box {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .files-list-box label {
          font-size: 11px;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 600;
        }

        .files-scroll {
          max-height: 120px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          padding: 6px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .file-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          padding: 6px 10px;
          border-radius: 6px;
        }

        .file-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          overflow: hidden;
        }

        .file-name {
          font-size: 12px;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 250px;
        }

        .file-size {
          font-size: 10px;
          color: var(--text-muted);
        }

        .file-remove-btn {
          background: transparent;
          color: var(--text-muted);
          transition: color 0.2s;
        }

        .file-remove-btn:hover {
          color: #ef4444;
        }

        .submit-btn {
          width: 100%;
          background: var(--color-primary);
          color: #fff;
          font-weight: 600;
          font-size: 14px;
          padding: 12px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
          transition: all 0.2s;
        }

        .submit-btn:hover:not(:disabled) {
          background: var(--color-accent);
          box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4);
        }

        .submit-btn:disabled {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-muted);
          box-shadow: none;
          cursor: not-allowed;
        }

        .status-view {
          min-height: 250px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .status-box {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .status-icon-large {
          margin-bottom: 8px;
        }

        .status-icon-large.success {
          color: #10b981;
          filter: drop-shadow(0 0 10px rgba(16, 185, 129, 0.3));
        }

        .status-icon-large.failure {
          color: #ef4444;
          filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.3));
        }

        .status-box h3 {
          font-size: 18px;
          color: #fff;
        }

        .status-label {
          font-size: 11px;
          color: var(--text-muted);
        }

        .status-label code {
          background: rgba(0, 0, 0, 0.3);
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
        }

        .status-desc {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
          max-width: 400px;
        }

        .polling-tag {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.2);
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 600;
          color: var(--color-primary);
        }

        .polling-time {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 12px;
          text-align: center;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: var(--color-primary);
          border-radius: 50%;
          animation: pulse-ring 1.5s infinite;
        }

        .result-stats {
          display: flex;
          gap: 12px;
          margin-top: 12px;
          width: 100%;
        }

        .stat-card {
          flex: 1;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          padding: 12px 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat-val {
          font-size: 20px;
          font-weight: 700;
          color: #fff;
          font-family: var(--font-mono);
        }

        .stat-name {
          font-size: 10px;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 600;
        }

        .error-card {
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.15);
          border-radius: 8px;
          padding: 12px;
          font-family: var(--font-mono);
          font-size: 12px;
          color: #f87171;
          max-width: 400px;
          word-break: break-all;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          color: rgba(255, 255, 255, 0.6);
          text-align: center;
        }

        .empty-state svg {
          margin-bottom: 12px;
          color: #6366f1;
          opacity: 0.6;
        }

        .empty-state p {
          margin: 0;
          font-size: 13px;
        }

        .reset-btn {
          margin-top: 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #fff;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .reset-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
