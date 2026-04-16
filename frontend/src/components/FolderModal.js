import React, { useState, useEffect, useRef } from 'react';
import './Modal.css';

const FolderModal = ({ title, initialValue = '', onConfirm, onClose }) => {
  const [name, setName] = useState(initialValue);
  const inputRef = useRef();

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <input
              ref={inputRef}
              className="modal-input"
              type="text"
              placeholder="Folder name"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="modal-btn secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="modal-btn primary" disabled={!name.trim()}>
              {initialValue ? 'Rename' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FolderModal;
