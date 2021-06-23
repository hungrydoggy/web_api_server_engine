const db_util    = require('./db_util');
const jwt_util   = require('./jwt_util');
const route_util = require('./route_util');


module.exports = {
  makeCrud (
      Table,
      permission_create,
      permission_read,
      permission_update,
      permission_delete,
      option_map = {}, /*
                        * option_map.prePost   (decoded, params    , options    )
                        * option_map.preGetById(decoded, req_params, options    )
                        * option_map.preGet    (decoded, options   , order_query)
                        * option_map.prePut    (decoded, params    , options    )
                        * option_map.preDel    (decoded, options                )
                        * 
                        * option_map.onPost(
                        *   decoded, Table, params, options, unique_keys)
                        * option_map.onGetById(
                        *   decoded, Table, req_params, options)
                        * option_map.onGet(
                        *   decoded, Table, options, order_query)
                        * option_map.onPut(
                        *   decoded, Table, req_params, params, options, unique_keys)
                        * option_map.onDel(
                        *   decoded, Table, req_params, options)
                        *
                        * option_map.preReviseResultOnPost (decoded, item)
                        *
                        * option_map.postPost   (decoded, result)
                        * option_map.postGetById(decoded, req_params, result)
                        * option_map.postGet    (decoded, result)
                        * option_map.postPut    (decoded, req_params, params, options, result)
                        * option_map.postDel    (decoded, result)
                        *
                        * option_map.preSaveDoc(doc)
                        * 
                        * primary_key: 'id',
                        */
      unique_keys = [],
      options_create = {},
      options_read   = {},
      options_update = {},
      options_delete = {},
  ) {
    if (!option_map.primary_key)
      option_map.primary_key = 'id';

    db_util.setCrudPermission(Table.getTableName(), 'create', permission_create);
    db_util.setCrudPermission(Table.getTableName(), 'read'  , permission_read  );
    db_util.setCrudPermission(Table.getTableName(), 'update', permission_update);
    db_util.setCrudPermission(Table.getTableName(), 'delete', permission_delete);

    return {
      post: async (event) => _onPost(
        event,
        Table,
        permission_create,
        option_map,
        unique_keys,
        options_create,
      ),

      getById: async (event) => _onGetById(
        event,
        Table,
        permission_read,
        option_map,
        unique_keys,
        options_read,
      ),

      get: async (event) => _onGet(
        event,
        Table,
        permission_read,
        option_map,
        unique_keys,
        options_read,
      ),

      put: async (event) => _onPut(
        event,
        Table,
        permission_update,
        option_map,
        unique_keys,
        options_update,
      ),

      del: async (event) => _onDel(
        event,
        Table,
        permission_delete,
        option_map,
        unique_keys,
        options_delete,
      ),
    };

  },
};


async function _onPost (
  event,
  Table,
  permission,
  option_map,
  unique_keys,
  options_for_template,
) {
  if (permission === null) {
    return {
      statusCode: 404,
      headers: {'Access-Control-Allow-Origin': '*',},
      body: JSON.stringify({
        message: 'unavailable',
      }),
    };
  }
  

  return route_util.template(event, permission, async (decoded) => {
    const essential_table_fields = Object.keys(Table.rawAttributes).filter((k) => {
      const att = Table.rawAttributes[k];
      return k !== 'id' && k!=='createdAt' && k !== 'updatedAt' &&
        (att.allowNull === false && att.defaultValue);
    }).map((k)=>db_util.toExternalFieldName(Table.getTableName(), k));

    let {params, options} = route_util.checkRequestParams(event, ['params'], ['params', 'options']);
    if (typeof params === 'string')
      params = JSON.parse(params);
    if (options === undefined)
      options = {};

    if (option_map.prePost)
      await option_map.prePost(decoded, params, options);

    params = route_util.filterParamsWithExclusives(params, essential_table_fields, ['id']);

    if (option_map.onPost) {
      await option_map.onPost(
        decoded, Table, params, options, unique_keys);
    }

    const result = await route_util.commonPost(
        decoded, Table, option_map.primary_key, params, options, unique_keys, option_map.preReviseResultOnPost);

    if (option_map.postPost)
      await option_map.postPost(decoded, result);

    return result;
  }, options_for_template);
}

async function _onGetById (
  event,
  Table,
  permission,
  option_map,
  unique_keys,
  options_for_template,
) {
  if (permission === null) {
    return {
      statusCode: 404,
      headers: {'Access-Control-Allow-Origin': '*',},
      body: JSON.stringify({
        message: 'unavailable',
      }),
    };
  }


  return route_util.template(event, permission, async (decoded) => {
    const table_fields = Object.keys(
      Table.rawAttributes
    ).filter(
      (k)=>k!=='id'&&k!=='createdAt'&&k!=='updatedAt'
    ).map(
      (k)=>db_util.toExternalFieldName(Table.getTableName(), k)
    );

    let {options, need_count} = route_util.checkRequestParams(event, [], ['options', 'need_count']);
    options = (options === undefined)? {}: JSON.parse(options);

    if (option_map.preGetById)
      await option_map.preGetById(decoded, event.params, options);

    if (option_map.onGetById) {
      await option_map.onGetById(
        decoded, Table, event.params, options);
    }

    const result = await route_util.commonGetById(
        decoded,
        Table,
        option_map.primary_key,
        event.params.id,
        options,
        need_count,
        /*(options) => {
          if (table_fields.indexOf('#is_archived') >= 0) {
            if (!options.where) options.where = {};
            if (options.where['#is_archived'] === undefined)
              options.where['#is_archived'] = false;
          }
        },//*/
    );

    if (option_map.postGetById)
      await option_map.postGetById(decoded, event.params, result);

    return result;
  }, options_for_template);
}

