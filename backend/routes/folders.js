const express = require('express');
const router = express.Router();
const { getFolders, getFolder, createFolder, updateFolder, deleteFolder } = require('../controllers/folderController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getFolders)
  .post(createFolder);

router.route('/:id')
  .get(getFolder)
  .put(updateFolder)
  .delete(deleteFolder);

module.exports = router;
