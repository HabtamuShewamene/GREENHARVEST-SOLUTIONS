const express = require("express");
const errorMiddleware = require("../../src/middleware/errorMiddleware");

const createRouteApp = (basePath, router) => {
  const app = express();
  app.use(express.json());
  app.use(basePath, router);
  app.use(errorMiddleware);
  return app;
};

module.exports = {
  createRouteApp,
};
