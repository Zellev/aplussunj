const passportJWT = require("passport-jwt");
const config = require('../config/dbconfig');
const { User } = require('../models')
let ExtractJwt = passportJWT.ExtractJwt;
let JwtStrategy = passportJWT.Strategy;
let jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: config.auth.secretKey
};
const getUser = obj => {
    return User.findOne({
        where: obj
    })
};
const strategy = new JwtStrategy(jwtOptions, async (jwt_payload, done) => {
   try {
    let user = await getUser({ id: jwt_payload.id });
        if (user) {
            return done(null, user);
        } else {
            return done(null, false);
        }    
   } catch (err) {
        return done(err, false);
        
   }
}); 

module.exports = (passport) => {
    passport.use(strategy)
}