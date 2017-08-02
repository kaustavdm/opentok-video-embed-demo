'use strict';

module.exports = function (sequelize, DataTypes) {
  var Doctor = sequelize.define('Doctor', {
    name: {
      type: DataTypes.STRING
    }
  });

  Doctor.associate = function (models) {
    Doctor.User = Doctor.belongsTo(models.User);
    Doctor.Meetings = Doctor.hasMany(models.Meeting);
  };

  return Doctor;
};
