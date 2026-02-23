const mongoose = require('mongoose');

const songSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Song title is required'],
            trim: true,
        },
        artist: {
            type: String,
            required: [true, 'Artist is required'],
            trim: true,
        },
        album: {
            type: String,
            default: 'Unknown Album',
            trim: true,
        },
        genre: {
            type: String,
            default: 'Unknown',
            trim: true,
        },
        duration: {
            type: Number, // duration in seconds
            default: 0,
        },
        audioUrl: {
            type: String,
            required: [true, 'Audio URL is required'],
        },
        audioPublicId: {
            type: String,
            default: '',
        },
        coverImage: {
            type: String,
            default: '',
        },
        coverPublicId: {
            type: String,
            default: '',
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        likesCount: {
            type: Number,
            default: 0,
        },
        playCount: {
            type: Number,
            default: 0,
        },
        year: {
            type: Number,
            default: new Date().getFullYear(),
        },
        tags: [String],
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Text index for search
songSchema.index({ title: 'text', artist: 'text', album: 'text', genre: 'text' });

module.exports = mongoose.model('Song', songSchema);
