const rjson     = require('relaxed-json');
const Sequelize = require('sequelize');

const config   = require('../config');
const db_util  = require('./db_util');
const jwt_util = require('./jwt_util');

const archive_util =
  (config.archive_db === 'mongo')? require('./mongo_archive_util'):
  require('./none_archive_util');
  


const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Credentials": true,
}

module.exports = {
  headers,

  mergeOptions,

  async template (
    event,
        /*
         * event: {
         *   method: 'POST' | 'GET' | 'UPDATE' | 'DELETE'
         *   token : '~',
         *   params: { ~ },
         *   query : null | { ~ },
         *   body  : null | { ~ },
         * }
        */
    permission,    /* ex) User/create
                    *     User/get{where:{id:%.id}}    // % is 'decoded'
                    *     User/
                    *     undefined // run without permission
                   */
    func,          // async (decoded) => { statusCode:200, ... }
    options={},
        /*
         * options : {
         *   onStart    : async () => {},
         *   handleCatch: async (e) => return { statusCode:200, ...},
         * }
        */
  ) {
    if (options.onStart)
      await options.onStart();

    const token = event.token;
    try {
      if (permission && (!token || token === 'null')) {
        return {
          statusCode: 401,
          headers,
          body: {
            message: 'need token',
          },
        };
      }

      let decoded = undefined;
      if (token && token !== 'null') {
        try {
          decoded = await jwt_util.decodeAccessToken(token);

          // check permission
          if (permission)
            decoded.options_from_permission = await checkPermissionAndReturnQueryOptions(decoded, permission);
          
        }catch (e) {
          if (permission)
            throw e;
        }
      }

      const res = await func(decoded, event);
      if (res.headers === undefined)
        res.headers = {};
      res.headers = Object.assign({}, res.headers, headers);
      
      // await close();
      return res;

    }catch (e) {
      if (e.statusCode !== undefined) {
        console.log(e);
        
        if (e.code === 'ValidationException') {
          return {
            statusCode: 400,
            headers,
            body: {
              message: 'ValidationException : ' + e.message,
            },
          };
        }
        
        if (e.message !== undefined) {
          return {
            statusCode: 400,
            headers,
            body: {
              message: e.message,
            },
          };
        }

        e.headers = Object.assign({}, e.headers, headers);
        return e;
      }

      switch (e.name) {
        case 'TokenExpiredError':
          return {
            statusCode: 401,
            headers,
            body: {
              message: 'token is expired',
            },
          };
        case 'JsonWebTokenError':
          return {
            statusCode: 401,
            headers,
            body: {
              message: 'token is malformed',
            },
          };
        case 'SequelizeUniqueConstraintError':
          return {
            statusCode: 400,
            headers,
            body: {
              message: e.errors.map((v)=>v.message).join('\n'),
            },
          };
        default:
          if (options.handleCatch)
            return await options.handleCatch(e);
          break;
      }


      let err_msg = e.toString();
      if (e.stack)
        err_msg += '\n' + e.stack;
      console.log(e);
      return {
        statusCode: 500,
        headers,
        body: {
          message: err_msg,
        },
      };
    }
  },

  filterParams,
  filterParamsWithExclusives,

  checkRequestParams,

  reviseQuery,
  reviseResult,

  checkPermissionByFind,

  
  async commonPost (
      decoded, Table, primary_key, params, options, unique_keys) {

    const permissions = (decoded && decoded.permissions) || [];
    params  = await reviseQuery(decoded, Table.getTableName(), params , permissions, true );
    options = await reviseQuery(decoded, Table.getTableName(), options, permissions, false);
    
    // fix params
    if (decoded && decoded.options_from_permission && decoded.options_from_permission.where) {
      const where = decoded.options_from_permission.where;
      _fixParamsWithWhere(params, where, true, true);
    }
    
    for (const key of unique_keys)
      await _checkUniqueField(Table, primary_key, undefined, key, params[key]);

    let new_row = (await Table.create(params, options)).toJSON();
    
    new_row = reviseResult(decoded, Table.getTableName(), new_row, permissions);

    return {
      statusCode: 201,
      body: {
        message: 'created',
        items: [new_row,],
      },
    };
  },

  async commonGet (
      decoded, Table, primary_key, options, need_count=undefined) {
    
    const permissions = (decoded && decoded.permissions) || [];
    options = await reviseQuery(decoded, Table.getTableName(), options, permissions, false);

    if (decoded && decoded.options_from_permission)
      mergeOptions(options, decoded.options_from_permission);

    if (need_count === true || need_count === 'true') {
      const count = await Table.count(options);
      return {
        statusCode: 200,
        body: {
          message: 'ok',
          items: [count],
        },
      };
    }

    const res = await Table.findAll(options);
    let items = res.map((r)=>r.toJSON());

    items = reviseResult(decoded, Table.getTableName(), items, permissions);
    
    return {
      statusCode: 200,
      body: {
        message: 'ok',
        items,
      },
    };
  },

  async commonGetById (decoded, Table, primary_key, id, options, need_count=undefined) {

    if (decoded && decoded.options_from_permission) {
      const rows = await Table.findAll(decoded.options_from_permission);
      const has_perm = rows.filter((r) => parseInt(r[primary_key]) === parseInt(id)).length > 0;
      if (has_perm === false) {
        throw {
          statusCode: 403,
          body: {
            message: `no permission`,
          },
        };
      }
    }

    const permissions = (decoded && decoded.permissions) || [];
    options = await reviseQuery(decoded, Table.getTableName(), options, permissions, false);
    
    if (!options.where)
      options.where = {};
    options.where[primary_key] = id;

    if (need_count === true || need_count === 'true') {
      const count = await Table.count(options);
      return {
        statusCode: 200,
        body: {
          message: 'ok',
          items: [count],
        },
      };
    }

    if (!options.where)
      options.where = {}
    options.where[primary_key] = id;
    const res = await Table.findOne(options, {});

    if (res === null) {
      throw {
        statusCode: 400,
        body: {
          message: `no item for ${primary_key} : ` + id,
        },
      };
    }


    let item = res.toJSON();
    item = reviseResult(decoded, Table.getTableName(), item, permissions);

    
    return {
      statusCode: 200,
      body: {
        message: 'ok',
        items: [item,],
      },
    };
  },

  async commonPut (decoded, Table, primary_key, id, params, options, unique_keys = []) {

    if (decoded && decoded.options_from_permission) {
      const rows = await Table.findAll(decoded.options_from_permission);
      const has_perm = rows.filter((r) => parseInt(r[primary_key]) === parseInt(id)).length > 0;
      if (has_perm === false) {
        throw {
          statusCode: 403,
          body: {
            message: `no permission`,
          },
        };
      }
    }
    
    const permissions = (decoded && decoded.permissions) || [];
    params  = await reviseQuery(decoded, Table.getTableName(), params , permissions, true );
    options = await reviseQuery(decoded, Table.getTableName(), options, permissions, false);

    // fix params
    if (decoded && decoded.options_from_permission && decoded.options_from_permission.where) {
      const where = decoded.options_from_permission.where;
      _fixParamsWithWhere(params, where);
    }
    
    if (!options.where)
      options.where = {};
    options.where[primary_key] = id;

    for (const key of unique_keys)
      await _checkUniqueField(Table, primary_key, id, key, params[key]);

    const updated = await Table.update(params, options);
    
    return {
      statusCode: 200,
      body: {
        message: 'ok',
        updated,
      },
    };
  },

  async commonDel (decoded, Table, primary_key, id, options) {

    if (decoded && decoded.options_from_permission) {
      const rows = await Table.findAll(decoded.options_from_permission);
      const has_perm = rows.filter((r) => parseInt(r[primary_key]) === parseInt(id)).length > 0;
      if (has_perm === false) {
        throw {
          statusCode: 403,
          body: {
            message: `no permission`,
          },
        };
      }
    }

    const permissions = (decoded && decoded.permissions) || [];
    options = await reviseQuery(decoded, Table.getTableName(), options, permissions, false);
    
    if (!options.where)
      options.where = {};
    options.where[primary_key] = id;

    const row = await Table.findOne(options);
    if (row)
      await archive_util.archive(Table.getTableName(), row.toJSON());

    const deleted_count = await Table.destroy(options);
    
    return {
      statusCode: 200,
      body: {
        message: 'ok',
        deleted_count,
      },
    };
  },
  
  async throwIfNotExists (Table, primary_key, id, options={}) {
    const where = {};
    where[primary_key] = id;

    const row = await Table.findOne(
      Object.assign(
        { where },
        options,
      )
    );
    if (row === null) {
      throw {
        statusCode: 400,
        headers: {'Access-Control-Allow-Origin': '*',},
        body: {
          message: `no ${Table.getTableName()} for ${primary_key}: ${id}`,
        },
      };
    }

    return row;
  },

  async loginTemplate (
    event,
    find_func,               /* async (login_id) => #row */
    make_token_params_func,  /* async (row) => #token_params */
    make_result_item_func,   /* (row, token_params) => #result_item */
    login_id_param_name      = 'login_id',
    password_param_name      = 'password',
    password_hash_field_name = '#password_hash',
  ) {
    const params = checkRequestParams(event, [login_id_param_name, password_param_name], []);
    const login_id = params[login_id_param_name];
    const password = params[password_param_name];

    const row = await find_func(login_id);
    if (row === null || row['#is_archived'] === true) {
      throw {
        statusCode: 400,
        body: {
          message: 'login_id and password do not match',
        },
      };
    }
  
    const is_equal = await jwt_util.compareWithHashSalt(password, row[password_hash_field_name]);
    if (is_equal === false) {
      throw {
        statusCode: 400,
        body: {
          message: 'login_id and password do not match.',
        },
      };
    }
  
    const token_params = await make_token_params_func(row);
    const token = jwt_util.createAccessToken(token_params);
    return {
      statusCode: 200,
      body: {
        message: 'ok',
        items: [{
          token,
          ...make_result_item_func(row, token_params),
        }],
      },
    };
  },

}


