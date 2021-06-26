
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { v1: uuid }   = require('uuid');

const config = require('../config');


module.exports = {
  
  async genHashSalt (password) {
    return new Promise((resolve, reject) => {
      bcrypt.genSalt(parseInt(config.jwt_salt_rounds), (err, salt) => {
        if (err)
          return reject(err);
        
        bcrypt.hash(password, salt, (err, hash) => {
          if (err)
            return reject(err);
          
          return resolve(hash);
        });
      });
    });
  },

  async compareWithHashSalt (password, hash_salt) {
    return new Promise((resolve, reject) => {
      bcrypt.compare(password, hash_salt, (err, res) => {
        if (err)
          return reject(err);
        
        return resolve(res);
      });
    });
  },

  async createAccessToken (custom_params={}, life_time_sec=60*60*24) {
    if (config.pre_create_access_token)
      await config.pre_create_access_token(custom_params);

    const jti = uuid();
    const exp = _makeTimeStamp(life_time_sec);
    const token = jwt.sign(
      Object.assign(
        {
          iss: config.jwt_issuer,
          aud: config.jwt_audience,
          exp,
          jti,
        },
        custom_params,
      ),
      config.jwt_secret,
    );

    return token;
  },

  async decodeAccessToken (token) {
    const decoded = new Promise((resolve, reject) => {
      jwt.verify(token, config.jwt_secret, (err, decoded) => {
        if (err)
          return reject(err);
        
        return resolve(decoded);
      });
    });
    if (config.post_decode_access_token)
      await config.post_decode_access_token(decoded);

    return decoded;
  },
}



function _makeTimeStamp (additional) {
  return Math.floor(Date.now() / 1000) + additional;
}
