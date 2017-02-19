//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');

var payloads = [];
payloads[0] = "Bem-vindo, não enfrente seus problemas sozinho, divida-os conosco!";
payloads[1] = "Estou te ouvindo..."
payloads[2] = "<3";
payloads[3] = ":(";

var cont = 0;
var qdisp = 0;
var async = require('async');
var socketio = require('socket.io');
var express = require('express');

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

var bp = require('body-parser');
router.use(bp.json());
router.use(bp.urlencoded({extended : false}));

var request = require('request');


server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});

function sendStructuredMessage(recipientId, event){
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "Desabafe!",
            subtitle: "Deixe alguém ajudar!",
            item_url: "",
            image_url: "http://imageshack.com/a/img923/8682/ioKWsn.jpg",
            buttons: [{
              type: "postback",
              title: "Escrever Mensagem",
              payload: "1"
            }
        ]}
      ]}
    }
  }
}
callSendAPI(messageData);
}

router.get('/webhook', function(req, res){

  if(req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === 'botparafora'){
    console.log("good req");
    res.status(200).send(req.query['hub.challenge']);
  }
  else{
    console.log("Falhou");
    res.sendStatus(403);
  }

  res.send('ok');

});


router.post('/webhook', function(req, res){

  var data = req.body;
  if(data && data.object === 'page'){
    data.entry.forEach(function(entry){

      var pageId = entry.id;
      var timeOfEvent = entry.time;

      entry.messaging.forEach(function(event){
        if(event.message){
          trataMensagem(event);
        }
        else if(event.postback){
          trataPostback(event);
        }
      });

      res.sendStatus(200);


    } );
  }


});

var map = {};
var random = [];

function startButtonMsg(senderID, event, payload){
  if(payload==0)
    sendTextMsg(senderID, payloads[0]);
  sendStructuredMessage(senderID, event);
  map[senderID] = {enviando: false, disponivel: false, remetente: -1, msg: "", block: []};
  random.push(senderID);
}

function escolheResposta(uId, message){
  var messageData = {
    recipient: {
      id: uId
    },
    message:{
    attachment:{
      type:"template",
      payload:{
        template_type:"button",
        text:message,
        buttons:[
          {
            type:"postback",
            payload : "5",
            title:"Responder"
          }
        ]
      }
    }
}
}
callSendAPI(messageData);
}

var respondendo = [];

function trataPostback(event){

  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " + "at %d", senderID, recipientID, payload, timeOfPostback);

  if(payload == 0 || payload == 4) startButtonMsg(senderID, event, payload);
  else {
    sendTextMsg(senderID, payloads[payload]);
    if(payload == 1){
      setEnviandoTrue(senderID);
    }
    else if(payload == 2){
      setDisponivel(senderID, true);
    }
    else if(payload == 3){
      setDisponivel(senderID, false);
    }
    else if(payload == 5){
      respondendo.push(senderID);
            console.log("fiz");
      sendTextMsg(senderID, "Envie sua resposta!");
    }
  }
}

function setDisponivel(senderID, bool){
  if(!(map[senderID].disponivel==bool))
    if(bool==true)
      qdisp++;
    else
      qdisp--;
  map[senderID].disponivel = bool;
}

function trataMensagem(event){

  var senderId = event.sender.id;
  var recipientId = event.recipient.id;
  var timeOfEvent = event.timestamp;
  var message = event.message;

  console.log("Mensagem do usuario %d recebida pela pagina %d", senderId, recipientId);
  console.log("Mensagem "+message.text);

  var valida = true;
  for(var i=0;i<respondendo.length;i++){
    if(senderId == respondendo[i]){
      sendTextMsg(map[senderId].remetente, message.text);
      valida = false;
      respondendo[i]=-1;
      map[senderId].disponivel=true;
      map[map[senderId].remetente].disponivel=true;
    }
  }
  if(valida){
    if(map[senderId].enviando){
      var destinatario = senderId;
      while((!map[destinatario].disponivel || destinatario == senderId) && qdisp > 0)
        destinatario = random[Math.floor(Math.random()*random.length)];
      if(qdisp > 0){
        map[destinatario].remetente = senderId;
        map[destinatario].msg = message.text;
        map[destinatario].disponivel = false;
        escolheResposta(destinatario, message.text);
      }
      else{
        sendTextMsg(destinatario,"No momento não temos ninguém disponível :/");
      }
    }
  }

}


function setEnviandoTrue(id){
    map[id].enviando = true;
}

function sendTextMsg(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}

function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: 'EAADj7ueu77wBAHMAvhwCmZCAoLstrOiJFhGcWytnvcQvEoDaZCQCrawImOZAqJqXOC3aGry8bSfeLAjX3cYaIbG71SLB5W0BXIT47G6yY8A31RY35WZCBEphSOnVS9pXa5GJVfDL1JPRqPaW4vYmZBRVZBNokjAtEbjLkBZCXQ8iwZDZD' },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s",
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });
}
