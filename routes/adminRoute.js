const express = require('express');
const adminRouter = express.Router();
const adminRouterController = require('../controller/adminController');

adminRouter.get('/adminpaneldashboard', adminRouterController.getAdminPanelDashboard);
adminRouter.get('/adminBet', adminRouterController.getAdminBetPage);
adminRouter.get('/declareMatka', adminRouterController.getDeclareData);
adminRouter.post('/declareSingle', adminRouterController.postDeclareSingleResult);
adminRouter.post('/declarePatti', adminRouterController.postDeclarePattiResult);
adminRouter.get('/userDownLine', adminRouterController.getUserDownLine);
adminRouter.post('/admincreateuser', adminRouterController.postAdmincreateuser);
adminRouter.post('/postTransaction', adminRouterController.postTransaction);
adminRouter.get('/userProfile/:userId', adminRouterController.getUserProfieByAdmin);
adminRouter.post('/resetpasswordnotcheckoldpassword', adminRouterController.adminChangePasswordofUser);
adminRouter.get("/adminseepersonallyuserbethistory/:userId", adminRouterController.adminSeeUserPersonallyBetHistory);

module.exports = adminRouter;