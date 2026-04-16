import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { foldersAPI, imagesAPI } from '../api/drive';
import { formatBytes, formatDate } from '../utils/helpers';
import FolderModal from '../components/FolderModal';
import UploadModal from '../components/UploadModal';
import ImageLightbox from '../components/ImageLightbox';
import ConfirmModal from '../components/ConfirmModal';
import './Drive.css';

const Drive = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { folderId } = useParams();

  const [folders, setFolders] = useState([]);
  const [images, setImages] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'folder'|'image', item }

  const loadContents = useCallback(async () => {
    setLoading(true);
    try {
      const [folderRes, imageRes] = await Promise.all([
        foldersAPI.getAll(folderId || null),
        folderId ? imagesAPI.getAll(folderId) : Promise.resolve({ images: [] }),
      ]);
      setFolders(folderRes.folders || []);
      setImages(imageRes.images || []);

      // Load current folder for breadcrumbs
      if (folderId) {
        const fRes = await foldersAPI.getOne(folderId);
        const folder = fRes.folder;
        setCurrentFolder(folder);
        const crumbs = folder.ancestors
          ? folder.ancestors.map(a => ({ id: a._id, name: a.name }))
          : [];
        setBreadcrumbs([...crumbs, { id: folder._id, name: folder.name }]);
      } else {
        setCurrentFolder(null);
        setBreadcrumbs([]);
      }
    } catch (err) {
      toast.error('Failed to load contents');
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  useEffect(() => { loadContents(); }, [loadContents]);

  const handleCreateFolder = async (name) => {
    try {
      await foldersAPI.create(name, folderId || null);
      toast.success('Folder created');
      setShowFolderModal(false);
      loadContents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create folder');
    }
  };

  const handleRename = async (name) => {
    try {
      await foldersAPI.rename(renameTarget._id, name);
      toast.success('Folder renamed');
      setRenameTarget(null);
      loadContents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to rename');
    }
  };

  const handleDeleteFolder = async () => {
    try {
      await foldersAPI.delete(confirmDelete.item._id);
      toast.success('Folder deleted');
      setConfirmDelete(null);
      loadContents();
    } catch (err) {
      toast.error('Failed to delete folder');
    }
  };

  const handleDeleteImage = async () => {
    try {
      await imagesAPI.delete(confirmDelete.item._id);
      toast.success('Image deleted');
      setConfirmDelete(null);
      loadContents();
    } catch (err) {
      toast.error('Failed to delete image');
    }
  };

  const handleUpload = async (name, file) => {
    try {
      await imagesAPI.upload(name, file, folderId);
      toast.success('Image uploaded!');
      setShowUploadModal(false);
      loadContents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isEmpty = !loading && folders.length === 0 && images.length === 0;

  return (
    <div className="drive-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">D</div>
          <span className="sidebar-brand-name">Dobby Drive</span>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`sidebar-nav-item ${!folderId ? 'active' : ''}`}
            onClick={() => navigate('/')}
          >
            <IconHome /> My Drive
          </button>
        </nav>
        <div className="sidebar-actions">
          <button className="sidebar-action-btn" onClick={() => setShowFolderModal(true)}>
            <IconFolderPlus /> New Folder
          </button>
          {folderId && (
            <button className="sidebar-action-btn accent" onClick={() => setShowUploadModal(true)}>
              <IconUpload /> Upload Image
            </button>
          )}
        </div>
        <div className="sidebar-user">
          <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase()}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name}</span>
            <span className="sidebar-user-email">{user?.email}</span>
          </div>
          <button className="sidebar-logout" onClick={handleLogout} title="Logout">
            <IconLogout />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="drive-main">
        {/* Header / Breadcrumbs */}
        <div className="drive-header">
          <div className="breadcrumbs">
            <button className="breadcrumb-item" onClick={() => navigate('/')}>My Drive</button>
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={crumb.id}>
                <span className="breadcrumb-sep">/</span>
                <button
                  className={`breadcrumb-item ${i === breadcrumbs.length - 1 ? 'active' : ''}`}
                  onClick={() => navigate(`/folder/${crumb.id}`)}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>
          {currentFolder && (
            <div className="folder-meta">
              <span className="folder-size-badge">
                <IconDatabase /> {formatBytes(currentFolder.totalSize)}
              </span>
            </div>
          )}
          <div className="header-actions">
            <button className="header-btn" onClick={() => setShowFolderModal(true)}>
              <IconFolderPlus /> New Folder
            </button>
            {folderId && (
              <button className="header-btn accent" onClick={() => setShowUploadModal(true)}>
                <IconUpload /> Upload
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="drive-content">
          {loading ? (
            <div className="drive-loading">
              <div className="loading-spinner" />
              <p>Loading...</p>
            </div>
          ) : isEmpty ? (
            <div className="drive-empty">
              <div className="empty-icon">📂</div>
              <h3>This folder is empty</h3>
              <p>Create a folder or upload an image to get started</p>
              <div className="empty-actions">
                <button className="empty-btn" onClick={() => setShowFolderModal(true)}>
                  New Folder
                </button>
                {folderId && (
                  <button className="empty-btn accent" onClick={() => setShowUploadModal(true)}>
                    Upload Image
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Folders section */}
              {folders.length > 0 && (
                <section className="content-section">
                  <h2 className="section-title">Folders</h2>
                  <div className="folders-grid">
                    {folders.map(folder => (
                      <FolderCard
                        key={folder._id}
                        folder={folder}
                        onOpen={() => navigate(`/folder/${folder._id}`)}
                        onRename={() => setRenameTarget(folder)}
                        onDelete={() => setConfirmDelete({ type: 'folder', item: folder })}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Images section */}
              {images.length > 0 && (
                <section className="content-section">
                  <h2 className="section-title">Images</h2>
                  <div className="images-grid">
                    {images.map(image => (
                      <ImageCard
                        key={image._id}
                        image={image}
                        onView={() => setLightboxImage(image)}
                        onDelete={() => setConfirmDelete({ type: 'image', item: image })}
                      />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      {/* Modals */}
      {showFolderModal && (
        <FolderModal
          title="New Folder"
          onConfirm={handleCreateFolder}
          onClose={() => setShowFolderModal(false)}
        />
      )}
      {renameTarget && (
        <FolderModal
          title="Rename Folder"
          initialValue={renameTarget.name}
          onConfirm={handleRename}
          onClose={() => setRenameTarget(null)}
        />
      )}
      {showUploadModal && (
        <UploadModal
          onConfirm={handleUpload}
          onClose={() => setShowUploadModal(false)}
        />
      )}
      {lightboxImage && (
        <ImageLightbox
          image={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title={`Delete ${confirmDelete.type === 'folder' ? 'Folder' : 'Image'}?`}
          message={
            confirmDelete.type === 'folder'
              ? `"${confirmDelete.item.name}" and all its contents will be permanently deleted.`
              : `"${confirmDelete.item.name}" will be permanently deleted.`
          }
          onConfirm={confirmDelete.type === 'folder' ? handleDeleteFolder : handleDeleteImage}
          onClose={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
};

/* ─── Sub-components ─── */

const FolderCard = ({ folder, onOpen, onRename, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="folder-card" onDoubleClick={onOpen}>
      <div className="folder-card-icon" onClick={onOpen}>
        <IconFolder />
      </div>
      <div className="folder-card-info">
        <span className="folder-card-name">{folder.name}</span>
        <span className="folder-card-size">{formatBytes(folder.totalSize)}</span>
      </div>
      <div className="card-menu-wrap">
        <button
          className="card-menu-btn"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
        >
          <IconDots />
        </button>
        {menuOpen && (
          <div className="card-menu" onMouseLeave={() => setMenuOpen(false)}>
            <button onClick={() => { setMenuOpen(false); onOpen(); }}>
              <IconOpen /> Open
            </button>
            <button onClick={() => { setMenuOpen(false); onRename(); }}>
              <IconEdit /> Rename
            </button>
            <button className="danger" onClick={() => { setMenuOpen(false); onDelete(); }}>
              <IconTrash /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const ImageCard = ({ image, onView, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="image-card" onDoubleClick={onView}>
      <div className="image-card-thumb" onClick={onView}>
        <img src={image.url} alt={image.name} loading="lazy" />
      </div>
      <div className="image-card-info">
        <span className="image-card-name">{image.name}</span>
        <span className="image-card-meta">{formatBytes(image.size)} · {formatDate(image.createdAt)}</span>
      </div>
      <div className="card-menu-wrap">
        <button
          className="card-menu-btn"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
        >
          <IconDots />
        </button>
        {menuOpen && (
          <div className="card-menu" onMouseLeave={() => setMenuOpen(false)}>
            <button onClick={() => { setMenuOpen(false); onView(); }}>
              <IconOpen /> View
            </button>
            <button className="danger" onClick={() => { setMenuOpen(false); onDelete(); }}>
              <IconTrash /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── SVG Icons ─── */
const IconHome = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>;
const IconFolderPlus = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>;
const IconUpload = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/></svg>;
const IconLogout = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const IconFolder = () => <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>;
const IconDots = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>;
const IconEdit = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IconTrash = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;
const IconOpen = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>;
const IconDatabase = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>;

export default Drive;
