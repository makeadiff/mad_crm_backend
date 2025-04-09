// const mongoose = require('mongoose');
// const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');

// const summary = require('./summary');

// function modelController() {
//   const Model = mongoose.model('Lead');
//   const methods =   ('Lead');

//   methods.summary = (req, res) => summary(Model, req, res);
//   return methods;
// }

// module.exports = modelController();


const create = require('./create');
// const read = require('./read');
const update = require('./update');
const remove = require('./remove');
// const search = require('./search');
// const filter = require('./filter');
// const summary = require('./summary');
const listAllPartners = require('./listAll');
const paginatedList = require('./paginatedList');

module.exports = {
  create,
  // read,
  update,
  delete: remove,
  // search,
  // filter,
  // summary,
  listAll : listAllPartners,
  list: paginatedList,
};