function mergeOptions (target, input) {
  for (const key in input) {
    if (target[key] === undefined)
      target[key] = input[key];
    else
      mergeOptions(target[key], input[key]);
  }
  return target;
}

function checkRequestParams (event, essentials = [], filters = []) {
  let params = {};
  switch (event.method) {
    case 'GET':
    case 'DELETE':
      params = event.query;
      break;
    case 'POST':
    case 'PUT':
      params = event.body;
      break;
  }

  return filterParams(params, essentials, filters);
}

function filterParams (params, essentials = [], filters = []) {
  const ommited = essentials.map((key)=> (params[key] === undefined)? key: null).filter((key)=>key !== null);
  if (ommited.length > 0) {  
    throw {
      statusCode: 400,
      body: {
        message: 'some essential params ommited : ' + ommited.join(', '),
      },
    };
  }

  if (filters.length <= 0)
    return params;
  
  const filtered = {};
  filters.map((key) => {
    if (params[key] !== undefined)
      filtered[key] = params[key];
  });
  return filtered;
}

function filterParamsWithExclusives (params, essentials = [], exclusives = []) {
  const ommited = essentials.map((key)=> (params[key] === undefined)? key: null).filter((key)=>key !== null);
  if (ommited.length > 0) {
    throw {
      statusCode: 400,
      body: {
        message: 'some essential params ommited : ' + ommited.join(', '),
      },
    };
  }

  if (exclusives.length <= 0)
    return params;
  
  const exclusive_check_map = {};
  exclusives.forEach((k)=>exclusive_check_map[k]=true);
  
  const filtered = {};
  Object.keys(params).filter((key)=>exclusive_check_map[key]===undefined).map((key) => {
    filtered[key] = params[key];
  });
  return filtered;
}

