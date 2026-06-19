const User = require('../models/User');
const jwt = require('jsonwebtoken');
// const { OAuth2Client } = require('google-auth-library');

// const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, email and password are required.' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'Email already registered.' });
        }

        const userRole = role === 'admin' ? 'admin' : 'user';

        const user = await User.create({ name, email, password, role: userRole });
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'Account created successfully!',
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                likedSongs: user.likedSongs,
            },
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const token = generateToken(user._id);

        res.status(200).json({
            success: true,
            message: 'Login successful!',
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                likedSongs: user.likedSongs,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('likedSongs', 'title artist coverImage duration');
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// (Lines before `generateToken` are modified above, so we keep `generateToken` down to bottom)

// @desc    Login/Register using Google OAuth
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken) return res.status(400).json({ success: false, message: 'Google ID token is required.' });

        // Verify Google Token
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_ANDROID_CLIENT_ID, process.env.GOOGLE_IOS_CLIENT_ID].filter(Boolean),
        });
        const payload = ticket.getPayload();
        const { email, name, picture, sub: googleId } = payload;

        // Find or create user
        let user = await User.findOne({ email });
        if (!user) {
            // Register
            user = await User.create({
                name,
                email,
                avatar: picture,
                role: 'user',
                googleId,
            });
        } else if (!user.googleId) {
            // Link account if email exists but not through Google
            user.googleId = googleId;
            await user.save();
        }

        const token = generateToken(user._id);
        res.status(200).json({
            success: true,
            message: 'Google login successful!',
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                likedSongs: user.likedSongs,
            },
        });
    } catch (error) {
        console.error('Google login error:', error);
        res.status(500).json({ success: false, message: 'Google login failed.' });
    }
};

// @desc    Login/Register using Apple OAuth
// @route   POST /api/auth/apple
// @access  Public
const appleLogin = async (req, res) => {
    try {
        const { identityToken, email, fullName } = req.body;
        if (!identityToken) return res.status(400).json({ success: false, message: 'Apple identity token is required.' });

        // Decode the identity token to get the Apple user's email
        const decoded = jwt.decode(identityToken);
        if (!decoded || !decoded.sub) {
            return res.status(400).json({ success: false, message: 'Invalid Apple identity token.' });
        }

        const appleId = decoded.sub;
        const userEmail = email || decoded.email;
        let user;

        if (userEmail) {
            user = await User.findOne({ email: userEmail });
        } else {
            user = await User.findOne({ appleId: appleId });
        }

        if (!user) {
            if (!userEmail) return res.status(400).json({ success: false, message: 'Apple email was not provided during first login.' });
            // First time Apple login, Apple sends the name
            const username = fullName ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim() : 'Apple User';
            user = await User.create({
                name: username || 'Apple User',
                email: userEmail,
                role: 'user',
                appleId
            });
        } else if (!user.appleId) {
            user.appleId = appleId;
            await user.save();
        }

        const token = generateToken(user._id);
        res.status(200).json({
            success: true,
            message: 'Apple login successful!',
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                likedSongs: user.likedSongs,
            },
        });

    } catch (error) {
        console.error('Apple login error:', error);
        res.status(500).json({ success: false, message: 'Apple login failed.' });
    }
};

// @desc    Generate admin token for external API use
// @route   POST /api/auth/generate-admin-token
// @access  Protected by server secret (ADMIN_TOKEN_SECRET)
const generateAdminToken = async (req, res) => {
    try {
        const { email, password, expiresIn } = req.body;

        if (!password || password !== process.env.ADMIN_TOKEN_SECRET) {
            return res.status(401).json({ success: false, message: 'Invalid admin generation secret.' });
        }

        if (!email) {
            return res.status(400).json({ success: false, message: 'Email is required.' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'User is not an admin.' });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: expiresIn || process.env.ADMIN_TOKEN_EXPIRE || '365d',
        });

        return res.status(200).json({
            success: true,
            message: 'Admin token generated.',
            token,
            user: { _id: user._id, email: user.email, role: user.role },
        });
    } catch (error) {
        console.error('Generate admin token error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    register, login, getMe,
    googleLogin, appleLogin,
    generateAdminToken
};
