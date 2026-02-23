const User = require('../models/User');
const Song = require('../models/Song');
const RecentlyPlayed = require('../models/RecentlyPlayed');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');

// @desc    Get user liked songs
// @route   GET /api/users/:id/liked
// @access  Private
const getLikedSongs = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate({
            path: 'likedSongs',
            match: { isActive: true },
            populate: { path: 'uploadedBy', select: 'name' },
        });
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        res.status(200).json({ success: true, songs: user.likedSongs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get recently played songs
// @route   GET /api/users/:id/recently-played
// @access  Private
const getRecentlyPlayed = async (req, res) => {
    try {
        const recentlyPlayed = await RecentlyPlayed.find({ user: req.params.id })
            .sort({ playedAt: -1 })
            .limit(20)
            .populate({ path: 'song', match: { isActive: true }, select: 'title artist album coverImage duration audioUrl genre tags' });

        const songs = recentlyPlayed.filter(rp => rp.song).map(rp => ({
            ...rp.song.toObject(),
            playedAt: rp.playedAt,
        }));
        res.status(200).json({ success: true, songs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        const { name, bio } = req.body;
        if (name) user.name = name;
        if (bio !== undefined) user.bio = bio;

        if (req.file) {
            if (user.avatarPublicId) await deleteFromCloudinary(user.avatarPublicId, 'image');
            const result = await uploadToCloudinary(req.file.buffer, {
                resource_type: 'image',
                folder: 'antigravityt-music/avatars',
                transformation: [{ width: 200, height: 200, crop: 'fill' }],
            });
            user.avatar = result.secure_url;
            user.avatarPublicId = result.public_id;
        }

        await user.save();
        res.status(200).json({
            success: true, message: 'Profile updated!',
            user: { _id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar, bio: user.bio },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════════
//  SPOTIFY-STYLE RECOMMENDATION ENGINE
// ═══════════════════════════════════════════════════════════════
//
//  Signals used (weighted scoring, higher = stronger match):
//
//  1. GENRE AFFINITY          — genres from liked + recently played, weighted by frequency
//  2. ARTIST AFFINITY         — artists from liked + play history, weighted by frequency
//  3. TAG SIMILARITY          — Jaccard similarity between song tags and user's taste tags
//  4. COLLABORATIVE FILTERING — other users with overlapping liked songs → their likes
//  5. POPULARITY BOOST        — global playCount log-scaled bonus
//  6. FRESHNESS PENALTY       — songs played very recently are down-weighted
//  7. DISCOVERY INJECTION     — 20% of results are serendipitous (never heard before)
//  8. LIKED SONG EXCLUSION    — already-liked songs are never returned
//
// @desc    Get Spotify-style recommendations
// @route   GET /api/users/:id/recommendations
// @access  Private

const getRecommendations = async (req, res) => {
    try {
        const userId = req.params.id;
        const LIMIT = parseInt(req.query.limit) || 20;

        // ── 1. Load user's listening profile ─────────────────────
        const [user, recentHistory] = await Promise.all([
            User.findById(userId),
            RecentlyPlayed.find({ user: userId })
                .sort({ playedAt: -1 })
                .limit(50)
                .populate('song', 'genre artist tags playCount'),
        ]);

        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        const likedIds = new Set(user.likedSongs.map(id => id.toString()));
        const recentSongs = recentHistory.filter(r => r.song).map(r => r.song);
        // Songs heard in last 7 days → apply freshness penalty
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentlyHeardIds = new Set(
            recentHistory
                .filter(r => r.song && r.playedAt > sevenDaysAgo)
                .map(r => r.song._id.toString())
        );

        // ── 2. Build affinity maps (genre, artist, tags) ──────────
        const genreWeight = {};   // genre  → affinity score
        const artistWeight = {};   // artist → affinity score
        const tagWeight = {};   // tag    → affinity score

        const addWeights = (songs, multiplier = 1) => {
            songs.forEach(song => {
                if (!song) return;
                // Genre
                if (song.genre) genreWeight[song.genre] = (genreWeight[song.genre] || 0) + 2 * multiplier;
                // Artist
                if (song.artist) artistWeight[song.artist] = (artistWeight[song.artist] || 0) + 2 * multiplier;
                // Tags
                (song.tags || []).forEach(tag => {
                    tagWeight[tag] = (tagWeight[tag] || 0) + 1 * multiplier;
                });
            });
        };

        // Liked songs carry 2× weight vs. play history
        if (likedIds.size > 0) {
            const likedSongs = await Song.find({ _id: { $in: [...likedIds] } }).select('genre artist tags');
            addWeights(likedSongs, 2);
        }
        addWeights(recentSongs, 1);

        const topGenres = Object.entries(genreWeight).sort((a, b) => b[1] - a[1]).map(e => e[0]);
        const topArtists = Object.entries(artistWeight).sort((a, b) => b[1] - a[1]).map(e => e[0]);
        const topTags = Object.entries(tagWeight).sort((a, b) => b[1] - a[1]).map(e => e[0]);

        // ── 3. Collaborative filtering ────────────────────────────
        //  Find users who liked ≥2 of the same songs → build collaborative candidates
        let collaborativeSongIds = new Set();
        if (likedIds.size >= 2) {
            const similarUsers = await User.find({
                _id: { $ne: userId },
                likedSongs: { $in: [...likedIds] },
            })
                .select('likedSongs')
                .limit(30);

            // Weight each similar user by overlap size
            const songScore = {};
            similarUsers.forEach(su => {
                const overlap = su.likedSongs.filter(id => likedIds.has(id.toString())).length;
                const similarity = overlap / Math.sqrt(likedIds.size * su.likedSongs.length || 1);

                su.likedSongs.forEach(songId => {
                    const sid = songId.toString();
                    if (!likedIds.has(sid)) {
                        songScore[sid] = (songScore[sid] || 0) + similarity;
                    }
                });
            });

            // Take top 40 collaborative candidates
            const sorted = Object.entries(songScore).sort((a, b) => b[1] - a[1]).slice(0, 40);
            sorted.forEach(([id]) => collaborativeSongIds.add(id));
        }

        // ── 4. Fetch candidate songs ──────────────────────────────
        const excludeIds = [...likedIds];   // never recommend already-liked
        const candidateQuery = {
            isActive: true,
            _id: { $nin: excludeIds },
            $or: [
                { genre: { $in: topGenres.slice(0, 5) } },
                { artist: { $in: topArtists.slice(0, 8) } },
                { tags: { $in: topTags.slice(0, 10) } },
                ...(collaborativeSongIds.size > 0 ? [{ _id: { $in: [...collaborativeSongIds] } }] : []),
            ],
        };

        let candidates = await Song.find(candidateQuery).limit(200);

        // ── 5. Content-based + popularity scoring ─────────────────
        const maxPlayCount = await Song.findOne({ isActive: true }).sort({ playCount: -1 }).select('playCount').then(s => s?.playCount || 1);

        const scoreCandidate = (song) => {
            let score = 0;

            // Genre affinity (0–40 pts)
            if (song.genre && genreWeight[song.genre]) {
                score += Math.min(40, genreWeight[song.genre] * 5);
            }

            // Artist affinity (0–35 pts)
            if (song.artist && artistWeight[song.artist]) {
                score += Math.min(35, artistWeight[song.artist] * 5);
            }

            // Tag Jaccard similarity (0–25 pts)
            const songTags = new Set(song.tags || []);
            const userTagSet = new Set(topTags.slice(0, 20));
            if (songTags.size > 0 && userTagSet.size > 0) {
                const intersection = [...songTags].filter(t => userTagSet.has(t)).length;
                const union = new Set([...songTags, ...userTagSet]).size;
                score += (intersection / union) * 25;
            }

            // Collaborative filtering bonus (0–20 pts)
            if (collaborativeSongIds.has(song._id.toString())) {
                score += 20;
            }

            // Log-scaled popularity boost (0–15 pts)
            // Mirrors how Spotify blends popularity without over-saturating charts
            const normalizedPop = song.playCount / maxPlayCount;
            score += Math.log1p(normalizedPop * 9) / Math.log1p(10) * 15;  // maps 0→0, 1→15

            // Freshness penalty: songs heard in last 7 days get −30 pts
            if (recentlyHeardIds.has(song._id.toString())) {
                score -= 30;
            }

            return score;
        };

        // Score + sort candidates
        const scored = candidates
            .map(song => ({ song, score: scoreCandidate(song) }))
            .sort((a, b) => b.score - a.score);

        // ── 6. Discovery injection (the "Radio" effect) ───────────
        //  Inject ~20% songs the user has NEVER heard at all
        //  This mirrors Spotify's exploration/exploitation balance
        const mainCount = Math.ceil(LIMIT * 0.8);
        const discoveryCount = LIMIT - mainCount;

        const mainPicks = scored.slice(0, mainCount).map(s => s.song);

        let discoveryPicks = [];
        if (discoveryCount > 0) {
            const allHeardIds = new Set([...likedIds, ...recentSongs.map(s => s._id.toString())]);
            const mainPickIds = new Set(mainPicks.map(s => s._id.toString()));
            const discoveryExclude = [...allHeardIds, ...mainPickIds];

            discoveryPicks = await Song.find({
                isActive: true,
                _id: { $nin: discoveryExclude },
                genre: { $in: topGenres.slice(0, 3) }, // stay loosely on-taste
            })
                .sort({ playCount: -1 })  // pick popular discoveries so quality stays high
                .limit(discoveryCount * 3)
                .lean();

            // Shuffle to avoid always returning the same "discoveries"
            discoveryPicks = discoveryPicks
                .sort(() => Math.random() - 0.5)
                .slice(0, discoveryCount);
        }

        // ── 7. Merge + deduplicate ────────────────────────────────
        const seen = new Set();
        const final = [];

        // Interleave: main → discovery (every 4th slot is a discovery)
        let mi = 0, di = 0, pos = 0;
        while (final.length < LIMIT) {
            const isDiscoverySlot = (pos + 1) % 5 === 0;
            let song = null;
            if (isDiscoverySlot && di < discoveryPicks.length) {
                song = discoveryPicks[di++];
            } else if (mi < mainPicks.length) {
                song = mainPicks[mi++];
            } else if (di < discoveryPicks.length) {
                song = discoveryPicks[di++];
            } else {
                break;
            }
            const id = song._id.toString();
            if (!seen.has(id)) { seen.add(id); final.push(song); }
            pos++;
        }

        // ── 8. Cold-start fallback ────────────────────────────────
        //  New users with no history get globally trending songs
        if (final.length === 0) {
            const trending = await Song.find({ isActive: true })
                .sort({ playCount: -1 })
                .limit(LIMIT);
            return res.status(200).json({
                success: true,
                songs: trending,
                meta: { algorithm: 'cold-start-trending', reason: 'No listening history yet' },
            });
        }

        // ── 9. Build taste profile summary (for UI display) ───────
        const tasteProfile = {
            topGenres: topGenres.slice(0, 3),
            topArtists: topArtists.slice(0, 3),
            signals: {
                likedSongs: likedIds.size,
                recentlyPlayed: recentSongs.length,
                similarUsers: collaborativeSongIds.size > 0 ? 'yes' : 'no',
                discoveryRatio: `${Math.round((discoveryPicks.length / Math.max(final.length, 1)) * 100)}%`,
            },
        };

        res.status(200).json({
            success: true,
            songs: final,
            meta: { algorithm: 'content-collab-hybrid', tasteProfile },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getLikedSongs, getRecentlyPlayed, updateProfile, getRecommendations };
