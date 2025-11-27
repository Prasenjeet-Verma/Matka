const express = require('express');
const adminRouter = express.Router();
const adminRouterController = require('../controller/adminController');

adminRouter.get('/adminpaneldashboard', adminRouterController.getAdminPanelDashboard);
adminRouter.get('/adminBet', adminRouterController.getAdminBetPage);
adminRouter.get('/declareMatka', adminRouterController.getDeclareData);
adminRouter.post('/declareSingle', adminRouterController.postDeclareSingleResult);
adminRouter.post('/declarePatti', adminRouterController.postDeclarePattiResult);
//adminRouter.get("/api/admin/unsettled-summary",adminRouterController.getUnsettledSummary);
module.exports = adminRouter;