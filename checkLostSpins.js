// Whale.io Lootbox Checker Script - Find all WITHDRAWN items
// Paste this in Chrome DevTools console while on whale.io

// Configuration
const MAX_PAGES = 20; // Maximum number of pages to check
const PAGE_SIZE = 50; // Items per page

// Storage for results
const withdrawnItems = [];
let totalValueUsd = 0;
const currencyTotals = {};

// Format date for better readability
function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

// Function to fetch a specific page
async function fetchPage(page) {
  console.log(`Fetching page ${page}...`);
  
  try {
    const response = await fetch(`https://api-ms.crashgame247.io/lootbox/unboxing-history?page=${page}&pageSize=${PAGE_SIZE}`, {
      "headers": {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxNDg1ODAzNSIsImNoYW5uZWwiOiJ1c2VyOjE0ODU4MDM1IiwiaW5mbyI6eyJoaXN0b3J5X3NpemUiOjEwMCwiaGlzdG9yeV9saWZldGltZSI6ODY0MDB9LCJpYXQiOjE3NDExODcxODAsImV4cCI6MTc0MTI3MzU4MH0.LENw7uj6Orl-3ngFaup1nN9kYlR4beDFraLr2jFzEuE",
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "priority": "u=1, i",
        "sec-ch-ua": "\"Not(A:Brand\";v=\"99\", \"Google Chrome\";v=\"133\", \"Chromium\";v=\"133\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "sec-fetch-storage-access": "active",
        "x-device": "WEB",
        "x-lang": "en",
        "x-platform": "unknown"
      },
      "referrer": "https://whale.io/",
      "referrerPolicy": "strict-origin-when-cross-origin",
      "body": null,
      "method": "GET",
      "mode": "cors",
      "credentials": "include"
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    return {
      items: data.data,
      pageCount: data.meta.pagination.pageCount,
      total: data.meta.pagination.total
    };
  } catch (error) {
    console.error(`Error fetching page ${page}:`, error);
    return { items: [], pageCount: 0, total: 0 };
  }
}

// Process items and collect those with WITHDRAWN status
function processItems(items) {
  const withdrawnFromPage = items.filter(item => item.status === "WITHDRAWN");
  
  withdrawnFromPage.forEach(item => {
    // Extract needed information
    const itemInfo = {
      id: item.id,
      name: item.item.name,
      gameCode: item.productDetails.game_code || 'N/A',
      product: item.productDetails.product || 'N/A',
      valueUsd: item.costInUsd,
      valueCurrency: item.costInCurrency,
      currency: item.currency,
      rarity: item.item.rarity,
      createdAt: item.createdAt,
      formattedDateTime: formatDateTime(item.createdAt),
      lootboxName: item.lootbox.name
    };
    
    withdrawnItems.push(itemInfo);
    
    // Update totals
    totalValueUsd += item.costInUsd;
    if (!currencyTotals[item.currency]) {
      currencyTotals[item.currency] = 0;
    }
    currencyTotals[item.currency] += item.costInCurrency;
  });
  
  return withdrawnFromPage.length;
}

// Main function to run the check
async function checkAllLootboxes() {
  console.log("🔍 Starting Whale.io Lootbox Checker...");
  console.log(`Will check up to ${MAX_PAGES} pages with ${PAGE_SIZE} items per page`);
  
  let currentPage = 1;
  let totalPages = MAX_PAGES; // Default limit
  let done = false;
  
  // First page to get total number of pages
  const firstPageData = await fetchPage(1);
  if (firstPageData.pageCount > 0) {
    totalPages = Math.min(firstPageData.pageCount, MAX_PAGES);
    processItems(firstPageData.items);
  }
  
  // Process remaining pages
  for (currentPage = 2; currentPage <= totalPages && !done; currentPage++) {
    const pageData = await fetchPage(currentPage);
    if (pageData.items.length === 0) {
      done = true;
    } else {
      const foundCount = processItems(pageData.items);
      console.log(`Found ${foundCount} WITHDRAWN items on page ${currentPage}`);
    }
    
    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Sort results by date
  withdrawnItems.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  
  // Display results
  console.log("\n===== RESULTS =====");
  console.log(`Found ${withdrawnItems.length} items with WITHDRAWN status:\n`);
  
  withdrawnItems.forEach((item, index) => {
    console.log(`${index + 1}. ID: ${item.id} - ${item.formattedDateTime}`);
    console.log(`   Name: ${item.name}`);
    console.log(`   Game: ${item.gameCode} (${item.product})`);
    console.log(`   Value: $${item.valueUsd.toFixed(2)} (${item.valueCurrency.toFixed(5)} ${item.currency})`);
    console.log(`   Rarity: ${item.rarity}`);
    console.log(`   From: ${item.lootboxName}`);
    console.log(`   --------------------------------------------------`);
  });
  
  console.log("\n===== SUMMARY =====");
  console.log(`Total items: ${withdrawnItems.length}`);
  console.log(`Total value in USD: $${totalValueUsd.toFixed(2)}`);
  
  Object.entries(currencyTotals).forEach(([currency, amount]) => {
    console.log(`Total value in ${currency}: ${amount.toFixed(5)}`);
  });
  
  // Return the collected data for further use if needed
  return {
    items: withdrawnItems,
    totalValueUsd,
    currencyTotals
  };
}

// Run the checker
checkAllLootboxes()
  .then(results => {
    console.log("✅ Check completed successfully!");
    // The full results are also returned as an object if you want to use them
  })
  .catch(error => {
    console.error("❌ Error during check:", error);
  });