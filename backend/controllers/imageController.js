const Image = require('../models/Image');
const Folder = require('../models/Folder');
const fs = require('fs');
const path = require('path');

const getImages = async (req, res) => {
  try {
    const { folder } = req.query;
    if (!folder) {
      return res.status(400).json({ success: false, message: 'Folder ID is required' });
    }

    const folderDoc = await Folder.findOne({ _id: folder, owner: req.user._id });
    if (!folderDoc) {
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    const images = await Image.find({ folder, owner: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, images });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const uploadImage = async (req, res) => {
  try {
    const { name, folder } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Image file is required' });
    }
    if (!name) {
      return res.status(400).json({ success: false, message: 'Image name is required' });
    }
    if (!folder) {
      return res.status(400).json({ success: false, message: 'Folder ID is required' });
    }

    const folderDoc = await Folder.findOne({ _id: folder, owner: req.user._id });
    if (!folderDoc) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Folder not found' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;

    const image = await Image.create({
      name,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: imageUrl,
      folder,
      owner: req.user._id,
    });

    res.status(201).json({ success: true, message: 'Image uploaded successfully', image });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

const deleteImage = async (req, res) => {
  try {
    const image = await Image.findOne({ _id: req.params.id, owner: req.user._id });
    if (!image) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }
    
    const filePath = path.join(__dirname, '../uploads', image.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await image.deleteOne();

    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getImages, uploadImage, deleteImage };
