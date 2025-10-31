const {asyncHandler} = require('./utils');
const Customer = require('../models/customer');
const Transporter = require("../models/transporter");
const ADMIN_EMAIL = "admin@cargolink.com";
const ADMIN_PASSWORD = "admin@123";

const loginCustomer = asyncHandler(async (req, res) => {
    
    const { email, password } = req.body;
    
    const customer = await Customer.findOne({ email });
    if (!customer) return res.status(401).json({ error: "Email not found" });

    const match = await customer.verifyPassword(password);
    if (!match) return res.status(401).json({ error: "Invalid password" });

    req.session.user = {
        id: customer._id.toString(),
        role: "customer"
    };
        
    return res.json({ message: "Customer login successful" });
});

const loginTransporter = asyncHandler(async (req, res) => {
    
    const { email, password } = req.body;    


    const transporter = await Transporter.findOne({ email });
    if (!transporter) return res.status(401).json({ error: "Email not found" });
    
    const match = await transporter.verifyPassword(password);
    if (!match) return res.status(401).json({ error: "Invalid password" });

    req.session.user = {
        id: transporter._id.toString(),
        role: "transporter"
    };
        
    return res.json({ message: "Transporter login successful" });
});


const loginAdmin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Invalid admin credentials" });
    }

    req.session.user = {
        id: "admin",
        role: "admin"
    };

    return res.json({ message: "Admin login successful" });
});


const logout = asyncHandler((req, res) => {
  req.session.destroy((err) => {
      if (err) return res.status(500).json({ error: "Logout failed" });
      res.clearCookie("connect.sid");
      return res.redirect("/");
  });
});

const getCustomerId = (req) => {
    return req.session.user.id;
}

const getTransporterId = (req) => {
    return req.session.user.id;
}

const getUserId = (req) => {
    return req.session.user.id;   
}

module.exports = { 
    loginCustomer, 
    loginTransporter, 
    loginAdmin,
    logout, 
    getCustomerId, 
    getTransporterId,
    getUserId
};
