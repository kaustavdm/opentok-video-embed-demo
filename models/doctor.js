'use strict';

module.exports = function (sequelize, DataTypes) {
  var Doctor = sequelize.define('Doctor', {
    name: {
      type: DataTypes.STRING
    }
  });

  Doctor.associate = function (models) {
    Doctor.User = Doctor.belongsTo(models.User);
    Doctor.Patients = Doctor.belongsToMany(models.Patient, { through: 'DoctorPatient' });
    Doctor.Meetings = Doctor.hasMany(models.Meeting);
  };

  return Doctor;
};
