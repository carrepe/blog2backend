//mongoose SchemaType
//https://mongoosejs.com/docs/schematypes.html

const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    // 추가
    email: { type: String, required: false },
    profile: { type: String, required: false },
  },
  { timestamps: true }
);

const UserModal = model('User', UserSchema);
module.exports = UserModal;
