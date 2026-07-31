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

    // Natively grab the token from the Cloudflare global widget instance
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
      cfTurnstileToken: turnstileToken // Sent as the exact variable name your backend expects
    };

    try {
      const response = await fetch('/api/send-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert('Message sent to Telegram successfully!');
        form.reset();
        
        // Reset the Turnstile widget visually so users can't spam it with an expired token
        if (typeof turnstile !== 'undefined') {
          turnstile.reset();
        }
        btn.disabled = true; 
      } else {
        alert('Server error: ' + (result.error || 'Unknown error'));
        btn.disabled = false;
      }
    } catch (err) {
      alert('Could not connect to backend server: ' + err.message);
      btn.disabled = false;
    } finally {
      btn.innerText = 'Send Message';
    }
  });
});
