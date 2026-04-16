import React from 'react';
import './Modal.css';

const ConfirmModal = ({ title, message, onConfirm, onClose }) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h3 className="modal-title">{title}</h3>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <div className="modal-body">
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{message}</p>
      </div>
      <div className="modal-footer">
        <button className="modal-btn secondary" onClick={onClose}>Cancel</button>
        <button className="modal-btn danger" onClick={onConfirm}>Delete</button>
      </div>
    </div>
  </div>
);

export default ConfirmModal;
