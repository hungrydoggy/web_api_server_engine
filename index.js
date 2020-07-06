

module.exports = {
  get config () { return require('./lib/config'); },

  get api_util           () { return require('./lib/utils/api_util'          ); },
  get db_util            () { return require('./lib/utils/db_util'           ); },
  get jwt_util           () { return require('./lib/utils/jwt_util'          ); },
  get mongo_archive_util () { return require('./lib/utils/mongo_archive_util'); },
  get none_archive_util  () { return require('./lib/utils/none_archive_util' ); },
  get route_util         () { return require('./lib/utils/route_util'        ); },

  get express_router () { return require('./lib/express_route_maker'); },
};
