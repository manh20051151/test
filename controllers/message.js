const Conversation = require("../models/conversation");
const Message = require("../models/messsage");
const { getReceiverSocketId, io } = require("../socket/socket");

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

const sendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const { id: reciverId } = req.params;
    const senderId = req.user._id;

    //kiếm một cuộc trò chuyện
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, reciverId] },
    });
    //tạo cuộc trò chuyện nếu chưa có
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, reciverId],
      });
    }

    const newMessage = new Message({
      senderId,
      reciverId,
      message,
    });

    if (newMessage) {
      conversation.messages.push(newMessage._id);
    }
    await Promise.all([conversation.save(), newMessage.save()]);

    //socket
    const receiverSocketId = getReceiverSocketId(reciverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.log("Error in sendMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

const sendMessageImage = async (req, res) => {
  try {
    const { message } = req.body;
    const { id: reciverId } = req.params;
    const senderId = req.user._id;

    //gửi hình
    const ne = req.file;
    // console.log("message:", message);
    // console.log("reciverId:", reciverId);
    // console.log("senderId:", senderId);
    // console.log("req.file: ", ne);

    const image = req.file?.originalname.split(".");
    // console.log("image", image);
    const fileType = image[image.length - 1]; // Lấy phần tử cuối cùng của mảng là phần mở rộng của file
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
        // console.log("imageURL: ", imageURL);
        //gán URL s3 trả về vào field trong table dynamodb
        //kiếm một cuộc trò chuyện
        let conversation = await Conversation.findOne({
          participants: { $all: [senderId, reciverId] },
        });
        //tọa cuộc trò chuyện nếu chưa có
        if (!conversation) {
          conversation = await Conversation.create({
            participants: [senderId, reciverId],
          });
        }

        const newMessage = new Message({
          senderId,
          reciverId,
          image: imageURL,
        });

        if (newMessage) {
          conversation.messages.push(newMessage._id);
        }
        await Promise.all([conversation.save(), newMessage.save()]);
        //socket
        const receiverSocketId = getReceiverSocketId(reciverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("newMessage", newMessage);
        }
        res.status(201).json(newMessage);
      }
    });
  } catch (error) {
    console.log("Error in sendMessageImage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getMessage = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const senderId = req.user._id;

    const conversation = await Conversation.findOne({
      participants: { $all: [senderId, userToChatId] },
    }).populate("messages"); // NOT REFERENCE BUT ACTUAL MESSAGES

    if (!conversation) return res.status(200).json([]);

    const messages = conversation.messages;
    // console.log("messages", messages);

    res.status(200).json(messages);
  } catch (error) {
    console.log("Error in getMessages controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
const deleteMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params; // Lấy id của tin nhắn cần xóa từ params
    const senderId = req.user._id;
    // console.log(senderId);
    // Tìm cuộc trò chuyện mà tin nhắn thuộc về
    const conversation = await Conversation.findOne({
      participants: { $in: [senderId] }, // Đảm bảo người gửi tin nhắn là một trong các người tham gia cuộc trò chuyện
      messages: messageId, // Chỉ lấy cuộc trò chuyện có chứa messageId
    });
    // console.log(conversation);
    if (!conversation) {
      return res.status(404).json({
        error:
          "Conversation not found or you are not authorized to delete this message",
      });
    }
    // console.log(conversation);

    // Xóa tin nhắn từ mảng messages của cuộc trò chuyện
    conversation.messages.pull(messageId);
    await conversation.save();

    // Xóa tin nhắn từ cơ sở dữ liệu
    await Message.findByIdAndDelete(messageId);

    // Lấy reciverId từ participants trong conversation
    const reciverId = conversation.participants
      .find((participant) => participant.toString() !== senderId)
      .toString(); // Add .toString() to convert to string
    // console.log("tren ", reciverId);

    const receiverSocketId = getReceiverSocketId(reciverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("messageDeleted", messageId);
    }

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.log("Error in deleteMessage controller: ", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  sendMessage,
  getMessage,
  deleteMessage,
  sendMessageImage,
};
