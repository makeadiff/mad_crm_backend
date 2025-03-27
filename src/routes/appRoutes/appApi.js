const express = require('express');
const { catchErrors } = require('@/handlers/errorHandlers');
const router = express.Router();

const { routesList } = require('@/models/utils');

const routerApp = (entity, controllerName) => {
  // Import the controller dynamically
  const controller = require(`@/controllers/appControllers/${controllerName}`);

  // Define routes only if the corresponding controller method exists
  if (controller.create) {
    router.route(`/${entity}/create`).post(catchErrors(controller.create));
  }
  if (controller.read) router.route(`/${entity}/read/:id`).get(catchErrors(controller.read));
  if (controller.update)
    router.route(`/${entity}/update/:id`).patch(catchErrors(controller.update));
  if (controller.delete)
    router.route(`/${entity}/delete/:id`).delete(catchErrors(controller.delete));
  if (controller.search) router.route(`/${entity}/search`).get(catchErrors(controller.search));
  if (controller.list) router.route(`/${entity}/list`).get(catchErrors(controller.list));
  if (controller.listAll) router.route(`/${entity}/listAll`).get(catchErrors(controller.listAll));
  if (controller.filter) router.route(`/${entity}/filter`).get(catchErrors(controller.filter));
  if (controller.summary) router.route(`/${entity}/summary`).get(catchErrors(controller.summary));

  if (entity === 'invoice' || entity === 'quote' || entity === 'payment') {
    router.route(`/${entity}/mail`).post(catchErrors(controller['mail']));
  }

  if (entity === 'quote') {
    router.route(`/${entity}/convert/:id`).get(catchErrors(controller['convert']));
  }
};

routesList.forEach(({ entity, controllerName }) => {
  // console.log(`Registering routes for ${entity} using ${controllerName}`);
  routerApp(entity, controllerName);
});

module.exports = router;
