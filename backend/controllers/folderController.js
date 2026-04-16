const Folder = require('../models/Folder');
const Image = require('../models/Image');
const fs = require('fs');
const path = require('path');

// Recursively get all descendant folder IDs for a given folder
const getDescendantFolderIds = async (folderId, ownerId) => {
  const children = await Folder.find({ parent: folderId, owner: ownerId }).select('_id');
  const childIds = children.map(c => c._id);

  if (childIds.length === 0) return [];

  const deeperIds = await Promise.all(childIds.map(id => getDescendantFolderIds(id, ownerId)));
  return [...childIds, ...deeperIds.flat()];
};

// Calculate total size of a folder (including nested folders)
const calculateFolderSize = async (folderId, ownerId) => {
  const descendantIds = await getDescendantFolderIds(folderId, ownerId);
  const allFolderIds = [folderId, ...descendantIds];

  const result = await Image.aggregate([
    { $match: { folder: { $in: allFolderIds }, owner: ownerId } },
    { $group: { _id: null, totalSize: { $sum: '$size' } } },
  ]);

  return result.length > 0 ? result[0].totalSize : 0;
};

const getFolders = async (req, res) => {
  try {
    const { parent } = req.query;
    const ownerId = req.user._id;

    const query = {
      owner: ownerId,
      parent: parent ? parent : null,
    };

    const folders = await Folder.find(query).sort({ createdAt: -1 });

    // Attach size to each folder
    const foldersWithSize = await Promise.all(
      folders.map(async (folder) => {
        const size = await calculateFolderSize(folder._id, ownerId);
        return { ...folder.toObject(), totalSize: size };
      })
    );

    res.json({ success: true, folders: foldersWithSize });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const getFolder = async (req, res) => {
  try {
    const folder = await Folder.findOne({ _id: req.params.id, owner: req.user._id })
      .populate('ancestors', 'name');

    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    const totalSize = await calculateFolderSize(folder._id, req.user._id);

    res.json({ success: true, folder: { ...folder.toObject(), totalSize } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createFolder = async (req, res) => {
  try {
    const { name, parent } = req.body;
    const ownerId = req.user._id;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Folder name is required' });
    }

    let ancestors = [];

    if (parent) {
      const parentFolder = await Folder.findOne({ _id: parent, owner: ownerId });
      if (!parentFolder) {
        return res.status(404).json({ success: false, message: 'Parent folder not found' });
      }
      ancestors = [...parentFolder.ancestors, parentFolder._id];
    }

    const folder = await Folder.create({
      name,
      owner: ownerId,
      parent: parent || null,
      ancestors,
    });

    res.status(201).json({ success: true, message: 'Folder created successfully', folder });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A folder with this name already exists here' });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateFolder = async (req, res) => {
  try {
    const { name } = req.body;
    const folder = await Folder.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { name },
      { new: true, runValidators: true }
    );

    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    res.json({ success: true, message: 'Folder renamed successfully', folder });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A folder with this name already exists here' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteFolder = async (req, res) => {
  try {
    const folderId = req.params.id;
    const ownerId = req.user._id;

    const folder = await Folder.findOne({ _id: folderId, owner: ownerId });
    if (!folder) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }
    
    const descendantIds = await getDescendantFolderIds(folderId, ownerId);
    const allFolderIds = [folderId, ...descendantIds.map(id => id.toString())];

    // Delete all images inside these folders (also remove files from disk)
    const images = await Image.find({ folder: { $in: allFolderIds }, owner: ownerId });
    images.forEach(img => {
      const filePath = path.join(__dirname, '../uploads', img.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
    await Image.deleteMany({ folder: { $in: allFolderIds }, owner: ownerId });

    // Delete all descendant folders
    await Folder.deleteMany({ _id: { $in: allFolderIds }, owner: ownerId });

    res.json({ success: true, message: 'Folder and all contents deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getFolders, getFolder, createFolder, updateFolder, deleteFolder, calculateFolderSize };
