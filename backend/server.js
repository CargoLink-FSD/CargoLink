const connectDatabase = require("./database/db")
const errorMiddleware = require('./middleware/errorMiddleware')
const express = require('express');
const session = require("express-session");
const {asyncHandler} = require('./controller/utils');
const authController = require('./controller/authController')

const app = express();

app.set('view engine', 'ejs');
app.use(express.static('public'));     // Serves static files from public folder (like css, images etc)
app.use(express.json())

// Session Middleware
app.use(session({  
  name: 'cargolink',
  secret: 'mysecretkey',
  resave: false,
  saveUninitialized: false,  
  cookie: { 
    maxAge: 24*60*60000
  } 
}));

// // //================= This is only for testing disable later ==================
// app.use((req, res, next) => {
//   if(req.path.startsWith('/transporter')){
//         req.session.user = {
//           id: "681dcf65262faca9bcbc3343", // fill with one local  transporter id
//           role: 'transporter',
//         };
//   }else if(req.path.startsWith('/customer')){
//         req.session.user = {
//           id: "681dcf65262faca9bcbc333d", // fill with one local customer id
//           role: 'customer',
//         };
//   } else { 
//     req.session.admin = {id: "1"};
//     return next();
//   }
//   next();
// });
// // //============================================================================


app.use((req, res, next)=> {
    res.locals.userType = req.session.user?.role;    
    next();
});

// Set up Routes
app.use('/customer', require('./routes/customer'));
app.use('/transporter', require('./routes/transporter'));
app.use('/transporter/assignment', require('./routes/assignment'));
app.use('/admin', require('./routes/admin'));
app.use('/chat', require('./routes/chat'));
app.use('/static', require('./routes/static'));

// Home route
app.get('/', (req, res) => res.render('index'));
app.get('/logout', authController.logout);

// Start server
app.listen(3000, '0.0.0.0', () => console.log('Server running on http://localhost:3000'));
connectDatabase()