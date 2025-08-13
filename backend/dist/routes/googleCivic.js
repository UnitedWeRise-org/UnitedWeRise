"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const googleCivicService_1 = require("../services/googleCivicService");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
/**
 * Get representatives using Google Civic API
 */
router.get('/representatives', auth_1.requireAuth, async (req, res) => {
    try {
        const { address } = req.query;
        if (!address) {
            return res.status(400).json({ error: 'Address is required' });
        }
        const representatives = await googleCivicService_1.GoogleCivicService.getRepresentativesByAddress(address);
        if (!representatives) {
            return res.status(404).json({ error: 'No representatives found' });
        }
        res.json(representatives);
    }
    catch (error) {
        console.error('Error fetching representatives:', error);
        res.status(500).json({ error: 'Failed to fetch representatives' });
    }
});
/**
 * Get election information
 */
router.get('/elections', auth_1.requireAuth, async (req, res) => {
    try {
        const { address } = req.query;
        if (!address) {
            return res.status(400).json({ error: 'Address is required' });
        }
        const elections = await googleCivicService_1.GoogleCivicService.getElectionInfo(address);
        if (!elections) {
            return res.status(404).json({ error: 'No election information found' });
        }
        res.json(elections);
    }
    catch (error) {
        console.error('Error fetching election info:', error);
        res.status(500).json({ error: 'Failed to fetch election information' });
    }
});
exports.default = router;
//# sourceMappingURL=googleCivic.js.map