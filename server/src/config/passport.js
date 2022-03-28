const passportJWT = require("passport-jwt");
const config = require('../config/dbconfig');
const { User, Token_history } = require('../models');
const createError = require('../errorHandlers/ApiErrors');
const { Op } = require('sequelize');
let ExtractJwt = passportJWT.ExtractJwt;
let JwtStrategy = passportJWT.Strategy;

let jwtOptionRT = {
    jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
    secretOrKey: config.auth.refreshTokenSecret,
    passReqToCallback: true
}

let jwtOptionAT = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: config.auth.accessTokenSecret
}

module.exports = (passport) => {

    passport.use('refreshTokenAuthStrategy', new JwtStrategy(jwtOptionRT, async (req, jwt_payload, done) => {
            try {
                const refToken = req.body.refreshToken;
                const tokenValid = await Token_history.findOne({
                  where: {[Op.and]: [
                    {id_user: jwt_payload.id}, {refresh_token: refToken}
                  ]}
                });
                if(!tokenValid.isValid) {
                    await Token_history.destroy({ where: {id_user: jwt_payload.id}});
                    throw createError.Unauthorized('Access denied, please re-login.');
                } else {
                    const user = {
                        id: jwt_payload.id,
                        username: jwt_payload.username,
                        email: jwt_payload.email     
                    }
                    await Token_history.update({isValid: false}, {
                      where: {[Op.and]: [
                        {id_user: jwt_payload.id}, {refresh_token: refToken}
                      ]}
                    });
                    return done(null, user);
                }
            } catch (error) {
                return done(error, false);
            }
        })
    )

    passport.use('userAuthStrategy', new JwtStrategy(jwtOptionAT, async (jwt_payload, done) => {
            try {
                let user = await User.findOne({ where: { id: jwt_payload.id }});
                if (user) {
                    return done(null, user);
                } else {            
                    throw createError.NotFound('User tidak ditemukan.');
                }    
            } catch (error) {
                return done(error, false);        
            }
        })
    );
}