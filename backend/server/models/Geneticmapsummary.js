var mongoose = require('mongoose');

module.exports = new mongoose.Schema(
  {
    name: String,
    chromosomes: [
      {
        _id: false,
        name: String,
        markers: Number
      }
    ]
  }, {
    versionKey: false
  }
);
