document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form'); // Verified lowercase with hyphen

  if (!form) {
    console.error("JavaScript Error: Could not find HTML element with id='contact-form'.");
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Safely look for your lowercase inputs
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const messageInput = document.getElementById('message');

    if (!nameInput || !emailInput || !messageInput) {
      alert("Error: One or more form input elements are missing their correct IDs.");
      return;
    }

    const data = {
      name: nameInput.value,
      email: emailInput.value,
      message: messageInput.value
    };

    try {
      const response = await fetch('/api/send-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert('Message sent successfully!');
        form.reset();
      } else {
        alert('Server error: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Could not connect to server: ' + err.message);
    }
  });
});
