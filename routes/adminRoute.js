const express = require('express');
const adminRouter = express.Router();
const adminRouterController = require('../controller/adminController');

adminRouter.get('/adminpaneldashboard', adminRouterController.getAdminPanelDashboard);
adminRouter.get('/adminBet', adminRouterController.getAdminBetPage);
adminRouter.get('/declare', adminRouterController.getDeclareMatkaPage);
//adminRouter.post('/declareResult', adminRouterController.postDeclareResult);

module.exports = adminRouter;