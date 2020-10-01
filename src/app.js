const express = require('express');
const bodyParser = require('body-parser');
const {sequelize} = require('./model')
const {Op} = require("sequelize");
const {getProfile} = require('./middleware/getProfile')
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)

/**
 * FIX ME!
 * @returns contract by id
 */
app.get('/contracts/:id',getProfile ,async (req, res) =>{
    const {Contract} = req.app.get('models')
    const {id} = req.params
    const contract = await Contract.findOne({where: {id}})
    if(!contract) return res.status(404).end()
    res.json(contract)
})
module.exports = app;

app.get("/contracts/:user_id", async (req, res)=>{
    const {Contract} = req.app.get("models");
    const {user_id} = req.params;
    const contracts = await Contract.findAll({
        where:{
            [Op.or]:[
                {ClientId: user_id},
                {ContractorId:user_id}
            ]
        }
    })
    if (!contracts) return res.status(404).end();
    res.json(contracts);
})

app.get("/jobs/unpaid/:id", async(req, res)=>{
    const {Job} = req.app.get("job");
    const {id} = req.params;
    const jobs = await Job.findAll({
        where:{
            [Op.and]:[
                {id},
                {paid: {[Op.or]: [false, undefined, null]}}
            ]
        }
    })
    if (!jobs) return res.status(404).end();
    res.json(jobs);
})

//This method will take amount as a body input via POST request
app.post("/balances/deposit/:id", getProfile, async(req, res)=>{
    const {Profile} = req.app.get("models");
    const {amount} = req.body;
    const {id} = req.params;
    const profile = req.profile;
    if (amount > (profile.balance*0.25)) return res.status(201).json({status:"amount greater than 25%"})
    let newBalance = profile.balance - amount;
    const update = await Profile.update({balance:newBalance}, {where:{id}})
    res.json({status:"ok", newBalance:profile.balance})
})

//Start and end dates need to be sent as paramters
app.get("/admin/best-profession", async(req, res)=>{
    const {start, end} = req.query;
    const {Job, Contract, Profile} = req.app.get("models");
    const max = await Job.findAll({
        paymentDate: {[Op.between]:[start,end]},
        attributes:['ContractId', [sequelize.fn('max', sequelize.col('price')), 'max']]
    })
    const m = max[0];
    const contract = await Contract.findOne({where:{id:m.ContractId}})
    const profile = await Profile.findOne({where:{id:contract.ContractorId}})
    if (!profile) return res.status(404).end()
    res.json({profession:profile.profession});
})

app.get("/admin/best-clients", async(req, res)=>{
    const {start, end, limit} = req.query;
    const {Job, Contract, Profile} = req.app.get("models");
    let results = []
    Job.findAll({
        order:[
            ['price', 'DESC']
        ],
        limit: limit,
        // where:{
        //     paymentDate: {[Op.between]: [start, end]}
        // },
    }).then(async (response)=>{
        response.map(async (contract)=>{
            Contract.findOne({id:contract.ContractId}).then(async (response)=>{
            const profile = await Profile.findOne({id:response.ClientId});
            results.push({
                id: profile.id,
                fullName: profile.firstName.concat(" ", profile.lastName),
                paid: profile.balance
            })
        })
        })
    })
    res.json({result:results});
})