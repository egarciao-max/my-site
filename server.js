const http = require('http'); 
const https = require('https'); 

const BOT_TOKEN = process.env.BOT_TOKEN; 
const CHAT_ID = process.env.CHAT_ID; 
const PORT = process.env.PORT || 3000; 
const SECRET_KEY = "0x4AAAAAAECZAtlnlOqhzbdwWhj0CFJoVWQ"; // Your Turnstile Secret Key

if (!BOT_TOKEN || !CHAT_ID) { 
  console.error("Error, no variables detected"); 
  process.exit(1); 
} 

// Native HTTPS helper to validate Turnstile without dependencies
function validateTurnstile(token, remoteip) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      secret: SECRET_KEY,
      response: token,
      remoteip: remoteip
    });

    const options = {
      hostname: 'challenges.cloudflare.com',
      path: '/turnstile/v0/siteverify',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ success: false, "error-codes": ["json-parse-error"] });
        }
      });
    });

    req.on('error', () => {
      resolve({ success: false, "error-codes": ["network-error"] });
    });

    req.write(payload);
    req.end();
  });
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

    req.on('end', async () => { // Marked as async to await captcha validation
      try { 
        // Expecting 'cfTurnstileToken' passed from your script.js frontend data object
        const { name, email, message, cfTurnstileToken } = JSON.parse(body); 

        if (!cfTurnstileToken) {
          res.writeHead(400, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({error: "Missing Turnstile Token"}));
          return;
        }

        // Get user IP from request headers safely
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Run Turnstile verification block
        const captchaResult = await validateTurnstile(cfTurnstileToken, ip);

        if (!captchaResult.success) {
          res.writeHead(403, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({error: "Captcha validation failed", details: captchaResult["error-codes"]}));
          return;
        }
        
        // If Captcha passes, proceed to fire Telegram request
        const textTelegram = `Name: ${name}\nEmail: ${email}\nMessage: ${message}`; 
        const telegramData = JSON.stringify({ chat_id: CHAT_ID, text: textTelegram }); 

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
