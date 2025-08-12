import express from 'express';
import { GoogleCivicService } from '../services/googleCivicService';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

/**
 * Get representatives using Google Civic API
 */
router.get('/representatives', requireAuth, async (req, res) => {
    try {
        const { address } = req.query;
        
        if (!address) {
            return res.status(400).json({ error: 'Address is required' });
        }

        const representatives = await GoogleCivicService.getRepresentativesByAddress(
            address as string
        );

        if (!representatives) {
            return res.status(404).json({ error: 'No representatives found' });
        }

        res.json(representatives);
    } catch (error) {
        console.error('Error fetching representatives:', error);
        res.status(500).json({ error: 'Failed to fetch representatives' });
    }
});

/**
 * Get election information
 */
router.get('/elections', requireAuth, async (req, res) => {
    try {
        const { address } = req.query;
        
        if (!address) {
            return res.status(400).json({ error: 'Address is required' });
        }

        const elections = await GoogleCivicService.getElectionInfo(address as string);

        if (!elections) {
            return res.status(404).json({ error: 'No election information found' });
        }

        res.json(elections);
    } catch (error) {
        console.error('Error fetching election info:', error);
        res.status(500).json({ error: 'Failed to fetch election information' });
    }
});

export default router;