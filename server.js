const http = require('http'); 
const https = require('https'); 

const BOT_TOKEN = process.env.BOT_TOKEN; 
const CHAT_ID = process.env.CHAT_ID; 
const PORT = process.env.PORT || 3000; 

if (!BOT_TOKEN || !CHAT_ID) { 
  console.error("Error, no variables detected"); 
  process.exit(1); 
} 

const server = http.createServer((req, res) => { 
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); 
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); 

  if (req.method === 'OPTIONS') { 
    res.writeHead(204); 
    res.end(); 
    return; 
  } 

  if (req.method === 'POST' && req.url === '/api/send-telegram') { 
    let body = ''; 
    
    req.on('data', chunk => { 
      body += chunk.toString(); 
    }); 

    req.on('end', () => { 
      try { 
        const { name, email, message } = JSON.parse(body); 
        const textTelegram = `Name: ${name}\nEmail: ${email}\nMessage: ${message}`; 
        
        const telegramData = JSON.stringify({ 
          chat_id: CHAT_ID, 
          text: textTelegram 
        });

        const options = { 
          hostname: 'api.telegram.org', 
          path: `/bot${BOT_TOKEN}/sendMessage`, 
          method: 'POST', 
          headers: { 
            'Content-Type': 'application/json', 
            'Content-Length': Buffer.byteLength(telegramData) 
          } 
        }; 

        const telegramReq = https.request(options, (telegramRes) => { 
          let telegramBody = '';
          telegramRes.on('data', d => telegramBody += d);
          
          telegramRes.on('end', () => {
            if (telegramRes.statusCode === 200) { 
              res.writeHead(200, {'Content-Type': 'application/json'}); 
              res.end(JSON.stringify({success: true})); 
            } else { 
              res.writeHead(500, {'Content-Type': 'application/json'}); 
              res.end(JSON.stringify({error: 'Error in telegrams api', details: telegramBody})); 
            } 
          });
        }); 

        telegramReq.on('error', (e) => { 
          res.writeHead(500, {'Content-Type': 'application/json'}); 
          res.end(JSON.stringify({error: e.message})); 
        }); 

        telegramReq.write(telegramData); 
        telegramReq.end(); 

      } catch (err) { 
        res.writeHead(400, {'Content-Type': 'application/json'}); 
        res.end(JSON.stringify({error: "JSON not valid"})); 
      } 
    }); 
  } else { 
    res.writeHead(404, {'Content-Type': 'application/json'}); 
    res.end(JSON.stringify({error: 'Not found'})); 
  } 
}); 

server.listen(PORT, () => { 
  console.log(`Server running on port ${PORT}`); 
});
const SECRET_KEY = "0x4AAAAAAECZAtlnlOqhzbdwWhj0CFJoVWQ";

async function validateTurnstile(token, remoteip) {
	try {
		const response = await fetch(
			"https://challenges.cloudflare.com/turnstile/v0/siteverify",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					secret: SECRET_KEY,
					response: token,
					remoteip: remoteip,
				}),
			},
		);

		const result = await response.json();
		return result;
	} catch (error) {
		console.error("Turnstile validation error:", error);
		return { success: false, "error-codes": ["internal-error"] };
	}
}