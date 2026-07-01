import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, CheckCircle, AlertTriangle, Loader, Eye, EyeOff } from 'lucide-react';
import { uploadDocuments, fetchTaskStatus } from '../services/api';
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
  
  // Results & status references
  const [taskId, setTaskId] = useState('');
  const [taskStatus, setTaskStatus] = useState<TaskStatusResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  
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
    
    // Poll every 2 seconds
    pollTimerRef.current = window.setInterval(async () => {
      try {
        const status = await fetchTaskStatus(tid, apiKey);
        setTaskStatus(status);
        
        if (status.ready) {
          stopPolling();
          if (status.status === 'SUCCESS') {
            setUploadState('success');
          } else {
            setErrorMessage(status.result?.error || 'Background task ingestion failed');
            setUploadState('error');
          }
        }
      } catch (err: any) {
        console.error("Task status polling error:", err);
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

        {uploadState === 'idle' || uploadState === 'uploading' ? (
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
        )}
      </div>

      <style>{`
        .admin-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(8, 10, 15, 0.85);
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
          border-radius: 12px;
          overflow: hidden;
          background: var(--bg-card);
          box-shadow: var(--shadow-premium);
          border: 1px solid rgba(255, 255, 255, 0.05);
          animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .modal-header {
          padding: 20px 24px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--bg-dark);
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
          font-size: 15px;
          font-family: var(--font-display);
          color: #fff;
          letter-spacing: 0.05em;
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
          font-size: 10px;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-wrapper input {
          width: 100%;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.05);
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
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: #fff;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 14px;
          width: 100%;
        }

        .dropzone {
          border: 2.5px dashed rgba(197, 168, 128, 0.25);
          background: rgba(197, 168, 128, 0.015);
          border-radius: 8px;
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
          background: rgba(197, 168, 128, 0.04);
        }

        .drop-icon {
          color: var(--color-primary);
          margin-bottom: 12px;
        }

        .drop-prompt {
          font-size: 13px;
          font-weight: 700;
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
          background: rgba(255, 255, 255, 0.015);
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
          color: var(--color-accent);
        }

        .submit-btn {
          width: 100%;
          background: var(--color-primary);
          color: var(--bg-deep);
          font-weight: 700;
          font-size: 14px;
          padding: 12px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .submit-btn:hover:not(:disabled) {
          background: #ebdcb9;
          transform: translateY(-1px);
        }

        .submit-btn:disabled {
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-muted);
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
        }

        .status-icon-large.failure {
          color: var(--color-accent);
        }

        .status-box h3 {
          font-size: 17px;
          font-family: var(--font-display);
          color: #fff;
        }

        .status-label {
          font-size: 11px;
          color: var(--text-muted);
        }

        .status-label code {
          background: rgba(0, 0, 0, 0.2);
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
          background: rgba(197, 168, 128, 0.08);
          border: 1px solid rgba(197, 168, 128, 0.2);
          padding: 6px 14px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 700;
          color: var(--color-primary);
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
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.03);
          border-radius: 8px;
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
          font-size: 9px;
          text-transform: uppercase;
          color: var(--text-muted);
          font-weight: 700;
        }

        .error-card {
          background: rgba(194, 89, 63, 0.05);
          border: 1px solid rgba(194, 89, 63, 0.15);
          border-radius: 8px;
          padding: 12px;
          font-family: var(--font-mono);
          font-size: 12px;
          color: #f87171;
          max-width: 400px;
          word-break: break-all;
        }

        .reset-btn {
          margin-top: 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: #fff;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 700;
          transition: all 0.2s;
        }

        .reset-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </div>
  );
}
