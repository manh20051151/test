const Group = require("../models/group");
const Message = require("../models/messsage");
const { getReceiverSocketId, io } = require("../socket/socket");
const asyncHandler = require("express-async-handler");


const AWS = require("aws-sdk");
require("dotenv").config();

process.env.AWS_SDK_JS_SUPPERSS_MAINTENANCE_MODE_MESSAGE = "1";

AWS.config.update({
  region: process.env.REGION,
  accessKeyId: process.env.ACCESS_KEY_ID,
  secretAccessKey: process.env.SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();
const bucketName = process.env.S3_BUCKET_NAME;



const createGroup = asyncHandler(async (req, res) => {
  const { nameGroup } = req.body;
  const { userId } = req.body;

  if (!nameGroup) {
    return res.status(400).json({
      success: false,
      mes: "Missing inputs",
    });
  }
  //let group = await Group.findOne({ nameGroup });
  // if (group) {
  //   throw new Error("Group has existed!");
  // } else {

    // Tạo một nhóm mới
    const group = new Group({
      nameGroup,
      participants: [userId],
      leader: [userId],
      messages: [],
    });
    await group.save();
    // Lưu nhóm vào cơ sở dữ liệu
    return res.status(201).json({
      success: true,
      mes: "Group created successfully",
      data: group,
    });
  //}
});


const getGroups = asyncHandler(async (req, res)=>{
    const response = await Group.find()
    return res.status(200).json({
        success: response ? true : false,
        groups: response
    })
})


const sendMessageGr = async (req, res) => {
    try {
      const { message } = req.body;
      const { id: groupId } = req.params;
      const senderId = req.user._id;
  
      // Tìm nhóm dựa trên ID của nhóm
      const group = await Group.findById(groupId);
  
      if (!group) {
        return res.status(404).json({ error: "Nhóm không tồn tại" });
      }
    //   console.log("group:", group);
      // Tạo một tin nhắn mới
      const newMessage = new Message({
        senderId,
        groupId,
        message,
      });
  
      // Lưu tin nhắn mới vào cơ sở dữ liệu
      await newMessage.save();
  

      // Thêm ID của tin nhắn vào mảng tin nhắn của nhóm
      group.messages.push(newMessage._id);
      await group.save();
  
      // Gửi tin nhắn mới qua socket đến tất cả các thành viên của nhóm
    //   io.to(groupId).emit("newMessage", newMessage);
  
    const participants = group.participants;
    
    participants.forEach(async (participantId) => {
        console.log("participantId: ", participantId);
        const receiverSocketId = getReceiverSocketId(participantId.toString()); // Chuyển đổi participantId sang chuỗi trước khi sử dụng
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }
    });

      res.status(201).json(newMessage);
    } catch (error) {
      console.log("Lỗi trong sendMessage của controller nhóm: ", error.message);
      res.status(500).json({ error: "Lỗi máy chủ nội bộ" });
    }
  };

  const getMessageGr = async (req, res) => {
    try {
      const { id: groupId } = req.params;
      const senderId = req.user._id;
  
      const group = await Group.findById(groupId).populate("messages");
  
      if (!group) return res.status(404).json({ error: "Group not found" });
  
      // Kiểm tra xem người gửi có phải là thành viên của nhóm hay không
      if (!group.participants.includes(senderId)) {
        return res.status(403).json({ error: "You are not a member of this group" });
      }
  
      const messages = group.messages;
    //   console.log("messages", messages);
  
      res.status(200).json(messages);
    } catch (error) {
      console.log("Error in getMessageGr controller: ", error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  const sendMessageImageGr = async (req, res) => {
    try {
      const { message } = req.body;
      const { id: groupId } = req.params;
      const senderId = req.user._id;
  
        console.log("groupId :", groupId);

      const ne = req.file;
      const image = req.file?.originalname.split(".");
      const fileType = image[image.length - 1];
      const filePath = `${Date.now().toString()}.${fileType}`;
  
      const paramsS3 = {
        Bucket: bucketName,
        Key: filePath,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };
  
      s3.upload(paramsS3, async (err, data) => {
        if (err) {
          console.log("error: ", err);
          return res.send("err");
        } else {
          const imageURL = data.Location;
  
          let group = await Group.findById(groupId);
          if (!group) {
            return res.status(404).json({ error: "Group not found" });
          }
  
          const newMessage = new Message({
            senderId,
            groupId,
            image: imageURL,
          });
  
          if (newMessage) {
            group.messages.push(newMessage._id);
          }
  
          await Promise.all([group.save(), newMessage.save()]);
  
          // Emit new message to all participants in the group
          group.participants.forEach(async (participantId) => {
            const receiverSocketId = getReceiverSocketId(participantId.toString());
            if (receiverSocketId) {
              io.to(receiverSocketId).emit("newMessage", newMessage);
            }
          });
  
          res.status(201).json(newMessage);
        }
      });
    } catch (error) {
      console.log("Error in sendMessageImage controller: ", error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  const deleteMessageGr = async (req, res) => {
    try {
      const { id: messageid } = req.params; // Lấy id của tin nhắn cần xóa từ params
      const senderid = req.user._id;
  
    //   console.log(messageId);
    //   console.log(senderId);
      // Tìm nhóm mà tin nhắn thuộc về
      const group = await Group.findOne({
        participants: senderid, // Đảm bảo người gửi tin nhắn là một trong các thành viên của nhóm
        messages: messageid,  // Chỉ lấy nhóm có chứa messageId
      });
      console.log(group);
      if (!group) {
        return res.status(404).json({
          error: "Group not found or you are not authorized to delete this message",
        });
      }
  
      // Xóa tin nhắn từ mảng messages của nhóm
      group.messages.pull(messageid);
      await group.save();
  
      // Xóa tin nhắn từ cơ sở dữ liệu
      await Message.findByIdAndDelete(messageid);

      // Emit new message to all participants in the group
      group.participants.forEach(async (participantId) => {
        const receiverSocketId = getReceiverSocketId(participantId.toString());
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("messageDeleted", messageid);
        }
      });
  
      // // Lấy danh sách người tham gia nhóm (participants)
      // const participants = group.participants.map(participant => participant.toString());
  
      // // Gửi sự kiện "messageDeleted" đến tất cả người tham gia nhóm, trừ người gửi tin nhắn
      // participants.forEach(async (participantId) => {
      //   if (participantId !== senderid) {
      //     const receiverSocketId = getReceiverSocketId(participantId);
      //     if (receiverSocketId) {
      //       io.to(receiverSocketId).emit("messageDeleted", messageid);
      //     }
      //   }
      // });
  
      res.status(200).json({ message: "Message deleted successfully" });
    } catch (error) {
      console.log("Error in deleteMessage controller: ", error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  const getGroup = asyncHandler(async (req, res)=>{
    const { id } = req.params;
    const response = await Group.findOne({ _id:  id})
    return res.status(200).json({
        success: response ? true : false,
        group: response
    })
})

const updateMember = asyncHandler(async (req, res)=>{
  const { id } = req.params;
  const { memberId } = req.body;
  console.log("memberId", memberId);
  const group = await Group.findOne({ _id:  id})
  // Kiểm tra xem memberId đã có trong mảng participants chưa
  if (!group.participants.includes(memberId)) {
    // Thêm memberId vào mảng participants
    group.participants.push(memberId);
    await group.save();

    const groupSK = await Group.findOne({ _id:  id})
    groupSK.participants.forEach(async (participantId) => {
      const receiverSocketId = getReceiverSocketId(participantId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("SocketUpdateMember");
      }
    });
  }
  return res.status(200).json({
      success: true ,
  })
})

const updateDeputy = asyncHandler(async (req, res)=>{
  const { id } = req.params;
  const { memberId } = req.body;
  console.log("memberId", memberId);
  const group = await Group.findOne({ _id:  id})
  // Kiểm tra xem memberId đã có trong mảng participants chưa
  if (!group.deputys.includes(memberId)) {
    // Thêm memberId vào mảng participants
    group.deputys.push(memberId);
    await group.save();
    group.participants.forEach(async (participantId) => {
      const receiverSocketId = getReceiverSocketId(participantId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("SocketupdateDeputy");
      }
    });
  }
  return res.status(200).json({
      success: true ,
  })
})

const updateLeader = asyncHandler(async (req, res)=>{
  const { id } = req.params;
  const { memberId } = req.body;
  console.log("memberId", memberId);
  const group = await Group.findOne({ _id:  id})

  if (group) {
    // Xóa toàn bộ dữ liệu trong mảng leader
    group.leader = [];

    // Thêm memberId vào mảng leader
    group.leader.push(memberId);

    // Xóa memberId trong mảng deputys nếu nó tồn tại
    const deputyIndex = group.deputys.indexOf(memberId);
    if (deputyIndex !== -1) {
      group.deputys.splice(deputyIndex, 1);
    }
    // Lưu lại đối tượng group
    await group.save();

    group.participants.forEach(async (participantId) => {
      const receiverSocketId = getReceiverSocketId(participantId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("SocketupdateLeader");
      }
    });
    
  }
  return res.status(200).json({
      success: true ,
  })
})

const outGroup = asyncHandler(async (req, res)=>{
  const { _id } = req.user;
  const { id } = req.params;

  const group = await Group.findOne({ _id:  id})
  if (group) {
    // Xóa _id khỏi mảng deputys nếu nó tồn tại
    const deputyIndex = group.deputys.indexOf(_id);
    if (deputyIndex !== -1) {
      group.deputys.splice(deputyIndex, 1);
    }

    // Xóa _id khỏi mảng participants nếu nó tồn tại
    const participantIndex = group.participants.indexOf(_id);
    if (participantIndex !== -1) {
      group.participants.splice(participantIndex, 1);
    }

    // Lưu lại đối tượng group
    await group.save();
    group.participants.forEach(async (participantId) => {
      const receiverSocketId = getReceiverSocketId(participantId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("SocketoutGroup");
      }
    });

  }
  return res.status(200).json({
      success: true ,
  })
})
const deleteGroup = asyncHandler(async (req, res)=>{
  const { id } = req.params;

  const group = await Group.findOne({ _id:  id})
  group.participants.forEach(async (participantId) => {
    const receiverSocketId = getReceiverSocketId(participantId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("SocketdeleteGroup");
    }
  });
  // Tìm và xóa nhóm từ cơ sở dữ liệu
  
  const deletedGroup = await Group.findOneAndDelete({ _id: id });

  return res.status(200).json({
      success: deletedGroup ? true : false,
  })
})

const deleteMember = asyncHandler(async (req, res)=>{
  const { id } = req.params;
  const { memberId } = req.body;
  const group = await Group.findOne({ _id:  id})



  if (group) {
    // Xóa _id khỏi mảng deputys nếu nó tồn tại
    const deputyIndex = group.deputys.indexOf(memberId);
    if (deputyIndex !== -1) {
      group.deputys.splice(deputyIndex, 1);
    }

    // Xóa _id khỏi mảng participants nếu nó tồn tại
    const participantIndex = group.participants.indexOf(memberId);
    if (participantIndex !== -1) {
      group.participants.splice(participantIndex, 1);
    }
    await group.save();

    const receiverSocketId = getReceiverSocketId(memberId.toString());
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("SocketDeleteMember");
    }

    group.participants.forEach(async (participantId) => {
      const receiverSocketIdd = getReceiverSocketId(participantId.toString());
      if (receiverSocketIdd) {
        io.to(receiverSocketIdd).emit("SocketDeleteMemberr");
      }
    });
  }
  return res.status(200).json({
      success: true ,
  })
})
const deleteDeputy = asyncHandler(async (req, res)=>{
  const { id } = req.params;
  const { memberId } = req.body;
  const group = await Group.findOne({ _id:  id})

  if (group) {
    // Xóa _id khỏi mảng deputys nếu nó tồn tại
    const deputyIndex = group.deputys.indexOf(memberId);
    if (deputyIndex !== -1) {
      group.deputys.splice(deputyIndex, 1);
    }
    await group.save();
    group.participants.forEach(async (participantId) => {
      const receiverSocketId = getReceiverSocketId(participantId.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("SocketdeleteDeputy");
      }
    });
  }
  return res.status(200).json({
      success: true ,
  })
})
const updateNameGroup = asyncHandler(async (req, res)=>{
  const { id } = req.params;
  const { nameGroup } = req.body;
  const group = await Group.findOne({ _id:  id})
  if (!nameGroup) {
    return res.status(400).json({
      success: false,
      mes: "Missing inputs",
    });
  }
  if (group) {
    // Cập nhật tên nhóm
    group.nameGroup = nameGroup;

     // Emit new message to all participants in the group

    //  const newSocket = Math.random().toString(36).substring(2, 8);
     group.participants.forEach(async (participantId) => {
       const receiverSocketId = getReceiverSocketId(participantId.toString());
       if (receiverSocketId) {
         console.log("receiverSocketId tét", receiverSocketId);
         io.to(receiverSocketId).emit("newSocket");
       }
     });
    await group.save();

  }
           
  
  return res.status(200).json({
      success: true ,
      mes: "Cập nhật tên nhóm thành công",
  })
})

const updateAvatarGroup = asyncHandler(async (req, res)=>{
  const { id } = req.params;
  const group = await Group.findOne({ _id:  id})
  if (group) {
    if (req.file){
      const image = req.file?.originalname.split(".");
      // console.log("image", image);
      const fileType = image[image.length - 1]; // Lấy phần tử cuối cùng của mảng là phần mở rộng của file
      const filePath = `${Date.now().toString()}.${fileType}`;
      // data.avatar = filePath
      const paramsS3 = {
          Bucket: bucketName,
          Key: filePath,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        };
        s3.upload(paramsS3, async (err, data) => {
          if (err) {
              console.log("error: ", err);
              return res.send("err");
          } else {
              const imageURL = data.Location;
              group.avatar = imageURL
              // if(!_id || Object.keys(req.body).length === 0){
              //     throw new Error('missing inputs')
              // }

              await group.save();
              group.participants.forEach(async (participantId) => {
                const receiverSocketId = getReceiverSocketId(participantId.toString());
                if (receiverSocketId) {
                  io.to(receiverSocketId).emit("SocketupdateAvatarGroup");
                }
              });

              return res.status(200).json({
                success: true ,
                mes: "Cập nhật tên nhóm thành công",
            })
          }
  
      });
  }
  }
})



module.exports = {
    createGroup,
    getGroups,
    sendMessageGr,
    getMessageGr,
    sendMessageImageGr,
    deleteMessageGr,
    getGroup,
    updateMember,
    updateDeputy,
    updateLeader,
    deleteGroup,
    outGroup,
    deleteMember,
    deleteDeputy,
    updateNameGroup,
    updateAvatarGroup

};
