var http = require('http');
var fs = require('fs');
var path = require('path');
// Laddar config info
eval(fs.readFileSync('public/filer/config.js')+'');
//console.log(config);

//Startar server och tillåtna filer
var server = http.createServer(function (request, response) {
    var filePath = '.' + request.url;
    if (filePath == './')
        filePath = config.location.index;
    //Här radas alla tillåtna filer
    var extname = path.extname(filePath);
    var contentType = 'text/html';
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;      
        case '.jpg':
            contentType = 'image/jpg';
            break;
        case '.wav':
            contentType = 'audio/wav';
            break;
    }
    //Säger till server att läsa och skicka fil till klient (Möjlighet att lägga till felmeddelanden)
    fs.readFile('./public/' + filePath, function(error, content) {
        if (error) {
            if(error.code == 'ENOENT'){
                fs.readFile('./404.html', function(error, content) {
                    response.writeHead(200, { 'Content-Type': contentType });
                    response.end(content, 'utf-8');
                });
            }
            else {
                response.writeHead(500);
                response.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
                response.end(); 
            }
        }
        else {
            response.writeHead(200, { 'Content-Type': contentType });
            response.end(content, 'utf-8');
        }
    });

});

// Loading socket.io
var io = require('socket.io').listen(server);

io.sockets.on('connection', function (socket, username) {
	// When the client connects, they are sent a message
	socket.emit('message', 'You are connected!');
    //Frågar om användaren vill ta mot data
    socket.emit('getdata', 'Vill du ha data?');
	// The other clients are told that someone new has arrived
	socket.broadcast.emit('message', 'Another client has just connected!');
    socket.on('getdatafromdate', function (date) {
        /*var data = [{
            rating: 3,
            kommentar: 'Det funka..'
        },{
            rating: 1,
            kommentar: 'Tilltalade mig inte alls! Bättre jobb nästa gång.'
        },{
            rating: 5,
            kommentar: 'Ni är bäst!'
        },{
            rating: 4,
            kommentar: 'Det lilla jag klarade av att äta var gott, tyvärr är jag för illamående.'
        },{
            rating: 1,
            kommentar: 'Ni använder på tok för mycket salt!'
        },{
            rating: 5,
            kommentar: 'Samma som att äta på restaurang.'
        },{
            rating: 5,
            kommentar: 'Maten var bättre än på bilderna.'
        }];*/
        //Försöker läsa textfil med data för aktuellt datum.
        fs.readFile('statistik/' + date + '.json', (err, data) => {
            //Om textfil inte existerar
            if (err){
                console.log(date + '.json finns inte, skapar ny fil.');
                fs.writeFile('statistik/' + date + '.json', '{"data": []}', (err) => {
                    if (err){
                        console.log('Något gick fel i skapandet av ny fil.')
                    }else{
						console.log('Ny fil skapad för önskat datum.');
						//console.log(data.data);
						socket.emit('senddata', []);
					};
				});
			}else{
				console.log(data);
				var datatosend = JSON.parse(data);
				console.log(datatosend.data);
				socket.emit('senddata', datatosend.data);
			};
		});
	});
	socket.on('reg', function (message) {
		//id: utnamn, smiley: smileynummer, komment: kommentar, portionprocent: (parseInt(portion) / 4)
		console.log(message.datum);
		console.log(message.id);
		console.log(message.smiley);
		console.log(message.komment);
		console.log(message.portionprocent);

        var datatosend = {datum: message.datum, smiley: message.smiley, komment: message.komment};
        var datatospara = {rating: message.smiley, kommentar: message.komment};
        fs.readFile('statistik/' + message.datum + '.json', (err, data) => {
            //Om textfil inte existerar
            if (err){
                console.log('Sparfil finns inte sedan innan. Det gör dock inget. Skapar en ny!');
                var tidigaredata = [];
            }else{
                //Data finns att hantera
                var tidigaredata = JSON.parse(data).data;
            };
            tidigaredata.push(datatospara);
            //Skapar och skriver oavsett till sparfil
            var jsonobj = {"data": tidigaredata};
            //Uppdaterar register.json med uppdaterade listan av användare
            fs.writeFileSync('statistik/' + message.datum + '.json', JSON.stringify(jsonobj, null, ' '));
        });
        socket.broadcast.emit('skickareg', datatosend);
	});
	socket.on('bestall', function (message) {
		//typ: typ, id: utnamn, kost: utkost, komment: utkommentar, val: array
		//console.log(message);
		console.log(message.datum);
		console.log(message.typ);
		console.log(message.id);
		console.log(message.kost);
		console.log(message.komment);
		console.log(message.val);
		socket.broadcast.emit('skickabestall', message);
	});
});
//Kollar IP adress för server.
function getIPAddress() {
	var interfaces = require('os').networkInterfaces();
	for (var devName in interfaces) {
		var iface = interfaces[devName];
		for (var i = 0; i < iface.length; i++) {
			var alias = iface[i];
			if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
			return alias.address;
		};
	};
	return '0.0.0.0';
};
var ip = getIPAddress();
console.log(config.cmd.infolocal + ': http://localhost:' + config.port);
console.log(config.cmd.infonetw + ': http://' + ip + ':' + config.port);
server.listen(config.port);