// Pricing Service — Multi-factor freight price engine
// Formula:
//   BaseCost      = distance_km × vehicle_rate_per_km
//   Operational   = BaseCost × weight_multiplier × material_multiplier
//                 + volume_surcharge (only when volume > high-volume threshold)
//   Insurance     = cargo_value × insurance_rate
//   TollCost      = real toll data from Google Maps Routes API v2
//   MaxPrice      = Operational + Insurance + TollCost   (≥ MIN_PRICE floor)

import { GOOGLE_MAPS_API_KEY } from '../config/index.js';
import { logger } from '../utils/misc.js';

const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

const VEHICLE_RATES = {
    'Mini Truck (Up to 1 Ton)': 15,
    'Pickup Truck (1-3 Tons)': 18,
    'Light Lorry (3-7 Tons)': 22,
    'Heavy Lorry (7-15 Tons)': 30,
    'Container (20ft)': 35,
    'Container (40ft)': 45,
    'Refrigerated Truck': 50,
    'Flatbed Trailer': 40,
    default: 20,
};

function getWeightMultiplier(weightKg) {
    const tons = (weightKg || 0) / 1000;
    if (tons <= 1) return 1.0;
    if (tons <= 5) return 1.2;
    if (tons <= 10) return 1.5;
    if (tons <= 20) return 1.8;
    return 2.5;
}

// Threshold: 20 m³ (~20,000 litres). Below this → no surcharge..
function getVolumeSurcharge(volumeM3, baseCost) {
    if (!volumeM3 || volumeM3 <= 20) return 0;   
    if (volumeM3 <= 40) return baseCost * 0.10;   
    if (volumeM3 <= 70) return baseCost * 0.20;   
    return baseCost * 0.35;                       
}


const MATERIAL_MULTIPLIERS = {
    general: 1.0,
    fragile: 1.3,
    perishable: 1.4,
    hazardous: 1.5,
    machinery: 1.2,
    furniture: 1.1,
    agricultural: 1.0,
    construction: 1.15,
};

const INSURANCE_RATES = {
    none: 0,
    basic: 0.015,       // 1.5%
    standard: 0.03,     // 3.0%
    comprehensive: 0.05,// 5.0%
};

const MIN_PRICE = 2000; 
// High-value goods carry higher handling risk, so the freight rate includes
// a risk surcharge on top of insurance.
//
//  cargo_value ≤ ₹50,000            →  0%  (no surcharge)
//  ₹50,001  – ₹2,00,000            →  1%
//  ₹2,00,001 – ₹5,00,000           →  2%
//  > ₹5,00,000                     →  3%
//
function getRiskCharge(cargoValue) {
    if (!cargoValue || cargoValue <= 50000) return 0;
    if (cargoValue <= 200000) return cargoValue * 0.01;
    if (cargoValue <= 500000) return cargoValue * 0.02;
    return cargoValue * 0.03;
}

// ── Toll lookup via Google Maps Routes APi
async function getTollCost(originCoords, destCoords) {
    if (!GOOGLE_MAPS_API_KEY) {
        logger.warn('GOOGLE_MAPS_API_KEY not set — toll lookup skipped');
        return 0;
    }

    try {
        const requestBody = {
            origin: {
                location: {
                    latLng: {
                        latitude: originCoords.lat,
                        longitude: originCoords.lng,
                    },
                },
            },
            destination: {
                location: {
                    latLng: {
                        latitude: destCoords.lat,
                        longitude: destCoords.lng,
                    },
                },
            },
            travelMode: 'DRIVE',
            extraComputations: ['TOLLS'],
            routeModifiers: {
                vehicleInfo: { emissionType: 'GASOLINE' },
                tollPasses: [],
            },
        };

        const res = await fetch(ROUTES_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
                'X-Goog-FieldMask': 'routes.travelAdvisory.tollInfo,routes.distanceMeters',
            },
            body: JSON.stringify(requestBody),
        });

        const data = await res.json();

        if (!data.routes?.length) {
            logger.warn('Routes API returned no routes for toll lookup');
            return 0;
        }

        const tollInfo = data.routes[0].travelAdvisory?.tollInfo;
        if (!tollInfo?.estimatedPrice?.length) {
            // Route exists but has no tolls
            return 0;
        }

        // Prefer INR; fall back to first currency entry available
        const priceEntry =
            tollInfo.estimatedPrice.find((p) => p.currencyCode === 'INR') ||
            tollInfo.estimatedPrice[0];

        // Routes API encodes money as { units: "string", nanos: number }
        const amount =
            parseFloat(priceEntry.units || 0) + (priceEntry.nanos || 0) / 1e9;

        const toll = Math.round(amount);
        logger.info('Toll cost fetched from Routes API', {
            toll,
            currency: priceEntry.currencyCode,
        });

        return toll;
    } catch (err) {
        logger.warn('Toll API call failed — defaulting toll cost to 0', {
            error: err.message,
        });
        return 0;
    }
}


async function calculatePrice({
    distance,
    vehicle_type,
    weight,
    volume = null,
    goods_type = 'general',
    cargo_value = 0,
    insurance_tier = 'none',
    originCoords = null,
    destCoords = null,
}) {
    // 1. Base cost
    const vehicleRate = VEHICLE_RATES[vehicle_type] || VEHICLE_RATES.default;
    const baseCost = distance * vehicleRate;

    // 2. Multipliers
    const weightMultiplier = getWeightMultiplier(weight);
    const materialMultiplier = MATERIAL_MULTIPLIERS[goods_type] || 1.0;

    // 3. Operational cost (includes volume surcharge when high-volume)
    const volumeSurcharge = getVolumeSurcharge(volume, baseCost);
    const operational = baseCost * weightMultiplier * materialMultiplier + volumeSurcharge;

    // 4. Insurance on declared cargo value
    const insuranceRate = INSURANCE_RATES[insurance_tier] || 0;
    const insuranceCost = cargo_value * insuranceRate;

    // 5. Risk / breakage charge on declared cargo value
    const riskCharge = Math.round(getRiskCharge(cargo_value));

    // 6. Toll cost (async — from Google Maps Routes API)
    let tollCost = 0;
    if (originCoords && destCoords) {
        tollCost = await getTollCost(originCoords, destCoords);
    }

    // 7. Suggested max price = operational + insurance + risk + toll
    const rawMax = operational + insuranceCost + riskCharge + tollCost;
    const maxPrice = Math.round(Math.max(rawMax, MIN_PRICE));

    return {
        // Inputs reflected back for transparency
        distance_km: distance,
        vehicle_type,
        vehicle_rate_per_km: vehicleRate,

        // Cost components
        base_cost: Math.round(baseCost),
        weight_kg: weight,
        weight_multiplier: weightMultiplier,
        material_multiplier: materialMultiplier,
        volume_m3: volume,
        volume_surcharge: Math.round(volumeSurcharge),
        operational_cost: Math.round(operational),
        cargo_value,
        insurance_tier,
        insurance_rate: insuranceRate,
        insurance_cost: Math.round(insuranceCost),
        risk_charge: riskCharge,
        toll_cost: tollCost,

        // Final price = the ceiling a transporter can bid up to
        suggested_max_price: maxPrice,
    };
}

export default {
    calculatePrice,
    getTollCost,
    getWeightMultiplier,
    getVolumeSurcharge,
    getRiskCharge,
    VEHICLE_RATES,
    MATERIAL_MULTIPLIERS,
    INSURANCE_RATES,
    MIN_PRICE,
};
