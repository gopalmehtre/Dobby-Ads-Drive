import React, { useState, useRef } from 'react';
import { formatBytes } from '../utils/helpers';
import './Modal.css';

const UploadModal = ({ onConfirm, onClose }) => {
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef();

  const handleFile = (f) => {
    if (!f || !f.type.startsWith('image/')) return;
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^/.]+$/, ''));
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !name.trim()) return;
    setLoading(true);
    try {
      await onConfirm(name.trim(), file, (p) => setProgress(p));
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={!loading ? onClose : undefined}>
      <div className="modal-box modal-box--lg" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Upload Image</h3>
          {!loading && <button className="modal-close" onClick={onClose}>✕</button>}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Drop zone */}
            <div
              className={`drop-zone ${dragOver ? 'drag-over' : ''} ${preview ? 'has-preview' : ''}`}
              onClick={() => !loading && fileInput.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {preview ? (
                <div className="drop-preview">
                  <img src={preview} alt="preview" />
                  <div className="drop-preview-info">
                    <span>{file?.name}</span>
                    <span>{formatBytes(file?.size)}</span>
                  </div>
                </div>
              ) : (
                <div className="drop-placeholder">
                  <span className="drop-icon">📷</span>
                  <p>Click or drag an image here</p>
                  <span>JPEG, PNG, GIF, WebP up to 10MB</span>
                </div>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])}
              />
            </div>

            {/* Name */}
            <div>
              <label className="field-label" style={{ display: 'block', marginBottom: 8 }}>Image Name</label>
              <input
                className="modal-input"
                type="text"
                placeholder="Enter image name"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={100}
                disabled={loading}
              />
            </div>

            {/* Progress bar */}
            {loading && (
              <div className="upload-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <span>{progress}%</span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="modal-btn secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              type="submit"
              className="modal-btn primary"
              disabled={!file || !name.trim() || loading}
            >
              {loading ? <span className="btn-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadModal;
