
const tablename_info_map_ = {
  /*
   * "table_name": {
   *   model: <Model>,
   *   internalfield_externalfield_map: {},
   *   externalfield_internalfield_map: {},
   *   internalfield_permissions_map: {
   *     'some_field': [ 'SomePermission/item', ... ],
   *   },
   *   associationname_model_map: {},
   *   create_permission: '~',
   *   read_permission  : '~',
   *   update_permission: '~',
   *   delete_permission: '~',
   * },
  */
};


module.exports = {
  link,
  linkByManyToMany,
  getCrudPermission (table_name, crud_type) {
    const info = tablename_info_map_[table_name];
    if (!info)
      return null;
    
    switch (crud_type) {
      case 'create': case 'read': case 'update': case 'delete': break;
      default:
        throw {
          statusCode: 400,
          body: {
            message: `unavailable type: '${crud_type}'`,
          },
        };
    }

    return info[`${crud_type}_permission`];
  },
  setCrudPermission (table_name, crud_type, permission) {
    const info = _getOrCreateTableInfo(table_name);
    
    switch (crud_type) {
      case 'create': case 'read': case 'update': case 'delete': break;
      default:
        throw {
          statusCode: 400,
          body: {
            message: `unavailable type: '${crud_type}'`,
          },
        };
    }

    info[`${crud_type}_permission`] = permission;
  },
  toExternalFieldName (table_name, internal_field) {
    const info = tablename_info_map_[table_name];
    const result = info.internalfield_externalfield_map[internal_field];
    if (!result) {
      throw {
        statusCode: 400,
        body: {
          message: `no external-field-name for '${table_name}.${internal_field}'`,
        },
      };
    }
    return result;
  },
  toInternalFieldName (table_name, external_field) {
    const info = tablename_info_map_[table_name];
    const result = info.externalfield_internalfield_map[external_field];
    if (!result) {
      throw {
        statusCode: 400,
        body: {
          message: `no internal-field-name for '${table_name}.${external_field}'`,
        },
      };
    }
    return result;
  },
  getFieldPermissions,
  hasFieldPermission (decoded, table_name, internal_field, obj, permissions, perm_ends=['/read']/* or '/write'*/) {
    const field_permissions = getFieldPermissions(table_name, internal_field);
    if (!field_permissions)
      return true;

    for (const fp of field_permissions) {
      for (const p of permissions) {
        if (p.startsWith(fp) === false)
          continue;
        const end_str = p.substr(fp.length);
        const [tail, query] = end_str.split('%', 2);
        if (tail === '/' || perm_ends.indexOf(tail) >= 0) {
          if (query)
            return checkFieldPermissionQuery(decoded, obj, query);
          else
            return true;
        }
      }
    }
    
    return false;
  },

  checkFieldPermissionQuery,

  getModelFromAssociationName (table_name, association_name) {
    const info = tablename_info_map_[table_name];
    const model = info.associationname_model_map[association_name];
    if (!model) {
      throw {
        statusCode: 400,
        body: {
          message: `no model for '${table_name}.${association_name}'`,
        },
      };
    }

    return model;
  },
  getModelInfoMap (table_name) {
    return tablename_info_map_[table_name];
  },
};


function getFieldPermissions (table_name, internal_field) {
  const info = tablename_info_map_[table_name];
  if (!info)
    return info;
  
  return info.internalfield_permissions_map[internal_field];
}

function link (model, model_map) {
  const table_info = _getOrCreateTableInfo(model.getTableName());
  table_info.model = model;


  for (const key in model.rawAttributes) {
    const obj = model.rawAttributes[key];
    if (key[0] === '@' && key[1] === '#') {
      const {as_name} = _linkAssociation(model, model_map, key, obj);
      _linkHiddenField(model, model_map, key, obj, 1, [as_name]);
    }else if (key[0] === '@')
      _linkAssociation(model, model_map, key, obj);
    else if (key[0] === '#')
      _linkHiddenField(model, model_map, key, obj);
    else
      _linkOthers(model, model_map, key, obj);
  }

}

