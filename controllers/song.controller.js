const Song = require('../models/Song');
const User = require('../models/User');
const RecentlyPlayed = require('../models/RecentlyPlayed');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

// @desc    Get all songs
// @route   GET /api/songs
// @access  Public
const getSongs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const genre = req.query.genre;
        const sortBy = req.query.sortBy || 'createdAt';
        const order = req.query.order === 'asc' ? 1 : -1;

        const query = { isActive: true };
        if (genre) query.genre = genre;

        const total = await Song.countDocuments(query);
        const songs = await Song.find(query)
            .sort({ [sortBy]: order })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('uploadedBy', 'name');

        res.status(200).json({
            success: true,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            songs,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get single song by ID
// @route   GET /api/songs/:id
// @access  Public
const getSongById = async (req, res) => {
    try {
        const song = await Song.findById(req.params.id).populate('uploadedBy', 'name');
        if (!song || !song.isActive) {
            return res.status(404).json({ success: false, message: 'Song not found.' });
        }
        res.status(200).json({ success: true, song });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Upload new song (admin only)
// @route   POST /api/songs
// @access  Private/Admin
const uploadSong = async (req, res) => {
    try {
        const { title, artist, album, genre, duration, year, tags } = req.body;

        if (!title || !artist) {
            return res.status(400).json({ success: false, message: 'Title and artist are required.' });
        }

        if (!req.files || !req.files.audio) {
            return res.status(400).json({ success: false, message: 'Audio file is required.' });
        }

        let audioUrl = '';
        let audioPublicId = '';
        let coverImage = '';
        let coverPublicId = '';

        // Upload audio to Cloudinary
        const audioResult = await uploadToCloudinary(req.files.audio[0].buffer, {
            resource_type: 'video', // Cloudinary uses 'video' for audio files
            folder: 'antigravityt-music/audio',
            public_id: `song_${Date.now()}`,
        });
        audioUrl = audioResult.secure_url;
        audioPublicId = audioResult.public_id;

        // Upload cover image if provided
        if (req.files.coverImage) {
            const coverResult = await uploadToCloudinary(req.files.coverImage[0].buffer, {
                resource_type: 'image',
                folder: 'antigravityt-music/covers',
                transformation: [{ width: 500, height: 500, crop: 'fill' }],
            });
            coverImage = coverResult.secure_url;
            coverPublicId = coverResult.public_id;
        }

        const song = await Song.create({
            title,
            artist,
            album: album || 'Unknown Album',
            genre: genre || 'Unknown',
            duration: duration ? parseFloat(duration) : 0,
            year: year ? parseInt(year) : new Date().getFullYear(),
            tags: tags ? tags.split(',').map((t) => t.trim()) : [],
            audioUrl,
            audioPublicId,
            coverImage,
            coverPublicId,
            uploadedBy: req.user._id,
        });

        res.status(201).json({ success: true, message: 'Song uploaded successfully!', song });
    } catch (error) {
        console.error('Upload song error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update song
// @route   PUT /api/songs/:id
// @access  Private/Admin
const updateSong = async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) {
            return res.status(404).json({ success: false, message: 'Song not found.' });
        }

        const { title, artist, album, genre, duration, year, tags } = req.body;
        if (title) song.title = title;
        if (artist) song.artist = artist;
        if (album) song.album = album;
        if (genre) song.genre = genre;
        if (duration) song.duration = parseFloat(duration);
        if (year) song.year = parseInt(year);
        if (tags) song.tags = tags.split(',').map((t) => t.trim());

        // Update cover image if provided
        if (req.files && req.files.coverImage) {
            if (song.coverPublicId) {
                await deleteFromCloudinary(song.coverPublicId, 'image');
            }
            const coverResult = await uploadToCloudinary(req.files.coverImage[0].buffer, {
                resource_type: 'image',
                folder: 'antigravityt-music/covers',
                transformation: [{ width: 500, height: 500, crop: 'fill' }],
            });
            song.coverImage = coverResult.secure_url;
            song.coverPublicId = coverResult.public_id;
        }

        await song.save();
        res.status(200).json({ success: true, message: 'Song updated successfully!', song });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete song
// @route   DELETE /api/songs/:id
// @access  Private/Admin
const deleteSong = async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) {
            return res.status(404).json({ success: false, message: 'Song not found.' });
        }

        // Delete files from Cloudinary
        if (song.audioPublicId) {
            await deleteFromCloudinary(song.audioPublicId, 'video');
        }
        if (song.coverPublicId) {
            await deleteFromCloudinary(song.coverPublicId, 'image');
        }

        await song.deleteOne();
        res.status(200).json({ success: true, message: 'Song deleted successfully.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Like / Unlike a song
// @route   POST /api/songs/:id/like
// @access  Private
const toggleLike = async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) {
            return res.status(404).json({ success: false, message: 'Song not found.' });
        }

        const user = await User.findById(req.user._id);
        const isLiked = user.likedSongs.includes(song._id);

        if (isLiked) {
            user.likedSongs.pull(song._id);
            song.likesCount = Math.max(0, song.likesCount - 1);
        } else {
            user.likedSongs.push(song._id);
            song.likesCount += 1;
        }

        await Promise.all([user.save(), song.save()]);

        res.status(200).json({
            success: true,
            liked: !isLiked,
            likesCount: song.likesCount,
            message: isLiked ? 'Song unliked.' : 'Song liked!',
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Track play (increment play count and log recently played)
// @route   POST /api/songs/:id/play
// @access  Private
const trackPlay = async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) {
            return res.status(404).json({ success: false, message: 'Song not found.' });
        }

        song.playCount += 1;
        await song.save();

        // Upsert recently played
        await RecentlyPlayed.findOneAndUpdate(
            { user: req.user._id, song: song._id },
            { playedAt: new Date() },
            { upsert: true, new: true }
        );

        res.status(200).json({ success: true, playCount: song.playCount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get trending songs (most played)
// @route   GET /api/songs/trending
// @access  Public
const getTrendingSongs = async (req, res) => {
    try {
        const songs = await Song.find({ isActive: true })
            .sort({ playCount: -1 })
            .limit(10)
            .populate('uploadedBy', 'name');
        res.status(200).json({ success: true, songs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getSongs, getSongById, uploadSong, updateSong, deleteSong, toggleLike, trackPlay, getTrendingSongs };
