// import { Server } from "socket.io";
// import http from 'http'
// import express from 'express'
const { Server } = require('socket.io')
const http =require('http')
const express = require('express')


const app = express()

const server = http.createServer(app)
const io = new Server(server, {
    cors:{
        origin: ['https://manh20051151.github.io/client_deploy'],
        methods: ['GET', 'POST'],
    }
})

const getReceiverSocketId = (receiverId) => {
	return userSocketMap[receiverId];
};

const userSocketMap = {}

io.on('connection', (socket)=>{
    console.log("a user connected", socket.id);

    const userId = socket.handshake.query.userId
    if(userId != "undefined"){
        userSocketMap[userId] = socket.id
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap))

    socket.on('disconnect', ()=>{
        console.log('user disconnected', socket.id);
        delete userSocketMap[userId]
        io.emit("getOnlineUsers", Object.keys(userSocketMap))
    })
})


module.exports = {app, io, server, getReceiverSocketId};