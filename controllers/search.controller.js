const Song = require('../models/Song');

// @desc    Search songs by title, artist, album, genre
// @route   GET /api/search?q=query
// @access  Public
const searchSongs = async (req, res) => {
    try {
        const { q, page = 1, limit = 20 } = req.query;

        if (!q || q.trim().length === 0) {
            return res.status(400).json({ success: false, message: 'Search query is required.' });
        }

        const query = {
            isActive: true,
            $or: [
                { title: { $regex: q, $options: 'i' } },
                { artist: { $regex: q, $options: 'i' } },
                { album: { $regex: q, $options: 'i' } },
                { genre: { $regex: q, $options: 'i' } },
            ],
        };

        const total = await Song.countDocuments(query);
        const songs = await Song.find(query)
            .sort({ playCount: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('uploadedBy', 'name');

        res.status(200).json({
            success: true,
            query: q,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            songs,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { searchSongs };
