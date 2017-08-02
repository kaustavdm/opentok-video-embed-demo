'use strict';

module.exports = function (sequelize, DataTypes) {
  var Patient = sequelize.define('Patient', {
    name: {
      type: DataTypes.STRING
    }
  });

  Patient.associate = function (models) {
    Patient.User = Patient.belongsTo(models.User);
    Patient.Meetings = Patient.hasMany(models.Meeting);
  };

  return Patient;
};
