const fs        = require('fs');
const node_path = require('path');
const Sequelize = require('sequelize');

const config = require('../config');


module.exports = {
  makeCrudApiDoc,
  makeApiDoc, 
};



function makeCrudApiDoc(
  path,
  Table,
  permission_create,
  permission_read,
  permission_update,
  permission_delete,
  preSave=(doc)=>{},
) {
  if (!config.api_doc_root_path)
    return;


  if (permission_create !== null) {
    const doc = {
      request: {
        params: (()=>{
          const item = { comment: '' };
          Object.keys(Table.rawAttributes)
            .filter((att)=>!Table.rawAttributes[att].autoIncrement)
            .forEach((att)=>item[att]=_makeTableAttributeParamObj(Table, att, 'write', Table.rawAttributes[att].allowNull));
          return item;
        })(),
      },
      response: _makeCrudResponseObj({
        comment: `contains created ${Table.getTableName()} row`,
        items: [
          (()=>{
            const item = { comment: Table.getTableName() };
            Object.keys(Table.rawAttributes).forEach((att)=>item[att]=_makeTableAttributeParamObj(Table, att, 'read'));
            return item;
          })(),
        ],
      }),
    };
    makeApiDoc(path, 'post', permission_create, doc, preSave);
  }

  if (permission_read !== null) {
    const doc = {
      request: {
        options: (()=>{
          const item = { comment: '' };
          Object.keys(Table.rawAttributes)
            .forEach((att)=>item[att]=_makeTableAttributeParamObj(Table, att, 'read', true));
          return item;
        })(),
      },
      response: _makeCrudResponseObj({
        comment: `contains created ${Table.getTableName()} row`,
        items: [
          (()=>{
            const item = { comment: Table.getTableName() };
            Object.keys(Table.rawAttributes).forEach((att)=>item[att]=_makeTableAttributeParamObj(Table, att, 'read'));
            return item;
          })(),
        ],
      }),
    };
    makeApiDoc(path, 'get', permission_read, doc, preSave);
    makeApiDoc(path+'%id', 'get', permission_read, doc, preSave);
  }

  if (permission_update !== null) {
    const doc = {
      request: {
        params: (()=>{
          const item = { comment: '' };
          Object.keys(Table.rawAttributes)
            .filter((att)=>!Table.rawAttributes[att].autoIncrement)
            .forEach((att)=>item[att]=_makeTableAttributeParamObj(Table, att, 'write', true));
          return item;
        })(),
        options: (()=>{
          const item = { comment: '' };
          Object.keys(Table.rawAttributes)
            .forEach((att)=>item[att]=_makeTableAttributeParamObj(Table, att, 'read', true));
          return item;
        })(),
      },
      response: _makeCrudResponseObj({
        comment: '',
        items: [
          {
            comment: 'updated count',
            value: 'INTEGER',
          },
        ],
      }),
    };
    makeApiDoc(path+'%id', 'put', permission_update, doc, preSave);
  }

  if (permission_delete !== null) {
    const doc = {
      request: {
        options: (()=>{
          const item = { comment: '' };
          Object.keys(Table.rawAttributes)
            .forEach((att)=>item[att]=_makeTableAttributeParamObj(Table, att, 'read', true));
          return item;
        })(),
      },
      response: _makeCrudResponseObj({
        comment: '',
        items: [
          {
            comment: 'deleted count',
            value: 'INTEGER',
          },
        ],
      }),
    };
    makeApiDoc(path+'%id', 'delete', permission_delete, doc, preSave);
  }
}


/*
 *{
 *  path: '/admins/<id>',
 *  method: 'get',
 *  request: {  // obj format
 *    foo: {    // param format
 *      comment: 'first param for example',  // example
 *      value: 'STRING(10)',                 // example
 *    },
 *    bar: {    // param format
 *      comment: 'second param is object, for example',  // example
 *      value: {
 *        some_type: {~},    // param format
 *        fruits: [  // param can be array
 *          {  // obj format
 *            comment: 'this is item object, for example',
 *            name: {~},  // param format
 *            taste: {~}, // param format
 *            ...
 *          },
 *          ...
 *        ],
 *      },
 *    },
 *  },
 *  response: {
 *    200: {  // obj format
 *      message: {},  // param format
 *      ...
 *    },
 *    400: {  // obj format
 *      message: {},  // param format
 *      ...
 *    },
 *    default: {  // obj format
 *      message: {},  // param format
 *      ...
 *    },
 *  },
 *}
 */
function makeApiDoc (path, method, permission, doc, preSave=(doc)=>{}) {
  if (!config.api_doc_root_path)
    return;


  // make doc
  const [path_head, ...path_params] = path.split('%');
  doc.path       = path_head +
      ((path_params && path_params.length <= 0)? '': '/'+path_params.map((p)=>`<${p}>`).join('/'));
  doc.method     = method;
  doc.permission = permission;

  preSave(doc);


  // save to file
  const filepath = `${config.api_doc_root_path}${path}/${method}.json`;
  fs.mkdirSync(node_path.dirname(filepath), {recursive: true});
  fs.writeFileSync(filepath, JSON.stringify(doc, null, 2));
}


function _makeCrudResponseObj (items) {
  return {
    200: {
      message: {
        comment: 'message. normally, "ok".',
        value: 'TEXT',
      },
      items,
    },
    default: {
      message: {
        comment: 'error message.',
        value: 'TEXT',
      },
    },
  };
};

function _makeTableAttributeParamObj (Table, att_name, hidden_permission, is_optional=undefined) {
  const att = Table.rawAttributes[att_name];

  // make comment
  let comment = '';
  if (att.comment) {
    comment = att.comment.split('\n').filter((c)=>c[0]!=='&').join('\n');

    if (att.allowNull)
      comment += '\nallowNull: true';
    if (att.references)
      comment += '\n' + `FK: ${att.references.model}.${att.references.key}`;

    // hidden field permissions
    const opt_lines = att.comment.split('\n').filter((c)=>c[0]==='&');
    if (att_name[0] === '@' && att_name[1] === '#')
      comment += '\npermission: ' + opt_lines[1].substr(1).split(':').map((p)=>`${p}/${hidden_permission}`).join(', ');
    else if (att_name[0] === '#')
      comment += '\npermission: ' + opt_lines[0].substr(1).split(':').map((p)=>`${p}/${hidden_permission}`).join(', ');
  }

  return {
    comment,
    value:
        (att.type.key === 'STRING')? `STRING(${att.type.options.length})`:
        (att.type instanceof Sequelize.ENUM    )? `ENUM(${att.type.values.join(', ')})`:
        att.type.key,
    is_optional,
  };
}
