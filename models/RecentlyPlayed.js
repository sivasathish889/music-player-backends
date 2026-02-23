const mongoose = require('mongoose');

const recentlyPlayedSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        song: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Song',
            required: true,
        },
        playedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: false }
);

// Compound index for fast queries and uniqueness per user-song pair
recentlyPlayedSchema.index({ user: 1, song: 1 }, { unique: true });
recentlyPlayedSchema.index({ user: 1, playedAt: -1 });

module.exports = mongoose.model('RecentlyPlayed', recentlyPlayedSchema);
