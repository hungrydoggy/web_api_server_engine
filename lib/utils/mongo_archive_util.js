const { MongoClient } = require('mongodb');

const config = require('../config');


module.exports = {
  archive: async (table_name, obj) => {
    await _insertOne(
      'archived',
      {
        TABLE_NAME: table_name,
        ...obj,
      },
    );
  },
};


let client_ = null;
let db_     = null;

async function _connect () {
  if (db_)
    return db_;

  client_ = await new Promise((resolve, reject) => {
    MongoClient.connect(
      `mongodb://${config.archive_db_user}:${encodeURIComponent(config.archive_db_password)}@${config.archive_db_host}`,
      (err, client) => {
        if (err)
          return reject(err);

        resolve(client);
      },
    );
  });


  db_ = client_.db(config.archive_db_name);


  // create archived collection
  const has_archived = await new Promise((resolve, reject) => {
    db_.listCollections({name:'archived'}).next(function(err, coll_info) {
      resolve(coll_info !== null);
    });
  });
  if (has_archived === false) {
    await new Promise((resolve, reject) => {
      db_.createCollection('archived', (err, res) => {
        if (err)
          reject(err);
        resolve();
      });
    });

    const coll = db_.collection('archived');

    await new Promise((resolve, reject) => {
      coll.insertOne(
        { TABLE_NAME:null, id:null, },
        (err, res) => {
          if (err)
            reject(err);
          resolve(res);
        }
      );
    });

    await new Promise((resolve, reject) => {
      coll.createIndex(
        { TABLE_NAME: 1, id: 1, },
        (err, res) => {
          if (err)
            reject(err);
          resolve(res);
        }
      );
    });
  }

  
  return db_;
}

async function _insertOne (coll_name, obj) {
  const db = await _connect();

  const coll = db.collection(coll_name);
  await new Promise((resolve, reject) => {
    coll.insertOne(
      obj,
      (err, res) => {
        if (err)
          reject(err);
        resolve(res);
      }
    );
  });
}


