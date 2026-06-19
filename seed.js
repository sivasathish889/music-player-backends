require('dotenv').config();
const mongoose = require('mongoose');

// ─── Default credentials ──────────────────────────────────────
const ADMIN = {
    name: 'Shiva',
    email: 'shiva@gmail.com',
    password: 'Shiva@123',
    role: 'admin',
};

const DEMO_USER = {
    name: 'Test User',
    email: 'test@gmail.com',
    password: 'Test@1234',
    role: 'user',
};



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
