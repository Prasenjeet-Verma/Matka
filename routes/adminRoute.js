const express = require('express');
const adminRouter = express.Router();
const adminRouterController = require('../controller/adminController');

adminRouter.get('/adminpaneldashboard', adminRouterController.getAdminPanelDashboard);
adminRouter.get('/adminBet', adminRouterController.getAdminBetPage);
adminRouter.get('/declare', adminRouterController.getDeclareData);
//adminRouter.post('/declareResult', adminRouterController.postDeclareResult);
//adminRouter.get("/api/admin/unsettled-summary",adminRouterController.getUnsettledSummary);
module.exports = adminRouter;