async function reviseQuery (decoded, table_name, obj, permissions, is_write_mode=false) {
  if (obj === null || obj === undefined)
    return obj;

  if (Array.isArray(obj) === true) {
    for (const key in obj) {
      obj[key] = await reviseQuery(decoded, table_name, obj[key], permissions, is_write_mode);
    }
  }else if (typeof obj === 'object') {
    // replace / to # for first char
    Object.keys(obj).forEach((k) => {
      if (k[0] === '/') {
        obj['#'+k.substr(1)] = obj[k];
        delete obj[k];
      }else if (k[0] === '@' && k[1] === '/') {
        obj['@#'+k.substr(2)] = obj[k];
        delete obj[k];
      }
    });


    // process for object
    const delete_keys = [];
    for (const key in obj) {
      if (key === 'include' && Array.isArray(obj[key]) === true) {
        if (typeof permissions === 'string')
          permissions = JSON.parse(permissions);

        const elements = obj[key];
        // replace / to # for first char
        elements.forEach((e, ei) => {
          console.log(e);
          if (e[0] === '/') {
            elements[ei] = '#'+e.substr(1);
          }else if (e[0] === '*' && e[1] === '/') {
            elements[ei] = '*#'+e.substr(2);
          }
        });
        
        for (const ei in elements) {
          const e = elements[ei];
          const model = db_util.getModelFromAssociationName(
            table_name,
            (typeof e === 'object')? e.association: e,
          );

          // permission check
          const perm = db_util.getCrudPermission(model.getTableName(), (is_write_mode)? 'update':'read');
          if (perm) {
            const options_from_permission = await checkPermissionAndReturnQueryOptions(decoded, perm);

            if (is_write_mode === true) {
              const rows = await model.findAll(options_from_permission);
              const has_perm = rows.length > 0;
              if (has_perm === false) {
                throw {
                  statusCode: 403,
                  body: {
                    message: `no permission`,
                  },
                };
              }
            }else {
              const options = (typeof e === 'object')? e: { association: e };
              mergeOptions(
                options,
                options_from_permission,
              );
              elements[ei] = options;
            }
          }

          // revise
          await reviseQuery(decoded, model.getTableName(), e, permissions, is_write_mode);
        }

        obj[key] = elements;
      }else if (key[0] === '!') {
        const special = key.slice(1);
        if (special === 'literal') {
          throw {
            statusCode: 403,
            body: {
              message: 'calling "literal" is forbidden',
            },
          };
        }
        return Sequelize[special](...(await reviseQuery(decoded, table_name, obj[key], permissions, is_write_mode)));
      }else if (key[0] === '$' && key[key.length-1] !== '$') {
        delete_keys.push(key);
        const special = key.slice(1);
        obj[Sequelize.Op[special]] = await reviseQuery(decoded, table_name, obj[key], permissions, is_write_mode);
      }else if (key[0] === '@' && key[1] === '#') {
        const int_key = db_util.toInternalFieldName(table_name, key);
        const has_perm = (is_write_mode)? true: db_util.hasFieldPermission(decoded, table_name, int_key, obj, permissions, ['/read']);
        if (int_key !== key || !has_perm)
          delete_keys.push(key);
        obj[int_key] = await reviseQuery(decoded, table_name, obj[key], permissions, is_write_mode);
      }else if (key[0] === '@') {
        const int_key = db_util.toInternalFieldName(table_name, key);
        if (int_key !== key)
          delete_keys.push(key);
        obj[int_key] = await reviseQuery(decoded, table_name, obj[key], permissions, is_write_mode);
      }else if (key[0] === '#') {
        const int_key = db_util.toInternalFieldName(table_name, key);
        const has_perm = (is_write_mode)? true: db_util.hasFieldPermission(decoded, table_name, int_key, obj, permissions, ['/read']);
        if (int_key !== key || !has_perm)
          delete_keys.push(key);
        obj[int_key] = await reviseQuery(decoded, table_name, obj[key], permissions, is_write_mode);
      }else if (key[0] === '*' && is_write_mode === true) {
        delete_keys.push(key);
      }else if (key === 'attributes') {
        const attributes = obj[key];
        for (const ai in attributes)
          attributes[ai] = await reviseQuery(decoded, table_name, attributes[ai], permissions, is_write_mode);
      }else {
        obj[key] = await reviseQuery(decoded, table_name, obj[key], permissions, is_write_mode);
      }
    }

    for (const key of delete_keys)
      delete obj[key];
    
  }else if (typeof obj === 'string') {
    if (obj[0] === '.') {
      const words = obj.substr(1).split('.');
      let base = config.name_model_obj[words[0]];
      if (base === undefined)
        return obj;
      
      for (const w of words.slice(1))
        base = base[w];
      
      return base;
    }else if (obj[0] === '/') {
      return '#' + obj.substr(1);
    }else if (obj[0] === '@' && obj[1] === '/') {
      return '@#' + obj.substr(2);
    }
  }

  return obj;
}

