const create = require('./create');
// const read = require('./read');
const update = require('./update');
const remove = require('./remove');
const renewMou = require('./renewMou');
const reallocatePartner = require('./reallocatePartner');
// const search = require('./search');
// const filter = require('./filter');
// const summary = require('./summary');
// const listAll = require('./listAll');
const paginatedList = require('./paginatedList');

module.exports = {
  create,
  // read,
  update,
  delete: remove,
  renewMou,
  reallocatePartner,
  // search,
  // filter,
  // summary,
  // listAll,
  list: paginatedList,
};