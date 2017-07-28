'use strict';

module.exports = function (sequelize, DataTypes) {
  var Doctor = sequelize.define('Appdata', {
    key: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  });

  return Doctor;
};
