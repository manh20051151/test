const mongoose = require("mongoose");

const listFriendSchema = new mongoose.Schema(
	{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          friendList: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
			},
		],
	},
	{ timestamps: true }
);

const ListFriend = mongoose.model("ListFriend", listFriendSchema);

module.exports = ListFriend;
