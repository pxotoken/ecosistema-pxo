import fetch from "node-fetch";

export async function fetchInAppWalletMetadataFromThirdweb(args) {
  console.log('🔍 fetchInAppWalletMetadataFromThirdweb called with args:', JSON.stringify(args, null, 2));
  
  const url = new URL(
    "https://embedded-wallet.thirdweb.com/api/2023-11-30/embedded-wallet/user-details"
  );

  if (args.queryBy === "walletAddress") {
    url.searchParams.set("queryBy", "walletAddress");
    url.searchParams.set("walletAddress", args.walletAddress);
  }
  if (args.queryBy === "email") {
    url.searchParams.set("queryBy", "email");
    url.searchParams.set("email", args.email);
  }
  if (args.queryBy === "phone") {
    url.searchParams.set("queryBy", "phone");
    url.searchParams.set("phone", args.phone);
  }

  console.log('🔍 Making request to Thirdweb API:', {
    url: url.href,
    hasSecretKey: !!process.env.THIRDWEB_SECRET_KEY,
    secretKeyLength: process.env.THIRDWEB_SECRET_KEY?.length || 0
  });

  const response = await fetch(url.href, {
    headers: {
      Authorization: `Bearer ${process.env.THIRDWEB_SECRET_KEY}`,
    },
  });

  console.log('🔍 Thirdweb API response:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries())
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.log('❌ Thirdweb API error response:', errorText);
    throw new Error(`Error fetching data: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log('🔍 Thirdweb API response data:', JSON.stringify(data, null, 2));
  return data;
}