function reviseResult (decoded, table_name, obj, permissions) {
  if (typeof permissions === 'string')
    permissions = JSON.parse(permissions);

  let result = obj;
  if (Array.isArray(obj) === true) {
    result = [];
    for (const value of obj)
      result.push(reviseResult(decoded, table_name, value, permissions));
  }else if (obj === null || obj instanceof Date) {
  }else if (typeof obj === 'object') {
    result = {};
    for (const key in obj) {

      // skip many-to-many model info
      const model_info = db_util.getModelInfoMap(key);
      if (model_info) {
        continue;
        /*
        const m = model_info.model;
        result[key] = reviseResult(decoded, m.getTableName(), obj[key], permissions);
        continue;
        */
      }


      const ext_key = db_util.toExternalFieldName(table_name, key);

      if (ext_key[0] === '*' && ext_key[1] === '#') {
        const has_perm = db_util.hasFieldPermission(decoded, table_name, key, obj, permissions, ['/read']);
        if (has_perm) {
          const model = db_util.getModelFromAssociationName(table_name, ext_key);
          result[ext_key] = reviseResult(decoded, model.getTableName(), obj[key], permissions);
        }
      }else if (ext_key[0] === '*') {
        const model = db_util.getModelFromAssociationName(table_name, ext_key);
        result[ext_key] = reviseResult(decoded, model.getTableName(), obj[key], permissions);
      }else if (ext_key[0] === '#' || (ext_key[0] === '@' && ext_key[1] === '#')) {
        const has_perm = db_util.hasFieldPermission(decoded, table_name, key, obj, permissions, ['/read']);
        if (has_perm)
          result[ext_key] = reviseResult(decoded, table_name, obj[key], permissions);
      }else {
        result[ext_key] = reviseResult(decoded, table_name, obj[key], permissions);
      }
    }
    
  }

  return result;
}

