const { ethers } = require("ethers");

const privateKey = "45f9f43e48fe9b9320bc04ca7dbd6c2e6321f57cf50e5566fee71393a1ae9bfa";
const nonce = "746ddff9699a2cba57dc1ab7d1eae081";

async function sign() {
  const wallet = new ethers.Wallet(privateKey);
  const signature = await wallet.signMessage(nonce);
  console.log(signature);
}

sign();