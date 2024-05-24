const RequestAddFriends = require("../models/requestAddFriends")
const User = require('../models/user')
const ListFriend = require('../models/listFriend')
const { getReceiverSocketId, io } = require("../socket/socket");

const createRequestAddFriends = async (req, res) => {
    try {
        const { id: reciverId } = req.params;
        const senderId = req.user._id;
        //create new request
        const newRequestAddFriend = new RequestAddFriends({
            senderId,
            reciverId,
            status: 0,
        });
        console.log(req.body)
        //save user and respond
        const requestAddFriend = await newRequestAddFriend.save();
        res.status(200).json(requestAddFriend);
    } catch (err) {
        console.log(err)
        res.status(500).json(err)
    }
};
const getRequestAddFriends = async (req, res) => {
    try {
        // const { id: reciverid } = req.params;
        const senderId = req.user._id;
        const requestAddFriend = await RequestAddFriends.find({ $and: [{ reciverId: senderId }, { status: 0 }] });
        // console.log(user)
        // console.log(requestAddFriend)
        if (requestAddFriend) {
            return res.status(200).json(requestAddFriend);
        }
        return res.status(400).json("invail request");
    } catch (err) {
        return res.status(500).json("server error !");
    }
};
const getListFriends = async (req, res) => {
    try {
        const { _id } = req.user;
        const friend = await ListFriend.findOne({ userId: _id });
        // console.log(user)
        // console.log(requestAddFriend)
        if (friend) {
            return res.status(200).json(friend);
        }
        return res.status(400).json("invail request");
    } catch (err) {
        return res.status(500).json("server error !");
    }
};
const getRequestAddFriendsMe = async (req, res) => {
    try {
        // const { id: reciverid } = req.params;
        const senderid = req.user._id;
        const requestAddFriend = await RequestAddFriends.find({ $and: [{ senderId: senderid }, { status: 0 }] });
        // console.log(user)
        // console.log(requestAddFriend)
        if (requestAddFriend) {
            return res.status(200).json(requestAddFriend);
        }
        return res.status(400).json("invail request");
    } catch (err) {
        return res.status(500).json("server error !");
    }
};
const updateFriendRequest = async (req, res) => {
    try {
        const { id: a } = req.params; // Nhận senderId từ tham số đường dẫn
        const b = req.user._id; // Lấy receiverId từ user đang đăng nhập

        // Kiểm tra nếu senderId bằng a và receiverId bằng b, cập nhật trạng thái thành 1
        const requestAddFriend = await RequestAddFriends.findOneAndUpdate(
            { senderId: a, reciverId: b },
            { status: 1 }, // Đơn giản hóa cú pháp nếu chỉ cần cập nhật một trường
            { new: true }
        );

        if (requestAddFriend) {
            return res.status(200).json({
                success: requestAddFriend ? true : false,
                requestAddFriend
            })
        }

        return res.status(404).json("Request not found");
    } catch (err) {
        console.error("Error accepting friend request:", err);
        return res.status(500).json("Server error");
    }
};
const updateFriendRequestCancel = async (req, res) => {
    try {
        const { id: a } = req.params; // Nhận senderId từ tham số đường dẫn
        const b = req.user._id; // Lấy receiverId từ user đang đăng nhập

        // Kiểm tra nếu senderId bằng a và receiverId bằng b, cập nhật trạng thái thành 1
        const requestAddFriend = await RequestAddFriends.findOneAndUpdate(
            { senderId: b, reciverId: a },
            { status: 1 }, 
            { new: true }
        );

        if (requestAddFriend) {
            return res.status(200).json({
                success: requestAddFriend ? true : false,
                requestAddFriend
            })
        }

        return res.status(404).json("Request not found");
    } catch (err) {
        console.error("Error accepting friend request:", err);
        return res.status(500).json("Server error");
    }
};
const updateListFriend = async (req, res) => {
    const { _id } = req.user;
    const { id: reciverId } = req.params;
  
    try {
      // Tìm user theo _id
      const user = await User.findById(_id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
  
      // Kiểm tra nếu friendId đã tồn tại trong friendList của user thì không thêm lại
      if (!user.friendList.includes(reciverId)) {
        // Thêm friendId mới vào friendList
        user.friendList.push(reciverId);
      }
  
      // Lưu thay đổi vào database
      await user.save();
  
      return res.status(200).json({ success: true, message: 'Friend added successfully' });
    } catch (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  };

  const deleteFriend = async (req, res) => {
    const { _id } = req.user;
    const { id: reciverId } = req.params;
  
    try {
      // Tìm user theo _id
      const friend = await ListFriend.findOne({ userId: _id });
      
  
      if (!friend) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
  
      // Kiểm tra nếu friendId đã tồn tại trong friendList của user thì xóa nó đi
      const index = friend.friendList.indexOf(reciverId);
      if (index !== -1) {
        friend.friendList.splice(index, 1);
      }
  
      // Lưu thay đổi vào database
      const receiverSocketId = getReceiverSocketId(reciverId.toString());

      await friend.save();
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("SocketdeleteFriend");
      }
  
      return res.status(200).json({ success: true, message: 'Friend removed successfully' });
    } catch (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  
  };
  const deleteFriendFr = async (req, res) => {
    const { _id } = req.user;
    const { id: reciverId } = req.params;
  
    try {
      // Tìm user theo _id
      const friend = await ListFriend.findOne({ userId: reciverId });
  
      if (!friend) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
  
      // Kiểm tra nếu friendId đã tồn tại trong friendList của user thì xóa nó đi
      const index = friend.friendList.indexOf(_id);
      if (index !== -1) {
        friend.friendList.splice(index, 1);
      }
      const receiverSocketId = getReceiverSocketId(reciverId.toString());
  
      // Lưu thay đổi vào database
      await friend.save();
  

      if (receiverSocketId) {
        io.to(receiverSocketId).emit("SocketdeleteFriendFr");
      }

      return res.status(200).json({ success: true, message: 'Friend removed successfully' });
    } catch (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  };


  const updateListFriendNew = async (req, res) => {
    const { _id } = req.user;
    const { id: reciverId } = req.params;
    

    try {
      // Tìm user theo _id
      //const user = await ListFriend.findById(_id);
      const friend = await ListFriend.findOne({ userId: _id });

      if (!friend) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
  
      // Kiểm tra nếu friendId đã tồn tại trong friendList của user thì không thêm lại
      if (!friend.friendList.includes(reciverId)) {
        // Thêm friendId mới vào friendList
        friend.friendList.push(reciverId);
      }

  
      // Lưu thay đổi vào database
      await friend.save();
  
      const receiverSocketId = getReceiverSocketId(reciverId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("SocketupdateListFriendNew");
      }
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("SocketupdateListFriendNew");
      }

      return res.status(200).json({ success: true, message: 'Friend added successfully' });
    } catch (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  };
  const updateListFriendNewFr = async (req, res) => {
    const { _id } = req.user;
    const { id: reciverId } = req.params;
  
    try {
      // Tìm user theo _id
      //const user = await ListFriend.findById(_id);
      const friend = await ListFriend.findOne({ userId: reciverId });

      if (!friend) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
  
      // Kiểm tra nếu friendId đã tồn tại trong friendList của user thì không thêm lại
      if (!friend.friendList.includes(_id)) {
        // Thêm friendId mới vào friendList
        friend.friendList.push(_id);
      }
  
      // Lưu thay đổi vào database
      await friend.save();
  
      return res.status(200).json({ success: true, message: 'Friend added successfully' });
    } catch (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  };
  const deleteFriendRequest = async (req, res) => {
    try {
        const { id: a } = req.params; // Nhận senderId từ tham số đường dẫn
        const b = req.user._id; // Lấy receiverId từ user đang đăng nhập

        // Kiểm tra nếu senderId bằng a và receiverId bằng b, xóa yêu cầu kết bạn
        const deletedRequest = await RequestAddFriends.deleteOne(
            { senderId: a, reciverId: b }
        );

        if (deletedRequest.deletedCount > 0) {
            return res.status(200).json({
                success: true,
                message: "Friend request deleted successfully"
            });
        }

        return res.status(404).json("Request not found");
    } catch (err) {
        console.error("Error deleting friend request:", err);
        return res.status(500).json("Server error");
    }
};

const deleteFriendRequestCancel = async (req, res) => {
    try {
        const { id: a } = req.params; // Nhận senderId từ tham số đường dẫn
        const b = req.user._id; // Lấy receiverId từ user đang đăng nhập

        // Kiểm tra nếu senderId bằng a và receiverId bằng b, xóa yêu cầu kết bạn
        const deletedRequest = await RequestAddFriends.deleteOne(
            { senderId: b, reciverId: a }
        );

        if (deletedRequest.deletedCount > 0) {
            return res.status(200).json({
                success: true,
                message: "Friend request deleted successfully"
            });
        }

        return res.status(404).json("Request not found");
    } catch (err) {
        console.error("Error deleting friend request:", err);
        return res.status(500).json("Server error");
    }
};
module.exports = {
    createRequestAddFriends,
    getRequestAddFriends,
    updateFriendRequest,
    updateListFriend,
    getRequestAddFriendsMe,
    updateFriendRequestCancel,
    deleteFriendRequest,
    deleteFriendRequestCancel,
    updateListFriendNew,
    getListFriends,
    updateListFriendNewFr,
    deleteFriend,
    deleteFriendFr
};