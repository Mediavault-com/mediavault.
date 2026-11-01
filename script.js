     const API = 'https://mediavault-api.onrender.com';
     const res = await fetch(`${API}/api/download`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ url })
     });
