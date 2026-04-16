const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Folder name is required'],
    trim: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
  },
  ancestors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
  }],
}, { timestamps: true });

folderSchema.index({ name: 1, parent: 1, owner: 1 }, { unique: true });
folderSchema.index({ owner: 1, parent: 1 });

module.exports = mongoose.model('Folder', folderSchema);
