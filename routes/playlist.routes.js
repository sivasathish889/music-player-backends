const express = require('express');
const router = express.Router();
const {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    updatePlaylist,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
} = require('../controllers/playlist.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/', protect, createPlaylist);
router.get('/:userId', protect, getUserPlaylists);
router.get('/single/:id', protect, getPlaylistById);
router.put('/:id', protect, updatePlaylist);
router.delete('/:id', protect, deletePlaylist);
router.post('/:id/songs/:songId', protect, addSongToPlaylist);
router.delete('/:id/songs/:songId', protect, removeSongFromPlaylist);

module.exports = router;
