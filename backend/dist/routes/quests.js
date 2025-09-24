"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const quest_service_1 = __importDefault(require("../services/quest.service"));
const auth_1 = require("../middleware/auth");
const admin_1 = require("../middleware/admin");
const router = (0, express_1.Router)();
// Get user's daily quests
router.get('/daily', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const quests = await quest_service_1.default.generateDailyQuests(userId);
        res.json({ success: true, data: quests });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Get user's quest progress
router.get('/progress', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const progress = await quest_service_1.default.getUserQuestProgress(userId);
        res.json({ success: true, data: progress });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Update quest progress (called by other services)
router.post('/update-progress', auth_1.requireAuth, async (req, res) => {
    try {
        const { actionType, metadata } = req.body;
        const userId = req.user.id;
        await quest_service_1.default.updateQuestProgress(userId, actionType, metadata);
        res.json({ success: true, message: 'Quest progress updated' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Admin: Create new quest
router.post('/create', admin_1.requireAdmin, async (req, res) => {
    try {
        const quest = await quest_service_1.default.createQuest({
            ...req.body,
            createdBy: req.user.id
        });
        res.json({ success: true, data: quest });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Admin: Get all quests
router.get('/all', admin_1.requireAdmin, async (req, res) => {
    try {
        const quests = await quest_service_1.default.getAllQuests();
        res.json({ success: true, data: quests });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Admin: Update quest
router.put('/:questId', admin_1.requireAdmin, async (req, res) => {
    try {
        const { questId } = req.params;
        const quest = await quest_service_1.default.updateQuest(questId, req.body);
        res.json({ success: true, data: quest });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Admin: Get quest analytics
router.get('/analytics', admin_1.requireAdmin, async (req, res) => {
    try {
        const analytics = await quest_service_1.default.getQuestAnalytics();
        res.json({ success: true, data: analytics });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
// Create weekly quest (scheduled task)
router.post('/create-weekly', admin_1.requireAdmin, async (req, res) => {
    try {
        const quest = await quest_service_1.default.createWeeklyQuest();
        res.json({ success: true, data: quest });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=quests.js.map