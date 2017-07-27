'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

const debuglog = require('util').debuglog('db');

let sequelize;

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: i => debuglog(i)
  });
} else {
  console.error('Please provide PostgreSQL database URL in the environment variable `DATABASE_URL`\n');
  process.exit(1);
}

const db = {};

fs
  .readdirSync(__dirname)
  .filter(function (file) {
    return (file.indexOf('.') !== 0) && (file !== 'index.js');
  })
  .forEach(function (file) {
    const model = sequelize.import(path.join(__dirname, file));
    db[model.name] = model;
  });

Object.keys(db).forEach(function (modelName) {
  if ('associate' in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
