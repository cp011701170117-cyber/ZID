const vcInput = document.getElementById('vcIdInput');
const verifyBtn = document.getElementById('verifyBtn');
const resultDiv = document.getElementById('result');
const historyBody = document.getElementById('historyBody');

const history = [];
document.getElementById('app').innerHTML = `
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="bg-white p-6 rounded-lg shadow-lg w-96">
      <h1 class="text-2xl font-bold mb-4 text-center">Verifier Portal</h1>
      <input
        class="w-full border px-3 py-2 rounded mb-3"
        placeholder="Enter VC ID"
      />
      <button
        class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
      >
        Verify Credential
      </button>
    </div>
  </div>
`;


verifyBtn.addEventListener('click', async () => {
  const vcId = vcInput.value.trim();
  if (!vcId) return alert('Please enter a credential ID');

  resultDiv.classList.add('hidden');
  resultDiv.innerHTML = '';

  try {
    const res = await fetch(`http://localhost:5000/api/credentials/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credentialId: vcId, vc: { id: vcId } })
    });
    const data = await res.json();

    const timestamp = new Date().toLocaleString();
    history.push({ ...data, timestamp });

    // Show result card
    if (data.exists) {
      resultDiv.className = 'mt-4 p-4 rounded shadow bg-green-100 text-green-800';
      resultDiv.innerHTML = `
        <h2 class="font-bold text-lg mb-2">✅ Credential Verified</h2>
        <p><strong>VC ID:</strong> ${data.credentialId}</p>
        <p><strong>Hash:</strong> ${data.computedHash}</p>
        <p><strong>Reason:</strong> ${data.reason}</p>
      `;
    } else {
      resultDiv.className = 'mt-4 p-4 rounded shadow bg-red-100 text-red-800';
      resultDiv.innerHTML = `
        <h2 class="font-bold text-lg mb-2">❌ Verification Failed</h2>
        <p><strong>VC ID:</strong> ${data.credentialId}</p>
        <p><strong>Reason:</strong> ${data.reason}</p>
      `;
    }
    resultDiv.classList.remove('hidden');

    renderHistory();
  } catch (err) {
    alert('Error connecting to backend: ' + err.message);
  }
});

function renderHistory() {
  historyBody.innerHTML = '';
  history.slice().reverse().forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="px-4 py-2">${item.credentialId}</td>
      <td class="px-4 py-2 break-all">${item.computedHash || '-'}</td>
      <td class="px-4 py-2">${item.exists ? '✅ Verified' : '❌ Failed'}</td>
      <td class="px-4 py-2">${item.timestamp}</td>
      <td class="px-4 py-2">
        <button class="bg-gray-300 px-2 py-1 rounded hover:bg-gray-400" onclick="copyHash('${item.computedHash}')">Copy</button>
      </td>
    `;
    historyBody.appendChild(row);
  });
}

window.copyHash = (hash) => {
  if (!hash) return alert('No hash to copy');
  navigator.clipboard.writeText(hash);
  alert('Hash copied to clipboard');
};