async function _onGet (
  event,
  Table,
  permission,
  option_map,
  unique_keys,
  options_for_template,
) {
  if (permission === null) {
    return {
      statusCode: 404,
      headers: {'Access-Control-Allow-Origin': '*',},
      body: JSON.stringify({
        message: 'unavailable',
      }),
    };
  }

  return route_util.template(event, permission, async (decoded) => {
    const table_fields = Object.keys(
      Table.rawAttributes
    ).filter(
      (k)=>k!=='id'&&k!=='createdAt'&&k!=='updatedAt'
    ).map(
      (k)=>db_util.toExternalFieldName(Table.getTableName(), k)
    );

    let {options, order_query, need_count} = route_util.checkRequestParams(
      event, [], ['options', 'order_query', 'need_count']);
    options     = (options     === undefined)? {}  : JSON.parse(options    );
    order_query = (order_query === undefined)? null: JSON.parse(order_query);

    if (option_map.preGet)
      await option_map.preGet(decoded, options, order_query);

    if (option_map.onGet)
      await option_map.onGet(decoded, Table, options, order_query);

    const result = await route_util.commonGet(
        decoded,
        Table,
        option_map.primary_key,
        options,
        order_query,
        need_count,
        /*(options, order_query) => {
          const query = (!order_query)? options: order_query;

          if (table_fields.indexOf('#is_archived') >= 0) {
            if (!query.where) query.where = {};
            if (query.where['#is_archived'] === undefined)
              query.where['#is_archived'] = false;
          }
        },//*/
    );

    if (option_map.postGet)
      await option_map.postGet(decoded, result);

    return result;
  }, options_for_template);
}

async function _onPut (
  event,
  Table,
  permission,
  option_map,
  unique_keys,
  options_for_template,
) {
  if (permission === null) {
    return {
      statusCode: 404,
      headers: {'Access-Control-Allow-Origin': '*',},
      body: JSON.stringify({
        message: 'unavailable',
      }),
    };
  }

  return route_util.template(event, permission, async (decoded) => {
    let {params, options} = route_util.checkRequestParams(event, ['params'], ['params', 'options']);
    if (options === undefined)
      options = {};
    if (typeof params === 'string')
      params = JSON.parse(params);
    if (typeof options === 'string')
      options = JSON.parse(options);
      
    const table_fields = Object.keys(
      Table.rawAttributes
    ).filter(
      (k)=>k!=='id'&&k!=='createdAt'&&k!=='updatedAt'
    ).map(
      (k)=>db_util.toExternalFieldName(Table.getTableName(), k)
    );

    if (option_map.prePut)
      await option_map.prePut(decoded, params, options);

    params = route_util.filterParamsWithExclusives(params, [], ['id']);

    if (option_map.onPut) {
      await option_map.onPut(decoded, Table, event.params, params, options, unique_keys);
    }

    const result = await route_util.commonPut(decoded, Table, option_map.primary_key, event.params.id, params, options, unique_keys);

    if (option_map.postPut)
      await option_map.postPut(decoded, event.params, params, options, result);

    return result;
  }, options_for_template);
}

async function _onDel (
  event,
  Table,
  permission,
  option_map,
  unique_keys,
  options_for_template,
) {
  if (permission === null) {
    return {
      statusCode: 404,
      headers: {'Access-Control-Allow-Origin': '*',},
      body: JSON.stringify({
        message: 'unavailable',
      }),
    };
  }
  

  return route_util.template(event, permission, async (decoded) => {
    const table_fields = Object.keys(
      Table.rawAttributes
    ).filter(
      (k)=>k!=='id'&&k!=='createdAt'&&k!=='updatedAt'
    ).map(
      (k)=>db_util.toExternalFieldName(Table.getTableName(), k)
    );
    
    let {options} = route_util.checkRequestParams(event, [], ['options']);
    if (options === undefined)
      options = {};
    if (typeof options === 'string')
      options = JSON.parse(options);

    if (option_map.preDel)
      await option_map.preDel(decoded, options);

    if (option_map.onDel) {
      await option_map.onDel(decoded, Table, event.params, options);
    }

    let result = null;
    if (table_fields.indexOf('#is_archived') >= 0) {
      if (decoded.options_from_permission);
        route_util.mergeOptions(options, decoded.options_from_permission);
      if (options.where === undefined)
        options.where = {};
      options.where.id = event.params.id;

      const updated = await Table.update({'#is_archived': true}, options);
      result = {
        statusCode: 200,
        body: JSON.stringify({
          message: 'ok',
          updated,
        }),
      };
    }else
      result = await route_util.commonDel(decoded, Table, option_map.primary_key, event.params.id, options);

    if (option_map.postDel)
      await option_map.postDel(decoded, result);

    return result;
  }, options_for_template);
}