function linkByManyToMany (model, model_map, need_link_first=true, need_link_second=true) {
  const table_info = _getOrCreateTableInfo(model.getTableName());
  table_info.model = model;


  const m2m_fields = [];

  for (const key in model.rawAttributes) {
    const obj = model.rawAttributes[key];
    if (key[0] === '@') {
      if (m2m_fields.length < 2)
        m2m_fields.push([key, obj]);
      const {as_name} = _linkAssociation(model, model_map, key, obj);
      if (key[1] === '#')
        _linkHiddenField(model, model_map, key, obj, 1, [as_name]);
    }else if (key[0] === '#')
      _linkHiddenField(model, model_map, key, obj);
    else
      _linkOthers(model, model_map, key, obj);
  }


  // many to many
  if (m2m_fields.length < 2)
    throw `link error: linking field's count is less than 2`;

  const tablename_model_map = {};
  model_map.forEach((m)=>tablename_model_map[m.getTableName()]=m);

  first  = _parseManyToManyField(model, tablename_model_map, m2m_fields[0][0], m2m_fields[0][1]);
  second = _parseManyToManyField(model, tablename_model_map, m2m_fields[1][0], m2m_fields[1][1]);

  if (need_link_first)
    _linkManyToMany(model, first [0], first [2], second[0], second[2], second[1], first [3]);
  if (need_link_second)
    _linkManyToMany(model, second[0], second[2], first [0], first [2], first [1], second[3]);
}

function checkFieldPermissionQuery (decoded, obj, query) {
  for (const pair of query.split(',').map((e) => e.trim().split(':'))) {
    const [ls, rs] = (pair[1])? pair: ['id', pair[0]];
    const obj_v     = _checkFieldPermissionQuery_parseQuery(obj    , ls.split('.'));
    const decoded_v = _checkFieldPermissionQuery_parseQuery(decoded, rs.split('.'));

    if (obj_v === undefined || decoded_v === undefined || obj_v != decoded_v)
      return false;
  }

  return true;
}

function _checkFieldPermissionQuery_parseQuery (obj, keys) {
  if (obj === undefined && keys.length <= 0)
    return obj;

  // array case
  if (Array.isArray(obj)) {
    for (const o of obj) {
      const v = _checkFieldPermissionQuery_parseQuery(o, keys);
      if (v !== undefined)
        return v;
    }
    return undefined;
  }

  // value case
  if (typeof obj !== 'object')
    return obj;

  // object case
  return _checkFieldPermissionQuery_parseQuery(obj[keys[0]], keys.slice(1));
}

function _parseManyToManyField (model, tablename_model_map, key, obj) {
  const full_str = key.substr(1) + _getOptionStrFromComment(obj.comment);
  let [head, middle, tail] = full_str.split('.');

  // head
  let [field_name, as_name] = head.split(':');
  if (!field_name)
    throw `link error: no field-name of '${model.getTableName()}.${key}'`;
  if (!as_name) {
    if (field_name.endsWith('_id')) {
      as_name = field_name.substring(0, field_name.length - 3);
      as_name = _makeTailS(as_name);
    }else
      throw `link error: no as-name of '${model.getTableName()}.${key}'`;
  }
  
  // middle
  const [target_table_name] = middle.split(':');
  if (!target_table_name)
    throw `link error: no target-table-name of '${model.getTableName()}.${key}'`;
  const target_model = tablename_model_map[target_table_name];
  if (!target_model)
    throw `link error: no target-model for '${target_table_name}' in target_models on '${model.getTableName()}.${key}'`;

  // tail
  const handler_options = tail;

  return [field_name, as_name, target_model, handler_options];
}

function _linkManyToMany (
    model,
    self_field_name,
    self_model,
    other_field_name,
    other_model,
    other_as_name,
    self_handler_options
) {
  const table_info = _getOrCreateTableInfo(self_model.getTableName());


  // manyToMany
  const m2m_as_name = `*${other_as_name}`;
  const options = {
    through   : {
      model,
      unique: false,
    },
    as        : m2m_as_name,
    foreignKey: `@${self_field_name}`,
    otherKey  : `@${other_field_name}`,
  };
  if (self_handler_options) {
    if (self_handler_options[0])
      options.onUpdate = _getHandleOptionFromChar(self_handler_options[0]);
    if (self_handler_options[1])
      options.onDelete = _getHandleOptionFromChar(self_handler_options[1]);
  }
  self_model.belongsToMany(
    other_model,
    options,
  );
  

  table_info.associationname_model_map[m2m_as_name] = other_model;
  _assignInternalExternalField(self_model.getTableName(), m2m_as_name, m2m_as_name);
}

function _makeTailS (as_name) {
  if (as_name.length <= 0)
    return ''

  if (as_name.length >= 2) {
    const last_2 = as_name.substr(as_name.length - 2);
    switch (last_2) {
      case 'ch':
      case 'sh':
        return as_name + 'es';
      case 'is':
        return as_name.sub(0, as_name.length - 2) + 'es';
    }
  }

  const last = as_name[as_name.length - 1];
  switch (last) {
    case 's':
    case 'x':
    case 'z':
      return as_name + 'es';
    case 'y': return as_name.substr(0, as_name.length - 1) + 'ies';
    default: return as_name + 's';
  }
}

