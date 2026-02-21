const verifyBtn = document.getElementById('verifyBtn');
const vcIdInput = document.getElementById('vcId');
const resultContainer = document.getElementById('resultContainer');

verifyBtn.addEventListener('click', async () => {
  const vcId = vcIdInput.value.trim();
  if (!vcId) return alert('Please enter a VC ID');

  resultContainer.innerHTML = `<p class="text-gray-300">Verifying...</p>`;

  try {
    const response = await fetch(`http://localhost:5000/api/credentials/session/${vcId}`);
    if (!response.ok) throw new Error('VC not found');

    const { credentials } = await response.json();
    if (!credentials || credentials.length === 0) {
      resultContainer.innerHTML = `<p class="text-red-500 font-bold">No credential found for this ID</p>`;
      return;
    }

    const vc = credentials[0]; // assuming one VC per ID
    const verifyRes = await fetch('http://localhost:5000/api/credentials/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credentialId: vc.vcId, vc })
    });

    const verifyData = await verifyRes.json();

    resultContainer.innerHTML = `
      <div class="bg-gray-800 p-6 rounded-xl shadow-lg animate-fadeIn">
        <h2 class="text-xl font-bold mb-2 text-cyan-400">Credential Verification</h2>
        <p><span class="font-semibold">VC ID:</span> ${vc.vcId}</p>
        <p><span class="font-semibold">Subject DID:</span> ${vc.subjectDid}</p>
        <p><span class="font-semibold">Issuer DID:</span> ${vc.issuerDid}</p>
        <p><span class="font-semibold">Status:</span> 
          <span class="${verifyData.exists ? 'text-green-400 font-bold' : 'text-red-500 font-bold'}">
            ${verifyData.exists ? 'Verified ✅' : 'Invalid ❌'}
          </span>
        </p>
      </div>
    `;

  } catch (err) {
    resultContainer.innerHTML = `<p class="text-red-500 font-bold">Error: ${err.message}</p>`;
  }
});
resultContainer.innerHTML = `
  <div class="result-card">
    <p><strong>VC ID:</strong> ${vc.vcId}</p>
    <p><strong>Subject DID:</strong> ${vc.subjectDid}</p>
    <p><strong>Issuer DID:</strong> ${vc.issuerDid}</p>
    <p>
      <strong>Status:</strong>
      <span class="${verifyData.exists ? 'success' : 'error'}">
        ${verifyData.exists ? 'Verified ✅' : 'Invalid ❌'}
      </span>
    </p>
  </div>
`;
