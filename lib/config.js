

class Config {
  constructor () {
    // object [model_name : model object]
    this.name_model_obj = {};

    // jwt infos
    this.jwt_salt_rounds = 10;
    this.jwt_issuer      = 'jwt issuer';
    this.jwt_audience    = 'jwt audience';
    this.jwt_secret      = 'jwt secret';

    this.archive_db          = null;  // 'mongo' for mongodb
    this.archive_db_host     = 'archive_db_host';
    this.archive_db_user     = 'archive_db_user';
    this.archive_db_password = 'archive_db_password';
    this.archive_db_name     = 'archive_db_name';

    // doc
    this.api_doc_root_path = null;

    this.Sequelize = null;
  }
};

const config = new Config();


module.exports = config;