function _linkAssociation (model, target_models, key, obj) {
  const tablename_model_map = {};
  target_models.forEach((m)=>tablename_model_map[m.getTableName()]=m);

  const full_str = key.substr(1) + _getOptionStrFromComment(obj.comment);
  let [head, middle, tail] = full_str.split('.');

  // head
  let [field_name, as_name] = head.split(':');
  if (!field_name)
    throw `link error: no field-name of '${model.getTableName()}.${key}'`;
  if (!as_name) {
    if (field_name.endsWith('_id'))
      as_name = field_name.substring(0, field_name.length - 3);
    else
      throw `link error: no as-name of '${model.getTableName()}.${key}'`;
  }
  
  // middle
  const [target_table_name, target_key, has_many_name] = middle.split(':');
  if (!target_table_name)
    throw `link error: no target-table-name of '${model.getTableName()}.${key}'`;
  const target_model = tablename_model_map[target_table_name];
  if (!target_model)
    throw `link error: no target-model for '${target_table_name}' in target_models on '${model.getTableName()}.${key}'`;

  // tail
  const handler_options = tail;

  
  const table_info = _getOrCreateTableInfo(model.getTableName());

  
  // belongsTo
  const belongsto_as_name = `*${as_name}`;
  const options = {
    foreignKey: key,
    targetKey: target_key || 'id',
    as: belongsto_as_name,
  };
  if (handler_options) {
    if (handler_options[0])
      options.onUpdate = _getHandleOptionFromChar(handler_options[0]);
    if (handler_options[1])
      options.onDelete = _getHandleOptionFromChar(handler_options[1]);
  }
  model.belongsTo(
    target_model,
    options,
  );
  table_info.associationname_model_map[belongsto_as_name] = target_model;
  _assignInternalExternalField(model.getTableName(), belongsto_as_name, belongsto_as_name);


  // hasMany
  if (has_many_name) {
    const hasmany_as_name = `*${has_many_name}`;
    target_model.hasMany(model, {foreignKey: key, as: hasmany_as_name});
    const target_table_info = _getOrCreateTableInfo(target_model.getTableName());
    target_table_info.associationname_model_map[hasmany_as_name] = model;
    _assignInternalExternalField(target_model.getTableName(), hasmany_as_name, hasmany_as_name);
  }
  
  
  _assignInternalExternalField(model.getTableName(), key, `@${field_name}`);

  return {
    as_name: belongsto_as_name,
  };
}

function _linkHiddenField (model, model_map, key, obj, cmt_line_idx=0, additinal_keys=[]) {
  
  const full_str = key + _getOptionStrFromComment(obj.comment, cmt_line_idx);
  let [head, tail] = full_str.split('.');

  // head
  const field_name = head;
  if (!field_name)
    throw `link error: no field-name of '${model.getTableName()}.${key}'`;
  
  // tail
  if (tail) {
    const permissions = tail.split(':');
    const info = _getOrCreateTableInfo(model.getTableName());
    info.internalfield_permissions_map[key] = permissions;
    additinal_keys.forEach((k)=>info.internalfield_permissions_map[k] = permissions);
  }

  _assignInternalExternalField(model.getTableName(), key, field_name);
  additinal_keys.forEach((k)=>_assignInternalExternalField(model.getTableName(), k, k));
}

function _linkOthers (model, model_map, key, obj) {
  _assignInternalExternalField(model.getTableName(), key, key);
}

function _getHandleOptionFromChar (option_chr) {
  switch (option_chr) {
    case 'R': return 'RESTRICT';
    case 'C': return 'CASCADE';
    case 'X': return 'NO ACTION';
    case 'D': return 'SET DEFAULT';
    case 'N': return 'SET NULL';
  }
}

function _assignInternalExternalField (table_name, internal, external) {
  const info = _getOrCreateTableInfo(table_name);
  info.internalfield_externalfield_map[internal] = external;
  info.externalfield_internalfield_map[external] = internal;
}

function _getOrCreateTableInfo (table_name) {
  if (!tablename_info_map_[table_name]) {
    tablename_info_map_[table_name] = {
      internalfield_externalfield_map: {},
      externalfield_internalfield_map: {},
      internalfield_permissions_map  : {},
      associationname_model_map      : {},
    };
  }

  return tablename_info_map_[table_name];
}

function _getOptionStrFromComment (comment, line_idx=0) {
  const cmt = comment.split('\n')[line_idx];
  if (!cmt || cmt[0] !== '&')
    return '';
  
  const result = cmt.substr(1);
  if (result[0] !== '.')
    return '.' + result;
  return result;
}
