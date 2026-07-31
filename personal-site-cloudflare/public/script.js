document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');

  if (!form) {
    console.error("JavaScript Error: Could not find HTML element with id='contact-form'.");
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.innerText = 'Sending...';

    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const messageInput = document.getElementById('message');

   
    const turnstileToken = turnstile.getResponse();

    if (!turnstileToken) {
      alert("Please complete the Cloudflare captcha challenge before sending.");
      btn.disabled = false;
      btn.innerText = 'Send Message';
      return;
    }

    const data = {
      name: nameInput.value,
      email: emailInput.value,
      message: messageInput.value,
      cfTurnstileToken: turnstileToken 
    };

try {
    const response = await fetch('/api/send-telegram', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

   
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
        const rawText = await response.text();
        console.error("Server returned non-JSON payload:", rawText);
        throw new Error(`Server returned HTML instead of JSON (Status ${response.status}). Check your backend API route.`);
    }

   
    const result = await response.json();

    if (response.ok && result.success) {
        alert('Message sent to Telegram successfully!');
        form.reset();
        if (typeof turnstile !== 'undefined') {
            turnstile.reset();
        }
        btn.disabled = true;
    } else {
        alert('Server error: ' + (result.error || 'Unknown error'));
        btn.disabled = false;
    }
}
 catch (err) {
      alert('Could not connect to backend server: ' + err.message);
      btn.disabled = false;
    } finally {
      btn.innerText = 'Send Message';
    }
  });
});
