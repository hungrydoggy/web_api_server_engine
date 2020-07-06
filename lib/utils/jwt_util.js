
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const uuid = require('uuid/v1');


module.exports = {
  
  async genHashSalt (password) {
    return new Promise((resolve, reject) => {
      bcrypt.genSalt(parseInt(process.env.JWT_SALT_ROUNDS), (err, salt) => {
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

  createAccessToken (custom_params={}, life_time_sec=60*60*24) {
    const jti = uuid();
    const exp = _makeTimeStamp(life_time_sec);
    const token = jwt.sign(
      Object.assign(
        {
          iss: process.env.JWT_ISS,
          aud: process.env.JWT_AUD,
          exp,
          jti,
        },
        custom_params,
      ),
      process.env.JWT_SECRET,
    );

    return token;
  },

  async decodeAccessToken (token) {
    return new Promise((resolve, reject) => {
      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err)
          return reject(err);
        
        return resolve(decoded);
      });
    });
  },
}



function _makeTimeStamp (additional) {
  return Math.floor(Date.now() / 1000) + additional;
}