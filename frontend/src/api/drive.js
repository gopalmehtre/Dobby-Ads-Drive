import api from './axios';

export const foldersAPI = {
  getAll: async (parentId = null) => {
    const params = parentId ? { parent: parentId } : {};
    const res = await api.get('/folders', { params });
    return res.data;
  },
  getOne: async (id) => {
    const res = await api.get(`/folders/${id}`);
    return res.data;
  },
  create: async (name, parentId = null) => {
    const res = await api.post('/folders', { name, parent: parentId });
    return res.data;
  },
  rename: async (id, name) => {
    const res = await api.put(`/folders/${id}`, { name });
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/folders/${id}`);
    return res.data;
  },
};

export const imagesAPI = {
  getAll: async (folderId) => {
    const res = await api.get('/images', { params: { folder: folderId } });
    return res.data;
  },
  upload: async (name, file, folderId, onProgress) => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('image', file);
    formData.append('folder', folderId);

    const res = await api.post('/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    });
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/images/${id}`);
    return res.data;
  },
};
