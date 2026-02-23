const express = require('express');
const router = express.Router();
const { getLikedSongs, getRecentlyPlayed, updateProfile, getRecommendations } = require('../controllers/user.controller');
const { protect } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.get('/:id/liked', protect, getLikedSongs);
router.get('/:id/recently-played', protect, getRecentlyPlayed);
router.get('/:id/recommendations', protect, getRecommendations);
router.put('/profile', protect, upload.single('avatar'), updateProfile);

module.exports = router;