async function checkPermissionAndReturnQueryOptions (decoded, target_perm) {
  let permissions = [];
  if (decoded) {
    permissions = decoded.permissions;
    if (typeof decoded.permissions === 'string')
      permissions = JSON.parse(decoded.permissions);
  }
  
  const own_perms       = [];
  const exclusive_perms = [];
  for (const p of permissions) {
    if (p[0] === '^')
      exclusive_perms.push(p.substr(1).split('{', 1)[0].split('%', 1)[0]);
    else {
      const sharp_idx = p.indexOf('%');
      if (sharp_idx >= 0 && p[sharp_idx+1] !== '{') {
        const [perm, tail] = p.split('%', 2);
        const pair_strs = tail.split(',').map((pair) => {
          let [left, right] = pair.split(':');
          if (!right) {
            right = 'id';
          }
          return `"${left}":%.${right}`;
        });
        own_perms.push(`${perm}{where:{${pair_strs.join(',')}}}`);
      }else
        own_perms.push(p);
    }
  }

  // check exclusived
  const is_exclusived = exclusive_perms.filter((p) => {
    return p === target_perm || (p[p.length-1] === '/' && target_perm.startsWith(p));
  }).length > 0;
  if (is_exclusived) {
    throw {
      statusCode: 403,
      headers,
      body: {
        message: `need permission: ${target_perm}`,
      },
    };
  }
  
  // check permission
  const cand_permissions = own_perms.map((p) => {
    const sep_idx = p.indexOf('{');
    return (sep_idx < 0)?
      [ p, null ]:
      [ p.substr(0, sep_idx), p.substr(sep_idx)];
  }).filter(([p, options_part]) => {
    return p === target_perm || (p[p.length-1] === '/' && target_perm.startsWith(p));
  });
  const has_permission = cand_permissions.length > 0;
  if (has_permission === false) {
    throw {
      statusCode: 403,
      headers,
      body: {
        message: `need permission: ${target_perm}`,
      },
    };
  }
  
  // options part
  const last_perm = cand_permissions[cand_permissions.length - 1];
  const options_part = last_perm[1];
  if (options_part)
    return _parsePermissionOptions(decoded, `${options_part}`);

  return {};
}

async function checkPermissionByFind (Table, decoded, reviseOption=(options)=>{}) {
  if (decoded && decoded.options_from_permission) {
    const options = Object.assign({}, decoded.options_from_permission);
    reviseOption(options);
    const row = await Table.findOne(options);
    const has_perm = !!row;
    if (has_perm === false) {
      throw {
        statusCode: 403,
        body: {
          message: `no permission`,
        },
      };
    }
  }
}


async function _checkUniqueField (Table, primary_key, cur_id, field, value) {
  if (value === undefined)
    return;
  
  const where = { is_archived: false, };
  where[field] = value;
  const row = await Table.findOne({where,});
  if (row !== null && row[primary_key] !== parseInt(cur_id)) {
    throw {
      statusCode: 400,
      headers,
      body: {
        message: 'same "' + field + '" exists (' + value + ')',
      },
    };
  }
}

function _parsePermissionOptions (decoded, options_str) {
  const re = /\%\.((?:[@#]|\w)+)/g;
  while (true) {
    const res = re.exec(options_str);
    if (res === null)
      break;

    let value = decoded[res[1]];
    if (value === undefined) {
      throw {
        statusCode: 403,
        body: {
          message: `no permission`,
        },
      };
    }
    
    if (typeof value === 'string')
      value = JSON.stringify(value);
    
    options_str = options_str.replace(res[0], value);
  }
  
  return rjson.parse(options_str);
}

function _fixParamsWithWhere (params, where, key_must_be=false, ignore_id=false) {
  for (const key in where) {
    if (ignore_id && key === 'id')
      continue;

    // FIXME to cover object like { '$or': [...] }
    if ((key_must_be && !params[key]) || (params[key] && params[key] !== where[key])) {
      throw {
        statusCode: 403,
        body: {
          message: `no permission. '${key}' must be '${where[key]}'`,
        },
      };
    }
  }
}
