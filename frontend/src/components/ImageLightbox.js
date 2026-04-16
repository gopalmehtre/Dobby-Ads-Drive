import React, { useEffect } from 'react';
import { formatBytes, formatDate } from '../utils/helpers';
import './Modal.css';

const ImageLightbox = ({ image, onClose }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <div className="lightbox-box" onClick={e => e.stopPropagation()}>
        <button className="lightbox-close" onClick={onClose}>✕</button>
        <div className="lightbox-img-wrap">
          <img src={image.url} alt={image.name} />
        </div>
        <div className="lightbox-meta">
          <span className="lightbox-name">{image.name}</span>
          <div className="lightbox-details">
            <span>{formatBytes(image.size)}</span>
            <span>·</span>
            <span>{formatDate(image.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageLightbox;
