const express = require('express');
const router = express.Router();
const model = require('../models/model');

router.get('/get_data', async (req, res) => {
    let data = await model.getData();
    res.json(data);
});
router.get('/plannedDelays', async (req, res) => {
    // let data = {
    //     's350': Model.getDelayPlan('s350'),
    //     's210': Model.getDelayPlan('s210')
    // };
    // res.json(data);
});
router.post('/plannedDelays', async (req, res) => {
    // let data = {
    //     's350': Model.getDelayPlan('s350'),
    //     's210': Model.getDelayPlan('s210')
    // };

    // data.s350.delay_planned_time = req.body.s350;
    // Model.setDelayPlan('s350', data.s350);

    // data.s210.delay_planned_time = req.body.s210;
    // Model.setDelayPlan('s210', data.s210);

    // res.json(data);
});
router.post('/dev_plan', async (req, res) => {
    // if (req.auth) {
    //     if (req.body) Model.setDevPlan(req.body);
    //     res.status(200).send();
    // } else return res.status(401).send();
});
router.get('/dev_plan', async (req, res) => {
    // let result = await Model.getDevPlan(req.query.date);
    // res.json(result);
});

router.get('/getSPCTemperature', async (req, res) => {
    // let result = await Model.getSPCTemperature();
    // res.json(result);
});


module.exports = router;
