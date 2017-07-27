'use strict';
module.exports = function (sequelize, DataTypes) {
  var Meeting = sequelize.define('Meeting', {
    start_time: DataTypes.DATE,
    end_time: DataTypes.DATE
  });

  Meeting.associate = function (models) {
    Meeting.belongsTo(models.Doctor);
    Meeting.belongsTo(models.Patient);
  };

  return Meeting;
};
