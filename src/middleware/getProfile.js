
const getProfile = async (req, res, next) => {
    const {Profile} = req.app.get('models')
    const {id} = req.params;
    const profile = await Profile.findOne({where: {id: id || 0}})
    if(!profile) return res.status(401).end()
    req.profile = profile
    next()
}
module.exports = {getProfile}