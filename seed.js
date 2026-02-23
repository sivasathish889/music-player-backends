require('dotenv').config();
const mongoose = require('mongoose');

// ─── Default credentials ──────────────────────────────────────
const ADMIN = {
    name: 'Admin',
    email: 'admin@antigravityt.com',
    password: 'Admin@1234',
    role: 'admin',
};

const DEMO_USER = {
    name: 'Demo User',
    email: 'demo@antigravityt.com',
    password: 'Demo@1234',
    role: 'user',
};

// ─── Sample songs ─────────────────────────────────────────────
const SAMPLE_SONGS = [
    { title: 'Focus Flow', artist: 'Antigravityt', album: 'Deep Work Vol. 1', genre: 'Lo-Fi', duration: 210, playCount: 142, tags: ['focus', 'study', 'calm'] },
    { title: 'Midnight Rain', artist: 'Chill Waves', album: 'Rainy Nights', genre: 'Ambient', duration: 185, playCount: 98, tags: ['relax', 'night', 'ambient'] },
    { title: 'Neural Drift', artist: 'SynthMind', album: 'Digital Dreams', genre: 'Electronic', duration: 240, playCount: 203, tags: ['study', 'electronic', 'beats'] },
    { title: 'Sunset Meditation', artist: 'ZenBeats', album: 'Inner Peace', genre: 'Ambient', duration: 320, playCount: 76, tags: ['meditate', 'sleep', 'calm'] },
    { title: 'Coffee & Code', artist: 'Lo-Fi Lab', album: 'Morning Sessions', genre: 'Lo-Fi', duration: 195, playCount: 310, tags: ['focus', 'morning', 'lo-fi'] },
    { title: 'Deep in the Matrix', artist: 'CyberPulse', album: 'Neon City', genre: 'Electronic', duration: 278, playCount: 165, tags: ['focus', 'electronic', 'dark'] },
    { title: 'Starlight Sleep', artist: 'DreamWave', album: 'Lullabies', genre: 'Ambient', duration: 360, playCount: 89, tags: ['sleep', 'relax', 'peaceful'] },
    { title: 'Jazz in the Rain', artist: 'Blue Note Co', album: 'Rainy Cafe', genre: 'Jazz', duration: 244, playCount: 134, tags: ['relax', 'jazz', 'cafe'] },
];

async function seed() {
    console.log('\n🌱 Antigravityt Music — Database Seeder');
    console.log('══════════════════════════════════════════\n');

    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 12000,
            tls: true,
        });
        console.log('✅ MongoDB Connected:', mongoose.connection.name, '\n');

        const User = require('./models/User');
        const Song = require('./models/Song');

        // ── Seed Admin ────────────────────────────────────────────
        await User.deleteOne({ email: ADMIN.email });
        const admin = await User.create(ADMIN);
        console.log('✅ Admin user created');

        // ── Seed Demo User ────────────────────────────────────────
        await User.deleteOne({ email: DEMO_USER.email });
        const demo = await User.create(DEMO_USER);
        console.log('✅ Demo user created');

        // ── Seed Sample Songs ─────────────────────────────────────
        console.log('🗑️  Clearing old sample songs...');
        await Song.deleteMany({});

        const HQ_TRACKS = [
            'https://www.chosic.com/wp-content/uploads/2021/04/Storm-Clouds-on-the-Horizon.mp3',
            'https://www.chosic.com/wp-content/uploads/2021/07/Lofi-Study-Music.mp3',
            'https://www.chosic.com/wp-content/uploads/2021/05/Electronic-Music.mp3',
            'https://www.chosic.com/wp-content/uploads/2021/08/Chill-Lofi-Hip-Hop.mp3',
            'https://www.chosic.com/wp-content/uploads/2022/01/Night-Ocean.mp3',
            'https://www.chosic.com/wp-content/uploads/2021/11/Deep-Meditation.mp3',
            'https://www.chosic.com/wp-content/uploads/2021/10/Cyberpunk-City.mp3',
            'https://www.chosic.com/wp-content/uploads/2021/09/Smooth-Jazz.mp3',
        ];

        const songsWithUploader = SAMPLE_SONGS.map((s, idx) => ({
            ...s,
            isActive: true,
            audioUrl: HQ_TRACKS[idx % HQ_TRACKS.length],
            coverImage: `https://picsum.photos/seed/${s.title.replace(/\s/g, '')}/400/400`,
            uploadedBy: admin._id,
        }));

        await Song.insertMany(songsWithUploader);
        console.log(`✅ ${SAMPLE_SONGS.length} high-quality sample songs seeded\n`);

        // ── Print credentials ─────────────────────────────────────
        console.log('══════════════════════════════════════════');
        console.log('🔑 DEFAULT CREDENTIALS\n');
        console.log('  Admin Panel  →  http://localhost:3001');
        console.log(`  Email        :  ${ADMIN.email}`);
        console.log(`  Password     :  ${ADMIN.password}`);
        console.log('');
        console.log('  Mobile App   →  Expo Go');
        console.log(`  Email        :  ${DEMO_USER.email}`);
        console.log(`  Password     :  ${DEMO_USER.password}`);
        console.log('══════════════════════════════════════════\n');

    } catch (err) {
        console.error('❌ Seed failed:', err.message);
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
        process.exit(0);
    }
}

seed();
