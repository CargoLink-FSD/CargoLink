// Location Controller — handles HTTP requests for geocoding and distance calculation only
import locationService from '../services/locationService.js';

const calculateDistance = async (req, res, next) => {
    try {
        const { pickup, delivery } = req.body;
        const result = await locationService.calculateOrderDistance(pickup, delivery);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export default {
    calculateDistance,
};
