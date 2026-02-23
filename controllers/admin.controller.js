const User = require('../models/User');
const Song = require('../models/Song');
const Playlist = require('../models/Playlist');
const RecentlyPlayed = require('../models/RecentlyPlayed');

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
    try {
        const [
            totalUsers,
            totalSongs,
            totalPlaylists,
            totalPlays,
            recentSongs,
            recentUsers,
            topSongs,
            genreStats,
        ] = await Promise.all([
            User.countDocuments(),
            Song.countDocuments({ isActive: true }),
            Playlist.countDocuments(),
            Song.aggregate([{ $group: { _id: null, total: { $sum: '$playCount' } } }]),
            Song.find({ isActive: true }).sort({ createdAt: -1 }).limit(5).populate('uploadedBy', 'name'),
            User.find().sort({ createdAt: -1 }).limit(5).select('-password'),
            Song.find({ isActive: true }).sort({ playCount: -1 }).limit(5),
            Song.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: '$genre', count: { $sum: 1 }, totalPlays: { $sum: '$playCount' } } },
                { $sort: { count: -1 } },
                { $limit: 8 },
            ]),
        ]);

        // Monthly plays (last 6 months - approximate using recently played)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyActivity = await RecentlyPlayed.aggregate([
            { $match: { playedAt: { $gte: sixMonthsAgo } } },
            {
                $group: {
                    _id: {
                        year: { $year: '$playedAt' },
                        month: { $month: '$playedAt' },
                    },
                    plays: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const chartData = monthlyActivity.map(m => ({
            month: monthNames[m._id.month - 1],
            plays: m.plays,
        }));

        res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                totalSongs,
                totalPlaylists,
                totalPlays: totalPlays[0]?.total || 0,
            },
            recentSongs,
            recentUsers,
            topSongs,
            genreStats,
            chartData,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all users (with search/filter)
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    try {
        const { search, role, page = 1, limit = 20 } = req.query;
        const query = {};
        if (role) query.role = role;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        const total = await User.countDocuments(query);
        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            users,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update user role
// @route   PUT /api/admin/users/:id/role
// @access  Private/Admin
const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Role must be user or admin.' });
        }
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'Cannot change your own role.' });
        }
        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        res.status(200).json({ success: true, message: `Role updated to ${role}.`, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
    try {
        if (req.params.id === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: 'Cannot delete your own account.' });
        }
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        // Cleanup related data
        await Playlist.deleteMany({ user: req.params.id });
        await RecentlyPlayed.deleteMany({ user: req.params.id });

        res.status(200).json({ success: true, message: 'User deleted.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get all songs (admin view with full details)
// @route   GET /api/admin/songs
// @access  Private/Admin
const getAllSongs = async (req, res) => {
    try {
        const { search, genre, page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = req.query;
        const query = {};
        if (genre) query.genre = genre;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { artist: { $regex: search, $options: 'i' } },
                { album: { $regex: search, $options: 'i' } },
            ];
        }

        const total = await Song.countDocuments(query);
        const songs = await Song.find(query)
            .populate('uploadedBy', 'name email')
            .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const genres = await Song.distinct('genre');

        res.status(200).json({
            success: true,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            songs,
            genres,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Toggle song active status
// @route   PATCH /api/admin/songs/:id/toggle
// @access  Private/Admin
const toggleSongStatus = async (req, res) => {
    try {
        const song = await Song.findById(req.params.id);
        if (!song) return res.status(404).json({ success: false, message: 'Song not found.' });
        song.isActive = !song.isActive;
        await song.save();
        res.status(200).json({ success: true, isActive: song.isActive, message: `Song ${song.isActive ? 'activated' : 'deactivated'}.` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get analytics data
// @route   GET /api/admin/analytics
// @access  Private/Admin
const getAnalytics = async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [
            dailyPlays,
            topArtists,
            likesLeaderboard,
            newUsersPerDay,
        ] = await Promise.all([
            RecentlyPlayed.aggregate([
                { $match: { playedAt: { $gte: thirtyDaysAgo } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$playedAt' } },
                        plays: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
                { $limit: 30 },
            ]),
            Song.aggregate([
                { $match: { isActive: true } },
                { $group: { _id: '$artist', totalPlays: { $sum: '$playCount' }, songs: { $sum: 1 } } },
                { $sort: { totalPlays: -1 } },
                { $limit: 10 },
            ]),
            Song.find({ isActive: true }).sort({ likesCount: -1 }).limit(10).select('title artist likesCount playCount coverImage'),
            User.aggregate([
                { $match: { createdAt: { $gte: thirtyDaysAgo } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                        users: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
        ]);

        res.status(200).json({
            success: true,
            dailyPlays,
            topArtists,
            likesLeaderboard,
            newUsersPerDay,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getDashboardStats, getAllUsers, updateUserRole, deleteUser, getAllSongs, toggleSongStatus, getAnalytics };
