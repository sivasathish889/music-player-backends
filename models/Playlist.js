const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Playlist name is required'],
            trim: true,
            maxlength: [100, 'Playlist name cannot exceed 100 characters'],
        },
        description: {
            type: String,
            default: '',
            maxlength: [300, 'Description cannot exceed 300 characters'],
        },
        coverImage: {
            type: String,
            default: '',
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        songs: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Song',
            },
        ],
        isPublic: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Playlist', playlistSchema);
