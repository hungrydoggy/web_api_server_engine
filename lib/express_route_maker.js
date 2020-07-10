const api_util   = require('./utils/api_util');
const route_util = require('./utils/route_util');


let template_options_ = {};

module.exports = {
  makeCrud (
    app,
    path,
    Table,
    permission_create,    // 'undefined' for public.  'null' for unavailable.
    permission_read,      // 'undefined' for public.  'null' for unavailable.
    permission_update,    // 'undefined' for public.  'null' for unavailable.
    permission_delete,    // 'undefined' for public.  'null' for unavailable.
    option_map  = {}, // see api_util.makeCrud()
    unique_keys = [],
  ) {

    const crud = api_util.makeCrud(
      Table,
      permission_create,
      permission_read,
      permission_update,
      permission_delete,
      option_map,
      unique_keys,
      options_create = template_options_,
      options_read   = template_options_,
      options_update = template_options_,
      options_delete = template_options_,
    );

    const __wrapper = (func) => {
      return async (req, res) => {
        console.log(`[${req.method}] ${req.path}`);
        const event = makeEvent(req, res);
        const r = await func(event);
        res.status(r.statusCode).send(JSON.stringify(r.body));
      };
    };

    app.post  (`${path}`    , __wrapper(crud.post   ));
    app.get   (`${path}/:id`, __wrapper(crud.getById));
    app.get   (`${path}`    , __wrapper(crud.get    ));
    app.put   (`${path}/:id`, __wrapper(crud.put    ));
    app.delete(`${path}/:id`, __wrapper(crud.del    ));
  },

  template,

  makeEvent,

  setTemplateOptions: (options) => template_options_ = options, // see wse/route_util.template
};


function template (
  permission,    // see wse/route_util.template
  func,          // see wse/route_util.template
) {
  return async (req, res) => {
    console.log(`[${req.method}] ${req.path}`);
    const event = makeEvent(req, res);
    const r = await route_util.template(event, permission, func, template_options_);
    res.status(r.statusCode).set(r.headers).send((typeof r.body === 'string')? r.body: JSON.stringify(r.body));
  };
}

function makeEvent (req, res) {
  return {
    method: req.method,
    token : req.headers['x-api-key'],
    params: req.params,
    query : req.query,
    body  : req.body,
    req,
    res,
  };
}
