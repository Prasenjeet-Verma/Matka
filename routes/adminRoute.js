const express = require('express');
const adminRouter = express.Router();
const adminRouterController = require('../controller/adminController');

adminRouter.get('/adminpaneldashboard', adminRouterController.getAdminPanelDashboard);


module.exports = adminRouter;