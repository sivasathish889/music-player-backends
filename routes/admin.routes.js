const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getAllUsers,
    updateUserRole,
    deleteUser,
    getAllSongs,
    toggleSongStatus,
    getAnalytics,
} = require('../controllers/admin.controller');
const { protect, adminOnly } = require('../middlewares/auth.middleware');

// All admin routes require auth + admin role
router.use(protect, adminOnly);

router.get('/stats', getDashboardStats);
router.get('/analytics', getAnalytics);
router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);
router.get('/songs', getAllSongs);
router.patch('/songs/:id/toggle', toggleSongStatus);

module.exports = router;
