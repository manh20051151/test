const mongoose = require("mongoose");

const requestAddFriendsSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reciverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: Number,
    }
  },
  { timestamps: true }
);

const RequestAddFriends = mongoose.model("RequestAddFriends", requestAddFriendsSchema);
module.exports = RequestAddFriends;
