const express = require('express');
const adminRouter = express.Router();
const adminRouterController = require('../controller/adminController');

adminRouter.get('/adminpaneldashboard', adminRouterController.getAdminPanelDashboard);
adminRouter.get('/alloperatorynethistory', adminRouterController.getAllOpretorsbetHistory);
adminRouter.get('/declareMatka', adminRouterController.getDeclareData);
adminRouter.post('/declareSingle', adminRouterController.postDeclareSingleResult);
adminRouter.post('/declarePatti', adminRouterController.postDeclarePattiResult);
adminRouter.get('/userDownLine', adminRouterController.getUserDownLine);
adminRouter.post('/createuser', adminRouterController.postCreateuser);
adminRouter.post('/postTransaction', adminRouterController.postTransaction);
adminRouter.get('/userProfile/:userId', adminRouterController.getUserProfileByAdmin);
adminRouter.post('/resetpasswordnotcheckoldpassword', adminRouterController.changeUserPasswordByOperator);
adminRouter.get("/adminseepersonallyuserbethistory/:userId", adminRouterController.seeUserPersonallyBetHistory);
adminRouter.get('/accountsettlement/:userId', adminRouterController.getOpretorSeeUsersAccountStatement);
adminRouter.get('/allopretorsaccountstatement', adminRouterController.getAccountOfAllOpretorsStatement);
adminRouter.get('/masterpanelbyadmindashboard', adminRouterController.getMasterDownlineList);
adminRouter.post('/admincreatemaster', adminRouterController.postAdmincreatemaster);
adminRouter.get('/agentpanelbyadmindashboard', adminRouterController.getAgentPanelDashboard);
adminRouter.post('/opretorscreateagent', adminRouterController.postAdminandMastercreatagent);


// list link
adminRouter.get('/masterlinks/:userId', adminRouterController.getMasterLink);


module.exports = adminRouter;