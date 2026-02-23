const Playlist = require('../models/Playlist');
const Song = require('../models/Song');

// @desc    Create playlist
// @route   POST /api/playlists
// @access  Private
const createPlaylist = async (req, res) => {
    try {
        const { name, description, isPublic } = req.body;

        if (!name) {
            return res.status(400).json({ success: false, message: 'Playlist name is required.' });
        }

        const playlist = await Playlist.create({
            name,
            description: description || '',
            isPublic: isPublic !== undefined ? isPublic : true,
            user: req.user._id,
        });

        res.status(201).json({ success: true, message: 'Playlist created!', playlist });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get user playlists
// @route   GET /api/playlists/:userId
// @access  Private
const getUserPlaylists = async (req, res) => {
    try {
        const playlists = await Playlist.find({ user: req.params.userId })
            .populate('songs', 'title artist coverImage duration audioUrl')
            .sort({ updatedAt: -1 });

        res.status(200).json({ success: true, playlists });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single playlist
// @route   GET /api/playlists/single/:id
// @access  Private
const getPlaylistById = async (req, res) => {
    try {
        const playlist = await Playlist.findById(req.params.id)
            .populate('songs', 'title artist album coverImage duration audioUrl playCount likesCount')
            .populate('user', 'name avatar');

        if (!playlist) {
            return res.status(404).json({ success: false, message: 'Playlist not found.' });
        }

        res.status(200).json({ success: true, playlist });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update playlist (rename, change description)
// @route   PUT /api/playlists/:id
// @access  Private
const updatePlaylist = async (req, res) => {
    try {
        const playlist = await Playlist.findOne({ _id: req.params.id, user: req.user._id });
        if (!playlist) {
            return res.status(404).json({ success: false, message: 'Playlist not found or unauthorized.' });
        }

        const { name, description, isPublic } = req.body;
        if (name) playlist.name = name;
        if (description !== undefined) playlist.description = description;
        if (isPublic !== undefined) playlist.isPublic = isPublic;

        await playlist.save();
        res.status(200).json({ success: true, message: 'Playlist updated!', playlist });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete playlist
// @route   DELETE /api/playlists/:id
// @access  Private
const deletePlaylist = async (req, res) => {
    try {
        const playlist = await Playlist.findOne({ _id: req.params.id, user: req.user._id });
        if (!playlist) {
            return res.status(404).json({ success: false, message: 'Playlist not found or unauthorized.' });
        }
        await playlist.deleteOne();
        res.status(200).json({ success: true, message: 'Playlist deleted.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Add song to playlist
// @route   POST /api/playlists/:id/songs/:songId
// @access  Private
const addSongToPlaylist = async (req, res) => {
    try {
        const playlist = await Playlist.findOne({ _id: req.params.id, user: req.user._id });
        if (!playlist) {
            return res.status(404).json({ success: false, message: 'Playlist not found or unauthorized.' });
        }

        const song = await Song.findById(req.params.songId);
        if (!song) {
            return res.status(404).json({ success: false, message: 'Song not found.' });
        }

        if (playlist.songs.includes(song._id)) {
            return res.status(409).json({ success: false, message: 'Song already in playlist.' });
        }

        playlist.songs.push(song._id);
        await playlist.save();

        res.status(200).json({ success: true, message: 'Song added to playlist!', playlist });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Remove song from playlist
// @route   DELETE /api/playlists/:id/songs/:songId
// @access  Private
const removeSongFromPlaylist = async (req, res) => {
    try {
        const playlist = await Playlist.findOne({ _id: req.params.id, user: req.user._id });
        if (!playlist) {
            return res.status(404).json({ success: false, message: 'Playlist not found or unauthorized.' });
        }

        playlist.songs.pull(req.params.songId);
        await playlist.save();

        res.status(200).json({ success: true, message: 'Song removed from playlist.', playlist });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    updatePlaylist,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
};
