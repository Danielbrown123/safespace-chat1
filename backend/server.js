const express=require("express"),http=require("http"),crypto=require("crypto");
const {Server}=require("socket.io");
const app=express(),server=http.createServer(app),io=new Server(server,{cors:{origin:"*",methods:["GET","POST"]}});
app.use(express.json());
const PORT=process.env.PORT||3000,users=new Map(),counselors=new Map(),sessions=new Map(),waiting=[],reports=[];
const id=p=>p+"-"+crypto.randomBytes(3).toString("hex").toUpperCase();
const publicC=c=>({id:c.id,name:c.name,specialty:c.specialty,online:c.online});
[{id:"C-1001",username:"counselor1",password:"demo123",name:"Counselor One",specialty:"General Support"},{id:"C-1002",username:"counselor2",password:"demo123",name:"Counselor Two",specialty:"Stress & Anxiety"}].forEach(c=>counselors.set(c.id,{...c,online:false,socketId:null,sessionId:null}));
function getSession(sid){return [...sessions.values()].find(s=>s.userSocket===sid||s.counselorSocket===sid)}
function match(){const c=[...counselors.values()].find(x=>x.online&&!x.sessionId);if(!c||!waiting.length)return;const uid=waiting.shift(),u=users.get(uid),cs=io.sockets.sockets.get(c.socketId);if(!u||!cs){match();return}const sid=id("SESSION"),room="session-"+sid,s={id:sid,userId:u.id,counselorId:c.id,userSocket:u.socketId,counselorSocket:c.socketId,room,status:"active",startedAt:new Date().toISOString(),endedAt:null,messages:[]};sessions.set(sid,s);u.sessionId=sid;c.sessionId=sid;u.socket.join(room);cs.join(room);io.to(room).emit("matched",{sessionId:sid,userId:u.id,counselor:publicC(c)});io.to(room).emit("system","You are connected. Please avoid sharing identifying information.")}
app.get("/",(q,r)=>r.json({service:"SafeSpace live chat API",status:"ok"}));
app.post("/api/user/create",(q,r)=>{const x=id("USER");users.set(x,{id:x,socketId:null,sessionId:null});r.json({id:x})});
app.post("/api/counselor/login",(q,r)=>{const {username,password}=q.body||{},c=[...counselors.values()].find(x=>x.username===username&&x.password===password);c?r.json({counselor:publicC(c)}):r.status(401).json({error:"Invalid demo credentials"})});
app.get("/api/admin/stats",(q,r)=>r.json({totalUsers:users.size,activeSessions:[...sessions.values()].filter(s=>s.status==="active").length,waitingUsers:waiting.length,counselorsOnline:[...counselors.values()].filter(c=>c.online).length,completedSessions:[...sessions.values()].filter(s=>s.status==="ended").length,reports:reports.length}));
app.get("/api/admin/sessions",(q,r)=>r.json([...sessions.values()].map(s=>({id:s.id,userId:s.userId,counselorId:s.counselorId,status:s.status,messageCount:s.messages.length,startedAt:s.startedAt,endedAt:s.endedAt}))));
io.on("connection",socket=>{
socket.on("user-join",({userId})=>{const u=users.get(userId);if(!u)return;u.socketId=socket.id;socket.data={role:"user",userId};if(!waiting.includes(userId))waiting.push(userId);socket.emit("queue-status",{position:waiting.indexOf(userId)+1});match()});
socket.on("counselor-online",({counselorId})=>{const c=counselors.get(counselorId);if(!c)return;c.online=true;c.socketId=socket.id;c.sessionId=null;socket.data={role:"counselor",counselorId};match()});
socket.on("message",text=>{const s=getSession(socket.id),clean=String(text||"").trim().slice(0,2000);if(!s||s.status!=="active"||!clean)return;const m={sender:socket.data.role,text:clean,time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})};s.messages.push(m);io.to(s.room).emit("message",m)});
socket.on("typing",v=>{const s=getSession(socket.id);if(s)socket.to(s.room).emit("typing",!!v)});
socket.on("end-session",()=>{const s=getSession(socket.id);if(!s||s.status!=="active")return;s.status="ended";s.endedAt=new Date().toISOString();io.to(s.room).emit("ended","This support session has ended.");const u=users.get(s.userId),c=counselors.get(s.counselorId);if(u)u.sessionId=null;if(c)c.sessionId=null;match()});
socket.on("disconnect",()=>{const uid=socket.data?.userId,i=waiting.indexOf(uid);if(i>=0)waiting.splice(i,1);const c=counselors.get(socket.data?.counselorId);if(c){c.online=false;c.socketId=null;c.sessionId=null}const s=getSession(socket.id);if(s&&s.status==="active"){s.status="ended";s.endedAt=new Date().toISOString();socket.to(s.room).emit("ended","The other participant disconnected.");const u=users.get(s.userId),co=counselors.get(s.counselorId);if(u)u.sessionId=null;if(co)co.sessionId=null}match()});
});
server.listen(PORT,()=>console.log("SafeSpace API listening on "+PORT));