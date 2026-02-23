const express = require('express');
const router = express.Router();
const { getLikedSongs, getRecentlyPlayed, updateProfile, getRecommendations } = require('../controllers/user.controller');
const { protect } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.get('/:id/liked', protect, getLikedSongs);
router.get('/:id/recently-played', protect, getRecentlyPlayed);
router.get('/:id/recommendations', protect, getRecommendations);

// Conditionally apply multer — only when the request is multipart/form-data (avatar upload).
// For plain JSON text-only edits (name/bio), multer is skipped so req.body is populated by express.json().
const conditionalUpload = (req, res, next) => {
    const ct = req.headers['content-type'] || '';
    if (ct.includes('multipart/form-data')) {
        return upload.single('avatar')(req, res, next);
    }
    next();
};

router.put('/profile', protect, conditionalUpload, updateProfile);

module.exports = router;
