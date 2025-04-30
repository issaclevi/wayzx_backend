const express = require('express');
const router = express.Router();
const { upload } = require('../utils/fileUpload');
const File = require('../models/File');

router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;

    if (!file || !file.path) {
      return res.status(400).json({ error: 'Image not uploaded' });
    }

    const savedFile = new File({
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
    });

    await savedFile.save();

    res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: 'File uploaded to Cloudinary and metadata saved',
      file: {
        originalName: file.originalname,
        storedName: file.filename,
        mimeType: file.mimetype,
        size: file.size,
        filePath: file.path,
        _id: savedFile._id,
        uploadedAt: savedFile.uploadedAt,
      },
    });
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Upload failed',
      error: err.message || err.toString(),
    });
  }
});

module.exports = router;