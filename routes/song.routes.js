const express = require('express');
const router = express.Router();
const {
    getSongs,
    getSongById,
    uploadSong,
    updateSong,
    deleteSong,
    toggleLike,
    trackPlay,
    getTrendingSongs,
} = require('../controllers/song.controller');
const { protect, adminOnly } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

router.get('/', getSongs);
router.get('/trending', getTrendingSongs);
router.get('/:id', getSongById);
router.post(
    '/',
    protect,
    adminOnly,
    upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]),
    uploadSong
);
router.put(
    '/:id',
    protect,
    adminOnly,
    upload.fields([{ name: 'coverImage', maxCount: 1 }]),
    updateSong
);
router.delete('/:id', protect, adminOnly, deleteSong);
router.post('/:id/like', protect, toggleLike);
router.post('/:id/play', protect, trackPlay);

module.exports = router;
