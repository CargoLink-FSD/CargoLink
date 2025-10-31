    const express = require('express');
    const router = express.Router();
    

    // About Us page
    router.get('/about', (req, res) => {
        res.render('static/about', { title: 'About Us | CargoLink' });
    });

    // Services page
    router.get('/services', (req, res) => {
        res.render('static/services', { title: 'Our Services | CargoLink' });
    });

    // Terms of Service page
    router.get('/terms', (req, res) => {
        res.render('static/terms', { title: 'Terms of Service | CargoLink' });
    });

    // Privacy Policy page
    router.get('/privacy', (req, res) => {
        res.render('static/privacy', { title: 'Privacy Policy | CargoLink' });
    });

    // Contact page
    router.get('/contact', (req, res) => {
        res.render('static/contact', { title: 'Contact Us | CargoLink' });
    });

    // Careers page
    router.get('/careers', (req, res) => {
        res.render('static/careers', { title: 'Careers | CargoLink' });
    });

    module.exports = router;