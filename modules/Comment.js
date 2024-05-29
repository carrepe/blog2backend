const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const CommentSchema = new Schema(
  {
    postId: String,
    content: String,
    author: String,
  },
  {
    timestamps: true, //createdAt, updatedAt 자동생성
    //collection:'Comments', // collection명 직접 설정
  }
  // { versionKey: false }  __v 사용하지 않을때
);

const CommentModel = model('Comment', CommentSchema);
module.exports = CommentModel;
