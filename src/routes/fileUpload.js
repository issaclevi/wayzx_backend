const express = require('express');
const router = express.Router();
const { upload } = require('../utils/fileUpload');
const File = require('../models/File');

router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const storedName = Date.now() + '-' + file.originalname.replace(/\s+/g, '');

    const virtualPath = `virtual://memory/${storedName}`;

    const savedFile = new File({
      originalName: file.originalname,
      storedName: storedName,
      mimeType: file.mimetype,
      size: file.size,
      path: virtualPath,
    });

    await savedFile.save();

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const fullPath = `${baseUrl}/files/${storedName}`;

    res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: 'File uploaded and metadata saved',
      file: {
        originalName: savedFile.originalName,
        storedName: savedFile.storedName,
        mimeType: savedFile.mimeType,
        size: savedFile.size,
        filePath: fullPath,
        _id: savedFile._id,
        uploadedAt: savedFile.uploadedAt,
        __v: savedFile.__v,
      },
    });
  } catch (err) {
    console.error('Upload Error:', err);
    res.status(500).json({ error: 'Upload failed', detail: err.message });
  }
});

module.exports = router;