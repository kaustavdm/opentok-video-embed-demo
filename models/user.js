'use strict';

const crypto = require('crypto');

const generateSalt = function () {
  return crypto.randomBytes(Math.ceil(32 / 2))
    .toString('hex')
    .slice(0, 32);
};

const sha512 = function (input, salt) {
  var hash = crypto.createHmac('sha512', salt);
  hash.update(input);
  return hash.digest('hex');
};

module.exports = function (sequelize, DataTypes) {
  var User = sequelize.define('User', {
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      set (val) {
        const salt = generateSalt();
        const hashed = sha512(val, salt);
        this.setDataValue('password', hashed);
        this.setDataValue('salt', salt);
      }
    },
    salt: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('Doctor', 'Patient'),
      defaultValue: 'Doctor',
      allowNull: false
    }
  });

  User.associate = function (models) {
    User.hasOne(models.Doctor);
    User.hasOne(models.Patient);
  }

  User.prototype.checkPassword = function (input) {
    return this.getDataValue('password') === sha512(input, this.getDataValue('salt'));
  };

  User.prototype.toJSON = function () {
    var values = Object.assign({}, this.get());

    delete values.password;
    delete values.hash;
    return values;
  };

  return User;
};
